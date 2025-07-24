import React from 'react';
import { GRID_CONFIG, UI_CONFIG } from './config';

interface GridSizeControlsProps {
  gridWidth: number;
  gridHeight: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

const GridSizeControls: React.FC<GridSizeControlsProps> = ({
  gridWidth,
  gridHeight,
  onWidthChange,
  onHeightChange
}) => {
  const sliderStyle = {
    width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
    height: UI_CONFIG.GRID_CONTROLS.SLIDER_HEIGHT,
    borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
    outline: 'none',
    background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
    cursor: 'pointer'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: UI_CONFIG.SPACING.SMALL,
    color: UI_CONFIG.COLORS.TEXT_TERTIARY,
    fontSize: UI_CONFIG.FONT_SIZE.NORMAL
  };

  return (
    <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
      <div style={{ marginBottom: UI_CONFIG.SPACING.LARGE }}>
        <label style={labelStyle}>
          Width: {gridWidth}
        </label>
        <input
          type="range"
          min={GRID_CONFIG.MIN_SIZE}
          max={GRID_CONFIG.MAX_SIZE}
          value={gridWidth}
          onChange={(e) => onWidthChange(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>
      
      <div>
        <label style={labelStyle}>
          Height: {gridHeight}
        </label>
        <input
          type="range"
          min={GRID_CONFIG.MIN_SIZE}
          max={GRID_CONFIG.MAX_SIZE}
          value={gridHeight}
          onChange={(e) => onHeightChange(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>
    </div>
  );
};

export default GridSizeControls; 