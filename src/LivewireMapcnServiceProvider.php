<?php

namespace Kwasii\LivewireMapcn;

use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;
use Kwasii\LivewireMapcn\Commands\LivewireMapcnCommand;

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
