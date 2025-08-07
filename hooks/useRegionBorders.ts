/**
 * Region Borders Hook
 * 
 * Manages region border detection, texture selection, and application
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  detectRegionBorderHexes,
  createRegionBorderPlacements,
  createBorderTextureConfig,
  getRegionBorderStats,
  type BorderHex,
  type BorderPlacement
} from '../utils/regionBorderUtils';
import { getBaseTerrainType } from '../utils/regionUtils';
import type { RegionMap } from '../utils/regionUtils';
import type { HexTexture } from '../components/config';

interface UseRegionBordersProps {
  regionMap: RegionMap;
  hexColors: Record<string, any>;
  gridWidth: number;
  gridHeight: number;
  enabled?: boolean;
}

interface UseRegionBordersReturn {
  hoveredRegion: string | null;
  borderPreview: BorderPlacement[];
  isApplyingBorders: boolean;
  
  // Actions
  setHoveredRegion: (regionId: string | null) => void;
  previewRegionBorders: (regionId: string) => void;
  applyRegionBorders: (regionId: string, onHexUpdate: (hexCoord: string, texture: HexTexture) => void) => Promise<void>;
  clearBorderPreview: () => void;
  
  // Utilities
  getRegionBorderInfo: (regionId: string) => {
    borderHexes: BorderHex[];
    placements: BorderPlacement[];
    stats: ReturnType<typeof getRegionBorderStats>;
  } | null;
  canApplyBorders: (regionId: string) => boolean;
}

export function useRegionBorders({
  regionMap,
  hexColors,
  gridWidth,
  gridHeight,
  enabled = true
}: UseRegionBordersProps): UseRegionBordersReturn {
  
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [borderPreview, setBorderPreview] = useState<BorderPlacement[]>([]);
  const [isApplyingBorders, setIsApplyingBorders] = useState(false);
  
  // Check if borders can be applied to a region
  const canApplyBorders = useCallback((regionId: string): boolean => {
    if (!enabled) return false;
    
    const region = regionMap.regions.get(regionId);
    if (!region) return false;
    
    // Region must have at least 2 hexes to have meaningful borders
    if (region.hexes.size < 2) return false;
    
    // Terrain type must be supported (have manifests with side textures)
    const terrainType = region.terrainType;
    return ['forest', 'coast'].includes(terrainType); // Add more as available
  }, [enabled, regionMap]);
  
  // Get comprehensive border information for a region
  const getRegionBorderInfo = useCallback((regionId: string) => {
    if (!enabled) return null;
    
    const region = regionMap.regions.get(regionId);
    if (!region) return null;
    
    const borderHexes = detectRegionBorderHexes(
      region.hexes,
      hexColors,
      gridWidth,
      gridHeight,
      region.terrainType
    );
    
    const placements = createRegionBorderPlacements(
      region.hexes,
      hexColors,
      gridWidth,
      gridHeight,
      region.terrainType,
      false // Don't prefer special textures for now
    );
    
    const stats = getRegionBorderStats(borderHexes);
    
    return {
      borderHexes,
      placements,
      stats
    };
  }, [enabled, regionMap, hexColors, gridWidth, gridHeight]);
  
  // Preview borders for a region
  const previewRegionBorders = useCallback((regionId: string) => {
    if (!enabled || !canApplyBorders(regionId)) {
      setBorderPreview([]);
      return;
    }
    
    const borderInfo = getRegionBorderInfo(regionId);
    if (borderInfo) {
      setBorderPreview(borderInfo.placements);
    } else {
      setBorderPreview([]);
    }
  }, [enabled, canApplyBorders, getRegionBorderInfo]);
  
  // Clear border preview
  const clearBorderPreview = useCallback(() => {
    setBorderPreview([]);
  }, []);
  
  // Apply borders to a region
  const applyRegionBorders = useCallback(async (
    regionId: string, 
    onHexUpdate: (hexCoord: string, texture: HexTexture) => void
  ) => {
    if (!enabled || !canApplyBorders(regionId)) {
      return;
    }
    
    setIsApplyingBorders(true);
    
    try {
      const borderInfo = getRegionBorderInfo(regionId);
      if (!borderInfo) {
        return;
      }
      
      // Group placements by hex coordinate to handle multiple edges per hex
      const placementsByHex = new Map<string, BorderPlacement[]>();
      borderInfo.placements.forEach(placement => {
        const existing = placementsByHex.get(placement.hexCoord) || [];
        existing.push(placement);
        placementsByHex.set(placement.hexCoord, existing);
      });
      
      // Apply border textures
      for (const [hexCoord, hexPlacements] of Array.from(placementsByHex)) {
        // For now, use the first placement if there are multiple edges
        // In the future, we might composite multiple edge textures
        const primaryPlacement = hexPlacements[0];
        
        const textureConfig = createBorderTextureConfig(primaryPlacement);
        
        const hexTexture: HexTexture = {
          type: 'texture',
          name: textureConfig.name,
          displayName: textureConfig.displayName,
          path: textureConfig.path,
          rotation: textureConfig.rotation || 0
        };
        
        // Apply the texture to the hex
        onHexUpdate(hexCoord, hexTexture);
        
        // Small delay to show progression (optional)
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Clear preview after applying
      clearBorderPreview();
      
    } finally {
      setIsApplyingBorders(false);
    }
  }, [enabled, canApplyBorders, getRegionBorderInfo, clearBorderPreview]);
  
  // Clear preview when hovered region changes
  const handleSetHoveredRegion = useCallback((regionId: string | null) => {
    setHoveredRegion(regionId);
    if (regionId && canApplyBorders(regionId)) {
      previewRegionBorders(regionId);
    } else {
      clearBorderPreview();
    }
  }, [canApplyBorders, previewRegionBorders, clearBorderPreview]);
  
  return {
    hoveredRegion,
    borderPreview,
    isApplyingBorders,
    
    setHoveredRegion: handleSetHoveredRegion,
    previewRegionBorders,
    applyRegionBorders,
    clearBorderPreview,
    
    getRegionBorderInfo,
    canApplyBorders
  };
}