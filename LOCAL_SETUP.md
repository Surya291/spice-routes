# 🚀 Local Development Setup

## Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Backend API (Terminal 1)
```bash
# Install Vercel CLI globally (first time only)
npm install -g vercel

# Or use npx (no install needed)
npx vercel dev
```

When prompted:
- **Link to existing project?** → Type `N` (No) for first time
- It will create a local `.vercel` folder (already in .gitignore)

This starts the API server on `http://localhost:3000`

### Step 3: Start Frontend (Terminal 2)
```bash
npm run dev
```

This starts the frontend on `http://localhost:5173` (or similar port)

## ✅ Verify It's Working

1. **Check Terminal 1** shows:
   ```
   > Ready! Available at http://localhost:3000
   ```

2. **Check Terminal 2** shows:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

3. **Open browser** to `http://localhost:5173`

4. **Test the app:**
   - Try searching for "Hyderabadi Biryani"
   - Should work without errors!

## 📁 File Structure

```
spice-routes/
├── .env                    # ✅ Your API key (already exists)
├── api/
│   ├── dish.ts            # Backend API endpoint
│   └── suggestions.ts     # Suggestions endpoint
├── src/
│   ├── api-client.ts      # Frontend API client
│   └── main.ts            # App entry point
└── package.json
```

## 🔧 Troubleshooting

### "vercel: command not found"
```bash
# Option 1: Install globally
npm install -g vercel

# Option 2: Use npx (no install)
npx vercel dev
```

### "GEMINI_API_KEY not configured"
- Check `.env` file exists in root directory
- Make sure it has: `GEMINI_API_KEY=your_key_here`
- Restart `vercel dev` after editing `.env`

### "API_ENDPOINT_NOT_FOUND"
- Make sure `vercel dev` is running in Terminal 1
- Check it shows "Ready! Available at http://localhost:3000"
- Make sure frontend is running in Terminal 2

### Port conflicts
- If port 3000 is taken, Vercel will use a different port
- Check the terminal output for the actual port
- Update `vite.config.ts` proxy target if needed

## 🎯 What's Running Where?

- **Backend API:** `http://localhost:3000/api/*`
- **Frontend:** `http://localhost:5173`
- **API Endpoints:**
  - `POST /api/dish` - Analyze a dish
  - `GET /api/suggestions` - Get suggestions

## 📝 Quick Commands

```bash
# Terminal 1: Backend
vercel dev

# Terminal 2: Frontend
npm run dev

# Build for production
npm run build
```

## ✨ You're All Set!

Once both terminals are running, the app should work perfectly. The frontend automatically proxies API requests to the backend.
