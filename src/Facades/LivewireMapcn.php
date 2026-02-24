<?php

namespace Kwasii\LivewireMapcn\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Kwasii\LivewireMapcn\LivewireMapcn
 */
class LivewireMapcn extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return \Kwasii\LivewireMapcn\LivewireMapcn::class;
    }
}
