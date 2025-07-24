import React, { MouseEvent } from 'react';
import { UI_CONFIG } from './config';
import type { IconItem } from './config';

interface BottomActionMenuProps {
  selectedIcon: IconItem | null;
  isExporting: boolean;
  hasUndoHistory: boolean;
  activeTab?: 'paint' | 'icons' | 'borders';
  onCopyUrl: () => void;
  onExportPNG: () => void;
  onEraserToggle: () => void;
  onUndo: () => void;
  onClearGrid: () => void;
}

const BottomActionMenu: React.FC<BottomActionMenuProps> = ({
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
  const handleMouseOver = (e: MouseEvent<HTMLButtonElement>): void => {
    (e.target as HTMLButtonElement).style.background = UI_CONFIG.HOVER.DANGER_BACKGROUND;
  };

  const handleMouseOut = (e: MouseEvent<HTMLButtonElement>): void => {
    (e.target as HTMLButtonElement).style.background = UI_CONFIG.COLORS.DANGER_BACKGROUND;
  };

  const createActionButtonStyle = (type: 'primary' | 'secondary' | 'danger' | 'disabled' | 'inactive') => ({
    width: '60px',
    height: '60px',
    padding: UI_CONFIG.SPACING.SMALL,
    background: type === 'primary' ? UI_CONFIG.COLORS.SELECTED_BACKGROUND :
                type === 'secondary' ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND :
                type === 'danger' ? UI_CONFIG.COLORS.DANGER_BACKGROUND :
                type === 'inactive' ? UI_CONFIG.COLORS.BUTTON_BACKGROUND :
                UI_CONFIG.COLORS.BUTTON_BACKGROUND,
    border: type === 'primary' ? `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` :
            type === 'secondary' ? `2px solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` :
            type === 'danger' ? `2px solid ${UI_CONFIG.COLORS.DANGER_BORDER}` :
            type === 'inactive' ? `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}` :
            `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
    color: type === 'danger' ? UI_CONFIG.COLORS.TEXT_DANGER :
           type === 'disabled' ? UI_CONFIG.COLORS.TEXT_MUTED :
           type === 'inactive' ? UI_CONFIG.COLORS.TEXT_PRIMARY :
           UI_CONFIG.COLORS.TEXT_PRIMARY,
    fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
    cursor: type === 'disabled' ? 'not-allowed' : 'pointer',
    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
    fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: type === 'primary' || type === 'secondary' || type === 'danger' ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none',
    opacity: type === 'disabled' ? UI_CONFIG.APP_LAYOUT.EXPORT_OPACITY_DISABLED : 1
  });

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
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
    }}>
      {/* Copy URL */}
      <button
        onClick={onCopyUrl}
        style={createActionButtonStyle('primary')}
        title="Copy shareable URL to clipboard"
      >
        🔗
      </button>
      
      {/* Export PNG */}
      <button
        onClick={onExportPNG}
        disabled={isExporting}
        style={createActionButtonStyle(isExporting ? 'disabled' : 'secondary')}
        title={isExporting ? 'Exporting PNG...' : 'Download PNG'}
      >
        {isExporting ? '⏳' : '⬇️'}
      </button>

      {/* Separator */}
      <div style={{
        width: '2px',
        height: '40px',
        background: UI_CONFIG.COLORS.BORDER_COLOR,
        borderRadius: '1px'
      }} />
      
      {/* Icon Eraser */}
      <button
        onClick={onEraserToggle}
        style={createActionButtonStyle(selectedIcon?.name === 'eraser' ? 'danger' : 'inactive')}
        title={selectedIcon?.name === 'eraser' ? 'Deselect eraser' : 
               activeTab === 'borders' ? 'Erase borders' :
               activeTab === 'icons' ? 'Erase icons and textures' :
               'Erase icons and textures'}
      >
        🧹
      </button>
      
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!hasUndoHistory}
        style={createActionButtonStyle(hasUndoHistory ? 'primary' : 'disabled')}
        title={hasUndoHistory ? 'Undo last action' : 'No actions to undo'}
      >
        ↩️
      </button>

      {/* Separator */}
      <div style={{
        width: '2px',
        height: '40px',
        background: UI_CONFIG.COLORS.BORDER_COLOR,
        borderRadius: '1px'
      }} />
      
      {/* Clear Grid */}
      <button
        onClick={onClearGrid}
        style={createActionButtonStyle('danger')}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        title="Clear all hexagons"
      >
        🗑️
      </button>
    </div>
  );
};

export default BottomActionMenu; 