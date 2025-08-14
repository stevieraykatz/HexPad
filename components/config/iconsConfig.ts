/**
 * Icons Configuration
 * 
 * This file contains all constants related to icon overlays that can be placed on hex tiles.
 * 
 * MODIFICATION GUIDELINES:
 * 
 * ADDING NEW ICONS:
 * - Add new icon item to ICON_OPTIONS array with name, displayName, and path
 * - Place icon files in public/assets/icons/ folder
 * - Icons should be PNG files with transparent backgrounds
 * 
 * ICON OVERLAY SYSTEM:
 * - Icons are overlaid on top of painted hex tiles
 * - Each hex can have both a terrain/color and an optional icon overlay
 * - Icons are rendered at a smaller size than the hex to maintain visibility
 */

export interface IconItem {
  readonly name: string;
  readonly displayName: string;
  readonly type: 'icon';
  readonly path: string;
}

export interface ColoredIcon {
  readonly icon: IconItem;
  readonly color: string;
}

/**
 * Load icon manifest and generate icon options dynamically
 */
function loadIconManifest(): any {
  try {
    // Import the manifest directly (this will be bundled at build time)
    return require('../../public/assets/icons/icons-manifest.json');
  } catch (error) {
    console.warn('Could not load icon manifest:', error);
    return null;
  }
}

/**
 * Generate number icons (1-9) dynamically
 */
function generateNumberIconOptions(): IconItem[] {
  const numberIcons: IconItem[] = [];
  
  // Import the number icon generator
  try {
    const { numberIconCache } = require('../../utils/numberIconGenerator');
    
    // Try to use async version for better font loading, but fallback to sync
    const config = {
      size: 64,
      fontSize: 30, // Slightly smaller to ensure good fit in circle
      backgroundColor: 'transparent', // Transparent for CSS masking
      textColor: '#000000', // Black text (will be colored by CSS mask)
      borderColor: '#000000', // Black circle border (will be colored by CSS mask)
      borderRadius: 32, // Half of size for perfect circle
      borderWidth: 3 // Circle border width
    };
    
    // Use async version if available, otherwise fallback to sync
    if (numberIconCache.getIconsAsync) {
      // Schedule async generation for better font loading
      numberIconCache.getIconsAsync(config).catch((error: any) => {
        console.warn('Async number icon generation failed:', error);
      });
    }
    
    // Use sync version for immediate availability
    const iconMap = numberIconCache.getIcons(config);
    
    for (let i = 1; i <= 9; i++) {
      const dataUrl = iconMap.get(i);
      if (dataUrl) {
        numberIcons.push({
          name: `number-${i}`,
          displayName: `Number ${i}`,
          type: 'icon',
          path: dataUrl
        });
      }
    }
  } catch (error) {
    console.warn('Could not generate number icons:', error);
  }
  
  return numberIcons;
}

/**
 * Generate icon options from the manifest and dynamic sources
 */
function generateIconOptions(): readonly IconItem[] {
  const imageIcons: IconItem[] = [];
  
  // 1. Load image icons from manifest
  const manifest = loadIconManifest();
  if (manifest && manifest.rawAssets) {
    manifest.rawAssets.forEach((asset: any) => {
      // Convert name to display name (capitalize and handle special cases)
      let displayName = asset.name
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      imageIcons.push({
        name: asset.name,
        displayName: displayName,
        type: 'icon',
        path: `/assets/icons/${asset.filename}`
      });
    });
  } else {
    // Fallback to static list if manifest loading fails
    imageIcons.push(
      { name: 'castle', displayName: 'Castle', type: 'icon', path: '/assets/icons/castle.png' },
      { name: 'church', displayName: 'Church', type: 'icon', path: '/assets/icons/church.png' },
      { name: 'curse', displayName: 'Curse', type: 'icon', path: '/assets/icons/curse.png' },
      { name: 'huts', displayName: 'Huts', type: 'icon', path: '/assets/icons/huts.png' },
      { name: 'pavillion', displayName: 'Pavilion', type: 'icon', path: '/assets/icons/pavillion.png' },
      { name: 'ruins', displayName: 'Ruins', type: 'icon', path: '/assets/icons/ruins.png' },
      { name: 'sanctum', displayName: 'Sanctum', type: 'icon', path: '/assets/icons/sanctum.png' },
      { name: 'town', displayName: 'Town', type: 'icon', path: '/assets/icons/town.png' },
      { name: 'village', displayName: 'Village', type: 'icon', path: '/assets/icons/village.png' }
    );
  }
  
  // 2. Get dynamically generated number icons
  const numberIcons = generateNumberIconOptions();
  
  // 3. Sort image icons alphabetically, keep number icons in numerical order
  const sortedImageIcons = imageIcons.sort((a, b) => a.displayName.localeCompare(b.displayName));
  
  // 4. Combine: image icons first, then number icons
  return [...sortedImageIcons, ...numberIcons];
}

// All available icon overlays (dynamically generated)
export const ICON_OPTIONS: readonly IconItem[] = generateIconOptions(); 