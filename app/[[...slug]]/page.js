'use client';

import HexGridApp from '../../components/HexGridApp';

/**
 * Catch-all route for the hex grid application
 * Handles both root URL (/) and hex string URLs (/a15b, /0888, etc.)
 * The HexGridApp component will parse the URL and load grid data accordingly
 */
export default function GridPage() {
  // Render the main HexGridApp component for all routes
  // The component will handle URL parsing and grid loading internally
  return <HexGridApp />;
} 