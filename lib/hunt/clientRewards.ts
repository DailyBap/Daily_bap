// lib/hunt/clientRewards.ts — Client-side device ID and "My Rewards" local persistence

export interface LocalReward {
  voucherCode: string;
  couponCode: string;
  label: string;
  expiresAt: string;
  status: "HELD" | "REDEEMED";
  addedAt: string;
}

const DEVICE_ID_KEY = "daily_bap_hunt_device_id";
const REWARDS_KEY = "daily_bap_hunt_my_rewards";

/**
 * Returns existing persistent device UUID or generates and persists a new one.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server_device_placeholder";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.length < 8) {
      id = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "fallback_device_id";
  }
}

/**
 * Returns customer's list of discovered rewards from localStorage.
 */
export function getLocalRewards(): LocalReward[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REWARDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalReward[];
  } catch {
    return [];
  }
}

/**
 * Saves or updates a reward in customer's local rewards list.
 */
export function saveLocalReward(reward: Omit<LocalReward, "addedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalRewards().filter((r) => r.couponCode !== reward.couponCode);
    const updated: LocalReward[] = [
      {
        ...reward,
        addedAt: new Date().toISOString(),
      },
      ...existing,
    ];
    localStorage.setItem(REWARDS_KEY, JSON.stringify(updated.slice(0, 20)));
  } catch (err) {
    console.error("[saveLocalReward] LocalStorage write error:", err);
  }
}

/**
 * Marks a reward as redeemed in local storage.
 */
export function markLocalRewardRedeemed(couponCode: string): void {
  if (typeof window === "undefined") return;
  try {
    const rewards = getLocalRewards().map((r) =>
      r.couponCode === couponCode ? { ...r, status: "REDEEMED" as const } : r
    );
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  } catch (err) {
    console.error("[markLocalRewardRedeemed] Error:", err);
  }
}
