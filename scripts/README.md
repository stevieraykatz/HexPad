# Asset Configuration Generator

This directory contains scripts for generating TypeScript configuration files from terrain asset directories.

## 🚀 Quick Start (Recommended)

Use the direct TypeScript generator for the fastest and simplest workflow:

```bash
npm run generate-assets
```

Or run directly:
```bash
node scripts/generateDirectTS.js public/assets/terrain components/config/generated/
```

## 📁 Scripts Overview

### `generateDirectTS.js` ⭐ **RECOMMENDED**
**Direct TypeScript Generation** - Generates TypeScript files directly from asset directories, bypassing JSON intermediates.

## Usage

### Single Directory Processing
```bash
node generateAssetManifest.js <asset-directory> [output-file]
```

### Batch Processing (All Subdirectories)
```bash
node generateAssetManifest.js --batch <parent-directory>
```

### Examples

```bash
# Generate manifest for single directory and output to console
node generateAssetManifest.js ./public/assets/terrain/forest

# Generate manifest for single directory and save to file
node generateAssetManifest.js ./public/assets/terrain/forest forest-manifest.json

# Batch process all subdirectories in terrain folder
node generateAssetManifest.js --batch ./public/assets/terrain
```

The batch processing mode automatically:
- Finds all subdirectories in the specified parent directory
- Generates a manifest for each subdirectory
- Saves each manifest as `{directory-name}-manifest.json` within the subdirectory
- Overwrites existing manifest files
- Provides a summary of successful and failed operations

## Filename Parsing Rules

The script automatically extracts metadata from filenames based on these patterns:

### 1. **Angles** (60, 120, 180, 240, 300, 360)
- `forest_120_top_1.png` → `angle: 120`
- `coast_180_special_1.png` → `angle: 180`

### 2. **Sides** (top, bottom, side, top-side, bottom-side)
- `forest_120_top_1.png` → `side: "top"`
- `forest_180_bottom-side_2.png` → `side: "bottom-side"`

### 3. **Special Designation**
- `coast_180_special_1.png` → `special: true`

### 4. **Variants** (trailing numbers)
- `forest_180_bottom-side_1.png` → `variant: 1`
- `forest_180_bottom-side_2.png` → `variant: 2`

## Manifest Structure

The generated manifest provides multiple query interfaces:

```json
{
  "name": "forest",
  "generated": "2025-08-06T21:10:03.854Z",
  "totalAssets": 8,
  "assets": {
    "byAngle": {
      "120": {
        "angle_120_side_top": [/* assets */],
        "angle_120_side_bottom": [/* assets */]
      },
      "180": {
        "angle_180_side_bottom-side": [/* assets */]
      }
    },
    "bySide": {
      "top": {
        "angle_120_side_top": [/* assets */]
      },
      "bottom-side": {
        "angle_180_side_bottom-side": [/* assets */]
      }
    },
    "bySpecial": {
      "angle_180_special": [/* special assets */]
    },
    "all": {
      /* All assets grouped by their combined properties */
    }
  },
  "rawAssets": [/* Complete list of individual assets */]
}
```

## Query Examples

### Get assets by angle
```javascript
const assets120 = manifest.assets.byAngle[120];
// Returns all 120-degree assets grouped by their other properties
```

### Get assets by side
```javascript
const topAssets = manifest.assets.bySide['top'];
// Returns all "top" side assets grouped by angle
```

### Get specific combination
```javascript
const bottomSide180 = manifest.assets.byAngle[180]['angle_180_side_bottom-side'];
// Returns array of 180-degree bottom-side assets
```

### Get special assets
```javascript
const specialAssets = manifest.assets.bySpecial;
// Returns all assets marked as "special"
```

## Integration with Rendering Logic

The manifest structure is optimized for rendering systems that need to:

1. **Find assets by angle**: `manifest.assets.byAngle[120]`
2. **Find assets by side**: `manifest.assets.bySide['top']`
3. **Random selection**: Pick random variant from an array
4. **Fallback logic**: Check special assets first, then regular assets

See `manifestUsageExample.js` for detailed implementation examples.

## Supported File Types

- `.png`
- `.jpg` / `.jpeg`
- `.gif`
- `.webp`

## Output Format

The manifest includes:
- **Structured query interfaces** (byAngle, bySide, bySpecial)
- **Complete asset list** (all)
- **Raw asset metadata** (rawAssets)
- **Summary statistics** (totalAssets, counts by type)
