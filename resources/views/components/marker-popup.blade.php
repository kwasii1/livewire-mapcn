<template x-ref="markerPopup">
    <div class="p-2 {{ $class }}" style="max-width: {{ $maxWidth }};">
        {{ $slot }}
    </div>
</template>
<div x-data x-map-marker-popup="{
    maxWidth: '{{ $maxWidth }}',
    closeButton: {{ $closeButton ? 'true' : 'false' }},
    closeOnClickMap: {{ $closeOnClickMap ? 'true' : 'false' }},
    closeOnMove: {{ $closeOnMove ? 'true' : 'false' }},
    anchor: '{{ $anchor }}',
    offset: {{ json_encode($offset) }}
}"></div>
