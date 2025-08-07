#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generates TypeScript files from terrain index and manifests for static imports
 */

/**
 * Converts a terrain index JSON to a TypeScript file
 */
function generateTerrainIndexTS(terrainIndexPath, outputPath) {
  if (!fs.existsSync(terrainIndexPath)) {
    throw new Error(`Terrain index not found: ${terrainIndexPath}`);
  }
  
  const terrainIndexData = JSON.parse(fs.readFileSync(terrainIndexPath, 'utf8'));
  
  const tsContent = `/**
 * Generated Terrain Index
 * 
 * This file is auto-generated from terrain-index.json
 * Do not edit manually - regenerate using generateTerrainTypes.js
 */

export const terrainIndex = ${JSON.stringify(terrainIndexData, null, 2)} as const;

export type TerrainIndexType = typeof terrainIndex;
`;

  fs.writeFileSync(outputPath, tsContent);
  console.log(`Generated TypeScript terrain index: ${outputPath}`);
}

/**
 * Generates TypeScript manifest files for each terrain type
 */
function generateManifestTS(manifestPath, outputPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestName = path.parse(manifestPath).name;
  
  const tsContent = `/**
 * Generated Terrain Manifest: ${manifestData.name}
 * 
 * This file is auto-generated from ${manifestName}.json
 * Do not edit manually - regenerate using generateTerrainTypes.js
 */

export const ${manifestData.name}Manifest = ${JSON.stringify(manifestData, null, 2)} as const;

export type ${manifestData.name.charAt(0).toUpperCase() + manifestData.name.slice(1)}ManifestType = typeof ${manifestData.name}Manifest;
`;

  fs.writeFileSync(outputPath, tsContent);
  console.log(`Generated TypeScript manifest: ${outputPath}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generateTerrainTypes.js <terrain-index-json> <output-directory>');
    console.error('Example: node generateTerrainTypes.js ./public/assets/terrain-index.json ./components/config/generated/');
    process.exit(1);
  }
  
  const terrainIndexPath = args[0];
  const outputDir = args[1];
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Generate terrain index TypeScript file
    const terrainIndexTSPath = path.join(outputDir, 'terrainIndex.ts');
    generateTerrainIndexTS(terrainIndexPath, terrainIndexTSPath);
    
    // Read terrain index to find manifest files
    const terrainIndexData = JSON.parse(fs.readFileSync(terrainIndexPath, 'utf8'));
    
    // Generate TypeScript files for each manifest
    Object.values(terrainIndexData.terrains).forEach((terrain) => {
      if (terrain.type === 'complex' && terrain.manifestPath) {
        const manifestPath = path.join('public', terrain.manifestPath);
        const manifestName = terrain.name;
        const manifestTSPath = path.join(outputDir, `${manifestName}Manifest.ts`);
        
        if (fs.existsSync(manifestPath)) {
          generateManifestTS(manifestPath, manifestTSPath);
        } else {
          console.warn(`Warning: Manifest file not found: ${manifestPath}`);
        }
      }
    });
    
    // Generate index file that exports everything
    const indexContent = `/**
 * Generated Asset Configuration Index
 * 
 * This file exports all generated terrain and manifest types
 * Auto-generated - do not edit manually
 */

export { terrainIndex } from './terrainIndex';
export type { TerrainIndexType } from './terrainIndex';

// Export all manifests
${Object.values(terrainIndexData.terrains)
  .filter(terrain => terrain.type === 'complex')
  .map(terrain => {
    const capitalizedName = terrain.name.charAt(0).toUpperCase() + terrain.name.slice(1);
    return `export { ${terrain.name}Manifest } from './${terrain.name}Manifest';
export type { ${capitalizedName}ManifestType } from './${terrain.name}Manifest';`;
  })
  .join('\n')}
`;
    
    const indexPath = path.join(outputDir, 'index.ts');
    fs.writeFileSync(indexPath, indexContent);
    console.log(`Generated index file: ${indexPath}`);
    
    console.log('\n✅ Successfully generated all TypeScript files!');
    
  } catch (error) {
    console.error('Error generating TypeScript files:', error.message);
    process.exit(1);
  }
}

// Export for module usage
if (require.main === module) {
  main();
} else {
  module.exports = {
    generateTerrainIndexTS,
    generateManifestTS
  };
}