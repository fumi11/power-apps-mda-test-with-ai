/**
 * Type definitions for Dataverse entity metadata, form definitions, and view definitions.
 */

export interface AttributeMetadata {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  AttributeType: string;
  RequiredLevel: {
    Value: string;
  };
  MaxLength?: number;
  MinValue?: number;
  MaxValue?: number;
  Description?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
}

export interface EntityMetadata {
  LogicalName: string;
  DisplayName: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  DisplayCollectionName: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string;
  Attributes: AttributeMetadata[];
}

export interface FormField {
  logicalName: string;
  displayName: string;
  type: string;
  required: boolean;
  section: string;
  tab: string;
}

export interface FormTab {
  name: string;
  label: string;
  sections: FormSection[];
}

export interface FormSection {
  name: string;
  label: string;
  fields: FormField[];
}

export interface FormDefinition {
  formId: string;
  name: string;
  tabs: FormTab[];
}

export interface ViewColumn {
  logicalName: string;
  displayName: string;
  width: number;
}

export interface ViewDefinition {
  viewId: string;
  name: string;
  columns: ViewColumn[];
  fetchXml: string;
}

export interface EntityInfo {
  logicalName: string;
  displayName: string;
  displayCollectionName: string;
  primaryIdAttribute: string;
  primaryNameAttribute: string;
  attributes: AttributeMetadata[];
  forms: FormDefinition[];
  views: ViewDefinition[];
}
