@if(config('livewire-mapcn.load_from_cdn', true))
<script src="{{ config('livewire-mapcn.cdn_url', 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.x/dist/maplibre-gl.js') }}"></script>
@endif
@if(config('livewire-mapcn.inject_assets', 'route') === 'published')
<script src="{{ asset('vendor/livewire-mapcn/livewire-mapcn.js') }}" defer></script>
@else
<script src="{{ route('livewire-mapcn.js') }}" defer></script>
@endif
