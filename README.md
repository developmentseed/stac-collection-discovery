# Federated Collection Discovery

<img
    src="src/assets/logo.svg"
    alt="Federated Collection Discovery logo"
    width="200"
/>

A React application for searching multiple STAC APIs simultaneously.
Built with the
[STAC FastAPI Collection Discovery API](http://developmentseed.org/stac-fastapi-collection-discovery/),
this tool performs federated collection searches across multiple STAC API
endpoints at once.

## Features

- Simultaneous multi-API search across configured STAC endpoints
- Interactive collection details with spatial and temporal context
- Client-generated code hints for item search workflows
- API health diagnostics and capability detection
- Configurable per-API filtering for deployment-specific behavior
- Responsive interface with sorting, filtering, and pagination

## Table of Contents

- [Development](#development)
- [Docker development](#docker-development)
- [Configuration](#configuration)
- [Releases and contribution workflow](#releases-and-contribution-workflow)
- [Usage](#usage)

## Development

### Requirements

- Node 22 LTS
- Yarn 1

The repo standardizes on the Node version declared in [`.nvmrc`](.nvmrc).
If you use `nvm`, run:

```bash
nvm use
```

### Install dependencies

```bash
yarn install
```

### Run the app locally

Local development is frontend-first. By default, point the app at a deployed API:

```bash
VITE_API_URL=https://discover-api.dit.maap-project.org yarn dev
```

Then open `http://localhost:3000`.

### Local checks

Run the same checks used in CI:

```bash
yarn format:check
yarn typecheck
yarn build
```

## Docker development

Docker is also frontend-first and targets a deployed API by default. The repo-root `Dockerfile` is the container entry point for local app development.

```bash
docker compose up --build
```

The app will be available at `http://localhost:3000`.

To point Docker development at a different backend:

```bash
VITE_API_URL=https://your-api.example.com docker compose up --build
```

Stop the stack with:

```bash
docker compose down
```

## Configuration

### Environment variable

- `VITE_API_URL`: URL for the STAC FastAPI Collection Discovery API

### Runtime API configuration

Use the **Settings** button in the API Configuration panel to:

- Add or remove STAC API endpoints
- Review health status and diagnostics
- Inspect supported capabilities such as collection search and free-text search
- Reset to the default API list from `src/config.ts`

### Default API list

The default STAC APIs are configured in `src/config.ts` via
`DEFAULT_API_CONFIGURATIONS`.

## Releases and contribution workflow

Releases are managed by Release Please.
On pushes to `main`, GitHub Actions updates or opens a release PR based on
conventional commits.
Merging that release PR updates `CHANGELOG.md`, tags the release, and creates
its GitHub Release.

### Commit messages

Local commits are checked with Commitlint.
Use Conventional Commits such as:

- `feat(search): add API health badges`
- `fix(ci): read node version from .nvmrc`
- `docs(readme): clarify local API configuration`

### Pull request titles

PR titles must also follow Conventional Commits because squash merges turn the
PR title into the final commit message that Release Please reads.

### Tag format

Historical releases used bare tags like `2.2.0`.
New automated releases use `v`-prefixed tags such as `v2.2.1`.

### When a release PR does not appear

Check these first:

1. The merged commits on `main` use conventional commit types.
2. The `Release Please` workflow ran successfully.
3. There is not already an open release PR waiting to be merged.
4. The release baseline files (`package.json`, `CHANGELOG.md`, and
   `.release-please-manifest.json`) still agree.

## Usage

### Configure APIs

1. Open the **Settings** panel.
2. Add, remove, or enable the STAC APIs you want to search.
3. Review diagnostics if an endpoint is degraded or unsupported.

### Search collections

1. Enter a bounding box, date range, or free-text query.
2. Review aggregated results from the configured APIs.
3. Open **Details** for metadata, links, spatial coverage, and generated code
   hints.

### Pagination

- Use **Load More** when additional results are available.
- Results are appended without clearing the current list.
