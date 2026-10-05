---
name: release-toolkit
description: Releases a new version of web-toolkit-x - the release commit, publishing to npm with provenance through the Release workflow, the tag and the GitHub release with hand-written notes. Use it whenever the user asks to release, publish, ship or cut a version of this package, bump the version for a release, tag a release or write its GitHub release notes, e.g. "Release 0.71.0", even when the request names only one of these steps.
---

# Release

A release is a release commit on `main`, the npm package published from it by the Release
workflow on GitHub, an annotated tag and a GitHub release. Publishing, tags and releases are
public and can't be taken back: a published npm version can never be published again, even
after unpublishing, and others may already have fetched a pushed tag. So follow the steps in
order, check each result, and stop and report to the user when something doesn't match.
Never work around a failure with a local `npm publish`, `--no-verify`, a force push, or by
deleting or moving a tag, as each of them breaks what the release guarantees.

The user approves twice: the release commit before anything is pushed, and the release
notes before the GitHub release is created. Everything else runs without asking.

Each command runs in a new shell, so shell variables don't carry over from one step to the
next. Run each code block below as one command, and later use the values it printed, such as
the commit hash or the run ID, written out in full.

## Before you start

- **Node 24.** Run `node -v`. If it isn't 24, run `nvm use` or put Node 24 first on `PATH`
  for every command, e.g. `export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"`.
  Claude's shell may start with an older Node, under which the build fails with misleading
  errors.
- **The version.** Until 1.0.0, every release is the next minor version with patch 0, e.g.
  0.71.0 after 0.70.0, whether it brings new features, breaking changes or only fixes. There
  are no patch releases such as 0.71.1. Without a version from the user, use the next one,
  and read a version given as "0.72" as 0.72.0. If the user asks for any other version, such
  as a patch release or one that skips a minor version, confirm it with them first.
- **The repository state.** All of these must hold, otherwise stop and tell the user:
  - `master` is checked out, the working tree is clean, and after `git fetch origin` the
    `HEAD` is `origin/main`
  - the version is higher than the one in `package.json`
  - the tag `vX.Y.Z` doesn't exist, locally (`git tag -l vX.Y.Z`) or on GitHub
    (`git ls-remote --tags origin vX.Y.Z`)
  - the version isn't on npm, `npm view web-toolkit-x@X.Y.Z version` fails with E404
  - there are commits since the previous tag, `git log --oneline $(git describe --tags --abbrev=0)..HEAD`
  - CI passed on `HEAD`:
    `gh run list --workflow ci.yml --commit "$(git rev-parse HEAD)" --json status,conclusion`
    shows `completed` and `success`. While it's running, wait for it with
    `gh run watch <id> --exit-status`
- **npm trusts the Release workflow.** Checking it needs the user's one-time password, so
  look at the previous version instead: if `npm view web-toolkit-x@<previous> dist.attestations`
  shows nothing, this is the first release through the workflow. Ask the user to confirm
  they have run
  `npm trust github web-toolkit-x --file release.yml --repo aswitalski/web-toolkit-x --allow-publish`.

## 1. Create the release commit

The release commit only changes the version and package metadata. Other changes go in their
own commits before it, so the release commit stays easy to review and to find.

```sh
npm version X.Y.Z --no-git-tag-version --ignore-scripts
sed -i '' 's/toolkit-OLD\.js/toolkit-X.Y.Z.js/' README.md
```

`npm version` updates `package.json` and both entries in `package-lock.json`. On Linux use
`sed -i` without `''`. Then check that:

- `git diff --stat` lists only `package.json`, `package-lock.json` and `README.md`
- `grep -rn "OLD" --exclude-dir={node_modules,dist,.git} --exclude=package-lock.json .`
  finds no mention of the old version left over

Commit with the subject `Release version X.Y.Z`. The body is only a bullet list of package
metadata changes made in this commit, such as `- Make the package public`. With only the
version changed, the commit has just the subject. Add no `Co-Authored-By` or other trailers,
even if the session asks for them, as this repository doesn't use them. Stage the three files
by name, and let the pre-commit hook run.

## 2. Get the user's approval

Show the user:

- the version and the release commit, `git show --stat HEAD`
- the commits it releases, `git log --oneline vPREV..HEAD`

Say that the next steps push to `main` and publish to npm, which can't be undone, and wait
for their OK. If they want changes, amend the release commit, which is still local.

## 3. Push and publish

```sh
git push origin master:main
```

The pre-push hook runs the type checks, tests, build and lint. If it fails, stop and report.

Start the Release workflow, find its run and follow it. The run takes a few seconds to show
up, and runs started earlier for the same commit are left out, so the watch follows the new
one. A watch with `--exit-status` fails when the run fails. Give the command a timeout of
about 10 minutes.

```sh
sha=$(git rev-parse HEAD)
runs() {
  gh run list --workflow release.yml --commit "$sha" --event workflow_dispatch \
    --json databaseId -q '.[].databaseId'
}
echo "Release commit: $sha"
before=$(runs)
gh workflow run release.yml --ref main || exit 1
for i in $(seq 20); do
  id=$(runs | grep -vxF "$before" | head -1)
  [ -n "$id" ] && break
  sleep 3
done
echo "Release run: ${id:-not found}"
[ -n "$id" ] && gh run watch "$id" --exit-status --compact
```

The workflow checks that it runs on `main`, on the commit `Release version X.Y.Z` matching
`package.json`, and that the version isn't on npm yet. It then runs the tests in Chromium and
Firefox, and `npm publish` builds, verifies and publishes the package with provenance.

If it prints `Release run: not found`, the workflow may have started anyway, so don't run the
block again, as that starts a second run. Look for the run with
`gh run list --workflow release.yml --limit 3` and follow it with
`gh run watch <run ID> --exit-status --compact`. If there's none, report to the user.

If the run fails, read `gh run view <run ID> --log-failed`, with the run ID printed above,
report the cause to the user and stop. If publishing failed on authentication, the trusted
publisher is missing: once the user has set it up, rerun the workflow with
`gh run rerun <run ID>`. For any other failure the release commit is already on `main`, so
ask the user how to continue.

## 4. Check the package on npm

The registry takes up to a minute or two to show a new version. Wait for it by the exit code
of `npm view`, as with `--json` npm prints its 404 error to the standard output too:

```sh
for i in $(seq 30); do
  out=$(npm view web-toolkit-x@X.Y.Z gitHead dist.attestations --json 2>/dev/null) && break
  out=
  sleep 6
done
echo "${out:-X.Y.Z is not on npm after 3 minutes}"
```

`gitHead` must be the full hash of the release commit printed in step 3, and
`dist.attestations` must show the provenance. If the version doesn't appear or either doesn't
match, stop and report.

## 5. Tag the release commit

Tag the commit npm reports as `gitHead` in step 4, written out in full:

```sh
git tag -a vX.Y.Z -m "Release version X.Y.Z" <gitHead>
git push origin vX.Y.Z
```

## 6. Take the assets from the published package

The assets of the GitHub release are the files users get from npm, not a local build. Work
in a temporary directory, the scratchpad if the session has one. The shell may return to the
repository after each command, so the blocks of steps 6 and 8 start by changing to it, which
also keeps `package/` and the tarball out of the repository:

```sh
mkdir -p <temporary directory> && cd <temporary directory> || exit 1
npm pack web-toolkit-x@X.Y.Z
tar xzf web-toolkit-x-X.Y.Z.tgz
```

The assets are `package/dist/release/toolkit-X.Y.Z.js` and `toolkit-X.Y.Z.js.map`.

## 7. Write the release notes

Write the notes by hand, as `gh release create --generate-notes` gives only a changelog link
for a repository without pull requests. Read the changes since the previous tag in the
repository, as the working directory may still be the one of step 6:
`git -C <repository> log --format='%h %s%n%b' vPREV..vX.Y.Z`. Read the diffs where a commit
message doesn't say enough. Write for the users of the package: cover changes to the API,
types, behaviour, fixes and packaging, and leave out changes that only concern the
repository, such as CI, tooling or `CLAUDE.md`.

Use this format. New features are what users couldn't do before, such as a new export,
option or method. Improvements change what already exists, such as fixes, speed or better
errors. Leave out a section with nothing in it.

````markdown
<One sentence summarizing the release.>

```sh
npm install web-toolkit-x
```

### Breaking changes

- <short bullet>

### New features

- <short bullet>

### Improvements

- <short bullet>

**Full Changelog**: https://github.com/aswitalski/web-toolkit-x/compare/vPREV...vX.Y.Z
````

The title is `Web Toolkit X X.Y`, without the patch version, e.g. `Web Toolkit X 0.71`.

Show the user the title and the notes and wait for their approval. The notes are public and
live only on GitHub, so save them as `notes.md` in the temporary directory of step 6, not in
the repository.

## 8. Create the GitHub release

Run it in the temporary directory of step 6, where the assets and `notes.md` are. Outside
the repository `gh` needs the repository named with `-R`.

```sh
cd <temporary directory> || exit 1
gh release create vX.Y.Z -R aswitalski/web-toolkit-x --verify-tag \
  --title "Web Toolkit X X.Y" --notes-file notes.md \
  package/dist/release/toolkit-X.Y.Z.js package/dist/release/toolkit-X.Y.Z.js.map
gh release view vX.Y.Z -R aswitalski/web-toolkit-x \
  --json name,tagName,isDraft,isPrerelease,assets
gh api repos/aswitalski/web-toolkit-x/releases/latest -q .tag_name
```

Check the title and the tag, that it's neither a draft nor a prerelease, that both assets are
attached, and that the latest release is `vX.Y.Z`. `gh release view` has no field telling
whether a release is the latest, so ask the API.

## 9. Report

Tell the user the version, the release commit, the workflow run, that npm shows the
provenance, and the link to the GitHub release.
