<?php

use Kwasii\LivewireMapcn\Support\GeoJSON;
use Kwasii\LivewireMapcn\Support\MapStyle;
use Kwasii\LivewireMapcn\Support\TileProvider;

it('converts lat/lng arrays to a feature collection', function () {
    $geo = GeoJSON::fromArray([
        ['lat' => 51.5, 'lng' => -0.09, 'properties' => ['name' => 'A']],
        ['type' => 'Feature', 'geometry' => ['type' => 'Point', 'coordinates' => [1, 2]], 'properties' => []],
        ['nope' => true],
    ]);

    expect($geo['features'])->toHaveCount(2)
        ->and($geo['features'][0]['geometry']['coordinates'])->toBe([-0.09, 51.5]);
});

it('moves extra keys into properties', function () {
    $feature = GeoJSON::fromArray([['lat' => 1, 'lng' => 2, 'name' => 'A', 'properties' => ['status' => 'ok']]])['features'][0];

    expect((array) $feature['properties'])->toBe(['name' => 'A', 'status' => 'ok']);
});

it('encodes empty properties as a json object', function () {
    expect(json_encode(GeoJSON::fromArray([['lat' => 1, 'lng' => 2]])))->toContain('"properties":{}');
});

it('falls back to positron for unknown providers', function () {
    expect(MapStyle::resolve('does-not-exist'))->toBe(TileProvider::CARTO_POSITRON->styleUrl());
});

it('treats a provider key passed as a style', function () {
    expect(MapStyle::resolve(null, 'carto-voyager'))->toBe(TileProvider::CARTO_VOYAGER->styleUrl());
});

it('gives inline styles glyphs so labels render', function () {
    expect(MapStyle::resolve('osm-raster'))->toHaveKey('glyphs')
        ->and(MapStyle::blank())->toHaveKey('glyphs');
});

it('accepts arrayable and object items', function () {
    $geo = GeoJSON::fromArray([
        collect(['lat' => 1, 'lng' => 2, 'name' => 'A']),
        (object) ['lat' => 3, 'lng' => 4, 'properties' => (object) ['name' => 'B']],
    ]);

    expect($geo['features'])->toHaveCount(2)
        ->and($geo['features'][1]['properties']->name)->toBe('B');
});
