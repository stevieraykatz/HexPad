import type { TextureItem, IconItem, HexTexture } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import type { EncodingMap, CompleteGridState } from './gridEncoding';
import { PAINT_OPTIONS, GRID_CONFIG } from '../components/config';
import { generateGridUrl } from './gridEncoding';

type HexColorsMap = Record<string, string | HexTexture>;
type BordersMap = Record<string, { fromHex: string; toHex: string; color: string }>;

interface HistoryEntry {
  iconState: Record<string, ColoredIcon>;
  colorState: HexColorsMap;
  borderState: BordersMap;
  changedType: 'icons' | 'colors' | 'borders';
}

interface GridActionHelpers {
  setSelectedTexture: (texture: HexTexture | null) => void;
  setSelectedColor: (color: string) => void;
  setSelectedIcon: (icon: IconItem | null) => void;
  setMenuOpen: (open: boolean) => void;
  setActiveTab: (tab: 'paint' | 'icons' | 'borders' | 'settings') => void;
  setHexIcons: (icons: Record<string, ColoredIcon>) => void;
  setHexColors: (colors: HexColorsMap) => void;
  setBorders: (borders: BordersMap) => void;
  setIsExporting: (exporting: boolean) => void;
}

interface ExportHelpers {
  hexGridRef: React.RefObject<any>;
  gridWidth: number;
  gridHeight: number;
  isExporting: boolean;
}

interface CopyUrlHelpers {
  encodingMap: EncodingMap | null;
  hexColors: HexColorsMap;
  hexIcons: Record<string, ColoredIcon>;
  borders: BordersMap;
  gridWidth: number;
  gridHeight: number;
  clearAutosave: () => void;
}

// Texture selection handler
export function createTextureSelectHandler(helpers: GridActionHelpers) {
  return (texture: TextureItem): void => {
    const hexTexture: HexTexture = {
      type: texture.type,
      name: texture.name,
      displayName: texture.displayName,
      path: texture.path
    };
    
    helpers.setSelectedTexture(hexTexture);
    
    // Clear eraser state when selecting a texture
    helpers.setSelectedIcon(null);
  };
}

// Texture clear handler
export function createTextureClearHandler(helpers: GridActionHelpers) {
  return (): void => {
    helpers.setSelectedTexture(null);
  };
}

// Icon selection handler
export function createIconSelectHandler(helpers: GridActionHelpers) {
  return (icon: IconItem): void => {
    helpers.setSelectedIcon(icon);
  };
}



// Menu toggle handler
export function createMenuToggleHandler(menuOpen: boolean, helpers: GridActionHelpers) {
  return (): void => {
    helpers.setMenuOpen(!menuOpen);
  };
}

// Tab change handler
export function createTabChangeHandler(selectedIcon: IconItem | null, helpers: GridActionHelpers) {
  return (tab: 'paint' | 'icons' | 'borders' | 'settings'): void => {
    helpers.setActiveTab(tab);
    // Clear eraser state when switching to paint tab
    if (tab === 'paint' && selectedIcon?.name === 'eraser') {
      helpers.setSelectedIcon(null);
    }
  };
}

// Eraser toggle handler
export function createEraserToggleHandler(
  selectedIcon: IconItem | null,
  handleIconSelect: (icon: IconItem) => void
) {
  return (): void => {
    // Toggle eraser - deselect if already selected, select if not
    if (selectedIcon?.name === 'eraser') {
      handleIconSelect(null as any); // Will be handled by setSelectedIcon(null)
    } else {
      handleIconSelect({ name: 'eraser', displayName: 'Eraser', type: 'icon', path: '' } as IconItem);
    }
  };
}

// Export PNG handler
export function createExportPNGHandler(exportHelpers: ExportHelpers, helpers: GridActionHelpers) {
  return async (): Promise<void> => {
    const { hexGridRef, gridWidth, gridHeight, isExporting } = exportHelpers;
    
    if (hexGridRef.current && !isExporting) {
      try {
        helpers.setIsExporting(true);
        const timestamp = new Date().toISOString()
          .slice(GRID_CONFIG.TIMESTAMP_SLICE_START, GRID_CONFIG.TIMESTAMP_SLICE_END)
          .replace(/[:.]/g, '-');
        const filename = `${GRID_CONFIG.EXPORT_FILENAME_PREFIX}-${gridWidth}x${gridHeight}-${timestamp}`;
        await hexGridRef.current.exportAsPNG(filename, GRID_CONFIG.HIGH_QUALITY_EXPORT_SCALE);
      } catch (error) {
        console.error('Failed to export PNG:', error);
      } finally {
        helpers.setIsExporting(false);
      }
    }
  };
}

// Copy URL handler
export function createCopyUrlHandler(urlHelpers: CopyUrlHelpers) {
  return async (): Promise<void> => {
    const { encodingMap, hexColors, hexIcons, borders, gridWidth, gridHeight, clearAutosave } = urlHelpers;
    
    if (!encodingMap) return;
    
    try {
      // Create complete grid state for base64 encoding - hexColors is already in correct format
      const completeGridState: CompleteGridState = {
        gridWidth,
        gridHeight,
        hexColors, // hexColors is already Record<string, string | HexTexture>
        hexIcons, // Use ColoredIcon format directly
        borders
      };
      
      const encodedPath = generateGridUrl(completeGridState, encodingMap);
      const shareUrl = `${window.location.origin}${encodedPath}`;
      
      await navigator.clipboard.writeText(shareUrl);
      console.log('Share URL (with icons and borders) copied to clipboard:', shareUrl);
      
      // Clear autosave since user has explicitly saved via URL
      clearAutosave();
      
      // Debug: Show what was encoded
      const borderCount = Object.keys(borders).length;
      const uniqueColors = new Set(Object.values(borders).map(b => b.color)).size;
      console.log(`Encoded ${borderCount} borders with ${uniqueColors} unique colors`);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };
} 