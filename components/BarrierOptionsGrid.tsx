import React from 'react';
import { UI_CONFIG, BARRIER_COLORS } from './config';
import type { BarrierColor } from './config';

interface BarrierOptionsGridProps {
  selectedBarrierColor: BarrierColor;
  onBarrierColorSelect: (color: BarrierColor) => void;
}

const BarrierOptionsGrid: React.FC<BarrierOptionsGridProps> = ({ 
  selectedBarrierColor, 
  onBarrierColorSelect 
}) => {
  return (
    <div>
      {/* Barrier Color Options Grid */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${UI_CONFIG.PAINT_OPTIONS.GRID_COLUMNS}, 1fr)`,
        gap: UI_CONFIG.PAINT_OPTIONS.TILE_GAP,
        maxHeight: UI_CONFIG.PAINT_OPTIONS.MAX_HEIGHT,
        overflowY: 'auto',
        justifyContent: 'center',
        justifyItems: 'center'
      }}>
        {BARRIER_COLORS.map((barrierColor: BarrierColor) => (
          <button
            key={barrierColor.name}
            onClick={() => onBarrierColorSelect(barrierColor)}
            style={{
              width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
              background: selectedBarrierColor.name === barrierColor.name ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
              border: selectedBarrierColor.name === barrierColor.name ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              boxShadow: selectedBarrierColor.name === barrierColor.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
            }}
            title={barrierColor.displayName}
          >
            <div style={{
              width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
              height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
              borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
              background: barrierColor.value,
              border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`
            }} />
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
        Select a barrier color and click directly on edges between hex tiles<br/>
        Click again on an existing barrier to remove it
      </div>
    </div>
  );
};

export default BarrierOptionsGrid; 