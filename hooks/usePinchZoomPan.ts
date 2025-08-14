import { useCallback, useRef, useEffect } from 'react';
import { calculateZoomLimits, constrainPanOffset } from '../utils/zoomPanUtils';
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

interface TouchState {
  touches: Touch[];
  initialDistance: number;
  initialZoom: number;
  initialPan: PanOffset;
  center: { x: number; y: number };
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
  
  const containerRef = useRef<HTMLElement | null>(null);
  const touchStateRef = useRef<TouchState | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastPanPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Helper function to get distance between two touches
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper function to get center point between two touches
  const getTouchCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);

  // Handle wheel zoom (desktop)
  const handleWheel = useCallback((event: WheelEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    
    const { minZoom, maxZoom } = calculateZoomLimits(gridWidth);
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate zoom change
    const zoomDelta = event.deltaY > 0 ? -GRID_CONFIG.ZOOM_SPEED : GRID_CONFIG.ZOOM_SPEED;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + zoomDelta));
    
    if (newZoom === minZoom) {
      onZoomChange(newZoom, { x: 0, y: 0 });
      return;
    }
    
    // Calculate zoom-to-point
    const zoomRatio = newZoom / currentZoom;
    const worldX = mouseX - canvasSize.width / 2 - currentPanOffset.x;
    const worldY = mouseY - canvasSize.height / 2 - currentPanOffset.y;
    
    const newOffsetX = mouseX - canvasSize.width / 2 - worldX * zoomRatio;
    const newOffsetY = mouseY - canvasSize.height / 2 - worldY * zoomRatio;
    
    const projectedRadius = currentHexRadius * (newZoom / currentZoom);
    const constrainedOffset = constrainPanOffset(
      { x: newOffsetX, y: newOffsetY },
      projectedRadius,
      gridWidth,
      gridHeight,
      canvasSize
    );
    
    onZoomChange(newZoom, constrainedOffset);
  }, [disabled, gridWidth, currentZoom, currentPanOffset, canvasSize, currentHexRadius, onZoomChange]);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled) return;
    
    const touches = Array.from(event.touches);
    
    if (touches.length === 1) {
      // Single touch - let it pass through for painting
      // Don't prevent default, don't start panning
      return;
    } else if (touches.length === 2) {
      // Two finger touch - start gesture tracking
      event.preventDefault();
      
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      touchStateRef.current = {
        touches,
        initialDistance: distance,
        initialZoom: currentZoom,
        initialPan: currentPanOffset,
        center
      };
      
      // Start with pan mode - will switch to zoom if distance changes significantly
      isDraggingRef.current = true;
      lastPanPositionRef.current = center;
      onGestureStart?.();
    }
  }, [disabled, currentZoom, currentPanOffset, getTouchDistance, getTouchCenter, onGestureStart]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled) return;
    
    const touches = Array.from(event.touches);
    
    if (touches.length === 1) {
      // Single finger - let it pass through for painting
      return;
    } else if (touches.length === 2 && touchStateRef.current) {
      // Two finger gesture - determine if it's pan or zoom
      event.preventDefault();
      
      const touchState = touchStateRef.current;
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);
      
      // Calculate distance change percentage
      const distanceChange = Math.abs(currentDistance - touchState.initialDistance);
      const distanceChangePercent = distanceChange / touchState.initialDistance;
      
      // If distance changed significantly (>10%), it's a zoom gesture
      if (distanceChangePercent > 0.1) {
        // ZOOM MODE: Pinch to zoom
        const scale = currentDistance / touchState.initialDistance;
        const { minZoom, maxZoom } = calculateZoomLimits(gridWidth);
        const newZoom = Math.max(minZoom, Math.min(maxZoom, touchState.initialZoom * scale));
        
        if (newZoom === minZoom) {
          onZoomChange(newZoom, { x: 0, y: 0 });
          return;
        }
        
        // Calculate zoom-to-point using initial center
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const centerX = touchState.center.x - rect.left;
        const centerY = touchState.center.y - rect.top;
        
        const zoomRatio = newZoom / touchState.initialZoom;
        const worldX = centerX - canvasSize.width / 2 - touchState.initialPan.x;
        const worldY = centerY - canvasSize.height / 2 - touchState.initialPan.y;
        
        const newOffsetX = centerX - canvasSize.width / 2 - worldX * zoomRatio;
        const newOffsetY = centerY - canvasSize.height / 2 - worldY * zoomRatio;
        
        const projectedRadius = currentHexRadius * (newZoom / currentZoom);
        const constrainedOffset = constrainPanOffset(
          { x: newOffsetX, y: newOffsetY },
          projectedRadius,
          gridWidth,
          gridHeight,
          canvasSize
        );
        
        onZoomChange(newZoom, constrainedOffset);
      } else if (lastPanPositionRef.current) {
        // PAN MODE: Two-finger drag to pan
        const deltaX = currentCenter.x - lastPanPositionRef.current.x;
        const deltaY = currentCenter.y - lastPanPositionRef.current.y;
        
        const newPanOffset = {
          x: currentPanOffset.x + deltaX,
          y: currentPanOffset.y + deltaY
        };
        
        const constrainedOffset = constrainPanOffset(
          newPanOffset,
          currentHexRadius,
          gridWidth,
          gridHeight,
          canvasSize
        );
        
        onPanChange(constrainedOffset);
        
        lastPanPositionRef.current = currentCenter;
      }
    }
  }, [
    disabled,
    currentPanOffset,
    currentHexRadius,
    gridWidth,
    gridHeight,
    canvasSize,
    currentZoom,
    onPanChange,
    onZoomChange,
    getTouchDistance,
    getTouchCenter
  ]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled) return;
    
    if (event.touches.length === 0) {
      // All touches ended - clean up
      isDraggingRef.current = false;
      lastPanPositionRef.current = null;
      touchStateRef.current = null;
      onGestureEnd?.();
    } else if (event.touches.length === 1 && touchStateRef.current) {
      // Went from 2 touches to 1 - end gesture, let single touch pass through for painting
      touchStateRef.current = null;
      isDraggingRef.current = false;
      lastPanPositionRef.current = null;
      onGestureEnd?.();
    }
  }, [disabled, onGestureEnd]);

  // Bind event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    // Add event listeners
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      // Cleanup event listeners
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [disabled, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Return ref to bind to container
  return useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);
};