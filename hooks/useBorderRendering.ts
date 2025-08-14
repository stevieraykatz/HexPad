import { useCallback, useRef } from 'react';
import type { HexPosition } from '../utils/hexagonUtils';
import { getSharedEdgeVertices } from '../utils/borderUtils';
import type { BorderEdge } from '../utils/borderUtils';

interface UseBorderRenderingProps {
  bordersCanvasRef: React.RefObject<HTMLCanvasElement>;
  hexPositionsRef: React.RefObject<HexPosition[]>;
  hexRadiusRef: React.RefObject<number>;
  borders?: Record<string, BorderEdge>;
}

const BORDER_RENDER_THROTTLE_MS = 16; // ~60fps throttling

export function useBorderRendering({
  bordersCanvasRef,
  hexPositionsRef,
  hexRadiusRef,
  borders
}: UseBorderRenderingProps) {
  
  const borderRenderTimeoutRef = useRef<number | null>(null);
  const lastBorderRenderRef = useRef<number>(0);

  /**
   * Render borders between hexagons on separate canvas
   */
  const renderBorders = useCallback((): void => {
    const bordersCanvas = bordersCanvasRef.current;
    if (!bordersCanvas) return;

    const hexRadius = hexRadiusRef.current;
    const hexPositions = hexPositionsRef.current;
    
    if (!hexRadius || !hexPositions) return;
    
    const ctx = bordersCanvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for high-DPI scaling
    const devicePixelRatio = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, bordersCanvas.width, bordersCanvas.height);

    if (!borders || Object.keys(borders).length === 0 || hexRadius <= 0 || hexPositions.length === 0) {
      return;
    }

    ctx.save();

    Object.values(borders).forEach(border => {
      const edgeVertices = getSharedEdgeVertices(border.fromHex, border.toHex, hexRadius, hexPositions);
      
      if (edgeVertices) {
        ctx.strokeStyle = border.color;
        ctx.lineWidth = 6 * devicePixelRatio; // Scale line width for device pixel ratio
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(edgeVertices.start.x, edgeVertices.start.y);
        ctx.lineTo(edgeVertices.end.x, edgeVertices.end.y);
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [bordersCanvasRef, hexRadiusRef, hexPositionsRef, borders]);

  /**
   * Throttled border rendering for performance during zoom/pan operations
   */
  const renderBordersThrottled = useCallback((): void => {
    if (borderRenderTimeoutRef.current) {
      cancelAnimationFrame(borderRenderTimeoutRef.current);
    }

    const now = performance.now();
    const timeSinceLastRender = now - lastBorderRenderRef.current;

    if (timeSinceLastRender >= BORDER_RENDER_THROTTLE_MS) {
      lastBorderRenderRef.current = now;
      renderBorders();
    } else {
      borderRenderTimeoutRef.current = requestAnimationFrame(() => {
        lastBorderRenderRef.current = performance.now();
        renderBorders();
        borderRenderTimeoutRef.current = null;
      });
    }
  }, [renderBorders]);

  // Cancel any pending border renders (for zoom/pan operations)
  const cancelPendingRenders = useCallback((): void => {
    if (borderRenderTimeoutRef.current) {
      cancelAnimationFrame(borderRenderTimeoutRef.current);
      borderRenderTimeoutRef.current = null;
    }
  }, []);

  return {
    renderBorders,
    renderBordersThrottled,
    cancelPendingRenders,
    borderRenderTimeoutRef
  };
} 