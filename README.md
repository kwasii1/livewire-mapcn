# Livewire Mapcn

A Laravel Livewire package inspired by [mapcn.dev](https://mapcn.dev). Easily integrate beautiful, interactive maps into your Laravel applications using MapLibre GL JS and Alpine.js.

---

## Getting Started

`livewire-mapcn` provides a set of Blade components that wrap MapLibre GL JS functionality in a "Livewire-friendly" way. It supports markers, popups, routes (with OSRM directions, alternatives and **route progress**), **arcs**, **GeoJSON overlays**, route groups, route lists, clustering, a **3D view toggle** and **custom controls**, all responsive, theme-aware and reactive to Livewire state.

### Core Concepts

- **Declarative Maps**: Define your map and its features using expressive Blade tags.
- **Livewire Integration**: Components inside `<x-map>` update in place when your Livewire component re-renders (no camera reset), and you can drive the map from PHP with events.
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

> **Requirements:** PHP 8.3+, Laravel 11–13, Livewire 3 or 4 (Alpine.js ships with Livewire). Tailwind CSS is **not** required: the package stylesheet styles every component.
>
> `@livewireMapScripts` loads [MapLibre GL JS](https://maplibre.org) v6 from jsDelivr. v6 is published as an ES module only, so it is imported with `<script type="module">` and exposed as `window.maplibregl`. If you bundle MapLibre yourself, set `load_from_cdn` to `false` and assign it to `window.maplibregl`.

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
| `maplibre_version`   | `'6.14.0'`                                                             | MapLibre GL JS version loaded from jsDelivr.                             |
| `cdn_url`            | `null`                                                                 | MapLibre JS URL. A `.mjs` URL loads as an ES module; anything else (e.g. a v5 `maplibre-gl.js`) as a classic script. Derived from `maplibre_version` when `null`. |
| `cdn_css_url`        | `null`                                                                 | MapLibre CSS URL. Derived from `maplibre_version` when `null`.           |
| `follow_system_theme`| `false`                                                                | With `theme="auto"`, also follow the OS `prefers-color-scheme`.          |
| `lazy`               | `true`                                                                 | Create maps only when they come near the viewport (or become visible).  |
| `loader`             | `true`                                                                 | Show the default loading indicator on every map.                        |
| `preconnect`         | CARTO hosts                                                            | Origins `@livewireMapStyles` preconnects to, so tiles start downloading early. |
| `carto_license`      | `'non-commercial'`                                                     | Informational. CARTO basemaps are free for non-commercial use only.      |
| `cluster_popup_view` | `null`                                                                 | Blade view used as the default cluster point popup (`{property}` placeholders work). |
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
- [Arcs (`<x-map-arc>`)](#arcs-x-map-arc)
- [GeoJSON (`<x-map-geojson>`)](#geojson-x-map-geojson)
- [Advanced Usage](#advanced-usage)
- [Upgrading from v1](#upgrading-from-v1)

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
| `id`                 | `string` | random            | Map id. Set it when you target the map with `mapId` in commands or `LivewireMap.getMap()`. |
| `:zoom`              | `float`  | config            | Initial zoom level (0–22).                                                               |
| `:min-zoom`          | `float`  | `0`               | Minimum zoom level.                                                                      |
| `:max-zoom`          | `float`  | `22`              | Maximum zoom level.                                                                      |
| `provider`           | `string` | `'carto-positron'`| `carto-positron`, `carto-voyager`, `carto-dark-matter`, `openfreemap-liberty` (3D buildings), `openfreemap-bright`, `openfreemap-positron`, `osm-raster`, `blank`. |
| `style`              | `string\|array` | `null`     | Custom MapLibre style URL or style array (overrides `provider`, used for both themes unless `dark-style` is set). |
| `theme`              | `string` | `'auto'`          | `'light'`, `'dark'`, or `'auto'` (follows a `dark`/`light` class or `data-theme` on `<html>`). |
| `height`             | `string\|int` | `'full'`    | CSS height (`500px`, `100vh`, `full` = `100%`, or an int in px).                          |
| `width`              | `string` | `'100%'`          | CSS width.                                                                               |
| `:bearing`           | `float`  | `0`               | Initial bearing in degrees.                                                              |
| `:pitch`            | `float`  | `0`               | Initial pitch in degrees.                                                                |
| `:max-pitch`        | `float`  | `null`            | Maximum pitch (MapLibre default 60).                                                     |
| `projection`         | `string` | `null`            | `'globe'` for a 3D globe at low zooms.                                                   |
| `:blank`             | `bool`   | `false`           | No basemap (transparent). Useful for GeoJSON-only maps.                                  |
| `:bounds`            | `array`  | `null`            | Initial bounds `[[west, south], [east, north]]` to fit (overrides center/zoom).            |
| `:bounds-padding`    | `int`    | `40`              | Padding used with `:bounds`.                                                             |
| `:max-bounds`        | `array`  | `null`            | Restrict panning to these bounds.                                                        |
| `:interactive`       | `bool`   | `true`            | Enable mouse/touch interactions.                                                         |
| `:scroll-zoom`       | `bool`   | `true`            | Allow mouse wheel zoom.                                                                  |
| `:double-click-zoom` | `bool`   | `true`            | Allow double-click zoom.                                                                 |
| `:drag-pan`          | `bool`   | `true`            | Allow panning by drag.                                                                   |
| `:drag-rotate`       | `bool`   | `true`            | Allow rotating with right-click/ctrl drag.                                               |
| `:touch-zoom-rotate` | `bool`   | `true`            | Allow pinch zoom/rotate.                                                                 |
| `:pitch-with-rotate` | `bool`   | `true`            | Allow tilting while rotating.                                                            |
| `:cooperative-gestures` | `bool` | `false`          | Require ctrl/⌘ + scroll (and two fingers on touch) to move the map. Good for long pages.  |
| `:render-world-copies` | `bool` | `true`            | Repeat the world horizontally when zoomed out.                                           |
| `:attribution`       | `bool`   | `true`            | Show the attribution control.                                                            |
| `:attribution-compact` | `bool` | `true`            | Collapse attribution into an (i) button.                                                 |
| `:loader`            | `bool`   | config `loader`   | Show the default loading indicator until the map has loaded. See [Loading state](#loading-state). |
| `:lazy`              | `bool`   | config `lazy`     | Start the map only when it nears the viewport. Commands sent before it starts are queued. |
| `:options`           | `array`  | `[]`              | Extra options passed straight to the MapLibre `Map` constructor.                          |
| `class`              | `string` | `''`              | Additional CSS classes for the map container.                                            |
| `light-style`        | `string` | `null`            | Custom MapLibre style JSON URL for light mode.                                           |
| `dark-style`         | `string` | `null`            | Custom MapLibre style JSON URL for dark mode.                                            |
| `:events`            | `array`  | `[]`              | Array of custom MapLibre event names to forward (merged with config `custom_events`).    |

### Loading state

Until a map has loaded, a pulsing-dots overlay is shown; it fades out when MapLibre fires `load` (the map element gets `.lm-loaded`).

- **Custom content:** pass a `loading` slot. Its attributes are added to the overlay.

  ```blade
  <x-map>
      <x-slot:loading class="gap-3">
          <svg class="animate-spin" ...></svg>
          <span>Loading map…</span>
      </x-slot:loading>
  </x-map>
  ```

- **Restyle the default:** set `--lm-loader-bg`, `--lm-loader-backdrop`, `--lm-loader-color`, `--lm-loader-dot-size` or `--lm-loader-fade` on `.lm-map` (or any ancestor).
- **Disable:** `:loader="false"` on a map, or `'loader' => false` in the config to turn it off everywhere (`:loader="true"` opts back in). A `loading` slot is always shown.

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
| `scale-unit`  | `string` | `'metric'`    | `metric`, `imperial` or `nautical`.                               |
| `:three-d`    | `bool`   | `false`       | Show a 3D view toggle button.                                     |
| `:three-d-pitch` | `float` | `60`        | Pitch used by the 3D toggle.                                      |
| `:three-d-bearing` | `float` | `-20`     | Bearing used by the 3D toggle.                                    |
| `:three-d-duration` | `int` | `1000`     | Toggle animation duration (ms).                                   |
| `:visualize-pitch` | `bool` | `true`     | Tilt the compass needle with the map pitch.                       |
| `:track-user` | `bool`   | `true`        | Keep following the user after locating.                           |
| `position`    | `string` | `'top-right'` | Position: `top-right`, `top-left`, `bottom-right`, `bottom-left`. |
| `class`       | `string` | `''`          | Additional CSS classes.                                           |

### 3D View

Add `:three-d="true"` (or just `three-d`) for a toggle that eases the camera to a tilted, rotated view and back. Pair it with a style that has 3D buildings, such as `openfreemap-liberty`:

```blade
<x-map provider="openfreemap-liberty" :center="[-0.1276, 51.5072]" :zoom="15.5" :pitch="55">
    <x-map-controls three-d :locate="false" />
</x-map>
```

The map dispatches `map:3d-toggled` with `enabled`.

### Custom Controls (`<x-map-control>`)

Pin any markup to a corner of the map. Inside it, the Alpine magic `$map` is the MapLibre instance:

```blade
<x-map :center="[-0.1276, 51.5072]" :zoom="15">
    <x-map-control position="top-left">
        <button type="button" x-on:click="$map.easeTo({ pitch: 60, bearing: -20, duration: 1000 })">3D view</button>
        <button type="button" x-on:click="$map.easeTo({ pitch: 0, bearing: 0, duration: 1000 })">Reset</button>
    </x-map-control>
</x-map>
```

| Prop       | Type     | Default      | Description                                                                 |
| ---------- | -------- | ------------ | --------------------------------------------------------------------------- |
| `position` | `string` | `'top-left'` | `top-left`, `top-right`, `bottom-left`, `bottom-right`, `top`, `bottom`.    |
| `:group`   | `bool`   | `true`       | Wrap content in a control-group card (buttons are styled automatically).    |
| `class`    | `string` | `''`         | Additional CSS classes.                                                     |

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
| `:opacity`            | `float`  | `null`       | Marker opacity (0–1).                                              |
| `class`               | `string` | `''`         | Additional CSS classes.                                            |

Markers rendered from Livewire state update in place. Use `wire:key` in loops:

```blade
<x-map :center="[-1.2, 7.6]" :zoom="6">
    @foreach ($stores as $store)
        <x-map-marker wire:key="store-{{ $store->id }}" :id="(string) $store->id" :lat="$store->lat" :lng="$store->lng" draggable />
    @endforeach
</x-map>
```

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
| `text`     | `string` | `null`       | The label text (or use the slot).           |
| `position` | `string` | `'bottom'`   | Position: `top`, `bottom`, `left`, `right`. |
| `class`    | `string` | `''`         | Additional CSS classes.                     |

#### `<x-marker-tooltip>`

Adds a hover tooltip using MapLibre's Popup. Styled with a dark pill in light mode and a light pill in dark mode for maximum contrast.

| Prop      | Type     | Default      | Description                         |
| --------- | -------- | ------------ | ----------------------------------- |
| `text`    | `string` | `null`       | The tooltip text (or use the slot for rich content). |
| `anchor`  | `string` | auto         | Tooltip anchor position.            |
| `:offset` | `int\|array` | `16`    | Offset from the marker.             |
| `class`   | `string` | `''`         | Additional CSS classes.             |

#### `<x-marker-popup>`

Adds a click-to-open popup.

| Prop                    | Type     | Default    | Description                          |
| ----------------------- | -------- | ---------- | ------------------------------------ |
| `max-width`             | `string` | `'300px'`  | CSS max-width for the popup.         |
| `:close-button`         | `bool`   | `true`     | Show close (×) button.              |
| `:close-on-click-map`   | `bool`   | `true`     | Close popup when clicking the map.   |
| `:close-on-move`        | `bool`   | `false`    | Close popup when the map moves.      |
| `anchor`                | `string` | auto       | Where to anchor relative to marker (auto picks the side with room). |
| `:offset`               | `int\|array` | `16`  | Offset from the marker.              |
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
| `:with-stops`           | `bool`    | `false`           | Show dots at each waypoint you passed.                     |
| `stop-color`            | `string`  | `'#1A56DB'`       | Color of stop markers when `:with-stops` is true.           |
| `:fetch-directions`     | `bool`    | `false`           | Fetch road geometry from OSRM.                             |
| `directions-profile`    | `string`  | `'driving'`       | OSRM profile: `driving`, `walking`, `cycling`.              |
| `directions-url`        | `string`  | config `osrm_url` | Custom OSRM base URL (overrides config).                    |
| `:animate`              | `bool`    | `false`           | Draw the route from start to end on load.                  |
| `:animate-duration`     | `int`     | `2000`            | Animation duration in milliseconds.                        |
| `:active`               | `bool`    | `false`           | Whether the route starts in active state.                   |
| `:alternatives`         | `bool`    | `false`           | Fetch and display alternative routes from OSRM.             |
| `:max-alternatives`     | `int`     | `2`               | Maximum number of alternative routes to show.               |
| `alternative-color`     | `string`  | `'#94A3B8'`       | Color of alternative route lines.                          |
| `:alternative-opacity`  | `float`   | `0.5`             | Opacity of alternative route lines.                        |
| `:alternative-width`    | `int`     | `3`               | Width of alternative route lines.                          |
| `:active-opacity`       | `float`   | `null`            | Opacity while active (falls back to `opacity`).             |
| `:active-dash-array`    | `array`   | `null`            | Dash pattern while active.                                 |
| `:progress`             | `float`   | `null`            | 0–1. Draws a "travelled" line over the route.               |
| `progress-color`        | `string`  | route color       | Color of the progress line.                                |
| `:progress-width`       | `int`     | route width       | Width of the progress line.                                |
| `:progress-opacity`     | `float`   | `1`               | Opacity of the progress line.                              |
| `:progress-dash-array`  | `array`   | `null`            | Dash pattern of the progress line.                         |
| `progress-model`        | `string`  | `null`            | Alpine expression the progress follows on the client (no server request per change). |
| `:progress-duration`    | `int`     | `0`               | Tween duration (ms) when `progress` changes.                |
| `before-id`             | `string`  | `null`            | Insert the route below this style layer (e.g. labels).      |
| `:fit-bounds`           | `bool`    | `false`           | Fit the map to the route once resolved.                     |

### Route Progress

Show how far along a route something is (a delivery, a trip, a run), and pin markers to the route with `<x-map-route-marker>`.

Progress usually changes many times a second (sliders, playback, live tracking), so drive it **on the client**: `progress-model` names an Alpine property the route follows, with no server request per change. Entangle it (deferred) if your component needs the value; it is sent with the next request:

```blade
<div x-data="{ progress: $wire.entangle('progress') }">
<x-map>
    <x-map-route
        id="delivery"
        :coordinates="$stops"
        fetch-directions
        color="#94a3b8"
        :width="5"
        :dash-array="[0.5, 1.5]"
        progress-model="progress"
        progress-color="#2563eb"
        fit-bounds
    >
        <x-map-route-marker at="start" />
        <x-map-route-marker at="end" />
        <x-map-route-marker at="progress" align-to-route>
            <x-marker-content><div class="vehicle">🚚</div></x-marker-content>
            <x-marker-tooltip text="Driver" />
        </x-map-route-marker>
    </x-map-route>
</x-map>

<input type="range" min="0" max="1" step="0.01" x-model.number="progress">
<button type="button" x-on:click="$mapRoute('delivery').setProgress(1, 1500)">Play</button>
</div>
```

Other ways to set progress:

- `:progress="$progress"` renders it from the server. Fine for values that change occasionally (e.g. with `wire:poll`); add `:progress-duration` to tween. Avoid `wire:model.live` on a slider, which sends a request per movement.
- `$mapRoute('delivery').setProgress(0.75, 1000)` from any Alpine expression, or `LivewireMap.getRoute('delivery').setProgress(...)` from JavaScript.
- From PHP, without re-rendering: `$this->dispatch('map:route-progress-delivery', progress: 1, duration: 1500);`

#### Route Markers (`<x-map-route-marker>`)

Accepts every marker sub-component (`<x-marker-content>`, `<x-marker-label>`, `<x-marker-tooltip>`, `<x-marker-popup>`).

| Prop              | Type            | Default      | Description                                                       |
| ----------------- | --------------- | ------------ | ----------------------------------------------------------------- |
| `at`              | `string\|float` | `'progress'` | `start`, `end`, `progress` (follows `:progress`), or a 0–1 fraction. |
| `:align-to-route` | `bool`          | `false`      | Rotate the marker to the route heading.                           |
| `route-id`        | `string`        | parent       | Only needed when the marker is not nested inside its route.       |
| `anchor`          | `string`        | `'center'`   | Marker anchor.                                                    |
| `color`, `:offset`, `:rotation`, `rotation-alignment`, `pitch-alignment` | | | Same as `<x-map-marker>`. |

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
| `:cluster-colors`         | `array`  | `null`                             | Stepped colors, e.g. `['#60a5fa', '#2563eb', '#1e3a8a']` (overrides `cluster-color`).          |
| `:cluster-thresholds`     | `array`  | `null`                             | Point counts where `cluster-colors` step, e.g. `[25, 100]`.                                   |
| `cluster-text-color`      | `string` | `'#FFFFFF'`                        | Color of the count text inside clusters.                                                      |
| `:cluster-size-stops`     | `array`  | `[[0, 18], [100, 26], [1000, 34]]` | Cluster circle radius stops `[[count, radius], ...]`.                                         |
| `point-color`             | `string` | `'#1A56DB'`                        | Color of unclustered point circles.                                                           |
| `point-stroke-color`      | `string` | `'#FFFFFF'`                        | Outline color of unclustered points.                                                          |
| `:text-font`              | `array`  | `['Open Sans Semibold']`           | Font stack for the count labels (must exist in your style's glyphs).                          |
| `:disable-popup`          | `bool`   | `false`                            | Don't open a popup when a point is clicked (the event still fires).                           |
| `:point-radius`           | `int`    | `6`                                | Radius of unclustered point circles.                                                          |
| `:show-count`             | `bool`   | `true`                             | Show the point count inside clusters.                                                         |
| `popup-property`          | `string` | `null`                             | Feature property to use as the popup title (auto-styled).                                     |
| `popup-template`          | `string` | `null`                             | HTML string with `{property}` placeholders for custom popups.                                 |
| `:click-zoom`             | `bool`   | `true`                             | Zoom into a cluster when clicked.                                                             |
| `:buffer`                 | `int`    | `256`                              | GeoJSON source tile buffer size (higher = smoother panning).                                  |
| `:tolerance`              | `float`  | `0.5`                              | Geometry simplification tolerance (higher = faster tiles).                                    |
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

## Arcs (`<x-map-arc>`)

Curved lines between pairs of points: flight paths, shipping lanes, migration, transfers. Arcs are quadratic Bézier curves and cross the antimeridian the short way. A wider invisible hit layer makes thin arcs easy to hover and click.

```php
public array $flights = [
    ['id' => 'acc-lhr', 'from' => [-0.17, 5.60], 'to' => [-0.45, 51.47], 'city' => 'London', 'mode' => 'air'],
    ['id' => 'tem-rtm', 'from' => [0.02, 5.63], 'to' => [4.00, 51.95], 'city' => 'Rotterdam', 'mode' => 'sea'],
];
```

```blade
<x-map projection="globe" :center="[20, 25]" :zoom="1.2">
    <x-map-arc
        id="flights"
        :data="$flights"
        :curvature="0.25"
        :paint="['line-color' => ['match', ['get', 'mode'], 'air', '#a78bfa', 'sea', '#34d399', '#888'], 'line-width' => 1.5]"
        :hover-paint="['line-width' => 3, 'line-opacity' => 1]"
    >
        <x-slot:tooltip><strong>{city}</strong> by {mode}</x-slot:tooltip>
    </x-map-arc>
</x-map>
```

Every key besides `from`/`to` becomes a feature property, usable in paint expressions and `{placeholders}` (values are HTML-escaped).

| Prop            | Type     | Default | Description                                                                    |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------ |
| `:data`         | `array`  | `[]`    | `[['id' => ..., 'from' => [lng, lat], 'to' => [lng, lat], ...extra], ...]`.    |
| `id`            | `string` | UUID    | Layer id prefix (and the `{id}` in `map:update-arc-data-{id}`).                |
| `:curvature`    | `float`  | `0.2`   | Bend. `0` is straight; negative values bow to the other side.                  |
| `:samples`      | `int`    | `64`    | Points per arc.                                                                |
| `:paint`        | `array`  | `[]`    | MapLibre line paint, merged over `#4285F4` / width 2 / opacity 0.85.            |
| `:layout`       | `array`  | `[]`    | MapLibre line layout.                                                          |
| `:hover-paint`  | `array`  | `null`  | Paint applied to the hovered arc.                                              |
| `:interactive`  | `bool`   | `true`  | Hover/click handling, cursor, tooltip and popup.                               |
| `before-id`     | `string` | `null`  | Insert below this style layer.                                                 |
| `:fit-bounds`   | `bool`   | `false` | Fit the map to all arcs.                                                       |

Slots: `tooltip` (follows the cursor) and `popup` (on click). Events: `map:arc-hovered` and `map:arc-clicked` with `id`, `arc` (your original datum, `null` on leave), `lat`, `lng`.

---

## GeoJSON (`<x-map-geojson>`)

Render any GeoJSON: polygons get a fill and an outline, lines a line, and points a circle. Great for service areas, delivery zones, choropleths and boundaries.

```blade
<x-map :center="[-122.41, 37.77]" :zoom="12">
    <x-map-geojson
        id="area"
        :data="$area"
        interactive
        :fill-paint="['fill-color' => '#3b82f6', 'fill-opacity' => 0.25]"
        :fill-hover-paint="['fill-opacity' => 0.45]"
        :line-paint="['line-color' => '#2563eb', 'line-width' => 2]"
    >
        <x-slot:tooltip>{name}</x-slot:tooltip>
        <x-slot:popup><strong>{name}</strong><br>Population: {population}</x-slot:popup>
    </x-map-geojson>
</x-map>
```

For a map with no basemap (e.g. a world choropleth), use `<x-map blank>` and `:line-paint="false"`.

| Prop                  | Type            | Default | Description                                                                  |
| --------------------- | --------------- | ------- | ---------------------------------------------------------------------------- |
| `:data`               | `array\|string` | `[]`    | FeatureCollection, Feature or Geometry array, or a URL.                      |
| `id`                  | `string`        | UUID    | Layer id prefix (and the `{id}` in `map:update-geojson-{id}`).               |
| `promote-id`          | `string`        | `null`  | Property to use as the feature id (ids are generated otherwise).             |
| `:fill-paint`         | `array\|false`  | theme   | Fill paint for polygons, or `false` to drop the fill layer.                  |
| `:line-paint`         | `array\|false`  | theme   | Line paint for lines and polygon outlines, or `false`.                       |
| `:circle-paint`       | `array\|false`  | theme   | Circle paint for points, or `false`.                                         |
| `:fill-hover-paint`   | `array`         | `null`  | Fill paint for the hovered feature.                                          |
| `:line-hover-paint`   | `array`         | `null`  | Line paint for the hovered feature.                                          |
| `:circle-hover-paint` | `array`         | `null`  | Circle paint for the hovered feature.                                        |
| `:interactive`        | `bool`          | `false` | Hover/click handling, cursor, tooltip and popup.                             |
| `before-id`           | `string`        | `null`  | Insert below this style layer.                                               |
| `:fit-bounds`         | `bool`          | `false` | Fit the map to the data on load.                                             |
| `:fit-bounds-padding` | `int`           | `40`    | Padding for `:fit-bounds`.                                                   |

Slots: `tooltip` and `popup` with `{property}` placeholders. Events: `map:geojson-hovered` and `map:geojson-clicked` with `id`, `feature` (`id`, `properties`, `geometry`; `null` on leave), `lat`, `lng`.

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
| `map:viewport-changed`| `center, zoom, bearing, pitch` | Fired once any camera movement ends.               |
| `map:style-loaded`    | `style, dark`              | Fired after every style (re)load.                      |
| `map:style-reloaded`  | —                          | Fired after `map:set-style` finishes.                  |
| `map:theme-changed`   | `dark`                     | Theme swapped (`theme="auto"`).                        |
| `map:3d-toggled`      | `enabled`                  | The 3D control was used.                               |

Every event detail also includes `mapId`, so a component can tell maps apart.

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
| `map:cluster-clicked`       | `cluster_id, lat, lng, count` | A cluster circle was clicked.      |
| `map:cluster-expanded`      | `cluster_id, zoom`     | A cluster was expanded (zoomed into).     |
| `map:cluster-point-clicked` | `properties, lat, lng` | An individual unclustered point clicked.  |

##### Arc & GeoJSON Events

| Event                  | Detail                         | Description                                   |
| ---------------------- | ------------------------------ | --------------------------------------------- |
| `map:arc-hovered`      | `id, arc, lat, lng`            | Hovered arc changed (`arc` is `null` on leave). |
| `map:arc-clicked`      | `id, arc, lat, lng`            | An arc was clicked.                           |
| `map:geojson-hovered`  | `id, feature, lat, lng`        | Hovered feature changed (`null` on leave).    |
| `map:geojson-clicked`  | `id, feature, lat, lng`        | A feature was clicked.                        |

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

You can trigger these from your Livewire component using `$this->dispatch()`. Add a `mapId` (the map's `id` attribute) to target one map; without it, every map on the page reacts.

| Command                | Payload                                   | Description                                             |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------- |
| `map:fly-to`           | `center, zoom, bearing, pitch, essential` | Smooth animated move to a new location.                 |
| `map:jump-to`          | `center, zoom, bearing, pitch`            | Instant (non-animated) move to a new location.          |
| `map:ease-to`          | `center, zoom, bearing, pitch, duration`  | Eased camera move.                                      |
| `map:set-center`       | `center`                                  | Change the center.                                      |
| `map:set-theme`        | `theme` (`light`, `dark`, `auto`)         | Switch theme at runtime.                                |
| `map:fit-bounds`       | `bounds, padding, maxZoom`                | Fit the map view to specific bounds.                    |
| `map:set-zoom`         | `zoom`                                    | Change zoom level.                                      |
| `map:set-bearing`      | `bearing`                                 | Set the map bearing (rotation).                         |
| `map:set-pitch`        | `pitch`                                   | Set the map pitch (tilt).                               |
| `map:set-style`        | `style`                                   | Change the map style (URL or JSON).                     |
| `map:resize`           | —                                         | Force map recalculation (useful for hidden containers). |
| `map:force-animate`    | `id?, duration?`                          | Replay route draw animations (one route with `id`).     |
| `map:call`             | `method, ...args`                         | Call any MapLibre GL JS method directly.                |

##### Dynamic Data Commands

| Command                              | Payload        | Description                                   |
| ------------------------------------ | -------------- | --------------------------------------------- |
| `map:update-route-data-{id}`         | `coordinates`  | Update a route's coordinates dynamically.     |
| `map:update-cluster-data-{id}`       | GeoJSON data   | Update cluster data without full re-render.   |
| `map:update-route-group-{id}`        | `routes, ...`  | Update route group configuration.             |
| `map:route-progress-{id}`            | `progress, duration` | Set or animate route progress.          |
| `map:select-route-{id}`              | `index`        | Select an OSRM alternative.                   |
| `map:update-arc-data-{id}`           | `data`         | Replace arc data.                             |
| `map:update-geojson-{id}`            | GeoJSON data   | Replace GeoJSON data.                         |

> Most of the time you don't need these: components inside `<x-map>` already update when your Livewire properties change. Use the commands for high-frequency updates (live tracking, sliders) to skip the re-render.

#### Example: Fly To Location

```php
// In Livewire Component
public function centerOnPilot()
{
    $this->dispatch('map:fly-to', [
        'mapId' => 'main', // optional: only the <x-map id="main">
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

By default (`theme="auto"`), the map follows a `dark`/`light` class or a `data-theme` attribute on your `html` element, and swaps styles when it changes. Your markers, routes, arcs and layers are re-added automatically after the swap. Set `follow_system_theme` to also follow the OS preference. You can also force a specific theme using `theme="light"` or `theme="dark"`.

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
| `x-map-route-marker`    | Marker pinned to a point along its parent route.                 |
| `x-map-arc`             | Curved arcs between point pairs.                                 |
| `x-map-geojson`         | GeoJSON fill/line/circle layers.                                 |

The `$map` magic returns the MapLibre instance of the enclosing map, e.g. `x-on:click="$map.zoomIn()"`.

From plain JavaScript use `window.LivewireMap`:

```js
LivewireMap.getMap('main');               // MapLibre Map
LivewireMap.waitForMap('main', (map) => {}); // after the style has loaded
LivewireMap.getRoute('delivery').setProgress(0.8, 1000);
```
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
- **Lazy maps**: maps are created only when they come within 300px of the viewport, and maps in hidden tabs or modals wait until shown, so pages with many maps don't boot them all at once. Commands like `map:fly-to` sent to a map that hasn't started are queued. Use `:lazy="false"` for a map you must reach immediately from JavaScript.
- **Early downloads**: `@livewireMapStyles` (in `<head>`) preloads MapLibre and preconnects to the CDN and tile hosts. Add your own tile/style hosts to the `preconnect` config.
- **Directions**: OSRM results are cached for the browser session (reloads and `wire:navigate` reuse them), requests time out after 10s and fall back to straight lines, and routes on lazy maps only fetch once their map starts. The public `router.project-osrm.org` demo server is rate-limited and sometimes slow; set `osrm_url` to your own OSRM instance in production.
- **Data transport**: cluster, arc, GeoJSON and route-group data ships in a JSON `<script>` block rather than an HTML attribute. `:max-features-to-inline` is deprecated and ignored.
- **Directions caching**: identical OSRM requests are cached in the browser, and stale requests are aborted when waypoints change.
- **Assets**: the package JS/CSS URLs carry a content hash and are served with long-lived cache headers.

---

---

## Upgrading from v1

Most apps upgrade without code changes. Check these:

- **MapLibre v6 is ESM-only.** If you published the config, set `cdn_url` and `cdn_css_url` to `null` (or point `cdn_url` at a `.mjs` file). To stay on v5, set `cdn_url` to a v5 `maplibre-gl.js` URL.
- **Re-publish views** if you published them (`php artisan vendor:publish --tag=livewire-mapcn-views --force`). Old published views still work but miss new features.
- **Reactivity.** `<x-map>` now uses `wire:ignore.self`, so child components update when Livewire re-renders. Remove any `wire:ignore` you wrapped around maps, and add `wire:key` to markers rendered in loops.
- **Events are delivered once.** v1 sent every event twice to Livewire listeners (and `.window` Alpine listeners). If you worked around duplicates, remove the workaround.
- **Defaults that changed:** `<x-marker-popup>` / `<x-marker-tooltip>` anchor automatically with a 16px offset; `:with-stops` draws dots at your waypoints only; cluster circles are slightly smaller (`[[0, 18], [100, 26], [1000, 34]]`); `height="full"` now renders as `100%`.
- **Tailwind is optional.** Component styling no longer depends on your Tailwind build scanning the package views.
