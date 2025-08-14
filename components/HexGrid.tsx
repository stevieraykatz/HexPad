import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { GRID_CONFIG, DEFAULT_COLORS } from './config';
import type { RGB, IconItem } from './config';
import type { ColoredIcon } from './config/iconsConfig';
import type { NumberingMode } from './GridSizeControls';
import HexButton, { isPointInHexButton } from './HexButton';

import { initializeWebGLContext, createShaderPrograms, loadTexture } from '../utils/webglUtils';
import { 
  calculateHexRadius, 
  calculateHexPositions, 
  createHexagonVertices, 
  getHexFromMousePos,
  type HexPosition,
  type CanvasSize,
  type PanOffset
} from '../utils/hexagonUtils';
import { calculateZoomToPoint, constrainPanOffset } from '../utils/zoomPanUtils';
import { getRegionBounds } from '../utils/regionUtils';
import { exportAsPNG as exportUtility, type HexStyle } from '../utils/exportUtils';
import {
  columnToLetter,
  rowToNumber,
  getHexCoordinate,
  renderOutlinedText,
  calculateEdgeFontSize,
  calculateInHexFontSize,
  calculateGeneralFontSize,
} from "../utils/numberingUtils";
import { NUMBERING_CONFIG } from './config';
import { useBorderInteraction } from '../hooks/useBorderInteraction';
import { useBorderRendering } from '../hooks/useBorderRendering';
import { useIconPositioning } from '../hooks/useIconPositioning';
import { usePinchZoomPan } from '../hooks/usePinchZoomPan';
import { useMobileDetection } from '../hooks/useMobileDetection';
import type { BorderEdge } from '../utils/borderUtils';

interface HexTexture {
  type: 'color' | 'texture';
  name: string;
  displayName: string;
  rgb?: RGB;
  path?: string;
  baseName?: string; // Base terrain name for encoding (e.g., "coast" for "coast_180_1")
  rotation?: number; // Rotation in 1/6th increments (0-5)
  flipped?: boolean; // Vertical flip for non-rotatable textures
}

type HexColor = string;

// Button regions for tile manipulation
type ButtonRegion = 'center' | 'left' | 'right' | null;

interface TileHoverState {
  hexCoord: { row: number; col: number } | null;
  buttonRegion: ButtonRegion;
}

interface HexGridProps {
  gridWidth?: number;
  gridHeight?: number;
  onHexClick?: (row: number, col: number) => void;
  onHexHover?: (row: number | null, col: number | null) => void;
  onEdgeClick?: (fromHex: string, toHex: string) => void;
  getHexColor?: (row: number, col: number) => HexColor | HexTexture | undefined;
  getHexBackgroundColor?: (row: number, col: number) => HexColor | undefined;
  getHexIcon?: (row: number, col: number) => ColoredIcon | undefined;

  hexColorsVersion?: number;
  hexBackgroundColorsVersion?: number;
  hexIconsVersion?: number;
  backgroundColor?: { rgb: RGB };
  borders?: Record<string, BorderEdge>;
  bordersVersion?: number;
  activeTab?: 'paint' | 'icons' | 'borders' | 'settings';
  selectedIcon?: IconItem | null;
  selectedTexture?: HexTexture | null;
  numberingMode?: NumberingMode;
  onCanvasInteraction?: () => void; // Callback for when user interacts with canvas
  // Tile manipulation props
  menuOpen?: boolean;
  onTileTextureAction?: (row: number, col: number, action: 'cycle' | 'rotate-left' | 'rotate-right') => void;
  // Region highlighting props
  hoveredRegion?: string | null;
  getRegionForHex?: (hexCoord: string) => string | null;
  getRegionData?: (regionId: string) => { terrainType: string; hexes: Set<string>; id: string } | null;
  canApplyRegionBorders?: (regionId: string) => boolean;
  applyRegionBorders?: (regionId: string) => Promise<void>;
}

export interface HexGridRef {
  exportAsPNG: (filename?: string, scale?: number) => Promise<void>;
}

const HexGrid = forwardRef<HexGridRef, HexGridProps>(({ 
  gridWidth = GRID_CONFIG.DEFAULT_WIDTH, 
  gridHeight = GRID_CONFIG.DEFAULT_HEIGHT, 
  onHexClick, 
  onHexHover,
  onEdgeClick,
  getHexColor, 
  getHexBackgroundColor,
  getHexIcon,

  hexColorsVersion = 0,
  hexBackgroundColorsVersion = 0,
  hexIconsVersion = 0,
  backgroundColor,
  borders,
  bordersVersion = 0,
  activeTab = 'paint',
  selectedIcon = null,
  selectedTexture = null,
  numberingMode = 'off',
  onCanvasInteraction,
  // Tile manipulation props
  menuOpen = false,
  onTileTextureAction,
  // Region highlighting props
  hoveredRegion,
  getRegionForHex,
  getRegionData,
  canApplyRegionBorders,
  applyRegionBorders
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bordersCanvasRef = useRef<HTMLCanvasElement>(null);
  const numberingCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const colorProgramRef = useRef<WebGLProgram | null>(null);
  const textureProgramRef = useRef<WebGLProgram | null>(null);
  
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ 
    width: GRID_CONFIG.DEFAULT_CANVAS_WIDTH, 
    height: GRID_CONFIG.DEFAULT_CANVAS_HEIGHT 
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // Start at normal zoom, but allow zooming out to BASE_ZOOM_LEVEL
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number; y: number } | null>(null);
  
  const hexPositionsRef = useRef<HexPosition[]>([]);
  const hexRadiusRef = useRef<number>(0);
  const paintedDuringDragRef = useRef<Set<string>>(new Set());
  const texturesRef = useRef<Map<string, WebGLTexture>>(new Map());
  
  // Mobile detection and gesture handling
  const { isTouchDevice } = useMobileDetection();
  const [isGesturing, setIsGesturing] = useState<boolean>(false);
  
  // Tile manipulation state
  const [tileHoverState, setTileHoverState] = useState<TileHoverState>({ hexCoord: null, buttonRegion: null });
  const lastButtonHexRef = useRef<string | null>(null);
  
  // Hover tracking for region detection
  const [hoveredHex, setHoveredHex] = useState<{ row: number; col: number } | null>(null);
  
  // Region border button state - calculated based on region bounds, not mouse position
  const [regionButtonState, setRegionButtonState] = useState<{
    regionId: string;
    position: HexPosition;
    canApply: boolean;
  } | null>(null);

  // Border interaction hook
  const {
    paintBorderIfNew,
    clearPaintedBorders
  } = useBorderInteraction({
    hexPositionsRef,
    hexRadiusRef,
    onEdgeClick,
    activeTab,
    selectedIcon
  });

  // Border rendering hook
  const {
    renderBordersThrottled,
    cancelPendingRenders
  } = useBorderRendering({
    bordersCanvasRef,
    hexPositionsRef,
    hexRadiusRef,
    borders
  });

  // Icon positioning hook
  const {
    throttledPositions,
    throttledRadius,
    updateIconPositionsThrottled,
    cancelPendingUpdates: cancelPendingIconUpdates
  } = useIconPositioning({
    hexPositionsRef,
    hexRadiusRef
  });

  const exportAsPNG = useCallback(async (
    filename: string = GRID_CONFIG.EXPORT_FILENAME_PREFIX, 
    scale: number = GRID_CONFIG.DEFAULT_EXPORT_SCALE
  ): Promise<void> => {
    await exportUtility({
      filename,
      scale,
      gridWidth,
      gridHeight,
      canvasSize,
      backgroundColor,
      getHexagonStyle: (row: number, col: number) => getHexagonStyle(row, col),
      getHexBackgroundColor,
      borders,
      getHexIcon,
      numberingMode
    });
  }, [canvasSize, gridWidth, gridHeight, backgroundColor, getHexColor, getHexBackgroundColor, borders, getHexIcon, numberingMode]);

  useImperativeHandle(ref, () => ({
    exportAsPNG
  }), [exportAsPNG]);

  // Helper function to convert hex color strings to RGB arrays
  const hexToRgb = useCallback((hex: string): [number, number, number] | null => {
    if (!hex.startsWith('#') || hex.length !== 7) {
      return null;
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }
    
    // Convert to WebGL 0-1 range
    return [r / 255, g / 255, b / 255];
  }, []);

  // Helper function to determine which button region the mouse is in within a hex
  const getButtonRegion = useCallback((mouseX: number, mouseY: number, hexPos: HexPosition, hexRadius: number): ButtonRegion => {
    // Use the unified HexButton detection logic
    if (isPointInHexButton(mouseX, mouseY, 'center', hexPos.x, hexPos.y, hexRadius)) {
      return 'center';
    }
    if (isPointInHexButton(mouseX, mouseY, 'left', hexPos.x, hexPos.y, hexRadius)) {
      return 'left';
    }
    if (isPointInHexButton(mouseX, mouseY, 'right', hexPos.x, hexPos.y, hexRadius)) {
      return 'right';
    }
    return null;
  }, []);

  // Helper function to handle tile manipulation clicks
  const handleTileManipulation = useCallback((hex: HexPosition, buttonRegion: ButtonRegion): void => {
    // Allow tile manipulation when design menu is active (either open or minimized) and on paint tab
    if (activeTab !== 'paint' || !onTileTextureAction || !buttonRegion) return;
    
    const action = buttonRegion === 'center' ? 'cycle' : 
                   buttonRegion === 'left' ? 'rotate-left' : 'rotate-right';
    onTileTextureAction(hex.row, hex.col, action);
  }, [activeTab, onTileTextureAction]);

  // Helper function to handle region border application
  const handleRegionBorderApplication = useCallback(async (regionId: string): Promise<void> => {
    if (!applyRegionBorders) return;
    
    try {
      await applyRegionBorders(regionId);
      // Clear the button state after successful application
      setRegionButtonState(null);
    } catch (error) {
      console.error('Failed to apply region borders:', error);
    }
  }, [applyRegionBorders]);

  // Update region button position when hoveredRegion changes
  useEffect(() => {
    if (!hoveredRegion || activeTab !== 'borders' || !getRegionForHex || !canApplyRegionBorders || isPanning || isDragging || isZooming) {
      setRegionButtonState(null);
      return;
    }

    // Check if we can apply borders to this region
    if (!canApplyRegionBorders(hoveredRegion)) {
      setRegionButtonState(null);
      return;
    }

    // Get region data and calculate button position
    const regionData = getRegionData?.(hoveredRegion);
    if (!regionData || !regionData.hexes) {
      setRegionButtonState(null);
      return;
    }

    // Calculate region bounds
    const bounds = getRegionBounds(regionData.hexes);
    
    // Find the hex position for the top-right of the region
    const topRightRow = bounds.minRow; // Top of region
    const topRightCol = bounds.maxCol; // Right side of region
    
    // Get the actual screen position for this hex
    const hexPositions = hexPositionsRef.current;
    const targetHex = hexPositions.find(pos => pos.row === topRightRow && pos.col === topRightCol);
    
    if (targetHex) {
      // Position the button directly on the top-right hex like a file tab
      const hexRadius = hexRadiusRef.current || 20;
      const buttonPosition = {
        row: targetHex.row,
        col: targetHex.col,
        x: targetHex.x, // Center on the hex
        y: targetHex.y - hexRadius * 0.6  // Above the hex
      };
      
      setRegionButtonState({
        regionId: hoveredRegion,
        position: buttonPosition,
        canApply: true
      });
    }
  }, [hoveredRegion, activeTab, getRegionForHex, canApplyRegionBorders, getRegionData, isPanning, isDragging, isZooming]);

  const getHexagonStyle = useCallback((row: number, col: number): HexStyle | undefined => {
    const userTexture = getHexColor && getHexColor(row, col);
    
    // Check if this hex is part of the hovered region for highlighting (only in borders tab)
    const hexCoord = `${row}-${col}`;
    const hexRegionId = getRegionForHex && getRegionForHex(hexCoord);
    const isHoveredRegion = activeTab === 'borders' && hoveredRegion && hexRegionId === hoveredRegion;
    
    if (userTexture) {
      if (userTexture === DEFAULT_COLORS.SELECTED) {
        const rgb = isHoveredRegion 
          ? [0.8, 0.9, 1.0] as RGB // Bright blue glow for hovered region
          : DEFAULT_COLORS.DEFAULT_RGB;
        return { type: 'color', rgb };
      }
      
      if (typeof userTexture === 'object' && userTexture.type === 'color') {
        if (userTexture.rgb) {
          const rgb = isHoveredRegion 
            ? [Math.min(1, userTexture.rgb[0] + 0.3), Math.min(1, userTexture.rgb[1] + 0.3), Math.min(1, userTexture.rgb[2] + 0.4)] as RGB // Blue glow
            : userTexture.rgb;
          return { type: 'color', rgb };
        }
        // Fallback for color objects without RGB (shouldn't happen with new system)
        const rgb = isHoveredRegion 
          ? [0.52, 0.55, 0.6] as RGB 
          : DEFAULT_COLORS.DEFAULT_RGB;
        return { type: 'color', rgb };
      }
      
      if (typeof userTexture === 'object' && userTexture.type === 'texture') {
        if (isHoveredRegion) {
          // For hovered regions, render as bright color instead of texture
          return { 
            type: 'color', 
            rgb: [0.6, 0.8, 1.0] as RGB // Bright blue for region highlighting
          };
        }
        return { 
          type: 'texture', 
          path: userTexture.path, 
          name: userTexture.name,
          rotation: userTexture.rotation || 0,
          flipped: userTexture.flipped || false
        };
      }
    }
    
    // If no texture but it's part of hovered region, add a subtle highlight
    if (isHoveredRegion) {
      return { type: 'color', rgb: [0.2, 0.3, 0.4] as RGB }; // Subtle blue highlight
    }
    
    // Return undefined when there's no main texture - let background layer handle the color
    return undefined;
  }, [getHexColor, hoveredRegion, getRegionForHex, activeTab]);

  const handleWheel = useCallback((event: WheelEvent): void => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set zooming state and clear it after a delay
    setIsZooming(true);
    setTimeout(() => setIsZooming(false), 150);
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomDirection = event.deltaY > 0 ? -1 : 1;
    
        const currentHexRadius = hexRadiusRef.current || GRID_CONFIG.FALLBACK_HEX_RADIUS;
    
    const result = calculateZoomToPoint(
      zoomLevel,
      zoomDirection,
      mouseX,
      mouseY,
      canvasSize,
      panOffset,
      currentHexRadius,
      gridWidth,
      gridHeight
    );
    
    setZoomLevel(result.newZoom);
    setPanOffset(result.newPanOffset);
  }, [zoomLevel, panOffset, canvasSize, gridWidth, gridHeight]);

  // Gesture handling callbacks
  const handleZoomChange = useCallback((newZoom: number, newPanOffset: PanOffset) => {
    setZoomLevel(newZoom);
    setPanOffset(newPanOffset);
    setIsZooming(true);
    setTimeout(() => setIsZooming(false), 150);
  }, []);

  const handlePanChange = useCallback((newPanOffset: PanOffset) => {
    setPanOffset(newPanOffset);
  }, []);

  const handleGestureStart = useCallback(() => {
    setIsGesturing(true);
    onCanvasInteraction?.(); // Close menu on gesture start
  }, [onCanvasInteraction]);

  const handleGestureEnd = useCallback(() => {
    setIsGesturing(false);
  }, []);

  // Initialize pinch zoom and pan gestures for touch devices
  const currentHexRadius = hexRadiusRef.current || GRID_CONFIG.FALLBACK_HEX_RADIUS;
  const gesturesBind = usePinchZoomPan({
    canvasSize,
    gridWidth,
    gridHeight,
    currentZoom: zoomLevel,
    currentPanOffset: panOffset,
    currentHexRadius,
    onZoomChange: handleZoomChange,
    onPanChange: handlePanChange,
    onGestureStart: handleGestureStart,
    onGestureEnd: handleGestureEnd,
    disabled: !isTouchDevice || menuOpen // Disable gestures when menu is open
  });

  const paintHexIfNew = useCallback((hex: HexPosition | null): void => {
    if (!hex || !onHexClick) return;
    
    const hexKey = `${hex.row}-${hex.col}`;
    const paintedSet = paintedDuringDragRef.current;
    
    if (!paintedSet.has(hexKey)) {
      paintedSet.add(hexKey);
      onHexClick(hex.row, hex.col);
    }
  }, [onHexClick]);

  const initWebGL = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = initializeWebGLContext(canvas);
    if (!gl) return;

    glRef.current = gl;

    const { colorProgram, textureProgram } = createShaderPrograms(gl);
    if (!colorProgram || !textureProgram) return;

    colorProgramRef.current = colorProgram;
    textureProgramRef.current = textureProgram;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const hexRadius = calculateHexRadius(canvasSize, gridWidth, gridHeight, zoomLevel);
    const hexPositions = calculateHexPositions(hexRadius, gridWidth, gridHeight, canvasSize, panOffset);
    
    hexRadiusRef.current = hexRadius;
    hexPositionsRef.current = hexPositions;

    renderGrid();
  }, [canvasSize, gridWidth, gridHeight, zoomLevel, panOffset]);

  const renderGrid = useCallback((): void => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const colorProgram = colorProgramRef.current;
    const textureProgram = textureProgramRef.current;
    
    if (!gl || !canvas || !colorProgram || !textureProgram) return;

    const bgColor = backgroundColor?.rgb || GRID_CONFIG.DEFAULT_BACKGROUND_COLOR;
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], GRID_CONFIG.WEBGL_ALPHA_VALUE);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;

    hexPositions.forEach((pos) => {
      // First layer: Render background color if it exists
      const backgroundColorHex = getHexBackgroundColor && getHexBackgroundColor(pos.row, pos.col);
      if (backgroundColorHex) {
        const backgroundRgb = hexToRgb(backgroundColorHex);
        if (backgroundRgb) {
          const backgroundStyle = { type: 'color' as const, rgb: backgroundRgb };
          renderColorHexagon(gl, colorProgram, pos, backgroundStyle, hexRadius, canvas);
        }
      }
      
      // Second layer: Render main texture/color on top (only if it exists)
      const style = getHexagonStyle(pos.row, pos.col);
      
      if (style) {
        if (style.type === 'color' && style.rgb) {
          renderColorHexagon(gl, colorProgram, pos, style, hexRadius, canvas);
        } else if (style.type === 'texture' && style.path && style.name) {
          renderTextureHexagon(gl, textureProgram, pos, style, hexRadius, canvas);
        }
      }
    });

  }, [getHexagonStyle, getHexBackgroundColor, backgroundColor, hexToRgb]);

  // Shared painting logic for both mouse and touch events
  const handlePaintAtPosition = useCallback((clientX: number, clientY: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (activeTab === 'borders') {
      paintBorderIfNew(x, y);
    } else {
      const clickedHex = getHexFromMousePos(x, y, hexPositionsRef.current, hexRadiusRef.current);
      paintHexIfNew(clickedHex);
    }
  }, [paintHexIfNew, paintBorderIfNew, activeTab]);

  const handleMouseDown = useCallback((event: MouseEvent): void => {
    // Check if the click is on a button - if so, don't interfere
    const target = event.target as HTMLElement;
    if (target && target.closest('[data-hex-button]')) {
      return; // Let the button handle the click
    }
    
    event.preventDefault();
    
    // Notify parent of canvas interaction for menu closing
    onCanvasInteraction?.();
    
    if (event.button === 1) { // Middle mouse button for panning
      setIsPanning(true);
      setLastPanPosition({ x: event.clientX, y: event.clientY });
    } else if (event.button === 0) { // Left mouse button
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Check for region border button click first
        if (regionButtonState && activeTab === 'borders') {
          const clickedHex = getHexFromMousePos(x, y, hexPositionsRef.current, hexRadiusRef.current);
          if (clickedHex && clickedHex.row === regionButtonState.position.row && clickedHex.col === regionButtonState.position.col) {
            handleRegionBorderApplication(regionButtonState.regionId);
            return; // Don't proceed with normal actions
          }
        }

        // Note: Tile manipulation is now handled by HexButton components directly
        // This allows unified visual/clickable areas and removes the need for 
        // manual click detection here.
      }
      
      // Normal painting behavior
      setIsDragging(true);
      paintedDuringDragRef.current.clear();
      clearPaintedBorders();
      handlePaintAtPosition(event.clientX, event.clientY);
    }
  }, [handlePaintAtPosition, clearPaintedBorders, onCanvasInteraction, regionButtonState, activeTab, handleRegionBorderApplication]);

  const handleMouseMove = useCallback((event: MouseEvent): void => {
    if (isPanning && lastPanPosition) {
      // Handle panning
      const deltaX = event.clientX - lastPanPosition.x;
      const deltaY = event.clientY - lastPanPosition.y;
      
      const newPanOffset = {
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY
      };
      
      // Constrain the pan offset to reasonable bounds
      const currentHexRadius = hexRadiusRef.current || GRID_CONFIG.FALLBACK_HEX_RADIUS;
      const constrainedOffset = constrainPanOffset(
        newPanOffset,
        currentHexRadius,
        gridWidth,
        gridHeight,
        canvasSize
      );
      
      setPanOffset(constrainedOffset);
      setLastPanPosition({ x: event.clientX, y: event.clientY });
    } else if (isDragging) {
      // Handle painting
      handlePaintAtPosition(event.clientX, event.clientY);
    } else if (!isDragging && !isPanning) {
      // Track hover state for tile manipulation and region detection
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const currentHoveredHex = getHexFromMousePos(x, y, hexPositionsRef.current, hexRadiusRef.current);
        
        // Update hovered hex state and call callback
        if (currentHoveredHex) {
          // Only update if it's a different hex
          if (!hoveredHex || hoveredHex.row !== currentHoveredHex.row || hoveredHex.col !== currentHoveredHex.col) {
            setHoveredHex(currentHoveredHex);
            onHexHover?.(currentHoveredHex.row, currentHoveredHex.col);
          }
          
          // Region button state is now handled by useEffect when hoveredRegion changes
          
          // Tile manipulation logic - only update when hex actually changes
          // Show buttons when design menu is active (either open or minimized) and on paint tab
          if (activeTab === 'paint') {
            const currentHexKey = `${currentHoveredHex.row}-${currentHoveredHex.col}`;
            
            // Only check texture and update state if we've moved to a different hex
            if (lastButtonHexRef.current !== currentHexKey) {
              const currentTexture = getHexColor && getHexColor(currentHoveredHex.row, currentHoveredHex.col);
              
              // Show buttons for textured tiles
              if (currentTexture && typeof currentTexture === 'object' && currentTexture.type === 'texture') {
                setTileHoverState({ hexCoord: { row: currentHoveredHex.row, col: currentHoveredHex.col }, buttonRegion: 'center' });
              } else {
                setTileHoverState({ hexCoord: null, buttonRegion: null });
              }
              
              lastButtonHexRef.current = currentHexKey;
            }
          } else {
            // Clear state when not on paint tab
            if (tileHoverState.hexCoord) {
              setTileHoverState({ hexCoord: null, buttonRegion: null });
            }
            lastButtonHexRef.current = null;
          }
        } else {
          // No hex hovered - clear state
          if (hoveredHex) {
            setHoveredHex(null);
            onHexHover?.(null, null);
          }
          setTileHoverState({ hexCoord: null, buttonRegion: null });
          lastButtonHexRef.current = null;
        }
      }
    }
  }, [isDragging, isPanning, lastPanPosition, panOffset, gridWidth, gridHeight, canvasSize, handlePaintAtPosition, menuOpen, selectedTexture, getHexColor, getButtonRegion, hoveredHex, onHexHover, activeTab, hoveredRegion, getRegionForHex, canApplyRegionBorders]);

  const handleMouseUp = useCallback((event: MouseEvent): void => {
    if (event.button === 1) { // Middle mouse button
      setIsPanning(false);
      setLastPanPosition(null);
    } else if (event.button === 0) { // Left mouse button
      setIsDragging(false);
      paintedDuringDragRef.current.clear();
      clearPaintedBorders();
    }
  }, [clearPaintedBorders]);

  const handleMouseLeave = useCallback((): void => {
    setIsDragging(false);
    setIsPanning(false);
    setLastPanPosition(null);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
    // Clear tile hover state when mouse leaves canvas
    setTileHoverState({ hexCoord: null, buttonRegion: null });
    lastButtonHexRef.current = null;
    // Clear hex hover for region detection
    if (hoveredHex) {
      setHoveredHex(null);
      onHexHover?.(null, null);
    }
    // Region button state is now managed by useEffect
  }, [clearPaintedBorders, hoveredHex, onHexHover]);

  // Touch event handlers - updated to work with gesture system
  const handleTouchStart = useCallback((event: TouchEvent): void => {
    // Don't prevent default here - let gesture library handle it
    const touch = event.touches[0];
    if (!touch) return;
    
    // Skip painting if we're in a multi-touch gesture
    if (event.touches.length > 1 || isGesturing) return;
    
    // Notify parent of canvas interaction for menu closing
    onCanvasInteraction?.();
    
    setIsDragging(true);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
    
    handlePaintAtPosition(touch.clientX, touch.clientY);
  }, [handlePaintAtPosition, clearPaintedBorders, onCanvasInteraction, isGesturing]);

  const handleTouchMove = useCallback((event: TouchEvent): void => {
    // Skip painting if we're in a multi-touch gesture
    if (event.touches.length > 1 || isGesturing || !isDragging) return;
    
    const touch = event.touches[0];
    if (!touch) return;
    
    handlePaintAtPosition(touch.clientX, touch.clientY);
  }, [isDragging, handlePaintAtPosition, isGesturing]);

  const handleTouchEnd = useCallback((event: TouchEvent): void => {
    // Only handle single touch end events
    if (isGesturing) return;
    
    setIsDragging(false);
    setIsPanning(false);
    setLastPanPosition(null);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
  }, [clearPaintedBorders, isGesturing]);

  const renderColorHexagon = (
    gl: WebGLRenderingContext,
    colorProgram: WebGLProgram,
    pos: HexPosition,
    style: HexStyle,
    hexRadius: number,
    canvas: HTMLCanvasElement
  ): void => {
    if (!style.rgb) return;

        gl.useProgram(colorProgram);
        
        const positionAttributeLocation = gl.getAttribLocation(colorProgram, 'a_position');
        const resolutionUniformLocation = gl.getUniformLocation(colorProgram, 'u_resolution');
        const translationUniformLocation = gl.getUniformLocation(colorProgram, 'u_translation');
        const colorUniformLocation = gl.getUniformLocation(colorProgram, 'u_color');
        
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        
    const { vertices } = createHexagonVertices(0, 0, hexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO);
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, GRID_CONFIG.VERTEX_SHADER_COMPONENTS, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        const [r, g, b] = style.rgb;
    gl.uniform4f(colorUniformLocation, r, g, b, GRID_CONFIG.WEBGL_ALPHA_VALUE);
    
    gl.drawArrays(gl.TRIANGLES, 0, GRID_CONFIG.HEX_VERTICES_TOTAL);
  };

  const renderTextureHexagon = (
    gl: WebGLRenderingContext,
    textureProgram: WebGLProgram,
    pos: HexPosition,
    style: HexStyle,
    hexRadius: number,
    canvas: HTMLCanvasElement
  ): void => {
        const textures = texturesRef.current;
        
    if (!textures.has(style.name!)) {
      const texture = loadTexture(gl, style.path!, () => {
        requestAnimationFrame(() => {
          if (glRef.current && colorProgramRef.current && textureProgramRef.current) {
            renderGrid();
          }
        });
      });
      if (texture) {
        textures.set(style.name!, texture);
          }
        }
        
        gl.useProgram(textureProgram);
        
        const positionAttributeLocation = gl.getAttribLocation(textureProgram, 'a_position');
        const texCoordAttributeLocation = gl.getAttribLocation(textureProgram, 'a_texCoord');
        const resolutionUniformLocation = gl.getUniformLocation(textureProgram, 'u_resolution');
        const translationUniformLocation = gl.getUniformLocation(textureProgram, 'u_translation');
        const rotationUniformLocation = gl.getUniformLocation(textureProgram, 'u_rotation');
        const flippedUniformLocation = gl.getUniformLocation(textureProgram, 'u_flipped');
        const textureUniformLocation = gl.getUniformLocation(textureProgram, 'u_texture');
        
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        
        // Convert rotation from 1/6th increments to radians
        // Each increment is 60 degrees = π/3 radians
        const rotationRadians = (style.rotation || 0) * (Math.PI / 3);
        gl.uniform1f(rotationUniformLocation, rotationRadians);
        
        // Set flip uniform (1.0 for flipped, 0.0 for normal)
        const flipValue = style.flipped ? 1.0 : 0.0;
        gl.uniform1f(flippedUniformLocation, flipValue);
        
    const { vertices, texCoords } = createHexagonVertices(0, 0, hexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO, true);
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, GRID_CONFIG.VERTEX_SHADER_COMPONENTS, gl.FLOAT, false, 0, 0);
        
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        if (texCoords) {
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        }
        gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(texCoordAttributeLocation, GRID_CONFIG.TEXTURE_COORDINATE_COMPONENTS, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        
    const texture = textures.get(style.name!);
        if (texture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(textureUniformLocation, 0);
          
      gl.drawArrays(gl.TRIANGLES, 0, GRID_CONFIG.HEX_VERTICES_TOTAL);
        }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const containerElement = canvas.parentElement;
    if (!containerElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height });
      }
    });

    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    initWebGL();
  }, [initWebGL]);

  useEffect(() => {
    const bordersCanvas = bordersCanvasRef.current;
    if (bordersCanvas) {
      bordersCanvas.width = canvasSize.width;
      bordersCanvas.height = canvasSize.height;
    }
    
    const numberingCanvas = numberingCanvasRef.current;
    if (numberingCanvas) {
      numberingCanvas.width = canvasSize.width;
      numberingCanvas.height = canvasSize.height;
    }
  }, [canvasSize]);

  // Edge numbering renderer
  const renderEdgeNumbering = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    hexPositions: HexPosition[],
    hexRadius: number
  ) => {
    const fontSize = calculateEdgeFontSize(hexRadius);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = NUMBERING_CONFIG.OUTLINE_WIDTH;
    
    // Find the actual visual bounds of the rendered grid
    const visibleHexes = hexPositions.filter(pos => 
      pos.x >= -hexRadius && pos.x <= canvas.width + hexRadius &&
      pos.y >= -hexRadius && pos.y <= canvas.height + hexRadius
    );
    
    if (visibleHexes.length === 0) return;
    
    // Calculate the actual rendered grid boundaries
    const leftmostX = Math.min(...visibleHexes.map(p => p.x - hexRadius));
    const rightmostX = Math.max(...visibleHexes.map(p => p.x + hexRadius));
    const topmostY = Math.min(...visibleHexes.map(p => p.y - hexRadius));
    const bottommostY = Math.max(...visibleHexes.map(p => p.y + hexRadius));
    
    // Ensure the bounds are within the viewport
    const actualLeft = Math.max(leftmostX, 0);
    const actualRight = Math.min(rightmostX, canvas.width);
    const actualTop = Math.max(topmostY, 0);
    const actualBottom = Math.min(bottommostY, canvas.height);
    
    // Group hexes by column and row for efficient rendering
    const hexesByCol = new Map<number, HexPosition[]>();
    const hexesByRow = new Map<number, HexPosition[]>();
    
    visibleHexes.forEach(hex => {
      if (!hexesByCol.has(hex.col)) hexesByCol.set(hex.col, []);
      if (!hexesByRow.has(hex.row)) hexesByRow.set(hex.row, []);
      hexesByCol.get(hex.col)!.push(hex);
      hexesByRow.get(hex.row)!.push(hex);
    });
    
    // Render column letters relative to grid edges
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const columnOffset = hexRadius * 0.4; // Distance from grid edge
    
    hexesByCol.forEach((hexes, col) => {
      const letter = columnToLetter(col);
      const avgX = hexes.reduce((sum, hex) => sum + hex.x, 0) / hexes.length;
      
      // Only render if column is visible
      if (avgX >= actualLeft - hexRadius && avgX <= actualRight + hexRadius) {
        // Top of grid
        if (actualTop > 0) {
          ctx.strokeText(letter, avgX, actualTop - columnOffset);
          ctx.fillText(letter, avgX, actualTop - columnOffset);
        }
        
        // Bottom of grid
        if (actualBottom < canvas.height) {
          ctx.strokeText(letter, avgX, actualBottom + columnOffset);
          ctx.fillText(letter, avgX, actualBottom + columnOffset);
        }
      }
    });
    
    // Render row numbers relative to grid edges (closer to grid)
    const rowOffset = hexRadius * 0.3; // Closer to grid than columns
    
    hexesByRow.forEach((hexes, row) => {
      const number = rowToNumber(row);
      const avgY = hexes.reduce((sum, hex) => sum + hex.y, 0) / hexes.length;
      
      // Only render if row is visible
      if (avgY >= actualTop - hexRadius && avgY <= actualBottom + hexRadius) {
        // Left of grid
        if (actualLeft > 0) {
          ctx.strokeText(number, actualLeft - rowOffset, avgY);
          ctx.fillText(number, actualLeft - rowOffset, avgY);
        }
        
        // Right of grid
        if (actualRight < canvas.width) {
          ctx.strokeText(number, actualRight + rowOffset, avgY);
          ctx.fillText(number, actualRight + rowOffset, avgY);
        }
      }
    });
  }, []);
  
  // In-hex numbering renderer
  const renderInHexNumbering = useCallback((
    ctx: CanvasRenderingContext2D,
    hexPositions: HexPosition[],
    hexRadius: number
  ) => {
    const fontSize = calculateInHexFontSize(hexRadius);
    ctx.font = `${fontSize}px Arial`;
    
    hexPositions.forEach(pos => {
      const coordinate = getHexCoordinate(pos.row, pos.col);
      const textX = pos.x; // Centered horizontally
      const textY = pos.y + hexRadius * NUMBERING_CONFIG.VERTICAL_OFFSET; // Bottom edge of hex
      
      renderOutlinedText(
        ctx, 
        coordinate, 
        textX, 
        textY, 
        'white', 
        'black', 
        NUMBERING_CONFIG.OUTLINE_WIDTH, 
        'center', 
        'middle'
      );
    });
  }, []);

  // Numbering rendering function
  const renderNumbering = useCallback(() => {
    const canvas = numberingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (numberingMode === 'off') return;
    
    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;
    
    if (hexRadius <= 0 || hexPositions.length === 0) return;
    
    ctx.font = `${calculateGeneralFontSize(hexRadius)}px Arial`;
    
    if (numberingMode === 'edge') {
      renderEdgeNumbering(ctx, canvas, hexPositions, hexRadius);
    } else if (numberingMode === 'in-hex') {
      renderInHexNumbering(ctx, hexPositions, hexRadius);
    }
  }, [numberingMode, renderEdgeNumbering, renderInHexNumbering]);

  useEffect(() => {
    if (glRef.current && colorProgramRef.current && textureProgramRef.current) {
      renderGrid();
    }
  }, [hexColorsVersion, hexBackgroundColorsVersion, hexIconsVersion, renderGrid]);

  // Separate effect for region highlighting to avoid constant re-renders during mouse movement
  useEffect(() => {
    // Only trigger re-render for region highlighting if we're in borders mode
    if (activeTab === 'borders' && glRef.current && colorProgramRef.current && textureProgramRef.current) {
      renderGrid();
    }
  }, [hoveredRegion, activeTab, renderGrid]);

  useEffect(() => {
    if (hexPositionsRef.current.length > 0 && hexRadiusRef.current > 0) {
      renderBordersThrottled();
      updateIconPositionsThrottled();
      renderNumbering();
    }

    return () => {
      cancelPendingRenders();
      cancelPendingIconUpdates();
    };
  }, [bordersVersion, borders, renderBordersThrottled, canvasSize, zoomLevel, panOffset, numberingMode, renderNumbering, cancelPendingRenders, updateIconPositionsThrottled, cancelPendingIconUpdates, gridWidth, gridHeight]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (container && canvas) {
      // Mouse events on container to track mouse even when over buttons
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseLeave);
      container.addEventListener('contextmenu', (e) => e.preventDefault());
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      // Touch events on container
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });
      container.addEventListener('touchcancel', handleTouchEnd, { passive: false }); // Treat touchcancel same as touchend
      
      document.addEventListener('mouseup', handleMouseUp);
      
      // Update cursor based on interaction state
      if (isPanning) {
        canvas.style.cursor = 'grabbing';
      } else if (isDragging) {
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'grab'; // Show grab cursor to indicate panning is available
      }
      
      return () => {
        // Remove mouse events from container
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('contextmenu', (e) => e.preventDefault());
        container.removeEventListener('wheel', handleWheel);
        
        // Remove touch events from container
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
        
        document.removeEventListener('mouseup', handleMouseUp);
          canvas.style.cursor = 'default';
        
        cancelPendingRenders();
        cancelPendingIconUpdates();
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging, isPanning, cancelPendingRenders, cancelPendingIconUpdates]);

  // Stable click handlers at component level
  const handleCenterClick = useCallback((hex: HexPosition) => handleTileManipulation(hex, 'center'), [handleTileManipulation]);
  const handleLeftClick = useCallback((hex: HexPosition) => handleTileManipulation(hex, 'left'), [handleTileManipulation]);
  const handleRightClick = useCallback((hex: HexPosition) => handleTileManipulation(hex, 'right'), [handleTileManipulation]);

  // Memoized button components isolated from throttled updates
  const tileManipulationButtons = useMemo(() => {
    if (!tileHoverState.hexCoord) return null;
    
    const hexCoord = tileHoverState.hexCoord;
    const hexRadius = hexRadiusRef.current || 20; // Use stable ref, not throttled value
    
    // Find the actual hex position from coordinates using stable ref
    const hex = hexPositionsRef.current.find(pos => pos.row === hexCoord.row && pos.col === hexCoord.col);
    if (!hex) return null;
    
    // Check if this hex has a texture (only show buttons on textured hexes)
    const currentTexture = getHexColor && getHexColor(hexCoord.row, hexCoord.col);
    const hasTexture = currentTexture && typeof currentTexture === 'object' && currentTexture.type === 'texture';
    
    if (!hasTexture) return null;

    return (
      <>
        <HexButton
          key={`center-${hexCoord.row}-${hexCoord.col}`}
          type="center"
          hexX={hex.x}
          hexY={hex.y}
          hexRadius={hexRadius}
          onClick={() => handleCenterClick(hex)}
          visible={true}
        >
          ⬤
        </HexButton>
        
        <HexButton
          key={`left-${hexCoord.row}-${hexCoord.col}`}
          type="left"
          hexX={hex.x}
          hexY={hex.y}
          hexRadius={hexRadius}
          onClick={() => handleLeftClick(hex)}
          visible={true}
        >
          ↺
        </HexButton>
        
        <HexButton
          key={`right-${hexCoord.row}-${hexCoord.col}`}
          type="right"
          hexX={hex.x}
          hexY={hex.y}
          hexRadius={hexRadius}
          onClick={() => handleRightClick(hex)}
          visible={true}
        >
          ↻
        </HexButton>
      </>
    );
  }, [tileHoverState.hexCoord, getHexColor, handleCenterClick, handleLeftClick, handleRightClick]);
  
  // Create separate memoized component for buttons to isolate from throttled re-renders
  const ButtonOverlay = useMemo(() => {
    // Show buttons when design menu is active (either open or minimized) and on paint tab
    if (!tileHoverState.hexCoord || activeTab !== 'paint' || isPanning || isDragging || isZooming) {
      return null;
    }
    
    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Don't interfere with canvas interactions
        zIndex: 4
      }}>
        {tileManipulationButtons}
      </div>
    );
  }, [tileHoverState.hexCoord, activeTab, isPanning, isDragging, isZooming, tileManipulationButtons]);

  return (
    <div 
      ref={containerRef} 
      className="hex-grid-container"
      {...(isTouchDevice ? gesturesBind() : {})}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {/* Main WebGL Canvas */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%'
        }} 
        width={canvasSize.width}
        height={canvasSize.height}
      />
      
      {/* Borders Canvas Overlay */}
      <canvas 
        ref={bordersCanvasRef}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Allow clicks to pass through
          zIndex: 2
        }} 
        width={canvasSize.width}
        height={canvasSize.height}
      />
      
      {/* Numbering Canvas Overlay */}
      <canvas 
        ref={numberingCanvasRef}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Allow clicks to pass through
          zIndex: 3
        }} 
        width={canvasSize.width}
        height={canvasSize.height}
      />
      
      {/* Icon Overlays */}
      {getHexIcon && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Allow clicks to pass through to canvas
          overflow: 'hidden'
        }}>
          {throttledPositions.map((pos) => {
            const coloredIcon = getHexIcon(pos.row, pos.col);
            if (!coloredIcon) return null;
            
            const { icon, color } = coloredIcon;
            const iconSize = throttledRadius * 1.2; // Icon size relative to hex
            
            return (
              <div
                key={`${pos.row}-${pos.col}`}
                style={{
                  position: 'absolute',
                  left: pos.x - iconSize / 2,
                  top: pos.y - iconSize / 2,
                  width: iconSize,
                  height: iconSize,
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              >
                <img
                  src={icon.path}
                  alt={icon.displayName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'brightness(0)',
                    position: 'absolute'
                  }}
                />
                <div style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: color,
                  mask: `url(${icon.path}) center/contain no-repeat`,
                  WebkitMask: `url(${icon.path}) center/contain no-repeat`,
                  position: 'absolute'
                }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Tile Manipulation Button Regions Overlay */}
      {ButtonOverlay}

      {/* Region Border Button Overlay */}
      {regionButtonState && activeTab === 'borders' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto', // Allow clicks on this button
          zIndex: 5
        }}>
          {(() => {
            const hex = regionButtonState.position;
            const hexRadius = throttledRadius;
            
            // Button dimensions - make it larger and more visible
            const buttonWidth = hexRadius * 1.8;
            const buttonHeight = hexRadius * 0.8;
            
            // Center the button on the hex
            const buttonX = hex.x - buttonWidth / 2;
            const buttonY = hex.y - buttonHeight / 2;

            return (
              <div
                onClick={() => handleRegionBorderApplication(regionButtonState.regionId)}
                style={{
                  position: 'absolute',
                  left: buttonX,
                  top: buttonY,
                  width: buttonWidth,
                  height: buttonHeight,
                  backgroundColor: 'rgba(59, 130, 246, 0.9)', // Blue background
                  border: '2px solid rgba(59, 130, 246, 1)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${Math.max(12, hexRadius * 0.15)}px`,
                  color: 'white',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 1)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Add Borders
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
});

HexGrid.displayName = 'HexGrid';

export default HexGrid; 