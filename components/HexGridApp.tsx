import React, { useState, useRef, useEffect } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { UI_CONFIG, COLORS, DEFAULT_COLORS, PAINT_OPTIONS, BACKGROUND_COLORS, BORDER_COLORS, ICON_OPTIONS } from './config';
import type { ColorItem, TextureItem, BackgroundColor, IconItem, HexTexture } from './config';
import TopCornerLinks from './TopCornerLinks';
import MenuToggleButton from './MenuToggleButton';
import TabButtons from './TabButtons';
import BottomActionMenu from './BottomActionMenu';
import SideMenuContent from './SideMenuContent';
import { 
  createEncodingMap,
  decodeBase64ToGrid,
  parseGridUrl,
  isValidGridEncoding
} from '../utils/gridEncoding';
import type { EncodingMap } from '../utils/gridEncoding';
import { useAutoSave } from '../hooks/useAutoSave';
import { useGridState } from '../hooks/useGridState';
import {
  createTextureSelectHandler,
  createIconSelectHandler,
  createMenuToggleHandler,
  createTabChangeHandler,
  createEraserToggleHandler,
  createExportPNGHandler,
  createCopyUrlHandler
} from '../utils/gridActions';

const HexGridApp: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLORS.SELECTED);
  const [selectedTexture, setSelectedTexture] = useState<HexTexture | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
  const [selectedBorderColor, setSelectedBorderColor] = useState<string>('#FF1A00');
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'paint' | 'icons' | 'borders'>('paint');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState<BackgroundColor>(BACKGROUND_COLORS[0]);
  const hexGridRef = useRef<HexGridRef>(null);
  
  const [encodingMap, setEncodingMap] = useState<EncodingMap | null>(null);

  useEffect(() => {
    // Encoding map for base64 system
    const borderColorValues = BORDER_COLORS.map(color => color.value);
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
    selectedBorderColor,
    activeTab
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
        const { hexColors, hexIcons, borders } = decodedGridState;
        
        const hexTextureColors: Record<string, string | HexTexture> = {};
        Object.entries(hexColors).forEach(([key, assetItem]) => {
          const hexTexture: HexTexture = {
            type: assetItem.type,
            name: assetItem.name,
            displayName: assetItem.displayName,
            ...(assetItem.type === 'color' && { rgb: (assetItem as ColorItem).rgb }),
            ...(assetItem.type === 'texture' && { path: (assetItem as TextureItem).path })
          };
          hexTextureColors[key] = hexTexture;
        });
        
        setHexColors(hexTextureColors);
        setHexIcons(hexIcons);
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
      }, [encodingMap, gridWidth, gridHeight, loadFromLocalStorage, setHexColors, setHexIcons, setBorders]); // Only run when encoding map is first available



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
    <div className="App" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      <TopCornerLinks />
      {/* Menu Toggle Button */}
      <MenuToggleButton 
        menuOpen={menuOpen} 
        onToggle={handleMenuToggle} 
      />

      {/* Tab Navigation Buttons */}
      <TabButtons
        activeTab={activeTab}
        menuOpen={menuOpen}
        selectedIcon={selectedIcon}
        onTabChange={handleTabChange}
        onMenuToggle={handleMenuToggle}
      />

      {/* Collapsible Side Menu */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${UI_CONFIG.MENU_WIDTH}px`,
        height: '100vh',
        background: UI_CONFIG.COLORS.MENU_BACKGROUND,
        backdropFilter: UI_CONFIG.BLUR.MEDIUM,
        transform: `translateX(${menuOpen ? '0' : `-${UI_CONFIG.MENU_WIDTH}px`})`,
        transition: `transform ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
        zIndex: UI_CONFIG.Z_INDEX.MENU,
        borderRight: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        boxShadow: menuOpen ? UI_CONFIG.BOX_SHADOW.MEDIUM : 'none',
        overflowY: 'auto',
        padding: UI_CONFIG.SPACING.XLARGE
      }}>
        
        <SideMenuContent
          activeTab={activeTab}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          selectedBackgroundColor={selectedBackgroundColor}
          selectedTexture={selectedTexture}
          onWidthChange={setGridWidth}
          onHeightChange={setGridHeight}
          onBackgroundColorChange={setSelectedBackgroundColor}
          onTextureSelect={handleTextureSelect}
          selectedIcon={selectedIcon}
          onIconSelect={handleIconSelect}
          selectedBorderColor={selectedBorderColor}
          onBorderColorSelect={setSelectedBorderColor}
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
          colors={COLORS}
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
        />
      </div>

      {/* Bottom Action Menu */}
      <BottomActionMenu
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