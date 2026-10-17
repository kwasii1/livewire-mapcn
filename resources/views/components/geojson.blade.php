<div x-map-geojson data-lm-config="{{ $config }}" hidden {{ $attributes }}>
    @if($json !== null)
    <script type="application/json" data-lm-json="data">{!! $json !!}</script>
    @endif
    @isset($tooltip)
    <template data-lm-slot="tooltip">{{ $tooltip }}</template>
    @endisset
    @isset($popup)
    <template data-lm-slot="popup"><div class="lm-popup">{{ $popup }}</div></template>
    @endisset
</div>
