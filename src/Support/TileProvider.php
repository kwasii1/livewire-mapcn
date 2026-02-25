<?php

namespace Kwasii\LivewireMapcn\Support;

enum TileProvider: string
{
    case CARTO_VOYAGER = 'carto-voyager';
    case CARTO_DARK_MATTER = 'carto-dark-matter';
    case CARTO_POSITRON = 'carto-positron';
    case OSM_RASTER = 'osm-raster';
    case CUSTOM = 'custom';

    public function styleUrl(): ?string
    {
        return match ($this) {
            self::CARTO_VOYAGER => 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
            self::CARTO_DARK_MATTER => 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            self::CARTO_POSITRON => 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            self::OSM_RASTER => null, // Handled specially via raster source
            self::CUSTOM => null,
        };
    }
}
