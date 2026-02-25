<?php

namespace Kwasii\LivewireMapcn\Support;

class MapStyle
{
    public static function resolve(string $providerKey, ?string $customStyle = null): array|string
    {
        if ($customStyle) {
            return $customStyle;
        }

        $provider = TileProvider::tryFrom($providerKey);

        if ($provider === TileProvider::OSM_RASTER) {
            return [
                'version' => 8,
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

        return $provider?->styleUrl() ?? TileProvider::CARTO_VOYAGER->styleUrl();
    }
}
