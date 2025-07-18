/**
 * Grid Configuration
 * 
 * This file contains all constants related to hexagonal grid geometry, behavior, and interaction.
 * 
 * MODIFICATION GUIDELINES:
 * - Grid dimensions: Adjust DEFAULT_WIDTH/HEIGHT and MIN/MAX_SIZE as needed
 * - Hex geometry: HEX_HORIZONTAL_SPACING_RATIO controls how tightly packed hexes are (0.75 = touching)
 * - Zoom behavior: Increase ZOOM_SPEED for faster zoom, adjust TARGET_TILES_AT_MAX_ZOOM for zoom limits
 * - Size constraints: MIN_HEX_RADIUS prevents tiny hexes, increase for better visibility on small screens
 * - Canvas margins: CANVAS_MARGIN_FACTOR controls how much border space around the grid (0.95 = 5% margin)
 */

export interface GridConfig {
  // Default grid dimensions
  readonly DEFAULT_WIDTH: number;
  readonly DEFAULT_HEIGHT: number;
  
  // Grid size limits
  readonly MIN_SIZE: number;
  readonly MAX_SIZE: number;
  
  // Hex geometry constants
  readonly HEX_HORIZONTAL_SPACING_RATIO: number; // Distance between hex centers horizontally (as ratio of hex width)
  readonly HEX_ROW_VERTICAL_OFFSET: number; // Vertical offset for alternating columns (as ratio of hex height)
  readonly HEX_VISUAL_SIZE_RATIO: number; // Visual size of hexagons relative to their radius (0.9 = 90% size, creates spacing)
  
  // Canvas sizing
  readonly CANVAS_MARGIN_FACTOR: number; // Leave 5% margin around the grid
  
  // Zoom configuration
  readonly BASE_ZOOM_LEVEL: number;
  readonly ZOOM_SPEED: number;
  readonly TARGET_TILES_AT_MAX_ZOOM: number; // Number of tiles to show across screen when fully zoomed in
  
  // Hex sizing constraints
  readonly MIN_HEX_RADIUS: number; // Minimum radius in pixels to prevent distortion
  readonly WIDTH_CONSTRAINT_THRESHOLD: number; // When to switch to height-based sizing (as ratio of min radius)
  readonly FALLBACK_HEX_RADIUS: number; // Fallback value when radius calculation fails
  
  // Pan limits
  readonly PAN_EXTRA_MARGIN_FACTOR: number; // Extra margin beyond grid bounds for panning
}

// Grid geometry and behavior configuration
export const GRID_CONFIG: GridConfig = {
  // Default grid dimensions
  DEFAULT_WIDTH: 12,
  DEFAULT_HEIGHT: 12,
  
  // Grid size limits
  MIN_SIZE: 5,
  MAX_SIZE: 25,
  
  // Hex geometry constants
  HEX_HORIZONTAL_SPACING_RATIO: 0.75, // Distance between hex centers horizontally (as ratio of hex width)
  HEX_ROW_VERTICAL_OFFSET: 0.5, // Vertical offset for alternating columns (as ratio of hex height)
  HEX_VISUAL_SIZE_RATIO: 0.95, // Visual size of hexagons relative to their radius (0.95 = 95% size, higher value creates less spacing)
  
  // Canvas sizing
  CANVAS_MARGIN_FACTOR: 0.95, // Leave 5% margin around the grid
  
  // Zoom configuration
  BASE_ZOOM_LEVEL: 1.0,
  ZOOM_SPEED: 0.1,
  TARGET_TILES_AT_MAX_ZOOM: 4.5, // Number of tiles to show across screen when fully zoomed in
  
  // Hex sizing constraints
  MIN_HEX_RADIUS: 15, // Minimum radius in pixels to prevent distortion
  WIDTH_CONSTRAINT_THRESHOLD: 0.8, // When to switch to height-based sizing (as ratio of min radius)
  FALLBACK_HEX_RADIUS: 50, // Fallback value when radius calculation fails
  
  // Pan limits
  PAN_EXTRA_MARGIN_FACTOR: 1.0, // Extra margin beyond grid bounds for panning
};

/**
 * Hexagon Geometry Utilities
 * 
 * These functions calculate hexagon dimensions and spacing based on radius.
 * Generally you shouldn't need to modify these unless changing hexagon shape.
 */
export interface HexGeometry {
  readonly SQRT_3: number; // Square root of 3 for hex height calculations
  
  // Calculate hex width from radius
  getHexWidth: (radius: number) => number;
  
  // Calculate hex height from radius  
  getHexHeight: (radius: number) => number;
  
  // Calculate horizontal spacing between hex centers
  getHorizontalSpacing: (radius: number) => number;
  
  // Calculate vertical spacing between hex centers
  getVerticalSpacing: (radius: number) => number;
}

export const HEX_GEOMETRY: HexGeometry = {
  SQRT_3: Math.sqrt(3), // Square root of 3 for hex height calculations
  
  // Calculate hex width from radius
  getHexWidth: (radius: number): number => radius * 2,
  
  // Calculate hex height from radius  
  getHexHeight: (radius: number): number => radius * HEX_GEOMETRY.SQRT_3,
  
  // Calculate horizontal spacing between hex centers
  getHorizontalSpacing: (radius: number): number => HEX_GEOMETRY.getHexWidth(radius) * GRID_CONFIG.HEX_HORIZONTAL_SPACING_RATIO,
  
  // Calculate vertical spacing between hex centers
  getVerticalSpacing: (radius: number): number => HEX_GEOMETRY.getHexHeight(radius),
}; 