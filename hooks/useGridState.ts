import { useState, useCallback, useRef, useEffect } from 'react';
import type { IconItem, HexTexture } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import { GRID_CONFIG, DEFAULT_COLORS } from '../components/config';

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
  iconState: Record<string, ColoredIcon>;
  colorState: HexColorsMap;
  borderState: BordersMap;
  changedType: 'icons' | 'colors' | 'borders'; // What actually changed in this entry
}

interface UseGridStateProps {
  selectedColor: string;
  selectedTexture: HexTexture | null;
  selectedIcon: IconItem | null;
  selectedIconColor: string;
  selectedBorderColor: string;
  activeTab: 'paint' | 'icons' | 'borders' | 'settings';
  onPaintStart?: () => void; // Optional callback for when painting starts
}

interface UseGridStateReturn {
  // State
  gridWidth: number;
  gridHeight: number;
  hexColors: HexColorsMap;
  hexIcons: Record<string, ColoredIcon>;
  borders: BordersMap;
  hexColorsVersion: number;
  hexIconsVersion: number;
  bordersVersion: number;
  unifiedHistory: HistoryEntry[];
  
  // Setters
  setGridWidth: (width: number) => void;
  setGridHeight: (height: number) => void;
  setHexColors: (colors: HexColorsMap) => void;
  setHexIcons: (icons: Record<string, ColoredIcon>) => void;
  setBorders: (borders: BordersMap) => void;
  
  // Operations
  paintHex: (row: number, col: number) => void;
  placeBorder: (fromHex: string, toHex: string) => void;
  clearGrid: () => void;
  
  // Helpers
  getHexColor: (row: number, col: number) => HexColor | HexTexture | undefined;
  getHexIcon: (row: number, col: number) => ColoredIcon | undefined;
  hasUndoHistory: () => boolean;
  handleUndo: () => void;
  
  // Refs for external use
  isUndoingRef: React.MutableRefObject<boolean>;
}

export function useGridState({
  selectedColor,
  selectedTexture,
  selectedIcon,
  selectedIconColor,
  selectedBorderColor,
  activeTab,
  onPaintStart
}: UseGridStateProps): UseGridStateReturn {
  
  // Core grid state
  const [gridWidth, setGridWidth] = useState<number>(GRID_CONFIG.DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState<number>(GRID_CONFIG.DEFAULT_HEIGHT);
  const [hexColors, setHexColors] = useState<HexColorsMap>({});
  const [hexIcons, setHexIcons] = useState<Record<string, ColoredIcon>>({});
  const [borders, setBorders] = useState<BordersMap>({});
  
  // Version counters for triggering re-renders
  const [hexColorsVersion, setHexColorsVersion] = useState<number>(0);
  const [hexIconsVersion, setHexIconsVersion] = useState<number>(0);
  const [bordersVersion, setBordersVersion] = useState<number>(0);
  
  // History management
  const [unifiedHistory, setUnifiedHistory] = useState<HistoryEntry[]>([]);
  
  // Track previous state for undo functionality
  const prevHexIconsRef = useRef<Record<string, ColoredIcon>>({});
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
            name: '#6B7280', // Default grey hex
            displayName: '#6B7280',
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
  }, [selectedColor, selectedTexture, selectedIcon, selectedIconColor, activeTab, hexIcons, hexColors, onPaintStart]);

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

  const getHexIcon = useCallback((row: number, col: number): ColoredIcon | undefined => {
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