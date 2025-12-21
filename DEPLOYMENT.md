# Deployment Guide for Vercel

This guide will help you deploy AuraStudy to Vercel.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Google Gemini API Key (get it from https://ai.google.dev/)
- This repository forked or cloned to your GitHub account

## Quick Deploy

### Option 1: One-Click Deploy

1. Click the "Deploy with Vercel" button in the README
2. Connect your GitHub account if not already connected
3. Select the repository to deploy
4. Configure environment variables (see below)
5. Click "Deploy"

### Option 2: Deploy from Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your AuraStudy repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
4. Add environment variables (see below)
5. Click "Deploy"

### Option 3: Deploy with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project directory:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No**
   - What's your project's name? **aurastudy** (or your preference)
   - In which directory is your code located? **./**
   - Want to override the settings? **No**

5. Add environment variables via CLI or dashboard (see below)

6. Deploy to production:
   ```bash
   vercel --prod
   ```

## Environment Variables

Add these environment variables in your Vercel project settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key | Primary API key variable |
| `API_KEY` | Your Gemini API key | Fallback API key variable |

### Adding Environment Variables

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - **Key**: `VITE_GEMINI_API_KEY`
   - **Value**: Your actual Gemini API key
   - **Environment**: All (Production, Preview, Development)
4. Repeat for `API_KEY`
5. Redeploy your project to apply the changes

### Getting Your Gemini API Key

1. Visit https://ai.google.dev/
2. Sign in with your Google account
3. Go to "Get API Key"
4. Create a new API key or use an existing one
5. Copy the API key and paste it in Vercel's environment variables

## Configuration Files

### vercel.json

The project includes a `vercel.json` configuration file that:
- Routes all requests to `index.html` for client-side routing
- Enables SPA (Single Page Application) mode

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### vite.config.ts

The Vite configuration is set up to:
- Use React plugin
- Set base path to `/`
- Output to `dist` directory
- Replace `process.env.API_KEY` with the actual environment variable value

## Deployment Verification

After deployment, verify that:

1. ✅ The app loads successfully
2. ✅ No console errors appear
3. ✅ The timer functions work
4. ✅ AI features work (quotes, subtasks) - requires valid API key
5. ✅ Ambient sounds play correctly
6. ✅ Theme switching works

## Troubleshooting

### Build Fails

**Issue**: Build fails with dependency errors
**Solution**: Ensure `package.json` has no conflicting dependencies

**Issue**: Build fails with TypeScript errors
**Solution**: Check `tsconfig.json` and ensure all types are properly defined

### App Doesn't Load

**Issue**: Blank page after deployment
**Solution**: Check browser console for errors, verify `vercel.json` routing

**Issue**: 404 errors on page refresh
**Solution**: Ensure `vercel.json` has the rewrite rule for SPA routing

### AI Features Not Working

**Issue**: Quotes or subtasks don't generate
**Solution**: 
- Verify `VITE_GEMINI_API_KEY` or `API_KEY` is set in Vercel
- Check API key is valid and has quota available
- Check browser console for API errors

### Environment Variables Not Working

**Issue**: Environment variables seem undefined
**Solution**:
- Redeploy after adding environment variables
- Ensure variable names match exactly (case-sensitive)
- Use both `VITE_GEMINI_API_KEY` and `API_KEY` for compatibility

## Custom Domain (Optional)

To add a custom domain:

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Add your domain name
4. Follow Vercel's instructions to configure DNS

## Continuous Deployment

Vercel automatically:
- Deploys every push to your `main` branch to production
- Creates preview deployments for pull requests
- Rebuilds when you push changes

To disable auto-deployment:
1. Go to "Settings" → "Git"
2. Configure deployment branches

## Performance Tips

1. **Enable Edge Caching**: Already configured via Vercel's defaults
2. **Image Optimization**: Consider using Vercel's Image Optimization
3. **Environment-Specific Builds**: Use different API keys for preview vs production
4. **Analytics**: Enable Vercel Analytics in project settings

## Support

- Vercel Documentation: https://vercel.com/docs
- Vite Documentation: https://vitejs.dev/
- Report issues: https://github.com/MuhammadHammad9/AuraStudy/issues
