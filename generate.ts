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

  private static getFunctions(schema: OpenAPIV3.Document) {
    let output = "";

    Object.entries(schema.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([httpMethod, details]) => {
        const Tdetails = details as {
          operationId: string;
          description: string;
        };

        const operationId: string =
          Tdetails?.operationId || `${httpMethod} ${path}`;

        // Remove non-word characters (including "-") and convert to camel case
        const methodName = this.toCamelCase(operationId);

        // Define class functions
        output += `
        /**
        * ${Tdetails.description}
        */
        ${methodName}(params: IHashMapGeneric<string> = {}, headers: IHashMapGeneric<string> = {}){
          headers = {...this.common_headers, ...headers}

          const details: OpenAPIV3.OperationObject = ${JSON.stringify(details)}

          this.validateParameters("${httpMethod}", "${path}", headers, params, details)

          this.makeRequest("${httpMethod}", "${path}", headers, params)
        }\n\n`;
      });
    });

    return output;
  }

  static generateIndexFile() {
    const schemas = this.schemas;

    const code = `
  import { OpenAPIV3 } from "openapi-types";
  import { IHashMapGeneric } from "../src/types";
  import Client from "../src/client";

  // Mtn Open API
  namespace MtnOpenApi {
    ${schemas
      .map(
        (schema) => `
      /**
      * ${schema.content.info.description}
      */
      export class ${schema.namespace} extends Client {
        constructor({
          schema,
          base_url = "${schema.content.servers[0].url}",
          headers = {},
        }: {
          base_url?: string;
          schema?: OpenAPIV3.Document;
          headers?: IHashMapGeneric<string>;
        }) {
          super({ schema, base_url, headers });
        }

        ${this.getFunctions(schema.content)}
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

    // Write code to file
    const folderPath = "./generated";
    const filePath = path.join(folderPath, "index.ts");

    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(filePath, code, "utf8");
  }
}

CodeGenerator.generateIndexFile();
