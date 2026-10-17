# Changelog

All notable changes to `livewire-mapcn` will be documented in this file.

## v2.0.0 - 2026-10-17

### Livewire Mapcn v2.0.0

Feature parity with [mapcn](https://www.mapcn.dev): arcs, GeoJSON overlays, route progress and a 3D view. Maps now follow your Livewire state, load lazily, and run on MapLibre GL JS 6.

#### New

* **Arcs** (`<x-map-arc>`): curved connections between points, with hover paint, tooltip/popup slots and click/hover events. Works with `projection="globe"`.
* **GeoJSON overlays** (`<x-map-geojson>`): polygons, lines and points with fill/line/circle paints, hover states, tooltips, popups and `fit-bounds`. Use `<x-map blank>` for maps without a basemap.
* **Route progress**: `:progress` draws a travelled line. `progress-model` follows an Alpine property on the client, so sliders and playback make no server requests. `<x-map-route-marker at="start|end|progress|0.5">` pins markers to a route, optionally rotated to its heading.
* **3D view and custom controls**: a `three-d` toggle on `<x-map-controls>`, `<x-map-control>` for your own control markup, and the `$map` / `$mapRoute('id')` Alpine magics.
* **Map props**: `projection`, `blank`, `bounds`, `max-bounds`, `lazy`, `loader`, a `<x-slot:loading>` slot, `cooperative-gestures`, `options` and more. New providers: `openfreemap-liberty` (3D buildings), `openfreemap-bright`, `openfreemap-positron` and `blank`.
* **Livewire commands** accept `mapId` to target a single map. New commands include `map:ease-to`, `map:set-theme`, `map:route-progress-{id}`, `map:select-route-{id}`, `map:update-arc-data-{id}` and `map:update-geojson-{id}`. New events include `map:viewport-changed`, `map:arc-*`, `map:geojson-*` and `map:3d-toggled`.

#### Improved

* Components inside `<x-map>` update in place when Livewire re-renders, and the camera is preserved. Use `wire:key` in loops.
* Maps are created only when they come near the viewport. Commands sent before a map starts are queued. Pages with many maps load much faster.
* `@livewireMapStyles` preloads MapLibre and preconnects to tile hosts. OSRM directions are cached for the session and time out after 10s.
* Package assets are served with content-hashed, long-lived cache headers. Tailwind is no longer required.

#### Fixed

* Every map event reached Livewire listeners twice, doubling server requests.
* Maps and their WebGL contexts were never cleaned up on `wire:navigate`.
* Theme changes removed routes, clusters and other layers.
* Text containing quotes broke components, and cluster popups did not escape feature properties.
* `height="full"`, `style`, `:zoom="0"`, `with-stops` and `cluster-min-points` did not behave as documented.

#### ⚠️ Upgrading from v1

* **MapLibre v6 is ESM-only.** If you published the config, set `cdn_url` and `cdn_css_url` to `null`, or point `cdn_url` at a `.mjs` file. To stay on MapLibre v5, point it at a v5 `maplibre-gl.js`.
* **Published views:** re-publish them with `php artisan vendor:publish --tag=livewire-mapcn-views --force`.
* **Reactivity:** remove any `wire:ignore` you wrapped around maps.
* **Changed defaults:** marker popups and tooltips anchor automatically with a 16px offset, cluster circles are smaller, maps are lazy (`:lazy="false"` to opt out), and `height="full"` renders as `100%`.

Full guide: [Upgrading from v1](https://github.com/kwasii1/livewire-mapcn#upgrading-from-v1)

**Requirements:** PHP 8.3+, Laravel 11–13, Livewire 3 or 4.

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.1.0...v2.0.0

## v1.1.0 - 2026-06-07

### What's Changed

* laravel 13 support by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/12

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.9...v1.1.0

## v1.0.9 - 2026-05-26

### What's Changed

* feat: add disable popup prop feature by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/11

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.8...v1.0.9

## v1.0.8 - 2026-05-25

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.7...v1.0.8

## v1.0.7 - 2026-05-19

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.6...v1.0.7

## v1.0.6 - 2026-05-02

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.5...v1.0.6

## v1.0.5 - 2026-05-02

### What's Changed

* feat: agent skills and guidelines for laravel boost by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/10

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.4...v1.0.5

## v1.0.4 - 2026-03-04

### What's Changed

* feat: route-list positioning fix by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/6

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.3...v1.0.4

## v1.0.3 - 2026-03-04

### What's Changed

* Fix routing issues by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/5

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.2...v1.0.3

## v1.0.2 - 2026-03-04

### What's Changed

* Enhance map and route components with custom events and alternatives by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/4

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.1...v1.0.2

## v1.0.1 - 2026-03-01

### What's Changed

* Cluster performance by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/3

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/compare/v1.0.0...v1.0.1

## v1.0.0 - 2026-02-25

### What's Changed

* First Release by @kwasii1 in https://github.com/kwasii1/livewire-mapcn/pull/1

### New Contributors

* @kwasii1 made their first contribution in https://github.com/kwasii1/livewire-mapcn/pull/1

**Full Changelog**: https://github.com/kwasii1/livewire-mapcn/commits/v1.0.0
