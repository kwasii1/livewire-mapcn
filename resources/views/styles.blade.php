@php($maplibre = \Kwasii\LivewireMapcn\Support\Assets::maplibreScript())
@if(config('livewire-mapcn.load_from_cdn', true))
<link rel="preconnect" href="{{ \Kwasii\LivewireMapcn\Support\Assets::origin($maplibre['url']) }}" crossorigin>
@if($maplibre['module'])
{{-- Start downloading MapLibre from <head>, long before the script tag at the end of <body> runs. --}}
<link rel="modulepreload" href="{{ $maplibre['url'] }}" crossorigin>
@else
<link rel="preload" href="{{ $maplibre['url'] }}" as="script" crossorigin>
@endif
<link href="{{ \Kwasii\LivewireMapcn\Support\Assets::maplibreStylesheet() }}" rel="stylesheet" />
@endif
@foreach(config('livewire-mapcn.preconnect', []) as $origin)
<link rel="preconnect" href="{{ $origin }}" crossorigin>
@endforeach
<link href="{{ \Kwasii\LivewireMapcn\Support\Assets::url(\Kwasii\LivewireMapcn\Support\Assets::CSS) }}" rel="stylesheet" />
