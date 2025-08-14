import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { UI_CONFIG, PAINT_OPTIONS } from './config';
import type { TextureItem, HexTexture, AssetItem } from './config';

interface PaintOptionsGridProps {
  selectedTexture: HexTexture | null;
  selectedBackgroundColor: string;
  backgroundPaintingMode: boolean;
  eyeDropperMode: boolean;
  onTextureSelect: (texture: TextureItem) => void;
  onBackgroundColorSelect: (color: string) => void;
  onBackgroundPaintingModeToggle: () => void;
  onEyeDropperToggle: () => void;
  isMobile?: boolean; // Optional mobile detection for layout optimizations
}

const PaintOptionsGrid: React.FC<PaintOptionsGridProps> = ({ 
  selectedTexture,
  selectedBackgroundColor,
  backgroundPaintingMode,
  eyeDropperMode,
  onTextureSelect,
  onBackgroundColorSelect,
  onBackgroundPaintingModeToggle,
  onEyeDropperToggle,
  isMobile = false
}) => {
  // Filter out color items, only show textures
  const textureOptions = PAINT_OPTIONS.filter((item: AssetItem) => item.type === 'texture');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: UI_CONFIG.SPACING.MEDIUM,
      width: '100%',
      paddingBottom: isMobile ? '20px' : UI_CONFIG.SPACING.XLARGE
    }}>
      {/* Background Shader Section */}
      <div style={{
        background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        padding: UI_CONFIG.SPACING.SMALL,
        display: 'flex',
        flexDirection: 'column',
        gap: UI_CONFIG.SPACING.SMALL
      }}>
        {/* Background Shader Title */}
        <div style={{
          color: UI_CONFIG.COLORS.TEXT_SECONDARY,
          fontSize: UI_CONFIG.FONT_SIZE.MEDIUM,
          fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
          textAlign: 'center'
        }}>
        </div>
        
        {/* Background Color Preview and Picker */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: UI_CONFIG.SPACING.MEDIUM
        }}>
          {/* Left side: Background tile and eye dropper stacked */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: UI_CONFIG.SPACING.SMALL
          }}>
            {/* Background Preview tile - clickable to toggle painting mode */}
            <button
              onClick={onBackgroundPaintingModeToggle}
              style={{
                width: UI_CONFIG.PAINT_OPTIONS.BACKGROUND_PREVIEW_SIZE,
                height: UI_CONFIG.PAINT_OPTIONS.BACKGROUND_PREVIEW_SIZE,
                borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                border: backgroundPaintingMode 
                  ? `${UI_CONFIG.PAINT_OPTIONS.BACKGROUND_BORDER_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` 
                  : `${UI_CONFIG.PAINT_OPTIONS.BACKGROUND_BORDER_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
                backgroundColor: selectedBackgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: backgroundPaintingMode 
                  ? UI_CONFIG.BOX_SHADOW.SELECTED 
                  : UI_CONFIG.BOX_SHADOW.LIGHT,
                cursor: 'pointer',
                transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                transform: backgroundPaintingMode ? `scale(${UI_CONFIG.PAINT_OPTIONS.ACTIVE_SCALE})` : 'scale(1)'
              }}
              title={backgroundPaintingMode 
                ? "Background painting active - click hexes to paint backgrounds" 
                : "Click to activate background painting mode"}
            >
            </button>

            {/* Eye Dropper Button - Half size */}
            <button
              onClick={onEyeDropperToggle}
              style={{
                width: `calc(${UI_CONFIG.PAINT_OPTIONS.BACKGROUND_PREVIEW_SIZE} / 2)`,
                height: `calc(${UI_CONFIG.PAINT_OPTIONS.BACKGROUND_PREVIEW_SIZE} / 2)`,
                borderRadius: UI_CONFIG.BORDER_RADIUS.SMALL,
                border: eyeDropperMode 
                  ? `${UI_CONFIG.PAINT_OPTIONS.BACKGROUND_BORDER_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` 
                  : `${UI_CONFIG.PAINT_OPTIONS.BACKGROUND_BORDER_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
                backgroundColor: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: eyeDropperMode 
                  ? UI_CONFIG.BOX_SHADOW.SELECTED 
                  : UI_CONFIG.BOX_SHADOW.LIGHT,
                cursor: 'pointer',
                transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                transform: eyeDropperMode ? `scale(${UI_CONFIG.PAINT_OPTIONS.ACTIVE_SCALE})` : 'scale(1)',
                padding: `calc(${UI_CONFIG.SPACING.SMALL} / 2)`
              }}
              title={eyeDropperMode 
                ? "Eye dropper active - click on a hex to sample its background color" 
                : "Click to activate eye dropper tool"}
            >
              <img 
                src="/assets/ui/eyedropper.png" 
                alt="Eye dropper"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  mixBlendMode: 'screen',
                  filter: eyeDropperMode 
                    ? 'brightness(1.3) contrast(1.2)' 
                    : 'brightness(1.1) contrast(1.1)',
                  opacity: eyeDropperMode ? 1 : 0.8
                }}
              />
            </button>
          </div>

          {/* Background Color Picker */}
          <HexColorPicker
            className="mobile-color-picker"
            color={selectedBackgroundColor}
            onChange={onBackgroundColorSelect}
            style={{
              width: isMobile ? UI_CONFIG.PAINT_OPTIONS.COLOR_PICKER_SIZE_MOBILE : UI_CONFIG.PAINT_OPTIONS.COLOR_PICKER_SIZE_DESKTOP,
              height: isMobile ? UI_CONFIG.PAINT_OPTIONS.COLOR_PICKER_SIZE_MOBILE : UI_CONFIG.PAINT_OPTIONS.COLOR_PICKER_SIZE_DESKTOP,
              borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM
            }}
          />
        </div>
      </div>

      {/* Texture Options Section */}
      <div style={{
        background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        padding: UI_CONFIG.SPACING.SMALL,
      }}>
        {/* Texture Section Title */}
        <div 
          className={isMobile ? 'mobile-paint-grid scrollable-menu-area' : ''}
          style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? `repeat(3, 1fr)` : `repeat(${UI_CONFIG.PAINT_OPTIONS.GRID_COLUMNS}, 1fr)`,
            gap: isMobile ? UI_CONFIG.SPACING.SMALL : UI_CONFIG.PAINT_OPTIONS.TILE_GAP,
            maxHeight: isMobile ? '300px' : 'none',
            overflowY: isMobile ? 'auto' : 'visible',
            justifyContent: 'center',
            justifyItems: 'center'
          }}
        >
          {/* Texture Options */}
          {textureOptions.map((texture: TextureItem) => {
            const isSelected = selectedTexture?.name === texture.name;
            return (
              <button
                key={texture.name}
                onClick={() => onTextureSelect(texture as TextureItem)}
                style={{
                  width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                  height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                  padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
                  background: isSelected ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                  border: isSelected ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                  borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                  cursor: 'pointer',
                  transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                  boxShadow: isSelected ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
                }}
                title={(texture as TextureItem).description || texture.displayName}
              >
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                  border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: selectedBackgroundColor || UI_CONFIG.COLORS.BUTTON_BACKGROUND
                }}>
                  <div style={{
                    width: UI_CONFIG.PAINT_OPTIONS.ZOOM_SCALE_PERCENTAGE,
                    height: UI_CONFIG.PAINT_OPTIONS.ZOOM_SCALE_PERCENTAGE,
                    position: 'absolute',
                    top: UI_CONFIG.PAINT_OPTIONS.ZOOM_OFFSET_PERCENTAGE,
                    left: UI_CONFIG.PAINT_OPTIONS.ZOOM_OFFSET_PERCENTAGE,
                    backgroundImage: `url(${(texture as TextureItem).path})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PaintOptionsGrid; 