<?php

// config for Kwasii/LivewireMapcn
return [
    'default_provider' => 'carto-positron',
    'maplibre_version' => '5.19.0',
    'load_from_cdn' => true,
    'cdn_url' => 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.x/dist/maplibre-gl.js',
    'cdn_css_url' => 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.x/dist/maplibre-gl.css',
    'carto_license' => 'non-commercial',
    'default_height' => 'full',
    'default_zoom' => 7,
    'default_center' => [0, 0],
    'dark_provider' => 'carto-dark-matter',
    'osrm_url' => 'https://router.project-osrm.org',
    'cluster_popup_view' => null,

    /*
    |--------------------------------------------------------------------------
    | Custom MapLibre Events
    |--------------------------------------------------------------------------
    |
    | An array of additional MapLibre event names to forward to Livewire on
    | all maps. Each event will be dispatched as "map:{event-name}".
    | Example: ['idle', 'sourcedata', 'error', 'terrain']
    |
    | Per-map overrides can be set via the `events` prop on <x-map>.
    |
    */
    'custom_events' => [],

    /*
    |--------------------------------------------------------------------------
    | Asset Injection Method
    |--------------------------------------------------------------------------
    |
    | How should the package JS/CSS be loaded?
    | - 'route': Serve from package via Laravel route (no publishing needed)
    | - 'published': Use published assets from public/vendor/livewire-mapcn
    |
    */
    'inject_assets' => 'route',
];
