<div
    x-data
    x-map-route-group
    data-route-group-config="{{ json_encode([
        'id' => $id,
        'selectedRoute' => $selectedRoute,
        'fitBounds' => $fitBounds,
        'alternativeColor' => $alternativeColor,
        'alternativeOpacity' => $alternativeOpacity,
        'alternativeWidth' => $alternativeWidth,
        'lineCap' => $lineCap,
        'lineJoin' => $lineJoin,
        'clickable' => $clickable,
    ]) }}"
    data-route-group-routes="{{ json_encode($routes) }}"></div>
