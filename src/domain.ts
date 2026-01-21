/**
 * Domain types for the food origin story app
 */

export interface DishQuery {
  name: string;
  originCity?: string;
  tonePreference?: 'playful-sarcastic' | 'educational' | 'neutral';
}

export interface IngredientOrigin {
  ingredientName: string;
  stateName: string;
  stateId: string;
  placeLabel: string; // Specific place mentioned in commentary (e.g., "Godavari Delta", "Chikmagalur")
  districtName?: string; // Exact district name resolved from place_label
  districtId?: string; // District ID for map lookup
  note?: string;
  confidence?: number;
}

export interface DishStory {
  dish: string;
  originCity: string;
  originState: string;
  originStateId: string;
  ingredients: IngredientOrigin[];
}

export interface StoryFrame {
  ingredient: IngredientOrigin;
  fromStateId: string;
  toStateId: string;
  startTime: number; // milliseconds offset from animation start
  endTime: number;
  caption: string;
}

export type AnimationState = 'idle' | 'loading' | 'playing' | 'completed' | 'paused';

export interface AnimationContext {
  state: AnimationState;
  currentFrameIndex: number;
  startTime: number;
  pausedAt: number;
  story: DishStory | null;
  frames: StoryFrame[];
}
