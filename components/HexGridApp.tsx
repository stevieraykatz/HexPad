import React, { useState, useCallback, MouseEvent, useRef, useEffect } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { GRID_CONFIG, UI_CONFIG, COLORS, DEFAULT_COLORS, PAINT_OPTIONS, BACKGROUND_COLORS } from './config';
import type { Color, AssetItem, ColorItem, TextureItem, BackgroundColor, RGB } from './config';
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

interface HexTexture {
  type: 'color' | 'texture';
  name: string;
  displayName: string;
  rgb?: [number, number, number];
  path?: string;
}

type HexColorsMap = Record<string, HexColor | HexTexture>;

interface HexGridAppProps {}

const HexGridApp: React.FC<HexGridAppProps> = () => {
  const [gridWidth, setGridWidth] = useState<number>(GRID_CONFIG.DEFAULT_WIDTH);
  const [gridHeight, setGridHeight] = useState<number>(GRID_CONFIG.DEFAULT_HEIGHT);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLORS.SELECTED);
  const [hexColors, setHexColors] = useState<HexColorsMap>({});

  const [selectedTexture, setSelectedTexture] = useState<HexTexture | null>(null);
  const [hexColorsVersion, setHexColorsVersion] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'paint' | 'icons'>('paint');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState<BackgroundColor>(BACKGROUND_COLORS[0]); // Default to grey
  const hexGridRef = useRef<HexGridRef>(null);
  
  // URL encoding state
  const [encodingMap, setEncodingMap] = useState<EncodingMap | null>(null);

  // Initialize encoding map
  useEffect(() => {
    const map = createEncodingMap(PAINT_OPTIONS);
    setEncodingMap(map);
  }, []);

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
    
    // Use selectedTexture if available, otherwise fall back to selectedColor
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
  }, [selectedColor, selectedTexture]);

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
  }, [gridWidth, gridHeight]);

  const getHexColor = useCallback((row: number, col: number): HexColor | HexTexture | undefined => {
    const hexKey = `${row}-${col}`;
    return hexColors[hexKey];
  }, [hexColors]);



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
  }, []);

  const handleMouseOver = useCallback((e: MouseEvent<HTMLButtonElement>): void => {
    (e.target as HTMLButtonElement).style.background = UI_CONFIG.HOVER.DANGER_BACKGROUND;
  }, []);

  const handleMouseOut = useCallback((e: MouseEvent<HTMLButtonElement>): void => {
    (e.target as HTMLButtonElement).style.background = UI_CONFIG.COLORS.DANGER_BACKGROUND;
  }, []);

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
      {/* Menu Toggle Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          position: 'fixed',
          top: UI_CONFIG.SPACING.XLARGE,
          left: menuOpen ? `${UI_CONFIG.MENU_WIDTH + UI_CONFIG.MENU.TOGGLE_BUTTON_OFFSET}px` : UI_CONFIG.SPACING.XLARGE,
          zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
          background: menuOpen ? UI_CONFIG.COLORS.OVERLAY_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
          backdropFilter: UI_CONFIG.BLUR.LIGHT,
          border: `1px solid ${menuOpen ? UI_CONFIG.COLORS.BORDER_COLOR : UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
          borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
          color: menuOpen ? UI_CONFIG.COLORS.TEXT_PRIMARY : UI_CONFIG.COLORS.TEXT_TERTIARY,
          padding: `${UI_CONFIG.SPACING.SMALL} ${UI_CONFIG.SPACING.LARGE}`,
          cursor: 'pointer',
          fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
          transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
          boxShadow: menuOpen ? UI_CONFIG.BOX_SHADOW.LIGHT : 'none'
        }}
        title={menuOpen ? 'Close Menu' : 'Open Menu'}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Menu Type Buttons */}
      <div style={{
        position: 'fixed',
        top: `calc(${UI_CONFIG.SPACING.XLARGE} + 60px)`, // Below the menu toggle
        left: menuOpen ? `${UI_CONFIG.MENU_WIDTH + UI_CONFIG.MENU.TOGGLE_BUTTON_OFFSET}px` : UI_CONFIG.SPACING.XLARGE,
        zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
        display: 'flex',
        flexDirection: 'column',
        gap: UI_CONFIG.SPACING.MEDIUM,
        transition: `left ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`
      }}>
        {/* Paint Menu Button */}
        <button
          onClick={() => {
            setActiveTab('paint');
            if (!menuOpen) setMenuOpen(true);
          }}
          style={{
            width: (activeTab === 'paint' && menuOpen) ? '60px' : '50px',
            height: (activeTab === 'paint' && menuOpen) ? '60px' : '50px',
            background: (activeTab === 'paint' && menuOpen) ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
            backdropFilter: UI_CONFIG.BLUR.LIGHT,
            border: (activeTab === 'paint' && menuOpen) 
              ? `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` 
              : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
            borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: (activeTab === 'paint' && menuOpen) ? '24px' : '20px',
            transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
            boxShadow: (activeTab === 'paint' && menuOpen) ? UI_CONFIG.BOX_SHADOW.SELECTED : UI_CONFIG.BOX_SHADOW.LIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Paint Tools"
        >
          🎨
        </button>

        {/* Icons Menu Button */}
        <button
          onClick={() => {
            setActiveTab('icons');
            if (!menuOpen) setMenuOpen(true);
          }}
          style={{
            width: (activeTab === 'icons' && menuOpen) ? '60px' : '50px',
            height: (activeTab === 'icons' && menuOpen) ? '60px' : '50px',
            background: (activeTab === 'icons' && menuOpen) ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
            backdropFilter: UI_CONFIG.BLUR.LIGHT,
            border: (activeTab === 'icons' && menuOpen) 
              ? `2px solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` 
              : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
            borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            cursor: 'pointer',
            fontSize: (activeTab === 'icons' && menuOpen) ? '24px' : '20px',
            transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
            boxShadow: (activeTab === 'icons' && menuOpen) ? UI_CONFIG.BOX_SHADOW.SELECTED : UI_CONFIG.BOX_SHADOW.LIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Icon Overlays"
        >
          📍
        </button>
      </div>

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
        
        {activeTab === 'paint' && (
          <>
            {/* Grid Size Controls */}
        <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
          
          <div style={{ marginBottom: UI_CONFIG.SPACING.LARGE }}>
            <label style={{ 
              display: 'block',
              marginBottom: UI_CONFIG.SPACING.SMALL, 
              color: UI_CONFIG.COLORS.TEXT_TERTIARY,
              fontSize: UI_CONFIG.FONT_SIZE.NORMAL
            }}>
              Width: {gridWidth}
            </label>
            <input
              type="range"
              min={GRID_CONFIG.MIN_SIZE}
              max={GRID_CONFIG.MAX_SIZE}
              value={gridWidth}
              onChange={(e) => setGridWidth(parseInt(e.target.value))}
              style={{
                width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
                height: UI_CONFIG.GRID_CONTROLS.SLIDER_HEIGHT,
                borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                outline: 'none',
                background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                cursor: 'pointer'
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block',
              marginBottom: UI_CONFIG.SPACING.SMALL, 
              color: UI_CONFIG.COLORS.TEXT_TERTIARY,
              fontSize: UI_CONFIG.FONT_SIZE.NORMAL
            }}>
              Height: {gridHeight}
            </label>
            <input
              type="range"
              min={GRID_CONFIG.MIN_SIZE}
              max={GRID_CONFIG.MAX_SIZE}
              value={gridHeight}
              onChange={(e) => setGridHeight(parseInt(e.target.value))}
              style={{
                width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
                height: UI_CONFIG.GRID_CONTROLS.SLIDER_HEIGHT,
                borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                outline: 'none',
                background: UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Background Color */}
        <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
          <h3 style={{ 
            color: UI_CONFIG.COLORS.TEXT_SECONDARY, 
            fontSize: UI_CONFIG.FONT_SIZE.LARGE,
            marginBottom: UI_CONFIG.SPACING.LARGE,
            fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
          }}>
            Background
          </h3>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: UI_CONFIG.SPACING.SMALL
          }}>
            {BACKGROUND_COLORS.map((bgColor: BackgroundColor) => (
              <button
                key={bgColor.name}
                onClick={() => setSelectedBackgroundColor(bgColor)}
                style={{
                  padding: `${UI_CONFIG.SPACING.MEDIUM} ${UI_CONFIG.SPACING.LARGE}`,
                  background: selectedBackgroundColor.name === bgColor.name ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                  border: selectedBackgroundColor.name === bgColor.name ? `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                  borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
                  cursor: 'pointer',
                  transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                  textAlign: 'left',
                  fontWeight: selectedBackgroundColor.name === bgColor.name ? UI_CONFIG.FONT_WEIGHT.MEDIUM : UI_CONFIG.FONT_WEIGHT.NORMAL,
                  display: 'flex',
                  alignItems: 'center',
                  gap: UI_CONFIG.SPACING.MEDIUM
                }}
              >
                <div style={{
                  width: UI_CONFIG.SPACING.XLARGE,
                  height: UI_CONFIG.SPACING.XLARGE,
                  borderRadius: '4px',
                  background: bgColor.cssColor,
                  border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
                  flexShrink: 0
                }} />
                {bgColor.displayName}
              </button>
            ))}
          </div>
        </div>

        {/* Paint Tools */}
        <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
          {/* All Assets - Compact Icon Grid */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${UI_CONFIG.PAINT_OPTIONS.GRID_COLUMNS}, 1fr)`,
            gap: UI_CONFIG.PAINT_OPTIONS.TILE_GAP, // Minimal gap between tiles
            maxHeight: UI_CONFIG.PAINT_OPTIONS.MAX_HEIGHT,
            overflowY: 'auto',
            justifyContent: 'center',
            justifyItems: 'center'
          }}>
            {PAINT_OPTIONS.map((item: AssetItem) => (
              item.type === 'color' ? (
                <button
                  key={item.name}
                  onClick={() => handleTextureSelect(item)}
                  style={{
                    width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                    height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                    padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
                    background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                    border: selectedTexture?.name === item.name ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                    cursor: 'pointer',
                    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                    boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
                  }}
                  title={item.displayName}
                >
                  <div style={{
                    width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
                    height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                    background: (item as ColorItem).value,
                    border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`
                  }} />
                </button>
              ) : (
                <button
                  key={item.name}
                  onClick={() => handleTextureSelect(item)}
                  style={{
                    width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                    height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                    padding: UI_CONFIG.PAINT_OPTIONS.TILE_PADDING,
                    background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                    border: selectedTexture?.name === item.name ? `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_SELECTED} solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` : `${UI_CONFIG.PAINT_OPTIONS.TILE_BORDER_WIDTH_NORMAL} solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                    cursor: 'pointer',
                    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                    boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
                  }}
                  title={item.displayName}
                >
                  <div style={{
                    width: UI_CONFIG.APP_LAYOUT.FULL_WIDTH_PERCENTAGE,
                    height: UI_CONFIG.APP_LAYOUT.FULL_HEIGHT_PERCENTAGE,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                    border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: UI_CONFIG.PAINT_OPTIONS.ZOOM_SCALE_PERCENTAGE,
                      height: UI_CONFIG.PAINT_OPTIONS.ZOOM_SCALE_PERCENTAGE,
                      position: 'absolute',
                      top: UI_CONFIG.PAINT_OPTIONS.ZOOM_OFFSET_PERCENTAGE,
                      left: UI_CONFIG.PAINT_OPTIONS.ZOOM_OFFSET_PERCENTAGE,
                      backgroundImage: `url(${(item as TextureItem).path})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} />
                  </div>
                </button>
              )
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 'auto', paddingTop: UI_CONFIG.SPACING.XLARGE }}>
          <div style={{
            display: 'flex',
            gap: UI_CONFIG.SPACING.LARGE,
            marginBottom: UI_CONFIG.SPACING.LARGE,
            justifyContent: 'center'
          }}>
            <button
              onClick={handleCopyUrl}
              style={{
                width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                padding: UI_CONFIG.SPACING.SMALL,
                background: UI_CONFIG.COLORS.SELECTED_BACKGROUND,
                border: `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}`,
                borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
                cursor: 'pointer',
                transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Copy shareable URL to clipboard"
            >
              🔗
            </button>
            
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              style={{
                width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                padding: UI_CONFIG.SPACING.SMALL,
                background: isExporting ? UI_CONFIG.COLORS.BUTTON_BACKGROUND : UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND,
                border: `2px solid ${isExporting ? UI_CONFIG.COLORS.BORDER_COLOR : UI_CONFIG.COLORS.SELECTED_ALT_BORDER}`,
                borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                color: isExporting ? UI_CONFIG.COLORS.TEXT_MUTED : UI_CONFIG.COLORS.TEXT_PRIMARY,
                fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
                cursor: isExporting ? 'wait' : 'pointer',
                transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
                opacity: isExporting ? UI_CONFIG.APP_LAYOUT.EXPORT_OPACITY_DISABLED : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isExporting ? 'Exporting PNG...' : 'Download PNG'}
            >
              {isExporting ? '⏳' : '⬇️'}
            </button>
            
            <button
              onClick={clearGrid}
              style={{
                width: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                height: UI_CONFIG.PAINT_OPTIONS.TILE_SIZE,
                padding: UI_CONFIG.SPACING.SMALL,
                background: UI_CONFIG.COLORS.DANGER_BACKGROUND,
                border: `2px solid ${UI_CONFIG.COLORS.DANGER_BORDER}`,
                borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                color: UI_CONFIG.COLORS.TEXT_DANGER,
                fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
                cursor: 'pointer',
                transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              title="Clear all hexagons"
            >
              🗑️
            </button>
          </div>
        </div>
          </>
        )}
        
        {/* Icons Tab Content */}
        {activeTab === 'icons' && (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            color: UI_CONFIG.COLORS.TEXT_TERTIARY,
            fontSize: UI_CONFIG.FONT_SIZE.LARGE
          }}>
            <div style={{ 
              fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
              marginBottom: UI_CONFIG.SPACING.LARGE
            }}>
              📍
            </div>
            <div>Icons Coming Soon</div>
            <div style={{ 
              fontSize: UI_CONFIG.FONT_SIZE.MEDIUM,
              marginTop: UI_CONFIG.SPACING.MEDIUM,
              textAlign: 'center',
              color: UI_CONFIG.COLORS.TEXT_MUTED
            }}>
              This tab will contain icon overlays<br/>
              for placing on the map
            </div>
          </div>
        )}
      </div>
      
      {/* Main Grid Area */}
      <div style={{
        width: '100vw', // Always full viewport width
        height: '100vh',
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
          getHexColor={getHexColor}
          hexColorsVersion={hexColorsVersion}
          backgroundColor={selectedBackgroundColor}
        />
      </div>
    </div>
  );
};

export default HexGridApp; 