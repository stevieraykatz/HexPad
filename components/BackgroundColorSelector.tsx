import React from 'react';
import { UI_CONFIG, BACKGROUND_COLORS } from './config';
import type { BackgroundColor } from './config';

interface BackgroundColorSelectorProps {
  selectedBackgroundColor: BackgroundColor;
  onBackgroundColorChange: (color: BackgroundColor) => void;
}

const BackgroundColorSelector: React.FC<BackgroundColorSelectorProps> = ({
  selectedBackgroundColor,
  onBackgroundColorChange
}) => {
  const createButtonStyle = (isSelected: boolean) => ({
    padding: `${UI_CONFIG.SPACING.MEDIUM} ${UI_CONFIG.SPACING.LARGE}`,
    background: isSelected ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
    border: isSelected ? `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
    cursor: 'pointer',
    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
    textAlign: 'left' as const,
    fontWeight: isSelected ? UI_CONFIG.FONT_WEIGHT.MEDIUM : UI_CONFIG.FONT_WEIGHT.NORMAL,
    display: 'flex',
    alignItems: 'center',
    gap: UI_CONFIG.SPACING.MEDIUM
  });

  return (
    <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
      <h3 style={{ 
        color: UI_CONFIG.COLORS.TEXT_SECONDARY, 
        fontSize: UI_CONFIG.FONT_SIZE.LARGE,
        marginBottom: UI_CONFIG.SPACING.LARGE,
        fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
      }}>
        Background
      </h3>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: UI_CONFIG.SPACING.SMALL
      }}>
        {BACKGROUND_COLORS.map((bgColor: BackgroundColor) => (
          <button
            key={bgColor.name}
            onClick={() => onBackgroundColorChange(bgColor)}
            style={createButtonStyle(selectedBackgroundColor.name === bgColor.name)}
          >
            <div style={{
              width: UI_CONFIG.SPACING.XLARGE,
              height: UI_CONFIG.SPACING.XLARGE,
              borderRadius: '4px',
              background: bgColor.cssColor,
              border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
              flexShrink: 0
            }} />
            {bgColor.displayName}
          </button>
        ))}
      </div>
    </div>
  );
};

export default BackgroundColorSelector; 