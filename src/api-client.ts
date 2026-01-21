/**
 * API Client for backend communication
 */

import type { DishStory, DishQuery } from './domain';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch dish ingredients from backend API
 */
export async function fetchDishIngredientsFromAPI(
  query: DishQuery
): Promise<DishStory> {
  try {
    const response = await fetch(`${API_BASE_URL}/dish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dishName: query.name,
      }),
    });

    if (!response.ok) {
      // Handle 404 specifically (API not found in dev mode)
      if (response.status === 404) {
        throw new Error(
          'API_ENDPOINT_NOT_FOUND. Please run "vercel dev" in a separate terminal to start the backend API, or deploy to Vercel.'
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API request failed: ${response.statusText}`
      );
    }

  const data = await response.json();
  
  // Import map functions to resolve state IDs
  const { findStateByName, findDistrictByName } = await import('./map');
  
  // Resolve state IDs from state names
  const originStateMetadata = findStateByName(data.originState);
  if (!originStateMetadata) {
    throw new Error(`Could not find origin state: ${data.originState}`);
  }
  
  // Transform backend response to match our domain model
  const ingredients = await Promise.all(
    data.ingredients.map(async (ing: any) => {
      const stateMetadata = findStateByName(ing.stateName);
      if (!stateMetadata) {
        console.warn(`Could not find state: ${ing.stateName} for ingredient ${ing.ingredientName}`);
        return null;
      }
      
      // Resolve district if districtName is provided
      let districtId = ing.districtId;
      if (ing.districtName && !districtId) {
        const districtMetadata = findDistrictByName(ing.districtName, stateMetadata.id);
        if (districtMetadata) {
          districtId = districtMetadata.id;
          console.log(`Resolved district: ${ing.districtName} -> ${districtId} in state ${stateMetadata.id}`);
        } else {
          console.warn(`Could not resolve district: ${ing.districtName} in state ${stateMetadata.id} (${stateMetadata.name})`);
        }
      }
      
      return {
        ingredientName: ing.ingredientName,
        stateName: ing.stateName,
        stateId: stateMetadata.id,
        placeLabel: ing.placeLabel,
        districtName: ing.districtName,
        districtId: districtId,
        note: ing.note,
        confidence: ing.confidence || 0.8,
      };
    })
  );
  
  // Filter out null ingredients
  const validIngredients = ingredients.filter((ing): ing is NonNullable<typeof ing> => ing !== null);
  
  return {
    dish: data.dish,
    originCity: data.originCity,
    originState: data.originState,
    originStateId: originStateMetadata.id,
    ingredients: validIngredients,
  };
  } catch (error) {
    // Re-throw with more context if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'NETWORK_ERROR. Make sure the backend API is running. Run "vercel dev" in a separate terminal.'
      );
    }
    // Handle 404 specifically
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(
        'API_ENDPOINT_NOT_FOUND. Please run "vercel dev" in a separate terminal to start the backend API.'
      );
    }
    throw error;
  }
}

/**
 * Get suggestions from backend
 */
export async function getSuggestions(): Promise<
  Array<{ name: string; display: string }>
> {
  try {
    const response = await fetch(`${API_BASE_URL}/suggestions`);
    
    if (!response.ok) {
      // Fallback to default suggestions if API fails
      return getDefaultSuggestions();
    }

    const data = await response.json();
    return data.suggestions || getDefaultSuggestions();
  } catch (error) {
    console.warn('Failed to fetch suggestions, using defaults:', error);
    return getDefaultSuggestions();
  }
}

function getDefaultSuggestions(): Array<{ name: string; display: string }> {
  // Return empty array if no cache - user needs to search first
  return [];
}
