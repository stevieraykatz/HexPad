/**
 * Configuration System
 * 
 * This centralized configuration system organizes all magic numbers and constants
 * used throughout the HexPad application.
 * 
 * ORGANIZATION:
 * 
 * 📐 gridConfig.ts - Grid geometry, zoom behavior, hex sizing, and interaction
 *    - GRID_CONFIG: Core grid behavior and constraints
 *    - HEX_GEOMETRY: Hexagon mathematical calculations
 * 
 * 🎨 uiConfig.ts - UI styling, layout, colors, and visual design
 *    - UI_CONFIG: Complete UI design system with colors, spacing, typography
 * 
 * 🖼️ assetsConfig.ts - Colors, textures, and asset paths
 *    - COLORS: Paint color definitions with WebGL RGB values
 *    - PAINT_OPTIONS: All available paint options (colors and textures) in a flat array
 *    - DEFAULT_COLORS: Fallback and initial states
 *
 * 🔢 numberingConfig.ts - Grid numbering display and styling
 *    - NUMBERING_CONFIG: Font sizes, margins, and styling for grid numbering
 *
 */

export { GRID_CONFIG, HEX_GEOMETRY } from './gridConfig';
export type { GridConfig, HexGeometry } from './gridConfig';

export { UI_CONFIG } from './uiConfig';
export type { 
  UIConfig, 
  SpacingConfig, 
  BorderRadiusConfig, 
  FontSizeConfig, 
  FontWeightConfig, 
  ColorsConfig, 
  BlurConfig, 
  BoxShadowConfig, 
  GridControlsConfig, 
  HoverConfig, 
  ZIndexConfig 
} from './uiConfig';

// Dynamic asset configuration
export { 
  DEFAULT_COLORS, 
  BACKGROUND_COLORS,
  getPaintOptions,
  getTextureItem,
  getTexturesByType,
  getTexturesWithVariants,
  getSimpleTextures,
  refreshPaintOptions
} from './dynamicAssetsConfig';

export type { 
  RGB, 
  DefaultColors, 
  BackgroundColor,
  DynamicTextureItem as TextureItem,
  AssetItem
} from './dynamicAssetsConfig';

// Asset loader exports for advanced usage
export {
  getTerrainIndex,
  getTerrainInfo,
  loadTerrainManifest,
  getAllTerrainTypes,
  getComplexTerrains,
  getSimpleTerrains,
  getTerrainBasePath,
  getRandomTerrainVariant,
  preloadAllManifests
} from './assetLoader';

export type {
  AssetVariant,
  AssetManifest,
  TerrainInfo,
  TerrainIndex,
  MenuConfig
} from './assetLoader';

// Legacy compatibility export
import { getPaintOptions } from './dynamicAssetsConfig';
export const PAINT_OPTIONS = getPaintOptions();

export { ICON_OPTIONS } from './iconsConfig';
export type { IconItem } from './iconsConfig';

export { NUMBERING_CONFIG } from './numberingConfig';
export type { NumberingConfig } from './numberingConfig';

export { TERRAIN_MENU_CONFIG, DEFAULT_MENU_CONFIG } from './terrainMenuConfig';
export type { TerrainMenuConfig, TerrainMenuConfigMap } from './terrainMenuConfig';

// Additional types used by components
export interface HexTexture {
  type: 'color' | 'texture';
  name: string;
  displayName: string;
  rgb?: [number, number, number];
  path?: string;
  rotation?: number; // Rotation in 1/6th increments (0-5)
} 