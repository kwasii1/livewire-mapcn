<div
    x-data
    x-map-controls="{
        zoom: {{ $zoom ? 'true' : 'false' }},
        compass: {{ $compass ? 'true' : 'false' }},
        locate: {{ $locate ? 'true' : 'false' }},
        fullscreen: {{ $fullscreen ? 'true' : 'false' }},
        scale: {{ $scale ? 'true' : 'false' }},
        position: '{{ $position }}'
    }"
    class="{{ $class }}"></div>
