# Contributing to AuraStudy

Thank you for your interest in contributing to AuraStudy! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AuraStudy.git
   cd AuraStudy
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your Gemini API key
   ```

## Development Workflow

1. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and test them:
   ```bash
   npm run dev          # Start development server
   npm run type-check   # Check TypeScript types
   npm run build        # Test production build
   ```

3. **Commit your changes** with a descriptive message:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

## Commit Message Convention

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style

- Use TypeScript for all new files
- Follow the existing code structure and naming conventions
- Keep components small and focused
- Add comments for complex logic
- Ensure your code passes TypeScript type checking

## Testing

Before submitting a PR:

1. Run `npm run type-check` to ensure no TypeScript errors
2. Run `npm run build` to ensure the production build works
3. Test your changes in the browser with `npm run dev`

## Areas for Contribution

- **Features**: New timer modes, themes, sound effects
- **UI/UX**: Design improvements, animations, accessibility
- **Documentation**: Improve README, add tutorials
- **Bug fixes**: Fix issues from the issue tracker
- **Performance**: Optimize rendering, reduce bundle size

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Suggestions for improvements

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).
