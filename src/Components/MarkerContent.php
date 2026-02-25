<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;

class MarkerContent extends Component
{
    public function __construct(
        public string $class = '',
    ) {}

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.marker-content');
    }
}
