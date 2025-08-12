import React, { useState } from 'react';

export type HexButtonType = 'center' | 'left' | 'right';

interface HexButtonProps {
  type: HexButtonType;
  hexX: number;
  hexY: number;
  hexRadius: number;
  onClick: () => void;
  children: React.ReactNode;
  visible: boolean;
}

interface ButtonDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Gets the visual and clickable dimensions for a hex button
 * This ensures the clickable area matches the visual area exactly
 */
export function getHexButtonDimensions(
  type: HexButtonType, 
  hexX: number, 
  hexY: number, 
  hexRadius: number
): ButtonDimensions {
  let width: number, height: number, x: number, y: number;
  
  if (type === 'center') {
    // Center button: circular, centered on hex
    width = hexRadius * 0.6;
    height = hexRadius * 0.6;
    x = hexX - width / 2;
    y = hexY - height / 2;
  } else {
    // Side buttons: hexagonal, positioned at edges
    width = hexRadius * 0.5;
    height = hexRadius * 0.8;
    
    if (type === 'left') {
      x = hexX - hexRadius * 0.65 - width / 2;
    } else { // right
      x = hexX + hexRadius * 0.65 - width / 2;
    }
    y = hexY - height / 2;
  }
  
  return { width, height, x, y };
}

/**
 * Checks if a mouse position is within the hex button's area
 * Uses the same dimensions as the visual rendering
 */
export function isPointInHexButton(
  mouseX: number,
  mouseY: number,
  type: HexButtonType,
  hexX: number,
  hexY: number,
  hexRadius: number
): boolean {
  const dims = getHexButtonDimensions(type, hexX, hexY, hexRadius);
  
  // Check if point is within the button's bounding box
  const relativeX = mouseX - dims.x;
  const relativeY = mouseY - dims.y;
  
  if (relativeX < 0 || relativeX > dims.width || 
      relativeY < 0 || relativeY > dims.height) {
    return false;
  }
  
  if (type === 'center') {
    // For center button: check if within circle
    const centerX = dims.width / 2;
    const centerY = dims.height / 2;
    const distance = Math.sqrt(
      Math.pow(relativeX - centerX, 2) + Math.pow(relativeY - centerY, 2)
    );
    return distance <= dims.width / 2;
  } else {
    // For side buttons: use the clip-path polygon bounds
    // This is a simplified check - could be made more precise with actual polygon math
    const normalizedX = relativeX / dims.width;
    const normalizedY = relativeY / dims.height;
    
    if (type === 'left') {
      // Rough approximation of: polygon(40% 0%, 100% 0%, 100% 50%, 100% 100%, 45% 100%, 0% 50%)
      if (normalizedY < 0.5) {
        return normalizedX >= (0.4 - 0.4 * normalizedY); // Top-left slope
      } else {
        return normalizedX >= (0.4 - 0.4 * (1 - normalizedY)); // Bottom-left slope
      }
    } else { // right
      // Rough approximation of: polygon(25% 0%, 60% 0%, 100% 50%, 60% 100%, 0% 100%, 0% 0%)
      if (normalizedY < 0.5) {
        return normalizedX <= (0.6 + 0.4 * normalizedY); // Top-right slope
      } else {
        return normalizedX <= (0.6 + 0.4 * (1 - normalizedY)); // Bottom-right slope
      }
    }
  }
}

const HexButton: React.FC<HexButtonProps> = ({
  type,
  hexX,
  hexY,
  hexRadius,
  onClick,
  children,
  visible
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!visible) return null;
  
  const dims = getHexButtonDimensions(type, hexX, hexY, hexRadius);
  
  const getBrightColor = () => {
    if (type === 'center') return 'rgba(100, 200, 255, 0.1)';
    if (type === 'left') return 'rgba(255, 150, 100, 0.1)';
    if (type === 'right') return 'rgba(100, 255, 150, 0.1)';
    return 'rgba(255, 255, 255, 0.2)';
  };

  const getHoverColor = () => {
    if (type === 'center') return 'rgba(120, 220, 255, 0.4)';
    if (type === 'left') return 'rgba(255, 170, 120, 0.4)';
    if (type === 'right') return 'rgba(120, 255, 170, 0.4)';
    return 'rgba(255, 255, 255, 0.4)';
  };
  
  const getButtonShape = () => {
    if (type === 'center') {
      return {
        borderRadius: '50%', // Circular center button
      };
    } else if (type === 'left') {
      return {
        clipPath: 'polygon(40% 0%, 100% 0%, 100% 50%, 100% 100%, 45% 100%, 0% 50%)',
        borderRadius: '0',
      };
    } else { // right
      return {
        clipPath: 'polygon(25% 0%, 60% 0%, 100% 50%, 60% 100%, 0% 100%, 0% 0%)',
        borderRadius: '0',
      };
    }
  };
  
  return (
    <div
      data-hex-button={type}
      onClick={(e) => {
        e.stopPropagation(); // Prevent event from bubbling to container
        onClick();
      }}
      style={{
        position: 'absolute',
        left: dims.x,
        top: dims.y,
        width: dims.width,
        height: dims.height,
        backgroundColor: isHovered ? getHoverColor() : getBrightColor(),
        border: type === 'center' ? `2px solid rgba(100, 200, 255, 0.8)` : 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: `${hexRadius * (type === 'center' ? 0.15 : 0.18)}px`,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        userSelect: 'none',
        pointerEvents: 'auto',
        boxShadow: type !== 'center' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.15s ease',
        // Removed scale transform to prevent hover area changes that cause flickering
        // transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        ...getButtonShape()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
};

export default HexButton;
