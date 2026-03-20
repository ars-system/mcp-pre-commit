# Contributing to MCP Pre-commit Manager

First off, thank you for considering contributing to MCP Pre-commit Manager! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by respect and professionalism. Please be kind and courteous to all contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, commands, etc.)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternative solutions** you've considered

### Pull Requests

1. Fork the repository and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code follows the existing code style
4. Update the documentation (README.md, etc.) as needed
5. Write a clear commit message describing your changes

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/ars-system/mcp-pre-commit.git
cd mcp-pre-commit

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

#### Code Style

This project uses:

- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Before committing, run:

```bash
npm run lint        # Check for linting errors
npm run format      # Format code with Prettier
```

Pre-commit hooks will automatically run these checks.

## Project Structure

```
mcp-pre-commit/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript (generated)
├── .husky/              # Pre-commit hooks
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # Documentation
```

## Adding Support for New Project Types

To add support for a new project type (e.g., Go, Rust):

1. Update `detectProjectType()` function in `src/index.ts`
2. Add detection logic for the new project type
3. Create pre-commit configuration in `setupPreCommitHooks()`
4. Update documentation in README.md
5. Add tests if applicable

## Commit Message Guidelines

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Examples:

```
Add support for Go projects

- Detect Go projects by go.mod file
- Configure golangci-lint and gofmt
- Update documentation

Fixes #123
```

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag: `git tag v1.x.x`
4. Push tag: `git push origin v1.x.x`
5. Publish to npm: `npm publish`

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
