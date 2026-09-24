export type Theme = "system" | "light" | "dark";

/** Shared with the blocking script in `layout.tsx`; changing one means changing both. */
export const THEME_KEY = "consentbench-theme";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "system",
    label: "System",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" {...stroke}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Light",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" {...stroke}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M22 12h-2M4 12H2M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4M19.1 19.1l-1.4-1.4M6.3 6.3L4.9 4.9" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" {...stroke}>
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
      </svg>
    ),
  },
];

/**
 * Three states: an explicit choice stamps `data-theme` and overrides the OS in
 * both directions; "System" removes the stamp. Ink only — interaction spends
 * no hue.
 */
export function ThemeToggle() {
  return (
    <fieldset aria-label="Colour theme" data-theme-toggle="true" className="theme-toggle">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          disabled
          type="button"
          data-theme={o.value}
          aria-pressed={o.value === "system"}
          title={`${o.label} theme`}
        >
          <span aria-hidden="true">{o.icon}</span>
          <span className="sr-only">{o.label} theme</span>
        </button>
      ))}
    </fieldset>
  );
}
