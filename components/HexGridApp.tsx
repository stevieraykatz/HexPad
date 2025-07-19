import React, { useState, useCallback, MouseEvent, useRef, useEffect } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { GRID_CONFIG, UI_CONFIG, COLORS, DEFAULT_COLORS, PAINT_OPTIONS, BACKGROUND_COLORS } from './config';
import type { Color, AssetItem, ColorItem, TextureItem, BackgroundColor } from './config';
import { 
  createEncodingMap, 
  encodeGridToUrl, 
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
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
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

  // Load grid from URL on mount and when encoding map is ready
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
    }
  }, [encodingMap, gridWidth, gridHeight]);

  // Update URL when grid changes
  useEffect(() => {
    if (!encodingMap) return;
    
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
    const newUrl = generateGridUrl(gridState, encodingMap);
    
    // Update URL without causing page reload
    if (window.location.pathname !== newUrl) {
      window.history.pushState({}, '', newUrl);
    }
  }, [hexColors, gridWidth, gridHeight, encodingMap]);

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
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const filename = `hex-grid-${gridWidth}x${gridHeight}-${timestamp}`;
        await hexGridRef.current.exportAsPNG(filename, 4); // 4x resolution for high quality
      } catch (error) {
        console.error('Failed to export PNG:', error);
      } finally {
        setIsExporting(false);
      }
    }
  }, [gridWidth, gridHeight, isExporting]);

  const handleCopyUrl = useCallback(async (): Promise<void> => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      // Could add a toast notification here
      console.log('URL copied to clipboard:', currentUrl);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }, []);

  return (
    <div className="App" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Menu Toggle Button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          position: 'fixed',
          top: UI_CONFIG.SPACING.XLARGE,
          left: menuOpen ? `${UI_CONFIG.MENU_WIDTH + 10}px` : UI_CONFIG.SPACING.XLARGE,
          zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
          background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
          backdropFilter: UI_CONFIG.BLUR.LIGHT,
          border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
          borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
          color: UI_CONFIG.COLORS.TEXT_PRIMARY,
          padding: `${UI_CONFIG.SPACING.MEDIUM} ${UI_CONFIG.SPACING.LARGE}`,
          cursor: 'pointer',
          fontSize: UI_CONFIG.FONT_SIZE.LARGE,
          transition: `left ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
          boxShadow: UI_CONFIG.BOX_SHADOW.LIGHT
        }}
        title={menuOpen ? 'Close Menu' : 'Open Menu'}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

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
        <h2 style={{ 
          margin: `40px 0 ${UI_CONFIG.SPACING.XLARGE} 0`, 
          color: UI_CONFIG.COLORS.TEXT_PRIMARY, 
          fontSize: UI_CONFIG.FONT_SIZE.XLARGE,
          fontWeight: UI_CONFIG.FONT_WEIGHT.SEMIBOLD,
          borderBottom: `2px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
          paddingBottom: UI_CONFIG.SPACING.MEDIUM
        }}>
          Hex Grid Painter
        </h2>
        
        {/* Grid Size Controls */}
        <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
          <h3 style={{ 
            color: UI_CONFIG.COLORS.TEXT_SECONDARY, 
            fontSize: UI_CONFIG.FONT_SIZE.LARGE,
            marginBottom: UI_CONFIG.SPACING.LARGE,
            fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
          }}>
            Grid Dimensions
          </h3>
          
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
                width: '100%',
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
                width: '100%',
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
                  width: '20px',
                  height: '20px',
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
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px', // Minimal gap between tiles
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {PAINT_OPTIONS.map((item: AssetItem) => (
              item.type === 'color' ? (
                <button
                  key={item.name}
                  onClick={() => handleTextureSelect(item)}
                  style={{
                    width: '80px',
                    height: '80px',
                    padding: '2px',
                    background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                    border: selectedTexture?.name === item.name ? `3px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `2px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                    cursor: 'pointer',
                    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                    boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
                  }}
                  title={item.displayName}
                >
                  <div style={{
                    width: '100%',
                    height: '100%',
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
                    width: '80px',
                    height: '80px',
                    padding: '2px',
                    background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                    border: selectedTexture?.name === item.name ? `3px solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` : `2px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                    cursor: 'pointer',
                    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                    boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
                  }}
                  title={item.displayName}
                >
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM,
                    border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: '130%',
                      height: '130%',
                      position: 'absolute',
                      top: '-15%',
                      left: '-15%',
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
          <button
            onClick={handleCopyUrl}
            style={{
              width: '100%',
              padding: UI_CONFIG.SPACING.LARGE,
              background: UI_CONFIG.COLORS.SELECTED_BACKGROUND,
              border: `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              color: UI_CONFIG.COLORS.TEXT_PRIMARY,
              fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
              marginBottom: UI_CONFIG.SPACING.LARGE
            }}
          >
            🔗 Copy Share URL
          </button>
          
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            style={{
              width: '100%',
              padding: UI_CONFIG.SPACING.LARGE,
              background: isExporting ? UI_CONFIG.COLORS.BUTTON_BACKGROUND : UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND,
              border: `2px solid ${isExporting ? UI_CONFIG.COLORS.BORDER_COLOR : UI_CONFIG.COLORS.SELECTED_ALT_BORDER}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              color: isExporting ? UI_CONFIG.COLORS.TEXT_MUTED : UI_CONFIG.COLORS.TEXT_PRIMARY,
              fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
              cursor: isExporting ? 'wait' : 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
              marginBottom: UI_CONFIG.SPACING.LARGE,
              opacity: isExporting ? 0.7 : 1
            }}
          >
            {isExporting ? '⏳ Exporting...' : '📥 Export as PNG'}
          </button>
          
          <button
            onClick={clearGrid}
            style={{
              width: '100%',
              padding: UI_CONFIG.SPACING.LARGE,
              background: UI_CONFIG.COLORS.DANGER_BACKGROUND,
              border: `2px solid ${UI_CONFIG.COLORS.DANGER_BORDER}`,
              borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
              color: UI_CONFIG.COLORS.TEXT_DANGER,
              fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
              cursor: 'pointer',
              transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
              fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM,
              marginBottom: UI_CONFIG.SPACING.LARGE
            }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
          >
            🗑️ Clear Grid
          </button>
          
          <div style={{ 
            fontSize: UI_CONFIG.FONT_SIZE.MEDIUM, 
            color: UI_CONFIG.COLORS.TEXT_SUBTLE,
            textAlign: 'center',
            padding: UI_CONFIG.SPACING.MEDIUM,
            background: UI_CONFIG.COLORS.INFO_BACKGROUND,
            borderRadius: UI_CONFIG.BORDER_RADIUS.MEDIUM
          }}>
            {gridWidth * gridHeight} hexagons<br/>
            {gridWidth} × {gridHeight}
          </div>
        </div>
      </div>
      
      {/* Main Grid Area */}
      <div style={{
        marginLeft: menuOpen ? `${UI_CONFIG.MENU_WIDTH}px` : '0',
        transition: `margin-left ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
        width: menuOpen ? `calc(100vw - ${UI_CONFIG.MENU_WIDTH}px)` : '100vw',
        height: '100vh'
      }}>
        <HexGrid 
          ref={hexGridRef}
          gridWidth={gridWidth} 
          gridHeight={gridHeight}
          selectedColor={selectedColor}
          selectedTexture={selectedTexture}
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