import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../themes/thanksgiving2/theme.css", import.meta.url),
  "utf8"
).replace(/\/\*[\s\S]*?\*\//g, "");

function declaration(selector, property) {
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

test("Thanksgiving2 Free-square marker contrasts with its tinted background", () => {
  const prefix = ':root[data-theme="thanksgiving2"] .board__cell';
  const background = hexColor(declaration(`${prefix}[data-free="true"]`, "background"));
  const marker = hexColor(
    declaration(`${prefix}[data-free="true"][data-state="marked"]::before`, "color") ??
      declaration(`${prefix}[data-state="marked"]::before`, "color")
  );
  const overlay = declaration(`${prefix}[data-state="marked"]::after`, "background");
  const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(overlay ?? "");
  assert.ok(rgba, `Expected an rgba overlay, got ${overlay}`);
  const overlayRgb = rgba.slice(1, 4).map(Number);
  const alpha = Number(rgba[4]);
  const renderedBackground = blend(overlayRgb, background, alpha);
  const renderedMarker = blend(overlayRgb, marker, alpha);
  const values = [luminance(renderedBackground), luminance(renderedMarker)].sort((a, b) => b - a);
  const ratio = (values[0] + 0.05) / (values[1] + 0.05);
  assert.ok(ratio >= 4.5, `Free-square marker contrast is ${ratio.toFixed(2)}:1; need 4.5:1`);
});
