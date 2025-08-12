import { useState, useCallback, useRef, useEffect } from 'react';
import type { IconItem, HexTexture } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import { GRID_CONFIG, DEFAULT_COLORS } from '../components/config';
import { useRegionState } from './useRegionState';
import { useRegionBorders } from './useRegionBorders';
import type { RegionMap } from '../utils/regionUtils';

// Type definitions for hex colors and textures
type HexColor = string;
type HexColorsMap = Record<string, HexColor | HexTexture>;
type HexBackgroundColorsMap = Record<string, HexColor>; // Background colors are always solid colors

// Border placement between hex tiles
interface BorderEdge {
  fromHex: string; // hex key "row-col"
  toHex: string;   // hex key "row-col" 
  color: string;   // hex color string
}

type BordersMap = Record<string, BorderEdge>; // key format: "fromRow-fromCol_toRow-toCol"

// Unified history entry that captures all state
interface HistoryEntry {
  iconState: Record<string, ColoredIcon>;
  colorState: HexColorsMap;
  backgroundColorState: HexBackgroundColorsMap;
  borderState: BordersMap;
  changedType: 'icons' | 'colors' | 'backgrounds' | 'borders'; // What actually changed in this entry
}

interface UseGridStateProps {
  selectedColor: string;
  selectedTexture: HexTexture | null;
  selectedIcon: IconItem | null;
  selectedIconColor: string;
  selectedBorderColor: string;
  selectedBackgroundColor: string;
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  onPaintStart?: () => void; // Optional callback for when painting starts
  enableRegions?: boolean; // Enable region tracking (default: true)
  enableRegionBorders?: boolean; // Enable region border functionality (default: true)
}

interface UseGridStateReturn {
  // State
  gridWidth: number;
  gridHeight: number;
  hexColors: HexColorsMap;
  hexBackgroundColors: HexBackgroundColorsMap;
  hexIcons: Record<string, ColoredIcon>;
  borders: BordersMap;
  hexColorsVersion: number;
  hexBackgroundColorsVersion: number;
  hexIconsVersion: number;
  bordersVersion: number;
  unifiedHistory: HistoryEntry[];
  
  // Region state
  regionMap: RegionMap;
  regionStats: {
    totalRegions: number;
    regionsByTerrain: Record<string, number>;
    averageRegionSize: number;
    largestRegion: { id: string; size: number; terrainType: string } | null;
  };
  
  // Setters
  setGridWidth: (width: number) => void;
  setGridHeight: (height: number) => void;
  setHexColors: (colors: HexColorsMap) => void;
  setHexBackgroundColors: (colors: HexBackgroundColorsMap) => void;
  setHexIcons: (icons: Record<string, ColoredIcon>) => void;
  setBorders: (borders: BordersMap) => void;
  
  // Operations
  paintHex: (row: number, col: number) => void;
  paintBackgroundHex: (row: number, col: number) => void;
  placeBorder: (fromHex: string, toHex: string) => void;
  clearGrid: () => void;
  
  // Helpers
  getHexColor: (row: number, col: number) => HexColor | HexTexture | undefined;
  getHexBackgroundColor: (row: number, col: number) => HexColor | undefined;
  getHexIcon: (row: number, col: number) => ColoredIcon | undefined;
  hasUndoHistory: () => boolean;
  handleUndo: () => void;
  
  // Region helpers
  getRegionForHex: (hexCoord: string) => string | null;
  getRegionData: (regionId: string) => any;
  rebuildAllRegions: () => void;
  
  // Region border functionality
  hoveredRegion: string | null;
  setHoveredRegion: (regionId: string | null) => void;
  applyRegionBorders: (regionId: string) => Promise<void>;
  canApplyRegionBorders: (regionId: string) => boolean;
  
  // Refs for external use
  isUndoingRef: React.MutableRefObject<boolean>;
}

export function useGridState({
  selectedColor,
  selectedTexture,
  selectedIcon,
  selectedIconColor,
  selectedBorderColor,
  selectedBackgroundColor,
  activeTab,
  onPaintStart,
  enableRegions = true,
  enableRegionBorders = true
}: UseGridStateProps): UseGridStateReturn {
  
  // Core grid state
  const [gridWidth, setGridWidth] = useState<number>(GRID_CONFIG.DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState<number>(GRID_CONFIG.DEFAULT_HEIGHT);
  const [hexColors, setHexColors] = useState<HexColorsMap>({});
  const [hexBackgroundColors, setHexBackgroundColors] = useState<HexBackgroundColorsMap>({});
  const [hexIcons, setHexIcons] = useState<Record<string, ColoredIcon>>({});
  const [borders, setBorders] = useState<BordersMap>({});
  
  // Region state management
  const {
    regionMap,
    regionStats,
    updateRegionsForHexChange,
    rebuildAllRegions,
    getRegionForHex,
    getRegionData
  } = useRegionState({
    hexColors,
    gridWidth,
    gridHeight,
    enabled: enableRegions
  });
  
  // Region border management
  const {
    hoveredRegion,
    setHoveredRegion,
    applyRegionBorders: applyBorders,
    canApplyBorders
  } = useRegionBorders({
    regionMap,
    hexColors,
    gridWidth,
    gridHeight,
    enabled: enableRegionBorders && enableRegions
  });
  
  // Version counters for triggering re-renders
  const [hexColorsVersion, setHexColorsVersion] = useState<number>(0);
  const [hexBackgroundColorsVersion, setHexBackgroundColorsVersion] = useState<number>(0);
  const [hexIconsVersion, setHexIconsVersion] = useState<number>(0);
  const [bordersVersion, setBordersVersion] = useState<number>(0);
  
  // History management
  const [unifiedHistory, setUnifiedHistory] = useState<HistoryEntry[]>([]);
  
  // Track previous state for undo functionality
  const prevHexIconsRef = useRef<Record<string, ColoredIcon>>({});
  const prevHexColorsRef = useRef<HexColorsMap>({});
  const prevHexBackgroundColorsRef = useRef<HexBackgroundColorsMap>({});
  const prevBordersRef = useRef<BordersMap>({});
  const isUndoingRef = useRef<boolean>(false);

  // Save previous state to unified history when icons, colors, background colors, or borders change (but not during undo operations)
  useEffect(() => {
    // Skip saving to history if we're currently undoing
    if (isUndoingRef.current) {
      isUndoingRef.current = false; // Reset the flag
      prevHexIconsRef.current = { ...hexIcons }; // Update refs to current state
      prevHexColorsRef.current = { ...hexColors };
      prevHexBackgroundColorsRef.current = { ...hexBackgroundColors };
      prevBordersRef.current = { ...borders };
      return;
    }
    
    const prevIconState = prevHexIconsRef.current;
    const prevColorState = prevHexColorsRef.current;
    const prevBackgroundColorState = prevHexBackgroundColorsRef.current;
    const prevBorderState = prevBordersRef.current;
    const currentIconState = hexIcons;
    const currentColorState = hexColors;
    const currentBackgroundColorState = hexBackgroundColors;
    const currentBorderState = borders;
    
    // Check what changed
    const iconsChanged = JSON.stringify(prevIconState) !== JSON.stringify(currentIconState);
    const colorsChanged = JSON.stringify(prevColorState) !== JSON.stringify(currentColorState);
    const backgroundColorsChanged = JSON.stringify(prevBackgroundColorState) !== JSON.stringify(currentBackgroundColorState);
    const bordersChanged = JSON.stringify(prevBorderState) !== JSON.stringify(currentBorderState);
    
    // Only save to history if something actually changed and it's not the initial state
    if (iconsChanged || colorsChanged || backgroundColorsChanged || bordersChanged) {
      const hasInitialState = Object.keys(prevIconState).length > 0 || Object.keys(prevColorState).length > 0 || Object.keys(prevBackgroundColorState).length > 0 || Object.keys(prevBorderState).length > 0;
      
      if (hasInitialState) {
        const historyEntry: HistoryEntry = {
          iconState: { ...prevIconState },
          colorState: { ...prevColorState },
          backgroundColorState: { ...prevBackgroundColorState },
          borderState: { ...prevBorderState },
          changedType: iconsChanged ? 'icons' : colorsChanged ? 'colors' : backgroundColorsChanged ? 'backgrounds' : 'borders'
        };
        
        setUnifiedHistory(prev => [...prev.slice(-99), historyEntry]); // Keep last 100 states
      }
    }
    
    // Update the refs to current state for next comparison
    prevHexIconsRef.current = { ...currentIconState };
    prevHexColorsRef.current = { ...currentColorState };
    prevHexBackgroundColorsRef.current = { ...currentBackgroundColorState };
    prevBordersRef.current = { ...currentBorderState };
  }, [hexIcons, hexColors, hexBackgroundColors, borders]);

  // Paint hex operation
  const paintHex = useCallback((row: number, col: number): void => {
    const hexKey = `${row}-${col}`;
    
    // Capture old value for region updates
    const oldValue = hexColors[hexKey];
    
    // Trigger paint start callback for auto-minimize functionality
    if (onPaintStart) {
      onPaintStart();
    }
    
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
      
      // Priority 2: Remove texture/asset if it exists
      const currentTexture = hexColors[hexKey];
      if (currentTexture) {
        setHexColors(prev => {
          const newColors = { ...prev };
          delete newColors[hexKey]; // Remove the texture, will fall back to default
          return newColors;
        });
        setHexColorsVersion(prev => prev + 1);
        
        // Update regions for eraser removing texture
        updateRegionsForHexChange(hexKey, oldValue, undefined);
        return; // Exit early after removing texture
      }
      
      // Priority 3: Remove background color if it exists
      const currentBackground = hexBackgroundColors[hexKey];
      if (currentBackground) {
        setHexBackgroundColors(prev => {
          const newBackgroundColors = { ...prev };
          delete newBackgroundColors[hexKey];
          return newBackgroundColors;
        });
        setHexBackgroundColorsVersion(prev => prev + 1);
        return; // Exit early after removing background
      }
      
      // Priority 4: Borders are erased via placeBorder function when in borders tab
      return;
    }
    
    if (activeTab === 'icons') {
      // Handle icon placement (not eraser)
      if (selectedIcon) {
        setHexIcons(prev => ({
          ...prev,
          [hexKey]: { icon: selectedIcon, color: selectedIconColor }
        }));
        setHexIconsVersion(prev => prev + 1);
      }
    } else {
      // Paint mode - use selectedTexture if available, otherwise fall back to selectedColor
      let textureToUse: HexTexture | null = selectedTexture;
      
      if (!textureToUse) {
        // Create a color texture from selectedColor (hex string)
        // Convert hex color to RGB values (0-255 range for proper rendering)
        const hexToRgb = (hex: string): [number, number, number] => {
          // Handle non-hex strings
          if (!hex.startsWith('#')) {
            throw new Error('Not a hex color');
          }
          
          const cleanHex = hex.replace('#', '');
          if (cleanHex.length !== 6) {
            throw new Error('Invalid hex length');
          }
          
          const r = parseInt(cleanHex.slice(0, 2), 16);
          const g = parseInt(cleanHex.slice(2, 4), 16);
          const b = parseInt(cleanHex.slice(4, 6), 16);
          
          // Validate RGB values
          if (isNaN(r) || isNaN(g) || isNaN(b)) {
            throw new Error('Invalid hex values');
          }
          
          // Convert to WebGL 0-1 range by dividing by 255
          return [r / 255, g / 255, b / 255];
        };

        try {
          const rgb = hexToRgb(selectedColor);
          textureToUse = { 
            type: 'color', 
            name: selectedColor, 
            displayName: selectedColor.toUpperCase(),
            rgb: rgb
          };
        } catch (error) {
          console.warn('Failed to parse color:', selectedColor, error);
          // Fallback for invalid hex colors
          textureToUse = { 
            type: 'color', 
            name: '#F3E8C2', // Default manila hex
            displayName: '#F3E8C2',
            rgb: DEFAULT_COLORS.DEFAULT_RGB
          };
        }
      }
      
      const newValue = textureToUse!;
      setHexColors(prev => ({
        ...prev,
        [hexKey]: newValue
      }));
      setHexColorsVersion(prev => prev + 1);
      
      // Automatically apply the background color when placing terrain
      setHexBackgroundColors(prev => ({
        ...prev,
        [hexKey]: selectedBackgroundColor
      }));
      setHexBackgroundColorsVersion(prev => prev + 1);
      
      // Update regions for new texture/color
      updateRegionsForHexChange(hexKey, oldValue, newValue);
    }
  }, [selectedColor, selectedTexture, selectedIcon, selectedIconColor, selectedBackgroundColor, activeTab, hexIcons, hexColors, hexBackgroundColors, onPaintStart, updateRegionsForHexChange]);

  // Paint background hex operation
  const paintBackgroundHex = useCallback((row: number, col: number): void => {
    const hexKey = `${row}-${col}`;
    
    // Handle background color painting
    setHexBackgroundColors(prev => ({
      ...prev,
      [hexKey]: selectedBackgroundColor
    }));
    setHexBackgroundColorsVersion(prev => prev + 1);
  }, [selectedBackgroundColor]);

  // Place border operation
  const placeBorder = useCallback((fromHex: string, toHex: string): void => {
    // Only place borders when in borders mode and not using eraser
    if (activeTab !== 'borders') {
      return;
    }
    
    // Handle eraser mode for borders
    if (selectedIcon?.name === 'eraser') {
      const newBorders: BordersMap = { ...borders };
      
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
      
      // Remove border if it exists
      if (newBorders[normalizedEdgeKey]) {
        delete newBorders[normalizedEdgeKey];
        
        // Update borders state
        setBorders(newBorders);
        setBordersVersion(prev => prev + 1);
      }
      
      return;
    }
    
    const newBorders: BordersMap = { ...borders };
    
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
    
    // Only add border if it doesn't exist (no toggle, only add)
    if (!newBorders[normalizedEdgeKey]) {
      newBorders[normalizedEdgeKey] = {
        fromHex: normalizedFromHex,
        toHex: normalizedToHex,
        color: selectedBorderColor
      };
      
      // Update borders state
      setBorders(newBorders);
      setBordersVersion(prev => prev + 1);
    }
  }, [activeTab, borders, selectedBorderColor, selectedIcon]);

  // Clear grid operation
  const clearGrid = useCallback((): void => {
    // Clear main texture layer completely
    setHexColors({});
    setHexColorsVersion(prev => prev + 1);
    
    // Set all hexes to have manila background colors instead  
    const defaultBackgroundColors: HexBackgroundColorsMap = {};
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        defaultBackgroundColors[`${row}-${col}`] = '#F3E8C2'; // Manila color (243, 232, 194)
      }
    }
    setHexBackgroundColors(defaultBackgroundColors);
    setHexBackgroundColorsVersion(prev => prev + 1);
    
    // Also clear all icons, borders, and unified history
    setHexIcons({});
    setBorders({});
    setUnifiedHistory([]);
    setHexIconsVersion(prev => prev + 1);
    setBordersVersion(prev => prev + 1);
    
    // Note: clearAutosave will be called at component level
  }, [gridWidth, gridHeight]);

  // Helper functions
  const getHexColor = useCallback((row: number, col: number): HexColor | HexTexture | undefined => {
    const hexKey = `${row}-${col}`;
    return hexColors[hexKey];
  }, [hexColors]);

  const getHexIcon = useCallback((row: number, col: number): ColoredIcon | undefined => {
    const hexKey = `${row}-${col}`;
    return hexIcons[hexKey];
  }, [hexIcons]);

  const getHexBackgroundColor = useCallback((row: number, col: number): HexColor | undefined => {
    const hexKey = `${row}-${col}`;
    return hexBackgroundColors[hexKey];
  }, [hexBackgroundColors]);

  const hasUndoHistory = useCallback((): boolean => {
    return unifiedHistory.length > 0;
  }, [unifiedHistory.length]);

  const handleUndo = useCallback((): void => {
    if (unifiedHistory.length > 0) {
      const previousEntry = unifiedHistory[unifiedHistory.length - 1];
      const newHistory = unifiedHistory.slice(0, -1);
      
      // Set flag to prevent useEffect from saving this state change to history
      isUndoingRef.current = true;
      
      // Restore icon, color, background color, and border states from the history entry
      setHexIcons(previousEntry.iconState);
      setHexColors(previousEntry.colorState);
      setHexBackgroundColors(previousEntry.backgroundColorState);
      setBorders(previousEntry.borderState);
      setUnifiedHistory(newHistory);
      
      // Update version counters to trigger re-renders
      setHexIconsVersion(prev => prev + 1);
      setHexColorsVersion(prev => prev + 1);
      setHexBackgroundColorsVersion(prev => prev + 1);
      setBordersVersion(prev => prev + 1);
    }
  }, [unifiedHistory]);

  // Wrapper for applying region borders
  const applyRegionBorders = useCallback(async (regionId: string) => {
    await applyBorders(regionId, (hexCoord: string, texture: HexTexture) => {
      const [row, col] = hexCoord.split('-').map(Number);
      const oldValue = hexColors[hexCoord];
      
      // Update hex colors
      setHexColors(prev => ({
        ...prev,
        [hexCoord]: texture
      }));
      setHexColorsVersion(prev => prev + 1);
      
      // Update regions
      updateRegionsForHexChange(hexCoord, oldValue, texture);
    });
  }, [applyBorders, hexColors, updateRegionsForHexChange]);

  return {
    // State
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
    unifiedHistory,
    
    // Setters
    setGridWidth,
    setGridHeight,
    setHexColors,
    setHexBackgroundColors,
    setHexIcons,
    setBorders,
    
    // Operations
    paintHex,
    paintBackgroundHex,
    placeBorder,
    clearGrid,
    
    // Helpers
    getHexColor,
    getHexBackgroundColor,
    getHexIcon,
    hasUndoHistory,
    handleUndo,
    
    // Region state
    regionMap,
    regionStats,
    
    // Region helpers
    getRegionForHex,
    getRegionData,
    rebuildAllRegions,
    
    // Region border functionality
    hoveredRegion,
    setHoveredRegion,
    applyRegionBorders,
    canApplyRegionBorders: canApplyBorders,
    
    // Refs for external use
    isUndoingRef
  };
} 