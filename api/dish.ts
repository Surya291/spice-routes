/**
 * Vercel Serverless Function - Dish Analysis API
 * Handles dish ingredient analysis with caching
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// JSON file-based cache
// Use /tmp for Vercel serverless (read-write), fallback to .cache for local dev
const CACHE_DIR = process.env.VERCEL ? '/tmp' : join(process.cwd(), '.cache');
const CACHE_FILE = join(CACHE_DIR, 'dish-cache.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface CacheData {
  [key: string]: CacheEntry;
}

// Load cache from JSON file
function loadCache(): CacheData {
  try {
    if (existsSync(CACHE_FILE)) {
      const fileContent = readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.warn('Failed to load cache file:', error);
  }
  return {};
}

// Save cache to JSON file
function saveCache(cache: CacheData): void {
  try {
    // Ensure cache directory exists
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`Cache saved to: ${CACHE_FILE}`);
  } catch (error) {
    console.warn('Failed to save cache file:', error);
  }
}

// Get from cache
function getFromCache(key: string): any | null {
  const cache = loadCache();
  const entry = cache[key];
  
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  
  return null;
}

// Set in cache
function setInCache(key: string, data: any): void {
  const cache = loadCache();
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
  
  // Clean old entries
  const now = Date.now();
  Object.keys(cache).forEach((k) => {
    if (now - cache[k].timestamp > CACHE_TTL) {
      delete cache[k];
    }
  });
  
  saveCache(cache);
}

// Gemini API configuration
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
  };
}

interface GeminiIngredientResponse {
  dish: string;
  origin_city: string;
  origin_state: string;
  ingredients: Array<{
    name: string;
    state: string;
    place_label: string;
    note?: string;
  }>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dishName } = req.body;

    if (!dishName || typeof dishName !== 'string') {
      return res.status(400).json({ error: 'dishName is required' });
    }

    // Check cache first
    const cacheKey = dishName.toLowerCase().trim();
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for: ${dishName}`);
      return res.status(200).json(cached);
    }

    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Call Gemini API
    const prompt = buildPrompt(dishName);
    
    const response = await fetch(
      `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `API request failed: ${response.statusText}`
      );
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      throw new Error('No response from Gemini API');
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed: GeminiIngredientResponse = JSON.parse(jsonMatch[0]);
    
    // Parse and resolve districts (second API call)
    const dishStory = await parseAndResolveDistricts(parsed, apiKey);

    // Cache the result in JSON file
    setInCache(cacheKey, dishStory);

    return res.status(200).json(dishStory);
  } catch (error) {
    console.error('Error in dish API:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

function buildPrompt(dishName: string): string {
  return `You are a food geography expert with a quirky, fast-paced sense of humor (think Bill Wurtz's 'history of the entire world, i guess'). Analyze the Indian dish "${dishName}".
  
  Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
  {
    "dish": "${dishName}",
    "origin_city": "<city/region where this dish originated>",
    "origin_state": "<Indian state name>",
    "ingredients": [
      {
        "name": "<ingredient name>",
        "state": "<Indian state where primarily sourced>",
        "place_label": "<specific city/region name for sourcing>",
        "note": "<5-7 word funny Bill Wurtz style narration>"
      }
    ]
  }
  
  Requirements:
  - Identify the dish's specific point of origin (city/region).
  - List 5-7 key ingredients.
  - For each ingredient, pinpoint the specific place and state in India known for sourcing it (e.g., 'Guntur' for chillies, 'Kashmir' for saffron).
  - The 'note' MUST be a very short (5-7 words), comical, light-hearted narration in the style of Bill Wurtz.
    - Style Guide: Fast-paced, surreal, jingle-like.
    - Examples: "the sun is a deadly laser", "we could make a religion out of this", "now with more coconut", "taste the rain".
    - Keep it playful and memorable.
  
  Be accurate but prioritize storytelling clarity.`;
}

async function parseAndResolveDistricts(
  parsed: GeminiIngredientResponse,
  apiKey: string
): Promise<any> {
  // Load state2district mapping from local public file
  let state2districtList: Record<string, string[]> = {};
  try {
    const state2districtPath = join(process.cwd(), 'public', 'state2district_list.json');
    if (existsSync(state2districtPath)) {
      const fileContent = readFileSync(state2districtPath, 'utf-8');
      state2districtList = JSON.parse(fileContent);
    } else {
      // Fallback to GitHub if local file not found
      const response = await fetch(
        'https://raw.githubusercontent.com/udit-001/india-maps-data/main/topojson/state2district_list.json'
      );
      if (response.ok) {
        state2districtList = await response.json();
      }
    }
  } catch (error) {
    console.warn('Could not load state2district mapping:', error);
    // Continue without district resolution - frontend will handle it
  }

  // Find origin state ID (we'll need to map state names to IDs)
  // For now, we'll return the state name and let frontend resolve the ID
  const originStateId = parsed.origin_state; // Frontend will resolve this

  // Resolve districts for each ingredient
  const ingredientsWithDistricts = await Promise.all(
    parsed.ingredients.map(async (ingredient) => {
      const districts = state2districtList[ingredient.state] || [];
      
      if (districts.length === 0) {
        return {
          ...ingredient,
          districtName: undefined,
          districtId: undefined,
        };
      }

      const districtPrompt = buildDistrictPrompt(
        ingredient.name,
        ingredient.state,
        ingredient.place_label,
        districts
      );

      try {
        const response = await fetch(
          `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: districtPrompt,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          return {
            ...ingredient,
            districtName: undefined,
            districtId: undefined,
          };
        }

        const data: GeminiResponse = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const districtData = JSON.parse(jsonMatch[0]);
          return {
            ...ingredient,
            districtName: districtData.district_name,
            districtId: undefined, // Will be resolved on frontend
          };
        }
      } catch (error) {
        console.warn(`Failed to resolve district for ${ingredient.name}:`, error);
      }

      return {
        ...ingredient,
        districtName: undefined,
        districtId: undefined,
      };
    })
  );

  return {
    dish: parsed.dish,
    originCity: parsed.origin_city,
    originState: parsed.origin_state,
    originStateId: originStateId, // Frontend will resolve actual ID
    ingredients: ingredientsWithDistricts.map((ing) => ({
      ingredientName: ing.name,
      stateName: ing.state,
      stateId: ing.state, // Frontend will resolve actual ID
      placeLabel: ing.place_label,
      districtName: ing.districtName,
      districtId: ing.districtId,
      note: ing.note,
      confidence: 0.8,
    })),
  };
}

function buildDistrictPrompt(
  ingredientName: string,
  stateName: string,
  placeLabel: string,
  districts: string[]
): string {
  return `Given the ingredient "${ingredientName}" from "${placeLabel}" in "${stateName}", identify the exact district from this list:

${districts.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Return ONLY valid JSON:
{
  "district_name": "<exact district name from the list above>"
}

If you cannot determine the exact district, return the district that seems most likely based on the place label "${placeLabel}".`;
}
