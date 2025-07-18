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
 * ADDING NEW TEXTURE FOLDERS:
 * - Add new folder to ASSET_FOLDERS with type: 'textures'
 * - Include items array with name, displayName, type, and path
 * - Add corresponding folder to public/assets/
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

export interface AssetFolder {
  readonly type: 'colors' | 'textures';
  readonly items: readonly (ColorItem | TextureItem)[];
}

export type AssetFolders = {
  readonly [key: string]: AssetFolder;
};

export interface DefaultColors {
  readonly SELECTED: string;
  readonly GREY_RGB: RGB; // Default grey color RGB values
}

export interface AssetFoldersConfig {
  readonly HILLS: string;
  readonly FOREST: string;
  readonly PLAINS: string;
  readonly MOUNTAINS: string;
}

export interface AssetPaths {
  readonly BASE_PATH: string;
  readonly IMAGE_FORMAT: string;
  readonly FOLDERS: AssetFoldersConfig;
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

// Asset folder structure and paths
export const ASSET_FOLDERS: AssetFolders = {
  'Colors': {
    type: 'colors',
    items: COLORS.map((color): ColorItem => ({
      name: color.name,
      displayName: color.name.charAt(0).toUpperCase() + color.name.slice(1),
      type: 'color',
      value: color.value,
      rgb: color.rgb
    }))
  },
  'Hills': {
    type: 'textures',
    items: [
      { name: 'hills1', displayName: 'Hills 1', type: 'texture', path: '/assets/hills/hills1.webp' }
    ]
  },
  'Forest': {
    type: 'textures', 
    items: [
      { name: 'forest1', displayName: 'Forest 1', type: 'texture', path: '/assets/forest/forest1.webp' },
      { name: 'forest2', displayName: 'Forest 2', type: 'texture', path: '/assets/forest/forest2.webp' },
      { name: 'forest3', displayName: 'Forest 3', type: 'texture', path: '/assets/forest/forest3.webp' }
    ]
  },
  'Plains': {
    type: 'textures',
    items: [
      { name: 'plains1', displayName: 'Plains 1', type: 'texture', path: '/assets/plains/plains1.webp' },
      { name: 'plains2', displayName: 'Plains 2', type: 'texture', path: '/assets/plains/plains2.webp' },
      { name: 'plains3', displayName: 'Plains 3', type: 'texture', path: '/assets/plains/plains3.webp' }
    ]
  },
  'Mountains': {
    type: 'textures',
    items: [
      { name: 'mountain1', displayName: 'Mountain 1', type: 'texture', path: '/assets/mountains/mountain1.webp' },
      { name: 'mountain2', displayName: 'Mountain 2', type: 'texture', path: '/assets/mountains/mountain2.webp' },
      { name: 'mountain3', displayName: 'Mountain 3', type: 'texture', path: '/assets/mountains/mountain3.webp' }
    ]
  }
};

// Asset paths configuration
export const ASSET_PATHS: AssetPaths = {
  BASE_PATH: '/assets',
  IMAGE_FORMAT: '.webp',
  
  // Folder names
  FOLDERS: {
    HILLS: 'hills',
    FOREST: 'forest',
    PLAINS: 'plains',
    MOUNTAINS: 'mountains',
  }
}; 