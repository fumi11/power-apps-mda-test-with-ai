import { test, expect } from '@playwright/test';
import { AppShellPage } from '../../src/pages/app-shell.page';
import { FormPage } from '../../src/pages/form.page';
import { ViewPage } from '../../src/pages/view.page';
import { DialogPage } from '../../src/pages/dialog.page';

/**
 * Sample CRUD test for Account entity.
 * This is a reference implementation demonstrating POM usage.
 *
 * Prerequisites:
 * - MDA_URL, MDA_USERNAME, MDA_PASSWORD are configured in .env
 * - auth.setup.ts has run and storageState is saved
 */

const TEST_ACCOUNT_NAME = `Test Account ${Date.now()}`;

test.describe('Account CRUD Operations', () => {
  let appShell: AppShellPage;
  let form: FormPage;
  let view: ViewPage;
  let dialog: DialogPage;

  test.beforeEach(async ({ page }) => {
    appShell = new AppShellPage(page);
    form = new FormPage(page);
    view = new ViewPage(page);
    dialog = new DialogPage(page);
  });

  test('Create a new Account record', async ({ page }) => {
    // Navigate to Accounts
    await appShell.navigateToSubArea('Accounts');

    // Click "New" from the command bar
    await appShell.clickCommand('New');

    // Fill in account fields
    await form.setTextField('name', TEST_ACCOUNT_NAME);
    await form.setTextField('telephone1', '03-1234-5678');
    await form.setTextField('websiteurl', 'https://example.com');
    await form.setOptionSetField('industrycode', 'Technology');

    // Save the record
    await form.save();

    // Verify: the form title should contain the account name
    const title = page.locator('[data-id="header_title"]');
    await expect(title).toContainText(TEST_ACCOUNT_NAME);
  });

  test('Read / Open an existing Account record', async () => {
    // Navigate to Accounts
    await appShell.navigateToSubArea('Accounts');

    // Search for the account
    await view.quickSearch(TEST_ACCOUNT_NAME);

    // Open the first result
    await view.openRecordByName(TEST_ACCOUNT_NAME);

    // Verify field values
    const name = await form.getTextField('name');
    expect(name).toBe(TEST_ACCOUNT_NAME);

    const phone = await form.getTextField('telephone1');
    expect(phone).toContain('03-1234-5678');
  });

  test('Update an Account record', async ({ page }) => {
    // Navigate to Accounts
    await appShell.navigateToSubArea('Accounts');
    await view.quickSearch(TEST_ACCOUNT_NAME);
    await view.openRecordByName(TEST_ACCOUNT_NAME);

    // Update fields
    const updatedName = `${TEST_ACCOUNT_NAME} - Updated`;
    await form.setTextField('name', updatedName);
    await form.setTextField('description', 'Updated by automated test');

    // Save
    await form.save();

    // Verify
    const title = page.locator('[data-id="header_title"]');
    await expect(title).toContainText(updatedName);
  });

  test('Delete an Account record', async ({ page }) => {
    // Navigate to Accounts
    await appShell.navigateToSubArea('Accounts');
    await view.quickSearch(TEST_ACCOUNT_NAME);
    await view.openRecordByName(TEST_ACCOUNT_NAME);

    // Delete the record
    await form.deleteRecord();

    // Verify: should return to the list view
    await page.waitForURL('**/entitylist/**');
  });
});
