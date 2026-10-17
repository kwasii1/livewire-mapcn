{{--
    wire:ignore.self keeps Livewire from touching the map element's own
    attributes, while child components (markers, routes, layers...) are still
    morphed so they react to state changes. The canvas container is fully
    ignored because MapLibre owns its DOM.
--}}
@php($mapId = $attributes->get('id') ?: $fallbackId)
<div
    wire:ignore.self
    x-data
    x-map
    data-lm-config="{{ $configJson($mapId) }}"
    {{-- Only a user-supplied id is rendered: Livewire keys morphs on `id`, so a
         random one would make every re-render replace (and re-create) the map. --}}
    {{ $attributes->merge([
        'class' => trim('lm-map '.$class),
        'style' => "height: {$cssHeight}; width: {$cssWidth};",
    ]) }}>
    <div wire:ignore data-lm-canvas x-ref="mapContainer" class="lm-map-canvas"></div>

    {{-- Loading state: a <x-slot:loading> replaces the default dots; :loader="false" removes it. --}}
    @if(isset($loading) && $loading->isNotEmpty())
    <div {{ $loading->attributes->merge(['class' => 'lm-loader lm-loader--custom', 'role' => 'status', 'aria-live' => 'polite']) }}>
        {{ $loading }}
    </div>
    @elseif($loader)
    <div class="lm-loader" role="status" aria-label="Loading map">
        <span class="lm-loader-dot"></span><span class="lm-loader-dot"></span><span class="lm-loader-dot"></span>
    </div>
    @endif

    {{ $slot }}
</div>
