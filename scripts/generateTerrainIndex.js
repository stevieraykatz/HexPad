#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generates a comprehensive terrain index that catalogs all available terrain types
 * and their manifest files for consumption by the application
 */

/**
 * Scans a terrain directory and creates an index of all available terrain types
 * @param {string} terrainDirectory - Path to the terrain directory
 * @returns {object} - Terrain index with metadata
 */
function generateTerrainIndex(terrainDirectory) {
  if (!fs.existsSync(terrainDirectory)) {
    throw new Error(`Terrain directory not found: ${terrainDirectory}`);
  }
  
  const stats = fs.statSync(terrainDirectory);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${terrainDirectory}`);
  }
  
  console.log(`Generating terrain index for: ${terrainDirectory}`);
  
  // Read all items in the terrain directory
  const items = fs.readdirSync(terrainDirectory);
  
  // Filter for directories and files
  const directories = items.filter(item => {
    if (item.startsWith('.')) return false; // Skip hidden files/directories
    const itemPath = path.join(terrainDirectory, item);
    try {
      return fs.statSync(itemPath).isDirectory();
    } catch (error) {
      return false;
    }
  });
  
  const baseTerrainFiles = items.filter(item => {
    if (item.startsWith('.')) return false;
    const itemPath = path.join(terrainDirectory, item);
    try {
      const stats = fs.statSync(itemPath);
      const ext = path.extname(item).toLowerCase();
      return stats.isFile() && ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    } catch (error) {
      return false;
    }
  });
  
  // Process base terrain files (simple terrain types)
  const baseTerrains = baseTerrainFiles.map(file => {
    const name = path.parse(file).name;
    return {
      name: name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      type: 'simple',
      basePath: `/assets/terrain/${file}`,
      manifestPath: null,
      hasVariants: false,
      assetCount: 1
    };
  });
  
  // Process subdirectories (complex terrain types with variants)
  const complexTerrains = [];
  directories.forEach(dirName => {
    const dirPath = path.join(terrainDirectory, dirName);
    const manifestPath = path.join(dirPath, `${dirName}-manifest.json`);
    
    // Check if manifest exists
    const hasManifest = fs.existsSync(manifestPath);
    let assetCount = 0;
    let hasAngles = false;
    let hasSides = false;
    let hasSpecial = false;
    
    if (hasManifest) {
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);
        assetCount = manifest.totalAssets || 0;
        hasAngles = Object.keys(manifest.assets?.byAngle || {}).length > 0;
        hasSides = Object.keys(manifest.assets?.bySide || {}).length > 0;
        hasSpecial = Object.keys(manifest.assets?.bySpecial || {}).length > 0;
      } catch (error) {
        console.warn(`Warning: Could not parse manifest for ${dirName}: ${error.message}`);
      }
    } else {
      // Count files directly if no manifest
      try {
        const files = fs.readdirSync(dirPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
        });
        assetCount = imageFiles.length;
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dirName}: ${error.message}`);
      }
    }
    
    // Check for base terrain file
    const baseTerrainPath = path.join(terrainDirectory, `${dirName}.png`);
    const hasBaseFile = fs.existsSync(baseTerrainPath);
    
    complexTerrains.push({
      name: dirName,
      displayName: dirName.charAt(0).toUpperCase() + dirName.slice(1),
      type: 'complex',
      basePath: hasBaseFile ? `/assets/terrain/${dirName}.png` : null,
      manifestPath: hasManifest ? `/assets/terrain/${dirName}/${dirName}-manifest.json` : null,
      hasVariants: true,
      assetCount: assetCount,
      features: {
        hasAngles,
        hasSides,
        hasSpecial
      }
    });
  });
  
  // Combine all terrain types
  const allTerrains = [...baseTerrains, ...complexTerrains];
  
  // Create the terrain index
  const terrainIndex = {
    name: 'terrain',
    generated: new Date().toISOString(),
    totalTerrainTypes: allTerrains.length,
    totalAssets: allTerrains.reduce((sum, terrain) => sum + terrain.assetCount, 0),
    baseTerrains: baseTerrains.length,
    complexTerrains: complexTerrains.length,
    terrains: allTerrains.reduce((acc, terrain) => {
      acc[terrain.name] = terrain;
      return acc;
    }, {}),
    // Organized by type for easy filtering
    byType: {
      simple: baseTerrains,
      complex: complexTerrains
    }
  };
  
  return terrainIndex;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node generateTerrainIndex.js <terrain-directory> [output-file]');
    console.error('Example: node generateTerrainIndex.js ./public/assets/terrain');
    process.exit(1);
  }
  
  const terrainDirectory = args[0];
  const outputFile = args[1];
  
  try {
    const terrainIndex = generateTerrainIndex(terrainDirectory);
    
    const jsonOutput = JSON.stringify(terrainIndex, null, 2);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, jsonOutput);
      console.log(`Terrain index written to: ${outputFile}`);
    } else {
      console.log(jsonOutput);
    }
    
    console.log(`\nTerrain Index Summary:`);
    console.log(`- Total terrain types: ${terrainIndex.totalTerrainTypes}`);
    console.log(`- Total assets: ${terrainIndex.totalAssets}`);
    console.log(`- Simple terrains: ${terrainIndex.baseTerrains}`);
    console.log(`- Complex terrains: ${terrainIndex.complexTerrains}`);
    console.log(`- Available types: ${Object.keys(terrainIndex.terrains).join(', ')}`);
    
  } catch (error) {
    console.error('Error generating terrain index:', error.message);
    process.exit(1);
  }
}

// Export functions for use as a module
if (require.main === module) {
  main();
} else {
  module.exports = {
    generateTerrainIndex
  };
}