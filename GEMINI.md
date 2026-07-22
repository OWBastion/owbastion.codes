# Gemini Instructions

@AGENTS.md

## Gemini Workflow

- `AGENTS.md` is the single source of truth for project conventions, architecture boundaries, development workflow, and completion criteria.
- When using Gemini CLI, read only the task-routed documents from `AGENTS.md` before editing.
- Add content here only when it is specific to Gemini capabilities or interaction; update `AGENTS.md` first when project rules change.

## Git Commit Specification

When generating Git commit messages, strictly follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

[body]

[footer]
```

### Structure

1. **Header**: `<type>(<scope>): <subject>`
   - **type** (required): Specifies the type of commit
     - `feat`: A new feature
     - `fix`: A bug fix
     - `docs`: Documentation changes
     - `style`: Code style / formatting changes (white-space, formatting, semicolons, etc.)
     - `refactor`: A code change that neither fixes a bug nor adds a feature
     - `perf`: A code change that improves performance
     - `test`: Adding missing tests or correcting existing tests
     - `build`: Changes that affect the build system or external dependencies (e.g., pnpm, vite, wrangler)
     - `ci`: Changes to CI configuration files and scripts (e.g., GitHub Actions)
     - `chore`: Other changes that don't modify src or test files
   - **scope** (optional): Specifies the scope/module of the change (e.g., `portal`, `api`, `database`, `domain`, `auth`, etc.)
   - **subject** (required): A concise description of the change, without trailing punctuation

2. **Body** (optional)
   - Detailed explanation of the motivation and logic behind the change, separated from the Header by a blank line

3. **Footer** (optional)
   - Used for **BREAKING CHANGE** notes or referencing issues/tasks, separated from the Body by a blank line

### Example

```
feat(portal): replace date inputs with UI calendar component

Replace all raw date input elements across administrative pages with the Nuxt UI Calendar component for improved date selection UX.

Closes #42
```

