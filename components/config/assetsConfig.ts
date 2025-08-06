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
  readonly type: "texture";
  readonly path: string;
}

export type AssetItem = TextureItem;

export interface DefaultColors {
  readonly SELECTED: string;
  readonly GREY_RGB: RGB;
}

export const DEFAULT_COLORS: DefaultColors = {
  SELECTED: "grey",
  GREY_RGB: [0.42, 0.45, 0.5], // Default grey color RGB values
};

export interface BackgroundColor {
  readonly name: string;
  readonly displayName: string;
  readonly rgb: RGB; // RGB values in 0-1 range for WebGL
  readonly cssColor: string;
}

export const BACKGROUND_COLORS: readonly BackgroundColor[] = [
  {
    name: "grey",
    displayName: "Dark Grey",
    rgb: [0.1, 0.1, 0.1],
    cssColor: "#1a1a1a",
  },
  {
    name: "white",
    displayName: "White",
    rgb: [1.0, 1.0, 1.0],
    cssColor: "#ffffff",
  },
];

export const PAINT_OPTIONS: readonly AssetItem[] = [
  {
    name: "coast",
    displayName: "Coast",
    type: "texture",
    path: "/assets/terrain/coast.png",
  },
  {
    name: "coast-2",
    displayName: "Coast2",
    type: "texture",
    path: "/assets/terrain/coast/coast_60_1.png",
  },
  {
    name: "coast-3",
    displayName: "Coast3",
    type: "texture",
    path: "/assets/terrain/coast/coast_60_2.png",
  },
  {
    name: "coast-4",
    displayName: "Coast4",
    type: "texture",
    path: "/assets/terrain/coast/coast_120_1.png",
  },
  {
    name: "coast-5",
    displayName: "Coast5",
    type: "texture",
    path: "/assets/terrain/coast/coast_120_2.png",
  },
  {
    name: "coast-6",
    displayName: "Coast6",
    type: "texture",
    path: "/assets/terrain/coast/coast_180_1.png",
  },
  {
    name: "coast-7",
    displayName: "Coast7",
    type: "texture",
    path: "/assets/terrain/coast/coast_180_2.png",
  },
  {
    name: "coast-8",
    displayName: "Coast8",
    type: "texture",
    path: "/assets/terrain/coast/coast_180_3.png",
  },
  {
    name: "coast-9",
    displayName: "Coast9",
    type: "texture",
    path: "/assets/terrain/coast/coast_240_1.png",
  },
  {
    name: "coast-10",
    displayName: "Coast10",
    type: "texture",
    path: "/assets/terrain/coast/coast_240_2.png",
  },
  {
    name: "coast-11",
    displayName: "Coast11",
    type: "texture",
    path: "/assets/terrain/coast/coast_240_3.png",
  },
  {
    name: "coast-12",
    displayName: "Coast12",
    type: "texture",
    path: "/assets/terrain/coast/coast_300_1.png",
  },
  {
    name: "coast-13",
    displayName: "Coast13",
    type: "texture",
    path: "/assets/terrain/coast/coast_300_2.png",
  },
  {
    name: "coast-14",
    displayName: "Coast14",
    type: "texture",
    path: "/assets/terrain/coast/coast_300_3.png",
  },
  {
    name: "desert",
    displayName: "Desert",
    type: "texture",
    path: "/assets/terrain/desert.png",
  },
  {
    name: "forest",
    displayName: "Forest",
    type: "texture",
    path: "/assets/terrain/forest.png",
  },
  {
    name: "forest-2",
    displayName: "Forest2",
    type: "texture",
    path: "/assets/terrain/forest/forest_120_bottom_1.png",
  },
  {
    name: "forest-3",
    displayName: "Forest3",
    type: "texture",
    path: "/assets/terrain/forest/forest_120_bottom-side_1.png",
  },
  {
    name: "forest-4",
    displayName: "Forest4",
    type: "texture",
    path: "/assets/terrain/forest/forest_120_top_1.png",
  },
  {
    name: "forest-5",
    displayName: "Forest5",
    type: "texture",
    path: "/assets/terrain/forest/forest_180_bottom-side_1.png",
  },
  {
    name: "forest-6",
    displayName: "Forest6",
    type: "texture",
    path: "/assets/terrain/forest/forest_180_bottom-side_2.png",
  },
  {
    name: "forest-7",
    displayName: "Forest7",
    type: "texture",
    path: "/assets/terrain/forest/forest_120_top-side_1.png",
  },
  {
    name: "forest-8",
    displayName: "Forest8",
    type: "texture",
    path: "/assets/terrain/forest/forest_180_side_1.png",
  },
  {
    name: "forest-9",
    displayName: "Forest9",
    type: "texture",
    path: "/assets/terrain/forest/forest_180_top-side_1.png",
  },
  {
    name: "hills",
    displayName: "Hills",
    type: "texture",
    path: "/assets/terrain/hills.png",
  },
  {
    name: "mountain",
    displayName: "Mountain",
    type: "texture",
    path: "/assets/terrain/mountain.png",
  },
  {
    name: "ocean",
    displayName: "Ocean",
    type: "texture",
    path: "/assets/terrain/ocean.png",
  },
  {
    name: "plains",
    displayName: "Plains",
    type: "texture",
    path: "/assets/terrain/plains.png",
  },
  {
    name: "shrubland",
    displayName: "Shrubland",
    type: "texture",
    path: "/assets/terrain/shrubland.png",
  },
  {
    name: "swamp",
    displayName: "Swamp",
    type: "texture",
    path: "/assets/terrain/swamp.png",
  },
];
