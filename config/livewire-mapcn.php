<?php

// config for Kwasii/LivewireMapcn
return [
    'default_provider' => 'carto-positron',

    /*
    |--------------------------------------------------------------------------
    | MapLibre GL JS
    |--------------------------------------------------------------------------
    |
    | By default MapLibre is loaded from jsDelivr at `maplibre_version`.
    | MapLibre v6+ ships as an ES module only; @livewireMapScripts imports it
    | with a module script and exposes it as `window.maplibregl`.
    |
    | Set `cdn_url` / `cdn_css_url` to pin exact URLs. A URL ending in `.mjs`
    | is loaded as a module; anything else (e.g. a v5 `maplibre-gl.js` UMD
    | build) as a classic script. Set `load_from_cdn` to false if you bundle
    | MapLibre yourself (assign it to `window.maplibregl`).
    |
    */
    'maplibre_version' => '6.14.0',
    'load_from_cdn' => true,
    'cdn_url' => null,
    'cdn_css_url' => null,

    // Informational: CARTO basemaps are free for non-commercial use; commercial
    // apps need a CARTO enterprise license (or another provider).
    'carto_license' => 'non-commercial',
    'default_height' => 'full',
    'default_zoom' => 7,
    'default_center' => [0, 0],
    'dark_provider' => 'carto-dark-matter',

    /*
    | With theme="auto", maps follow a `dark`/`light` class or `data-theme`
    | attribute on <html>. Enable this to also follow the OS preference when
    | neither is present.
    */
    'follow_system_theme' => false,

    /*
    | Create maps only when they come near the viewport (and once visible, for
    | maps in hidden tabs/modals). Pages with many maps load much faster.
    | Override per map with :lazy="false".
    */
    'lazy' => true,

    // Show the default loading indicator on every map (override with :loader).
    'loader' => true,

    /*
    | Hosts to <link rel="preconnect"> to from @livewireMapStyles, so tile and
    | style downloads start before the first map is created.
    */
    'preconnect' => [
        'https://basemaps.cartocdn.com',
        'https://tiles.basemaps.cartocdn.com',
    ],

    // The public demo server is rate-limited; use your own OSRM instance in production.
    'osrm_url' => 'https://router.project-osrm.org',
    // Default Blade view for cluster point popups ({property} placeholders work).
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
