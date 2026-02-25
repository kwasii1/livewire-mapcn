<div
    wire:ignore
    x-data
    x-map="{
        id: '{{ $attributes->get('id', \Illuminate\Support\Str::random(8)) }}',
        center: {{ json_encode($center) }},
        zoom: {{ $zoom }},
        minZoom: {{ $minZoom }},
        maxZoom: {{ $maxZoom }},
        style: {{ json_encode($resolvedStyle) }},
        lightStyle: {{ json_encode($resolvedLightStyle) }},
        darkStyle: {{ json_encode($resolvedDarkStyle) }},
        theme: '{{ $theme }}',
        bearing: {{ $bearing }},
        pitch: {{ $pitch }},
        interactive: {{ $interactive ? 'true' : 'false' }},
        scrollZoom: {{ $scrollZoom ? 'true' : 'false' }},
        doubleClickZoom: {{ $doubleClickZoom ? 'true' : 'false' }},
        dragPan: {{ $dragPan ? 'true' : 'false' }}
    }"
    style="height: {{ $height }}; width: {{ $width }};"
    {{ $attributes->merge(['class' => 'relative overflow-hidden ' . $class]) }}>
    <div x-ref="mapContainer" class="absolute inset-0 w-full h-full"></div>

    {{ $slot }}
</div>
