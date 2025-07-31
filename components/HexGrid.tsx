import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GRID_CONFIG, DEFAULT_COLORS } from './config';
import type { RGB, IconItem } from './config';
import type { ColoredIcon } from './config/iconsConfig';
import type { NumberingMode } from './GridSizeControls';

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
import type { BorderEdge } from '../utils/borderUtils';

interface HexTexture {
  type: 'color' | 'texture';
  name: string;
  displayName: string;
  rgb?: RGB;
  path?: string;
}

type HexColor = string;

interface HexGridProps {
  gridWidth?: number;
  gridHeight?: number;
  onHexClick?: (row: number, col: number) => void;
  onEdgeClick?: (fromHex: string, toHex: string) => void;
  getHexColor?: (row: number, col: number) => HexColor | HexTexture | undefined;
  getHexIcon?: (row: number, col: number) => ColoredIcon | undefined;

  hexColorsVersion?: number;
  hexIconsVersion?: number;
  backgroundColor?: { rgb: RGB };
  borders?: Record<string, BorderEdge>;
  bordersVersion?: number;
  activeTab?: 'paint' | 'icons' | 'borders' | 'settings';
  selectedIcon?: IconItem | null;
  numberingMode?: NumberingMode;
  onCanvasInteraction?: () => void; // Callback for when user interacts with canvas
}

export interface HexGridRef {
  exportAsPNG: (filename?: string, scale?: number) => Promise<void>;
}

const HexGrid = forwardRef<HexGridRef, HexGridProps>(({ 
  gridWidth = GRID_CONFIG.DEFAULT_WIDTH, 
  gridHeight = GRID_CONFIG.DEFAULT_HEIGHT, 
  onHexClick, 
  onEdgeClick,
  getHexColor, 
  getHexIcon,

  hexColorsVersion = 0,
  hexIconsVersion = 0,
  backgroundColor,
  borders,
  bordersVersion = 0,
  activeTab = 'paint',
  selectedIcon = null,
  numberingMode = 'off',
  onCanvasInteraction
}, ref) => {
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
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number; y: number } | null>(null);
  
  const hexPositionsRef = useRef<HexPosition[]>([]);
  const hexRadiusRef = useRef<number>(0);
  const paintedDuringDragRef = useRef<Set<string>>(new Set());
  const texturesRef = useRef<Map<string, WebGLTexture>>(new Map());

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
      borders,
      getHexIcon,
      numberingMode
    });
  }, [canvasSize, gridWidth, gridHeight, backgroundColor, getHexColor, borders, getHexIcon, numberingMode]);

  useImperativeHandle(ref, () => ({
    exportAsPNG
  }), [exportAsPNG]);

  const getHexagonStyle = useCallback((row: number, col: number): HexStyle => {
    const userTexture = getHexColor && getHexColor(row, col);
    
    if (userTexture) {
      if (userTexture === DEFAULT_COLORS.SELECTED) {
        return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
      }
      
      if (typeof userTexture === 'object' && userTexture.type === 'color') {
        if (userTexture.rgb) {
          return { type: 'color', rgb: userTexture.rgb };
        }
        // Fallback for color objects without RGB (shouldn't happen with new system)
        return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
      }
      
      if (typeof userTexture === 'object' && userTexture.type === 'texture') {
        return { type: 'texture', path: userTexture.path, name: userTexture.name };
      }
    }
    
    return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
  }, [getHexColor]);

  const handleWheel = useCallback((event: WheelEvent): void => {
    event.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
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
      const style = getHexagonStyle(pos.row, pos.col);
      
      if (style.type === 'color' && style.rgb) {
        renderColorHexagon(gl, colorProgram, pos, style, hexRadius, canvas);
      } else if (style.type === 'texture' && style.path && style.name) {
        renderTextureHexagon(gl, textureProgram, pos, style, hexRadius, canvas);
      }
    });

  }, [getHexagonStyle, backgroundColor]);

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
    event.preventDefault();
    
    // Notify parent of canvas interaction for menu closing
    onCanvasInteraction?.();
    
    if (event.button === 1) { // Middle mouse button for panning
      setIsPanning(true);
      setLastPanPosition({ x: event.clientX, y: event.clientY });
    } else if (event.button === 0) { // Left mouse button for painting
      setIsDragging(true);
      paintedDuringDragRef.current.clear();
      clearPaintedBorders();
      handlePaintAtPosition(event.clientX, event.clientY);
    }
  }, [handlePaintAtPosition, clearPaintedBorders, onCanvasInteraction]);

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
    }
  }, [isDragging, isPanning, lastPanPosition, panOffset, gridWidth, gridHeight, canvasSize, handlePaintAtPosition]);

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
  }, [clearPaintedBorders]);

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent): void => {
    event.preventDefault(); // Prevent page scrolling and default touch behaviors
    const touch = event.touches[0];
    if (!touch) return;
    
    // Notify parent of canvas interaction for menu closing
    onCanvasInteraction?.();
    
    setIsDragging(true);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
    
    handlePaintAtPosition(touch.clientX, touch.clientY);
  }, [handlePaintAtPosition, clearPaintedBorders, onCanvasInteraction]);

  const handleTouchMove = useCallback((event: TouchEvent): void => {
    event.preventDefault(); // Prevent page scrolling
    if (!isDragging) return;
    
    const touch = event.touches[0];
    if (!touch) return;
    
    handlePaintAtPosition(touch.clientX, touch.clientY);
  }, [isDragging, handlePaintAtPosition]);

  const handleTouchEnd = useCallback((event: TouchEvent): void => {
    event.preventDefault();
    setIsDragging(false);
    setIsPanning(false);
    setLastPanPosition(null);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
  }, [clearPaintedBorders]);

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
        const textureUniformLocation = gl.getUniformLocation(textureProgram, 'u_texture');
        
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        
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
  }, [hexColorsVersion, hexIconsVersion, renderGrid]);

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
  }, [bordersVersion, borders, renderBordersThrottled, canvasSize, zoomLevel, panOffset, numberingMode, renderNumbering, cancelPendingRenders, updateIconPositionsThrottled, cancelPendingIconUpdates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Mouse events
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      
      // Touch events
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false }); // Treat touchcancel same as touchend
      
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
        // Remove mouse events
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        canvas.removeEventListener('wheel', handleWheel);
        
        // Remove touch events
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
        
        document.removeEventListener('mouseup', handleMouseUp);
          canvas.style.cursor = 'default';
        
        cancelPendingRenders();
        cancelPendingIconUpdates();
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging, isPanning, cancelPendingRenders, cancelPendingIconUpdates]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
    </div>
  );
});

HexGrid.displayName = 'HexGrid';

export default HexGrid; 