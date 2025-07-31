import { useEffect, useRef } from 'react';

interface SwipeDetectionOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  touchStartRegion?: 'bottom' | 'top' | 'left' | 'right' | 'all';
  regionSize?: number; // in pixels from edge
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  element: HTMLElement;
}

export const useSwipeDetection = (
  targetRef: React.RefObject<HTMLElement>,
  options: SwipeDetectionOptions = {}
) => {
  const {
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
    maxSwipeTime = 500,
    touchStartRegion = 'all',
    regionSize = 100
  } = options;

  const touchDataRef = useRef<TouchData | null>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const rect = element.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Check if touch started in the specified region
      let isInRegion = false;
      switch (touchStartRegion) {
        case 'bottom':
          isInRegion = touchY >= rect.height - regionSize;
          break;
        case 'top':
          isInRegion = touchY <= regionSize;
          break;
        case 'left':
          isInRegion = touchX <= regionSize;
          break;
        case 'right':
          isInRegion = touchX >= rect.width - regionSize;
          break;
        case 'all':
        default:
          isInRegion = true;
          break;
      }

      if (!isInRegion) return;

      touchDataRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        element
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchData = touchDataRef.current;
      if (!touchData) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const endTime = Date.now();
      const deltaTime = endTime - touchData.startTime;
      
      // Check if swipe was quick enough
      if (deltaTime > maxSwipeTime) {
        touchDataRef.current = null;
        return;
      }

      const deltaX = touch.clientX - touchData.startX;
      const deltaY = touch.clientY - touchData.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check if swipe distance is sufficient
      if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) {
        touchDataRef.current = null;
        return;
      }

      // Determine swipe direction (prioritize the larger delta)
      if (absDeltaY > absDeltaX) {
        // Vertical swipe
        if (deltaY < 0 && onSwipeUp) {
          e.preventDefault();
          onSwipeUp();
        } else if (deltaY > 0 && onSwipeDown) {
          e.preventDefault();
          onSwipeDown();
        }
      } else {
        // Horizontal swipe
        if (deltaX < 0 && onSwipeLeft) {
          e.preventDefault();
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          e.preventDefault();
          onSwipeRight();
        }
      }

      touchDataRef.current = null;
    };

    const handleTouchCancel = () => {
      touchDataRef.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [
    targetRef,
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance,
    maxSwipeTime,
    touchStartRegion,
    regionSize
  ]);
};