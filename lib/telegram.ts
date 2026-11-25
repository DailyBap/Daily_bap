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
  huntRewardLabel?: string | null;
}

interface TelegramApiResponse {
  ok?: boolean;
  result?: {
    message_id?: number;
  };
  error_code?: number;
  description?: string;
}

interface TelegramLogPayload {
  stage: "telegram";
  ok: boolean;
  httpStatus: number | null;
  telegramErrorCode: number | null;
  description: string | null;
  orderNumber: string;
  messageId: number | null;
}

const TELEGRAM_TIMEOUT_MS = 4000;
const TELEGRAM_MAX_ATTEMPTS = 2;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function logTelegramResult(payload: TelegramLogPayload): void {
  if (payload.ok) {
    console.info(JSON.stringify(payload));
  } else {
    console.error(JSON.stringify(payload));
  }
}

/**
 * Sends a real-time order alert to admin's Telegram chat / channel.
 * Escapes HTML entities, uses a 4s AbortController timeout per attempt,
 * retries once on network/timeout/5xx (never on 4xx), and never throws.
 */
export async function sendTelegramOrderNotification(
  data: TelegramOrderNotificationData
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    logTelegramResult({
      stage: "telegram",
      ok: false,
      httpStatus: null,
      telegramErrorCode: null,
      description: "missing_env",
      orderNumber: data.orderNumber,
      messageId: null,
    });
    return false;
  }

  const itemsList = data.items
    .map((item) => {
      const title = escapeHtml(item.name || item.summary || "Item");
      const qty = item.quantity || 1;
      const price = item.price ? ` (₹${item.price * qty})` : "";
      return `• <b>${qty}x</b> ${title}${price}`;
    })
    .join("\n");

  const discountLine =
    data.couponCode && data.discountAmount && data.discountAmount > 0
      ? `\n🎟️ <b>Coupon:</b> <code>${escapeHtml(data.couponCode)}</code> (−₹${data.discountAmount})`
      : "";

  const huntLine = data.huntRewardLabel
    ? `\n🎁 <b>Treasure Hunt:</b> ${escapeHtml(data.huntRewardLabel)}`
    : "";

  const safeOrderNumber = escapeHtml(data.orderNumber);
  const safeCustomerName = escapeHtml(data.customerName);
  const safeCustomerPhone = escapeHtml(data.customerPhone);
  const safeDeliveryAddress = escapeHtml(data.deliveryAddress);
  const safeSlotLabel = escapeHtml(data.deliverySlotLabel || "ASAP");
  const safeOrderId = escapeHtml(data.orderId);
  const appUrl = escapeHtml(process.env.NEXT_PUBLIC_APP_URL || "https://dailybap.com");

  const message = [
    `🔔 <b>NEW DAILY BAP ORDER RECEIVED!</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📦 <b>Order No:</b> <code>${safeOrderNumber}</code>`,
    `👤 <b>Customer:</b> ${safeCustomerName}`,
    `📞 <b>Phone:</b> <a href="tel:+91${safeCustomerPhone}">+91 ${safeCustomerPhone}</a>`,
    `📍 <b>Address:</b> ${safeDeliveryAddress}`,
    `⏰ <b>Slot:</b> ${safeSlotLabel}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🍲 <b>Items:</b>\n${itemsList}`,
    discountLine,
    huntLine,
    `🚚 <b>Delivery Fee:</b> ${data.deliveryFee === 0 ? "FREE" : `₹${data.deliveryFee}`}`,
    `💰 <b>Total Amount:</b> <b>₹${data.totalAmount}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="${appUrl}/orders/${safeOrderId}">View Order Status</a>`,
  ]
    .filter(Boolean)
    .join("\n");

  const payloadBody = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  for (let attempt = 1; attempt <= TELEGRAM_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadBody,
          signal: controller.signal,
        }
      );

      const json = (await response.json().catch(() => null)) as TelegramApiResponse | null;

      if (response.ok && json?.ok) {
        logTelegramResult({
          stage: "telegram",
          ok: true,
          httpStatus: response.status,
          telegramErrorCode: null,
          description: null,
          orderNumber: data.orderNumber,
          messageId: json.result?.message_id ?? null,
        });
        return true;
      }

      const isClientError = response.status >= 400 && response.status < 500;
      const shouldRetry = !isClientError && attempt < TELEGRAM_MAX_ATTEMPTS;

      if (shouldRetry) {
        continue;
      }

      logTelegramResult({
        stage: "telegram",
        ok: false,
        httpStatus: response.status,
        telegramErrorCode: json?.error_code ?? null,
        description: json?.description ?? (response.statusText || "telegram_api_error"),
        orderNumber: data.orderNumber,
        messageId: null,
      });
      return false;
    } catch (error) {
      if (attempt < TELEGRAM_MAX_ATTEMPTS) {
        continue;
      }

      const description =
        error instanceof Error
          ? error.name === "AbortError"
            ? "timeout"
            : error.message
          : "network_error";

      logTelegramResult({
        stage: "telegram",
        ok: false,
        httpStatus: null,
        telegramErrorCode: null,
        description,
        orderNumber: data.orderNumber,
        messageId: null,
      });
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return false;
}
