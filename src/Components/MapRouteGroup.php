<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MapRouteGroup extends Component
{
    use EncodesConfig;

    public function __construct(
        public array $routes,
        public ?string $id = null,
        public int|string $selectedRoute = 0,
        public bool $fitBounds = false,
        public string $alternativeColor = '#94A3B8',
        public float $alternativeOpacity = 0.5,
        public int|float $alternativeWidth = 3,
        public string $lineCap = 'round',
        public string $lineJoin = 'round',
        public bool $clickable = true,
        // Directions
        public bool $fetchDirections = false,
        public string $directionsProfile = 'driving',
        public ?string $directionsUrl = null,
        // Animation
        public bool $animate = false,
        public int $animateDuration = 2000,
        // Stops
        public bool $withStops = false,
        public string $stopColor = '#1A56DB',
        // Active/hover styling (applies to selected route)
        public string $activeColor = '#0F43C4',
        public int|float $activeWidth = 6,
        public ?string $hoverColor = null,
        public bool $active = false,
        // Dash pattern
        public ?array $dashArray = null,
    ) {
        $this->id = $id ?? Str::uuid()->toString();
        $this->directionsUrl = $directionsUrl ?? config('livewire-mapcn.osrm_url', 'https://router.project-osrm.org');
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.route-group', [
            'config' => static::encodeConfig([
                'id' => $this->id,
                'selectedRoute' => is_numeric($this->selectedRoute) ? (int) $this->selectedRoute : $this->selectedRoute,
                'fitBounds' => $this->fitBounds,
                'alternativeColor' => $this->alternativeColor,
                'alternativeOpacity' => $this->alternativeOpacity,
                'alternativeWidth' => $this->alternativeWidth,
                'lineCap' => $this->lineCap,
                'lineJoin' => $this->lineJoin,
                'clickable' => $this->clickable,
                'fetchDirections' => $this->fetchDirections,
                'directionsProfile' => $this->directionsProfile,
                'directionsUrl' => $this->directionsUrl,
                'animate' => $this->animate,
                'animateDuration' => $this->animateDuration,
                'withStops' => $this->withStops,
                'stopColor' => $this->stopColor,
                'activeColor' => $this->activeColor,
                'activeWidth' => $this->activeWidth,
                'hoverColor' => $this->hoverColor,
                'active' => $this->active,
                'dashArray' => $this->dashArray,
            ]),
            'json' => static::encodeScriptJson(array_values($this->routes)),
        ]);
    }
}
