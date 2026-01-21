# Cache & District Functionality

## ✅ What's Fixed

### 1. JSON File-Based Caching
- **Location:** 
  - Vercel (production): `/tmp/dish-cache.json` (writable directory)
  - Local dev: `.cache/dish-cache.json` (in project root)
- **TTL:** 7 days
- **Auto-cleanup:** Old entries are removed automatically
- **How it works:**
  - Every search checks cache first
  - If found and not expired → returns cached result immediately
  - If not found → calls Gemini API, resolves districts, saves to cache

### 2. District Resolution & Highlighting
- **Backend:** Resolves `districtName` for each ingredient using Gemini
- **Frontend:** Resolves `districtId` from `districtName` using fuzzy matching
- **Animation:** Highlights districts in orange during animation and final view

## 🔍 How Districts Work

1. **Backend (`api/dish.ts`):**
   - Loads `public/state2district_list.json`
   - For each ingredient, calls Gemini to identify exact district
   - Returns `districtName` (e.g., "Amritsar", "Guntur")

2. **Frontend (`src/api-client.ts`):**
   - Receives `districtName` from backend
   - Uses `findDistrictByName()` to match district name to district ID
   - Fuzzy matching handles variations (e.g., "Amritsar District" → "Amritsar")

3. **Animation (`src/animation.ts`):**
   - Uses `districtId` to highlight districts
   - Shows district highlight during ingredient animation
   - Keeps districts highlighted in final view (orange color)

## 📁 Cache File Structure

```json
{
  "hyderabadi biryani": {
    "data": {
      "dish": "Hyderabadi Biryani",
      "originCity": "Hyderabad",
      "originState": "Telangana",
      "ingredients": [
        {
          "ingredientName": "Basmati Rice",
          "stateName": "Punjab",
          "districtName": "Amritsar",
          "districtId": "123",
          ...
        }
      ]
    },
    "timestamp": 1234567890000
  }
}
```

## 🐛 Debugging

### Check if districts are being resolved:
- Open browser console
- Look for: `Resolved district: [name] -> [id]`
- Or: `Could not resolve district: [name]`

### Check cache:
- Local: `.cache/dish-cache.json`
- Vercel: Check function logs for cache save/load messages

### If districts not highlighting:
1. Check console for district resolution warnings
2. Verify `districtName` is in the response from backend
3. Check that `findDistrictByName()` is finding matches
4. Verify district IDs exist in the map data

## 📝 Notes

- Cache persists across serverless function invocations (in `/tmp` on Vercel)
- District matching is case-insensitive and handles common variations
- If district can't be resolved, falls back to state-level highlighting
- Cache is automatically cleaned of expired entries (>7 days)
