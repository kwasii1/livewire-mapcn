---
name: livewire-mapcn-development
description: Build and work with livewire-mapcn map components, including markers, popups, routes, clusters, and reactive Livewire map interactions.
---

# livewire-mapcn Development

## When to use this skill

Use this skill when:
- Adding interactive maps to a Laravel Livewire page or component
- Working with markers, popups, tooltips, route lines, or cluster layers
- Displaying directions or animated routes on a map
- Building reactive UI that responds to map events (clicks, drags, pans, zooms)
- Dynamically updating map data without a full Livewire re-render
- Troubleshooting map rendering, asset loading, or Livewire event issues

## Package Overview

`kwasii/livewire-mapcn` provides MapLibre GL JS-powered Blade components that integrate natively with Livewire's reactivity system. It also requires **Alpine.js** and **Tailwind CSS** to be present in the project.

> **Critical: Coordinate order is `[lng, lat]`** — longitude first, latitude second. This matches MapLibre GL JS conventions, not the typical `[lat, lng]` order you may expect.

## Setup Checklist

1. `composer require kwasii/livewire-mapcn`
2. Publish config (optional): `php artisan vendor:publish --tag=livewire-mapcn-config`
3. Publish assets (optional): `php artisan vendor:publish --tag=livewire-mapcn-assets`
4. Add to Blade layout:

```blade
<head>
    @livewireMapStyles
</head>
<body>
    ...
    @livewireScripts
    @livewireMapScripts
</body>
```

Assets are automatically served via package routes — publishing is not required unless you need to self-host or customize delivery.

## Component Hierarchy

```
<x-map>                         ← root, required, wraps everything
  <x-map-controls />            ← navigation, locate, fullscreen, scale
  <x-map-marker>                ← marker at [lat, lng]
    <x-marker-content />        ← fully custom HTML marker icon
    <x-marker-label />          ← text label near marker
    <x-marker-popup />          ← click-to-open popup
    <x-marker-tooltip />        ← hover tooltip
  </x-map-marker>
  <x-map-popup />               ← standalone popup at fixed coords
  <x-map-cluster-layer />       ← clustered GeoJSON point layer
  <x-map-route />               ← single polyline / OSRM route
  <x-map-route-group />         ← multiple selectable routes
  <x-map-route-list />          ← route selection UI panel (overlaid)
</x-map>
```

## Configuration Reference

`config/livewire-mapcn.php`:

| Key | Default | Description |
|-----|---------|-------------|
| `default_provider` | `'carto-positron'` | Default tile provider |
| `dark_provider` | `'carto-dark-matter'` | Tile provider for dark theme |
| `default_height` | `'full'` | CSS height fallback |
| `default_zoom` | `7` | Initial zoom fallback |
| `default_center` | `[0, 0]` | Center `[lng, lat]` fallback |
| `osrm_url` | `'https://router.project-osrm.org'` | OSRM routing server |
| `inject_assets` | `'route'` | `'route'` or `'published'` |
| `load_from_cdn` | `true` | Load MapLibre from CDN |
| `maplibre_version` | `'5.19.0'` | MapLibre GL JS version |
| `cdn_url` | CDN URL | Override to self-host JS |
| `cdn_css_url` | CDN URL | Override to self-host CSS |
| `carto_license` | `'non-commercial'` | Or `'enterprise'` for commercial use |
| `cluster_popup_view` | `null` | Blade view for cluster popups |
| `custom_events` | `[]` | Global extra MapLibre events to forward as `map:*` |

## Built-in Tile Providers

| Key | Description |
|-----|-------------|
| `carto-positron` | Minimal light (default) |
| `carto-voyager` | Light with road detail |
| `carto-dark-matter` | Dark |
| `osm-raster` | OpenStreetMap raster tiles |

Pass a full MapLibre style JSON URL to the `style` prop to use a custom tile source instead.

## Common Patterns

### Basic responsive map

```blade
<x-map :center="[-0.09, 51.5]" :zoom="13" height="500px" provider="carto-positron">
    <x-map-controls position="top-right" :locate="true" :fullscreen="true" />
</x-map>
```

### Markers from Livewire state

```blade
<x-map :center="$mapCenter" :zoom="$zoom">
    @foreach ($locations as $loc)
        <x-map-marker :lat="$loc['lat']" :lng="$loc['lng']" :id="$loc['id']">
            <x-marker-label :text="$loc['name']" position="top" />
            <x-marker-tooltip :text="$loc['category']" />
            <x-marker-popup>
                <strong>{{ $loc['name'] }}</strong>
                <p>{{ $loc['address'] }}</p>
            </x-marker-popup>
        </x-map-marker>
    @endforeach
</x-map>
```

### Custom HTML marker icon

```blade
<x-map-marker :lat="51.5" :lng="-0.09">
    <x-marker-content>
        <div class="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
            📍
        </div>
    </x-marker-content>
    <x-marker-popup>Custom icon marker</x-marker-popup>
</x-map-marker>
```

### Draggable marker → Livewire event

```blade
<x-map :center="$center" :zoom="13" :events="['marker:drag-end']">
    <x-map-marker :lat="$lat" :lng="$lng" :draggable="true" id="pin" />
</x-map>
```

```php
// Livewire component
#[On('map:marker-drag-end')]
public function onDragEnd(string $id, float $lat, float $lng): void
{
    $this->lat = $lat;
    $this->lng = $lng;
}
```

### Standalone popup at coordinates

```blade
<x-map :center="[-0.09, 51.5]" :zoom="13">
    <x-map-popup :lat="51.5" :lng="-0.09" :open="true" max-width="250px">
        <p class="font-semibold">London</p>
    </x-map-popup>
</x-map>
```

### Cluster layer from PHP array

```blade
<x-map :center="[-0.09, 51.5]" :zoom="10">
    <x-map-cluster-layer
        :data="$locations"
        cluster-color="#3b82f6"
        :cluster-max-zoom="14"
        :cluster-radius="50"
        :show-count="true"
    >
        <x-slot:popup>
            <div class="p-3 space-y-1">
                <h3 class="font-semibold text-sm">{name}</h3>
                <p class="text-xs text-gray-500">{address}</p>
                <p class="text-[11px] text-gray-400">{lat}, {lng}</p>
            </div>
        </x-slot:popup>
    </x-map-cluster-layer>
</x-map>
```

The `$locations` array format:

```php
$locations = [
    ['lat' => 51.505, 'lng' => -0.09, 'properties' => ['name' => 'Office A', 'address' => '10 Downing St']],
    ['lat' => 51.51,  'lng' => -0.10, 'properties' => ['name' => 'Office B', 'address' => '22 Baker St']],
];
```

In the `<x-slot:popup>`, use `{propertyName}` placeholders. `{lat}` and `{lng}` are always available.

### Cluster layer from GeoJSON URL

```blade
<x-map-cluster-layer
    url="https://example.com/api/locations.geojson"
    cluster-color="#ef4444"
    popup-property="title"
/>
```

### Dynamic cluster data update (no re-render)

```php
use Kwasii\LivewireMapcn\Support\GeoJSON;

// In Livewire component
public function filterLocations(string $category): void
{
    $filtered = $this->locations->where('category', $category)->toArray();
    $this->dispatch(
        "map:update-cluster-data-{$this->clusterId}",
        GeoJSON::fromArray($filtered)
    );
}
```

### Simple OSRM route

```blade
<x-map :center="[-0.11, 51.505]" :zoom="13">
    <x-map-route
        :coordinates="[[-0.12, 51.51], [-0.10, 51.50]]"
        :fetch-directions="true"
        directions-profile="driving"
        color="#1A56DB"
        :width="4"
        :with-stops="true"
    />
</x-map>
```

### Animated dashed route

```blade
<x-map-route
    :coordinates="$routeCoords"
    :fetch-directions="true"
    directions-profile="walking"
    :dash-array="[5, 3]"
    line-cap="butt"
    :animate="true"
    :animate-duration="3000"
/>
```

### Route with alternatives + selection panel

```blade
<x-map :center="[-0.11, 51.505]" :zoom="13">
    <x-map-route
        id="main-route"
        :coordinates="$coords"
        :fetch-directions="true"
        :alternatives="true"
        :max-alternatives="2"
    />
    <x-map-route-list
        route-id="main-route"
        position="top-left"
        title="Route Options"
        :show-distance="true"
        :show-duration="true"
        :show-fastest-badge="true"
        :show-time-diff="true"
    />
</x-map>
```

### Route group (multiple predefined routes)

```php
// Livewire component
public array $routes = [
    [
        'id' => 'route-a',
        'coordinates' => [[-0.12, 51.51], [-0.11, 51.51], [-0.10, 51.50]],
        'color' => '#ef4444',
    ],
    [
        'id' => 'route-b',
        'coordinates' => [[-0.12, 51.51], [-0.115, 51.515], [-0.10, 51.50]],
        'color' => '#3b82f6',
    ],
];
```

```blade
<x-map :center="[-0.11, 51.505]" :zoom="14">
    <x-map-route-group
        id="trip-routes"
        :routes="$routes"
        :selected-route="$selectedRoute"
        :fit-bounds="true"
        :clickable="true"
        :with-stops="true"
        :fetch-directions="true"
        directions-profile="driving"
    />
    <x-map-route-list
        route-id="trip-routes"
        position="top-left"
        title="Choose Route"
    />
</x-map>
```

Listen for selection changes:

```php
#[On('map:route-group-selection-changed')]
public function onRouteSelected(string $groupId, int $routeIndex): void
{
    $this->selectedRoute = $routeIndex;
}
```

### Dynamically update route coordinates

```php
$this->dispatch("map:update-route-data-{$routeId}", [
    'coordinates' => $newCoordinates,
]);
```

### Dynamically update route group

```php
$this->dispatch("map:update-route-group-{$groupId}", [
    'routes' => $updatedRoutes,
    'selectedRoute' => 1,
]);
```

### Fly to / programmatic map control

```php
// Smooth animated pan + zoom
$this->dispatch('map:fly-to', [
    'center' => [-0.09, 51.5],
    'zoom' => 14,
    'essential' => true,
]);

// Instant move (no animation)
$this->dispatch('map:jump-to', ['center' => [-0.09, 51.5], 'zoom' => 12]);

// Fit map to a bounding box
$this->dispatch('map:fit-bounds', [
    'bounds' => [[-0.2, 51.4], [0.0, 51.6]],
    'padding' => 50,
]);

// Call any MapLibre GL JS method
$this->dispatch('map:call', ['method' => 'setMaxZoom', 'args' => [18]]);
```

### Handle map click to drop a marker

```blade
<x-map :center="$center" :zoom="13" :events="['click']">
    @if($selectedLat)
        <x-map-marker :lat="$selectedLat" :lng="$selectedLng" />
    @endif
</x-map>
```

```php
#[On('map:click')]
public function onMapClick(float $lat, float $lng): void
{
    $this->selectedLat = $lat;
    $this->selectedLng = $lng;
}
```

### Reactive viewport tracking with Alpine.js

```blade
<div x-data="{ zoom: 13, lat: 51.5, lng: -0.09 }">
    <x-map
        :center="[-0.09, 51.5]"
        :zoom="13"
        @map:move="lat = $event.detail.lat; lng = $event.detail.lng"
        @map:zoom="zoom = $event.detail.zoom"
    />
    <div>Zoom: <span x-text="zoom.toFixed(1)"></span></div>
</div>
```

### Dark/light theme

```blade
<x-map
    :center="$center"
    theme="auto"
    provider="carto-positron"
    dark-style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
/>
```

`theme="auto"` reads the `.dark` class on `<html>`. Use `theme="light"` or `theme="dark"` to force a mode. Provide `light-style` and `dark-style` props for separate style URLs per theme.

## Events Reference

### Outbound (package → Livewire/Alpine)

**Map:**
| Event | Payload | Notes |
|-------|---------|-------|
| `map:loaded` | — | Map ready |
| `map:click` | `lat, lng, detail` | |
| `map:double-click` | `lat, lng, detail` | |
| `map:right-click` | `lat, lng, detail` | |
| `map:move` | `lat, lng` | Throttled 100ms |
| `map:center-changed` | `lat, lng` | After movement ends |
| `map:zoom` | `zoom` | Throttled 100ms |
| `map:zoom-changed` | `zoom` | After zoom ends |
| `map:bounds-changed` | `bounds` | |
| `map:drag-end` | `lat, lng` | |
| `map:bearing-changed` | `bearing` | Throttled 100ms |
| `map:pitch-changed` | `pitch` | Throttled 100ms |
| `map:style-loaded` | — | |

**Locate:** `map:locate-success` (lat, lng, accuracy), `map:locate-error` (error)

**Markers:** `map:marker-clicked` (id,lat,lng), `map:marker-drag-start`, `map:marker-drag`, `map:marker-drag-end`, `map:marker-mouseenter`, `map:marker-mouseleave`, `map:marker-popup-open` (id), `map:marker-popup-close` (id)

**Popups:** `map:popup-open` (id), `map:popup-close` (id)

**Routes:** `map:route-clicked` (id), `map:route-mouseenter` (id), `map:route-mouseleave` (id), `map:route-directions-ready` (id, distance, duration), `map:route-directions-error` (id, error), `map:route-alternative-selected` (id, alternativeIndex), `map:route-updated` (id)

**Route group:** `map:route-group-selection-changed` (groupId, routeIndex)

**Route list:** `map:route-list-selected` (routeIndex)

**Clusters:** `map:cluster-clicked` (clusterId, lat, lng), `map:cluster-expanded` (clusterId), `map:cluster-point-clicked` (properties, lat, lng)

### Inbound commands (Livewire → map)

| Command | Payload | Description |
|---------|---------|-------------|
| `map:fly-to` | `center, zoom, bearing, pitch, essential` | Animated pan/zoom |
| `map:jump-to` | `center, zoom, bearing, pitch` | Instant move |
| `map:fit-bounds` | `bounds, padding, maxZoom` | Fit to bounding box |
| `map:set-zoom` | `zoom` | |
| `map:set-bearing` | `bearing` | |
| `map:set-pitch` | `pitch` | |
| `map:set-style` | `style` | Change tile style |
| `map:resize` | — | Force resize (hidden containers) |
| `map:force-animate` | — | Re-trigger route animation |
| `map:call` | `method, args` | Any MapLibre GL JS method |
| `map:update-route-data-{id}` | `coordinates` | Update route path |
| `map:update-cluster-data-{id}` | GeoJSON FeatureCollection | Update cluster points |
| `map:update-route-group-{id}` | `routes, selectedRoute, ...` | Update route group |

## GeoJSON Helper

`Kwasii\LivewireMapcn\Support\GeoJSON::fromArray()` converts PHP arrays to GeoJSON FeatureCollections:

```php
use Kwasii\LivewireMapcn\Support\GeoJSON;

// From lat/lng array
$geoJson = GeoJSON::fromArray([
    ['lat' => 51.505, 'lng' => -0.09, 'properties' => ['name' => 'Location A']],
    ['lat' => 51.51,  'lng' => -0.10, 'properties' => ['name' => 'Location B']],
]);

// Raw GeoJSON Feature objects pass through unchanged
$geoJson = GeoJSON::fromArray([
    ['type' => 'Feature', 'geometry' => [...], 'properties' => [...]],
]);
```

## Performance Tips

- **Large datasets** (100+ points): Always use `<x-map-cluster-layer>` instead of individual `<x-map-marker>` components.
- **Dynamic updates**: Use `map:update-cluster-data-{id}`, `map:update-route-data-{id}`, `map:update-route-group-{id}` to push changes without Livewire re-rendering the component tree.
- **`:max-features-to-inline`**: Default `2000`. Above this, data is injected via JavaScript `_clusterData` instead of HTML attributes to avoid DOM size limits.
- **Throttled events**: `map:move`, `map:zoom`, `map:bearing-changed`, `map:pitch-changed` fire at 100ms intervals. Use `map:center-changed`, `map:zoom-changed` for post-interaction final values.
- **Cluster tuning**: Increase `:cluster-radius` (e.g., `80`) for fewer clusters and faster rendering. Set `:cluster-max-zoom="12"` to stop unclustering at lower zoom levels. Use `:tolerance="0.8"` to simplify geometries at the cost of precision.
- **Buffer**: `:buffer="512"` reduces tile-edge artefacts during fast panning (uses more memory).
- **`wire:ignore`**: The `<x-map>` root div already uses `wire:ignore`, so Livewire will not touch the map DOM — child components communicate via Alpine.js `x-data` directives and the `x-map-*` custom directives.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Map not rendering | Ensure `@livewireMapStyles` is in `<head>` and `@livewireMapScripts` is before `</body>` |
| 404 on assets | Check `inject_assets` config; if `'route'`, package routes must not be blocked by middleware |
| Markers not updating | Trigger a Livewire `$refresh` or ensure the parent component re-renders (map uses `wire:ignore` so child Blade re-renders are needed) |
| Directions not loading | Test OSRM server is reachable; set a self-hosted `osrm_url` for production |
| Map blank on resize | Dispatch `map:resize` from Livewire after showing a previously hidden container |
| Routes wrong geometry | Confirm coordinates are `[lng, lat]` order — not `[lat, lng]` |
| CARTO tiles not showing | Check `carto_license` config; commercial use requires `'enterprise'` |
