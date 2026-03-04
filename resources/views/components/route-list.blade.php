@props([])
@php
$positionClasses = match($position) {
'top-left' => 'top-4 left-4',
'top-right' => 'top-4 right-4',
'bottom-left' => 'bottom-4 left-4',
'bottom-right' => 'bottom-4 right-4',
default => 'top-4 left-4',
};
@endphp
<div
    x-data
    x-map-route-list="{
        routeId: '{{ $routeId }}',
        mapId: '{{ $mapId }}',
        showDistance: {{ $showDistance ? 'true' : 'false' }},
        showDuration: {{ $showDuration ? 'true' : 'false' }},
        showFastestBadge: {{ $showFastestBadge ? 'true' : 'false' }},
        showTimeDiff: {{ $showTimeDiff ? 'true' : 'false' }},
        title: '{{ $title }}'
    }"
    class="absolute {{ $positionClasses }} z-10"
    style="display: none;"
    {{ $attributes }}>
    <div class="w-60 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div class="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100" x-text="_rl.title"></h3>
        </div>
        <div class="divide-y divide-zinc-100 dark:divide-zinc-700">
            <template x-for="(route, index) in _rl.routes" :key="index">
                <button
                    @click="_rl.selectRoute(index)"
                    :class="_rl.selectedIndex === index
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50 border-l-4 border-l-transparent'"
                    class="w-full px-3 py-2.5 text-left transition-colors cursor-pointer">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
                                :class="_rl.selectedIndex === index
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200'"
                                x-text="String.fromCharCode(65 + index)"></span>
                            <div>
                                <span x-show="_rl.showDistance"
                                    class="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                                    x-text="_rl.formatDistance(route.distance)"></span>
                                <span x-show="_rl.showDuration"
                                    class="text-xs text-zinc-500 dark:text-zinc-400 ml-1"
                                    x-text="_rl.formatDuration(route.duration)"></span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-0.5">
                            <span x-show="_rl.showFastestBadge && index === _rl.fastestIndex"
                                class="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
                                Fastest
                            </span>
                            <span x-show="_rl.showTimeDiff && _rl.timeDiff(index)"
                                class="text-[10px] text-zinc-400 dark:text-zinc-500"
                                x-text="_rl.timeDiff(index)"></span>
                        </div>
                    </div>
                </button>
            </template>
        </div>
    </div>
</div>
