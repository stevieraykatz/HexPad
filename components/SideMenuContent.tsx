import React from 'react';
import PaintOptionsGrid from './PaintOptionsGrid';
import IconOptionsGrid from './IconOptionsGrid';
import BorderOptionsGrid from './BorderOptionsGrid';
import GridSizeControls from './GridSizeControls';
import BackgroundColorSelector from './BackgroundColorSelector';
import { UI_CONFIG } from './config';
import type { BackgroundColor, TextureItem, HexTexture, IconItem } from './config';

interface SideMenuContentProps {
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  // Paint tab props
  selectedTexture: HexTexture | null;
  selectedColor: string;
  onTextureSelect: (texture: TextureItem) => void;
  onColorSelect: (color: string) => void;
  onTextureClear: () => void;
  // Icons tab props
  selectedIcon: IconItem | null;
  selectedIconColor: string;
  onIconSelect: (icon: IconItem) => void;
  onIconColorSelect: (color: string) => void;
  // Borders tab props
  selectedBorderColor: string;
  onBorderColorSelect: (color: string) => void;
  // Settings tab props
  gridWidth: number;
  gridHeight: number;
  selectedBackgroundColor: BackgroundColor;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onBackgroundColorChange: (color: BackgroundColor) => void;
}

const SideMenuContent: React.FC<SideMenuContentProps> = ({ 
  activeTab,
  // Paint props
  selectedTexture,
  selectedColor,
  onTextureSelect,
  onColorSelect,
  onTextureClear,
  // Icons props
  selectedIcon,
  selectedIconColor,
  onIconSelect,
  onIconColorSelect,
  // Borders props
  selectedBorderColor,
  onBorderColorSelect,
  // Settings props
  gridWidth,
  gridHeight,
  selectedBackgroundColor,
  onWidthChange,
  onHeightChange,
  onBackgroundColorChange
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
      paddingBottom: UI_CONFIG.MENU.MENU_HEIGHT
    }}>
      {activeTab === 'paint' && (
        <>
          <div style={sectionWrapperStyle}>
            <PaintOptionsGrid 
              selectedTexture={selectedTexture}
              selectedColor={selectedColor}
              onTextureSelect={onTextureSelect}
              onColorSelect={onColorSelect}
              onTextureClear={onTextureClear}
            />
          </div>
        </>
      )}
      
      {activeTab === 'icons' && (
        <>
          <div style={sectionWrapperStyle}>
            <IconOptionsGrid 
              selectedIcon={selectedIcon}
              selectedIconColor={selectedIconColor}
              onIconSelect={onIconSelect}
              onIconColorSelect={onIconColorSelect}
            />
          </div>
        </>
      )}
      
      {activeTab === 'borders' && (
        <>
          <div style={sectionWrapperStyle}>
            <BorderOptionsGrid 
              selectedBorderColor={selectedBorderColor}
              onBorderColorSelect={onBorderColorSelect}
            />
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <>
          <div style={{ ...sectionTitleStyle, textAlign: 'center', marginBottom: UI_CONFIG.SPACING.XLARGE }}>
            Grid Settings
          </div>

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
        </>
      )}
    </div>
  );
};

export default SideMenuContent; 
