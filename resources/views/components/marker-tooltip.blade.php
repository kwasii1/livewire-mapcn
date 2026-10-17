<template x-ref="markerTooltip">
    <div class="lm-tooltip {{ $class }}">{{ $text ?? $slot }}</div>
</template>
<div data-lm-marker-tooltip data-lm-config="{{ $config }}" hidden></div>
