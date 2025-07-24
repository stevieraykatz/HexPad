import { GRID_CONFIG } from '../components/config';
import type { HexPosition } from './hexagonUtils';

export interface BorderEdge {
  fromHex: string;
  toHex: string;
  color: string;
}

export interface EdgeVertices {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/**
 * Calculate the visual border position between two adjacent hexagons
 * Returns the start and end points for drawing a border line
 */
export function getSharedEdgeVertices(
  fromHex: string, 
  toHex: string, 
  hexRadius: number, 
  hexPositions: HexPosition[]
): EdgeVertices | null {
  const positionMap = new Map<string, HexPosition>();
  hexPositions.forEach(pos => {
    positionMap.set(`${pos.row}-${pos.col}`, pos);
  });

  const fromPos = positionMap.get(fromHex);
  const toPos = positionMap.get(toHex);
  
  if (!fromPos || !toPos) return null;

  // Parse hex coordinates to determine adjacency type
  const [fromRow, fromCol] = fromHex.split('-').map(Number);
  const [toRow, toCol] = toHex.split('-').map(Number);
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  
  // Check if this is a problematic diagonal that appears center-to-center
  const isProblematicDiagonal = (
    (rowDiff === 1 && colDiff === 1 && fromCol % 2 === 0) || // Even col to lower-right
    (rowDiff === -1 && colDiff === -1 && fromCol % 2 === 1)   // Odd col to upper-left
  );
  
  if (isProblematicDiagonal) {
    return null;
  }

  // Use standard midpoint approach for all other adjacencies
  
  // For horizontal adjacencies, ensure consistent orientation to prevent offset duplicates
  let fromPosition = fromPos;
  let toPosition = toPos;
  
  if (rowDiff === 0) {
    // Horizontal edge - always orient left to right for consistency
    if (fromCol > toCol) {
      fromPosition = toPos;
      toPosition = fromPos;
    }
  }
  
  const centerToCenter = {
    x: toPosition.x - fromPosition.x,
    y: toPosition.y - fromPosition.y
  };
  
  const distance = Math.sqrt(centerToCenter.x * centerToCenter.x + centerToCenter.y * centerToCenter.y);
  
  const normalized = {
    x: centerToCenter.x / distance,
    y: centerToCenter.y / distance
  };
  
  const perpendicular = {
    x: -normalized.y,
    y: normalized.x
  };
  
  const midpoint = {
    x: (fromPosition.x + toPosition.x) / 2,
    y: (fromPosition.y + toPosition.y) / 2
  };
  
  const visualRadius = hexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
  const borderLength = visualRadius;
  
  return {
    start: {
      x: midpoint.x + perpendicular.x * borderLength / 2,
      y: midpoint.y + perpendicular.y * borderLength / 2
    },
    end: {
      x: midpoint.x - perpendicular.x * borderLength / 2,
      y: midpoint.y - perpendicular.y * borderLength / 2
    }
  };
}

/**
 * Get the neighbors of a hex using column-based parity (matches our layout)
 */
export function getHexNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
  const isEvenCol = col % 2 === 0;
  
  if (isEvenCol) {
    // Even column neighbors
    return [
      { row, col: col + 1 }, // Right
      { row, col: col - 1 }, // Left
      { row: row - 1, col: col + 1 }, // Upper-right
      { row: row - 1, col }, // Upper-left
      { row: row + 1, col: col + 1 }, // Lower-right
      { row: row + 1, col }  // Lower-left
    ];
  } else {
    // Odd column neighbors  
    return [
      { row, col: col + 1 }, // Right
      { row, col: col - 1 }, // Left
      { row: row - 1, col }, // Upper-right
      { row: row - 1, col: col - 1 }, // Upper-left
      { row: row + 1, col: col + 1 }, // Lower-right
      { row: row + 1, col: col - 1 }  // Lower-left
    ];
  }
}

/**
 * Create a consistent edge key for tracking borders
 */
export function createEdgeKey(fromHex: string, toHex: string): string {
  const [fromRow, fromCol] = fromHex.split('-').map(Number);
  const [toRow, toCol] = toHex.split('-').map(Number);
  
  let normalizedFromHex = fromHex;
  let normalizedToHex = toHex;
  
  // Sort by row first, then by column for consistent edge keys
  if (fromRow > toRow || (fromRow === toRow && fromCol > toCol)) {
    normalizedFromHex = toHex;
    normalizedToHex = fromHex;
  }
  
  return `${normalizedFromHex}_${normalizedToHex}`;
} 