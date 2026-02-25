<div
    x-data
    x-map-popup="{
        id: '{{ $id }}',
        lat: {{ $lat }},
        lng: {{ $lng }},
        open: {{ $open ? 'true' : 'false' }},
        maxWidth: '{{ $maxWidth }}',
        closeButton: {{ $closeButton ? 'true' : 'false' }},
        closeOnClickMap: {{ $closeOnClickMap ? 'true' : 'false' }},
        closeOnMove: {{ $closeOnMove ? 'true' : 'false' }},
        anchor: '{{ $anchor }}',
        offset: {{ json_encode($offset) }}
    }"
    class="hidden {{ $class }}">
    <template x-ref="popupContent">
        <div class="p-2 {{ $class }}" style="max-width: {{ $maxWidth }};">
            {{ $slot }}
        </div>
    </template>
</div>
