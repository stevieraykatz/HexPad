/**
 * Assets Configuration
 * 
 * This file contains all constants related to colors, textures, and asset management.
 * 
 * MODIFICATION GUIDELINES:
 * 
 * ADDING NEW COLORS:
 * - Add to COLORS array with name, hex value, and RGB values (0-1 range for WebGL)
 * - RGB values: divide hex RGB by 255 (e.g.,rgb(216, 153, 153) = [1.0, 0.0, 0.0])
 * 
 * ADDING NEW TEXTURES:
 * - Add new texture item to PAINT_OPTIONS array with name, displayName, type, and path
 * - Place texture files in public/assets/terrain/ folder
 * 
 * DEFAULT COLORS:
 * - GREY_RGB used for uncolored hexes and fallback states
 * - SELECTED defines the default selection state (typically 'grey')
 */

export type RGB = [number, number, number];

export interface Color {
  readonly name: string;
  readonly value: string; // Hex color value
  readonly rgb: RGB; // RGB values in 0-1 range for WebGL
}

export interface ColorItem {
  readonly name: string;
  readonly displayName: string;
  readonly type: 'color';
  readonly value: string;
  readonly rgb: RGB;
}

export interface TextureItem {
  readonly name: string;
  readonly displayName: string;
  readonly type: 'texture';
  readonly path: string;
}

export type AssetItem = ColorItem | TextureItem;

export interface DefaultColors {
  readonly SELECTED: string;
  readonly GREY_RGB: RGB;
}

export const COLORS: readonly Color[] = [
  { name: 'blue', value: '#3B82F6', rgb: [0.23, 0.51, 0.96] },
  { name: 'white', value: '#FFFFFF', rgb: [1.0, 1.0, 1.0] },
  { name: 'green', value: '#10B981', rgb: [0.06, 0.73, 0.51] },
  { name: 'yellow', value: '#F59E0B', rgb: [0.96, 0.62, 0.04] },
  { name: 'red', value: '#EF4444', rgb: [0.94, 0.27, 0.27] }
];

export const DEFAULT_COLORS: DefaultColors = {
  SELECTED: 'grey',
  GREY_RGB: [0.42, 0.45, 0.50], // Default grey color RGB values
};

export interface BackgroundColor {
  readonly name: string;
  readonly displayName: string;
  readonly rgb: RGB; // RGB values in 0-1 range for WebGL
  readonly cssColor: string;
}

export interface BarrierColor {
  readonly name: string;
  readonly displayName: string;
  readonly value: string; // Hex color value
  readonly rgb: RGB; // RGB values in 0-1 range for WebGL
}

export const BACKGROUND_COLORS: readonly BackgroundColor[] = [
  { name: 'grey', displayName: 'Dark Grey', rgb: [0.1, 0.1, 0.1], cssColor: '#1a1a1a' },
  { name: 'white', displayName: 'White', rgb: [1.0, 1.0, 1.0], cssColor: '#ffffff' }
];

export const BARRIER_COLORS: readonly BarrierColor[] = [
  { name: 'stone', displayName: 'Stone', value: '#6B7280', rgb: [0.42, 0.45, 0.50] },
  { name: 'brick', displayName: 'Brick', value: '#DC2626', rgb: [0.86, 0.15, 0.15] },
  { name: 'wood', displayName: 'Wood', value: '#92400E', rgb: [0.57, 0.25, 0.05] },
  { name: 'iron', displayName: 'Iron', value: '#374151', rgb: [0.22, 0.25, 0.32] },
  { name: 'gold', displayName: 'Gold', value: '#D97706', rgb: [0.85, 0.47, 0.02] },
  { name: 'crystal', displayName: 'Crystal', value: '#7C3AED', rgb: [0.49, 0.23, 0.93] }
];

// All available paint options - colors and terrain textures in a flat array
export const PAINT_OPTIONS: readonly AssetItem[] = [
  ...COLORS.map((color): ColorItem => ({
    name: color.name,
    displayName: color.name.charAt(0).toUpperCase() + color.name.slice(1),
    type: 'color',
    value: color.value,
    rgb: color.rgb
  })),
      { name: 'coast', displayName: 'Coast', type: 'texture', path: '/assets/terrain/coast.png' },
      { name: 'forest', displayName: 'Forest', type: 'texture', path: '/assets/terrain/forest.png' },
      { name: 'mountain', displayName: 'Mountain', type: 'texture', path: '/assets/terrain/mountain.png' },
      { name: 'ocean', displayName: 'Ocean', type: 'texture', path: '/assets/terrain/ocean.png' },
      { name: 'plains', displayName: 'Plains', type: 'texture', path: '/assets/terrain/plains.png' },
      { name: 'shrubland', displayName: 'Shrubland', type: 'texture', path: '/assets/terrain/shrubland.png' },
      { name: 'swamp', displayName: 'Swamp', type: 'texture', path: '/assets/terrain/swamp.png' }
];
