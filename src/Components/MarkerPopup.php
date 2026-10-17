<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MarkerPopup extends Component
{
    use EncodesConfig;

    /**
     * @param  string|null  $anchor  null lets MapLibre pick the side with the most room
     * @param  int|array<int, int>|null  $offset  null uses a 16px offset above the marker
     */
    public function __construct(
        public string $maxWidth = '300px',
        public bool $closeButton = true,
        public bool $closeOnClickMap = true,
        public bool $closeOnMove = false,
        public ?string $anchor = null,
        public int|array|null $offset = null,
        public string $class = '',
    ) {}

    public function render(): View
    {
        return view('livewire-mapcn::components.marker-popup', [
            'config' => static::encodeConfig([
                'maxWidth' => $this->maxWidth,
                'closeButton' => $this->closeButton,
                'closeOnClickMap' => $this->closeOnClickMap,
                'closeOnMove' => $this->closeOnMove,
                'anchor' => $this->anchor,
                'offset' => $this->offset,
            ]),
        ]);
    }
}
