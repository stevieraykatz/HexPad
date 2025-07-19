/**
 * Configuration System
 * 
 * This centralized configuration system organizes all magic numbers and constants
 * used throughout the Hex Grid Painter application.
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
 * USAGE EXAMPLES:
 * 
 * // Import specific configs
 * import { GRID_CONFIG, UI_CONFIG } from './config';
 * 
 * // Use in components
 * const defaultWidth = GRID_CONFIG.DEFAULT_WIDTH;
 * const menuWidth = UI_CONFIG.MENU_WIDTH;
 * 
 * // Consistent styling
 * style={{ 
 *   padding: UI_CONFIG.SPACING.LARGE,
 *   borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM 
 * }}
 * 
 * BENEFITS:
 * - Single source of truth for all constants
 * - Easy theme and behavior modifications
 * - Consistent design system
 * - Type-safe constant references
 * - Clear separation of concerns
 */

// Central export for all configuration files
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

export { COLORS, DEFAULT_COLORS, PAINT_OPTIONS, ASSET_PATHS, BACKGROUND_COLORS } from './assetsConfig';
export type { 
  RGB, 
  Color, 
  ColorItem, 
  TextureItem, 
  AssetItem,
  DefaultColors, 
  AssetPaths,
  BackgroundColor 
} from './assetsConfig'; 