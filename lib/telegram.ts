// lib/telegram.ts — Server-side Telegram Bot notification service for Daily Bap

export interface TelegramOrderNotificationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliverySlotLabel?: string | null;
  items: Array<{ name?: string; summary?: string; quantity?: number; price?: number }>;
  totalAmount: number;
  deliveryFee: number;
  discountAmount?: number;
  couponCode?: string | null;
}

/**
 * Sends a real-time order alert to admin's Telegram chat / channel.
 * Designed to be non-blocking (fire-and-forget) so customer checkout is never delayed.
 */
export async function sendTelegramOrderNotification(
  data: TelegramOrderNotificationData
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    // Telegram credentials not configured; skip silently in development
    return false;
  }

  try {
    const itemsList = data.items
      .map((item) => {
        const title = item.name || item.summary || "Item";
        const qty = item.quantity || 1;
        const price = item.price ? ` (₹${item.price * qty})` : "";
        return `• <b>${qty}x</b> ${title}${price}`;
      })
      .join("\n");

    const discountLine =
      data.couponCode && data.discountAmount && data.discountAmount > 0
        ? `\n🎟️ <b>Coupon:</b> <code>${data.couponCode}</code> (−₹${data.discountAmount})`
        : "";

    const message = [
      `🔔 <b>NEW DAILY BAP ORDER RECEIVED!</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 <b>Order No:</b> <code>${data.orderNumber}</code>`,
      `👤 <b>Customer:</b> ${data.customerName}`,
      `📞 <b>Phone:</b> <a href="tel:+91${data.customerPhone}">+91 ${data.customerPhone}</a>`,
      `📍 <b>Address:</b> ${data.deliveryAddress}`,
      `⏰ <b>Slot:</b> ${data.deliverySlotLabel || "ASAP"}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🍲 <b>Items:</b>\n${itemsList}`,
      discountLine,
      `🚚 <b>Delivery Fee:</b> ${data.deliveryFee === 0 ? "FREE" : `₹${data.deliveryFee}`}`,
      `💰 <b>Total Amount:</b> <b>₹${data.totalAmount}</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🔗 <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dailybap.com"}/orders/${data.orderId}">View Order Status</a>`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn("[Telegram Notification] Failed response:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Telegram Notification] Network error:", error);
    return false;
  }
}
