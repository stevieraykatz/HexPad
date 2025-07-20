/**
 * Zoom and Pan Utilities
 * 
 * Helper functions for zoom level calculations, pan limits, and zoom-to-cursor behavior.
 */

import { GRID_CONFIG, HEX_GEOMETRY } from '../components/config';
import type { CanvasSize, PanOffset } from './hexagonUtils';

// Type definitions
export interface ZoomLimits {
  minZoom: number;
  maxZoom: number;
}

export interface PanLimits {
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
}

/**
 * Calculate zoom limits based on grid dimensions
 */
export const calculateZoomLimits = (gridWidth: number): ZoomLimits => {
  // Min zoom (zoomed out): current full view
  const minZoom = GRID_CONFIG.BASE_ZOOM_LEVEL;
  
  // Max zoom (zoomed in): show about 4-5 tiles
  // We want to fit approximately 4-5 hexagons across the screen
  const currentTilesAcross = gridWidth;
  const maxZoom = currentTilesAcross / GRID_CONFIG.TARGET_TILES_AT_MAX_ZOOM;
  
  return { minZoom, maxZoom };
};

/**
 * Calculate pan limits to prevent zooming too far from the grid
 */
export const calculatePanLimits = (
  hexRadius: number,
  gridWidth: number,
  gridHeight: number,
  canvasSize: CanvasSize
): PanLimits => {
  const hexWidth = HEX_GEOMETRY.getHexWidth(hexRadius);
  const hexHeight = HEX_GEOMETRY.getHexHeight(hexRadius);
  const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(hexRadius);
  const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(hexRadius);
  
  const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
  const totalGridHeight = gridHeight * verticalSpacing;
  
  // Calculate how much the grid exceeds the container size
  const excessWidth = Math.max(0, totalGridWidth - canvasSize.width);
  const excessHeight = Math.max(0, totalGridHeight - canvasSize.height);
  
  // Allow panning to show the parts of the grid that don't fit
  const maxPanX = excessWidth / 2 + hexRadius * GRID_CONFIG.PAN_EXTRA_MARGIN_FACTOR;
  const maxPanY = excessHeight / 2 + hexRadius * GRID_CONFIG.PAN_EXTRA_MARGIN_FACTOR;
  const minPanX = -maxPanX;
  const minPanY = -maxPanY;
  
  return { minPanX, maxPanX, minPanY, maxPanY };
};

/**
 * Constrain pan offset to stay within reasonable bounds
 */
export const constrainPanOffset = (
  offset: PanOffset,
  hexRadius: number,
  gridWidth: number,
  gridHeight: number,
  canvasSize: CanvasSize
): PanOffset => {
  const { minPanX, maxPanX, minPanY, maxPanY } = calculatePanLimits(hexRadius, gridWidth, gridHeight, canvasSize);
  return {
    x: Math.max(minPanX, Math.min(maxPanX, offset.x)),
    y: Math.max(minPanY, Math.min(maxPanY, offset.y))
  };
};

/**
 * Calculate new zoom level and pan offset for zoom-to-cursor behavior
 */
export const calculateZoomToPoint = (
  currentZoom: number,
  zoomDirection: number,
  mouseX: number,
  mouseY: number,
  canvasSize: CanvasSize,
  currentPanOffset: PanOffset,
  currentHexRadius: number,
  gridWidth: number,
  gridHeight: number
): { newZoom: number; newPanOffset: PanOffset } => {
  const { minZoom, maxZoom } = calculateZoomLimits(gridWidth);
  
  // Calculate new zoom level
  const newZoom = currentZoom + (zoomDirection * GRID_CONFIG.ZOOM_SPEED);
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
  
  // If we're at minimum zoom, reset pan to center the grid
  if (clampedZoom === minZoom) {
    return { newZoom: clampedZoom, newPanOffset: { x: 0, y: 0 } };
  }
  
  // Calculate zoom change
  const zoomChange = clampedZoom / currentZoom;
  
  // Calculate the world point under the mouse before zoom
  const worldX = mouseX - canvasSize.width / 2 - currentPanOffset.x;
  const worldY = mouseY - canvasSize.height / 2 - currentPanOffset.y;
  
  // After zoom, we want the same world point to be under the mouse
  const newOffsetX = mouseX - canvasSize.width / 2 - worldX * zoomChange;
  const newOffsetY = mouseY - canvasSize.height / 2 - worldY * zoomChange;
  
  // Calculate projected radius for constraint calculation
  const projectedRadius = currentHexRadius * (clampedZoom / currentZoom);
  
  // Constrain the new offset
  const constrainedOffset = constrainPanOffset(
    { x: newOffsetX, y: newOffsetY }, 
    projectedRadius, 
    gridWidth, 
    gridHeight, 
    canvasSize
  );
  
  return { newZoom: clampedZoom, newPanOffset: constrainedOffset };
}; 