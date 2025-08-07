#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Parses a filename to extract metadata based on the naming patterns
 * @param {string} filename - The filename to parse (without directory path)
 * @returns {object} - Parsed metadata object
 */
function parseFilename(filename) {
  // Remove file extension
  const nameWithoutExt = path.parse(filename).name;
  
  // Initialize metadata object
  const metadata = {
    filename: filename,
    name: nameWithoutExt
  };
  
  // Split filename by underscores
  const parts = nameWithoutExt.split('_');
  
  if (parts.length < 2) {
    // Simple filename without underscores, just return basic metadata
    return metadata;
  }
  
  // First part is always the base name (e.g., 'forest', 'coast')
  metadata.baseName = parts[0];
  
  // Parse remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if it's an angle (60, 120, 180, 240, 300, 360)
    if (/^\d{2,3}$/.test(part) && [60, 120, 180, 240, 300, 360].includes(parseInt(part))) {
      metadata.angle = parseInt(part);
      continue;
    }
    
    // Check if it's a side designation
    if (['top', 'bottom', 'side', 'top-side', 'bottom-side'].includes(part)) {
      metadata.side = part;
      continue;
    }
    
    // Check if it's a special designation
    if (part === 'special') {
      metadata.special = true;
      continue;
    }
    
    // Check if it's a trailing number (variant)
    if (/^\d+$/.test(part)) {
      metadata.variant = parseInt(part);
      continue;
    }
  }
  
  return metadata;
}

/**
 * Groups assets by their shared properties for efficient querying
 * @param {Array} assets - Array of parsed asset metadata
 * @returns {object} - Grouped assets structure
 */
function groupAssets(assets) {
  const grouped = {};
  
  assets.forEach(asset => {
    // Create a key based on angle, side, and special properties
    const keyParts = [];
    
    if (asset.angle !== undefined) {
      keyParts.push(`angle_${asset.angle}`);
    }
    
    if (asset.side) {
      keyParts.push(`side_${asset.side}`);
    }
    
    if (asset.special) {
      keyParts.push('special');
    }
    
    // If no specific properties, use 'base'
    const key = keyParts.length > 0 ? keyParts.join('_') : 'base';
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    
    grouped[key].push(asset);
  });
  
  // Sort variants within each group
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => {
      const variantA = a.variant || 0;
      const variantB = b.variant || 0;
      return variantA - variantB;
    });
  });
  
  return grouped;
}

/**
 * Creates an optimized structure for querying by angle and side
 * @param {object} groupedAssets - Grouped assets from groupAssets()
 * @returns {object} - Optimized query structure
 */
function createQueryStructure(groupedAssets) {
  const queryStructure = {
    byAngle: {},
    bySide: {},
    bySpecial: {},
    all: groupedAssets
  };
  
  // Group by angle
  Object.entries(groupedAssets).forEach(([key, assets]) => {
    const firstAsset = assets[0];
    
    if (firstAsset.angle !== undefined) {
      if (!queryStructure.byAngle[firstAsset.angle]) {
        queryStructure.byAngle[firstAsset.angle] = {};
      }
      queryStructure.byAngle[firstAsset.angle][key] = assets;
    }
    
    if (firstAsset.side) {
      if (!queryStructure.bySide[firstAsset.side]) {
        queryStructure.bySide[firstAsset.side] = {};
      }
      queryStructure.bySide[firstAsset.side][key] = assets;
    }
    
    if (firstAsset.special) {
      queryStructure.bySpecial[key] = assets;
    }
  });
  
  return queryStructure;
}

/**
 * Generates a manifest for assets in a specified directory
 * @param {string} assetDirectory - Path to the asset directory
 * @returns {object} - Generated manifest
 */
function generateManifest(assetDirectory) {
  if (!fs.existsSync(assetDirectory)) {
    throw new Error(`Directory not found: ${assetDirectory}`);
  }
  
  const stats = fs.statSync(assetDirectory);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${assetDirectory}`);
  }
  
  // Get directory name for manifest title
  const directoryName = path.basename(assetDirectory);
  
  // Read all files in directory
  const files = fs.readdirSync(assetDirectory);
  
  // Filter for image files (png, jpg, jpeg, gif, webp)
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext);
  });
  
  // Parse each file
  const assets = imageFiles.map(file => parseFilename(file));
  
  // Group assets by shared properties
  const groupedAssets = groupAssets(assets);
  
  // Create optimized query structure
  const queryStructure = createQueryStructure(groupedAssets);
  
  // Generate final manifest
  const manifest = {
    name: directoryName,
    generated: new Date().toISOString(),
    totalAssets: assets.length,
    assets: queryStructure,
    // Include raw list for debugging/inspection
    rawAssets: assets
  };
  
  return manifest;
}

/**
 * Processes all subdirectories in a parent directory and generates manifests
 * @param {string} parentDirectory - Path to the parent directory containing asset subdirectories
 */
function processAllSubdirectories(parentDirectory) {
  if (!fs.existsSync(parentDirectory)) {
    throw new Error(`Directory not found: ${parentDirectory}`);
  }
  
  const stats = fs.statSync(parentDirectory);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${parentDirectory}`);
  }
  
  console.log(`Processing all subdirectories in: ${parentDirectory}\n`);
  
  // Read all items in the parent directory
  const items = fs.readdirSync(parentDirectory);
  
  // Filter for directories only (exclude hidden directories and files)
  const directories = items.filter(item => {
    if (item.startsWith('.')) return false; // Skip hidden files/directories
    const itemPath = path.join(parentDirectory, item);
    try {
      return fs.statSync(itemPath).isDirectory();
    } catch (error) {
      return false; // Skip inaccessible items
    }
  });
  
  if (directories.length === 0) {
    console.log('No subdirectories found.');
    return;
  }
  
  const results = [];
  
  directories.forEach(dirName => {
    const dirPath = path.join(parentDirectory, dirName);
    const manifestPath = path.join(dirPath, `${dirName}-manifest.json`);
    
    try {
      console.log(`Generating manifest for: ${dirName}/`);
      const manifest = generateManifest(dirPath);
      
      const jsonOutput = JSON.stringify(manifest, null, 2);
      fs.writeFileSync(manifestPath, jsonOutput);
      
      console.log(`✓ Manifest written to: ${manifestPath}`);
      console.log(`  - Total assets: ${manifest.totalAssets}`);
      console.log(`  - Asset groups: ${Object.keys(manifest.assets.all).length}`);
      console.log(`  - Angles found: ${Object.keys(manifest.assets.byAngle).join(', ') || 'none'}`);
      console.log(`  - Sides found: ${Object.keys(manifest.assets.bySide).join(', ') || 'none'}`);
      console.log(`  - Special assets: ${Object.keys(manifest.assets.bySpecial).length}\n`);
      
      results.push({
        directory: dirName,
        manifestPath: manifestPath,
        totalAssets: manifest.totalAssets,
        success: true
      });
      
    } catch (error) {
      console.error(`✗ Error processing ${dirName}/: ${error.message}\n`);
      results.push({
        directory: dirName,
        error: error.message,
        success: false
      });
    }
  });
  
  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('=== SUMMARY ===');
  console.log(`Successfully processed: ${successful.length}/${results.length} directories`);
  
  if (successful.length > 0) {
    console.log('\nSuccessful:');
    successful.forEach(result => {
      console.log(`  ✓ ${result.directory}/ (${result.totalAssets} assets) → ${result.manifestPath}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\nFailed:');
    failed.forEach(result => {
      console.log(`  ✗ ${result.directory}/: ${result.error}`);
    });
  }
  
  return results;
}

/**
 * Main function - handles command line arguments
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage:');
    console.error('  Single directory: node generateAssetManifest.js <asset-directory> [output-file]');
    console.error('  Batch process:   node generateAssetManifest.js --batch <parent-directory>');
    console.error('');
    console.error('Examples:');
    console.error('  node generateAssetManifest.js ./public/assets/terrain/forest');
    console.error('  node generateAssetManifest.js --batch ./public/assets/terrain');
    process.exit(1);
  }
  
  try {
    // Check for batch processing flag
    if (args[0] === '--batch') {
      if (args.length < 2) {
        console.error('Error: --batch flag requires a parent directory argument');
        process.exit(1);
      }
      
      const parentDirectory = args[1];
      processAllSubdirectories(parentDirectory);
      return;
    }
    
    // Single directory processing (original functionality)
    const assetDirectory = args[0];
    const outputFile = args[1];
    
    console.log(`Generating manifest for: ${assetDirectory}`);
    const manifest = generateManifest(assetDirectory);
    
    const jsonOutput = JSON.stringify(manifest, null, 2);
    
    if (outputFile) {
      fs.writeFileSync(outputFile, jsonOutput);
      console.log(`Manifest written to: ${outputFile}`);
    } else {
      console.log(jsonOutput);
    }
    
    console.log(`\nManifest Summary:`);
    console.log(`- Directory: ${manifest.name}`);
    console.log(`- Total assets: ${manifest.totalAssets}`);
    console.log(`- Asset groups: ${Object.keys(manifest.assets.all).length}`);
    console.log(`- Angles found: ${Object.keys(manifest.assets.byAngle).join(', ') || 'none'}`);
    console.log(`- Sides found: ${Object.keys(manifest.assets.bySide).join(', ') || 'none'}`);
    console.log(`- Special assets: ${Object.keys(manifest.assets.bySpecial).length}`);
    
  } catch (error) {
    console.error('Error generating manifest:', error.message);
    process.exit(1);
  }
}

// Export functions for use as a module
if (require.main === module) {
  main();
} else {
  module.exports = {
    generateManifest,
    parseFilename,
    groupAssets,
    createQueryStructure,
    processAllSubdirectories
  };
}