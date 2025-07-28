import { useCallback, useRef, useEffect } from 'react';
import type { EncodingMap, CompleteGridState } from '../utils/gridEncoding';
import type { AssetItem, TextureItem, IconItem, HexTexture } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import { PAINT_OPTIONS } from '../components/config';
import { generateGridUrl, parseGridUrl, isValidGridEncoding, decodeBase64ToGrid } from '../utils/gridEncoding';

// localStorage key for auto-save
const AUTOSAVE_KEY = 'hexgrid_autosave';
const AUTOSAVE_DEBOUNCE_MS = 2000; // Save 2 seconds after last change

type HexColorsMap = Record<string, string | HexTexture>;
type BordersMap = Record<string, { fromHex: string; toHex: string; color: string }>;

interface UseAutoSaveProps {
  encodingMap: EncodingMap | null;
  hexColors: HexColorsMap;
  hexIcons: Record<string, ColoredIcon>;
  borders: BordersMap;
  gridWidth: number;
  gridHeight: number;
  isUndoing: boolean;
}

interface UseAutoSaveReturn {
  loadFromLocalStorage: () => { hexColors: HexColorsMap; hexIcons: Record<string, ColoredIcon>; borders: BordersMap } | null;
  clearAutosave: () => void;
  triggerSave: () => void;
}

export function useAutoSave({
  encodingMap,
  hexColors,
  hexIcons,
  borders,
  gridWidth,
  gridHeight,
  isUndoing
}: UseAutoSaveProps): UseAutoSaveReturn {
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback((): void => {
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
      
      // Create complete grid state
      const completeGridState: CompleteGridState = {
        gridWidth,
        gridHeight,
        hexColors: assetItemColors,
        hexIcons, // Use ColoredIcon format directly
        borders
      };
      
      // Check if there's actually any content to save
      const hasContent = Object.keys(assetItemColors).length > 0 || 
                        Object.keys(hexIcons).length > 0 || 
                        Object.keys(borders).length > 0;
      
      if (hasContent) {
        const encodedPath = generateGridUrl(completeGridState, encodingMap);
        localStorage.setItem(AUTOSAVE_KEY, encodedPath);
      } else {
        // Clear autosave if grid is empty
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } catch (error) {
      console.warn('Failed to auto-save to localStorage:', error);
    }
  }, [encodingMap, hexColors, hexIcons, borders, gridWidth, gridHeight]);

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
  const loadFromLocalStorage = useCallback((): { hexColors: HexColorsMap; hexIcons: Record<string, ColoredIcon>; borders: BordersMap } | null => {
    if (!encodingMap) return null;
    
    try {
      const savedPath = localStorage.getItem(AUTOSAVE_KEY);
      if (savedPath) {
        const encoded = parseGridUrl(savedPath);
        if (encoded && isValidGridEncoding(encoded)) {
          const decodedGridState = decodeBase64ToGrid(encoded, encodingMap);
          
          if (decodedGridState) {
            // decodedGridState.hexColors is already in the correct format (string | HexTexture)
            const hexTextureColors: HexColorsMap = decodedGridState.hexColors;
            
            return {
              hexColors: hexTextureColors,
              hexIcons: decodedGridState.hexIcons, // Already in ColoredIcon format
              borders: decodedGridState.borders
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
  }, [hexColors, hexIcons, borders, debouncedSave, encodingMap, isUndoing]);

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