<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

/**
 * Render any GeoJSON (polygons, lines, points) as fill/outline/circle layers.
 * Pass `false` to a paint prop to drop that layer.
 */
class MapGeoJson extends Component
{
    use EncodesConfig;

    /**
     * @param  array<string, mixed>|string  $data  FeatureCollection, Feature, Geometry or a URL
     * @param  array<string, mixed>|false|null  $fillPaint
     * @param  array<string, mixed>|false|null  $linePaint
     * @param  array<string, mixed>|false|null  $circlePaint
     */
    public function __construct(
        public array|string $data = [],
        public ?string $id = null,
        public ?string $promoteId = null,
        public array|bool|null $fillPaint = null,
        public array|bool|null $linePaint = null,
        public array|bool|null $circlePaint = null,
        public ?array $fillHoverPaint = null,
        public ?array $lineHoverPaint = null,
        public ?array $circleHoverPaint = null,
        public bool $interactive = false,
        public ?string $beforeId = null,
        public bool $fitBounds = false,
        public int $fitBoundsPadding = 40,
    ) {
        $this->id = $id ?? Str::uuid()->toString();
    }

    /**
     * @param  array<string, mixed>|bool|null  $paint
     * @return array<string, mixed>|false|null
     */
    protected static function paint(array|bool|null $paint): array|false|null
    {
        if ($paint === false) {
            return false;
        }

        return is_array($paint) ? $paint : null;
    }

    public function render(): View
    {
        $isUrl = is_string($this->data);

        return view('livewire-mapcn::components.geojson', [
            'config' => static::encodeConfig([
                'id' => $this->id,
                'url' => $isUrl ? $this->data : null,
                'promoteId' => $this->promoteId,
                'fillPaint' => static::paint($this->fillPaint),
                'linePaint' => static::paint($this->linePaint),
                'circlePaint' => static::paint($this->circlePaint),
                'fillHoverPaint' => $this->fillHoverPaint,
                'lineHoverPaint' => $this->lineHoverPaint,
                'circleHoverPaint' => $this->circleHoverPaint,
                'interactive' => $this->interactive,
                'beforeId' => $this->beforeId,
                'fitBounds' => $this->fitBounds,
                'fitBoundsPadding' => $this->fitBoundsPadding,
            ]),
            'json' => $isUrl ? null : static::encodeScriptJson($this->data ?: ['type' => 'FeatureCollection', 'features' => []]),
        ]);
    }
}
