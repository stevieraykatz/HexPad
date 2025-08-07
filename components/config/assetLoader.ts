/**
 * Asset Loader - Dynamic Asset Configuration System
 * 
 * This module dynamically loads terrain assets from manifest files,
 * replacing the static asset definitions in assetsConfig.ts
 */

import { terrainIndex } from './generated/terrainIndex';
import { coastManifest } from './generated/coastManifest';
import { forestManifest } from './generated/forestManifest';

// Static manifest imports for better performance and type safety
const staticManifests: Record<string, AssetManifest> = {
  coast: coastManifest,
  forest: forestManifest
};

// Types for the dynamic asset system
export interface AssetVariant {
  readonly filename: string;
  readonly name: string;
  readonly baseName?: string;
  readonly angle?: number;
  readonly side?: string;
  readonly variant?: number;
  readonly special?: boolean;
}

export interface AssetManifest {
  readonly name: string;
  readonly generated: string;
  readonly totalAssets: number;
  readonly assets: {
    readonly byAngle: Record<string, Record<string, readonly AssetVariant[]>>;
    readonly bySide: Record<string, Record<string, readonly AssetVariant[]>>;
    readonly bySpecial: Record<string, readonly AssetVariant[]>;
    readonly all: Record<string, readonly AssetVariant[]>;
  };
  readonly rawAssets: readonly AssetVariant[];
}

export interface TerrainInfo {
  readonly name: string;
  readonly displayName: string;
  readonly type: 'simple' | 'complex';
  readonly basePath: string | null;
  readonly manifestPath: string | null;
  readonly hasVariants: boolean;
  readonly assetCount: number;
  readonly features?: {
    readonly hasAngles: boolean;
    readonly hasSides: boolean;
    readonly hasSpecial: boolean;
  };
}

export interface TerrainIndex {
  readonly name: string;
  readonly generated: string;
  readonly totalTerrainTypes: number;
  readonly totalAssets: number;
  readonly baseTerrains: number;
  readonly complexTerrains: number;
  readonly terrains: Record<string, TerrainInfo>;
  readonly byType: {
    readonly simple: readonly TerrainInfo[];
    readonly complex: readonly TerrainInfo[];
  };
}

// Cache for loaded manifests
const manifestCache: Record<string, AssetManifest> = {};

/**
 * Gets the terrain index (already imported)
 */
export function getTerrainIndex(): TerrainIndex {
  return terrainIndex as TerrainIndex;
}

/**
 * Gets a specific terrain's information
 */
export function getTerrainInfo(terrainName: string): TerrainInfo | null {
  const terrains = terrainIndex.terrains as Record<string, TerrainInfo>;
  return terrains[terrainName] || null;
}

/**
 * Loads a manifest for a complex terrain type
 */
export function loadTerrainManifest(terrainName: string): AssetManifest | null {
  // Check cache first
  if (manifestCache[terrainName]) {
    return manifestCache[terrainName];
  }
  
  const terrainInfo = getTerrainInfo(terrainName);
  
  if (!terrainInfo || terrainInfo.type !== 'complex') {
    return null;
  }
  
  // Use static import
  const manifest = staticManifests[terrainName];
  
  if (manifest) {
    manifestCache[terrainName] = manifest;
    return manifest;
  }
  
  console.error(`No manifest available for terrain: ${terrainName}`);
  return null;
}

/**
 * Gets all available terrain types
 */
export function getAllTerrainTypes(): readonly TerrainInfo[] {
  return Object.values(terrainIndex.terrains);
}

/**
 * Gets all simple terrain types (single asset)
 */
export function getSimpleTerrains(): readonly TerrainInfo[] {
  return terrainIndex.byType.simple;
}

/**
 * Gets all complex terrain types (with variants)
 */
export function getComplexTerrains(): readonly TerrainInfo[] {
  return terrainIndex.byType.complex;
}

/**
 * Gets the base asset path for a terrain type
 */
export function getTerrainBasePath(terrainName: string): string | null {
  const terrainInfo = getTerrainInfo(terrainName);
  return terrainInfo?.basePath || null;
}

/**
 * Gets a random variant from a terrain's manifest based on criteria
 */
export function getRandomTerrainVariant(
  terrainName: string, 
  angle?: number, 
  side?: string, 
  preferSpecial?: boolean
): AssetVariant | null {
  const manifest = loadTerrainManifest(terrainName);
  
  if (!manifest) {
    return null;
  }
  
  let candidates: readonly AssetVariant[] = [];
  
  // Try special assets first if preferred
  if (preferSpecial && Object.keys(manifest.assets.bySpecial).length > 0) {
    if (angle) {
      const specialKey = `angle_${angle}_special`;
      if (manifest.assets.bySpecial[specialKey]) {
        candidates = manifest.assets.bySpecial[specialKey];
      }
    } else {
      candidates = Object.values(manifest.assets.bySpecial).flat();
    }
  }
  
  // Fall back to regular assets
  if (candidates.length === 0) {
    if (angle && side) {
      // Look for specific angle/side combination
      const angleAssets = manifest.assets.byAngle[angle.toString()];
      if (angleAssets) {
        candidates = Object.values(angleAssets)
          .flat()
          .filter(asset => asset.side === side);
      }
    } else if (angle) {
      // Look for any assets with this angle
      const angleAssets = manifest.assets.byAngle[angle.toString()];
      if (angleAssets) {
        candidates = Object.values(angleAssets).flat();
      }
    } else if (side) {
      // Look for any assets with this side
      const sideAssets = manifest.assets.bySide[side];
      if (sideAssets) {
        candidates = Object.values(sideAssets).flat();
      }
    } else {
      // Get all assets
      candidates = manifest.rawAssets;
    }
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Return random candidate
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

/**
 * Pre-loads all manifests for better performance
 */
export function preloadAllManifests(): void {
  const complexTerrains = getComplexTerrains();
  complexTerrains.forEach(terrain => loadTerrainManifest(terrain.name));
  console.log(`Pre-loaded ${complexTerrains.length} terrain manifests`);
}