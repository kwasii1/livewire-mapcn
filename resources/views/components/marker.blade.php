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
    <template x-ref="markerContent">
        @if($slot->isNotEmpty())
        {{ $slot }}
        @else
        <div class="w-4 h-4 rounded-full border-2 border-white shadow-md" style="background-color: {{ $color }};"></div>
        @endif
    </template>
</div>
