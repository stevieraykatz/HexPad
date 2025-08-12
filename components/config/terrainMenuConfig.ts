/**
 * Terrain Menu Configuration
 * 
 * Direct configuration for terrain preview assets and properties.
 * Changes to this file are immediately reflected in the UI without regeneration.
 */

export interface TerrainMenuConfig {
  previewAsset: string;
  backgroundColor: string;
  description: string;
}

export interface TerrainMenuConfigMap {
  [terrainName: string]: TerrainMenuConfig;
}

export const TERRAIN_MENU_CONFIG: TerrainMenuConfigMap = {
  coast: {
    previewAsset: "coast_180_1.png",
    backgroundColor: "#F3E8C2",
    description: "Coastal terrain with water transitions"
  },
  forest: {
    previewAsset: "forest-360_B1.png",
    backgroundColor: "#2D5016",
    description: "Dense forest terrain with varied tree coverage"
  },
  hills: {
    previewAsset: "hills_2.png",
    backgroundColor: "#8B7355",
    description: "Rolling hills terrain"
  },
  mountain: {
    previewAsset: "mountain_3.png",
    backgroundColor: "#6B6B6B",
    description: "Mountainous rocky terrain"
  },
  plains: {
    previewAsset: "plains_1.png",
    backgroundColor: "#A0B366",
    description: "Open grassland terrain"
  },
  shrubland: {
    previewAsset: "shrubland_2.png",
    backgroundColor: "#7A8B4A",
    description: "Sparse vegetation and scrubland"
  },
  swamp: {
    previewAsset: "swamp_3.png",
    backgroundColor: "#3B4F2C",
    description: "Wetland and marsh terrain"
  }
};

export const DEFAULT_MENU_CONFIG: TerrainMenuConfig = {
  previewAsset: "_1.png", // Fallback pattern
  backgroundColor: "#6B7280",
  description: "Terrain"
};
