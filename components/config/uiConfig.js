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

// UI styling and layout configuration
export const UI_CONFIG = {
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
  
  // Hover effects
  HOVER: {
    DANGER_BACKGROUND: 'rgba(239, 68, 68, 0.3)',
  },
}; 