import React, { useState, useRef, useEffect, useCallback } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { UI_CONFIG, PAINT_OPTIONS, BACKGROUND_COLORS, ICON_OPTIONS } from './config';
import type { BackgroundColor, IconItem, HexTexture } from './config';
import { loadTerrainManifest, getTerrainInfo } from './config/assetLoader';
import type { NumberingMode } from './GridSizeControls';

import TopCornerLinks from './TopCornerLinks';
import MenuToggleButton from './MenuToggleButton';
import TabButtons from './TabButtons';
import ActionMenu from './ActionMenu';
import DesignMenuContent from './DesignMenuContent';
import { 
  createEncodingMap,
  decodeBase64ToGrid,
  parseGridUrl,
  isValidGridEncoding
} from '../utils/gridEncoding';
import type { EncodingMap } from '../utils/gridEncoding';
import { useAutoSave } from '../hooks/useAutoSave';
import { useGridState } from '../hooks/useGridState';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { useSwipeDetection } from '../hooks/useSwipeDetection';
import {
  createTextureSelectHandler,
  createIconSelectHandler,
  createMenuToggleHandler,
  createTabChangeHandler,
  createExportPNGHandler,
  createCopyUrlHandler,
  createBackgroundPaintingModeToggleHandler
} from '../utils/gridActions';

const HexGridApp: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<string>('#F3E8C2'); // Default manila as hex
  const [selectedTexture, setSelectedTexture] = useState<HexTexture | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
  

  const [selectedBorderColor, setSelectedBorderColor] = useState<string>('#FF1A00');
  const [selectedIconColor, setSelectedIconColor] = useState<string>('#FFFFFF');
  const [selectedBackgroundShaderColor, setSelectedBackgroundShaderColor] = useState<string>('#F3E8C2');
  const [backgroundPaintingMode, setBackgroundPaintingMode] = useState<boolean>(false);
  const [eyeDropperMode, setEyeDropperMode] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'paint' | 'icons' | 'borders' | 'settings'>('paint');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState<BackgroundColor>(BACKGROUND_COLORS[0]);
  const [numberingMode, setNumberingMode] = useState<NumberingMode>('off');
  const hexGridRef = useRef<HexGridRef>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);
  
  const [encodingMap, setEncodingMap] = useState<EncodingMap | null>(null);
  
  // Mobile detection
  const { isMobile } = useMobileDetection();

  // Swipe gesture handlers for mobile
  const handleSwipeUp = useCallback(() => {
    if (isMobile && !menuOpen) {
      setMenuOpen(true);
    }
  }, [isMobile, menuOpen]);

  const handleSwipeDown = useCallback(() => {
    if (isMobile && menuOpen) {
      setMenuOpen(false);
    }
  }, [isMobile, menuOpen]);

  // Set up swipe detection for mobile (only when menu is closed or for closing)
  useSwipeDetection(appContainerRef, {
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    touchStartRegion: 'all', // Allow swipes from anywhere except canvas
    minSwipeDistance: 50, // Reduced threshold for easier triggering
    maxSwipeTime: 800 // Increased time allowance
  });

  // Auto-minimize menu when painting starts on mobile
  const handlePaintStart = useCallback(() => {
    if (isMobile && menuOpen) {
      setMenuOpen(false);
    }
  }, [isMobile, menuOpen]);

  // Close menu when clicking outside on mobile
  const handleBackgroundClick = useCallback(() => {
    if (isMobile && menuOpen) {
      setMenuOpen(false);
    }
  }, [isMobile, menuOpen]);

  // Close menu when interacting with canvas on mobile
  const handleCanvasInteraction = useCallback(() => {
    if (isMobile && menuOpen) {
      setMenuOpen(false);
    }
  }, [isMobile, menuOpen]);

  // Prevent menu from closing when clicking on the menu itself
  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  useEffect(() => {
    // Encoding map for base64 system
    const borderColorValues: string[] = []; // No longer using predefined border colors
    const map = createEncodingMap(PAINT_OPTIONS, ICON_OPTIONS, borderColorValues);
    setEncodingMap(map);
  }, []);

  const {
    gridWidth,
    gridHeight,
    hexColors,
    hexBackgroundColors,
    hexIcons,
    borders,
    hexColorsVersion,
    hexBackgroundColorsVersion,
    hexIconsVersion,
    bordersVersion,
    setGridWidth,
    setGridHeight,
    setHexColors,
    setHexBackgroundColors,
    setHexIcons,
    setBorders,
    paintHex,
    paintBackgroundHex,
    placeBorder,
    clearGrid,
    getHexColor,
    getHexBackgroundColor,
    getHexIcon,
    hasUndoHistory,
    handleUndo,
    // Region functionality
    regionStats,
    getRegionData,
    hoveredRegion,
    setHoveredRegion,
    getRegionForHex
  } = useGridState({
    selectedColor,
    selectedTexture,
    selectedIcon,
    selectedIconColor,
    selectedBorderColor,
    selectedBackgroundColor: selectedBackgroundShaderColor,
    activeTab,
    onPaintStart: handlePaintStart
  });

  const { loadFromLocalStorage, clearAutosave } = useAutoSave({
    encodingMap,
    hexColors,
    hexBackgroundColors,
    hexIcons,
    borders,
    gridWidth,
    gridHeight,
    selectedBackgroundColor,
    isUndoing: false
  });

  // Initialize grid with grey background colors on first load and preserve existing colors on resize
  useEffect(() => {
    setHexBackgroundColors(prevColors => {
      const updatedBackgroundColors: Record<string, string> = { ...prevColors };
      
      // Only set default colors for tiles that don't already have background colors
      for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
          const hexKey = `${row}-${col}`;
          if (!updatedBackgroundColors[hexKey]) {
            updatedBackgroundColors[hexKey] = '#F3E8C2'; // Default manila hex color
          }
        }
      }
      
      // Note: We intentionally do NOT remove background colors for tiles outside grid bounds
      // This allows content to persist when the grid is temporarily made smaller and then larger again
      
      return updatedBackgroundColors;
    });
  }, [gridWidth, gridHeight, setHexBackgroundColors]);

  const handleClearGrid = (): void => {
    clearGrid();
    clearAutosave();
  };



  useEffect(() => {
    if (!encodingMap) return;
    
    const currentPath = window.location.pathname;
    const encoded = parseGridUrl(currentPath);
    
    if (encoded && isValidGridEncoding(encoded)) {
      const decodedGridState = decodeBase64ToGrid(encoded, encodingMap);
      
      if (decodedGridState) {
        const { gridWidth: decodedWidth, gridHeight: decodedHeight, hexColors, hexBackgroundColors, hexIcons, borders } = decodedGridState;
        
        // Set grid dimensions from decoded URL
        setGridWidth(decodedWidth);
        setGridHeight(decodedHeight);
        
        // hexColors from decoding is already in the correct format (string | HexTexture)
        setHexColors(hexColors);
        setHexBackgroundColors(hexBackgroundColors);
        setHexIcons(hexIcons); // hexIcons is already in ColoredIcon format from new decoding
        setBorders(borders);
        
        window.history.replaceState({}, '', '/');
      }
    } else {
      const savedState = loadFromLocalStorage();
      if (savedState) {
        // Restore grid dimensions if they were saved
        if (savedState.gridWidth && savedState.gridHeight) {
          setGridWidth(savedState.gridWidth);
          setGridHeight(savedState.gridHeight);
        }
        
        setHexColors(savedState.hexColors);
        setHexBackgroundColors(savedState.hexBackgroundColors);
        setHexIcons(savedState.hexIcons);
        setBorders(savedState.borders);
        if (savedState.selectedBackgroundColor) {
          setSelectedBackgroundColor(savedState.selectedBackgroundColor);
        }
      }
    }
      }, [encodingMap, loadFromLocalStorage, setHexColors, setHexBackgroundColors, setHexIcons, setBorders, setGridWidth, setGridHeight, setSelectedBackgroundColor]); // Only run when encoding map is first available, not on grid resize



  const gridActionHelpers = {
    setSelectedTexture,
    setSelectedColor,
    setSelectedIcon,
    setMenuOpen,
    setActiveTab,
    setHexIcons,
    setHexColors,
    setHexBackgroundColors,
    setBorders,
    setIsExporting,
    setBackgroundPaintingMode,
    setEyeDropperMode
  };

  const handleTextureSelect = createTextureSelectHandler(gridActionHelpers);
  const handleIconSelect = createIconSelectHandler(gridActionHelpers);
  const handleMenuToggle = createMenuToggleHandler(menuOpen, gridActionHelpers);
  const handleTabChange = createTabChangeHandler(selectedIcon, gridActionHelpers);
  const handleEraserToggle = useCallback(() => {
    // Toggle eraser - deselect if already selected, select if not
    if (selectedIcon?.name === 'eraser') {
      setSelectedIcon(null);
    } else {
      setSelectedIcon({ name: 'eraser', displayName: 'Eraser', type: 'icon', path: '' } as IconItem);
    }
  }, [selectedIcon]);
  const handleBackgroundPaintingModeToggle = createBackgroundPaintingModeToggleHandler(
    backgroundPaintingMode,
    gridActionHelpers
  );
  
  const handleEyeDropperToggle = useCallback(() => {
    setEyeDropperMode(prev => !prev);
    // Disable background painting mode when eye dropper is active
    if (!eyeDropperMode) {
      setBackgroundPaintingMode(false);
    }
  }, [eyeDropperMode]);

  // Eye dropper functionality to sample background color from hex
  const handleEyeDropperClick = useCallback((row: number, col: number) => {
    const backgroundColorHex = getHexBackgroundColor(row, col);
    
    if (backgroundColorHex) {
      // Set the sampled color as the active background color
      setSelectedBackgroundShaderColor(backgroundColorHex);
      // Exit eye dropper mode after sampling
      setEyeDropperMode(false);
    }
  }, [getHexBackgroundColor]);
  
  const handleExportPNG = createExportPNGHandler(
    { hexGridRef, gridWidth, gridHeight, isExporting },
    gridActionHelpers
  );
  
  const handleCopyUrl = createCopyUrlHandler({
    encodingMap,
    hexColors,
    hexBackgroundColors,
    hexIcons,
    borders,
    gridWidth,
    gridHeight,
    clearAutosave
  });

  // Tile texture manipulation handler
  const handleTileTextureAction = useCallback((row: number, col: number, action: 'cycle' | 'rotate-left' | 'rotate-right') => {
    const hexKey = `${row}-${col}`;
    const currentTexture = hexColors[hexKey] as HexTexture;
    
    if (!currentTexture || typeof currentTexture !== 'object' || currentTexture.type !== 'texture') {
      return; // Only manipulate texture tiles
    }
    
    if (action === 'cycle') {
      // Extract the terrain name from the current texture
      // currentTexture.name might be like "coast_120_1" or "forest_180_bottom_1" or "forest-360_B1"
      let terrainName = currentTexture.name.split('_')[0]; // Get "coast" or "forest" or "forest-360"
      
      // Handle cases where terrain name contains hyphens (e.g., "forest-360" -> "forest")
      if (terrainName.includes('-')) {
        terrainName = terrainName.split('-')[0];
      }
      
      // Special case: forest edge assets have names starting with "forest_" but are in "forestedge" terrain
      if (terrainName === 'forest' && currentTexture.path?.includes('/forestedge/')) {
        terrainName = 'forestedge';
      }
      
      // Get terrain info and manifest
      const terrainInfo = getTerrainInfo(terrainName);
      if (!terrainInfo || terrainInfo.type !== 'complex') {
        return; // Can only cycle complex terrain types
      }
      
      const manifest = loadTerrainManifest(terrainName);
      if (!manifest || manifest.rawAssets.length <= 1) {
        return; // Need manifest and multiple assets to cycle
      }
      
      // Get all available assets for this terrain
      const allAssets = manifest.rawAssets;
      
      // Find current asset by matching the filename
      const currentAssetName = currentTexture.path?.split('/').pop()?.replace('.png', '') || '';
      const currentIndex = allAssets.findIndex(asset => asset.name === currentAssetName);
      
      if (currentIndex === -1) {
        // If current asset not found, start with first asset
        const firstAsset = allAssets[0];
        setHexColors({
          ...hexColors,
          [hexKey]: {
            ...currentTexture,
            name: firstAsset.name,
            path: `/assets/terrain/${terrainName}/${firstAsset.filename}`
          }
        });
        return;
      }
      
      // Get the next asset (cycle back to start if at end)
      const nextIndex = (currentIndex + 1) % allAssets.length;
      const nextAsset = allAssets[nextIndex];
      
      setHexColors({
        ...hexColors,
        [hexKey]: {
          ...currentTexture,
          name: nextAsset.name,
          path: `/assets/terrain/${terrainName}/${nextAsset.filename}`
        }
      });
    } else if (action === 'rotate-left' || action === 'rotate-right') {
      // Extract terrain name from current texture
      let terrainName = '';
      if (typeof currentTexture === 'object' && currentTexture.name) {
        // Extract the terrain name from the asset name (e.g., "coast_180_1" -> "coast")
        terrainName = currentTexture.name.split('_')[0];
        // Handle cases where terrain name contains hyphens (e.g., "forest-360" -> "forest")
        if (terrainName.includes('-')) {
          terrainName = terrainName.split('-')[0];
        }
        
        // Special case: forest edge assets have names starting with "forest_" but are in "forestedge" terrain
        if (terrainName === 'forest' && currentTexture.path?.includes('/forestedge/')) {
          terrainName = 'forestedge';
        }
      }
      
      // Check if this terrain is rotatable
      const terrainInfo = getTerrainInfo(terrainName);
      const isRotatable = terrainInfo?.rotatable ?? true;
      
      if (isRotatable) {
        // Handle rotation for rotatable textures
        const currentRotation = currentTexture.rotation || 0;
        const rotationDelta = action === 'rotate-right' ? -1 : 1;
        const newRotation = (currentRotation + rotationDelta + 6) % 6; // 6 sides in hexagon
        
        setHexColors({
          ...hexColors,
          [hexKey]: {
            ...currentTexture,
            rotation: newRotation
          }
        });
      } else {
        // Handle vertical flipping for non-rotatable textures
        const currentFlipped = currentTexture.flipped || false;
        const newFlipped = !currentFlipped;
        
        setHexColors({
          ...hexColors,
          [hexKey]: {
            ...currentTexture,
            flipped: newFlipped
          }
        });
      }
    }
  }, [hexColors, setHexColors]);

  // Handle hex hover for region detection
  const handleHexHover = useCallback((row: number | null, col: number | null) => {
    if (row === null || col === null) {
      setHoveredRegion(null);
      return;
    }
    
    const hexCoord = `${row}-${col}`;
    const regionId = getRegionForHex(hexCoord);
    
    // Only update if the region actually changed to prevent constant re-renders
    if (regionId !== hoveredRegion) {
      setHoveredRegion(regionId);
    }
  }, [getRegionForHex, setHoveredRegion, hoveredRegion]);

  return (
    <div 
      ref={appContainerRef}
      className="App" 
      style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}
      onClick={handleBackgroundClick}
    >

      <TopCornerLinks />
      {/* Menu Toggle Button - Hidden on mobile */}
      {!isMobile && (
        <MenuToggleButton 
          menuOpen={menuOpen} 
          onToggle={handleMenuToggle} 
        />
      )}

      {/* Tab Navigation Buttons */}
      <TabButtons
        activeTab={activeTab}
        menuOpen={menuOpen}
        selectedIcon={selectedIcon}
        onTabChange={handleTabChange}
        onMenuToggle={handleMenuToggle}
        isMobile={isMobile}
      />

      {/* Design Menu - Side on Desktop, Bottom on Mobile */}
      <div 
        onClick={handleMenuClick}
        style={{
          position: 'fixed',
          ...(isMobile ? {
            // Mobile: Bottom menu
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: menuOpen ? '75vh' : '0',
            maxHeight: '75vh',
            borderTop: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
            borderRadius: `${UI_CONFIG.BORDER_RADIUS.LARGE} ${UI_CONFIG.BORDER_RADIUS.LARGE} 0 0`,
            transform: `translateY(${menuOpen ? '0' : '100%'})`,
          } : {
            // Desktop: Side menu
            top: 0,
            left: 0,
            width: `${UI_CONFIG.MENU_WIDTH}px`,
            height: '100vh',
            borderRight: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
            transform: `translateX(${menuOpen ? '0' : `-${UI_CONFIG.MENU_WIDTH}px`})`,
          }),
          background: UI_CONFIG.COLORS.MENU_BACKGROUND,
          backdropFilter: UI_CONFIG.BLUR.MEDIUM,
          transition: `transform ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
          zIndex: UI_CONFIG.Z_INDEX.MENU,
          boxShadow: menuOpen ? UI_CONFIG.BOX_SHADOW.MEDIUM : 'none',
          overflowY: 'auto',
          padding: isMobile ? 
            `${UI_CONFIG.SPACING.LARGE} ${UI_CONFIG.SPACING.MEDIUM}` : 
            UI_CONFIG.SPACING.XLARGE
        }}
      >
        
        <DesignMenuContent
          activeTab={activeTab}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          selectedBackgroundColor={selectedBackgroundColor}
          numberingMode={numberingMode}
          selectedTexture={selectedTexture}
          onWidthChange={setGridWidth}
          onHeightChange={setGridHeight}
          onBackgroundColorChange={setSelectedBackgroundColor}
          onNumberingModeChange={setNumberingMode}
          onTextureSelect={handleTextureSelect}
          selectedIcon={selectedIcon}
          selectedIconColor={selectedIconColor}
          onIconSelect={handleIconSelect}
          onIconColorSelect={setSelectedIconColor}
          selectedBorderColor={selectedBorderColor}
          onBorderColorSelect={setSelectedBorderColor}
          selectedBackgroundShaderColor={selectedBackgroundShaderColor}
          backgroundPaintingMode={backgroundPaintingMode}
          eyeDropperMode={eyeDropperMode}
          onBackgroundShaderColorSelect={setSelectedBackgroundShaderColor}
          onBackgroundPaintingModeToggle={handleBackgroundPaintingModeToggle}
          onEyeDropperToggle={handleEyeDropperToggle}
          // Region props
          regionStats={regionStats}
          hoveredRegion={hoveredRegion}
          getRegionData={getRegionData}
          isMobile={isMobile}
        />
      </div>
      
      {/* Main Grid Area */}
      <div style={{
        width: '100vw',
        height: 'calc(100vh - 80px)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1,
        pointerEvents: 'auto'
      }}>
        <HexGrid 
          ref={hexGridRef}
          gridWidth={gridWidth} 
          gridHeight={gridHeight}
          numberingMode={numberingMode}
          onHexClick={eyeDropperMode ? handleEyeDropperClick : (
            (backgroundPaintingMode && selectedIcon?.name !== 'eraser') || 
            (!selectedTexture && selectedIcon?.name !== 'eraser' && activeTab === 'paint') 
              ? paintBackgroundHex 
              : paintHex
          )}
          onHexHover={handleHexHover}
          onEdgeClick={placeBorder}
          getHexColor={getHexColor}
          getHexBackgroundColor={getHexBackgroundColor}
          getHexIcon={getHexIcon}
          hexColorsVersion={hexColorsVersion}
          hexBackgroundColorsVersion={hexBackgroundColorsVersion}
          hexIconsVersion={hexIconsVersion}
          backgroundColor={selectedBackgroundColor}
          borders={borders}
          bordersVersion={bordersVersion}
          activeTab={activeTab}
          selectedIcon={selectedIcon}
          selectedTexture={selectedTexture}
          onCanvasInteraction={handleCanvasInteraction}
          menuOpen={menuOpen}
          onTileTextureAction={handleTileTextureAction}
          hoveredRegion={hoveredRegion}
          getRegionForHex={getRegionForHex}
          getRegionData={getRegionData}
        />
      </div>

      {/* Action Menu */}
      <ActionMenu
        selectedIcon={selectedIcon}
        isExporting={isExporting}
        hasUndoHistory={hasUndoHistory()}
        activeTab={activeTab}
        onCopyUrl={handleCopyUrl}
        onExportPNG={handleExportPNG}
        onEraserToggle={handleEraserToggle}
        onUndo={handleUndo}
        onClearGrid={handleClearGrid}
      />
    </div>
  );
};

export default HexGridApp; 