<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
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
     * @return View
     */
    public function render()
    {
        return view('livewire-mapcn::components.marker-tooltip');
    }
}
