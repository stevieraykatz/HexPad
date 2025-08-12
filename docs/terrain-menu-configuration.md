# Terrain Menu Configuration

This system allows you to customize which asset is shown as the preview icon for each terrain type in the paint menu, along with custom background colors for better visual presentation.

## Overview

The terrain menu configuration is stored in `/public/assets/terrain-menu-config.json` and gets merged into the terrain index during the build process.

## Configuration File Structure

```json
{
  "menuConfig": {
    "terrainName": {
      "previewAsset": "specific_asset_filename.png",
      "backgroundColor": "#HexColor",
      "description": "Descriptive text for tooltip"
    }
  },
  "defaultSettings": {
    "backgroundColor": "#6B7280",
    "fallbackAssetPattern": "_1.png",
    "useTerrainNameColor": false
  }
}
```

## Current Configuration

Each terrain type has been configured with:

- **Coast**: `coast_180_1.png` on blue background `#4A90E2`
- **Forest**: `forest_180_top_B1.png` on dark green background `#2D5016`  
- **Hills**: `hills_2.png` on brown background `#8B7355`
- **Mountain**: `mountain_3.png` on gray background `#6B6B6B`
- **Plains**: `plains_1.png` on light green background `#A0B366`
- **Shrubland**: `shrubland_2.png` on olive background `#7A8B4A`
- **Swamp**: `swamp_3.png` on dark green background `#3B4F2C`

## How to Update Configuration

1. **Edit the configuration file**: Modify `/public/assets/terrain-menu-config.json`

2. **Regenerate the terrain index**: Run the enhanced generation script
   ```bash
   node scripts/generateTerrainIndexWithMenu.js \
     ./public/assets/terrain-index.json \
     ./public/assets/terrain-menu-config.json \
     ./public/assets/terrain \
     ./public/assets/terrain-index.json
   ```

3. **Regenerate TypeScript files**: Update the generated TypeScript files
   ```bash
   node scripts/generateTerrainTypes.js \
     ./public/assets/terrain-index.json \
     ./components/config/generated/
   ```

4. **Restart the development server**: The changes will be reflected in the UI

## Choosing Preview Assets

### Finding Available Assets

Each terrain directory contains multiple assets. To see what's available:

1. Look in `/public/assets/terrain/[terrain-name]/`
2. Check the generated manifest file: `/public/assets/terrain/[terrain-name]/[terrain-name]-manifest.json`
3. Browse the `rawAssets` section to see all available files

### Asset Naming Conventions

- Files with angle numbers (60, 120, 180, 240, 300, 360) represent directional variants
- Files with side designations (top, bottom, side, top-side, bottom-side) represent positional variants
- Files with variant numbers (_1, _2, _3) represent different variations of the same type

### Selection Tips

- Choose assets that are visually distinctive and representative of the terrain type
- Consider how the asset will look at a small size in the menu
- Test with different background colors to ensure good contrast

## Background Color Guidelines

### Color Psychology
- **Blue tones**: Water-related terrains (coast, ocean)
- **Green tones**: Vegetation terrains (forest, plains, shrubland)
- **Brown/Gray tones**: Rocky/mineral terrains (mountain, hills)
- **Dark greens**: Wetland terrains (swamp)

### Accessibility
- Ensure sufficient contrast between the asset and background
- Test readability of any overlaid text
- Consider color-blind users when selecting colors

## Validation

The system includes automatic validation:

- **Asset existence**: Verifies the specified preview asset exists in the terrain directory
- **Fallback handling**: Uses the first available asset if the specified one is missing
- **Default values**: Applies default background color if none specified

## Troubleshooting

### Asset Not Found
If you specify a preview asset that doesn't exist:
1. Check the filename spelling and case sensitivity
2. Verify the file exists in the correct terrain directory
3. Check the console output during generation for warnings

### Background Color Not Applied
If background colors aren't showing:
1. Ensure the color is in valid hex format (#RRGGBB)
2. Check that the terrain index was regenerated after config changes
3. Verify the TypeScript files were regenerated

### Changes Not Reflected
If changes don't appear in the UI:
1. Restart the development server
2. Clear browser cache
3. Check for TypeScript compilation errors
