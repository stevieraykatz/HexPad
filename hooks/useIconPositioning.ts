import { useState, useCallback, useRef, useEffect } from 'react';
import type { HexPosition } from '../utils/hexagonUtils';

interface UseIconPositioningProps {
  hexPositionsRef: React.RefObject<HexPosition[]>;
  hexRadiusRef: React.RefObject<number>;
}

const ICON_POSITION_THROTTLE_MS = 16; // ~60fps throttling

export function useIconPositioning({
  hexPositionsRef,
  hexRadiusRef
}: UseIconPositioningProps) {
  
  // Throttled state for icon positions
  const [throttledPositions, setThrottledPositions] = useState<HexPosition[]>([]);
  const [throttledRadius, setThrottledRadius] = useState<number>(0);
  
  const positionUpdateTimeoutRef = useRef<number | null>(null);
  const lastPositionUpdateRef = useRef<number>(0);

  /**
   * Update icon positions immediately
   */
  const updateIconPositions = useCallback((): void => {
    const positions = hexPositionsRef.current;
    const radius = hexRadiusRef.current;
    
    if (!positions || !radius) return;
    
    setThrottledPositions([...positions]);
    setThrottledRadius(radius);
  }, [hexPositionsRef, hexRadiusRef]);

  /**
   * Throttled icon position updates for performance during zoom/pan operations
   */
  const updateIconPositionsThrottled = useCallback((): void => {
    // Cancel any pending update
    if (positionUpdateTimeoutRef.current) {
      cancelAnimationFrame(positionUpdateTimeoutRef.current);
    }

    const now = performance.now();
    const timeSinceLastUpdate = now - lastPositionUpdateRef.current;

    if (timeSinceLastUpdate >= ICON_POSITION_THROTTLE_MS) {
      // Enough time has passed, update immediately
      lastPositionUpdateRef.current = now;
      updateIconPositions();
    } else {
      // Schedule update for next frame
      positionUpdateTimeoutRef.current = requestAnimationFrame(() => {
        lastPositionUpdateRef.current = performance.now();
        updateIconPositions();
        positionUpdateTimeoutRef.current = null;
      });
    }
  }, [updateIconPositions]);

  /**
   * Cancel any pending position updates
   */
  const cancelPendingUpdates = useCallback((): void => {
    if (positionUpdateTimeoutRef.current) {
      cancelAnimationFrame(positionUpdateTimeoutRef.current);
      positionUpdateTimeoutRef.current = null;
    }
  }, []);

  // Initialize positions on mount
  useEffect(() => {
    updateIconPositions();
  }, [updateIconPositions]);

  return {
    throttledPositions,
    throttledRadius,
    updateIconPositionsThrottled,
    cancelPendingUpdates,
    positionUpdateTimeoutRef
  };
} 