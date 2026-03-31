import { EntityInfo } from '../../metadata/types';

/**
 * Prompt template factory — generates LLM prompts for different test patterns.
 */

const SYSTEM_PROMPT = `You are an expert Playwright + TypeScript test code generator for Power Apps Model-Driven Apps (MDA).

You generate complete, compilable .spec.ts test files that use these Page Object Model classes:
- AppShellPage: sitemap navigation, command bar, notifications
- FormPage: field operations (text, number, date, lookup, optionset, two-option), save, delete, BPF
- ViewPage: view switching, grid row selection, search, sort/filter
- DialogPage: lookup dialogs, delete confirmation, duplicate detection

Import convention:
\`\`\`typescript
import { test, expect } from '@playwright/test';
import { AppShellPage } from '../../src/pages/app-shell.page';
import { FormPage } from '../../src/pages/form.page';
import { ViewPage } from '../../src/pages/view.page';
import { DialogPage } from '../../src/pages/dialog.page';
\`\`\`

Rules:
1. Use data-id selectors and the POM methods — NEVER use raw selectors directly.
2. Use descriptive test names in English.
3. Clean up test data in afterEach/afterAll when records are created.
4. Include proper expect assertions for every significant action.
5. Output ONLY the TypeScript code — no explanations, no markdown fences.
`;

export function buildCrudPrompt(entity: EntityInfo): string {
  const fieldSummary = entity.attributes
    .filter((a) => a.DisplayName?.UserLocalizedLabel?.Label)
    .slice(0, 20)
    .map((a) => `  - ${a.LogicalName} (${a.AttributeType}): "${a.DisplayName.UserLocalizedLabel?.Label}"`)
    .join('\n');

  return `${SYSTEM_PROMPT}

Generate a Playwright test suite for CRUD operations on the "${entity.displayName}" (${entity.logicalName}) entity.

Entity info:
- Display name: ${entity.displayName}
- Collection name: ${entity.displayCollectionName}
- Primary name attribute: ${entity.primaryNameAttribute}

Key fields:
${fieldSummary}

The test suite should include:
1. test("Create a new ${entity.displayName} record") — navigate to entity list, click New, fill required fields, save
2. test("Read / open an existing ${entity.displayName} record") — search and open a record, verify field values
3. test("Update a ${entity.displayName} record") — open a record, modify fields, save, verify changes
4. test("Delete a ${entity.displayName} record") — open a record, delete, confirm, verify removal
`;
}

export function buildValidationPrompt(entity: EntityInfo): string {
  const requiredFields = entity.attributes
    .filter(
      (a) =>
        a.RequiredLevel?.Value === 'ApplicationRequired' ||
        a.RequiredLevel?.Value === 'SystemRequired'
    )
    .map((a) => `  - ${a.LogicalName}: "${a.DisplayName?.UserLocalizedLabel?.Label}" (${a.AttributeType})`)
    .join('\n');

  return `${SYSTEM_PROMPT}

Generate a Playwright test suite for form validation on the "${entity.displayName}" (${entity.logicalName}) entity.

Required fields:
${requiredFields || '  (no explicitly required fields found)'}

The test suite should include:
1. test("Show validation error when required fields are empty") — open new form, save immediately, check for errors
2. test("Show validation error for invalid field values") — enter invalid data, verify error indicators
3. test("Successfully save when all required fields are filled") — fill all required fields, save, verify success
`;
}

export function buildNavigationPrompt(entity: EntityInfo): string {
  return `${SYSTEM_PROMPT}

Generate a Playwright test suite for navigation related to the "${entity.displayName}" (${entity.logicalName}) entity.

Entity info:
- Display name: ${entity.displayName}
- Collection name: ${entity.displayCollectionName}

The test suite should include:
1. test("Navigate to ${entity.displayCollectionName} via sitemap") — use sitemap to navigate, verify view loads
2. test("Switch between views") — switch to different system views, verify grid changes
3. test("Use quick search to find records") — search for a record, verify results
4. test("Open a record from the grid and navigate back") — open record, verify form, go back to list
`;
}

export function buildBpfPrompt(entity: EntityInfo): string {
  return `${SYSTEM_PROMPT}

Generate a Playwright test suite for Business Process Flow (BPF) operations on the "${entity.displayName}" (${entity.logicalName}) entity.

The test suite should include:
1. test("Verify BPF stages are displayed on ${entity.displayName} form") — open form, check BPF visibility
2. test("Navigate to next BPF stage") — advance to next stage, verify stage change
3. test("Navigate to previous BPF stage") — go back to previous stage, verify
4. test("Select a specific BPF stage") — click a specific stage, verify it becomes active
`;
}
