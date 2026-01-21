/**
 * Main application entry point
 */

import { loadIndiaMap, renderMap } from './map';
import { fetchDishIngredientsFromAPI, getSuggestions } from './api-client';
import {
  initAnimation,
  prepareAnimation,
  startAnimation,
  pauseAnimation,
  resumeAnimation,
  replayAnimation,
  skipToEnd,
  getAnimationState,
  resetEverything,
} from './animation';

// DOM elements
let dishInput: HTMLInputElement;
let cookBtn: HTMLButtonElement;
let playPauseBtn: HTMLButtonElement;
let replayBtn: HTMLButtonElement;
let skipBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let loadingOverlay: HTMLElement;
let commentaryElement: HTMLElement;
let dishTitleElement: HTMLElement;
let dishDefinitionElement: HTMLElement;
let originInfoElement: HTMLElement;
let migrationLogElement: HTMLElement;
let mapSvg: SVGSVGElement;

/**
 * Initialize the application
 */
async function init() {
  // Get DOM elements
  dishInput = document.getElementById('dish-input') as HTMLInputElement;
  cookBtn = document.getElementById('cook-btn') as HTMLButtonElement;
  playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
  replayBtn = document.getElementById('replay-btn') as HTMLButtonElement;
  skipBtn = document.getElementById('skip-btn') as HTMLButtonElement;
  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
  commentaryElement = document.getElementById('commentary') as HTMLElement;
  dishTitleElement = document.getElementById('dish-title') as HTMLElement;
  dishDefinitionElement = document.getElementById('dish-definition') as HTMLElement;
  originInfoElement = document.getElementById('origin-info') as HTMLElement;
  migrationLogElement = document.getElementById('migration-log') as HTMLElement;
  mapSvg = document.getElementById('india-map') as SVGSVGElement;

  // Load India map
  try {
    showLoading(true, 'LOADING_MAP...');
    await loadIndiaMap();
    renderMap(mapSvg);
    showLoading(false);
  } catch (error) {
    console.error('Failed to load map:', error);
    showError('FAILED_TO_LOAD_MAP. PLEASE_REFRESH.');
    showLoading(false);
    return;
  }

  // Initialize animation system
  initAnimation(mapSvg, commentaryElement);

  // Set up event listeners
  cookBtn.addEventListener('click', handleCookClick);
  playPauseBtn.addEventListener('click', handlePlayPause);
  replayBtn.addEventListener('click', handleReplay);
  skipBtn.addEventListener('click', handleSkip);
  resetBtn.addEventListener('click', handleReset);

  // Sample dish buttons are now loaded dynamically from backend
  // Event listeners are attached in loadSuggestions()

  // Carousel navigation is initialized after suggestions load

  // Enter key on dish input
  dishInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleCookClick();
    }
  });

  // Load suggestions from backend and initialize carousel
  loadSuggestions().then(() => {
    // Initialize carousel after suggestions are loaded
    setTimeout(() => {
      initCarousel();
    }, 300);
  });
}

/**
 * Load suggestions from backend and update carousel
 */
async function loadSuggestions() {
  try {
    const suggestions = await getSuggestions();
    const sampleDishesContainer = document.getElementById('sample-dishes');
    
    if (sampleDishesContainer) {
      // Clear existing buttons
      sampleDishesContainer.innerHTML = '';
      
      if (suggestions.length === 0) {
        // No cached dishes yet - show a placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'no-suggestions';
        placeholder.textContent = 'Search dishes to see suggestions';
        placeholder.style.cssText = 'padding: 8px; color: #999; font-size: 0.7rem; text-align: center; width: 100%;';
        sampleDishesContainer.appendChild(placeholder);
        return;
      }
      
      // Add suggestion buttons from cache
      suggestions.forEach((suggestion) => {
        const button = document.createElement('button');
        button.className = 'sample-btn';
        button.setAttribute('data-dish', suggestion.name);
        button.textContent = suggestion.display;
        button.addEventListener('click', () => {
          dishInput.value = suggestion.name;
          handleCookClick();
        });
        sampleDishesContainer.appendChild(button);
      });
      
      // Reinitialize carousel after adding buttons
      setTimeout(() => {
        initCarousel();
      }, 100);
    }
  } catch (error) {
    console.error('Failed to load suggestions:', error);
  }
}

/**
 * Handle reset button click
 */
function handleReset() {
  resetEverything();
  resetUI();
}

/**
 * Reset UI to initial state
 */
function resetUI() {
  // Clear dish info
  dishTitleElement.textContent = '—';
  dishDefinitionElement.textContent = '/ DEFINITION: —';
  originInfoElement.innerHTML = `
    <div class="origin-line">DISH: —</div>
    <div class="origin-line">LOC: —</div>
    <div class="origin-line">STATE: —</div>
  `;
  migrationLogElement.innerHTML = '<p class="placeholder">INGREDIENT_ROUTES_WILL_APPEAR_HERE</p>';
  commentaryElement.innerHTML = '<p class="placeholder">ENTER_DISH_NAME_TO_BEGIN</p>';

  // Disable controls
  playPauseBtn.disabled = true;
  replayBtn.disabled = true;
  skipBtn.disabled = true;
  updatePlayPauseButton();
}

/**
 * Handle cook button click
 */
async function handleCookClick() {
  const dishName = dishInput.value.trim();

  if (!dishName) {
    showError('ENTER_DISH_NAME');
    return;
  }

  // Reset everything before starting new search
  resetEverything();
  resetUI();

  try {
    showLoading(true, 'FETCHING_INGREDIENTS...');
    cookBtn.disabled = true;

    const story = await fetchDishIngredientsFromAPI({ name: dishName });

    if (!story.ingredients.length) {
      showError(
        "MODEL_UNKNOWN_DISH. TRY_SAMPLE_DISHES."
      );
      return;
    }

    // Update UI with dish info
    updateDishInfo(story);

    // Prepare and start animation
    prepareAnimation(story);
    startAnimation();

    // Reload suggestions after successful search (to include new dish in cache)
    loadSuggestions();

  // Enable controls
  playPauseBtn.disabled = false;
  replayBtn.disabled = false;
  skipBtn.disabled = false;
  updatePlayPauseButton();
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    showError(
      error instanceof Error
        ? error.message.toUpperCase().replace(/ /g, '_')
        : 'FETCH_FAILED. CHECK_API_KEY.'
    );
  } finally {
    showLoading(false);
    cookBtn.disabled = false;
  }
}

/**
 * Handle play/pause button
 */
function handlePlayPause() {
  const state = getAnimationState();
  if (state === 'playing') {
    pauseAnimation();
  } else if (state === 'paused') {
    resumeAnimation();
  } else {
    startAnimation();
  }
  updatePlayPauseButton();
}

/**
 * Handle replay button
 */
function handleReplay() {
  replayAnimation();
  updatePlayPauseButton();
}

/**
 * Handle skip button
 */
function handleSkip() {
  skipToEnd();
  updatePlayPauseButton();
}

/**
 * Update play/pause button text
 */
function updatePlayPauseButton() {
  const state = getAnimationState();
  if (state === 'playing') {
    playPauseBtn.textContent = '⏸';
    playPauseBtn.title = 'Pause';
  } else {
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
  }
}

/**
 * Update dish info in the UI
 */
function updateDishInfo(story: DishStory) {
  dishTitleElement.textContent = story.dish.toUpperCase();
  dishDefinitionElement.textContent = `/ DEFINITION: A DISH FROM ${story.originCity.toUpperCase()}, ${story.originState.toUpperCase()}`;
  
  originInfoElement.innerHTML = `
    <div class="origin-line">DISH: ${story.dish.toUpperCase()}</div>
    <div class="origin-line">LOC: ${story.originCity.toUpperCase()}</div>
    <div class="origin-line">STATE: ${story.originState.toUpperCase()}</div>
  `;

  // Update migration log
  migrationLogElement.innerHTML = story.ingredients
    .map((ing, idx) => {
      return `
        <div class="migration-log-item">
          <div class="ingredient-name">${idx.toString().padStart(2, '0')}_${ing.ingredientName.toUpperCase()}</div>
          <div class="route-info">FROM: ${ing.placeLabel.toUpperCase()}, ${ing.stateName.toUpperCase()}</div>
        </div>
      `;
    })
    .join('');
}


/**
 * Initialize carousel functionality
 */
function initCarousel() {
  const carouselLeft = document.getElementById('carousel-left') as HTMLButtonElement;
  const carouselRight = document.getElementById('carousel-right') as HTMLButtonElement;
  const sampleDishes = document.getElementById('sample-dishes') as HTMLElement;
  
  if (!carouselLeft || !carouselRight || !sampleDishes) {
    // Retry after a short delay if elements aren't ready
    setTimeout(() => initCarousel(), 200);
    return;
  }
  
  // Remove existing event listeners by cloning and replacing
  const newLeft = carouselLeft.cloneNode(true) as HTMLButtonElement;
  const newRight = carouselRight.cloneNode(true) as HTMLButtonElement;
  carouselLeft.parentNode?.replaceChild(newLeft, carouselLeft);
  carouselRight.parentNode?.replaceChild(newRight, carouselRight);
  
  const buttons = sampleDishes.querySelectorAll('.sample-btn') as NodeListOf<HTMLElement>;
  const totalButtons = buttons.length;
  let currentIndex = 0;
  const visibleCount = 2; // Show 2 buttons at once for better visibility
  
  function updateCarousel() {
    // Calculate how many items we can scroll
    const maxIndex = Math.max(0, totalButtons - visibleCount);
    
    // Update button states
    newLeft.disabled = currentIndex === 0;
    newRight.disabled = currentIndex >= maxIndex;
    
    // Calculate transform - scroll one item at a time
    if (buttons.length > 0 && buttons[0].offsetWidth > 0) {
      const buttonWidth = buttons[0].offsetWidth;
      const gap = 8; // gap between buttons
      const translateX = -(currentIndex * (buttonWidth + gap));
      sampleDishes.style.transform = `translateX(${translateX}px)`;
    }
  }
  
  newLeft.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });
  
  newRight.addEventListener('click', () => {
    const maxIndex = Math.max(0, totalButtons - visibleCount);
    if (currentIndex < maxIndex) {
      currentIndex++;
      updateCarousel();
    }
  });
  
  // Initialize after a short delay to ensure layout is calculated
  setTimeout(() => {
    updateCarousel();
  }, 200);
  
  // Update on window resize
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      updateCarousel();
    }, 150);
  });
}

/**
 * Show/hide loading overlay
 */
function showLoading(show: boolean, message?: string) {
  if (show) {
    loadingOverlay.classList.remove('hidden');
    if (message) {
      const p = loadingOverlay.querySelector('p');
      if (p) p.textContent = message;
    }
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

/**
 * Show error message
 */
function showError(message: string) {
  commentaryElement.innerHTML = `<p class="error">${message.toUpperCase()}</p>`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
