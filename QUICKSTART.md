# Quick Start Guide

Get AuraStudy running in 3 minutes!

## For Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.local.example .env.local

# 3. Add your API key to .env.local
# Edit .env.local and replace 'your_api_key_here' with your actual Gemini API key

# 4. Start development server
npm run dev

# 5. Open http://localhost:5173 in your browser
```

## For Vercel Deployment

### Option 1: One-Click (Fastest)
1. Click the "Deploy with Vercel" button in README
2. Add `VITE_GEMINI_API_KEY` in environment variables
3. Deploy!

### Option 2: From Dashboard
1. Go to https://vercel.com/new
2. Import this repository
3. Add environment variables:
   - `VITE_GEMINI_API_KEY` = your_api_key
   - `API_KEY` = your_api_key
4. Deploy!

### Option 3: Via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

## Get Your API Key

1. Visit https://ai.google.dev/
2. Sign in with Google
3. Create API key
4. Copy and paste into environment variables

## Verify Everything Works

### Local Development
- [ ] Server starts at http://localhost:5173
- [ ] Page loads without errors
- [ ] Console shows no errors

### Production Build
```bash
npm run build
npm run preview
```
- [ ] Build succeeds
- [ ] Preview works at http://localhost:4173

### Vercel Deployment
- [ ] Deployment succeeds
- [ ] Site loads
- [ ] No console errors

## Troubleshooting

**Build fails?**
- Run `npm install` again
- Check Node.js version (need v18+)

**API not working?**
- Verify API key is set correctly
- Check key has quota remaining
- Redeploy after adding env vars (Vercel)

**Need Help?**
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guide
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup
- Check [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for known problems

## What's Next?

The app currently shows a placeholder screen. To get the full functionality:
1. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) about App.tsx
2. Restore complete implementation from AI Studio
3. Or contribute to building it out!

Happy coding! 🚀
