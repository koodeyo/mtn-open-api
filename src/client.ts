import fetch, { Response, RequestInit, FetchError } from "node-fetch";
import { OpenAPIV3 } from "openapi-types";
import { IHashMapGeneric } from "./types";

export default class Client {
  base_url: URL;
  common_headers: Record<string, string>;

  constructor({
    schema,
    base_url = "",
    headers = {},
  }: {
    schema?: OpenAPIV3.Document;
    base_url?: string;
    headers?: IHashMapGeneric<string>;
  } = {}) {
    // Set default BaseURL
    if (!base_url && schema?.servers) {
      base_url = schema.servers[0].url;
    }

    this.base_url = new URL(base_url);
    this.common_headers = headers;
  }

  async makeRequest(
    httpMethod: string,
    path: string,
    headers: IHashMapGeneric<string>,
    params: IHashMapGeneric<string>
  ): Promise<any> {
    const url = new URL(path, this.base_url);
    // url.search = new URLSearchParams(params).toString();

    const requestHeaders = {
      ...headers,
      "Content-Type": "application/json",
    };

    const requestOptions: RequestInit = {
      method: httpMethod.toUpperCase(),
      headers: requestHeaders,
    };

    if (["POST", "PUT"].includes(httpMethod.toUpperCase())) {
      requestOptions.body = JSON.stringify(params);
    }

    try {
      const response: Response = await fetch(url.toString(), requestOptions);
      let parsedData;

      try {
        parsedData = await response.json();
      } catch {
        parsedData = await response.text();
      }

      return parsedData;
    } catch (error: any) {
      if (error instanceof FetchError) {
        return { statusCode: error.code, message: error.message };
      }

      throw error;
    }
  }
  private validateParameters(
    httpMethod: string,
    path: string,
    headers: IHashMapGeneric<string>,
    params: IHashMapGeneric<string>,
    operationDetails: OpenAPIV3.OperationObject
  ) {}

  private validateRequiredParameters(
    data: IHashMapGeneric<string>,
    schema: OpenAPIV3.ParameterObject[]
  ) {}

  private toCamelCase(operationId: string): string {
    // AbCd to ab_cd
    operationId = operationId
      .replace(/\W/g, "_")
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .toLowerCase();
    // _ -
    const words = operationId.split(/[_-]/);
    const camelCaseWords = words.map((w, i) =>
      i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)
    );

    return camelCaseWords.join("");
  }
}
