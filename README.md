<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AuraStudy - Aesthetic Focus Clock

A minimalist, ambient focus environment with AI-powered coaching and spatial soundscapes built with React, TypeScript, and Vite.

View your app in AI Studio: https://ai.studio/apps/drive/1ruBByjq3acXC-PBcExa3GTbLZnRS0eGU

## Features

- 🎯 Pomodoro timer with customizable durations
- 🤖 AI-powered motivational quotes and task breakdown (powered by Google Gemini)
- 🎨 Multiple aesthetic themes (Forest, Mountain, Ocean, Space, City, Cyber, Zen, Attic, Aurora)
- 🎵 Ambient soundscapes (Rain, Lofi, Fire, Forest, Waves, Classical, Jazz)
- ✅ Task management with subtask generation
- 📊 Progress tracking and statistics

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Gemini API Key** - Get yours from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MuhammadHammad9/AuraStudy.git
   cd AuraStudy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Then edit `.env.local` and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173` (or another port if 5173 is taken)

5. **Build for production**
   ```bash
   npm run build
   ```
   
   The production build will be in the `dist/` directory.

6. **Preview production build**
   ```bash
   npm run preview
   ```

## Deployment to Vercel

This app is optimized for deployment on Vercel:

1. **Push your code to GitHub** (if not already done)

2. **Import project to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Configure environment variables**
   - In Vercel project settings, add the environment variable:
     - `VITE_GEMINI_API_KEY` or `API_KEY` with your Gemini API key

4. **Deploy**
   - Vercel will automatically detect the Vite configuration
   - The `vercel.json` file is already configured for SPA routing
   - Deploy will happen automatically on every push to the main branch

### Manual Vercel Deployment

Alternatively, you can deploy using Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel
```

## Project Structure

```
AuraStudy/
├── components/          # React components
│   ├── ErrorBoundary.tsx
│   └── ShinyText.tsx
├── services/           # API and external services
│   └── gemini.ts       # Gemini AI integration
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── index.html          # HTML template
├── constants.ts        # App constants and configurations
├── types.ts            # TypeScript type definitions
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── vercel.json         # Vercel deployment configuration
└── package.json        # Project dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Google Gemini AI** - AI-powered features
- **Tailwind CSS** - Styling (via CDN)
- **Lucide React** - Icons

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key (Vite standard) | Yes |
| `API_KEY` | Fallback for Gemini API key (Vercel standard) | No (fallback) |

## Troubleshooting

- **API Key Issues**: Make sure your `.env.local` file is in the root directory and contains a valid Gemini API key
- **Build Errors**: Clear `node_modules` and `package-lock.json`, then run `npm install` again
- **Port Conflicts**: If port 5173 is in use, Vite will automatically use the next available port

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
