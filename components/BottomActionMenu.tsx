import React, { MouseEvent } from 'react';
import { UI_CONFIG } from './config';
import type { IconItem } from './config';

interface BottomActionMenuProps {
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

// Reusable Separator component
const Separator: React.FC = () => (
  <div style={{
    width: '2px',
    height: '40px',
    background: UI_CONFIG.COLORS.BORDER_COLOR,
    borderRadius: '1px'
  }} />
);

// Button style generator
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

// Reusable ActionButton component
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  type: 'primary' | 'secondary' | 'danger' | 'disabled' | 'inactive';
  title: string;
  emoji: string;
  withDangerHover?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  disabled = false,
  type,
  title,
  emoji,
  withDangerHover = false
}) => {
  const handleMouseOver = (e: MouseEvent<HTMLButtonElement>): void => {
    if (withDangerHover) {
      (e.target as HTMLButtonElement).style.background = UI_CONFIG.HOVER.DANGER_BACKGROUND;
    }
  };

  const handleMouseOut = (e: MouseEvent<HTMLButtonElement>): void => {
    if (withDangerHover) {
      (e.target as HTMLButtonElement).style.background = UI_CONFIG.COLORS.DANGER_BACKGROUND;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={createActionButtonStyle(type)}
      title={title}
      onMouseOver={withDangerHover ? handleMouseOver : undefined}
      onMouseOut={withDangerHover ? handleMouseOut : undefined}
    >
      {emoji}
    </button>
  );
};

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
  // Dynamic button configurations
  const getEraserTitle = () => {
    if (selectedIcon?.name === 'eraser') return 'Deselect eraser';
    if (activeTab === 'borders') return 'Erase borders';
    return 'Erase icons and textures';
  };

  return (
    <div style={{
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
    }}>
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
        title="Clear all hexagons"
        emoji="🗑️"
        withDangerHover
      />
    </div>
  );
};

export default BottomActionMenu; 