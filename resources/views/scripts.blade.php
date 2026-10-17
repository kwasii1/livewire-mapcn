@php($maplibre = \Kwasii\LivewireMapcn\Support\Assets::maplibreScript())
@if(config('livewire-mapcn.load_from_cdn', true))
@if($maplibre['module'])
{{-- MapLibre v6+ is ESM-only: import it and expose it as window.maplibregl. --}}
<script type="module" data-navigate-once>
    import * as maplibregl from {!! json_encode($maplibre['url'], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!};
    window.maplibregl = maplibregl;
    window.dispatchEvent(new CustomEvent('maplibre:ready'));
</script>
@else
<script src="{{ $maplibre['url'] }}" crossorigin data-navigate-once></script>
@endif
@endif
<script src="{{ \Kwasii\LivewireMapcn\Support\Assets::url(\Kwasii\LivewireMapcn\Support\Assets::JS) }}" defer data-navigate-once></script>
