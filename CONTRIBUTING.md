# Contributing

## Your first contribution

### Setting up the repository

1. Fork this repository
2. Create a new feature branch

```bash
git checkout -b my-feature-branch
```

### Setting up a development environment

1. Ensure that you have `Node.js` installed on your machine (you can use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) to easily manage versions)
2. Install the dependencies with [pnpm](https://pnpm.io/installation) :warning: yarn or npm aren't supported :warning:

- You can check the `packageManager` field of [`package.json`](https://github.com/jsonnext/codemirror-json-schema/blob/main/package.json#L26) to know what version of pnpm to install

```bash
pnpm install
```

3. Run tests to ensure your project is in a good state

```bash
pnpm test
```

### Making your changes

1. Make whatever code changes you need
2. Add or update tests coverage whenever possible

### Verifying

1. Run the tests `pnpm run test`
2. View the changes in the demo site locally `pnpm run dev`
3. Ensure that the project builds properly `pnpm run tsc`

### Opening a pull request

1. Once your branch is ready, and it contains bugfixes, documentation improvements or features, run `pnpm changeset add` to add a [changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md) file
   - There you can compose the markdown entry describing your changes that will be published in CHANGELOG.md
2. Push your changes to your feature branch
3. Open a pull request from your fork to the original repository in the Github UI or [CLI](https://cli.github.com/manual/gh_pr_create)

## Releasing (Invopop fork)

This fork is published to npm as `@invopop/codemirror-json-schema` by the [Release workflow](.github/workflows/release.yml). Whenever `main` has a `package.json` version that isn't on npm yet, the workflow tests, builds and publishes it with provenance, then creates a `v<version>` GitHub release with notes generated from the merged pull requests.

To release:

1. Bump `version` in `package.json` in a pull request, following [semver](https://semver.org): a patch for fixes, a minor for new features while we're on 0.x.
2. Merge it. The release follows within a few minutes.

Merges that don't change the version publish nothing. To retry a failed release, run the workflow manually from the Actions tab.

npm authenticates the workflow with [trusted publishing](https://docs.npmjs.com/trusted-publishers), so there is no npm token to rotate. The package's trusted publisher on npmjs.com must name the `invopop/codemirror-json-schema` repository and the `release.yml` workflow.

Changesets are still useful for pull requests to the [upstream repository](https://github.com/jsonnext/codemirror-json-schema), which releases with them; this fork doesn't need them.
