<template x-ref="markerTooltip">
    <div class="px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg {{ $class }}">
        {{ $text }}
    </div>
</template>
<div x-data x-map-marker-tooltip="{
    text: '{{ $text }}',
    anchor: '{{ $anchor }}',
    offset: {{ json_encode($offset) }}
}"></div>
