import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GRID_CONFIG, DEFAULT_COLORS } from './config';
import type { RGB, IconItem } from './config';
import type { ColoredIcon } from './config/iconsConfig';

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
import { calculateZoomToPoint } from '../utils/zoomPanUtils';
import { exportAsPNG as exportUtility, type HexStyle } from '../utils/exportUtils';
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
  selectedIcon = null
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bordersCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const colorProgramRef = useRef<WebGLProgram | null>(null);
  const textureProgramRef = useRef<WebGLProgram | null>(null);
  
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ 
    width: GRID_CONFIG.DEFAULT_CANVAS_WIDTH, 
    height: GRID_CONFIG.DEFAULT_CANVAS_HEIGHT 
  });
  const [zoomLevel, setZoomLevel] = useState<number>(GRID_CONFIG.BASE_ZOOM_LEVEL);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
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
      getHexIcon
    });
  }, [canvasSize, gridWidth, gridHeight, backgroundColor, getHexColor, borders, getHexIcon]);

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
    setIsDragging(true);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
    
    handlePaintAtPosition(event.clientX, event.clientY);
  }, [handlePaintAtPosition, clearPaintedBorders]);

  const handleMouseMove = useCallback((event: MouseEvent): void => {
    if (!isDragging) return;
    handlePaintAtPosition(event.clientX, event.clientY);
  }, [isDragging, handlePaintAtPosition]);

  const handleMouseUp = useCallback((): void => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
  }, [clearPaintedBorders]);

  const handleMouseLeave = useCallback((): void => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
  }, [clearPaintedBorders]);

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent): void => {
    event.preventDefault(); // Prevent page scrolling and default touch behaviors
    const touch = event.touches[0];
    if (!touch) return;
    
    setIsDragging(true);
    paintedDuringDragRef.current.clear();
    clearPaintedBorders();
    
    handlePaintAtPosition(touch.clientX, touch.clientY);
  }, [handlePaintAtPosition, clearPaintedBorders]);

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
  }, [canvasSize]);

  useEffect(() => {
    if (glRef.current && colorProgramRef.current && textureProgramRef.current) {
      renderGrid();
    }
  }, [hexColorsVersion, hexIconsVersion, renderGrid]);

  useEffect(() => {
    if (hexPositionsRef.current.length > 0 && hexRadiusRef.current > 0) {
      renderBordersThrottled();
      updateIconPositionsThrottled();
    }

    return () => {
      cancelPendingRenders();
      cancelPendingIconUpdates();
    };
  }, [bordersVersion, borders, renderBordersThrottled, canvasSize, zoomLevel, panOffset, cancelPendingRenders, updateIconPositionsThrottled, cancelPendingIconUpdates]);

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
      
        canvas.style.cursor = isDragging ? 'grabbing' : 'crosshair';
      
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
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, isDragging, cancelPendingRenders, cancelPendingIconUpdates]);

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