#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Debug logging helper
const DEBUG = process.env.DEBUG === 'true';
function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, data || '');
  }
}

interface ProjectInfo {
  projectType: 'python' | 'javascript' | 'typescript' | 'unknown';
  isGitRepo: boolean;
  hasPreCommitHooks: boolean;
  repoPath: string;
  gitBranch?: string;
  hasCommits?: boolean;
  hasRemote?: boolean;
  preCommitConfigExists?: boolean;
  hookFileExists?: boolean;
}

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Detect project type based on configuration files
async function detectProjectType(repoPath: string): Promise<ProjectInfo['projectType']> {
  const pythonFiles = ['setup.py', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'setup.cfg'];

  const jsFiles = ['package.json', 'package-lock.json', 'yarn.lock'];

  const tsFiles = ['tsconfig.json'];

  // Check for TypeScript first (most specific)
  for (const file of tsFiles) {
    if (await fileExists(path.join(repoPath, file))) {
      return 'typescript';
    }
  }

  // Check for JavaScript
  for (const file of jsFiles) {
    if (await fileExists(path.join(repoPath, file))) {
      return 'javascript';
    }
  }

  // Check for Python
  for (const file of pythonFiles) {
    if (await fileExists(path.join(repoPath, file))) {
      return 'python';
    }
  }

  return 'unknown';
}

// Check if directory is a git repository
async function isGitRepository(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
      cwd: repoPath,
    });
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

// Check if pre-commit hooks are installed (supports both Husky and pre-commit framework)
async function hasPreCommitHooks(
  repoPath: string,
  projectType: ProjectInfo['projectType']
): Promise<{
  installed: boolean;
  hasConfig: boolean;
  hasHook: boolean;
  hookType: 'husky' | 'pre-commit' | 'none';
}> {
  // For JS/TS projects, check for Husky
  if (projectType === 'javascript' || projectType === 'typescript') {
    const huskyPreCommitPath = path.join(repoPath, '.husky', 'pre-commit');
    const packageJsonPath = path.join(repoPath, 'package.json');

    const hasHuskyHook = await fileExists(huskyPreCommitPath);
    let hasLintStaged = false;

    if (await fileExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        hasLintStaged = !!(
          packageJson['lint-staged'] || packageJson.devDependencies?.['lint-staged']
        );
      } catch {
        hasLintStaged = false;
      }
    }

    return {
      installed: hasHuskyHook && hasLintStaged,
      hasConfig: hasLintStaged,
      hasHook: hasHuskyHook,
      hookType: hasHuskyHook ? 'husky' : 'none',
    };
  }

  // For Python projects, check for pre-commit framework
  const preCommitConfigPath = path.join(repoPath, '.pre-commit-config.yaml');
  const gitHooksPath = path.join(repoPath, '.git', 'hooks', 'pre-commit');

  const hasConfig = await fileExists(preCommitConfigPath);
  const hasHook = await fileExists(gitHooksPath);

  return {
    installed: hasConfig && hasHook,
    hasConfig,
    hasHook,
    hookType: hasConfig ? 'pre-commit' : 'none',
  };
}

// Get git branch information
async function getGitInfo(repoPath: string): Promise<{
  branch: string;
  hasCommits: boolean;
  hasRemote: boolean;
}> {
  try {
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
    });

    let hasCommits = false;
    try {
      await execAsync('git rev-parse HEAD', { cwd: repoPath });
      hasCommits = true;
    } catch {
      hasCommits = false;
    }

    let hasRemote = false;
    try {
      const { stdout: remote } = await execAsync('git remote -v', { cwd: repoPath });
      hasRemote = remote.trim().length > 0;
    } catch {
      hasRemote = false;
    }

    return {
      branch: branch.trim(),
      hasCommits,
      hasRemote,
    };
  } catch {
    return {
      branch: 'unknown',
      hasCommits: false,
      hasRemote: false,
    };
  }
}

// Get project information
async function getProjectInfo(repoPath: string): Promise<ProjectInfo> {
  const projectType = await detectProjectType(repoPath);
  const isGit = await isGitRepository(repoPath);

  let gitInfo = { branch: 'N/A', hasCommits: false, hasRemote: false };
  let hookInfo: {
    installed: boolean;
    hasConfig: boolean;
    hasHook: boolean;
    hookType: 'husky' | 'pre-commit' | 'none';
  } = {
    installed: false,
    hasConfig: false,
    hasHook: false,
    hookType: 'none',
  };

  if (isGit) {
    gitInfo = await getGitInfo(repoPath);
    hookInfo = await hasPreCommitHooks(repoPath, projectType);
  }

  return {
    projectType,
    isGitRepo: isGit,
    hasPreCommitHooks: hookInfo.installed,
    repoPath,
    gitBranch: gitInfo.branch,
    hasCommits: gitInfo.hasCommits,
    hasRemote: gitInfo.hasRemote,
    preCommitConfigExists: hookInfo.hasConfig,
    hookFileExists: hookInfo.hasHook,
  };
}

// Initialize git repository
async function initGitRepo(repoPath: string): Promise<string> {
  try {
    await execAsync('git init', { cwd: repoPath });
    return 'Git repository initialized successfully';
  } catch (error: any) {
    throw new Error(`Failed to initialize git repository: ${error.message}`);
  }
}

// Setup Husky + lint-staged for JS/TS projects
async function setupHusky(
  repoPath: string,
  projectType: 'javascript' | 'typescript'
): Promise<string> {
  const messages: string[] = [];

  // Check if package.json exists
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (!(await fileExists(packageJsonPath))) {
    throw new Error('package.json not found. Cannot set up Husky without a Node.js project.');
  }

  // Install ESLint, Prettier, Husky, and lint-staged
  try {
    messages.push('Installing dependencies (husky, lint-staged, eslint, prettier)...');
    if (projectType === 'typescript') {
      await execAsync(
        'npm install --save-dev husky lint-staged eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier',
        { cwd: repoPath }
      );
    } else {
      await execAsync(
        'npm install --save-dev husky lint-staged eslint prettier eslint-config-prettier',
        { cwd: repoPath }
      );
    }
    messages.push('✅ Installed all dependencies');
  } catch (error: any) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }

  // Create ESLint configuration (flat config for ESLint v9+)
  const eslintConfigPath = path.join(repoPath, 'eslint.config.js');
  let eslintConfig: string;

  if (projectType === 'typescript') {
    eslintConfig = `import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn", // Allow 'any' with warning instead of error
    },
  },
  prettierConfig,
];
`;
  } else {
    eslintConfig = `import prettierConfig from "eslint-config-prettier";

export default [
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  prettierConfig,
];
`;
  }

  await fs.writeFile(eslintConfigPath, eslintConfig);
  messages.push('✅ Created eslint.config.js (ESLint v9+ flat config)');

  // Create Prettier configuration
  const prettierConfigPath = path.join(repoPath, '.prettierrc.json');
  const prettierConfig = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: false,
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
  };

  await fs.writeFile(prettierConfigPath, JSON.stringify(prettierConfig, null, 2) + '\n');
  messages.push('✅ Created .prettierrc.json');

  // Initialize husky
  try {
    await execAsync('npx husky init', { cwd: repoPath });
    messages.push('✅ Initialized Husky');
  } catch (error: any) {
    throw new Error(`Failed to initialize husky: ${error.message}`);
  }

  // Create pre-commit hook (updated for Husky v9+ - no deprecated shebang)
  const preCommitHookPath = path.join(repoPath, '.husky', 'pre-commit');
  const preCommitHookContent = `# Run lint-staged to format and lint staged files
npx lint-staged
`;

  await fs.writeFile(preCommitHookPath, preCommitHookContent);
  await execAsync(`chmod +x ${preCommitHookPath}`);
  messages.push('✅ Created pre-commit hook');

  // Update package.json with scripts and lint-staged configuration
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

  // Add npm scripts
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  const fileExtensions = projectType === 'typescript' ? '{ts,tsx}' : '{js,jsx}';
  packageJson.scripts['lint'] = `eslint "**/*.${fileExtensions}" --max-warnings 0`;
  packageJson.scripts['lint:fix'] = `eslint "**/*.${fileExtensions}" --fix`;
  packageJson.scripts['format'] =
    `prettier --write "**/*.{${fileExtensions.slice(1, -1)},json,md,yml,yaml}"`;
  packageJson.scripts['format:check'] =
    `prettier --check "**/*.{${fileExtensions.slice(1, -1)},json,md,yml,yaml}"`;

  // Add lint-staged configuration
  if (projectType === 'typescript') {
    packageJson['lint-staged'] = {
      '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
      '*.{json,md,yml,yaml}': ['prettier --write'],
    };
  } else {
    packageJson['lint-staged'] = {
      '*.{js,jsx}': ['eslint --fix', 'prettier --write'],
      '*.{json,md,yml,yaml}': ['prettier --write'],
    };
  }

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  messages.push('✅ Added npm scripts: lint, lint:fix, format, format:check');
  messages.push('✅ Configured lint-staged in package.json');

  messages.push('\n🎉 Setup complete! Pre-commit hooks will now:');
  messages.push('   - Run ESLint with auto-fix on staged files');
  messages.push('   - Run Prettier to format staged files');
  messages.push('\n💡 You can also run these commands manually:');
  messages.push('   npm run lint       - Check for linting errors');
  messages.push('   npm run lint:fix   - Fix linting errors');
  messages.push('   npm run format     - Format all files');
  messages.push('   npm run format:check - Check formatting');

  return messages.join('\n');
}

// Setup pre-commit hooks based on project type
async function setupPreCommitHooks(
  repoPath: string,
  projectType: ProjectInfo['projectType']
): Promise<string> {
  // For JS/TS projects, use Husky
  if (projectType === 'javascript' || projectType === 'typescript') {
    return await setupHusky(repoPath, projectType);
  }

  // For Python and other projects, use pre-commit framework
  let configContent = '';

  if (projectType === 'python') {
    configContent = `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-json
      - id: check-toml
      - id: check-merge-conflict
      - id: debug-statements
      
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
      
  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=88]
        
  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
        args: [--profile=black]
`;
  } else {
    configContent = `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-json
      - id: check-merge-conflict
`;
  }

  const configPath = path.join(repoPath, '.pre-commit-config.yaml');
  await fs.writeFile(configPath, configContent);

  // Install pre-commit hooks
  try {
    const { stdout, stderr } = await execAsync('pre-commit install', {
      cwd: repoPath,
    });
    return `Pre-commit hooks configured for ${projectType} project.\n\nOutput:\n${stdout}\n${stderr}`;
  } catch (error: any) {
    throw new Error(
      `Failed to install pre-commit hooks. Make sure pre-commit is installed (pip install pre-commit or brew install pre-commit).\nError: ${error.message}`
    );
  }
}

// Create and start the MCP server
const server = new Server(
  {
    name: 'pre-commit-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'check_project_setup',
    description:
      'Use this tool when the user asks about git or pre-commit status of a repository, or when you need to verify project setup before making changes. ' +
      'This tool performs a comprehensive check of: ' +
      '1) Project type detection (Python/JavaScript/TypeScript based on config files), ' +
      '2) Git repository status (initialized, current branch, commits, remotes), ' +
      '3) Pre-commit hooks installation status (config file and hook scripts). ' +
      'Returns detailed information including recommendations for next steps. ' +
      "Call this tool whenever a user mentions 'check', 'status', 'git', 'pre-commit', or 'setup' in the context of repository configuration.",
    inputSchema: {
      type: 'object',
      properties: {
        repo_path: {
          type: 'string',
          description:
            'Absolute path to the repository to check. If not provided, defaults to current working directory.',
        },
      },
    },
  },
  {
    name: 'setup_git_and_precommit',
    description:
      'Use this tool to automatically set up git and pre-commit hooks for a project. ' +
      'This tool will: ' +
      "1) Initialize a git repository if one doesn't exist (runs 'git init'), " +
      '2) Detect the project type automatically (Python/JS/TS), ' +
      '3) Create a .pre-commit-config.yaml file with appropriate hooks for the project type, ' +
      "4) Install the pre-commit hooks (runs 'pre-commit install'). " +
      'For Python projects: Sets up pre-commit framework with Black, Flake8, isort, and common hooks. ' +
      'For JS/TS projects: Sets up Husky + lint-staged with ESLint and Prettier. ' +
      "Call this tool when the user wants to 'set up', 'initialize', 'install', or 'configure' git or pre-commit hooks.",
    inputSchema: {
      type: 'object',
      properties: {
        repo_path: {
          type: 'string',
          description:
            'Absolute path to the repository to set up. If not provided, defaults to current working directory.',
        },
        force_project_type: {
          type: 'string',
          description:
            'Force a specific project type instead of auto-detection. Use this when auto-detection fails or user specifies a particular setup.',
          enum: ['python', 'javascript', 'typescript'],
        },
      },
    },
  },
];

// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  debugLog(`Tool called: ${name}`, args);

  try {
    if (name === 'check_project_setup') {
      const repoPath = (args?.repo_path as string) || process.cwd();
      debugLog(`Checking project setup at: ${repoPath}`);
      const info = await getProjectInfo(repoPath);
      debugLog(`Project info:`, info);

      // Determine recommendations
      const recommendations: string[] = [];
      if (!info.isGitRepo) {
        recommendations.push("Initialize git repository using 'setup_git_and_precommit' tool");
      } else {
        if (!info.hasPreCommitHooks) {
          recommendations.push("Install pre-commit hooks using 'setup_git_and_precommit' tool");
        }
        if (!info.hasCommits) {
          recommendations.push('Make an initial commit to the repository');
        }
        if (!info.hasRemote) {
          recommendations.push('Consider adding a remote repository (e.g., GitHub, GitLab)');
        }
      }

      if (recommendations.length === 0) {
        recommendations.push('Repository is fully configured! No actions needed.');
      }

      const result = {
        repository_path: info.repoPath,
        project_type: info.projectType,
        project_type_detected:
          info.projectType !== 'unknown'
            ? `Detected as ${info.projectType} project`
            : 'Could not detect project type - no standard config files found',
        git_status: {
          is_git_repository: info.isGitRepo,
          current_branch: info.gitBranch || 'N/A',
          has_commits: info.hasCommits || false,
          has_remote: info.hasRemote || false,
        },
        precommit_status: {
          hooks_installed: info.hasPreCommitHooks,
          config_file_exists: info.preCommitConfigExists || false,
          hook_script_exists: info.hookFileExists || false,
        },
        overall_status: info.isGitRepo
          ? info.hasPreCommitHooks
            ? '✅ FULLY CONFIGURED - Repository has git and pre-commit hooks set up'
            : info.preCommitConfigExists && !info.hookFileExists
              ? "⚠️  PARTIALLY CONFIGURED - Config file exists but hooks not installed (run 'pre-commit install')"
              : !info.preCommitConfigExists && info.hookFileExists
                ? '⚠️  PARTIALLY CONFIGURED - Hooks installed but config file missing'
                : '⚠️  GIT ONLY - Repository exists but pre-commit hooks are not set up'
          : '❌ NOT INITIALIZED - Not a git repository',
        recommendations,
        next_action: recommendations[0],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else if (name === 'setup_git_and_precommit') {
      const repoPath = (args?.repo_path as string) || process.cwd();
      const forceType = args?.force_project_type as ProjectInfo['projectType'] | undefined;

      debugLog(`Setting up git and precommit at: ${repoPath}`);
      debugLog(`Force project type: ${forceType || 'auto-detect'}`);

      const info = await getProjectInfo(repoPath);
      debugLog(`Current project info:`, info);
      const messages: string[] = [];

      // Initialize git if needed
      if (!info.isGitRepo) {
        const gitMsg = await initGitRepo(repoPath);
        messages.push(gitMsg);
      } else {
        messages.push('Git repository already initialized');
      }

      // Determine project type
      const projectType = forceType || info.projectType;
      if (projectType === 'unknown' && !forceType) {
        throw new Error(
          'Could not detect project type. Please specify force_project_type parameter.'
        );
      }

      // Setup pre-commit hooks if not already set up
      if (!info.hasPreCommitHooks) {
        const hookMsg = await setupPreCommitHooks(repoPath, projectType);
        messages.push(hookMsg);
      } else {
        messages.push('Pre-commit hooks already installed');
      }

      return {
        content: [
          {
            type: 'text',
            text: messages.join('\n\n'),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    debugLog(`Error occurred:`, error);
    console.error(`[ERROR] ${error.message}`);
    console.error(error.stack);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Pre-commit Manager MCP Server running on stdio');
  if (DEBUG) {
    console.error('[DEBUG] Debug mode enabled. Set DEBUG=false to disable.');
  }
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
