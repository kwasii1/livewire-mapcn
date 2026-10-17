<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MapMarker extends Component
{
    use EncodesConfig;

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
        public ?float $opacity = null,
        public string $class = '',
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.marker', [
            'directive' => 'x-map-marker',
            'config' => static::encodeConfig([
                'id' => $this->id,
                'lat' => $this->lat,
                'lng' => $this->lng,
                'draggable' => $this->draggable,
                'color' => $this->color,
                'anchor' => $this->anchor,
                'offset' => $this->offset,
                'rotation' => $this->rotation,
                'rotationAlignment' => $this->rotationAlignment,
                'pitchAlignment' => $this->pitchAlignment,
                'opacity' => $this->opacity,
            ]),
        ]);
    }
}
