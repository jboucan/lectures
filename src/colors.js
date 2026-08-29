// KOReader's built-in highlight colors. If your export uses different
// names, add them here — anything unrecognized falls back to gray.
const COLOR_MAP = {
  yellow: 'var(--hl-yellow)',
  orange: 'var(--hl-orange)',
  red: 'var(--hl-red)',
  pink: 'var(--hl-pink)',
  green: 'var(--hl-green)',
  olive: 'var(--hl-olive)',
  cyan: 'var(--hl-cyan)',
  teal: 'var(--hl-cyan)',
  blue: 'var(--hl-blue)',
  purple: 'var(--hl-purple)',
  violet: 'var(--hl-purple)',
  gray: 'var(--hl-gray)',
  grey: 'var(--hl-gray)',
}

export function colorForName(name) {
  return COLOR_MAP[(name || '').toLowerCase()] || 'var(--hl-gray)'
}

export function drawerClass(drawer) {
  const known = ['lighten', 'underline', 'strikeout']
  return known.includes(drawer) ? drawer : 'lighten'
}
