import type { Diet } from "@/types";

interface DietBadgeProps {
  diet?: Diet;
  size?: number;
}

export default function DietBadge({ diet, size = 18 }: DietBadgeProps) {
  if (!diet) return null;

  const config = {
    veg: {
      color: "#0F8A3C",
      label: "Vegetarian",
      shape: "circle" as const,
    },
    egg: {
      color: "#E0A100",
      label: "Contains egg",
      shape: "circle" as const,
    },
    nonveg: {
      color: "#B3261E",
      label: "Non-vegetarian",
      shape: "triangle" as const,
    },
  }[diet];

  if (!config) return null;

  const innerSize = Math.round(size * 0.45);

  return (
    <span
      role="img"
      aria-label={config.label}
      title={config.label}
      className="inline-flex items-center justify-center flex-shrink-0 bg-white rounded border border-solid"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: config.color,
      }}
    >
      {config.shape === "circle" ? (
        <span
          className="rounded-full flex-shrink-0"
          style={{
            width: `${innerSize}px`,
            height: `${innerSize}px`,
            backgroundColor: config.color,
          }}
        />
      ) : (
        <span
          className="flex-shrink-0"
          style={{
            width: 0,
            height: 0,
            borderLeft: `${Math.round(innerSize / 2)}px solid transparent`,
            borderRight: `${Math.round(innerSize / 2)}px solid transparent`,
            borderBottom: `${innerSize}px solid ${config.color}`,
          }}
        />
      )}
    </span>
  );
}
