<?php

namespace Kwasii\LivewireMapcn\Commands;

use Illuminate\Console\Command;

class LivewireMapcnCommand extends Command
{
    public $signature = 'livewire-mapcn';

    public $description = 'My command';

    public function handle(): int
    {
        $this->comment('All done');

        return self::SUCCESS;
    }
}
