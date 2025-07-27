import React from 'react';
import { UI_CONFIG } from './config';
import type { BackgroundColor, IconItem, HexTexture, ColorItem, TextureItem } from './config';
import GridSizeControls from './GridSizeControls';
import BackgroundColorSelector from './BackgroundColorSelector';
import PaintOptionsGrid from './PaintOptionsGrid';
import IconOptionsGrid from './IconOptionsGrid';
import BorderOptionsGrid from './BorderOptionsGrid';

interface SideMenuContentProps {
  activeTab: 'paint' | 'icons' | 'borders';
  // Paint tab props
  gridWidth: number;
  gridHeight: number;
  selectedBackgroundColor: BackgroundColor;
  selectedTexture: HexTexture | null;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onBackgroundColorChange: (color: BackgroundColor) => void;
  onTextureSelect: (texture: ColorItem | TextureItem) => void;
  // Icons tab props
  selectedIcon: IconItem | null;
  onIconSelect: (icon: IconItem) => void;
  // Borders tab props
  selectedBorderColor: string;
  onBorderColorSelect: (color: string) => void;
}

const SideMenuContent: React.FC<SideMenuContentProps> = ({
  activeTab,
  gridWidth,
  gridHeight,
  selectedBackgroundColor,
  selectedTexture,
  onWidthChange,
  onHeightChange,
  onBackgroundColorChange,
  onTextureSelect,
  selectedIcon,
  onIconSelect,
  selectedBorderColor,
  onBorderColorSelect
}) => {
  const sectionTitleStyle = {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: UI_CONFIG.FONT_SIZE.LARGE,
    marginBottom: UI_CONFIG.SPACING.LARGE,
    fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
  };

  const sectionWrapperStyle = {
    marginBottom: UI_CONFIG.SPACING.XXLARGE
  };

  return (
    <div style={{
      paddingBottom: 80 // Match BottomActionMenu height
    }}>
      {activeTab === 'paint' && (
        <>
          <GridSizeControls
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            onWidthChange={onWidthChange}
            onHeightChange={onHeightChange}
          />

          <BackgroundColorSelector
            selectedBackgroundColor={selectedBackgroundColor}
            onBackgroundColorChange={onBackgroundColorChange}
          />

          <div style={sectionWrapperStyle}>
            <PaintOptionsGrid 
              selectedTexture={selectedTexture}
              onTextureSelect={onTextureSelect}
            />
          </div>
        </>
      )}
      
      {activeTab === 'icons' && (
        <div style={sectionWrapperStyle}>
          <h3 style={sectionTitleStyle}>
            Icon Overlays
          </h3>
          
          <IconOptionsGrid 
            selectedIcon={selectedIcon}
            onIconSelect={onIconSelect}
          />
        </div>
      )}
      
      {activeTab === 'borders' && (
        <div style={sectionWrapperStyle}>
          <h3 style={sectionTitleStyle}>
            Border Colors
          </h3>
          
          <BorderOptionsGrid 
            selectedBorderColor={selectedBorderColor}
            onBorderColorSelect={onBorderColorSelect}
          />
        </div>
      )}
    </div>
  );
};

export default SideMenuContent; 
