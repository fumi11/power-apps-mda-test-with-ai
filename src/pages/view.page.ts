import { Page, Locator } from '@playwright/test';

/**
 * ViewPage — MDA entity list / grid view interactions.
 * Covers view switching, grid row operations, column filters, sorting,
 * quick search, and record count.
 */
export class ViewPage {
  private readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.grid = page.locator('[data-id="data-set-body-container"]');
  }

  // ─── View Switching ────────────────────────────────────────────

  /**
   * Switch to a different view by its display name.
   */
  async switchView(viewName: string): Promise<void> {
    // Open the view selector
    const viewSelector = this.page.locator(
      '[data-id="ViewSelector"] button, button[aria-label="Select a view"]'
    );
    await viewSelector.click();

    // Select the desired view
    await this.page.locator('[role="option"], [role="menuitemradio"]', { hasText: viewName }).click();
    await this.waitForGridLoad();
  }

  /**
   * Get the currently active view name.
   */
  async getCurrentViewName(): Promise<string> {
    const viewSelector = this.page.locator(
      '[data-id="ViewSelector"] span, button[aria-label="Select a view"]'
    );
    return (await viewSelector.textContent()) ?? '';
  }

  // ─── Grid Row Operations ───────────────────────────────────────

  /**
   * Select a grid row by its index (0-based).
   */
  async selectRow(rowIndex: number): Promise<void> {
    const row = this.grid.locator('[data-id="cell"]').nth(rowIndex);
    const checkbox = row.locator('input[type="checkbox"], [role="checkbox"]');
    await checkbox.click();
  }

  /**
   * Double-click a row to open the record.
   */
  async openRecord(rowIndex: number): Promise<void> {
    const row = this.grid.locator('[data-id="cell"]').nth(rowIndex);
    const link = row.locator('a').first();
    await link.dblclick();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Open a record by clicking its primary column link text.
   */
  async openRecordByName(name: string): Promise<void> {
    const link = this.grid.locator('a', { hasText: name }).first();
    await link.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get all values from a specific column by header name.
   */
  async getColumnValues(headerName: string): Promise<string[]> {
    // Find the column index by header text
    const headers = this.page.locator('[data-id="data-set-header-container"] [role="columnheader"]');
    const headerCount = await headers.count();
    let colIndex = -1;
    for (let i = 0; i < headerCount; i++) {
      const text = await headers.nth(i).textContent();
      if (text?.trim() === headerName) {
        colIndex = i;
        break;
      }
    }
    if (colIndex === -1) return [];

    const rows = this.grid.locator('[data-id="cell"]');
    const rowCount = await rows.count();
    const values: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      const cells = rows.nth(r).locator('[role="gridcell"]');
      const cellText = await cells.nth(colIndex).textContent();
      values.push(cellText?.trim() ?? '');
    }
    return values;
  }

  // ─── Column Sort / Filter ─────────────────────────────────────

  /**
   * Sort a column by clicking its header. Click again to toggle direction.
   */
  async sortByColumn(headerName: string): Promise<void> {
    const header = this.page.locator('[role="columnheader"]', { hasText: headerName });
    await header.click();
    await this.waitForGridLoad();
  }

  /**
   * Filter a column by text value using the column header filter.
   */
  async filterColumn(headerName: string, filterValue: string): Promise<void> {
    const header = this.page.locator('[role="columnheader"]', { hasText: headerName });
    const filterIcon = header.locator('button[aria-label*="Filter"]');
    await filterIcon.click();

    const filterInput = this.page.locator('[data-id="MscrmControls.Grid.ColumnFilterPopup"] input');
    await filterInput.fill(filterValue);
    await this.page.locator('button', { hasText: 'Apply' }).click();
    await this.waitForGridLoad();
  }

  // ─── Quick Search ──────────────────────────────────────────────

  /**
   * Perform a quick search / find on the view.
   */
  async quickSearch(searchText: string): Promise<void> {
    const searchBox = this.page.locator(
      '[data-id="quickFind_text"], input[aria-label="Quick Find"]'
    );
    await searchBox.fill(searchText);
    await searchBox.press('Enter');
    await this.waitForGridLoad();
  }

  /**
   * Clear the quick search filter.
   */
  async clearSearch(): Promise<void> {
    const clearBtn = this.page.locator(
      '[data-id="quickFind_button_clear"], button[aria-label="Clear"]'
    );
    if (await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clearBtn.click();
      await this.waitForGridLoad();
    }
  }

  // ─── Record Count ──────────────────────────────────────────────

  /**
   * Get the total record count displayed in the view footer.
   */
  async getRecordCount(): Promise<number> {
    const countLabel = this.page.locator('[data-id="pagingText"], [aria-label*="records"]');
    const text = (await countLabel.textContent()) ?? '';
    const match = text.match(/(\d[\d,]*)/);
    return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
  }

  // ─── Helpers ───────────────────────────────────────────────────

  /**
   * Wait for the grid data to finish loading.
   */
  private async waitForGridLoad(): Promise<void> {
    await this.page
      .locator('.ms-Spinner, [data-id="loading-spinner"]')
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {});
    await this.page.waitForLoadState('domcontentloaded');
  }
}
