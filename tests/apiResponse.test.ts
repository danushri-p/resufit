import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/apiResponse";

describe("readApiResponse", () => {
  it("parses a JSON response", async () => {
    await expect(
      readApiResponse(Response.json({ result: "ok" })),
    ).resolves.toEqual({ result: "ok" });
  });

  it("reports empty successful responses without leaking a JSON parse error", async () => {
    await expect(
      readApiResponse(new Response(null, { status: 200 })),
    ).rejects.toThrow("The server returned an empty response.");
  });

  it("includes the status for empty error responses", async () => {
    await expect(
      readApiResponse(new Response(null, { status: 500 })),
    ).rejects.toThrow("HTTP 500");
  });

  it("handles invalid JSON in an error response", async () => {
    await expect(
      readApiResponse(new Response("<html>error</html>", { status: 502 })),
    ).rejects.toThrow("HTTP 502");
  });
});
