# Livewire Mapcn Documentation Guide

Welcome to the documentation guide for **livewire-mapcn**, a Laravel Livewire package inspired by [mapcn.dev](https://mapcn.dev). This package allows you to easily integrate beautiful, interactive maps into your Laravel applications using MapLibre GL JS, Tailwind CSS, and Alpine.js.

---

## Getting Started

`livewire-mapcn` provides a set of Blade components that wrap MapLibre GL JS functionality in a "Livewire-friendly" way. It supports common mapping features like markers, popups, routes, and clustering, all while being responsive and theme-aware.

### Core Concepts

- **Declarative Maps**: Define your map and its features using expressive Blade tags.
- **Livewire Integration**: Interact with the map from your PHP component via events.
- **Theme Support**: Built-in support for light, dark, and auto themes (following Tailwind's `.dark` class).
- **Extensibility**: Custom providers and MapLibre style JSON support.

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

| Key                | Default                   | Description                                      |
| ------------------ | ------------------------- | ------------------------------------------------ |
| `default_provider` | `'carto-positron'`        | Default tile provider for all maps.              |
| `dark_provider`    | `'carto-dark-matter'`     | Provider used for dark mode.                     |
| `default_height`   | `'full'`                  | Default CSS height if not specified in prop.     |
| `default_zoom`     | `7`                       | Default initial zoom level.                      |
| `default_center`   | `[0, 0]`                  | Default initial coordinates `[lng, lat]`.        |
| `osrm_url`         | `router.project-osrm.org` | Base URL for fetching road directions.           |
| `inject_assets`    | `'route'`                 | `'route'` (auto-load) or `'published'` (manual). |
| `load_from_cdn`    | `true`                    | Load MapLibre JS/CSS from CDN or local.          |

---

---

## API Reference

The package provides several Blade components. All components must be nested inside the root `<x-map>` component.

- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Map (`<x-map>`)](#map-x-map)
- [Controls (`<x-map-controls>`)](#controls-x-map-controls)
- [Markers (`<x-map-marker>`)](#markers-x-map-marker)
- [Popups (`<x-map-popup>`)](#popups-x-map-popup)
- [Routes (`<x-map-route>`)](#routes-x-map-route)
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

| Prop           | Type     | Default           | Description                                                                              |
| -------------- | -------- | ----------------- | ---------------------------------------------------------------------------------------- |
| `:center`      | `array`  | `[0, 0]`          | Initial map center `[lng, lat]`.                                                         |
| `:zoom`        | `int`    | `13`              | Initial zoom level (0–22).                                                               |
| `:min-zoom`    | `int`    | `0`               | Minimum zoom level.                                                                      |
| `:max-zoom`    | `int`    | `22`              | Maximum zoom level.                                                                      |
| `provider`     | `string` | `'carto-voyager'` | Options: `carto-voyager`, `carto-positron`, `carto-dark-matter`, `osm-raster`, `custom`. |
| `style`        | `string` | `null`            | Custom MapLibre style JSON URL.                                                          |
| `theme`        | `string` | `'auto'`          | `'light'`, `'dark'`, or `'auto'` (follows `.dark` class).                                |
| `height`       | `string` | `'400px'`         | CSS height (e.g., `500px`, `100vh`).                                                     |
| `width`        | `string` | `'100%'`          | CSS width.                                                                               |
| `:bearing`     | `float`  | `0`               | Initial bearing in degrees.                                                              |
| `:pitch`       | `float`  | `0`               | Initial pitch (0–60 degrees).                                                            |
| `:interactive` | `bool`   | `true`            | Enable mouse/touch interactions.                                                         |
| `:scroll-zoom` | `bool`   | `true`            | Allow mouse wheel zoom.                                                                  |

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
    </x-marker-marker>
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

| Prop         | Type     | Default      | Description                              |
| ------------ | -------- | ------------ | ---------------------------------------- |
| `:lat`       | `float`  | **Required** | Latitude.                                |
| `:lng`       | `float`  | **Required** | Longitude.                               |
| `id`         | `string` | UUID         | Unique marker identifier.                |
| `:draggable` | `bool`   | `false`      | Allow user to drag marker.               |
| `color`      | `string` | `'#1A56DB'`  | Default dot color.                       |
| `anchor`     | `string` | `'bottom'`   | Anchor point (`center`, `bottom`, etc.). |

### Marker Sub-Components

Markers can be customized using these child components:

#### `<x-marker-content>`

Renders custom HTML as the marker icon.

```blade
<x-marker-content>
    <img src="/icons/pin.png" class="w-8 h-8" />
</x-marker-content>
```

#### `<x-marker-label>`

Adds a text label near the marker. Styled with a frosted glass effect, subtle border, and automatic dark mode support.

- `text`: The label text.
- `position`: `top`, `bottom`, `left`, `right`.
- `class`: Additional CSS classes.

#### `<x-marker-tooltip>`

Adds a hover tooltip using MapLibre's Popup. Styled with a dark pill in light mode and a light pill in dark mode for maximum contrast.

- `text`: The tooltip text.
- `class`: Additional CSS classes.

#### `<x-marker-popup>`

Adds a click-to-open popup.

- Supports any HTML in the slot.
- `anchor`: Where to anchor relative to marker.
- `max-width`: CSS max-width for the popup.

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

| Prop             | Type     | Default      | Description               |
| ---------------- | -------- | ------------ | ------------------------- |
| `:lat`           | `float`  | **Required** | Latitude.                 |
| `:lng`           | `float`  | **Required** | Longitude.                |
| `:open`          | `bool`   | `true`       | Initial visibility.       |
| `max-width`      | `string` | `'300px'`    | CSS max-width.            |
| `:close-button`  | `bool`   | `false`      | Show close icon.          |
| `:close-on-move` | `bool`   | `false`      | Close when the map moves. |

---

## Routes (`<x-map-route>`)

Draw polylines or fetch real driving/walking directions.

### Basic Polyline

```blade
<x-map-route :coordinates="$coords" color="#10b981" :width="5" />
```

### OSRM Directions

```blade
<x-map-route
    :coordinates="$coords"
    :fetch-directions="true"
    directions-profile="driving"
    :animate="true"
/>
```

### Props

| Prop                 | Type     | Default      | Description                      |
| -------------------- | -------- | ------------ | -------------------------------- |
| `:coordinates`       | `array`  | **Required** | Array of `[lng, lat]` pairs.     |
| `color`              | `string` | `'#1A56DB'`  | Line color.                      |
| `:width`             | `int`    | `4`          | Line width in pixels.            |
| `:fetch-directions`  | `bool`   | `false`      | Fetch road geometry from OSRM.   |
| `directions-profile` | `string` | `'driving'`  | `driving`, `walking`, `cycling`. |
| `:animate`           | `bool`   | `false`      | Animate drawn route.             |
| `:with-stops`        | `bool`   | `false`      | Show markers at each coordinate. |

---

## Clusters (`<x-map-cluster-layer>`)

Efficiently handle thousands of markers by clustering them.

### Usage

```blade
<x-map-cluster-layer
    :data="$locations"
    cluster-color="#3b82f6"
    popup-property="name"
/>
```

### Props

| Prop                      | Type     | Default      | Description                                                                                   |
| ------------------------- | -------- | ------------ | --------------------------------------------------------------------------------------------- |
| `:data`                   | `array`  | **Required** | Array of `['lat' => ..., 'lng' => ..., 'properties' => [...]]` items or raw GeoJSON Features. |
| `:cluster-max-zoom`       | `int`    | `14`         | Max zoom level to cluster at.                                                                 |
| `:cluster-radius`         | `int`    | `50`         | Pixel radius to cluster points together.                                                      |
| `:cluster-min-points`     | `int`    | `2`          | Minimum points to form a cluster.                                                             |
| `cluster-color`           | `string` | `'#1A56DB'`  | Color of the cluster circle.                                                                  |
| `cluster-text-color`      | `string` | `'#FFFFFF'`  | Color of the count text inside clusters.                                                      |
| `point-color`             | `string` | `'#1A56DB'`  | Color of unclustered point circles.                                                           |
| `:point-radius`           | `int`    | `6`          | Radius of unclustered point circles.                                                          |
| `:show-count`             | `bool`   | `true`       | Show the point count inside clusters.                                                         |
| `popup-property`          | `string` | `null`       | Feature property to use as the popup title (auto-styled).                                     |
| `popup-template`          | `string` | `null`       | HTML string with `{property}` placeholders for custom popups.                                 |
| `:click-zoom`             | `bool`   | `true`       | Zoom into a cluster when clicked.                                                             |
| `:buffer`                 | `int`    | `256`        | GeoJSON source tile buffer size (higher = smoother panning).                                  |
| `:tolerance`              | `float`  | `0.5`        | Geometry simplification tolerance (higher = faster tiles).                                    |
| `:max-features-to-inline` | `int`    | `2000`       | Feature count threshold before switching to JS-based data injection.                          |

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

#### Events Dispatched to Livewire

- `map:loaded`: Dispatched when the map style is fully loaded.
- `map:click`: `(lat, lng, detail)`
- `map:zoom-changed`: `(zoom)`
- `map:center-changed`: `(lat, lng)`
- `map:marker-clicked`: `(id, lat, lng)`
- `map:marker-drag-end`: `(id, lat, lng)`

#### Commands Listened from Livewire

You can trigger these from your Livewire component using `this->dispatch()`:

- `map:fly-to`: Move the map smoothly to a new location.
- `map:set-zoom`: Change zoom level.
- `map:fit-bounds`: Fit the map view to specific coordinates.
- `map:resize`: Force a map recalculation (useful for hidden-to-visible containers).

#### Example: Flight Tracking

```php
// In Livewire Component
public function centerOnPilot()
{
    $this->dispatch('map:fly-to', [
        'center' => [-0.09, 51.5],
        'zoom' => 12,
        'essential' => true
    ]);
}
```

### Theme Awareness

By default, the map follows the `.dark` class on your `html` element if `theme="auto"` is set. You can also force a specific theme using `theme="light"` or `theme="dark"`.

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

### Performance Tips

- **Use clusters for large datasets**: Always use `<x-map-cluster-layer>` instead of individual `<x-map-marker>` tags for datasets over ~100 points.
- **Tune cluster radius**: Larger `:cluster-radius` values (e.g., `80`) produce fewer clusters and faster rendering.
- **Lower cluster max zoom**: Setting `:cluster-max-zoom="12"` stops unclustering at lower zoom levels, reducing visible point counts.
- **Increase tolerance**: `:tolerance="0.8"` simplifies geometries for faster tile generation at the cost of precision.
- **Increase buffer**: `:buffer="512"` reduces tile-edge artefacts during fast panning (uses more memory).
- **Throttled events**: Continuous map events (`map:move`, `map:zoom`, `map:bearing-changed`, `map:pitch-changed`) are throttled to 100ms to prevent frame drops. Final values are still delivered via `moveend`/`zoomend` events.
- **Dynamic updates**: Use `map:update-cluster-data-{id}` Livewire events to update data without re-rendering the entire component.

---

_This guide serves as a technical foundation for building the `livewire-mapcn` documentation website._
