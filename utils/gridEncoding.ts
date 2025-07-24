/**
 * Grid Encoding Utility
 * 
 * Encodes and decodes complete hex grid state (textures, icons, borders) to/from URL-safe base64 strings.
 * 
 * Schema: /{grid_dimensions}{texture_data}{0xFE}{icon_data}{0xFD}{border_data_by_color}
 * - grid_dimensions: 4 bytes (width + height as 2-byte values)
 * - texture_data: Variable length (1 byte per tile, 0 = empty)
 * - 0xFE: Separator byte for icon data
 * - icon_data: Sparse encoding (length + position + icon_id triplets)
 * - 0xFD: Separator byte for border data
 * - border_data_by_color: Grouped by color (color_count + [color_rgb + border_count + borders]...)
 */

import type { AssetItem, IconItem } from '../components/config';

export interface CompleteGridState {
  gridWidth: number;
  gridHeight: number;
  hexColors: Record<string, AssetItem>;
  hexIcons: Record<string, IconItem>;
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
 * Create encoding maps for all asset types
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
  
  // Map textures (1-255, 0 reserved for empty)
  paintOptions.slice(0, 255).forEach((item, index) => {
    const id = index + 1;
    textureToId.set(item.name, id);
    idToTexture.set(id, item);
  });
  
  // Map icons (1-255, 0 reserved for empty)
  iconOptions.slice(0, 255).forEach((item, index) => {
    const id = index + 1;
    iconToId.set(item.name, id);
    idToIcon.set(id, item);
  });
  
  // Map border colors (1-255, 0 reserved for empty)
  borderColors.slice(0, 255).forEach((color, index) => {
    const id = index + 1;
    colorToId.set(color, id);
    idToColor.set(id, color);
  });
  
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
 * Encode hex position to a 2-byte coordinate pair
 */
function encodePosition(row: number, col: number): Uint8Array {
  const buffer = new Uint8Array(2);
  buffer[0] = row & 0xFF;
  buffer[1] = col & 0xFF;
  return buffer;
}

/**
 * Decode position from 2 bytes
 */
function decodePosition(bytes: Uint8Array, offset: number): { row: number, col: number } {
  return {
    row: bytes[offset],
    col: bytes[offset + 1]
  };
}

/**
 * Encode complete grid state to base64 URL string with embedded color palette
 */
export function encodeGridToBase64(gridState: CompleteGridState, encodingMap: EncodingMap): string {
  const { gridWidth, gridHeight, hexColors, hexIcons, borders } = gridState;
  
  // 1. Grid dimensions (4 bytes)
  const dimensionsBuffer = new Uint8Array(4);
  const widthBytes = encodeUint16(gridWidth);
  const heightBytes = encodeUint16(gridHeight);
  dimensionsBuffer.set(widthBytes, 0);
  dimensionsBuffer.set(heightBytes, 2);
  
  // 2. Texture data (gridWidth * gridHeight bytes)
  const textureBuffer = new Uint8Array(gridWidth * gridHeight);
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const hexKey = `${row}-${col}`;
      const texture = hexColors[hexKey];
      const textureId = texture ? encodingMap.textureToId.get(texture.name) || 0 : 0;
      textureBuffer[row * gridWidth + col] = textureId;
    }
  }
  
  // 3. Icon data with separator and length prefix
  const iconEntries: number[] = [];
  iconEntries.push(0xFE); // Separator byte to mark start of icon data
  
  const iconDataEntries: number[] = [];
  Object.entries(hexIcons).forEach(([hexKey, icon]) => {
    const [row, col] = hexKey.split('-').map(Number);
    const iconId = encodingMap.iconToId.get(icon.name) || 0;
    if (iconId > 0 && row < 256 && col < 256) {
      iconDataEntries.push(row, col, iconId);
    }
  });
  
  const iconLengthBytes = encodeUint16(iconDataEntries.length);
  iconEntries.push(...Array.from(iconLengthBytes)); // Add length
  iconEntries.push(...iconDataEntries); // Add actual data
  
  const iconBuffer = new Uint8Array(iconEntries);
  
  // 4. Border data grouped by color with separator
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
  const totalLength = dimensionsBuffer.length + textureBuffer.length + 
                     iconBuffer.length + borderBuffer.length;
  const combinedBuffer = new Uint8Array(totalLength);
  let offset = 0;
  
  combinedBuffer.set(dimensionsBuffer, offset);
  offset += dimensionsBuffer.length;
  
  combinedBuffer.set(textureBuffer, offset);
  offset += textureBuffer.length;
  
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
    
    const expectedTextureLength = gridWidth * gridHeight;
    if (bytes.length < 4 + expectedTextureLength) return null;
    
    // Start parsing after texture data
    const textureEndOffset = 4 + expectedTextureLength;
    
    // 2. Decode textures
    const hexColors: Record<string, AssetItem> = {};
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const textureId = bytes[4 + row * gridWidth + col];
        if (textureId > 0) {
          const texture = encodingMap.idToTexture.get(textureId);
          if (texture) {
            hexColors[`${row}-${col}`] = texture;
          }
        }
      }
    }
    
    // 3. Start parsing optional sections after textures
    let offset = 4 + expectedTextureLength;
    
    // 4. Decode icons (0xFE separator)
    const hexIcons: Record<string, IconItem> = {};
    
    // Look for icon separator (0xFE)
    while (offset < bytes.length && bytes[offset] !== 0xFE) {
      offset++; // Skip to find icon section
    }
    
    if (offset < bytes.length && bytes[offset] === 0xFE) {
      offset++; // Skip separator
      
      if (offset + 1 < bytes.length) {
        const iconDataLength = decodeUint16(bytes, offset);
        offset += 2;
        
        const iconDataEnd = offset + iconDataLength;
        while (offset + 2 < iconDataEnd && offset + 2 < bytes.length) {
          const row = bytes[offset];
          const col = bytes[offset + 1];
          const iconId = bytes[offset + 2];
          
          if (row < gridHeight && col < gridWidth && iconId > 0) {
            const icon = encodingMap.idToIcon.get(iconId);
            if (icon) {
              hexIcons[`${row}-${col}`] = icon;
            }
          }
          offset += 3;
        }
      }
    }
    
    // 5. Decode borders grouped by color (0xFD separator)
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
    
    return { gridWidth, gridHeight, hexColors, hexIcons, borders };
    
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

