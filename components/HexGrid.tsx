import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GRID_CONFIG, HEX_GEOMETRY, DEFAULT_COLORS } from './config';
import type { Color, RGB } from './config';

// Type definitions
interface HexPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface PanOffset {
  x: number;
  y: number;
}

interface ZoomLimits {
  minZoom: number;
  maxZoom: number;
}

interface PanLimits {
  minPanX: number;
  maxPanX: number;
  minPanY: number;
  maxPanY: number;
}

interface HexStyle {
  type: 'color' | 'texture';
  rgb?: RGB;
  path?: string;
  name?: string;
}

interface HexVertices {
  vertices: number[];
  texCoords?: number[];
}

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
  selectedColor?: string;
  selectedTexture?: HexTexture | null;
  colors?: readonly Color[];
  onHexClick?: (row: number, col: number) => void;
  getHexColor?: (row: number, col: number) => HexColor | HexTexture | undefined;
  hexColorsVersion?: number;
}

export interface HexGridRef {
  exportAsPNG: (filename?: string, scale?: number) => Promise<void>;
}

const HexGrid = forwardRef<HexGridRef, HexGridProps>(({ 
  gridWidth = GRID_CONFIG.DEFAULT_WIDTH, 
  gridHeight = GRID_CONFIG.DEFAULT_HEIGHT, 
  selectedColor, 
  selectedTexture, 
  colors, 
  onHexClick, 
  getHexColor, 
  hexColorsVersion = 0 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const colorProgramRef = useRef<WebGLProgram | null>(null);
  const textureProgramRef = useRef<WebGLProgram | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState<number>(GRID_CONFIG.BASE_ZOOM_LEVEL);
  const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 }); // Pan offset for zoom-to-cursor
  const hexPositionsRef = useRef<HexPosition[]>([]);
  const hexRadiusRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const paintedDuringDragRef = useRef<Set<string>>(new Set());
  const texturesRef = useRef<Map<string, WebGLTexture>>(new Map());

  // Export functionality
  const exportAsPNG = useCallback(async (filename: string = 'hex-grid', scale: number = 3): Promise<void> => {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas || !colors) return;

    // Create off-screen canvas at higher resolution
    const exportCanvas = document.createElement('canvas');
    const exportSize = {
      width: canvasSize.width * scale,
      height: canvasSize.height * scale
    };
    
    exportCanvas.width = exportSize.width;
    exportCanvas.height = exportSize.height;

    // Initialize WebGL on export canvas
    const exportGL = exportCanvas.getContext('webgl') as WebGLRenderingContext | null || 
                    exportCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!exportGL) {
      console.error('WebGL not supported for export');
      return;
    }

    try {
      // Create shaders for export
      const exportColorVertexShader = createShader(exportGL, exportGL.VERTEX_SHADER, colorVertexShaderSource);
      const exportColorFragmentShader = createShader(exportGL, exportGL.FRAGMENT_SHADER, colorFragmentShaderSource);
      const exportTextureVertexShader = createShader(exportGL, exportGL.VERTEX_SHADER, textureVertexShaderSource);
      const exportTextureFragmentShader = createShader(exportGL, exportGL.FRAGMENT_SHADER, textureFragmentShaderSource);
      
      if (!exportColorVertexShader || !exportColorFragmentShader || 
          !exportTextureVertexShader || !exportTextureFragmentShader) return;
      
      const exportColorProgram = createProgram(exportGL, exportColorVertexShader, exportColorFragmentShader);
      const exportTextureProgram = createProgram(exportGL, exportTextureVertexShader, exportTextureFragmentShader);
      
      if (!exportColorProgram || !exportTextureProgram) return;

      // Set up export canvas
      exportGL.viewport(0, 0, exportSize.width, exportSize.height);
      exportGL.enable(exportGL.BLEND);
      exportGL.blendFunc(exportGL.SRC_ALPHA, exportGL.ONE_MINUS_SRC_ALPHA);

      // Calculate hex radius and positions for export (without zoom/pan)
      const baseHexRadiusFromWidth = (exportSize.width * GRID_CONFIG.CANVAS_MARGIN_FACTOR) / (2 * (GRID_CONFIG.HEX_HORIZONTAL_SPACING_RATIO * gridWidth + 0.25));
      const baseHexRadiusFromHeight = (exportSize.height * GRID_CONFIG.CANVAS_MARGIN_FACTOR) / (HEX_GEOMETRY.SQRT_3 * gridHeight);
      const exportHexRadius = Math.max(GRID_CONFIG.MIN_HEX_RADIUS * scale, Math.min(baseHexRadiusFromWidth, baseHexRadiusFromHeight));
      
      // Calculate positions for export (centered, no pan offset)
      const exportHexPositions: HexPosition[] = [];
      const hexWidth = HEX_GEOMETRY.getHexWidth(exportHexRadius);
      const hexHeight = HEX_GEOMETRY.getHexHeight(exportHexRadius);
      const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(exportHexRadius);
      const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(exportHexRadius);

      const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
      
      // Calculate the actual visual height by finding the topmost and bottommost hexagon positions
      let minY = 0; // This will be the topmost hexagon center
      let maxY = 0; // This will be the bottommost hexagon center
      
      for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
          const y = row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      
      // Total visual height includes the radius of the topmost and bottommost hexagons
      // Note: hexagons are rendered at configurable size, so we use the actual rendered size for bounds
      const actualHexHeight = hexHeight * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
      const totalGridHeight = maxY - minY + actualHexHeight;
      
      // Add padding to provide breathing room around the grid edges (scaled for export)
      const verticalPadding = 35 * scale; // pixels of padding at top and bottom, scaled for export resolution
      
      // Adjust available height by padding and center the grid in the remaining space
      const availableHeight = exportSize.height - 2 * verticalPadding;
      const startX = (exportSize.width - totalGridWidth) / 2 + exportHexRadius;
      // Add static offsets to ensure proper padding on both top and bottom (scaled for export)
      const topPaddingOffset = 20 * scale; // Static offset to ensure top padding, scaled for export
      const bottomPaddingOffset = 20 * scale; // Static offset to ensure bottom padding, scaled for export
      const startY = verticalPadding + (availableHeight - totalGridHeight) / 2 + exportHexRadius - minY + topPaddingOffset - bottomPaddingOffset;

      for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
          const x = startX + col * horizontalSpacing;
          const y = startY + row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
          exportHexPositions.push({ x, y, row, col });
        }
      }

      // Collect all unique textures needed for export
      const texturesNeeded = new Set<string>();
      const textureStyles = new Map<string, { path: string; name: string }>();
      
      exportHexPositions.forEach((pos) => {
        const style = getHexagonStyle(pos.row, pos.col, 0);
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
            const texture = exportGL.createTexture();
            if (!texture) {
              reject(new Error(`Failed to create texture for ${textureName}`));
              return;
            }

            exportGL.bindTexture(exportGL.TEXTURE_2D, texture);
            
            // Create a 1x1 pixel placeholder until image loads
            const pixel = new Uint8Array([128, 128, 128, 255]); // Grey pixel
            exportGL.texImage2D(exportGL.TEXTURE_2D, 0, exportGL.RGBA, 1, 1, 0, exportGL.RGBA, exportGL.UNSIGNED_BYTE, pixel);
            
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
              try {
                exportGL.bindTexture(exportGL.TEXTURE_2D, texture);
                exportGL.texImage2D(exportGL.TEXTURE_2D, 0, exportGL.RGBA, exportGL.RGBA, exportGL.UNSIGNED_BYTE, image);
                
                // Set texture parameters
                if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                  exportGL.generateMipmap(exportGL.TEXTURE_2D);
                } else {
                  exportGL.texParameteri(exportGL.TEXTURE_2D, exportGL.TEXTURE_WRAP_S, exportGL.CLAMP_TO_EDGE);
                  exportGL.texParameteri(exportGL.TEXTURE_2D, exportGL.TEXTURE_WRAP_T, exportGL.CLAMP_TO_EDGE);
                  exportGL.texParameteri(exportGL.TEXTURE_2D, exportGL.TEXTURE_MIN_FILTER, exportGL.LINEAR);
                }
                
                exportTextures.set(textureName, texture);
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            image.onerror = () => {
              reject(new Error(`Failed to load image for ${textureName}: ${textureData.path}`));
            };
            image.src = textureData.path;
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

      // Clear export canvas with white background for PNG export
      exportGL.clearColor(1.0, 1.0, 1.0, 1.0); // White background for PNG export
      exportGL.clear(exportGL.COLOR_BUFFER_BIT);

      // Render each hexagon for export
      exportHexPositions.forEach((pos, index) => {
        const style = getHexagonStyle(pos.row, pos.col, index);
        
        if (style.type === 'color' && style.rgb) {
          // Draw color hexagon
          exportGL.useProgram(exportColorProgram);
          
          const positionAttributeLocation = exportGL.getAttribLocation(exportColorProgram, 'a_position');
          const resolutionUniformLocation = exportGL.getUniformLocation(exportColorProgram, 'u_resolution');
          const translationUniformLocation = exportGL.getUniformLocation(exportColorProgram, 'u_translation');
          const colorUniformLocation = exportGL.getUniformLocation(exportColorProgram, 'u_color');
          
          exportGL.uniform2f(resolutionUniformLocation, exportSize.width, exportSize.height);
          
          const { vertices } = createHexagonVertices(0, 0, exportHexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO);
          
          const positionBuffer = exportGL.createBuffer();
          exportGL.bindBuffer(exportGL.ARRAY_BUFFER, positionBuffer);
          exportGL.bufferData(exportGL.ARRAY_BUFFER, new Float32Array(vertices), exportGL.STATIC_DRAW);
          
          exportGL.enableVertexAttribArray(positionAttributeLocation);
          exportGL.vertexAttribPointer(positionAttributeLocation, 2, exportGL.FLOAT, false, 0, 0);
          
          exportGL.uniform2f(translationUniformLocation, pos.x, pos.y);
          const [r, g, b] = style.rgb;
          exportGL.uniform4f(colorUniformLocation, r, g, b, 1.0);
          
          exportGL.drawArrays(exportGL.TRIANGLES, 0, 18);
          
        } else if (style.type === 'texture' && style.path && style.name) {
          // Draw textured hexagon with proper texture loading
          const texture = exportTextures.get(style.name);
          
          if (texture) {
            exportGL.useProgram(exportTextureProgram);
            
            const positionAttributeLocation = exportGL.getAttribLocation(exportTextureProgram, 'a_position');
            const texCoordAttributeLocation = exportGL.getAttribLocation(exportTextureProgram, 'a_texCoord');
            const resolutionUniformLocation = exportGL.getUniformLocation(exportTextureProgram, 'u_resolution');
            const translationUniformLocation = exportGL.getUniformLocation(exportTextureProgram, 'u_translation');
            const textureUniformLocation = exportGL.getUniformLocation(exportTextureProgram, 'u_texture');
            
            exportGL.uniform2f(resolutionUniformLocation, exportSize.width, exportSize.height);
            
            const { vertices, texCoords } = createHexagonVertices(0, 0, exportHexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO, true);
            
            // Position buffer
            const positionBuffer = exportGL.createBuffer();
            exportGL.bindBuffer(exportGL.ARRAY_BUFFER, positionBuffer);
            exportGL.bufferData(exportGL.ARRAY_BUFFER, new Float32Array(vertices), exportGL.STATIC_DRAW);
            exportGL.enableVertexAttribArray(positionAttributeLocation);
            exportGL.vertexAttribPointer(positionAttributeLocation, 2, exportGL.FLOAT, false, 0, 0);
            
            // Texture coordinate buffer
            const texCoordBuffer = exportGL.createBuffer();
            exportGL.bindBuffer(exportGL.ARRAY_BUFFER, texCoordBuffer);
            if (texCoords) {
              exportGL.bufferData(exportGL.ARRAY_BUFFER, new Float32Array(texCoords), exportGL.STATIC_DRAW);
            }
            exportGL.enableVertexAttribArray(texCoordAttributeLocation);
            exportGL.vertexAttribPointer(texCoordAttributeLocation, 2, exportGL.FLOAT, false, 0, 0);
            
            exportGL.uniform2f(translationUniformLocation, pos.x, pos.y);
            
            // Bind texture
            exportGL.activeTexture(exportGL.TEXTURE0);
            exportGL.bindTexture(exportGL.TEXTURE_2D, texture);
            exportGL.uniform1i(textureUniformLocation, 0);
            
            exportGL.drawArrays(exportGL.TRIANGLES, 0, 18);
          } else {
            // Fallback to colored rendering if texture failed to load
            exportGL.useProgram(exportColorProgram);
            
            const positionAttributeLocation = exportGL.getAttribLocation(exportColorProgram, 'a_position');
            const resolutionUniformLocation = exportGL.getUniformLocation(exportColorProgram, 'u_resolution');
            const translationUniformLocation = exportGL.getUniformLocation(exportColorProgram, 'u_translation');
            const colorUniformLocation = exportGL.getUniformLocation(exportColorProgram, 'u_color');
            
            exportGL.uniform2f(resolutionUniformLocation, exportSize.width, exportSize.height);
            
            const { vertices } = createHexagonVertices(0, 0, exportHexRadius * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO);
            
            const positionBuffer = exportGL.createBuffer();
            exportGL.bindBuffer(exportGL.ARRAY_BUFFER, positionBuffer);
            exportGL.bufferData(exportGL.ARRAY_BUFFER, new Float32Array(vertices), exportGL.STATIC_DRAW);
            
            exportGL.enableVertexAttribArray(positionAttributeLocation);
            exportGL.vertexAttribPointer(positionAttributeLocation, 2, exportGL.FLOAT, false, 0, 0);
            
            exportGL.uniform2f(translationUniformLocation, pos.x, pos.y);
            // Use a different color to indicate texture loading failed
            exportGL.uniform4f(colorUniformLocation, 0.8, 0.6, 0.4, 1.0); // Light brown fallback
            
            exportGL.drawArrays(exportGL.TRIANGLES, 0, 18);
          }
        }
      });

      // Export as PNG
      exportCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  }, [canvasSize, gridWidth, gridHeight, colors, getHexColor]);

  // Expose export function through ref
  useImperativeHandle(ref, () => ({
    exportAsPNG
  }), [exportAsPNG]);

  // Vertex shader source for colors
  const colorVertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    
    void main() {
      vec2 position = a_position + u_translation;
      vec2 zeroToOne = position / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
  `;

  // Fragment shader source for colors
  const colorFragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
      gl_FragColor = u_color;
    }
  `;

  // Vertex shader source for textures
  const textureVertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    varying vec2 v_texCoord;
    
    void main() {
      vec2 position = a_position + u_translation;
      vec2 zeroToOne = position / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_texCoord = a_texCoord;
    }
  `;

  // Fragment shader source for textures
  const textureFragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `;

  // Calculate optimal hex radius based on canvas size and grid dimensions
  const calculateHexRadius = (): number => {
    const availableWidth = canvasSize.width * GRID_CONFIG.CANVAS_MARGIN_FACTOR;
    const availableHeight = canvasSize.height * GRID_CONFIG.CANVAS_MARGIN_FACTOR;
    
    // Calculate radius from width constraint
    // For hexagonal grid: width = (GRID_CONFIG.HEX_HORIZONTAL_SPACING_RATIO * gridWidth + 0.25) * 2 * radius
    const radiusFromWidth = availableWidth / (2 * (GRID_CONFIG.HEX_HORIZONTAL_SPACING_RATIO * gridWidth + 0.25));
    
    // Calculate radius from height constraint
    const radiusFromHeight = availableHeight / (HEX_GEOMETRY.SQRT_3 * gridHeight);
    
    // Use the larger of the minimum and the calculated size to prevent distortion
    // If this means the grid doesn't fit, that's okay - users can pan/zoom
    let baseRadius = Math.max(GRID_CONFIG.MIN_HEX_RADIUS, Math.min(radiusFromWidth, radiusFromHeight));
    
    // If we're severely width-constrained (like when menu is open on small screen),
    // prefer height-based sizing to maintain proper proportions
    if (radiusFromWidth < GRID_CONFIG.MIN_HEX_RADIUS * GRID_CONFIG.WIDTH_CONSTRAINT_THRESHOLD) {
      baseRadius = Math.max(GRID_CONFIG.MIN_HEX_RADIUS, radiusFromHeight);
    }
    
    // Apply zoom level to the base radius
    return baseRadius * zoomLevel;
  };

  // Calculate zoom limits
  const calculateZoomLimits = (): ZoomLimits => {
    // Min zoom (zoomed out): current full view
    const minZoom = GRID_CONFIG.BASE_ZOOM_LEVEL;
    
    // Max zoom (zoomed in): show about 4-5 tiles
    // We want to fit approximately 4-5 hexagons across the screen
    const currentTilesAcross = gridWidth;
    const maxZoom = currentTilesAcross / GRID_CONFIG.TARGET_TILES_AT_MAX_ZOOM;
    
    return { minZoom, maxZoom };
  };

  // Calculate pan limits to prevent zooming too far from the grid
  const calculatePanLimits = (hexRadius: number): PanLimits => {
    const hexWidth = HEX_GEOMETRY.getHexWidth(hexRadius);
    const hexHeight = HEX_GEOMETRY.getHexHeight(hexRadius);
    const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(hexRadius);
    const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(hexRadius);
    
    const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
    const totalGridHeight = gridHeight * verticalSpacing;
    
    // Calculate how much the grid exceeds the container size
    const excessWidth = Math.max(0, totalGridWidth - canvasSize.width);
    const excessHeight = Math.max(0, totalGridHeight - canvasSize.height);
    
    // Allow panning to show the parts of the grid that don't fit
    const maxPanX = excessWidth / 2 + hexRadius * GRID_CONFIG.PAN_EXTRA_MARGIN_FACTOR;
    const maxPanY = excessHeight / 2 + hexRadius * GRID_CONFIG.PAN_EXTRA_MARGIN_FACTOR;
    const minPanX = -maxPanX;
    const minPanY = -maxPanY;
    
    return { minPanX, maxPanX, minPanY, maxPanY };
  };

  // Constrain pan offset to stay within reasonable bounds
  const constrainPanOffset = (offset: PanOffset, hexRadius: number): PanOffset => {
    const { minPanX, maxPanX, minPanY, maxPanY } = calculatePanLimits(hexRadius);
    return {
      x: Math.max(minPanX, Math.min(maxPanX, offset.x)),
      y: Math.max(minPanY, Math.min(maxPanY, offset.y))
    };
  };

  // Handle wheel event for zooming
  const handleWheel = useCallback((event: WheelEvent): void => {
    event.preventDefault();
    
    const { minZoom, maxZoom } = calculateZoomLimits();
    const deltaY = event.deltaY;
    
    // Get mouse position relative to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    setZoomLevel(prevZoom => {
      // Zoom in on wheel up (negative deltaY), zoom out on wheel down (positive deltaY)
      const zoomDirection = deltaY > 0 ? -1 : 1;
      const newZoom = prevZoom + (zoomDirection * GRID_CONFIG.ZOOM_SPEED);
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      
      // If we're at minimum zoom, reset pan to center the grid
      if (clampedZoom === minZoom) {
        setPanOffset({ x: 0, y: 0 });
        return clampedZoom;
      }
      
      // Calculate zoom change
      const zoomChange = clampedZoom / prevZoom;
      
      // Calculate new pan offset to keep mouse position fixed
      setPanOffset(prevOffset => {
        // Calculate the world point under the mouse before zoom
        const worldX = mouseX - canvasSize.width / 2 - prevOffset.x;
        const worldY = mouseY - canvasSize.height / 2 - prevOffset.y;
        
        // After zoom, we want the same world point to be under the mouse
        // worldX * zoomChange + newOffset.x + canvasSize.width / 2 = mouseX
        const newOffsetX = mouseX - canvasSize.width / 2 - worldX * zoomChange;
        const newOffsetY = mouseY - canvasSize.height / 2 - worldY * zoomChange;
        
        // Get current hex radius for constraint calculation
        const currentHexRadius = hexRadiusRef.current || GRID_CONFIG.FALLBACK_HEX_RADIUS;
        const projectedRadius = currentHexRadius * (clampedZoom / prevZoom);
        
        // Constrain the new offset
        return constrainPanOffset({ x: newOffsetX, y: newOffsetY }, projectedRadius);
      });
      
      return clampedZoom;
    });
  }, [gridWidth, canvasSize]);

  // Create shader function
  const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  // Create program function
  const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Error linking program:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  };

  // Load texture from image URL
  const loadTexture = (gl: WebGLRenderingContext, url: string): WebGLTexture | null => {
    const texture = gl.createTexture();
    if (!texture) return null;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Create a 1x1 pixel placeholder until image loads
    const pixel = new Uint8Array([128, 128, 128, 255]); // Grey pixel
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
      // Set texture parameters
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      
      // Just trigger a simple re-render without full initialization
      requestAnimationFrame(() => {
        if (glRef.current && colorProgramRef.current && textureProgramRef.current) {
          renderGrid();
        }
      });
    };
    image.src = url;
    
    return texture;
  };

  const isPowerOf2 = (value: number): boolean => {
    return (value & (value - 1)) === 0;
  };

  // Generate hexagon vertices with texture coordinates
  const createHexagonVertices = (centerX: number, centerY: number, radius: number, includeTexCoords: boolean = false): HexVertices => {
    const vertices: number[] = [];
    const texCoords: number[] = [];
    const angleStep = (Math.PI * 2) / 6;
    
    // Create triangles for the hexagon (6 triangles from center)
    for (let i = 0; i < 6; i++) {
      // Center point
      vertices.push(centerX, centerY);
      if (includeTexCoords) texCoords.push(0.5, 0.5);
      
      // First vertex of triangle
      const angle1 = i * angleStep;
      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;
      vertices.push(x1, y1);
      if (includeTexCoords) {
        texCoords.push(0.5 + Math.cos(angle1) * 0.5, 0.5 + Math.sin(angle1) * 0.5);
      }
      
      // Second vertex of triangle
      const angle2 = ((i + 1) % 6) * angleStep;
      const x2 = centerX + Math.cos(angle2) * radius;
      const y2 = centerY + Math.sin(angle2) * radius;
      vertices.push(x2, y2);
      if (includeTexCoords) {
        texCoords.push(0.5 + Math.cos(angle2) * 0.5, 0.5 + Math.sin(angle2) * 0.5);
      }
    }
    
    return includeTexCoords ? { vertices, texCoords } : { vertices };
  };

  // Calculate hexagon grid positions
  const calculateHexPositions = (hexRadius: number): HexPosition[] => {
    const positions: HexPosition[] = [];
    const hexWidth = HEX_GEOMETRY.getHexWidth(hexRadius);
    const hexHeight = HEX_GEOMETRY.getHexHeight(hexRadius);
    
    // For touching hexagons, use proper geometric spacing
    const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(hexRadius);
    const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(hexRadius);

    // Calculate the visual bounds of the entire grid
    const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
    
    // Calculate the actual visual height by finding the topmost and bottommost hexagon positions
    let minY = 0; // This will be the topmost hexagon center
    let maxY = 0; // This will be the bottommost hexagon center
    
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const y = row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    
    // Total visual height includes the radius of the topmost and bottommost hexagons
    // Note: hexagons are rendered at configurable size, so we use the actual rendered size for bounds
    const actualHexHeight = hexHeight * GRID_CONFIG.HEX_VISUAL_SIZE_RATIO;
    const totalGridHeight = maxY - minY + actualHexHeight;

    // Add padding to provide breathing room around the grid edges
    const verticalPadding = 35; // pixels of padding at top and bottom
    
    // Center the grid in the canvas, then apply pan offset
    // Adjust available height by padding and center the grid in the remaining space
    const availableHeight = canvasSize.height - 2 * verticalPadding;
    const startX = (canvasSize.width - totalGridWidth) / 2 + hexRadius + panOffset.x;
    // Add static offsets to ensure proper padding on both top and bottom
    const topPaddingOffset = 20; // Static offset to ensure top padding
    const bottomPaddingOffset = 20; // Static offset to ensure bottom padding
    const startY = verticalPadding + (availableHeight - totalGridHeight) / 2 + hexRadius + panOffset.y - minY + topPaddingOffset - bottomPaddingOffset;

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        // Position hexagons using proper hexagonal grid geometry
        const x = startX + col * horizontalSpacing;
        const y = startY + row * verticalSpacing + (col % 2) * (verticalSpacing * GRID_CONFIG.HEX_ROW_VERTICAL_OFFSET);
        positions.push({ x, y, row, col });
      }
    }
    
    return positions;
  };

  // Convert mouse coordinates to hex grid coordinates
  const getHexFromMousePos = (mouseX: number, mouseY: number): HexPosition | null => {
    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;
    
    // Find the closest hexagon
    let closestHex: HexPosition | null = null;
    let minDistance = Infinity;
    
    hexPositions.forEach((pos) => {
      const distance = Math.sqrt(
        Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
      );
      
      if (distance < minDistance && distance <= hexRadius) {
        minDistance = distance;
        closestHex = pos;
      }
    });
    
    return closestHex;
  };

  // Paint a hex if it hasn't been painted during this drag
  const paintHexIfNew = (hex: HexPosition | null): void => {
    if (!hex || !onHexClick) return;
    
    const hexKey = `${hex.row}-${hex.col}`;
    const paintedSet = paintedDuringDragRef.current;
    
    if (!paintedSet.has(hexKey)) {
      paintedSet.add(hexKey);
      onHexClick(hex.row, hex.col);
    }
  };

  // Handle mouse down - start dragging
  const handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
    setIsDragging(true);
    paintedDuringDragRef.current.clear(); // Reset painted hexes for new drag
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const clickedHex = getHexFromMousePos(mouseX, mouseY);
    paintHexIfNew(clickedHex);
  };

  // Handle mouse move - paint while dragging
  const handleMouseMove = (event: MouseEvent): void => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const hoveredHex = getHexFromMousePos(mouseX, mouseY);
    paintHexIfNew(hoveredHex);
  };

  // Handle mouse up - stop dragging
  const handleMouseUp = (event: MouseEvent): void => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
  };

  // Handle mouse leave - stop dragging when leaving canvas
  const handleMouseLeave = (event: MouseEvent): void => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
  };

  // Get color or texture for a hexagon
  const getHexagonStyle = (row: number, col: number, index: number): HexStyle => {
    const userTexture = getHexColor && getHexColor(row, col);
    
    if (userTexture) {
      // Handle special grey case
      if (userTexture === DEFAULT_COLORS.SELECTED) {
        return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
      }
      
      // Handle color textures - check if userTexture has rgb directly
      if (typeof userTexture === 'object' && userTexture.type === 'color') {
        // If userTexture already has rgb, use it
        if (userTexture.rgb) {
          return { type: 'color', rgb: userTexture.rgb };
        }
        // Otherwise look it up in colors array
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
  };

  // Initialize WebGL context and shaders (only called on setup)
  const initWebGL = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Create color shaders and program
    const colorVertexShader = createShader(gl, gl.VERTEX_SHADER, colorVertexShaderSource);
    const colorFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, colorFragmentShaderSource);
    
    if (!colorVertexShader || !colorFragmentShader) return;
    
    const colorProgram = createProgram(gl, colorVertexShader, colorFragmentShader);
    
    // Create texture shaders and program
    const textureVertexShader = createShader(gl, gl.VERTEX_SHADER, textureVertexShaderSource);
    const textureFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, textureFragmentShaderSource);
    
    if (!textureVertexShader || !textureFragmentShader) return;
    
    const textureProgram = createProgram(gl, textureVertexShader, textureFragmentShader);
    
    if (!colorProgram || !textureProgram) {
      return;
    }

    colorProgramRef.current = colorProgram;
    textureProgramRef.current = textureProgram;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Calculate hex radius and positions
    const hexRadius = calculateHexRadius();
    const hexPositions = calculateHexPositions(hexRadius);
    
    // Store for click detection
    hexRadiusRef.current = hexRadius;
    hexPositionsRef.current = hexPositions;

    // Initial render
    renderGrid();
  };

  // Render the grid (called whenever we need to update the display)
  const renderGrid = useCallback((): void => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const colorProgram = colorProgramRef.current;
    const textureProgram = textureProgramRef.current;
    
    if (!gl || !canvas || !colorProgram || !textureProgram) return;

    // Clear canvas
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;

    // Draw each hexagon
    hexPositions.forEach((pos, index) => {
      const style = getHexagonStyle(pos.row, pos.col, index);
      
      if (style.type === 'color' && style.rgb) {
        // Draw color hexagon
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
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        const [r, g, b] = style.rgb;
        gl.uniform4f(colorUniformLocation, r, g, b, 1.0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 18);
        
      } else if (style.type === 'texture' && style.path && style.name) {
        // Draw textured hexagon
        const textures = texturesRef.current;
        
        if (!textures.has(style.name)) {
          const texture = loadTexture(gl, style.path);
          if (texture) {
            textures.set(style.name, texture);
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
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Texture coordinate buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        if (texCoords) {
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        }
        gl.enableVertexAttribArray(texCoordAttributeLocation);
        gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        
        // Bind texture
        const texture = textures.get(style.name);
        if (texture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(textureUniformLocation, 0);
          
          gl.drawArrays(gl.TRIANGLES, 0, 18);
        }
      }
    });
  }, [getHexColor]); // getHexColor is now stable via useCallback

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
  }, [canvasSize, zoomLevel, panOffset, gridWidth, gridHeight]);

  // Re-render when hex colors change
  useEffect(() => {
    if (glRef.current && colorProgramRef.current && textureProgramRef.current) {
      renderGrid();
    }
  }, [selectedColor, selectedTexture, hexColorsVersion]); // Removed renderGrid from dependencies

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Add all mouse event listeners
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
      canvas.addEventListener('wheel', handleWheel, { passive: false }); // Add wheel event
      
      // Add global mouseup to handle cases where mouse is released outside canvas
      document.addEventListener('mouseup', handleMouseUp);
      
      if (canvas.style) {
        canvas.style.cursor = isDragging ? 'grabbing' : 'crosshair';
      }
      
      return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        canvas.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mouseup', handleMouseUp);
        if (canvas.style) {
          canvas.style.cursor = 'default';
        }
      };
    }
  }, [onHexClick, getHexColor, isDragging, handleWheel]);

  return (
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
  );
});

HexGrid.displayName = 'HexGrid';

export default HexGrid; 