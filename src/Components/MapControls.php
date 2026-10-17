<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MapControls extends Component
{
    use EncodesConfig;

    public function __construct(
        public bool $zoom = true,
        public bool $compass = true,
        public bool $locate = true,
        public bool $fullscreen = false,
        public bool $scale = false,
        public string $scaleUnit = 'metric',
        public bool $threeD = false,
        public int|float $threeDPitch = 60,
        public int|float $threeDBearing = -20,
        public int $threeDDuration = 1000,
        public bool $visualizePitch = true,
        public bool $trackUser = true,
        public string $position = 'top-right',
        public string $class = '',
    ) {}

    public function render(): View
    {
        return view('livewire-mapcn::components.controls', [
            'config' => static::encodeConfig([
                'zoom' => $this->zoom,
                'compass' => $this->compass,
                'locate' => $this->locate,
                'fullscreen' => $this->fullscreen,
                'scale' => $this->scale,
                'scaleUnit' => $this->scaleUnit,
                'threeD' => $this->threeD,
                'threeDPitch' => $this->threeDPitch,
                'threeDBearing' => $this->threeDBearing,
                'threeDDuration' => $this->threeDDuration,
                'visualizePitch' => $this->visualizePitch,
                'trackUser' => $this->trackUser,
                'position' => $this->position,
            ]),
        ]);
    }
}
