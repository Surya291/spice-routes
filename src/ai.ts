/**
 * Gemini API integration for ingredient inference
 */

import type { DishQuery, DishStory, IngredientOrigin } from './domain';
import { findStateByName, getDistrictsForState } from './map';

// Gemini 2.5 Flash endpoint (compatible with Google AI Studio API keys)
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

/**
 * Call Gemini API to get dish ingredients and origins
 */
export async function fetchDishIngredients(
  query: DishQuery,
  apiKey: string
): Promise<DishStory> {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  const prompt = buildPrompt(query);

  // Print len of prompt being sent
  // Note: JavaScript strings' .length counts UTF-16 code units, not tokens, but for debugging we use .length
  console.log(`buildprompt: token len (${prompt.length})`);
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
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      '';

    if (!text) {
      throw new Error('No response from Gemini API');
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed: GeminiIngredientResponse = JSON.parse(jsonMatch[0]);
    const dishStory = parseGeminiResponse(parsed);
    
    // Second stage: Resolve districts for each ingredient
    await resolveDistricts(dishStory, apiKey);
    
    return dishStory;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ingredients from Gemini API');
  }
}

/**
 * Build the prompt for Gemini
 */
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
  
  CRITICAL REQUIREMENTS:
  
  1. INGREDIENT COUNT & QUALITY:
     - MUST return 5-10 ingredients (aim for 7-8, minimum 5)
     - ONLY include MEANINGFUL ingredients that contribute distinct flavor, texture, or cultural significance
     - EXCLUDE trivial ingredients like: water, generic salt (unless specialty like black salt), generic "spices" (be specific), air, etc.
     - Focus on ingredients that tell a geographic story: spices, grains, vegetables, dairy, oils, specialty items
  
  2. SOURCING LOGIC (VERY IMPORTANT):
     - THINK LOCAL FIRST: If an ingredient is commonly grown/available in the dish's origin region, use that origin state/city
     - Only go to distant states when the ingredient is SPECIFICALLY known to come from there (e.g., Guntur chillies, Malabar pepper, Kashmiri saffron)
     - For locally sourced items (vegetables, dairy, basic spices in the region), use the origin city/state
     - For specialty items (famous regional products), use the famous production region
     - Example: If making biryani in Hyderabad, local vegetables/spices come from Telangana/Andhra, but specialty basmati rice comes from Punjab
     - Avoid generic sourcing - be specific about WHY that location matters
  
  3. PLACE LABELS:
     - Use SPECIFIC city/region names, not just state names
     - Examples: "Guntur" not "Andhra Pradesh", "Chikmagalur" not "Karnataka", "Malabar Coast" not "Kerala"
     - For local ingredients, use origin city or nearby region
     - For specialty items, use the famous production region name
  
  4. NARRATIVE STYLE (note field):
     - 5-7 words, comical, light-hearted, Bill Wurtz style
     - Fast-paced, surreal, jingle-like
     - Make it fun AND insightful - reveal something interesting about the ingredient or its journey
     - Connect to geography, history, or culture when possible
     - Examples: "the sun is a deadly laser", "we could make a religion out of this", "now with more coconut", "taste the rain", "spicy but make it fashion", "the grain that travels"
  
  5. ACCURACY:
     - Use proper full Indian state names (e.g., "Tamil Nadu" not "TN", "West Bengal" not "WB")
     - Verify that the place_label actually exists in the state you specify
     - If unsure about a location, prefer the origin region over a random distant state
  
  THINK LIKE THIS:
  - A cook in [origin_city] is making [dish]
  - What are the KEY ingredients that make this dish special? (5-10 of them)
  - Where would they realistically source each ingredient? (local markets first, then regional specialties)
  - What's the geographic story here? (local vs. imported specialties)
  - Make it fun, accurate, and insightful!
  
  Now analyze "${dishName}":`;
}

/**
 * Parse Gemini response into our domain model
 */
function parseGeminiResponse(
  response: GeminiIngredientResponse
): DishStory {
  const ingredients: IngredientOrigin[] = [];

  // Limit to 7 ingredients
  const limitedIngredients = response.ingredients.slice(0, 7);

  for (const ing of limitedIngredients) {
    const stateMetadata = findStateByName(ing.state);
    
    if (!stateMetadata) {
      console.warn(`Could not find state: ${ing.state} for ingredient ${ing.name}`);
      continue;
    }

    ingredients.push({
      ingredientName: ing.name,
      stateName: ing.state,
      stateId: stateMetadata.id,
      placeLabel: ing.place_label || ing.state,
      note: ing.note,
      confidence: 0.8, // Default confidence
    });
  }

  // Find origin state
  const originStateMetadata = findStateByName(response.origin_state);
  if (!originStateMetadata) {
    throw new Error(`Could not find origin state: ${response.origin_state}`);
  }

  return {
    dish: response.dish,
    originCity: response.origin_city,
    originState: response.origin_state,
    originStateId: originStateMetadata.id,
    ingredients,
  };
}

/**
 * Second stage: Resolve districts for each ingredient
 */
async function resolveDistricts(
  dishStory: DishStory,
  apiKey: string
): Promise<void> {
  // Load state2district mapping
  const state2DistrictResponse = await fetch('/state2district_list.json');
  const state2DistrictMap: Record<string, string[]> = await state2DistrictResponse.json();

  const ingredients = dishStory.ingredients;

  // Helper to process one ingredient
  async function processIngredient(ingredient: IngredientOrigin): Promise<void> {
    const districts = getDistrictsForState(ingredient.stateId);
    const districtList = state2DistrictMap[ingredient.stateName] || [];
    
    if (districtList.length === 0) {
      console.warn(`No districts found for state: ${ingredient.stateName}`);
      return;
    }

    // Build prompt for district resolution
    const districtPrompt = buildDistrictPrompt(
      ingredient.ingredientName,
      ingredient.stateName,
      ingredient.placeLabel,
      districtList
    );

    console.log(`resolve_district: token len (${districtPrompt.length})`);
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
        console.warn(`Failed to resolve district for ${ingredient.ingredientName}`);
        return;
      }

      const data: GeminiResponse = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        console.warn(`No response for district resolution: ${ingredient.ingredientName}`);
        return;
      }

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`No JSON in district response: ${ingredient.ingredientName}`);
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const districtName = parsed.district_name || parsed.district || '';

      if (districtName) {
        // Find matching district
        const normalized = districtName.toLowerCase().trim();
        let matchedDistrict = districts.find(
          (d) => d.name.toLowerCase().trim() === normalized
        );

        // Try fuzzy match if exact match fails
        if (!matchedDistrict) {
          matchedDistrict = districts.find(
            (d) => d.name.toLowerCase().includes(normalized) || 
                   normalized.includes(d.name.toLowerCase())
          );
        }

        if (matchedDistrict) {
          ingredient.districtName = matchedDistrict.name;
          ingredient.districtId = matchedDistrict.id;
        } else {
          console.warn(`Could not match district "${districtName}" for ${ingredient.ingredientName}`);
        }
      }
    } catch (error) {
      console.warn(`Error resolving district for ${ingredient.ingredientName}:`, error);
    }
  }

  // Limit concurrency to 4 at a time
  const concurrency = 4;
  let index = 0;

  async function runBatch() {
    const promises = [];
    for (
      let i = 0;
      i < concurrency && index < ingredients.length;
      i++, index++
    ) {
      promises.push(processIngredient(ingredients[index]));
    }
    await Promise.all(promises);
    if (index < ingredients.length) {
      await runBatch();
    }
  }

  await runBatch();
}

/**
 * Build prompt for district resolution
 */
function buildDistrictPrompt(
  ingredientName: string,
  stateName: string,
  placeLabel: string,
  districtList: string[]
): string {
  // Limit district list to avoid token limits (take first 50 if too many)
  const limitedDistricts = districtList.slice(0, 50);
  
  return `You are a geography expert. Given an ingredient "${ingredientName}" sourced from "${placeLabel}" in "${stateName}", identify the exact district name from this list:

${limitedDistricts.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "district_name": "<exact district name from the list above>"
}

Requirements:
- The district name MUST match exactly one item from the list above (case-insensitive).
- If "${placeLabel}" is a city, choose the district that contains that city.
- If "${placeLabel}" is a region name (e.g., "Malabar Coast"), choose the most representative district.
- If unsure, pick the most likely district based on the ingredient and place context.

Now identify the district for "${ingredientName}" from "${placeLabel}", ${stateName}:`;
}
