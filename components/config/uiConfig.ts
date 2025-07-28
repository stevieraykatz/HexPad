/**
 * UI Configuration
 * 
 * This file contains all constants related to user interface styling, layout, and visual design.
 * 
 * MODIFICATION GUIDELINES:
 * - Menu layout: Adjust MENU_WIDTH to change side menu size
 * - Animations: Modify TRANSITION_DURATION for faster/slower animations
 * - Colors: All colors use rgba format for transparency - adjust alpha values for opacity
 * - Spacing: Use the SPACING scale for consistent margins and padding throughout the app
 * - Typography: Font sizes follow a consistent scale - stick to defined sizes for visual harmony
 * - Effects: Blur and shadow values can be adjusted for different visual weight
 * 
 * COLOR SYSTEM:
 * - Background colors provide different levels of transparency over dark base
 * - Border colors create visual separation with subtle transparency
 * - Text colors provide hierarchy from primary (white) to subtle (low opacity)
 * - Selected states use blue theme, alternative selections use green
 * - Danger actions use red theme for clear visual warning
 */

export interface SpacingConfig {
  readonly SMALL: string;
  readonly MEDIUM: string;
  readonly LARGE: string;
  readonly XLARGE: string;
  readonly XXLARGE: string;
}

export interface BorderRadiusConfig {
  readonly SMALL: string;
  readonly MEDIUM: string;
  readonly LARGE: string;
  readonly XLARGE: string;
}

export interface FontSizeConfig {
  readonly SMALL: string;
  readonly MEDIUM: string;
  readonly NORMAL: string;
  readonly LARGE: string;
  readonly XLARGE: string;
  readonly XXLARGE: string;
}

export interface FontWeightConfig {
  readonly NORMAL: string;
  readonly MEDIUM: string;
  readonly SEMIBOLD: string;
}

export interface ColorsConfig {
  // Background colors
  readonly MENU_BACKGROUND: string;
  readonly OVERLAY_BACKGROUND: string;
  readonly BUTTON_BACKGROUND: string;
  readonly SELECTED_BACKGROUND: string;
  readonly SELECTED_ALT_BACKGROUND: string;
  readonly INFO_BACKGROUND: string;
  readonly DANGER_BACKGROUND: string;
  
  // Border colors
  readonly BORDER_COLOR: string;
  readonly BORDER_COLOR_LIGHT: string;
  readonly SELECTED_BORDER: string;
  readonly SELECTED_ALT_BORDER: string;
  readonly DANGER_BORDER: string;
  
  // Text colors
  readonly TEXT_PRIMARY: string;
  readonly TEXT_SECONDARY: string;
  readonly TEXT_TERTIARY: string;
  readonly TEXT_MUTED: string;
  readonly TEXT_SUBTLE: string;
  readonly TEXT_DANGER: string;
}

export interface BlurConfig {
  readonly LIGHT: string;
  readonly MEDIUM: string;
}

export interface BoxShadowConfig {
  readonly LIGHT: string;
  readonly MEDIUM: string;
  readonly SELECTED: string;
}

export interface GridControlsConfig {
  readonly SLIDER_HEIGHT: string;
  readonly COLOR_SWATCH_SIZE: string;
  readonly COLOR_SWATCH_BORDER_SELECTED: string;
  readonly COLOR_SWATCH_BORDER_NORMAL: string;
}

export interface PaintOptionsConfig {
  readonly GRID_COLUMNS: number; // Number of columns in paint options grid
  readonly TILE_SIZE: string; // Size of each paint option tile
  readonly TILE_GAP: string; // Gap between paint option tiles
  readonly TILE_PADDING: string; // Padding inside each tile
  readonly TILE_BORDER_WIDTH_NORMAL: string; // Border width for normal tiles
  readonly TILE_BORDER_WIDTH_SELECTED: string; // Border width for selected tiles
  readonly ZOOM_SCALE_PERCENTAGE: string; // Scale percentage for zooming texture images
  readonly ZOOM_OFFSET_PERCENTAGE: string; // Offset percentage for zoomed texture positioning
  readonly MAX_HEIGHT: string; // Maximum height for scrollable paint options
}

export interface MenuConfig {
  readonly TOGGLE_BUTTON_OFFSET: number; // Offset for menu toggle button when menu is open
  readonly TOP_MARGIN: string; // Top margin for menu content
  readonly MENU_ITEM_SPACING: string; // Spacing between major menu sections
  readonly MENU_HEIGHT: string; // Height of the bottom action menu
}

export interface AppLayoutConfig {
  readonly FULL_WIDTH_PERCENTAGE: string; // 100% width value
  readonly FULL_HEIGHT_PERCENTAGE: string; // 100% height value
  readonly EXPORT_OPACITY_DISABLED: number; // Opacity when export button is disabled
}

export interface HoverConfig {
  readonly DANGER_BACKGROUND: string;
}

export interface ZIndexConfig {
  readonly MENU: number;
  readonly MENU_TOGGLE: number;
}

export interface UIConfig {
  // Side menu dimensions
  readonly MENU_WIDTH: number;
  
  // Animation and transitions
  readonly TRANSITION_DURATION: string;
  readonly TRANSITION_EASING: string;
  
  // Z-index layering
  readonly Z_INDEX: ZIndexConfig;
  
  // Spacing and sizing
  readonly SPACING: SpacingConfig;
  
  // Border radius values
  readonly BORDER_RADIUS: BorderRadiusConfig;
  
  // Typography
  readonly FONT_SIZE: FontSizeConfig;
  readonly FONT_WEIGHT: FontWeightConfig;
  
  // Colors and opacity
  readonly COLORS: ColorsConfig;
  
  // Effects
  readonly BLUR: BlurConfig;
  readonly BOX_SHADOW: BoxShadowConfig;
  
  // Grid controls
  readonly GRID_CONTROLS: GridControlsConfig;
  
  // Paint options
  readonly PAINT_OPTIONS: PaintOptionsConfig;
  
  // Menu configuration
  readonly MENU: MenuConfig;
  
  // App layout
  readonly APP_LAYOUT: AppLayoutConfig;
  
  // Hover effects
  readonly HOVER: HoverConfig;
}

// UI styling and layout configuration
export const UI_CONFIG: UIConfig = {
  // Side menu dimensions
  MENU_WIDTH: 320,
  
  // Animation and transitions
  TRANSITION_DURATION: '0.3s',
  TRANSITION_EASING: 'ease',
  
  // Z-index layering
  Z_INDEX: {
    MENU: 10000,
    MENU_TOGGLE: 10001,
  },
  
  // Spacing and sizing
  SPACING: {
    SMALL: '8px',
    MEDIUM: '10px',
    LARGE: '15px',
    XLARGE: '20px',
    XXLARGE: '25px',
  },
  
  // Border radius values
  BORDER_RADIUS: {
    SMALL: '4px',
    MEDIUM: '6px',
    LARGE: '8px',
    XLARGE: '12px',
  },
  
  // Typography
  FONT_SIZE: {
    SMALL: '12px',
    MEDIUM: '13px',
    NORMAL: '14px',
    LARGE: '16px',
    XLARGE: '20px',
    XXLARGE: '30px',
  },
  
  FONT_WEIGHT: {
    NORMAL: '400',
    MEDIUM: '500',
    SEMIBOLD: '600',
  },
  
  // Colors and opacity
  COLORS: {
    // Background colors
    MENU_BACKGROUND: 'rgba(0, 0, 0, 0.95)',
    OVERLAY_BACKGROUND: 'rgba(0, 0, 0, 0.8)',
    BUTTON_BACKGROUND: 'rgba(255, 255, 255, 0.1)',
    SELECTED_BACKGROUND: 'rgba(59, 130, 246, 0.4)',
    SELECTED_ALT_BACKGROUND: 'rgba(34, 197, 94, 0.4)',
    INFO_BACKGROUND: 'rgba(255, 255, 255, 0.05)',
    DANGER_BACKGROUND: 'rgba(239, 68, 68, 0.2)',
    
    // Border colors
    BORDER_COLOR: 'rgba(255, 255, 255, 0.15)',
    BORDER_COLOR_LIGHT: 'rgba(255, 255, 255, 0.2)',
    SELECTED_BORDER: '#3B82F6',
    SELECTED_ALT_BORDER: '#22C55E',
    DANGER_BORDER: 'rgba(239, 68, 68, 0.5)',
    
    // Text colors
    TEXT_PRIMARY: 'white',
    TEXT_SECONDARY: 'rgba(255, 255, 255, 0.9)',
    TEXT_TERTIARY: 'rgba(255, 255, 255, 0.8)',
    TEXT_MUTED: 'rgba(255, 255, 255, 0.6)',
    TEXT_SUBTLE: 'rgba(255, 255, 255, 0.5)',
    TEXT_DANGER: 'rgba(239, 68, 68, 0.9)',
  },
  
  // Effects
  BLUR: {
    LIGHT: 'blur(10px)',
    MEDIUM: 'blur(15px)',
  },
  
  BOX_SHADOW: {
    LIGHT: '0 4px 20px rgba(0, 0, 0, 0.3)',
    MEDIUM: '5px 0 20px rgba(0, 0, 0, 0.3)',
    SELECTED: '0 0 12px rgba(255, 255, 255, 0.6)',
  },
  
  // Grid controls
  GRID_CONTROLS: {
    SLIDER_HEIGHT: '6px',
    COLOR_SWATCH_SIZE: '40px',
    COLOR_SWATCH_BORDER_SELECTED: '3px solid white',
    COLOR_SWATCH_BORDER_NORMAL: '2px solid rgba(255, 255, 255, 0.3)',
  },
  
  // Paint options
  PAINT_OPTIONS: {
    GRID_COLUMNS: 3, // Number of columns in paint options grid
    TILE_SIZE: '80px', // Size of each paint option tile
    TILE_GAP: '4px', // Gap between paint option tiles
    TILE_PADDING: '2px', // Padding inside each tile
    TILE_BORDER_WIDTH_NORMAL: '2px', // Border width for normal tiles
    TILE_BORDER_WIDTH_SELECTED: '3px', // Border width for selected tiles
    ZOOM_SCALE_PERCENTAGE: '130%', // Scale percentage for zooming texture images
    ZOOM_OFFSET_PERCENTAGE: '-15%', // Offset percentage for zoomed texture positioning
    MAX_HEIGHT: '400px', // Maximum height for scrollable paint options
  },
  
  // Menu configuration
  MENU: {
    TOGGLE_BUTTON_OFFSET: 10, // Offset for menu toggle button when menu is open
    TOP_MARGIN: '40px', // Top margin for menu content
    MENU_ITEM_SPACING: '0', // Spacing between major menu sections (using SPACING.XXLARGE instead)
    MENU_HEIGHT: '80px', // Height of the bottom action menu
  },
  
  // App layout
  APP_LAYOUT: {
    FULL_WIDTH_PERCENTAGE: '100%', // 100% width value
    FULL_HEIGHT_PERCENTAGE: '100%', // 100% height value
    EXPORT_OPACITY_DISABLED: 0.7, // Opacity when export button is disabled
  },
  
  // Hover effects
  HOVER: {
    DANGER_BACKGROUND: 'rgba(239, 68, 68, 0.3)',
  },
}; 