# Quick Start - Fix "API_REQUEST_FAILED" Error

## The Problem

You're seeing `API_REQUEST_FAILED:_NOT_FOUND` because the backend API isn't running locally.

## Solution: Run the Backend API

You need **two terminals** running:

### Terminal 1: Backend API
```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Start the backend API
vercel dev
```

This will:
- Start the API server on `http://localhost:3000`
- Load your `.env` file automatically
- Make `/api/dish` and `/api/suggestions` available

### Terminal 2: Frontend
```bash
npm run dev
```

## Verify It's Working

1. Check Terminal 1 shows: `Ready! Available at http://localhost:3000`
2. Check Terminal 2 shows: Vite dev server running
3. Try searching for a dish in the app

## Your .env File

Make sure your `.env` file has:
```
GEMINI_API_KEY=your_actual_api_key_here
```

## Alternative: Deploy to Vercel

If you don't want to run locally, deploy to Vercel:

1. Push code to GitHub
2. Import in Vercel dashboard
3. Add `GEMINI_API_KEY` environment variable
4. Deploy!

Then the API will work automatically.

## Still Having Issues?

1. **Check `.env` file exists** in the root directory
2. **Verify API key** is correct (get from https://aistudio.google.com/app/apikey)
3. **Check `vercel dev` is running** and shows no errors
4. **Check browser console** for detailed error messages
