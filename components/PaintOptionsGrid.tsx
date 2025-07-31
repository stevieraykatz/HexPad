import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { UI_CONFIG, PAINT_OPTIONS } from './config';
import type { AssetItem, TextureItem, HexTexture } from './config';

interface PaintOptionsGridProps {
  selectedTexture: HexTexture | null;
  selectedColor: string;
  onTextureSelect: (texture: TextureItem) => void;
  onColorSelect: (color: string) => void;
  onTextureClear?: () => void;
  isMobile?: boolean; // Optional mobile detection for layout optimizations
}

const PaintOptionsGrid: React.FC<PaintOptionsGridProps> = ({ 
  selectedTexture,
  selectedColor,
  onTextureSelect,
  onColorSelect,
  onTextureClear,
  isMobile = false
}) => {
  // Filter out color items, only show textures
  const textureOptions = PAINT_OPTIONS.filter(item => item.type === 'texture');

  // Check if color painting is active (no texture selected)
  const isColorPaintingActive = selectedTexture === null;

  // Handle color preview click - activate color painting mode
  const handleColorPreviewClick = () => {
    // Clear texture selection to activate color painting
    if (onTextureClear) {
      onTextureClear();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: UI_CONFIG.SPACING.LARGE,
      width: '100%'
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
          color={selectedColor}
          onChange={onColorSelect}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM
          }}
        />
      </div>

      {/* Combined Color Tile and Texture Options */}
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
            gap: isMobile ? UI_CONFIG.SPACING.SMALL : UI_CONFIG.PAINT_OPTIONS.TILE_GAP,
            maxHeight: isMobile ? '300px' : UI_CONFIG.PAINT_OPTIONS.MAX_HEIGHT,
            overflowY: 'auto',
            justifyContent: 'center',
            justifyItems: 'center'
          }}
        >
          {/* Color Tile (First Option) */}
          <button
            onClick={handleColorPreviewClick}
            style={{
              width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
              padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
              background: isColorPaintingActive ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
              border: isColorPaintingActive ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              boxShadow: isColorPaintingActive ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
            }}
            title={isColorPaintingActive ? "Color painting active - click on hexes to paint" : "Click to activate color painting"}
          >
            <div style={{
              width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
              height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
              borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
              border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
              backgroundColor: selectedColor,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            </div>
          </button>

          {/* Texture Options */}
          {textureOptions.map((item: AssetItem) => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaintOptionsGrid; 