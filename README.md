# Livewire Mapcn

A Laravel Livewire package inspired by [mapcn.dev](https://mapcn.dev). Easily integrate beautiful, interactive maps into your Laravel applications using MapLibre GL JS, Tailwind CSS, and Alpine.js.

---

## Getting Started

`livewire-mapcn` provides a set of Blade components that wrap MapLibre GL JS functionality in a "Livewire-friendly" way. It supports common mapping features like markers, popups, routes, route groups, route lists, and clustering, all while being responsive and theme-aware.

### Core Concepts

- **Declarative Maps**: Define your map and its features using expressive Blade tags.
- **Livewire Integration**: Interact with the map from your PHP component via events.
- **Theme Support**: Built-in support for light, dark, and auto themes (following Tailwind's `.dark` class).
- **Extensibility**: Custom providers, MapLibre style JSON support, and custom event forwarding.

---

## Installation

### 1. Install via Composer

```bash
composer require kwasii/livewire-mapcn
```

### 2. Publish Configuration and Assets

```bash
php artisan vendor:publish --tag="livewire-mapcn-config"
php artisan vendor:publish --tag="livewire-mapcn-assets"
```

### 3. Setup Layout

Include the styles and scripts in your root layout (e.g., `app.blade.php`).

```blade
<head>
    <!-- ... -->
    @livewireMapStyles
</head>
<body>
    <!-- ... -->
    @livewireScripts
    @livewireMapScripts
</body>
```

> Ensure you have Alpine.js and Tailwind CSS installed in your project, as they are required for this package to function correctly.

---

## Configuration

You can customize the package behavior via `config/livewire-mapcn.php`.

| Key                  | Default                                                                | Description                                                              |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `default_provider`   | `'carto-positron'`                                                     | Default tile provider for all maps.                                      |
| `dark_provider`      | `'carto-dark-matter'`                                                  | Provider used for dark mode.                                             |
| `default_height`     | `'full'`                                                               | Default CSS height if not specified in prop.                             |
| `default_zoom`       | `7`                                                                    | Default initial zoom level.                                              |
| `default_center`     | `[0, 0]`                                                               | Default initial coordinates `[lng, lat]`.                                |
| `osrm_url`           | `'https://router.project-osrm.org'`                                    | Base URL for fetching road directions via OSRM.                          |
| `inject_assets`      | `'route'`                                                              | `'route'` (auto-load via Laravel routes) or `'published'` (manual).      |
| `load_from_cdn`      | `true`                                                                 | Load MapLibre JS/CSS from CDN or local.                                  |
| `maplibre_version`   | `'5.19.0'`                                                             | MapLibre GL JS version used for CDN fallback.                            |
| `cdn_url`            | `'https://cdn.jsdelivr.net/npm/maplibre-gl@4.x/dist/maplibre-gl.js'`  | CDN URL for MapLibre GL JS.                                              |
| `cdn_css_url`        | `'https://cdn.jsdelivr.net/npm/maplibre-gl@4.x/dist/maplibre-gl.css'` | CDN URL for MapLibre GL CSS.                                             |
| `carto_license`      | `'non-commercial'`                                                     | CARTO basemap license type (`'non-commercial'` or `'enterprise'`).       |
| `cluster_popup_view` | `null`                                                                 | Optional Blade view for cluster point popups.                            |
| `custom_events`      | `[]`                                                                   | Array of custom MapLibre event names to forward (dispatched as `map:*`). |

---

## API Reference

The package provides several Blade components. All components must be nested inside the root `<x-map>` component.

### Table of Contents

- [Map (`<x-map>`)](#map-x-map)
- [Controls (`<x-map-controls>`)](#controls-x-map-controls)
- [Markers (`<x-map-marker>`)](#markers-x-map-marker)
- [Popups (`<x-map-popup>`)](#popups-x-map-popup)
- [Routes (`<x-map-route>`)](#routes-x-map-route)
- [Route Groups (`<x-map-route-group>`)](#route-groups-x-map-route-group)
- [Route List (`<x-map-route-list>`)](#route-list-x-map-route-list)
- [Clusters (`<x-map-cluster-layer>`)](#clusters-x-map-cluster-layer)
- [Advanced Usage](#advanced-usage)

---

## Map (`<x-map>`)

The base component for any map implementation.

### Usage

```blade
<x-map
    :center="[-0.09, 51.5]"
    :zoom="13"
    height="500px"
    provider="carto-voyager"
/>
```

### Props

| Prop                 | Type     | Default           | Description                                                                              |
| -------------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------- |
| `:center`            | `array`  | `[0, 0]`          | Initial map center `[lng, lat]`.                                                         |
| `:zoom`              | `int`    | `13`              | Initial zoom level (0–22).                                                               |
| `:min-zoom`          | `int`    | `0`               | Minimum zoom level.                                                                      |
| `:max-zoom`          | `int`    | `22`              | Maximum zoom level.                                                                      |
| `provider`           | `string` | `'carto-voyager'` | Options: `carto-voyager`, `carto-positron`, `carto-dark-matter`, `osm-raster`, `custom`. |
| `style`              | `string` | `null`            | Custom MapLibre style JSON URL (overrides `provider`).                                   |
| `theme`              | `string` | `'auto'`          | `'light'`, `'dark'`, or `'auto'` (follows `.dark` class).                                |
| `height`             | `string` | `'full'`          | CSS height (e.g., `500px`, `100vh`, `full`).                                             |
| `width`              | `string` | `'100%'`          | CSS width.                                                                               |
| `:bearing`           | `float`  | `0`               | Initial bearing in degrees.                                                              |
| `:pitch`             | `float`  | `0`               | Initial pitch (0–60 degrees).                                                            |
| `:interactive`       | `bool`   | `true`            | Enable mouse/touch interactions.                                                         |
| `:scroll-zoom`       | `bool`   | `true`            | Allow mouse wheel zoom.                                                                  |
| `:double-click-zoom` | `bool`   | `true`            | Allow double-click zoom.                                                                 |
| `:drag-pan`          | `bool`   | `true`            | Allow panning by drag.                                                                   |
| `class`              | `string` | `''`              | Additional CSS classes for the map container.                                            |
| `light-style`        | `string` | `null`            | Custom MapLibre style JSON URL for light mode.                                           |
| `dark-style`         | `string` | `null`            | Custom MapLibre style JSON URL for dark mode.                                            |
| `:events`            | `array`  | `[]`              | Array of custom MapLibre event names to forward (merged with config `custom_events`).    |

---

## Controls (`<x-map-controls>`)

Adds standard interactive controls to the map.

### Usage

```blade
<x-map :center="[-0.09, 51.5]" :zoom="13">
    <x-map-controls
        :locate="true"
        :fullscreen="true"
        position="top-right"
    />
</x-map>
```

### Props

| Prop          | Type     | Default       | Description                                                       |
| ------------- | -------- | ------------- | ----------------------------------------------------------------- |
| `:zoom`       | `bool`   | `true`        | Show zoom in/out buttons.                                         |
| `:compass`    | `bool`   | `true`        | Show compass/bearing reset.                                       |
| `:locate`     | `bool`   | `true`        | Show geolocation button.                                          |
| `:fullscreen` | `bool`   | `false`       | Show fullscreen toggle.                                           |
| `:scale`      | `bool`   | `false`       | Show map scale bar.                                               |
| `position`    | `string` | `'top-right'` | Position: `top-right`, `top-left`, `bottom-right`, `bottom-left`. |
| `class`       | `string` | `''`          | Additional CSS classes.                                           |

---

## Markers (`<x-map-marker>`)

Display interactive markers on the map.

### Usage

```blade
<x-map :center="[-0.09, 51.5]" :zoom="13">
    <x-map-marker :lat="51.5" :lng="-0.09" color="#ef4444">
        <x-marker-label text="London Office" position="top" />
        <x-marker-tooltip text="Hover for details" />
        <x-marker-popup anchor="bottom">
            <h3>Our HQ</h3>
            <p>Visit us anytime!</p>
        </x-marker-popup>
    </x-map-marker>
</x-map>
```

### Custom Marker Content

```blade
<x-map-marker :lat="51.5" :lng="-0.09">
    <x-marker-content>
        <div class="p-2 bg-blue-500 rounded-full">
            <svg>...</svg>
        </div>
    </x-marker-content>
</x-map-marker>
```

### Props

| Prop                  | Type     | Default      | Description                                                        |
| --------------------- | -------- | ------------ | ------------------------------------------------------------------ |
| `:lat`                | `float`  | **Required** | Latitude.                                                          |
| `:lng`                | `float`  | **Required** | Longitude.                                                         |
| `id`                  | `string` | UUID         | Unique marker identifier.                                          |
| `:draggable`          | `bool`   | `false`      | Allow user to drag marker.                                         |
| `color`               | `string` | `'#1A56DB'`  | Default dot color.                                                 |
| `anchor`              | `string` | `'bottom'`   | Anchor point (`center`, `bottom`, `top`, `left`, `right`, etc.).   |
| `:offset`             | `array`  | `[0, 0]`     | Pixel offset `[x, y]` from anchor position.                       |
| `:rotation`           | `float`  | `0`          | Rotation angle in degrees.                                         |
| `rotation-alignment`  | `string` | `'auto'`     | Rotation alignment (`'auto'`, `'map'`, `'viewport'`).              |
| `pitch-alignment`     | `string` | `'auto'`     | Pitch alignment (`'auto'`, `'map'`, `'viewport'`).                 |
| `class`               | `string` | `''`         | Additional CSS classes.                                            |

### Marker Sub-Components

Markers can be customized using these child components:

#### `<x-marker-content>`

Renders custom HTML as the marker icon.

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes. |

```blade
<x-marker-content>
    <img src="/icons/pin.png" class="w-8 h-8" />
</x-marker-content>
```

#### `<x-marker-label>`

Adds a text label near the marker. Styled with a frosted glass effect, subtle border, and automatic dark mode support.

| Prop       | Type     | Default      | Description                                 |
| ---------- | -------- | ------------ | ------------------------------------------- |
| `text`     | `string` | **Required** | The label text.                             |
| `position` | `string` | `'bottom'`   | Position: `top`, `bottom`, `left`, `right`. |
| `class`    | `string` | `''`         | Additional CSS classes.                     |

#### `<x-marker-tooltip>`

Adds a hover tooltip using MapLibre's Popup. Styled with a dark pill in light mode and a light pill in dark mode for maximum contrast.

| Prop      | Type     | Default      | Description                         |
| --------- | -------- | ------------ | ----------------------------------- |
| `text`    | `string` | **Required** | The tooltip text.                   |
| `anchor`  | `string` | `'top'`      | Tooltip anchor position.            |
| `:offset` | `array`  | `[0, -10]`   | Pixel offset `[x, y]` from anchor. |
| `class`   | `string` | `''`         | Additional CSS classes.             |

#### `<x-marker-popup>`

Adds a click-to-open popup.

| Prop                    | Type     | Default    | Description                          |
| ----------------------- | -------- | ---------- | ------------------------------------ |
| `max-width`             | `string` | `'300px'`  | CSS max-width for the popup.         |
| `:close-button`         | `bool`   | `true`     | Show close (×) button.              |
| `:close-on-click-map`   | `bool`   | `true`     | Close popup when clicking the map.   |
| `:close-on-move`        | `bool`   | `false`    | Close popup when the map moves.      |
| `anchor`                | `string` | `'bottom'` | Where to anchor relative to marker.  |
| `:offset`               | `array`  | `[0, 0]`   | Pixel offset `[x, y]` from anchor.  |
| `class`                 | `string` | `''`       | Additional CSS classes.              |

---

## Popups (`<x-map-popup>`)

Standalone popups anchored to specific coordinates.

### Usage

```blade
<x-map :center="[-0.09, 51.5]" :zoom="13">
    <x-map-popup :lat="51.5" :lng="-0.09" :open="true">
        <p>This is a standalone popup.</p>
    </x-map-popup>
</x-map>
```

### Props

| Prop                    | Type     | Default      | Description                              |
| ----------------------- | -------- | ------------ | ---------------------------------------- |
| `:lat`                  | `float`  | **Required** | Latitude.                                |
| `:lng`                  | `float`  | **Required** | Longitude.                               |
| `id`                    | `string` | UUID         | Unique popup identifier.                 |
| `:open`                 | `bool`   | `true`       | Initial visibility.                      |
| `max-width`             | `string` | `'300px'`    | CSS max-width.                           |
| `:close-button`         | `bool`   | `false`      | Show close icon.                         |
| `:close-on-click-map`   | `bool`   | `true`       | Close popup when clicking the map.       |
| `:close-on-move`        | `bool`   | `false`      | Close when the map moves.                |
| `anchor`                | `string` | `'bottom'`   | Anchor position relative to coordinates. |
| `:offset`               | `array`  | `[0, 0]`     | Pixel offset `[x, y]` from anchor.       |
| `class`                 | `string` | `''`         | Additional CSS classes.                  |

---

## Routes (`<x-map-route>`)

Draw polylines or fetch real driving/walking/cycling directions.

### Basic Polyline

```blade
<x-map-route :coordinates="$coords" color="#10b981" :width="5" />
```

### Styled Route

```blade
<x-map-route
    :coordinates="$coords"
    color="#ef4444"
    :width="5"
    :opacity="0.8"
    :dash-array="[5, 3]"
    line-cap="butt"
    line-join="miter"
    :with-stops="true"
    stop-color="#22c55e"
/>
```

### OSRM Directions with Alternatives

```blade
<x-map-route
    :coordinates="$coords"
    :fetch-directions="true"
    directions-profile="driving"
    :animate="true"
    :animate-duration="3000"
    :alternatives="true"
    :max-alternatives="2"
    alternative-color="#94A3B8"
    :alternative-opacity="0.5"
    :alternative-width="3"
/>
```

### Interactive Route

```blade
<x-map-route
    :coordinates="$coords"
    :clickable="true"
    active-color="#0F43C4"
    :active-width="6"
    hover-color="#2563EB"
    :active="false"
/>
```

### Props

| Prop                    | Type      | Default           | Description                                                |
| ----------------------- | --------- | ----------------- | ---------------------------------------------------------- |
| `:coordinates`          | `array`   | **Required**      | Array of `[lng, lat]` pairs.                               |
| `id`                    | `string`  | UUID              | Unique route identifier.                                   |
| `color`                 | `string`  | `'#1A56DB'`       | Line color.                                                |
| `:width`                | `int`     | `4`               | Line width in pixels.                                      |
| `:opacity`              | `float`   | `1.0`             | Line opacity (0–1).                                        |
| `:dash-array`           | `array`   | `null`            | Dash pattern array (e.g., `[5, 3]` for dashed lines).      |
| `line-cap`              | `string`  | `'round'`         | Line cap style (`'butt'`, `'round'`, `'square'`).           |
| `line-join`             | `string`  | `'round'`         | Line join style (`'bevel'`, `'round'`, `'miter'`).          |
| `active-color`          | `string`  | `'#0F43C4'`       | Color when the route is active/selected.                    |
| `:active-width`         | `int`     | `6`               | Width when the route is active/selected.                    |
| `hover-color`           | `string`  | `null`            | Color on mouse hover.                                      |
| `:clickable`            | `bool`    | `true`            | Whether the route responds to click events.                 |
| `:with-stops`           | `bool`    | `false`           | Show markers at each coordinate.                           |
| `stop-color`            | `string`  | `'#1A56DB'`       | Color of stop markers when `:with-stops` is true.           |
| `:fetch-directions`     | `bool`    | `false`           | Fetch road geometry from OSRM.                             |
| `directions-profile`    | `string`  | `'driving'`       | OSRM profile: `driving`, `walking`, `cycling`.              |
| `directions-url`        | `string`  | config `osrm_url` | Custom OSRM base URL (overrides config).                    |
| `:animate`              | `bool`    | `false`           | Animate drawn route.                                       |
| `:animate-duration`     | `int`     | `2000`            | Animation duration in milliseconds.                        |
| `:active`               | `bool`    | `false`           | Whether the route starts in active state.                   |
| `:alternatives`         | `bool`    | `true`            | Fetch and display alternative routes from OSRM.             |
| `:max-alternatives`     | `int`     | `2`               | Maximum number of alternative routes to show.               |
| `alternative-color`     | `string`  | `'#94A3B8'`       | Color of alternative route lines.                          |
| `:alternative-opacity`  | `float`   | `0.5`             | Opacity of alternative route lines.                        |
| `:alternative-width`    | `int`     | `3`               | Width of alternative route lines.                          |

### Dynamic Route Updates

Update a route's coordinates without a full re-render:

```php
// In your Livewire component
$this->dispatch("map:update-route-data-{$routeId}", [
    'coordinates' => $newCoordinates,
]);
```

---

## Route Groups (`<x-map-route-group>`)

Render multiple pre-defined routes with click-to-select behavior. Useful for showing several itineraries on the same map.

### Usage

```php
// In your Livewire component
public array $routes = [
    [
        'id' => 'route-a',
        'coordinates' => [[-0.12, 51.51], [-0.11, 51.51], [-0.10, 51.50]],
        'color' => '#ef4444',
        'width' => 4,
    ],
    [
        'id' => 'route-b',
        'coordinates' => [[-0.12, 51.51], [-0.115, 51.515], [-0.10, 51.50]],
        'color' => '#3b82f6',
        'width' => 4,
    ],
];
```

```blade
<x-map :center="[-0.11, 51.505]" :zoom="14">
    <x-map-route-group
        :routes="$routes"
        :selected-route="0"
        :fit-bounds="true"
        :clickable="true"
    />
</x-map>
```

### Props

| Prop                    | Type          | Default      | Description                                         |
| ----------------------- | ------------- | ------------ | --------------------------------------------------- |
| `:routes`               | `array`       | **Required** | Array of route config objects (see above).           |
| `id`                    | `string`      | UUID         | Unique route group identifier.                      |
| `:selected-route`       | `int\|string` | `0`          | Index or ID of the initially selected route.        |
| `:fit-bounds`           | `bool`        | `false`      | Auto-fit map bounds to include all routes.          |
| `alternative-color`     | `string`      | `'#94A3B8'`  | Color of non-selected (alternative) routes.         |
| `:alternative-opacity`  | `float`       | `0.5`        | Opacity of non-selected routes.                     |
| `:alternative-width`    | `int`         | `3`          | Width of non-selected routes.                       |
| `line-cap`              | `string`      | `'round'`    | Line cap style (`'butt'`, `'round'`, `'square'`).   |
| `line-join`             | `string`      | `'round'`    | Line join style (`'bevel'`, `'round'`, `'miter'`).  |
| `:clickable`            | `bool`        | `true`       | Allow clicking routes to select them.               |

### Dynamic Route Group Updates

Update the route group data without a full re-render:

```php
$this->dispatch("map:update-route-group-{$groupId}", [
    'routes' => $updatedRoutes,
    'selectedRoute' => 1,
]);
```

### Events

| Event                                | Detail                 | Description                                 |
| ------------------------------------ | ---------------------- | ------------------------------------------- |
| `map:route-group-selection-changed`  | `groupId, routeIndex`  | Fired when a user clicks a different route. |

---

## Route List (`<x-map-route-list>`)

An overlay UI panel that displays route alternatives with distance, duration, and selection. Pairs with `<x-map-route>` (with `:alternatives="true"`) or `<x-map-route-group>`.

### Usage

```blade
<x-map :center="[-0.11, 51.505]" :zoom="14">
    <x-map-route
        id="my-route"
        :coordinates="$coords"
        :fetch-directions="true"
        :alternatives="true"
    />
    <x-map-route-list
        route-id="my-route"
        position="top-left"
        title="Available Routes"
        :show-distance="true"
        :show-duration="true"
        :show-fastest-badge="true"
        :show-time-diff="true"
    />
</x-map>
```

### Props

| Prop                  | Type     | Default      | Description                                                       |
| --------------------- | -------- | ------------ | ----------------------------------------------------------------- |
| `route-id`            | `string` | `''`         | ID of the route or route group to display alternatives for.       |
| `map-id`              | `string` | `''`         | ID of the map (if needed for multi-map pages).                    |
| `:show-distance`      | `bool`   | `true`       | Show distance for each route.                                     |
| `:show-duration`      | `bool`   | `true`       | Show duration for each route.                                     |
| `:show-fastest-badge` | `bool`   | `true`       | Highlight the fastest route with a badge.                         |
| `:show-time-diff`     | `bool`   | `true`       | Show time difference compared to the fastest route.               |
| `position`            | `string` | `'top-left'` | Position: `top-left`, `top-right`, `bottom-left`, `bottom-right`. |
| `title`               | `string` | `'Routes'`   | Title shown above the route list.                                 |

### Events

| Event                      | Detail        | Description                                      |
| -------------------------- | ------------- | ------------------------------------------------ |
| `map:route-list-selected`  | `routeIndex`  | Fired when a user selects a route from the list. |

---

## Clusters (`<x-map-cluster-layer>`)

Efficiently handle thousands of markers by clustering them.

### Usage

```blade
{{-- From an array --}}
<x-map-cluster-layer
    :data="$locations"
    cluster-color="#3b82f6"
    popup-property="name"
/>

{{-- From a GeoJSON URL --}}
<x-map-cluster-layer
    url="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
    cluster-color="#3b82f6"
    popup-property="mag"
/>
```

### Props

| Prop                      | Type     | Default                            | Description                                                                                   |
| ------------------------- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `:data`                   | `array`  | `[]`                               | Array of `['lat' => ..., 'lng' => ..., 'properties' => [...]]` items or raw GeoJSON Features. |
| `url`                     | `string` | `null`                             | URL to a GeoJSON file. MapLibre fetches it client-side. Use instead of `:data`.               |
| `id`                      | `string` | UUID                               | Unique cluster layer identifier.                                                              |
| `:cluster-max-zoom`       | `int`    | `14`                               | Max zoom level to cluster at.                                                                 |
| `:cluster-radius`         | `int`    | `50`                               | Pixel radius to cluster points together.                                                      |
| `:cluster-min-points`     | `int`    | `2`                                | Minimum points to form a cluster.                                                             |
| `cluster-color`           | `string` | `'#1A56DB'`                        | Color of the cluster circle.                                                                  |
| `cluster-text-color`      | `string` | `'#FFFFFF'`                        | Color of the count text inside clusters.                                                      |
| `:cluster-size-stops`     | `array`  | `[[0, 30], [100, 40], [1000, 50]]` | Cluster circle size stops `[[count, radius], ...]`.                                           |
| `point-color`             | `string` | `'#1A56DB'`                        | Color of unclustered point circles.                                                           |
| `:point-radius`           | `int`    | `6`                                | Radius of unclustered point circles.                                                          |
| `:show-count`             | `bool`   | `true`                             | Show the point count inside clusters.                                                         |
| `popup-property`          | `string` | `null`                             | Feature property to use as the popup title (auto-styled).                                     |
| `popup-template`          | `string` | `null`                             | HTML string with `{property}` placeholders for custom popups.                                 |
| `:click-zoom`             | `bool`   | `true`                             | Zoom into a cluster when clicked.                                                             |
| `:buffer`                 | `int`    | `256`                              | GeoJSON source tile buffer size (higher = smoother panning).                                  |
| `:tolerance`              | `float`  | `0.5`                              | Geometry simplification tolerance (higher = faster tiles).                                    |
| `:max-features-to-inline` | `int`    | `2000`                             | Feature count threshold before switching to JS-based data injection.                          |
| `class`                   | `string` | `''`                               | Additional CSS classes.                                                                       |

### Popup Slot (Recommended)

Use the `popup` slot for full HTML control over the point popup. Property values are interpolated via `{propertyName}` placeholders. `{lat}` and `{lng}` are available as special tokens.

```blade
<x-map-cluster-layer :data="$locations">
    <x-slot:popup>
        <div class="p-3 space-y-1">
            <h3 class="font-semibold text-sm">{name}</h3>
            <p class="text-xs text-gray-500">{address}</p>
            <div class="flex items-center gap-2 text-xs">
                <span>⭐ {rating}</span>
                <span>📞 {phone}</span>
            </div>
            <p class="text-[11px] text-gray-400">{lat}, {lng}</p>
        </div>
    </x-slot:popup>
</x-map-cluster-layer>
```

### Popup Template (Attribute)

Alternatively, pass an HTML string with `{property}` placeholders as an attribute:

```blade
<x-map-cluster-layer
    :data="$locations"
    popup-template='<div class="p-2"><strong>{name}</strong><br>{address}</div>'
/>
```

### Popup Priority

1. **`<x-slot:popup>`** — Full slot control with Blade HTML
2. **`popup-template="..."`** — Inline HTML attribute with placeholders
3. **`popup-property="name"`** — Auto-styled card using one property as title
4. **Default** — Shows name/title/label (if present) plus lat/lng coordinates

### Dynamic Data Updates

To update cluster data without a full re-render, dispatch a Livewire event:

```php
// In your Livewire component
$this->dispatch("map:update-cluster-data-{$clusterId}",
    \Kwasii\LivewireMapcn\Support\GeoJSON::fromArray($filteredData)
);
```

---

## Advanced Usage

### Livewire Interactivity

The package dispatches events to Livewire and listens for specific commands.

#### Events Dispatched (Outbound)

##### Map Events

| Event                 | Detail                     | Description                                            |
| --------------------- | -------------------------- | ------------------------------------------------------ |
| `map:loaded`          | —                          | Map style is fully loaded and ready.                   |
| `map:click`           | `lat, lng, detail`         | Map was clicked.                                       |
| `map:double-click`    | `lat, lng, detail`         | Map was double-clicked.                                |
| `map:right-click`     | `lat, lng, detail`         | Map was right-clicked (context menu).                  |
| `map:move`            | `lat, lng`                 | Throttled (100ms) — fired continuously as map moves.   |
| `map:center-changed`  | `lat, lng`                 | Fired once movement ends.                              |
| `map:zoom`            | `zoom`                     | Throttled (100ms) — fired continuously during zoom.    |
| `map:zoom-changed`    | `zoom`                     | Fired once zoom ends.                                  |
| `map:bounds-changed`  | `bounds`                   | Fired when map bounds change.                          |
| `map:drag-end`        | `lat, lng`                 | Fired when map drag ends.                              |
| `map:bearing-changed` | `bearing`                  | Throttled (100ms) — fired when map is rotated.         |
| `map:pitch-changed`   | `pitch`                    | Throttled (100ms) — fired when map is tilted.          |
| `map:style-loaded`    | —                          | Fired when map style finishes loading.                 |

##### Locate Events

| Event                | Detail               | Description                            |
| -------------------- | -------------------- | -------------------------------------- |
| `map:locate-success` | `lat, lng, accuracy` | Geolocation succeeded.                 |
| `map:locate-error`   | `error`              | Geolocation failed.                    |

##### Marker Events

| Event                     | Detail          | Description                            |
| ------------------------- | --------------- | -------------------------------------- |
| `map:marker-clicked`      | `id, lat, lng`  | Marker was clicked.                    |
| `map:marker-drag-start`   | `id, lat, lng`  | Marker drag started.                   |
| `map:marker-drag`         | `id, lat, lng`  | Marker is being dragged (continuous).  |
| `map:marker-drag-end`     | `id, lat, lng`  | Marker drag ended.                     |
| `map:marker-mouseenter`   | `id, lat, lng`  | Mouse entered marker.                  |
| `map:marker-mouseleave`   | `id, lat, lng`  | Mouse left marker.                     |
| `map:marker-popup-open`   | `id`            | Marker popup opened.                   |
| `map:marker-popup-close`  | `id`            | Marker popup closed.                   |

##### Popup Events

| Event             | Detail | Description                  |
| ----------------- | ------ | ---------------------------- |
| `map:popup-open`  | `id`   | Standalone popup opened.     |
| `map:popup-close` | `id`   | Standalone popup closed.     |

##### Route Events

| Event                            | Detail                        | Description                                |
| -------------------------------- | ----------------------------- | ------------------------------------------ |
| `map:route-clicked`              | `id`                          | Route line was clicked.                    |
| `map:route-mouseenter`           | `id`                          | Mouse entered route line.                  |
| `map:route-mouseleave`           | `id`                          | Mouse left route line.                     |
| `map:route-directions-ready`     | `id, distance, duration, ...` | OSRM directions fetched successfully.      |
| `map:route-directions-error`     | `id, error`                   | OSRM directions fetch failed.              |
| `map:route-alternative-selected` | `id, alternativeIndex`        | User selected an alternative route.        |
| `map:route-updated`              | `id`                          | Route data was updated via Livewire event. |

##### Route Group Events

| Event                                | Detail                 | Description                                |
| ------------------------------------ | ---------------------- | ------------------------------------------ |
| `map:route-group-selection-changed`  | `groupId, routeIndex`  | User clicked a different route in group.   |

##### Cluster Events

| Event                       | Detail                 | Description                               |
| --------------------------- | ---------------------- | ----------------------------------------- |
| `map:cluster-clicked`       | `clusterId, lat, lng`  | A cluster circle was clicked.             |
| `map:cluster-expanded`      | `clusterId`            | A cluster was expanded (zoomed into).     |
| `map:cluster-point-clicked` | `properties, lat, lng` | An individual unclustered point clicked.  |

##### Route List Events

| Event                      | Detail        | Description                                      |
| -------------------------- | ------------- | ------------------------------------------------ |
| `map:route-list-selected`  | `routeIndex`  | User selected a route from the route list panel. |

##### Custom Events

You can forward any MapLibre event by adding event names to the `:events` prop or the `custom_events` config array. They are dispatched as `map:{event-name}`.

```blade
<x-map :events="['movestart', 'idle']">
    <!-- Dispatches map:movestart and map:idle -->
</x-map>
```

#### Commands Listened (Inbound)

You can trigger these from your Livewire component using `$this->dispatch()`:

| Command                | Payload                                   | Description                                             |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------- |
| `map:fly-to`           | `center, zoom, bearing, pitch, essential` | Smooth animated move to a new location.                 |
| `map:jump-to`          | `center, zoom, bearing, pitch`            | Instant (non-animated) move to a new location.          |
| `map:fit-bounds`       | `bounds, padding, maxZoom`                | Fit the map view to specific bounds.                    |
| `map:set-zoom`         | `zoom`                                    | Change zoom level.                                      |
| `map:set-bearing`      | `bearing`                                 | Set the map bearing (rotation).                         |
| `map:set-pitch`        | `pitch`                                   | Set the map pitch (tilt).                               |
| `map:set-style`        | `style`                                   | Change the map style (URL or JSON).                     |
| `map:resize`           | —                                         | Force map recalculation (useful for hidden containers). |
| `map:force-animate`    | —                                         | Force re-trigger route animations.                      |
| `map:call`             | `method, ...args`                         | Call any MapLibre GL JS method directly.                |

##### Dynamic Data Commands

| Command                              | Payload        | Description                                   |
| ------------------------------------ | -------------- | --------------------------------------------- |
| `map:update-route-data-{id}`         | `coordinates`  | Update a route's coordinates dynamically.     |
| `map:update-cluster-data-{id}`       | GeoJSON data   | Update cluster data without full re-render.   |
| `map:update-route-group-{id}`        | `routes, ...`  | Update route group configuration.             |

#### Example: Fly To Location

```php
// In Livewire Component
public function centerOnPilot()
{
    $this->dispatch('map:fly-to', [
        'center' => [-0.09, 51.5],
        'zoom' => 12,
        'essential' => true,
    ]);
}
```

#### Example: Call MapLibre Method Directly

```php
// In Livewire Component
public function setMaxZoom()
{
    $this->dispatch('map:call', [
        'method' => 'setMaxZoom',
        'args' => [18],
    ]);
}
```

### Theme Awareness

By default, the map follows the `.dark` class on your `html` element if `theme="auto"` is set. You can also force a specific theme using `theme="light"` or `theme="dark"`.

You can provide separate style URLs for light and dark modes:

```blade
<x-map
    light-style="https://example.com/light-style.json"
    dark-style="https://example.com/dark-style.json"
    theme="auto"
/>
```

### Controlled Viewport

You can track and control the map viewport (center, zoom, bearing, pitch) by listening to events and using Alpine.js for real-time reactivity, similar to React's `onViewportChange`.

#### Example: Reactive Viewport Dashboard

```blade
<div x-data="{
    viewport: {
        lat: 40.7128,
        lng: -74.006,
        zoom: 8,
        bearing: 0,
        pitch: 0
    }
}" class="relative w-full h-[400px]">

    <x-map
        :center="[-74.006, 40.7128]"
        :zoom="8"
        @map:move="viewport.lat = $event.detail.lat; viewport.lng = $event.detail.lng"
        @map:zoom="viewport.zoom = $event.detail.zoom"
        @map:bearing-changed="viewport.bearing = $event.detail.bearing"
        @map:pitch-changed="viewport.pitch = $event.detail.pitch"
    />

    <div class="absolute top-2 left-2 z-10 flex gap-3 text-xs font-mono bg-white/90 backdrop-blur p-2 rounded border shadow-sm">
        <span><b class="text-gray-500">lng:</b> <span x-text="viewport.lng.toFixed(3)"></span></span>
        <span><b class="text-gray-500">lat:</b> <span x-text="viewport.lat.toFixed(3)"></span></span>
        <span><b class="text-gray-500">zoom:</b> <span x-text="viewport.zoom.toFixed(1)"></span></span>
        <span><b class="text-gray-500">bearing:</b> <span x-text="viewport.bearing.toFixed(1)"></span>°</span>
        <span><b class="text-gray-500">pitch:</b> <span x-text="viewport.pitch.toFixed(1)"></span>°</span>
    </div>
</div>
```

#### Event Reference for Viewport

| Event                 | Detail     | Description                                              |
| --------------------- | ---------- | -------------------------------------------------------- |
| `map:move`            | `lat, lng` | Throttled (100ms) — fired continuously as the map moves. |
| `map:center-changed`  | `lat, lng` | Fired once movement ends.                                |
| `map:zoom`            | `zoom`     | Throttled (100ms) — fired continuously during zoom.      |
| `map:zoom-changed`    | `zoom`     | Fired once zoom ends.                                    |
| `map:bearing-changed` | `bearing`  | Throttled (100ms) — fired when the map is rotated.       |
| `map:pitch-changed`   | `pitch`    | Throttled (100ms) — fired when the map is tilted.        |

---

### Alpine.js Directives

The package registers the following Alpine.js directives:

| Directive               | Description                                                      |
| ----------------------- | ---------------------------------------------------------------- |
| `x-map`                 | Creates the MapLibre GL map instance with full configuration.    |
| `x-map-controls`        | Adds navigation, geolocate, fullscreen, and scale controls.      |
| `x-map-marker`          | Creates a marker with support for custom content and events.     |
| `x-map-popup`           | Creates a standalone popup anchored to coordinates.              |
| `x-map-route`           | Renders route lines with OSRM directions and animation support.  |
| `x-map-route-group`     | Manages multiple selectable routes on the same map.              |
| `x-map-route-list`      | Renders a route selection UI panel.                              |
| `x-map-cluster-layer`   | GeoJSON clustering with popups and dynamic data updates.         |
| `x-map-resize`          | Triggers map resize when the bound expression changes.           |
| `x-map-marker-popup`    | Sub-directive for marker popup configuration.                    |
| `x-map-marker-tooltip`  | Sub-directive for marker tooltip configuration.                  |

### GeoJSON Helper

The `GeoJSON::fromArray()` helper converts simple PHP arrays into GeoJSON FeatureCollections:

```php
use Kwasii\LivewireMapcn\Support\GeoJSON;

$geoJson = GeoJSON::fromArray([
    ['lat' => 51.505, 'lng' => -0.09, 'properties' => ['name' => 'Location 1']],
    ['lat' => 51.51,  'lng' => -0.1,  'properties' => ['name' => 'Location 2']],
]);

// Also passes through existing GeoJSON Feature objects:
$geoJson = GeoJSON::fromArray([
    ['type' => 'Feature', 'geometry' => [...], 'properties' => [...]],
]);
```

---

### Performance Tips

- **Use clusters for large datasets**: Always use `<x-map-cluster-layer>` instead of individual `<x-map-marker>` tags for datasets over ~100 points.
- **Tune cluster radius**: Larger `:cluster-radius` values (e.g., `80`) produce fewer clusters and faster rendering.
- **Lower cluster max zoom**: Setting `:cluster-max-zoom="12"` stops unclustering at lower zoom levels, reducing visible point counts.
- **Cluster size stops**: Customize `:cluster-size-stops` to control circle sizes at different point counts.
- **Increase tolerance**: `:tolerance="0.8"` simplifies geometries for faster tile generation at the cost of precision.
- **Increase buffer**: `:buffer="512"` reduces tile-edge artefacts during fast panning (uses more memory).
- **Throttled events**: Continuous map events (`map:move`, `map:zoom`, `map:bearing-changed`, `map:pitch-changed`) are throttled to 100ms to prevent frame drops. Final values are still delivered via `moveend`/`zoomend` events.
- **Dynamic updates**: Use `map:update-cluster-data-{id}`, `map:update-route-data-{id}`, and `map:update-route-group-{id}` Livewire events to update data without re-rendering the entire component.
- **Inline threshold**: The `:max-features-to-inline` prop (default `2000`) controls whether cluster GeoJSON data is embedded in HTML attributes or injected via JavaScript for better performance with large datasets.

---


