/**
 * Vercel Serverless Function - Suggestions API
 * Returns cached dish suggestions from the cache file
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Use same cache location as dish.ts
const CACHE_DIR = process.env.VERCEL ? '/tmp' : join(process.cwd(), '.cache');
const CACHE_FILE = join(CACHE_DIR, 'dish-cache.json');
const SEED_CACHE_FILE = join(process.cwd(), 'api', 'seed-cache.json');

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface CacheData {
  [key: string]: CacheEntry;
}

// Load seed cache from api/seed-cache.json (fallback for empty cache)
function loadSeedCache(): CacheData {
  try {
    if (existsSync(SEED_CACHE_FILE)) {
      const fileContent = readFileSync(SEED_CACHE_FILE, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.warn('Failed to load seed cache file for suggestions:', error);
  }
  return {};
}

// Load cache from JSON file
// If main cache doesn't exist, use seed cache as fallback
function loadCache(): CacheData {
  try {
    // First, try to load main cache (local .cache or Vercel /tmp)
    if (existsSync(CACHE_FILE)) {
      const fileContent = readFileSync(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(fileContent);
      // If cache has entries, use it
      if (Object.keys(cache).length > 0) {
        return cache;
      }
    }
    
    // If main cache is empty or doesn't exist, use seed cache
    const seedCache = loadSeedCache();
    if (Object.keys(seedCache).length > 0) {
      return seedCache;
    }
  } catch (error) {
    console.warn('Failed to load cache file for suggestions:', error);
  }
  return {};
}

// Convert dish name to display format
function toDisplayName(dishName: string): string {
  // Convert to uppercase and replace spaces with underscores
  return dishName.toUpperCase().replace(/\s+/g, '_');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load cache and extract dish names
    const cache = loadCache();
    
    // Convert cache keys (dish names) to suggestions
    const suggestions = Object.keys(cache)
      .map((cacheKey) => {
        // Cache key is lowercase, but we have the actual dish name in cache data
        const entry = cache[cacheKey];
        const dishName = entry?.data?.dish || cacheKey;
        
        return {
          name: dishName,
          display: toDisplayName(dishName),
        };
      })
      .filter((s) => s.name) // Filter out any invalid entries
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    // If no cached dishes, return empty array
    return res.status(200).json({
      suggestions: suggestions,
    });
  } catch (error) {
    console.error('Error in suggestions API:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
