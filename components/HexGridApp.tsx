import React, { useState, useRef, useEffect, useCallback } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { UI_CONFIG, PAINT_OPTIONS, BACKGROUND_COLORS, ICON_OPTIONS } from './config';
import type { BackgroundColor, IconItem, HexTexture } from './config';
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
  createTextureClearHandler,
  createIconSelectHandler,
  createMenuToggleHandler,
  createTabChangeHandler,
  createEraserToggleHandler,
  createExportPNGHandler,
  createCopyUrlHandler
} from '../utils/gridActions';

const HexGridApp: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<string>('#6B7280'); // Default grey as hex
  const [selectedTexture, setSelectedTexture] = useState<HexTexture | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
  const [selectedBorderColor, setSelectedBorderColor] = useState<string>('#FF1A00');
  const [selectedIconColor, setSelectedIconColor] = useState<string>('#FFFFFF');
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

  // Set up swipe detection for mobile
  useSwipeDetection(appContainerRef, {
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    touchStartRegion: 'bottom', // Only detect swipes starting from bottom region
    regionSize: 100, // 100px from bottom edge
    minSwipeDistance: 50,
    maxSwipeTime: 500
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
    hexIcons,
    borders,
    hexColorsVersion,
    hexIconsVersion,
    bordersVersion,
    setGridWidth,
    setGridHeight,
    setHexColors,
    setHexIcons,
    setBorders,
    paintHex,
    placeBorder,
    clearGrid,
    getHexColor,
    getHexIcon,
    hasUndoHistory,
    handleUndo
  } = useGridState({
    selectedColor,
    selectedTexture,
    selectedIcon,
    selectedIconColor,
    selectedBorderColor,
    activeTab,
    onPaintStart: handlePaintStart
  });

  const { loadFromLocalStorage, clearAutosave } = useAutoSave({
    encodingMap,
    hexColors,
    hexIcons,
    borders,
    gridWidth,
    gridHeight,
    isUndoing: false
  });

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
        const { gridWidth: decodedWidth, gridHeight: decodedHeight, hexColors, hexIcons, borders } = decodedGridState;
        
        // Set grid dimensions from decoded URL
        setGridWidth(decodedWidth);
        setGridHeight(decodedHeight);
        
        // hexColors from decoding is already in the correct format (string | HexTexture)
        setHexColors(hexColors);
        setHexIcons(hexIcons); // hexIcons is already in ColoredIcon format from new decoding
        setBorders(borders);
        
        window.history.replaceState({}, '', '/');
      }
    } else {
      const savedState = loadFromLocalStorage();
      if (savedState) {
        setHexColors(savedState.hexColors);
        setHexIcons(savedState.hexIcons);
        setBorders(savedState.borders);
      }
    }
      }, [encodingMap, gridWidth, gridHeight, loadFromLocalStorage, setHexColors, setHexIcons, setBorders, setGridWidth, setGridHeight]); // Only run when encoding map is first available



  const gridActionHelpers = {
    setSelectedTexture,
    setSelectedColor,
    setSelectedIcon,
    setMenuOpen,
    setActiveTab,
    setHexIcons,
    setHexColors,
    setBorders,
    setIsExporting
  };

  const handleTextureSelect = createTextureSelectHandler(gridActionHelpers);
  const handleTextureClear = createTextureClearHandler(gridActionHelpers);
  const handleIconSelect = createIconSelectHandler(gridActionHelpers);
  const handleMenuToggle = createMenuToggleHandler(menuOpen, gridActionHelpers);
  const handleTabChange = createTabChangeHandler(selectedIcon, gridActionHelpers);
  const handleEraserToggle = createEraserToggleHandler(selectedIcon, handleIconSelect);
  
  const handleExportPNG = createExportPNGHandler(
    { hexGridRef, gridWidth, gridHeight, isExporting },
    gridActionHelpers
  );
  
  const handleCopyUrl = createCopyUrlHandler({
    encodingMap,
    hexColors,
    hexIcons,
    borders,
    gridWidth,
    gridHeight,
    clearAutosave
  });

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
            height: menuOpen ? '60vh' : '0',
            maxHeight: '60vh',
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
          selectedColor={selectedColor}
          onWidthChange={setGridWidth}
          onHeightChange={setGridHeight}
          onBackgroundColorChange={setSelectedBackgroundColor}
          onNumberingModeChange={setNumberingMode}
          onTextureSelect={handleTextureSelect}
          onColorSelect={setSelectedColor}
          onTextureClear={handleTextureClear}
          selectedIcon={selectedIcon}
          selectedIconColor={selectedIconColor}
          onIconSelect={handleIconSelect}
          onIconColorSelect={setSelectedIconColor}
          selectedBorderColor={selectedBorderColor}
          onBorderColorSelect={setSelectedBorderColor}
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
          onHexClick={paintHex}
          onEdgeClick={placeBorder}
          getHexColor={getHexColor}
          getHexIcon={getHexIcon}
          hexColorsVersion={hexColorsVersion}
          hexIconsVersion={hexIconsVersion}
          backgroundColor={selectedBackgroundColor}
          borders={borders}
          bordersVersion={bordersVersion}
          activeTab={activeTab}
          selectedIcon={selectedIcon}
          onCanvasInteraction={handleCanvasInteraction}
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