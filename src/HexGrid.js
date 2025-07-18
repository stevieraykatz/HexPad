import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GRID_CONFIG, HEX_GEOMETRY, DEFAULT_COLORS } from './config';

const HexGrid = ({ gridWidth = GRID_CONFIG.DEFAULT_WIDTH, gridHeight = GRID_CONFIG.DEFAULT_HEIGHT, selectedColor, selectedTexture, colors, onHexClick, getHexColor, hexColorsVersion = 0 }) => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const colorProgramRef = useRef(null);
  const textureProgramRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(GRID_CONFIG.BASE_ZOOM_LEVEL);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Pan offset for zoom-to-cursor
  const hexPositionsRef = useRef([]);
  const hexRadiusRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const paintedDuringDragRef = useRef(new Set());
  const texturesRef = useRef(new Map());

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

  // Update canvas size when window resizes
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get the actual container dimensions
    const container = canvas.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newWidth = containerRect.width;
    const newHeight = containerRect.height;
    
    setCanvasSize({ width: newWidth, height: newHeight });
  };

  // Calculate optimal hex radius based on canvas size and grid dimensions
  const calculateHexRadius = () => {
    // For touching hexagons, we need to calculate based on the grid requirements
    // Horizontal: each hex takes width * 0.75, except the first which takes full width
    // Total width needed = (gridWidth - 1) * (width * 0.75) + width = width * (0.75 * gridWidth + 0.25)
    // Vertical: each row takes full height, with 0.5 offset for alternating columns
    // Total height needed = (gridHeight - 1) * height + height = gridHeight * height
    
    const availableWidth = canvasSize.width * GRID_CONFIG.CANVAS_MARGIN_FACTOR;
    const availableHeight = canvasSize.height * GRID_CONFIG.CANVAS_MARGIN_FACTOR;
    
    // Calculate radius from width constraint
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
  const calculateZoomLimits = () => {
    // Min zoom (zoomed out): current full view
    const minZoom = GRID_CONFIG.BASE_ZOOM_LEVEL;
    
    // Max zoom (zoomed in): show about 4-5 tiles
    // We want to fit approximately 4-5 hexagons across the screen
    const currentTilesAcross = gridWidth;
    const maxZoom = currentTilesAcross / GRID_CONFIG.TARGET_TILES_AT_MAX_ZOOM;
    
    return { minZoom, maxZoom };
  };

  // Calculate pan limits to prevent zooming too far from the grid
  const calculatePanLimits = (hexRadius) => {
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
  const constrainPanOffset = (offset, hexRadius) => {
    const { minPanX, maxPanX, minPanY, maxPanY } = calculatePanLimits(hexRadius);
    return {
      x: Math.max(minPanX, Math.min(maxPanX, offset.x)),
      y: Math.max(minPanY, Math.min(maxPanY, offset.y))
    };
  };

  // Handle wheel event for zooming
  const handleWheel = useCallback((event) => {
    event.preventDefault();
    
    const { minZoom, maxZoom } = calculateZoomLimits();
    const deltaY = event.deltaY;
    
    // Get mouse position relative to canvas
    const canvas = canvasRef.current;
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
  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
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
  const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
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
  const loadTexture = (gl, url) => {
    const texture = gl.createTexture();
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

  const isPowerOf2 = (value) => {
    return (value & (value - 1)) === 0;
  };

  // Generate hexagon vertices with texture coordinates
  const createHexagonVertices = (centerX, centerY, radius, includeTexCoords = false) => {
    const vertices = [];
    const texCoords = [];
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
  const calculateHexPositions = (hexRadius) => {
    const positions = [];
    const hexWidth = HEX_GEOMETRY.getHexWidth(hexRadius);
    const hexHeight = HEX_GEOMETRY.getHexHeight(hexRadius);
    
    // For touching hexagons, use proper geometric spacing
    const horizontalSpacing = HEX_GEOMETRY.getHorizontalSpacing(hexRadius);
    const verticalSpacing = HEX_GEOMETRY.getVerticalSpacing(hexRadius);

    // Calculate the total dimensions of the grid
    const totalGridWidth = (gridWidth - 1) * horizontalSpacing + hexWidth;
    const totalGridHeight = gridHeight * verticalSpacing;

    // Center the grid in the canvas, then apply pan offset
    const startX = (canvasSize.width - totalGridWidth) / 2 + hexRadius + panOffset.x;
    const startY = (canvasSize.height - totalGridHeight) / 2 + hexRadius + panOffset.y;

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
  const getHexFromMousePos = (mouseX, mouseY) => {
    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;
    
    // Find the closest hexagon
    let closestHex = null;
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
  const paintHexIfNew = (hex) => {
    if (!hex || !onHexClick) return;
    
    const hexKey = `${hex.row}-${hex.col}`;
    const paintedSet = paintedDuringDragRef.current;
    
    if (!paintedSet.has(hexKey)) {
      paintedSet.add(hexKey);
      onHexClick(hex.row, hex.col);
    }
  };

  // Handle mouse down - start dragging
  const handleMouseDown = (event) => {
    event.preventDefault();
    setIsDragging(true);
    paintedDuringDragRef.current.clear(); // Reset painted hexes for new drag
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const clickedHex = getHexFromMousePos(mouseX, mouseY);
    paintHexIfNew(clickedHex);
  };

  // Handle mouse move - paint while dragging
  const handleMouseMove = (event) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const hoveredHex = getHexFromMousePos(mouseX, mouseY);
    paintHexIfNew(hoveredHex);
  };

  // Handle mouse up - stop dragging
  const handleMouseUp = (event) => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
  };

  // Handle mouse leave - stop dragging when leaving canvas
  const handleMouseLeave = (event) => {
    setIsDragging(false);
    paintedDuringDragRef.current.clear();
  };

  // Get color or texture for a hexagon
  const getHexagonStyle = (row, col, index) => {
    const userTexture = getHexColor && getHexColor(row, col);
    
    if (userTexture) {
      // Handle special grey case
      if (userTexture === DEFAULT_COLORS.SELECTED) {
        return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
      }
      
      // Handle color textures - check if userTexture has rgb directly
      if (userTexture.type === 'color') {
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
      if (userTexture.type === 'texture') {
        return { type: 'texture', path: userTexture.path, name: userTexture.name };
      }
    }
    
    // Default grey color if no user color is set
    return { type: 'color', rgb: DEFAULT_COLORS.GREY_RGB };
  };

  // Initialize WebGL context and shaders (only called on setup)
  const initWebGL = () => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Create color shaders and program
    const colorVertexShader = createShader(gl, gl.VERTEX_SHADER, colorVertexShaderSource);
    const colorFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, colorFragmentShaderSource);
    const colorProgram = createProgram(gl, colorVertexShader, colorFragmentShader);
    
    // Create texture shaders and program
    const textureVertexShader = createShader(gl, gl.VERTEX_SHADER, textureVertexShaderSource);
    const textureFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, textureFragmentShaderSource);
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
  const renderGrid = useCallback(() => {
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
      
      if (style.type === 'color') {
        // Draw color hexagon
        gl.useProgram(colorProgram);
        
        const positionAttributeLocation = gl.getAttribLocation(colorProgram, 'a_position');
        const resolutionUniformLocation = gl.getUniformLocation(colorProgram, 'u_resolution');
        const translationUniformLocation = gl.getUniformLocation(colorProgram, 'u_translation');
        const colorUniformLocation = gl.getUniformLocation(colorProgram, 'u_color');
        
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        
        const { vertices } = createHexagonVertices(0, 0, hexRadius * 0.9);
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        const [r, g, b] = style.rgb;
        gl.uniform4f(colorUniformLocation, r, g, b, 1.0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 18);
        
      } else if (style.type === 'texture') {
        // Draw textured hexagon
        const textures = texturesRef.current;
        
        if (!textures.has(style.name)) {
          textures.set(style.name, loadTexture(gl, style.path));
        }
        
        gl.useProgram(textureProgram);
        
        const positionAttributeLocation = gl.getAttribLocation(textureProgram, 'a_position');
        const texCoordAttributeLocation = gl.getAttribLocation(textureProgram, 'a_texCoord');
        const resolutionUniformLocation = gl.getUniformLocation(textureProgram, 'u_resolution');
        const translationUniformLocation = gl.getUniformLocation(textureProgram, 'u_translation');
        const textureUniformLocation = gl.getUniformLocation(textureProgram, 'u_texture');
        
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        
        const { vertices, texCoords } = createHexagonVertices(0, 0, hexRadius * 0.9, true);
        
        // Position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Texture coordinate buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(texCoordAttributeLocation);
        gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniform2f(translationUniformLocation, pos.x, pos.y);
        
        // Bind texture
        const texture = textures.get(style.name);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(textureUniformLocation, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 18);
      }
    });
  }, [getHexColor]); // getHexColor is now stable via useCallback

  // Handle window resize and container size changes
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);
    
    // Also observe container size changes (for menu open/close)
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    let resizeObserver;
    
    if (container && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      resizeObserver.observe(container);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []); // No dependencies needed - observer handles everything

  // Initialize WebGL when grid size, canvas size, zoom level, or pan offset changes
  useEffect(() => {
    // When canvas size changes (like menu opening), constrain pan offset to valid range
    if (hexRadiusRef.current > 0) {
      const currentRadius = hexRadiusRef.current;
      const constrainedOffset = constrainPanOffset(panOffset, currentRadius);
      if (constrainedOffset.x !== panOffset.x || constrainedOffset.y !== panOffset.y) {
        setPanOffset(constrainedOffset);
        return; // Let the pan offset change trigger the next initWebGL
      }
    }
    
    initWebGL();
  }, [gridWidth, gridHeight, canvasSize, zoomLevel, panOffset]);

  // Re-render when selection changes or hex colors change
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
};

export default HexGrid; 