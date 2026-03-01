<div
    x-data
    x-map-cluster-layer
    data-cluster-id="{{ $id }}"
    data-cluster-config="{{ json_encode([
        'id' => $id,
        'clusterMaxZoom' => $clusterMaxZoom,
        'clusterRadius' => $clusterRadius,
        'clusterMinPoints' => $clusterMinPoints,
        'clusterColor' => $clusterColor,
        'clusterTextColor' => $clusterTextColor,
        'clusterSizeStops' => $clusterSizeStops,
        'pointColor' => $pointColor,
        'pointRadius' => $pointRadius,
        'showCount' => $showCount,
        'popupProperty' => $popupProperty,
        'popupTemplate' => $popupTemplate,
        'clickZoom' => $clickZoom,
        'buffer' => $buffer,
        'tolerance' => $tolerance,
    ]) }}"
    @if(count($geoJsonData['features'] ?? [])> $maxFeaturesToInline)
    x-init="$el._clusterData = {{ json_encode($geoJsonData) }}"
    @else
    data-cluster-data="{{ json_encode($geoJsonData) }}"
    @endif
    class="{{ $class }}">
    @if(isset($popup))
    <template x-ref="clusterPopup">{{ $popup }}</template>
    @endif
</div>
