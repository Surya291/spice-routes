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
  getCurrentStory,
} from './animation';
import type { DishStory } from './domain';

// DOM elements
let dishInput: HTMLInputElement;
let cookBtn: HTMLButtonElement;
let playPauseBtn: HTMLButtonElement;
let replayBtn: HTMLButtonElement;
let skipBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let shareBtn: HTMLButtonElement;
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
  shareBtn = document.getElementById('share-btn') as HTMLButtonElement;
  loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
  commentaryElement = document.getElementById('commentary') as HTMLElement;
  dishTitleElement = document.getElementById('dish-title') as HTMLElement;
  dishDefinitionElement = document.getElementById('dish-definition') as HTMLElement;
  originInfoElement = document.getElementById('origin-info') as HTMLElement;
  migrationLogElement = document.getElementById('migration-log') as HTMLElement;
  const mapElement = document.getElementById('india-map');
  if (!mapElement || !(mapElement instanceof SVGSVGElement)) {
    throw new Error('India map SVG element not found');
  }
  mapSvg = mapElement;

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
  shareBtn.addEventListener('click', handleShare);
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

  // Initialize info panel toggle functionality
  initInfoPanelToggle();
}

/**
 * Initialize info panel toggle (collapsible on mobile/tablet)
 */
function initInfoPanelToggle() {
  const infoPanel = document.getElementById('narration-panel');
  const toggleBtn = document.getElementById('info-panel-toggle');
  const closeBtn = document.getElementById('info-panel-close');
  
  if (!infoPanel || !toggleBtn || !closeBtn) return;

  // Check if mobile/tablet (viewport width <= 1024px)
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;
  
  // Start collapsed on mobile
  if (isMobile) {
    infoPanel.classList.add('collapsed');
    toggleBtn.classList.add('show');
  }

  // Toggle button (opens panel)
  toggleBtn.addEventListener('click', () => {
    infoPanel.classList.remove('collapsed');
    toggleBtn.classList.remove('show');
  });

  // Close button (closes panel)
  closeBtn.addEventListener('click', () => {
    infoPanel.classList.add('collapsed');
    if (isMobile) {
      toggleBtn.classList.add('show');
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    const isMobileNow = window.matchMedia('(max-width: 1024px)').matches;
    if (!isMobileNow) {
      // Desktop: always show panel
      infoPanel.classList.remove('collapsed');
      toggleBtn.classList.remove('show');
    } else {
      // Mobile: show toggle if panel is collapsed
      if (infoPanel.classList.contains('collapsed')) {
        toggleBtn.classList.add('show');
      }
    }
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
  shareBtn.disabled = true;
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
  shareBtn.disabled = false;
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
 * Handle share button - capture map and share via WhatsApp
 */
async function handleShare() {
  const story = getCurrentStory();
  if (!story) {
    showError('NO_STORY_TO_SHARE');
    return;
  }

  try {
    // Ensure final view is shown (all routes visible)
    skipToEnd();
    
    // Wait for final view to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Hide dish title temporarily for screenshot
    const originalTitle = dishTitleElement.textContent;
    const originalDefinition = dishDefinitionElement.textContent;
    dishTitleElement.textContent = '?';
    dishDefinitionElement.textContent = '/ DEFINITION: —';

    // Wait a moment for UI to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture map as image (returns blob)
    const imageBlob = await captureMapAsImageBlob();

    // Restore title
    dishTitleElement.textContent = originalTitle;
    dishDefinitionElement.textContent = originalDefinition;

    // Generate challenge message
    const message = generateShareMessage(story);

    // Share via Web Share API (no download)
    shareToWhatsApp(message, imageBlob);
  } catch (error) {
    console.error('Error sharing:', error);
    showError('SHARE_FAILED');
    // Restore title in case of error
    const story = getCurrentStory();
    if (story) {
      dishTitleElement.textContent = story.dish.toUpperCase();
      dishDefinitionElement.textContent = `/ DEFINITION: A DISH FROM ${story.originCity.toUpperCase()}, ${story.originState.toUpperCase()}`;
    }
  }
}

/**
 * Capture map container as image blob using html2canvas
 * This captures everything as rendered including all routes, highlights, etc.
 */
async function captureMapAsImageBlob(): Promise<Blob> {
  // Dynamically import html2canvas
  const html2canvas = (await import('html2canvas')).default;
  
  // Get map container
  const mapContainer = document.querySelector('.map-container') as HTMLElement;
  if (!mapContainer) {
    throw new Error('Map container not found');
  }
  
  // Temporarily hide UI elements that shouldn't be in capture
  const speechBalloons = mapContainer.querySelectorAll('.speech-balloon');
  const loadingOverlay = mapContainer.querySelector('.loading-overlay');
  const infoPanelToggle = document.querySelector('.info-panel-toggle') as HTMLElement;
  const originalStyles: Array<{ element: HTMLElement; display: string }> = [];
  
  // Hide speech balloons
  speechBalloons.forEach((el) => {
    const htmlEl = el as HTMLElement;
    originalStyles.push({ element: htmlEl, display: htmlEl.style.display });
    htmlEl.style.display = 'none';
  });
  
  // Hide loading overlay
  if (loadingOverlay) {
    const htmlEl = loadingOverlay as HTMLElement;
    originalStyles.push({ element: htmlEl, display: htmlEl.style.display });
    htmlEl.style.display = 'none';
  }
  
  // Hide info panel toggle button
  if (infoPanelToggle) {
    originalStyles.push({ element: infoPanelToggle, display: infoPanelToggle.style.display });
    infoPanelToggle.style.display = 'none';
  }
  
  try {
    // Capture the map container as canvas
    const canvas = await html2canvas(mapContainer, {
      backgroundColor: '#F5E6D3',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true,
    });
    
    // Restore hidden elements
    originalStyles.forEach(({ element, display }) => {
      element.style.display = display;
    });
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      }, 'image/png', 0.95);
    });
  } catch (error) {
    // Restore hidden elements on error
    originalStyles.forEach(({ element, display }) => {
      element.style.display = display;
    });
    throw error;
  }
}

/**
 * Generate share message in app's design style
 */
function generateShareMessage(story: DishStory): string {
  // Build ingredient list
  const ingredientLines = story.ingredients
    .slice(0, 5) // Limit to 5 ingredients for readability
    .map(ing => {
      const ingredientName = ing.ingredientName.toUpperCase();
      const place = ing.placeLabel.toUpperCase();
      const state = ing.stateName.toUpperCase();
      return `${ingredientName} FROM ${place}, ${state}`;
    })
    .join('\n');

  // Get destination state
  const destination = story.originState.toUpperCase();

  return `SPICE ROUTE MYSTERY

CAN YOU GUESS THIS DISH?

INGREDIENTS JOURNEY:
${ingredientLines}

ALL ROADS LEAD TO: ${destination}

WHAT DISH IS THIS?

GUESS AND REPLY!

MADE WITH SPICE.ROUTES`;
}

/**
 * Share to WhatsApp with image and message using Web Share API
 */
function shareToWhatsApp(message: string, imageBlob: Blob) {
  // Create File object for Web Share API
  const file = new File([imageBlob], 'spice-route-mystery.png', { type: 'image/png' });
  
  // Check if Web Share API supports files
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    // Use Web Share API with image and text (no download needed)
    navigator.share({
      title: 'SPICE ROUTE MYSTERY',
      text: message,
      files: [file],
    }).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        // Fallback to WhatsApp web (text only)
        openWhatsAppWeb(message);
      }
    });
  } else {
    // Fallback: Open WhatsApp web with text
    // User can manually attach image if they want
    openWhatsAppWeb(message);
  }
}

/**
 * Open WhatsApp Web with message
 */
function openWhatsAppWeb(message: string) {
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  // Open in new window
  window.open(whatsappUrl, '_blank');
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
    .map((ing: { ingredientName: string; placeLabel: string; stateName: string }, idx: number) => {
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
