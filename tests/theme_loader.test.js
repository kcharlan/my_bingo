import { test } from "node:test";
import assert from "node:assert/strict";

import { createThemeLoader, fetchThemeMetadata } from "../js/theme/loader.js";

function createFakeDocument() {
  return {
    documentElement: {
      setAttribute() {},
      removeAttribute() {},
    },
  };
}

test("fetchThemeMetadata keeps the network error as cause", async () => {
  const networkError = new TypeError("Failed to fetch");
  const failingFetch = async () => {
    throw networkError;
  };

  await assert.rejects(fetchThemeMetadata(failingFetch, "./themes/x/theme.json", "x"), (error) => {
    assert.equal(error.message, 'Theme "x" metadata request failed: Failed to fetch');
    assert.equal(error.cause, networkError);
    return true;
  });
});

test("theme loader keeps the CSS network error as cause", async () => {
  const networkError = new TypeError("Failed to fetch");
  const fetchImpl = async (url) => {
    if (url.endsWith("theme.json")) {
      return {
        ok: true,
        json: async () => ({ name: "X", version: "1.0.0", css: "theme.css" }),
      };
    }
    throw networkError;
  };
  const loader = createThemeLoader({ document: createFakeDocument(), fetch: fetchImpl });

  await assert.rejects(loader.load("x"), (error) => {
    assert.equal(error.message, 'Theme "x" CSS request failed: Failed to fetch');
    assert.equal(error.cause, networkError);
    return true;
  });
});
