/**
 * Assets Configuration
 * 
 * This file contains all constants related to textures, backgrounds, and asset management.
 * 
 * MODIFICATION GUIDELINES:
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

export interface TextureItem {
  readonly name: string;
  readonly displayName: string;
  readonly type: 'texture';
  readonly path: string;
}

export type AssetItem = TextureItem;

export interface DefaultColors {
  readonly SELECTED: string;
  readonly GREY_RGB: RGB;
}

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

export const BACKGROUND_COLORS: readonly BackgroundColor[] = [
  { name: 'grey', displayName: 'Dark Grey', rgb: [0.1, 0.1, 0.1], cssColor: '#1a1a1a' },
  { name: 'white', displayName: 'White', rgb: [1.0, 1.0, 1.0], cssColor: '#ffffff' }
];

export const PAINT_OPTIONS: readonly AssetItem[] = [
  { name: 'coast', displayName: 'Coast', type: 'texture', path: '/assets/terrain/coast.png' },
  { name: 'forest', displayName: 'Forest', type: 'texture', path: '/assets/terrain/forest.png' },
  { name: 'mountain', displayName: 'Mountain', type: 'texture', path: '/assets/terrain/mountain.png' },
  { name: 'ocean', displayName: 'Ocean', type: 'texture', path: '/assets/terrain/ocean.png' },
  { name: 'plains', displayName: 'Plains', type: 'texture', path: '/assets/terrain/plains.png' },
  { name: 'shrubland', displayName: 'Shrubland', type: 'texture', path: '/assets/terrain/shrubland.png' },
  { name: 'swamp', displayName: 'Swamp', type: 'texture', path: '/assets/terrain/swamp.png' }
];
