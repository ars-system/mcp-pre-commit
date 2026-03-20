# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-20

### Added

- Initial release of MCP Pre-commit Manager
- Automatic project type detection (Python, JavaScript, TypeScript)
- Git repository status checking
- Pre-commit hooks installation and verification
- `check_project_setup` tool for comprehensive repository analysis
- `setup_git_and_precommit` tool for automatic setup
- Python project support with Black, Flake8, and isort
- JavaScript/TypeScript project support with Husky, ESLint, and Prettier
- Automatic git initialization
- Detailed status reporting and recommendations
- Support for both pre-commit framework and Husky

### Features

- **Python Projects**: Configures Black (code formatter), Flake8 (linter), isort (import sorter)
- **JavaScript Projects**: Configures Husky + lint-staged with ESLint and Prettier
- **TypeScript Projects**: Configures Husky + lint-staged with TypeScript ESLint and Prettier
- **Unknown Projects**: Configures basic pre-commit hooks (whitespace, file fixes, YAML/JSON validation)

[1.0.0]: https://github.com/ars-system/mcp-pre-commit/releases/tag/v1.0.0
