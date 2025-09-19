import React from 'react';
import PaintOptionsGrid from './PaintOptionsGrid';
import IconOptionsGrid from './IconOptionsGrid';
import BorderOptionsGrid from './BorderOptionsGrid';
// import RegionBorderControls from './RegionBorderControls'; // Unused - regioning disabled
import GridSizeControls from './GridSizeControls';
import BackgroundColorSelector from './BackgroundColorSelector';
import { UI_CONFIG } from './config';
import type { BackgroundColor, TextureItem, HexTexture, IconItem } from './config';
import type { NumberingMode, OrientationMode } from './GridSizeControls';

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
  eyeDropperMode: boolean;
  onBackgroundShaderColorSelect: (color: string) => void;
  onBackgroundPaintingModeToggle: () => void;
  onEyeDropperToggle: () => void;
  // Settings tab props
  gridWidth: number;
  gridHeight: number;
  selectedBackgroundColor: BackgroundColor;
  numberingMode: NumberingMode;
  orientationMode: OrientationMode;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onBackgroundColorChange: (color: BackgroundColor) => void;
  // Mobile layout
  isMobile?: boolean; // Optional mobile detection for layout adjustments
  onNumberingModeChange: (mode: NumberingMode) => void;
  onOrientationModeChange: (mode: OrientationMode) => void;
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
  eyeDropperMode,
  onBackgroundShaderColorSelect,
  onBackgroundPaintingModeToggle,
  onEyeDropperToggle,
  // Settings props
  gridWidth,
  gridHeight,
  selectedBackgroundColor,
  numberingMode,
  orientationMode,
  onWidthChange,
  onHeightChange,
  onBackgroundColorChange,
  onNumberingModeChange,
  onOrientationModeChange,
  // Region props - REGIONING DISABLED
  regionStats: _regionStats,
  hoveredRegion: _hoveredRegion,
  getRegionData: _getRegionData,
  // Mobile layout
  isMobile = false
}) => {
  // Mark regioning props as explicitly unused
  void _regionStats;
  void _hoveredRegion;
  void _getRegionData;

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
        paddingBottom: isMobile ? '0px' : UI_CONFIG.MENU.MENU_HEIGHT
      }}
    >
      {activeTab === 'paint' && (
        <>
          <div className={isMobile ? 'mobile-section' : ''} style={sectionWrapperStyle}>
            <PaintOptionsGrid 
              selectedTexture={selectedTexture}
              selectedBackgroundColor={selectedBackgroundShaderColor}
              backgroundPaintingMode={backgroundPaintingMode}
              eyeDropperMode={eyeDropperMode}
              onTextureSelect={onTextureSelect}
              onBackgroundColorSelect={onBackgroundShaderColorSelect}
              onBackgroundPaintingModeToggle={onBackgroundPaintingModeToggle}
              onEyeDropperToggle={onEyeDropperToggle}
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
          {/* Region Border Controls - REGIONING UI DISABLED */}
          {false && (
            <div className={isMobile ? 'mobile-section' : ''} style={sectionWrapperStyle}>
              {/* RegionBorderControls component disabled for production */}
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
            orientationMode={orientationMode}
            onWidthChange={onWidthChange}
            onHeightChange={onHeightChange}
            onNumberingModeChange={onNumberingModeChange}
            onOrientationModeChange={onOrientationModeChange}
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