// Prefix of the validated 8-hue categorical palette (blue, orange, aqua, yellow,
// magenta, green, violet), in its fixed CVD-safe order — see the dataviz skill's
// palette.md. "Other" isn't a real item identity, so it gets a neutral gray instead
// of the 8th hue.
export const CATEGORICAL_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
]

export const OTHER_COLOR = '#898781'

export function colorForItem(itemId: number | null, index: number): string {
  return itemId === null ? OTHER_COLOR : CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
}
