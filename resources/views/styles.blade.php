@if(config('livewire-mapcn.load_from_cdn', true))
<link href="{{ config('livewire-mapcn.cdn_css_url', 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.x/dist/maplibre-gl.css') }}" rel="stylesheet" />
@endif
@if(config('livewire-mapcn.inject_assets', 'route') === 'published')
<link href="{{ asset('vendor/livewire-mapcn/livewire-mapcn.css') }}" rel="stylesheet" />
@else
<link href="{{ route('livewire-mapcn.css') }}" rel="stylesheet" />
@endif
