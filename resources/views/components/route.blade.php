<div
    x-data
    x-map-route="{
        id: '{{ $id }}',
        coordinates: {{ json_encode($coordinates) }},
        color: '{{ $color }}',
        width: {{ $width }},
        opacity: {{ $opacity }},
        dashArray: {{ json_encode($dashArray) }},
        lineCap: '{{ $lineCap }}',
        lineJoin: '{{ $lineJoin }}',
        activeColor: '{{ $activeColor }}',
        activeWidth: {{ $activeWidth }},
        hoverColor: {{ json_encode($hoverColor) }},
        clickable: {{ $clickable ? 'true' : 'false' }},
        withStops: {{ $withStops ? 'true' : 'false' }},
        stopColor: '{{ $stopColor }}',
        fetchDirections: {{ $fetchDirections ? 'true' : 'false' }},
        directionsProfile: '{{ $directionsProfile }}',
        directionsUrl: '{{ $directionsUrl }}',
        animate: {{ $animate ? 'true' : 'false' }},
        animateDuration: {{ $animateDuration }},
        active: {{ $active ? 'true' : 'false' }}
    }"></div>
