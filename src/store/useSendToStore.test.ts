import { beforeEach, describe, expect, it } from "vitest";
import { MAX_SEND_TEXT } from "@/lib/sendto/types";
import { hasSendTo, useSendToStore } from "./useSendToStore";

/**
 * The Send to… waiting room.
 *
 * The behaviour worth pinning down is the destructive read. Apps here re-mount
 * every time the user switches away and back, so a payload that survived being
 * taken would be re-delivered on every visit — the same paragraph appended to a
 * document again and again, with nothing on screen to explain why.
 */
const send = () => useSendToStore.getState().send;
const take = () => useSendToStore.getState().take;
const pending = () => useSendToStore.getState().pending;

beforeEach(() => useSendToStore.getState().clear());

describe("useSendToStore", () => {
  it("delivers a payload only to the app it is addressed to", () => {
    send()({ kind: "text", to: "markdown", from: "ocr", value: "hello", label: "Recognised text" });

    expect(take()("board")).toBeNull();
    expect(take()("markdown")?.value).toBe("hello");
  });

  it("hands a payload over exactly once", () => {
    send()({ kind: "color", to: "contrast", from: "color", value: "#3a86ff", label: "Picked colour" });

    expect(take()("contrast")?.value).toBe("#3a86ff");
    expect(take()("contrast")).toBeNull();
    expect(pending()).toHaveLength(0);
  });

  it("keeps several payloads for one app in the order they were sent", () => {
    send()({ kind: "text", to: "markdown", from: "ocr", value: "first", label: "Recognised text" });
    send()({ kind: "text", to: "markdown", from: "voice", value: "second", label: "Transcript" });

    expect(take()("markdown")?.value).toBe("first");
    expect(take()("markdown")?.value).toBe("second");
  });

  it("trims and caps on the way in, so no destination has to", () => {
    const item = send()({
      kind: "text",
      to: "markdown",
      from: "ocr",
      value: `  ${"a".repeat(MAX_SEND_TEXT + 50)}  `,
      label: "Recognised text",
    });

    expect(item.value).toHaveLength(MAX_SEND_TEXT);
  });

  it("reports what is waiting without exposing the queue", () => {
    expect(hasSendTo("markdown")(useSendToStore.getState())).toBe(false);

    send()({ kind: "text", to: "markdown", from: "ocr", value: "hello", label: "Recognised text" });

    expect(hasSendTo("markdown")(useSendToStore.getState())).toBe(true);
    expect(hasSendTo("board")(useSendToStore.getState())).toBe(false);
  });
});
