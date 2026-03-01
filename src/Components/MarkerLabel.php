<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;

class MarkerLabel extends Component
{
    public function __construct(
        public string $text,
        public string $position = 'bottom',
        public string $class = '',
    ) {}

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        return view('livewire-mapcn::components.marker-label');
    }
}
