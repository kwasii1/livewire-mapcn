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

            // Custom event forwarding
            // Events already handled by built-in listeners above
            const builtInEvents = new Set([
                "click",
                "dblclick",
                "contextmenu",
                "zoom",
                "zoomend",
                "move",
                "moveend",
                "dragend",
                "rotate",
                "pitch",
                "styledata",
                "load",
            ]);

            /**
             * Extract serialisable data from a MapLibre event object.
             * Different event types carry different properties, so we
             * pick what is available and safe to serialise.
             */
            function extractEventData(e) {
                const out = {};
                if (e.lngLat) {
                    out.lat = e.lngLat.lat;
                    out.lng = e.lngLat.lng;
                }
                if (e.point) out.point = e.point;
                if (e.features) {
                    out.features = e.features.map((f) => ({
                        id: f.id,
                        properties: f.properties,
                        geometry: f.geometry,
                    }));
                }
                if (e.dataType) out.dataType = e.dataType;
                if (e.sourceId) out.sourceId = e.sourceId;
                if (e.isSourceLoaded !== undefined)
                    out.isSourceLoaded = e.isSourceLoaded;
                if (e.style) out.style = true; // avoid serialising full style obj
                if (e.error) out.error = String(e.error);
                return out;
            }

            if (Array.isArray(config.customEvents)) {
                config.customEvents.forEach((eventName) => {
                    if (builtInEvents.has(eventName)) return;
                    map.on(eventName, (e) => {
                        dispatchToLivewire(
                            el,
                            `map:${eventName}`,
                            extractEventData(e || {}),
                        );
                    });
                });
            }

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
                    const duration = payload.duration || 2000;
                    // Retrieve stored animation refs from the Alpine store
                    const store = Alpine.store("livewire-mapcn");
                    if (
                        store.routeAnimations &&
                        store.routeAnimations[routeId]
                    ) {
                        const anim = store.routeAnimations[routeId];
                        anim.startTime = null;
                        if (duration) anim.duration = duration;
                        requestAnimationFrame(anim.fn);
                    }
                });
                window.Livewire.on("map:call", (data) => {
                    const payload = data[0] || data;
                    const method = payload.method;
                    const args = payload.args || [];
                    if (
                        method &&
                        typeof map[method] === "function" &&
                        !method.startsWith("_")
                    ) {
                        map[method](...(Array.isArray(args) ? args : [args]));
                    }
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

            // Track alternative route layer/source IDs for cleanup
            const altLayerIds = [];
            const altSourceIds = [];
            // Track all fetched route data for alternative swapping
            let allRoutes = [];
            let currentPrimaryIndex = 0;
            // Store Livewire listener cleanup function
            let unsubscribeUpdate = null;
            // Track the last set of waypoints used for OSRM fetching so the
            // Alpine.effect can detect when the user changes waypoints and
            // re-fetch road geometry instead of drawing straight lines.
            let lastWaypoints = JSON.stringify(config.coordinates);

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
                            let url = `${config.directionsUrl}/route/v1/${config.directionsProfile}/${coordsString}?geometries=geojson&overview=full`;
                            if (config.alternatives) {
                                url += "&alternatives=true";
                            }
                            const response = await fetch(url);
                            const data = await response.json();

                            if (data.code === "Ok" && data.routes.length > 0) {
                                coordinates =
                                    data.routes[0].geometry.coordinates;

                                // Mark that we have snapped to OSRM geometry
                                // for this set of waypoints so the effect
                                // knows not to overwrite with straight lines.
                                lastWaypoints = JSON.stringify(
                                    config.coordinates,
                                );

                                // Store all routes for alternative swapping
                                allRoutes = data.routes.map((r) => ({
                                    geometry: r.geometry,
                                    distance: r.distance,
                                    duration: r.duration,
                                }));

                                const alternatives = data.routes
                                    .slice(1)
                                    .map((r) => ({
                                        geometry: r.geometry,
                                        distance: r.distance,
                                        duration: r.duration,
                                    }));

                                dispatchToLivewire(
                                    mapEl,
                                    "map:route-directions-ready",
                                    {
                                        id: config.id,
                                        geometry: data.routes[0].geometry,
                                        distance: data.routes[0].distance,
                                        duration: data.routes[0].duration,
                                        alternatives: alternatives,
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
                        // --- Alternative route layers (rendered first so primary draws on top) ---
                        if (config.alternatives && allRoutes.length > 1) {
                            const maxAlts = Math.min(
                                config.maxAlternatives,
                                allRoutes.length - 1,
                            );
                            for (let i = 0; i < maxAlts; i++) {
                                const altRoute = allRoutes[i + 1];
                                const altSourceId = `route-alt-${config.id}-${i}`;
                                const altLayerId = `route-alt-layer-${config.id}-${i}`;

                                altSourceIds.push(altSourceId);
                                altLayerIds.push(altLayerId);

                                map.addSource(altSourceId, {
                                    type: "geojson",
                                    data: {
                                        type: "Feature",
                                        properties: {},
                                        geometry: {
                                            type: "LineString",
                                            coordinates:
                                                altRoute.geometry.coordinates,
                                        },
                                    },
                                });

                                map.addLayer({
                                    id: altLayerId,
                                    type: "line",
                                    source: altSourceId,
                                    layout: {
                                        "line-join": config.lineJoin,
                                        "line-cap": config.lineCap,
                                    },
                                    paint: {
                                        "line-color": config.alternativeColor,
                                        "line-width": config.alternativeWidth,
                                        "line-opacity":
                                            config.alternativeOpacity,
                                    },
                                });

                                // Click to swap alternative with primary
                                if (config.clickable) {
                                    const altIdx = i;
                                    map.on("click", altLayerId, (e) => {
                                        e.originalEvent.stopPropagation();
                                        const clickedAltGlobalIndex =
                                            altIdx +
                                            (altIdx >= currentPrimaryIndex
                                                ? 1
                                                : 0);
                                        const actualAltIndex =
                                            currentPrimaryIndex > altIdx
                                                ? altIdx
                                                : altIdx + 1;

                                        // Swap primary and alternative route data
                                        const prevPrimary = currentPrimaryIndex;
                                        currentPrimaryIndex = altIdx + 1;

                                        // Update primary layer source
                                        const newPrimaryRoute =
                                            allRoutes[currentPrimaryIndex];
                                        map.getSource(sourceId).setData({
                                            type: "Feature",
                                            properties: {},
                                            geometry: {
                                                type: "LineString",
                                                coordinates:
                                                    newPrimaryRoute.geometry
                                                        .coordinates,
                                            },
                                        });

                                        // Update all alternative layers
                                        let altDataIndex = 0;
                                        for (
                                            let r = 0;
                                            r < allRoutes.length;
                                            r++
                                        ) {
                                            if (
                                                r === currentPrimaryIndex ||
                                                altDataIndex >=
                                                    altLayerIds.length
                                            )
                                                continue;
                                            const altSrc =
                                                altSourceIds[altDataIndex];
                                            if (map.getSource(altSrc)) {
                                                map.getSource(altSrc).setData({
                                                    type: "Feature",
                                                    properties: {},
                                                    geometry: {
                                                        type: "LineString",
                                                        coordinates:
                                                            allRoutes[r]
                                                                .geometry
                                                                .coordinates,
                                                    },
                                                });
                                            }
                                            altDataIndex++;
                                        }

                                        dispatchToLivewire(
                                            mapEl,
                                            "map:route-alternative-selected",
                                            {
                                                id: config.id,
                                                alternativeIndex:
                                                    currentPrimaryIndex,
                                                previousIndex: prevPrimary,
                                                geometry:
                                                    newPrimaryRoute.geometry,
                                                distance:
                                                    newPrimaryRoute.distance,
                                                duration:
                                                    newPrimaryRoute.duration,
                                            },
                                        );
                                    });

                                    map.on("mouseenter", altLayerId, () => {
                                        map.getCanvas().style.cursor =
                                            "pointer";
                                    });
                                    map.on("mouseleave", altLayerId, () => {
                                        map.getCanvas().style.cursor = "";
                                    });
                                }
                            }
                        }

                        // --- Primary route layer ---
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
                            // Initialise the animation store if needed
                            const store = Alpine.store("livewire-mapcn");
                            if (!store.routeAnimations)
                                store.routeAnimations = {};

                            // Growing-line animation: gradually reveal the
                            // route from start to end by slicing the coordinate
                            // list. Works correctly with OSRM road geometry
                            // (many fine-grained points) for a smooth draw.
                            const allAnimCoords = [...coordinates];
                            let startTime = null;
                            const duration = config.animateDuration;

                            const animateLine = (timestamp) => {
                                if (!startTime) startTime = timestamp;
                                const progress = Math.min(
                                    (timestamp - startTime) / duration,
                                    1,
                                );

                                // Show the first `n` coordinates, growing
                                // from 2 (minimum for a LineString) to all.
                                const n = Math.max(
                                    2,
                                    Math.ceil(progress * allAnimCoords.length),
                                );
                                const visibleCoords = allAnimCoords.slice(0, n);

                                if (map.getSource(sourceId)) {
                                    map.getSource(sourceId).setData({
                                        type: "Feature",
                                        properties: {},
                                        geometry: {
                                            type: "LineString",
                                            coordinates: visibleCoords,
                                        },
                                    });
                                }

                                if (progress < 1) {
                                    requestAnimationFrame(animateLine);
                                } else {
                                    // Ensure the full line is visible when done
                                    if (map.getSource(sourceId)) {
                                        map.getSource(sourceId).setData({
                                            type: "Feature",
                                            properties: {},
                                            geometry: {
                                                type: "LineString",
                                                coordinates: allAnimCoords,
                                            },
                                        });
                                    }
                                    if (store.routeAnimations) {
                                        delete store.routeAnimations[config.id];
                                    }
                                }
                            };

                            // Store the animation ref so map:force-animate
                            // can re-trigger
                            const animRef = {
                                fn: animateLine,
                                duration: duration,
                            };
                            store.routeAnimations[config.id] = animRef;

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

                    // Reactive paint property updates via Alpine
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

                        const newWaypointsStr = JSON.stringify(
                            newConfig.coordinates,
                        );
                        if (
                            map.getSource(sourceId) &&
                            newWaypointsStr !== lastWaypoints
                        ) {
                            lastWaypoints = newWaypointsStr;

                            if (newConfig.fetchDirections) {
                                // Waypoints changed — re-fetch road geometry
                                // from OSRM so the route stays snapped to
                                // actual roads instead of drawing a straight
                                // line between the new waypoints.
                                const coordsStr = newConfig.coordinates
                                    .map((c) => `${c[0]},${c[1]}`)
                                    .join(";");
                                let osrmUrl = `${newConfig.directionsUrl}/route/v1/${newConfig.directionsProfile}/${coordsStr}?geometries=geojson&overview=full`;
                                if (newConfig.alternatives) {
                                    osrmUrl += "&alternatives=true";
                                }
                                fetch(osrmUrl)
                                    .then((r) => r.json())
                                    .then((data) => {
                                        if (
                                            data.code === "Ok" &&
                                            data.routes.length > 0
                                        ) {
                                            if (map.getSource(sourceId)) {
                                                map.getSource(sourceId).setData(
                                                    {
                                                        type: "Feature",
                                                        properties: {},
                                                        geometry: {
                                                            type: "LineString",
                                                            coordinates:
                                                                data.routes[0]
                                                                    .geometry
                                                                    .coordinates,
                                                        },
                                                    },
                                                );
                                            }
                                            // Update stored routes for
                                            // alternative swapping
                                            allRoutes = data.routes.map(
                                                (r) => ({
                                                    geometry: r.geometry,
                                                    distance: r.distance,
                                                    duration: r.duration,
                                                }),
                                            );
                                            currentPrimaryIndex = 0;
                                            dispatchToLivewire(
                                                mapEl,
                                                "map:route-directions-ready",
                                                {
                                                    id: config.id,
                                                    geometry:
                                                        data.routes[0].geometry,
                                                    distance:
                                                        data.routes[0].distance,
                                                    duration:
                                                        data.routes[0].duration,
                                                    alternatives: data.routes
                                                        .slice(1)
                                                        .map((r) => ({
                                                            geometry:
                                                                r.geometry,
                                                            distance:
                                                                r.distance,
                                                            duration:
                                                                r.duration,
                                                        })),
                                                },
                                            );
                                        }
                                    })
                                    .catch((err) => {
                                        dispatchToLivewire(
                                            mapEl,
                                            "map:route-directions-error",
                                            {
                                                id: config.id,
                                                message: err.message,
                                            },
                                        );
                                    });
                            } else {
                                // No directions fetch — just update source
                                // with the new raw coordinates.
                                map.getSource(sourceId).setData({
                                    type: "Feature",
                                    properties: {},
                                    geometry: {
                                        type: "LineString",
                                        coordinates: newConfig.coordinates,
                                    },
                                });
                            }
                        }
                    });

                    // --- Livewire inbound event: map:update-route-data-{id} ---
                    if (window.Livewire) {
                        unsubscribeUpdate = window.Livewire.on(
                            `map:update-route-data-${config.id}`,
                            async (data) => {
                                const payload = data[0] || data;
                                const currentMap =
                                    Alpine.store("livewire-mapcn").maps[mapId];
                                if (!currentMap) return;

                                let newCoords = payload.coordinates;

                                // Re-fetch directions if requested or if originally configured
                                if (
                                    newCoords &&
                                    newCoords.length >= 2 &&
                                    (payload.fetchDirections ||
                                        config.fetchDirections)
                                ) {
                                    try {
                                        const profile =
                                            payload.directionsProfile ||
                                            config.directionsProfile;
                                        const coordsString = newCoords
                                            .map((c) => `${c[0]},${c[1]}`)
                                            .join(";");
                                        let url = `${config.directionsUrl}/route/v1/${profile}/${coordsString}?geometries=geojson&overview=full`;
                                        if (config.alternatives) {
                                            url += "&alternatives=true";
                                        }
                                        const response = await fetch(url);
                                        const dirData = await response.json();
                                        if (
                                            dirData.code === "Ok" &&
                                            dirData.routes.length > 0
                                        ) {
                                            newCoords =
                                                dirData.routes[0].geometry
                                                    .coordinates;

                                            // Update alternative routes
                                            allRoutes = dirData.routes.map(
                                                (r) => ({
                                                    geometry: r.geometry,
                                                    distance: r.distance,
                                                    duration: r.duration,
                                                }),
                                            );
                                            currentPrimaryIndex = 0;

                                            // Update alternative layers
                                            for (
                                                let i = 0;
                                                i < altSourceIds.length;
                                                i++
                                            ) {
                                                if (
                                                    allRoutes[i + 1] &&
                                                    currentMap.getSource(
                                                        altSourceIds[i],
                                                    )
                                                ) {
                                                    currentMap
                                                        .getSource(
                                                            altSourceIds[i],
                                                        )
                                                        .setData({
                                                            type: "Feature",
                                                            properties: {},
                                                            geometry: {
                                                                type: "LineString",
                                                                coordinates:
                                                                    allRoutes[
                                                                        i + 1
                                                                    ].geometry
                                                                        .coordinates,
                                                            },
                                                        });
                                                }
                                            }

                                            const alternatives = dirData.routes
                                                .slice(1)
                                                .map((r) => ({
                                                    geometry: r.geometry,
                                                    distance: r.distance,
                                                    duration: r.duration,
                                                }));

                                            dispatchToLivewire(
                                                mapEl,
                                                "map:route-directions-ready",
                                                {
                                                    id: config.id,
                                                    geometry:
                                                        dirData.routes[0]
                                                            .geometry,
                                                    distance:
                                                        dirData.routes[0]
                                                            .distance,
                                                    duration:
                                                        dirData.routes[0]
                                                            .duration,
                                                    alternatives: alternatives,
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

                                // Update source coordinates
                                if (
                                    newCoords &&
                                    currentMap.getSource(sourceId)
                                ) {
                                    currentMap.getSource(sourceId).setData({
                                        type: "Feature",
                                        properties: {},
                                        geometry: {
                                            type: "LineString",
                                            coordinates: newCoords,
                                        },
                                    });
                                }

                                // Update paint properties if provided
                                if (currentMap.getLayer(layerId)) {
                                    if (payload.color !== undefined) {
                                        currentMap.setPaintProperty(
                                            layerId,
                                            "line-color",
                                            payload.active
                                                ? payload.activeColor ||
                                                      config.activeColor
                                                : payload.color,
                                        );
                                    }
                                    if (payload.width !== undefined) {
                                        currentMap.setPaintProperty(
                                            layerId,
                                            "line-width",
                                            payload.active
                                                ? payload.activeWidth ||
                                                      config.activeWidth
                                                : payload.width,
                                        );
                                    }
                                    if (payload.opacity !== undefined) {
                                        currentMap.setPaintProperty(
                                            layerId,
                                            "line-opacity",
                                            payload.opacity,
                                        );
                                    }
                                    if (payload.active !== undefined) {
                                        const color =
                                            payload.color || config.color;
                                        const activeColor =
                                            payload.activeColor ||
                                            config.activeColor;
                                        const width =
                                            payload.width || config.width;
                                        const activeWidth =
                                            payload.activeWidth ||
                                            config.activeWidth;
                                        currentMap.setPaintProperty(
                                            layerId,
                                            "line-color",
                                            payload.active
                                                ? activeColor
                                                : color,
                                        );
                                        currentMap.setPaintProperty(
                                            layerId,
                                            "line-width",
                                            payload.active
                                                ? activeWidth
                                                : width,
                                        );
                                    }
                                    if (payload.dashArray !== undefined) {
                                        currentMap.setPaintProperty(
                                            layerId,
                                            "line-dasharray",
                                            payload.dashArray,
                                        );
                                    }
                                }

                                dispatchToLivewire(mapEl, "map:route-updated", {
                                    id: config.id,
                                });
                            },
                        );
                    }

                    // --- Listen for route-list panel selections ---
                    // When the <x-map-route-list> component selects a
                    // route, it updates the map sources directly but
                    // this directive's currentPrimaryIndex must stay in
                    // sync so subsequent alt-click swaps work correctly.
                    const handleRouteListSelected = (e) => {
                        const detail = e.detail;
                        if (detail.routeId !== config.id) return;
                        const newIdx = detail.selectedIndex;
                        if (
                            newIdx !== currentPrimaryIndex &&
                            newIdx >= 0 &&
                            newIdx < allRoutes.length
                        ) {
                            currentPrimaryIndex = newIdx;
                        }
                    };
                    window.addEventListener(
                        "map:route-list-selected",
                        handleRouteListSelected,
                    );
                    el._routeListHandler = handleRouteListSelected;
                };

                waitForMapLoad(map, doInit);
            };

            waitForMap(mapId, initRoute);

            el.addEventListener("livewire:navigating", () => {
                const map = Alpine.store("livewire-mapcn").maps[mapId];
                if (map) {
                    // Clean up alternative layers
                    altLayerIds.forEach((id) => {
                        if (map.getLayer(id)) map.removeLayer(id);
                    });
                    altSourceIds.forEach((id) => {
                        if (map.getSource(id)) map.removeSource(id);
                    });
                    // Clean up stops layer
                    if (map.getLayer(`route-stops-${config.id}`))
                        map.removeLayer(`route-stops-${config.id}`);
                    // Clean up primary route
                    if (map.getLayer(`route-layer-${config.id}`))
                        map.removeLayer(`route-layer-${config.id}`);
                    if (map.getSource(`route-${config.id}`))
                        map.removeSource(`route-${config.id}`);
                }
                // Unsubscribe Livewire listener
                if (unsubscribeUpdate) {
                    unsubscribeUpdate();
                    unsubscribeUpdate = null;
                }
                // Clean up route-list listener
                if (el._routeListHandler) {
                    window.removeEventListener(
                        "map:route-list-selected",
                        el._routeListHandler,
                    );
                    el._routeListHandler = null;
                }
                // Clean up animation ref
                const store = Alpine.store("livewire-mapcn");
                if (store.routeAnimations) {
                    delete store.routeAnimations[config.id];
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
                const clusterData = config.url
                    ? config.url
                    : el._clusterData ||
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

        Alpine.directive(
            "map-route-group",
            (el, { expression }, { evaluate }) => {
                const config = JSON.parse(el.dataset.routeGroupConfig || "{}");
                const routes = JSON.parse(el.dataset.routeGroupRoutes || "[]");
                // Free memory from DOM after parsing
                delete el.dataset.routeGroupRoutes;

                const mapEl = el.closest("[x-map]");
                if (!mapEl) return;

                const mapConfig = evaluate(mapEl.getAttribute("x-map"));
                const mapId = mapConfig.id;

                const groupSourceIds = [];
                const groupLayerIds = [];
                let selectedIdx =
                    typeof config.selectedRoute === "number"
                        ? config.selectedRoute
                        : 0;
                let unsubscribeGroupUpdate = null;

                const initRouteGroup = () => {
                    const map = Alpine.store("livewire-mapcn").maps[mapId];
                    if (!map) return;

                    const doInit = () => {
                        routes.forEach((route, index) => {
                            const routeId =
                                route.id || `${config.id}-route-${index}`;
                            const srcId = `route-group-${config.id}-${index}`;
                            const lyrId = `route-group-layer-${config.id}-${index}`;

                            groupSourceIds.push(srcId);
                            groupLayerIds.push(lyrId);

                            const isSelected = index === selectedIdx;

                            map.addSource(srcId, {
                                type: "geojson",
                                data: {
                                    type: "Feature",
                                    properties: { routeId, index },
                                    geometry: {
                                        type: "LineString",
                                        coordinates: route.coordinates || [],
                                    },
                                },
                            });

                            map.addLayer({
                                id: lyrId,
                                type: "line",
                                source: srcId,
                                layout: {
                                    "line-join": config.lineJoin || "round",
                                    "line-cap": config.lineCap || "round",
                                },
                                paint: {
                                    "line-color": isSelected
                                        ? route.color || "#1A56DB"
                                        : config.alternativeColor,
                                    "line-width": isSelected
                                        ? route.width || 4
                                        : config.alternativeWidth,
                                    "line-opacity": isSelected
                                        ? route.opacity || 1.0
                                        : config.alternativeOpacity,
                                },
                            });

                            if (config.clickable) {
                                map.on("click", lyrId, (e) => {
                                    e.originalEvent.stopPropagation();
                                    if (index === selectedIdx) return;

                                    const prevIdx = selectedIdx;
                                    const prevLyrId = groupLayerIds[prevIdx];
                                    const prevRoute = routes[prevIdx];

                                    // Revert previous primary to alternative styling
                                    if (map.getLayer(prevLyrId)) {
                                        map.setPaintProperty(
                                            prevLyrId,
                                            "line-color",
                                            config.alternativeColor,
                                        );
                                        map.setPaintProperty(
                                            prevLyrId,
                                            "line-width",
                                            config.alternativeWidth,
                                        );
                                        map.setPaintProperty(
                                            prevLyrId,
                                            "line-opacity",
                                            config.alternativeOpacity,
                                        );
                                    }

                                    // Apply primary styling to clicked route
                                    if (map.getLayer(lyrId)) {
                                        map.setPaintProperty(
                                            lyrId,
                                            "line-color",
                                            route.color || "#1A56DB",
                                        );
                                        map.setPaintProperty(
                                            lyrId,
                                            "line-width",
                                            route.width || 4,
                                        );
                                        map.setPaintProperty(
                                            lyrId,
                                            "line-opacity",
                                            route.opacity || 1.0,
                                        );
                                    }

                                    selectedIdx = index;

                                    dispatchToLivewire(
                                        mapEl,
                                        "map:route-group-selection-changed",
                                        {
                                            groupId: config.id,
                                            selectedRouteId:
                                                route.id ||
                                                `${config.id}-route-${index}`,
                                            selectedIndex: index,
                                            previousRouteId:
                                                prevRoute.id ||
                                                `${config.id}-route-${prevIdx}`,
                                            previousIndex: prevIdx,
                                        },
                                    );
                                });

                                map.on("mouseenter", lyrId, () => {
                                    map.getCanvas().style.cursor = "pointer";
                                });
                                map.on("mouseleave", lyrId, () => {
                                    map.getCanvas().style.cursor = "";
                                });
                            }
                        });

                        // Auto fit bounds to selected route
                        if (
                            config.fitBounds &&
                            routes[selectedIdx] &&
                            routes[selectedIdx].coordinates &&
                            routes[selectedIdx].coordinates.length > 1
                        ) {
                            const coords = routes[selectedIdx].coordinates;
                            const bounds = coords.reduce(
                                (b, c) => b.extend(c),
                                new maplibregl.LngLatBounds(
                                    coords[0],
                                    coords[0],
                                ),
                            );
                            map.fitBounds(bounds, { padding: 50 });
                        }
                    };

                    waitForMapLoad(map, doInit);
                };

                waitForMap(mapId, initRouteGroup);

                // Livewire inbound: update route group data or selection
                if (window.Livewire) {
                    unsubscribeGroupUpdate = window.Livewire.on(
                        `map:update-route-group-${config.id}`,
                        (data) => {
                            const payload = data[0] || data;
                            const map =
                                Alpine.store("livewire-mapcn").maps[mapId];
                            if (!map) return;

                            // Update selected route
                            if (payload.selectedRoute !== undefined) {
                                const newIdx = payload.selectedRoute;
                                if (
                                    newIdx !== selectedIdx &&
                                    newIdx >= 0 &&
                                    newIdx < routes.length
                                ) {
                                    const prevIdx = selectedIdx;

                                    // Revert previous
                                    if (map.getLayer(groupLayerIds[prevIdx])) {
                                        map.setPaintProperty(
                                            groupLayerIds[prevIdx],
                                            "line-color",
                                            config.alternativeColor,
                                        );
                                        map.setPaintProperty(
                                            groupLayerIds[prevIdx],
                                            "line-width",
                                            config.alternativeWidth,
                                        );
                                        map.setPaintProperty(
                                            groupLayerIds[prevIdx],
                                            "line-opacity",
                                            config.alternativeOpacity,
                                        );
                                    }

                                    // Apply primary
                                    const route = routes[newIdx];
                                    if (map.getLayer(groupLayerIds[newIdx])) {
                                        map.setPaintProperty(
                                            groupLayerIds[newIdx],
                                            "line-color",
                                            route.color || "#1A56DB",
                                        );
                                        map.setPaintProperty(
                                            groupLayerIds[newIdx],
                                            "line-width",
                                            route.width || 4,
                                        );
                                        map.setPaintProperty(
                                            groupLayerIds[newIdx],
                                            "line-opacity",
                                            route.opacity || 1.0,
                                        );
                                    }

                                    selectedIdx = newIdx;
                                }
                            }

                            // Update route coordinates
                            if (payload.routes) {
                                payload.routes.forEach((routeUpdate, i) => {
                                    if (
                                        routeUpdate.coordinates &&
                                        groupSourceIds[i] &&
                                        map.getSource(groupSourceIds[i])
                                    ) {
                                        map.getSource(
                                            groupSourceIds[i],
                                        ).setData({
                                            type: "Feature",
                                            properties: {},
                                            geometry: {
                                                type: "LineString",
                                                coordinates:
                                                    routeUpdate.coordinates,
                                            },
                                        });
                                        // Update local state
                                        if (routes[i]) {
                                            routes[i].coordinates =
                                                routeUpdate.coordinates;
                                        }
                                    }

                                    // Update styling
                                    if (
                                        routeUpdate.color &&
                                        i === selectedIdx &&
                                        map.getLayer(groupLayerIds[i])
                                    ) {
                                        map.setPaintProperty(
                                            groupLayerIds[i],
                                            "line-color",
                                            routeUpdate.color,
                                        );
                                    }
                                });
                            }
                        },
                    );
                }

                el.addEventListener("livewire:navigating", () => {
                    const map = Alpine.store("livewire-mapcn").maps[mapId];
                    if (map) {
                        groupLayerIds.forEach((id) => {
                            if (map.getLayer(id)) map.removeLayer(id);
                        });
                        groupSourceIds.forEach((id) => {
                            if (map.getSource(id)) map.removeSource(id);
                        });
                    }
                    if (unsubscribeGroupUpdate) {
                        unsubscribeGroupUpdate();
                        unsubscribeGroupUpdate = null;
                    }
                });
            },
        );

        Alpine.directive(
            "map-route-list",
            (el, { expression }, { evaluate, cleanup }) => {
                const config = evaluate(expression);
                const routeId = config.routeId;

                // Auto-resolve map ID: use explicit mapId, or find the
                // nearest ancestor [x-map] element, or find the map
                // element that contains the matching route element.
                let mapId = config.mapId;
                if (!mapId) {
                    // Try closest ancestor
                    const ancestorMap = el.closest("[x-map]");
                    if (ancestorMap) {
                        const ancestorConfig = evaluate(
                            ancestorMap.getAttribute("x-map"),
                        );
                        mapId = ancestorConfig.id;
                    }
                }
                if (!mapId) {
                    // Try finding the route element's parent map
                    const routeEl = document.querySelector(
                        `[x-map-route*="'${routeId}'"], [x-map-route*='"${routeId}"']`,
                    );
                    if (routeEl) {
                        const routeMapEl = routeEl.closest("[x-map]");
                        if (routeMapEl) {
                            const routeMapConfig = evaluate(
                                routeMapEl.getAttribute("x-map"),
                            );
                            mapId = routeMapConfig.id;
                        }
                    }
                }
                if (!mapId) {
                    // Last resort: use first registered map
                    const maps = Alpine.store("livewire-mapcn").maps;
                    const ids = Object.keys(maps);
                    if (ids.length === 1) mapId = ids[0];
                }

                // Reactive state exposed to the template as `_rl`
                const state = Alpine.reactive({
                    routes: [],
                    selectedIndex: 0,
                    showDistance: config.showDistance,
                    showDuration: config.showDuration,
                    showFastestBadge: config.showFastestBadge,
                    showTimeDiff: config.showTimeDiff,
                    title: config.title || "Routes",

                    get fastestIndex() {
                        if (!this.routes.length) return 0;
                        let minDuration = Infinity;
                        let minIdx = 0;
                        this.routes.forEach((r, i) => {
                            if (r.duration < minDuration) {
                                minDuration = r.duration;
                                minIdx = i;
                            }
                        });
                        return minIdx;
                    },

                    formatDistance(meters) {
                        if (meters >= 1000)
                            return (meters / 1000).toFixed(1) + " km";
                        return Math.round(meters) + " m";
                    },

                    formatDuration(seconds) {
                        const mins = Math.round(seconds / 60);
                        if (mins < 60) return mins + " min";
                        const hrs = Math.floor(mins / 60);
                        const rem = mins % 60;
                        return hrs + "h " + rem + "min";
                    },

                    timeDiff(index) {
                        if (!this.routes.length) return null;
                        const fastest = this.routes[this.fastestIndex];
                        if (!fastest) return null;
                        const diff = Math.round(
                            (this.routes[index].duration - fastest.duration) /
                                60,
                        );
                        if (diff <= 0) return null;
                        return "+" + diff + " min";
                    },

                    selectRoute(index) {
                        if (index === this.selectedIndex || !this.routes.length)
                            return;

                        const map =
                            Alpine.store("livewire-mapcn")?.maps?.[mapId];
                        if (!map) return;

                        const sourceId = "route-" + routeId;
                        const newPrimary = this.routes[index];

                        // Update primary route source
                        if (map.getSource(sourceId)) {
                            map.getSource(sourceId).setData({
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "LineString",
                                    coordinates:
                                        newPrimary.geometry.coordinates,
                                },
                            });
                        }

                        // Update alternative route sources
                        let altIdx = 0;
                        for (let i = 0; i < this.routes.length; i++) {
                            if (i === index) continue;
                            const altSrc =
                                "route-alt-" + routeId + "-" + altIdx;
                            if (map.getSource(altSrc)) {
                                map.getSource(altSrc).setData({
                                    type: "Feature",
                                    properties: {},
                                    geometry: {
                                        type: "LineString",
                                        coordinates:
                                            this.routes[i].geometry.coordinates,
                                    },
                                });
                            }
                            altIdx++;
                        }

                        const prevIndex = this.selectedIndex;
                        this.selectedIndex = index;

                        dispatchToLivewire(el, "map:route-list-selected", {
                            routeId: routeId,
                            selectedIndex: index,
                            previousIndex: prevIndex,
                            distance: newPrimary.distance,
                            duration: newPrimary.duration,
                        });
                    },
                });

                // Expose state to Alpine template scope
                Alpine.addScopeToNode(el, { _rl: state });

                // Listen for directions-ready events (bubbles from the
                // x-map-route element up through the DOM)
                const handleReady = (e) => {
                    const detail = e.detail;
                    if (detail.id !== routeId) return;

                    // Lazy map ID resolution: if we still don't have
                    // a mapId, resolve it now that the route has fired
                    if (!mapId) {
                        const routeEl = document.querySelector(
                            `[x-map-route*="'${routeId}'"], [x-map-route*='"${routeId}"']`,
                        );
                        if (routeEl) {
                            const routeMapEl = routeEl.closest("[x-map]");
                            if (routeMapEl) {
                                try {
                                    const mc = evaluate(
                                        routeMapEl.getAttribute("x-map"),
                                    );
                                    mapId = mc.id;
                                } catch (_) {}
                            }
                        }
                        if (!mapId) {
                            const maps = Alpine.store("livewire-mapcn").maps;
                            const ids = Object.keys(maps).filter(
                                (k) => maps[k],
                            );
                            if (ids.length === 1) mapId = ids[0];
                        }
                    }

                    const primary = {
                        geometry: detail.geometry,
                        distance: detail.distance,
                        duration: detail.duration,
                    };
                    const alts = (detail.alternatives || []).map((a) => ({
                        geometry: a.geometry,
                        distance: a.distance,
                        duration: a.duration,
                    }));
                    state.routes = [primary, ...alts];
                    state.selectedIndex = 0;

                    // Show the element now that we have routes
                    el.style.display = "";
                };

                // Also sync when a route is selected on the map layer
                const handleAltSelected = (e) => {
                    const detail = e.detail;
                    if (detail.id !== routeId) return;
                    const newIdx = detail.alternativeIndex ?? 0;
                    if (newIdx !== state.selectedIndex) {
                        state.selectedIndex = newIdx;
                    }
                };

                // Use window-level listeners because the route-list element
                // may not be a descendant of the map element.
                window.addEventListener(
                    "map:route-directions-ready",
                    handleReady,
                );
                window.addEventListener(
                    "map:route-alternative-selected",
                    handleAltSelected,
                );

                cleanup(() => {
                    window.removeEventListener(
                        "map:route-directions-ready",
                        handleReady,
                    );
                    window.removeEventListener(
                        "map:route-alternative-selected",
                        handleAltSelected,
                    );
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
