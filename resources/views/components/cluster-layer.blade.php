<div x-map-cluster-layer data-cluster-id="{{ $id }}" data-lm-config="{{ $config }}" hidden {{ $attributes->merge(['class' => $class]) }}>
    @if($json !== null)
    <script type="application/json" data-lm-json="data">{!! $json !!}</script>
    @endif
    @isset($popup)
    <template x-ref="clusterPopup"><div class="lm-popup">{{ $popup }}</div></template>
    @endisset
</div>
