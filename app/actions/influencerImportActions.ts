// app/actions/influencerImportActions.ts — Next.js Server Action for Excel/CSV Creator Import

"use server";

import { db } from "@/lib/db";
import { influencers } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/adminAuth";
import ExcelJS from "exceljs";

export interface ImportErrorRow {
  rowNumber: number;
  code: string;
  error: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  errorCount: number;
  errors: ImportErrorRow[];
  error?: string;
}

/**
 * Sanitize string value against formula injection attacks
 */
function sanitizeImportedCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  if (/^[=+\-@]/.test(str)) {
    str = str.replace(/^[=+\-@]+/, ""); // Strip leading formula injection characters
  }
  return str;
}

/**
 * Parse CSV text into row arrays
 */
function parseCSVText(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    // Simple CSV parser handling quotes
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

/**
 * Server Action: Upload and process .xlsx or .csv creator import file
 */
export async function importInfluencersAction(formData: FormData): Promise<ImportResult> {
  if (!(await verifyAdminSession())) {
    return {
      success: false,
      totalRows: 0,
      importedCount: 0,
      errorCount: 0,
      errors: [],
      error: "Unauthorized",
    };
  }

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return {
        success: false,
        totalRows: 0,
        importedCount: 0,
        errorCount: 0,
        errors: [],
        error: "No file uploaded.",
      };
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    let rawRows: (string | number | null | undefined)[][] = [];

    if (fileName.endsWith(".csv")) {
      const csvText = new TextDecoder("utf-8").decode(arrayBuffer);
      rawRows = parseCSVText(csvText);
    } else if (fileName.endsWith(".xlsx")) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          const rowValues = Array.isArray(row.values)
            ? row.values.slice(1).map((v) => {
                if (typeof v === "object" && v !== null && "result" in v) {
                  return (v as { result: unknown }).result as string | number;
                }
                return v as string | number | null;
              })
            : [];
          rawRows.push(rowValues);
        });
      }
    } else {
      return {
        success: false,
        totalRows: 0,
        importedCount: 0,
        errorCount: 0,
        errors: [],
        error: "Unsupported file format. Please upload a .xlsx or .csv file.",
      };
    }

    if (rawRows.length <= 1) {
      return {
        success: false,
        totalRows: 0,
        importedCount: 0,
        errorCount: 0,
        errors: [],
        error: "File is empty or contains only headers.",
      };
    }

    // Detect headers from row 1
    const headers = rawRows[0].map((h) => String(h || "").toLowerCase().trim());
    const nameIdx = headers.findIndex((h) => h.includes("name"));
    const codeIdx = headers.findIndex((h) => h.includes("code") || h.includes("coupon"));
    const handleIdx = headers.findIndex((h) => h.includes("handle") || h.includes("instagram"));
    const upiIdx = headers.findIndex((h) => h.includes("upi") || h.includes("phone"));
    const discIdx = headers.findIndex((h) => h.includes("discount"));
    const commIdx = headers.findIndex((h) => h.includes("commission"));
    const notesIdx = headers.findIndex((h) => h.includes("note"));

    // Fallbacks if headers not detected by name
    const finalNameIdx = nameIdx >= 0 ? nameIdx : 0;
    const finalCodeIdx = codeIdx >= 0 ? codeIdx : 1;
    const finalHandleIdx = handleIdx >= 0 ? handleIdx : 2;
    const finalUpiIdx = upiIdx >= 0 ? upiIdx : 3;
    const finalDiscIdx = discIdx >= 0 ? discIdx : 4;
    const finalCommIdx = commIdx >= 0 ? commIdx : 5;
    const finalNotesIdx = notesIdx >= 0 ? notesIdx : 6;

    // Existing codes in DB
    const existingCreators = await db.select({ code: influencers.code }).from(influencers);
    const existingCodeSet = new Set(existingCreators.map((c) => c.code.toUpperCase()));

    const fileCodeSet = new Set<string>();
    const validToInsert: Array<{
      name: string;
      code: string;
      instagramHandle: string | null;
      phoneOrUpi: string | null;
      discountPercent: number;
      commissionPercent: number;
      notes: string | null;
      isActive: boolean;
    }> = [];

    const errors: ImportErrorRow[] = [];
    const dataRows = rawRows.slice(1);

    dataRows.forEach((row, idx) => {
      const rowNum = idx + 2; // Row 1 is header
      const rawName = sanitizeImportedCell(row[finalNameIdx]);
      const rawCode = sanitizeImportedCell(row[finalCodeIdx]).toUpperCase();
      const rawHandle = sanitizeImportedCell(row[finalHandleIdx]);
      const rawUpi = sanitizeImportedCell(row[finalUpiIdx]);
      const rawNotes = sanitizeImportedCell(row[finalNotesIdx]);

      let discountPercent = Number(row[finalDiscIdx]);
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        discountPercent = 10; // safe default
      }

      let commissionPercent = Number(row[finalCommIdx]);
      if (isNaN(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
        commissionPercent = 10; // safe default
      }

      if (!rawName) {
        errors.push({ rowNumber: rowNum, code: rawCode || "—", error: "Missing creator name." });
        return;
      }

      if (!rawCode) {
        errors.push({ rowNumber: rowNum, code: "—", error: "Missing coupon code." });
        return;
      }

      if (existingCodeSet.has(rawCode)) {
        errors.push({
          rowNumber: rowNum,
          code: rawCode,
          error: `Code "${rawCode}" already exists in database. Existing creators are preserved.`,
        });
        return;
      }

      if (fileCodeSet.has(rawCode)) {
        errors.push({
          rowNumber: rowNum,
          code: rawCode,
          error: `Duplicate code "${rawCode}" found within uploaded file.`,
        });
        return;
      }

      fileCodeSet.add(rawCode);

      validToInsert.push({
        name: rawName,
        code: rawCode,
        instagramHandle: rawHandle || null,
        phoneOrUpi: rawUpi || null,
        discountPercent,
        commissionPercent,
        notes: rawNotes || null,
        isActive: true,
      });
    });

    if (validToInsert.length > 0) {
      await db.insert(influencers).values(validToInsert);
    }

    revalidatePath("/admin");

    return {
      success: true,
      totalRows: dataRows.length,
      importedCount: validToInsert.length,
      errorCount: errors.length,
      errors,
    };
  } catch (error) {
    console.error("[importInfluencersAction] Import error:", error);
    return {
      success: false,
      totalRows: 0,
      importedCount: 0,
      errorCount: 0,
      errors: [],
      error: "Failed to process import file.",
    };
  }
}
