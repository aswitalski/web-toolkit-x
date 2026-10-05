# Web Toolkit X

Published on npm as `web-toolkit-x`, hosted at github.com/aswitalski/web-toolkit-x.
Requires Node 24.

## Commits

- Subject: a short imperative sentence starting with a verb, no Conventional Commits prefixes
- Body: a brief description and a short bullet list of the key points only
- No `Co-Authored-By` or other attribution trailers
- Local `master` tracks `origin/main`, push with `git push origin master:main`

## Checks and hooks

- `npm run verify` builds, type checks, lints and checks the formatting
- `npm test` runs the tests
- pre-commit runs Prettier and ESLint on the staged files
- pre-push runs the type checks, tests, build and lint

## Package

- The package is public, `dist` is gitignored and built by `tsdown`
- `files` lists `dist/release`, `src`, `NOTICE` and `AUTHORS`, Apache-2.0 requires `NOTICE`
- `prepublishOnly` runs `npm run verify`
- Published only by the Release workflow, `.github/workflows/release.yml`, which npm trusts
  to publish without a token and adds provenance, never with a local `npm publish`

## Releases

Releases follow the `release-toolkit` skill in `.claude/skills/release-toolkit/SKILL.md`: the
release commit, publishing to npm with provenance through the Release workflow, the tag and
the GitHub release with hand-written notes.
