# Unified Hex Button System

This document describes the new unified button system that ensures the visual button areas match their clickable areas exactly.

## Problem Solved

### Original Issue
- **Visual vs. Clickable Mismatch**: The drawn button icons were different sizes than their clickable areas
- **Poor UX**: Users saw large buttons but could only click on smaller areas
- **Maintenance Burden**: Button detection logic and visual rendering were separate, leading to drift

### Solution
Created a unified `HexButton` component that handles both visual rendering and click detection using the same dimensions.

## Architecture

### HexButton Component

**File**: `components/HexButton.tsx`

**Key Features**:
1. **Unified Dimensions**: Same calculation for visual and clickable areas
2. **Type-Safe**: Strongly typed button types (`center`, `left`, `right`)
3. **Reusable**: Can be used for any in-hex button needs
4. **Responsive**: Automatically scales with hex size

### Core Functions

#### `getHexButtonDimensions()`
```typescript
function getHexButtonDimensions(
  type: HexButtonType, 
  hexX: number, 
  hexY: number, 
  hexRadius: number
): ButtonDimensions
```
- **Purpose**: Calculates exact button dimensions and position
- **Used by**: Both visual rendering and click detection
- **Ensures**: Perfect alignment between what users see and can click

#### `isPointInHexButton()`
```typescript
function isPointInHexButton(
  mouseX: number,
  mouseY: number,
  type: HexButtonType,
  hexX: number,
  hexY: number,
  hexRadius: number
): boolean
```
- **Purpose**: Precise click detection using same dimensions as visuals
- **Features**: Handles circular (center) and polygonal (left/right) shapes
- **Accuracy**: Uses actual shape math, not just bounding boxes

## Button Types and Dimensions

### Center Button
- **Shape**: Circular
- **Size**: `hexRadius * 0.6` diameter
- **Position**: Centered on hex
- **Function**: Cycle through texture variants

### Left Button (Rotate Right)
- **Shape**: Hexagonal polygon
- **Size**: `hexRadius * 0.5` width, `hexRadius * 0.8` height
- **Position**: Left side of hex center
- **Function**: Rotate texture clockwise

### Right Button (Rotate Left)
- **Shape**: Hexagonal polygon  
- **Size**: `hexRadius * 0.5` width, `hexRadius * 0.8` height
- **Position**: Right side of hex center
- **Function**: Rotate texture counter-clockwise

## Integration with HexGrid

### Updated Detection Logic
**Before** (in `HexGrid.tsx`):
```typescript
// Complex manual detection with hardcoded sizes
const buttonSize = hexRadius * 0.25;
if (deltaX < -buttonSize && Math.abs(deltaY) < buttonSize) return 'left';
```

**After**:
```typescript
// Uses unified detection
if (isPointInHexButton(mouseX, mouseY, 'center', hexPos.x, hexPos.y, hexRadius)) {
  return 'center';
}
```

### Self-Contained Components
- **HexButton handles its own clicks**: No need for manual click routing
- **Direct action dispatch**: Each button calls its action directly
- **Cleaner code**: Removed complex click detection from main mouse handler

## Visual Improvements

### Consistent Appearance
- **Unified styling**: All buttons use the same styling system
- **Hover effects**: Built-in hover animations and feedback
- **Color coding**: 
  - Center (blue): `rgba(100, 200, 255, 0.6)`
  - Left (orange): `rgba(255, 150, 100, 0.6)`
  - Right (green): `rgba(100, 255, 150, 0.6)`

### Interactive Feedback
- **Hover scaling**: Buttons grow slightly on hover (`scale(1.05)`)
- **Color brightening**: Colors become more vibrant on hover
- **Smooth transitions**: 150ms ease transitions for all interactions

## Size Customization

### Easy Adjustment
To modify button sizes, edit the dimensions in `getHexButtonDimensions()`:

```typescript
if (type === 'center') {
  width = hexRadius * 0.6;  // Increase for larger center button
  height = hexRadius * 0.6;
} else {
  width = hexRadius * 0.5;  // Increase for larger side buttons
  height = hexRadius * 0.8;
}
```

### Automatic Consistency
- **Visual rendering**: Automatically uses new dimensions
- **Click detection**: Automatically matches visual areas
- **No synchronization needed**: Single source of truth

## Benefits

### For Users
- ✅ **Larger clickable areas**: Buttons are now as large as they appear
- ✅ **Predictable interaction**: What you see is what you can click
- ✅ **Better mobile experience**: Larger touch targets
- ✅ **Visual clarity**: Clear button boundaries and feedback

### For Developers
- ✅ **Single source of truth**: One place to define button dimensions
- ✅ **Type safety**: Strongly typed button system
- ✅ **Maintainability**: No more sync issues between visual and logic
- ✅ **Reusability**: Component can be used elsewhere
- ✅ **Testability**: Clear interfaces for testing

## Usage Examples

### Basic Button
```typescript
<HexButton
  type="center"
  hexX={hexPosition.x}
  hexY={hexPosition.y}
  hexRadius={radius}
  onClick={() => cycleTexture()}
  visible={shouldShowButton}
>
  ⬤
</HexButton>
```

### Custom Styling
```typescript
// The component handles its own styling, but you can customize
// by modifying the internal styles in HexButton.tsx
```

### Multiple Buttons
```typescript
{['center', 'left', 'right'].map(type => (
  <HexButton
    key={type}
    type={type}
    hexX={hex.x}
    hexY={hex.y}
    hexRadius={radius}
    onClick={() => handleAction(type)}
    visible={true}
  >
    {getButtonIcon(type)}
  </HexButton>
))}
```

## Future Enhancements

### Potential Improvements
- **Configurable sizes**: Runtime button size adjustment
- **Animation system**: Entrance/exit animations
- **Keyboard support**: Tab navigation and space/enter activation
- **Accessibility**: ARIA labels and screen reader support
- **Custom shapes**: Support for other button shapes beyond circle/hexagon

### Advanced Features
- **Context menus**: Right-click button actions
- **Gesture support**: Touch gestures for mobile
- **Tooltip system**: Hover explanations for button functions
- **Theme support**: Different visual themes for buttons

## Migration Notes

### Breaking Changes
- **Removed manual click detection**: No longer needed in main mouse handler
- **Component-based rendering**: Old style-based rendering replaced
- **Updated imports**: Need to import `HexButton` and related types

### Compatibility
- **Same public API**: HexGrid props remain unchanged
- **Same visual appearance**: Buttons look the same to users
- **Same functionality**: All button actions work identically
- **Better performance**: Reduced complexity in main render loop
