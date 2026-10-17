/**
 * livewire-mapcn runtime
 *
 * Alpine.js directives that wrap MapLibre GL JS for the livewire-mapcn Blade
 * components. Works with MapLibre v4/v5 (UMD) and v6+ (ESM, exposed on
 * window.maplibregl by the @livewireMapScripts loader).
 */
(function () {
    "use strict";

    const VERSION = "2.0.0";

    // ------------------------------------------------------------------
    // Generic helpers
    // ------------------------------------------------------------------

    // Alpine's reactivity (Vue) skips objects carrying this flag. MapLibre
    // instances must never be wrapped in a reactive proxy: every property
    // access would be tracked, which is slow and breaks private fields.
    function markRaw(obj) {
        if (obj && typeof obj === "object") {
            try {
                Object.defineProperty(obj, "__v_skip", {
                    value: true,
                    configurable: true,
                });
            } catch (_) {}
        }
        return obj;
    }

    function safeCall(fn, ...args) {
        try {
            return fn(...args);
        } catch (error) {
            console.error("[livewire-mapcn]", error);
        }
    }

    // Livewire passes positional params as an array and named params as an
    // object. Normalise both to a plain object.
    function unwrap(data) {
        if (Array.isArray(data)) return data[0] ?? {};
        return data ?? {};
    }

    function throttle(fn, limit) {
        let waiting = false;
        let pendingArgs = null;
        return function (...args) {
            if (waiting) {
                pendingArgs = args;
                return;
            }
            fn.apply(this, args);
            waiting = true;
            setTimeout(() => {
                waiting = false;
                if (pendingArgs) {
                    fn.apply(this, pendingArgs);
                    pendingArgs = null;
                }
            }, limit);
        };
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Replace {property} placeholders with escaped feature property values.
     * {lat} and {lng} resolve to the clicked coordinates.
     */
    function interpolate(template, properties, lngLat) {
        return template.replace(/\{([\w.-]+)\}/g, (match, key) => {
            if (lngLat && key === "lat") return escapeHTML(lngLat[1]);
            if (lngLat && key === "lng") return escapeHTML(lngLat[0]);
            const value = properties ? properties[key] : undefined;
            if (value == null) return "";
            return escapeHTML(
                typeof value === "object" ? JSON.stringify(value) : value,
            );
        });
    }

    function formatLabel(key) {
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .trim();
    }

    const INTERNAL_PROPERTIES = new Set([
        "cluster",
        "cluster_id",
        "point_count",
        "point_count_abbreviated",
    ]);

    function buildPropertiesPopupHTML(properties, primaryProp, lngLat) {
        const title = primaryProp ? properties[primaryProp] : null;
        let rows = "";
        for (const [key, value] of Object.entries(properties || {})) {
            if (
                key === primaryProp ||
                INTERNAL_PROPERTIES.has(key) ||
                value == null ||
                value === ""
            ) {
                continue;
            }
            rows +=
                `<div class="lm-popup-row">` +
                `<span class="lm-popup-label">${escapeHTML(formatLabel(key))}</span>` +
                `<span class="lm-popup-value">${escapeHTML(typeof value === "object" ? JSON.stringify(value) : value)}</span>` +
                `</div>`;
        }
        if (!rows && lngLat) {
            rows =
                `<div class="lm-popup-row"><span class="lm-popup-label">Lat</span><span class="lm-popup-value">${Number(lngLat[1]).toFixed(6)}</span></div>` +
                `<div class="lm-popup-row"><span class="lm-popup-label">Lng</span><span class="lm-popup-value">${Number(lngLat[0]).toFixed(6)}</span></div>`;
        }
        return (
            `<div class="lm-cluster-popup">` +
            (title
                ? `<div class="lm-popup-title">${escapeHTML(title)}</div>`
                : "") +
            (rows ? `<div class="lm-popup-body">${rows}</div>` : "") +
            `</div>`
        );
    }

    /** Build a popup/marker option object, dropping null/undefined values. */
    function compact(obj) {
        const out = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined) out[key] = value;
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Geometry helpers (exposed as LivewireMap.geometry for testing)
    // ------------------------------------------------------------------

    function clamp01(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.min(1, Math.max(0, n));
    }

    /** Cumulative equirectangular length of a LngLat polyline. */
    function measureLine(coords) {
        if (!coords || coords.length < 2) return { cumulative: [], total: 0 };
        const cumulative = [0];
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
            const [lng1, lat1] = coords[i - 1];
            const [lng2, lat2] = coords[i];
            const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
            total += Math.hypot((lng2 - lng1) * Math.cos(midLat), lat2 - lat1);
            cumulative.push(total);
        }
        return { cumulative, total };
    }

    function findSegmentIndex(cumulative, distance) {
        let low = 0;
        let high = cumulative.length - 1;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (cumulative[mid] < distance) low = mid + 1;
            else high = mid;
        }
        return Math.max(0, Math.min(low === 0 ? 0 : low - 1, cumulative.length - 2));
    }

    function pointAtFraction(coords, measure, fraction) {
        if (!coords || !coords.length) return null;
        if (coords.length === 1 || measure.total === 0) return coords[0];
        const target = measure.total * clamp01(fraction);
        const i = findSegmentIndex(measure.cumulative, target);
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        const segment = measure.cumulative[i + 1] - measure.cumulative[i];
        const ratio =
            segment === 0 ? 0 : (target - measure.cumulative[i]) / segment;
        return [lng1 + (lng2 - lng1) * ratio, lat1 + (lat2 - lat1) * ratio];
    }

    /** Heading (degrees clockwise from north) of the segment at `fraction`. */
    function bearingAtFraction(coords, measure, fraction) {
        if (!coords || coords.length < 2 || measure.total === 0) return 0;
        const i = findSegmentIndex(
            measure.cumulative,
            measure.total * clamp01(fraction),
        );
        const [lng1, lat1] = coords[i];
        const [lng2, lat2] = coords[i + 1];
        const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
        const dx = (lng2 - lng1) * Math.cos(midLat);
        const dy = lat2 - lat1;
        return (Math.atan2(dx, dy) * 180) / Math.PI;
    }

    /** The part of the line from its start up to `fraction` of its length. */
    function sliceAtFraction(coords, measure, fraction) {
        if (!coords || coords.length < 2) return [];
        const t = clamp01(fraction);
        if (t <= 0 || measure.total === 0) return [];
        if (t >= 1) return coords;
        const i = findSegmentIndex(measure.cumulative, measure.total * t);
        const traveled = coords.slice(0, i + 1);
        traveled.push(pointAtFraction(coords, measure, t));
        return traveled;
    }

    /**
     * Quadratic Bézier between two LngLat points. The destination longitude
     * is unwrapped so arcs cross the antimeridian the short way.
     */
    function buildArc(from, to, curvature = 0.2, samples = 64) {
        const [x0, y0] = from;
        const [xTo, y2] = to;
        const rawDx = xTo - x0;
        const x2 = rawDx > 180 ? xTo - 360 : rawDx < -180 ? xTo + 360 : xTo;
        const dx = x2 - x0;
        const dy = y2 - y0;
        const distance = Math.hypot(dx, dy);
        if (distance === 0 || !curvature) return [from, [x2, y2]];
        const nx = -dy / distance;
        const ny = dx / distance;
        const offset = distance * curvature;
        const cx = (x0 + x2) / 2 + nx * offset;
        const cy = (y0 + y2) / 2 + ny * offset;
        const segments = Math.max(2, Math.floor(samples));
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const inv = 1 - t;
            points.push([
                inv * inv * x0 + 2 * inv * t * cx + t * t * x2,
                inv * inv * y0 + 2 * inv * t * cy + t * t * y2,
            ]);
        }
        return points;
    }

    /** [[west, south], [east, north]] for any nested coordinate structure. */
    function boundsOf(input) {
        let west = Infinity;
        let south = Infinity;
        let east = -Infinity;
        let north = -Infinity;
        const visit = (node) => {
            if (!node) return;
            if (typeof node[0] === "number" && typeof node[1] === "number") {
                west = Math.min(west, node[0]);
                east = Math.max(east, node[0]);
                south = Math.min(south, node[1]);
                north = Math.max(north, node[1]);
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(visit);
            } else if (node.type === "FeatureCollection") {
                (node.features || []).forEach(visit);
            } else if (node.type === "Feature") {
                visit(node.geometry);
            } else if (node.type === "GeometryCollection") {
                (node.geometries || []).forEach(visit);
            } else if (node.coordinates) {
                visit(node.coordinates);
            }
        };
        visit(input);
        if (!Number.isFinite(west)) return null;
        return [
            [west, south],
            [east, north],
        ];
    }

    /** Wrap paint values in a feature-state "hover" case expression. */
    function mergeHoverPaint(paint, hoverPaint) {
        if (!hoverPaint) return paint;
        const merged = { ...paint };
        for (const [key, hoverValue] of Object.entries(hoverPaint)) {
            if (hoverValue === undefined || hoverValue === null) continue;
            const base = merged[key];
            merged[key] =
                base === undefined
                    ? hoverValue
                    : [
                          "case",
                          ["boolean", ["feature-state", "hover"], false],
                          hoverValue,
                          base,
                      ];
        }
        return merged;
    }

    function lineFeature(coords, properties = {}) {
        return {
            type: "Feature",
            properties,
            geometry: {
                type: "LineString",
                coordinates: coords && coords.length >= 2 ? coords : [],
            },
        };
    }

    // ------------------------------------------------------------------
    // MapLibre loading
    // ------------------------------------------------------------------

    let maplibrePromise = null;

    function whenMapLibre() {
        if (window.maplibregl) return Promise.resolve(window.maplibregl);
        if (maplibrePromise) return maplibrePromise;
        maplibrePromise = new Promise((resolve) => {
            const started = Date.now();
            let warned = false;
            const check = () => {
                if (window.maplibregl) {
                    window.removeEventListener("maplibre:ready", check);
                    clearInterval(timer);
                    resolve(window.maplibregl);
                } else if (!warned && Date.now() - started > 15000) {
                    warned = true;
                    console.warn(
                        "[livewire-mapcn] MapLibre GL JS has not loaded after 15s. Did you include @livewireMapScripts or set window.maplibregl?",
                    );
                }
            };
            const timer = setInterval(check, 50);
            window.addEventListener("maplibre:ready", check);
        });
        return maplibrePromise;
    }

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    /**
     * Dispatch one bubbling DOM event that Alpine (`@map:click`) and
     * Livewire (`#[On('map:click')]`) both receive. Livewire listens on
     * window for events tagged with `__livewire`, so tagging the event lets it
     * through without a second Livewire.dispatch() (which used to deliver
     * every event to window listeners twice).
     */
    function dispatchEvent(el, name, detail) {
        const event = new CustomEvent(name, {
            detail,
            bubbles: true,
            composed: true,
        });
        if (window.Livewire) {
            event.__livewire = { name, params: detail, receivedBy: [] };
        }
        el.dispatchEvent(event);
    }

    /** Subscribe to a Livewire event; returns an unsubscribe function. */
    function onLivewire(name, handler) {
        if (!window.Livewire || typeof window.Livewire.on !== "function") {
            return () => {};
        }
        const off = window.Livewire.on(name, (data) =>
            safeCall(handler, unwrap(data)),
        );
        return typeof off === "function" ? off : () => {};
    }

    // ------------------------------------------------------------------
    // Registries (all non-reactive)
    // ------------------------------------------------------------------

    const contexts = markRaw({}); // mapId -> MapContext
    const mapRegistry = markRaw({}); // mapId -> maplibregl.Map (public, BC)
    const routeRegistry = new Map(); // routeId -> RouteController
    const routeWaiters = new Map(); // routeId -> Set<fn>
    const liveComponents = new Set(); // refresh callbacks run after morphs

    function registerRoute(id, controller) {
        routeRegistry.set(id, controller);
        const waiters = routeWaiters.get(id);
        if (waiters) {
            waiters.forEach((fn) => safeCall(fn, controller));
        }
    }

    function unregisterRoute(id, controller) {
        if (routeRegistry.get(id) === controller) routeRegistry.delete(id);
    }

    /** Call fn(controller) now and whenever a route with this id registers. */
    function withRoute(id, fn) {
        if (!routeWaiters.has(id)) routeWaiters.set(id, new Set());
        routeWaiters.get(id).add(fn);
        if (routeRegistry.has(id)) safeCall(fn, routeRegistry.get(id));
        return () => routeWaiters.get(id)?.delete(fn);
    }

    let livewireHooked = false;
    let refreshQueued = false;

    function refreshLiveComponents() {
        if (refreshQueued) return;
        refreshQueued = true;
        queueMicrotask(() => {
            refreshQueued = false;
            liveComponents.forEach((fn) => safeCall(fn));
        });
    }

    function hookLivewire() {
        if (livewireHooked || !window.Livewire?.hook) return;
        livewireHooked = true;
        try {
            window.Livewire.hook("commit", ({ succeed }) => {
                succeed(() => queueMicrotask(refreshLiveComponents));
            });
        } catch (_) {}
    }

    /**
     * Keep a component in sync with server re-renders. Livewire morphs the
     * data-lm-config attribute / slot templates in place; we diff a signature
     * of them and call onChange when it differs.
     */
    function watchComponent(el, signature, onChange, cleanup) {
        let last = signature();
        const check = () => {
            if (!el.isConnected) return;
            const next = signature();
            if (next === last) return;
            last = next;
            safeCall(onChange);
        };
        let queued = false;
        const schedule = () => {
            if (queued) return;
            queued = true;
            queueMicrotask(() => {
                queued = false;
                check();
            });
        };
        const observer = new MutationObserver(schedule);
        observer.observe(el, {
            attributes: true,
            attributeFilter: ["data-lm-config"],
            subtree: true,
            childList: true,
            characterData: true,
        });
        liveComponents.add(check);
        hookLivewire();
        cleanup(() => {
            observer.disconnect();
            liveComponents.delete(check);
        });
    }

    // ------------------------------------------------------------------
    // Config / template reading
    // ------------------------------------------------------------------

    function parseJSON(raw, fallback) {
        if (raw == null || raw === "") return fallback;
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.error("[livewire-mapcn] Invalid JSON config", error);
            return fallback;
        }
    }

    /**
     * Components render their config as JSON in data-lm-config. Older
     * published views passed an Alpine expression instead; support both.
     */
    function readConfig(el, expression, evaluate, legacyAttr) {
        if (el.hasAttribute("data-lm-config")) {
            return parseJSON(el.getAttribute("data-lm-config"), {});
        }
        if (legacyAttr && el.dataset[legacyAttr]) {
            return parseJSON(el.dataset[legacyAttr], {});
        }
        if (expression) return evaluate(expression) || {};
        return {};
    }

    /** Read a <script type="application/json" data-lm-json="name"> child. */
    function readJSONScript(el, name) {
        const script = el.querySelector(
            `:scope > script[data-lm-json="${name}"]`,
        );
        return script ? parseJSON(script.textContent, undefined) : undefined;
    }

    function jsonScriptText(el, name) {
        const script = el.querySelector(
            `:scope > script[data-lm-json="${name}"]`,
        );
        return script ? script.textContent : "";
    }

    function templateHTML(el, selector) {
        const template = el.querySelector(selector);
        return template ? template.innerHTML.trim() : null;
    }

    function slotTemplate(el, name) {
        return templateHTML(el, `:scope > template[data-lm-slot="${name}"]`);
    }

    function findContext(el) {
        const mapEl = el.closest("[x-map]");
        return mapEl ? mapEl._lmCtx || null : null;
    }

    function isAlive(map) {
        return !!(map && map.style && !map._removed);
    }

    function removeLayers(map, layerIds, sourceIds = []) {
        if (!isAlive(map)) return;
        layerIds.forEach((id) => {
            try {
                if (map.getLayer(id)) map.removeLayer(id);
            } catch (_) {}
        });
        sourceIds.forEach((id) => {
            try {
                if (map.getSource(id)) map.removeSource(id);
            } catch (_) {}
        });
    }

    function resolveBeforeId(map, beforeId) {
        return beforeId && map.getLayer(beforeId) ? beforeId : undefined;
    }

    /** Track delegated layer listeners so they can be removed on cleanup. */
    function createBinder(map) {
        const bindings = [];
        return {
            on(type, layer, fn) {
                map.on(type, layer, fn);
                bindings.push([type, layer, fn]);
            },
            offAll() {
                if (!isAlive(map)) return;
                bindings.forEach(([type, layer, fn]) => {
                    try {
                        map.off(type, layer, fn);
                    } catch (_) {}
                });
                bindings.length = 0;
            },
        };
    }

    function setCursor(map, value) {
        if (isAlive(map)) map.getCanvas().style.cursor = value;
    }

    // ------------------------------------------------------------------
    // Theme detection
    // ------------------------------------------------------------------

    function documentIsDark(followSystem) {
        const html = document.documentElement;
        if (html.classList.contains("dark")) return true;
        if (html.classList.contains("light")) return false;
        const attr =
            html.getAttribute("data-theme") ||
            html.getAttribute("data-flux-appearance");
        if (attr === "dark") return true;
        if (attr === "light") return false;
        return (
            !!followSystem &&
            !!window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        );
    }

    // ------------------------------------------------------------------
    // Directions (OSRM) with request de-duplication and caching
    // ------------------------------------------------------------------

    const directionsCache = new Map();

    function directionsUrl(base, profile, waypoints, alternatives) {
        const coords = waypoints.map((c) => `${c[0]},${c[1]}`).join(";");
        let url = `${String(base || "https://router.project-osrm.org").replace(/\/$/, "")}/route/v1/${profile || "driving"}/${coords}?geometries=geojson&overview=full`;
        if (alternatives) url += "&alternatives=true";
        return url;
    }

    // Requests are shared between routes with the same URL, so they are never
    // aborted; callers drop stale results with their own sequence numbers.
    const DIRECTIONS_TIMEOUT = 10000;

    function storedDirections(url) {
        try {
            const raw = window.sessionStorage?.getItem("lm-osrm:" + url);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function storeDirections(url, routes) {
        try {
            const raw = JSON.stringify(routes);
            // Keep the session cache small; skip unusually long geometries.
            if (raw.length < 400000) window.sessionStorage?.setItem("lm-osrm:" + url, raw);
        } catch (_) {}
    }

    function fetchDirections(url) {
        if (directionsCache.has(url)) return directionsCache.get(url);
        // Survives reloads and wire:navigate within the browser session.
        const stored = storedDirections(url);
        if (stored) {
            const cached = Promise.resolve(stored);
            directionsCache.set(url, cached);
            return cached;
        }
        const controller =
            typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller
            ? setTimeout(() => controller.abort(), DIRECTIONS_TIMEOUT)
            : null;
        const request = fetch(url, controller ? { signal: controller.signal } : {})
            .then((response) => response.json())
            .then((data) => {
                if (data.code !== "Ok" || !data.routes?.length) {
                    throw new Error(
                        data.message || `Directions failed (${data.code})`,
                    );
                }
                const routes = data.routes.map((r) => ({
                    coordinates: r.geometry.coordinates,
                    distance: r.distance,
                    duration: r.duration,
                }));
                storeDirections(url, routes);
                return routes;
            })
            .catch((error) => {
                throw error?.name === "AbortError"
                    ? new Error(`Directions timed out after ${DIRECTIONS_TIMEOUT / 1000}s`)
                    : error;
            })
            .finally(() => timer && clearTimeout(timer));
        directionsCache.set(url, request);
        request.catch(() => directionsCache.delete(url));
        if (directionsCache.size > 100) {
            directionsCache.delete(directionsCache.keys().next().value);
        }
        return request;
    }

    // ------------------------------------------------------------------
    // MapContext: one per <x-map>
    // ------------------------------------------------------------------

    class MapContext {
        constructor(el, id, config) {
            this.el = el;
            this.id = id;
            this.config = config;
            this.map = null;
            this.styleReady = false;
            this.destroyed = false;
            this.isDark = false;
            this._styleHandlers = new Set();
            this._readyResolvers = [];
            this._raiseHooks = new Set();
            this._raiseQueued = false;
            this._cleanups = [];
            this._pendingCommands = [];
            markRaw(this);
        }

        /** Resolves with the map once its first style has loaded. */
        ready() {
            return new Promise((resolve) => {
                if (this.map && this.styleReady) resolve(this.map);
                else this._readyResolvers.push(resolve);
            });
        }

        /** Resolves when the map starts booting (lazy maps: when near the viewport). */
        started() {
            if (!this._startedPromise) {
                this._startedPromise = new Promise((resolve) => (this._markStarted = resolve));
            }
            return this._startedPromise;
        }

        /** Resolves with the map as soon as it is constructed. */
        created() {
            return new Promise((resolve) => {
                if (this.map) resolve(this.map);
                else this._createdResolvers = [...(this._createdResolvers || []), resolve];
            });
        }

        /**
         * Run fn(map) whenever a style is loaded: now (if ready) and again
         * after every setStyle()/theme swap, which wipes custom layers.
         */
        onStyle(fn) {
            this._styleHandlers.add(fn);
            if (this.map && this.styleReady) safeCall(fn, this.map);
            return () => this._styleHandlers.delete(fn);
        }

        /** Register a hook that moves "active" layers to the top. */
        onRaise(fn) {
            this._raiseHooks.add(fn);
            return () => this._raiseHooks.delete(fn);
        }

        queueRaise() {
            if (this._raiseQueued) return;
            this._raiseQueued = true;
            queueMicrotask(() => {
                this._raiseQueued = false;
                if (!isAlive(this.map)) return;
                this._raiseHooks.forEach((fn) => safeCall(fn, this.map));
            });
        }

        dispatch(name, detail = {}) {
            dispatchEvent(this.el, name, { mapId: this.id, ...detail });
        }

        currentStyle() {
            const c = this.config;
            if (c.theme === "dark") {
                this.isDark = true;
                return c.darkStyle;
            }
            if (c.theme === "light") {
                this.isDark = false;
                return c.lightStyle;
            }
            this.isDark = documentIsDark(c.followSystemTheme);
            return this.isDark ? c.darkStyle : c.lightStyle;
        }

        setStyle(style) {
            if (!isAlive(this.map)) return;
            this.styleReady = false;
            // diff:false guarantees a full reload so `style.load` fires and
            // every component re-adds its sources and layers.
            this.map.setStyle(style, { diff: false });
        }

        create(maplibregl) {
            const c = this.config;
            const container =
                this.el.querySelector("[data-lm-canvas]") ||
                this.el.querySelector('[x-ref="mapContainer"]') ||
                this.el;

            const options = compact({
                container,
                style: this.currentStyle(),
                center: c.center,
                zoom: c.zoom,
                minZoom: c.minZoom,
                maxZoom: c.maxZoom,
                minPitch: c.minPitch,
                maxPitch: c.maxPitch,
                bearing: c.bearing,
                pitch: c.pitch,
                interactive: c.interactive,
                scrollZoom: c.scrollZoom,
                doubleClickZoom: c.doubleClickZoom,
                dragPan: c.dragPan,
                dragRotate: c.dragRotate,
                touchZoomRotate: c.touchZoomRotate,
                pitchWithRotate: c.pitchWithRotate,
                cooperativeGestures: c.cooperativeGestures || undefined,
                renderWorldCopies: c.renderWorldCopies,
                maxBounds: c.maxBounds,
                bounds: c.bounds,
                fitBoundsOptions: c.bounds
                    ? { padding: c.boundsPadding ?? 40 }
                    : undefined,
                attributionControl:
                    c.attribution === false
                        ? false
                        : { compact: c.attributionCompact !== false },
                ...(c.options || {}),
            });

            const map = markRaw(new maplibregl.Map(options));
            this.map = map;
            mapRegistry[this.id] = map;

            (this._createdResolvers || []).forEach((fn) => fn(map));
            this._createdResolvers = [];

            map.on("style.load", () => this._onStyleLoad());
            map.on("load", () => {
                this.el.classList.add("lm-loaded");
                this.dispatch("map:loaded", {
                    center: map.getCenter(),
                    zoom: map.getZoom(),
                });
            });
            map.on("error", (e) => {
                if (e && e.error && /Failed to fetch|NetworkError/i.test(String(e.error))) {
                    this.el.classList.add("lm-loaded");
                }
            });

            this._bindEvents(map);
            this._bindTheme();
            this._bindResize(map);
            this._pendingCommands.splice(0).forEach((run) => safeCall(run));
        }

        _onStyleLoad() {
            const map = this.map;
            this.styleReady = true;
            if (this.config.projection && typeof map.setProjection === "function") {
                safeCall(() =>
                    map.setProjection({ type: this.config.projection }),
                );
            }
            this._styleHandlers.forEach((fn) => safeCall(fn, map));
            this._readyResolvers.splice(0).forEach((fn) => fn(map));
            this.queueRaise();
            this.dispatch("map:style-loaded", {
                style: map.getStyle()?.name ?? null,
                dark: this.isDark,
            });
            if (this._styleChangePending) {
                this._styleChangePending = false;
                this.dispatch("map:style-reloaded", {});
            }
        }

        _bindEvents(map) {
            const c = this.config;
            const lngLatDetail = (e) => ({
                lat: e.lngLat.lat,
                lng: e.lngLat.lng,
            });

            map.on("click", (e) =>
                this.dispatch("map:click", {
                    ...lngLatDetail(e),
                    lngLat: { lat: e.lngLat.lat, lng: e.lngLat.lng },
                    point: { x: e.point.x, y: e.point.y },
                }),
            );
            map.on("dblclick", (e) =>
                this.dispatch("map:double-click", lngLatDetail(e)),
            );
            map.on("contextmenu", (e) =>
                this.dispatch("map:right-click", lngLatDetail(e)),
            );

            map.on(
                "zoom",
                throttle(
                    () => this.dispatch("map:zoom", { zoom: map.getZoom() }),
                    100,
                ),
            );
            map.on("zoomend", () =>
                this.dispatch("map:zoom-changed", { zoom: map.getZoom() }),
            );
            map.on(
                "move",
                throttle(() => {
                    const center = map.getCenter();
                    this.dispatch("map:move", {
                        lat: center.lat,
                        lng: center.lng,
                    });
                }, 100),
            );
            map.on("moveend", () => {
                const center = map.getCenter();
                const bounds = map.getBounds();
                this.dispatch("map:center-changed", {
                    lat: center.lat,
                    lng: center.lng,
                });
                this.dispatch("map:bounds-changed", {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                });
                this.dispatch("map:viewport-changed", {
                    center: [center.lng, center.lat],
                    zoom: map.getZoom(),
                    bearing: map.getBearing(),
                    pitch: map.getPitch(),
                });
            });
            map.on("dragend", () => {
                const center = map.getCenter();
                this.dispatch("map:drag-end", {
                    lat: center.lat,
                    lng: center.lng,
                    zoom: map.getZoom(),
                });
            });
            map.on(
                "rotate",
                throttle(
                    () =>
                        this.dispatch("map:bearing-changed", {
                            bearing: map.getBearing(),
                        }),
                    100,
                ),
            );
            map.on(
                "pitch",
                throttle(
                    () =>
                        this.dispatch("map:pitch-changed", {
                            pitch: map.getPitch(),
                        }),
                    100,
                ),
            );

            const builtIn = new Set([
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
                "load",
                "style.load",
            ]);
            (Array.isArray(c.customEvents) ? c.customEvents : []).forEach(
                (eventName) => {
                    if (builtIn.has(eventName)) return;
                    map.on(eventName, (e) =>
                        this.dispatch(`map:${eventName}`, extractEventData(e || {})),
                    );
                },
            );
        }

        _bindTheme() {
            const update = () => {
                // Checked here so `map:set-theme` can switch to/from auto.
                if (this.config.theme !== "auto") return;
                const wasDark = this.isDark;
                const style = this.currentStyle();
                if (wasDark !== this.isDark) {
                    this.setStyle(style);
                    this.dispatch("map:theme-changed", { dark: this.isDark });
                }
            };
            const observer = new MutationObserver(update);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["class", "data-theme", "data-flux-appearance"],
            });
            this._cleanups.push(() => observer.disconnect());

            if (window.matchMedia) {
                const media = window.matchMedia("(prefers-color-scheme: dark)");
                media.addEventListener("change", update);
                this._cleanups.push(() =>
                    media.removeEventListener("change", update),
                );
            }
        }

        _bindResize(map) {
            let frame = null;
            const observer = new ResizeObserver(() => {
                if (frame) return;
                frame = requestAnimationFrame(() => {
                    frame = null;
                    if (isAlive(map)) map.resize();
                });
            });
            observer.observe(this.el);
            this._cleanups.push(() => {
                observer.disconnect();
                if (frame) cancelAnimationFrame(frame);
            });
        }

        _bindLivewire() {
            // Commands may target one map with `mapId`; without it they apply
            // to every map on the page (the v1 behaviour).
            const command = (name, fn) => {
                this._cleanups.push(
                    onLivewire(name, (payload) => {
                        if (payload.mapId && payload.mapId !== this.id) return;
                        const { mapId, ...rest } = payload;
                        const run = () => {
                            const map = this.map;
                            if (isAlive(map)) fn(rest, map);
                        };
                        // A lazy map that hasn't started yet replays the
                        // command once it is created.
                        if (this.map) run();
                        else this._pendingCommands.push(run);
                    }),
                );
            };

            command("map:fly-to", (p, map) => map.flyTo(p));
            command("map:jump-to", (p, map) => map.jumpTo(p));
            command("map:ease-to", (p, map) => map.easeTo(p));
            command("map:fit-bounds", ({ bounds, ...options }, map) => {
                if (!bounds) return;
                map.fitBounds(bounds, compact({ padding: 40, ...options }));
            });
            command("map:set-zoom", (p, map) => map.setZoom(p.zoom));
            command("map:set-center", (p, map) => map.setCenter(p.center));
            command("map:set-bearing", (p, map) => map.setBearing(p.bearing));
            command("map:set-pitch", (p, map) => map.setPitch(p.pitch));
            command("map:set-style", (p, map) => {
                if (!p.style) return;
                this._styleChangePending = true;
                this.setStyle(p.style);
            });
            command("map:set-theme", (p, map) => {
                if (!["light", "dark", "auto"].includes(p.theme)) return;
                this.config.theme = p.theme;
                const wasDark = this.isDark;
                const style = this.currentStyle();
                if (wasDark !== this.isDark) this.setStyle(style);
            });
            command("map:resize", (_, map) => map.resize());
            command("map:call", ({ method, args = [] }, map) => {
                if (
                    method &&
                    typeof map[method] === "function" &&
                    !method.startsWith("_")
                ) {
                    map[method](...(Array.isArray(args) ? args : [args]));
                }
            });
        }

        destroy() {
            this.destroyed = true;
            this._cleanups.splice(0).forEach((fn) => safeCall(fn));
            if (this.map) {
                safeCall(() => this.map.remove());
            }
            this._styleHandlers.clear();
            this._raiseHooks.clear();
            if (contexts[this.id] === this) {
                delete contexts[this.id];
                delete mapRegistry[this.id];
            }
        }
    }

    function extractEventData(e) {
        const out = {};
        if (e.lngLat) {
            out.lat = e.lngLat.lat;
            out.lng = e.lngLat.lng;
        }
        if (e.point) out.point = { x: e.point.x, y: e.point.y };
        if (e.features) {
            out.features = e.features.map((f) => ({
                id: f.id,
                properties: f.properties,
                geometry: f.geometry,
            }));
        }
        if (e.dataType) out.dataType = e.dataType;
        if (e.sourceId) out.sourceId = e.sourceId;
        if (e.isSourceLoaded !== undefined) out.isSourceLoaded = e.isSourceLoaded;
        if (e.style) out.style = true;
        if (e.error) out.error = String(e.error);
        return out;
    }

    // ------------------------------------------------------------------
    // Markers (shared by <x-map-marker> and <x-map-route-marker>)
    // ------------------------------------------------------------------

    function markerSignature(el) {
        return [
            el.getAttribute("data-lm-config"),
            templateHTML(el, 'template[x-ref="markerContent"]'),
            templateHTML(el, 'template[x-ref="markerLabel"]'),
            templateHTML(el, 'template[x-ref="markerPopup"]'),
            templateHTML(el, 'template[x-ref="markerTooltip"]'),
            el.querySelector("[data-lm-marker-popup]")?.getAttribute("data-lm-config"),
            el.querySelector("[data-lm-marker-tooltip]")?.getAttribute("data-lm-config"),
        ].join("\u0000");
    }

    function subConfig(el, dataAttr, legacyAttr, evaluate) {
        const node =
            el.querySelector(`[${dataAttr}]`) || el.querySelector(`[${legacyAttr}]`);
        if (!node) return null;
        if (node.hasAttribute("data-lm-config")) {
            return parseJSON(node.getAttribute("data-lm-config"), {});
        }
        const expression = node.getAttribute(legacyAttr);
        return expression ? evaluate(expression) || {} : {};
    }

    /**
     * Creates a MapLibre marker whose element, label, popup and tooltip are
     * rendered from the component's <template> slots, and keeps it in sync.
     */
    function createMarkerController(ctx, el, evaluate, getConfig, getLngLat) {
        const maplibregl = window.maplibregl;
        const map = ctx.map;
        let config = getConfig();

        const wrapper = document.createElement("div");
        wrapper.className = "lm-marker";
        let contentHTML = null;
        let labelHTML = null;

        const renderContent = () => {
            const nextContent = templateHTML(
                el,
                'template[x-ref="markerContent"]',
            );
            const nextLabel = templateHTML(el, 'template[x-ref="markerLabel"]');
            if (nextContent === contentHTML && nextLabel === labelHTML) return;
            contentHTML = nextContent;
            labelHTML = nextLabel;
            wrapper.innerHTML =
                (contentHTML ??
                    `<div class="lm-marker-dot" style="background-color:${escapeHTML(config.color || "#1A56DB")}"></div>`) +
                (labelHTML ?? "");
        };
        renderContent();

        const lngLat = getLngLat();
        const marker = new maplibregl.Marker(
            compact({
                element: wrapper,
                draggable: !!config.draggable,
                anchor: config.anchor || "bottom",
                offset: config.offset,
                rotation: config.rotation,
                rotationAlignment: config.rotationAlignment,
                pitchAlignment: config.pitchAlignment,
                className: config.markerClass || undefined,
                opacity: config.opacity != null ? String(config.opacity) : undefined,
            }),
        );
        if (lngLat) marker.setLngLat(lngLat).addTo(map);
        markRaw(marker);

        const eventDetail = () => {
            const ll = marker.getLngLat();
            return { id: config.id, lat: ll.lat, lng: ll.lng };
        };

        // ---- popup ----
        let popup = null;
        let popupKey = null;
        const syncPopup = () => {
            const popupConfig = subConfig(
                el,
                "data-lm-marker-popup",
                "x-map-marker-popup",
                evaluate,
            );
            const html = templateHTML(el, 'template[x-ref="markerPopup"]');
            const key = popupConfig ? JSON.stringify(popupConfig) : null;
            if (!popupConfig || html == null) {
                if (popup) {
                    popup._lmSilent = true;
                    marker.setPopup(null);
                    popup = null;
                    popupKey = null;
                }
                return;
            }
            if (popup && key === popupKey) {
                popup.setHTML(html);
                return;
            }
            const wasOpen = popup?.isOpen();
            if (popup) {
                popup._lmSilent = true;
                marker.setPopup(null);
            }
            popupKey = key;
            popup = markRaw(
                new maplibregl.Popup(
                    compact({
                        maxWidth: popupConfig.maxWidth || "300px",
                        closeButton: popupConfig.closeButton !== false,
                        closeOnClick: popupConfig.closeOnClickMap !== false,
                        closeOnMove: !!popupConfig.closeOnMove,
                        anchor: popupConfig.anchor || undefined,
                        offset: popupConfig.offset ?? 16,
                        className: "lm-popup-container",
                    }),
                ).setHTML(html),
            );
            popup.on("open", () =>
                ctx.dispatch("map:marker-popup-open", { id: config.id }),
            );
            popup.on("close", () => {
                if (!popup?._lmSilent) {
                    ctx.dispatch("map:marker-popup-close", { id: config.id });
                }
            });
            marker.setPopup(popup);
            if (wasOpen) marker.togglePopup();
        };

        // ---- tooltip ----
        let tooltip = null;
        let tooltipKey = null;
        const syncTooltip = () => {
            const tooltipConfig = subConfig(
                el,
                "data-lm-marker-tooltip",
                "x-map-marker-tooltip",
                evaluate,
            );
            const html = templateHTML(el, 'template[x-ref="markerTooltip"]');
            const key = tooltipConfig && html != null ? JSON.stringify(tooltipConfig) : null;
            if (tooltip && key === tooltipKey) {
                tooltip.setHTML(html); // keep it open mid-hover
                return;
            }
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
            tooltipKey = key;
            if (!key) return;
            tooltip = markRaw(
                new maplibregl.Popup(
                    compact({
                        closeButton: false,
                        closeOnClick: false,
                        className: "lm-tooltip-popup",
                        anchor: tooltipConfig.anchor || undefined,
                        offset: tooltipConfig.offset ?? 16,
                    }),
                ).setHTML(html),
            );
        };

        const onEnter = () => {
            if (tooltip && !popup?.isOpen()) {
                tooltip.setLngLat(marker.getLngLat()).addTo(map);
            }
            ctx.dispatch("map:marker-mouseenter", eventDetail());
        };
        const onLeave = () => {
            if (tooltip) tooltip.remove();
            ctx.dispatch("map:marker-mouseleave", { id: config.id });
        };
        const onClick = () => {
            if (tooltip) tooltip.remove();
            ctx.dispatch("map:marker-clicked", eventDetail());
        };
        wrapper.addEventListener("mouseenter", onEnter);
        wrapper.addEventListener("mouseleave", onLeave);
        wrapper.addEventListener("click", onClick);

        marker.on("dragstart", () => {
            if (tooltip) tooltip.remove();
            ctx.dispatch("map:marker-drag-start", eventDetail());
        });
        marker.on(
            "drag",
            throttle(() => ctx.dispatch("map:marker-drag", eventDetail()), 50),
        );
        marker.on("dragend", () =>
            ctx.dispatch("map:marker-drag-end", eventDetail()),
        );

        syncPopup();
        syncTooltip();

        return {
            marker,
            setLngLat(ll) {
                if (!ll) {
                    marker.remove();
                    return;
                }
                marker.setLngLat(ll);
                if (!marker._map) marker.addTo(map);
                if (tooltip?.isOpen()) tooltip.setLngLat(ll);
            },
            update() {
                config = getConfig();
                renderContent();
                marker.setDraggable(!!config.draggable);
                if (config.offset) marker.setOffset(config.offset);
                if (config.rotation != null && !config.alignToRoute) {
                    marker.setRotation(config.rotation);
                }
                if (config.alignToRoute) {
                    marker.setRotationAlignment("map");
                } else if (config.rotationAlignment) {
                    marker.setRotationAlignment(config.rotationAlignment);
                }
                if (config.opacity != null) marker.setOpacity(String(config.opacity));
                if (config.pitchAlignment) {
                    marker.setPitchAlignment(config.pitchAlignment);
                }
                syncPopup();
                syncTooltip();
            },
            destroy() {
                wrapper.removeEventListener("mouseenter", onEnter);
                wrapper.removeEventListener("mouseleave", onLeave);
                wrapper.removeEventListener("click", onClick);
                if (tooltip) tooltip.remove();
                if (popup) popup.remove();
                marker.remove();
            },
        };
    }

    // ------------------------------------------------------------------
    // Route controller (<x-map-route>)
    // ------------------------------------------------------------------

    function createRouteController(ctx, el, initialConfig) {
        const uid = initialConfig.id;
        const ids = {
            source: `route-${uid}`,
            layer: `route-layer-${uid}`,
            progressSource: `route-progress-${uid}`,
            progressLayer: `route-progress-layer-${uid}`,
            stopsSource: `route-stops-source-${uid}`,
            stopsLayer: `route-stops-${uid}`,
            altSource: (i) => `route-alt-${uid}-${i}`,
            altLayer: (i) => `route-alt-layer-${uid}-${i}`,
        };

        let baseConfig = initialConfig;
        let overrides = {};
        const cfg = () => ({ ...baseConfig, ...overrides });

        let routes = []; // [{coordinates, distance, duration}]
        let primary = 0;
        let coords = [];
        let measure = measureLine([]);
        let progress =
            initialConfig.progress != null ? clamp01(initialConfig.progress) : null;
        let drawFraction = 1;
        let altCount = 0;
        let hovered = false;
        let fetchSeq = 0;
        let growFrame = null;
        let progressFrame = null;
        let progressTarget = null;
        let lastJump = null; // {from, at}: progress set instantly by a morph
        let hasAnimated = false;
        let destroyed = false;
        const boundAltLayers = new Set();
        const listeners = new Set();
        const markers = new Set();
        let binder = null;

        const map = () => (isAlive(ctx.map) ? ctx.map : null);

        // ---------- paint ----------
        function primaryPaint() {
            const c = cfg();
            const active = !!c.active;
            const color = active
                ? c.activeColor || c.color
                : hovered && c.hoverColor
                  ? c.hoverColor
                  : c.color;
            return {
                "line-color": color,
                "line-width": active ? c.activeWidth ?? c.width : c.width,
                "line-opacity": active
                    ? c.activeOpacity ?? c.opacity
                    : c.opacity,
                "line-dasharray": active
                    ? c.activeDashArray ?? c.dashArray ?? null
                    : c.dashArray ?? null,
            };
        }

        function progressPaint() {
            const c = cfg();
            const base = primaryPaint();
            return {
                "line-color": c.progressColor || base["line-color"],
                "line-width": c.progressWidth ?? base["line-width"],
                "line-opacity": c.progressOpacity ?? 1,
                "line-dasharray": c.progressDashArray ?? null,
            };
        }

        function altPaint() {
            const c = cfg();
            return {
                "line-color": c.alternativeColor,
                "line-width": c.alternativeWidth,
                "line-opacity": c.alternativeOpacity,
            };
        }

        function applyPaint(m, layerId, paint) {
            if (!m.getLayer(layerId)) return;
            for (const [key, value] of Object.entries(paint)) {
                safeCall(() => m.setPaintProperty(layerId, key, value));
            }
        }

        function withoutNull(paint) {
            return compact(paint);
        }

        // ---------- data ----------
        function visibleCoords() {
            return drawFraction >= 1
                ? coords
                : sliceAtFraction(coords, measure, drawFraction);
        }

        function altIndexes() {
            const c = cfg();
            if (!c.alternatives || routes.length < 2) return [];
            const out = [];
            for (let i = 0; i < routes.length; i++) {
                if (i !== primary) out.push(i);
            }
            return out.slice(0, Math.max(0, c.maxAlternatives ?? 2));
        }

        function stopsData() {
            const waypoints = cfg().coordinates || [];
            return {
                type: "FeatureCollection",
                features: waypoints.map((c, index) => ({
                    type: "Feature",
                    properties: { index },
                    geometry: { type: "Point", coordinates: c },
                })),
            };
        }

        function setSourceData(m, id, data) {
            const source = m.getSource(id);
            if (source) source.setData(data);
        }

        // ---------- rendering ----------
        function render(m) {
            const c = cfg();
            const before = resolveBeforeId(m, c.beforeId);
            const layout = {
                "line-join": c.lineJoin || "round",
                "line-cap": c.lineCap || "round",
            };

            // Alternative routes sit below the primary line.
            const alts = altIndexes();
            alts.forEach((routeIndex, slot) => {
                const sourceId = ids.altSource(slot);
                const layerId = ids.altLayer(slot);
                const data = lineFeature(routes[routeIndex].coordinates, {
                    routeIndex,
                });
                if (!m.getSource(sourceId)) {
                    m.addSource(sourceId, { type: "geojson", data });
                } else {
                    setSourceData(m, sourceId, data);
                }
                if (!m.getLayer(layerId)) {
                    m.addLayer(
                        {
                            id: layerId,
                            type: "line",
                            source: sourceId,
                            layout,
                            paint: altPaint(),
                        },
                        m.getLayer(ids.layer) ? ids.layer : before,
                    );
                }
                bindAltLayer(m, layerId);
            });
            for (let slot = alts.length; slot < altCount; slot++) {
                removeLayers(m, [ids.altLayer(slot)], [ids.altSource(slot)]);
            }
            altCount = alts.length;

            if (!m.getSource(ids.source)) {
                m.addSource(ids.source, {
                    type: "geojson",
                    data: lineFeature(visibleCoords()),
                });
            }
            if (!m.getLayer(ids.layer)) {
                m.addLayer(
                    {
                        id: ids.layer,
                        type: "line",
                        source: ids.source,
                        layout,
                        paint: withoutNull(primaryPaint()),
                    },
                    before,
                );
            }

            if (progress != null) {
                const data = lineFeature(sliceAtFraction(coords, measure, progress));
                if (!m.getSource(ids.progressSource)) {
                    m.addSource(ids.progressSource, { type: "geojson", data });
                } else {
                    setSourceData(m, ids.progressSource, data);
                }
                if (!m.getLayer(ids.progressLayer)) {
                    m.addLayer(
                        {
                            id: ids.progressLayer,
                            type: "line",
                            source: ids.progressSource,
                            layout,
                            paint: withoutNull(progressPaint()),
                        },
                        before,
                    );
                }
            } else {
                removeLayers(m, [ids.progressLayer], [ids.progressSource]);
            }

            if (c.withStops && (c.coordinates || []).length) {
                if (!m.getSource(ids.stopsSource)) {
                    m.addSource(ids.stopsSource, {
                        type: "geojson",
                        data: stopsData(),
                    });
                } else {
                    setSourceData(m, ids.stopsSource, stopsData());
                }
                if (!m.getLayer(ids.stopsLayer)) {
                    m.addLayer(
                        {
                            id: ids.stopsLayer,
                            type: "circle",
                            source: ids.stopsSource,
                            paint: {
                                "circle-radius": Math.max(4, (c.width || 4) * 1.25),
                                "circle-color": c.stopColor || c.color,
                                "circle-stroke-width": 2,
                                "circle-stroke-color": "#ffffff",
                            },
                        },
                        before,
                    );
                }
            } else {
                removeLayers(m, [ids.stopsLayer], [ids.stopsSource]);
            }

            ctx.queueRaise();
        }

        function raise(m) {
            const c = cfg();
            if (!c.active) return;
            const before = resolveBeforeId(m, c.beforeId);
            [ids.layer, ids.progressLayer, ids.stopsLayer].forEach((id) => {
                if (m.getLayer(id)) m.moveLayer(id, before);
            });
        }

        function updateSources() {
            const m = map();
            if (!m || !ctx.styleReady) return;
            // render() only adds what is missing; existing sources still need
            // their data refreshed below.
            if (!m.getSource(ids.source) || altCount !== altIndexes().length) {
                render(m);
            }
            setSourceData(m, ids.source, lineFeature(visibleCoords()));
            altIndexes().forEach((routeIndex, slot) =>
                setSourceData(
                    m,
                    ids.altSource(slot),
                    lineFeature(routes[routeIndex].coordinates, { routeIndex }),
                ),
            );
            setSourceData(m, ids.stopsSource, stopsData());
            updateProgressSource();
        }

        function updateProgressSource() {
            const m = map();
            if (!m || !ctx.styleReady) return;
            if (progress == null) {
                removeLayers(m, [ids.progressLayer], [ids.progressSource]);
                return;
            }
            if (!m.getSource(ids.progressSource)) {
                render(m);
                return;
            }
            setSourceData(
                m,
                ids.progressSource,
                lineFeature(sliceAtFraction(coords, measure, progress)),
            );
        }

        function refreshPaint() {
            const m = map();
            if (!m || !ctx.styleReady) return;
            applyPaint(m, ids.layer, primaryPaint());
            applyPaint(m, ids.progressLayer, progressPaint());
            for (let slot = 0; slot < altCount; slot++) {
                applyPaint(m, ids.altLayer(slot), altPaint());
            }
            const c = cfg();
            applyPaint(m, ids.stopsLayer, { "circle-color": c.stopColor || c.color });
            ctx.queueRaise();
        }

        // ---------- interaction ----------
        function bindPrimary(m) {
            binder = createBinder(m);
            if (!cfg().clickable) return;
            binder.on("click", ids.layer, (e) => {
                ctx.dispatch("map:route-clicked", {
                    id: uid,
                    lat: e.lngLat.lat,
                    lng: e.lngLat.lng,
                    coordinates: { lat: e.lngLat.lat, lng: e.lngLat.lng },
                    point: { x: e.point.x, y: e.point.y },
                });
            });
            binder.on("mouseenter", ids.layer, () => {
                setCursor(m, "pointer");
                hovered = true;
                if (cfg().hoverColor) refreshPaint();
                ctx.dispatch("map:route-mouseenter", { id: uid });
            });
            binder.on("mouseleave", ids.layer, () => {
                setCursor(m, "");
                hovered = false;
                if (cfg().hoverColor) refreshPaint();
                ctx.dispatch("map:route-mouseleave", { id: uid });
            });
        }

        function bindAltLayer(m, layerId) {
            if (boundAltLayers.has(layerId) || !binder || !cfg().clickable) {
                return;
            }
            boundAltLayers.add(layerId);
            binder.on("click", layerId, (e) => {
                const index = e.features?.[0]?.properties?.routeIndex;
                if (typeof index === "number") controller.selectRoute(index);
            });
            binder.on("mouseenter", layerId, () => setCursor(m, "pointer"));
            binder.on("mouseleave", layerId, () => setCursor(m, ""));
        }

        // ---------- state changes ----------
        function emit() {
            const snapshot = controller.snapshot();
            listeners.forEach((fn) => safeCall(fn, snapshot));
        }

        function updateMarkers() {
            markers.forEach((fn) => safeCall(fn));
        }

        function setCoords(next) {
            coords = next || [];
            measure = measureLine(coords);
            updateSources();
            updateMarkers();
        }

        function setRoutes(next, primaryIndex = 0) {
            routes = next;
            primary = Math.min(primaryIndex, Math.max(0, routes.length - 1));
            setCoords(routes[primary]?.coordinates || []);
            emit();
        }

        async function resolve() {
            const c = cfg();
            const waypoints = c.coordinates || [];
            const seq = ++fetchSeq;

            if (!c.fetchDirections || waypoints.length < 2) {
                setRoutes([
                    { coordinates: waypoints, distance: null, duration: null },
                ]);
                maybeAnimate();
                return;
            }

            try {
                const result = await fetchDirections(
                    directionsUrl(
                        c.directionsUrl,
                        c.directionsProfile,
                        waypoints,
                        c.alternatives,
                    ),
                );
                if (seq !== fetchSeq || destroyed) return;
                setRoutes(result);
                const primaryRoute = result[0];
                ctx.dispatch("map:route-directions-ready", {
                    id: uid,
                    geometry: {
                        type: "LineString",
                        coordinates: primaryRoute.coordinates,
                    },
                    distance: primaryRoute.distance,
                    duration: primaryRoute.duration,
                    alternatives: result.slice(1).map((r) => ({
                        geometry: { type: "LineString", coordinates: r.coordinates },
                        distance: r.distance,
                        duration: r.duration,
                    })),
                });
                maybeAnimate();
            } catch (error) {
                if (seq !== fetchSeq || destroyed || error?.name === "AbortError") {
                    return;
                }
                // Fall back to straight lines between the waypoints.
                setRoutes([
                    { coordinates: waypoints, distance: null, duration: null },
                ]);
                ctx.dispatch("map:route-directions-error", {
                    id: uid,
                    message: error?.message || String(error),
                });
            }
        }

        function maybeAnimate() {
            if (cfg().animate && !hasAnimated) {
                hasAnimated = true;
                controller.animate();
            }
        }

        // ---------- public controller ----------
        const controller = {
            id: uid,
            ctx,
            snapshot() {
                return {
                    routes: routes.map((r) => ({
                        geometry: { type: "LineString", coordinates: r.coordinates },
                        distance: r.distance,
                        duration: r.duration,
                    })),
                    selectedIndex: primary,
                };
            },
            subscribe(fn) {
                listeners.add(fn);
                safeCall(fn, controller.snapshot());
                return () => listeners.delete(fn);
            },
            onChange(fn) {
                markers.add(fn);
                return () => markers.delete(fn);
            },
            pointAt(at) {
                if (!coords.length) return null;
                if (at === "start") return coords[0];
                if (at === "end") return coords[coords.length - 1];
                if (at === "progress" || at == null) {
                    return progress == null
                        ? null
                        : pointAtFraction(coords, measure, progress);
                }
                const fraction = Number(at);
                return Number.isFinite(fraction)
                    ? pointAtFraction(coords, measure, fraction)
                    : null;
            },
            bearingAt(at) {
                const fraction =
                    at === "start"
                        ? 0
                        : at === "end"
                          ? 1
                          : at === "progress" || at == null
                            ? progress ?? 0
                            : Number(at);
                return bearingAtFraction(coords, measure, fraction);
            },
            selectRoute(index) {
                if (index === primary || index < 0 || index >= routes.length) {
                    return;
                }
                const previous = primary;
                primary = index;
                setCoords(routes[index].coordinates);
                const route = routes[index];
                ctx.dispatch("map:route-alternative-selected", {
                    id: uid,
                    alternativeIndex: index,
                    previousIndex: previous,
                    geometry: { type: "LineString", coordinates: route.coordinates },
                    distance: route.distance,
                    duration: route.duration,
                });
                emit();
            },
            setProgress(value, duration = 0) {
                if (progressFrame) cancelAnimationFrame(progressFrame);
                progressFrame = null;
                if (value == null) {
                    progress = null;
                    updateProgressSource();
                    updateMarkers();
                    return;
                }
                const target = clamp01(value);
                let from = progress ?? 0;
                // A server update can set the same target just before the
                // animated command arrives; animate from the pre-jump value.
                if (
                    duration > 0 &&
                    Math.abs(from - target) < 1e-9 &&
                    lastJump &&
                    performance.now() - lastJump.at < 1500
                ) {
                    from = lastJump.from;
                }
                lastJump = null;
                progressTarget = duration > 0 ? target : null;
                if (!duration || duration <= 0) {
                    progress = target;
                    updateProgressSource();
                    updateMarkers();
                    return;
                }
                const start = performance.now();
                const step = (now) => {
                    const t = Math.min(1, (now - start) / duration);
                    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                    progress = from + (target - from) * eased;
                    updateProgressSource();
                    updateMarkers();
                    progressFrame = t < 1 ? requestAnimationFrame(step) : null;
                    if (!progressFrame) progressTarget = null;
                };
                progressFrame = requestAnimationFrame(step);
            },
            /** Draw the line from start to end over `duration` ms. */
            animate(duration) {
                if (growFrame) cancelAnimationFrame(growFrame);
                const total = duration || cfg().animateDuration || 2000;
                const start = performance.now();
                drawFraction = 0;
                const step = (now) => {
                    drawFraction = Math.min(1, (now - start) / total);
                    const m = map();
                    if (m && ctx.styleReady) {
                        setSourceData(m, ids.source, lineFeature(visibleCoords()));
                    }
                    growFrame = drawFraction < 1 ? requestAnimationFrame(step) : null;
                };
                growFrame = requestAnimationFrame(step);
            },
            fitBounds(options = {}) {
                const m = map();
                const bounds = boundsOf(coords.length ? coords : cfg().coordinates);
                if (m && bounds) {
                    m.fitBounds(bounds, { padding: 50, ...options });
                }
            },
            updateConfig(next) {
                const previous = cfg();
                // A server value that changed takes over from an earlier
                // `map:update-route-data` override of the same key.
                for (const key of Object.keys(overrides)) {
                    if (JSON.stringify(next[key]) !== JSON.stringify(baseConfig[key])) {
                        delete overrides[key];
                    }
                }
                baseConfig = { ...next, id: uid };
                const current = cfg();
                if (
                    JSON.stringify(previous.coordinates) !==
                        JSON.stringify(current.coordinates) ||
                    previous.fetchDirections !== current.fetchDirections ||
                    previous.directionsProfile !== current.directionsProfile ||
                    previous.alternatives !== current.alternatives
                ) {
                    resolve();
                } else if (previous.maxAlternatives !== current.maxAlternatives) {
                    updateSources();
                }
                const nextProgress = current.progress ?? null;
                if ((previous.progress ?? null) !== nextProgress) {
                    const tweeningThere =
                        progressFrame &&
                        nextProgress != null &&
                        Math.abs(progressTarget - clamp01(nextProgress)) < 1e-9;
                    if (!tweeningThere) {
                        const before = progress;
                        controller.setProgress(
                            nextProgress,
                            current.progressDuration || 0,
                        );
                        if (!current.progressDuration) {
                            lastJump = { from: before ?? 0, at: performance.now() };
                        }
                    }
                }
                if (previous.withStops !== current.withStops) {
                    const m = map();
                    if (m && ctx.styleReady) render(m);
                }
                refreshPaint();
            },
            /** Handle `map:update-route-data-{id}` payloads (v1 API). */
            applyUpdate(payload) {
                const { coordinates, progress: p, progressDuration, ...rest } = payload;
                const style = {};
                for (const key of [
                    "color",
                    "width",
                    "opacity",
                    "active",
                    "activeColor",
                    "activeWidth",
                    "activeOpacity",
                    "dashArray",
                    "hoverColor",
                    "directionsProfile",
                    "fetchDirections",
                    "progressColor",
                    "progressWidth",
                    "progressOpacity",
                ]) {
                    if (rest[key] !== undefined) style[key] = rest[key];
                }
                overrides = { ...overrides, ...style };
                if (coordinates) {
                    overrides.coordinates = coordinates;
                    resolve();
                }
                if (p !== undefined) controller.setProgress(p, progressDuration || 0);
                refreshPaint();
                ctx.dispatch("map:route-updated", { id: uid });
            },
            init() {
                controller._offRaise = ctx.onRaise(raise);
                ctx.created().then((m) => {
                    if (destroyed) return;
                    bindPrimary(m);
                    // Delegated layer listeners survive style swaps, so only
                    // sources/layers need re-adding on each style load.
                    controller._offStyle = ctx.onStyle(render);
                });
                // Fetch directions in parallel with MapLibre loading, but only
                // once this map is actually starting (lazy maps wait).
                ctx.started().then(() => {
                    if (!destroyed) return resolve();
                }).then(() => {
                    if (!destroyed && cfg().fitBounds) {
                        ctx.ready().then(() => controller.fitBounds());
                    }
                });
            },
            destroy() {
                destroyed = true;
                if (growFrame) cancelAnimationFrame(growFrame);
                if (progressFrame) cancelAnimationFrame(progressFrame);
                controller._offStyle?.();
                controller._offRaise?.();
                binder?.offAll();
                const m = map();
                const altLayers = [];
                const altSources = [];
                for (let slot = 0; slot < altCount; slot++) {
                    altLayers.push(ids.altLayer(slot));
                    altSources.push(ids.altSource(slot));
                }
                removeLayers(
                    m,
                    [ids.stopsLayer, ids.progressLayer, ids.layer, ...altLayers],
                    [ids.stopsSource, ids.progressSource, ids.source, ...altSources],
                );
                listeners.clear();
                markers.clear();
            },
        };

        return controller;
    }

    // ------------------------------------------------------------------
    // Feature hover helper (arcs + GeoJSON)
    // ------------------------------------------------------------------

    function createHover(map, sourceId) {
        let hoveredId = null;
        const set = (id, value) => {
            if (id == null || !map.getSource(sourceId)) return;
            safeCall(() =>
                map.setFeatureState({ source: sourceId, id }, { hover: value }),
            );
        };
        return {
            enter(id) {
                if (id === hoveredId) return false;
                set(hoveredId, false);
                hoveredId = id;
                set(hoveredId, true);
                return true;
            },
            leave() {
                const had = hoveredId != null;
                set(hoveredId, false);
                hoveredId = null;
                return had;
            },
            reset() {
                hoveredId = null;
            },
        };
    }

    function createFeaturePopups(map, el) {
        let tooltip = null;
        let popup = null;
        const ml = window.maplibregl;
        return {
            showTooltip(lngLat, properties) {
                const template = slotTemplate(el, "tooltip");
                if (!template) return;
                if (!tooltip) {
                    tooltip = markRaw(
                        new ml.Popup({
                            closeButton: false,
                            closeOnClick: false,
                            className: "lm-tooltip-popup",
                            offset: 12,
                        }),
                    );
                }
                tooltip
                    .setLngLat(lngLat)
                    .setHTML(interpolate(template, properties, lngLat));
                if (!tooltip.isOpen()) tooltip.addTo(map);
            },
            hideTooltip() {
                tooltip?.remove();
            },
            showPopup(lngLat, properties) {
                const template = slotTemplate(el, "popup");
                if (!template) return;
                if (!popup) {
                    popup = markRaw(
                        new ml.Popup({
                            maxWidth: "320px",
                            offset: 8,
                            className: "lm-popup-container",
                        }),
                    );
                }
                popup
                    .setLngLat(lngLat)
                    .setHTML(interpolate(template, properties, lngLat));
                if (!popup.isOpen()) popup.addTo(map);
            },
            destroy() {
                tooltip?.remove();
                popup?.remove();
            },
        };
    }

    // ------------------------------------------------------------------
    // Directive registration
    // ------------------------------------------------------------------

    function LivewireMapPlugin(Alpine) {
        // Livewire's morph runs directives on throwaway clones of incoming
        // elements. Skip those, or every morph would build a hidden map.
        const skip = Alpine.skipDuringClone || ((fn) => fn);
        const directive = (name, handler) => Alpine.directive(name, skip(handler));

        Alpine.store("livewire-mapcn", {
            maps: mapRegistry,
            routeAnimations: markRaw({}),
        });

        Alpine.magic("map", (el) => {
            const ctx = findContext(el);
            return ctx ? ctx.map : null;
        });

        // $mapRoute('id') → route controller (setProgress, selectRoute, animate, pointAt...)
        Alpine.magic("mapRoute", () => (id) => routeRegistry.get(id) || null);

        // ---------------- x-map ----------------
        directive("map", (el, { expression }, { evaluate, cleanup }) => {
            const config = readConfig(el, expression, evaluate);
            const id = config.id || el.id || `map-${Math.random().toString(36).slice(2, 10)}`;
            if (contexts[id] && contexts[id].el !== el) {
                console.warn(
                    `[livewire-mapcn] Duplicate map id "${id}". Give each <x-map> a unique id.`,
                );
            }

            const ctx = new MapContext(el, id, config);
            el._lmCtx = ctx;
            contexts[id] = ctx;
            mapRegistry[id] = null;

            ctx._bindLivewire();

            ctx.started();
            const boot = () => {
                ctx._markStarted();
                return whenMapLibre().then((maplibregl) => {
                    if (ctx.destroyed || ctx.map) return;
                    safeCall(() => ctx.create(maplibregl));
                });
            };

            // Lazy maps start when they come near the viewport, so pages with
            // many maps don't boot them all at once. Hidden maps (tabs,
            // modals) wait until they are shown.
            if (config.lazy !== false && "IntersectionObserver" in window) {
                const observer = new IntersectionObserver(
                    (entries) => {
                        if (entries.some((e) => e.isIntersecting)) {
                            observer.disconnect();
                            boot();
                        }
                    },
                    { rootMargin: config.lazyMargin || "300px" },
                );
                observer.observe(el);
                ctx._cleanups.push(() => observer.disconnect());
            } else {
                boot();
            }

            cleanup(() => ctx.destroy());
        });

        // ---------------- x-map-controls ----------------
        directive(
            "map-controls",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                let controls = [];
                let disposed = false;

                const add = (map) => {
                    const ml = window.maplibregl;
                    const c = readConfig(el, expression, evaluate);
                    const position = c.position || "top-right";

                    if (c.zoom || c.compass) {
                        controls.push(
                            new ml.NavigationControl({
                                showCompass: !!c.compass,
                                showZoom: !!c.zoom,
                                visualizePitch: c.visualizePitch !== false,
                            }),
                        );
                    }
                    if (c.threeD) {
                        controls.push(new ThreeDControl(ctx, c));
                    }
                    if (c.locate) {
                        const geolocate = new ml.GeolocateControl({
                            positionOptions: {
                                enableHighAccuracy: true,
                                timeout: 10000,
                            },
                            trackUserLocation: c.trackUser !== false,
                        });
                        geolocate.on("geolocate", (e) =>
                            ctx.dispatch("map:locate-success", {
                                lat: e.coords.latitude,
                                lng: e.coords.longitude,
                                accuracy: e.coords.accuracy,
                            }),
                        );
                        geolocate.on("error", (e) =>
                            ctx.dispatch("map:locate-error", {
                                code: e.code,
                                message: e.message,
                            }),
                        );
                        controls.push(geolocate);
                    }
                    if (c.fullscreen) {
                        controls.push(
                            new ml.FullscreenControl({ container: ctx.el }),
                        );
                    }
                    controls.forEach((control) => map.addControl(control, position));

                    if (c.scale) {
                        const scale = new ml.ScaleControl({
                            unit: c.scaleUnit || "metric",
                        });
                        map.addControl(
                            scale,
                            position.startsWith("top")
                                ? position.replace("top", "bottom")
                                : position,
                        );
                        controls.push(scale);
                    }
                };

                const remove = () => {
                    const map = ctx.map;
                    if (isAlive(map)) {
                        controls.forEach((control) =>
                            safeCall(() => map.removeControl(control)),
                        );
                    }
                    controls = [];
                };

                ctx.created().then((map) => {
                    if (disposed) return;
                    add(map);
                    watchComponent(
                        el,
                        () => el.getAttribute("data-lm-config"),
                        () => {
                            remove();
                            add(map);
                        },
                        cleanup,
                    );
                });

                cleanup(() => {
                    disposed = true;
                    remove();
                });
            },
        );

        // ---------------- x-map-marker ----------------
        directive(
            "map-marker",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                const getConfig = () => readConfig(el, expression, evaluate);
                let controller = null;
                let disposed = false;

                ctx.created().then(() => {
                    if (disposed) return;
                    controller = createMarkerController(
                        ctx,
                        el,
                        evaluate,
                        getConfig,
                        () => {
                            const c = getConfig();
                            return [c.lng, c.lat];
                        },
                    );
                    el._marker = controller.marker;
                    watchComponent(
                        el,
                        () => markerSignature(el),
                        () => {
                            const c = getConfig();
                            controller.setLngLat([c.lng, c.lat]);
                            controller.update();
                        },
                        cleanup,
                    );
                });

                cleanup(() => {
                    disposed = true;
                    controller?.destroy();
                });
            },
        );

        // Sub-component markers (config is read by the parent marker).
        directive("map-marker-popup", () => {});
        directive("map-marker-tooltip", () => {});

        // ---------------- x-map-popup ----------------
        directive(
            "map-popup",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                let popup = null;
                let disposed = false;
                const getConfig = () => readConfig(el, expression, evaluate);
                const contentHTML = () =>
                    templateHTML(el, 'template[x-ref="popupContent"]');

                ctx.created().then((map) => {
                    if (disposed) return;
                    const ml = window.maplibregl;
                    let config = getConfig();
                    let optionsKey = null;
                    let lastOpen = null;

                    const build = () => {
                        const key = JSON.stringify([
                            config.maxWidth,
                            config.closeButton,
                            config.closeOnClickMap,
                            config.closeOnMove,
                            config.anchor,
                            config.offset,
                            config.className,
                        ]);
                        if (popup && key === optionsKey) return;
                        const wasOpen = popup?.isOpen();
                        if (popup) {
                            popup._lmSilent = true;
                            popup.remove();
                        }
                        optionsKey = key;
                        popup = markRaw(
                            new ml.Popup(
                                compact({
                                    maxWidth: config.maxWidth || "300px",
                                    closeButton: !!config.closeButton,
                                    closeOnClick: config.closeOnClickMap !== false,
                                    closeOnMove: !!config.closeOnMove,
                                    anchor: config.anchor || undefined,
                                    offset: config.offset ?? 16,
                                    className: `lm-popup-container ${config.className || ""}`.trim(),
                                }),
                            ),
                        );
                        popup.on("open", () =>
                            ctx.dispatch("map:popup-open", { id: config.id }),
                        );
                        popup.on("close", () => {
                            if (popup?._lmSilent) return;
                            ctx.dispatch("map:popup-close", { id: config.id });
                        });
                        el._popup = popup;
                        if (wasOpen) popup.addTo(map);
                    };

                    const sync = () => {
                        build();
                        popup
                            .setLngLat([config.lng, config.lat])
                            .setHTML(contentHTML() ?? "");
                        // Only react to `open` when the server value changes,
                        // so a user closing the popup is not overridden.
                        if (config.open !== lastOpen) {
                            lastOpen = config.open;
                            if (config.open && !popup.isOpen()) popup.addTo(map);
                            if (!config.open && popup.isOpen()) popup.remove();
                        }
                    };
                    sync();

                    watchComponent(
                        el,
                        () => el.getAttribute("data-lm-config") + "\u0000" + contentHTML(),
                        () => {
                            config = getConfig();
                            sync();
                        },
                        cleanup,
                    );
                });

                cleanup(() => {
                    disposed = true;
                    if (popup) {
                        popup._lmSilent = true;
                        popup.remove();
                    }
                });
            },
        );

        // ---------------- x-map-route ----------------
        directive(
            "map-route",
            (el, { expression }, { evaluate, evaluateLater, effect, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                const config = readConfig(el, expression, evaluate);
                const controller = createRouteController(ctx, el, config);
                el._lmRoute = controller;
                registerRoute(config.id, controller);
                controller.init();

                // Client-first progress: follow an Alpine expression (e.g. a
                // property bound to a slider, or $wire.entangle(...)) without
                // a server round trip per change.
                if (config.progressModel) {
                    const read = evaluateLater(config.progressModel);
                    let first = true;
                    effect(() => {
                        read((value) => {
                            const n = value === null || value === undefined || value === "" ? null : Number(value);
                            controller.setProgress(
                                Number.isFinite(n) ? n : null,
                                first ? 0 : config.progressDuration || 0,
                            );
                            first = false;
                        });
                    });
                }

                const offs = [
                    onLivewire(`map:update-route-data-${config.id}`, (payload) =>
                        controller.applyUpdate(payload),
                    ),
                    onLivewire(`map:route-progress-${config.id}`, (payload) =>
                        controller.setProgress(
                            payload.progress,
                            payload.duration || 0,
                        ),
                    ),
                    onLivewire(`map:select-route-${config.id}`, (payload) =>
                        controller.selectRoute(Number(payload.index ?? 0)),
                    ),
                    onLivewire("map:force-animate", (payload) => {
                        if (payload.id && payload.id !== config.id) return;
                        if (!payload.id && !config.animate) return;
                        controller.animate(payload.duration);
                    }),
                ];

                watchComponent(
                    el,
                    () => el.getAttribute("data-lm-config"),
                    () => controller.updateConfig(readConfig(el, expression, evaluate)),
                    cleanup,
                );

                cleanup(() => {
                    offs.forEach((off) => off());
                    controller.destroy();
                    unregisterRoute(config.id, controller);
                });
            },
        );

        // ---------------- x-map-route-marker ----------------
        directive(
            "map-route-marker",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                const routeEl = el.parentElement?.closest("[x-map-route]");
                if (!ctx) return;
                const getConfig = () => readConfig(el, expression, evaluate);
                let controller = null;
                let offRoute = null;
                let offChange = null;
                let disposed = false;

                const attach = (route) => {
                    offChange?.();
                    const position = () => {
                        const c = getConfig();
                        return route.pointAt(c.at ?? "progress");
                    };
                    const sync = () => {
                        if (!controller) return;
                        controller.setLngLat(position());
                        const c = getConfig();
                        if (c.alignToRoute) {
                            controller.marker.setRotation(
                                route.bearingAt(c.at ?? "progress") +
                                    (c.rotation || 0),
                            );
                        }
                    };
                    if (!controller) {
                        controller = createMarkerController(
                            ctx,
                            el,
                            evaluate,
                            getConfig,
                            position,
                        );
                        if (getConfig().alignToRoute) {
                            controller.marker.setRotationAlignment("map");
                        }
                    }
                    offChange = route.onChange(sync);
                    sync();
                };

                ctx.created().then(() => {
                    if (disposed) return;
                    const routeId =
                        getConfig().routeId ||
                        (routeEl && readConfig(routeEl, null, evaluate).id);
                    if (!routeId) {
                        console.warn(
                            "[livewire-mapcn] <x-map-route-marker> must be inside <x-map-route> or have a route-id.",
                        );
                        return;
                    }
                    offRoute = withRoute(routeId, attach);
                    watchComponent(
                        el,
                        () => markerSignature(el),
                        () => {
                            controller?.update();
                            const route = routeRegistry.get(routeId);
                            if (route && controller) {
                                controller.setLngLat(route.pointAt(getConfig().at ?? "progress"));
                            }
                        },
                        cleanup,
                    );
                });

                cleanup(() => {
                    disposed = true;
                    offRoute?.();
                    offChange?.();
                    controller?.destroy();
                });
            },
        );

        // ---------------- x-map-arc ----------------
        directive(
            "map-arc",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                let config = readConfig(el, expression, evaluate);
                const uid = config.id;
                const sourceId = `arc-source-${uid}`;
                const layerId = `arc-layer-${uid}`;
                const hitLayerId = `arc-hit-layer-${uid}`;
                let data = readJSONScript(el, "data") || config.data || [];
                let disposed = false;
                let binder = null;
                let hover = null;
                let popups = null;

                const toGeoJSON = () => ({
                    type: "FeatureCollection",
                    features: data
                        .filter((d) => d && d.from && d.to)
                        .map((datum, index) => {
                            const { from, to, ...properties } = datum;
                            if (properties.id == null) properties.id = index;
                            return {
                                type: "Feature",
                                properties,
                                geometry: {
                                    type: "LineString",
                                    coordinates: buildArc(
                                        from,
                                        to,
                                        config.curvature ?? 0.2,
                                        config.samples ?? 64,
                                    ),
                                },
                            };
                        }),
                });

                const basePaint = () => ({
                    "line-color": "#4285F4",
                    "line-width": 2,
                    "line-opacity": 0.85,
                    ...(config.paint || {}),
                });
                const paint = () =>
                    mergeHoverPaint(basePaint(), config.hoverPaint);
                const layout = () => ({
                    "line-join": "round",
                    "line-cap": "round",
                    ...(config.layout || {}),
                });
                const hitWidth = () => {
                    const width = basePaint()["line-width"];
                    return Math.max((typeof width === "number" ? width : 12) + 6, 12);
                };

                const render = (map) => {
                    const before = resolveBeforeId(map, config.beforeId);
                    if (!map.getSource(sourceId)) {
                        map.addSource(sourceId, {
                            type: "geojson",
                            data: toGeoJSON(),
                            promoteId: "id",
                        });
                    }
                    if (!map.getLayer(hitLayerId)) {
                        map.addLayer(
                            {
                                id: hitLayerId,
                                type: "line",
                                source: sourceId,
                                layout: { "line-join": "round", "line-cap": "round" },
                                paint: {
                                    "line-color": "rgba(0,0,0,0)",
                                    "line-width": hitWidth(),
                                    "line-opacity": 1,
                                },
                            },
                            before,
                        );
                    }
                    if (!map.getLayer(layerId)) {
                        map.addLayer(
                            {
                                id: layerId,
                                type: "line",
                                source: sourceId,
                                layout: layout(),
                                paint: paint(),
                            },
                            before,
                        );
                    }
                    hover?.reset();
                    ctx.queueRaise();
                };

                const findArc = (feature) =>
                    data.find(
                        (d, i) => String(d.id ?? i) === String(feature?.id ?? feature?.properties?.id),
                    );

                const bind = (map) => {
                    binder = createBinder(map);
                    hover = createHover(map, sourceId);
                    popups = createFeaturePopups(map, el);
                    if (config.interactive === false) return;
                    binder.on("mousemove", hitLayerId, (e) => {
                        setCursor(map, "pointer");
                        const feature = e.features?.[0];
                        if (!feature) return;
                        const lngLat = [e.lngLat.lng, e.lngLat.lat];
                        popups.showTooltip(lngLat, feature.properties);
                        if (hover.enter(feature.id)) {
                            ctx.dispatch("map:arc-hovered", {
                                id: uid,
                                arc: findArc(feature) ?? null,
                                lat: e.lngLat.lat,
                                lng: e.lngLat.lng,
                            });
                        }
                    });
                    binder.on("mouseleave", hitLayerId, () => {
                        setCursor(map, "");
                        popups.hideTooltip();
                        if (hover.leave()) {
                            ctx.dispatch("map:arc-hovered", { id: uid, arc: null });
                        }
                    });
                    binder.on("click", hitLayerId, (e) => {
                        const feature = e.features?.[0];
                        if (!feature) return;
                        const lngLat = [e.lngLat.lng, e.lngLat.lat];
                        popups.hideTooltip();
                        popups.showPopup(lngLat, feature.properties);
                        ctx.dispatch("map:arc-clicked", {
                            id: uid,
                            arc: findArc(feature) ?? null,
                            lat: e.lngLat.lat,
                            lng: e.lngLat.lng,
                        });
                    });
                };

                let offStyle = null;
                ctx.created().then((map) => {
                    if (disposed) return;
                    bind(map);
                    offStyle = ctx.onStyle(render);
                    if (config.fitBounds) {
                        ctx.ready().then(() => {
                            const bounds = boundsOf(toGeoJSON());
                            if (bounds) map.fitBounds(bounds, { padding: 60 });
                        });
                    }
                });

                const setData = (next) => {
                    data = Array.isArray(next) ? next : [];
                    const map = ctx.map;
                    if (isAlive(map) && map.getSource(sourceId)) {
                        map.getSource(sourceId).setData(toGeoJSON());
                    }
                };

                const offUpdate = onLivewire(`map:update-arc-data-${uid}`, (payload) =>
                    setData(Array.isArray(payload) ? payload : payload.data ?? payload),
                );

                watchComponent(
                    el,
                    () => el.getAttribute("data-lm-config") + "\u0000" + jsonScriptText(el, "data"),
                    () => {
                        const previous = config;
                        config = { ...readConfig(el, expression, evaluate), id: uid };
                        // Update data first (setData only touches MapLibre when the
                        // source exists); a style still loading re-renders from it.
                        const nextData = readJSONScript(el, "data") || config.data || [];
                        if (
                            JSON.stringify(nextData) !== JSON.stringify(data) ||
                            previous.curvature !== config.curvature ||
                            previous.samples !== config.samples
                        ) {
                            setData(nextData);
                        }
                        const map = ctx.map;
                        if (!isAlive(map) || !ctx.styleReady) return;
                        applyLayerProps(map, layerId, paint(), layout());
                        if (map.getLayer(hitLayerId)) {
                            map.setPaintProperty(hitLayerId, "line-width", hitWidth());
                        }
                    },
                    cleanup,
                );

                cleanup(() => {
                    disposed = true;
                    offUpdate();
                    offStyle?.();
                    binder?.offAll();
                    popups?.destroy();
                    removeLayers(ctx.map, [layerId, hitLayerId], [sourceId]);
                });
            },
        );

        // ---------------- x-map-geojson ----------------
        directive(
            "map-geojson",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                let config = readConfig(el, expression, evaluate);
                const uid = config.id;
                const sourceId = `geojson-source-${uid}`;
                const fillId = `geojson-fill-${uid}`;
                const lineId = `geojson-line-${uid}`;
                const circleId = `geojson-circle-${uid}`;
                let data = config.url || readJSONScript(el, "data") || config.data;
                let disposed = false;
                let binder = null;
                let hover = null;
                let popups = null;

                const defaults = () =>
                    ctx.isDark
                        ? { fill: "#404040", line: "#171717", circle: "#a3a3a3" }
                        : { fill: "#d4d4d4", line: "#ffffff", circle: "#525252" };

                const fillPaint = () =>
                    config.fillPaint === false
                        ? null
                        : mergeHoverPaint(
                              {
                                  "fill-color": defaults().fill,
                                  ...(config.fillPaint || {}),
                              },
                              config.fillHoverPaint,
                          );
                const linePaint = () =>
                    config.linePaint === false
                        ? null
                        : mergeHoverPaint(
                              {
                                  "line-color": defaults().line,
                                  "line-width": 0.5,
                                  ...(config.linePaint || {}),
                              },
                              config.lineHoverPaint,
                          );
                const circlePaint = () =>
                    config.circlePaint === false
                        ? null
                        : mergeHoverPaint(
                              {
                                  "circle-color": defaults().circle,
                                  "circle-radius": 5,
                                  "circle-stroke-width": 1.5,
                                  "circle-stroke-color": "#ffffff",
                                  ...(config.circlePaint || {}),
                              },
                              config.circleHoverPaint,
                          );

                const layerSpecs = () => [
                    {
                        id: fillId,
                        type: "fill",
                        paint: fillPaint(),
                        filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
                    },
                    {
                        id: lineId,
                        type: "line",
                        paint: linePaint(),
                        layout: { "line-join": "round", "line-cap": "round" },
                        filter: [
                            "match",
                            ["geometry-type"],
                            ["LineString", "MultiLineString", "Polygon", "MultiPolygon"],
                            true,
                            false,
                        ],
                    },
                    {
                        id: circleId,
                        type: "circle",
                        paint: circlePaint(),
                        filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
                    },
                ];

                const render = (map) => {
                    const before = resolveBeforeId(map, config.beforeId);
                    if (!map.getSource(sourceId)) {
                        map.addSource(
                            sourceId,
                            compact({
                                type: "geojson",
                                data: data || { type: "FeatureCollection", features: [] },
                                promoteId: config.promoteId || undefined,
                                generateId: config.promoteId ? undefined : true,
                            }),
                        );
                    }
                    layerSpecs().forEach((spec) => {
                        if (!spec.paint) {
                            removeLayers(map, [spec.id]);
                            return;
                        }
                        if (!map.getLayer(spec.id)) {
                            map.addLayer(
                                compact({
                                    id: spec.id,
                                    type: spec.type,
                                    source: sourceId,
                                    paint: spec.paint,
                                    layout: spec.layout,
                                    filter: spec.filter,
                                }),
                                before,
                            );
                        } else {
                            applyLayerProps(map, spec.id, spec.paint);
                        }
                    });
                    hover?.reset();
                    ctx.queueRaise();
                };

                const interactiveLayers = [fillId, lineId, circleId];

                const featureDetail = (feature) => ({
                    id: feature.id ?? null,
                    properties: feature.properties,
                    geometry: feature.geometry,
                });

                const bind = (map) => {
                    binder = createBinder(map);
                    hover = createHover(map, sourceId);
                    popups = createFeaturePopups(map, el);
                    if (!config.interactive) return;
                    interactiveLayers.forEach((layer) => {
                        binder.on("mousemove", layer, (e) => {
                            const feature = e.features?.[0];
                            if (!feature) return;
                            setCursor(map, "pointer");
                            popups.showTooltip(
                                [e.lngLat.lng, e.lngLat.lat],
                                feature.properties,
                            );
                            if (hover.enter(feature.id)) {
                                ctx.dispatch("map:geojson-hovered", {
                                    id: uid,
                                    feature: featureDetail(feature),
                                    lat: e.lngLat.lat,
                                    lng: e.lngLat.lng,
                                });
                            }
                        });
                        binder.on("mouseleave", layer, () => {
                            setCursor(map, "");
                            popups.hideTooltip();
                            if (hover.leave()) {
                                ctx.dispatch("map:geojson-hovered", {
                                    id: uid,
                                    feature: null,
                                });
                            }
                        });
                    });
                    // One click handler for all layers so overlapping
                    // fill + outline do not fire twice.
                    binder.on("click", interactiveLayers, (e) => {
                        const feature = e.features?.[0];
                        if (!feature) return;
                        const lngLat = [e.lngLat.lng, e.lngLat.lat];
                        popups.hideTooltip();
                        popups.showPopup(lngLat, feature.properties);
                        ctx.dispatch("map:geojson-clicked", {
                            id: uid,
                            feature: featureDetail(feature),
                            lat: e.lngLat.lat,
                            lng: e.lngLat.lng,
                        });
                    });
                };

                const fit = (map) => {
                    if (!config.fitBounds || typeof data === "string") return;
                    const bounds = boundsOf(data);
                    if (bounds) {
                        map.fitBounds(bounds, { padding: config.fitBoundsPadding ?? 40, duration: 0 });
                    }
                };

                let offStyle = null;
                ctx.created().then((map) => {
                    if (disposed) return;
                    bind(map);
                    offStyle = ctx.onStyle(render);
                    ctx.ready().then(() => fit(map));
                });

                const setData = (next) => {
                    data = next;
                    const map = ctx.map;
                    if (isAlive(map) && map.getSource(sourceId)) {
                        map.getSource(sourceId).setData(next);
                    }
                };

                const offUpdate = onLivewire(`map:update-geojson-${uid}`, (payload) =>
                    setData(payload.type ? payload : payload.data),
                );

                watchComponent(
                    el,
                    () => el.getAttribute("data-lm-config") + "\u0000" + jsonScriptText(el, "data"),
                    () => {
                        config = { ...readConfig(el, expression, evaluate), id: uid };
                        const next = config.url || readJSONScript(el, "data") || config.data;
                        if (JSON.stringify(next) !== JSON.stringify(data)) setData(next);
                        const map = ctx.map;
                        if (isAlive(map) && ctx.styleReady) render(map);
                    },
                    cleanup,
                );

                cleanup(() => {
                    disposed = true;
                    offUpdate();
                    offStyle?.();
                    binder?.offAll();
                    popups?.destroy();
                    removeLayers(ctx.map, [circleId, lineId, fillId], [sourceId]);
                });
            },
        );

        // ---------------- x-map-cluster-layer ----------------
        directive(
            "map-cluster-layer",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                let config = readConfig(el, expression, evaluate, "clusterConfig");
                const uid = config.id;
                const ids = {
                    source: `cluster-source-${uid}`,
                    clusters: `clusters-${uid}`,
                    count: `cluster-count-${uid}`,
                    points: `unclustered-point-${uid}`,
                };
                let data =
                    config.url ||
                    readJSONScript(el, "data") ||
                    el._clusterData ||
                    parseJSON(el.dataset.clusterData, null) ||
                    { type: "FeatureCollection", features: [] };
                delete el._clusterData;
                delete el.dataset.clusterData;
                let disposed = false;
                let binder = null;
                let popup = null;

                const clusterColor = () => {
                    const colors = config.clusterColors;
                    const thresholds = config.clusterThresholds;
                    if (Array.isArray(colors) && colors.length > 1 && Array.isArray(thresholds)) {
                        const expr = ["step", ["get", "point_count"], colors[0]];
                        thresholds.forEach((threshold, i) => {
                            if (colors[i + 1]) expr.push(threshold, colors[i + 1]);
                        });
                        return expr;
                    }
                    return config.clusterColor || "#1A56DB";
                };

                const clusterRadius = () => {
                    const stops = config.clusterSizeStops || [[0, 20], [100, 30], [750, 40]];
                    return ["step", ["get", "point_count"], stops[0][1], ...stops.slice(1).flat()];
                };

                const render = (map) => {
                    if (!map.getSource(ids.source)) {
                        map.addSource(
                            ids.source,
                            compact({
                                type: "geojson",
                                data,
                                cluster: true,
                                clusterMaxZoom: config.clusterMaxZoom ?? 14,
                                clusterRadius: config.clusterRadius ?? 50,
                                clusterMinPoints: config.clusterMinPoints ?? 2,
                                buffer: config.buffer ?? 256,
                                tolerance: config.tolerance ?? 0.5,
                                generateId: true,
                            }),
                        );
                    }
                    if (!map.getLayer(ids.clusters)) {
                        map.addLayer({
                            id: ids.clusters,
                            type: "circle",
                            source: ids.source,
                            filter: ["has", "point_count"],
                            paint: {
                                "circle-color": clusterColor(),
                                "circle-radius": clusterRadius(),
                                "circle-stroke-width": 2,
                                "circle-stroke-color": "rgba(255,255,255,0.85)",
                                "circle-opacity": 0.9,
                            },
                        });
                    }
                    if (config.showCount !== false && !map.getLayer(ids.count)) {
                        map.addLayer({
                            id: ids.count,
                            type: "symbol",
                            source: ids.source,
                            filter: ["has", "point_count"],
                            layout: {
                                "text-field": ["get", "point_count_abbreviated"],
                                "text-font": config.textFont || ["Open Sans Semibold"],
                                "text-size": 12,
                                "text-allow-overlap": true,
                            },
                            paint: { "text-color": config.clusterTextColor || "#ffffff" },
                        });
                    }
                    if (!map.getLayer(ids.points)) {
                        map.addLayer({
                            id: ids.points,
                            type: "circle",
                            source: ids.source,
                            filter: ["!", ["has", "point_count"]],
                            paint: {
                                "circle-color": config.pointColor || "#1A56DB",
                                "circle-radius": config.pointRadius ?? 6,
                                "circle-stroke-width": 2,
                                "circle-stroke-color": config.pointStrokeColor || "#ffffff",
                            },
                        });
                    }
                    ctx.queueRaise();
                };

                const showPointPopup = (map, coordinates, properties) => {
                    if (config.disablePopup) return;
                    const template =
                        templateHTML(el, 'template[x-ref="clusterPopup"]') ||
                        config.popupTemplate ||
                        null;
                    let html;
                    if (template) {
                        html = interpolate(template, properties, coordinates);
                    } else if (config.popupProperty && properties[config.popupProperty] != null) {
                        html = buildPropertiesPopupHTML(properties, config.popupProperty);
                    } else {
                        // Default: name/title (if any) plus coordinates.
                        const name = properties.name || properties.title || properties.label;
                        html = buildPropertiesPopupHTML(
                            name ? { name } : {},
                            name ? "name" : null,
                            coordinates,
                        );
                    }
                    if (!popup) {
                        popup = markRaw(
                            new window.maplibregl.Popup({
                                maxWidth: "320px",
                                offset: 10,
                                className: "lm-popup-container",
                            }),
                        );
                    }
                    popup.setLngLat(coordinates).setHTML(html);
                    if (!popup.isOpen()) popup.addTo(map);
                };

                const bind = (map) => {
                    binder = createBinder(map);
                    binder.on("click", ids.clusters, (e) => {
                        const feature = e.features?.[0];
                        if (!feature) return;
                        const clusterId = feature.properties.cluster_id;
                        const center = feature.geometry.coordinates;
                        ctx.dispatch("map:cluster-clicked", {
                            cluster_id: clusterId,
                            lat: e.lngLat.lat,
                            lng: e.lngLat.lng,
                            count: feature.properties.point_count,
                        });
                        if (config.clickZoom === false) return;
                        const source = map.getSource(ids.source);
                        const onZoom = (zoom) => {
                            map.easeTo({ center, zoom });
                            ctx.dispatch("map:cluster-expanded", { cluster_id: clusterId, zoom });
                        };
                        const result = source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                            if (!err) onZoom(zoom);
                        });
                        if (result && typeof result.then === "function") {
                            result.then(onZoom).catch(() => {});
                        }
                    });
                    binder.on("click", ids.points, (e) => {
                        const feature = e.features?.[0];
                        if (!feature) return;
                        const coordinates = feature.geometry.coordinates.slice();
                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }
                        ctx.dispatch("map:cluster-point-clicked", {
                            feature_id: feature.id,
                            lat: coordinates[1],
                            lng: coordinates[0],
                            properties: feature.properties,
                        });
                        showPointPopup(map, coordinates, feature.properties);
                    });
                    [ids.clusters, ids.points].forEach((layer) => {
                        binder.on("mouseenter", layer, () => setCursor(map, "pointer"));
                        binder.on("mouseleave", layer, () => setCursor(map, ""));
                    });
                };

                let offStyle = null;
                ctx.created().then((map) => {
                    if (disposed) return;
                    bind(map);
                    offStyle = ctx.onStyle(render);
                });

                const setData = (next) => {
                    if (!next) return;
                    data = next;
                    const map = ctx.map;
                    if (isAlive(map) && map.getSource(ids.source)) {
                        map.getSource(ids.source).setData(next);
                    }
                };

                const offUpdate = onLivewire(`map:update-cluster-data-${uid}`, (payload) =>
                    setData(payload.type ? payload : payload.data),
                );
                el._clusterSourceId = ids.source;
                el._clusterMapId = ctx.id;

                watchComponent(
                    el,
                    () => el.getAttribute("data-lm-config") + "\u0000" + jsonScriptText(el, "data"),
                    () => {
                        const previous = config;
                        config = { ...readConfig(el, expression, evaluate, "clusterConfig"), id: uid };
                        const next = config.url || readJSONScript(el, "data");
                        if (next && JSON.stringify(next) !== JSON.stringify(data)) setData(next);
                        const map = ctx.map;
                        if (!isAlive(map) || !ctx.styleReady) return;
                        const sourceOptionsChanged = ["clusterMaxZoom", "clusterRadius", "clusterMinPoints"].some(
                            (key) => previous[key] !== config[key],
                        );
                        removeLayers(
                            map,
                            [ids.count, ids.clusters, ids.points],
                            sourceOptionsChanged ? [ids.source] : [],
                        );
                        render(map);
                    },
                    cleanup,
                );

                cleanup(() => {
                    disposed = true;
                    offUpdate();
                    offStyle?.();
                    binder?.offAll();
                    popup?.remove();
                    removeLayers(ctx.map, [ids.count, ids.clusters, ids.points], [ids.source]);
                });
            },
        );

        // ---------------- x-map-route-group ----------------
        directive(
            "map-route-group",
            (el, { expression }, { evaluate, cleanup }) => {
                const ctx = findContext(el);
                if (!ctx) return;
                let config = readConfig(el, expression, evaluate, "routeGroupConfig");
                const uid = config.id;
                let routes =
                    readJSONScript(el, "routes") ||
                    parseJSON(el.dataset.routeGroupRoutes, null) ||
                    config.routes ||
                    [];
                delete el.dataset.routeGroupRoutes;

                let resolved = [];
                let selected =
                    typeof config.selectedRoute === "number" ? config.selectedRoute : 0;
                let renderedCount = 0;
                let disposed = false;
                let binder = null;
                let hoveredIndex = null;
                let seq = 0;
                let growFrame = null;
                let growIndex = 0;
                let pendingSelect = null;
                let hasResolved = false;

                const sourceId = (i) => `route-group-${uid}-${i}`;
                const layerId = (i) => `route-group-layer-${uid}-${i}`;
                const stopsId = (i) => `route-group-stops-${uid}-${i}`;
                const stopsSourceId = (i) => `route-group-stops-source-${uid}-${i}`;
                const routeKey = (route, i) => route.id || `${uid}-route-${i}`;

                const paintFor = (i) => {
                    const route = resolved[i] || {};
                    const isSelected = i === selected;
                    const color = route.color || "#1A56DB";
                    if (!isSelected) {
                        return {
                            "line-color": hoveredIndex === i && config.hoverColor ? config.hoverColor : config.alternativeColor,
                            "line-width": config.alternativeWidth,
                            "line-opacity": config.alternativeOpacity,
                        };
                    }
                    return {
                        "line-color": config.active
                            ? config.activeColor
                            : hoveredIndex === i && config.hoverColor
                              ? config.hoverColor
                              : color,
                        "line-width": config.active ? config.activeWidth : route.width ?? 4,
                        "line-opacity": route.opacity ?? 1,
                    };
                };

                const applyPaint = (map) => {
                    for (let i = 0; i < renderedCount; i++) {
                        if (!map.getLayer(layerId(i))) continue;
                        for (const [key, value] of Object.entries(paintFor(i))) {
                            map.setPaintProperty(layerId(i), key, value);
                        }
                    }
                    raiseSelected(map);
                };

                const raiseSelected = (map) => {
                    [layerId(selected), stopsId(selected)].forEach((id) => {
                        if (map.getLayer(id)) map.moveLayer(id);
                    });
                };

                const render = (map) => {
                    resolved.forEach((route, i) => {
                        const data = lineFeature(route.coordinates, { routeId: routeKey(route, i), index: i });
                        if (!map.getSource(sourceId(i))) {
                            map.addSource(sourceId(i), { type: "geojson", data });
                        } else {
                            map.getSource(sourceId(i)).setData(data);
                        }
                        if (!map.getLayer(layerId(i))) {
                            const dash = route.dashArray || config.dashArray;
                            map.addLayer({
                                id: layerId(i),
                                type: "line",
                                source: sourceId(i),
                                layout: {
                                    "line-join": config.lineJoin || "round",
                                    "line-cap": config.lineCap || "round",
                                },
                                paint: { ...paintFor(i), ...(dash ? { "line-dasharray": dash } : {}) },
                            });
                        }
                        const showStops = route.withStops ?? config.withStops;
                        const waypoints = route.waypoints || [];
                        if (showStops && waypoints.length) {
                            const stops = {
                                type: "FeatureCollection",
                                features: waypoints.map((c) => ({
                                    type: "Feature",
                                    properties: {},
                                    geometry: { type: "Point", coordinates: c },
                                })),
                            };
                            if (!map.getSource(stopsSourceId(i))) {
                                map.addSource(stopsSourceId(i), { type: "geojson", data: stops });
                            } else {
                                map.getSource(stopsSourceId(i)).setData(stops);
                            }
                            if (!map.getLayer(stopsId(i))) {
                                map.addLayer({
                                    id: stopsId(i),
                                    type: "circle",
                                    source: stopsSourceId(i),
                                    paint: {
                                        "circle-radius": Math.max(4, (route.width || 4) * 1.25),
                                        "circle-color": route.stopColor || config.stopColor,
                                        "circle-stroke-width": 2,
                                        "circle-stroke-color": "#ffffff",
                                    },
                                });
                            }
                        } else {
                            removeLayers(map, [stopsId(i)], [stopsSourceId(i)]);
                        }
                    });
                    for (let i = resolved.length; i < renderedCount; i++) {
                        removeLayers(map, [stopsId(i), layerId(i)], [stopsSourceId(i), sourceId(i)]);
                    }
                    renderedCount = resolved.length;
                    applyPaint(map);
                };

                const select = (index, fromUser) => {
                    if (!resolved.length) {
                        pendingSelect = index; // routes still resolving
                        return;
                    }
                    if (index === selected || index < 0 || index >= resolved.length) return;
                    const previous = selected;
                    selected = index;
                    const map = ctx.map;
                    if (isAlive(map)) stopGrow(map);
                    if (isAlive(map) && ctx.styleReady) applyPaint(map);
                    if (fromUser) {
                        const route = resolved[index];
                        ctx.dispatch("map:route-group-selection-changed", {
                            groupId: uid,
                            selectedRouteId: routeKey(route, index),
                            selectedIndex: index,
                            previousRouteId: routeKey(resolved[previous] || {}, previous),
                            previousIndex: previous,
                            distance: route.distance,
                            duration: route.duration,
                        });
                    }
                };

                const bindLayers = (map) => {
                    binder?.offAll();
                    binder = createBinder(map);
                    if (!config.clickable) return;
                    for (let i = 0; i < resolved.length; i++) {
                        const index = i;
                        binder.on("click", layerId(index), () => select(index, true));
                        binder.on("mouseenter", layerId(index), () => {
                            setCursor(map, "pointer");
                            hoveredIndex = index;
                            if (config.hoverColor) applyPaint(map);
                        });
                        binder.on("mouseleave", layerId(index), () => {
                            setCursor(map, "");
                            hoveredIndex = null;
                            if (config.hoverColor) applyPaint(map);
                        });
                    }
                };

                const stopGrow = (map) => {
                    if (!growFrame) return;
                    cancelAnimationFrame(growFrame);
                    growFrame = null;
                    const index = growIndex;
                    const source = isAlive(map) && resolved[index] && map.getSource(sourceId(index));
                    if (source) source.setData(lineFeature(resolved[index].coordinates));
                };

                const animateSelected = (map, duration) => {
                    stopGrow(map);
                    const index = selected;
                    const route = resolved[index];
                    if (!route) return;
                    growIndex = index;
                    const measure = measureLine(route.coordinates);
                    const total = duration || config.animateDuration || 2000;
                    const start = performance.now();
                    const step = (now) => {
                        const t = Math.min(1, (now - start) / total);
                        const source = isAlive(map) && map.getSource(sourceId(index));
                        if (source) {
                            source.setData(lineFeature(sliceAtFraction(route.coordinates, measure, t)));
                        }
                        growFrame = t < 1 ? requestAnimationFrame(step) : null;
                    };
                    growFrame = requestAnimationFrame(step);
                };

                const resolveRoutes = async () => {
                    const current = ++seq;
                    const results = await Promise.all(
                        routes.map(async (route, index) => {
                            const waypoints = route.coordinates || [];
                            const shouldFetch = route.fetchDirections ?? config.fetchDirections;
                            let coordinates = waypoints;
                            let distance = route.distance ?? null;
                            let duration = route.duration ?? null;
                            if (shouldFetch && waypoints.length >= 2) {
                                try {
                                    const [first] = await fetchDirections(
                                        directionsUrl(
                                            route.directionsUrl || config.directionsUrl,
                                            route.directionsProfile || config.directionsProfile,
                                            waypoints,
                                            false,
                                        ),
                                    );
                                    coordinates = first.coordinates;
                                    distance = first.distance;
                                    duration = first.duration;
                                } catch (error) {
                                    console.warn(`[livewire-mapcn] Route group: directions failed for route ${index}`, error);
                                }
                            }
                            return { ...route, waypoints, coordinates, distance, duration };
                        }),
                    );
                    if (current !== seq || disposed) return;
                    const firstResolve = !hasResolved;
                    hasResolved = true;
                    resolved = results;
                    if (pendingSelect != null) {
                        selected = pendingSelect;
                        pendingSelect = null;
                    }
                    selected = Math.max(0, Math.min(selected, resolved.length - 1));
                    ctx.dispatch("map:route-group-directions-ready", {
                        groupId: uid,
                        routes: resolved.map((r, i) => ({
                            id: routeKey(r, i),
                            distance: r.distance,
                            duration: r.duration,
                        })),
                    });
                    const map = await ctx.ready();
                    if (disposed) return;
                    render(map);
                    bindLayers(map);
                    // Animate and fit only once, so later data changes keep the
                    // user's camera.
                    if (!firstResolve) return;
                    if (config.animate) animateSelected(map);
                    if (config.fitBounds) {
                        const bounds = boundsOf(resolved[selected]?.coordinates);
                        if (bounds) map.fitBounds(bounds, { padding: 50 });
                    }
                };

                let offStyle = null;
                const offRaise = ctx.onRaise(raiseSelected);
                ctx.created().then(() => {
                    if (disposed) return;
                    offStyle = ctx.onStyle((map) => {
                        if (resolved.length) render(map);
                    });
                    resolveRoutes();
                });

                const offs = [
                    onLivewire(`map:update-route-group-${uid}`, (payload) => {
                        if (payload.selectedRoute !== undefined) {
                            select(Number(payload.selectedRoute), false);
                        }
                        if (Array.isArray(payload.routes)) {
                            payload.routes.forEach((update, i) => {
                                if (!resolved[i]) return;
                                Object.assign(resolved[i], update);
                            });
                            const map = ctx.map;
                            if (isAlive(map) && ctx.styleReady) render(map);
                        }
                    }),
                    onLivewire("map:force-animate", (payload) => {
                        if (payload.id && payload.id !== uid) return;
                        if (!payload.id && !config.animate) return;
                        if (isAlive(ctx.map)) animateSelected(ctx.map, payload.duration);
                    }),
                ];

                watchComponent(
                    el,
                    () => el.getAttribute("data-lm-config") + "\u0000" + jsonScriptText(el, "routes"),
                    () => {
                        const previous = config;
                        config = { ...readConfig(el, expression, evaluate, "routeGroupConfig"), id: uid };
                        const nextRoutes = readJSONScript(el, "routes");
                        if (nextRoutes && JSON.stringify(nextRoutes) !== JSON.stringify(routes)) {
                            const geometryKey = (list, c) =>
                                JSON.stringify([
                                    c.fetchDirections,
                                    c.directionsProfile,
                                    c.directionsUrl,
                                    list.map((r) => [r.coordinates, r.fetchDirections, r.directionsProfile, r.directionsUrl]),
                                ]);
                            const geometryChanged =
                                geometryKey(nextRoutes, config) !== geometryKey(routes, previous) ||
                                nextRoutes.length !== resolved.length;
                            routes = nextRoutes;
                            if (geometryChanged) {
                                resolveRoutes();
                            } else {
                                // Style-only change: keep resolved geometry.
                                resolved = resolved.map((r, i) => ({ ...r, ...routes[i], coordinates: r.coordinates, waypoints: r.waypoints, distance: r.distance, duration: r.duration }));
                                if (isAlive(ctx.map) && ctx.styleReady) render(ctx.map);
                            }
                        }
                        if (
                            typeof config.selectedRoute === "number" &&
                            config.selectedRoute !== previous.selectedRoute
                        ) {
                            select(config.selectedRoute, false);
                        } else if (isAlive(ctx.map) && ctx.styleReady) {
                            applyPaint(ctx.map);
                        }
                    },
                    cleanup,
                );

                cleanup(() => {
                    disposed = true;
                    offs.forEach((off) => off());
                    offStyle?.();
                    offRaise();
                    binder?.offAll();
                    if (growFrame) cancelAnimationFrame(growFrame);
                    const layers = [];
                    const sources = [];
                    for (let i = 0; i < renderedCount; i++) {
                        layers.push(stopsId(i), layerId(i));
                        sources.push(stopsSourceId(i), sourceId(i));
                    }
                    removeLayers(ctx.map, layers, sources);
                });
            },
        );

        // ---------------- x-map-route-list ----------------
        directive(
            "map-route-list",
            (el, { expression }, { evaluate, cleanup }) => {
                const config = readConfig(el, expression, evaluate);
                let routeId = config.routeId;
                let controller = null;

                const state = Alpine.reactive({
                    routes: [],
                    selectedIndex: 0,
                    showDistance: config.showDistance !== false,
                    showDuration: config.showDuration !== false,
                    showFastestBadge: config.showFastestBadge !== false,
                    showTimeDiff: config.showTimeDiff !== false,
                    title: config.title || "Routes",

                    get fastestIndex() {
                        let min = Infinity;
                        let index = 0;
                        this.routes.forEach((r, i) => {
                            if (r.duration != null && r.duration < min) {
                                min = r.duration;
                                index = i;
                            }
                        });
                        return index;
                    },
                    formatDistance(meters) {
                        if (meters == null) return "";
                        return meters >= 1000
                            ? (meters / 1000).toFixed(1) + " km"
                            : Math.round(meters) + " m";
                    },
                    formatDuration(seconds) {
                        if (seconds == null) return "";
                        const mins = Math.round(seconds / 60);
                        if (mins < 60) return mins + " min";
                        return Math.floor(mins / 60) + "h " + (mins % 60) + "min";
                    },
                    timeDiff(index) {
                        const fastest = this.routes[this.fastestIndex];
                        const route = this.routes[index];
                        if (!fastest || !route) return null;
                        const diff = Math.round((route.duration - fastest.duration) / 60);
                        return diff > 0 ? "+" + diff + " min" : null;
                    },
                    selectRoute(index) {
                        if (!controller || index === this.selectedIndex) return;
                        const previous = this.selectedIndex;
                        controller.selectRoute(index);
                        const route = this.routes[index];
                        dispatchEvent(el, "map:route-list-selected", {
                            routeId,
                            selectedIndex: index,
                            previousIndex: previous,
                            distance: route?.distance,
                            duration: route?.duration,
                        });
                    },
                });

                Alpine.addScopeToNode(el, { _rl: state });

                let offSnapshot = null;
                const offRoute = withRoute(routeId, (ctrl) => {
                    controller = ctrl;
                    offSnapshot?.();
                    offSnapshot = ctrl.subscribe((snapshot) => {
                        // Only list routes that came from a directions service.
                        const routes = snapshot.routes.filter((r) => r.duration != null);
                        state.routes = routes;
                        state.selectedIndex = snapshot.selectedIndex;
                        el.style.display = routes.length ? "" : "none";
                    });
                });

                cleanup(() => {
                    offRoute();
                    offSnapshot?.();
                });
            },
        );

        // ---------------- x-map-resize ----------------
        directive("map-resize", (el, { expression }, { evaluate, effect }) => {
            const ctx = findContext(el);
            if (!ctx) return;
            effect(() => {
                if (evaluate(expression) && isAlive(ctx.map)) {
                    setTimeout(() => isAlive(ctx.map) && ctx.map.resize(), 50);
                }
            });
        });
    }

    function applyLayerProps(map, layerId, paint, layout) {
        if (!map.getLayer(layerId)) return;
        for (const [key, value] of Object.entries(paint || {})) {
            safeCall(() => map.setPaintProperty(layerId, key, value));
        }
        for (const [key, value] of Object.entries(layout || {})) {
            safeCall(() => map.setLayoutProperty(layerId, key, value));
        }
    }

    // ------------------------------------------------------------------
    // 3D view control
    // ------------------------------------------------------------------

    class ThreeDControl {
        constructor(ctx, options = {}) {
            this.ctx = ctx;
            this.pitch = options.threeDPitch ?? 60;
            this.bearing = options.threeDBearing ?? -20;
            this.duration = options.threeDDuration ?? 1000;
            this.threshold = 5;
            this._sync = this._sync.bind(this);
        }

        onAdd(map) {
            this.map = map;
            this.container = document.createElement("div");
            this.container.className = "maplibregl-ctrl maplibregl-ctrl-group lm-ctrl-3d";
            this.button = document.createElement("button");
            this.button.type = "button";
            this.button.className = "lm-ctrl-3d-button";
            this.button.title = "Toggle 3D view";
            this.button.setAttribute("aria-label", "Toggle 3D view");
            this.button.innerHTML =
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7z"/><path d="M3.5 7 12 11.5 20.5 7"/><path d="M12 11.5v10"/></svg>';
            this.button.addEventListener("click", () => this.toggle());
            this.container.appendChild(this.button);
            map.on("pitchend", this._sync);
            this._sync();
            return this.container;
        }

        onRemove() {
            this.map?.off("pitchend", this._sync);
            this.container?.remove();
            this.map = null;
        }

        is3D() {
            return this.map.getPitch() > this.threshold;
        }

        toggle() {
            const enable = !this.is3D();
            this.map.easeTo({
                pitch: enable ? this.pitch : 0,
                bearing: enable ? this.bearing : 0,
                duration: this.duration,
            });
            this.ctx.dispatch("map:3d-toggled", { enabled: enable });
        }

        _sync() {
            if (!this.map) return;
            const active = this.is3D();
            this.button.classList.toggle("lm-active", active);
            this.button.setAttribute("aria-pressed", active ? "true" : "false");
        }
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Wait for a map to be created and its style loaded. Works across
     * wire:navigate. mapId may be null to use the first map on the page.
     */
    function waitForMap(mapId, callback, timeout = 10000) {
        const started = Date.now();
        const poll = () => {
            const id = mapId || Object.keys(contexts)[0];
            const ctx = id ? contexts[id] : null;
            if (ctx) {
                ctx.ready().then(callback);
                return;
            }
            if (Date.now() - started < timeout) {
                setTimeout(poll, 50);
            } else {
                console.warn("[livewire-mapcn] waitForMap timed out", mapId);
            }
        };
        poll();
    }

    window.LivewireMapPlugin = LivewireMapPlugin;
    window.LivewireMap = {
        version: VERSION,
        waitForMap,
        getMap: (id) => mapRegistry[id] || null,
        getRoute: (id) => routeRegistry.get(id) || null,
        maps: mapRegistry,
        geometry: {
            measureLine,
            pointAtFraction,
            sliceAtFraction,
            bearingAtFraction,
            buildArc,
            boundsOf,
            mergeHoverPaint,
        },
        utils: { escapeHTML, interpolate },
    };

    if (window.Alpine) {
        window.Alpine.plugin(LivewireMapPlugin);
    } else {
        document.addEventListener("alpine:init", () => {
            window.Alpine.plugin(LivewireMapPlugin);
        });
    }
})();
