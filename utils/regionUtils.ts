/**
 * Region Management System
 * 
 * This module handles the detection, creation, merging, and splitting of terrain regions.
 * Regions represent connected areas of the same base terrain type.
 */

import { getHexNeighbors } from './borderUtils';

export interface Region {
  readonly id: string;
  readonly terrainType: string; // Base terrain type (e.g., 'forest', 'mountain')
  readonly hexes: Set<string>; // Set of hex coordinates (e.g., '2-3')
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface RegionMap {
  readonly regions: Map<string, Region>;
  readonly hexToRegion: Map<string, string>; // Maps hex coordinate to region ID
}

/**
 * Creates a new region
 */
export function createRegion(terrainType: string, initialHex: string): Region {
  const now = Date.now();
  return {
    id: `region_${terrainType}_${now}_${Math.random().toString(36).substr(2, 9)}`,
    terrainType,
    hexes: new Set([initialHex]),
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Gets the base terrain type from a hex texture/color
 * This function extracts the terrain name from texture items or other identifiers
 */
export function getBaseTerrainType(hexValue: string | object): string | null {
  if (typeof hexValue === 'string') {
    // Handle color hex values - these don't represent terrain
    if (hexValue.startsWith('#')) {
      return null;
    }
    // Handle texture names
    return hexValue;
  }
  
  if (typeof hexValue === 'object' && hexValue !== null) {
    // Handle texture objects with name property
    if ('name' in hexValue && typeof hexValue.name === 'string') {
      return hexValue.name;
    }
  }
  
  return null;
}

/**
 * Finds all adjacent hexes of the same terrain type
 */
export function findAdjacentSameTerrainHexes(
  hexCoord: string,
  terrainType: string,
  hexColors: Record<string, any>,
  gridWidth: number,
  gridHeight: number
): string[] {
  const [row, col] = hexCoord.split('-').map(Number);
  const neighbors = getHexNeighbors(row, col);
  
  return neighbors
    .filter(neighbor => {
      // Check if neighbor is within grid bounds
      if (neighbor.row < 0 || neighbor.row >= gridHeight || 
          neighbor.col < 0 || neighbor.col >= gridWidth) {
        return false;
      }
      
      const neighborCoord = `${neighbor.row}-${neighbor.col}`;
      const neighborValue = hexColors[neighborCoord];
      const neighborTerrainType = getBaseTerrainType(neighborValue);
      
      return neighborTerrainType === terrainType;
    })
    .map(neighbor => `${neighbor.row}-${neighbor.col}`);
}

/**
 * Performs flood fill to find all connected hexes of the same terrain type
 */
export function floodFillTerrainRegion(
  startHex: string,
  terrainType: string,
  hexColors: Record<string, any>,
  gridWidth: number,
  gridHeight: number,
  visited: Set<string> = new Set()
): Set<string> {
  const regionHexes = new Set<string>();
  const queue = [startHex];
  
  while (queue.length > 0) {
    const currentHex = queue.shift()!;
    
    if (visited.has(currentHex) || regionHexes.has(currentHex)) {
      continue;
    }
    
    const currentValue = hexColors[currentHex];
    const currentTerrainType = getBaseTerrainType(currentValue);
    
    if (currentTerrainType !== terrainType) {
      continue;
    }
    
    regionHexes.add(currentHex);
    visited.add(currentHex);
    
    // Add adjacent hexes to queue
    const adjacentHexes = findAdjacentSameTerrainHexes(
      currentHex, 
      terrainType, 
      hexColors, 
      gridWidth, 
      gridHeight
    );
    
    for (const adjacentHex of adjacentHexes) {
      if (!visited.has(adjacentHex) && !regionHexes.has(adjacentHex)) {
        queue.push(adjacentHex);
      }
    }
  }
  
  return regionHexes;
}

/**
 * Adds a hex to an existing region or creates a new region
 */
export function addHexToRegions(
  hexCoord: string,
  terrainType: string,
  hexColors: Record<string, any>,
  regionMap: RegionMap,
  gridWidth: number,
  gridHeight: number
): RegionMap {
  // Find adjacent regions of the same terrain type
  const adjacentRegionIds = new Set<string>();
  const adjacentHexes = findAdjacentSameTerrainHexes(
    hexCoord, 
    terrainType, 
    hexColors, 
    gridWidth, 
    gridHeight
  );
  
  for (const adjacentHex of adjacentHexes) {
    const regionId = regionMap.hexToRegion.get(adjacentHex);
    if (regionId) {
      adjacentRegionIds.add(regionId);
    }
  }
  
  const newRegions = new Map(regionMap.regions);
  const newHexToRegion = new Map(regionMap.hexToRegion);
  
  if (adjacentRegionIds.size === 0) {
    // No adjacent regions - create new region
    const newRegion = createRegion(terrainType, hexCoord);
    newRegions.set(newRegion.id, newRegion);
    newHexToRegion.set(hexCoord, newRegion.id);
  } else if (adjacentRegionIds.size === 1) {
    // One adjacent region - add to it
    const regionId = Array.from(adjacentRegionIds)[0];
    const existingRegion = newRegions.get(regionId)!;
    const updatedRegion: Region = {
      ...existingRegion,
      hexes: new Set([...Array.from(existingRegion.hexes), hexCoord]),
      updatedAt: Date.now()
    };
    newRegions.set(regionId, updatedRegion);
    newHexToRegion.set(hexCoord, regionId);
  } else {
    // Multiple adjacent regions - merge them
    const regionIds = Array.from(adjacentRegionIds);
    const primaryRegionId = regionIds[0];
    const primaryRegion = newRegions.get(primaryRegionId)!;
    
    // Collect all hexes from all regions to be merged
    const allHexes = new Set([...Array.from(primaryRegion.hexes), hexCoord]);
    
    for (let i = 1; i < regionIds.length; i++) {
      const regionToMerge = newRegions.get(regionIds[i])!;
      
      // Add all hexes from this region to the primary region
      Array.from(regionToMerge.hexes).forEach(hex => {
        allHexes.add(hex);
        newHexToRegion.set(hex, primaryRegionId);
      });
      
      // Remove the merged region
      newRegions.delete(regionIds[i]);
    }
    
    // Update primary region with all hexes
    const updatedPrimaryRegion: Region = {
      ...primaryRegion,
      hexes: allHexes,
      updatedAt: Date.now()
    };
    newRegions.set(primaryRegionId, updatedPrimaryRegion);
    newHexToRegion.set(hexCoord, primaryRegionId);
  }
  
  return {
    regions: newRegions,
    hexToRegion: newHexToRegion
  };
}

/**
 * Removes a hex from regions and potentially splits regions
 */
export function removeHexFromRegions(
  hexCoord: string,
  regionMap: RegionMap,
  hexColors: Record<string, any>,
  gridWidth: number,
  gridHeight: number
): RegionMap {
  const regionId = regionMap.hexToRegion.get(hexCoord);
  if (!regionId) {
    return regionMap; // Hex not in any region
  }
  
  const region = regionMap.regions.get(regionId)!;
  const newRegions = new Map(regionMap.regions);
  const newHexToRegion = new Map(regionMap.hexToRegion);
  
  // Remove hex from region
  newHexToRegion.delete(hexCoord);
  const remainingHexes = new Set(Array.from(region.hexes));
  remainingHexes.delete(hexCoord);
  
  if (remainingHexes.size === 0) {
    // Region is now empty - remove it
    newRegions.delete(regionId);
  } else if (remainingHexes.size === 1) {
    // Only one hex left - update region
    const updatedRegion: Region = {
      ...region,
      hexes: remainingHexes,
      updatedAt: Date.now()
    };
    newRegions.set(regionId, updatedRegion);
  } else {
    // Check if the remaining hexes are still connected
    const remainingHexArray = Array.from(remainingHexes);
    const firstHex = remainingHexArray[0];
    
    const connectedHexes = floodFillTerrainRegion(
      firstHex,
      region.terrainType,
      hexColors,
      gridWidth,
      gridHeight,
      new Set([hexCoord]) // Exclude the removed hex
    );
    
    if (connectedHexes.size === remainingHexes.size) {
      // All remaining hexes are still connected - update region
      const updatedRegion: Region = {
        ...region,
        hexes: remainingHexes,
        updatedAt: Date.now()
      };
      newRegions.set(regionId, updatedRegion);
    } else {
      // Region is split - remove old region and create new ones
      newRegions.delete(regionId);
      const visited = new Set<string>();
      
      Array.from(remainingHexes).forEach(hex => {
        if (!visited.has(hex)) {
          const connectedGroup = floodFillTerrainRegion(
            hex,
            region.terrainType,
            hexColors,
            gridWidth,
            gridHeight,
            new Set([hexCoord])
          );
          
          if (connectedGroup.size > 0) {
            const newRegion = createRegion(region.terrainType, hex);
            const updatedNewRegion: Region = {
              ...newRegion,
              hexes: connectedGroup
            };
            newRegions.set(newRegion.id, updatedNewRegion);
            
            Array.from(connectedGroup).forEach(groupHex => {
              newHexToRegion.set(groupHex, newRegion.id);
              visited.add(groupHex);
            });
          }
        }
      });
    }
  }
  
  return {
    regions: newRegions,
    hexToRegion: newHexToRegion
  };
}

/**
 * Rebuilds all regions from scratch based on current hex colors
 * Useful for initialization or when regions get out of sync
 */
export function rebuildRegions(
  hexColors: Record<string, any>,
  gridWidth: number,
  gridHeight: number
): RegionMap {
  const regions = new Map<string, Region>();
  const hexToRegion = new Map<string, string>();
  const visited = new Set<string>();
  
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const hexCoord = `${row}-${col}`;
      
      if (visited.has(hexCoord)) continue;
      
      const hexValue = hexColors[hexCoord];
      const terrainType = getBaseTerrainType(hexValue);
      
      if (!terrainType) continue; // Skip non-terrain hexes
      
      const regionHexes = floodFillTerrainRegion(
        hexCoord,
        terrainType,
        hexColors,
        gridWidth,
        gridHeight,
        visited
      );
      
      if (regionHexes.size > 0) {
        const region = createRegion(terrainType, hexCoord);
        const updatedRegion: Region = {
          ...region,
          hexes: regionHexes
        };
        
        regions.set(region.id, updatedRegion);
        
        Array.from(regionHexes).forEach(hex => {
          hexToRegion.set(hex, region.id);
          visited.add(hex);
        });
      }
    }
  }
  
  return { regions, hexToRegion };
}

/**
 * Gets region statistics
 */
export function getRegionStats(regionMap: RegionMap): {
  totalRegions: number;
  regionsByTerrain: Record<string, number>;
  averageRegionSize: number;
  largestRegion: { id: string; size: number; terrainType: string } | null;
} {
  const regionsByTerrain: Record<string, number> = {};
  let totalHexes = 0;
  let largestRegion: { id: string; size: number; terrainType: string } | null = null;
  
  Array.from(regionMap.regions.values()).forEach(region => {
    regionsByTerrain[region.terrainType] = (regionsByTerrain[region.terrainType] || 0) + 1;
    totalHexes += region.hexes.size;
    
    if (!largestRegion || region.hexes.size > largestRegion.size) {
      largestRegion = {
        id: region.id,
        size: region.hexes.size,
        terrainType: region.terrainType
      };
    }
  });
  
  return {
    totalRegions: regionMap.regions.size,
    regionsByTerrain,
    averageRegionSize: regionMap.regions.size > 0 ? totalHexes / regionMap.regions.size : 0,
    largestRegion
  };
}