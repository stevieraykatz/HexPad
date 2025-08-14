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
  readonly DEFAULT_CANVAS_WIDTH: number; // Default canvas width in pixels
  readonly DEFAULT_CANVAS_HEIGHT: number; // Default canvas height in pixels
  
  // Zoom configuration
  readonly BASE_ZOOM_LEVEL: number;
  readonly ZOOM_SPEED: number;
  readonly TARGET_TILES_AT_MAX_ZOOM: number; // Number of tiles to show across screen when fully zoomed in
  
  // Hex sizing constraints
  readonly MIN_HEX_RADIUS: number; // Minimum radius in pixels to prevent distortion
  readonly WIDTH_CONSTRAINT_THRESHOLD: number; // When to switch to height-based sizing (as ratio of min radius)
  readonly FALLBACK_HEX_RADIUS: number; // Fallback value when radius calculation fails
  readonly HEX_GRID_WIDTH_CALCULATION_OFFSET: number; // Offset for calculating grid width from available space
  
  // Pan limits
  readonly PAN_EXTRA_MARGIN_FACTOR: number; // Extra margin beyond grid bounds for panning
  
  // Grid padding and positioning
  readonly VERTICAL_PADDING: number; // Pixels of padding at top and bottom
  readonly TOP_PADDING_OFFSET: number; // Static offset to ensure top padding
  readonly BOTTOM_PADDING_OFFSET: number; // Static offset to ensure bottom padding
  
  // WebGL and rendering constants
  readonly WEBGL_ALPHA_VALUE: number; // Alpha value for opaque rendering
  readonly VERTEX_SHADER_COMPONENTS: number; // Number of components per vertex (x, y)
  readonly TEXTURE_COORDINATE_COMPONENTS: number; // Number of components per texture coordinate (u, v)
  readonly HEX_TRIANGLES_COUNT: number; // Number of triangles that make up a hexagon
  readonly VERTICES_PER_TRIANGLE: number; // Number of vertices per triangle
  readonly HEX_VERTICES_TOTAL: number; // Total number of vertices for a hexagon (6 triangles * 3 vertices)
  
  // Texture loading constants
  readonly PLACEHOLDER_PIXEL_GREY: number; // Grey value for placeholder pixel (0-255)
  readonly PLACEHOLDER_PIXEL_ALPHA: number; // Alpha value for placeholder pixel (0-255)
  
  // Export settings
  readonly DEFAULT_EXPORT_SCALE: number; // Default scale factor for PNG export
  readonly HIGH_QUALITY_EXPORT_SCALE: number; // High quality scale factor for PNG export
  readonly EXPORT_FILENAME_PREFIX: string; // Prefix for exported file names
  readonly TIMESTAMP_SLICE_START: number; // Start index for timestamp slice
  readonly TIMESTAMP_SLICE_END: number; // End index for timestamp slice
  
  // Fallback colors
  readonly FALLBACK_TEXTURE_COLOR: [number, number, number]; // RGB values for texture loading fallback (0-1 range)
  readonly DEFAULT_BACKGROUND_COLOR: [number, number, number]; // RGB values for default background color (0-1 range)
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
  DEFAULT_CANVAS_WIDTH: 800, // Default canvas width in pixels
  DEFAULT_CANVAS_HEIGHT: 600, // Default canvas height in pixels
  
  // Zoom configuration
  BASE_ZOOM_LEVEL: 0.67,
  ZOOM_SPEED: 0.1,
  TARGET_TILES_AT_MAX_ZOOM: 4.5, // Number of tiles to show across screen when fully zoomed in
  
  // Hex sizing constraints
  MIN_HEX_RADIUS: 15, // Minimum radius in pixels to prevent distortion
  WIDTH_CONSTRAINT_THRESHOLD: 0.8, // When to switch to height-based sizing (as ratio of min radius)
  FALLBACK_HEX_RADIUS: 50, // Fallback value when radius calculation fails
  HEX_GRID_WIDTH_CALCULATION_OFFSET: 0.25, // Offset for calculating grid width from available space
  
  // Pan limits
  PAN_EXTRA_MARGIN_FACTOR: 1.0, // Extra margin beyond grid bounds for panning
  
  // Grid padding and positioning
  VERTICAL_PADDING: 35, // Pixels of padding at top and bottom
  TOP_PADDING_OFFSET: 20, // Static offset to ensure top padding
  BOTTOM_PADDING_OFFSET: 20, // Static offset to ensure bottom padding
  
  // WebGL and rendering constants
  WEBGL_ALPHA_VALUE: 1.0, // Alpha value for opaque rendering
  VERTEX_SHADER_COMPONENTS: 2, // Number of components per vertex (x, y)
  TEXTURE_COORDINATE_COMPONENTS: 2, // Number of components per texture coordinate (u, v)
  HEX_TRIANGLES_COUNT: 6, // Number of triangles that make up a hexagon
  VERTICES_PER_TRIANGLE: 3, // Number of vertices per triangle
  HEX_VERTICES_TOTAL: 18, // Total number of vertices for a hexagon (6 triangles * 3 vertices)
  
  // Texture loading constants
  PLACEHOLDER_PIXEL_GREY: 128, // Grey value for placeholder pixel (0-255)
  PLACEHOLDER_PIXEL_ALPHA: 255, // Alpha value for placeholder pixel (0-255)
  
  // Export settings
  DEFAULT_EXPORT_SCALE: 3, // Default scale factor for PNG export
  HIGH_QUALITY_EXPORT_SCALE: 4, // High quality scale factor for PNG export
  EXPORT_FILENAME_PREFIX: 'hex-grid', // Prefix for exported file names
  TIMESTAMP_SLICE_START: 0, // Start index for timestamp slice
  TIMESTAMP_SLICE_END: 19, // End index for timestamp slice
  
  // Fallback colors
  FALLBACK_TEXTURE_COLOR: [0.8, 0.6, 0.4], // RGB values for texture loading fallback (0-1 range)
  DEFAULT_BACKGROUND_COLOR: [0.815, 0.780, 0.671], // RGB values for default background color (0-1 range) - papery manila
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