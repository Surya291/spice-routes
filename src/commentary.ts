/**
 * Commentary generation system with playful, sarcastic tone
 */

import type { DishStory, IngredientOrigin } from './domain';

const INGREDIENT_TEMPLATES = [
  "{ingredient} is making its way from {place_label}, {state} — because apparently this dish can't function without it.",
  "{state} contributed {ingredient} from {place_label}, as usual doing the heavy lifting.",
  "Here comes {ingredient} from {place_label}, {state}. Someone had to bring it.",
  "{ingredient} took a train from {place_label}, {state} because this dish demanded it.",
  "From {place_label}, {state}, {ingredient} arrives. The dish is grateful, probably.",
  "{state} sends {ingredient} from {place_label}. The dish accepts graciously.",
  "{ingredient} from {place_label}, {state} — because why not make this dish even more complicated?",
];

const OPENING_TEMPLATES = [
  "Let's see how many states {dish} bullied into participating.",
  "{dish} from {origin_city} — a dish that's basically a geography lesson on a plate.",
  "Welcome to {origin_city}, where {dish} happens. Let's trace where everything came from.",
  "{dish} is about to show you how half of India ends up in one plate.",
];

const CLOSING_TEMPLATES = [
  "And that's how {count} states came together to make {dish}. Geography, but make it delicious.",
  "{dish} required {count} states. Was it worth it? Absolutely.",
  "Final count: {count} states, one dish. That's {dish} for you.",
  "{count} states, one plate. That's the {dish} story.",
];

/**
 * Generate opening commentary
 */
export function generateOpening(story: DishStory): string {
  const template =
    OPENING_TEMPLATES[
      Math.floor(Math.random() * OPENING_TEMPLATES.length)
    ];
  return template
    .replace('{dish}', story.dish)
    .replace('{origin_city}', story.originCity);
}

/**
 * Generate commentary for an ingredient
 */
export function generateIngredientCommentary(
  ingredient: IngredientOrigin,
  index: number
): string {
  // Use index to seed selection for repeatability
  const seed = index % INGREDIENT_TEMPLATES.length;
  const template = INGREDIENT_TEMPLATES[seed];

  return template
    .replace('{ingredient}', ingredient.ingredientName)
    .replace('{state}', ingredient.stateName)
    .replace('{place_label}', ingredient.placeLabel);
}

/**
 * Generate closing commentary
 */
export function generateClosing(story: DishStory): string {
  const template =
    CLOSING_TEMPLATES[
      Math.floor(Math.random() * CLOSING_TEMPLATES.length)
    ];
  const stateCount = new Set(story.ingredients.map((i) => i.stateId)).size;
  return template
    .replace('{dish}', story.dish)
    .replace('{count}', stateCount.toString());
}
