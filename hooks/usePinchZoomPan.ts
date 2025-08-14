import { useGesture } from '@use-gesture/react';
import { useCallback } from 'react';
import { calculateZoomToPoint, constrainPanOffset } from '../utils/zoomPanUtils';
import { GRID_CONFIG } from '../components/config/gridConfig';
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
  
  const handlePinch = useCallback((scale: number, origin: [number, number]) => {
    if (disabled) return;
    
    // Calculate new zoom level directly from scale
    const newZoom = currentZoom * scale;
    
    // Use calculateZoomToPoint to handle zoom limits and pan adjustment
    const zoomDirection = scale > 1 ? 1 : -1;
    const zoomAmount = Math.abs(scale - 1) * GRID_CONFIG.ZOOM_SPEED * 3; // Amplify for better responsiveness
    
    const result = calculateZoomToPoint(
      currentZoom,
      zoomDirection * zoomAmount,
      origin[0],
      origin[1],
      canvasSize,
      currentPanOffset,
      currentHexRadius,
      gridWidth,
      gridHeight
    );
    
    onZoomChange(result.newZoom, result.newPanOffset);
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

  const handlePan = useCallback((offset: [number, number]) => {
    if (disabled) return;
    
    const newPanOffset = {
      x: currentPanOffset.x + offset[0],
      y: currentPanOffset.y + offset[1]
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
      onPinch: ({ movement, origin, first, last }) => {
        if (disabled) return;
        
        // In @use-gesture v10+, scale information is in movement[0] 
        const scale = movement[0];
        
        if (first) {
          onGestureStart?.();
        }
        
        if (last) {
          onGestureEnd?.();
        } else {
          handlePinch(scale, origin);
        }
      },
      onDrag: ({ offset, touches, first, last }) => {
        if (disabled) return;
        
        // Only handle two-finger pan (drag with 2 touches)
        if (touches !== 2) return;
        
        if (first) {
          onGestureStart?.();
        }
        
        if (last) {
          onGestureEnd?.();
        } else {
          handlePan(offset);
        }
      }
    },
    {
      target: undefined, // Will be set when binding
      eventOptions: { passive: false },
      pinch: {
        scaleBounds: { min: 0.1, max: 10 },
        rubberband: true,
        threshold: 0.01
      },
      drag: {
        threshold: 5,
        filterTaps: true,
        preventScroll: true
      }
    }
  );

  return bind;
};
