<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Support\Str;
use Illuminate\View\Component;

class MapMarker extends Component
{
    public function __construct(
        public float $lat,
        public float $lng,
        public ?string $id = null,
        public bool $draggable = false,
        public string $color = '#1A56DB',
        public string $anchor = 'bottom',
        public array $offset = [0, 0],
        public float $rotation = 0,
        public string $rotationAlignment = 'auto',
        public string $pitchAlignment = 'auto',
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
        return view('livewire-mapcn::components.marker');
    }
}
