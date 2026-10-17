## livewire-mapcn

This package provides interactive, reactive map components for Laravel Livewire applications, powered by MapLibre GL JS and Alpine.js. It offers Blade components for rendering tile-based maps with markers, popups, routes (with progress), arcs, GeoJSON overlays, clusters, 3D view and custom controls, all reactive to Livewire state: children of `x-map` update in place when the Livewire component re-renders (use `wire:key` in loops).

Coordinate order: All coordinates use [lng, lat] order (longitude first). This matches MapLibre GL JS conventions, not the typical [lat, lng] order.

### Installation & Setup

1. Install via Composer: `composer require kwasii/livewire-mapcn`
2. Publish config (optional): `php artisan vendor:publish --tag=livewire-mapcn-config`
3. Publish assets (optional): `php artisan vendor:publish --tag=livewire-mapcn-assets`
4. Add to your Blade layout:

@verbatim
<code-snippet name="Add map styles and scripts to layout" lang="blade">
<head>
    @livewireMapStyles
</head>
<body>
    @livewireScripts
    @livewireMapScripts
</body>
</code-snippet>
@endverbatim

Alpine.js ships with Livewire; Tailwind is not required (the package CSS styles every component). MapLibre GL JS v6 (ESM-only) is imported from jsDelivr by `@livewireMapScripts` and exposed as `window.maplibregl`. Assets are served automatically via cache-busted package routes, so publishing is optional. Do not add `wire:ignore` around `x-map`; it already uses `wire:ignore.self`.

### Configuration (config/livewire-mapcn.php)

Key options:

- `default_provider` — default tile provider, default: `carto-positron`
- `dark_provider` — tile provider for dark theme, default: `carto-dark-matter`
- `default_height` — CSS height fallback, default: `full`
- `default_zoom` — initial zoom fallback, default: `7`
- `default_center` — center [lng, lat] fallback, default: `[0, 0]`
- `osrm_url` — OSRM routing server, default: `https://router.project-osrm.org`
- `inject_assets` — `route` (auto via Laravel routes) or `published` (public assets)
- `load_from_cdn` — load MapLibre from CDN, default: `true`
- `maplibre_version` — MapLibre GL JS version, default: `6.14.0`
- `cdn_url` — MapLibre JS URL, default `null` (derived from the version). A `.mjs` URL loads as an ES module, anything else as a classic script (e.g. a v5 UMD build)
- `cdn_css_url` — MapLibre CSS URL, default `null` (derived from the version)
- `follow_system_theme` — with `theme="auto"`, also follow `prefers-color-scheme`, default: `false`
- `carto_license` — informational only
- `cluster_popup_view` — Blade view used as the default cluster point popup ({property} placeholders work)
- `custom_events` — array of MapLibre event names to forward globally as `map:*`

### Built-in Tile Providers

- `carto-positron` — minimal light (default)
- `carto-voyager` — light with road detail
- `carto-dark-matter` — dark
- `openfreemap-liberty` — OpenFreeMap with 3D building extrusions (pair with `:pitch`)
- `openfreemap-bright`, `openfreemap-positron` — OpenFreeMap styles
- `osm-raster` — OpenStreetMap raster tiles
- `blank` — transparent, no basemap (or use the `blank` prop)

For custom tiles, pass a MapLibre style JSON URL (or style array) to the `style` prop; it applies to both themes unless `dark-style` is set.

### Core Blade Components

All map components must be nested inside `x-map`. All accept standard HTML attributes.

`x-map` — Root map container. Must wrap all other components.

@verbatim
<code-snippet name="Basic map" lang="blade">
<x-map :center="[-0.09, 51.5]" :zoom="13" height="500px" provider="carto-positron">
    <x-map-controls position="top-right" />
</x-map>
</code-snippet>
@endverbatim

Key props: `id` (give one when targeting the map with commands), `center` ([lng, lat] array), `zoom` (float), `min-zoom`, `max-zoom`, `provider`, `style` (URL or array), `theme` (auto, light, or dark), `height` (`full`, px int, or any CSS value), `width`, `bearing`, `pitch`, `max-pitch`, `projection` (`globe`), `blank`, `bounds` + `bounds-padding` (initial fit), `max-bounds`, `interactive`, `scroll-zoom`, `double-click-zoom`, `drag-pan`, `drag-rotate`, `touch-zoom-rotate`, `pitch-with-rotate`, `cooperative-gestures`, `render-world-copies`, `attribution`, `attribution-compact`, `loader` (default from config `loader`; customise with `<x-slot:loading>` or the `--lm-loader-*` CSS variables), `light-style`, `dark-style`, `events` (additional MapLibre events to forward), `options` (raw MapLibre Map options).

`x-map-controls` — MapLibre controls. Props: `zoom` (bool), `compass` (bool), `locate` (bool), `fullscreen` (bool, default false), `scale` (bool, default false), `scale-unit`, `three-d` (bool, 3D view toggle button), `three-d-pitch` (60), `three-d-bearing` (-20), `three-d-duration`, `visualize-pitch` (default true), `position` (top-right, top-left, bottom-right, bottom-left).

`x-map-control` — custom control: any markup pinned to a corner (`position`: top-left, top-right, bottom-left, bottom-right, top, bottom). Inside it, the Alpine magic `$map` is the MapLibre instance.

@verbatim
<code-snippet name="3D view toggle and a custom control" lang="blade">
<x-map provider="openfreemap-liberty" :center="[-0.1276, 51.5072]" :zoom="15.5" :pitch="55">
    <x-map-controls three-d :locate="false" />
    <x-map-control position="top-left">
        <button type="button" x-on:click="$map.easeTo({ pitch: 60, bearing: -20, duration: 1000 })">3D view</button>
        <button type="button" x-on:click="$map.easeTo({ pitch: 0, bearing: 0, duration: 1000 })">Top down</button>
    </x-map-control>
</x-map>
</code-snippet>
@endverbatim

`x-map-marker` — Marker at a coordinate. Must be inside `x-map`.

@verbatim
<code-snippet name="Marker with popup and tooltip" lang="blade">
<x-map-marker :lat="51.5" :lng="-0.09" color="#ef4444" :draggable="false">
    <x-marker-label text="London Office" position="top" />
    <x-marker-tooltip text="Hover for info" />
    <x-marker-popup>
        <h3>Our HQ</h3>
        <p>Visit us anytime!</p>
    </x-marker-popup>
</x-map-marker>
</code-snippet>
@endverbatim

Key props: `lat` (float, required), `lng` (float, required), `id` (UUID auto-generated), `draggable`, `color` (hex), `anchor` (bottom, top, left, right, center), `offset` ([x, y]), `rotation`, `rotation-alignment`, `pitch-alignment`, `opacity`.

Markers from Livewire state update in place: render them in a `@foreach` with `wire:key` and change the array.

Marker sub-components (used inside `x-map-marker`):
- `x-marker-content` — fully custom HTML marker icon. Props: `class`.
- `x-marker-label` — text label near the marker. Props: `text` (or slot), `position` (top, bottom, left, right), `class`.
- `x-marker-tooltip` — hover tooltip. Props: `text` (or slot for rich content), `anchor` (default: auto), `offset` (default: 16), `class`.
- `x-marker-popup` — click-to-open popup. Props: `max-width` (default: 300px), `close-button` (default: true), `close-on-click-map`, `close-on-move`, `anchor` (default: auto), `offset` (default: 16).

`x-map-popup` — Standalone popup anchored to fixed coordinates.

@verbatim
<code-snippet name="Standalone popup" lang="blade">
<x-map-popup :lat="51.5" :lng="-0.09" :open="true" max-width="300px">
    <p>Custom popup content</p>
</x-map-popup>
</code-snippet>
@endverbatim

Props: `lat`, `lng` (required), `open` (default: true), `max-width`, `close-button` (default: false), `close-on-click-map`, `close-on-move`, `anchor`, `offset`.

`x-map-cluster-layer` — Clustered point layer from a PHP array or a GeoJSON URL.

@verbatim
<code-snippet name="Cluster layer with popup slot" lang="blade">
<x-map-cluster-layer :data="$locations" cluster-color="#3b82f6" :cluster-max-zoom="14">
    <x-slot:popup>
        <div class="p-3">
            <h3 class="font-semibold">{name}</h3>
            <p class="text-xs text-gray-500">{address}</p>
        </div>
    </x-slot:popup>
</x-map-cluster-layer>
</code-snippet>
@endverbatim

Key props: `data` (array with lat/lng keys), `url` (GeoJSON endpoint URL), `id`, `cluster-max-zoom`, `cluster-radius`, `cluster-min-points`, `cluster-color`, `cluster-colors` + `cluster-thresholds` (stepped colors, e.g. `['#60a5fa', '#2563eb', '#1e3a8a']` with `[25, 100]`), `cluster-text-color`, `cluster-size-stops` (default: [[0,18],[100,26],[1000,34]]), `point-color`, `point-stroke-color`, `point-radius`, `show-count`, `text-font`, `popup-property`, `popup-template`, `disable-popup`, `click-zoom`, `buffer`, `tolerance`.

Popup priority: the `x-slot:popup` slot takes highest priority, then `popup-template`, then `popup-property`, then auto lat/lng display.

Use `{propertyName}` placeholders in popup HTML. `{lat}` and `{lng}` are always available.

`x-map-route` — Single route polyline, with optional OSRM directions.

@verbatim
<code-snippet name="Route with OSRM directions" lang="blade">
<x-map-route
    :coordinates="[[-0.12, 51.51], [-0.10, 51.50]]"
    color="#1A56DB"
    :width="4"
    :fetch-directions="true"
    directions-profile="driving"
    :with-stops="true"
    :animate="true"
    :animate-duration="3000"
/>
</code-snippet>
@endverbatim

Key props: `coordinates` (array of [lng, lat] pairs, required), `id`, `color`, `width`, `opacity`, `dash-array`, `line-cap`, `line-join`, `active`, `active-color`, `active-width`, `active-opacity`, `active-dash-array`, `hover-color`, `clickable`, `with-stops` (dots at your waypoints), `stop-color`, `fetch-directions`, `directions-profile` (driving, walking, or cycling), `directions-url`, `animate`, `animate-duration`, `alternatives`, `max-alternatives`, `alternative-color`, `alternative-opacity`, `alternative-width`, `progress` (0–1), `progress-color`, `progress-width`, `progress-opacity`, `progress-dash-array`, `progress-model` (Alpine expression followed on the client), `progress-duration` (ms tween), `before-id`, `fit-bounds`.

Route progress + route markers (`x-map-route-marker` nested in the route; `at` = start, end, progress, or a 0–1 fraction):

@verbatim
<code-snippet name="Delivery route with progress" lang="blade">
<div x-data="{ progress: $wire.entangle('progress') }">
<x-map-route id="delivery" :coordinates="$stops" fetch-directions color="#94a3b8" :width="5" :dash-array="[0.5, 1.5]" progress-model="progress" progress-color="#2563eb" fit-bounds>
    <x-map-route-marker at="start" />
    <x-map-route-marker at="end" />
    <x-map-route-marker at="progress" align-to-route>
        <x-marker-content><div class="vehicle">🚚</div></x-marker-content>
    </x-map-route-marker>
</x-map-route>
<input type="range" min="0" max="1" step="0.01" x-model.number="progress">
</div>
</code-snippet>
@endverbatim

Keep high-frequency progress on the client: `progress-model` follows an Alpine property (entangle it, deferred, to sync with Livewire). Never bind a progress slider with `wire:model.live` (one request per movement). Other options: `:progress="$progress"` for occasional server-driven updates, `$mapRoute('delivery').setProgress(1, 1500)` in Alpine, or `$this->dispatch('map:route-progress-delivery', progress: 1, duration: 1500)` from PHP.

`x-map-arc` — curved lines between point pairs (Bézier, crosses the antimeridian the short way). Each datum: `['id' => ..., 'from' => [lng, lat], 'to' => [lng, lat], ...extra]`; extra keys become properties for paint expressions and `{placeholders}`.

@verbatim
<code-snippet name="Interactive arcs with tooltip" lang="blade">
<x-map projection="globe" :zoom="1.2">
    <x-map-arc id="flights" :data="$flights" :curvature="0.25"
        :paint="['line-color' => ['match', ['get', 'mode'], 'air', '#a78bfa', 'sea', '#34d399', '#888'], 'line-width' => 1.5]"
        :hover-paint="['line-width' => 3, 'line-opacity' => 1]">
        <x-slot:tooltip>{city} · {mode}</x-slot:tooltip>
    </x-map-arc>
</x-map>
</code-snippet>
@endverbatim

Props: `data`, `id`, `curvature` (0.2; negative bows the other way), `samples` (64), `paint`, `layout`, `hover-paint`, `interactive` (true), `before-id`, `fit-bounds`. Slots: `tooltip`, `popup`.

`x-map-geojson` — render any GeoJSON (polygons → fill + outline, lines, points → circles).

@verbatim
<code-snippet name="GeoJSON overlay" lang="blade">
<x-map-geojson id="zones" :data="$featureCollection" interactive fit-bounds
    :fill-paint="['fill-color' => '#3b82f6', 'fill-opacity' => 0.25]"
    :fill-hover-paint="['fill-opacity' => 0.45]"
    :line-paint="['line-color' => '#2563eb', 'line-width' => 2]">
    <x-slot:popup><strong>{name}</strong></x-slot:popup>
</x-map-geojson>
</code-snippet>
@endverbatim

Props: `data` (array or URL string), `id`, `promote-id`, `fill-paint` / `line-paint` / `circle-paint` (array merged over theme-aware defaults, or `false` to drop the layer), `fill-hover-paint`, `line-hover-paint`, `circle-hover-paint`, `interactive` (false), `before-id`, `fit-bounds`, `fit-bounds-padding`. Slots: `tooltip`, `popup`. Use `<x-map blank>` for GeoJSON-only maps.

`x-map-route-group` — Multiple selectable routes with click-to-activate behavior. Pair with `x-map-route-list` for a selection UI.

@verbatim
<code-snippet name="Route group with selection panel" lang="blade">
<x-map-route-group
    id="trip-routes"
    :routes="$routes"
    :selected-route="0"
    :fetch-directions="true"
    directions-profile="driving"
    :fit-bounds="true"
    :with-stops="true"
/>
<x-map-route-list
    route-id="trip-routes"
    position="top-left"
    title="Available Routes"
    :show-distance="true"
    :show-duration="true"
    :show-fastest-badge="true"
/>
</code-snippet>
@endverbatim

The `$routes` array: each item needs at minimum a `coordinates` key (array of [lng, lat] pairs). Optional per-route overrides: `id`, `color`, `width`.

Key `x-map-route-group` props: `routes` (required), `selected-route` (int or id, default: 0), `fit-bounds`, `alternative-color`, `alternative-opacity`, `alternative-width`, `line-cap`, `line-join`, `clickable`, `fetch-directions`, `directions-profile`, `directions-url`, `animate`, `animate-duration`, `with-stops`, `stop-color`, `active-color`, `active-width`, `hover-color`, `dash-array`.

Key `x-map-route-list` props: `route-id` (the id of an `x-map-route` with `alternatives`; the list may live anywhere on the page), `show-distance`, `show-duration`, `show-fastest-badge`, `show-time-diff`, `position` (top-left, top-right, bottom-left, bottom-right), `title`, `width`, `container-class`, `header-class`, `item-class`.

### Livewire Interactivity

Outbound events dispatched to Livewire/Alpine:

Every event detail includes `mapId`. Map: `map:loaded`, `map:click` (lat,lng), `map:double-click`, `map:right-click`, `map:move` (throttled 100ms), `map:center-changed`, `map:zoom` (throttled), `map:zoom-changed`, `map:bounds-changed`, `map:drag-end`, `map:bearing-changed` (throttled), `map:pitch-changed` (throttled), `map:viewport-changed` (center, zoom, bearing, pitch), `map:style-loaded`, `map:style-reloaded`, `map:theme-changed` (dark), `map:3d-toggled` (enabled).

Locate: `map:locate-success` (lat, lng, accuracy), `map:locate-error`.

Markers: `map:marker-clicked` (id, lat, lng), `map:marker-drag-start`, `map:marker-drag`, `map:marker-drag-end`, `map:marker-mouseenter`, `map:marker-mouseleave`, `map:marker-popup-open` (id), `map:marker-popup-close` (id).

Popups: `map:popup-open` (id), `map:popup-close` (id).

Routes: `map:route-clicked` (id), `map:route-mouseenter`, `map:route-mouseleave`, `map:route-directions-ready` (id, distance, duration), `map:route-directions-error`, `map:route-alternative-selected` (id, alternativeIndex), `map:route-updated` (id).

Route group: `map:route-group-selection-changed` (groupId, routeIndex).

Clusters: `map:cluster-clicked` (cluster_id, lat, lng, count), `map:cluster-expanded`, `map:cluster-point-clicked` (properties, lat, lng).

Arcs: `map:arc-clicked`, `map:arc-hovered` (id, arc|null, lat, lng). GeoJSON: `map:geojson-clicked`, `map:geojson-hovered` (id, feature|null, lat, lng).

Route list: `map:route-list-selected` (routeIndex).

Inbound commands dispatched from Livewire to the map:

@verbatim
<code-snippet name="Fly to a location from Livewire" lang="php">
$this->dispatch('map:fly-to', [
    'center' => [-0.09, 51.5],
    'zoom' => 12,
    'essential' => true,
]);
</code-snippet>
@endverbatim

Add `mapId` to any map command to target one map (otherwise every map on the page reacts). Available commands: `map:fly-to` (center, zoom, bearing, pitch, essential), `map:jump-to`, `map:ease-to`, `map:fit-bounds` (bounds, padding, maxZoom), `map:set-zoom`, `map:set-center`, `map:set-bearing`, `map:set-pitch`, `map:set-style`, `map:set-theme` (light, dark, auto), `map:resize`, `map:force-animate` (id?, duration?), `map:call` (method, args). Dynamic data: `map:update-route-data-{id}` (coordinates, styling, progress), `map:route-progress-{id}` (progress, duration), `map:select-route-{id}` (index), `map:update-cluster-data-{id}` (GeoJSON), `map:update-arc-data-{id}` (data), `map:update-geojson-{id}` (GeoJSON), `map:update-route-group-{id}` (routes, selectedRoute).

### GeoJSON Helper

Use `GeoJSON::fromArray()` to convert PHP arrays into GeoJSON FeatureCollections for dynamic cluster updates:

@verbatim
<code-snippet name="Dynamic cluster update" lang="php">
use Kwasii\LivewireMapcn\Support\GeoJSON;

$this->dispatch(
    "map:update-cluster-data-{$clusterId}",
    GeoJSON::fromArray($filteredLocations)
);
</code-snippet>
@endverbatim

The helper accepts items with `lat`/`lng` keys, or raw GeoJSON Feature objects. Extra keys (and a `properties` array) go into `properties`.

### Performance Tips

- Use `x-map-cluster-layer` for 100+ points — never render individual `x-map-marker` at scale.
- Children of `x-map` update in place on re-render; for high-frequency changes (live tracking, sliders) use `map:update-*` / `map:route-progress-{id}` commands to skip the server round trip.
- Large data (clusters, arcs, GeoJSON, route groups) is shipped in a JSON `<script>` block, not an HTML attribute.
- Maps are lazy by default (`lazy` config / `:lazy` prop): created only near the viewport or once a hidden container is shown. Commands sent before a map starts are queued. Many maps on one page are fine.
- Use your own OSRM server (`osrm_url`) in production; the public demo server is rate-limited.
- Continuous events (`map:move`, `map:zoom`, `map:bearing-changed`, `map:pitch-changed`) are throttled at 100ms. Use `map:center-changed` and `map:zoom-changed` for final post-movement values.
- Set `inject_assets` to `published` and use a CDN for production asset delivery.
