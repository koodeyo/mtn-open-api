import CodeGenerator from "./code-generator";
import fs from "fs";

function getSampleMethod(paths: any, methodName: string = "post") {
  let post;

  for (const [path, methods] of Object.entries(paths)) {
    // @ts-ignore
    for (const [httpMethod, details] of Object.entries(methods)) {
      if (httpMethod === methodName) {
        post = details;
        break; // This breaks out of the inner loop when a methodName method is found
      }
    }

    if (post) break; // This breaks out of the outer loop when a methodName method is found
  }

  return post;
}

function arrToH(arr: any[]) {
  return Object.fromEntries(arr.map((key) => [key, "string"]));
}

function apiDocs() {
  let output = "";

  CodeGenerator.schemas.forEach((schema) => {
    const namespace = schema.namespace;
    const content = schema.content;
    const paths = content.paths;
    const info = content.info;
    const api = schema.api;

    const defaultBaseUrl = content.servers ? content.servers[0].url : "";
    const instanceName = namespace.toLowerCase();
    const moduleName = "mtn-open-api";

    // Get sample request
    const sampleMethod =
      getSampleMethod(paths) || getSampleMethod(paths, "get");
    // Sample parameters
    const sampleParameters = sampleMethod.parameters;
    const sampleHeaders = sampleParameters
      .filter((p: any) => p.in === "header")
      .map((p: any) => p.name);
    const sampleBody = sampleMethod.requestBody.content;
    const sampleJson = sampleBody["application/json"];
    const sampleUrlencoded = sampleBody["application/x-www-form-urlencoded"];
    // Formatting params with application/x-www-form-urlencoded as string
    const paramsPrefixSurfix = `${!sampleJson ? '"' : ""}`;

    // Headers
    const sampleCommonHeaders = [
      "Authorization",
      "X-Callback-Url",
      "X-Target-Environment",
      "Ocp-Apim-Subscription-Key",
    ];
    const formattedCommonHeaders = JSON.stringify(
      arrToH(sampleCommonHeaders),
      null,
      2
    );
    const extraHeaders = sampleHeaders.filter(
      (header) => !sampleCommonHeaders.includes(header)
    );

    // Formatting document
    // Class documenting
    output += `## ${namespace}\n`;
    output += `${info.description}\n\n`;
    output += `This class provides a convenient interface for making requests to the MTN MoMo \`${api}\` API.\n`;
    output += "#### Initialization\n";
    output += "You can initialize it with the following parameters:\n";
    output += `
- \`base_url\` (optional): The base URL for the MTN MoMo \`${api}\` API. If not provided, the default value is ${defaultBaseUrl}.
- \`headers\` (optional): An Object of HTTP headers to be included in the API requests.
- \`schema\` (optional): An Object representing the API schema. If not provided, the gem will use the default schema, which is already included in the gem. You can also download the schema from [https://momodeveloper.mtn.com/API-collections#api=${api}](https://momodeveloper.mtn.com/API-collections#api=${api}).
    `;

    output += "\n#### Example\n```typescript\n";
    output += `const { ${namespace} } = require('${moduleName}');\n\n`;
    output += `const commonHeaders = ${formattedCommonHeaders};\n\n`;
    output += `const ${instanceName} = new ${namespace}({\n`;
    output += "  headers: commonHeaders,\n";
    output += `});\n\n`;
    output += `const params = ${paramsPrefixSurfix}${
      sampleJson
        ? JSON.stringify(sampleJson.example, null, 2)
        : sampleUrlencoded.example
    }${paramsPrefixSurfix};\n\n`;
    output += `const extraHeaders = ${JSON.stringify(
      arrToH(extraHeaders),
      null,
      extraHeaders.length > 0 ? 2 : 0
    )};\n\n`;
    output += `const response = ${instanceName}.${CodeGenerator.toCamelCase(
      sampleMethod.operationId
    )}(params, extraHeaders);\n\`\`\``;

    output += "\n";
    output += "#### Methods\n";

    for (const [path, methods] of Object.entries(paths)) {
      // @ts-ignore
      for (const [httpMethod, details] of Object.entries(methods)) {
        // @ts-ignore
        const methodName = CodeGenerator.toCamelCase(details.operationId);
        // @ts-ignore
        output += `- [${methodName}](https://momodeveloper.mtn.com/API-collections#api=${api}&operation=${details.operationId}) ${details.description}\n`;
      }
    }

    output += "\n";
  });

  return output;
}

const readmeContent: string = fs.readFileSync("readme-template", "utf8");

// Replace "TODO: Write usage instructions here"
const newContent = readmeContent
  .split("TODO: Write usage instructions here")
  .join(apiDocs());

fs.writeFileSync("README.md", newContent, "utf8");

// Write the modified content back to the README file
// Assuming writing to a file is handled in your environment
console.log("README file updated successfully!");
