/**
 * Hexagon Geometry Utilities
 * 
 * Helper functions for hexagon vertex generation, position calculations, and grid layout.
 */

import { OrientationMode } from '@/components/GridSizeControls';
import { GRID_CONFIG, HEX_GEOMETRY } from '../components/config';

// Type definitions
export interface HexPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface HexVertices {
  vertices: number[];
  texCoords?: number[];
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

/**
 * Generate hexagon vertices with optional texture coordinates
 */
export const createHexagonVertices = (
  centerX: number, 
  centerY: number, 
  radius: number, 
  orientationMode: OrientationMode,
  includeTexCoords: boolean = false
): HexVertices => {
  const vertices: number[] = [];
  const texCoords: number[] = [];
  const angleStep = (Math.PI * 2) / GRID_CONFIG.HEX_TRIANGLES_COUNT;
  const pointyTopHexAngleOffset = orientationMode === 'pointy-top' ? 29.85 : 0;
  
  // Create triangles for the hexagon (6 triangles from center)
  for (let i = 0; i < GRID_CONFIG.HEX_TRIANGLES_COUNT; i++) {
    // Center point
    vertices.push(centerX, centerY);
    if (includeTexCoords) texCoords.push(0.5, 0.5);
    
    // First vertex of triangle
    const angle1 = i * angleStep + pointyTopHexAngleOffset;
    const x1 = centerX + Math.cos(angle1) * radius;
    const y1 = centerY + Math.sin(angle1) * radius;
    vertices.push(x1, y1);
    if (includeTexCoords) {
      texCoords.push(0.5 + Math.cos(angle1) * 0.5, 0.5 + Math.sin(angle1) * 0.5);
    }
    
    // Second vertex of triangle
    const angle2 = ((i + 1) % GRID_CONFIG.HEX_TRIANGLES_COUNT) * angleStep + pointyTopHexAngleOffset;
    const x2 = centerX + Math.cos(angle2) * radius;
    const y2 = centerY + Math.sin(angle2) * radius;
    vertices.push(x2, y2);
    if (includeTexCoords) {
      texCoords.push(0.5 + Math.cos(angle2) * 0.5, 0.5 + Math.sin(angle2) * 0.5);
    }
  }
  
  return includeTexCoords ? { vertices, texCoords } : { vertices };
};

/**
 * Calculate optimal hex radius based on canvas size and grid dimensions
 */
export const calculateHexRadius = (
  canvasSize: CanvasSize,
  gridWidth: number,
  gridHeight: number,
  zoomLevel: number,
  orientationMode: OrientationMode
): number => {
  const availableWidth = canvasSize.width * GRID_CONFIG.CANVAS_MARGIN_FACTOR;
  const availableHeight = canvasSize.height * GRID_CONFIG.CANVAS_MARGIN_FACTOR;
  
  // Calculate radius from width constraint
  const radiusFromWidth = orientationMode === "pointy-top" ?
    (availableWidth / (HEX_GEOMETRY.SQRT_3 * gridWidth)) :
    (availableWidth / (2 * (GRID_CONFIG.HEX_HORIZONTAL_SPACING_RATIO * gridWidth + GRID_CONFIG.HEX_GRID_WIDTH_CALCULATION_OFFSET)));
  
  // Calculate radius from height constraint
  const radiusFromHeight = orientationMode === "pointy-top" ?
    (availableHeight / (2 * (GRID_CONFIG.POINTY_TOP_HEX_HORIZONTAL_SPACING_RATIO * gridHeight + GRID_CONFIG.HEX_GRID_WIDTH_CALCULATION_OFFSET))) :
    (availableHeight / (HEX_GEOMETRY.SQRT_3 * gridHeight));
  
  // Use the larger of the minimum and the calculated size to prevent distortion
  let baseRadius = Math.max(GRID_CONFIG.MIN_HEX_RADIUS, Math.min(radiusFromWidth, radiusFromHeight));
  
  // If we're severely width-constrained (like when menu is open on small screen),
  // prefer height-based sizing to maintain proper proportions
  if (radiusFromWidth < GRID_CONFIG.MIN_HEX_RADIUS * GRID_CONFIG.WIDTH_CONSTRAINT_THRESHOLD) {
    baseRadius = Math.max(GRID_CONFIG.MIN_HEX_RADIUS, radiusFromHeight);
  }
  
  // Apply zoom level to the base radius
  return baseRadius * zoomLevel;
};

/**
 * Calculate hexagon grid positions with proper spacing and padding
 */
export const calculateHexPositions = (
  hexRadius: number,
  gridWidth: number,
  gridHeight: number,
  canvasSize: CanvasSize,
  panOffset: PanOffset,
  orientationMode: OrientationMode
): HexPosition[] => {
  const positions: HexPosition[] = [];
  const hexWidth = HEX_GEOMETRY.getHexWidth(hexRadius, orientationMode);
  const hexHeight = HEX_GEOMETRY.getHexHeight(hexRadius, orientationMode);
    
  // For touching hexagons, use proper geometric spacing
  const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(hexRadius, orientationMode);
  const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(hexRadius, orientationMode);

  // Calculate the visual bounds of the entire grid
  const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
  
  // Calculate the actual visual height by finding the topmost and bottommost hexagon positions
  let minY = 0;
  let maxY = 0;
  
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const y = row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  
  // Total visual height includes the radius of the topmost and bottommost hexagons
  const actualHexHeight = hexHeight * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
  const totalGridHeight = maxY - minY + actualHexHeight;

  // Add padding to provide breathing room around the grid edges
  const verticalPadding = GRID_CONFIG.VERTICAL_PADDING;
  
  // Center the grid in the canvas, then apply pan offset
  const availableHeight = canvasSize.height - 2 * verticalPadding;
  const startX = (canvasSize.width - totalGridWidth) / 2 + hexRadius + panOffset.x;
  const topPaddingOffset = GRID_CONFIG.TOP_PADDING_OFFSET;
  const bottomPaddingOffset = GRID_CONFIG.BOTTOM_PADDING_OFFSET;
  const startY = verticalPadding + (availableHeight - totalGridHeight) / 2 + hexRadius + panOffset.y - minY + topPaddingOffset - bottomPaddingOffset;

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      // Position hexagons using proper hexagonal grid geometry
      const x = startX + col * horizontalSpacing;
      const y = startY + row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
      positions.push({ x, y, row, col });
    }
  }
  
  return positions;
};

/**
 * Convert mouse coordinates to hex grid coordinates
 */
export const getHexFromMousePos = (
  mouseX: number,
  mouseY: number,
  hexPositions: HexPosition[],
  hexRadius: number
): HexPosition | null => {
  // Find the closest hexagon
  let closestHex: HexPosition | null = null;
  let minDistance = Infinity;
  
  hexPositions.forEach((pos) => {
    const distance = Math.sqrt(
      Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
    );
    
    if (distance < minDistance && distance <= hexRadius) {
      minDistance = distance;
      closestHex = pos;
    }
  });
  
  return closestHex;
};

/**
 * Calculate hex positions for export (without pan/zoom, centered)
 */
export const calculateExportHexPositions = (
  exportHexRadius: number,
  gridWidth: number,
  gridHeight: number,
  exportSize: CanvasSize,
  scale: number,
  orientationMode: OrientationMode
): HexPosition[] => {
  const exportHexPositions: HexPosition[] = [];
  const hexWidth = HEX_GEOMETRY.getHexWidth(exportHexRadius, orientationMode);
  const hexHeight = HEX_GEOMETRY.getHexHeight(exportHexRadius, orientationMode);
  const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(exportHexRadius, orientationMode);
  const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(exportHexRadius, orientationMode);

  const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
  
  // Calculate the actual visual height
  let minY = 0;
  let maxY = 0;
  
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const y = row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  
  const actualHexHeight = hexHeight * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
  const totalGridHeight = maxY - minY + actualHexHeight;
  
  // Add padding (scaled for export)
  const verticalPadding = GRID_CONFIG.VERTICAL_PADDING * scale;
  const availableHeight = exportSize.height - 2 * verticalPadding;
  const startX = (exportSize.width - totalGridWidth) / 2 + exportHexRadius;
  const topPaddingOffset = GRID_CONFIG.TOP_PADDING_OFFSET * scale;
  const bottomPaddingOffset = GRID_CONFIG.BOTTOM_PADDING_OFFSET * scale;
  const startY = verticalPadding + (availableHeight - totalGridHeight) / 2 + exportHexRadius - minY + topPaddingOffset - bottomPaddingOffset;

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const x = startX + col * horizontalSpacing;
      const y = startY + row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
      exportHexPositions.push({ x, y, row, col });
    }
  }

  return exportHexPositions;
}; 