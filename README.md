# MCP Pre-commit Manager

A Model Context Protocol (MCP) tool server that helps LLM agents manage git repositories and pre-commit hooks automatically.

## Features

This MCP server provides tools to:

- 🔍 Detect project type (Python, JavaScript, or TypeScript)
- 📦 Check if a directory is a git repository
- 🪝 Verify if pre-commit hooks are installed
- 🚀 Initialize git repositories automatically
- ⚙️ Set up pre-commit hooks based on project type

## Prerequisites

- Node.js 18 or higher
- Git installed on your system
- `pre-commit` installed (for hook installation)
  - For macOS: `brew install pre-commit`
  - For Python users: `pip install pre-commit`

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Build the TypeScript code:

```bash
npm run build
```

## Usage

### Running the Server

Start the MCP server:

```bash
npm start
```

Or run in development mode with auto-rebuild:

```bash
npm run watch
```

### Configuring with MCP Clients

Add this server to your MCP client configuration. For example, in Claude Desktop's config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pre-commit-manager": {
      "command": "node",
      "args": ["/path/to/mcp-pre-commit/dist/index.js"]
    }
  }
}
```

## Available Tools

### 1. `check_project_setup`

Analyzes a repository and returns its setup status.

**Parameters:**

- `repo_path` (optional): Path to the repository (defaults to current directory)

**Returns:**

```json
{
  "repository_path": "/path/to/repo",
  "project_type": "python",
  "is_git_repository": true,
  "has_precommit_hooks": false,
  "status": "⚠️ Git repository exists but pre-commit hooks are not installed"
}
```

**Example usage in LLM conversation:**

```
Check the project setup for /Users/john/my-project
```

### 2. `setup_git_and_precommit`

Initializes git repository and sets up pre-commit hooks based on detected project type.

**Parameters:**

- `repo_path` (optional): Path to the repository (defaults to current directory)
- `force_project_type` (optional): Force specific project type (`python`, `javascript`, or `typescript`)

**Returns:**
Status messages about git initialization and pre-commit hook setup.

**Example usage in LLM conversation:**

```
Set up git and pre-commit hooks for /Users/john/my-project
```

## Pre-commit Hook Configurations

### Python Projects

- Trailing whitespace removal
- End-of-file fixer
- YAML, JSON, TOML checkers
- Black code formatter
- Flake8 linter
- isort import sorter

### JavaScript/TypeScript Projects

- Trailing whitespace removal
- End-of-file fixer
- YAML, JSON checkers
- ESLint with TypeScript support
- Prettier code formatter

### Unknown/Other Projects

- Basic pre-commit hooks (whitespace, file fixes, YAML/JSON validation)

## Development

### Project Structure

```
mcp-pre-commit/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

### Build Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Build and run once
- `npm run watch` - Watch mode for development

## How It Works

1. **Project Type Detection**: Scans for common configuration files:
   - Python: `setup.py`, `pyproject.toml`, `requirements.txt`, etc.
   - TypeScript: `tsconfig.json`
   - JavaScript: `package.json`

2. **Git Repository Check**: Uses `git rev-parse --is-inside-work-tree` to verify git status

3. **Pre-commit Hook Detection**: Checks for:
   - `.pre-commit-config.yaml` configuration file
   - Actual hook file in `.git/hooks/pre-commit`

4. **Automatic Setup**:
   - Initializes git if needed (`git init`)
   - Creates appropriate `.pre-commit-config.yaml` based on project type
   - Runs `pre-commit install` to activate hooks

## Error Handling

The server provides clear error messages for common issues:

- Missing `pre-commit` installation
- Permission errors
- Invalid repository paths
- Undetectable project types (use `force_project_type` parameter)

## Contributing

Feel free to extend this server with additional features:

- Support for more project types (Go, Rust, etc.)
- Custom hook configurations
- Additional git operations
- Pre-commit hook testing

## License

MIT
