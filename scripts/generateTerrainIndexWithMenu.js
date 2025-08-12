#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Enhanced terrain index generator that includes menu preview configuration
 */

/**
 * Validates that a preview asset exists in the terrain directory
 */
function validatePreviewAsset(terrainName, previewAsset, terrainDirectory) {
  const assetPath = path.join(terrainDirectory, terrainName, previewAsset);
  return fs.existsSync(assetPath);
}

/**
 * Gets the first available asset from a terrain directory as fallback
 */
function getFirstAvailableAsset(terrainName, terrainDirectory) {
  const terrainPath = path.join(terrainDirectory, terrainName);
  
  if (!fs.existsSync(terrainPath)) {
    return null;
  }
  
  const files = fs.readdirSync(terrainPath);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext);
  });
  
  return imageFiles.length > 0 ? imageFiles[0] : null;
}

/**
 * Merges terrain index with menu configuration
 */
function generateTerrainIndexWithMenu(terrainIndexPath, menuConfigPath, terrainDirectory, outputPath) {
  // Read terrain index
  if (!fs.existsSync(terrainIndexPath)) {
    throw new Error(`Terrain index not found: ${terrainIndexPath}`);
  }
  
  const terrainIndex = JSON.parse(fs.readFileSync(terrainIndexPath, 'utf8'));
  
  // Read menu configuration
  let menuConfig = {};
  if (fs.existsSync(menuConfigPath)) {
    const menuConfigData = JSON.parse(fs.readFileSync(menuConfigPath, 'utf8'));
    menuConfig = menuConfigData.menuConfig || {};
  } else {
    console.warn(`Menu config not found: ${menuConfigPath}. Using defaults.`);
  }
  
  // Process each terrain
  Object.keys(terrainIndex.terrains).forEach(terrainName => {
    const terrain = terrainIndex.terrains[terrainName];
    const terrainMenuConfig = menuConfig[terrainName] || {};
    
    // Validate and set preview asset
    let previewAsset = terrainMenuConfig.previewAsset;
    
    if (previewAsset && !validatePreviewAsset(terrainName, previewAsset, terrainDirectory)) {
      console.warn(`Preview asset ${previewAsset} not found for ${terrainName}. Using fallback.`);
      previewAsset = null;
    }
    
    // Use fallback if no valid preview asset
    if (!previewAsset) {
      previewAsset = getFirstAvailableAsset(terrainName, terrainDirectory);
    }
    
    // Add menu configuration to terrain
    terrain.menuConfig = {
      previewAsset: previewAsset,
      previewPath: previewAsset ? `/assets/terrain/${terrainName}/${previewAsset}` : null,
      backgroundColor: terrainMenuConfig.backgroundColor || '#6B7280',
      description: terrainMenuConfig.description || terrain.displayName,
      useCustomBackground: !!terrainMenuConfig.backgroundColor
    };
  });
  
  // Add generation metadata
  terrainIndex.menuConfigGenerated = new Date().toISOString();
  terrainIndex.menuConfigVersion = '1.0.0';
  
  // Write the enhanced terrain index
  const jsonOutput = JSON.stringify(terrainIndex, null, 2);
  fs.writeFileSync(outputPath, jsonOutput);
  
  return terrainIndex;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node generateTerrainIndexWithMenu.js <terrain-index.json> <menu-config.json> <terrain-directory> [output-file]');
    console.error('Example: node generateTerrainIndexWithMenu.js ./public/assets/terrain-index.json ./public/assets/terrain-menu-config.json ./public/assets/terrain ./public/assets/terrain-index.json');
    process.exit(1);
  }
  
  const terrainIndexPath = args[0];
  const menuConfigPath = args[1];
  const terrainDirectory = args[2];
  const outputPath = args[3] || terrainIndexPath; // Default to overwriting the input file
  
  try {
    console.log(`Generating enhanced terrain index with menu configuration...`);
    console.log(`- Terrain Index: ${terrainIndexPath}`);
    console.log(`- Menu Config: ${menuConfigPath}`);
    console.log(`- Terrain Directory: ${terrainDirectory}`);
    console.log(`- Output: ${outputPath}\n`);
    
    const enhancedIndex = generateTerrainIndexWithMenu(terrainIndexPath, menuConfigPath, terrainDirectory, outputPath);
    
    console.log(`Enhanced terrain index written to: ${outputPath}`);
    console.log(`\nMenu Configuration Summary:`);
    
    Object.keys(enhancedIndex.terrains).forEach(terrainName => {
      const terrain = enhancedIndex.terrains[terrainName];
      const menuConfig = terrain.menuConfig;
      
      console.log(`- ${terrain.displayName}:`);
      console.log(`  Preview: ${menuConfig.previewAsset || 'none'}`);
      console.log(`  Background: ${menuConfig.backgroundColor}`);
      console.log(`  Custom Background: ${menuConfig.useCustomBackground ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('Error generating enhanced terrain index:', error.message);
    process.exit(1);
  }
}

// Export functions for use as a module
if (require.main === module) {
  main();
} else {
  module.exports = {
    generateTerrainIndexWithMenu,
    validatePreviewAsset,
    getFirstAvailableAsset
  };
}
