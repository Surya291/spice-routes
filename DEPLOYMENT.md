# Deployment Guide for SPICE.ROUTES

This guide will help you deploy the app to Vercel (or other platforms).

## Prerequisites

1. A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. A Vercel account (free tier works fine)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Code

1. **Set up environment variables locally:**
   ```bash
   cp env.example .env
   ```
   
2. **Edit `.env` and add your Gemini API key:**
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Test locally (optional):**
   ```bash
   npm install
   npm run build
   npm run preview
   ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time)
   - Project name: **spice-routes** (or your choice)
   - Directory: **./** (current directory)
   - Override settings? **No**

4. **Set environment variable:**
   ```bash
   vercel env add GEMINI_API_KEY
   ```
   
   When prompted, paste your Gemini API key.

5. **Redeploy with environment variable:**
   ```bash
   vercel --prod
   ```

### Option B: Deploy via Vercel Dashboard

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Go to [vercel.com](https://vercel.com) and sign in**

3. **Click "Add New Project"**

4. **Import your repository**

5. **Configure the project:**
   - Framework Preset: **Vite**
   - Root Directory: **./** (leave as default)
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. **Add Environment Variable:**
   - Go to Project Settings → Environment Variables
   - Add: `GEMINI_API_KEY` = `your_api_key_here`

7. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

## Step 3: Verify Deployment

1. Visit your deployed URL
2. Try searching for a dish (e.g., "Hyderabadi Biryani")
3. Check browser console for any errors
4. Verify that the API calls are working

## Troubleshooting

### API Key Issues

- **Error: "GEMINI_API_KEY not configured"**
  - Make sure you added the environment variable in Vercel
  - Redeploy after adding the variable
  - Check that the variable name is exactly `GEMINI_API_KEY`

### Build Errors

- **TypeScript errors:**
  ```bash
  npm install
  npm run build
  ```
  Fix any TypeScript errors locally before deploying

- **Missing dependencies:**
  Make sure `@vercel/node` is in `package.json` dependencies

### CORS Issues

- The API functions already include CORS headers
- If you see CORS errors, check that the API routes are correctly configured in `vercel.json`

### Cache Issues

- The cache is in-memory and resets on each serverless function cold start
- For production, consider using Vercel KV or Redis for persistent caching

## Alternative Hosting Options

### Netlify

1. Similar to Vercel, supports serverless functions
2. Use `netlify.toml` instead of `vercel.json`
3. Add environment variables in Netlify dashboard

### Railway

1. Deploy as a Node.js app
2. Set environment variables in Railway dashboard
3. May need to adjust API routes structure

### Render

1. Deploy as a static site + API
2. Configure environment variables
3. May need to adjust serverless function structure

## Security Notes

- ✅ API key is stored server-side only
- ✅ CORS is configured for your domain
- ✅ API routes validate input
- ✅ Cache prevents excessive API calls
- ⚠️ Consider rate limiting for production
- ⚠️ Consider adding authentication if needed

## Cost Estimation

- **Vercel Free Tier:**
  - 100GB bandwidth/month
  - Serverless function execution time limits
  - Should be sufficient for personal/small projects
  
- **Gemini API:**
  - Check current pricing at [Google AI Studio](https://aistudio.google.com/)
  - Free tier available with usage limits

## Next Steps

1. **Custom Domain:** Add your domain in Vercel project settings
2. **Analytics:** Enable Vercel Analytics for usage tracking
3. **Monitoring:** Set up error tracking (e.g., Sentry)
4. **Caching:** Consider upgrading to Vercel KV for persistent cache

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Test API endpoints directly using curl or Postman
