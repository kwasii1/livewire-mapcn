<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;

class MarkerTooltip extends Component
{
    public function __construct(
        public string $text,
        public string $anchor = 'top',
        public array $offset = [0, -10],
        public string $class = '',
    ) {}

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        return view('livewire-mapcn::components.marker-tooltip');
    }
}
