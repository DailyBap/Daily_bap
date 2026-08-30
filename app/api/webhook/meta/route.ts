import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import {
  siteConfig,
  foodPrinciples,
  whyPreOrder,
  howToEat,
  menuData,
  processSteps,
} from "@/config/brand";

// Dynamic brand knowledge base strictly sourced from config/brand.ts
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
- Kitchen Location: Guwahati
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
5. KEEP RESPONSES DM-FRIENDLY: Keep responses concise, upbeat, clean, and formatted naturally for Direct Messaging platforms (Facebook Messenger & Instagram Direct).

${brandKnowledge}
`.trim();

/**
 * Step 1: GET Handler - Meta Webhook Verification Handshake
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
 * Step 2 & 3: POST Handler - Incoming Direct Message Handler & Meta Graph API Integration
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Extract payload from body.entry[0].messaging[0]
    const messaging = body.entry?.[0]?.messaging?.[0];

    if (messaging) {
      const senderId = messaging.sender?.id;
      const messageText = messaging.message?.text;
      const isEcho = messaging.message?.is_echo;
      const isRead = !!messaging.read;
      const isDelivery = !!messaging.delivery;

      // Extract sender.id and message.text. Ignore read receipts, echo messages, or missing text
      if (senderId && messageText && !isEcho && !isRead && !isDelivery) {
        // Generate AI response using gemini-2.5-flash
        const { text: generatedText } = await generateText({
          model: google("gemini-2.5-flash"),
          system: systemPrompt,
          prompt: messageText,
        });

        // Send API integration via Meta Graph API
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
    console.error("[Meta Webhook Error]:", error);
  }

  // Critical Requirement: Always return a 200 OK response at the end of the POST handler
  return new Response("EVENT_RECEIVED", { status: 200 });
}
