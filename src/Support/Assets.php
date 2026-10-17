<?php

namespace Kwasii\LivewireMapcn\Support;

use Illuminate\Http\Response;

class Assets
{
    public const JS = 'js/livewire-mapcn.js';

    public const CSS = 'css/livewire-mapcn.css';

    public static function path(string $asset): string
    {
        return dirname(__DIR__, 2).'/resources/'.$asset;
    }

    /** Short content hash used to cache-bust the asset URLs. */
    public static function version(string $asset): string
    {
        static $versions = [];

        return $versions[$asset] ??= substr((string) md5_file(static::path($asset)), 0, 10);
    }

    public static function url(string $asset): string
    {
        if (config('livewire-mapcn.inject_assets', 'route') === 'published') {
            return asset('vendor/livewire-mapcn/'.basename($asset)).'?v='.static::version($asset);
        }

        return route($asset === static::JS ? 'livewire-mapcn.js' : 'livewire-mapcn.css', ['v' => static::version($asset)]);
    }

    public static function response(string $asset): Response
    {
        $etag = '"'.static::version($asset).'"';
        $headers = [
            'Content-Type' => str_ends_with($asset, '.js') ? 'application/javascript; charset=utf-8' : 'text/css; charset=utf-8',
            'ETag' => $etag,
            // URLs carry a content hash, so they can be cached aggressively.
            'Cache-Control' => request()->query('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
        ];

        if (request()->header('If-None-Match') === $etag) {
            return new Response('', 304, $headers);
        }

        return new Response((string) file_get_contents(static::path($asset)), 200, $headers);
    }

    /**
     * MapLibre script URL and whether it is an ES module (v6+ ships ESM only).
     *
     * @return array{url: string, module: bool}
     */
    public static function maplibreScript(): array
    {
        $url = config('livewire-mapcn.cdn_url')
            ?: 'https://cdn.jsdelivr.net/npm/maplibre-gl@'.config('livewire-mapcn.maplibre_version', '6.14.0').'/dist/maplibre-gl.mjs';

        return ['url' => $url, 'module' => str_ends_with(strtok($url, '?'), '.mjs')];
    }

    public static function origin(string $url): string
    {
        $parts = parse_url($url);

        return isset($parts['scheme'], $parts['host']) ? $parts['scheme'].'://'.$parts['host'] : $url;
    }

    public static function maplibreStylesheet(): string
    {
        return config('livewire-mapcn.cdn_css_url')
            ?: 'https://cdn.jsdelivr.net/npm/maplibre-gl@'.config('livewire-mapcn.maplibre_version', '6.14.0').'/dist/maplibre-gl.css';
    }
}
