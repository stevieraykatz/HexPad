import React, { useState, useCallback, MouseEvent, useRef } from 'react';
import HexGrid, { HexGridRef } from './HexGrid';
import { GRID_CONFIG, UI_CONFIG, COLORS, DEFAULT_COLORS, ASSET_FOLDERS } from './config';
import type { Color, ColorItem, TextureItem } from './config';

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
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTexture, setSelectedTexture] = useState<HexTexture | null>(null);
  const [hexColorsVersion, setHexColorsVersion] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const hexGridRef = useRef<HexGridRef>(null);

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

  const handleFolderSelect = useCallback((folderName: string): void => {
    setSelectedFolder(folderName);
    setSelectedTexture(null); // Clear texture selection when changing folders
  }, []);

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

        {/* Paint Tools */}
        <div style={{ marginBottom: UI_CONFIG.SPACING.XXLARGE }}>
          <h3 style={{ 
            color: UI_CONFIG.COLORS.TEXT_SECONDARY, 
            fontSize: UI_CONFIG.FONT_SIZE.LARGE,
            marginBottom: UI_CONFIG.SPACING.LARGE,
            fontWeight: UI_CONFIG.FONT_WEIGHT.MEDIUM
          }}>
            Paint Tools
          </h3>
          
          <div style={{ marginBottom: UI_CONFIG.SPACING.LARGE }}>
            <label style={{ 
              display: 'block',
              marginBottom: UI_CONFIG.SPACING.MEDIUM, 
              color: UI_CONFIG.COLORS.TEXT_TERTIARY,
              fontSize: UI_CONFIG.FONT_SIZE.NORMAL
            }}>
              Categories:
            </label>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: UI_CONFIG.SPACING.SMALL
            }}>
              {Object.keys(ASSET_FOLDERS).map((folderName: string) => (
                <button
                  key={folderName}
                  onClick={() => handleFolderSelect(folderName)}
                  style={{
                    padding: `${UI_CONFIG.SPACING.MEDIUM} ${UI_CONFIG.SPACING.LARGE}`,
                    background: selectedFolder === folderName ? UI_CONFIG.COLORS.SELECTED_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                    border: selectedFolder === folderName ? `2px solid ${UI_CONFIG.COLORS.SELECTED_BORDER}` : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
                    cursor: 'pointer',
                    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                    textAlign: 'left',
                    fontWeight: selectedFolder === folderName ? UI_CONFIG.FONT_WEIGHT.MEDIUM : UI_CONFIG.FONT_WEIGHT.NORMAL
                  }}
                >
                  📁 {folderName}
                </button>
              ))}
            </div>
          </div>

          {/* Texture Selection */}
          {selectedFolder && (
            <div>
              <label style={{ 
                display: 'block',
                marginBottom: UI_CONFIG.SPACING.MEDIUM, 
                color: UI_CONFIG.COLORS.TEXT_TERTIARY,
                fontSize: UI_CONFIG.FONT_SIZE.NORMAL
              }}>
                {selectedFolder}:
              </label>
              <div style={{ 
                display: selectedFolder === 'Colors' ? 'grid' : 'flex',
                gridTemplateColumns: selectedFolder === 'Colors' ? 'repeat(5, 1fr)' : undefined,
                flexDirection: selectedFolder === 'Colors' ? undefined : 'column',
                gap: UI_CONFIG.SPACING.MEDIUM,
                maxHeight: '250px',
                overflowY: 'auto',
                padding: '5px'
              }}>
                {ASSET_FOLDERS[selectedFolder].items.map((item: ColorItem | TextureItem) => (
                  selectedFolder === 'Colors' ? (
                    <button
                      key={item.name}
                      onClick={() => handleTextureSelect(item)}
                      style={{
                        width: UI_CONFIG.GRID_CONTROLS.COLOR_SWATCH_SIZE,
                        height: UI_CONFIG.GRID_CONTROLS.COLOR_SWATCH_SIZE,
                        borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                        border: selectedTexture?.name === item.name ? UI_CONFIG.GRID_CONTROLS.COLOR_SWATCH_BORDER_SELECTED : UI_CONFIG.GRID_CONTROLS.COLOR_SWATCH_BORDER_NORMAL,
                        background: (item as ColorItem).value,
                        cursor: 'pointer',
                        transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                        boxShadow: selectedTexture?.name === item.name ? UI_CONFIG.BOX_SHADOW.SELECTED : 'none'
                      }}
                      title={item.displayName}
                    />
                  ) : (
                    <button
                      key={item.name}
                      onClick={() => handleTextureSelect(item)}
                      style={{
                        padding: `${UI_CONFIG.SPACING.MEDIUM} ${UI_CONFIG.SPACING.LARGE}`,
                        background: selectedTexture?.name === item.name ? UI_CONFIG.COLORS.SELECTED_ALT_BACKGROUND : UI_CONFIG.COLORS.BUTTON_BACKGROUND,
                        border: selectedTexture?.name === item.name ? `2px solid ${UI_CONFIG.COLORS.SELECTED_ALT_BORDER}` : `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR_LIGHT}`,
                        borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
                        color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                        fontSize: UI_CONFIG.FONT_SIZE.NORMAL,
                        cursor: 'pointer',
                        transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
                        textAlign: 'left',
                        fontWeight: selectedTexture?.name === item.name ? UI_CONFIG.FONT_WEIGHT.MEDIUM : UI_CONFIG.FONT_WEIGHT.NORMAL
                      }}
                    >
                      🖼️ {item.displayName}
                    </button>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 'auto', paddingTop: UI_CONFIG.SPACING.XLARGE }}>
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
        />
      </div>
    </div>
  );
};

export default HexGridApp; 