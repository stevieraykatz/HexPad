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
  // Mobile layout
  isMobile?: boolean; // Optional mobile detection for layout adjustments
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
  onBackgroundColorChange,
  // Mobile layout
  isMobile = false
}) => {
  const sectionTitleStyle = {
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: UI_CONFIG.FONT_SIZE.LARGE,
    marginBottom: UI_CONFIG.SPACING.LARGE,
    fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
  };

  const sectionWrapperStyle = {
    marginBottom: isMobile ? UI_CONFIG.SPACING.LARGE : UI_CONFIG.SPACING.XXLARGE
  };

  return (
    <div 
      className={`mobile-spacing-medium ${isMobile ? 'mobile-menu-content' : ''}`}
      style={{
        paddingBottom: UI_CONFIG.MENU.MENU_HEIGHT
      }}
    >
      {activeTab === 'paint' && (
        <>
          <div className={isMobile ? 'mobile-section' : ''} style={sectionWrapperStyle}>
            <PaintOptionsGrid 
              selectedTexture={selectedTexture}
              selectedColor={selectedColor}
              onTextureSelect={onTextureSelect}
              onColorSelect={onColorSelect}
              onTextureClear={onTextureClear}
              isMobile={isMobile}
            />
          </div>
        </>
      )}
      
      {activeTab === 'icons' && (
        <>
          <div className={isMobile ? 'mobile-section' : ''} style={sectionWrapperStyle}>
            <IconOptionsGrid 
              selectedIcon={selectedIcon}
              selectedIconColor={selectedIconColor}
              onIconSelect={onIconSelect}
              onIconColorSelect={onIconColorSelect}
              isMobile={isMobile}
            />
          </div>
        </>
      )}
      
      {activeTab === 'borders' && (
        <>
          <div className={isMobile ? 'mobile-section' : ''} style={sectionWrapperStyle}>
            <BorderOptionsGrid 
              selectedBorderColor={selectedBorderColor}
              onBorderColorSelect={onBorderColorSelect}
              isMobile={isMobile}
            />
          </div>
        </>
      )}
      
      {activeTab === 'settings' && (
        <>
          <div className={isMobile ? 'mobile-section' : ''} style={{ ...sectionTitleStyle, textAlign: 'center', marginBottom: UI_CONFIG.SPACING.XLARGE }}>
            Grid Settings
          </div>

          <div className={isMobile ? 'mobile-section' : ''}>
            <GridSizeControls
              gridWidth={gridWidth}
              gridHeight={gridHeight}
              onWidthChange={onWidthChange}
              onHeightChange={onHeightChange}
            />
          </div>

          <div className={isMobile ? 'mobile-section' : ''}>
            <BackgroundColorSelector
              selectedBackgroundColor={selectedBackgroundColor}
              onBackgroundColorChange={onBackgroundColorChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SideMenuContent; 
