<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;
use Kwasii\LivewireMapcn\Support\GeoJSON;

class MapClusterLayer extends Component
{
    use EncodesConfig;

    public array $geoJsonData;

    /**
     * @param  array<int, string>|null  $clusterColors  e.g. ['#3b82f6', '#1d4ed8', '#1e3a8a'], stepped by $clusterThresholds
     * @param  array<int, int>|null  $clusterThresholds  e.g. [100, 750]
     * @param  int  $maxFeaturesToInline  Deprecated: data is always embedded as a JSON script block
     */
    public function __construct(
        public array $data = [],
        public ?string $id = null,
        public ?string $url = null,
        public int $clusterMaxZoom = 14,
        public int $clusterRadius = 50,
        public int $clusterMinPoints = 2,
        public string $clusterColor = '#1A56DB',
        public ?array $clusterColors = null,
        public ?array $clusterThresholds = null,
        public string $clusterTextColor = '#FFFFFF',
        public array $clusterSizeStops = [[0, 18], [100, 26], [1000, 34]],
        public string $pointColor = '#1A56DB',
        public string $pointStrokeColor = '#FFFFFF',
        public int $pointRadius = 6,
        public bool $showCount = true,
        public ?array $textFont = null,
        public ?string $popupProperty = null,
        public ?string $popupTemplate = null,
        public bool $clickZoom = true,
        public int $buffer = 256,
        public float $tolerance = 0.5,
        public bool $disablePopup = false,
        public int $maxFeaturesToInline = 2000,
        public string $class = '',
    ) {
        $this->id = $id ?? Str::uuid()->toString();
        $this->geoJsonData = $this->url ? [] : GeoJSON::fromArray($data);

        // App-wide default popup: a Blade view whose HTML may use {property} placeholders.
        if ($this->popupTemplate === null && ($view = config('livewire-mapcn.cluster_popup_view'))) {
            $this->popupTemplate = view($view)->render();
        }
    }

    public function render(): View
    {
        return view('livewire-mapcn::components.cluster-layer', [
            'config' => static::encodeConfig([
                'id' => $this->id,
                'url' => $this->url,
                'clusterMaxZoom' => $this->clusterMaxZoom,
                'clusterRadius' => $this->clusterRadius,
                'clusterMinPoints' => $this->clusterMinPoints,
                'clusterColor' => $this->clusterColor,
                'clusterColors' => $this->clusterColors,
                'clusterThresholds' => $this->clusterThresholds,
                'clusterTextColor' => $this->clusterTextColor,
                'clusterSizeStops' => $this->clusterSizeStops,
                'pointColor' => $this->pointColor,
                'pointStrokeColor' => $this->pointStrokeColor,
                'pointRadius' => $this->pointRadius,
                'showCount' => $this->showCount,
                'textFont' => $this->textFont,
                'popupProperty' => $this->popupProperty,
                'popupTemplate' => $this->popupTemplate,
                'clickZoom' => $this->clickZoom,
                'buffer' => $this->buffer,
                'tolerance' => $this->tolerance,
                'disablePopup' => $this->disablePopup,
            ]),
            'json' => $this->url ? null : static::encodeScriptJson($this->geoJsonData),
        ]);
    }
}
