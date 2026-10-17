<?php

namespace Kwasii\LivewireMapcn\Support;

class MapStyle
{
    /** Glyphs for inline styles so symbol layers (e.g. cluster counts) can render text. */
    public const GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

    /**
     * @param  array<string, mixed>|string|null  $customStyle  Style URL or MapLibre style JSON
     * @return array<string, mixed>|string
     */
    public static function resolve(?string $providerKey, array|string|null $customStyle = null): array|string
    {
        if ($customStyle !== null && $customStyle !== '' && $customStyle !== []) {
            // Allow passing a provider key wherever a style is accepted.
            if (is_string($customStyle) && ($provider = TileProvider::tryFrom($customStyle)) !== null) {
                return static::forProvider($provider);
            }

            return $customStyle;
        }

        $provider = TileProvider::tryFrom((string) $providerKey) ?? TileProvider::CARTO_POSITRON;

        return static::forProvider($provider);
    }

    /**
     * @return array<string, mixed>|string
     */
    public static function forProvider(TileProvider $provider): array|string
    {
        return match ($provider) {
            TileProvider::OSM_RASTER => static::osmRaster(),
            TileProvider::BLANK => static::blank(),
            default => $provider->styleUrl() ?? TileProvider::CARTO_POSITRON->styleUrl(),
        };
    }

    /**
     * A transparent style with no basemap, for GeoJSON-only maps.
     *
     * @return array<string, mixed>
     */
    public static function blank(): array
    {
        return [
            'version' => 8,
            'glyphs' => static::GLYPHS_URL,
            'sources' => (object) [],
            'layers' => [
                [
                    'id' => 'background',
                    'type' => 'background',
                    'paint' => ['background-color' => 'rgba(0,0,0,0)'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function osmRaster(): array
    {
        return [
            'version' => 8,
            'glyphs' => static::GLYPHS_URL,
            'sources' => [
                'osm' => [
                    'type' => 'raster',
                    'tiles' => ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    'tileSize' => 256,
                    'attribution' => '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                ],
            ],
            'layers' => [
                [
                    'id' => 'osm-tiles',
                    'type' => 'raster',
                    'source' => 'osm',
                    'minzoom' => 0,
                    'maxzoom' => 19,
                ],
            ],
        ];
    }
}
