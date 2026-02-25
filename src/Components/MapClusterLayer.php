<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Support\Str;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Support\GeoJSON;

class MapClusterLayer extends Component
{
    public array $geoJsonData;

    public function __construct(
        public array $data,
        public ?string $id = null,
        public int $clusterMaxZoom = 14,
        public int $clusterRadius = 50,
        public int $clusterMinPoints = 2,
        public string $clusterColor = '#1A56DB',
        public string $clusterTextColor = '#FFFFFF',
        public array $clusterSizeStops = [[0, 30], [100, 40], [1000, 50]],
        public string $pointColor = '#1A56DB',
        public int $pointRadius = 6,
        public bool $showCount = true,
        public ?string $popupProperty = null,
        public ?string $popupTemplate = null,
        public bool $clickZoom = true,
        public string $class = '',
    ) {
        $this->id = $id ?? Str::uuid()->toString();
        $this->geoJsonData = GeoJSON::fromArray($data);
    }

    /**
     * @return \Illuminate\Contracts\View\View
     */
    public function render()
    {
        // @phpstan-ignore-next-line
        return view('livewire-mapcn::components.cluster-layer');
    }
}
