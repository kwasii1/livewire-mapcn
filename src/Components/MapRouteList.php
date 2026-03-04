<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;

class MapRouteList extends Component
{
    public function __construct(
        public string $routeId = '',
        public string $mapId = '',
        public bool $showDistance = true,
        public bool $showDuration = true,
        public bool $showFastestBadge = true,
        public bool $showTimeDiff = true,
        public string $position = 'top-left',
        public string $title = 'Routes',
    ) {}

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        return view('livewire-mapcn::components.route-list');
    }
}
