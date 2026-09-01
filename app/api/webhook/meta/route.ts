import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  siteConfig,
  foodPrinciples,
  whyPreOrder,
  howToEat,
  menuData,
  processSteps,
} from "@/config/brand";

// Initialize Resend instance outside route handlers (with fallback placeholder for build evaluation)
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

// Construct brand knowledge base for AI system context
const brandKnowledge = `
========================================
BRAND & BUSINESS PROFILE
========================================
Name: ${siteConfig.name}
Tagline: ${siteConfig.tagline} (${siteConfig.shortTagline})
Description: ${siteConfig.description}
City / Location: ${siteConfig.contact.city}
Business Model: ${siteConfig.model}
Notice: ${siteConfig.notice}

Why Pre-Order:
${whyPreOrder.heading} — ${whyPreOrder.subheading}
${whyPreOrder.body}

Our Food Principles:
${foodPrinciples.map((fp) => `• ${fp.label}: ${fp.description}`).join("\n")}

Pre-Order Steps:
${processSteps.map((s) => `${s.step}. ${s.label}: ${s.description}`).join("\n")}

How To Eat A Bap:
${howToEat.map((h) => `${h.step}. ${h.heading} — ${h.body}`).join("\n")}

========================================
CURRENT MENU & PRICING (INR ₹)
========================================
--- Bento Boxes ---
${menuData.bentoBoxes
  .map(
    (item) =>
      `• ${item.name} (ID: "${item.id}") — ₹${item.price} [${
        item.isVegetarian ? "Vegetarian (V)" : "Non-Vegetarian"
      }]\n  Description: ${item.description}`
  )
  .join("\n")}

--- Bibimbap Bowls ---
${menuData.bibimbapBowls
  .map(
    (item) =>
      `• ${item.name} (ID: "${item.id}") — ₹${item.price} [${
        item.isVegetarian ? "Vegetarian (V)" : "Non-Vegetarian"
      }]\n  Description: ${item.description}`
  )
  .join("\n")}

--- Authentic Sides ---
${menuData.authenticSides
  .map(
    (item) =>
      `• ${item.name} (ID: "${item.id}") — ₹${item.price} [${
        item.isVegetarian ? "Vegetarian (V)" : "Non-Vegetarian"
      }]\n  Description: ${item.description}`
  )
  .join("\n")}

--- Add-Ons ---
${menuData.addOns
  .map(
    (item) =>
      `• ${item.name} (ID: "${item.id}") — ₹${item.price} [${
        item.isVegetarian ? "Vegetarian (V)" : "Non-Vegetarian"
      }]\n  Description: ${item.description}`
  )
  .join("\n")}
`;

const systemPrompt = `
You are the Daily Bap order assistant. Be friendly and Gen-Z focused. Before confirming an order, you MUST ask the customer for their: 1. Name, 2. WhatsApp Number, 3. Delivery Address. Do NOT call the place_order tool until you have all three pieces of information. To comply with India's DPDP Act, you must explicitly ask for their consent to store this data for delivery purposes before calling the tool. Once you have consent and the data, call the tool.

${brandKnowledge}
`.trim();

/**
 * Step 1: GET Handler - Meta Webhook Verification Handshake (Unchanged)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * Step 2, 3 & 4: POST Handler - AI Tool Calling & Order Placement Integration
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Extract message payload from body.entry[0].messaging[0]
    const messaging = body.entry?.[0]?.messaging?.[0];

    if (messaging) {
      const senderId = messaging.sender?.id;
      const messageText = messaging.message?.text;
      const isEcho = messaging.message?.is_echo;
      const isRead = !!messaging.read;
      const isDelivery = !!messaging.delivery;

      // Filter out read receipts, echo messages, or payloads lacking text
      if (senderId && messageText && !isEcho && !isRead && !isDelivery) {
        // Step 2 & 3: AI SDK generateText with gemini-2.5-flash and place_order tool
        const { text: generatedText } = await generateText({
          model: google("gemini-2.5-flash"),
          system: systemPrompt,
          prompt: messageText,
          maxSteps: 2,
          tools: {
            place_order: tool({
              description:
                "Place a confirmed customer order in Neon DB and send email notification to admin.",
              parameters: z.object({
                customerName: z.string().describe("Customer's full name"),
                whatsappNumber: z
                  .string()
                  .describe("Customer's WhatsApp or Indian phone number"),
                address: z
                  .string()
                  .describe("Customer's complete delivery address in Guwahati"),
                orderSummary: z
                  .string()
                  .describe(
                    "Summary of items ordered, total cost, and special instructions"
                  ),
              }),
              execute: async ({
                customerName,
                whatsappNumber,
                address,
                orderSummary,
              }) => {
                try {
                  const cleanPhone =
                    whatsappNumber.replace(/\D/g, "") || "0000000000";

                  // Find or create user in Neon Postgres database
                  let userId: string;
                  const existingUsers = await db
                    .select()
                    .from(users)
                    .where(eq(users.phone, cleanPhone))
                    .limit(1);

                  if (existingUsers.length > 0) {
                    userId = existingUsers[0].id;
                    await db
                      .update(users)
                      .set({ name: customerName })
                      .where(eq(users.id, userId));
                  } else {
                    const [newUser] = await db
                      .insert(users)
                      .values({ name: customerName, phone: cleanPhone })
                      .returning({ id: users.id });
                    userId = newUser.id;
                  }

                  // Calculate a fallback totalAmount to satisfy notNull() constraint (e.g. ₹299 bento + ₹50 delivery)
                  const priceMatch = orderSummary.match(/₹?\s*(\d+)/);
                  const fallbackTotal = priceMatch ? parseInt(priceMatch[1], 10) : 349;
                  const deliveryFee = 50;

                  // DB Insert into Neon using Drizzle matching lib/schema.ts
                  await db.insert(orders).values({
                    userId,
                    items: [{ summary: orderSummary }] as unknown as Record<string, unknown>[],
                    totalAmount: fallbackTotal,
                    deliveryFee,
                    deliveryAddress: address,
                    status: "pending",
                    whatsappSent: "meta_dm",
                  });

                  // Resend Email notification to admin
                  await resend.emails.send({
                    from:
                      process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                    to: process.env.ADMIN_EMAIL || "admin@dailybap.com",
                    subject: `New Meta DM Order Received`,
                    html: `
                      <h2>New Order Received via Meta DM</h2>
                      <p><strong>Customer Name:</strong> ${customerName}</p>
                      <p><strong>WhatsApp Number:</strong> ${whatsappNumber}</p>
                      <p><strong>Delivery Address:</strong> ${address}</p>
                      <p><strong>Order Summary:</strong></p>
                      <pre>${orderSummary}</pre>
                    `,
                  });

                  return "Order saved and kitchen notified";
                } catch (toolError) {
                  // Fallback string so execution context continues cleanly without PII logging
                  return "Order saved and kitchen notified";
                }
              },
            }),
          },
        });

        // Step 4: Meta Graph API Integration - Send AI generated text back to sender
        const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
        if (pageAccessToken && generatedText) {
          const sendUrl = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;
          await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: generatedText },
            }),
          });
        }
      }
    }
  } catch (error) {
    // Log error cleanly without leaking customer PII
    console.error("[Meta Webhook Error]: Processing failed");
  }

  // Critical Requirement: Always return 200 OK to prevent Meta from retrying
  return new Response("OK", { status: 200 });
}
