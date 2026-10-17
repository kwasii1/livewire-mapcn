<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

/**
 * A custom control: any Blade/Alpine markup pinned to a corner of the map.
 * Use the `$map` Alpine magic inside it to reach the MapLibre instance.
 */
class MapControl extends Component
{
    public function __construct(
        public string $position = 'top-left',
        public bool $group = true,
        public string $class = '',
    ) {}

    public function render(): View
    {
        return view('livewire-mapcn::components.control');
    }
}
