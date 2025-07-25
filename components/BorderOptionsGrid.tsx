import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { UI_CONFIG } from './config';

interface BorderOptionsGridProps {
  selectedBorderColor: string; // Now just a hex color string
  onBorderColorSelect: (color: string) => void;
}

const BorderOptionsGrid: React.FC<BorderOptionsGridProps> = ({
  selectedBorderColor,
  onBorderColorSelect
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: UI_CONFIG.SPACING.LARGE,
      width: '100%'
    }}>
      {/* Border Preview */}
      <div style={{
        background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        padding: UI_CONFIG.SPACING.MEDIUM,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: UI_CONFIG.SPACING.MEDIUM
      }}>
        <div style={{
          fontSize: UI_CONFIG.FONT_SIZE.MEDIUM,
          color: UI_CONFIG.COLORS.TEXT_SECONDARY,
          fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
        }}>
          Border Preview
        </div>
        
        {/* Preview line showing current border color */}
        <div style={{
          width: '120px',
          height: '6px',
          backgroundColor: selectedBorderColor,
          borderRadius: '3px',
          border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`
        }} />
        
        <div style={{
          fontSize: UI_CONFIG.FONT_SIZE.SMALL,
          color: UI_CONFIG.COLORS.TEXT_MUTED,
          fontFamily: 'monospace',
          background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
          padding: `${UI_CONFIG.SPACING.SMALL} ${UI_CONFIG.SPACING.MEDIUM}`,
          borderRadius: UI_CONFIG.BORDER_RADIUS.SMALL,
          border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`
        }}>
          {selectedBorderColor.toUpperCase()}
        </div>
      </div>
      
      <div style={{
        background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.LIGHT,
        border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
        padding: UI_CONFIG.SPACING.MEDIUM
      }}>
        <HexColorPicker
          color={selectedBorderColor}
          onChange={onBorderColorSelect}
          style={{
            width: '180px',
            height: '180px',
            borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM
          }}
        />
      </div>
    
    </div>
  );
};

export default BorderOptionsGrid; 