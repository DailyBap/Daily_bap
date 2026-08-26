// lib/whatsapp.ts — WhatsApp Bridge Checkout Utility for Daily Bap

import type { CartItem, CustomerInfo } from "@/types";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919999999999";

/**
 * Formats the cart into a human-readable WhatsApp message
 * and returns a deep-link URL that opens the WA chat with
 * the pre-filled order message.
 */
export function generateWhatsAppLink(
  items: CartItem[],
  customer: CustomerInfo,
  subtotal: number,
  deliveryFee: number
): string {
  const total = subtotal + deliveryFee;

  // Build the items list
  const itemLines = items
    .map(
      (item) =>
        `  • ${item.name} × ${item.quantity} — ₹${item.price * item.quantity}`
    )
    .join("\n");

  const deliveryLine =
    deliveryFee === 0
      ? "  🎉 Delivery: FREE (order above ₹1000)"
      : `  🛵 Delivery: ₹${deliveryFee}`;

  const message = `
🍱 *NEW DAILY BAP PRE-ORDER*
━━━━━━━━━━━━━━━━━━━━━━━
*ORDER DETAILS*
${itemLines}

━━━━━━━━━━━━━━━━━━━━━━━
  Subtotal: ₹${subtotal}
${deliveryLine}
  *TOTAL: ₹${total}*
━━━━━━━━━━━━━━━━━━━━━━━
*CUSTOMER DETAILS*
  👤 Name: ${customer.name}
  📞 Phone: ${customer.phone}
  📍 Address: ${customer.address}
━━━━━━━━━━━━━━━━━━━━━━━
PRE-ORDER • COOK FRESH • ENJOY
  `.trim();

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

/**
 * Validates a 10-digit Indian phone number
 */
export function validatePhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.trim());
}
