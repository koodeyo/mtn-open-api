import { OpenAPIV3 } from "openapi-types";
import Client from "../src/client";

describe("Client", () => {
  let client: Client;

  beforeEach(() => {
    const base_url = "https://httpbingo.org";
    const headers = { Authorization: "Bearer Token" };

    client = new Client({ base_url, headers });
  });

  describe("makeRequest", () => {
    it("should make a successful GET request", async () => {
      const result = await client.makeRequest("GET", "/user-agent", {
        "User-Agent": "jest",
      }, {});

      expect(result["user-agent"]).toBe("jest");
    });
  });
});
