import React, { useRef } from 'react';
import { UI_CONFIG } from './config';
import { useSwipeDetection } from '../hooks/useSwipeDetection';

interface SwipableBarProps {
  isMobile?: boolean;
  menuOpen?: boolean;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const SwipableBar: React.FC<SwipableBarProps> = ({ 
  isMobile = false,
  menuOpen = false,
  onSwipeUp,
  onSwipeDown
}) => {
  const swipableBarRef = useRef<HTMLDivElement>(null);

  // Set up swipe detection on the swipable bar itself
  useSwipeDetection(swipableBarRef, {
    onSwipeUp,
    onSwipeDown,
    touchStartRegion: 'all',
    minSwipeDistance: 30, // Lower threshold for the bar itself
    maxSwipeTime: 600
  });

  // Only show on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <div
      ref={swipableBarRef}
      style={{
        width: '100%',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(180deg, 
          rgba(0, 0, 0, 0.8) 0%, 
          rgba(0, 0, 0, 0.95) 100%)`,
        borderTop: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        borderBottom: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
        position: 'relative',
        cursor: 'grab',
        userSelect: 'none',
        transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
        backdropFilter: UI_CONFIG.BLUR.MEDIUM,
        boxShadow: menuOpen 
          ? '0 -2px 8px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.4)' 
          : '0 -1px 4px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Swipe indicator bar */}
      <div
        className="swipe-indicator"
        style={{
          width: '40px',
          height: '3px',
          background: `linear-gradient(90deg, 
            rgba(255, 255, 255, 0.4) 0%, 
            rgba(255, 255, 255, 0.8) 50%, 
            rgba(255, 255, 255, 0.4) 100%)`,
          borderRadius: '2px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
        }}
      />
      
      {/* Direction indicator */}
      <div
        style={{
          position: 'absolute',
          right: UI_CONFIG.SPACING.MEDIUM,
          fontSize: '14px',
          color: UI_CONFIG.COLORS.TEXT_SECONDARY,
          fontWeight: UI_CONFIG.FONT_WEIGHT.NORMAL,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
          opacity: 0.8,
        }}
      >
        {menuOpen ? '↓' : '↑'}
      </div>
    </div>
  );
};

export default SwipableBar;
