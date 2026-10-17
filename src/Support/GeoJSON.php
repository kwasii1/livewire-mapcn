<?php

namespace Kwasii\LivewireMapcn\Support;

use Illuminate\Contracts\Support\Arrayable;

class GeoJSON
{
    /**
     * @param  iterable<int, array<string, mixed>>  $data  Items with lat/lng keys, or GeoJSON Features
     * @return array{type: string, features: array<int, array<string, mixed>>}
     */
    public static function fromArray(iterable $data): array
    {
        $features = [];

        foreach ($data as $item) {
            // Accept models, collections and objects as well as arrays.
            $item = static::toArray($item);

            if (isset($item['type']) && $item['type'] === 'Feature') {
                $features[] = $item;

                continue;
            }

            if (isset($item['lat'], $item['lng'])) {
                // Any keys besides lat/lng/properties become properties too.
                $extra = array_diff_key($item, array_flip(['lat', 'lng', 'properties']));

                $features[] = [
                    'type' => 'Feature',
                    'geometry' => [
                        'type' => 'Point',
                        'coordinates' => [(float) $item['lng'], (float) $item['lat']],
                    ],
                    'properties' => (object) array_merge($extra, static::toArray($item['properties'] ?? [])),
                ];
            }
        }

        return [
            'type' => 'FeatureCollection',
            'features' => $features,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected static function toArray(mixed $value): array
    {
        return match (true) {
            is_array($value) => $value,
            $value instanceof Arrayable => $value->toArray(),
            is_string($value) => (array) (json_decode($value, true) ?? []),
            is_object($value) => get_object_vars($value),
            default => [],
        };
    }
}
