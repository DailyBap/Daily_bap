import type { CartItem } from "@/types";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { useCartStore } from "@/store/useCartStore";

/**
 * Client-side utility that reads from Zustand store and
 * generates the WhatsApp URL without needing a server round-trip.
 * Used as fallback if the server action fails.
 */
export function buildWhatsAppUrlFromStore(): string {
  const store = useCartStore.getState();
  return generateWhatsAppLink(
    store.items,
    store.customerInfo,
    store.getSubtotal(),
    store.getDeliveryFee()
  );
}
