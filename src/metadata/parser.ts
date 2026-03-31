import {
  EntityMetadata,
  AttributeMetadata,
  FormDefinition,
  FormTab,
  FormSection,
  FormField,
  ViewDefinition,
  ViewColumn,
  EntityInfo,
} from './types';

/**
 * Parse raw Dataverse EntityDefinition response into a typed EntityMetadata object.
 */
export function parseEntityMetadata(raw: Record<string, unknown>): EntityMetadata {
  return {
    LogicalName: raw.LogicalName as string,
    DisplayName: raw.DisplayName as EntityMetadata['DisplayName'],
    DisplayCollectionName: raw.DisplayCollectionName as EntityMetadata['DisplayCollectionName'],
    PrimaryIdAttribute: raw.PrimaryIdAttribute as string,
    PrimaryNameAttribute: raw.PrimaryNameAttribute as string,
    Attributes: (raw.Attributes as Record<string, unknown>[]).map(parseAttribute),
  };
}

/**
 * Parse a single attribute metadata object.
 */
function parseAttribute(raw: Record<string, unknown>): AttributeMetadata {
  return {
    LogicalName: raw.LogicalName as string,
    DisplayName: raw.DisplayName as AttributeMetadata['DisplayName'],
    AttributeType: raw.AttributeType as string,
    RequiredLevel: raw.RequiredLevel as AttributeMetadata['RequiredLevel'],
    MaxLength: raw.MaxLength as number | undefined,
    MinValue: raw.MinValue as number | undefined,
    MaxValue: raw.MaxValue as number | undefined,
    Description: raw.Description as AttributeMetadata['Description'],
  };
}

/**
 * Parse form XML string into a structured FormDefinition.
 * Form XML follows the Dataverse systemform schema.
 */
export function parseFormXml(
  formId: string,
  formName: string,
  formXml: string,
  attributes: AttributeMetadata[]
): FormDefinition {
  const tabs: FormTab[] = [];

  // Simple XML parsing using regex for portability (no XML parser dependency)
  const tabRegex = /<tab\s[^>]*name="([^"]*)"[^>]*>[\s\S]*?<labels>[\s\S]*?<label\s[^>]*description="([^"]*)"[\s\S]*?<\/tab>/g;
  let tabMatch: RegExpExecArray | null;

  while ((tabMatch = tabRegex.exec(formXml)) !== null) {
    const tabName = tabMatch[1];
    const tabLabel = tabMatch[2];
    const tabContent = tabMatch[0];

    const sections = parseSections(tabContent, tabName, attributes);
    tabs.push({ name: tabName, label: tabLabel, sections });
  }

  // Fallback: if no tabs parsed (XML format variations), create a default tab
  if (tabs.length === 0) {
    tabs.push({
      name: 'default',
      label: 'General',
      sections: parseSectionsFlat(formXml, attributes),
    });
  }

  return { formId, name: formName, tabs };
}

/**
 * Parse sections within a form tab XML fragment.
 */
function parseSections(
  tabXml: string,
  tabName: string,
  attributes: AttributeMetadata[]
): FormSection[] {
  const sections: FormSection[] = [];
  const sectionRegex = /<section\s[^>]*name="([^"]*)"[^>]*>[\s\S]*?<\/section>/g;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(tabXml)) !== null) {
    const sectionName = sectionMatch[1];
    const sectionContent = sectionMatch[0];

    // Extract label
    const labelMatch = sectionContent.match(/<label\s[^>]*description="([^"]*)"/);
    const sectionLabel = labelMatch?.[1] ?? sectionName;

    const fields = parseFields(sectionContent, tabName, sectionName, attributes);
    sections.push({ name: sectionName, label: sectionLabel, fields });
  }

  return sections;
}

/**
 * Fallback: parse sections from full form XML when tab structure is not standard.
 */
function parseSectionsFlat(
  formXml: string,
  attributes: AttributeMetadata[]
): FormSection[] {
  const fields = parseFields(formXml, 'default', 'default', attributes);
  return [{ name: 'default', label: 'General', fields }];
}

/**
 * Parse field (control) references from a section XML fragment.
 */
function parseFields(
  xml: string,
  tabName: string,
  sectionName: string,
  attributes: AttributeMetadata[]
): FormField[] {
  const fields: FormField[] = [];
  const controlRegex = /<control\s[^>]*datafieldname="([^"]*)"[^>]*/g;
  let controlMatch: RegExpExecArray | null;

  const attrMap = new Map(attributes.map((a) => [a.LogicalName, a]));

  while ((controlMatch = controlRegex.exec(xml)) !== null) {
    const logicalName = controlMatch[1];
    const attr = attrMap.get(logicalName);

    fields.push({
      logicalName,
      displayName: attr?.DisplayName?.UserLocalizedLabel?.Label ?? logicalName,
      type: attr?.AttributeType ?? 'Unknown',
      required: attr?.RequiredLevel?.Value === 'ApplicationRequired' ||
                attr?.RequiredLevel?.Value === 'SystemRequired',
      section: sectionName,
      tab: tabName,
    });
  }

  return fields;
}

/**
 * Parse a view layout XML + fetchXml into a ViewDefinition.
 */
export function parseViewDefinition(
  viewId: string,
  viewName: string,
  layoutXml: string,
  fetchXml: string
): ViewDefinition {
  const columns: ViewColumn[] = [];

  // Extract columns from layoutxml
  const cellRegex = /<cell\s[^>]*name="([^"]*)"[^>]*width="([^"]*)"[^>]*/g;
  let cellMatch: RegExpExecArray | null;

  while ((cellMatch = cellRegex.exec(layoutXml)) !== null) {
    columns.push({
      logicalName: cellMatch[1],
      displayName: cellMatch[1], // Will be enriched later with attribute display names
      width: parseInt(cellMatch[2], 10) || 100,
    });
  }

  return { viewId, name: viewName, columns, fetchXml };
}

/**
 * Build a full EntityInfo object from raw API responses.
 */
export function buildEntityInfo(
  entityDef: Record<string, unknown>,
  rawForms: Record<string, unknown>[],
  rawViews: Record<string, unknown>[]
): EntityInfo {
  const metadata = parseEntityMetadata(entityDef);

  const forms = rawForms.map((f) =>
    parseFormXml(
      f.formid as string,
      f.name as string,
      f.formxml as string,
      metadata.Attributes
    )
  );

  const views = rawViews.map((v) =>
    parseViewDefinition(
      v.savedqueryid as string,
      v.name as string,
      (v.layoutxml as string) || '',
      (v.fetchxml as string) || ''
    )
  );

  return {
    logicalName: metadata.LogicalName,
    displayName: metadata.DisplayName?.UserLocalizedLabel?.Label ?? metadata.LogicalName,
    displayCollectionName:
      metadata.DisplayCollectionName?.UserLocalizedLabel?.Label ?? metadata.LogicalName,
    primaryIdAttribute: metadata.PrimaryIdAttribute,
    primaryNameAttribute: metadata.PrimaryNameAttribute,
    attributes: metadata.Attributes,
    forms,
    views,
  };
}
