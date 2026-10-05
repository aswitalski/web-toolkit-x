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

The release commit only changes the version and package metadata. Other changes go in
their own commits before it.

1. Update the version in `package.json`, `package-lock.json` (twice) and the script tag in
   `README.md`, the build reads it from `package.json` to name `toolkit-X.Y.Z.js`
2. Commit as `Release version X.Y.Z`, with bullets for any package metadata changes
3. Push, then start the Release workflow with `gh workflow run release.yml --ref main`, it
   checks the release commit, runs the tests in Chromium and Firefox and publishes. Follow
   the run by its ID, it shows up after a few seconds, and `--exit-status` fails on errors:
   ```sh
   id=$(gh run list --workflow release.yml --commit "$(git rev-parse HEAD)" --json databaseId -q '.[0].databaseId')
   gh run watch "$id" --exit-status
   ```
4. Wait for the version to appear on the registry, it can take a minute, and check that its
   `gitHead` is the release commit and that `dist.attestations` shows the provenance
5. Tag the release commit with an annotated `vX.Y.Z` tag, message `Release version X.Y.Z`,
   and push the tag
6. Create the GitHub release with `gh release create vX.Y.Z --verify-tag`

### GitHub releases

- Title: `Web Toolkit X X.Y`, with the patch number only for patch releases
- Notes written by hand, since `--generate-notes` gives only a changelog link without pull
  requests, covering the changes since the previous tag:
  - a short summary and the install command
  - Breaking changes and Improvements, as short bullets
  - the Full Changelog link, comparing with the previous tag
- Assets: `toolkit-X.Y.Z.js` and its source map, taken from the published package with
  `npm pack web-toolkit-x@X.Y.Z`, so they match the files on npm
- The notes live only on GitHub, not in the repo
