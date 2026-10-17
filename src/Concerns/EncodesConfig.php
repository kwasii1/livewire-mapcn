<?php

namespace Kwasii\LivewireMapcn\Concerns;

trait EncodesConfig
{
    /**
     * JSON for a data-lm-config attribute. Blade's {{ }} escaping makes it
     * safe inside an HTML attribute, so values may contain quotes.
     *
     * @param  array<string, mixed>  $config
     */
    public static function encodeConfig(array $config): string
    {
        // Bad data (invalid UTF-8, NaN) degrades to a substituted value
        // instead of failing the whole page render.
        return (string) json_encode($config, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    /**
     * JSON for a <script type="application/json"> block. Tags and ampersands
     * are hex-escaped so the payload can never close the script element.
     */
    public static function encodeScriptJson(mixed $data): string
    {
        return (string) json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }
}
