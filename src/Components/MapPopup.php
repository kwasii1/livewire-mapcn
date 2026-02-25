<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Support\Str;
use Illuminate\View\Component;

class MapPopup extends Component
{
    public function __construct(
        public float $lat,
        public float $lng,
        public ?string $id = null,
        public bool $open = true,
        public string $maxWidth = '300px',
        public bool $closeButton = false,
        public bool $closeOnClickMap = true,
        public bool $closeOnMove = false,
        public string $anchor = 'bottom',
        public array $offset = [0, 0],
        public string $class = '',
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.popup');
    }
}
