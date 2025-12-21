<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AuraStudy - Aesthetic Focus Clock

A minimalist, ambient focus environment with AI-powered coaching and spatial soundscapes to enhance your productivity and study sessions.

View your app in AI Studio: https://ai.studio/apps/drive/1ruBByjq3acXC-PBcExa3GTbLZnRS0eGU

> **🚀 New to the project?** Check out the [Quick Start Guide](QUICKSTART.md) to get up and running in 3 minutes!

## ✨ Features

- 🎯 Pomodoro timer with customizable intervals
- 🤖 AI-powered motivational quotes and task management
- 🎵 Ambient soundscapes mixer (rain, lofi, fire, forest, jazz, waves, classical)
- 📋 Task management with subtask generation
- 🎨 Beautiful themes with glassmorphism design
- 📊 Session tracking and progress visualization

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Google Gemini API Key** - Get yours at [Google AI Studio](https://ai.google.dev/)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MuhammadHammad9/AuraStudy.git
   cd AuraStudy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Open `.env.local` and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Preview production build:**
   ```bash
   npm run preview
   ```

## 🌐 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MuhammadHammad9/AuraStudy)

### Manual Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel:**
   
   In your Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add the following variables:
     - `VITE_GEMINI_API_KEY` = your Gemini API key
     - `API_KEY` = your Gemini API key (alternative)

### Environment Variables for Vercel

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for AI features | Yes |
| `API_KEY` | Alternative API key variable (fallback) | Optional |

## 📁 Project Structure

```
AuraStudy/
├── components/           # React components
│   ├── ErrorBoundary.tsx
│   └── ShinyText.tsx
├── services/            # API services
│   └── gemini.ts       # Gemini AI integration
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── index.html          # HTML template
├── constants.ts        # App constants and configuration
├── types.ts            # TypeScript type definitions
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── vercel.json         # Vercel deployment configuration
├── package.json        # Project dependencies
└── README.md           # This file
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## 🔧 Configuration

### Vite Configuration

The project uses Vite for fast development and optimized builds. Configuration is in `vite.config.ts`.

### Vercel Configuration

The `vercel.json` file configures routing for the SPA. All routes are rewritten to `index.html` to support client-side routing.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with React, Vite, and TypeScript
- AI powered by Google Gemini
- Icons from Lucide React
- Styled with Tailwind CSS
