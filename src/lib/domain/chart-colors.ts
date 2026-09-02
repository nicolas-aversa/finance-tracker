/**
 * Validated chart palette (see the dataviz skill's references/palette.md).
 * Categorical slots 2 (green) and 8 (red) are deliberately excluded here:
 * this dashboard also uses status green/red for profit, and those two
 * categorical hues sit too close to the status hues (light-mode red vs
 * critical measures ΔE 4.8, below the 6 floor) to safely coexist on one page.
 */
export const TICKER_CATEGORICAL_COLORS: { light: string; dark: string }[] = [
  { light: "#2a78d6", dark: "#3987e5" }, // blue
  { light: "#e87ba4", dark: "#d55181" }, // magenta
  { light: "#eda100", dark: "#c98500" }, // yellow
  { light: "#1baf7a", dark: "#199e70" }, // aqua
  { light: "#eb6834", dark: "#d95926" }, // orange
  { light: "#4a3aa7", dark: "#9085e9" }, // violet
];

export const OTHER_BUCKET_COLOR = { light: "#c3c2b7", dark: "#383835" }; // baseline/axis gray

export const STATUS_COLOR = {
  good: { light: "#0ca30c", dark: "#0ca30c" },
  critical: { light: "#d03b3b", dark: "#d03b3b" },
};

export function tickerColor(index: number): { light: string; dark: string } {
  return TICKER_CATEGORICAL_COLORS[index] ?? OTHER_BUCKET_COLOR;
}

/**
 * Steps of a neutral ramp for the long tail past the categorical palette.
 *
 * Inventing more hues past the 6 validated ones would produce pairs that are
 * indistinguishable under colour-vision deficiency. Instead the tail — always
 * the smallest slices — keeps a single neutral hue and separates by lightness,
 * which stays honest at any count and reads as "minor" next to the coloured
 * leaders. The legend still names and values every one of them.
 */
const TAIL_RAMP: { light: string; dark: string }[] = [
  { light: "#8d8c82", dark: "#6b6a62" },
  { light: "#a4a399", dark: "#585750" },
  { light: "#bab9ae", dark: "#46453f" },
  { light: "#cfcec3", dark: "#35342f" },
];

export function tailColor(index: number): { light: string; dark: string } {
  return TAIL_RAMP[index % TAIL_RAMP.length];
}
