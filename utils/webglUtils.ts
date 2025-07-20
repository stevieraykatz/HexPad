/**
 * WebGL Utilities
 * 
 * Helper functions for WebGL shader creation, program linking, and texture management.
 */

import { GRID_CONFIG } from '../components/config';

/**
 * Shader sources for WebGL programs
 */
export const SHADER_SOURCES = {
  // Vertex shader source for colors
  colorVertex: `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    
    void main() {
      vec2 position = a_position + u_translation;
      vec2 zeroToOne = position / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
  `,

  // Fragment shader source for colors
  colorFragment: `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
      gl_FragColor = u_color;
    }
  `,

  // Vertex shader source for textures
  textureVertex: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    varying vec2 v_texCoord;
    
    void main() {
      vec2 position = a_position + u_translation;
      vec2 zeroToOne = position / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_texCoord = a_texCoord;
    }
  `,

  // Fragment shader source for textures
  textureFragment: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `
};

/**
 * Create a WebGL shader from source code
 */
export const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

/**
 * Create a WebGL program from vertex and fragment shaders
 */
export const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Error linking program:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

/**
 * Check if a number is a power of 2 (needed for WebGL texture parameters)
 */
export const isPowerOf2 = (value: number): boolean => {
  return (value & (value - 1)) === 0;
};

/**
 * Load a texture from an image URL with proper WebGL configuration
 */
export const loadTexture = (
  gl: WebGLRenderingContext, 
  url: string, 
  onLoad?: () => void
): WebGLTexture | null => {
  const texture = gl.createTexture();
  if (!texture) return null;
  
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Create a 1x1 pixel placeholder until image loads
  const pixel = new Uint8Array([
    GRID_CONFIG.PLACEHOLDER_PIXEL_GREY, 
    GRID_CONFIG.PLACEHOLDER_PIXEL_GREY, 
    GRID_CONFIG.PLACEHOLDER_PIXEL_GREY, 
    GRID_CONFIG.PLACEHOLDER_PIXEL_ALPHA
  ]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    
    // Trigger callback if provided
    if (onLoad) {
      onLoad();
    }
  };
  image.src = url;
  
  return texture;
};

/**
 * Initialize WebGL context with proper settings for hex grid rendering
 */
export const initializeWebGLContext = (canvas: HTMLCanvasElement): WebGLRenderingContext | null => {
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || 
             canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
  
  if (!gl) {
    console.error('WebGL not supported');
    return null;
  }

  // Set canvas size
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return gl;
};

/**
 * Create shader programs for color and texture rendering
 */
export const createShaderPrograms = (gl: WebGLRenderingContext): {
  colorProgram: WebGLProgram | null;
  textureProgram: WebGLProgram | null;
} => {
  // Create color shaders and program
  const colorVertexShader = createShader(gl, gl.VERTEX_SHADER, SHADER_SOURCES.colorVertex);
  const colorFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, SHADER_SOURCES.colorFragment);
  
  let colorProgram: WebGLProgram | null = null;
  if (colorVertexShader && colorFragmentShader) {
    colorProgram = createProgram(gl, colorVertexShader, colorFragmentShader);
  }
  
  // Create texture shaders and program
  const textureVertexShader = createShader(gl, gl.VERTEX_SHADER, SHADER_SOURCES.textureVertex);
  const textureFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, SHADER_SOURCES.textureFragment);
  
  let textureProgram: WebGLProgram | null = null;
  if (textureVertexShader && textureFragmentShader) {
    textureProgram = createProgram(gl, textureVertexShader, textureFragmentShader);
  }

  return { colorProgram, textureProgram };
}; 