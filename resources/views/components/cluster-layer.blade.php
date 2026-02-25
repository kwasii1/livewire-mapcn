<div
    x-data
    x-map-cluster-layer="{
        id: '{{ $id }}',
        data: {{ json_encode($geoJsonData) }},
        clusterMaxZoom: {{ $clusterMaxZoom }},
        clusterRadius: {{ $clusterRadius }},
        clusterMinPoints: {{ $clusterMinPoints }},
        clusterColor: '{{ $clusterColor }}',
        clusterTextColor: '{{ $clusterTextColor }}',
        clusterSizeStops: {{ json_encode($clusterSizeStops) }},
        pointColor: '{{ $pointColor }}',
        pointRadius: {{ $pointRadius }},
        showCount: {{ $showCount ? 'true' : 'false' }},
        popupProperty: {{ json_encode($popupProperty) }},
        popupTemplate: {{ json_encode($popupTemplate) }},
        clickZoom: {{ $clickZoom ? 'true' : 'false' }}
    }"
    class="{{ $class }}"></div>
