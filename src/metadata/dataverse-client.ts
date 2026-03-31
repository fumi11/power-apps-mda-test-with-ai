import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Dataverse Web API client — authenticates via MSAL and provides
 * helper methods for retrieving entity metadata, form definitions, and views.
 */
export class DataverseClient {
  private accessToken: string | null = null;
  private readonly baseUrl: string;
  private readonly msalApp: ConfidentialClientApplication;
  private readonly scopes: string[];

  constructor() {
    const envUrl = process.env.MDA_URL;
    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    if (!envUrl || !tenantId || !clientId || !clientSecret) {
      throw new Error(
        'Missing required env vars: MDA_URL, TENANT_ID, CLIENT_ID, CLIENT_SECRET'
      );
    }

    // Normalize base URL (remove trailing slash)
    this.baseUrl = envUrl.replace(/\/+$/, '');

    this.scopes = [`${this.baseUrl}/.default`];

    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  /**
   * Acquire an access token via client credentials flow.
   */
  async authenticate(): Promise<void> {
    const result = await this.msalApp.acquireTokenByClientCredential({
      scopes: this.scopes,
    });
    if (!result?.accessToken) {
      throw new Error('Failed to acquire access token from MSAL');
    }
    this.accessToken = result.accessToken;
  }

  /**
   * Fetch entity metadata (EntityDefinitions) for a given entity logical name.
   */
  async getEntityDefinition(entityLogicalName: string): Promise<Record<string, unknown>> {
    const url =
      `${this.baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')` +
      `?$expand=Attributes`;
    return this.fetch(url);
  }

  /**
   * Fetch system forms (main form XML) for a given entity.
   */
  async getSystemForms(entityLogicalName: string): Promise<Record<string, unknown>[]> {
    const url =
      `${this.baseUrl}/api/data/v9.2/systemforms` +
      `?$filter=objecttypecode eq '${entityLogicalName}' and type eq 2` +
      `&$select=name,formxml,formid`;
    const response = await this.fetch(url);
    return (response as Record<string, unknown>).value as Record<string, unknown>[];
  }

  /**
   * Fetch saved queries (system views) for a given entity.
   */
  async getViews(entityLogicalName: string): Promise<Record<string, unknown>[]> {
    const url =
      `${this.baseUrl}/api/data/v9.2/savedqueries` +
      `?$filter=returnedtypecode eq '${entityLogicalName}'` +
      `&$select=name,savedqueryid,fetchxml,layoutxml`;
    const response = await this.fetch(url);
    return (response as Record<string, unknown>).value as Record<string, unknown>[];
  }

  /**
   * Generic fetch helper with authorization header.
   */
  private async fetch(url: string): Promise<Record<string, unknown>> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await globalThis.fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Dataverse API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<Record<string, unknown>>;
  }
}
