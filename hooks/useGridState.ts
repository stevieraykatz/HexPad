import { useState, useCallback, useRef, useEffect } from 'react';
import type { IconItem, HexTexture } from '../components/config';
import { GRID_CONFIG, DEFAULT_COLORS, COLORS } from '../components/config';

// Type definitions for hex colors and textures
type HexColor = string;
type HexColorsMap = Record<string, HexColor | HexTexture>;

// Border placement between hex tiles
interface BorderEdge {
  fromHex: string; // hex key "row-col"
  toHex: string;   // hex key "row-col" 
  color: string;   // hex color string
}

type BordersMap = Record<string, BorderEdge>; // key format: "fromRow-fromCol_toRow-toCol"

// Unified history entry that captures all state
interface HistoryEntry {
  iconState: Record<string, IconItem>;
  colorState: HexColorsMap;
  borderState: BordersMap;
  changedType: 'icons' | 'colors' | 'borders'; // What actually changed in this entry
}

interface UseGridStateProps {
  selectedColor: string;
  selectedTexture: HexTexture | null;
  selectedIcon: IconItem | null;
  selectedBorderColor: string;
  activeTab: 'paint' | 'icons' | 'borders';
}

interface UseGridStateReturn {
  // State
  gridWidth: number;
  gridHeight: number;
  hexColors: HexColorsMap;
  hexIcons: Record<string, IconItem>;
  borders: BordersMap;
  hexColorsVersion: number;
  hexIconsVersion: number;
  bordersVersion: number;
  unifiedHistory: HistoryEntry[];
  
  // Setters
  setGridWidth: (width: number) => void;
  setGridHeight: (height: number) => void;
  setHexColors: (colors: HexColorsMap) => void;
  setHexIcons: (icons: Record<string, IconItem>) => void;
  setBorders: (borders: BordersMap) => void;
  
  // Operations
  paintHex: (row: number, col: number) => void;
  placeBorder: (fromHex: string, toHex: string) => void;
  clearGrid: () => void;
  
  // Helpers
  getHexColor: (row: number, col: number) => HexColor | HexTexture | undefined;
  getHexIcon: (row: number, col: number) => IconItem | undefined;
  hasUndoHistory: () => boolean;
  handleUndo: () => void;
  
  // Refs for external use
  isUndoingRef: React.MutableRefObject<boolean>;
}

export function useGridState({
  selectedColor,
  selectedTexture,
  selectedIcon,
  selectedBorderColor,
  activeTab
}: UseGridStateProps): UseGridStateReturn {
  
  // Core grid state
  const [gridWidth, setGridWidth] = useState<number>(GRID_CONFIG.DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState<number>(GRID_CONFIG.DEFAULT_HEIGHT);
  const [hexColors, setHexColors] = useState<HexColorsMap>({});
  const [hexIcons, setHexIcons] = useState<Record<string, IconItem>>({});
  const [borders, setBorders] = useState<BordersMap>({});
  
  // Version counters for triggering re-renders
  const [hexColorsVersion, setHexColorsVersion] = useState<number>(0);
  const [hexIconsVersion, setHexIconsVersion] = useState<number>(0);
  const [bordersVersion, setBordersVersion] = useState<number>(0);
  
  // History management
  const [unifiedHistory, setUnifiedHistory] = useState<HistoryEntry[]>([]);
  
  // Track previous state for undo functionality
  const prevHexIconsRef = useRef<Record<string, IconItem>>({});
  const prevHexColorsRef = useRef<HexColorsMap>({});
  const prevBordersRef = useRef<BordersMap>({});
  const isUndoingRef = useRef<boolean>(false);

  // Save previous state to unified history when icons, colors, or borders change (but not during undo operations)
  useEffect(() => {
    // Skip saving to history if we're currently undoing
    if (isUndoingRef.current) {
      isUndoingRef.current = false; // Reset the flag
      prevHexIconsRef.current = { ...hexIcons }; // Update refs to current state
      prevHexColorsRef.current = { ...hexColors };
      prevBordersRef.current = { ...borders };
      return;
    }
    
    const prevIconState = prevHexIconsRef.current;
    const prevColorState = prevHexColorsRef.current;
    const prevBorderState = prevBordersRef.current;
    const currentIconState = hexIcons;
    const currentColorState = hexColors;
    const currentBorderState = borders;
    
    // Check what changed
    const iconsChanged = JSON.stringify(prevIconState) !== JSON.stringify(currentIconState);
    const colorsChanged = JSON.stringify(prevColorState) !== JSON.stringify(currentColorState);
    const bordersChanged = JSON.stringify(prevBorderState) !== JSON.stringify(currentBorderState);
    
    // Only save to history if something actually changed and it's not the initial state
    if (iconsChanged || colorsChanged || bordersChanged) {
      const hasInitialState = Object.keys(prevIconState).length > 0 || Object.keys(prevColorState).length > 0 || Object.keys(prevBorderState).length > 0;
      
      if (hasInitialState) {
        const historyEntry: HistoryEntry = {
          iconState: { ...prevIconState },
          colorState: { ...prevColorState },
          borderState: { ...prevBorderState },
          changedType: iconsChanged ? 'icons' : colorsChanged ? 'colors' : 'borders'
        };
        
        setUnifiedHistory(prev => [...prev.slice(-99), historyEntry]); // Keep last 100 states
      }
    }
    
    // Update the refs to current state for next comparison
    prevHexIconsRef.current = { ...currentIconState };
    prevHexColorsRef.current = { ...currentColorState };
    prevBordersRef.current = { ...currentBorderState };
  }, [hexIcons, hexColors, borders]);

  // Paint hex operation
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
        const colorData = COLORS.find(c => c.name === selectedColor);
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
  }, [selectedColor, selectedTexture, selectedIcon, activeTab, hexIcons, hexColors]);

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
    // Set all hexes to default grey instead of clearing them
    const greyColors: HexColorsMap = {};
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        greyColors[`${row}-${col}`] = DEFAULT_COLORS.SELECTED; // Keep as string since getHexagonStyle handles this special case
      }
    }
    setHexColors(greyColors);
    setHexColorsVersion(prev => prev + 1);
    
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

  const getHexIcon = useCallback((row: number, col: number): IconItem | undefined => {
    const hexKey = `${row}-${col}`;
    return hexIcons[hexKey];
  }, [hexIcons]);

  const hasUndoHistory = useCallback((): boolean => {
    return unifiedHistory.length > 0;
  }, [unifiedHistory.length]);

  const handleUndo = useCallback((): void => {
    if (unifiedHistory.length > 0) {
      const previousEntry = unifiedHistory[unifiedHistory.length - 1];
      const newHistory = unifiedHistory.slice(0, -1);
      
      // Set flag to prevent useEffect from saving this state change to history
      isUndoingRef.current = true;
      
      // Restore icon, color, and border states from the history entry
      setHexIcons(previousEntry.iconState);
      setHexColors(previousEntry.colorState);
      setBorders(previousEntry.borderState);
      setUnifiedHistory(newHistory);
      
      // Update version counters to trigger re-renders
      setHexIconsVersion(prev => prev + 1);
      setHexColorsVersion(prev => prev + 1);
      setBordersVersion(prev => prev + 1);
    }
  }, [unifiedHistory]);

  return {
    // State
    gridWidth,
    gridHeight,
    hexColors,
    hexIcons,
    borders,
    hexColorsVersion,
    hexIconsVersion,
    bordersVersion,
    unifiedHistory,
    
    // Setters
    setGridWidth,
    setGridHeight,
    setHexColors,
    setHexIcons,
    setBorders,
    
    // Operations
    paintHex,
    placeBorder,
    clearGrid,
    
    // Helpers
    getHexColor,
    getHexIcon,
    hasUndoHistory,
    handleUndo,
    
    // Refs for external use
    isUndoingRef
  };
} 