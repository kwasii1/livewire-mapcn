<div
    x-data
    x-map-marker="{
        id: '{{ $id }}',
        lat: {{ $lat }},
        lng: {{ $lng }},
        draggable: {{ $draggable ? 'true' : 'false' }},
        color: '{{ $color }}',
        anchor: '{{ $anchor }}',
        offset: {{ json_encode($offset) }},
        rotation: {{ $rotation }},
        rotationAlignment: '{{ $rotationAlignment }}',
        pitchAlignment: '{{ $pitchAlignment }}'
    }"
    class="hidden {{ $class }}">
    {{ $slot }}

    @if(!str_contains($slot->toHtml(), 'x-ref="markerContent"'))
    <template x-ref="markerContent">
        <div class="w-4 h-4 rounded-full border-2 border-white shadow-md" style="background-color: {{ $color }};"></div>
    </template>
    @endif
</div>
