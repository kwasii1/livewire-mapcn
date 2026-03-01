(function () {
    "use strict";

    function dispatchToLivewire(el, event, detail) {
        // Always dispatch DOM event so Alpine.js can listen with @event
        el.dispatchEvent(
            new CustomEvent(event, {
                detail,
                bubbles: true,
                composed: true,
            }),
        );

        // Also dispatch to Livewire's global event bus if available
        if (window.Livewire) {
            const version = window.Livewire.version || "";
            if (version.startsWith("2") || version.startsWith("1")) {
                window.Livewire.emit(event, detail);
            } else {
                window.Livewire.dispatch(event, detail);
            }
        }
    }

    // Debounce helper: delays execution until calls stop for `delay` ms
    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Throttle helper: executes at most once every `limit` ms
    function throttle(fn, limit) {
        let inThrottle = false;
        let lastArgs = null;
        return function (...args) {
            lastArgs = args;
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                    if (lastArgs) {
                        fn.apply(this, lastArgs);
                        lastArgs = null;
                    }
                }, limit);
            }
        };
    }

    function waitForMapLoad(map, callback) {
        if (map.isStyleLoaded()) {
            callback();
        } else {
            map.once("load", callback);
        }
    }

    /**
     * Build styled HTML for a cluster point popup.
     * Shows the primary property as a title, and any remaining
     * properties as label/value rows underneath.
     */
    function buildClusterPopupHTML(properties, primaryProp) {
        // Filter out internal MapLibre/cluster properties
        const skipKeys = new Set([
            "cluster",
            "cluster_id",
            "point_count",
            "point_count_abbreviated",
        ]);

        const title = properties[primaryProp] || "";
        const escHTML = (str) =>
            String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");
        const formatLabel = (key) =>
            key
                .replace(/([A-Z])/g, " $1")
                .replace(/[_-]/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
                .trim();

        let rows = "";
        for (const [key, value] of Object.entries(properties)) {
            if (
                key === primaryProp ||
                skipKeys.has(key) ||
                value == null ||
                value === ""
            )
                continue;
            rows +=
                `<div class="lm-popup-row">` +
                `<span class="lm-popup-label">${escHTML(formatLabel(key))}</span>` +
                `<span class="lm-popup-value">${escHTML(value)}</span>` +
                `</div>`;
        }

        return (
            `<div class="lm-cluster-popup">` +
            (title
                ? `<div class="lm-popup-title">${escHTML(title)}</div>`
                : "") +
            (rows ? `<div class="lm-popup-body">${rows}</div>` : "") +
            `</div>`
        );
    }

    /**
     * Interpolate a user-supplied HTML template string.
     * Replaces {propertyName} placeholders with actual feature property values.
     * Supports {lat} and {lng} as special tokens for the point coordinates.
     */
    function interpolatePopupTemplate(template, properties, coordinates) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            if (key === "lat") return coordinates[1];
            if (key === "lng") return coordinates[0];
            if (properties[key] != null) return properties[key];
            return "";
        });
    }

    function waitForMap(mapId, callback, maxRetries = 100) {
        let retries = 0;
        const check = () => {
            const map = Alpine.store("livewire-mapcn").maps[mapId];
            if (map) {
                callback(map);
            } else if (retries < maxRetries) {
                retries++;
                setTimeout(check, 50);
            } else {
                console.warn("Livewire Map: Timed out waiting for map", mapId);
            }
        };
        check();
    }

    function LivewireMapPlugin(Alpine) {
        Alpine.store("livewire-mapcn", {
            maps: {},
        });

        Alpine.directive("map", (el, { expression }, { evaluate }) => {
            if (!el.hasAttribute("wire:ignore")) {
                console.error(
                    "Livewire Map: <x-map> container must have wire:ignore attribute.",
                );
            }

            const config = evaluate(expression);
            const mapId = config.id;

            Alpine.store("livewire-mapcn").maps[mapId] = null;

            let currentStyle = config.style;
            if (config.theme === "auto") {
                currentStyle = document.documentElement.classList.contains(
                    "dark",
                )
                    ? config.darkStyle
                    : config.lightStyle;
            } else if (config.theme === "dark") {
                currentStyle = config.darkStyle;
            } else {
                currentStyle = config.lightStyle;
            }

            const map = new maplibregl.Map({
                container: el.querySelector('[x-ref="mapContainer"]') || el,
                style: currentStyle,
                center: config.center,
                zoom: config.zoom,
                minZoom: config.minZoom,
                maxZoom: config.maxZoom,
                bearing: config.bearing,
                pitch: config.pitch,
                interactive: config.interactive,
                scrollZoom: config.scrollZoom,
                doubleClickZoom: config.doubleClickZoom,
                dragPan: config.dragPan,
            });

            Alpine.store("livewire-mapcn").maps[mapId] = map;

            map.on("load", () => {
                dispatchToLivewire(el, "map:loaded", {
                    center: map.getCenter(),
                    zoom: map.getZoom(),
                });
            });

            map.on("click", (e) => {
                dispatchToLivewire(el, "map:click", {
                    lat: e.lngLat.lat,
                    lng: e.lngLat.lng,
                    lngLat: e.lngLat,
                    point: e.point,
                });
            });

            map.on("dblclick", (e) => {
                dispatchToLivewire(el, "map:double-click", {
                    lat: e.lngLat.lat,
                    lng: e.lngLat.lng,
                });
            });

            map.on("contextmenu", (e) => {
                dispatchToLivewire(el, "map:right-click", {
                    lat: e.lngLat.lat,
                    lng: e.lngLat.lng,
                });
            });

            // Throttle continuous events to prevent frame drops
            const throttledZoom = throttle(() => {
                dispatchToLivewire(el, "map:zoom", {
                    zoom: map.getZoom(),
                });
            }, 100);
            map.on("zoom", throttledZoom);

            map.on("zoomend", () => {
                dispatchToLivewire(el, "map:zoom-changed", {
                    zoom: map.getZoom(),
                });
            });

            const throttledMove = throttle(() => {
                dispatchToLivewire(el, "map:move", {
                    lat: map.getCenter().lat,
                    lng: map.getCenter().lng,
                });
            }, 100);
            map.on("move", throttledMove);

            map.on("moveend", () => {
                dispatchToLivewire(el, "map:center-changed", {
                    lat: map.getCenter().lat,
                    lng: map.getCenter().lng,
                });

                const bounds = map.getBounds();
                dispatchToLivewire(el, "map:bounds-changed", {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                });
            });

            map.on("dragend", () => {
                dispatchToLivewire(el, "map:drag-end", {
                    lat: map.getCenter().lat,
                    lng: map.getCenter().lng,
                    zoom: map.getZoom(),
                });
            });

            const throttledRotate = throttle(() => {
                dispatchToLivewire(el, "map:bearing-changed", {
                    bearing: map.getBearing(),
                });
            }, 100);
            map.on("rotate", throttledRotate);

            const throttledPitch = throttle(() => {
                dispatchToLivewire(el, "map:pitch-changed", {
                    pitch: map.getPitch(),
                });
            }, 100);
            map.on("pitch", throttledPitch);

            map.on("styledata", () => {
                dispatchToLivewire(el, "map:style-loaded", {
                    style: map.getStyle(),
                });
            });

            // Theme switching
            if (config.theme === "auto") {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.attributeName === "class") {
                            const isDark =
                                document.documentElement.classList.contains(
                                    "dark",
                                );
                            map.setStyle(
                                isDark ? config.darkStyle : config.lightStyle,
                            );
                        }
                    });
                });
                observer.observe(document.documentElement, {
                    attributes: true,
                });

                el._themeObserver = observer;
            }

            // Resize observer
            const resizeObserver = new ResizeObserver(() => {
                map.resize();
            });
            resizeObserver.observe(el);
            el._resizeObserver = resizeObserver;

            // Livewire event listeners
            if (window.Livewire) {
                window.Livewire.on("map:fly-to", (data) => {
                    map.flyTo(data[0] || data);
                });
                window.Livewire.on("map:jump-to", (data) => {
                    map.jumpTo(data[0] || data);
                });
                window.Livewire.on("map:fit-bounds", (data) => {
                    const payload = data[0] || data;
                    map.fitBounds(
                        payload.bounds,
                        payload.padding
                            ? { padding: payload.padding }
                            : undefined,
                    );
                });
                window.Livewire.on("map:set-zoom", (data) => {
                    map.setZoom((data[0] || data).zoom);
                });
                window.Livewire.on("map:set-bearing", (data) => {
                    map.setBearing((data[0] || data).bearing);
                });
                window.Livewire.on("map:set-pitch", (data) => {
                    map.setPitch((data[0] || data).pitch);
                });
                window.Livewire.on("map:set-style", (data) => {
                    map.setStyle((data[0] || data).style);
                });
                window.Livewire.on("map:resize", () => {
                    map.resize();
                });
                window.Livewire.on("map:force-animate", (data) => {
                    const payload = data[0] || data;
                    const routeId = payload.id;
                    // Trigger animation for routeId
                    // This is a placeholder for the actual animation logic
                });
            }

            // Cleanup
            el.addEventListener("livewire:navigating", () => {
                if (el._themeObserver) el._themeObserver.disconnect();
                if (el._resizeObserver) el._resizeObserver.disconnect();
                map.remove();
                delete Alpine.store("livewire-mapcn").maps[mapId];
            });
        });

        Alpine.directive("map-controls", (el, { expression }, { evaluate }) => {
            const config = evaluate(expression);
            const mapEl = el.closest("[x-map]");
            if (!mapEl) return;

            const mapConfig = evaluate(mapEl.getAttribute("x-map"));
            const mapId = mapConfig.id;

            const initControls = () => {
                const map = Alpine.store("livewire-mapcn").maps[mapId];
                if (!map) return;

                if (config.zoom || config.compass) {
                    map.addControl(
                        new maplibregl.NavigationControl({
                            showCompass: config.compass,
                            showZoom: config.zoom,
                        }),
                        config.position,
                    );
                }

                if (config.locate) {
                    const geolocate = new maplibregl.GeolocateControl({
                        positionOptions: { enableHighAccuracy: true },
                        trackUserLocation: true,
                    });
                    map.addControl(geolocate, config.position);

                    geolocate.on("geolocate", (e) => {
                        dispatchToLivewire(mapEl, "map:locate-success", {
                            lat: e.coords.latitude,
                            lng: e.coords.longitude,
                            accuracy: e.coords.accuracy,
                        });
                    });

                    geolocate.on("error", (e) => {
                        dispatchToLivewire(mapEl, "map:locate-error", {
                            code: e.code,
                            message: e.message,
                        });
                    });
                }

                if (config.fullscreen) {
                    map.addControl(
                        new maplibregl.FullscreenControl(),
                        config.position,
                    );
                }

                if (config.scale) {
                    map.addControl(
                        new maplibregl.ScaleControl(),
                        config.position,
                    );
                }
            };

            waitForMap(mapId, initControls);
        });

        Alpine.directive("map-marker", (el, { expression }, { evaluate }) => {
            const config = evaluate(expression);
            const mapEl = el.closest("[x-map]");
            if (!mapEl) return;

            const mapConfig = evaluate(mapEl.getAttribute("x-map"));
            const mapId = mapConfig.id;

            const initMarker = () => {
                const map = Alpine.store("livewire-mapcn").maps[mapId];
                if (!map) return;

                const contentTemplate = el.querySelector(
                    '[x-ref="markerContent"]',
                );
                let markerEl = null;

                if (contentTemplate) {
                    markerEl = document.createElement("div");
                    markerEl.innerHTML = contentTemplate.innerHTML;
                    markerEl = markerEl.firstElementChild || markerEl;
                }

                const marker = new maplibregl.Marker({
                    element: markerEl,
                    color: config.color,
                    draggable: config.draggable,
                    anchor: config.anchor,
                    offset: config.offset,
                    rotation: config.rotation,
                    rotationAlignment: config.rotationAlignment,
                    pitchAlignment: config.pitchAlignment,
                })
                    .setLngLat([config.lng, config.lat])
                    .addTo(map);

                el._marker = marker;

                // Label
                const labelTemplate = el.querySelector('[x-ref="markerLabel"]');
                if (labelTemplate && marker.getElement()) {
                    const labelEl = document.createElement("div");
                    labelEl.innerHTML = labelTemplate.innerHTML;
                    marker
                        .getElement()
                        .appendChild(labelEl.firstElementChild || labelEl);
                }

                // Popup
                const popupConfigEl = el.querySelector("[x-map-marker-popup]");
                if (popupConfigEl) {
                    const popupConfig = evaluate(
                        popupConfigEl.getAttribute("x-map-marker-popup"),
                    );
                    const popupTemplate = el.querySelector(
                        '[x-ref="markerPopup"]',
                    );

                    if (popupTemplate) {
                        const popup = new maplibregl.Popup({
                            maxWidth: popupConfig.maxWidth,
                            closeButton: popupConfig.closeButton !== false,
                            closeOnClick: popupConfig.closeOnClickMap,
                            closeOnMove: popupConfig.closeOnMove,
                            anchor: popupConfig.anchor,
                            offset: popupConfig.offset,
                        }).setHTML(popupTemplate.innerHTML);

                        marker.setPopup(popup);

                        popup.on("open", () => {
                            dispatchToLivewire(mapEl, "map:marker-popup-open", {
                                id: config.id,
                            });
                        });
                        popup.on("close", () => {
                            dispatchToLivewire(
                                mapEl,
                                "map:marker-popup-close",
                                {
                                    id: config.id,
                                },
                            );
                        });
                    }
                }

                // Tooltip
                const tooltipConfigEl = el.querySelector(
                    "[x-map-marker-tooltip]",
                );
                if (tooltipConfigEl && marker.getElement()) {
                    const tooltipConfig = evaluate(
                        tooltipConfigEl.getAttribute("x-map-marker-tooltip"),
                    );
                    const tooltipTemplate = el.querySelector(
                        '[x-ref="markerTooltip"]',
                    );

                    if (tooltipTemplate) {
                        const tooltip = new maplibregl.Popup({
                            closeButton: false,
                            closeOnClick: false,
                            className: "lm-tooltip-popup",
                            anchor: tooltipConfig.anchor,
                            offset: tooltipConfig.offset,
                        }).setHTML(tooltipTemplate.innerHTML);

                        marker
                            .getElement()
                            .addEventListener("mouseenter", () => {
                                tooltip
                                    .setLngLat(marker.getLngLat())
                                    .addTo(map);
                                dispatchToLivewire(
                                    mapEl,
                                    "map:marker-mouseenter",
                                    {
                                        id: config.id,
                                        lat: marker.getLngLat().lat,
                                        lng: marker.getLngLat().lng,
                                    },
                                );
                            });

                        marker
                            .getElement()
                            .addEventListener("mouseleave", () => {
                                tooltip.remove();
                                dispatchToLivewire(
                                    mapEl,
                                    "map:marker-mouseleave",
                                    {
                                        id: config.id,
                                    },
                                );
                            });
                    }
                }

                // Events
                if (marker.getElement()) {
                    marker.getElement().addEventListener("click", () => {
                        dispatchToLivewire(mapEl, "map:marker-clicked", {
                            id: config.id,
                            lat: marker.getLngLat().lat,
                            lng: marker.getLngLat().lng,
                        });
                    });
                }

                marker.on("dragstart", () => {
                    dispatchToLivewire(mapEl, "map:marker-drag-start", {
                        id: config.id,
                        lat: marker.getLngLat().lat,
                        lng: marker.getLngLat().lng,
                    });
                });

                marker.on("drag", () => {
                    dispatchToLivewire(mapEl, "map:marker-drag", {
                        id: config.id,
                        lat: marker.getLngLat().lat,
                        lng: marker.getLngLat().lng,
                    });
                });

                marker.on("dragend", () => {
                    dispatchToLivewire(mapEl, "map:marker-drag-end", {
                        id: config.id,
                        lat: marker.getLngLat().lat,
                        lng: marker.getLngLat().lng,
                    });
                });

                // Watch for prop changes
                Alpine.effect(() => {
                    const newConfig = evaluate(expression);
                    marker.setLngLat([newConfig.lng, newConfig.lat]);
                });
            };

            waitForMap(mapId, initMarker);

            el.addEventListener("livewire:navigating", () => {
                if (el._marker) el._marker.remove();
            });
        });

        Alpine.directive(
            "map-popup",
            (el, { expression }, { evaluate, cleanup }) => {
                const config = evaluate(expression);
                const mapEl = el.closest("[x-map]");
                if (!mapEl) return;

                const mapConfig = evaluate(mapEl.getAttribute("x-map"));
                const mapId = mapConfig.id;

                const initPopup = () => {
                    const map = Alpine.store("livewire-mapcn").maps[mapId];
                    if (!map) return;

                    const contentTemplate = el.querySelector(
                        '[x-ref="popupContent"]',
                    );
                    if (!contentTemplate) return;

                    const popup = new maplibregl.Popup({
                        maxWidth: config.maxWidth,
                        closeButton: config.closeButton,
                        closeOnClick: config.closeOnClickMap,
                        closeOnMove: config.closeOnMove,
                        anchor: config.anchor,
                        offset: config.offset,
                    })
                        .setLngLat([config.lng, config.lat])
                        .setHTML(contentTemplate.innerHTML);

                    el._popup = popup;

                    if (config.open) {
                        popup.addTo(map);
                    }

                    let lastOpenState = config.open;
                    let suppressEffect = false;

                    popup.on("open", () => {
                        lastOpenState = true;
                        dispatchToLivewire(mapEl, "map:popup-open", {
                            id: config.id,
                        });
                    });

                    popup.on("close", () => {
                        suppressEffect = true;
                        lastOpenState = false;
                        dispatchToLivewire(mapEl, "map:popup-close", {
                            id: config.id,
                        });
                    });

                    Alpine.effect(() => {
                        const newConfig = evaluate(expression);
                        popup.setLngLat([newConfig.lng, newConfig.lat]);

                        if (suppressEffect) {
                            suppressEffect = false;
                            return;
                        }

                        if (
                            typeof newConfig.open === "boolean" &&
                            newConfig.open !== lastOpenState
                        ) {
                            lastOpenState = newConfig.open;
                            if (newConfig.open && !popup.isOpen()) {
                                popup.addTo(map);
                            } else if (!newConfig.open && popup.isOpen()) {
                                popup.remove();
                            }
                        }
                    });
                };

                waitForMap(mapId, initPopup);

                cleanup(() => {
                    if (el._popup) el._popup.remove();
                });
            },
        );

        Alpine.directive("map-route", (el, { expression }, { evaluate }) => {
            const config = evaluate(expression);
            const mapEl = el.closest("[x-map]");
            if (!mapEl) return;

            const mapConfig = evaluate(mapEl.getAttribute("x-map"));
            const mapId = mapConfig.id;

            const initRoute = async () => {
                const map = Alpine.store("livewire-mapcn").maps[mapId];
                if (!map) return;

                const doInit = async () => {
                    let coordinates = config.coordinates;

                    if (config.fetchDirections && coordinates.length >= 2) {
                        try {
                            const coordsString = coordinates
                                .map((c) => `${c[0]},${c[1]}`)
                                .join(";");
                            const response = await fetch(
                                `${config.directionsUrl}/route/v1/${config.directionsProfile}/${coordsString}?geometries=geojson`,
                            );
                            const data = await response.json();

                            if (data.code === "Ok" && data.routes.length > 0) {
                                coordinates =
                                    data.routes[0].geometry.coordinates;
                                dispatchToLivewire(
                                    mapEl,
                                    "map:route-directions-ready",
                                    {
                                        id: config.id,
                                        geometry: data.routes[0].geometry,
                                        distance: data.routes[0].distance,
                                        duration: data.routes[0].duration,
                                    },
                                );
                            }
                        } catch (error) {
                            dispatchToLivewire(
                                mapEl,
                                "map:route-directions-error",
                                {
                                    id: config.id,
                                    message: error.message,
                                },
                            );
                        }
                    }

                    const sourceId = `route-${config.id}`;
                    const layerId = `route-layer-${config.id}`;

                    if (!map.getSource(sourceId)) {
                        map.addSource(sourceId, {
                            type: "geojson",
                            data: {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "LineString",
                                    coordinates: coordinates,
                                },
                            },
                        });

                        map.addLayer({
                            id: layerId,
                            type: "line",
                            source: sourceId,
                            layout: {
                                "line-join": config.lineJoin,
                                "line-cap": config.lineCap,
                            },
                            paint: {
                                "line-color": config.active
                                    ? config.activeColor
                                    : config.color,
                                "line-width": config.active
                                    ? config.activeWidth
                                    : config.width,
                                "line-opacity": config.opacity,
                                ...(config.dashArray
                                    ? { "line-dasharray": config.dashArray }
                                    : {}),
                            },
                        });

                        if (config.withStops) {
                            map.addLayer({
                                id: `route-stops-${config.id}`,
                                type: "circle",
                                source: sourceId,
                                paint: {
                                    "circle-radius": config.width * 1.5,
                                    "circle-color": config.stopColor,
                                    "circle-stroke-width": 2,
                                    "circle-stroke-color": "#ffffff",
                                },
                            });
                        }

                        if (config.animate) {
                            let startTime;
                            const duration = config.animateDuration;
                            const animateLine = (timestamp) => {
                                if (!startTime) startTime = timestamp;
                                const progress =
                                    (timestamp - startTime) / duration;

                                if (progress < 1) {
                                    // Simple animation by updating dasharray
                                    // A more robust way would be to slice the coordinates array
                                    // but this is a basic implementation
                                    requestAnimationFrame(animateLine);
                                }
                            };
                            requestAnimationFrame(animateLine);
                        }

                        if (config.clickable) {
                            map.on("click", layerId, (e) => {
                                dispatchToLivewire(mapEl, "map:route-clicked", {
                                    id: config.id,
                                    coordinates: e.lngLat,
                                    point: e.point,
                                });
                            });

                            map.on("mouseenter", layerId, () => {
                                map.getCanvas().style.cursor = "pointer";
                                if (config.hoverColor && !config.active) {
                                    map.setPaintProperty(
                                        layerId,
                                        "line-color",
                                        config.hoverColor,
                                    );
                                }
                                dispatchToLivewire(
                                    mapEl,
                                    "map:route-mouseenter",
                                    {
                                        id: config.id,
                                    },
                                );
                            });

                            map.on("mouseleave", layerId, () => {
                                map.getCanvas().style.cursor = "";
                                if (config.hoverColor && !config.active) {
                                    map.setPaintProperty(
                                        layerId,
                                        "line-color",
                                        config.color,
                                    );
                                }
                                dispatchToLivewire(
                                    mapEl,
                                    "map:route-mouseleave",
                                    {
                                        id: config.id,
                                    },
                                );
                            });
                        }
                    }

                    Alpine.effect(() => {
                        const newConfig = evaluate(expression);
                        if (map.getLayer(layerId)) {
                            map.setPaintProperty(
                                layerId,
                                "line-color",
                                newConfig.active
                                    ? newConfig.activeColor
                                    : newConfig.color,
                            );
                            map.setPaintProperty(
                                layerId,
                                "line-width",
                                newConfig.active
                                    ? newConfig.activeWidth
                                    : newConfig.width,
                            );
                        }

                        // Update coordinates if changed (simplified, ideally should re-fetch directions if needed)
                        if (
                            map.getSource(sourceId) &&
                            JSON.stringify(newConfig.coordinates) !==
                                JSON.stringify(config.coordinates)
                        ) {
                            map.getSource(sourceId).setData({
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "LineString",
                                    coordinates: newConfig.coordinates,
                                },
                            });
                        }
                    });
                };

                waitForMapLoad(map, doInit);
            };

            waitForMap(mapId, initRoute);

            el.addEventListener("livewire:navigating", () => {
                const map = Alpine.store("livewire-mapcn").maps[mapId];
                if (map) {
                    if (map.getLayer(`route-layer-${config.id}`))
                        map.removeLayer(`route-layer-${config.id}`);
                    if (map.getSource(`route-${config.id}`))
                        map.removeSource(`route-${config.id}`);
                }
            });
        });

        Alpine.directive(
            "map-cluster-layer",
            (el, { expression }, { evaluate }) => {
                // Read config and data from data attributes instead of
                // Alpine expression evaluation to avoid re-parsing large
                // JSON payloads on every reactive cycle.
                const config = JSON.parse(el.dataset.clusterConfig || "{}");
                const clusterData =
                    el._clusterData ||
                    JSON.parse(el.dataset.clusterData || "{}");
                // Free memory from the DOM attribute after parsing
                delete el.dataset.clusterData;
                delete el._clusterData;

                const mapEl = el.closest("[x-map]");
                if (!mapEl) return;

                const mapConfig = evaluate(mapEl.getAttribute("x-map"));
                const mapId = mapConfig.id;

                const initCluster = () => {
                    const map = Alpine.store("livewire-mapcn").maps[mapId];
                    if (!map) return;

                    const doInit = () => {
                        const sourceId = `cluster-source-${config.id}`;

                        if (!map.getSource(sourceId)) {
                            map.addSource(sourceId, {
                                type: "geojson",
                                data: clusterData,
                                cluster: true,
                                clusterMaxZoom: config.clusterMaxZoom,
                                clusterRadius: config.clusterRadius,
                                // Performance: larger buffer reduces tile-edge
                                // artefacts during panning at the cost of memory
                                buffer: config.buffer || 256,
                                // Performance: higher tolerance simplifies
                                // geometries for faster tile generation
                                tolerance: config.tolerance || 0.5,
                                // Enable automatic feature IDs for efficient diffing
                                generateId: true,
                            });

                            map.addLayer({
                                id: `clusters-${config.id}`,
                                type: "circle",
                                source: sourceId,
                                filter: ["has", "point_count"],
                                paint: {
                                    "circle-color": config.clusterColor,
                                    "circle-radius": [
                                        "step",
                                        ["get", "point_count"],
                                        config.clusterSizeStops[0][1],
                                        ...config.clusterSizeStops
                                            .slice(1)
                                            .flat(),
                                    ],
                                },
                            });

                            if (config.showCount) {
                                map.addLayer({
                                    id: `cluster-count-${config.id}`,
                                    type: "symbol",
                                    source: sourceId,
                                    filter: ["has", "point_count"],
                                    layout: {
                                        "text-field":
                                            "{point_count_abbreviated}",
                                        "text-size": 12,
                                    },
                                    paint: {
                                        "text-color": config.clusterTextColor,
                                    },
                                });
                            }

                            map.addLayer({
                                id: `unclustered-point-${config.id}`,
                                type: "circle",
                                source: sourceId,
                                filter: ["!", ["has", "point_count"]],
                                paint: {
                                    "circle-color": config.pointColor,
                                    "circle-radius": config.pointRadius,
                                    "circle-stroke-width": 1,
                                    "circle-stroke-color": "#fff",
                                },
                            });

                            // Handle cluster click on both the circle and
                            // the count label layers so clicks on the text
                            // are not swallowed by the symbol layer.
                            const clusterClickLayers = [
                                `clusters-${config.id}`,
                            ];
                            if (config.showCount) {
                                clusterClickLayers.push(
                                    `cluster-count-${config.id}`,
                                );
                            }

                            clusterClickLayers.forEach((layerId) => {
                                map.on("click", layerId, (e) => {
                                    // Prevent the click from propagating to the
                                    // map or being handled twice when both layers
                                    // overlap at the same point.
                                    e.originalEvent.stopPropagation();
                                    e._clusterHandled = true;

                                    const features = map.queryRenderedFeatures(
                                        e.point,
                                        {
                                            layers: [`clusters-${config.id}`],
                                        },
                                    );
                                    if (!features.length) return;

                                    const clusterId =
                                        features[0].properties.cluster_id;

                                    dispatchToLivewire(
                                        mapEl,
                                        "map:cluster-clicked",
                                        {
                                            cluster_id: clusterId,
                                            lat: e.lngLat.lat,
                                            lng: e.lngLat.lng,
                                            count: features[0].properties
                                                .point_count,
                                        },
                                    );

                                    if (config.clickZoom) {
                                        const source = map.getSource(sourceId);
                                        const result =
                                            source.getClusterExpansionZoom(
                                                clusterId,
                                            );

                                        // MapLibre v3+ returns a Promise;
                                        // older versions use a callback.
                                        if (
                                            result &&
                                            typeof result.then === "function"
                                        ) {
                                            result
                                                .then((zoom) => {
                                                    map.easeTo({
                                                        center: features[0]
                                                            .geometry
                                                            .coordinates,
                                                        zoom: zoom,
                                                    });
                                                    dispatchToLivewire(
                                                        mapEl,
                                                        "map:cluster-expanded",
                                                        {
                                                            cluster_id:
                                                                clusterId,
                                                            zoom: zoom,
                                                        },
                                                    );
                                                })
                                                .catch(() => {});
                                        } else {
                                            source.getClusterExpansionZoom(
                                                clusterId,
                                                (err, zoom) => {
                                                    if (err) return;
                                                    map.easeTo({
                                                        center: features[0]
                                                            .geometry
                                                            .coordinates,
                                                        zoom: zoom,
                                                    });
                                                    dispatchToLivewire(
                                                        mapEl,
                                                        "map:cluster-expanded",
                                                        {
                                                            cluster_id:
                                                                clusterId,
                                                            zoom: zoom,
                                                        },
                                                    );
                                                },
                                            );
                                        }
                                    }
                                });
                            });

                            map.on(
                                "click",
                                `unclustered-point-${config.id}`,
                                (e) => {
                                    const coordinates =
                                        e.features[0].geometry.coordinates.slice();
                                    const properties = e.features[0].properties;

                                    while (
                                        Math.abs(
                                            e.lngLat.lng - coordinates[0],
                                        ) > 180
                                    ) {
                                        coordinates[0] +=
                                            e.lngLat.lng > coordinates[0]
                                                ? 360
                                                : -360;
                                    }

                                    dispatchToLivewire(
                                        mapEl,
                                        "map:cluster-point-clicked",
                                        {
                                            feature_id: e.features[0].id,
                                            lat: coordinates[1],
                                            lng: coordinates[0],
                                            properties: properties,
                                        },
                                    );

                                    // Resolve popup template: slot > attribute > popupProperty > default
                                    const slotTemplate = el.querySelector(
                                        'template[x-ref="clusterPopup"]',
                                    );
                                    const popupHTML = slotTemplate
                                        ? slotTemplate.innerHTML
                                        : config.popupTemplate || null;

                                    if (popupHTML) {
                                        // Interpolate {property} placeholders
                                        const html = interpolatePopupTemplate(
                                            popupHTML,
                                            properties,
                                            coordinates,
                                        );
                                        new maplibregl.Popup({
                                            maxWidth: "320px",
                                        })
                                            .setLngLat(coordinates)
                                            .setHTML(html)
                                            .addTo(map);
                                    } else if (
                                        config.popupProperty &&
                                        properties[config.popupProperty]
                                    ) {
                                        // Auto-generated styled popup from a primary property
                                        new maplibregl.Popup({
                                            maxWidth: "280px",
                                        })
                                            .setLngLat(coordinates)
                                            .setHTML(
                                                buildClusterPopupHTML(
                                                    properties,
                                                    config.popupProperty,
                                                ),
                                            )
                                            .addTo(map);
                                    } else {
                                        // Default popup: show name (if available) + coordinates
                                        const escHTML = (s) =>
                                            String(s)
                                                .replace(/&/g, "&amp;")
                                                .replace(/</g, "&lt;")
                                                .replace(/>/g, "&gt;");
                                        const name =
                                            properties.name ||
                                            properties.title ||
                                            properties.label ||
                                            null;
                                        const lat = coordinates[1].toFixed(6);
                                        const lng = coordinates[0].toFixed(6);
                                        const html =
                                            `<div class="lm-cluster-popup">` +
                                            (name
                                                ? `<div class="lm-popup-title">${escHTML(name)}</div>`
                                                : "") +
                                            `<div class="lm-popup-body">` +
                                            `<div class="lm-popup-row"><span class="lm-popup-label">Lat</span><span class="lm-popup-value">${lat}</span></div>` +
                                            `<div class="lm-popup-row"><span class="lm-popup-label">Lng</span><span class="lm-popup-value">${lng}</span></div>` +
                                            `</div></div>`;
                                        new maplibregl.Popup({
                                            maxWidth: "240px",
                                        })
                                            .setLngLat(coordinates)
                                            .setHTML(html)
                                            .addTo(map);
                                    }
                                },
                            );

                            map.on(
                                "mouseenter",
                                `clusters-${config.id}`,
                                () => {
                                    map.getCanvas().style.cursor = "pointer";
                                },
                            );
                            map.on(
                                "mouseleave",
                                `clusters-${config.id}`,
                                () => {
                                    map.getCanvas().style.cursor = "";
                                },
                            );
                            map.on(
                                "mouseenter",
                                `unclustered-point-${config.id}`,
                                () => {
                                    map.getCanvas().style.cursor = "pointer";
                                },
                            );
                            map.on(
                                "mouseleave",
                                `unclustered-point-${config.id}`,
                                () => {
                                    map.getCanvas().style.cursor = "";
                                },
                            );
                        }

                        // Store ref for Livewire-driven data updates
                        el._clusterSourceId = sourceId;
                        el._clusterMapId = mapId;
                    };

                    waitForMapLoad(map, doInit);
                };

                waitForMap(mapId, initCluster);

                // Listen for programmatic data updates via Livewire events
                if (window.Livewire) {
                    window.Livewire.on(
                        `map:update-cluster-data-${config.id}`,
                        (payload) => {
                            const map =
                                Alpine.store("livewire-mapcn").maps[mapId];
                            const data = payload[0] || payload;
                            if (
                                map &&
                                el._clusterSourceId &&
                                map.getSource(el._clusterSourceId)
                            ) {
                                map.getSource(el._clusterSourceId).setData(
                                    data,
                                );
                            }
                        },
                    );
                }

                el.addEventListener("livewire:navigating", () => {
                    const map = Alpine.store("livewire-mapcn").maps[mapId];
                    if (map) {
                        if (map.getLayer(`clusters-${config.id}`))
                            map.removeLayer(`clusters-${config.id}`);
                        if (map.getLayer(`cluster-count-${config.id}`))
                            map.removeLayer(`cluster-count-${config.id}`);
                        if (map.getLayer(`unclustered-point-${config.id}`))
                            map.removeLayer(`unclustered-point-${config.id}`);
                        if (map.getSource(`cluster-source-${config.id}`))
                            map.removeSource(`cluster-source-${config.id}`);
                    }
                });
            },
        );
        Alpine.directive("map-resize", (el, { expression }, { evaluate }) => {
            const mapEl = el.closest("[x-map]");
            if (!mapEl) return;

            const mapConfig = evaluate(mapEl.getAttribute("x-map"));
            const mapId = mapConfig.id;

            Alpine.effect(() => {
                const shouldResize = evaluate(expression);
                if (shouldResize) {
                    const map = Alpine.store("livewire-mapcn").maps[mapId];
                    if (map) {
                        // Small delay to allow DOM to update (e.g. modal opening)
                        setTimeout(() => map.resize(), 50);
                    }
                }
            });
        });
    }

    // Expose the plugin globally
    window.LivewireMapPlugin = LivewireMapPlugin;

    // Auto-register with Alpine
    if (typeof window !== "undefined" && window.Alpine) {
        window.Alpine.plugin(LivewireMapPlugin);
    } else {
        document.addEventListener("alpine:init", () => {
            window.Alpine.plugin(LivewireMapPlugin);
        });
    }
})();
