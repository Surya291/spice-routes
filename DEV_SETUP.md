# Development Setup Guide

## Quick Start

### Option 1: Run Backend Locally (Recommended for Development)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Start the backend API:**
   ```bash
   vercel dev
   ```
   This will start the serverless functions on `http://localhost:3000`

3. **In a separate terminal, start the frontend:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Frontend: `http://localhost:5173` (or the port Vite shows)
   - API: `http://localhost:3000/api/*`

### Option 2: Use Production API (For Testing)

If you've already deployed to Vercel:

1. **Set the API URL in `.env.local`:**
   ```bash
   VITE_API_URL=https://your-project.vercel.app/api
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

**For local development with `vercel dev`:**
- The `.env` file will be automatically loaded
- Make sure `GEMINI_API_KEY` is set

**For Vercel deployment:**
- Set `GEMINI_API_KEY` in Vercel dashboard → Project Settings → Environment Variables

## Troubleshooting

### "API_ENDPOINT_NOT_FOUND" Error

**Solution:** Run `vercel dev` in a separate terminal to start the backend API.

### "NETWORK_ERROR" 

**Solution:** 
1. Make sure `vercel dev` is running
2. Check that the API is accessible at `http://localhost:3000/api/dish`
3. Verify your `.env` file has `GEMINI_API_KEY` set

### API Returns 500 Error

**Solution:**
1. Check that `GEMINI_API_KEY` is set correctly in `.env`
2. Verify the API key is valid at https://aistudio.google.com/
3. Check `vercel dev` terminal for error logs

## Development Workflow

1. **Terminal 1:** `vercel dev` (backend API)
2. **Terminal 2:** `npm run dev` (frontend)
3. **Browser:** Open the Vite dev server URL

## Notes

- The backend API uses serverless functions that only work with Vercel
- For local development, you **must** run `vercel dev`
- The frontend will automatically connect to the local API when running `vercel dev`
- API routes are at `/api/dish` and `/api/suggestions`
