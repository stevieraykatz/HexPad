/**
 * PNG Export Utilities
 * 
 * Helper functions for exporting the hex grid as PNG images with proper scaling and quality.
 */

import { GRID_CONFIG, HEX_GEOMETRY } from '../components/config';
import { initializeWebGLContext, createShaderPrograms, loadTexture } from './webglUtils';
import { createHexagonVertices, calculateExportHexPositions } from './hexagonUtils';
import type { CanvasSize, HexPosition } from './hexagonUtils';
import type { RGB } from '../components/config';

// Type definitions
export interface HexStyle {
  type: 'color' | 'texture';
  rgb?: RGB;
  path?: string;
  name?: string;
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
  getHexagonStyle: (row: number, col: number) => HexStyle;
  borders?: Record<string, BorderEdge>;
  getHexIcon?: (row: number, col: number) => IconItem | undefined;
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
  const textureUniformLocation = gl.getUniformLocation(textureProgram, 'u_texture');
  
  gl.uniform2f(resolutionUniformLocation, canvasSize.width, canvasSize.height);
  
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
  getHexIcon: (row: number, col: number) => IconItem | undefined,
  scale: number
): Promise<void> => {
  const ctx = canvas.getContext('2d');
  if (!ctx || !getHexIcon) {
    return;
  }

  // Collect all icons that need to be rendered
  const iconsToRender: Array<{ pos: HexPosition; icon: IconItem }> = [];
  
  hexPositions.forEach((pos) => {
    const icon = getHexIcon(pos.row, pos.col);
    if (icon) {
      iconsToRender.push({ pos, icon });
    }
  });

  if (iconsToRender.length === 0) return;

  // Load and render each icon
  const iconPromises = iconsToRender.map(({ pos, icon }) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const iconSize = hexRadius * 1.2; // Same scaling as in HexGrid component, radius is already scaled
        const x = pos.x - iconSize / 2;
        const y = pos.y - iconSize / 2;
        
        ctx.drawImage(img, x, y, iconSize, iconSize);
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
 * Export hex grid as PNG with high quality
 */
export const exportAsPNG = async (options: ExportOptions): Promise<void> => {
  const { filename, scale, gridWidth, gridHeight, canvasSize, backgroundColor, getHexagonStyle, borders, getHexIcon } = options;
  


  // Create off-screen canvas at higher resolution
  const exportCanvas = document.createElement('canvas');
  const exportSize = {
    width: canvasSize.width * scale,
    height: canvasSize.height * scale
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

    // Calculate hex radius and positions for export
    const exportHexRadius = calculateExportHexRadius(exportSize, gridWidth, gridHeight, scale);
    const exportHexPositions = calculateExportHexPositions(exportHexRadius, gridWidth, gridHeight, exportSize, scale);

    // Collect all unique textures needed for export
    const texturesNeeded = new Set<string>();
    const textureStyles = new Map<string, { path: string; name: string }>();
    
    exportHexPositions.forEach((pos) => {
      const style = getHexagonStyle(pos.row, pos.col);
      if (style.type === 'texture' && style.path && style.name) {
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

    // Render each hexagon for export
    exportHexPositions.forEach((pos) => {
      const style = getHexagonStyle(pos.row, pos.col);
      
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