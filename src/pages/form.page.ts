import { Page, Locator } from '@playwright/test';

/**
 * FormPage — MDA entity form interactions.
 * Covers field operations, tab/section handling, save/create/update/delete,
 * BPF stage navigation, and form validation error detection.
 */
export class FormPage {
  constructor(private readonly page: Page) {}

  // ─── Field Operations ──────────────────────────────────────────

  /**
   * Set a text field value by its logical name.
   */
  async setTextField(fieldName: string, value: string): Promise<void> {
    const field = this.getFieldLocator(fieldName).locator('input, textarea');
    await field.click();
    await field.fill(value);
    await field.press('Tab');
  }

  /**
   * Get a text field value.
   */
  async getTextField(fieldName: string): Promise<string> {
    const field = this.getFieldLocator(fieldName).locator('input, textarea');
    return (await field.inputValue()) ?? '';
  }

  /**
   * Set a numeric field value.
   */
  async setNumberField(fieldName: string, value: number): Promise<void> {
    await this.setTextField(fieldName, value.toString());
  }

  /**
   * Get a numeric field value.
   */
  async getNumberField(fieldName: string): Promise<number> {
    const text = await this.getTextField(fieldName);
    return parseFloat(text.replace(/,/g, '')) || 0;
  }

  /**
   * Set a date field value (format: MM/DD/YYYY or locale-specific).
   */
  async setDateField(fieldName: string, dateValue: string): Promise<void> {
    const field = this.getFieldLocator(fieldName).locator('input');
    await field.click();
    await field.fill(dateValue);
    await field.press('Tab');
  }

  /**
   * Select a lookup field value by searching and picking from results.
   */
  async setLookupField(fieldName: string, searchText: string): Promise<void> {
    const lookupContainer = this.getFieldLocator(fieldName);
    const input = lookupContainer.locator('input');
    await input.click();
    await input.fill(searchText);

    // Wait for lookup results to appear and select the first result
    const result = this.page.locator(
      '[data-id="LookupResultsDropdown"] [data-id="LookupResultsDropdown_item"]'
    ).first();
    await result.waitFor({ state: 'visible', timeout: 10_000 });
    await result.click();
  }

  /**
   * Clear a lookup field.
   */
  async clearLookupField(fieldName: string): Promise<void> {
    const lookupContainer = this.getFieldLocator(fieldName);
    const removeBtn = lookupContainer.locator(
      'button[data-id*="selected_tag_delete"], button[aria-label="Remove"]'
    );
    if (await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await removeBtn.click();
    }
  }

  /**
   * Set an option set (dropdown) field by display text.
   */
  async setOptionSetField(fieldName: string, optionText: string): Promise<void> {
    const container = this.getFieldLocator(fieldName);
    const select = container.locator('select');
    await select.selectOption({ label: optionText });
  }

  /**
   * Get the selected option set value text.
   */
  async getOptionSetField(fieldName: string): Promise<string> {
    const container = this.getFieldLocator(fieldName);
    const selectedOption = container.locator('select option:checked');
    return (await selectedOption.textContent()) ?? '';
  }

  /**
   * Set a two-option (boolean) field.
   */
  async setTwoOptionField(fieldName: string, value: boolean): Promise<void> {
    const container = this.getFieldLocator(fieldName);
    const toggle = container.locator('[role="switch"], [role="checkbox"]');
    const currentState = (await toggle.getAttribute('aria-checked')) === 'true';
    if (currentState !== value) {
      await toggle.click();
    }
  }

  /**
   * Get the value of a two-option (boolean) field.
   */
  async getTwoOptionField(fieldName: string): Promise<boolean> {
    const container = this.getFieldLocator(fieldName);
    const toggle = container.locator('[role="switch"], [role="checkbox"]');
    return (await toggle.getAttribute('aria-checked')) === 'true';
  }

  // ─── Header Fields ─────────────────────────────────────────────

  /**
   * Set a header field value.
   */
  async setHeaderField(fieldName: string, value: string): Promise<void> {
    const headerField = this.page
      .locator(`[data-id="header_${fieldName}"]`)
      .locator('input, textarea, select');
    await headerField.click();
    await headerField.fill(value);
    await headerField.press('Tab');
  }

  // ─── Tab / Section ─────────────────────────────────────────────

  /**
   * Expand or navigate to a form tab by label.
   */
  async selectTab(tabLabel: string): Promise<void> {
    const tab = this.page.locator(`li[role="tab"]`, { hasText: tabLabel });
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Expand a collapsible section.
   */
  async expandSection(sectionLabel: string): Promise<void> {
    const section = this.page.locator(`[data-id*="section"]`, { hasText: sectionLabel });
    const chevron = section.locator('button[aria-expanded="false"]');
    if (await chevron.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chevron.click();
    }
  }

  /**
   * Collapse a section.
   */
  async collapseSection(sectionLabel: string): Promise<void> {
    const section = this.page.locator(`[data-id*="section"]`, { hasText: sectionLabel });
    const chevron = section.locator('button[aria-expanded="true"]');
    if (await chevron.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await chevron.click();
    }
  }

  // ─── Save / CRUD Operations ────────────────────────────────────

  /**
   * Click "Save" on the form.
   */
  async save(): Promise<void> {
    await this.page.locator('[data-id="edit-form-save-btn"]').click();
    await this.waitForSaveComplete();
  }

  /**
   * Click "Save & Close" on the form.
   */
  async saveAndClose(): Promise<void> {
    await this.page.locator('[data-id="edit-form-save-and-close-btn"]').click();
    await this.waitForSaveComplete();
  }

  /**
   * Delete the current record from the form.
   */
  async deleteRecord(): Promise<void> {
    // Click Delete from command bar
    await this.page.locator('[data-id="CommandBar"] button', { hasText: 'Delete' }).click();

    // Confirm deletion
    const confirmBtn = this.page.locator(
      '[data-id="confirmButton"], button[aria-label="Delete"], button[data-id="ok_id"]'
    );
    await confirmBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ─── Business Process Flow (BPF) ──────────────────────────────

  /**
   * Get the current BPF stage name.
   */
  async getBpfStageName(): Promise<string> {
    const activeStage = this.page.locator(
      '[data-id="BPF"] .ms-BPF-activeStage, [data-id*="stage"][aria-current="true"]'
    );
    return (await activeStage.textContent()) ?? '';
  }

  /**
   * Move to the next BPF stage.
   */
  async bpfNextStage(): Promise<void> {
    await this.page
      .locator('[data-id="BPF"] button[aria-label="Next Stage"], button[data-id*="nextStage"]')
      .click();
    await this.page.waitForTimeout(1_000);
  }

  /**
   * Move to the previous BPF stage.
   */
  async bpfPreviousStage(): Promise<void> {
    await this.page
      .locator('[data-id="BPF"] button[aria-label="Back"], button[data-id*="previousStage"]')
      .click();
    await this.page.waitForTimeout(1_000);
  }

  /**
   * Select a specific BPF stage by label.
   */
  async bpfSelectStage(stageName: string): Promise<void> {
    await this.page
      .locator('[data-id="BPF"] [role="listitem"]', { hasText: stageName })
      .click();
    await this.page.waitForTimeout(1_000);
  }

  // ─── Validation Errors ─────────────────────────────────────────

  /**
   * Check if the form has validation errors.
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorContainer = this.page.locator(
      '[data-id="notificationWrapper"] .ms-MessageBar--error, [data-id="header_notificationWrapper"]'
    );
    return errorContainer.isVisible({ timeout: 3_000 }).catch(() => false);
  }

  /**
   * Get all validation error messages displayed on the form.
   */
  async getValidationErrors(): Promise<string[]> {
    const errors = this.page.locator(
      '[data-id="notificationWrapper"] .ms-MessageBar--error .ms-MessageBar-text'
    );
    const count = await errors.count();
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await errors.nth(i).textContent();
      if (text) messages.push(text.trim());
    }
    return messages;
  }

  /**
   * Check if a specific field has an error indicator.
   */
  async fieldHasError(fieldName: string): Promise<boolean> {
    const container = this.getFieldLocator(fieldName);
    const errorIcon = container.locator('[data-id*="error"], .ms-Icon--ErrorBadge');
    return errorIcon.isVisible({ timeout: 3_000 }).catch(() => false);
  }

  // ─── Helpers ───────────────────────────────────────────────────

  /**
   * Get the field container locator by logical name (data-id attribute).
   */
  private getFieldLocator(fieldName: string): Locator {
    return this.page.locator(`[data-id="${fieldName}"], [data-id="${fieldName}-field-container"]`);
  }

  /**
   * Wait for a save operation to complete.
   */
  private async waitForSaveComplete(): Promise<void> {
    // Wait for loading overlay to disappear
    await this.page
      .locator('.ms-Spinner, [data-id="loading-spinner"]')
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {});
    await this.page.waitForLoadState('domcontentloaded');
  }
}
