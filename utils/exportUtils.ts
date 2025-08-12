/**
 * PNG Export Utilities
 * 
 * Helper functions for exporting the hex grid as PNG images with proper scaling and quality.
 */

import { GRID_CONFIG, HEX_GEOMETRY } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import type { NumberingMode } from '../components/GridSizeControls';
import { initializeWebGLContext, createShaderPrograms, loadTexture } from './webglUtils';
import { createHexagonVertices, calculateExportHexPositions } from './hexagonUtils';
import type { CanvasSize, HexPosition } from './hexagonUtils';
import type { RGB } from '../components/config';
import { columnToLetter, rowToNumber, getHexCoordinate, calculateEdgeFontSize, calculateInHexFontSize } from './numberingUtils';
import { NUMBERING_CONFIG } from '../components/config/numberingConfig';

// Type definitions
export interface HexStyle {
  type: 'color' | 'texture';
  rgb?: RGB;
  path?: string;
  name?: string;
  rotation?: number; // Rotation in 1/6th increments (0-5)
  highlight?: boolean; // For region highlighting
}

export interface BorderEdge {
  fromHex: string;
  toHex: string;
  color: string;
}

export interface IconItem {
  name: string;
  displayName: string;
  type: 'icon';
  path: string;
}

export interface ExportOptions {
  filename: string;
  scale: number;
  gridWidth: number;
  gridHeight: number;
  canvasSize: CanvasSize;
  backgroundColor?: { rgb: RGB };
  getHexagonStyle: (row: number, col: number) => HexStyle | undefined;
  getHexBackgroundColor?: (row: number, col: number) => string | undefined;
  borders?: Record<string, BorderEdge>;
  getHexIcon?: (row: number, col: number) => ColoredIcon | undefined;
  numberingMode?: NumberingMode;
}

/**
 * Calculate export hex radius for high-resolution export
 */
export const calculateExportHexRadius = (
  exportSize: CanvasSize,
  gridWidth: number,
  gridHeight: number,
  scale: number
): number => {
  const baseHexRadiusFromWidth = (exportSize.width * GRID_CONFIG.CANVAS_MARGIN_FACTOR) / 
    (2 * (GRID_CONFIG.HEX_HORIZONTAL_SPACING_RATIO * gridWidth + GRID_CONFIG.HEX_GRID_WIDTH_CALCULATION_OFFSET));
  const baseHexRadiusFromHeight = (exportSize.height * GRID_CONFIG.CANVAS_MARGIN_FACTOR) / 
    (HEX_GEOMETRY.SQRT_3 * gridHeight);
  
  return Math.max(GRID_CONFIG.MIN_HEX_RADIUS * scale, Math.min(baseHexRadiusFromWidth, baseHexRadiusFromHeight));
};

/**
 * Render a colored hexagon to the export canvas
 */
export const renderColorHexagon = (
  gl: WebGLRenderingContext,
  colorProgram: WebGLProgram,
  pos: HexPosition,
  style: HexStyle,
  hexRadius: number,
  canvasSize: CanvasSize
): void => {
  if (!style.rgb) return;

  gl.useProgram(colorProgram);
  
  const positionAttributeLocation = gl.getAttribLocation(colorProgram, 'a_position');
  const resolutionUniformLocation = gl.getUniformLocation(colorProgram, 'u_resolution');
  const translationUniformLocation = gl.getUniformLocation(colorProgram, 'u_translation');
  const colorUniformLocation = gl.getUniformLocation(colorProgram, 'u_color');
  
  gl.uniform2f(resolutionUniformLocation, canvasSize.width, canvasSize.height);
  
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

/**
 * Render a textured hexagon to the export canvas
 */
export const renderTextureHexagon = (
  gl: WebGLRenderingContext,
  textureProgram: WebGLProgram,
  pos: HexPosition,
  style: HexStyle,
  hexRadius: number,
  canvasSize: CanvasSize,
  texture: WebGLTexture
): void => {
  gl.useProgram(textureProgram);
  
  const positionAttributeLocation = gl.getAttribLocation(textureProgram, 'a_position');
  const texCoordAttributeLocation = gl.getAttribLocation(textureProgram, 'a_texCoord');
  const resolutionUniformLocation = gl.getUniformLocation(textureProgram, 'u_resolution');
  const translationUniformLocation = gl.getUniformLocation(textureProgram, 'u_translation');
  const rotationUniformLocation = gl.getUniformLocation(textureProgram, 'u_rotation');
  const textureUniformLocation = gl.getUniformLocation(textureProgram, 'u_texture');
  
  gl.uniform2f(resolutionUniformLocation, canvasSize.width, canvasSize.height);
  
  // Convert rotation from 1/6th increments to radians
  // Each increment is 60 degrees = π/3 radians
  const rotationRadians = (style.rotation || 0) * (Math.PI / 3);
  gl.uniform1f(rotationUniformLocation, rotationRadians);
  
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
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(textureUniformLocation, 0);
  
  gl.drawArrays(gl.TRIANGLES, 0, GRID_CONFIG.HEX_VERTICES_TOTAL);
};

/**
 * Render fallback color hexagon when texture fails to load
 */
export const renderFallbackHexagon = (
  gl: WebGLRenderingContext,
  colorProgram: WebGLProgram,
  pos: HexPosition,
  hexRadius: number,
  canvasSize: CanvasSize
): void => {
  gl.useProgram(colorProgram);
  
  const positionAttributeLocation = gl.getAttribLocation(colorProgram, 'a_position');
  const resolutionUniformLocation = gl.getUniformLocation(colorProgram, 'u_resolution');
  const translationUniformLocation = gl.getUniformLocation(colorProgram, 'u_translation');
  const colorUniformLocation = gl.getUniformLocation(colorProgram, 'u_color');
  
  gl.uniform2f(resolutionUniformLocation, canvasSize.width, canvasSize.height);
  
  const { vertices } = createHexagonVertices(0, 0, hexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO);
  
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, GRID_CONFIG.VERTEX_SHADER_COMPONENTS, gl.FLOAT, false, 0, 0);
  
  gl.uniform2f(translationUniformLocation, pos.x, pos.y);
  gl.uniform4f(
    colorUniformLocation, 
    GRID_CONFIG.FALLBACK_TEXTURE_COLOR[0], 
    GRID_CONFIG.FALLBACK_TEXTURE_COLOR[1], 
    GRID_CONFIG.FALLBACK_TEXTURE_COLOR[2], 
    GRID_CONFIG.WEBGL_ALPHA_VALUE
  );
  
  gl.drawArrays(gl.TRIANGLES, 0, GRID_CONFIG.HEX_VERTICES_TOTAL);
};

/**
 * Calculate shared edge vertices for border rendering (same logic as HexGrid component)
 */
export const getSharedEdgeVertices = (
  fromHex: string, 
  toHex: string, 
  hexRadius: number, 
  hexPositions: HexPosition[]
): { start: { x: number; y: number }, end: { x: number; y: number } } | null => {
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
    const borderLength = visualRadius;
    
    return {
      start: {
        x: midpoint.x + perpendicular.x * borderLength / 2,
        y: midpoint.y + perpendicular.y * borderLength / 2
      },
      end: {
        x: midpoint.x - perpendicular.x * borderLength / 2,
        y: midpoint.y - perpendicular.y * borderLength / 2
      }
    };
  }
};

/**
 * Render borders on export canvas using 2D context
 */
export const renderBorders = (
  canvas: HTMLCanvasElement,
  borders: Record<string, BorderEdge>,
  hexRadius: number,
  hexPositions: HexPosition[],
  scale: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !borders || Object.keys(borders).length === 0) {
    return;
  }

  ctx.save();
  
  // Reset any transforms and set proper rendering state
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  // Draw each border
  Object.values(borders).forEach(border => {
    const edgeVertices = getSharedEdgeVertices(border.fromHex, border.toHex, hexRadius, hexPositions);
    
    if (edgeVertices) {
      ctx.strokeStyle = border.color;
      ctx.lineWidth = 6 * scale; // Scale line width for export
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(edgeVertices.start.x, edgeVertices.start.y);
      ctx.lineTo(edgeVertices.end.x, edgeVertices.end.y);
      ctx.stroke();
    }
  });

  ctx.restore();
};

/**
 * Render icons on export canvas using 2D context
 */
export const renderIcons = async (
  canvas: HTMLCanvasElement,
  hexPositions: HexPosition[],
  hexRadius: number,
  getHexIcon: (row: number, col: number) => ColoredIcon | undefined,
  scale: number
): Promise<void> => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !getHexIcon) {
    return;
  }

  // Collect all icons that need to be rendered
  const iconsToRender: Array<{ pos: HexPosition; coloredIcon: ColoredIcon }> = [];
  
  hexPositions.forEach((pos) => {
    const coloredIcon = getHexIcon(pos.row, pos.col);
    if (coloredIcon) {
      iconsToRender.push({ pos, coloredIcon });
    }
  });

  if (iconsToRender.length === 0) return;

  // Load and render each icon with color masking
  const iconPromises = iconsToRender.map(({ pos, coloredIcon }) => {
    return new Promise<void>((resolve) => {
      const { icon, color } = coloredIcon;
      const img = new Image();
      img.onload = () => {
        const iconSize = hexRadius * 1.2; // Same scaling as in HexGrid component, radius is already scaled
        const x = pos.x - iconSize / 2;
        const y = pos.y - iconSize / 2;
        
        // Create a temporary canvas for color masking
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = iconSize;
        tempCanvas.height = iconSize;
        const tempCtx = tempCanvas.getContext('2d')!;
        
        // Step 1: Draw the icon normally to get the shape
        tempCtx.drawImage(img, 0, 0, iconSize, iconSize);
        
        // Step 2: Create colored version using compositing
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = color;
        tempCtx.fillRect(0, 0, iconSize, iconSize);
        
        // Draw the colored icon to the main canvas
        ctx.drawImage(tempCanvas, x, y);
        resolve();
      };
      img.onerror = (error) => {
        console.warn(`Failed to load icon: ${icon.path}`, error);
        resolve();
      };
      img.src = icon.path;
    });
  });

  // Wait for all icons to be rendered
  await Promise.all(iconPromises);
};

/**
 * Download blob as PNG file
 */
export const downloadPNG = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Render numbering on export canvas
 */
const renderNumberingForExport = (
  canvas: HTMLCanvasElement, 
  hexPositions: HexPosition[],
  hexRadius: number,
  numberingMode: NumberingMode,
  scale: number
): void => {
  if (numberingMode === 'off') return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  if (numberingMode === 'edge') {
    renderEdgeNumberingForExport(ctx, canvas, hexPositions, hexRadius, scale);
  } else if (numberingMode === 'in-hex') {
    renderInHexNumberingForExport(ctx, hexPositions, hexRadius, scale);
  }
};

/**
 * Render edge numbering for export
 */
const renderEdgeNumberingForExport = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  hexPositions: HexPosition[],
  hexRadius: number,
  scale: number
): void => {
  const fontSize = calculateEdgeFontSize(hexRadius);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = NUMBERING_CONFIG.OUTLINE_WIDTH * scale;
  
  // Find the actual visual bounds of the rendered grid for export
  const visibleHexes = hexPositions; // For export, all positioned hexes are relevant
  
  if (visibleHexes.length === 0) return;
  
  // Calculate the actual rendered grid boundaries
  const leftmostX = Math.min(...visibleHexes.map(p => p.x - hexRadius));
  const rightmostX = Math.max(...visibleHexes.map(p => p.x + hexRadius));
  const topmostY = Math.min(...visibleHexes.map(p => p.y - hexRadius));
  const bottommostY = Math.max(...visibleHexes.map(p => p.y + hexRadius));
  
  // For export, use the actual grid bounds (no viewport clipping needed)
  const actualLeft = leftmostX;
  const actualRight = rightmostX;
  const actualTop = topmostY;
  const actualBottom = bottommostY;
  
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
    
    // Top of grid
    ctx.strokeText(letter, avgX, actualTop - columnOffset);
    ctx.fillText(letter, avgX, actualTop - columnOffset);
    
    // Bottom of grid
    ctx.strokeText(letter, avgX, actualBottom + columnOffset);
    ctx.fillText(letter, avgX, actualBottom + columnOffset);
  });
  
  // Render row numbers relative to grid edges (closer to grid)
  const rowOffset = hexRadius * 0.3; // Closer to grid than columns
  
  hexesByRow.forEach((hexes, row) => {
    const number = rowToNumber(row);
    const avgY = hexes.reduce((sum, hex) => sum + hex.y, 0) / hexes.length;
    
    // Left of grid
    ctx.strokeText(number, actualLeft - rowOffset, avgY);
    ctx.fillText(number, actualLeft - rowOffset, avgY);
    
    // Right of grid
    ctx.strokeText(number, actualRight + rowOffset, avgY);
    ctx.fillText(number, actualRight + rowOffset, avgY);
  });
};

/**
 * Render in-hex numbering for export
 */
const renderInHexNumberingForExport = (
  ctx: CanvasRenderingContext2D,
  hexPositions: HexPosition[],
  hexRadius: number,
  scale: number
): void => {
  const fontSize = calculateInHexFontSize(hexRadius);
  
  hexPositions.forEach(pos => {
    const coordinate = getHexCoordinate(pos.row, pos.col);
    const textX = pos.x; // Centered horizontally
    const textY = pos.y + hexRadius * NUMBERING_CONFIG.VERTICAL_OFFSET; // Bottom edge of hex
    
    // Save current state
    ctx.save();
    
    // Set text properties
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px Arial`;
    
    // Draw outline
    ctx.strokeStyle = 'black';
    ctx.lineWidth = NUMBERING_CONFIG.OUTLINE_WIDTH * scale;
    ctx.lineJoin = 'round';
    ctx.strokeText(coordinate, textX, textY);
    
    // Draw fill
    ctx.fillStyle = 'white';
    ctx.fillText(coordinate, textX, textY);
    
    // Restore state
    ctx.restore();
  });
};

/**
 * Convert hex color string to RGB array
 */
const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [0.5, 0.5, 0.5]; // Default gray if parsing fails
  }
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
};

/**
 * Export hex grid as PNG with high quality
 */
export const exportAsPNG = async (options: ExportOptions): Promise<void> => {
  const { filename, scale, gridWidth, gridHeight, canvasSize, backgroundColor, getHexagonStyle, getHexBackgroundColor, borders, getHexIcon, numberingMode } = options;
  


  // Calculate base export size without numbering
  const baseExportSize = {
    width: canvasSize.width * scale,
    height: canvasSize.height * scale
  };

  // Calculate extra space needed for edge numbering
  let numberingPadding = { top: 0, bottom: 0, left: 0, right: 0 };
  
  if (numberingMode === 'edge') {
    // Pre-calculate hex radius based on the base size (without numbering padding)
    const tempHexRadius = calculateExportHexRadius(baseExportSize, gridWidth, gridHeight, scale);
    
    // Calculate space needed for numbering
    const columnOffset = tempHexRadius * 0.4;
    const rowOffset = tempHexRadius * 0.3;
    const fontSize = calculateEdgeFontSize(tempHexRadius);
    
    // Add padding for text height/width plus some buffer
    numberingPadding = {
      top: columnOffset + fontSize + 10 * scale,
      bottom: columnOffset + fontSize + 10 * scale,
      left: rowOffset + fontSize + 10 * scale,
      right: rowOffset + fontSize + 10 * scale
    };
  }

  // Create off-screen canvas at higher resolution with numbering padding
  const exportCanvas = document.createElement('canvas');
  const exportSize = {
    width: baseExportSize.width + numberingPadding.left + numberingPadding.right,
    height: baseExportSize.height + numberingPadding.top + numberingPadding.bottom
  };
  
  exportCanvas.width = exportSize.width;
  exportCanvas.height = exportSize.height;

  // Initialize WebGL on export canvas
  const exportGL = initializeWebGLContext(exportCanvas);
  if (!exportGL) {
    console.error('WebGL not supported for export');
    return;
  }

  try {
    // Create shader programs
    const { colorProgram, textureProgram } = createShaderPrograms(exportGL);
    if (!colorProgram || !textureProgram) return;

    // Calculate hex radius and positions based on base size (without numbering padding)
    const exportHexRadius = calculateExportHexRadius(baseExportSize, gridWidth, gridHeight, scale);
    const baseHexPositions = calculateExportHexPositions(exportHexRadius, gridWidth, gridHeight, baseExportSize, scale);
    
    // Offset hex positions to account for numbering padding
    const exportHexPositions = baseHexPositions.map(pos => ({
      ...pos,
      x: pos.x + numberingPadding.left,
      y: pos.y + numberingPadding.top
    }));

    // Collect all unique textures needed for export
    const texturesNeeded = new Set<string>();
    const textureStyles = new Map<string, { path: string; name: string }>();
    
    exportHexPositions.forEach((pos) => {
      const style = getHexagonStyle(pos.row, pos.col);
      if (style && style.type === 'texture' && style.path && style.name) {
        texturesNeeded.add(style.name);
        textureStyles.set(style.name, { path: style.path, name: style.name });
      }
    });

    // Load all textures for export
    const exportTextures = new Map<string, WebGLTexture>();
    const textureLoadPromises: Promise<void>[] = [];

    texturesNeeded.forEach((textureName) => {
      const textureData = textureStyles.get(textureName);
      if (textureData) {
        const promise = new Promise<void>((resolve, reject) => {
          const texture = loadTexture(exportGL, textureData.path, () => {
            exportTextures.set(textureName, texture!);
            resolve();
          });
          if (!texture) {
            reject(new Error(`Failed to create texture for ${textureName}`));
          }
        });
        textureLoadPromises.push(promise);
      }
    });

    // Wait for all textures to load
    try {
      await Promise.all(textureLoadPromises);
    } catch (error) {
      console.warn('Some textures failed to load for export:', error);
    }

    // Clear export canvas with selected background color
    const exportBgColor = backgroundColor?.rgb || GRID_CONFIG.DEFAULT_BACKGROUND_COLOR;
    exportGL.clearColor(exportBgColor[0], exportBgColor[1], exportBgColor[2], GRID_CONFIG.WEBGL_ALPHA_VALUE);
    exportGL.clear(exportGL.COLOR_BUFFER_BIT);

    // Render each hexagon for export using two-layer approach (like HexGrid.tsx)
    exportHexPositions.forEach((pos) => {
      // First layer: Render background color if it exists
      if (getHexBackgroundColor) {
        const backgroundColorHex = getHexBackgroundColor(pos.row, pos.col);
        if (backgroundColorHex) {
          const backgroundRgb = hexToRgb(backgroundColorHex);
          const backgroundStyle: HexStyle = {
            type: 'color',
            rgb: backgroundRgb
          };
          renderColorHexagon(exportGL, colorProgram, pos, backgroundStyle, exportHexRadius, exportSize);
        }
      }
      
      // Second layer: Render main texture/color on top (only if it exists)
      const style = getHexagonStyle(pos.row, pos.col);
      
      if (style) {
        if (style.type === 'color' && style.rgb) {
          renderColorHexagon(exportGL, colorProgram, pos, style, exportHexRadius, exportSize);
        } else if (style.type === 'texture' && style.path && style.name) {
          const texture = exportTextures.get(style.name);
          if (texture) {
            renderTextureHexagon(exportGL, textureProgram, pos, style, exportHexRadius, exportSize, texture);
          } else {
            // Fallback to colored rendering if texture failed to load
            renderFallbackHexagon(exportGL, colorProgram, pos, exportHexRadius, exportSize);
          }
        }
      }
    });

    // Create a 2D canvas for compositing borders and icons
    const compositingCanvas = document.createElement('canvas');
    compositingCanvas.width = exportSize.width;
    compositingCanvas.height = exportSize.height;
    const compositingCtx = compositingCanvas.getContext('2d');
    
    if (compositingCtx) {
      // Copy the WebGL canvas content to the compositing canvas
      try {
        compositingCtx.drawImage(exportCanvas, 0, 0);
      } catch (error) {
        console.error('Failed to copy WebGL canvas:', error);
      }
      
      // Render borders on top of hexagons
      if (borders && Object.keys(borders).length > 0) {
        renderBorders(compositingCanvas, borders, exportHexRadius, exportHexPositions, scale);
      }

      // Render icons on top of everything
      if (getHexIcon) {
        await renderIcons(compositingCanvas, exportHexPositions, exportHexRadius, getHexIcon, scale);
      }
      
      // Render numbering on top of everything else
      if (numberingMode && numberingMode !== 'off') {
        renderNumberingForExport(compositingCanvas, exportHexPositions, exportHexRadius, numberingMode, scale);
      }
      
      // Use the compositing canvas for final export
      compositingCanvas.toBlob((blob) => {
        if (blob) {
          downloadPNG(blob, filename);
        }
      }, 'image/png');
    } else {
      // Fallback to original canvas if compositing fails
      exportCanvas.toBlob((blob) => {
        if (blob) {
          downloadPNG(blob, filename);
        }
      }, 'image/png');
    }

  } catch (error) {
    console.error('Error exporting PNG:', error);
  }
}; 