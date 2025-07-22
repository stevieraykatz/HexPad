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

// All available icon overlays
export const ICON_OPTIONS: readonly IconItem[] = [
  { name: 'castle', displayName: 'Castle', type: 'icon', path: '/assets/icons/castle.png' },
  { name: 'church', displayName: 'Church', type: 'icon', path: '/assets/icons/church.png' },
  { name: 'curse', displayName: 'Curse', type: 'icon', path: '/assets/icons/curse.png' },
  { name: 'huts', displayName: 'Huts', type: 'icon', path: '/assets/icons/huts.png' },
  { name: 'pavillion', displayName: 'Pavilion', type: 'icon', path: '/assets/icons/pavillion.png' },
  { name: 'ruins', displayName: 'Ruins', type: 'icon', path: '/assets/icons/ruins.png' },
  { name: 'sanctum', displayName: 'Sanctum', type: 'icon', path: '/assets/icons/sanctum.png' },
  { name: 'town', displayName: 'Town', type: 'icon', path: '/assets/icons/town.png' },
  { name: 'village', displayName: 'Village', type: 'icon', path: '/assets/icons/village.png' }
]; 