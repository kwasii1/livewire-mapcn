<?php

use Illuminate\Support\Facades\Blade;

/** Decode the data-lm-config JSON of the first element carrying $directive. */
function lmConfig(string $html, string $directive): array
{
    $dom = new DOMDocument;
    @$dom->loadHTML('<?xml encoding="utf-8"?>'.$html, LIBXML_NOERROR);
    foreach ((new DOMXPath($dom))->query('//*[@data-lm-config]') as $node) {
        if ($node->hasAttribute($directive)) {
            return json_decode($node->getAttribute('data-lm-config'), true, flags: JSON_THROW_ON_ERROR);
        }
    }

    throw new RuntimeException("No element with {$directive} found");
}

function lmJson(string $html, string $name): mixed
{
    preg_match('#<script type="application/json" data-lm-json="'.$name.'">(.*?)</script>#s', $html, $m);

    return json_decode($m[1] ?? 'null', true);
}

it('renders the map with resolved light and dark styles', function () {
    $html = Blade::render('<x-map id="main" />');
    $config = lmConfig($html, 'x-map');

    expect($html)->toContain('wire:ignore.self')
        ->and($html)->toContain('data-lm-canvas')
        ->and($html)->toContain('id="main"')
        ->and($config['id'])->toBe('main')
        ->and($config['lightStyle'])->toBe('https://basemaps.cartocdn.com/gl/positron-gl-style/style.json')
        ->and($config['darkStyle'])->toBe('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');
});

it('does not render a random dom id (livewire keys morphs on id)', function () {
    $html = Blade::render('<x-map />');

    expect($html)->not->toMatch('/<div[^>]*\sid="map-/')
        ->and(lmConfig($html, 'x-map')['id'])->toStartWith('map-');
});

it('uses an explicit style for both themes', function () {
    $config = lmConfig(Blade::render('<x-map style="https://example.com/style.json" />'), 'x-map');

    expect($config['lightStyle'])->toBe('https://example.com/style.json')
        ->and($config['darkStyle'])->toBe('https://example.com/style.json');
});

it('honours zoom 0 and explicit center', function () {
    $config = lmConfig(Blade::render('<x-map :zoom="0" :center="[1.5, 2.5]" />'), 'x-map');

    expect($config['zoom'])->toBe(0)->and($config['center'])->toBe([1.5, 2.5]);
});

it('turns height shorthands into valid css', function (mixed $height, string $css) {
    $html = Blade::render('<x-map :height="$h" />', ['h' => $height]);

    expect($html)->toContain("height: {$css};");
})->with([
    ['full', '100%'],
    [null, '100%'],
    [400, '400px'],
    ['400', '400px'],
    ['50vh', '50vh'],
]);

it('supports blank maps and globe projection', function () {
    $config = lmConfig(Blade::render('<x-map blank projection="globe" />'), 'x-map');

    expect($config['projection'])->toBe('globe')
        ->and($config['lightStyle']['layers'][0]['id'])->toBe('background');
});

it('resolves openfreemap providers', function () {
    $config = lmConfig(Blade::render('<x-map provider="openfreemap-liberty" />'), 'x-map');

    expect($config['lightStyle'])->toBe('https://tiles.openfreemap.org/styles/liberty');
});

it('safely encodes marker text containing quotes', function () {
    $html = Blade::render(<<<'BLADE'
        <x-map>
            <x-map-marker :lat="5.6" :lng="-0.2" id="o'hare">
                <x-marker-tooltip text="O'Hare <b>airport</b>" />
                <x-marker-popup><p>Hi</p></x-marker-popup>
            </x-map-marker>
        </x-map>
    BLADE);

    expect(lmConfig($html, 'x-map-marker'))->toMatchArray(['id' => "o'hare", 'lat' => 5.6, 'lng' => -0.2])
        ->and($html)->toContain('O&#039;Hare &lt;b&gt;airport&lt;/b&gt;')
        ->and($html)->toContain('data-lm-marker-popup')
        ->and($html)->toContain('data-lm-marker-tooltip');
});

it('renders route progress options and route markers', function () {
    $html = Blade::render(<<<'BLADE'
        <x-map>
            <x-map-route id="trip" :coordinates="[[0, 0], [1, 1]]" :progress="1.4" progress-color="#f00">
                <x-map-route-marker at="progress" align-to-route />
                <x-map-route-marker :at="0.25" />
            </x-map-route>
        </x-map>
    BLADE);

    $route = lmConfig($html, 'x-map-route');

    expect($route['progress'])->toBe(1.0)
        ->and($route['progressColor'])->toBe('#f00')
        ->and(substr_count($html, 'x-map-route-marker'))->toBe(2)
        ->and(lmConfig($html, 'x-map-route-marker'))->toMatchArray(['at' => 'progress', 'alignToRoute' => true]);
});

it('renders arcs with data in a json script block', function () {
    $html = Blade::render(<<<'BLADE'
        <x-map>
            <x-map-arc id="flights" :data="$arcs" :curvature="0.3" :paint="['line-color' => '#a78bfa']" :hover-paint="['line-width' => 3]">
                <x-slot:tooltip>{name}</x-slot:tooltip>
            </x-map-arc>
        </x-map>
    BLADE, ['arcs' => [['id' => 1, 'from' => [0, 0], 'to' => [10, 10], 'name' => '</script><script>alert(1)</script>']]]);

    expect(lmConfig($html, 'x-map-arc'))->toMatchArray(['id' => 'flights', 'curvature' => 0.3, 'hoverPaint' => ['line-width' => 3]])
        ->and(lmJson($html, 'data')[0]['name'])->toBe('</script><script>alert(1)</script>')
        ->and($html)->not->toContain('<script>alert(1)')
        ->and($html)->toContain('data-lm-slot="tooltip"');
});

it('renders geojson layers and supports disabling layers', function () {
    $html = Blade::render(
        '<x-map><x-map-geojson id="area" :data="$data" :fill-paint="[\'fill-color\' => \'#3b82f6\']" :line-paint="false" interactive /></x-map>',
        ['data' => ['type' => 'FeatureCollection', 'features' => []]],
    );
    $config = lmConfig($html, 'x-map-geojson');

    expect($config['fillPaint'])->toBe(['fill-color' => '#3b82f6'])
        ->and($config['linePaint'])->toBeFalse()
        ->and($config['circlePaint'])->toBeNull()
        ->and($config['interactive'])->toBeTrue()
        ->and(lmJson($html, 'data')['type'])->toBe('FeatureCollection');
});

it('accepts a geojson url', function () {
    $html = Blade::render('<x-map><x-map-geojson data="https://example.com/a.geojson" /></x-map>');

    expect(lmConfig($html, 'x-map-geojson')['url'])->toBe('https://example.com/a.geojson')
        ->and($html)->not->toContain('data-lm-json');
});

it('renders cluster data and new color options', function () {
    $html = Blade::render(
        '<x-map><x-map-cluster-layer id="c" :data="$points" :cluster-colors="[\'#3b82f6\', \'#1d4ed8\']" :cluster-thresholds="[100]" :cluster-min-points="3" /></x-map>',
        ['points' => [['lat' => 1, 'lng' => 2, 'properties' => ['name' => 'A']]]],
    );

    expect(lmConfig($html, 'x-map-cluster-layer'))->toMatchArray(['clusterMinPoints' => 3, 'clusterThresholds' => [100]])
        ->and(lmJson($html, 'data')['features'][0]['geometry']['coordinates'])->toBe([2.0, 1.0]);
});

it('renders controls with the 3D toggle', function () {
    $config = lmConfig(Blade::render('<x-map><x-map-controls three-d :three-d-pitch="45" position="bottom-right" /></x-map>'), 'x-map-controls');

    expect($config)->toMatchArray(['threeD' => true, 'threeDPitch' => 45, 'position' => 'bottom-right']);
});

it('renders custom controls', function () {
    $html = Blade::render('<x-map><x-map-control position="bottom-left"><button>Hi</button></x-map-control></x-map>');

    expect($html)->toContain('lm-control lm-control--bottom-left lm-control-group')->and($html)->toContain('<button>Hi</button>');
});

it('renders route groups and route lists', function () {
    $html = Blade::render(<<<'BLADE'
        <x-map>
            <x-map-route-group id="g" :routes="[['id' => 'a', 'coordinates' => [[0, 0], [1, 1]]]]" selected-route="0" />
            <x-map-route-list route-id="r1" title="Pick one" />
        </x-map>
    BLADE);

    expect(lmConfig($html, 'x-map-route-group')['selectedRoute'])->toBe(0)
        ->and(lmJson($html, 'routes')[0]['id'])->toBe('a')
        ->and(lmConfig($html, 'x-map-route-list'))->toMatchArray(['routeId' => 'r1', 'title' => 'Pick one']);
});

it('uses the configured cluster popup view', function () {
    view()->addLocation(__DIR__.'/views');
    config()->set('livewire-mapcn.cluster_popup_view', 'cluster-popup');

    $html = Blade::render('<x-map><x-map-cluster-layer :data="[]" /></x-map>');

    expect(lmConfig($html, 'x-map-cluster-layer')['popupTemplate'])->toContain('<strong>{name}</strong>');
});

it('passes wire:key through to child components', function () {
    $html = Blade::render(<<<'BLADE'
        <x-map>
            <x-map-marker wire:key="m-1" :lat="1" :lng="2" />
            <x-map-route wire:key="r-1" :coordinates="[[0, 0], [1, 1]]" />
            <x-map-arc wire:key="a-1" :data="[]" />
            <x-map-geojson wire:key="g-1" :data="[]" />
        </x-map>
    BLADE);

    foreach (['m-1', 'r-1', 'a-1', 'g-1'] as $key) {
        expect($html)->toContain('wire:key="'.$key.'"');
    }
});

it('does not fail the render on invalid utf-8 data', function () {
    $html = Blade::render('<x-map><x-map-arc :data="$d" /></x-map>', ['d' => [['id' => 1, 'from' => [0, 0], 'to' => [1, 1], 'name' => "bad \xB1 byte"]]]);

    expect(lmJson($html, 'data')[0]['name'])->toContain('bad');
});

it('passes a client-side progress model to the route', function () {
    $html = Blade::render('<x-map><x-map-route :coordinates="[[0, 0], [1, 1]]" progress-model="progress" :progress-duration="300" /></x-map>');

    expect(lmConfig($html, 'x-map-route'))->toMatchArray(['progressModel' => 'progress', 'progress' => null, 'progressDuration' => 300]);
});

it('makes maps lazy by default and allows opting out', function () {
    expect(lmConfig(Blade::render('<x-map />'), 'x-map')['lazy'])->toBeTrue()
        ->and(lmConfig(Blade::render('<x-map :lazy="false" />'), 'x-map')['lazy'])->toBeFalse();

    config()->set('livewire-mapcn.lazy', false);
    expect(lmConfig(Blade::render('<x-map />'), 'x-map')['lazy'])->toBeFalse();
});

it('renders the default loader, a custom loading slot, or nothing', function () {
    expect(Blade::render('<x-map />'))->toContain('lm-loader-dot');

    $custom = Blade::render('<x-map><x-slot:loading class="my-loader">Fetching tiles…</x-slot:loading></x-map>');
    expect($custom)->toContain('lm-loader lm-loader--custom my-loader')
        ->and($custom)->toContain('Fetching tiles…')
        ->and($custom)->not->toContain('lm-loader-dot');

    expect(Blade::render('<x-map :loader="false" />'))->not->toContain('lm-loader');

    config()->set('livewire-mapcn.loader', false);
    expect(Blade::render('<x-map />'))->not->toContain('lm-loader')
        ->and(Blade::render('<x-map :loader="true" />'))->toContain('lm-loader-dot');
});
