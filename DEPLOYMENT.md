# Vercel Deployment Guide for AuraStudy

This guide will help you deploy AuraStudy to Vercel.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MuhammadHammad9/AuraStudy)

## Manual Deployment

### Prerequisites

- A [Vercel account](https://vercel.com/signup) (free)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- Your repository on GitHub

### Step-by-Step Instructions

#### 1. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Click "Import"

#### 2. Configure Build Settings

Vercel should automatically detect the Vite configuration. Verify these settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 3. Add Environment Variables

In the Vercel project settings:

1. Go to "Settings" → "Environment Variables"
2. Add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key | Production, Preview, Development |
| `API_KEY` | Your Gemini API key (fallback) | Production, Preview, Development |

**Note**: At least one of these environment variables must be set for the app to work.

#### 4. Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be live at `https://your-project-name.vercel.app`

## Configuration Files

### vercel.json

The repository includes a `vercel.json` file that handles SPA routing:

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

This ensures all routes are properly handled by the React Router (if added later) or the SPA.

### Environment Variables in Vite

The `vite.config.ts` is configured to replace `process.env.API_KEY` with the actual API key during build:

```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY || '')
}
```

## Automatic Deployments

Once set up, Vercel will automatically:

- Deploy every push to the `main` branch to production
- Create preview deployments for pull requests
- Deploy all branches (can be configured in settings)

## Custom Domain

To add a custom domain:

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### API Key Issues

- Ensure `VITE_GEMINI_API_KEY` or `API_KEY` is set in environment variables
- Check that the API key is valid at [Google AI Studio](https://aistudio.google.com/)
- Remember that Vite environment variables must be prefixed with `VITE_` to be exposed to the client

### App Not Loading

- Check browser console for errors
- Verify the `vercel.json` is in the root directory
- Ensure the build output is in the `dist` directory

## Local Preview of Production Build

To test the production build locally:

```bash
npm run build
npm run preview
```

This will start a local server serving the production build.

## Vercel CLI Deployment

You can also deploy using the Vercel CLI:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

## Environment-Specific Builds

Vercel provides different environments:

- **Production**: Deployed from the main branch
- **Preview**: Deployed from pull requests or other branches
- **Development**: Local development with `vercel dev`

Each environment can have different environment variables.

## Performance Optimization

Vercel automatically optimizes your app:

- ✓ Automatic CDN distribution
- ✓ Gzip compression
- ✓ HTTP/2 support
- ✓ Edge caching
- ✓ Automatic HTTPS

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Open an issue](https://github.com/MuhammadHammad9/AuraStudy/issues) for project-specific questions
