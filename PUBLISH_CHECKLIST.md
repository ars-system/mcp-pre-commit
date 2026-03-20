# Publishing Checklist

Follow these steps to publish your MCP Pre-commit Manager to npm and make it publicly available.

## Before Publishing

### 1. Update Personal Information

- [x] Edit `package.json` - Already updated with:
  - Author: "ARS System"
  - Repository: "git+https://github.com/ars-system/mcp-pre-commit.git"

- [x] Edit `CHANGELOG.md` - Already updated with GitHub URL

- [x] Edit `CONTRIBUTING.md` - Already updated with GitHub URLs

- [x] Edit `README.md` - Already updated with GitHub URLs

### 2. Test Locally

```bash
# Build the project
npm run build

# Test the built version
node dist/index.js

# Check for linting errors
npm run lint

# Check formatting
npm run format:check
```

### 3. Verify Package Contents

```bash
# See what will be published
npm pack --dry-run

# This should show:
# - dist/ directory with compiled JavaScript
# - README.md
# - LICENSE
# - package.json
```

## Publishing to npm

### 4. Create npm Account

1. Go to https://www.npmjs.com/signup
2. Create an account
3. Verify your email address

### 5. Login via CLI

```bash
npm login
# Enter your username, password, and email
```

### 6. Check Package Name Availability

```bash
# Search if the name is taken
npm search mcp-pre-commit
```

If taken, update the name in `package.json`:

- Option 1: Use a scoped package: `@ars-system/mcp-pre-commit`
- Option 2: Choose a different name: `mcp-precommit-manager`, etc.

### 7. Publish to npm

```bash
# Final build
npm run build

# Publish (for first time)
npm publish

# OR for scoped packages
npm publish --access public
```

### 8. Verify Publication

- Visit: https://www.npmjs.com/package/mcp-pre-commit
- Test installation: `npm install -g mcp-pre-commit`

## Publishing to GitHub

### 9. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `mcp-pre-commit`
3. Description: "MCP tool server for managing git repositories and pre-commit hooks"
4. Make it Public
5. Don't initialize with README (you already have one)

### 10. Push to GitHub

```bash
# Add remote (already configured)
git remote add origin https://github.com/ars-system/mcp-pre-commit.git

# Push code
git branch -M main
git push -u origin main
```

### 11. Configure GitHub Repository

1. Add topics: `mcp`, `pre-commit`, `git-hooks`, `developer-tools`
2. Add description
3. Add website URL (npm package URL)

### 12. Create GitHub Release

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0
```

Then on GitHub:

1. Go to Releases
2. Click "Draft a new release"
3. Choose tag v1.0.0
4. Release title: "v1.0.0 - Initial Release"
5. Copy content from CHANGELOG.md
6. Publish release

This will trigger the GitHub Action to auto-publish to npm (after you add NPM_TOKEN)

### 13. Set up GitHub Actions (Optional - for auto-publishing)

1. Go to https://www.npmjs.com/settings/your-username/tokens
2. Generate New Token (Classic)
3. Select "Automation" type
4. Copy the token
5. In GitHub repo: Settings → Secrets and variables → Actions
6. Add new secret: `NPM_TOKEN` with the copied token value

Now whenever you create a GitHub release, it will auto-publish to npm!

## Post-Publication

### 14. Share Your Tool

- [ ] Share on Twitter/X with hashtags: #MCP #DevTools #PreCommit
- [ ] Post on Reddit: r/programming, r/Python, r/javascript
- [ ] Write a blog post on Dev.to
- [ ] Share on LinkedIn
- [ ] Post on Hacker News (Show HN)
- [ ] Share in relevant Discord/Slack communities

### 15. Monitor and Maintain

- [ ] Watch GitHub repository for issues
- [ ] Respond to npm package questions
- [ ] Keep dependencies updated
- [ ] Release updates as needed

## Quick Commands Reference

```bash
# Local testing
npm run build
npm run lint
npm run format

# Version bumping (before new release)
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Publishing
npm publish

# Unpublish (within 72 hours only)
npm unpublish mcp-pre-commit@1.0.0
```

## Troubleshooting

**Error: Package name already exists**

- Change package name in `package.json` or use scoped name `@ars-system/mcp-pre-commit`

**Error: You must verify your email**

- Check npm email and click verification link

**Error: You do not have permission to publish**

- Make sure you're logged in with correct account: `npm whoami`

**Error: Package name too similar to existing package**

- The name "mcp-pre-commit" might be taken or flagged as too similar
- Consider using a scoped package: `@ars-system/mcp-pre-commit`
- Check availability: `npm view mcp-pre-commit`

**Build errors**

- Delete `node_modules` and `dist` folders
- Run `npm install` and `npm run build` again

## Success!

Once published, users can install your tool with:

```bash
npm install -g mcp-pre-commit
```

And configure it in their MCP clients as documented in the README.

Good luck! 🚀
