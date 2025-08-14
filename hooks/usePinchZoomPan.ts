import { useGesture } from '@use-gesture/react';
import { useCallback, useRef } from 'react';
import { calculateZoomLimits, constrainPanOffset } from '../utils/zoomPanUtils';
import type { CanvasSize, PanOffset } from '../utils/hexagonUtils';

interface UsePinchZoomPanOptions {
  canvasSize: CanvasSize;
  gridWidth: number;
  gridHeight: number;
  currentZoom: number;
  currentPanOffset: PanOffset;
  currentHexRadius: number;
  onZoomChange: (newZoom: number, newPanOffset: PanOffset) => void;
  onPanChange: (newPanOffset: PanOffset) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  disabled?: boolean;
}

export const usePinchZoomPan = ({
  canvasSize,
  gridWidth,
  gridHeight,
  currentZoom,
  currentPanOffset,
  currentHexRadius,
  onZoomChange,
  onPanChange,
  onGestureStart,
  onGestureEnd,
  disabled = false
}: UsePinchZoomPanOptions) => {
  
  // Track initial values for relative calculations
  const initialZoomRef = useRef<number>(currentZoom);
  const initialPanRef = useRef<PanOffset>(currentPanOffset);
  
  const handlePinch = useCallback((distance: number, origin: [number, number], initial: boolean) => {
    if (disabled) return;
    
    if (initial) {
      initialZoomRef.current = currentZoom;
      initialPanRef.current = currentPanOffset;
    }
    
    // Calculate zoom limits
    const { minZoom, maxZoom } = calculateZoomLimits(gridWidth);
    
    // Convert distance to scale factor with reduced sensitivity
    // Distance is in pixels, so we need to normalize it
    const scaleFactor = 1 + (distance / 300); // Reduced sensitivity: 300px = 2x zoom
    const newZoom = Math.max(minZoom, Math.min(maxZoom, initialZoomRef.current * scaleFactor));
    
    // If we're at minimum zoom, reset pan to center the grid
    if (newZoom === minZoom) {
      onZoomChange(newZoom, { x: 0, y: 0 });
      return;
    }
    
    // Calculate zoom change for pan adjustment
    const zoomChange = newZoom / initialZoomRef.current;
    
    // Calculate the world point under the pinch center before zoom
    const worldX = origin[0] - canvasSize.width / 2 - initialPanRef.current.x;
    const worldY = origin[1] - canvasSize.height / 2 - initialPanRef.current.y;
    
    // After zoom, we want the same world point to be under the pinch center
    const newOffsetX = origin[0] - canvasSize.width / 2 - worldX * zoomChange;
    const newOffsetY = origin[1] - canvasSize.height / 2 - worldY * zoomChange;
    
    // Calculate projected radius for constraint calculation
    const projectedRadius = currentHexRadius * (newZoom / currentZoom);
    
    // Constrain the new offset
    const constrainedOffset = constrainPanOffset(
      { x: newOffsetX, y: newOffsetY }, 
      projectedRadius, 
      gridWidth, 
      gridHeight, 
      canvasSize
    );
    
    onZoomChange(newZoom, constrainedOffset);
  }, [
    disabled,
    currentZoom,
    canvasSize,
    currentPanOffset,
    currentHexRadius,
    gridWidth,
    gridHeight,
    onZoomChange
  ]);

  const handlePan = useCallback((movement: [number, number], initial: boolean) => {
    if (disabled) return;
    
    if (initial) {
      initialPanRef.current = currentPanOffset;
    }
    
    // Apply movement relative to initial pan position
    const newPanOffset = {
      x: initialPanRef.current.x + movement[0],
      y: initialPanRef.current.y + movement[1]
    };
    
    // Constrain the pan offset to reasonable bounds
    const constrainedOffset = constrainPanOffset(
      newPanOffset,
      currentHexRadius,
      gridWidth,
      gridHeight,
      canvasSize
    );
    
    onPanChange(constrainedOffset);
  }, [
    disabled,
    currentPanOffset,
    currentHexRadius,
    gridWidth,
    gridHeight,
    canvasSize,
    onPanChange
  ]);

  const bind = useGesture(
    {
      // Handle pinch-to-zoom
      onPinch: ({ offset: [distance], origin, first, last }) => {
        if (disabled) return;
        
        if (first) {
          onGestureStart?.();
        }
        
        if (last) {
          onGestureEnd?.();
        } else {
          // Use distance (offset[0]) for zoom calculation
          handlePinch(distance, origin, first);
        }
      },
      
      // Handle two-finger pan using onDrag with proper touch detection
      onDrag: ({ movement, touches, first, last, pinching }) => {
        if (disabled) return;
        
        // Only handle two-finger pan when not pinching
        if (touches !== 2 || pinching) return;
        
        if (first) {
          onGestureStart?.();
        }
        
        if (last) {
          onGestureEnd?.();
        } else {
          handlePan(movement, first);
        }
      }
    },
    {
      target: undefined, // Will be set when binding
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: { min: 0.1, max: 10 },
        rubberband: false,
        threshold: 10 // Minimum distance in pixels to start pinch
      },
      drag: {
        threshold: 5, // Minimum movement to start pan
        filterTaps: true,
        preventScroll: true
      }
    }
  );

  return bind;
};
