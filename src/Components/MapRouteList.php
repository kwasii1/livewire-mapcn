<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MapRouteList extends Component
{
    use EncodesConfig;

    /**
     * @param  string  $mapId  Deprecated: the list now finds its route by id anywhere on the page
     */
    public function __construct(
        public string $routeId = '',
        public string $mapId = '',
        public bool $showDistance = true,
        public bool $showDuration = true,
        public bool $showFastestBadge = true,
        public bool $showTimeDiff = true,
        public string $position = 'top-left',
        public string $title = 'Routes',
        public string $width = '',
        public string $containerClass = '',
        public string $headerClass = '',
        public string $itemClass = '',
    ) {}

    public function render(): View
    {
        return view('livewire-mapcn::components.route-list', [
            'config' => static::encodeConfig([
                'routeId' => $this->routeId,
                'showDistance' => $this->showDistance,
                'showDuration' => $this->showDuration,
                'showFastestBadge' => $this->showFastestBadge,
                'showTimeDiff' => $this->showTimeDiff,
                'title' => $this->title,
            ]),
        ]);
    }
}
