<div x-map-popup data-lm-config="{{ $config }}" hidden {{ $attributes }}>
    <template x-ref="popupContent">
        <div class="lm-popup {{ $class }}">
            {{ $slot }}
        </div>
    </template>
</div>
