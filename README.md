<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AuraStudy - Aesthetic Focus Clock

A minimalist, ambient focus environment with AI-powered coaching and spatial soundscapes.

## Run Locally

**Prerequisites:** Node.js (v18 or higher recommended)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your Gemini API key (get one from [Google AI Studio](https://aistudio.google.com/app/apikey))

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MuhammadHammad9/AuraStudy)

### Manual Deploy

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign in with GitHub
3. Click "New Project" and import this repository
4. Add your environment variable:
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key
5. Click "Deploy"

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Google Gemini AI
