import { useCallback, useRef, useEffect } from 'react';
import type { EncodingMap, CompleteGridState } from '../utils/gridEncoding';
import type { AssetItem, TextureItem, IconItem, HexTexture } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import { PAINT_OPTIONS } from '../components/config';
import { generateGridUrl, parseGridUrl, isValidGridEncoding, decodeBase64ToGrid } from '../utils/gridEncoding';

// localStorage key for auto-save
const AUTOSAVE_KEY = 'hexpad_autosave';
const AUTOSAVE_DEBOUNCE_MS = 2000; // Save 2 seconds after last change

type HexColorsMap = Record<string, string | HexTexture>;
type BordersMap = Record<string, { fromHex: string; toHex: string; color: string }>;

interface UseAutoSaveProps {
  encodingMap: EncodingMap | null;
  hexColors: HexColorsMap;
  hexBackgroundColors: Record<string, string>;
  hexIcons: Record<string, ColoredIcon>;
  borders: BordersMap;
  gridWidth: number;
  gridHeight: number;
  selectedBackgroundColor: any; // Grid background color
  isUndoing: boolean;
}

interface UseAutoSaveReturn {
  loadFromLocalStorage: () => { 
    hexColors: HexColorsMap; 
    hexBackgroundColors: Record<string, string>;
    hexIcons: Record<string, ColoredIcon>; 
    borders: BordersMap;
    gridWidth?: number;
    gridHeight?: number;
    selectedBackgroundColor?: any;
  } | null;
  clearAutosave: () => void;
  triggerSave: () => void;
}

export function useAutoSave({
  encodingMap,
  hexColors,
  hexBackgroundColors,
  hexIcons,
  borders,
  gridWidth,
  gridHeight,
  selectedBackgroundColor,
  isUndoing
}: UseAutoSaveProps): UseAutoSaveReturn {
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback((): void => {
    if (!encodingMap) return;
    
    try {
      // Create a comprehensive save state that includes all data
      const saveState = {
        version: '2.0', // Version for future compatibility
        gridWidth,
        gridHeight,
        hexColors, // Save full HexTexture objects with rotations/flips
        hexBackgroundColors,
        hexIcons,
        borders,
        selectedBackgroundColor
      };
      
      // Check if there's actually any content to save
      const hasContent = Object.keys(hexColors).length > 0 || 
                        Object.keys(hexBackgroundColors).length > 0 ||
                        Object.keys(hexIcons).length > 0 || 
                        Object.keys(borders).length > 0;
      
      if (hasContent) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveState));
      } else {
        // Clear autosave if grid is empty
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } catch (error) {
      console.warn('Failed to auto-save to localStorage:', error);
    }
  }, [encodingMap, hexColors, hexBackgroundColors, hexIcons, borders, gridWidth, gridHeight, selectedBackgroundColor]);

  // Debounced save function
  const debouncedSave = useCallback((): void => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [saveToLocalStorage]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): { 
    hexColors: HexColorsMap; 
    hexBackgroundColors: Record<string, string>;
    hexIcons: Record<string, ColoredIcon>; 
    borders: BordersMap;
    gridWidth?: number;
    gridHeight?: number;
    selectedBackgroundColor?: any;
  } | null => {
    if (!encodingMap) return null;
    
    try {
      const savedData = localStorage.getItem(AUTOSAVE_KEY);
      if (savedData) {
        // Try to parse as new JSON format first
        try {
          const saveState = JSON.parse(savedData);
          if (saveState.version === '2.0') {
            // New format with all data
            return {
              hexColors: saveState.hexColors || {},
              hexBackgroundColors: saveState.hexBackgroundColors || {},
              hexIcons: saveState.hexIcons || {},
              borders: saveState.borders || {},
              gridWidth: saveState.gridWidth,
              gridHeight: saveState.gridHeight,
              selectedBackgroundColor: saveState.selectedBackgroundColor
            };
          }
        } catch (jsonError) {
          // Not JSON, try old URL format
        }
        
        // Fallback to old URL-encoded format
        const encoded = parseGridUrl(savedData);
        if (encoded && isValidGridEncoding(encoded)) {
          const decodedGridState = decodeBase64ToGrid(encoded, encodingMap);
          
          if (decodedGridState) {
            return {
              hexColors: decodedGridState.hexColors,
              hexBackgroundColors: {}, // Old format didn't have background colors
              hexIcons: decodedGridState.hexIcons,
              borders: decodedGridState.borders,
              gridWidth: decodedGridState.gridWidth,
              gridHeight: decodedGridState.gridHeight
            };
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      // Clear invalid autosave data
      localStorage.removeItem(AUTOSAVE_KEY);
    }
    return null;
  }, [encodingMap]);

  // Clear localStorage autosave
  const clearAutosave = useCallback((): void => {
    localStorage.removeItem(AUTOSAVE_KEY);
  }, []);

  // Auto-save when state changes (debounced)
  useEffect(() => {
    // Don't auto-save if we're undoing or if there's no encoding map yet
    if (isUndoing || !encodingMap) return;
    
    debouncedSave();
  }, [hexColors, hexBackgroundColors, hexIcons, borders, selectedBackgroundColor, debouncedSave, encodingMap, isUndoing]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  return {
    loadFromLocalStorage,
    clearAutosave,
    triggerSave: debouncedSave
  };
} 