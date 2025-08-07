// Example usage of the asset manifest for rendering logic
// This demonstrates how to efficiently query assets by angle, side, or special properties

/**
 * Example queries using the generated manifest structure
 */

// Example manifest (shortened for demonstration)
const forestManifest = {
  "name": "forest",
  "assets": {
    "byAngle": {
      "120": {
        "angle_120_side_top": [{ "filename": "forest_120_top_1.png", "angle": 120, "side": "top", "variant": 1 }],
        "angle_120_side_bottom": [{ "filename": "forest_120_bottom_1.png", "angle": 120, "side": "bottom", "variant": 1 }]
      },
      "180": {
        "angle_180_side_bottom-side": [
          { "filename": "forest_180_bottom-side_1.png", "angle": 180, "side": "bottom-side", "variant": 1 },
          { "filename": "forest_180_bottom-side_2.png", "angle": 180, "side": "bottom-side", "variant": 2 }
        ]
      }
    },
    "bySide": {
      "top": {
        "angle_120_side_top": [{ "filename": "forest_120_top_1.png", "angle": 120, "side": "top", "variant": 1 }]
      },
      "bottom-side": {
        "angle_180_side_bottom-side": [
          { "filename": "forest_180_bottom-side_1.png", "angle": 180, "side": "bottom-side", "variant": 1 },
          { "filename": "forest_180_bottom-side_2.png", "angle": 180, "side": "bottom-side", "variant": 2 }
        ]
      }
    },
    "bySpecial": {},
    "all": {
      // Complete list of all grouped assets
    }
  }
};

/**
 * Query functions for efficient asset lookup
 */

// Get all assets for a specific angle
function getAssetsByAngle(manifest, angle) {
  return manifest.assets.byAngle[angle] || {};
}

// Get all assets for a specific side
function getAssetsBySide(manifest, side) {
  return manifest.assets.bySide[side] || {};
}

// Get assets by both angle and side
function getAssetsByAngleAndSide(manifest, angle, side) {
  const angleAssets = getAssetsByAngle(manifest, angle);
  return Object.values(angleAssets).find(group => 
    group.length > 0 && group[0].side === side
  ) || [];
}

// Get a random variant from a specific angle/side combination
function getRandomAsset(manifest, angle, side = null) {
  let assets;
  
  if (side) {
    assets = getAssetsByAngleAndSide(manifest, angle, side);
  } else {
    const angleAssets = getAssetsByAngle(manifest, angle);
    // Get all assets for this angle, regardless of side
    assets = Object.values(angleAssets).flat();
  }
  
  if (assets.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * assets.length);
  return assets[randomIndex];
}

// Get special assets
function getSpecialAssets(manifest) {
  return manifest.assets.bySpecial;
}

/**
 * Usage examples
 */

console.log('=== Asset Manifest Query Examples ===\n');

// Example 1: Get all 120-degree assets
console.log('1. All 120-degree forest assets:');
const assets120 = getAssetsByAngle(forestManifest, 120);
console.log(JSON.stringify(assets120, null, 2));

console.log('\n2. All "top" side assets:');
const topAssets = getAssetsBySide(forestManifest, 'top');
console.log(JSON.stringify(topAssets, null, 2));

console.log('\n3. Specific 180-degree bottom-side assets:');
const specific = getAssetsByAngleAndSide(forestManifest, 180, 'bottom-side');
console.log(JSON.stringify(specific, null, 2));

console.log('\n4. Random 120-degree asset:');
const random120 = getRandomAsset(forestManifest, 120);
console.log(JSON.stringify(random120, null, 2));

console.log('\n5. Random 180-degree bottom-side asset:');
const randomSpecific = getRandomAsset(forestManifest, 180, 'bottom-side');
console.log(JSON.stringify(randomSpecific, null, 2));

/**
 * Advanced rendering logic example
 */

class TerrainRenderer {
  constructor(manifest) {
    this.manifest = manifest;
  }
  
  // Render terrain with specific requirements
  renderTerrain(angle, side = null, preferSpecial = false) {
    let asset;
    
    // Check for special assets first if preferred
    if (preferSpecial) {
      const specialAssets = getSpecialAssets(this.manifest);
      const specialKey = `angle_${angle}_special`;
      if (specialAssets[specialKey]) {
        asset = specialAssets[specialKey][0]; // Use first special asset
      }
    }
    
    // Fall back to regular assets
    if (!asset) {
      asset = getRandomAsset(this.manifest, angle, side);
    }
    
    if (!asset) {
      console.log(`No asset found for angle ${angle}${side ? `, side ${side}` : ''}`);
      return null;
    }
    
    console.log(`Rendering: ${asset.filename} (angle: ${asset.angle}, side: ${asset.side || 'none'}, variant: ${asset.variant})`);
    return asset.filename;
  }
  
  // Get all available angles for this terrain type
  getAvailableAngles() {
    return Object.keys(this.manifest.assets.byAngle).map(Number).sort((a, b) => a - b);
  }
  
  // Get all available sides for this terrain type
  getAvailableSides() {
    return Object.keys(this.manifest.assets.bySide);
  }
}

// Example usage of the renderer
console.log('\n=== Terrain Renderer Example ===\n');
const renderer = new TerrainRenderer(forestManifest);

console.log('Available angles:', renderer.getAvailableAngles());
console.log('Available sides:', renderer.getAvailableSides());

console.log('\nRendering examples:');
renderer.renderTerrain(120, 'top');
renderer.renderTerrain(180, 'bottom-side');
renderer.renderTerrain(180); // Any side for 180 degrees
renderer.renderTerrain(240); // No assets available for this angle

module.exports = {
  getAssetsByAngle,
  getAssetsBySide,
  getAssetsByAngleAndSide,
  getRandomAsset,
  getSpecialAssets,
  TerrainRenderer
};