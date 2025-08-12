/**
 * Dynamic Assets Configuration
 * 
 * This module provides dynamic paint options based on the terrain index.
 * Menu configuration (preview assets, backgrounds, descriptions) is imported
 * directly from terrainMenuConfig.ts for immediate UI updates without regeneration.
 */

import { 
  getTerrainIndex, 
  getTerrainInfo, 
  loadTerrainManifest, 
  getAllTerrainTypes,
  type TerrainInfo,
} from './assetLoader';
import { TERRAIN_MENU_CONFIG, DEFAULT_MENU_CONFIG } from './terrainMenuConfig';

export type RGB = [number, number, number];

export interface DynamicTextureItem {
  readonly name: string;
  readonly displayName: string;
  readonly type: "texture";
  readonly path: string;
  readonly hasVariants?: boolean;
  readonly assetCount?: number;
  readonly previewBackgroundColor?: string;
  readonly description?: string;
}

export type AssetItem = DynamicTextureItem;

export interface DefaultColors {
  readonly SELECTED: string;
  readonly DEFAULT_RGB: RGB;
}

export const DEFAULT_COLORS: DefaultColors = {
  SELECTED: "manila",
  DEFAULT_RGB: [0.95, 0.91, 0.76], // Manila paper color RGB values (243, 232, 194 in 255 scale)
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
    name: "manila",
    displayName: "Manila",
    rgb: [0.95, 0.91, 0.76],
    cssColor: "#F3E8C2",
  },
  {
    name: "white",
    displayName: "White",
    rgb: [1.0, 1.0, 1.0],
    cssColor: "#ffffff",
  },
];

/**
 * Gets the preview asset path for a terrain using the direct menu config
 */
function getPreviewAssetPath(terrain: TerrainInfo): string {
  // First check the direct menu config for this terrain
  const menuConfig = TERRAIN_MENU_CONFIG[terrain.name];
  if (menuConfig && menuConfig.previewAsset) {
    return `/assets/terrain/${terrain.name}/${menuConfig.previewAsset}`;
  }
  
  // For terrains with a base path, use that
  if (terrain.basePath) {
    return terrain.basePath;
  }
  
  // For complex terrains with manifest, get first asset
  if (terrain.type === 'complex' && terrain.manifestPath) {
    try {
      const manifest = loadTerrainManifest(terrain.name);
      if (manifest && manifest.rawAssets.length > 0) {
        // Get the first asset (they should be sorted by variant)
        const firstAsset = manifest.rawAssets[0];
        return `/assets/terrain/${terrain.name}/${firstAsset.filename}`;
      }
    } catch (error) {
      console.warn(`Could not load manifest for ${terrain.name}:`, error);
    }
  }
  
  // For terrains without manifest, try to use a simple numbered asset
  if (terrain.assetCount > 0) {
    // Try common patterns for first asset
    const commonPatterns = [
      `${terrain.name}_1.png`,
      `${terrain.name}_01.png`,
      `${terrain.name}.png`
    ];
    
    for (const pattern of commonPatterns) {
      const path = `/assets/terrain/${terrain.name}/${pattern}`;
      // We can't check if file exists in this context, so just use the first pattern
      return path;
    }
  }
  
  // Fallback to a basic path
  return `/assets/terrain/${terrain.name}.png`;
}

/**
 * Generates paint options from all available terrain types
 */
export function getPaintOptions(): readonly DynamicTextureItem[] {
  const terrainTypes = getAllTerrainTypes();
  const options: DynamicTextureItem[] = [];
  
  // Sort terrain types alphabetically for consistent ordering
  const sortedTerrains = [...terrainTypes].sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
  
  sortedTerrains.forEach((terrain) => {
    const iconPath = getPreviewAssetPath(terrain);
    const menuConfig = TERRAIN_MENU_CONFIG[terrain.name] || DEFAULT_MENU_CONFIG;
    
    options.push({
      name: terrain.name,
      displayName: terrain.displayName,
      type: "texture",
      path: iconPath,
      hasVariants: terrain.hasVariants,
      assetCount: terrain.assetCount,
      previewBackgroundColor: menuConfig.backgroundColor,
      description: menuConfig.description || terrain.displayName
    });
  });
  
  return options;
}

/**
 * Gets a specific texture item by name
 */
export function getTextureItem(name: string): DynamicTextureItem | null {
  const terrain = getTerrainInfo(name);
  if (!terrain) return null;
  
  const iconPath = getPreviewAssetPath(terrain);
  const menuConfig = TERRAIN_MENU_CONFIG[terrain.name] || DEFAULT_MENU_CONFIG;
  
  return {
    name: terrain.name,
    displayName: terrain.displayName,
    type: "texture",
    path: iconPath,
    hasVariants: terrain.hasVariants,
    assetCount: terrain.assetCount,
    previewBackgroundColor: menuConfig.backgroundColor,
    description: menuConfig.description || terrain.displayName
  };
}

/**
 * Gets texture items by type (simple or complex)
 */
export function getTexturesByType(type: 'simple' | 'complex'): readonly DynamicTextureItem[] {
  const terrainIndex = getTerrainIndex();
  const terrainsOfType = terrainIndex.byType[type] || [];
  
  return terrainsOfType.map((terrain) => {
    const iconPath = getPreviewAssetPath(terrain);
    const menuConfig = TERRAIN_MENU_CONFIG[terrain.name] || DEFAULT_MENU_CONFIG;
    
    return {
      name: terrain.name,
      displayName: terrain.displayName,
      type: "texture",
      path: iconPath,
      hasVariants: terrain.hasVariants,
      assetCount: terrain.assetCount,
      previewBackgroundColor: menuConfig.backgroundColor,
      description: menuConfig.description || terrain.displayName
    };
  });
}

/**
 * Gets textures that have variants (complex terrains)
 */
export function getTexturesWithVariants(): readonly DynamicTextureItem[] {
  return getTexturesByType('complex');
}

/**
 * Gets simple textures (single asset terrains)
 */
export function getSimpleTextures(): readonly DynamicTextureItem[] {
  return getTexturesByType('simple');
}

/**
 * Refreshes paint options (for dynamic reloading)
 */
export function refreshPaintOptions(): readonly DynamicTextureItem[] {
  return getPaintOptions();
}
