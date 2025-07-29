/**
 * Grid Numbering Utilities
 * 
 * Helper functions for converting column numbers to letters and rendering grid numbering.
 */

import { NUMBERING_CONFIG } from '../components/config';

/**
 * Calculate consistent font size for edge numbering
 */
export function calculateEdgeFontSize(hexRadius: number): number {
  return Math.max(NUMBERING_CONFIG.EDGE_FONT_SIZE.MIN, hexRadius * NUMBERING_CONFIG.EDGE_FONT_SIZE.RADIUS_MULTIPLIER);
}

/**
 * Calculate consistent font size for in-hex numbering
 */
export function calculateInHexFontSize(hexRadius: number): number {
  return Math.max(NUMBERING_CONFIG.IN_HEX_FONT_SIZE.MIN, hexRadius * NUMBERING_CONFIG.IN_HEX_FONT_SIZE.RADIUS_MULTIPLIER);
}

/**
 * Calculate consistent font size for general numbering
 */
export function calculateGeneralFontSize(hexRadius: number): number {
  return Math.max(NUMBERING_CONFIG.GENERAL_FONT_SIZE.MIN, hexRadius * NUMBERING_CONFIG.GENERAL_FONT_SIZE.RADIUS_MULTIPLIER);
}

/**
 * Calculate dynamic edge margin for columns based on hex radius
 */
export function calculateColumnMargin(hexRadius: number): number {
  return Math.max(
    NUMBERING_CONFIG.EDGE_MARGIN.COLUMN.MIN,
    hexRadius * NUMBERING_CONFIG.EDGE_MARGIN.COLUMN.RADIUS_MULTIPLIER
  );
}

/**
 * Calculate dynamic edge margin for rows based on hex radius  
 */
export function calculateRowMargin(hexRadius: number): number {
  return Math.max(
    NUMBERING_CONFIG.EDGE_MARGIN.ROW.MIN,
    hexRadius * NUMBERING_CONFIG.EDGE_MARGIN.ROW.RADIUS_MULTIPLIER
  );
}

/**
 * @deprecated Use calculateColumnMargin or calculateRowMargin instead
 */
export function calculateEdgeMargin(hexRadius: number): number {
  return calculateColumnMargin(hexRadius);
}

/**
 * Convert a column number to letter(s) (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, etc.)
 */
export function columnToLetter(col: number): string {
  let result = '';
  while (col >= 0) {
    result = String.fromCharCode(65 + (col % 26)) + result;
    col = Math.floor(col / 26) - 1;
  }
  return result;
}

/**
 * Convert a row number to display format (0-based to 1-based)
 */
export function rowToNumber(row: number): string {
  return (row + 1).toString();
}

/**
 * Get grid coordinate string for a hex (e.g., "A1", "B2", etc.)
 */
export function getHexCoordinate(row: number, col: number): string {
  return columnToLetter(col) + rowToNumber(row);
}

/**
 * Render text with outline effect
 */
export function renderOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string = 'white',
  strokeColor: string = 'black',
  strokeWidth: number = 2,
  textAlign: CanvasTextAlign = 'left',
  textBaseline: CanvasTextBaseline = 'alphabetic'
): void {
  // Save current state
  ctx.save();
  
  // Set text properties
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  
  // Draw outline
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  
  // Draw fill
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
  
  // Restore state
  ctx.restore();
} 