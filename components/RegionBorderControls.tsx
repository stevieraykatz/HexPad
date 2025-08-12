/**
 * Region Border Controls
 * 
 * Provides UI for region hover detection and border application
 */

import React from 'react';
import { UI_CONFIG } from './config';

interface RegionBorderControlsProps {
  regionStats: {
    totalRegions: number;
    regionsByTerrain: Record<string, number>;
    averageRegionSize: number;
    largestRegion: { id: string; size: number; terrainType: string } | null;
  };
  hoveredRegion: string | null;

  getRegionData: (regionId: string) => { terrainType: string; hexes: Set<string>; id: string } | null;
}

const RegionBorderControls: React.FC<RegionBorderControlsProps> = ({
  regionStats,
  hoveredRegion,
  getRegionData
}) => {


  const hoveredRegionData = hoveredRegion ? getRegionData(hoveredRegion) : null;

  return (
    <div style={{
      background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
      backdropFilter: UI_CONFIG.BLUR.LIGHT,
      border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
      borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
      padding: UI_CONFIG.SPACING.MEDIUM,
      marginBottom: UI_CONFIG.SPACING.MEDIUM,
      display: 'flex',
      flexDirection: 'column',
      gap: UI_CONFIG.SPACING.SMALL
    }}>
      {/* Header */}
      <div style={{
        color: UI_CONFIG.COLORS.TEXT_SECONDARY,
        fontSize: UI_CONFIG.FONT_SIZE.MEDIUM,
        fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
        textAlign: 'center',
        marginBottom: UI_CONFIG.SPACING.SMALL
      }}>
        Region Borders
      </div>

      {/* Region Statistics */}
      <div style={{
        fontSize: UI_CONFIG.FONT_SIZE.SMALL,
        color: UI_CONFIG.COLORS.TEXT_TERTIARY,
        textAlign: 'center'
      }}>
        {regionStats.totalRegions} regions detected
      </div>

      {/* Hovered Region Info */}
      {hoveredRegionData && (
        <div style={{
          background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
          border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
          borderRadius: UI_CONFIG.BORDER_RADIUS.SMALL,
          padding: UI_CONFIG.SPACING.SMALL,
          marginTop: UI_CONFIG.SPACING.SMALL
        }}>
          <div style={{
            fontSize: UI_CONFIG.FONT_SIZE.SMALL,
            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
            marginBottom: '4px'
          }}>
            {hoveredRegionData.terrainType.charAt(0).toUpperCase() + hoveredRegionData.terrainType.slice(1)} Region
          </div>
          <div style={{
            fontSize: UI_CONFIG.FONT_SIZE.SMALL,
            color: UI_CONFIG.COLORS.TEXT_TERTIARY
          }}>
            {hoveredRegionData.hexes.size} hexes
          </div>
          
          {/* Instructions for applying borders */}
          <div style={{
            fontSize: UI_CONFIG.FONT_SIZE.SMALL,
            color: UI_CONFIG.COLORS.TEXT_TERTIARY,
            fontStyle: 'italic',
            marginTop: UI_CONFIG.SPACING.SMALL,
            textAlign: 'center'
          }}>
            Hover over region to see apply button
          </div>

        </div>
      )}

      {/* Instructions */}
      {!hoveredRegionData && (
        <div style={{
          fontSize: UI_CONFIG.FONT_SIZE.SMALL,
          color: UI_CONFIG.COLORS.TEXT_TERTIARY,
          textAlign: 'center',
          fontStyle: 'italic',
          marginTop: UI_CONFIG.SPACING.SMALL
        }}>
          Hover over a region to apply terrain borders
        </div>
      )}



      {/* Terrain Support Info */}
      <div style={{
        fontSize: UI_CONFIG.FONT_SIZE.SMALL,
        color: UI_CONFIG.COLORS.TEXT_TERTIARY,
        textAlign: 'center',
        marginTop: UI_CONFIG.SPACING.SMALL,
        borderTop: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
        paddingTop: UI_CONFIG.SPACING.SMALL
      }}>
        Supported: Forest, Coast • More terrain types coming soon
      </div>
    </div>
  );
};

export default RegionBorderControls;