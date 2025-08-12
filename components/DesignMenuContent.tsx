import React from 'react';
import PaintOptionsGrid from './PaintOptionsGrid';
import IconOptionsGrid from './IconOptionsGrid';
import BorderOptionsGrid from './BorderOptionsGrid';
import RegionBorderControls from './RegionBorderControls';
import GridSizeControls from './GridSizeControls';
import BackgroundColorSelector from './BackgroundColorSelector';
import { UI_CONFIG } from './config';
import type { BackgroundColor, TextureItem, HexTexture, IconItem } from './config';
import type { NumberingMode } from './GridSizeControls';

interface DesignMenuContentProps {
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  // Paint tab props
  selectedTexture: HexTexture | null;
  onTextureSelect: (texture: TextureItem) => void;
  // Icons tab props
  selectedIcon: IconItem | null;
  selectedIconColor: string;
  onIconSelect: (icon: IconItem) => void;
  onIconColorSelect: (color: string) => void;
  // Borders tab props
  selectedBorderColor: string;
  onBorderColorSelect: (color: string) => void;
  // Background shader props (used in paint tab)
  selectedBackgroundShaderColor: string;
  backgroundPaintingMode: boolean;
  onBackgroundShaderColorSelect: (color: string) => void;
  onBackgroundPaintingModeToggle: () => void;
  // Settings tab props
  gridWidth: number;
  gridHeight: number;
  selectedBackgroundColor: BackgroundColor;
  numberingMode: NumberingMode;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onBackgroundColorChange: (color: BackgroundColor) => void;
  // Mobile layout
  isMobile?: boolean; // Optional mobile detection for layout adjustments
  onNumberingModeChange: (mode: NumberingMode) => void;
  // Region props
  regionStats?: {
    totalRegions: number;
    regionsByTerrain: Record<string, number>;
    averageRegionSize: number;
    largestRegion: { id: string; size: number; terrainType: string } | null;
  };
  hoveredRegion?: string | null;

  getRegionData?: (regionId: string) => { terrainType: string; hexes: Set<string>; id: string } | null;


}

const DesignMenuContent: React.FC<DesignMenuContentProps> = ({ 
  activeTab,
  // Paint props
  selectedTexture,
  onTextureSelect,
  // Icons props
  selectedIcon,
  selectedIconColor,
  onIconSelect,
  onIconColorSelect,
  // Borders props
  selectedBorderColor,
  onBorderColorSelect,
  // Backgrounds props
  selectedBackgroundShaderColor,
  backgroundPaintingMode,
  onBackgroundShaderColorSelect,
  onBackgroundPaintingModeToggle,
  // Settings props
  gridWidth,
  gridHeight,
  selectedBackgroundColor,
  numberingMode,
  onWidthChange,
  onHeightChange,
  onBackgroundColorChange,
  onNumberingModeChange,
  // Region props
  regionStats,
  hoveredRegion,
  getRegionData,
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
              selectedBackgroundColor={selectedBackgroundShaderColor}
              backgroundPaintingMode={backgroundPaintingMode}
              onTextureSelect={onTextureSelect}
              onBackgroundColorSelect={onBackgroundShaderColorSelect}
              onBackgroundPaintingModeToggle={onBackgroundPaintingModeToggle}
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
          {/* Region Border Controls */}
          {regionStats && hoveredRegion !== undefined && getRegionData && (
            <div className={isMobile ? 'mobile-section' : ''} style={sectionWrapperStyle}>
              <RegionBorderControls
                regionStats={regionStats}
                hoveredRegion={hoveredRegion}
                getRegionData={getRegionData}
              />
            </div>
          )}
          
          {/* Manual Border Controls */}
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
            numberingMode={numberingMode}
            onWidthChange={onWidthChange}
            onHeightChange={onHeightChange}
            onNumberingModeChange={onNumberingModeChange}
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

export default DesignMenuContent; 