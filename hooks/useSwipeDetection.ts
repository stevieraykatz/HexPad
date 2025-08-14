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

      if (!isInRegion) {
        return;
      }

      // Exclude canvas interactions and scrollable elements
      const target = e.target as HTMLElement;
      const isCanvas = target && (
        target.tagName === 'CANVAS' ||
        target.closest('canvas')
      );
      
      // Check if the target is within a scrollable element
      const isScrollable = target && (
        // Check if the element itself is scrollable
        (target.scrollHeight > target.clientHeight && 
         getComputedStyle(target).overflowY !== 'visible' &&
         getComputedStyle(target).overflowY !== 'hidden') ||
        // Check if any parent element is scrollable (including our mobile grids)
        target.closest('[style*="overflow-y: auto"], [style*="overflow-y: scroll"], .mobile-paint-grid, .mobile-icon-grid, .scrollable-menu-area') ||
        // Check for elements within menu content that might be scrollable
        target.closest('.mobile-menu-content, .mobile-section') ||
        // Check for color picker or other interactive elements
        target.closest('.react-colorful, .mobile-color-picker')
      );
      
      if (isCanvas || isScrollable) {
        return; // Don't interfere with canvas painting or scrolling
      }

      touchDataRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        element
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchData = touchDataRef.current;
      if (!touchData) {
        return;
      }

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
      let swipeDetected = false;
      
      if (absDeltaY > absDeltaX) {
        // Vertical swipe
        if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
          swipeDetected = true;
        } else if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
          swipeDetected = true;
        }
      } else {
        // Horizontal swipe
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
          swipeDetected = true;
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
          swipeDetected = true;
        }
      }
      
      // If we detected a swipe, prevent default behavior (like button clicks)
      if (swipeDetected) {
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
        
        // Also prevent any pending button clicks by checking the original touch target
        const target = document.elementFromPoint(touchData.startX, touchData.startY) as HTMLElement;
        if (target && (target.tagName === 'BUTTON' || target.closest('button'))) {
          // Blur the button to prevent any focus-related side effects
          if (target.blur) target.blur();
        }
      }

      touchDataRef.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchData = touchDataRef.current;
      if (!touchData) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchData.startX;
      const deltaY = touch.clientY - touchData.startY;
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If we've moved significantly, this is likely a swipe gesture
      // Prevent default to stop any button hover effects or other interactions
      if (totalMovement > 20) { // 20px threshold for movement
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
      }
    };

    const handleTouchCancel = () => {
      touchDataRef.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
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