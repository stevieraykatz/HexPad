import React from 'react';
import { GRID_CONFIG, UI_CONFIG } from './config';

export type NumberingMode = 'off' | 'edge' | 'in-hex';
export type OrientationMode = 'flat-top' | 'pointy-top';

interface GridSizeControlsProps {
  gridWidth: number;
  gridHeight: number;
  numberingMode: NumberingMode;
  orientationMode: OrientationMode;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onNumberingModeChange: (mode: NumberingMode) => void;
  onOrientationModeChange: (mode: OrientationMode) => void;
}

const GridSizeControls: React.FC<GridSizeControlsProps> = ({
  gridWidth,
  gridHeight,
  numberingMode,
  orientationMode,
  onWidthChange,
  onHeightChange,
  onNumberingModeChange,
  onOrientationModeChange
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

  const selectStyle = {
    width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
    padding: UI_CONFIG.SPACING.MEDIUM,
    borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
    border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
    background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
    cursor: 'pointer',
    outline: 'none'
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
      
      <div style={{ marginBottom: UI_CONFIG.SPACING.LARGE }}>
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

      <div>
        <label style={labelStyle}>
          Grid Numbering
        </label>
        <select
          value={numberingMode}
          onChange={(e) => onNumberingModeChange(e.target.value as NumberingMode)}
          style={selectStyle}
        >
          <option value="off">Off</option>
          <option value="edge">Edge Numbering</option>
          <option value="in-hex">In-Hex Numbering</option>
        </select>
        <div style={{
          fontSize: UI_CONFIG.FONT_SIZE.SMALL,
          color: UI_CONFIG.COLORS.TEXT_MUTED,
          marginTop: UI_CONFIG.SPACING.SMALL,
          lineHeight: '1.4'
        }}>
        </div>
      </div>

      
      <div>
        <label style={labelStyle}>
          Hexagon Orientation
        </label>
        <select
          value={orientationMode}
          onChange={(e) => onOrientationModeChange(e.target.value as OrientationMode)}
          style={selectStyle}
        >
          <option value="flat-top">Flat Top</option>
          <option value="pointy-top">Pointy Top</option>
        </select>
        <div style={{
          fontSize: UI_CONFIG.FONT_SIZE.SMALL,
          color: UI_CONFIG.COLORS.TEXT_MUTED,
          marginTop: UI_CONFIG.SPACING.SMALL,
          lineHeight: '1.4'
        }}>
        </div>
      </div>
    </div>
  );
};

export default GridSizeControls; 