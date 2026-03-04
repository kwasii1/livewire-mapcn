<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Support\Str;
use Illuminate\View\Component;

class MapRouteGroup extends Component
{
    public function __construct(
        public array $routes,
        public ?string $id = null,
        public int|string $selectedRoute = 0,
        public bool $fitBounds = false,
        public string $alternativeColor = '#94A3B8',
        public float $alternativeOpacity = 0.5,
        public int $alternativeWidth = 3,
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
        public int $activeWidth = 6,
        public ?string $hoverColor = null,
        public bool $active = false,
        // Dash pattern
        public ?array $dashArray = null,
    ) {
        $this->id = $id ?? Str::uuid()->toString();
        $this->directionsUrl = $directionsUrl ?? config('livewire-mapcn.osrm_url', 'https://router.project-osrm.org');
    }

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        return view('livewire-mapcn::components.route-group');
    }
}
