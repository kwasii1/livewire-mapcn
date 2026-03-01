<?php

use Illuminate\Support\Facades\Blade;

it('can render the map component', function () {
    $view = Blade::render('<x-map />');

    expect($view)->toContain('x-map');
    expect($view)->toContain('https:\/\/basemaps.cartocdn.com\/gl\/positron-gl-style\/style.json');
});
