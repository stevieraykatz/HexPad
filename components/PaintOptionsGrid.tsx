import React from 'react';
import { UI_CONFIG, PAINT_OPTIONS } from './config';
import type { AssetItem, ColorItem, TextureItem, HexTexture } from './config';

interface PaintOptionsGridProps {
  selectedTexture: HexTexture | null;
  onTextureSelect: (texture: ColorItem | TextureItem) => void;
}

const PaintOptionsGrid: React.FC<PaintOptionsGridProps> = ({ 
  selectedTexture, 
  onTextureSelect 
}) => {
  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: `repeat(${UI_CONFIG.PAINT_OPTIONS.GRID_COLUMNS}, 1fr)`,
      gap: UI_CONFIG.PAINT_OPTIONS.TILE_GAP,
      maxHeight: UI_CONFIG.PAINT_OPTIONS.MAX_HEIGHT,
      overflowY: 'auto',
      justifyContent: 'center',
      justifyItems: 'center'
    }}>
      {PAINT_OPTIONS.map((item: AssetItem) => (
        item.type === 'color' ? (
          <button
            key={item.name}
            onClick={() => onTextureSelect(item)}
            style={{
              width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
              background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
              border: selectedTexture?.name === item.name ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
            }}
            title={item.displayName}
          >
            <div style={{
              width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
              height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
              borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
              background: (item as ColorItem).value,
              border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`
            }} />
          </button>
        ) : (
          <button
            key={item.name}
            onClick={() => onTextureSelect(item)}
            style={{
              width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
              background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
              border: selectedTexture?.name === item.name ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
            }}
            title={item.displayName}
          >
            <div style={{
              width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
              height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
              borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
              border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: UI_CONFIG.PAINT_OPTIONS.ZOOM_SCALE_PERCENTAGE,
                height: UI_CONFIG.PAINT_OPTIONS.ZOOM_SCALE_PERCENTAGE,
                position: 'absolute',
                top: UI_CONFIG.PAINT_OPTIONS.ZOOM_OFFSET_PERCENTAGE,
                left: UI_CONFIG.PAINT_OPTIONS.ZOOM_OFFSET_PERCENTAGE,
                backgroundImage: `url(${(item as TextureItem).path})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
            </div>
          </button>
        )
      ))}
    </div>
  );
};

export default PaintOptionsGrid; 