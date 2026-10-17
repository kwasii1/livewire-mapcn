<?php

use Illuminate\Support\Facades\Blade;

it('loads maplibre v6 as an es module by default', function () {
    $html = Blade::render('@livewireMapScripts');

    expect($html)->toContain('<script type="module"')
        ->and($html)->toContain('maplibre-gl@6.14.0/dist/maplibre-gl.mjs')
        ->and($html)->toContain('window.maplibregl = maplibregl')
        ->and($html)->toMatch('#livewire-mapcn\.js\?v=[0-9a-f]{10}#');
});

it('loads a classic umd build when configured', function () {
    config()->set('livewire-mapcn.cdn_url', 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js');

    $html = Blade::render('@livewireMapScripts');

    expect($html)->not->toContain('type="module"')
        ->and($html)->toContain('<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js"');
});

it('can skip the cdn', function () {
    config()->set('livewire-mapcn.load_from_cdn', false);

    expect(Blade::render('@livewireMapScripts'))->not->toContain('maplibre-gl@')
        ->and(Blade::render('@livewireMapStyles'))->not->toContain('maplibre-gl@');
});

it('serves package assets with cache headers', function () {
    $response = $this->get(route('livewire-mapcn.js', ['v' => 'abc']));

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/javascript; charset=utf-8');
    expect($response->headers->get('Cache-Control'))->toContain('immutable');

    $this->get(route('livewire-mapcn.css'), ['If-None-Match' => $response->headers->get('ETag')])
        ->assertStatus(200);
    $this->get(route('livewire-mapcn.js'), ['If-None-Match' => $response->headers->get('ETag')])
        ->assertStatus(304);
});

it('preloads maplibre and preconnects from the styles directive', function () {
    $html = Blade::render('@livewireMapStyles');

    expect($html)->toContain('<link rel="modulepreload" href="https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl.mjs" crossorigin>')
        ->and($html)->toContain('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>')
        ->and($html)->toContain('<link rel="preconnect" href="https://tiles.basemaps.cartocdn.com" crossorigin>');
});
