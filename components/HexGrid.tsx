import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GRID_CONFIG, DEFAULT_COLORS } from './config';
import type { Color, RGB, IconItem } from './config';

// Import utility modules
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

// Type definitions specific to HexGrid component
interface HexTexture {
  type: 'color' | 'texture';
  name: string;
  displayName: string;
  rgb?: RGB;
  path?: string;
}

type HexColor = string;

// Barrier edge type for rendering
interface BarrierEdge {
  fromHex: string;
  toHex: string;
  color: { value: string; rgb: RGB };
}

interface HexGridProps {
  gridWidth?: number;
  gridHeight?: number;
  colors?: readonly Color[];
  onHexClick?: (row: number, col: number) => void;
  onEdgeClick?: (fromHex: string, toHex: string) => void;
  getHexColor?: (row: number, col: number) => HexColor | HexTexture | undefined;
  getHexIcon?: (row: number, col: number) => IconItem | undefined;
  hexColorsVersion?: number;
  hexIconsVersion?: number;
  backgroundColor?: { rgb: RGB };
  barriers?: Record<string, BarrierEdge>;
  barriersVersion?: number;
}

export interface HexGridRef {
  exportAsPNG: (filename?: string, scale?: number) => Promise<void>;
}

const HexGrid = forwardRef<HexGridRef, HexGridProps>(({ 
  gridWidth = GRID_CONFIG.DEFAULT_WIDTH, 
  gridHeight = GRID_CONFIG.DEFAULT_HEIGHT, 
  colors, 
  onHexClick, 
  onEdgeClick,
  getHexColor, 
  getHexIcon,
  hexColorsVersion = 0,
  hexIconsVersion = 0,
  backgroundColor,
  barriers,
  barriersVersion = 0
}, ref) => {
  // Canvas and WebGL refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barriersCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const colorProgramRef = useRef<WebGLProgram | null>(null);
  const textureProgramRef = useRef<WebGLProgram | null>(null);
  
  // State management
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ 
    width: GRID_CONFIG.DEFAULT_CANVAS_WIDTH, 
    height: GRID_CONFIG.DEFAULT_CANVAS_HEIGHT 
  });
  const [zoomLevel, setZoomLevel] = useState<number>(GRID_CONFIG.BASE_ZOOM_LEVEL);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Cached values for performance
  const hexPositionsRef = useRef<HexPosition[]>([]);
  const hexRadiusRef = useRef<number>(0);
  const paintedDuringDragRef = useRef<Set<string>>(new Set());
  const texturesRef = useRef<Map<string, WebGLTexture>>(new Map());

  // Export functionality using the utility
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
      getHexagonStyle: (row: number, col: number) => getHexagonStyle(row, col)
    });
  }, [canvasSize, gridWidth, gridHeight, backgroundColor, getHexColor, colors]);

  // Expose export function through ref
  useImperativeHandle(ref, () => ({
    exportAsPNG
  }), [exportAsPNG]);

  // Get color or texture for a hexagon
  const getHexagonStyle = useCallback((row: number, col: number): HexStyle => {
    const userTexture = getHexColor && getHexColor(row, col);
    
    if (userTexture) {
      // Handle special grey case
      if (userTexture === DEFAULT_COLORS.SELECTED) {
        return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
      }
      
      // Handle color textures
      if (typeof userTexture === 'object' && userTexture.type === 'color') {
        if (userTexture.rgb) {
          return { type: 'color', rgb: userTexture.rgb };
        }
        if (colors) {
          const colorData = colors.find(c => c.name === userTexture.name);
          if (colorData) {
            return { type: 'color', rgb: colorData.rgb };
          }
        }
      }
      
      // Handle image textures
      if (typeof userTexture === 'object' && userTexture.type === 'texture') {
        return { type: 'texture', path: userTexture.path, name: userTexture.name };
      }
    }
    
    // Default grey color if no user color is set
    return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
  }, [getHexColor, colors]);

  // Handle wheel event for zooming
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

  // Paint a hex if it hasn't been painted during this drag
  const paintHexIfNew = useCallback((hex: HexPosition | null): void => {
    if (!hex || !onHexClick) return;
    
    const hexKey = `${hex.row}-${hex.col}`;
    const paintedSet = paintedDuringDragRef.current;
    
    if (!paintedSet.has(hexKey)) {
      paintedSet.add(hexKey);
      onHexClick(hex.row, hex.col);
    }
  }, [onHexClick]);





  // Initialize WebGL context and shaders
  const initWebGL = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = initializeWebGLContext(canvas);
    if (!gl) return;

    glRef.current = gl;

    // Create shader programs
    const { colorProgram, textureProgram } = createShaderPrograms(gl);
    if (!colorProgram || !textureProgram) return;

    colorProgramRef.current = colorProgram;
    textureProgramRef.current = textureProgram;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Calculate hex radius and positions
    const hexRadius = calculateHexRadius(canvasSize, gridWidth, gridHeight, zoomLevel);
    const hexPositions = calculateHexPositions(hexRadius, gridWidth, gridHeight, canvasSize, panOffset);
    
    // Store for click detection
    hexRadiusRef.current = hexRadius;
    hexPositionsRef.current = hexPositions;

    // Initial render
    renderGrid();
  }, [canvasSize, gridWidth, gridHeight, zoomLevel, panOffset]);

  // Render the grid
  const renderGrid = useCallback((): void => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const colorProgram = colorProgramRef.current;
    const textureProgram = textureProgramRef.current;
    
    if (!gl || !canvas || !colorProgram || !textureProgram) return;

    // Clear canvas with selected background color
    const bgColor = backgroundColor?.rgb || GRID_CONFIG.DEFAULT_BACKGROUND_COLOR;
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], GRID_CONFIG.WEBGL_ALPHA_VALUE);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;

    // Draw each hexagon
    hexPositions.forEach((pos) => {
      const style = getHexagonStyle(pos.row, pos.col);
      
      if (style.type === 'color' && style.rgb) {
        renderColorHexagon(gl, colorProgram, pos, style, hexRadius, canvas);
      } else if (style.type === 'texture' && style.path && style.name) {
        renderTextureHexagon(gl, textureProgram, pos, style, hexRadius, canvas);
      }
    });

    // Note: Barriers are now drawn separately in useEffect to avoid WebGL interference
  }, [getHexagonStyle, backgroundColor]);

  // Calculate barrier position in the gap between two adjacent hexagons
  const getSharedEdgeVertices = useCallback((fromHex: string, toHex: string, hexRadius: number, hexPositions: HexPosition[]): { start: { x: number; y: number }, end: { x: number; y: number } } | null => {
    const positionMap = new Map<string, HexPosition>();
    hexPositions.forEach(pos => {
      positionMap.set(`${pos.row}-${pos.col}`, pos);
    });

    const fromPos = positionMap.get(fromHex);
    const toPos = positionMap.get(toHex);
    
    if (!fromPos || !toPos) return null;

    
    
               // Parse hex coordinates to determine adjacency type
      const [fromRow, fromCol] = fromHex.split('-').map(Number);
      const [toRow, toCol] = toHex.split('-').map(Number);
      const rowDiff = toRow - fromRow;
      const colDiff = toCol - fromCol;
      
      // Check if this is a problematic diagonal that appears center-to-center
      const isProblematicDiagonal = (
        (rowDiff === 1 && colDiff === 1 && fromCol % 2 === 0) || // Even col to lower-right
        (rowDiff === -1 && colDiff === -1 && fromCol % 2 === 1)   // Odd col to upper-left
      );
      
      if (isProblematicDiagonal) {
        // Use actual edge vertex approach for these problematic cases
        const visualRadius = hexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
        const angleStep = (Math.PI * 2) / 6;
        
        let fromAngle: number, toAngle: number;
        
        if (rowDiff === 1 && colDiff === 1) {
          // Lower-right diagonal from even column
          fromAngle = 4 * angleStep; // 240°
          toAngle = 5 * angleStep; // 300°
        } else {
          // Upper-left diagonal from odd column  
          fromAngle = angleStep; // 60°
          toAngle = 2 * angleStep; // 120°
        }
        
        // Calculate edge vertices slightly inward to create gap appearance
        const inwardOffset = 0.15; // 15% inward from edge
        const adjustedRadius = visualRadius * (1 - inwardOffset);
        
        const startX = fromPos.x + Math.cos(fromAngle) * adjustedRadius;
        const startY = fromPos.y + Math.sin(fromAngle) * adjustedRadius;
        const endX = fromPos.x + Math.cos(toAngle) * adjustedRadius;
        const endY = fromPos.y + Math.sin(toAngle) * adjustedRadius;
        
        return {
          start: { x: startX, y: startY },
          end: { x: endX, y: endY }
        };
             } else {
         // Use standard midpoint approach for all other adjacencies
         
         // For horizontal adjacencies, ensure consistent orientation to prevent offset duplicates
         let fromPosition = fromPos;
         let toPosition = toPos;
         
         if (rowDiff === 0) {
           // Horizontal edge - always orient left to right for consistency
           if (fromCol > toCol) {
             fromPosition = toPos;
             toPosition = fromPos;
           }
         }
         
         const centerToCenter = {
           x: toPosition.x - fromPosition.x,
           y: toPosition.y - fromPosition.y
         };
         
         const distance = Math.sqrt(centerToCenter.x * centerToCenter.x + centerToCenter.y * centerToCenter.y);
         
         const normalized = {
           x: centerToCenter.x / distance,
           y: centerToCenter.y / distance
         };
         
         const perpendicular = {
           x: -normalized.y,
           y: normalized.x
         };
         
         const midpoint = {
           x: (fromPosition.x + toPosition.x) / 2,
           y: (fromPosition.y + toPosition.y) / 2
         };
         
         const visualRadius = hexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
         const barrierLength = visualRadius;
         
         return {
           start: {
             x: midpoint.x + perpendicular.x * barrierLength / 2,
             y: midpoint.y + perpendicular.y * barrierLength / 2
           },
           end: {
             x: midpoint.x - perpendicular.x * barrierLength / 2,
             y: midpoint.y - perpendicular.y * barrierLength / 2
           }
         };
       }
   }, []);

  // Detect if click is on an edge between two hexes  
  const getEdgeFromMousePos = useCallback((mouseX: number, mouseY: number): { fromHex: string, toHex: string } | null => {
    const hexPositions = hexPositionsRef.current;
    const hexRadius = hexRadiusRef.current;
    
    if (hexPositions.length === 0 || hexRadius === 0) {
      return null;
    }
    
    interface EdgeCandidate {
      fromHex: string;
      toHex: string;
      distance: number;
    }
    
    let closestEdge: EdgeCandidate | null = null;
    let minDistance = Infinity;
    
    // Check all hex pairs for nearby edges
    for (let i = 0; i < hexPositions.length; i++) {
      const hex1 = hexPositions[i];
      
      // Calculate hex1's neighbors using COLUMN-based parity (matches our layout)
      const isEvenCol = hex1.col % 2 === 0;
      let neighbors;
      
             if (isEvenCol) {
         // Even column neighbors
         neighbors = [
           { row: hex1.row, col: hex1.col + 1 }, // Right
           { row: hex1.row, col: hex1.col - 1 }, // Left
           { row: hex1.row - 1, col: hex1.col + 1 }, // Upper-right
           { row: hex1.row - 1, col: hex1.col }, // Upper-left
           { row: hex1.row + 1, col: hex1.col + 1 }, // Lower-right
           { row: hex1.row + 1, col: hex1.col }  // Lower-left
         ];
       } else {
         // Odd column neighbors  
         neighbors = [
           { row: hex1.row, col: hex1.col + 1 }, // Right
           { row: hex1.row, col: hex1.col - 1 }, // Left
           { row: hex1.row - 1, col: hex1.col }, // Upper-right
           { row: hex1.row - 1, col: hex1.col - 1 }, // Upper-left
           { row: hex1.row + 1, col: hex1.col + 1 }, // Lower-right
           { row: hex1.row + 1, col: hex1.col - 1 }  // Lower-left
         ];
       }
      
      neighbors.forEach(neighborCoord => {
        // Find the actual position of this neighbor
        const hex2 = hexPositions.find(p => p.row === neighborCoord.row && p.col === neighborCoord.col);
        if (!hex2) return;
        
        // Get the actual edge vertices using the same logic as barrier rendering
        const fromHex = `${hex1.row}-${hex1.col}`;
        const toHex = `${hex2.row}-${hex2.col}`;
        const edgeVertices = getSharedEdgeVertices(fromHex, toHex, hexRadius, hexPositions);
        
        if (!edgeVertices) return;
        
        // Calculate the midpoint of the actual edge
        const edgeMidX = (edgeVertices.start.x + edgeVertices.end.x) / 2;
        const edgeMidY = (edgeVertices.start.y + edgeVertices.end.y) / 2;
        
        // Calculate distance from mouse to actual edge midpoint
        const distance = Math.sqrt(Math.pow(mouseX - edgeMidX, 2) + Math.pow(mouseY - edgeMidY, 2));
        
        // Use a reasonable threshold for edge detection
        if (distance < hexRadius * 0.4 && distance < minDistance) {
          closestEdge = {
            fromHex,
            toHex,
            distance
          };
          minDistance = distance;
        }
      });
    }
    
    if (closestEdge) {
      return { 
        fromHex: (closestEdge as EdgeCandidate).fromHex, 
        toHex: (closestEdge as EdgeCandidate).toHex 
      };
    }
    
         return null;
   }, [getSharedEdgeVertices]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: MouseEvent): void => {
    event.preventDefault();
    setIsDragging(true);
    paintedDuringDragRef.current.clear();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // First try to detect edge click (for barriers)
    const clickedEdge = getEdgeFromMousePos(mouseX, mouseY);
    if (clickedEdge && onEdgeClick) {
      onEdgeClick(clickedEdge.fromHex, clickedEdge.toHex);
      return;
    }
    
    // If no edge was clicked, check for hex click
    const clickedHex = getHexFromMousePos(mouseX, mouseY, hexPositionsRef.current, hexRadiusRef.current);
    paintHexIfNew(clickedHex);
  }, [paintHexIfNew, getEdgeFromMousePos, onEdgeClick]);

  const handleMouseMove = useCallback((event: MouseEvent): void => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const hoveredHex = getHexFromMousePos(mouseX, mouseY, hexPositionsRef.current, hexRadiusRef.current);
    paintHexIfNew(hoveredHex);
  }, [isDragging, paintHexIfNew]);

  const handleMouseUp = useCallback((): void => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
  }, []);

  const handleMouseLeave = useCallback((): void => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
  }, []);

  // Render barriers between hexagons on separate canvas
  const renderBarriers = useCallback((): void => {
    const barriersCanvas = barriersCanvasRef.current;
    if (!barriersCanvas || !barriers || Object.keys(barriers).length === 0) return;

    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;
    
    if (hexRadius <= 0 || hexPositions.length === 0) return;

    // Set up canvas 2D context for drawing lines
    const ctx = barriersCanvas.getContext('2d');
    if (!ctx) return;

    // Clear the barriers canvas
    ctx.clearRect(0, 0, barriersCanvas.width, barriersCanvas.height);

    // Save the current context state
    ctx.save();

    // Draw each barrier in the gap between hexagons (recalculate positions for current zoom/pan)
    Object.values(barriers).forEach(barrier => {
      const edgeVertices = getSharedEdgeVertices(barrier.fromHex, barrier.toHex, hexRadius, hexPositions);
      
      if (edgeVertices) {
        ctx.strokeStyle = barrier.color.value;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(edgeVertices.start.x, edgeVertices.start.y);
        ctx.lineTo(edgeVertices.end.x, edgeVertices.end.y);
        ctx.stroke();
      }
    });

    // Restore the context state
    ctx.restore();
  }, [barriers, getSharedEdgeVertices]);

  // Render a colored hexagon
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

  // Render a textured hexagon
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
        // Re-render when texture loads
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
        
        // Position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, GRID_CONFIG.VERTEX_SHADER_COMPONENTS, gl.FLOAT, false, 0, 0);
        
        // Texture coordinate buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        if (texCoords) {
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        }
        gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(texCoordAttributeLocation, GRID_CONFIG.TEXTURE_COORDINATE_COMPONENTS, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        
        // Bind texture
    const texture = textures.get(style.name!);
        if (texture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(textureUniformLocation, 0);
          
      gl.drawArrays(gl.TRIANGLES, 0, GRID_CONFIG.HEX_VERTICES_TOTAL);
        }
  };

  // Resize observer to handle dynamic canvas sizing
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

  // Initialize WebGL when canvas size changes
  useEffect(() => {
    initWebGL();
  }, [initWebGL]);

  // Sync barriers canvas size with main canvas
  useEffect(() => {
    const barriersCanvas = barriersCanvasRef.current;
    if (barriersCanvas) {
      barriersCanvas.width = canvasSize.width;
      barriersCanvas.height = canvasSize.height;
    }
  }, [canvasSize]);

  // Re-render when hex colors, icons change
  useEffect(() => {
    if (glRef.current && colorProgramRef.current && textureProgramRef.current) {
      renderGrid();
    }
  }, [hexColorsVersion, hexIconsVersion, renderGrid]);

  // Separate effect for barrier rendering
  useEffect(() => {
    const barriersCanvas = barriersCanvasRef.current;
    if (!barriersCanvas || !barriers || Object.keys(barriers).length === 0) {
      // Clear canvas if no barriers
      if (barriersCanvas) {
        const ctx = barriersCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, barriersCanvas.width, barriersCanvas.height);
        }
      }
      return;
    }
    
    // Small delay to ensure WebGL rendering is complete
    const timeoutId = setTimeout(() => {
      renderBarriers();
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [barriersVersion, barriers, renderBarriers, canvasSize, zoomLevel, panOffset]);

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      
      document.addEventListener('mouseup', handleMouseUp);
      
        canvas.style.cursor = isDragging ? 'grabbing' : 'crosshair';
      
      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        canvas.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mouseup', handleMouseUp);
          canvas.style.cursor = 'default';
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleWheel, isDragging]);

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
      
      {/* Barriers Canvas Overlay */}
      <canvas 
        ref={barriersCanvasRef}
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
          {hexPositionsRef.current.map((pos) => {
            const icon = getHexIcon(pos.row, pos.col);
            if (!icon) return null;
            
            const hexRadius = hexRadiusRef.current;
            const iconSize = hexRadius * 1.2; // Icon size relative to hex
            
            return (
              <img
                key={`${pos.row}-${pos.col}`}
                src={icon.path}
                alt={icon.displayName}
                style={{
                  position: 'absolute',
                  left: pos.x - iconSize / 2,
                  top: pos.y - iconSize / 2,
                  width: iconSize,
                  height: iconSize,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

HexGrid.displayName = 'HexGrid';

export default HexGrid; 