# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## Unreleased

- Nothing yet.

## [2.3.0](https://github.com/developmentseed/federated-collection-discovery/compare/federated-collection-discovery-v2.2.0...federated-collection-discovery-v2.3.0) (2026-05-29)


### Features

* ApiConfigPanel usability improvements ([#130](https://github.com/developmentseed/federated-collection-discovery/issues/130)) ([09acaf1](https://github.com/developmentseed/federated-collection-discovery/commit/09acaf1235795b6686407c2d0b7da580b6b8e4c4))
* handle upstream api failures reported via X-Failed-Upstream-Apis ([#183](https://github.com/developmentseed/federated-collection-discovery/issues/183)) ([0b301f3](https://github.com/developmentseed/federated-collection-discovery/commit/0b301f3bd4bbb036414f0b447e06f62b090ceb98))
* switch to OpenLayers and ol-stac ([#111](https://github.com/developmentseed/federated-collection-discovery/issues/111)) ([98a9ef0](https://github.com/developmentseed/federated-collection-discovery/commit/98a9ef0bcd0e6dd01e939a9952b0be608b29b327))


### Bug Fixes

* concatenate search terms with AND (if no search operators are used) ([#119](https://github.com/developmentseed/federated-collection-discovery/issues/119)) ([8fc83a3](https://github.com/developmentseed/federated-collection-discovery/commit/8fc83a300778b81f243dc7c2fc06e9c555df342b))
* use scalar for api docs ([#123](https://github.com/developmentseed/federated-collection-discovery/issues/123)) ([55770af](https://github.com/developmentseed/federated-collection-discovery/commit/55770af86d99aa3356e540abd2d3b629c3e4a06d))

## 2.2.0

### Historical

- Release tag exists in git history. Detailed release notes were not captured in
  this changelog before release automation was introduced.

## 2.1.1

### Historical

- Release tag exists in git history. Detailed release notes were not captured in
  this changelog before release automation was introduced.

## 2.1.0

### Added

- Usability improvements to the API config panel.
- Validation checks for user-provided STAC APIs.
- Simpler interface for API configuration.

## 2.0.2

### Dependencies

- Upgrade to Tailwind CSS v4.
- Remove `react-syntax-highlighting`.

## 2.0.1

### Fixed

- Switch to Scalar for the API docs modal.
- Make the logo link back to the home page.

## 2.0.0

### UI/UX Improvements

- Migrate from Chakra UI to shadcn/ui + Tailwind CSS for improved aesthetics
  and a smaller bundle size.
- Migrate from Create React App to Vite for faster builds and a simpler local
  development loop.
- Implement centralized responsive design utilities using
  class-variance-authority (CVA).
  - Create reusable utility functions for consistent spacing, sizing, and
    layout patterns.
  - Standardize touch targets, dialogs, sidebars, and responsive breakpoint
    behavior.
  - Apply CVA utilities across major components, including `stack()`,
    `hstack()`, `touchTarget()`, `dialog()`, and `sidebar()`.
- Improve mobile responsiveness with a side-sheet drawer for the search panel.
- Enhance accessibility with comprehensive ARIA labels, keyboard navigation,
  visible focus states, screen-reader support, and reduced-motion support.
- Add dark mode theming with automatic system preference detection.
- Improve table design with sticky headers, zebra striping, and hover states.
- Improve form validation with inline error messages.
- Improve touch targets with a 44px minimum tap area.

## 1.1.0

### Added

- Switch from Leaflet to OpenLayers + `ol-stac`.

## 1.0.0

### User-facing changes

- Users can now specify which STAC APIs get searched.
  - Add a configuration modal where users can add new APIs and enable or
    disable pre-configured APIs.
- Disable free-text search when any upstream API does not support free-text +
  collection search.

### Backend changes

- Remove the collection search API from this repo. The discovery app now
  queries a STAC API that runs federated collection search.
- Allow API-specific filters to limit results returned from each upstream API,
  such as excluding NASA-hosted collections from ESA responses.
  - These filters can be defined per deployment using a `config.ts` file that
    is applied at build time.
- Generate item-search code hints in the client app instead of returning them
  with search results.

## 0.1.9

### Fixed

- Set the project up so you can run everything from the root directory.
- Use `polygons` if the `boxes` field is missing from CMR results.
- Skip the collection map if `spatial_extent` is empty in the details page.

## 0.1.8

### Added

- Add Earthaccess and rstac code hints.
- Surface API errors and warnings in the client app.
- Validate bounding box input in the search form of the client app.
- Attempt to normalize spatial extents if the format is bad.

## 0.1.7

### Fixed

- Do not suggest users run `search.item_collection()` since that might return a
  massive number of items.

## 0.1.6

### Fixed

- Display all bounding boxes from a collection's spatial extent in the details
  map [#27](https://github.com/developmentseed/federated-collection-discovery/pull/27).
- Improve the format of temporal range in collection details.

## 0.1.5

### Added

- Replace STAC collection filter code with
  `pystac_client.Client.collection_search`
  [#26](https://github.com/developmentseed/federated-collection-discovery/pull/26).
- Migrate from Poetry to uv
  [#26](https://github.com/developmentseed/federated-collection-discovery/pull/26).
- Upgrade to `httpx==0.27.2`.

## 0.1.4

### Fixed

- Do not try to return a `set` from a `dict` in CMR search.

## 0.1.3

### Added

- Add a link to the GitHub source in the client application.

## 0.1.2

### Added

- Enable `stac_api_urls` and `cmr_urls` parameters to override the default APIs
  to search.
- Improve descriptions for the API and its parameters.
- Enable sorting in the results table in the client application.
- Reuse the `openapi.json` description in the client application.

## 0.1.1

### Added

- Make the client application responsive to window size.
- Implement free-text search as defined by the
  [Free-Text STAC API extension](https://github.com/stac-api-extensions/freetext-search)
  ([#14](https://github.com/developmentseed/federated-collection-discovery/pull/1)).
- Run `check_health` asynchronously.

## 0.1.0

### Added

- Ability to crawl through the STAC API `/collections` endpoint
  [#1](https://github.com/developmentseed/federated-collection-discovery/pull/1).
- Ability to search the CMR API
  [#1](https://github.com/developmentseed/federated-collection-discovery/pull/1).
- Rudimentary client application
  [#3](https://github.com/developmentseed/federated-collection-discovery/pull/3).
- Concurrent API queries
  [#9](https://github.com/developmentseed/federated-collection-discovery/pull/9).
