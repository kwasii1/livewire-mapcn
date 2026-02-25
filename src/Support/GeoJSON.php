<?php

namespace Kwasii\LivewireMapcn\Support;

class GeoJSON
{
    public static function fromArray(array $data): array
    {
        $features = [];

        foreach ($data as $item) {
            if (isset($item['type']) && $item['type'] === 'Feature') {
                $features[] = $item;

                continue;
            }

            if (isset($item['lat']) && isset($item['lng'])) {
                $features[] = [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [(float) $item['lng'], (float) $item['lat']],
                    ],
                    'properties' => $item['properties'] ?? [],
                ];
            }
        }

        return [
            'type' => 'FeatureCollection',
            'features' => $features,
        ];
    }
}
