<?php

namespace Kwasii\LivewireMapcn\Support;

enum TileProvider: string
{
    case CARTO_VOYAGER = 'carto-voyager';
    case CARTO_DARK_MATTER = 'carto-dark-matter';
    case CARTO_POSITRON = 'carto-positron';
    case OPENFREEMAP_LIBERTY = 'openfreemap-liberty';
    case OPENFREEMAP_BRIGHT = 'openfreemap-bright';
    case OPENFREEMAP_POSITRON = 'openfreemap-positron';
    case OSM_RASTER = 'osm-raster';
    case BLANK = 'blank';
    case CUSTOM = 'custom';

    public function styleUrl(): ?string
    {
        return match ($this) {
            self::CARTO_VOYAGER => 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
            self::CARTO_DARK_MATTER => 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            self::CARTO_POSITRON => 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            // Liberty ships 3D building extrusions; pair it with a pitched view.
            self::OPENFREEMAP_LIBERTY => 'https://tiles.openfreemap.org/styles/liberty',
            self::OPENFREEMAP_BRIGHT => 'https://tiles.openfreemap.org/styles/bright',
            self::OPENFREEMAP_POSITRON => 'https://tiles.openfreemap.org/styles/positron',
            self::OSM_RASTER, self::BLANK, self::CUSTOM => null, // Inline style JSON (see MapStyle)
        };
    }
}
