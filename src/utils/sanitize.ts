export function sanitizeName(value: string): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
}

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 3
  return Math.min(6, Math.max(1, Number(value.toFixed(1))))
}
