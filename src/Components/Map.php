<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Support\MapStyle;

class Map extends Component
{
    public function __construct(
        public array $center = [0, 0],
        public int $zoom = 13,
        public int $minZoom = 0,
        public int $maxZoom = 22,
        public string $provider = 'carto-voyager',
        public ?string $style = null,
        public string $theme = 'auto',
        public string $height = '400px',
        public string $width = '100%',
        public float $bearing = 0,
        public float $pitch = 0,
        public bool $interactive = true,
        public bool $scrollZoom = true,
        public bool $doubleClickZoom = true,
        public bool $dragPan = true,
        public string $class = '',
        public ?string $lightStyle = null,
        public ?string $darkStyle = null,
    ) {
        $this->center = $center ?: config('livewire-mapcn.default_center', [0, 0]);
        $this->zoom = $zoom ?: config('livewire-mapcn.default_zoom', 13);
        $this->height = $height ?: config('livewire-mapcn.default_height', '400px');
        $this->provider = $provider ?: config('livewire-mapcn.default_provider', 'carto-voyager');
    }

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        $resolvedStyle = MapStyle::resolve($this->provider, $this->style);
        $resolvedDarkStyle = MapStyle::resolve(config('livewire-mapcn.dark_provider', 'carto-dark-matter'), $this->darkStyle);
        $resolvedLightStyle = MapStyle::resolve($this->provider, $this->lightStyle);

        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.map', [
            'resolvedStyle' => $resolvedStyle,
            'resolvedDarkStyle' => $resolvedDarkStyle,
            'resolvedLightStyle' => $resolvedLightStyle,
        ]);
    }
}
