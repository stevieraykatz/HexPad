/**
 * Region State Hook
 * 
 * Manages the region state alongside the hex grid state,
 * automatically updating regions when hexes are painted.
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  RegionMap, 
  addHexToRegions, 
  removeHexFromRegions, 
  rebuildRegions,
  getRegionStats,
  getBaseTerrainType
} from '../utils/regionUtils';

interface UseRegionStateProps {
  hexColors: Record<string, any>;
  gridWidth: number;
  gridHeight: number;
  enabled?: boolean; // Allow disabling region tracking for performance
}

interface UseRegionStateReturn {
  regionMap: RegionMap;
  regionStats: ReturnType<typeof getRegionStats>;
  updateRegionsForHexChange: (hexCoord: string, oldValue: any, newValue: any) => void;
  rebuildAllRegions: () => void;
  getRegionForHex: (hexCoord: string) => string | null;
  getRegionData: (regionId: string) => any;
  clearRegions: () => void;
}

export function useRegionState({
  hexColors,
  gridWidth,
  gridHeight,
  enabled = true
}: UseRegionStateProps): UseRegionStateReturn {
  
  // Initialize empty region state
  const [regionMap, setRegionMap] = useState<RegionMap>({
    regions: new Map(),
    hexToRegion: new Map()
  });
  
  // Calculate region statistics
  const regionStats = useMemo(() => {
    if (!enabled) {
      return {
        totalRegions: 0,
        regionsByTerrain: {},
        averageRegionSize: 0,
        largestRegion: null
      };
    }
    return getRegionStats(regionMap);
  }, [regionMap, enabled]);
  
  // Update regions when a hex changes
  const updateRegionsForHexChange = useCallback((
    hexCoord: string, 
    oldValue: any, 
    newValue: any
  ) => {
    if (!enabled) return;
    
    const oldTerrainType = getBaseTerrainType(oldValue);
    const newTerrainType = getBaseTerrainType(newValue);
    
    // If terrain types are the same, no region changes needed
    if (oldTerrainType === newTerrainType) return;
    
    setRegionMap(currentRegionMap => {
      let updatedRegionMap = currentRegionMap;
      
      // Remove hex from old terrain region (if it was terrain)
      if (oldTerrainType) {
        updatedRegionMap = removeHexFromRegions(
          hexCoord,
          updatedRegionMap,
          hexColors,
          gridWidth,
          gridHeight
        );
      }
      
      // Add hex to new terrain region (if it's terrain)
      if (newTerrainType) {
        updatedRegionMap = addHexToRegions(
          hexCoord,
          newTerrainType,
          { ...hexColors, [hexCoord]: newValue }, // Include the new value
          updatedRegionMap,
          gridWidth,
          gridHeight
        );
      }
      
      return updatedRegionMap;
    });
  }, [enabled, hexColors, gridWidth, gridHeight]);
  
  // Rebuild all regions from scratch
  const rebuildAllRegions = useCallback(() => {
    if (!enabled) {
      setRegionMap({ regions: new Map(), hexToRegion: new Map() });
      return;
    }
    
    const newRegionMap = rebuildRegions(hexColors, gridWidth, gridHeight);
    setRegionMap(newRegionMap);
  }, [enabled, hexColors, gridWidth, gridHeight]);
  
  // Get region ID for a specific hex
  const getRegionForHex = useCallback((hexCoord: string): string | null => {
    return regionMap.hexToRegion.get(hexCoord) || null;
  }, [regionMap]);
  
  // Get region data by ID
  const getRegionData = useCallback((regionId: string) => {
    return regionMap.regions.get(regionId) || null;
  }, [regionMap]);
  
  // Clear all regions
  const clearRegions = useCallback(() => {
    setRegionMap({ regions: new Map(), hexToRegion: new Map() });
  }, []);
  
  return {
    regionMap,
    regionStats,
    updateRegionsForHexChange,
    rebuildAllRegions,
    getRegionForHex,
    getRegionData,
    clearRegions
  };
}