import { describe, expect, it } from "vitest";
import { extractInitialData, videosFromData } from "./parse-youtube";

/**
 * The parser reads someone else's internal payload, so these tests are about
 * the two ways that goes wrong: a boundary that a naive regex gets subtly wrong
 * (a `};` inside a video title), and a field that has moved, changed type or
 * gone missing. A result that loses a field should lose that field only; a
 * result that loses its id or title should disappear rather than render as an
 * empty card.
 */

/** Wrap renderers the way a results page nests them — several layers deep. */
const page = (renderers: unknown[]) => ({
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [{ itemSectionRenderer: { contents: renderers } }],
        },
      },
    },
  },
});

const video = (over: Record<string, unknown> = {}) => ({
  videoRenderer: {
    videoId: "abc12345678",
    title: { runs: [{ text: "A song" }] },
    longBylineText: {
      runs: [
        {
          text: "A Channel",
          navigationEndpoint: { browseEndpoint: { browseId: "UCxxxxxxxxxxxxxxxxxxxxxx" } },
        },
      ],
    },
    lengthText: { simpleText: "3:52" },
    shortViewCountText: { simpleText: "1.2M views" },
    publishedTimeText: { simpleText: "3 years ago" },
    ...over,
  },
});

describe("extractInitialData", () => {
  it("reads the blob out of a script tag", () => {
    const html = `<script>var ytInitialData = {"a":1,"b":[2,3]};</script><div>rest</div>`;
    expect(extractInitialData(html)).toEqual({ a: 1, b: [2, 3] });
  });

  it("does not stop at a '};' that is inside a string value", () => {
    // The exact case a non-greedy `\{.*?\};` regex truncates.
    const html = `<script>var ytInitialData = {"title":"end of set};","ok":true};</script>`;
    expect(extractInitialData(html)).toEqual({ title: "end of set};", ok: true });
  });

  it("is not fooled by an escaped quote before the closing brace", () => {
    const html = `<script>var ytInitialData = {"title":"a \\" brace } here","ok":true};</script>`;
    expect(extractInitialData(html)).toEqual({ title: 'a " brace } here', ok: true });
  });

  it("returns null when the page has no blob at all", () => {
    expect(extractInitialData("<html><body>consent wall</body></html>")).toBeNull();
  });

  it("returns null rather than throwing on a truncated blob", () => {
    expect(extractInitialData(`<script>var ytInitialData = {"a":1`)).toBeNull();
  });
});

describe("videosFromData", () => {
  it("normalises a recorded video", () => {
    expect(videosFromData(page([video()]), 10)).toEqual([
      {
        id: "abc12345678",
        title: "A song",
        channel: "A Channel",
        channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
        live: false,
        duration: "3:52",
        meta: "1.2M views · 3 years ago",
      },
    ]);
  });

  it("reads a live badge, and drops the duration a live stream never has", () => {
    const [found] = videosFromData(
      page([
        video({
          badges: [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_LIVE_NOW", label: "LIVE" } }],
          lengthText: undefined,
          viewCountText: { runs: [{ text: "12,935" }, { text: " watching" }] },
        }),
      ]),
      10,
    );
    expect(found.live).toBe(true);
    expect(found.duration).toBeNull();
    expect(found.meta).toBe("12,935 watching");
  });

  it("treats a 'watching' count as live even with no badge", () => {
    const [found] = videosFromData(
      page([video({ viewCountText: { simpleText: "8 watching" } })]),
      10,
    );
    expect(found.live).toBe(true);
  });

  it("drops results with no id or no title", () => {
    const found = videosFromData(
      page([video({ videoId: undefined }), video({ title: undefined }), video()]),
      10,
    );
    expect(found.map((v) => v.id)).toEqual(["abc12345678"]);
  });

  it("keeps a result whose optional fields are missing or the wrong type", () => {
    const [found] = videosFromData(
      page([
        video({
          longBylineText: 42,
          ownerText: undefined,
          shortBylineText: undefined,
          lengthText: undefined,
          shortViewCountText: undefined,
          publishedTimeText: undefined,
          viewCountText: undefined,
        }),
      ]),
      10,
    );
    expect(found).toEqual({
      id: "abc12345678",
      title: "A song",
      channel: "YouTube",
      channelId: null,
      live: false,
      duration: null,
      meta: null,
    });
  });

  it("de-duplicates the same video appearing in a shelf and the list", () => {
    expect(videosFromData(page([video(), video()]), 10)).toHaveLength(1);
  });

  it("returns at most the requested number", () => {
    const many = Array.from({ length: 12 }, (_, i) => video({ videoId: `id${i}` }));
    expect(videosFromData(page(many), 5)).toHaveLength(5);
  });

  it("returns nothing for a page it cannot understand", () => {
    expect(videosFromData({ error: "nope" }, 10)).toEqual([]);
  });
});
