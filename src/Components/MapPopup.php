<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MapPopup extends Component
{
    use EncodesConfig;

    /**
     * @param  int|array<int, int>|null  $offset
     */
    public function __construct(
        public float $lat,
        public float $lng,
        public ?string $id = null,
        public bool $open = true,
        public string $maxWidth = '300px',
        public bool $closeButton = false,
        public bool $closeOnClickMap = true,
        public bool $closeOnMove = false,
        public ?string $anchor = null,
        public int|array|null $offset = [0, 0],
        public string $class = '',
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.popup', [
            'config' => static::encodeConfig([
                'id' => $this->id,
                'lat' => $this->lat,
                'lng' => $this->lng,
                'open' => $this->open,
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
