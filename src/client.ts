import fetch, { Response, RequestInit, FetchError } from "node-fetch";
import * as jsonschema from "jsonschema";
import { OpenAPIV3 } from "openapi-types";
import { IHashMapGeneric } from "./types";

export default class Client {
  base_url: URL;
  common_headers: IHashMapGeneric<string>;

  constructor({
    schema,
    base_url = "",
    headers = {},
  }: {
    base_url?: string;
    schema?: OpenAPIV3.Document;
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
    const pathFormated = this.replacePathVariables(path, params);
    const url = new URL(pathFormated, this.base_url);

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

  validateParameters(
    httpMethod: string,
    path: string,
    headers: IHashMapGeneric<string>,
    params: IHashMapGeneric<string>,
    operationDetails: OpenAPIV3.OperationObject
  ) {
    // Validate required headers
    const requiredHeaders = (operationDetails.parameters?.filter(
      (param: OpenAPIV3.ParameterObject) =>
        param.in === "header" && param.required
    ) || []) as OpenAPIV3.ParameterObject[];

    this.validateRequiredParameters(headers, requiredHeaders);

    // Validate required path parameters
    const pathParams = (path.match(/{(\w+)}/g) || []).map((match) =>
      match.slice(1, -1)
    );

    const requiredPathParams = (operationDetails.parameters?.filter(
      (param: OpenAPIV3.ParameterObject) =>
        param.in === "path" && pathParams.includes(param.name) && param.required
    ) || []) as OpenAPIV3.ParameterObject[];

    this.validateRequiredParameters(params, requiredPathParams);

    // Validate required query parameters
    const requiredQueryParams = (operationDetails.parameters?.filter(
      (param: OpenAPIV3.ParameterObject) =>
        param.in === "query" && param.required
    ) || []) as OpenAPIV3.ParameterObject[];

    this.validateRequiredParameters(params, requiredQueryParams);
  }

  private validateRequiredParameters(
    data: IHashMapGeneric<string>,
    schema: OpenAPIV3.ParameterObject[]
  ) {
    schema.forEach((paramSchema) => {
      const paramName = paramSchema.name;
      // Check if the parameter is present in the data
      if (!(paramName in data)) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }

      // Validate the parameter against the schema
      if (!jsonschema.validate(data[paramName], paramSchema.schema).valid) {
        throw new Error(`Invalid value for parameter: ${paramName}`);
      }
    });
  }

  private replacePathVariables(
    path: string,
    params: IHashMapGeneric<string>
  ): string {
    // "/path/{param1}/name/{param2}"

    return path.replace(/{([^{}]+)}/g, (_, variable) => params[variable]);
  }
}
