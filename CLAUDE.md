# Bible Cross Reference App - Developer Guidelines

## Commands
- `npm start` - Run development server
- `npm run build` - Build production bundle
- `npm test` - Run all tests
- `npm test -- --testPathPattern=ComponentName` - Run specific test
- `npm run server` - Run backend server
- `npm run deploy` - Deploy to GitHub Pages

## Code Style Guidelines
- **Imports**: Group imports by type (React, 3rd-party, components, utils)
- **Components**: Use functional components with React hooks
- **Naming**: PascalCase for components, camelCase for variables/functions
- **CSS**: Use Tailwind CSS utilities with `className`
- **UI Components**: Reuse components from `src/components/ui/`
- **Utilities**: Use utility functions from `src/lib/utils.js`
- **Error Handling**: Use try/catch blocks with comprehensive error messages
- **Conditional Rendering**: Use ternary operators for simple conditionals
- **Testing**: Write Jest tests with React Testing Library
- **Formatting**: Use consistent spacing (2 spaces), proper indentation