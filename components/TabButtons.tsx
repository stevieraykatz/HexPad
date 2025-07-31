import React from 'react';
import { UI_CONFIG } from './config';
import type { IconItem } from './config';

interface TabButtonsProps {
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  menuOpen: boolean;
  selectedIcon: IconItem | null;
  onTabChange: (tab: 'paint' | 'icons' | 'borders' | 'settings') => void;
  onMenuToggle: () => void;
  isMobile?: boolean; // Optional mobile detection for positioning
}

const TabButtons: React.FC<TabButtonsProps> = ({ 
  activeTab, 
  menuOpen, 
  selectedIcon, 
  onTabChange, 
  onMenuToggle,
  isMobile = false
}) => {
  const createTabButtonStyle = (tab: 'paint' | 'icons' | 'borders' | 'settings', isActive: boolean) => {
    // Determine background based on active state and menu state
    let background = UI_CONFIG.COLORS.OVERLAY_BACKGROUND;
    let border = `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`;
    let boxShadow = UI_CONFIG.BOX_SHADOW.LIGHT;
    
    if (isActive) {
      if (menuOpen) {
        // Full active styling when menu is open
        background = tab === 'paint' || tab === 'borders' 
          ? UI_CONFIG.COLORS.SELECTED_BACKGROUND 
          : UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND;
        border = `2px solid ${tab === 'paint' || tab === 'borders' 
          ? UI_CONFIG.COLORS.SELECTED_BORDER 
          : UI_CONFIG.COLORS.SELECTED_ALT_BORDER}`;
        boxShadow = UI_CONFIG.BOX_SHADOW.SELECTED;
      } else {
        // Subtle active styling when menu is closed
        if (tab === 'paint' || tab === 'borders') {
          background = 'rgba(59, 130, 246, 0.2)'; // Subtle blue tint
          border = '2px solid rgba(59, 130, 246, 0.6)';
        } else {
          background = 'rgba(168, 85, 247, 0.2)'; // Subtle purple tint for icons/settings
          border = '2px solid rgba(168, 85, 247, 0.6)';
        }
        boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
      }
    }
    
    return {
      width: (isActive && menuOpen) ? '60px' : '50px',
      height: (isActive && menuOpen) ? '60px' : '50px',
      background,
      backdropFilter: UI_CONFIG.BLUR.LIGHT,
      border,
      borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
      color: isActive ? '#ffffff' : UI_CONFIG.COLORS.TEXT_PRIMARY,
      cursor: 'pointer',
      fontSize: (isActive && menuOpen) ? '24px' : '20px',
      transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
      boxShadow,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  };

  const handleTabClick = (tab: 'paint' | 'icons' | 'borders' | 'settings', event?: React.MouseEvent) => {
    // Prevent event from bubbling up to parent handlers
    event?.stopPropagation();
    
    onTabChange(tab);
    if (!menuOpen) {
      onMenuToggle();
    }
    
    // Clear eraser state when switching to paint tab
    if (tab === 'paint' && selectedIcon?.name === 'eraser') {
      // This logic will need to be handled by the parent component
      // We'll pass this requirement up via the callback
    }
  };

  return (
    <div style={{
      position: 'fixed',
      ...(isMobile ? {
        // Mobile: Position for bottom menu
        bottom: menuOpen ? '60vh' : '80px', // Above bottom menu when open, above action bar when closed
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'row',
        gap: UI_CONFIG.SPACING.LARGE,
      } : {
        // Desktop: Position for side menu
        top: `calc(${UI_CONFIG.SPACING.XLARGE} + 60px)`, // Below the menu toggle
        left: menuOpen ? `${UI_CONFIG.MENU_WIDTH + UI_CONFIG.MENU.TOGGLE_BUTTON_OFFSET}px` : UI_CONFIG.SPACING.XLARGE,
        flexDirection: 'column',
        gap: UI_CONFIG.SPACING.MEDIUM,
        transition: `left ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
      }),
      zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
      display: 'flex',
      alignItems: 'center',
      background: isMobile ? UI_CONFIG.COLORS.OVERLAY_BACKGROUND : 'transparent',
      backdropFilter: isMobile ? UI_CONFIG.BLUR.LIGHT : 'none',
      borderRadius: isMobile ? UI_CONFIG.BORDER_RADIUS.XLARGE : '0',
      padding: isMobile ? UI_CONFIG.SPACING.SMALL : '0',
      boxShadow: isMobile ? UI_CONFIG.BOX_SHADOW.LIGHT : 'none',
    }}>
      {/* Paint Menu Button */}
      <button
        className="mobile-tab-button"
        onClick={(e) => handleTabClick('paint', e)}
        style={createTabButtonStyle('paint', activeTab === 'paint')}
        title="Paint Tools"
      >
        🎨
      </button>

      {/* Icons Menu Button */}
      <button
        className="mobile-tab-button"
        onClick={(e) => handleTabClick('icons', e)}
        style={createTabButtonStyle('icons', activeTab === 'icons')}
        title="Icon Overlays"
      >
        📍
      </button>

      {/* Borders Menu Button */}
      <button
        className="mobile-tab-button"
        onClick={(e) => handleTabClick('borders', e)}
        style={createTabButtonStyle('borders', activeTab === 'borders')}
        title="Border Tools"
      >
        🧱
      </button>

      {/* Settings Menu Button */}
      <button
        className="mobile-tab-button"
        onClick={(e) => handleTabClick('settings', e)}
        style={createTabButtonStyle('settings', activeTab === 'settings')}
        title="Grid Settings"
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
        >
          <polygon points="6,4 18,4 21,12 18,20 6,20 3,12" />
        </svg>
      </button>
    </div>
  );
};

export default TabButtons; 