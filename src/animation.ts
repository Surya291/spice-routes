/**
 * Animation engine using D3.js for ingredient flow visualization
 */

import * as d3 from 'd3';
import type {
  AnimationContext,
  AnimationState,
  DishStory,
  StoryFrame,
} from './domain';
import { createCurvedPath, getStateCentroid, getDistrictCentroid, findDistrictByName } from './map';
import {
  generateOpening,
  generateIngredientCommentary,
  generateClosing,
} from './commentary';

const FRAME_DURATION = 2500; // 2.5 seconds per ingredient
const PATH_ANIMATION_DURATION = 1500; // 1.5 seconds for path drawing

let context: AnimationContext = {
  state: 'idle',
  currentFrameIndex: -1,
  startTime: 0,
  pausedAt: 0,
  story: null,
  frames: [],
};

let animationTimer: d3.Timer | null = null;
let svgElement: SVGSVGElement | null = null;
let commentaryElement: HTMLElement | null = null;
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
let mapGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
let speechBalloonGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

/**
 * Initialize animation system
 */
export function initAnimation(
  svg: SVGSVGElement,
  commentary: HTMLElement
): void {
  svgElement = svg;
  commentaryElement = commentary;

  // Set up SVG groups
  const d3Svg = d3.select(svg);
  
  // Create map group (for zooming) - will be populated by renderMap
  mapGroup = d3Svg.select('.map-group');
  if (mapGroup.empty()) {
    mapGroup = d3Svg.append('g').attr('class', 'map-group');
  }

  // Create speech balloon group (outside map-group so it doesn't zoom)
  speechBalloonGroup = d3Svg.select('.speech-balloon-group');
  if (speechBalloonGroup.empty()) {
    speechBalloonGroup = d3Svg.append('g').attr('class', 'speech-balloon-group');
  }

  // Set up zoom behavior
  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 4])
    .on('zoom', (event) => {
      if (mapGroup) {
        mapGroup.attr('transform', event.transform.toString());
      }
      // Update speech balloon positions during zoom
      // This ensures the balloon tracks the zoomed location in real-time
      if (speechBalloonGroup) {
        speechBalloonGroup.selectAll<SVGGElement, unknown>('.speech-balloon').each(function() {
          const balloon = d3.select<SVGGElement, unknown>(this);
          updateSpeechBalloonPosition(balloon);
        });
      }
    });

  d3Svg.call(zoomBehavior);
  
  // Update balloon position on window resize (for mobile/desktop switching)
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      if (speechBalloonGroup) {
        speechBalloonGroup.selectAll<SVGGElement, unknown>('.speech-balloon').each(function() {
          const balloon = d3.select<SVGGElement, unknown>(this);
          updateSpeechBalloonPosition(balloon);
        });
      }
    }, 100);
  });
}

/**
 * Prepare animation frames from a dish story
 */
export function prepareAnimation(story: DishStory): void {
  const frames: StoryFrame[] = [];

  // Opening frame
  frames.push({
    ingredient: story.ingredients[0], // Dummy, won't be used
    fromStateId: '',
    toStateId: story.originStateId,
    startTime: 0,
    endTime: 1000,
    caption: generateOpening(story),
  });

  // Ingredient frames
  story.ingredients.forEach((ingredient, index) => {
    const startTime = 1000 + index * FRAME_DURATION;
    frames.push({
      ingredient,
      fromStateId: ingredient.stateId,
      toStateId: story.originStateId,
      startTime,
      endTime: startTime + PATH_ANIMATION_DURATION,
      caption: generateIngredientCommentary(ingredient, index),
    });
  });

  // Closing frame
  const lastFrameEnd =
    frames.length > 0
      ? frames[frames.length - 1].endTime
      : 1000;
  frames.push({
    ingredient: story.ingredients[0], // Dummy
    fromStateId: '',
    toStateId: story.originStateId,
    startTime: lastFrameEnd + 500,
    endTime: lastFrameEnd + 2000,
    caption: generateClosing(story),
  });

  context.story = story;
  context.frames = frames;
  context.currentFrameIndex = -1;
}

/**
 * Start animation
 */
export function startAnimation(): void {
  if (context.state === 'playing') return;
  if (!context.story || !context.frames.length) return;

  context.state = 'playing';
  context.startTime = Date.now() - context.pausedAt;
  context.pausedAt = 0;

  if (animationTimer) {
    animationTimer.stop();
  }

  animationTimer = d3.timer(updateAnimation);
}

/**
 * Pause animation
 */
export function pauseAnimation(): void {
  if (context.state !== 'playing') return;
  context.state = 'paused';
  context.pausedAt = Date.now() - context.startTime;
  if (animationTimer) {
    animationTimer.stop();
  }
}

/**
 * Resume animation
 */
export function resumeAnimation(): void {
  if (context.state !== 'paused') return;
  startAnimation();
}

/**
 * Replay animation
 */
export function replayAnimation(): void {
  resetAnimation();
  startAnimation();
}

/**
 * Skip to final view
 */
export function skipToEnd(): void {
  if (!context.story || !svgElement) return;

  pauseAnimation();
  showFinalView();
}

/**
 * Reset animation state
 */
function resetAnimation(): void {
  if (animationTimer) {
    animationTimer.stop();
  }
  context.state = 'idle';
  context.currentFrameIndex = -1;
  context.startTime = 0;
  context.pausedAt = 0;
  clearMap();
}

/**
 * Update animation frame
 */
function updateAnimation(): void {
  if (!svgElement || !context.story) return;

  const elapsed = Date.now() - context.startTime;
  const currentFrame = findCurrentFrame(elapsed);

  if (!currentFrame) {
    // Animation complete
    if (elapsed > context.frames[context.frames.length - 1].endTime) {
      completeAnimation();
      return;
    }
    return;
  }

  const frameIndex = context.frames.indexOf(currentFrame);
  if (frameIndex !== context.currentFrameIndex) {
    // New frame started
    context.currentFrameIndex = frameIndex;
    startFrame(currentFrame, elapsed);
  }

  // Update path animation if it's an ingredient frame
  if (
    currentFrame.fromStateId &&
    currentFrame.toStateId &&
    elapsed >= currentFrame.startTime &&
    elapsed <= currentFrame.endTime
  ) {
    const progress =
      (elapsed - currentFrame.startTime) /
      (currentFrame.endTime - currentFrame.startTime);
    updatePathAnimation(currentFrame, progress);
  }
}

/**
 * Find the current active frame
 */
function findCurrentFrame(elapsed: number): StoryFrame | null {
  for (const frame of context.frames) {
    if (elapsed >= frame.startTime && elapsed <= frame.endTime) {
      return frame;
    }
  }
  return null;
}

/**
 * Start a new frame
 */
function startFrame(frame: StoryFrame, _elapsed: number): void {
  if (!svgElement || !commentaryElement) return;

  // Update commentary
  commentaryElement.textContent = frame.caption;

  // If it's an ingredient frame, zoom in, show speech balloon, highlight districts and create path
  if (frame.fromStateId && frame.toStateId) {
    // Use district centroid if available, otherwise fall back to state centroid
    let fromCentroid = frame.ingredient.districtId 
      ? getDistrictCentroid(frame.ingredient.districtId)
      : getStateCentroid(frame.fromStateId);
    
    // If district not found, try to find it by name
    if (!fromCentroid && frame.ingredient.districtName) {
      const district = findDistrictByName(frame.ingredient.districtName, frame.fromStateId);
      if (district) {
        fromCentroid = district.centroid;
        frame.ingredient.districtId = district.id;
      }
    }
    
    // Final fallback to state centroid
    if (!fromCentroid) {
      fromCentroid = getStateCentroid(frame.fromStateId);
    }
    
    if (fromCentroid) {
      // Zoom in to source (district or state)
      zoomToState(fromCentroid);
      
      // Show speech balloon after zoom animation completes (800ms zoom duration)
      // Also update position during zoom to keep it aligned
      setTimeout(() => {
        showSpeechBalloon(
          fromCentroid!,
          frame.ingredient.ingredientName,
          frame.ingredient.placeLabel,
          frame.ingredient.stateName
        );
        // Update position multiple times during zoom to ensure it stays aligned
        const updateInterval = setInterval(() => {
          if (speechBalloonGroup) {
            speechBalloonGroup.selectAll<SVGGElement, unknown>('.speech-balloon').each(function() {
              updateSpeechBalloonPosition(d3.select<SVGGElement, unknown>(this));
            });
          }
        }, 50);
        // Stop updating after zoom completes
        setTimeout(() => clearInterval(updateInterval), 900);
      }, 850); // Show after zoom completes
    }

    // Highlight district if available, otherwise highlight state
    if (frame.ingredient.districtId) {
      highlightDistrict(frame.ingredient.districtId, true);
    } else {
      highlightState(frame.fromStateId, true);
    }
    highlightState(frame.toStateId, false); // Pulse destination state

    // Create path element
    const toCentroid = getStateCentroid(frame.toStateId);

    if (fromCentroid && toCentroid) {
      const pathData = createCurvedPath(fromCentroid, toCentroid);
      const svg = d3.select(svgElement);
      
      // Get or create paths group (inside map-group for zoom)
      let pathsGroup = svg.select<SVGGElement>('.map-group .ingredient-paths');
      if (pathsGroup.empty()) {
        pathsGroup = svg
          .select<SVGGElement>('.map-group')
          .append('g')
          .attr('class', 'ingredient-paths');
      }
      
      const path = pathsGroup
        .append('path')
        .attr('d', pathData)
        .attr('class', 'ingredient-path')
        .attr('data-ingredient', frame.ingredient.ingredientName)
        .attr('stroke-dasharray', '1000')
        .attr('stroke-dashoffset', '1000')
        .attr('opacity', 0);

      // Add hot dish symbol (♨️) beside destination (NOT at destination, beside it)
      const hotDishSymbol = pathsGroup
        .append('text')
        .attr('class', 'path-marker hot-dish-symbol')
        .attr('x', toCentroid[0] + 15) // Position beside destination
        .attr('y', toCentroid[1])
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '18')
        .attr('opacity', 0)
        .text('♨️');

      // Animate path drawing
      path
        .transition()
        .duration(PATH_ANIMATION_DURATION)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .attr('opacity', 1)
        .on('end', () => {
          // Show hot dish symbol when path finishes drawing
          hotDishSymbol
            .transition()
            .duration(300)
            .attr('opacity', 1);
        });
    }
  } else {
    // For opening/closing frames, zoom out
    zoomOut();
    hideSpeechBalloon();
  }
}

/**
 * Update path animation progress
 */
function updatePathAnimation(_frame: StoryFrame, _progress: number): void {
  // Path animation is handled by D3 transition in startFrame
  // This can be used for additional effects if needed
}

/**
 * Highlight a state
 */
function highlightState(stateId: string, isSource: boolean): void {
  if (!svgElement) return;

  const svg = d3.select(svgElement);
  const statePath = svg.select(`#${stateId}`);

  if (statePath.empty()) return;

  if (isSource) {
    // Highlight source state
    statePath
      .transition()
      .duration(200)
      .attr('class', 'state state-highlighted source');
  } else {
    // Pulse destination state
    statePath
      .transition()
      .duration(200)
      .attr('class', 'state state-highlighted destination')
      .transition()
      .duration(300)
      .attr('class', 'state');
  }
}

/**
 * Highlight a district
 */
function highlightDistrict(districtId: string, isSource: boolean): void {
  if (!svgElement) return;

  const svg = d3.select(svgElement);
  
  // Show districts group
  const districtsGroup = svg.select('.districts');
  districtsGroup.attr('opacity', 1);
  
  // Highlight the specific district
  const districtPath = svg.select(`#${districtId}`);

  if (districtPath.empty()) {
    console.warn(`District not found: ${districtId}`);
    return;
  }

  if (isSource) {
    // Highlight source district
    districtPath
      .transition()
      .duration(200)
      .attr('class', 'district district-highlighted source');
    
    // Also highlight parent state with lighter color
    const stateId = districtPath.attr('data-state-id');
    if (stateId) {
      highlightState(stateId, false);
    }
  }
}

/**
 * Show final view with all paths
 */
function showFinalView(): void {
  if (!context.story || !svgElement || !commentaryElement) return;

  context.state = 'completed';
  clearMap();

  // Re-render all paths
  const svg = d3.select(svgElement);
  
  // Get or create paths group (inside map-group)
  let pathsGroup = svg.select<SVGGElement>('.map-group .ingredient-paths');
  if (pathsGroup.empty()) {
    pathsGroup = svg
      .select<SVGGElement>('.map-group')
      .append('g')
      .attr('class', 'ingredient-paths');
  }
  
  // Zoom out for final view
  zoomOut();
  hideSpeechBalloon();
  
  context.story.ingredients.forEach((ingredient) => {
    // Use district centroid if available, otherwise state centroid
    let fromCentroid = ingredient.districtId 
      ? getDistrictCentroid(ingredient.districtId)
      : getStateCentroid(ingredient.stateId);
    
    // Try to find district by name if districtId not set
    if (!fromCentroid && ingredient.districtName) {
      const district = findDistrictByName(ingredient.districtName, ingredient.stateId);
      if (district) {
        fromCentroid = district.centroid;
      }
    }
    
    // Final fallback to state centroid
    if (!fromCentroid) {
      fromCentroid = getStateCentroid(ingredient.stateId);
    }
    
    const toCentroid = getStateCentroid(context.story!.originStateId);

    if (fromCentroid && toCentroid) {
      const pathData = createCurvedPath(fromCentroid, toCentroid);
      pathsGroup
        .append('path')
        .attr('d', pathData)
        .attr('class', 'ingredient-path final')
        .attr('data-ingredient', ingredient.ingredientName)
        .attr('opacity', 0)
        .transition()
        .duration(300)
        .attr('opacity', 1);

      // Add hot dish symbol (♨️) beside destination
      pathsGroup
        .append('text')
        .attr('class', 'path-marker hot-dish-symbol')
        .attr('x', toCentroid[0] + 15) // Position beside destination
        .attr('y', toCentroid[1])
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '18')
        .attr('opacity', 0)
        .text('♨️')
        .transition()
        .duration(300)
        .delay(300)
        .attr('opacity', 1);
    }
  });

  // Highlight all districts in final view
  if (context.story) {
    const svg = d3.select(svgElement);
    const districtsGroup = svg.select('.districts');
    districtsGroup.attr('opacity', 1);
    
    context.story.ingredients.forEach((ingredient) => {
      if (ingredient.districtId) {
        const districtPath = svg.select(`#${ingredient.districtId}`);
        if (!districtPath.empty()) {
          districtPath
            .attr('class', 'district district-highlighted source');
        }
      }
    });
  }

  // Show closing commentary
  commentaryElement.textContent = generateClosing(context.story);
}

/**
 * Complete animation
 */
function completeAnimation(): void {
  if (animationTimer) {
    animationTimer.stop();
  }
  context.state = 'completed';
  showFinalView();
}

/**
 * Zoom to a specific state centroid
 */
function zoomToState(centroid: [number, number]): void {
  if (!svgElement || !zoomBehavior) return;

  const width = svgElement.viewBox?.baseVal?.width || 1000;
  const height = svgElement.viewBox?.baseVal?.height || 1000;
  
  const scale = 2.5; // Zoom level
  const x = width / 2 - centroid[0] * scale;
  const y = height / 2 - centroid[1] * scale;

  const transform = d3.zoomIdentity.translate(x, y).scale(scale);

  d3.select(svgElement)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .call(zoomBehavior!.transform, transform);
}

/**
 * Zoom out to show full map
 */
function zoomOut(): void {
  if (!svgElement || !zoomBehavior) return;

  const transform = d3.zoomIdentity;

  d3.select(svgElement)
    .transition()
    .duration(800)
    .ease(d3.easeCubicOut)
    .call(zoomBehavior!.transform, transform);
}

/**
 * Show speech balloon at a location (ingredient + place only)
 */
function showSpeechBalloon(
  position: [number, number],
  ingredient: string,
  place: string,
  state: string
): void {
  if (!svgElement || !speechBalloonGroup) return;

  // Clear existing speech balloon
  hideSpeechBalloon();

  const [x, y] = position;
  
  // Detect mobile viewport for larger sizing
  const isMobile = window.innerWidth <= 768;
  
  // Larger padding and sizing on mobile for better visibility
  const padding = isMobile ? 18 : 14;
  const tailHeight = isMobile ? 18 : 15;
  const lineHeight = isMobile ? 26 : 22;
  
  // Calculate dynamic width based on text length
  const ingredientTextStr = ingredient.toUpperCase();
  const locationText = `${place.toUpperCase()}, ${state.toUpperCase()}`;
  
  // Estimate width: ~7px per character for monospace (larger on mobile)
  const charWidth = isMobile ? 8.5 : 7;
  const ingredientWidth = ingredientTextStr.length * charWidth;
  const locationWidth = locationText.length * charWidth;
  const maxTextWidth = Math.max(ingredientWidth, locationWidth);
  
  // Dynamic width: content + padding, with min/max bounds (larger on mobile)
  const minWidth = isMobile ? 240 : 180;
  const maxWidth = isMobile ? 400 : 320;
  const balloonWidth = Math.max(minWidth, Math.min(maxWidth, maxTextWidth + padding * 2));
  
  // Dynamic height: calculate based on whether ingredient needs wrapping
  const needsWrapping = ingredientTextStr.length > (isMobile ? 40 : 35);
  const balloonHeight = padding * 2 + lineHeight * (needsWrapping ? 3 : 2) + 8;

  // Create speech balloon group
  // Position will be updated when zoom happens
  const balloon = speechBalloonGroup
    .append('g')
    .attr('class', 'speech-balloon')
    .attr('data-x', x.toString())
    .attr('data-y', y.toString())
    .attr('data-h', balloonHeight.toString())
    .attr('data-w', balloonWidth.toString())
    .attr('opacity', 0);
  
  // Update position immediately and multiple times to ensure correct positioning
  // This handles timing issues with zoom animations
  updateSpeechBalloonPosition(balloon);
  
  requestAnimationFrame(() => {
    updateSpeechBalloonPosition(balloon);
  });
  
  // Update again after zoom animation completes (800ms + buffer)
  setTimeout(() => {
    updateSpeechBalloonPosition(balloon);
  }, 900);

  // Background rectangle with rounded corners
  balloon
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', balloonWidth)
    .attr('height', balloonHeight)
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('class', 'balloon-bg');

  // Speech balloon tail (pointing down) - centered
  const tailCenterX = balloonWidth / 2;
  const tailPath = `M ${tailCenterX - 15},${balloonHeight} L ${tailCenterX},${balloonHeight + tailHeight} L ${tailCenterX + 15},${balloonHeight} Z`;
  balloon
    .append('path')
    .attr('d', tailPath)
    .attr('class', 'balloon-tail');

  // Text elements - positioned relative to balloon width
  const textGroup = balloon
    .append('g')
    .attr('class', 'balloon-text')
    .attr('transform', `translate(${balloonWidth / 2}, 0)`);

  // Ingredient name (bold, larger) - with text wrapping if needed
  const ingredientLength = ingredientTextStr.length;
  if (ingredientLength > 35) {
    // Split long ingredient names into two lines
    const midPoint = Math.floor(ingredientLength / 2);
    const spaceIndex = ingredientTextStr.lastIndexOf(' ', midPoint);
    const splitPoint = spaceIndex > 0 ? spaceIndex : midPoint;
    const line1 = ingredientTextStr.substring(0, splitPoint);
    const line2 = ingredientTextStr.substring(splitPoint).trim();
    
    textGroup
      .append('text')
      .attr('x', 0)
      .attr('y', padding + lineHeight)
      .attr('text-anchor', 'middle')
      .attr('class', 'balloon-ingredient')
      .text(line1);
    
    textGroup
      .append('text')
      .attr('x', 0)
      .attr('y', padding + lineHeight * 2)
      .attr('text-anchor', 'middle')
      .attr('class', 'balloon-ingredient')
      .text(line2);
    
    // Adjust location text position
    textGroup
      .append('text')
      .attr('x', 0)
      .attr('y', padding + lineHeight * 3 + 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'balloon-location')
      .text(locationText);
  } else {
    // Single line ingredient
    textGroup
      .append('text')
      .attr('x', 0)
      .attr('y', padding + lineHeight)
      .attr('text-anchor', 'middle')
      .attr('class', 'balloon-ingredient')
      .text(ingredientTextStr);
    
    // Place and state
    textGroup
      .append('text')
      .attr('x', 0)
      .attr('y', padding + lineHeight * 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('class', 'balloon-location')
      .text(locationText);
  }

  // Animate appearance
  balloon
    .transition()
    .duration(400)
    .ease(d3.easeCubicOut)
    .attr('opacity', 1);
}

/**
 * Update speech balloon position based on current zoom transform
 * The balloon is outside map-group, so we need to manually apply the same transform
 * Handles mobile viewport scaling correctly
 */
function updateSpeechBalloonPosition(
  balloon: d3.Selection<SVGGElement, unknown, null, undefined>
): void {
  if (!svgElement || !mapGroup) return;
  
  const xAttr = balloon.attr('data-x');
  const yAttr = balloon.attr('data-y');
  if (!xAttr || !yAttr) return;
  
  const x = parseFloat(xAttr);
  const y = parseFloat(yAttr);
  
  // Detect mobile viewport (width <= 768px)
  const isMobile = window.innerWidth <= 768;
  
  // Get viewBox dimensions
  const viewBox = svgElement.viewBox.baseVal;
  const viewBoxWidth = viewBox.width || 1000;
  const viewBoxHeight = viewBox.height || 1000;
  
  const hAttr = balloon.attr('data-h');
  const balloonHeight = hAttr ? parseFloat(hAttr) : 86;
  const wAttr = balloon.attr('data-w');
  const balloonWidth = wAttr ? parseFloat(wAttr) : 240;
  
  let offsetX: number;
  let offsetY: number;
  
  if (isMobile) {
    // MOBILE: Position at top-middle, regardless of point location
    // Center horizontally, position near top
    offsetX = (viewBoxWidth - balloonWidth) / 2; // Center horizontally
    offsetY = 40; // Position near top with margin
  } else {
    // DESKTOP: Position relative to the zoomed point (current behavior)
    const currentTransform = d3.zoomTransform(svgElement);
    const k = currentTransform.k;
    const tx = currentTransform.x;
    const ty = currentTransform.y;
    
    const transformedX = x * k + tx;
    const transformedY = y * k + ty;
    
    // Center the balloon horizontally on the point
    // Position it above the point with offset
    offsetX = transformedX - balloonWidth / 2;
    offsetY = transformedY - balloonHeight - 40;
    
    // Clamp to viewBox bounds for desktop
    const margin = 20;
    offsetX = Math.max(margin, Math.min(offsetX, viewBoxWidth - balloonWidth - margin));
    offsetY = Math.max(margin, Math.min(offsetY, viewBoxHeight - balloonHeight - margin));
  }
  
  balloon.attr('transform', `translate(${offsetX}, ${offsetY})`);
}

/**
 * Hide speech balloon
 */
function hideSpeechBalloon(): void {
  if (!speechBalloonGroup) return;

  speechBalloonGroup
    .selectAll('.speech-balloon')
    .transition()
    .duration(300)
    .attr('opacity', 0)
    .remove();
}


/**
 * Clear map highlights and paths
 */
function clearMap(): void {
  if (!svgElement) return;

  const svg = d3.select(svgElement);
  svg.selectAll('.ingredient-path').remove();
  svg.selectAll('.path-marker').remove(); // Remove markers (hot dish symbols)
  svg.selectAll('.state').attr('class', 'state');
  svg.selectAll('.district').attr('class', 'district');
  // Don't hide districts group here - it will be shown in final view
  hideSpeechBalloon();
}

/**
 * Get current animation state
 */
export function getAnimationState(): AnimationState {
  return context.state;
}

/**
 * Get animation context (for debugging)
 */
export function getAnimationContext(): AnimationContext {
  return { ...context };
}

/**
 * Reset everything - clears animation, map, and UI
 */
export function resetEverything(): void {
  // Stop any running animation
  if (animationTimer) {
    animationTimer.stop();
    animationTimer = null;
  }

  // Reset animation state
  context.state = 'idle';
  context.currentFrameIndex = -1;
  context.startTime = 0;
  context.pausedAt = 0;
  context.story = null;
  context.frames = [];

  // Clear map
  clearMap();

  // Zoom out
  zoomOut();
}
