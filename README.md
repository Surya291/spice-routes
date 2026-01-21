# How did half of India end up in this one plate?

An animated storytelling web app that visualizes how ingredients from different Indian regions converge into a single dish.

## Overview

This app takes a dish name, uses AI (Gemini Flash) to identify its key ingredients and their Indian state origins, and animates an SVG map showing those ingredients "travelling" from their source regions to the dish's origin city—with playful, sarcastic commentary.

## Features

- **State-level visualization**: Clean SVG map of India with state boundaries
- **Animated ingredient flows**: Curved paths showing ingredients converging to the dish origin
- **AI-powered ingredient inference**: Uses Gemini Flash API to identify ingredients and their regions
- **Playful commentary**: Witty, fast-paced narration in the style of "history of the entire world, i guess"
- **Interactive controls**: Play, pause, replay, and skip to final view

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

5. Enter your Gemini API key in the input field (it stays in your browser, never sent anywhere else)

## Usage

1. Enter your **Gemini API key** in the top input field
2. Type a dish name (e.g., "Hyderabadi Biryani", "Masala Dosa", "Filter Coffee")
3. Click **"Cook the Story"** or use one of the sample dish buttons
4. Watch as ingredients animate from their source states to the dish's origin
5. Use the controls to play, pause, replay, or skip to the final view

## Tech Stack

- **Vanilla TypeScript** - No framework, just clean TS
- **D3.js** - For SVG rendering, projections, and animations
- **TopoJSON** - India state-level map data
- **Vite** - Development server and build tool
- **Gemini Flash API** - For ingredient inference

## Project Structure

```
spice-routes/
├── src/
│   ├── main.ts          # App bootstrap and event handling
│   ├── domain.ts        # TypeScript types
│   ├── map.ts           # Map loading and state utilities
│   ├── ai.ts            # Gemini API integration
│   ├── animation.ts     # D3.js animation engine
│   ├── commentary.ts    # Commentary generation
│   └── styles.css       # Styling
├── public/
│   └── india.json       # TopoJSON India map (state-level)
├── index.html
├── package.json
└── tsconfig.json
```

## API Key Security

**Important**: This app makes API calls directly from the browser. Your API key is:
- Stored only in browser memory (not persisted)
- Never sent to any server except Google's Gemini API
- Suitable for personal/demo use only

**Do not deploy this publicly with an exposed API key.** For production, you'd need a backend proxy.

## Limitations

- **State-level only**: Visualizations are at state granularity (not districts)
- **Approximate accuracy**: Ingredient origins are AI-inferred, not historically rigorous
- **No backend**: All processing happens in the browser
- **No user accounts**: Stateless, single-session use

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT - Feel free to use and modify as needed.

## Credits

- India map data: [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data)
- Inspired by etymology visualization apps
