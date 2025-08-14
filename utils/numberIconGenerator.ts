/**
 * Number Icon Generator
 * 
 * Generates numbered icons (1-9) dynamically using canvas/SVG
 * These icons are created programmatically instead of using image files
 */

export interface NumberIconConfig {
  size: number;
  fontSize: number;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
}

const DEFAULT_CONFIG: NumberIconConfig = {
  size: 64,
  fontSize: 32, // Slightly smaller to fit within circle
  fontFamily: 'Canterbury, Arial, sans-serif', // Canterbury font with fallbacks
  backgroundColor: 'transparent', // Transparent background for CSS masking
  textColor: '#000000',
  borderRadius: 32, // Half of size for perfect circle
  borderWidth: 3, // Circle border width
  borderColor: '#000000' // Black circle border
};

/**
 * Generate a data URL for a numbered icon using canvas
 */
export function generateNumberIcon(number: number, config: Partial<NumberIconConfig> = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalConfig.size;
  canvas.height = finalConfig.size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Clear canvas (ensures transparency)
  ctx.clearRect(0, 0, finalConfig.size, finalConfig.size);
  
  const centerX = finalConfig.size / 2;
  const centerY = finalConfig.size / 2;
  const radius = (finalConfig.size - finalConfig.borderWidth) / 2;
  
  // Draw circle background if not transparent
  if (finalConfig.backgroundColor !== 'transparent') {
    ctx.fillStyle = finalConfig.backgroundColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // Draw circle border if specified
  if (finalConfig.borderWidth > 0) {
    ctx.strokeStyle = finalConfig.borderColor;
    ctx.lineWidth = finalConfig.borderWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Draw number text
  ctx.fillStyle = finalConfig.textColor;
  ctx.font = `bold ${finalConfig.fontSize}px ${finalConfig.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Adjust Y position slightly for better visual centering
  // Numbers often appear slightly high with 'middle' baseline
  const adjustedY = centerY + (finalConfig.fontSize * 0.05); // Small downward adjustment
  
  ctx.fillText(number.toString(), centerX, adjustedY);
  
  // Return data URL
  return canvas.toDataURL('image/png');
}

/**
 * Generate a data URL for a numbered icon using canvas with proper font loading
 */
export async function generateNumberIconAsync(number: number, config: Partial<NumberIconConfig> = {}): Promise<string> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Wait for Canterbury font to load
  if (document.fonts && document.fonts.load) {
    try {
      await document.fonts.load(`bold ${finalConfig.fontSize}px Canterbury`);
      // Wait a bit more to ensure font is ready
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('Could not load Canterbury font:', error);
    }
  }
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalConfig.size;
  canvas.height = finalConfig.size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Clear canvas (ensures transparency)
  ctx.clearRect(0, 0, finalConfig.size, finalConfig.size);
  
  const centerX = finalConfig.size / 2;
  const centerY = finalConfig.size / 2;
  const radius = (finalConfig.size - finalConfig.borderWidth) / 2;
  
  // Draw circle background if not transparent
  if (finalConfig.backgroundColor !== 'transparent') {
    ctx.fillStyle = finalConfig.backgroundColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // Draw circle border if specified
  if (finalConfig.borderWidth > 0) {
    ctx.strokeStyle = finalConfig.borderColor;
    ctx.lineWidth = finalConfig.borderWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Draw number text
  ctx.fillStyle = finalConfig.textColor;
  ctx.font = `bold ${finalConfig.fontSize}px ${finalConfig.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Adjust Y position slightly for better visual centering
  // Numbers often appear slightly high with 'middle' baseline
  const adjustedY = centerY + (finalConfig.fontSize * 0.05); // Small downward adjustment
  
  ctx.fillText(number.toString(), centerX, adjustedY);
  
  // Return data URL
  return canvas.toDataURL('image/png');
}

/**
 * Generate an SVG data URL for a numbered icon (alternative approach)
 */
export function generateNumberIconSVG(number: number, config: Partial<NumberIconConfig> = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const centerX = finalConfig.size / 2;
  const centerY = finalConfig.size / 2;
  const radius = (finalConfig.size - finalConfig.borderWidth) / 2;
  
  // Background circle if not transparent
  const backgroundCircle = finalConfig.backgroundColor !== 'transparent' ? `
      <circle 
        cx="${centerX}" 
        cy="${centerY}" 
        r="${radius}"
        fill="${finalConfig.backgroundColor}"
      />` : '';
  
  // Border circle if specified
  const borderCircle = finalConfig.borderWidth > 0 ? `
      <circle 
        cx="${centerX}" 
        cy="${centerY}" 
        r="${radius}"
        fill="none"
        stroke="${finalConfig.borderColor}" 
        stroke-width="${finalConfig.borderWidth}"
      />` : '';
  
  const svg = `
    <svg width="${finalConfig.size}" height="${finalConfig.size}" xmlns="http://www.w3.org/2000/svg">
      ${backgroundCircle}
      ${borderCircle}
      <text 
        x="${centerX}" 
        y="${centerY}" 
        font-family="${finalConfig.fontFamily}" 
        font-size="${finalConfig.fontSize}" 
        font-weight="bold"
        fill="${finalConfig.textColor}" 
        text-anchor="middle" 
        dominant-baseline="central"
      >${number}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Check if we're in a browser environment (has canvas support)
 */
export function canGenerateNumberIcons(): boolean {
  if (typeof document === 'undefined') return false;
  if (typeof HTMLCanvasElement === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  } catch {
    return false;
  }
}

/**
 * Generate all number icons (1-9) and return as a map
 */
export function generateAllNumberIcons(config: Partial<NumberIconConfig> = {}): Map<number, string> {
  const iconMap = new Map<number, string>();
  
  for (let i = 1; i <= 9; i++) {
    try {
      // Try canvas first, fallback to SVG
      const dataUrl = canGenerateNumberIcons() 
        ? generateNumberIcon(i, config)
        : generateNumberIconSVG(i, config);
      iconMap.set(i, dataUrl);
    } catch (error) {
      console.warn(`Failed to generate number icon for ${i}:`, error);
    }
  }
  
  return iconMap;
}

/**
 * Generate all number icons (1-9) asynchronously with proper font loading
 */
export async function generateAllNumberIconsAsync(config: Partial<NumberIconConfig> = {}): Promise<Map<number, string>> {
  const iconMap = new Map<number, string>();
  
  for (let i = 1; i <= 9; i++) {
    try {
      // Try async canvas first, fallback to SVG
      const dataUrl = canGenerateNumberIcons() 
        ? await generateNumberIconAsync(i, config)
        : generateNumberIconSVG(i, config);
      iconMap.set(i, dataUrl);
    } catch (error) {
      console.warn(`Failed to generate number icon for ${i}:`, error);
    }
  }
  
  return iconMap;
}

/**
 * Create a cache for generated number icons to avoid regenerating them
 */
class NumberIconCache {
  private cache = new Map<string, Map<number, string>>();
  private asyncCache = new Map<string, Promise<Map<number, string>>>();
  
  getIcons(config: Partial<NumberIconConfig> = {}): Map<number, string> {
    const configKey = JSON.stringify(config);
    
    if (!this.cache.has(configKey)) {
      this.cache.set(configKey, generateAllNumberIcons(config));
    }
    
    return this.cache.get(configKey)!;
  }
  
  async getIconsAsync(config: Partial<NumberIconConfig> = {}): Promise<Map<number, string>> {
    const configKey = JSON.stringify(config);
    
    if (!this.asyncCache.has(configKey)) {
      this.asyncCache.set(configKey, generateAllNumberIconsAsync(config));
    }
    
    const result = await this.asyncCache.get(configKey)!;
    // Also store in regular cache for future sync access
    this.cache.set(configKey, result);
    return result;
  }
  
  clearCache(): void {
    this.cache.clear();
    this.asyncCache.clear();
  }
}

export const numberIconCache = new NumberIconCache();
