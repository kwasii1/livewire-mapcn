## livewire-mapcn

This package provides interactive, reactive map components for Laravel Livewire applications, powered by MapLibre GL JS and Alpine.js. It offers Blade components for rendering tile-based maps with markers, popups, routes, clusters, and custom controls — all reactive to Livewire state.

> **Coordinate order**: All coordinates in this package use **`[lng, lat]`** order (longitude first), not `[lat, lng]`. This matches MapLibre GL JS conventions.

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
    ...
    @livewireScripts
    @livewireMapScripts
</body>
</code-snippet>
@endverbatim

Alpine.js and Tailwind CSS must be present in the project — they are required dependencies.

Assets are served automatically via package routes (`/livewire-mapcn/livewire-mapcn.js`, `/livewire-mapcn/livewire-mapcn.css`) — publishing is not required unless you want full control over asset delivery.

### Configuration (`config/livewire-mapcn.php`)

| Key | Default | Description |
|-----|---------|-------------|
| `default_provider` | `'carto-positron'` | Default tile provider |
| `dark_provider` | `'carto-dark-matter'` | Tile provider for dark theme |
| `default_height` | `'full'` | Default CSS height |
| `default_zoom` | `7` | Default initial zoom level |
| `default_center` | `[0, 0]` | Default center `[lng, lat]` |
| `osrm_url` | `'https://router.project-osrm.org'` | OSRM routing server base URL |
| `inject_assets` | `'route'` | `'route'` (Laravel routes) or `'published'` (public assets) |
| `load_from_cdn` | `true` | Load MapLibre JS/CSS from CDN |
| `maplibre_version` | `'5.19.0'` | MapLibre GL JS CDN version |
| `cdn_url` | CDN URL for MapLibre GL JS | Override to self-host |
| `cdn_css_url` | CDN URL for MapLibre GL CSS | Override to self-host |
| `carto_license` | `'non-commercial'` | `'non-commercial'` or `'enterprise'` |
| `cluster_popup_view` | `null` | Optional Blade view for cluster popups |
| `custom_events` | `[]` | MapLibre event names to forward globally as `map:*` |

### Built-in Tile Providers

| Key | Style |
|-----|-------|
| `carto-positron` | Minimal light (default) |
| `carto-voyager` | Light with detail |
| `carto-dark-matter` | Dark |
| `osm-raster` | OpenStreetMap raster tiles |

For custom tiles, pass a MapLibre style JSON URL directly to the `style` prop.

### Core Blade Components

All map components must be nested inside `<x-map>`. All accept standard HTML attributes.

**`<x-map>`** — Root map container. Must wrap all other components.

@verbatim
<code-snippet name="Basic map" lang="blade">
<x-map :center="[-0.09, 51.5]" :zoom="13" height="500px" provider="carto-positron">
    {{-- child components go here --}}
</x-map>
</code-snippet>
@endverbatim

Key props: `center` (`[lng, lat]` array), `zoom` (int), `min-zoom`, `max-zoom`, `provider`, `style` (URL), `theme` (`'auto'|'light'|'dark'`), `height` (CSS), `width` (CSS), `bearing` (float), `pitch` (float 0–60), `interactive`, `scroll-zoom`, `double-click-zoom`, `drag-pan`, `light-style`, `dark-style`, `events` (additional MapLibre events to forward).

**`<x-map-controls>`** — UI controls overlay. Props: `zoom` (bool), `compass` (bool), `locate` (bool), `fullscreen` (bool, default false), `scale` (bool, default false), `position` (`'top-right'|'top-left'|'bottom-right'|'bottom-left'`).

**`<x-map-marker>`** — Marker at a coordinate. Must be inside `<x-map>`.

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

Key props: `lat` (float, required), `lng` (float, required), `id` (UUID auto-generated), `draggable`, `color` (hex), `anchor` (`'bottom'|'top'|'left'|'right'|'center'`), `offset` (`[x, y]`), `rotation`, `rotation-alignment`, `pitch-alignment`.

**Marker sub-components:**
- `<x-marker-content>` — Fully custom HTML marker icon (replaces default dot). Props: `class`.
- `<x-marker-label>` — Text label near the marker with frosted-glass styling. Props: `text` (required), `position` (`'top'|'bottom'|'left'|'right'`), `class`.
- `<x-marker-tooltip>` — Hover tooltip styled as a dark/light pill. Props: `text` (required), `anchor` (default `'top'`), `offset` (default `[0, -10]`), `class`.
- `<x-marker-popup>` — Click-to-open popup. Props: `max-width` (default `'300px'`), `close-button` (default `true`), `close-on-click-map`, `close-on-move`, `anchor` (default `'bottom'`), `offset`.

**`<x-map-popup>`** — Standalone popup anchored to fixed coordinates (not attached to a marker).

@verbatim
<code-snippet name="Standalone popup" lang="blade">
<x-map-popup :lat="51.5" :lng="-0.09" :open="true" max-width="300px">
    <p>Custom popup content</p>
</x-map-popup>
</code-snippet>
@endverbatim

Props: `lat`, `lng` (required), `open` (default `true`), `max-width`, `close-button` (default `false`), `close-on-click-map`, `close-on-move`, `anchor`, `offset`.

**`<x-map-cluster-layer>`** — Clustered point layer from a PHP array or a GeoJSON URL.

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

Key props: `data` (array with `lat`/`lng` keys), `url` (GeoJSON endpoint URL), `id`, `cluster-max-zoom`, `cluster-radius`, `cluster-min-points`, `cluster-color`, `cluster-text-color`, `cluster-size-stops` (default `[[0,30],[100,40],[1000,50]]`), `point-color`, `point-radius`, `show-count`, `popup-property`, `popup-template`, `click-zoom`, `buffer`, `tolerance`, `max-features-to-inline` (default `2000`).

**Popup priority order:** `<x-slot:popup>` > `popup-template="..."` > `popup-property="name"` > auto (shows lat/lng).

**`<x-map-route>`** — Single route polyline, with optional OSRM directions.

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

Key props: `coordinates` (array of `[lng, lat]` pairs, required), `id`, `color`, `width`, `opacity`, `dash-array`, `line-cap`, `line-join`, `active-color`, `active-width`, `hover-color`, `clickable`, `with-stops`, `stop-color`, `fetch-directions`, `directions-profile` (`'driving'|'walking'|'cycling'`), `directions-url`, `animate`, `animate-duration`, `active`, `alternatives`, `max-alternatives`, `alternative-color`, `alternative-opacity`, `alternative-width`.

**`<x-map-route-group>`** — Multiple selectable routes with click-to-activate behavior.

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

The `$routes` array: each item needs at minimum a `coordinates` key (array of `[lng, lat]` pairs). Optional per-route overrides: `id`, `color`, `width`.

Key `<x-map-route-group>` props: `routes` (required), `selected-route` (int index or id, default `0`), `fit-bounds`, `alternative-color`, `alternative-opacity`, `alternative-width`, `line-cap`, `line-join`, `clickable`, `fetch-directions`, `directions-profile`, `directions-url`, `animate`, `animate-duration`, `with-stops`, `stop-color`, `active-color`, `active-width`, `hover-color`, `dash-array`.

Key `<x-map-route-list>` props: `route-id` (matches the `id` of `<x-map-route-group>` or `<x-map-route>`), `map-id`, `show-distance`, `show-duration`, `show-fastest-badge`, `show-time-diff`, `position` (`'top-left'|'top-right'|'bottom-left'|'bottom-right'`), `title`, `width`, `container-class`, `header-class`, `item-class`.

### Livewire Interactivity

#### Outbound events (dispatched to Livewire/Alpine)

Map events: `map:loaded`, `map:click` (lat,lng), `map:double-click`, `map:right-click`, `map:move` (throttled 100ms), `map:center-changed`, `map:zoom` (throttled), `map:zoom-changed`, `map:bounds-changed`, `map:drag-end`, `map:bearing-changed` (throttled), `map:pitch-changed` (throttled), `map:style-loaded`.

Locate events: `map:locate-success` (lat, lng, accuracy), `map:locate-error`.

Marker events: `map:marker-clicked` (id, lat, lng), `map:marker-drag-start`, `map:marker-drag`, `map:marker-drag-end`, `map:marker-mouseenter`, `map:marker-mouseleave`, `map:marker-popup-open` (id), `map:marker-popup-close` (id).

Popup events: `map:popup-open` (id), `map:popup-close` (id).

Route events: `map:route-clicked` (id), `map:route-mouseenter`, `map:route-mouseleave`, `map:route-directions-ready` (id, distance, duration), `map:route-directions-error`, `map:route-alternative-selected` (id, alternativeIndex), `map:route-updated` (id).

Route group events: `map:route-group-selection-changed` (groupId, routeIndex).

Cluster events: `map:cluster-clicked` (clusterId, lat, lng), `map:cluster-expanded`, `map:cluster-point-clicked` (properties, lat, lng).

Route list events: `map:route-list-selected` (routeIndex).

#### Inbound commands (dispatched from Livewire to the map)

@verbatim
<code-snippet name="Fly to a location from Livewire" lang="php">
$this->dispatch('map:fly-to', [
    'center' => [-0.09, 51.5],
    'zoom' => 12,
    'essential' => true,
]);
</code-snippet>
@endverbatim

| Command | Payload | Description |
|---------|---------|-------------|
| `map:fly-to` | `center, zoom, bearing, pitch, essential` | Smooth animated pan/zoom |
| `map:jump-to` | `center, zoom, bearing, pitch` | Instant move |
| `map:fit-bounds` | `bounds, padding, maxZoom` | Fit map to bounds |
| `map:set-zoom` | `zoom` | Set zoom level |
| `map:set-bearing` | `bearing` | Set rotation |
| `map:set-pitch` | `pitch` | Set tilt |
| `map:set-style` | `style` | Change tile style |
| `map:resize` | — | Force map resize |
| `map:force-animate` | — | Re-trigger route animation |
| `map:call` | `method, args` | Call any MapLibre GL JS method directly |
| `map:update-route-data-{id}` | `coordinates` | Update route coordinates dynamically |
| `map:update-cluster-data-{id}` | GeoJSON FeatureCollection | Update cluster data without re-render |
| `map:update-route-group-{id}` | `routes, selectedRoute, ...` | Update route group dynamically |

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

The helper accepts items with `lat`/`lng` keys, or raw GeoJSON Feature objects. Extra keys are stored in `properties`.

### Performance Tips

- **Large datasets**: Use `<x-map-cluster-layer>` for 100+ points — never render individual `<x-map-marker>` at scale.
- **Dynamic updates**: Use the `map:update-*` commands to push data changes without Livewire re-rendering the map.
- **`:max-features-to-inline`**: Default `2000` — above this threshold data is injected via JS rather than HTML attributes.
- **Throttled events**: `map:move`, `map:zoom`, `map:bearing-changed`, `map:pitch-changed` fire at ~100ms intervals. Use `map:center-changed`, `map:zoom-changed` for final values after movement stops.
- **`inject_assets`**: Set to `'published'` and use a CDN for assets in production.
