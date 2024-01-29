import * as fs from "fs";
import * as path from "path";
import * as YAML from "js-yaml";
import { OpenAPIV3 } from "openapi-types";

class CodeGenerator {
  static schemas = Object.freeze([
    {
      api: "sandbox-provisioning-api",
      namespace: "SandboxProvisioning",
      content: this.loadSchema("sandbox-provisioning-api"),
    },
    {
      api: "collection",
      namespace: "Collection",
      content: this.loadSchema("collection"),
    },
    {
      api: "disbursement",
      namespace: "Disbursement",
      content: this.loadSchema("disbursement"),
    },
    {
      api: "remittance",
      namespace: "Remittance",
      content: this.loadSchema("remittance"),
    },
  ]);

  private static loadSchema(filename: string): OpenAPIV3.Document {
    const rootDir = "./";
    const yamlPath = path.resolve(rootDir, `schemas/${filename}.yaml`);
    return YAML.load(fs.readFileSync(yamlPath, "utf8"));
  }

  private static toCamelCase(operationId: string): string {
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

  // Method definitions
  private static methodDefinitions(schema: OpenAPIV3.Document) {
    let output = "";

    Object.entries(schema.paths).forEach(([path, methods]) => {
      // @ts-ignore
      Object.entries(methods).forEach(([httpMethod, details]) => {
        const Tdetails = details as {
          operationId: string;
          description: string;
          parameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];
        };

        const operationId: string =
          Tdetails?.operationId || `${httpMethod} ${path}`;

        // Remove non-word characters (including "-") and convert to camel case
        const methodName = this.toCamelCase(operationId);

        // Define class methods
        output += `
        /**
        * ${Tdetails.description}
        */
        ${methodName}(params: IHashMapGeneric<string> = {}, headers: IHashMapGeneric<string> = {}){
          headers = {...this.headers, ...headers}

          const details = ${JSON.stringify({
            parameters: Tdetails.parameters,
          })} as OpenAPIV3.OperationObject

          this.validateParameters("${httpMethod}", "${path}", headers, params, details)

          return this.makeRequest("${httpMethod}", "${path}", headers, params)
        }\n\n`;
      });
    });

    return output;
  }

  static classDefinitions() {
    const schemas = this.schemas;

    return `
  import { OpenAPIV3 } from "openapi-types";
  import { IHashMapGeneric } from "../src/types";
  import Client from "../src/client";

  /**
   * Mtn Open Api
   * Visit https://momodeveloper.mtn.com/ for documentation
   */
  namespace MtnOpenApi {
    ${schemas
      .map(
        (schema) => `
      const ${schema.namespace}Scheam: OpenAPIV3.Document = ${JSON.stringify(schema.content)}
      /**
      * ${schema.content.info.description}
      */
      export class ${schema.namespace} extends Client {
        constructor({
          schema = ${schema.namespace}Scheam,
          base_url = "${
            schema.content.servers ? schema.content.servers[0].url : ""
          }",
          headers = {},
        }: {
          base_url?: string;
          schema?: OpenAPIV3.Document;
          headers?: IHashMapGeneric<string>;
        } = {}) {
          super({ schema, base_url, headers });
        }

        ${this.methodDefinitions(schema.content)}
      }
      `
      )
      .join("\n")}
  }

  // Export specific members from MtnOpenApi namespace
  export const { ${schemas
    .map((schema) => schema.namespace)
    .join(",")} } = MtnOpenApi;

  export default MtnOpenApi;
    `;
  }

  static generateIndexFile() {
    // Write code to file
    const folderPath = "./generated";
    const filePath = path.join(folderPath, "index.ts");

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(filePath, this.classDefinitions(), "utf8");
  }
}

CodeGenerator.generateIndexFile();
