<div x-map-arc data-lm-config="{{ $config }}" hidden {{ $attributes }}>
    <script type="application/json" data-lm-json="data">{!! $json !!}</script>
    @isset($tooltip)
    <template data-lm-slot="tooltip">{{ $tooltip }}</template>
    @endisset
    @isset($popup)
    <template data-lm-slot="popup"><div class="lm-popup">{{ $popup }}</div></template>
    @endisset
</div>
