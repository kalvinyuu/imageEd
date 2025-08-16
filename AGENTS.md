# Agent Configuration for ImageEd Project

## Build/Lint/Test Commands

```bash
# Development server
bun run dev

# Build for production
bun run build

# Serve production build
bun run serve
```

Note: This project currently doesn't have configured test commands. Tests would need to be added first.

## Code Style Guidelines

### Imports
- Use relative imports for local files (e.g., `import ImageEditor from './imageEd'`)
- Import React types explicitly when needed (e.g., `import type React from "react"`)
- Group imports logically: external libraries, then local imports

### Formatting
- Use 2 space indentation
- No semicolons
- Use double quotes for JSX attributes and string literals
- Place opening braces on the same line as the statement
- Use PascalCase for components and camelCase for variables/functions

### Types
- Use TypeScript for all files
- Define types for props and state
- Use explicit type annotations for function parameters and return types
- Use `useRef` with proper generic types (e.g., `useRef<HTMLCanvasElement>(null)`)

### Naming Conventions
- Component names: PascalCase
- Variables and functions: camelCase
- Constants: UPPER_SNAKE_CASE
- File names: camelCase with .tsx extension for components

### Error Handling
- Use TypeScript's strict mode to catch errors at compile time
- Handle potential null/undefined values with optional chaining or explicit checks
- Use useCallback for event handlers and memoized functions

### React Patterns
- Use functional components with hooks
- Use useCallback for performance optimization of event handlers
- Use useRef for direct DOM access (e.g., canvas elements)
- Use useState for component state management
- Follow the single responsibility principle for components

### CSS/Styling
- Use inline styles with style objects for dynamic styling
- Define reusable style objects as constants
- Use Tailwind CSS classes where appropriate
- Use CSS variables for consistent theming

### Project Structure
- Components in src/ directory
- Main entry point: src/index.tsx
- Use .tsx extension for files with JSX
- Keep component files focused and small