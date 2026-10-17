<div
    wire:ignore
    x-data
    x-map-route-list
    data-lm-config="{{ $config }}"
    style="display: none;"
    {{ $attributes->merge(['class' => 'lm-route-list lm-route-list--'.$position]) }}>
    <div class="lm-route-list-panel {{ $width }} {{ $containerClass }}">
        <div class="lm-route-list-header {{ $headerClass }}">
            <h3 x-text="_rl.title"></h3>
        </div>
        <div class="lm-route-list-items" role="listbox" :aria-label="_rl.title">
            <template x-for="(route, index) in _rl.routes" :key="index">
                <button
                    type="button"
                    role="option"
                    :aria-selected="_rl.selectedIndex === index"
                    @click="_rl.selectRoute(index)"
                    :class="{ 'lm-selected': _rl.selectedIndex === index }"
                    class="lm-route-list-item {{ $itemClass }}">
                    <span class="lm-route-list-badge" x-text="String.fromCharCode(65 + index)"></span>
                    <span class="lm-route-list-meta">
                        <span x-show="_rl.showDuration" class="lm-route-list-duration" x-text="_rl.formatDuration(route.duration)"></span>
                        <span x-show="_rl.showDistance" class="lm-route-list-distance" x-text="_rl.formatDistance(route.distance)"></span>
                    </span>
                    <span class="lm-route-list-tags">
                        <span x-show="_rl.showFastestBadge && index === _rl.fastestIndex" class="lm-route-list-fastest">Fastest</span>
                        <span x-show="_rl.showTimeDiff && _rl.timeDiff(index)" class="lm-route-list-diff" x-text="_rl.timeDiff(index)"></span>
                    </span>
                </button>
            </template>
        </div>
    </div>
</div>
