<template x-ref="markerTooltip">
    <div class="lm-tooltip {{ $class }}">
        {{ $text }}
    </div>
</template>
<div x-data x-map-marker-tooltip="{
    text: '{{ $text }}',
    anchor: '{{ $anchor }}',
    offset: {{ json_encode($offset) }}
}"></div>
