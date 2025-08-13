import React from 'react';
import { UI_CONFIG } from './config';
import type { IconItem } from './config';

interface ActionMenuProps {
  selectedIcon: IconItem | null;
  isExporting: boolean;
  hasUndoHistory: boolean;
  activeTab?: 'paint' | 'icons' | 'borders' | 'settings';
  onCopyUrl: () => void;
  onExportPNG: () => void;
  onEraserToggle: () => void;
  onUndo: () => void;
  onClearGrid: () => void;
}

// Separator component for visual separation
const Separator: React.FC = () => (
  <div style={{
    width: '1px',
    height: '40px',
    background: UI_CONFIG.COLORS.BORDER_COLOR,
    opacity: 0.5
  }} />
);

// Reusable action button component
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  type: 'primary' | 'secondary' | 'danger' | 'inactive' | 'disabled';
  title: string;
  emoji: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  onClick, 
  disabled = false, 
  type, 
  title, 
  emoji 
}) => {
  const getButtonStyle = () => {
    const baseStyle = {
      padding: `${UI_CONFIG.SPACING.MEDIUM} ${UI_CONFIG.SPACING.LARGE}`,
      background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
      border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
      borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: UI_CONFIG.FONT_SIZE.LARGE,
      transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
      opacity: disabled ? UI_CONFIG.APP_LAYOUT.EXPORT_OPACITY_DISABLED : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '70px', // Increased from 60px
      height: '60px' // Increased from 50px
    };

    switch (type) {
      case 'primary':
        return {
          ...baseStyle,
          background: UI_CONFIG.COLORS.SELECTED_BACKGROUND,
          border: `1px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}`,
          boxShadow: UI_CONFIG.BOX_SHADOW.LIGHT
        };
      case 'danger':
        return {
          ...baseStyle,
          background: 'rgba(239, 68, 68, 0.4)', // More visible than hover (0.3)
          border: `1px solid ${UI_CONFIG.COLORS.DANGER_BORDER}`,
          color: UI_CONFIG.COLORS.TEXT_PRIMARY
        };
      case 'secondary':
      case 'inactive':
      case 'disabled':
      default:
        return baseStyle;
    }
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={getButtonStyle()}
      title={title}
      onMouseEnter={(e) => {
        if (!disabled && type === 'danger') {
          e.currentTarget.style.background = UI_CONFIG.HOVER.DANGER_BACKGROUND;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && type === 'danger') {
          e.currentTarget.style.background = UI_CONFIG.COLORS.BUTTON_BACKGROUND;
        }
      }}
    >
      {emoji}
    </button>
  );
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  selectedIcon,
  isExporting,
  hasUndoHistory,
  activeTab = 'paint',
  onCopyUrl,
  onExportPNG,
  onEraserToggle,
  onUndo,
  onClearGrid
}) => {
  // Dynamic button configurations
  const getEraserTitle = () => {
    if (selectedIcon?.name === 'eraser') return 'Deselect eraser';
    if (activeTab === 'borders') return 'Erase borders';
    return 'Erase icons and textures';
  };

  return (
    <div 
      className="mobile-bottom-menu mobile-spacing-small"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: UI_CONFIG.MENU.MENU_HEIGHT,
        background: UI_CONFIG.COLORS.MENU_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.MEDIUM,
        borderTop: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        boxShadow: UI_CONFIG.BOX_SHADOW.MEDIUM,
        zIndex: UI_CONFIG.Z_INDEX.MENU,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: UI_CONFIG.SPACING.LARGE,
        padding: `0 ${UI_CONFIG.SPACING.XLARGE}`
      }}
    >
      <ActionButton
        onClick={onCopyUrl}
        type="primary"
        title="Copy shareable URL to clipboard"
        emoji="🔗"
      />
      
      <ActionButton
        onClick={onExportPNG}
        disabled={isExporting}
        type={isExporting ? 'disabled' : 'secondary'}
        title={isExporting ? 'Exporting PNG...' : 'Download PNG'}
        emoji={isExporting ? '⏳' : '⬇️'}
      />

      <Separator />
      
      <ActionButton
        onClick={onEraserToggle}
        type={selectedIcon?.name === 'eraser' ? 'danger' : 'inactive'}
        title={getEraserTitle()}
        emoji="🧹"
      />
      
      <ActionButton
        onClick={onUndo}
        disabled={!hasUndoHistory}
        type={hasUndoHistory ? 'primary' : 'disabled'}
        title={hasUndoHistory ? 'Undo last action' : 'No actions to undo'}
        emoji="↩️"
      />

      <Separator />
      
      <ActionButton
        onClick={onClearGrid}
        type="danger"
        title="Clear entire grid"
        emoji="🗑️"
      />
    </div>
  );
};

export default ActionMenu; 