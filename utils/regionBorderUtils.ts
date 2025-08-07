/**
 * Region Border Utilities
 * 
 * This module handles the detection of region borders and the placement
 * of appropriate edge textures around region perimeters.
 */

import { getHexNeighbors } from './borderUtils';
import { getBaseTerrainType } from './regionUtils';
import { loadTerrainManifest, getRandomTerrainVariant, type AssetVariant } from '../components/config/assetLoader';

export interface BorderHex {
  readonly hexCoord: string;
  readonly row: number;
  readonly col: number;
  readonly exposedEdges: EdgeDirection[];
}

export interface EdgeDirection {
  readonly direction: HexEdgeDirection;
  readonly angle: number; // Hex edge angle (0, 60, 120, 180, 240, 300)
  readonly side: BorderSide; // Which side texture to use
}

export type HexEdgeDirection = 'top-right' | 'right' | 'bottom-right' | 'bottom-left' | 'left' | 'top-left';
export type BorderSide = 'top' | 'bottom' | 'side' | 'top-side' | 'bottom-side';

/**
 * Maps hex edge directions to their angles and appropriate texture sides
 */
const EDGE_MAPPING: Record<HexEdgeDirection, { angle: number; side: BorderSide; flipped?: boolean }> = {
  'top-right': { angle: 60, side: 'top-side' },
  'right': { angle: 0, side: 'side' },
  'bottom-right': { angle: 300, side: 'bottom-side' },
  'bottom-left': { angle: 240, side: 'bottom-side', flipped: true },
  'left': { angle: 180, side: 'side', flipped: true },
  'top-left': { angle: 120, side: 'top-side', flipped: true }
};

/**
 * Maps neighbor positions to hex edge directions
 */
const NEIGHBOR_TO_EDGE: Record<number, HexEdgeDirection> = {
  0: 'right',      // Right neighbor
  1: 'left',       // Left neighbor
  2: 'top-right',  // Upper-right neighbor
  3: 'top-left',   // Upper-left neighbor
  4: 'bottom-right', // Lower-right neighbor
  5: 'bottom-left'   // Lower-left neighbor
};

/**
 * Detects all border hexes of a region
 */
export function detectRegionBorderHexes(
  regionHexes: Set<string>,
  hexColors: Record<string, any>,
  gridWidth: number,
  gridHeight: number,
  terrainType: string
): BorderHex[] {
  const borderHexes: BorderHex[] = [];
  
  Array.from(regionHexes).forEach(hexCoord => {
    const [row, col] = hexCoord.split('-').map(Number);
    const neighbors = getHexNeighbors(row, col);
    const exposedEdges: EdgeDirection[] = [];
    
    neighbors.forEach((neighbor, index) => {
      // Check if neighbor is within grid bounds
      if (neighbor.row < 0 || neighbor.row >= gridHeight || 
          neighbor.col < 0 || neighbor.col >= gridWidth) {
        // Grid boundary - this edge is exposed
        const edgeDirection = NEIGHBOR_TO_EDGE[index];
        const edgeInfo = EDGE_MAPPING[edgeDirection];
        exposedEdges.push({
          direction: edgeDirection,
          angle: edgeInfo.angle,
          side: edgeInfo.side
        });
        return;
      }
      
      const neighborCoord = `${neighbor.row}-${neighbor.col}`;
      const neighborValue = hexColors[neighborCoord];
      const neighborTerrainType = getBaseTerrainType(neighborValue);
      
      // If neighbor is different terrain type or empty, this edge is exposed
      if (neighborTerrainType !== terrainType) {
        const edgeDirection = NEIGHBOR_TO_EDGE[index];
        const edgeInfo = EDGE_MAPPING[edgeDirection];
        exposedEdges.push({
          direction: edgeDirection,
          angle: edgeInfo.angle,
          side: edgeInfo.side
        });
      }
    });
    
    // Only include hexes that have exposed edges
    if (exposedEdges.length > 0) {
      borderHexes.push({
        hexCoord,
        row,
        col,
        exposedEdges
      });
    }
  });
  
  return borderHexes;
}

/**
 * Selects appropriate border texture for a given edge
 */
export function selectBorderTexture(
  terrainType: string,
  edge: EdgeDirection,
  preferSpecial: boolean = false
): AssetVariant | null {
  const edgeInfo = EDGE_MAPPING[edge.direction];
  
  // Get terrain manifest
  const manifest = loadTerrainManifest(terrainType);
  if (!manifest) {
    return null;
  }
  
  // Try to find texture with the appropriate angle and side
  const variant = getRandomTerrainVariant(
    terrainType,
    edgeInfo.angle,
    edgeInfo.side,
    preferSpecial
  );
  
  if (variant) {
    return variant;
  }
  
  // Fallback: try to find any texture with the same side
  const sideAssets = manifest.assets.bySide[edgeInfo.side];
  if (sideAssets && Object.keys(sideAssets).length > 0) {
    const allSideAssets = Object.values(sideAssets).flat();
    if (allSideAssets.length > 0) {
      const randomIndex = Math.floor(Math.random() * allSideAssets.length);
      return allSideAssets[randomIndex];
    }
  }
  
  return null;
}

/**
 * Determines if a texture should be flipped based on edge direction
 */
export function shouldFlipTexture(edgeDirection: HexEdgeDirection): boolean {
  return EDGE_MAPPING[edgeDirection].flipped || false;
}

/**
 * Creates border texture placements for an entire region
 */
export interface BorderPlacement {
  readonly hexCoord: string;
  readonly row: number;
  readonly col: number;
  readonly texture: AssetVariant;
  readonly flipped: boolean;
  readonly edgeDirection: HexEdgeDirection;
  readonly angle: number;
}

export function createRegionBorderPlacements(
  regionHexes: Set<string>,
  hexColors: Record<string, any>,
  gridWidth: number,
  gridHeight: number,
  terrainType: string,
  preferSpecial: boolean = false
): BorderPlacement[] {
  const borderHexes = detectRegionBorderHexes(regionHexes, hexColors, gridWidth, gridHeight, terrainType);
  const placements: BorderPlacement[] = [];
  
  borderHexes.forEach(borderHex => {
    borderHex.exposedEdges.forEach(edge => {
      const texture = selectBorderTexture(terrainType, edge, preferSpecial);
      
      if (texture) {
        placements.push({
          hexCoord: borderHex.hexCoord,
          row: borderHex.row,
          col: borderHex.col,
          texture,
          flipped: shouldFlipTexture(edge.direction),
          edgeDirection: edge.direction,
          angle: edge.angle
        });
      }
    });
  });
  
  return placements;
}

/**
 * Gets the optimal border texture path with flipping applied
 */
export function getBorderTexturePath(
  texture: AssetVariant,
  flipped: boolean
): string {
  const basePath = `/assets/terrain/${texture.baseName}/${texture.filename}`;
  
  // For now, return the base path. In the future, we might implement
  // actual texture flipping or use pre-flipped texture variants
  return basePath;
}

/**
 * Creates texture configuration for border placement
 */
export function createBorderTextureConfig(
  placement: BorderPlacement
): {
  name: string;
  displayName: string;
  type: 'texture';
  path: string;
  rotation?: number;
  flipped?: boolean;
} {
  return {
    name: `${placement.texture.name}_border`,
    displayName: `${placement.texture.baseName} Border`,
    type: 'texture',
    path: getBorderTexturePath(placement.texture, placement.flipped),
    rotation: 0, // We'll handle rotation via texture selection
    flipped: placement.flipped
  };
}

/**
 * Utility to get region border statistics
 */
export function getRegionBorderStats(
  borderHexes: BorderHex[]
): {
  totalBorderHexes: number;
  totalExposedEdges: number;
  edgesByDirection: Record<HexEdgeDirection, number>;
  edgesBySide: Record<BorderSide, number>;
} {
  const edgesByDirection: Record<HexEdgeDirection, number> = {
    'top-right': 0,
    'right': 0,
    'bottom-right': 0,
    'bottom-left': 0,
    'left': 0,
    'top-left': 0
  };
  
  const edgesBySide: Record<BorderSide, number> = {
    'top': 0,
    'bottom': 0,
    'side': 0,
    'top-side': 0,
    'bottom-side': 0
  };
  
  let totalExposedEdges = 0;
  
  borderHexes.forEach(borderHex => {
    borderHex.exposedEdges.forEach(edge => {
      totalExposedEdges++;
      edgesByDirection[edge.direction]++;
      edgesBySide[edge.side]++;
    });
  });
  
  return {
    totalBorderHexes: borderHexes.length,
    totalExposedEdges,
    edgesByDirection,
    edgesBySide
  };
}