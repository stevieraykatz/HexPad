/**
 * Grid Encoding Utility
 * 
 * Encodes and decodes hex grid patterns to/from URL-safe strings.
 * Each character represents one hex tile using hexadecimal encoding (0-f).
 * 
 * Format: /[encoded_string] where each character maps to a paint option
 */

import type { AssetItem } from '../components/config';

// Map paint options to hex characters (0-f supports 16 options)
const HEX_CHARS = '0123456789abcdef';

export interface GridState {
  gridWidth: number;
  gridHeight: number;
  hexColors: Record<string, AssetItem>;
}

export interface EncodingMap {
  itemToChar: Map<string, string>;
  charToItem: Map<string, AssetItem>;
}

/**
 * Create encoding/decoding maps from available paint options
 */
export function createEncodingMap(paintOptions: readonly AssetItem[]): EncodingMap {
  const itemToChar = new Map<string, string>();
  const charToItem = new Map<string, AssetItem>();
  
  // Map first 16 paint options to hex characters
  paintOptions.slice(0, 16).forEach((item, index) => {
    const char = HEX_CHARS[index];
    itemToChar.set(item.name, char);
    charToItem.set(char, item);
  });
  
  return { itemToChar, charToItem };
}

/**
 * Encode grid state to URL string
 */
export function encodeGridToUrl(gridState: GridState, encodingMap: EncodingMap): string {
  const { gridWidth, gridHeight, hexColors } = gridState;
  let encoded = '';
  
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const hexKey = `${row}-${col}`;
      const hexColor = hexColors[hexKey];
      
      if (hexColor && typeof hexColor === 'object' && 'name' in hexColor) {
        const char = encodingMap.itemToChar.get(hexColor.name);
        encoded += char || '0'; // Default to '0' if not found
      } else {
        encoded += '0'; // Default empty hex
      }
    }
  }
  
  return encoded;
}

/**
 * Decode URL string to grid state
 */
export function decodeUrlToGrid(
  encoded: string, 
  gridWidth: number, 
  gridHeight: number, 
  encodingMap: EncodingMap
): Record<string, AssetItem> {
  const hexColors: Record<string, AssetItem> = {};
  const expectedLength = gridWidth * gridHeight;
  
  // Pad or trim the encoded string to match grid size
  const paddedEncoded = encoded.padEnd(expectedLength, '0').slice(0, expectedLength);
  
  let charIndex = 0;
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const char = paddedEncoded[charIndex];
      const hexKey = `${row}-${col}`;
      
      if (char && char !== '0') {
        const item = encodingMap.charToItem.get(char);
        if (item) {
          hexColors[hexKey] = item;
        }
      }
      
      charIndex++;
    }
  }
  
  return hexColors;
}

/**
 * Generate a URL path for the current grid state
 */
export function generateGridUrl(gridState: GridState, encodingMap: EncodingMap): string {
  const encoded = encodeGridToUrl(gridState, encodingMap);
  return `/${encoded}`;
}

/**
 * Parse URL path to extract encoded grid data
 */
export function parseGridUrl(path: string): string {
  // Remove leading slash and extract the encoded part
  return path.replace(/^\//, '').split('?')[0] || '';
}

/**
 * Validate if a URL string is a valid grid encoding
 */
export function isValidGridEncoding(encoded: string): boolean {
  // Check if string contains only valid hex characters
  return /^[0-9a-f]*$/i.test(encoded);
}

/**
 * Get the default encoding map with predefined paint options
 */
export function getDefaultEncodingMap(paintOptions: readonly AssetItem[]): EncodingMap {
  return createEncodingMap(paintOptions);
} 