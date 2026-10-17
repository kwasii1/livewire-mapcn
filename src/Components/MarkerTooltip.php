<?php

namespace Kwasii\LivewireMapcn\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;
use Kwasii\LivewireMapcn\Concerns\EncodesConfig;

class MarkerTooltip extends Component
{
    use EncodesConfig;

    /**
     * @param  string|null  $text  Plain text; omit it to use the slot for rich content
     * @param  int|array<int, int>|null  $offset  null uses a 16px offset above the marker
     */
    public function __construct(
        public ?string $text = null,
        public ?string $anchor = null,
        public int|array|null $offset = null,
        public string $class = '',
    ) {}

    public function render(): View
    {
        return view('livewire-mapcn::components.marker-tooltip', [
            'config' => static::encodeConfig([
                'anchor' => $this->anchor,
                'offset' => $this->offset,
            ]),
        ]);
    }
}
