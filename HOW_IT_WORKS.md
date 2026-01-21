# How This App Works - Beginner's Guide

## What is TypeScript?

TypeScript is like JavaScript (the language that makes websites interactive), but with **types**. Types help catch errors before the code runs. Think of it like:
- JavaScript: "Put something in this box"
- TypeScript: "Put a number in this box" (and it checks that you actually put a number)

The TypeScript code gets converted to JavaScript before it runs in your browser.

---

## The Big Picture: What Happens When You Use the App

```
1. You open the webpage
   ↓
2. The app loads the India map (from india.json file)
   ↓
3. You type a dish name and click "Cook the Story"
   ↓
4. The app asks AI (Gemini) "What are the ingredients of this dish?"
   ↓
5. AI responds with ingredients and where they come from
   ↓
6. The app creates an animation showing ingredients traveling from their states to the dish's origin
   ↓
7. You watch the animated story!
```

---

## The Files and What They Do

### 1. `index.html` - The Structure
**Think of it as:** The skeleton of your webpage

This file defines:
- Where the search box goes
- Where the map appears
- Where the info panels are
- All the buttons and text areas

**Key parts:**
- `<input id="dish-input">` - The text box where you type the dish name
- `<svg id="india-map">` - The empty container where the map will be drawn
- `<div id="commentary">` - Where the story text appears

---

### 2. `src/main.ts` - The Director
**Think of it as:** The conductor of an orchestra - it coordinates everything

This is the **entry point** - the code that runs first when the page loads.

**What it does:**
1. **Finds all the HTML elements** (buttons, text boxes, etc.)
   ```typescript
   dishInput = document.getElementById('dish-input')
   // This finds the search box and stores it in a variable
   ```

2. **Loads the map** when the page opens
   ```typescript
   await loadIndiaMap()  // Loads the map data
   renderMap(mapSvg)     // Draws the map on screen
   ```

3. **Listens for clicks** on buttons
   ```typescript
   cookBtn.addEventListener('click', handleCookClick)
   // When you click "Cook", it runs the handleCookClick function
   ```

4. **When you click "Cook":**
   - Gets the dish name you typed
   - Gets your API key
   - Calls the AI to get ingredients
   - Starts the animation

---

### 3. `src/map.ts` - The Map Drawer
**Think of it as:** The artist that draws the India map

**What it does:**

1. **Loads map data** (`loadIndiaMap()`)
   - Fetches `india.json` (a file with all Indian state boundaries)
   - Converts it from TopoJSON format to something D3.js can use
   - Calculates where each state is positioned

2. **Draws the map** (`renderMap()`)
   - Uses D3.js to draw each state as an SVG path
   - Each state gets an ID like `IN_01` (for state code 01)
   - States are drawn as gray shapes

3. **Helper functions:**
   - `getStateCentroid()` - Finds the center point of a state (for placing speech balloons)
   - `createCurvedPath()` - Creates a curved line between two points (for ingredient paths)

**Key concept:** SVG (Scalable Vector Graphics)
- SVG is like drawing with code instead of pixels
- You can zoom in forever and it stays sharp
- D3.js is a library that makes drawing SVG easier

---

### 4. `src/ai.ts` - The AI Communicator
**Think of it as:** The translator that talks to Google's AI

**What it does:**

1. **Builds a prompt** (`buildPrompt()`)
   - Creates a detailed question for the AI
   - Example: "What are the key ingredients of Hyderabadi Biryani and which Indian states do they come from?"

2. **Calls Gemini API** (`fetchDishIngredients()`)
   - Sends your API key and the prompt to Google's servers
   - Waits for the AI to respond
   - The AI returns JSON like:
     ```json
     {
       "dish": "Hyderabadi Biryani",
       "originCity": "Hyderabad",
       "originState": "Telangana",
       "ingredients": [
         {
           "ingredientName": "Basmati Rice",
           "stateName": "Punjab",
           "placeLabel": "Amritsar"
         }
       ]
     }
     ```

3. **Parses the response** - Converts the JSON into TypeScript objects

**Key concept:** API (Application Programming Interface)
- An API is like a waiter at a restaurant
- You give it an order (your request)
- It brings back food (the data you asked for)
- In this case, Google's Gemini API is the "waiter"

---

### 5. `src/animation.ts` - The Animation Engine
**Think of it as:** The movie director that creates the animated story

**What it does:**

1. **Prepares frames** (`prepareAnimation()`)
   - Takes the dish story from AI
   - Creates a sequence of "frames" (like movie frames)
   - Each frame has:
     - Which ingredient to show
     - When it starts and ends
     - What text to display

2. **Manages animation state**
   - `idle` - Nothing happening
   - `playing` - Animation is running
   - `paused` - Animation is stopped
   - `completed` - Animation finished

3. **The animation loop** (`updateAnimation()`)
   - Uses `d3.timer` to check every frame (60 times per second)
   - Figures out which frame should be showing right now
   - Updates the screen accordingly

4. **For each ingredient frame:**
   ```typescript
   // 1. Zoom into the source state
   zoomToState(fromCentroid)
   
   // 2. Show speech balloon
   showSpeechBalloon(position, ingredient, place, state, comment)
   
   // 3. Highlight the source state (orange)
   highlightState(fromStateId, true)
   
   // 4. Draw animated path from source to destination
   // Creates a curved line that "draws itself" using stroke-dashoffset
   ```

5. **Speech balloon typing** (`typeText()`)
   - Takes the full comment text
   - Uses a timer to add one character at a time
   - Creates the typing effect

**Key concepts:**

- **D3 Transitions:** Smooth animations between states
  ```typescript
  path.transition()
    .duration(1500)  // Takes 1.5 seconds
    .attr('stroke-dashoffset', 0)  // Animates from 1000 to 0
  ```

- **SVG Path Animation:** The "drawing" effect
  - Uses `stroke-dasharray` and `stroke-dashoffset`
  - Like revealing a line by erasing a mask

- **Zoom Transform:** D3's way of zooming
  - Calculates new position and scale
  - Applies it to the map group

---

### 6. `src/commentary.ts` - The Story Writer
**Think of it as:** The script writer that creates witty commentary

**What it does:**

- Takes ingredient data
- Generates playful, sarcastic commentary
- Uses templates with placeholders:
  ```typescript
  "From {state}, {ingredient} makes the journey..."
  // Becomes: "From Punjab, Basmati Rice makes the journey..."
  ```

---

### 7. `src/domain.ts` - The Data Models
**Think of it as:** The blueprint for what data looks like

Defines TypeScript **interfaces** (shapes of data):

```typescript
interface IngredientOrigin {
  ingredientName: string;  // "Basmati Rice"
  stateName: string;       // "Punjab"
  stateId: string;         // "IN_03"
  placeLabel: string;      // "Amritsar"
}
```

This tells TypeScript: "An ingredient must have these properties, and they must be strings."

---

### 8. `src/styles.css` - The Stylist
**Think of it as:** The fashion designer for your webpage

Defines:
- Colors (Hermes orange, beige background)
- Fonts (IBM Plex Mono)
- Layout (two columns, spacing)
- Animations (pulsing states, transitions)

---

## How It All Connects: Step by Step

### Step 1: Page Loads
```
index.html loads
  ↓
main.ts runs init()
  ↓
loadIndiaMap() fetches india.json
  ↓
renderMap() draws states on SVG
  ↓
Map appears on screen
```

### Step 2: User Clicks "Cook"
```
User types "Hyderabadi Biryani" and clicks button
  ↓
handleCookClick() runs
  ↓
fetchDishIngredients() sends request to Gemini API
  ↓
AI responds with ingredients and states
  ↓
prepareAnimation() creates frame sequence
  ↓
startAnimation() begins the timer loop
```

### Step 3: Animation Plays
```
Every 16ms (60fps), updateAnimation() runs
  ↓
Checks: "What frame should be showing now?"
  ↓
If new frame started:
  - Zoom to source state
  - Show speech balloon
  - Start typing animation
  - Highlight states
  - Draw path animation
  ↓
Updates screen
  ↓
Repeat until all frames done
```

---

## Key Libraries Used

### 1. **D3.js** (Data-Driven Documents)
- **What it does:** Makes it easy to manipulate SVG and create data visualizations
- **Why we use it:** 
  - Drawing the map
  - Creating animations
  - Handling zoom/pan
  - Managing transitions

### 2. **TopoJSON Client**
- **What it does:** Converts TopoJSON format to GeoJSON
- **Why we use it:** The `india.json` file is in TopoJSON format, but D3 needs GeoJSON

### 3. **Vite**
- **What it does:** Development server and build tool
- **Why we use it:** 
  - Runs a local server (`npm run dev`)
  - Converts TypeScript to JavaScript
  - Hot reload (refreshes when you change code)

---

## Important Concepts Explained Simply

### 1. **Async/Await**
```typescript
async function loadMap() {
  const data = await fetch('/india.json')
  // "Wait for the file to download before continuing"
}
```
- `async` = "This function might take time"
- `await` = "Wait here until this finishes"

### 2. **Event Listeners**
```typescript
button.addEventListener('click', doSomething)
```
- "When someone clicks this button, run this function"

### 3. **SVG Groups**
```typescript
const group = svg.append('g').attr('class', 'map-group')
```
- Groups are like folders - you can move/zoom everything inside together
- We put the map in a group so we can zoom the whole map at once

### 4. **D3 Selection**
```typescript
d3.select('#india-map')
```
- Like `document.getElementById()` but with superpowers
- Can chain operations: `.select().append().attr().transition()`

### 5. **State Management**
```typescript
context.state = 'playing'
```
- We track what the animation is doing
- Like a light switch: 'idle', 'playing', 'paused', 'completed'

---

## The Animation Magic Explained

### How the Path Drawing Works

1. **Create a path** (invisible, full length)
   ```typescript
   path.attr('stroke-dasharray', '1000')  // Pattern: 1000px visible, 1000px gap
   path.attr('stroke-dashoffset', '1000')  // Start offset: hide everything
   ```

2. **Animate the offset**
   ```typescript
   path.transition()
     .attr('stroke-dashoffset', 0)  // End offset: show everything
   ```

3. **Result:** The line appears to draw itself!

### How Zoom Works

1. **Calculate new position**
   ```typescript
   const scale = 2.5  // Zoom 2.5x
   const x = centerX - stateX * scale  // Move so state is centered
   ```

2. **Apply transform**
   ```typescript
   mapGroup.attr('transform', `translate(${x}, ${y}) scale(${scale})`)
   ```

3. **Animate it**
   ```typescript
   .transition().duration(800)  // Smooth 800ms animation
   ```

### How Typing Animation Works

```typescript
let index = 0
timer(() => {
  text.text(fullText.substring(0, index))  // Show first N characters
  index++
  if (index > fullText.length) timer.stop()
}, 25)  // Every 25ms
```

---

## Common Questions

**Q: Why TypeScript instead of JavaScript?**
- Catches errors before running
- Better code editor suggestions
- Makes code easier to understand

**Q: Why D3.js?**
- Industry standard for data visualization
- Powerful animation tools
- Great documentation

**Q: Why fetch from API in the browser?**
- No backend needed (simpler)
- User's API key stays in their browser
- Works as a static website

**Q: How does the map know where states are?**
- The `india.json` file contains coordinates
- D3's `geoPath` converts coordinates to SVG paths
- Each state is a complex path of points

---

## File Structure Summary

```
spice-routes/
├── index.html          → Webpage structure
├── src/
│   ├── main.ts        → Entry point, coordinates everything
│   ├── map.ts         → Loads and draws the map
│   ├── ai.ts          → Talks to Gemini API
│   ├── animation.ts   → Creates the animated story
│   ├── commentary.ts → Generates witty text
│   ├── domain.ts      → Defines data structures
│   └── styles.css     → All the styling
├── public/
│   └── india.json     → Map data (state boundaries)
└── package.json       → Dependencies and scripts
```

---

## Running the App

1. **Install dependencies:**
   ```bash
   npm install
   ```
   Downloads all the libraries (D3, TypeScript, etc.)

2. **Start development server:**
   ```bash
   npm run dev
   ```
   Starts a local server, usually at `http://localhost:5173`

3. **Build for production:**
   ```bash
   npm run build
   ```
   Converts TypeScript to JavaScript, optimizes everything

---

## Tips for Understanding the Code

1. **Start with `main.ts`** - It's the easiest to follow
2. **Read comments** - They explain what each function does
3. **Use browser DevTools** - Set breakpoints, see what variables contain
4. **Console.log** - Add `console.log()` to see what's happening
5. **One function at a time** - Don't try to understand everything at once

---

## Next Steps to Learn

If you want to modify the app:

1. **Change colors:** Edit `src/styles.css`
2. **Change commentary style:** Edit `src/commentary.ts`
3. **Adjust animation speed:** Edit `FRAME_DURATION` in `src/animation.ts`
4. **Add new features:** Start in `main.ts`, add event listeners

The code is well-organized, so you can modify one part without breaking others!
