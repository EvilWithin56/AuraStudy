# Contributing to AuraStudy

Thank you for your interest in contributing to AuraStudy! This document provides guidelines and instructions for setting up your development environment and contributing to the project.

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git
- A code editor (VS Code recommended)
- Google Gemini API key (for AI features)

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AuraStudy.git
   cd AuraStudy
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The app will be available at http://localhost:5173

5. **Build for Production**
   ```bash
   npm run build
   ```

6. **Preview Production Build**
   ```bash
   npm run preview
   ```

## Project Structure

```
AuraStudy/
├── components/          # React components
│   ├── ErrorBoundary.tsx
│   └── ShinyText.tsx
├── services/           # API services
│   └── gemini.ts      # Gemini AI integration
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── index.html         # HTML template
├── constants.ts       # App constants and themes
├── types.ts           # TypeScript type definitions
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
└── vercel.json        # Vercel deployment config
```

## Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use functional components over class components
- Keep components small and focused
- Use meaningful variable and function names
- Add comments for complex logic

### Component Guidelines

- Components should be in the `components/` directory
- One component per file
- Use PascalCase for component names
- Export component as default

Example:
```tsx
// components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return <div>{title}</div>;
};

export default MyComponent;
```

### State Management

- Use React hooks (useState, useEffect, useCallback, useMemo)
- Keep state as local as possible
- Use localStorage for persistence when needed
- Prefix localStorage keys with 'aura_'

### API Integration

- All Gemini AI calls should go through `services/gemini.ts`
- Handle errors gracefully with fallback values
- Use try-catch blocks for async operations

### Styling

- Use Tailwind CSS utility classes
- Follow the existing glassmorphism design language
- Use CSS-in-JS for dynamic styles
- Maintain the dark theme aesthetic

### Testing

Currently, the project doesn't have automated tests. When adding tests:
- Use Jest and React Testing Library
- Test user interactions and component behavior
- Mock API calls
- Aim for meaningful test coverage

## Making Changes

### Branch Naming

- Feature: `feature/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`

Example:
```bash
git checkout -b feature/add-countdown-mode
```

### Commit Messages

Use clear, descriptive commit messages:
- `feat: Add new timer mode`
- `fix: Resolve audio playback issue`
- `docs: Update README with new features`
- `style: Improve button hover effects`
- `refactor: Simplify timer logic`

### Pull Request Process

1. Create a new branch from `main`
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Commit your changes with clear messages
6. Push to your fork
7. Open a Pull Request

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Changes have been tested locally
- [ ] Documentation has been updated
- [ ] No console errors or warnings
```

## Known Issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for current known issues.

### App.tsx Incomplete

The `App.tsx` file is currently incomplete. If you have access to the original implementation from AI Studio, contributions to restore it would be greatly appreciated!

## Feature Requests

Feature requests are welcome! Please:
1. Check existing issues first
2. Create a new issue with the "enhancement" label
3. Describe the feature and use case
4. Wait for discussion before implementing

## Bug Reports

When reporting bugs:
1. Check if the issue already exists
2. Provide steps to reproduce
3. Include browser/OS information
4. Add screenshots if applicable
5. Mention any console errors

## Questions?

If you have questions:
- Check the README and documentation first
- Search existing issues
- Create a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Thank You!

Your contributions help make AuraStudy better for everyone. Thank you for taking the time to contribute!
