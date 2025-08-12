/**
 * Generated Terrain Manifest: hills
 * 
 * This file is auto-generated from hills-manifest.json
 * Do not edit manually - regenerate using generateTerrainTypes.js
 */

export const hillsManifest = {
  "name": "hills",
  "generated": "2025-08-12T05:41:15.819Z",
  "totalAssets": 3,
  "assets": {
    "byAngle": {},
    "bySide": {},
    "bySpecial": {},
    "all": {
      "base": [
        {
          "filename": "hills_1.png",
          "name": "hills_1",
          "baseName": "hills",
          "variant": 1
        },
        {
          "filename": "hills_2.png",
          "name": "hills_2",
          "baseName": "hills",
          "variant": 2
        },
        {
          "filename": "hills_3.png",
          "name": "hills_3",
          "baseName": "hills",
          "variant": 3
        }
      ]
    }
  },
  "rawAssets": [
    {
      "filename": "hills_1.png",
      "name": "hills_1",
      "baseName": "hills",
      "variant": 1
    },
    {
      "filename": "hills_2.png",
      "name": "hills_2",
      "baseName": "hills",
      "variant": 2
    },
    {
      "filename": "hills_3.png",
      "name": "hills_3",
      "baseName": "hills",
      "variant": 3
    }
  ]
} as const;

export type HillsManifestType = typeof hillsManifest;
