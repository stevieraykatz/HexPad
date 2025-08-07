/**
 * Dynamic Assets Configuration
 *
 * This file replaces the static asset definitions with a dynamic system
 * that loads assets from manifest files.
 */

import { 
  getAllTerrainTypes, 
  getTerrainBasePath,
  type TerrainInfo,
} from './assetLoader';

// Re-export existing types and constants that don't change
export type { RGB, DefaultColors, BackgroundColor } from './assetsConfig';
export { DEFAULT_COLORS, BACKGROUND_COLORS } from './assetsConfig';

// Extended texture item interface that supports dynamic variants
export interface DynamicTextureItem {
  readonly name: string;
  readonly displayName: string;
  readonly type: "texture";
  readonly path: string;
  readonly terrainType: 'simple' | 'complex';
  readonly hasVariants: boolean;
  readonly variantCount: number;
  readonly terrainInfo: TerrainInfo;
}

export type AssetItem = DynamicTextureItem;

/**
 * Generates paint options dynamically from the terrain index
 */
export function generatePaintOptions(): readonly DynamicTextureItem[] {
  const allTerrains = getAllTerrainTypes();
  
  const paintOptions: DynamicTextureItem[] = [];
  
  allTerrains.forEach(terrain => {
    const basePath = getTerrainBasePath(terrain.name);
    
    if (basePath) {
      // Add the base terrain option
      paintOptions.push({
        name: terrain.name,
        displayName: terrain.displayName,
        type: 'texture',
        path: basePath,
        terrainType: terrain.type,
        hasVariants: terrain.hasVariants,
        variantCount: terrain.assetCount,
        terrainInfo: terrain
      });
    }
    
    // For complex terrains, we could add specific variants here
    // but for now we'll let the rendering logic handle variant selection
    // This keeps the paint options clean while allowing dynamic variants
  });
  
  // Sort by display name for consistent ordering
  paintOptions.sort((a, b) => a.displayName.localeCompare(b.displayName));
  
  return paintOptions;
}

/**
 * Gets paint options with lazy evaluation
 */
let cachedPaintOptions: readonly DynamicTextureItem[] | null = null;

export function getPaintOptions(): readonly DynamicTextureItem[] {
  if (!cachedPaintOptions) {
    cachedPaintOptions = generatePaintOptions();
  }
  return cachedPaintOptions;
}

/**
 * Gets a specific texture item by name
 */
export function getTextureItem(name: string): DynamicTextureItem | null {
  const paintOptions = getPaintOptions();
  return paintOptions.find(item => item.name === name) || null;
}

/**
 * Gets all texture items of a specific terrain type
 */
export function getTexturesByType(terrainType: 'simple' | 'complex'): readonly DynamicTextureItem[] {
  const paintOptions = getPaintOptions();
  return paintOptions.filter(item => item.terrainType === terrainType);
}

/**
 * Gets textures that have variants (complex terrain types)
 */
export function getTexturesWithVariants(): readonly DynamicTextureItem[] {
  return getTexturesByType('complex');
}

/**
 * Gets simple textures (single asset types)
 */
export function getSimpleTextures(): readonly DynamicTextureItem[] {
  return getTexturesByType('simple');
}

/**
 * Legacy compatibility - exports the paint options for existing code
 * This allows existing components to continue working without changes
 */
export const PAINT_OPTIONS = getPaintOptions();

/**
 * Clears the cache to force regeneration of paint options
 * Useful when terrain assets are updated
 */
export function refreshPaintOptions(): void {
  cachedPaintOptions = null;
}