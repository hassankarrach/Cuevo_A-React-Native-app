import { useAppColors } from './useAppColors';

// Existing screen styles share these neutral colors. Resolve them once per style
// sheet, preserving geometry, accent artwork and white labels on colored actions.
const darkSheets = new WeakMap<object, object>();
const textColors = new Set(['#231B18', '#211B18', '#271E19', '#3C241C', '#30241E', '#35251F', '#37251C', '#33251F', '#30251F', '#38251D', '#3B241B']);
const secondaryColors = new Set(['#716460', '#928B86', '#88776D', '#7D6B60', '#8A776B', '#806F64', '#776A63', '#786A61']);

function darkValue(value: string, property: string, name: string): string {
  const hex = (value.length === 4 && value.startsWith('#') ? '#' + [...value.slice(1)].map(c => c + c).join('') : value).toUpperCase();
  if (property === 'color') {
    // Initials sit on the account's pastel avatar color in either appearance.
    if (/initial/i.test(name)) return value;
    if (textColors.has(hex)) return '#F5F5F5';
    if (['#B93D1B', '#C5392A', '#C84020'].includes(hex)) return '#FF927B';
    if (['#9A6147', '#A35D39'].includes(hex)) return '#DFA482';
    if (secondaryColors.has(hex)) return '#B8B8B8';
    if (/^#[0-9A-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      if (Math.max(r, g, b) - Math.min(r, g, b) < 55 && Math.max(r, g, b) < 170) return '#B8B8B8';
    }
    return value;
  }
  if (property === 'backgroundImage') {
    if (/glow|shine|highlight|orbit|banner|cover|hero|primary|button/i.test(name)) return value;
    return value.replace(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/g, 'rgba(22,22,22,$1)')
      .replace(/rgba\((?:255,\s*252,\s*248|246,\s*243,\s*239|250,\s*249,\s*245),\s*([\d.]+)\)/g, 'rgba(12,13,12,$1)')
      .replace(/#(?:FFFFFF|FFFCF8|F6F3EF|FAF9F5|DCD8D3)\b/gi, '#161616');
  }
  if (/^(backgroundColor|border.*Color)$/.test(property)) {
    const border = property.startsWith('border');
    if (property === 'backgroundColor' && /^(navbar|topBar|header)$/.test(name)) return 'transparent';
    if (!border && /progressFill|progressDot/.test(name)) return value;
    if (/^rgba?\(255,\s*(?:255,\s*255|252,\s*248),/.test(value)) return border ? 'rgba(255,255,255,0.12)' : value.replace(/255,\s*(?:255,\s*255|252,\s*248)/, '22,22,22');
    if (/^#[0-9A-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      if (Math.min(r, g, b) > (border ? 175 : 200)) {
        if (border) return '#2B2B2B';
        if (/avatar|initial|swatch/.test(name)) return value;
        if (/screen|page|map|layout|background/.test(name)) return '#0C0D0C';
        return Math.min(r, g, b) > 240 ? '#161616' : '#242424';
      }
      if (r > 240 && g > 185 && b > 150 && !/avatar|badge|cover|banner|hero/.test(name)) return border ? '#654231' : '#422A20';
    }
  }
  return value;
}

export function useThemedStyles<T extends object>(sheet: T): T {
  const { dark } = useAppColors();
  if (!dark) return sheet;
  let resolved = darkSheets.get(sheet);
  if (!resolved) {
    resolved = Object.fromEntries(Object.entries(sheet).map(([name, style]) => [name,
      Object.fromEntries(Object.entries(style as object).map(([property, value]) => [property, typeof value === 'string' ? darkValue(value, property, name) : value])),
    ]));
    darkSheets.set(sheet, resolved);
  }
  return resolved as T;
}
