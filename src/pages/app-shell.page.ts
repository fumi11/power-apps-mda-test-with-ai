import { Page, Locator } from '@playwright/test';

/**
 * AppShellPage — MDA application shell interactions.
 * Covers sitemap navigation, command bar, notifications, and loading states.
 */
export class AppShellPage {
  private readonly sitemapButton: Locator;
  private readonly commandBar: Locator;
  private readonly notificationBar: Locator;

  constructor(private readonly page: Page) {
    this.sitemapButton = page.locator('button[id="sitemap-button"], button[aria-label="Site Map"]');
    this.commandBar = page.locator('[data-id="CommandBar"]');
    this.notificationBar = page.locator('[data-id="notificationWrapper"]');
  }

  // ─── Sitemap Navigation ────────────────────────────────────────

  /**
   * Open the sitemap panel.
   */
  async openSitemap(): Promise<void> {
    await this.sitemapButton.click();
    await this.page.locator('[data-lp-id="sitemap-entity"]').first().waitFor({ state: 'visible' });
  }

  /**
   * Switch the sitemap area (e.g., "Sales", "Service", "Settings").
   */
  async switchArea(areaName: string): Promise<void> {
    const areaChevron = this.page.locator(
      'button[aria-label="Change area"], button[data-id="sitemap-areaSwitcher-expand-btn"]'
    );
    await areaChevron.click();
    await this.page.locator(`[data-id="sitemap-area-btn"]`, { hasText: areaName }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to a sub-area by its display name (e.g., "Accounts", "Contacts").
   */
  async navigateToSubArea(subAreaName: string): Promise<void> {
    await this.openSitemap();
    await this.page
      .locator(`[data-lp-id="sitemap-entity"]`, { hasText: subAreaName })
      .click();
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to a sub-area within a specific group.
   */
  async navigateToGroupSubArea(groupName: string, subAreaName: string): Promise<void> {
    await this.openSitemap();
    const group = this.page.locator('[data-lp-id="sitemap-group"]', { hasText: groupName });
    await group.locator('[data-lp-id="sitemap-entity"]', { hasText: subAreaName }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Navigate to a sub-area by direct URL path.
   */
  async navigateToSubAreaByUrl(appId: string, entityName: string): Promise<void> {
    const baseUrl = process.env.MDA_URL || '';
    await this.page.goto(`${baseUrl}/main.aspx?appid=${appId}&pagetype=entitylist&etn=${entityName}`);
    await this.waitForLoadingComplete();
  }

  // ─── Command Bar ───────────────────────────────────────────────

  /**
   * Click a command bar button by its label text.
   */
  async clickCommand(commandLabel: string): Promise<void> {
    await this.commandBar.locator(`button`, { hasText: commandLabel }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click a command from the "More Commands" overflow menu.
   */
  async clickMoreCommand(commandLabel: string): Promise<void> {
    const moreBtn = this.commandBar.locator('button[aria-label="More commands"]');
    await moreBtn.click();
    await this.page.locator('[role="menuitem"]', { hasText: commandLabel }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Click a dropdown command: first opens the split button dropdown, then selects an item.
   */
  async clickDropdownCommand(buttonLabel: string, itemLabel: string): Promise<void> {
    const splitButton = this.commandBar.locator(`button`, { hasText: buttonLabel });
    const chevron = splitButton.locator('xpath=following-sibling::button');
    await chevron.click();
    await this.page.locator('[role="menuitem"]', { hasText: itemLabel }).click();
    await this.waitForLoadingComplete();
  }

  // ─── Notification Bar ──────────────────────────────────────────

  /**
   * Get the text content of the notification bar (success/error messages).
   */
  async getNotificationText(): Promise<string> {
    await this.notificationBar.waitFor({ state: 'visible', timeout: 10_000 });
    return (await this.notificationBar.textContent()) ?? '';
  }

  /**
   * Check if a success notification is displayed.
   */
  async hasSuccessNotification(): Promise<boolean> {
    const notification = this.page.locator('[data-id="notificationWrapper"] [data-id="notification"]');
    return notification.isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /**
   * Check if an error notification is displayed.
   */
  async hasErrorNotification(): Promise<boolean> {
    const notification = this.page.locator('[data-id="notificationWrapper"] .ms-MessageBar--error');
    return notification.isVisible({ timeout: 5_000 }).catch(() => false);
  }

  /**
   * Dismiss the notification bar if visible.
   */
  async dismissNotification(): Promise<void> {
    const closeBtn = this.notificationBar.locator('button[aria-label="Close"]');
    if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await closeBtn.click();
    }
  }

  // ─── Loading / Spinner ─────────────────────────────────────────

  /**
   * Wait for MDA loading spinners and iframe loads to complete.
   */
  async waitForLoadingComplete(): Promise<void> {
    // Wait for any loading overlay to disappear
    const loadingOverlay = this.page.locator('.ms-Spinner, [data-id="loading-spinner"]');
    await loadingOverlay.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    // Wait for the main content area to become stable
    await this.page.waitForLoadState('domcontentloaded');
  }
}
