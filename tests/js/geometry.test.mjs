// Run with: node --test "tests/js/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function loadRuntime() {
    const window = { addEventListener() {}, dispatchEvent() {} };
    const context = vm.createContext({
        window,
        document: { addEventListener() {}, documentElement: { classList: { contains: () => false }, getAttribute: () => null } },
        console,
        queueMicrotask,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
    });
    const source = readFileSync(new URL("../../resources/js/livewire-mapcn.js", import.meta.url), "utf8");
    vm.runInContext(source, context);
    return window.LivewireMap;
}

const { geometry, utils } = loadRuntime();
const same = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("measureLine accumulates segment lengths", () => {
    const m = geometry.measureLine([[0, 0], [1, 0], [1, 1]]);
    assert.equal(m.cumulative.length, 3);
    close(m.total, 2, 1e-4);
    same(geometry.measureLine([[0, 0]]), { cumulative: [], total: 0 });
});

test("sliceAtFraction interpolates inside a segment", () => {
    const line = [[0, 0], [2, 0]];
    const m = geometry.measureLine(line);
    same(geometry.sliceAtFraction(line, m, 0), []);
    same(geometry.sliceAtFraction(line, m, 1), line);
    const half = geometry.sliceAtFraction(line, m, 0.5);
    assert.equal(half.length, 2);
    close(half[1][0], 1);
    // Non-finite input is clamped to 0
    same(geometry.sliceAtFraction(line, m, NaN), []);
});

test("pointAtFraction walks multi-segment lines", () => {
    const line = [[0, 0], [1, 0], [1, 1]];
    const m = geometry.measureLine(line);
    const p = geometry.pointAtFraction(line, m, 0.75);
    close(p[0], 1, 1e-4);
    close(p[1], 0.5, 1e-3);
    same(geometry.pointAtFraction(line, m, 0), [0, 0]);
    same(geometry.pointAtFraction(line, m, 1), [1, 1]);
});

test("bearingAtFraction returns compass headings", () => {
    const north = [[0, 0], [0, 1]];
    const east = [[0, 0], [1, 0]];
    close(geometry.bearingAtFraction(north, geometry.measureLine(north), 0.5), 0);
    close(geometry.bearingAtFraction(east, geometry.measureLine(east), 0.5), 90);
});

test("buildArc bows away from the straight line and keeps endpoints", () => {
    const arc = geometry.buildArc([0, 0], [10, 0], 0.2, 10);
    assert.equal(arc.length, 11);
    same(arc[0], [0, 0]);
    close(arc[10][0], 10);
    close(arc[10][1], 0);
    assert.ok(arc[5][1] > 0, "midpoint should be offset to the left");
    same(geometry.buildArc([0, 0], [10, 0], 0, 10), [[0, 0], [10, 0]]);
});

test("buildArc crosses the antimeridian the short way", () => {
    const arc = geometry.buildArc([170, 0], [-170, 0], 0.2, 4);
    close(arc[arc.length - 1][0], 190);
});

test("boundsOf handles nested GeoJSON", () => {
    const fc = {
        type: "FeatureCollection",
        features: [
            { type: "Feature", geometry: { type: "Point", coordinates: [5, -3] } },
            { type: "Feature", geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 8], [0, 0]]] } },
        ],
    };
    same(geometry.boundsOf(fc), [[0, -3], [10, 8]]);
    assert.equal(geometry.boundsOf([]), null);
});

test("mergeHoverPaint wraps existing values in a feature-state case", () => {
    const merged = geometry.mergeHoverPaint({ "line-width": 2 }, { "line-width": 4, "line-opacity": 1 });
    same(merged["line-width"], ["case", ["boolean", ["feature-state", "hover"], false], 4, 2]);
    assert.equal(merged["line-opacity"], 1);
});

test("interpolate escapes property values", () => {
    const html = utils.interpolate("<b>{name}</b> {lat},{lng} {missing}", { name: "<img onerror=x>" }, [1, 2]);
    assert.equal(html, "<b>&lt;img onerror=x&gt;</b> 2,1 ");
});
