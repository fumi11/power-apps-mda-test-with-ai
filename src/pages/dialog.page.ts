import { Page } from '@playwright/test';

/**
 * DialogPage — MDA dialog interactions.
 * Covers lookup dialogs, delete confirmation, duplicate detection,
 * and generic custom dialogs.
 */
export class DialogPage {
  constructor(private readonly page: Page) {}

  // ─── Lookup Dialog ─────────────────────────────────────────────

  /**
   * Search for a record in a lookup dialog.
   */
  async lookupSearch(searchText: string): Promise<void> {
    const searchInput = this.page.locator(
      '[data-id="LookupPanel"] input, [data-id="lookupDialogLookup"] input'
    );
    await searchInput.fill(searchText);
    await searchInput.press('Enter');
    await this.page.waitForTimeout(1_000);
  }

  /**
   * Select a lookup result by display name.
   */
  async lookupSelectResult(displayName: string): Promise<void> {
    const result = this.page.locator(
      '[data-id="LookupPanel"] [data-id*="lookupItem"]',
      { hasText: displayName }
    );
    await result.click();
  }

  /**
   * Add the selected lookup results and close the dialog.
   */
  async lookupAdd(): Promise<void> {
    await this.page
      .locator('[data-id="LookupPanel"] button[data-id="lookupDialogFooter_addButton"]')
      .click();
  }

  /**
   * Cancel and close the lookup dialog.
   */
  async lookupCancel(): Promise<void> {
    await this.page
      .locator('[data-id="LookupPanel"] button[data-id="lookupDialogFooter_cancelButton"]')
      .click();
  }

  // ─── Delete Confirmation Dialog ────────────────────────────────

  /**
   * Confirm a delete dialog.
   */
  async confirmDelete(): Promise<void> {
    const confirmBtn = this.page.locator(
      '[data-id="confirmButton"], button[data-id="ok_id"], button[aria-label="Delete"]'
    );
    await confirmBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Cancel a delete dialog.
   */
  async cancelDelete(): Promise<void> {
    const cancelBtn = this.page.locator(
      '[data-id="cancelButton"], button[data-id="cancel_id"], button[aria-label="Cancel"]'
    );
    await cancelBtn.click();
  }

  // ─── Duplicate Detection Dialog ────────────────────────────────

  /**
   * Check if a duplicate detection dialog is visible.
   */
  async isDuplicateDialogVisible(): Promise<boolean> {
    const dialog = this.page.locator('[data-id="DuplicateDetection"]');
    return dialog.isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /**
   * Ignore duplicates and save anyway.
   */
  async ignoreDuplicatesAndSave(): Promise<void> {
    await this.page
      .locator(
        '[data-id="DuplicateDetection"] button[data-id="ignore_save"], button',
        { hasText: 'Ignore and save' }
      )
      .click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Cancel saving when duplicates are detected.
   */
  async cancelDuplicateSave(): Promise<void> {
    await this.page
      .locator('[data-id="DuplicateDetection"] button[data-id="back_to_form"], button[aria-label="Cancel"]')
      .click();
  }

  // ─── Custom / Generic Dialog ───────────────────────────────────

  /**
   * Wait for any modal dialog to appear.
   */
  async waitForDialog(timeout: number = 10_000): Promise<void> {
    await this.page
      .locator('[role="dialog"], [data-id="dialogWrapper"]')
      .waitFor({ state: 'visible', timeout });
  }

  /**
   * Click a dialog button by its label text.
   */
  async clickDialogButton(buttonLabel: string): Promise<void> {
    const dialog = this.page.locator('[role="dialog"], [data-id="dialogWrapper"]');
    await dialog.locator('button', { hasText: buttonLabel }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get dialog message text.
   */
  async getDialogMessage(): Promise<string> {
    const dialog = this.page.locator('[role="dialog"], [data-id="dialogWrapper"]');
    const message = dialog.locator('[data-id="dialogMessageText"], .ms-Dialog-content p');
    return (await message.textContent()) ?? '';
  }

  /**
   * Close a dialog by pressing the X button.
   */
  async closeDialog(): Promise<void> {
    const closeBtn = this.page.locator(
      '[role="dialog"] button[aria-label="Close"], [data-id="dialogWrapper"] button[aria-label="Close"]'
    );
    if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await closeBtn.click();
    }
  }
}
