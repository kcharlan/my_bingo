import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function declaration(css, selector, property) {
  const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
    ([, candidate]) => candidate.trim() === selector
  );
  if (!rule) return undefined;
  const entry = rule[2]
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${property}:`));
  return entry?.slice(entry.indexOf(":") + 1).trim();
}

function hexColor(value) {
  assert.match(value ?? "", /^#[0-9a-f]{6}$/i, `Expected a six-digit color, got ${value}`);
  return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function blend(foreground, background, alpha) {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

function luminance(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

for (const theme of ["high_contrast", "thanksgiving", "thanksgiving2"]) {
  const css = readFileSync(
    new URL(`../themes/${theme}/theme.css`, import.meta.url),
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  const prefix = `:root[data-theme="${theme}"] .board__cell`;
  const backgroundSuffixes = {
    free: '[data-free="true"]',
    ordinary: "",
    hovered: ':not([data-free="true"]):hover',
  };
  for (const [state, backgroundSuffix] of Object.entries(backgroundSuffixes)) {
    test(`${theme} ${state} marker contrasts with its tinted background`, () => {
      const background = hexColor(declaration(css, `${prefix}${backgroundSuffix}`, "background"));
      function markedDeclaration(pseudo, property) {
        const specific =
          state === "free"
            ? declaration(
                css,
                `${prefix}[data-free="true"][data-state="marked"]::${pseudo}`,
                property
              )
            : undefined;
        return specific ?? declaration(css, `${prefix}[data-state="marked"]::${pseudo}`, property);
      }
      const marker = hexColor(markedDeclaration("before", "color"));
      const overlay = markedDeclaration("after", "background");
      const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(
        overlay ?? ""
      );
      assert.ok(rgba, `Expected an rgba overlay, got ${overlay}`);
      const overlayRgb = rgba.slice(1, 4).map(Number);
      const alpha = Number(rgba[4]);
      const renderedBackground = blend(overlayRgb, background, alpha);
      const renderedMarker = blend(overlayRgb, marker, alpha);
      const values = [luminance(renderedBackground), luminance(renderedMarker)].sort(
        (a, b) => b - a
      );
      const ratio = (values[0] + 0.05) / (values[1] + 0.05);
      assert.ok(ratio >= 4.5, `Marker contrast is ${ratio.toFixed(2)}:1; need 4.5:1`);
    });
  }
}
