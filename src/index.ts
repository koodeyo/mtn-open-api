import Client from "./client";

namespace MtnOpenApi {
  export class Collection extends Client {
    // const schema: OpenAPIV3.Document = {};
  }

  export class Disbursement extends Client {}

  export class Remittance extends Client {}

  export class SandboxProvisioning extends Client {}
}

// Export specific members from MtnOpenApi namespace
export const { Collection, Disbursement, Remittance, SandboxProvisioning } =
  MtnOpenApi;

export default MtnOpenApi;
