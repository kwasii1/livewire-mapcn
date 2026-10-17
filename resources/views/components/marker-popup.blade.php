<template x-ref="markerPopup">
    <div class="lm-popup {{ $class }}">
        {{ $slot }}
    </div>
</template>
<div data-lm-marker-popup data-lm-config="{{ $config }}" hidden></div>
