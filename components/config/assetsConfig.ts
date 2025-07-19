/**
 * Assets Configuration
 * 
 * This file contains all constants related to colors, textures, and asset management.
 * 
 * MODIFICATION GUIDELINES:
 * 
 * ADDING NEW COLORS:
 * - Add to COLORS array with name, hex value, and RGB values (0-1 range for WebGL)
 * - RGB values: divide hex RGB by 255 (e.g., #FF0000 = [1.0, 0.0, 0.0])
 * 
 * ADDING NEW TEXTURES:
 * - Add new texture item to PAINT_OPTIONS array with name, displayName, type, and path
 * - Place texture files in public/assets/terrain/ folder
 * 
 * ASSET PATHS:
 * - All paths should start with /assets/ (relative to public folder)
 * - Use .webp format for best compression and quality
 * - Follow naming convention: folderName/fileName.webp
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
  readonly GREY_RGB: RGB; // Default grey color RGB values
}

export interface AssetPaths {
  readonly BASE_PATH: string;
  readonly TERRAIN_PATH: string;
  readonly IMAGE_FORMAT: string;
}

// Assets and content configuration
export const COLORS: readonly Color[] = [
  { name: 'blue', value: '#3B82F6', rgb: [0.23, 0.51, 0.96] },
  { name: 'white', value: '#FFFFFF', rgb: [1.0, 1.0, 1.0] },
  { name: 'green', value: '#10B981', rgb: [0.06, 0.73, 0.51] },
  { name: 'yellow', value: '#F59E0B', rgb: [0.96, 0.62, 0.04] },
  { name: 'red', value: '#EF4444', rgb: [0.94, 0.27, 0.27] }
];

// Default colors
export const DEFAULT_COLORS: DefaultColors = {
  SELECTED: 'grey',
  GREY_RGB: [0.42, 0.45, 0.50], // Default grey color RGB values
};

// Background color options for app and export
export interface BackgroundColor {
  readonly name: string;
  readonly displayName: string;
  readonly rgb: RGB; // RGB values in 0-1 range for WebGL
  readonly cssColor: string; // CSS color value for UI
}

export const BACKGROUND_COLORS: readonly BackgroundColor[] = [
  { name: 'grey', displayName: 'Dark Grey', rgb: [0.1, 0.1, 0.1], cssColor: '#1a1a1a' },
  { name: 'white', displayName: 'White', rgb: [1.0, 1.0, 1.0], cssColor: '#ffffff' }
];

// All available paint options - colors and terrain textures in a flat array
export const PAINT_OPTIONS: readonly AssetItem[] = [
  // Color options
  ...COLORS.map((color): ColorItem => ({
    name: color.name,
    displayName: color.name.charAt(0).toUpperCase() + color.name.slice(1),
    type: 'color',
    value: color.value,
    rgb: color.rgb
  })),
        // Terrain textures (all in single terrain folder)
      { name: 'coast', displayName: 'Coast', type: 'texture', path: '/assets/terrain/coast.png' },
      { name: 'forest', displayName: 'Forest', type: 'texture', path: '/assets/terrain/forest.png' },
      { name: 'mountain', displayName: 'Mountain', type: 'texture', path: '/assets/terrain/mountain.png' },
      { name: 'ocean', displayName: 'Ocean', type: 'texture', path: '/assets/terrain/ocean.png' },
      { name: 'plains', displayName: 'Plains', type: 'texture', path: '/assets/terrain/plains.png' },
      { name: 'shrubland', displayName: 'Shrubland', type: 'texture', path: '/assets/terrain/shrubland.png' },
      { name: 'swamp', displayName: 'Swamp', type: 'texture', path: '/assets/terrain/swamp.png' }
];

// Asset paths configuration
export const ASSET_PATHS: AssetPaths = {
  BASE_PATH: '/assets',
  TERRAIN_PATH: '/assets/terrain',
  IMAGE_FORMAT: '.webp'
}; 