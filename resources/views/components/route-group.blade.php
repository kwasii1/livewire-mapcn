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
        'fetchDirections' => $fetchDirections,
        'directionsProfile' => $directionsProfile,
        'directionsUrl' => $directionsUrl,
        'animate' => $animate,
        'animateDuration' => $animateDuration,
        'withStops' => $withStops,
        'stopColor' => $stopColor,
        'activeColor' => $activeColor,
        'activeWidth' => $activeWidth,
        'hoverColor' => $hoverColor,
        'active' => $active,
        'dashArray' => $dashArray,
    ]) }}"
    data-route-group-routes="{{ json_encode($routes) }}"></div>
