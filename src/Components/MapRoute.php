<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Support\Str;
use Illuminate\View\Component;

class MapRoute extends Component
{
    public function __construct(
        public array $coordinates,
        public ?string $id = null,
        public string $color = '#1A56DB',
        public int $width = 4,
        public float $opacity = 1.0,
        public ?array $dashArray = null,
        public string $lineCap = 'round',
        public string $lineJoin = 'round',
        public string $activeColor = '#0F43C4',
        public int $activeWidth = 6,
        public ?string $hoverColor = null,
        public bool $clickable = true,
        public bool $withStops = false,
        public string $stopColor = '#1A56DB',
        public bool $fetchDirections = false,
        public string $directionsProfile = 'driving',
        public ?string $directionsUrl = null,
        public bool $animate = false,
        public int $animateDuration = 2000,
        public bool $active = false,
    ) {
        $this->id = $id ?? Str::uuid()->toString();
        $this->directionsUrl = $directionsUrl ?? config('livewire-mapcn.osrm_url', 'https://router.project-osrm.org');
    }

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.route');
    }
}
