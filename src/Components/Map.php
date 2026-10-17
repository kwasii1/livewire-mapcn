<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;
use Kwasii\LivewireMapcn\Support\MapStyle;

class Map extends Component
{
    use EncodesConfig;

    public function __construct(
        public ?array $center = null,
        public int|float|null $zoom = null,
        public int|float $minZoom = 0,
        public int|float $maxZoom = 22,
        public ?string $provider = null,
        public array|string|null $style = null,
        public string $theme = 'auto',
        public int|string|null $height = null,
        public int|string $width = '100%',
        public int|float $bearing = 0,
        public int|float $pitch = 0,
        public int|float|null $maxPitch = null,
        public bool $interactive = true,
        public bool $scrollZoom = true,
        public bool $doubleClickZoom = true,
        public bool $dragPan = true,
        public bool $dragRotate = true,
        public bool $touchZoomRotate = true,
        public bool $pitchWithRotate = true,
        public bool $cooperativeGestures = false,
        public bool $renderWorldCopies = true,
        public ?string $projection = null,
        public bool $blank = false,
        public ?array $maxBounds = null,
        public ?array $bounds = null,
        public int $boundsPadding = 40,
        public bool $attribution = true,
        public bool $attributionCompact = true,
        public ?bool $loader = null,
        public ?bool $lazy = null,
        public string $class = '',
        public array|string|null $lightStyle = null,
        public array|string|null $darkStyle = null,
        public array $events = [],
        public array $options = [],
    ) {
        $this->center = $center ?? config('livewire-mapcn.default_center', [0, 0]);
        $this->zoom = $zoom ?? config('livewire-mapcn.default_zoom', 7);
        $this->provider = $provider ?: config('livewire-mapcn.default_provider', 'carto-positron');
        $this->loader = $loader ?? (bool) config('livewire-mapcn.loader', true);
        $this->events = array_values(array_unique(array_merge(
            config('livewire-mapcn.custom_events', []),
            $events,
        )));
    }

    public static function cssSize(int|string|null $value, string $fallback = '100%'): string
    {
        if ($value === null || $value === '' || $value === 'full') {
            return $fallback;
        }

        return is_int($value) || ctype_digit((string) $value) ? $value.'px' : (string) $value;
    }

    /**
     * @return array{light: array<string, mixed>|string, dark: array<string, mixed>|string}
     */
    public function resolvedStyles(): array
    {
        if ($this->blank) {
            return ['light' => MapStyle::blank(), 'dark' => MapStyle::blank()];
        }

        // An explicit `style` applies to both themes unless a dark style is given.
        $light = MapStyle::resolve($this->provider, $this->lightStyle ?? $this->style);
        $dark = $this->darkStyle !== null
            ? MapStyle::resolve($this->provider, $this->darkStyle)
            : ($this->style !== null || $this->lightStyle !== null
                ? $light
                : MapStyle::resolve(config('livewire-mapcn.dark_provider', 'carto-dark-matter')));

        return ['light' => $light, 'dark' => $dark];
    }

    /** Config JSON for the x-map directive (called from the view, where the id attribute is known). */
    public function configJson(string $id): string
    {
        $styles = $this->resolvedStyles();

        return static::encodeConfig([
            'id' => $id,
            'center' => $this->center,
            'zoom' => $this->zoom,
            'minZoom' => $this->minZoom,
            'maxZoom' => $this->maxZoom,
            'maxPitch' => $this->maxPitch,
            'style' => $styles['light'],
            'lightStyle' => $styles['light'],
            'darkStyle' => $styles['dark'],
            'theme' => $this->theme,
            'followSystemTheme' => (bool) config('livewire-mapcn.follow_system_theme', false),
            'bearing' => $this->bearing,
            'pitch' => $this->pitch,
            'interactive' => $this->interactive,
            'scrollZoom' => $this->scrollZoom,
            'doubleClickZoom' => $this->doubleClickZoom,
            'dragPan' => $this->dragPan,
            'dragRotate' => $this->dragRotate,
            'touchZoomRotate' => $this->touchZoomRotate,
            'pitchWithRotate' => $this->pitchWithRotate,
            'cooperativeGestures' => $this->cooperativeGestures,
            'renderWorldCopies' => $this->renderWorldCopies,
            'projection' => $this->projection,
            'maxBounds' => $this->maxBounds,
            'bounds' => $this->bounds,
            'boundsPadding' => $this->boundsPadding,
            'attribution' => $this->attribution,
            'attributionCompact' => $this->attributionCompact,
            'lazy' => $this->lazy ?? (bool) config('livewire-mapcn.lazy', true),
            'customEvents' => $this->events,
            'options' => (object) $this->options,
        ]);
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.map', [
            'fallbackId' => 'map-'.Str::random(8),
            'cssHeight' => static::cssSize($this->height ?? config('livewire-mapcn.default_height', 'full')),
            'cssWidth' => static::cssSize($this->width),
        ]);
    }
}
