<div {{ $attributes->merge(['class' => trim('lm-control lm-control--'.$position.($group ? ' lm-control-group' : '').' '.$class)]) }}>
    {{ $slot }}
</div>
