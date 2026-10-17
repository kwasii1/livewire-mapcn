<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

/**
 * Curved connections between pairs of points (flight paths, trade flows...).
 * Each datum is ['id' => ..., 'from' => [lng, lat], 'to' => [lng, lat], ...extra];
 * extra fields become feature properties usable in paint expressions,
 * tooltips and popups.
 */
class MapArc extends Component
{
    use EncodesConfig;

    /**
     * @param  array<int, array<string, mixed>>  $data
     * @param  array<string, mixed>  $paint  MapLibre line paint, merged over the defaults
     * @param  array<string, mixed>  $layout  MapLibre line layout
     * @param  array<string, mixed>|null  $hoverPaint  Paint applied to the hovered arc
     */
    public function __construct(
        public array $data = [],
        public ?string $id = null,
        public float $curvature = 0.2,
        public int $samples = 64,
        public array $paint = [],
        public array $layout = [],
        public ?array $hoverPaint = null,
        public bool $interactive = true,
        public ?string $beforeId = null,
        public bool $fitBounds = false,
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.arc', [
            'config' => static::encodeConfig([
                'id' => $this->id,
                'curvature' => $this->curvature,
                'samples' => $this->samples,
                'paint' => (object) $this->paint,
                'layout' => (object) $this->layout,
                'hoverPaint' => $this->hoverPaint,
                'interactive' => $this->interactive,
                'beforeId' => $this->beforeId,
                'fitBounds' => $this->fitBounds,
            ]),
            'json' => static::encodeScriptJson(array_values($this->data)),
        ]);
    }
}
