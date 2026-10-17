<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

/**
 * A marker pinned to a point along its parent <x-map-route>:
 * "start", "end", "progress" (follows the route's progress) or a 0–1 fraction.
 */
class MapRouteMarker extends Component
{
    use EncodesConfig;

    public function __construct(
        public string|float $at = 'progress',
        public ?string $routeId = null,
        public ?string $id = null,
        public bool $alignToRoute = false,
        public string $color = '#1A56DB',
        public string $anchor = 'center',
        public array $offset = [0, 0],
        public float $rotation = 0,
        public string $rotationAlignment = 'auto',
        public string $pitchAlignment = 'auto',
        public string $class = '',
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.marker', [
            'directive' => 'x-map-route-marker',
            'config' => static::encodeConfig([
                'id' => $this->id,
                'at' => is_numeric($this->at) ? (float) $this->at : $this->at,
                'routeId' => $this->routeId,
                'alignToRoute' => $this->alignToRoute,
                'color' => $this->color,
                'anchor' => $this->anchor,
                'offset' => $this->offset,
                'rotation' => $this->rotation,
                'rotationAlignment' => $this->rotationAlignment,
                'pitchAlignment' => $this->pitchAlignment,
            ]),
        ]);
    }
}
