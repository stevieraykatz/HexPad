/**
 * Numbering Configuration
 * 
 * Configuration constants for grid numbering display and styling.
 */

export const NUMBERING_CONFIG = {
  EDGE_FONT_SIZE: {
    MIN: 14,
    RADIUS_MULTIPLIER: 0.3
  },
  IN_HEX_FONT_SIZE: {
    MIN: 10,
    RADIUS_MULTIPLIER: 0.2
  },
  GENERAL_FONT_SIZE: {
    MIN: 12,
    RADIUS_MULTIPLIER: 0.25
  },
  OUTLINE_WIDTH: 2,
  EDGE_MARGIN: {
    COLUMN: {
      BASE: 20,
      RADIUS_MULTIPLIER: 1.5,
      MIN: 15
    },
    ROW: {
      BASE: 15,
      RADIUS_MULTIPLIER: 0.8, // Closer to grid for better readability
      MIN: 10
    }
  },
  VERTICAL_OFFSET: 0.7,
} as const;

export type NumberingConfig = typeof NUMBERING_CONFIG;