<?php

namespace Kwasii\LivewireMapcn;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Route;
use Kwasii\LivewireMapcn\Commands\LivewireMapcnCommand;
use Kwasii\LivewireMapcn\Components\Map;
use Kwasii\LivewireMapcn\Components\MapClusterLayer;
use Kwasii\LivewireMapcn\Components\MapControls;
use Kwasii\LivewireMapcn\Components\MapMarker;
use Kwasii\LivewireMapcn\Components\MapPopup;
use Kwasii\LivewireMapcn\Components\MapRoute;
use Kwasii\LivewireMapcn\Components\MarkerContent;
use Kwasii\LivewireMapcn\Components\MarkerLabel;
use Kwasii\LivewireMapcn\Components\MarkerPopup;
use Kwasii\LivewireMapcn\Components\MarkerTooltip;
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
            ->hasCommand(LivewireMapcnCommand::class);
    }

    public function packageBooted(): void
    {
        Blade::component('map', Map::class);
        Blade::component('map-controls', MapControls::class);
        Blade::component('map-marker', MapMarker::class);
        Blade::component('marker-content', MarkerContent::class);
        Blade::component('marker-label', MarkerLabel::class);
        Blade::component('marker-popup', MarkerPopup::class);
        Blade::component('marker-tooltip', MarkerTooltip::class);
        Blade::component('map-popup', MapPopup::class);
        Blade::component('map-route', MapRoute::class);
        Blade::component('map-cluster-layer', MapClusterLayer::class);

        Blade::directive('livewireMapScripts', function () {
            return "<?php echo view('livewire-mapcn::scripts')->render(); ?>";
        });

        Blade::directive('livewireMapStyles', function () {
            return "<?php echo view('livewire-mapcn::styles')->render(); ?>";
        });

        $this->publishes([
            __DIR__.'/../resources/js' => public_path('vendor/livewire-mapcn'),
            __DIR__.'/../resources/css' => public_path('vendor/livewire-mapcn'),
        ], 'livewire-mapcn-assets');

        $this->registerAssetRoutes();
    }

    protected function registerAssetRoutes(): void
    {
        Route::get('/livewire-mapcn/livewire-mapcn.js', function () {
            return response(
                file_get_contents(__DIR__.'/../resources/js/livewire-mapcn.js'),
                200,
                ['Content-Type' => 'application/javascript']
            );
        })->name('livewire-mapcn.js');

        Route::get('/livewire-mapcn/livewire-mapcn.css', function () {
            return response(
                file_get_contents(__DIR__.'/../resources/css/livewire-mapcn.css'),
                200,
                ['Content-Type' => 'text/css']
            );
        })->name('livewire-mapcn.css');
    }
}
