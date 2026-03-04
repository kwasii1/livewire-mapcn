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
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        return view('livewire-mapcn::components.route-group');
    }
}
