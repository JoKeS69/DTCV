import { describe, expect, it } from "vitest";
import { previewImportPayload } from "@/lib/sync/import";

describe("manual import preview", () => {
  it("parses JSON rows", () => {
    const rows = previewImportPayload(
      JSON.stringify([
        {
          source: "europol",
          sourceId: "E-1",
          name: "Example Person",
          sourceUrl: "https://example.invalid/e1",
          summary: "Test",
        },
      ]),
      "json",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.ok).toBe(true);
    expect(rows[0]!.record?.source).toBe("europol");
  });

  it("parses CSV rows", () => {
    const csv = [
      "source,sourceId,name,sourceUrl,summary",
      "manual,M-1,Pat Example,https://example.invalid/m1,Hello",
    ].join("\n");
    const rows = previewImportPayload(csv, "csv");
    expect(rows[0]!.ok).toBe(true);
    expect(rows[0]!.record?.sourceId).toBe("M-1");
  });

  it("flags invalid rows", () => {
    const rows = previewImportPayload(
      JSON.stringify([{ source: "fbi", name: "Nope" }]),
      "json",
    );
    expect(rows[0]!.ok).toBe(false);
    expect(rows[0]!.errors.length).toBeGreaterThan(0);
  });
});
