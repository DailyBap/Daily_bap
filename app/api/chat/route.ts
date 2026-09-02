import { streamText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  siteConfig,
  foodPrinciples,
  whyPreOrder,
  howToEat,
  menuData,
  processSteps,
} from "@/config/brand";
import { checkDeliveryZone as checkGeoDeliveryZone, KITCHEN_COORDS, DELIVERY_RADIUS_KM } from "@/lib/geo";
import { db } from "@/lib/db";
import { users, orders, chatSessions } from "@/lib/schema";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { eq } from "drizzle-orm";
import type { CartItem, CustomerInfo } from "@/types";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// Construct dynamic brand knowledge base from config/brand.ts
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

========================================
DELIVERY & PRICING POLICIES
========================================
- Kitchen Location: Guwahati (Lat: ${KITCHEN_COORDS.lat}, Lng: ${KITCHEN_COORDS.lng})
- Delivery Radius: ${DELIVERY_RADIUS_KM} km from kitchen
- Delivery Fee: Flat ₹50 (FREE delivery on orders ₹1000 and above)
- Model: 100% Pre-order cloud kitchen. Every meal is cooked fresh specifically for the order.
`;

const systemPrompt = `
You are the Daily Bap digital concierge—a fun, friendly, upbeat Gen-Z foodie assistant who is completely obsessed with authentic Korean comfort food! You talk like a passionate food lover texting a friend (warm, witty, hype, using lively phrasing like "chef's kiss", "hitting the spot", "what are we craving today?", "say less! 🤌", "elite combo", "pro tip", with natural emoji usage 🍱✨🥢🔥).

YOUR PERSONA & CONVERSATION RULES:
1. NO MENU DUMPING: Never paste the entire menu or big walls of text unless explicitly asked. If someone says "hi", "hey", or asks "what do you have?", give a 2-sentence hype intro about our 100% fresh pre-order Korean kitchen in Guwahati, highlight our signature categories (Signature Bento Boxes & Bibimbap Bowls at ₹299, plus authentic sides), and ask what flavor profile they're in the mood for (e.g., crispy Korean fried chicken, saucy bulgogi, or comforting veggies/tofu).
2. HYPE UP ORDERS & SUGGEST ELITE PAIRINGS: When a customer picks an item, hype up their choice enthusiastically and suggest an elite pairing (e.g., adding an extra fried egg for ₹30, House-Made Kimchi for ₹100, spicy gochujang mayo for ₹40, or pickled radish for ₹60).
3. SINGLE SOURCE OF TRUTH: Rely ONLY on the menu items, prices, descriptions, and principles provided below from our brand configuration. Never hallucinate fake items or wrong prices.
4. 100% PRE-ORDER MODEL: We cook every single meal fresh specifically for the order (zero food waste, maximum freshness).
5. DELIVERY CHECK FLOW: When the customer mentions their location, area, or coordinates in Guwahati, use the checkDeliveryZone tool. Remind them delivery is ₹50 flat, or FREE on orders ₹1000+.
6. ORDERING & FINALIZATION:
   To place an order, make sure you have:
   - Customer Full Name
   - 10-digit Indian Phone Number (e.g. 9876543210)
   - Complete Delivery Address in Guwahati
   - Selected items with quantities
   - Preferred 30-minute Delivery Time Slot (e.g. "Today, 7:30–8:00 PM" or "ASAP (~45 mins)"). Orders require at least 45 minutes fresh preparation lead time between 11:00 AM and 10:00 PM.
   Confirm their order summary, delivery slot, and total with them, call the createOrderRecord tool, and celebrate their order with the WhatsApp finalization link!

${brandKnowledge}
`.trim();

export async function POST(req: Request) {
  try {
    const { messages, sessionId, userPhone } = await req.json();

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("🚨 API ROUTE FATAL ERROR 🚨: GOOGLE_GENERATIVE_AI_API_KEY is not defined in environment variables!");
    }

    const result = streamText({
      model: google("gemini-3.6-flash"),
      system: systemPrompt,
      messages,
      maxSteps: 5,
      onError: ({ error }) => {
        console.error("🚨 AI SDK STREAM ERROR 🚨:", error);
      },
      tools: {
        checkDeliveryZone: tool({
          description:
            "Check if a customer location coordinates (latitude and longitude) or address in Guwahati falls within the 5km delivery radius of Daily Bap kitchen.",
          parameters: z.object({
            lat: z.number().describe("Latitude of customer location"),
            lng: z.number().describe("Longitude of customer location"),
            address: z
              .string()
              .optional()
              .describe("Optional address or area name in Guwahati"),
          }),
          execute: async ({ lat, lng, address }) => {
            const geoResult = checkGeoDeliveryZone(lat, lng);
            return {
              isDeliverable: geoResult.isDeliverable,
              distanceKm: geoResult.distanceKm,
              maxRadiusKm: DELIVERY_RADIUS_KM,
              address: address || "Guwahati",
              message: geoResult.isDeliverable
                ? `Great news! Location is ${geoResult.distanceKm} km away, well within our ${DELIVERY_RADIUS_KM} km delivery zone.`
                : `Sorry, location is ${geoResult.distanceKm} km away, which exceeds our ${DELIVERY_RADIUS_KM} km delivery radius.`,
            };
          },
        }),

        createOrderRecord: tool({
          description:
            "Save a confirmed customer order to the database and generate a WhatsApp checkout link.",
          parameters: z.object({
            customerName: z.string().describe("Customer full name"),
            customerPhone: z
              .string()
              .describe("10-digit Indian phone number without + or spaces"),
            deliveryAddress: z
              .string()
              .describe("Full delivery address in Guwahati"),
            deliverySlotLabel: z
              .string()
              .optional()
              .describe("Requested delivery slot e.g. Today, 7:30–8:00 PM or ASAP"),
            items: z
              .array(
                z.object({
                  id: z.string().describe("Menu item ID"),
                  name: z.string().describe("Menu item name"),
                  price: z.number().describe("Price per unit in ₹"),
                  quantity: z.number().int().min(1).describe("Quantity"),
                })
              )
              .min(1)
              .describe("List of items to order"),
          }),
          execute: async ({
            customerName,
            customerPhone,
            deliveryAddress,
            deliverySlotLabel,
            items,
          }) => {
            try {
              const subtotal = items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );
              const deliveryFee = subtotal >= 1000 ? 0 : 50;
              const total = subtotal + deliveryFee;

              const cleanPhone = customerPhone.replace(/\D/g, "");

              const slotLabel = deliverySlotLabel || "ASAP (Today, ~45-60 mins)";
              const reqTime = new Date(Date.now() + 45 * 60 * 1000);

              // 1. Find or create user in DB
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

              // 2. Insert order record
              const cartItems: CartItem[] = items.map((i) => ({
                id: i.id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                modelRef: null,
              }));

              const [newOrder] = await db
                .insert(orders)
                .values({
                  userId,
                  items: cartItems as unknown as Record<string, unknown>[],
                  totalAmount: total,
                  deliveryFee,
                  deliveryAddress,
                  requestedDeliveryTime: reqTime,
                  deliverySlotLabel: slotLabel,
                  status: "pending",
                  whatsappSent: "pending_wa_click",
                })
                .returning({ id: orders.id });

              // 3. Generate WhatsApp checkout deep link
              const customer: CustomerInfo = {
                name: customerName,
                phone: cleanPhone,
                address: deliveryAddress,
              };

              const whatsappUrl = generateWhatsAppLink(
                cartItems,
                customer,
                subtotal,
                deliveryFee,
                slotLabel,
                newOrder?.id
              );

              // 4. Optionally record session memory if provided
              if (sessionId || cleanPhone) {
                try {
                  await db.insert(chatSessions).values({
                    userPhone: cleanPhone,
                    messages: messages as unknown as Record<string, unknown>[],
                  });
                } catch {
                  // Non-critical session memory logging failure
                }
              }

              return {
                success: true,
                orderId: newOrder?.id || "ORDER-CREATED",
                subtotal,
                deliveryFee,
                total,
                itemsCount: items.length,
                whatsappUrl,
                message:
                  "Order saved successfully! Click the WhatsApp button to confirm your order with our kitchen.",
              };
            } catch (err: unknown) {
              const errMsg =
                err instanceof Error ? err.message : "Failed to record order";
              console.error("[createOrderRecord Tool Error]:", err);
              return {
                success: false,
                error: errMsg,
                message:
                  "Failed to save order to the database. Please verify the details or try again.",
              };
            }
          },
        }),
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error: unknown) => {
        if (error == null) return "Unknown stream error occurred";
        if (typeof error === "string") return error;
        if (error instanceof Error) return error.message;
        try {
          return JSON.stringify(error);
        } catch {
          return String(error);
        }
      },
    });
  } catch (error: unknown) {
    console.error("🚨 API ROUTE FATAL ERROR 🚨:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        error: message,
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
