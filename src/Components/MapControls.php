<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;

class MapControls extends Component
{
    public function __construct(
        public bool $zoom = true,
        public bool $compass = true,
        public bool $locate = true,
        public bool $fullscreen = false,
        public bool $scale = false,
        public string $position = 'top-right',
        public string $class = '',
    ) {}

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.controls');
    }
}
