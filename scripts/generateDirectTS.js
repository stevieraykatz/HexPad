#!/usr/bin/env node

/**
 * Direct TypeScript Generator
 * 
 * Generates TypeScript configuration files directly from asset directories,
 * bypassing the JSON intermediate step for better performance and simplicity.
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate default terrain configuration template
 */
function generateDefaultTerrainConfig(terrainNames) {
  return {
    "$schema": "terrain-config-schema",
    "version": "1.0.0",
    "description": "Configuration for terrain asset properties and behaviors",
    "generated": new Date().toISOString(),
    "terrains": terrainNames.reduce((config, terrainName) => {
      config[terrainName] = {
        "rotatable": true,
        "randomize": true
      };
      return config;
    }, {})
  };
}

/**
 * Load or create terrain configuration
 */
function loadTerrainConfig(terrainDirectory, terrainNames) {
  const configPath = path.join(terrainDirectory, 'terrain-config.json');
  
  let config;
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`📋 Loaded existing terrain configuration: ${path.basename(configPath)}`);
    } catch (error) {
      console.warn(`⚠️  Error reading terrain config, generating new one: ${error.message}`);
      config = generateDefaultTerrainConfig(terrainNames);
    }
  } else {
    console.log(`📝 Creating terrain configuration template: ${path.basename(configPath)}`);
    config = generateDefaultTerrainConfig(terrainNames);
  }
  
  // Ensure all current terrains are in the config
  let configUpdated = false;
  terrainNames.forEach(terrainName => {
    if (!config.terrains[terrainName]) {
      config.terrains[terrainName] = {
        "rotatable": true,
        "randomize": true
      };
      configUpdated = true;
      console.log(`  ➕ Added new terrain to config: ${terrainName}`);
    }
  });
  
  // Update the generated timestamp if config was modified
  if (configUpdated || !fs.existsSync(configPath)) {
    config.generated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`  ✅ ${fs.existsSync(configPath) ? 'Updated' : 'Created'} terrain configuration`);
  }
  
  return config;
}

/**
 * Parse filename to extract metadata
 */
function parseFilename(filename) {
  const nameWithoutExt = path.parse(filename).name;
  const parts = nameWithoutExt.split('_');
  
  const result = {
    filename,
    name: nameWithoutExt,
    baseName: parts[0]
  };

  // Extract angle (60, 120, 180, 240, 300, 360)
  const anglePart = parts.find(part => /^(60|120|180|240|300|360)$/.test(part));
  if (anglePart) {
    result.angle = parseInt(anglePart);
  }

  // Extract side information
  const sidePart = parts.find(part => 
    /^(top|bottom|side|top-side|bottom-side)$/.test(part) ||
    /^(top-side-top|bottom-side-top)$/.test(part)
  );
  if (sidePart) {
    result.side = sidePart;
  }

  // Check for special designation
  if (parts.includes('special')) {
    result.special = true;
  }

  // Extract variant number (usually the last numeric part)
  const variantPart = parts[parts.length - 1];
  if (/^\d+$/.test(variantPart)) {
    result.variant = parseInt(variantPart);
  } else {
    // Handle cases like "B1", "B2", "A1", etc.
    const alphaNumMatch = variantPart.match(/([A-Z])(\d+)([LR]?)$/);
    if (alphaNumMatch) {
      result.variant = parseInt(alphaNumMatch[2]);
      result.variantType = alphaNumMatch[1];
      if (alphaNumMatch[3]) {
        result.variantSide = alphaNumMatch[3];
      }
    }
  }

  return result;
}

/**
 * Process a single terrain directory
 */
function processTerrainDirectory(terrainPath) {
  const terrainName = path.basename(terrainPath);
  const files = fs.readdirSync(terrainPath)
    .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
    .sort();

  if (files.length === 0) {
    return null;
  }

  const assets = files.map(parseFilename);
  const manifest = {
    name: terrainName,
    generated: new Date().toISOString(),
    totalAssets: assets.length,
    assets: {
      byAngle: {},
      bySide: {},
      bySpecial: {},
      all: {}
    },
    rawAssets: assets
  };

  // Group assets by angle
  assets.forEach(asset => {
    if (asset.angle) {
      if (!manifest.assets.byAngle[asset.angle]) {
        manifest.assets.byAngle[asset.angle] = {};
      }
      
      const key = `angle_${asset.angle}${asset.side ? `_side_${asset.side}` : ''}`;
      if (!manifest.assets.byAngle[asset.angle][key]) {
        manifest.assets.byAngle[asset.angle][key] = [];
      }
      manifest.assets.byAngle[asset.angle][key].push(asset);
    }
  });

  // Group assets by side
  assets.forEach(asset => {
    if (asset.side) {
      if (!manifest.assets.bySide[asset.side]) {
        manifest.assets.bySide[asset.side] = {};
      }
      
      const key = `angle_${asset.angle || 'none'}_side_${asset.side}`;
      if (!manifest.assets.bySide[asset.side][key]) {
        manifest.assets.bySide[asset.side][key] = [];
      }
      manifest.assets.bySide[asset.side][key].push(asset);
    }
  });

  // Group special assets
  assets.forEach(asset => {
    if (asset.special) {
      const key = `angle_${asset.angle}_special`;
      if (!manifest.assets.bySpecial[key]) {
        manifest.assets.bySpecial[key] = [];
      }
      manifest.assets.bySpecial[key].push(asset);
    }
  });

  // Group all assets
  assets.forEach(asset => {
    const key = asset.angle || asset.side || asset.special ? 
      `${asset.angle ? `angle_${asset.angle}` : ''}${asset.side ? `_side_${asset.side}` : ''}${asset.special ? '_special' : ''}`.replace(/^_/, '') :
      'base';
    
    if (!manifest.assets.all[key]) {
      manifest.assets.all[key] = [];
    }
    manifest.assets.all[key].push(asset);
  });

  return manifest;
}

/**
 * Generate terrain info from manifest
 */
function generateTerrainInfo(manifest, terrainPath, terrainConfig = null) {
  const hasAngles = Object.keys(manifest.assets.byAngle).length > 0;
  const hasSides = Object.keys(manifest.assets.bySide).length > 0;
  const hasSpecial = Object.keys(manifest.assets.bySpecial).length > 0;
  
  // Determine if it's simple or complex
  const isComplex = hasAngles || hasSides || hasSpecial || manifest.totalAssets > 1;
  
  // Get rotatable setting from config, default to true
  const rotatable = terrainConfig?.terrains?.[manifest.name]?.rotatable ?? true;
  // Get randomize setting from config, default to true
  const randomize = terrainConfig?.terrains?.[manifest.name]?.randomize ?? true;
  
  return {
    name: manifest.name,
    displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1),
    type: isComplex ? 'complex' : 'simple',
    basePath: isComplex ? null : `/assets/terrain/${manifest.name}/${manifest.rawAssets[0].filename}`,
    manifestPath: isComplex ? `/assets/terrain/${manifest.name}/${manifest.name}-manifest.json` : null,
    hasVariants: manifest.totalAssets > 1,
    assetCount: manifest.totalAssets,
    rotatable: rotatable,
    randomize: randomize,
    features: {
      hasAngles,
      hasSides,
      hasSpecial
    }
  };
}

/**
 * Generate TypeScript manifest file
 */
function generateManifestTS(manifest, outputPath) {
  const manifestName = manifest.name.replace(/-/g, ''); // Remove hyphens for valid JS identifiers
  const capitalizedName = manifestName.charAt(0).toUpperCase() + manifestName.slice(1);
  
  const content = `/**
 * Generated Terrain Manifest: ${manifest.name}
 * 
 * This file is auto-generated from asset directory parsing
 * Do not edit manually - regenerate using generateDirectTS.js
 */

export const ${manifestName}Manifest = ${JSON.stringify(manifest, null, 2)} as const;

export type ${capitalizedName}ManifestType = typeof ${manifestName}Manifest;
`;

  fs.writeFileSync(outputPath, content);
}

/**
 * Generate TypeScript terrain index file
 */
function generateTerrainIndexTS(terrainIndex, outputPath) {
  const content = `/**
 * Generated Terrain Index
 * 
 * This file is auto-generated from terrain asset directories
 * Do not edit manually - regenerate using generateDirectTS.js
 */

export const terrainIndex = ${JSON.stringify(terrainIndex, null, 2)} as const;

export type TerrainIndexType = typeof terrainIndex;
`;

  fs.writeFileSync(outputPath, content);
}

/**
 * Generate index file that exports everything
 */
function generateIndexTS(terrainNames, outputPath) {
  const exports = terrainNames.map(name => {
    const cleanName = name.replace(/-/g, '');
    const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    return `export { ${cleanName}Manifest } from './${cleanName}Manifest';
export type { ${capitalizedName}ManifestType } from './${cleanName}Manifest';`;
  }).join('\n');

  const content = `/**
 * Generated Asset Configuration Index
 * 
 * This file exports all generated terrain and manifest types
 * Auto-generated - do not edit manually
 */

export { terrainIndex } from './terrainIndex';
export type { TerrainIndexType } from './terrainIndex';

// Export all manifests
${exports}
`;

  fs.writeFileSync(outputPath, content);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generateDirectTS.js <terrain-directory> <output-directory>');
    console.error('Example: node generateDirectTS.js ./public/assets/terrain ./components/config/generated/');
    process.exit(1);
  }
  
  const terrainDirectory = args[0];
  const outputDir = args[1];
  
  if (!fs.existsSync(terrainDirectory)) {
    console.error(`Error: Terrain directory not found: ${terrainDirectory}`);
    process.exit(1);
  }
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`🚀 Generating TypeScript files directly from: ${terrainDirectory}`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('');
  
  // Find all terrain subdirectories
  const terrainDirs = fs.readdirSync(terrainDirectory)
    .filter(item => {
      const itemPath = path.join(terrainDirectory, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort();
  
  // Load or create terrain configuration
  const terrainConfig = loadTerrainConfig(terrainDirectory, terrainDirs);
  console.log('');
  
  const terrainIndex = {
    name: 'terrain',
    generated: new Date().toISOString(),
    totalTerrainTypes: 0,
    totalAssets: 0,
    baseTerrains: 0,
    complexTerrains: 0,
    terrains: {},
    byType: {
      simple: [],
      complex: []
    }
  };
  
  const processedTerrains = [];
  
  // Process each terrain directory
  terrainDirs.forEach(terrainDir => {
    const terrainPath = path.join(terrainDirectory, terrainDir);
    console.log(`Processing: ${terrainDir}/`);
    
    const manifest = processTerrainDirectory(terrainPath);
    if (!manifest) {
      console.log(`  ⚠️  No assets found, skipping`);
      return;
    }
    
    const terrainInfo = generateTerrainInfo(manifest, terrainPath, terrainConfig);
    
    // Add to terrain index
    terrainIndex.terrains[terrainInfo.name] = terrainInfo;
    terrainIndex.byType[terrainInfo.type].push(terrainInfo);
    terrainIndex.totalAssets += terrainInfo.assetCount;
    
    if (terrainInfo.type === 'simple') {
      terrainIndex.baseTerrains++;
    } else {
      terrainIndex.complexTerrains++;
    }
    
    // Generate TypeScript manifest file for complex terrains
    if (terrainInfo.type === 'complex') {
      const manifestTSPath = path.join(outputDir, `${terrainInfo.name.replace(/-/g, '')}Manifest.ts`);
      generateManifestTS(manifest, manifestTSPath);
      console.log(`  ✅ Generated: ${path.basename(manifestTSPath)}`);
    } else {
      console.log(`  ✅ Simple terrain (no manifest needed)`);
    }
    
    processedTerrains.push(terrainInfo.name);
  });
  
  terrainIndex.totalTerrainTypes = processedTerrains.length;
  
  // Generate terrain index TypeScript file
  const terrainIndexTSPath = path.join(outputDir, 'terrainIndex.ts');
  generateTerrainIndexTS(terrainIndex, terrainIndexTSPath);
  console.log(`✅ Generated: ${path.basename(terrainIndexTSPath)}`);
  
  // Generate index file
  const indexTSPath = path.join(outputDir, 'index.ts');
  generateIndexTS(processedTerrains, indexTSPath);
  console.log(`✅ Generated: ${path.basename(indexTSPath)}`);
  
  console.log('');
  console.log('🎉 Direct TypeScript generation complete!');
  console.log(`📊 Summary:`);
  console.log(`   • Total terrain types: ${terrainIndex.totalTerrainTypes}`);
  console.log(`   • Total assets: ${terrainIndex.totalAssets}`);
  console.log(`   • Simple terrains: ${terrainIndex.baseTerrains}`);
  console.log(`   • Complex terrains: ${terrainIndex.complexTerrains}`);
  console.log(`   • Available types: ${processedTerrains.join(', ')}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFilename,
  processTerrainDirectory,
  generateTerrainInfo,
  generateManifestTS,
  generateTerrainIndexTS,
  generateIndexTS
};
