<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MapRoute extends Component
{
    use EncodesConfig;

    /**
     * @param  array<int, array{0: float, 1: float}>  $coordinates  [lng, lat] waypoints
     * @param  float|null  $progress  0–1. Draws a "travelled" line on top of the route.
     * @param  string|null  $progressModel  Alpine expression to read progress from on the client (no server round trip)
     */
    public function __construct(
        public array $coordinates,
        public ?string $id = null,
        public string $color = '#1A56DB',
        public int|float $width = 4,
        public float $opacity = 1.0,
        public ?array $dashArray = null,
        public string $lineCap = 'round',
        public string $lineJoin = 'round',
        public string $activeColor = '#0F43C4',
        public int|float $activeWidth = 6,
        public ?float $activeOpacity = null,
        public ?array $activeDashArray = null,
        public ?string $hoverColor = null,
        public bool $clickable = true,
        public bool $withStops = false,
        public string $stopColor = '#1A56DB',
        public bool $fetchDirections = false,
        public string $directionsProfile = 'driving',
        public ?string $directionsUrl = null,
        public bool $animate = false,
        public int $animateDuration = 2000,
        public bool $active = false,
        public bool $alternatives = false,
        public int $maxAlternatives = 2,
        public string $alternativeColor = '#94A3B8',
        public float $alternativeOpacity = 0.5,
        public int|float $alternativeWidth = 3,
        public ?float $progress = null,
        public ?string $progressColor = null,
        public int|float|null $progressWidth = null,
        public ?float $progressOpacity = null,
        public ?array $progressDashArray = null,
        public int $progressDuration = 0,
        public ?string $progressModel = null,
        public ?string $beforeId = null,
        public bool $fitBounds = false,
    ) {
        $this->id = $id ?? Str::uuid()->toString();
        $this->directionsUrl = $directionsUrl ?? config('livewire-mapcn.osrm_url', 'https://router.project-osrm.org');
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.route', [
            'config' => static::encodeConfig([
                'id' => $this->id,
                'coordinates' => array_values($this->coordinates),
                'color' => $this->color,
                'width' => $this->width,
                'opacity' => $this->opacity,
                'dashArray' => $this->dashArray,
                'lineCap' => $this->lineCap,
                'lineJoin' => $this->lineJoin,
                'activeColor' => $this->activeColor,
                'activeWidth' => $this->activeWidth,
                'activeOpacity' => $this->activeOpacity,
                'activeDashArray' => $this->activeDashArray,
                'hoverColor' => $this->hoverColor,
                'clickable' => $this->clickable,
                'withStops' => $this->withStops,
                'stopColor' => $this->stopColor,
                'fetchDirections' => $this->fetchDirections,
                'directionsProfile' => $this->directionsProfile,
                'directionsUrl' => $this->directionsUrl,
                'animate' => $this->animate,
                'animateDuration' => $this->animateDuration,
                'active' => $this->active,
                'alternatives' => $this->alternatives,
                'maxAlternatives' => $this->maxAlternatives,
                'alternativeColor' => $this->alternativeColor,
                'alternativeOpacity' => $this->alternativeOpacity,
                'alternativeWidth' => $this->alternativeWidth,
                'progress' => $this->progress === null ? null : max(0.0, min(1.0, $this->progress)),
                'progressColor' => $this->progressColor,
                'progressWidth' => $this->progressWidth,
                'progressOpacity' => $this->progressOpacity,
                'progressDashArray' => $this->progressDashArray,
                'progressDuration' => $this->progressDuration,
                'progressModel' => $this->progressModel,
                'beforeId' => $this->beforeId,
                'fitBounds' => $this->fitBounds,
            ]),
        ]);
    }
}
