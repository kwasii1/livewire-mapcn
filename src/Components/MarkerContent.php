<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class MarkerContent extends Component
{
    public function __construct(
        public string $class = '',
    ) {}

    /**
     * @return View
     */
    public function render()
    {
        return view('livewire-mapcn::components.marker-content');
    }
}
