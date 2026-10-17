<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

class MarkerLabel extends Component
{
    public function __construct(
        public ?string $text = null,
        public string $position = 'bottom',
        public string $class = '',
    ) {}

    public function render(): View
    {
        return view('livewire-mapcn::components.marker-label');
    }
}
