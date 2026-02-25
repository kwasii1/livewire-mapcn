<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\View\Component;

class MarkerPopup extends Component
{
    public function __construct(
        public string $maxWidth = '300px',
        public bool $closeButton = true,
        public bool $closeOnClickMap = true,
        public bool $closeOnMove = false,
        public string $anchor = 'bottom',
        public array $offset = [0, 0],
        public string $class = '',
    ) {}

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.marker-popup');
    }
}
