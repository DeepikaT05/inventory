// Organic design-system tokens (from design/_ds/.../styles.css).
export const C = {
  bg: '#f5ead8',
  surface: '#ebddc5',
  text: '#201e1d',
  accent: '#c67139',
  divider: 'rgba(32,30,29,0.16)',
  white: '#ffffff',
  backdrop: 'rgba(32,30,29,0.45)',

  n100: '#f9f4ed', n200: '#eee7db', n300: '#dcd3c4', n400: '#c0b6a5', n500: '#a19786',
  n600: '#82796a', n700: '#645c50', n800: '#474238', n900: '#2e2b25',

  a100: '#fff2eb', a200: '#ffe1d0', a300: '#ffc6a5', a400: '#f6a06b', a500: '#d67f48',
  a600: '#b2622d', a700: '#8c491a', a800: '#643312', a900: '#402310',

  g100: '#f0fae1', g200: '#e1eecc', g300: '#ccdbb2', g400: '#aebf92', g500: '#8fa073',
  g600: '#728157', g700: '#56633f', g800: '#3d472b', g900: '#272e1b',
} as const;

export const F = {
  heading: 'Caprasimo_400Regular',
  body: 'Figtree_400Regular',
  semi: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  hi: 'NotoSansDevanagari_400Regular',
  hiSemi: 'NotoSansDevanagari_600SemiBold',
} as const;

export const R = { sm: 8, md: 16, lg: 28, pill: 999 } as const;

export const shadow = {
  sm: { shadowColor: '#2e2b25', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: '#2e2b25', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  lg: { shadowColor: '#2e2b25', shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
} as const;

// Colours offered when adding an item — the design's item swatches.
export const ITEM_COLORS = ['#b2622d', '#8fa073', '#a19786', '#56633f', '#c67139', '#8c491a', '#728157', '#645c50'];
