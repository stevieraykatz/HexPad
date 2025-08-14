import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { UI_CONFIG, ICON_OPTIONS } from './config';
import type { IconItem } from './config';

interface IconOptionsGridProps {
  selectedIcon: IconItem | null;
  selectedIconColor: string;
  onIconSelect: (icon: IconItem) => void;
  onIconColorSelect: (color: string) => void;
  isMobile?: boolean; // Optional mobile detection for layout optimizations
}

const IconOptionsGrid: React.FC<IconOptionsGridProps> = ({ 
  selectedIcon, 
  selectedIconColor,
  onIconSelect,
  onIconColorSelect,
  isMobile = false
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: UI_CONFIG.SPACING.LARGE,
      width: '100%',
      paddingBottom: isMobile ? UI_CONFIG.SPACING.LARGE : UI_CONFIG.SPACING.XLARGE
    }}>
      {/* Color Picker */}
      <div style={{
        background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        padding: UI_CONFIG.SPACING.MEDIUM,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <HexColorPicker
          className="mobile-color-picker"
          color={selectedIconColor}
          onChange={onIconColorSelect}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM
          }}
        />
      </div>

      {/* Icon Options Grid */}
      <div style={{
        background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        padding: UI_CONFIG.SPACING.MEDIUM
      }}>
        <div 
          className={isMobile ? 'mobile-paint-grid' : ''}
          style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? `repeat(3, 1fr)` : `repeat(${UI_CONFIG.PAINT_OPTIONS.GRID_COLUMNS}, 1fr)`,
            gap: isMobile ? '8px' : UI_CONFIG.PAINT_OPTIONS.TILE_GAP,
            maxHeight: isMobile ? UI_CONFIG.PAINT_OPTIONS.ICON_GRID_MAX_HEIGHT_MOBILE : 'none',
            overflowY: 'visible',
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
                <div style={{
                  width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
                  height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
                  backgroundColor: selectedIconColor,
                  mask: `url(${icon.path}) center/contain no-repeat`,
                  WebkitMask: `url(${icon.path}) center/contain no-repeat`,
                  padding: '4px'
                }} />
              </div>
            </button>
          ))}
        </div>
      </div>
  
    </div>
  );
};

export default IconOptionsGrid; 