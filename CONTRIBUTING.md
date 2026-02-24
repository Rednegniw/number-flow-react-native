# Contributing

Thanks for your interest in contributing to Number Flow React Native! I welcome every contribution, whether it's code, documentation, bug reports, or helping other users.

## Code of Conduct

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## Development Workflow

This is a Bun workspaces monorepo. To get started:

1. Fork and clone the repository
2. Run `bun install` in the root directory
3. Start the example app with `bun run example start`

### Project Structure

```
packages/number-flow-react-native/   # The publishable library
apps/example/                        # Expo example app
docs/                                # Fumadocs documentation site
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `bun run lib check-types` | Type-check the library |
| `bun run lib test` | Run tests |
| `bun run lib lint` | Lint with Biome |
| `bun run lib lint:fix` | Auto-fix lint issues |
| `bun run example start` | Start the Expo example app |
| `bun run docs dev` | Start the docs site locally |

### Making Changes

1. Create a new branch from `main`
2. Make your changes
3. Verify everything passes: `bun run lib check-types && bun run lib test && bun run lib lint`
4. Add a changeset if your change affects the published package: `bunx changeset`

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code restructuring
- `docs:` for documentation changes
- `test:` for adding or updating tests
- `chore:` for maintenance tasks

## Pull Requests

- Please keep PRs small and focused on a single concern
- Make sure CI checks pass before requesting a review from me
- For API changes or new features, open an issue first to discuss the approach
- Link any related issues in the PR description

## Reporting Issues

Found a bug or have a feature request? [Open an issue](https://github.com/Rednegniw/number-flow-react-native/issues) with as much detail as possible.

For bugs, include:
- React Native version
- Reanimated version
- Platform (iOS/Android)
- Minimal reproduction steps

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
