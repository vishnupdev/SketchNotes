import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Test setup for the workspace's pure logic.
 *
 * Deliberately narrow. What is worth testing here is the code where a small
 * mistake is invisible until it has already cost someone something: the two
 * plain-English parsers (a regex tweak silently drops a phrasing that is
 * published in `llms.txt`), the transfer protocol, the backup reader, and the
 * geometry the canvas hit-tests with. All of it is framework-free, so the suite
 * needs no DOM, no renderer and no browser — which is what keeps it fast enough
 * to actually run.
 *
 * Components are not covered. They would need a DOM environment and a testing
 * library, and this project's UI is verified in a real browser (see the README);
 * a half-hearted component suite would add dependencies and false confidence
 * rather than cover.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Node, not jsdom: everything under test is DOM-free by design.
    environment: "node",
    include: ["src/**/*.test.ts"],
    // A run should be over in seconds; anything slower is a test doing too much.
    testTimeout: 10_000,
  },
});
