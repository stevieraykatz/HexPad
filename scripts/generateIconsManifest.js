#!/usr/bin/env node

/**
 * Icons Manifest Generator
 * 
 * Generates a TypeScript manifest file from the icons-manifest.json
 * This ensures type safety and build-time optimization for icon loading
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate TypeScript manifest file from JSON manifest
 */
function generateIconsManifestTS(jsonManifestPath, outputPath) {
  if (!fs.existsSync(jsonManifestPath)) {
    throw new Error(`JSON manifest not found: ${jsonManifestPath}`);
  }
  
  console.log(`📖 Reading JSON manifest: ${jsonManifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(jsonManifestPath, 'utf8'));
  
  const content = `/**
 * Generated Icons Manifest
 * 
 * This file is auto-generated from the icons manifest JSON
 * Do not edit manually - regenerate using generateIconsManifest.js
 */

export const iconsManifest = ${JSON.stringify(manifest, null, 2)} as const;

export type IconsManifestType = typeof iconsManifest;`;

  fs.writeFileSync(outputPath, content);
  console.log(`✅ Generated TypeScript manifest: ${outputPath}`);
  console.log(`📊 Total icons: ${manifest.totalAssets}`);
  console.log(`🏷️  Available icons: ${manifest.rawAssets.map(asset => asset.name).join(', ')}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generateIconsManifest.js <json-manifest-path> <output-ts-path>');
    console.error('Example: node generateIconsManifest.js ./public/assets/icons/icons-manifest.json ./components/config/generated/iconsManifest.ts');
    process.exit(1);
  }
  
  const jsonManifestPath = args[0];
  const outputPath = args[1];
  
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }
    
    generateIconsManifestTS(jsonManifestPath, outputPath);
    console.log('🎉 Icons manifest generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating icons manifest:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateIconsManifestTS
};
