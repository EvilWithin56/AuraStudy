# AuraStudy - Quick Reference Guide

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/MuhammadHammad9/AuraStudy.git
cd AuraStudy

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local and add your Gemini API key

# Start development server
npm run dev
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at http://localhost:5173 |
| `npm run build` | Build for production (output in `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
API_KEY=your_gemini_api_key_here  # Fallback
```

Get your API key: https://aistudio.google.com/app/apikey

## 📁 Project Structure

```
AuraStudy/
├── components/          # React components
│   ├── ErrorBoundary.tsx
│   └── ShinyText.tsx
├── services/           # External services
│   └── gemini.ts       # Gemini AI integration
├── .vscode/           # VS Code configuration
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── index.html         # HTML template
├── constants.ts       # App constants (themes, sounds)
├── types.ts           # TypeScript type definitions
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── vercel.json        # Vercel deployment config
└── package.json       # Project dependencies
```

## 🎨 Features

- **Pomodoro Timer**: Customizable focus and break periods
- **AI Integration**: Powered by Google Gemini
  - Motivational quotes
  - Task breakdown
  - Smart aura suggestions
- **Multiple Themes**: 10 aesthetic environments
- **Ambient Sounds**: 7 layerable soundscapes
- **Task Management**: With AI-powered subtask generation
- **Progress Tracking**: Session statistics

## 🌐 Deployment to Vercel

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/MuhammadHammad9/AuraStudy)

### Manual Deploy
1. Push your code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variable: `VITE_GEMINI_API_KEY` or `API_KEY`
4. Deploy!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🛠️ Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript
- ES7+ React/Redux/React-Native snippets

Extensions are automatically suggested when you open the project in VS Code.

## 📝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 🐛 Troubleshooting

### Build fails
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type errors
```bash
# Run type checking
npm run type-check
```

### API Key not working
- Ensure `.env.local` exists in root directory
- Verify API key is valid at https://aistudio.google.com/
- Remember: Vite requires `VITE_` prefix for client-side env vars

### Dev server won't start
```bash
# Check if port 5173 is in use
lsof -i :5173
# Kill the process if needed
kill -9 <PID>
```

## 📚 Documentation

- [README.md](./README.md) - Main documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [LICENSE](./LICENSE) - MIT License

## 🔗 Useful Links

- **AI Studio**: https://ai.studio/apps/drive/1ruBByjq3acXC-PBcExa3GTbLZnRS0eGU
- **Gemini API**: https://aistudio.google.com/app/apikey
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Repository**: https://github.com/MuhammadHammad9/AuraStudy

## 🎯 Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (CDN)
- **AI**: Google Gemini
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

**Happy Coding! 🚀**
