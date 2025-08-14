/**
 * Grid Encoding Utility
 * 
 * Encodes and decodes complete hex grid state (textures, icons, borders, backgrounds) to/from URL-safe base64 strings.
 * 
 * Schema: /{grid_dimensions}{texture_data}{0xFC}{background_data}{0xFE}{icon_data}{0xFD}{border_data_by_color}
 * - grid_dimensions: 4 bytes (width + height as 2-byte values)
 * - texture_data: Variable length with orientation (grouped by color/texture + orientation)
 * - 0xFC: Separator byte for background color data
 * - background_data: Grouped by color (color_count + [color_rgb + hex_count + positions]...)
 * - 0xFE: Separator byte for icon data
 * - icon_data: Sparse encoding grouped by color (color_count + [color_rgb + icon_count + [position + icon_id]...]...)
 * - 0xFD: Separator byte for border data
 * - border_data_by_color: Grouped by color (color_count + [color_rgb + border_count + borders]...)
 */

import type { AssetItem, IconItem, HexTexture } from '../components/config';
import type { ColoredIcon } from '../components/config/iconsConfig';
import type { TerrainInfo, AssetVariant } from '../components/config/assetLoader';

export interface CompleteGridState {
  gridWidth: number;
  gridHeight: number;
  hexColors: Record<string, string | HexTexture>;
  hexBackgroundColors: Record<string, string>;
  hexIcons: Record<string, ColoredIcon>;
  borders: Record<string, BorderEdge>;
}

export interface BorderEdge {
  fromHex: string;
  toHex: string;
  color: string;
}

export interface EncodingMap {
  textureToId: Map<string, number>;
  idToTexture: Map<number, AssetItem>;
  iconToId: Map<string, number>;
  idToIcon: Map<number, IconItem>;
  colorToId: Map<string, number>;
  idToColor: Map<number, string>;
}

/**
 * Create encoding maps for all asset types including all texture variants
 */
export function createEncodingMap(
  paintOptions: readonly AssetItem[],
  iconOptions: readonly IconItem[],
  borderColors: readonly string[]
): EncodingMap {
  const textureToId = new Map<string, number>();
  const idToTexture = new Map<number, AssetItem>();
  const iconToId = new Map<string, number>();
  const idToIcon = new Map<number, IconItem>();
  const colorToId = new Map<string, number>();
  const idToColor = new Map<number, string>();
  
  // Import terrain manifests to get all variants
  const { getAllTerrainTypes, loadTerrainManifest } = require('../components/config/assetLoader');
  
  let textureIdCounter = 1;
  
  // First, map base terrain types from paint options
  paintOptions.forEach((item) => {
    if (textureIdCounter > 65535) return; // 2-byte limit
    
    textureToId.set(item.name, textureIdCounter);
    idToTexture.set(textureIdCounter, item);
    textureIdCounter++;
  });
  
  // Then, add all texture variants from manifests
  const terrainTypes = getAllTerrainTypes();
  terrainTypes.forEach((terrain: TerrainInfo) => {
    if (terrain.hasVariants && terrain.manifestPath) {
      try {
        const manifest = loadTerrainManifest(terrain.name);
        if (manifest && manifest.rawAssets) {
          manifest.rawAssets.forEach((variant: AssetVariant) => {
            if (textureIdCounter > 65535) return; // 2-byte limit
            
            // Skip if we already have this variant name
            if (textureToId.has(variant.name)) return;
            
            // Create a texture item for this variant
            const variantItem: AssetItem = {
              name: variant.name,
              displayName: variant.name,
              type: 'texture',
              path: `/assets/terrain/${terrain.name}/${variant.filename}`
            };
            
            textureToId.set(variant.name, textureIdCounter);
            idToTexture.set(textureIdCounter, variantItem);
            textureIdCounter++;
          });
        }
      } catch (error) {
        console.warn(`Could not load variants for ${terrain.name}:`, error);
      }
    }
  });
  
  // Map icons (starting after textures)
  iconOptions.slice(0, 65535 - textureIdCounter).forEach((item, index) => {
    const id = textureIdCounter + index;
    iconToId.set(item.name, id);
    idToIcon.set(id, item);
  });
  
  // Map border colors (1-255, 0 reserved for empty)
  borderColors.slice(0, 255).forEach((color, index) => {
    const id = index + 1;
    colorToId.set(color, id);
    idToColor.set(id, color);
  });
  
  console.log(`🔍 Created encoding map with ${textureToId.size} texture variants`);
  
  return { textureToId, idToTexture, iconToId, idToIcon, colorToId, idToColor };
}

/**
 * Encode a number as 2 bytes (supports 0-65535)
 */
function encodeUint16(value: number): Uint8Array {
  const buffer = new Uint8Array(2);
  buffer[0] = (value >> 8) & 0xFF;
  buffer[1] = value & 0xFF;
  return buffer;
}

/**
 * Decode 2 bytes as a number
 */
function decodeUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

/**
 * Encode complete grid state to base64 URL string with embedded color palette
 */
export function encodeGridToBase64(gridState: CompleteGridState, encodingMap: EncodingMap): string {
  const { gridWidth, gridHeight, hexColors, hexBackgroundColors, hexIcons, borders } = gridState;
  
  // 1. Grid dimensions (4 bytes)
  const dimensionsBuffer = new Uint8Array(4);
  const widthBytes = encodeUint16(gridWidth);
  const heightBytes = encodeUint16(gridHeight);
  dimensionsBuffer.set(widthBytes, 0);
  dimensionsBuffer.set(heightBytes, 2);
  
  // 2. Hex color data grouped by color with separator
  const hexColorEntries: number[] = [];
  hexColorEntries.push(0xFF); // Separator byte to mark start of hex color data
  
  // Group hex colors by their RGB values and orientation (for both textures and custom colors)
  const hexColorsByKey = new Map<string, Array<{row: number, col: number, textureId?: number, rotation?: number, flipped?: boolean}>>();
  Object.entries(hexColors).forEach(([hexKey, hexTexture]) => {
    const [row, col] = hexKey.split('-').map(Number);
    if (row < 256 && col < 256) {
      let groupKey: string;
      let textureId: number | undefined;
      let rotation: number | undefined;
      let flipped: boolean | undefined;
      
      // Skip string values (legacy format)
      if (typeof hexTexture === 'string') {
        return;
      }
      
      if (hexTexture.type === 'color' && hexTexture.rgb) {
        // Custom color - use RGB values as key
        const [r, g, b] = hexTexture.rgb;
        // Convert back to 0-255 range for encoding
        const r255 = Math.round(r * 255);
        const g255 = Math.round(g * 255);
        const b255 = Math.round(b * 255);
        groupKey = `color:${r255},${g255},${b255}`;
      } else {
        // Predefined texture - use texture ID and orientation as key
        textureId = encodingMap.textureToId.get(hexTexture.name) || 0;
        rotation = hexTexture.rotation || 0;
        flipped = hexTexture.flipped || false;
        groupKey = `texture:${textureId}:${rotation}:${flipped ? 1 : 0}`;
      }
      
      if (!hexColorsByKey.has(groupKey)) {
        hexColorsByKey.set(groupKey, []);
      }
      hexColorsByKey.get(groupKey)!.push({ row, col, textureId, rotation, flipped });
    }
  });
  
  // Encode number of unique colors/textures with orientations
  const hexColorCount = hexColorsByKey.size;
  const hexColorCountBytes = encodeUint16(hexColorCount);
  hexColorEntries.push(...Array.from(hexColorCountBytes));
  
  // Encode each color/texture+orientation group and its hexes
  hexColorsByKey.forEach((hexList, groupKey) => {
    const keyParts = groupKey.split(':');
    if (keyParts[0] === 'texture') {
      // Predefined texture - encode with special marker + orientation
      const textureId = parseInt(keyParts[1]);
      const rotation = parseInt(keyParts[2]) || 0;
      const flipped = parseInt(keyParts[3]) === 1;
      hexColorEntries.push(0xFF, 0xFF, textureId, rotation, flipped ? 1 : 0); // Special marker for texture + orientation
    } else {
      // Custom color - encode RGB values + no orientation (use 0xFF, 0xFE marker)
      const rgbPart = keyParts[1];
      const [r, g, b] = rgbPart.split(',').map(Number);
      hexColorEntries.push(0xFF, 0xFE, r, g, b); // Special marker for color
    }
    
    // Encode number of hexes with this color/texture+orientation
    const hexCountBytes = encodeUint16(hexList.length);
    hexColorEntries.push(...Array.from(hexCountBytes));
    
    // Encode each hex position
    hexList.forEach((hex) => {
      hexColorEntries.push(hex.row, hex.col);
    });
  });
  
  const hexColorBuffer = new Uint8Array(hexColorEntries);
  
  // 3. Background color data grouped by color with separator
  const backgroundEntries: number[] = [];
  backgroundEntries.push(0xFC); // Separator byte to mark start of background color data
  
  // Group background colors by their RGB values
  const backgroundColorsByRgb = new Map<string, Array<{row: number, col: number}>>();
  Object.entries(hexBackgroundColors).forEach(([hexKey, color]) => {
    const [row, col] = hexKey.split('-').map(Number);
    if (row < 256 && col < 256) {
      if (!backgroundColorsByRgb.has(color)) {
        backgroundColorsByRgb.set(color, []);
      }
      backgroundColorsByRgb.get(color)!.push({ row, col });
    }
  });
  
  // Encode number of unique background colors
  const backgroundColorCount = backgroundColorsByRgb.size;
  const backgroundColorCountBytes = encodeUint16(backgroundColorCount);
  backgroundEntries.push(...Array.from(backgroundColorCountBytes));
  
  // Encode each background color and its hexes
  backgroundColorsByRgb.forEach((hexList, color) => {
    // Encode color as RGB (3 bytes)
    const hexColor = color.replace('#', '').padEnd(6, '0').slice(0, 6);
    const r = parseInt(hexColor.slice(0, 2), 16);
    const g = parseInt(hexColor.slice(2, 4), 16);
    const b = parseInt(hexColor.slice(4, 6), 16);
    backgroundEntries.push(r, g, b);
    
    // Encode number of hexes with this background color
    const hexCountBytes = encodeUint16(hexList.length);
    backgroundEntries.push(...Array.from(hexCountBytes));
    
    // Encode each hex position
    hexList.forEach((hex) => {
      backgroundEntries.push(hex.row, hex.col);
    });
  });
  
  const backgroundBuffer = new Uint8Array(backgroundEntries);
  
  // 4. Icon data grouped by color with separator
  const iconEntries: number[] = [];
  iconEntries.push(0xFE); // Separator byte to mark start of icon data
  
  // Group icons by color
  const iconsByColor = new Map<string, Array<{row: number, col: number, iconId: number}>>();
  Object.entries(hexIcons).forEach(([hexKey, coloredIcon]) => {
    const [row, col] = hexKey.split('-').map(Number);
    const iconId = encodingMap.iconToId.get(coloredIcon.icon.name) || 0;
    if (iconId > 0 && row < 256 && col < 256) {
      const color = coloredIcon.color;
      if (!iconsByColor.has(color)) {
        iconsByColor.set(color, []);
      }
      iconsByColor.get(color)!.push({ row, col, iconId });
    }
  });
  
  // Encode number of unique colors
  const iconColorCount = iconsByColor.size;
  const iconColorCountBytes = encodeUint16(iconColorCount);
  iconEntries.push(...Array.from(iconColorCountBytes));
  
  // Encode each color and its icons
  iconsByColor.forEach((iconList, color) => {
    // Encode color as RGB (3 bytes)
    const hexColor = color.replace('#', '').padEnd(6, '0').slice(0, 6);
    const r = parseInt(hexColor.slice(0, 2), 16);
    const g = parseInt(hexColor.slice(2, 4), 16);
    const b = parseInt(hexColor.slice(4, 6), 16);
    iconEntries.push(r, g, b);
    
    // Encode number of icons with this color
    const iconCountBytes = encodeUint16(iconList.length);
    iconEntries.push(...Array.from(iconCountBytes));
    
    // Encode each icon with this color
    iconList.forEach((icon) => {
      iconEntries.push(icon.row, icon.col, icon.iconId);
    });
  });
  
  const iconBuffer = new Uint8Array(iconEntries);
  
  // 5. Border data grouped by color with separator
  const borderEntries: number[] = [];
  borderEntries.push(0xFD); // Separator byte to mark start of border data
  
  // Group borders by color
  const bordersByColor = new Map<string, BorderEdge[]>();
  Object.values(borders).forEach((border) => {
    if (!bordersByColor.has(border.color)) {
      bordersByColor.set(border.color, []);
    }
    bordersByColor.get(border.color)!.push(border);
  });
  
  // Encode number of unique colors
  const colorCount = bordersByColor.size;
  const colorCountBytes = encodeUint16(colorCount);
  borderEntries.push(...Array.from(colorCountBytes));
  
  // Encode each color and its borders
  bordersByColor.forEach((borderList, color) => {
    // Encode color as RGB (3 bytes)
    const hexColor = color.replace('#', '').padEnd(6, '0').slice(0, 6);
    const r = parseInt(hexColor.slice(0, 2), 16);
    const g = parseInt(hexColor.slice(2, 4), 16);
    const b = parseInt(hexColor.slice(4, 6), 16);
    borderEntries.push(r, g, b);
    
    // Encode number of borders with this color
    const borderCountBytes = encodeUint16(borderList.length);
    borderEntries.push(...Array.from(borderCountBytes));
    
    // Encode each border with this color
    borderList.forEach((border) => {
      const [fromRow, fromCol] = border.fromHex.split('-').map(Number);
      const [toRow, toCol] = border.toHex.split('-').map(Number);
      
      if (fromRow < 256 && fromCol < 256 && toRow < 256 && toCol < 256) {
        borderEntries.push(fromRow, fromCol, toRow, toCol);
      }
    });
  });
  
  const borderBuffer = new Uint8Array(borderEntries);
  
  // Combine all buffers with separators
  const totalLength = dimensionsBuffer.length + hexColorBuffer.length + 
                     backgroundBuffer.length + iconBuffer.length + borderBuffer.length;
  const combinedBuffer = new Uint8Array(totalLength);
  let offset = 0;
  
  combinedBuffer.set(dimensionsBuffer, offset);
  offset += dimensionsBuffer.length;
  
  combinedBuffer.set(hexColorBuffer, offset);
  offset += hexColorBuffer.length;
  
  combinedBuffer.set(backgroundBuffer, offset);
  offset += backgroundBuffer.length;
  
  combinedBuffer.set(iconBuffer, offset);
  offset += iconBuffer.length;
  
  combinedBuffer.set(borderBuffer, offset);
  
  // Convert to base64 and make URL-safe
  const base64 = btoa(String.fromCharCode.apply(null, Array.from(combinedBuffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decode base64 URL string to complete grid state
 */
export function decodeBase64ToGrid(encoded: string, encodingMap: EncodingMap): CompleteGridState | null {
  try {
    // Restore base64 format
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    
    // Convert from base64
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    if (bytes.length < 4) return null;
    
    // 1. Decode dimensions
    const gridWidth = decodeUint16(bytes, 0);
    const gridHeight = decodeUint16(bytes, 2);
    
    if (gridWidth === 0 || gridHeight === 0 || gridWidth > 255 || gridHeight > 255) {
      return null;
    }
    
    // 2. Start parsing sections after dimensions
    let offset = 4;
    
    // 3. Decode hex colors grouped by color+orientation (0xFF separator)
    const hexColors: Record<string, string | HexTexture> = {};
    
    // Look for hex color separator (0xFF)
    while (offset < bytes.length && bytes[offset] !== 0xFF) {
      offset++; // Skip to find hex color section
    }
    
    if (offset < bytes.length && bytes[offset] === 0xFF) {
      offset++; // Skip separator
      
      if (offset + 1 < bytes.length) {
        // Read number of unique colors/textures with orientations
        const hexColorCount = decodeUint16(bytes, offset);
        offset += 2;
        
        // Decode each color/texture+orientation group
        for (let colorIndex = 0; colorIndex < hexColorCount && offset + 4 < bytes.length; colorIndex++) {
          // Check if this is a texture or custom color
          const byte1 = bytes[offset];
          const byte2 = bytes[offset + 1];
          
          let hexTexture: string | HexTexture;
          
          if (byte1 === 0xFF && byte2 === 0xFF) {
            // Predefined texture with orientation (special marker)
            const textureId = bytes[offset + 2];
            const rotation = bytes[offset + 3];
            const flipped = bytes[offset + 4] === 1;
            offset += 5;
            
            const texture = encodingMap.idToTexture.get(textureId);
            if (!texture) continue;
            
            // Convert AssetItem (TextureItem) to HexTexture format with orientation
            hexTexture = {
              type: texture.type,
              name: texture.name,
              displayName: texture.displayName,
              path: texture.path,
              rotation: rotation,
              flipped: flipped
            };
          } else if (byte1 === 0xFF && byte2 === 0xFE) {
            // Custom color (special marker)
            const r = bytes[offset + 2];
            const g = bytes[offset + 3];
            const b = bytes[offset + 4];
            offset += 5;
            
            // Convert to WebGL 0-1 range
            const rgb: [number, number, number] = [r / 255, g / 255, b / 255];
            const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            
            hexTexture = {
              type: 'color' as const,
              name: hexColor,
              displayName: hexColor.toUpperCase(),
              rgb
            };
          } else {
            // Legacy format fallback - treat as RGB color
            const r = byte1;
            const g = byte2;
            const b = bytes[offset + 2];
            offset += 3;
            
            const rgb: [number, number, number] = [r / 255, g / 255, b / 255];
            const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            
            hexTexture = {
              type: 'color' as const,
              name: hexColor,
              displayName: hexColor.toUpperCase(),
              rgb
            };
          }
          
          // Read number of hexes with this color/texture+orientation
          const hexCount = decodeUint16(bytes, offset);
          offset += 2;
          
          // Read each hex position
          for (let hexIndex = 0; hexIndex < hexCount && offset + 1 < bytes.length; hexIndex++) {
            const row = bytes[offset];
            const col = bytes[offset + 1];
            
            if (row < gridHeight && col < gridWidth) {
              hexColors[`${row}-${col}`] = hexTexture;
            }
            offset += 2;
          }
        }
      }
    }
    
    // 4. Decode background colors grouped by color (0xFC separator)
    const hexBackgroundColors: Record<string, string> = {};
    
    // Look for background color separator (0xFC)
    while (offset < bytes.length && bytes[offset] !== 0xFC) {
      offset++; // Skip to find background color section
    }
    
    if (offset < bytes.length && bytes[offset] === 0xFC) {
      offset++; // Skip separator
      
      if (offset + 1 < bytes.length) {
        // Read number of unique background colors
        const backgroundColorCount = decodeUint16(bytes, offset);
        offset += 2;
        
        // Decode each background color group
        for (let colorIndex = 0; colorIndex < backgroundColorCount && offset + 4 < bytes.length; colorIndex++) {
          // Read color RGB (3 bytes)
          const r = bytes[offset];
          const g = bytes[offset + 1];
          const b = bytes[offset + 2];
          const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          offset += 3;
          
          // Read number of hexes with this background color
          const hexCount = decodeUint16(bytes, offset);
          offset += 2;
          
          // Read each hex position
          for (let hexIndex = 0; hexIndex < hexCount && offset + 1 < bytes.length; hexIndex++) {
            const row = bytes[offset];
            const col = bytes[offset + 1];
            
            if (row < gridHeight && col < gridWidth) {
              hexBackgroundColors[`${row}-${col}`] = color;
            }
            offset += 2;
          }
        }
      }
    }
    
    // 5. Decode icons grouped by color (0xFE separator)
    const hexIcons: Record<string, ColoredIcon> = {};
    
    // Look for icon separator (0xFE)
    while (offset < bytes.length && bytes[offset] !== 0xFE) {
      offset++; // Skip to find icon section
    }
    
    if (offset < bytes.length && bytes[offset] === 0xFE) {
      offset++; // Skip separator
      
      if (offset + 1 < bytes.length) {
        // Read number of unique colors
        const iconColorCount = decodeUint16(bytes, offset);
        offset += 2;
        
        // Decode each color group
        for (let colorIndex = 0; colorIndex < iconColorCount && offset + 4 < bytes.length; colorIndex++) {
          // Read color RGB (3 bytes)
          const r = bytes[offset];
          const g = bytes[offset + 1];
          const b = bytes[offset + 2];
          const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          offset += 3;
          
          // Read number of icons with this color
          const iconCount = decodeUint16(bytes, offset);
          offset += 2;
          
          // Read each icon with this color
          for (let iconIndex = 0; iconIndex < iconCount && offset + 2 < bytes.length; iconIndex++) {
            const row = bytes[offset];
            const col = bytes[offset + 1];
            const iconId = bytes[offset + 2];
            
            if (row < gridHeight && col < gridWidth && iconId > 0) {
              const icon = encodingMap.idToIcon.get(iconId);
              if (icon) {
                hexIcons[`${row}-${col}`] = { icon, color };
              }
            }
            offset += 3;
          }
        }
      }
    }
    
    // 6. Decode borders grouped by color (0xFD separator)
    const borders: Record<string, BorderEdge> = {};
    
    // Look for border separator (0xFD)
    while (offset < bytes.length && bytes[offset] !== 0xFD) {
      offset++; // Skip to find border section
    }
    
    if (offset < bytes.length && bytes[offset] === 0xFD) {
      offset++; // Skip separator
      
      if (offset + 1 < bytes.length) {
        // Read number of unique colors
        const colorCount = decodeUint16(bytes, offset);
        offset += 2;
        
        // Decode each color group
        for (let colorIndex = 0; colorIndex < colorCount && offset + 4 < bytes.length; colorIndex++) {
          // Read color RGB (3 bytes)
          const r = bytes[offset];
          const g = bytes[offset + 1];
          const b = bytes[offset + 2];
          offset += 3;
          
          // Convert RGB to hex string
          const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          
          // Read number of borders with this color
          if (offset + 1 < bytes.length) {
            const borderCount = decodeUint16(bytes, offset);
            offset += 2;
            
            // Read each border with this color
            for (let borderIndex = 0; borderIndex < borderCount && offset + 3 < bytes.length; borderIndex++) {
              const fromRow = bytes[offset];
              const fromCol = bytes[offset + 1];
              const toRow = bytes[offset + 2];
              const toCol = bytes[offset + 3];
              offset += 4;
              
              if (fromRow < gridHeight && fromCol < gridWidth && 
                  toRow < gridHeight && toCol < gridWidth) {
                
                const fromHex = `${fromRow}-${fromCol}`;
                const toHex = `${toRow}-${toCol}`;
                const borderKey = `${fromHex}_${toHex}`;
                borders[borderKey] = { fromHex, toHex, color };
              }
            }
          }
        }
      }
    }
    
    return { gridWidth, gridHeight, hexColors, hexBackgroundColors, hexIcons, borders };
    
  } catch (error) {
    console.error('Failed to decode grid state:', error);
    return null;
  }
}

/**
 * Generate a URL path for the complete grid state
 */
export function generateGridUrl(gridState: CompleteGridState, encodingMap: EncodingMap): string {
  const encoded = encodeGridToBase64(gridState, encodingMap);
  return `/${encoded}`;
}

/**
 * Parse URL path to extract encoded grid data
 */
export function parseGridUrl(path: string): string {
  return path.replace(/^\//, '').split('?')[0] || '';
}

/**
 * Validate if a URL string is a valid base64 grid encoding
 */
export function isValidGridEncoding(encoded: string): boolean {
  // Check if string is valid base64-url format
  return /^[A-Za-z0-9\-_]*$/.test(encoded) && encoded.length > 0;
}

