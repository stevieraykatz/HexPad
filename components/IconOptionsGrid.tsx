import React from 'react';
import { UI_CONFIG, ICON_OPTIONS } from './config';
import type { IconItem } from './config';

interface IconOptionsGridProps {
  selectedIcon: IconItem | null;
  onIconSelect: (icon: IconItem) => void;
}

const IconOptionsGrid: React.FC<IconOptionsGridProps> = ({ 
  selectedIcon, 
  onIconSelect 
}) => {
  return (
    <div>
      {/* Icon Options Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${UI_CONFIG.PAINT_OPTIONS.GRID_COLUMNS}, 1fr)`,
        gap: UI_CONFIG.PAINT_OPTIONS.TILE_GAP,
        maxHeight: UI_CONFIG.PAINT_OPTIONS.MAX_HEIGHT,
        overflowY: 'auto',
        justifyContent: 'center',
        justifyItems: 'center'
      }}>
        {ICON_OPTIONS.map((icon: IconItem) => (
          <button
            key={icon.name}
            onClick={() => onIconSelect(icon)}
            style={{
              width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
              background: selectedIcon?.name === icon.name ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
              border: selectedIcon?.name === icon.name ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              boxShadow: selectedIcon?.name === icon.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
            }}
            title={icon.displayName}
          >
            <div style={{
              width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
              height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
              borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
              border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}>
              <img 
                src={icon.path}
                alt={icon.displayName}
                style={{
                  width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
                  height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
                  objectFit: 'contain',
                  padding: '4px'
                }}
              />
            </div>
          </button>
        ))}
      </div>
      
      <div style={{ 
        fontSize: UI_CONFIG.FONT_SIZE.MEDIUM, 
        color: UI_CONFIG.COLORS.TEXT_SUBTLE,
        textAlign: 'center',
        padding: UI_CONFIG.SPACING.MEDIUM,
        background: UI_CONFIG.COLORS.INFO_BACKGROUND,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        marginTop: UI_CONFIG.SPACING.LARGE
      }}>
        Select an icon to place as overlay on hex tiles<br/>
        Use the eraser (🧹) to remove icons and textures or undo (↩️) to revert actions
      </div>
    </div>
  );
};

export default IconOptionsGrid; 