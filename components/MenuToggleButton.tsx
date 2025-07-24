import React from 'react';
import { UI_CONFIG } from './config';

interface MenuToggleButtonProps {
  menuOpen: boolean;
  onToggle: () => void;
}

const MenuToggleButton: React.FC<MenuToggleButtonProps> = ({ menuOpen, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed',
        top: UI_CONFIG.SPACING.XLARGE,
        left: menuOpen ? `${UI_CONFIG.MENU_WIDTH + UI_CONFIG.MENU.TOGGLE_BUTTON_OFFSET}px` : UI_CONFIG.SPACING.XLARGE,
        zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
        background: menuOpen ? UI_CONFIG.COLORS.OVERLAY_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${menuOpen ? UI_CONFIG.COLORS.BORDER_COLOR : UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
        color: menuOpen ? UI_CONFIG.COLORS.TEXT_PRIMARY : UI_CONFIG.COLORS.TEXT_TERTIARY,
        padding: `${UI_CONFIG.SPACING.SMALL} ${UI_CONFIG.SPACING.LARGE}`,
        cursor: 'pointer',
        fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
        transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
        boxShadow: menuOpen ? UI_CONFIG.BOX_SHADOW.LIGHT : 'none'
      }}
      title={menuOpen ? 'Close Menu' : 'Open Menu'}
    >
      {menuOpen ? '✕' : '☰'}
    </button>
  );
};

export default MenuToggleButton; 