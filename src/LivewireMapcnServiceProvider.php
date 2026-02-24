<?php

namespace Kwasii\LivewireMapcn;

use Kwasii\LivewireMapcn\Commands\LivewireMapcnCommand;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class LivewireMapcnServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        /*
         * This class is a Package Service Provider
         *
         * More info: https://github.com/spatie/laravel-package-tools
         */
        $package
            ->name('livewire-mapcn')
            ->hasConfigFile()
            ->hasViews()
            ->hasMigration('create_livewire_mapcn_table')
            ->hasCommand(LivewireMapcnCommand::class);
    }
}
