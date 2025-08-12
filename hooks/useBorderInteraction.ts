import { useCallback, useRef } from 'react';
import type { HexPosition } from '../utils/hexagonUtils';
import { getSharedEdgeVertices, getHexNeighbors, createEdgeKey } from '../utils/borderUtils';
import type { IconItem } from '../components/config';

interface UseBorderInteractionProps {
  hexPositionsRef: React.RefObject<HexPosition[]>;
  hexRadiusRef: React.RefObject<number>;
  onEdgeClick?: (fromHex: string, toHex: string) => void;
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  selectedIcon?: IconItem | null;
}

interface EdgeDetectionResult {
  fromHex: string;
  toHex: string;
}

export function useBorderInteraction({
  hexPositionsRef,
  hexRadiusRef,
  onEdgeClick,
  activeTab,
  selectedIcon
}: UseBorderInteractionProps) {
  
  const paintedBordersDuringDragRef = useRef<Set<string>>(new Set());

  /**
   * Detect if mouse click is on an edge between two hexes
   */
  const getEdgeFromMousePos = useCallback((mouseX: number, mouseY: number): EdgeDetectionResult | null => {
    const hexPositions = hexPositionsRef.current;
    const hexRadius = hexRadiusRef.current;
    
    if (!hexPositions || !hexRadius || hexPositions.length === 0 || hexRadius === 0) {
      return null;
    }
    
    let bestMatch: EdgeDetectionResult | null = null;
    let minDistance = Infinity;
    
    // Check all hex pairs for nearby edges
    for (let i = 0; i < hexPositions.length; i++) {
      const hex1 = hexPositions[i];
      
      // Get neighbors using the utility function
      const neighbors = getHexNeighbors(hex1.row, hex1.col);
      
      neighbors.forEach(neighborCoord => {
        // Find the actual position of this neighbor
        const hex2 = hexPositions.find(p => p.row === neighborCoord.row && p.col === neighborCoord.col);
        if (!hex2) return;
        
        // Get the actual edge vertices using the same logic as border rendering
        const fromHex = `${hex1.row}-${hex1.col}`;
        const toHex = `${hex2.row}-${hex2.col}`;
        const edgeVertices = getSharedEdgeVertices(fromHex, toHex, hexRadius, hexPositions);
        
        if (!edgeVertices) return;
        
        // Calculate the midpoint of the actual edge
        const edgeMidX = (edgeVertices.start.x + edgeVertices.end.x) / 2;
        const edgeMidY = (edgeVertices.start.y + edgeVertices.end.y) / 2;
        
        // Calculate distance from mouse to actual edge midpoint
        const distance = Math.sqrt(Math.pow(mouseX - edgeMidX, 2) + Math.pow(mouseY - edgeMidY, 2));
        
        // Use a reasonable threshold for edge detection
        if (distance < hexRadius * 0.4 && distance < minDistance) {
          bestMatch = { fromHex, toHex };
          minDistance = distance;
        }
      });
    }
    
    return bestMatch;
  }, [hexPositionsRef, hexRadiusRef]);

  /**
   * Paint a border if it hasn't been painted during this drag
   */
  const paintBorderIfNew = useCallback((mouseX: number, mouseY: number): void => {
    if (!onEdgeClick || activeTab !== 'borders') return;
    
    const clickedEdge = getEdgeFromMousePos(mouseX, mouseY);
    if (!clickedEdge) return;
    
    // Create consistent edge key for tracking
    const edgeKey = createEdgeKey(clickedEdge.fromHex, clickedEdge.toHex);
    const paintedBordersSet = paintedBordersDuringDragRef.current;
    
    if (!paintedBordersSet.has(edgeKey)) {
      paintedBordersSet.add(edgeKey);
      
      // If eraser is active, this will erase the border, otherwise it will paint
      onEdgeClick(clickedEdge.fromHex, clickedEdge.toHex);
    }
  }, [onEdgeClick, activeTab, getEdgeFromMousePos, selectedIcon]);

  /**
   * Clear the painted borders tracking set
   */
  const clearPaintedBorders = useCallback((): void => {
    paintedBordersDuringDragRef.current.clear();
  }, []);

  return {
    getEdgeFromMousePos,
    paintBorderIfNew,
    clearPaintedBorders,
    paintedBordersDuringDragRef
  };
} 