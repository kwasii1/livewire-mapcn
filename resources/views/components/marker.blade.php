<div {{ $directive }} data-lm-config="{{ $config }}" hidden {{ $attributes->merge(['class' => $class]) }}>
    {{ $slot }}

    @unless(str_contains($slot->toHtml(), 'x-ref="markerContent"'))
    <template x-ref="markerContent">
        <div class="lm-marker-dot" style="background-color: {{ $color }};"></div>
    </template>
    @endunless
</div>
