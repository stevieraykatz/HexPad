import React from 'react';
import { UI_CONFIG } from './config';
import type { IconItem } from './config';

interface TabButtonsProps {
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  menuOpen: boolean;
  selectedIcon: IconItem | null;
  onTabChange: (tab: 'paint' | 'icons' | 'borders' | 'settings') => void;
  onMenuToggle: () => void;
}

const TabButtons: React.FC<TabButtonsProps> = ({ 
  activeTab, 
  menuOpen, 
  selectedIcon, 
  onTabChange, 
  onMenuToggle 
}) => {
  const createTabButtonStyle = (tab: 'paint' | 'icons' | 'borders' | 'settings', isActive: boolean) => ({
    width: (isActive && menuOpen) ? '60px' : '50px',
    height: (isActive && menuOpen) ? '60px' : '50px',
    background: (isActive && menuOpen) 
      ? (tab === 'paint' || tab === 'borders' ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND)
      : UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
    backdropFilter: UI_CONFIG.BLUR.LIGHT,
    border: (isActive && menuOpen) 
      ? `2px solid ${tab === 'paint' || tab === 'borders' ? UI_CONFIG.COLORS.SELECTED_BORDER : UI_CONFIG.COLORS.SELECTED_ALT_BORDER}`
      : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    cursor: 'pointer',
    fontSize: (isActive && menuOpen) ? '24px' : '20px',
    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
    boxShadow: (isActive && menuOpen) ? UI_CONFIG.BOX_SHADOW.SELECTED : UI_CONFIG.BOX_SHADOW.LIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const handleTabClick = (tab: 'paint' | 'icons' | 'borders' | 'settings') => {
    onTabChange(tab);
    if (!menuOpen) onMenuToggle();
    
    // Clear eraser state when switching to paint tab
    if (tab === 'paint' && selectedIcon?.name === 'eraser') {
      // This logic will need to be handled by the parent component
      // We'll pass this requirement up via the callback
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: `calc(${UI_CONFIG.SPACING.XLARGE} + 60px)`, // Below the menu toggle
      left: menuOpen ? `${UI_CONFIG.MENU_WIDTH + UI_CONFIG.MENU.TOGGLE_BUTTON_OFFSET}px` : UI_CONFIG.SPACING.XLARGE,
      zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
      display: 'flex',
      flexDirection: 'column',
      gap: UI_CONFIG.SPACING.MEDIUM,
      transition: `left ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`
    }}>
      {/* Paint Menu Button */}
      <button
        onClick={() => handleTabClick('paint')}
        style={createTabButtonStyle('paint', activeTab === 'paint')}
        title="Paint Tools"
      >
        🎨
      </button>

      {/* Icons Menu Button */}
      <button
        onClick={() => handleTabClick('icons')}
        style={createTabButtonStyle('icons', activeTab === 'icons')}
        title="Icon Overlays"
      >
        📍
      </button>

      {/* Borders Menu Button */}
      <button
        onClick={() => handleTabClick('borders')}
        style={createTabButtonStyle('borders', activeTab === 'borders')}
        title="Border Tools"
      >
        🧱
      </button>

      {/* Settings Menu Button */}
      <button
        onClick={() => handleTabClick('settings')}
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