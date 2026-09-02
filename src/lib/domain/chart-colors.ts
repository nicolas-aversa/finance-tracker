/**
 * Categorical palette — 12 slots, generated in OKLCH and validated with the
 * dataviz skill's `validate_palette.js`.
 *
 * The hues are 30° apart on the wheel and the **lightness alternates** between
 * a high and a low step. That alternation is the point: under deuteranopia and
 * protanopia hue collapses, and two mid-lightness wedges of different hue can
 * come out identical (an earlier equal-lightness attempt measured ΔE 0.9
 * between teal and magenta). Lightness is what keeps them apart when hue fails,
 * so the order must be preserved — it is the safety mechanism, not cosmetics.
 *
 * Light mode passes all six checks (worst adjacent CVD ΔE 13.4, normal-vision
 * 18.1). Dark mode passes every check except the chroma floor on slot 2
 * (#03718f, 0.096 against a 0.1 floor) — the sRGB gamut simply has no more
 * chroma at that lightness and hue, and every alternative that clears chroma
 * lands too close to its teal neighbour to clear the normal-vision floor.
 * Twelve slots is past what the reference palette (eight) certifies; both modes
 * carry a contrast WARN, which obliges the visible labels the legends already
 * ship — every wedge is named and valued beside its swatch, and wedges are
 * separated by a 2px surface gap.
 */
export const TICKER_CATEGORICAL_COLORS: { light: string; dark: string }[] = [
  { light: "#60a7ff", dark: "#348ff9" }, // azul
  { light: "#017d9f", dark: "#03718f" }, // cian oscuro
  { light: "#08bcbc", dark: "#07a4a4" }, // turquesa
  { light: "#078661", dark: "#057957" }, // verde profundo
  { light: "#6cbd2e", dark: "#5aa61b" }, // lima
  { light: "#7c7402", dark: "#706901" }, // oliva
  { light: "#da950b", dark: "#bf8105" }, // ámbar
  { light: "#b84b03", dark: "#a64404" }, // naranja quemado
  { light: "#ff6e81", dark: "#e7566b" }, // coral
  { light: "#b8338a", dark: "#a82b7d" }, // magenta
  { light: "#d07af5", dark: "#b767d9" }, // orquídea
  { light: "#6b58d9", dark: "#604ec7" }, // violeta
];

export const OTHER_BUCKET_COLOR = { light: "#c3c2b7", dark: "#383835" }; // baseline/axis gray

/**
 * Reserved for meaning (good/bad), never for identity — that is why the
 * categorical slots above avoid pure status green and red.
 */
export const STATUS_COLOR = {
  good: { light: "#0ca30c", dark: "#0ca30c" },
  critical: { light: "#d03b3b", dark: "#d03b3b" },
};

/** Past the palette a series folds into the neutral bucket rather than cycling. */
export function tickerColor(index: number): { light: string; dark: string } {
  return TICKER_CATEGORICAL_COLORS[index] ?? OTHER_BUCKET_COLOR;
}
