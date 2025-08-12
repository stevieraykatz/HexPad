# Terrain Background Painting

This document describes the automatic background color application when placing terrain textures.

## Overview

When users place terrain hexes, the system now automatically applies the currently selected background color from the background color wheel. This ensures that terrain placement is a single-step operation that sets both the terrain texture and its background color simultaneously.

## How It Works

### Terrain Placement Behavior

1. **User selects a terrain type** from the paint menu
2. **User selects a background color** using the color wheel in the paint menu
3. **User clicks on a hex** to place the terrain
4. **System automatically applies both**:
   - The selected terrain texture
   - The selected background color

### Background Color Independence

- The background color applied during terrain placement is **independent** of the background painting mode
- Users can still **activate background painting mode** later to change background colors
- Users can **paint different background colors** on existing terrain hexes
- The background color wheel remains **fully functional** for dedicated background painting

### Eraser Behavior

When using the eraser tool on a terrain hex:

1. **Priority 1**: Remove any icons on the hex
2. **Priority 2**: Remove the terrain texture AND its background color
3. **Priority 3**: Do nothing if the hex is already empty

This ensures that erasing terrain completely cleans the hex, removing both the texture and background color.

## User Experience Benefits

### Single-Step Terrain Placement
- **Before**: Users had to place terrain, then switch to background mode, then paint background
- **After**: Users select colors once and place terrain with background in one click

### Consistent Visual Design
- All terrain hexes get appropriate background colors automatically
- No more "naked" terrain textures on default backgrounds
- Improved visual coherence across the map

### Maintains Flexibility
- Background painting mode still works for fine-tuning
- Users can change background colors after placement
- Full control over visual appearance is preserved

## Technical Implementation

### Code Changes

The `paintHex` function in `useGridState.ts` was updated to:

```typescript
// Apply terrain texture
setHexColors(prev => ({
  ...prev,
  [hexKey]: newValue
}));

// Automatically apply background color
setHexBackgroundColors(prev => ({
  ...prev,
  [hexKey]: selectedBackgroundColor
}));
```

### Eraser Updates

The eraser logic was enhanced to remove both texture and background:

```typescript
// Remove terrain texture
setHexColors(prev => {
  const newColors = { ...prev };
  delete newColors[hexKey];
  return newColors;
});

// Remove background color
setHexBackgroundColors(prev => {
  const newBackgroundColors = { ...prev };
  delete newBackgroundColors[hexKey];
  return newBackgroundColors;
});
```

## Usage Workflow

### For New Users
1. Open the paint menu
2. Select desired background color using the color wheel
3. Select terrain type from the terrain options
4. Click on hexes to place terrain with background

### For Existing Users
- **No workflow changes required**
- Existing behavior is preserved
- Background painting mode continues to work as before
- Additional automatic background application enhances the workflow

## Compatibility

### Backward Compatibility
- Existing maps remain unchanged
- All existing functionality continues to work
- No breaking changes to the user interface

### Background Painting Mode
- **Still available** for dedicated background color changes
- **Still accessible** via the background color preview button
- **Still functional** for painting backgrounds without textures

## Testing Scenarios

1. **Basic Terrain Placement**:
   - Select background color
   - Select terrain type
   - Place terrain → Verify both texture and background are applied

2. **Background Color Changes**:
   - Place terrain with one background color
   - Change background color selection
   - Place new terrain → Verify new terrain gets new background color

3. **Background Painting Mode**:
   - Place terrain with automatic background
   - Activate background painting mode
   - Change background color → Verify existing terrain background can be changed

4. **Eraser Functionality**:
   - Place terrain with background
   - Use eraser → Verify both texture and background are removed

5. **Mixed Usage**:
   - Combine automatic terrain placement with manual background painting
   - Verify all combinations work correctly

## Future Enhancements

### Potential Improvements
- **Per-terrain default backgrounds**: Each terrain type could have its own default background color
- **Smart background suggestions**: System could suggest complementary colors for each terrain
- **Background color themes**: Predefined color schemes for different map styles

### Configuration Options
- **Toggle automatic background**: Allow users to disable automatic background application
- **Background intensity settings**: Allow adjustment of background color opacity
- **Terrain-specific backgrounds**: Configure different default backgrounds per terrain type
