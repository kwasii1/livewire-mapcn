<template x-ref="markerLabel">
    <div class="absolute whitespace-nowrap text-sm font-medium text-gray-800 bg-white/80 px-1.5 py-0.5 rounded shadow-sm pointer-events-none
        @if($position === 'bottom') top-full left-1/2 -translate-x-1/2 mt-1
        @elseif($position === 'top') bottom-full left-1/2 -translate-x-1/2 mb-1
        @elseif($position === 'left') right-full top-1/2 -translate-y-1/2 mr-1
        @elseif($position === 'right') left-full top-1/2 -translate-y-1/2 ml-1
        @endif
        {{ $class }}">
        {{ $text }}
    </div>
</template>
