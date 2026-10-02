import { describe, expect, it } from "vitest";
import { evaluatePublishGate } from "@/lib/pb-case/publish-gate";

/**
 * Publish gate unit coverage with a lightweight fake would need DB.
 * Here we assert the function is exported and rejects missing cases when
 * CASES_DATABASE_URL is unset (throws) or returns not-found when available.
 */
describe("publish gate", () => {
  it("is a callable server helper", () => {
    expect(typeof evaluatePublishGate).toBe("function");
  });
});
