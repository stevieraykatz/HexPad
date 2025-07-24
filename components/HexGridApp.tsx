import React, { useState, useCallback, useRef, useEffect } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { GRID_CONFIG, UI_CONFIG, COLORS, DEFAULT_COLORS, PAINT_OPTIONS, BACKGROUND_COLORS, BARRIER_COLORS } from './config';
import type { Color, AssetItem, ColorItem, TextureItem, BackgroundColor, IconItem, BarrierColor, HexTexture } from './config';
import TopCornerLinks from './TopCornerLinks';
import MenuToggleButton from './MenuToggleButton';
import TabButtons from './TabButtons';
import BottomActionMenu from './BottomActionMenu';
import SideMenuContent from './SideMenuContent';
import { 
  createEncodingMap, 
  decodeUrlToGrid, 
  generateGridUrl, 
  parseGridUrl, 
  isValidGridEncoding 
} from '../utils/gridEncoding';
import type { EncodingMap } from '../utils/gridEncoding';

// Type definitions for hex colors and textures
type HexColor = string;
type HexColorsMap = Record<string, HexColor | HexTexture>;

// Barrier placement between hex tiles
interface BarrierEdge {
  fromHex: string; // hex key "row-col"
  toHex: string;   // hex key "row-col" 
  color: BarrierColor;
}

type BarriersMap = Record<string, BarrierEdge>; // key format: "fromRow-fromCol_toRow-toCol"

// Unified history entry that captures all state
interface HistoryEntry {
  iconState: Record<string, IconItem>;
  colorState: HexColorsMap;
  barrierState: BarriersMap;
  changedType: 'icons' | 'colors' | 'barriers'; // What actually changed in this entry
}

const HexGridApp: React.FC = () => {
  const [gridWidth, setGridWidth] = useState<number>(GRID_CONFIG.DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState<number>(GRID_CONFIG.DEFAULT_HEIGHT);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLORS.SELECTED);
  const [hexColors, setHexColors] = useState<HexColorsMap>({});

  const [selectedTexture, setSelectedTexture] = useState<HexTexture | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<IconItem | null>(null);
  const [hexIcons, setHexIcons] = useState<Record<string, IconItem>>({});
  const [selectedBarrierColor, setSelectedBarrierColor] = useState<BarrierColor>(BARRIER_COLORS[0]);
  const [barriers, setBarriers] = useState<BarriersMap>({});
  const [unifiedHistory, setUnifiedHistory] = useState<HistoryEntry[]>([]);
  const [hexColorsVersion, setHexColorsVersion] = useState<number>(0);
  const [hexIconsVersion, setHexIconsVersion] = useState<number>(0);
  const [barriersVersion, setBarriersVersion] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'paint' | 'icons' | 'barriers'>('paint');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState<BackgroundColor>(BACKGROUND_COLORS[0]); // Default to grey
  const hexGridRef = useRef<HexGridRef>(null);
  
  // URL encoding state
  const [encodingMap, setEncodingMap] = useState<EncodingMap | null>(null);
  
  // Track previous state for undo functionality
  const prevHexIconsRef = useRef<Record<string, IconItem>>({});
  const prevHexColorsRef = useRef<HexColorsMap>({});
  const prevBarriersRef = useRef<BarriersMap>({});
  const isUndoingRef = useRef<boolean>(false);

  // Initialize encoding map
  useEffect(() => {
    const map = createEncodingMap(PAINT_OPTIONS);
    setEncodingMap(map);
  }, []);

  // Save previous state to unified history when icons, colors, or barriers change (but not during undo operations)
  useEffect(() => {
    // Skip saving to history if we're currently undoing
    if (isUndoingRef.current) {
      isUndoingRef.current = false; // Reset the flag
      prevHexIconsRef.current = { ...hexIcons }; // Update refs to current state
      prevHexColorsRef.current = { ...hexColors };
      prevBarriersRef.current = { ...barriers };
      return;
    }
    
    const prevIconState = prevHexIconsRef.current;
    const prevColorState = prevHexColorsRef.current;
    const prevBarrierState = prevBarriersRef.current;
    const currentIconState = hexIcons;
    const currentColorState = hexColors;
    const currentBarrierState = barriers;
    
    // Check what changed
    const iconsChanged = JSON.stringify(prevIconState) !== JSON.stringify(currentIconState);
    const colorsChanged = JSON.stringify(prevColorState) !== JSON.stringify(currentColorState);
    const barriersChanged = JSON.stringify(prevBarrierState) !== JSON.stringify(currentBarrierState);
    
    // Only save to history if something actually changed and it's not the initial state
    if (iconsChanged || colorsChanged || barriersChanged) {
      const hasInitialState = Object.keys(prevIconState).length > 0 || Object.keys(prevColorState).length > 0 || Object.keys(prevBarrierState).length > 0;
      
      if (hasInitialState) {
        const historyEntry: HistoryEntry = {
          iconState: { ...prevIconState },
          colorState: { ...prevColorState },
          barrierState: { ...prevBarrierState },
          changedType: iconsChanged ? 'icons' : colorsChanged ? 'colors' : 'barriers'
        };
        
        setUnifiedHistory(prev => [...prev.slice(-99), historyEntry]); // Keep last 100 states
      }
    }
    
    // Update the refs to current state for next comparison
    prevHexIconsRef.current = { ...currentIconState };
    prevHexColorsRef.current = { ...currentColorState };
    prevBarriersRef.current = { ...currentBarrierState };
  }, [hexIcons, hexColors, barriers]);

  // Load grid from URL on mount (only once) when encoding map is ready
  useEffect(() => {
    if (!encodingMap) return;
    
    const currentPath = window.location.pathname;
    const encoded = parseGridUrl(currentPath);
    
    if (encoded && isValidGridEncoding(encoded)) {
      const decodedAssetItems = decodeUrlToGrid(encoded, gridWidth, gridHeight, encodingMap);
      
      // Convert AssetItems to HexTexture format
      const hexTextureColors: HexColorsMap = {};
      Object.entries(decodedAssetItems).forEach(([key, assetItem]) => {
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
      setHexColorsVersion(prev => prev + 1);
      
      // Clear the URL after loading the grid (go back to clean URL)
      window.history.replaceState({}, '', '/');
    }
  }, [encodingMap]); // Only run when encodingMap is first available

  const paintHex = useCallback((row: number, col: number): void => {
    const hexKey = `${row}-${col}`;
    
    // Handle eraser logic (works in both tabs)
    if (selectedIcon?.name === 'eraser') {
      // Priority 1: Remove icon if it exists
      if (hexIcons[hexKey]) {
        setHexIcons(prev => {
          const newIcons = { ...prev };
          delete newIcons[hexKey];
          return newIcons;
        });
        setHexIconsVersion(prev => prev + 1);
        return; // Exit early after removing icon
      }
      
      // Priority 2: Remove texture if it exists and is not default
      const currentTexture = hexColors[hexKey];
      if (currentTexture && currentTexture !== DEFAULT_COLORS.SELECTED) {
        // Check if it's a non-default texture/color
        const isNonDefault = typeof currentTexture === 'object' || 
                           (typeof currentTexture === 'string' && currentTexture !== DEFAULT_COLORS.SELECTED);
        
        if (isNonDefault) {
          setHexColors(prev => {
            const newColors = { ...prev };
            delete newColors[hexKey]; // Remove the texture, will fall back to default
            return newColors;
          });
          setHexColorsVersion(prev => prev + 1);
        }
      }
      
      // Priority 3: Do nothing if tile is empty (no icon and default/no texture)
      return;
    }
    
    if (activeTab === 'icons') {
      // Handle icon placement (not eraser)
      if (selectedIcon) {
        setHexIcons(prev => ({
          ...prev,
          [hexKey]: selectedIcon
        }));
        setHexIconsVersion(prev => prev + 1);
      }
    } else {
      // Paint mode - use selectedTexture if available, otherwise fall back to selectedColor
      let textureToUse: HexTexture | null = selectedTexture;
      
      if (!textureToUse) {
        // Create a color texture from selectedColor
        const colorData: Color | undefined = COLORS.find(c => c.name === selectedColor);
        if (colorData) {
          textureToUse = { 
            type: 'color', 
            name: selectedColor, 
            displayName: selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1),
            rgb: colorData.rgb
          };
        } else {
          // Fallback for grey or unknown colors
          textureToUse = { 
            type: 'color', 
            name: selectedColor, 
            displayName: selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1),
            rgb: DEFAULT_COLORS.GREY_RGB
          };
        }
      }
      
      setHexColors(prev => ({
        ...prev,
        [hexKey]: textureToUse!
      }));
      setHexColorsVersion(prev => prev + 1);
    }
    
    // Note: Barrier placement now handled by placeBarrier function via onEdgeClick
  }, [selectedColor, selectedTexture, selectedIcon, activeTab, hexIcons, hexColors]);

  // Handle placing a single barrier on a specific edge
  const placeBarrier = useCallback((fromHex: string, toHex: string): void => {
    // Only place barriers when in barriers mode
    if (activeTab !== 'barriers') {
      return;
    }
    
    const newBarriers: BarriersMap = { ...barriers };
    
    // Normalize edge key to always use consistent ordering (smaller coordinate first)
    const [fromRow, fromCol] = fromHex.split('-').map(Number);
    const [toRow, toCol] = toHex.split('-').map(Number);
    
    let normalizedFromHex = fromHex;
    let normalizedToHex = toHex;
    
    // Sort by row first, then by column for consistent edge keys
    if (fromRow > toRow || (fromRow === toRow && fromCol > toCol)) {
      normalizedFromHex = toHex;
      normalizedToHex = fromHex;
    }
    
    const normalizedEdgeKey = `${normalizedFromHex}_${normalizedToHex}`;
    
    // Check if barrier already exists
    if (newBarriers[normalizedEdgeKey]) {
      // Remove existing barrier
      delete newBarriers[normalizedEdgeKey];
    } else {
      // Add new barrier using normalized key
      newBarriers[normalizedEdgeKey] = {
        fromHex: normalizedFromHex,
        toHex: normalizedToHex,
        color: selectedBarrierColor
      };
    }
    
    // Update barriers state
    setBarriers(newBarriers);
    setBarriersVersion(prev => prev + 1);
  }, [activeTab, barriers, selectedBarrierColor]);

  const clearGrid = useCallback((): void => {
    // Set all hexes to default grey instead of clearing them
    const greyColors: HexColorsMap = {};
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        greyColors[`${row}-${col}`] = DEFAULT_COLORS.SELECTED; // Keep as string since getHexagonStyle handles this special case
      }
    }
    setHexColors(greyColors);
    setHexColorsVersion(prev => prev + 1);
    
    // Also clear all icons, barriers, and unified history
    setHexIcons({});
    setBarriers({});
    setUnifiedHistory([]);
    setHexIconsVersion(prev => prev + 1);
    setBarriersVersion(prev => prev + 1);
  }, [gridWidth, gridHeight]);

  const getHexColor = useCallback((row: number, col: number): HexColor | HexTexture | undefined => {
    const hexKey = `${row}-${col}`;
    return hexColors[hexKey];
  }, [hexColors]);

  const getHexIcon = useCallback((row: number, col: number): IconItem | undefined => {
    const hexKey = `${row}-${col}`;
    return hexIcons[hexKey];
  }, [hexIcons]);



  const handleTextureSelect = useCallback((texture: ColorItem | TextureItem): void => {
    const hexTexture: HexTexture = {
      type: texture.type,
      name: texture.name,
      displayName: texture.displayName,
      ...(texture.type === 'color' && { rgb: (texture as ColorItem).rgb }),
      ...(texture.type === 'texture' && { path: (texture as TextureItem).path })
    };
    
    setSelectedTexture(hexTexture);
    if (texture.type === 'color') {
      setSelectedColor(texture.name);
    }
    
    // Clear eraser state when selecting a texture
    setSelectedIcon(null);
  }, []);

  const handleIconSelect = useCallback((icon: IconItem): void => {
    setSelectedIcon(icon);
  }, []);

  const handleUndo = useCallback((): void => {
    if (unifiedHistory.length > 0) {
      const previousEntry = unifiedHistory[unifiedHistory.length - 1];
      const newHistory = unifiedHistory.slice(0, -1);
      
      // Set flag to prevent useEffect from saving this state change to history
      isUndoingRef.current = true;
      
      // Restore icon, color, and barrier states from the history entry
      setHexIcons(previousEntry.iconState);
      setHexColors(previousEntry.colorState);
      setBarriers(previousEntry.barrierState);
      setUnifiedHistory(newHistory);
      
      // Update version counters to trigger re-renders
      setHexIconsVersion(prev => prev + 1);
      setHexColorsVersion(prev => prev + 1);
      setBarriersVersion(prev => prev + 1);
    }
  }, [unifiedHistory]);

  const hasUndoHistory = useCallback((): boolean => {
    return unifiedHistory.length > 0;
  }, [unifiedHistory.length]);

  // Handlers for the new modular components
  const handleMenuToggle = useCallback((): void => {
    setMenuOpen(!menuOpen);
  }, [menuOpen]);

  const handleTabChange = useCallback((tab: 'paint' | 'icons' | 'barriers'): void => {
    setActiveTab(tab);
    // Clear eraser state when switching to paint tab
    if (tab === 'paint' && selectedIcon?.name === 'eraser') {
      setSelectedIcon(null);
    }
  }, [selectedIcon]);

  const handleEraserToggle = useCallback((): void => {
    // Toggle eraser - deselect if already selected, select if not
    if (selectedIcon?.name === 'eraser') {
      setSelectedIcon(null);
    } else {
      handleIconSelect({ name: 'eraser', displayName: 'Eraser', type: 'icon', path: '' } as IconItem);
    }
  }, [selectedIcon, handleIconSelect]);

  const handleExportPNG = useCallback(async (): Promise<void> => {
    if (hexGridRef.current && !isExporting) {
      try {
        setIsExporting(true);
        const timestamp = new Date().toISOString().slice(GRID_CONFIG.TIMESTAMP_SLICE_START, GRID_CONFIG.TIMESTAMP_SLICE_END).replace(/[:.]/g, '-');
        const filename = `${GRID_CONFIG.EXPORT_FILENAME_PREFIX}-${gridWidth}x${gridHeight}-${timestamp}`;
        await hexGridRef.current.exportAsPNG(filename, GRID_CONFIG.HIGH_QUALITY_EXPORT_SCALE); // High quality resolution for export
      } catch (error) {
        console.error('Failed to export PNG:', error);
      } finally {
        setIsExporting(false);
      }
    }
  }, [gridWidth, gridHeight, isExporting]);

  const handleCopyUrl = useCallback(async (): Promise<void> => {
    if (!encodingMap) return;
    
    try {
      // Convert HexColorsMap to the format expected by the encoder
      const assetItemColors: Record<string, AssetItem> = {};
      Object.entries(hexColors).forEach(([key, value]) => {
        if (typeof value === 'object' && 'name' in value) {
          // Find matching AssetItem from PAINT_OPTIONS
          const matchingAsset = PAINT_OPTIONS.find(option => option.name === value.name);
          if (matchingAsset) {
            assetItemColors[key] = matchingAsset;
          }
        }
      });
      
      const gridState = { gridWidth, gridHeight, hexColors: assetItemColors };
      const encodedPath = generateGridUrl(gridState, encodingMap);
      const shareUrl = `${window.location.origin}${encodedPath}`;
      
      await navigator.clipboard.writeText(shareUrl);
      console.log('Share URL copied to clipboard:', shareUrl);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }, [encodingMap, hexColors, gridWidth, gridHeight]);

  return (
    <div className="App" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Top Right Corner Links */}
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
          selectedBarrierColor={selectedBarrierColor}
          onBarrierColorSelect={setSelectedBarrierColor}
        />
      </div>
      
      {/* Main Grid Area */}
      <div style={{
        width: '100vw', // Always full viewport width
        height: 'calc(100vh - 80px)', // Account for bottom menu height
        position: 'fixed', // Fixed positioning to avoid container size changes
        top: 0,
        left: 0,
        zIndex: 1, // Ensure it's behind the menu
        pointerEvents: 'auto'
      }}>
        <HexGrid 
          ref={hexGridRef}
          gridWidth={gridWidth} 
          gridHeight={gridHeight}
          colors={COLORS}
          onHexClick={paintHex}
          onEdgeClick={placeBarrier}
          getHexColor={getHexColor}
          getHexIcon={getHexIcon}
          hexColorsVersion={hexColorsVersion}
          hexIconsVersion={hexIconsVersion}
          backgroundColor={selectedBackgroundColor}
          barriers={barriers}
          barriersVersion={barriersVersion}
        />
      </div>

      {/* Bottom Action Menu */}
      <BottomActionMenu
        selectedIcon={selectedIcon}
        isExporting={isExporting}
        hasUndoHistory={hasUndoHistory()}
        onCopyUrl={handleCopyUrl}
        onExportPNG={handleExportPNG}
        onEraserToggle={handleEraserToggle}
        onUndo={handleUndo}
        onClearGrid={clearGrid}
      />
    </div>
  );
};

export default HexGridApp; 