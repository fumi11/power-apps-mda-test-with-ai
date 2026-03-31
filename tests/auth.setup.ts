import { test as setup } from '@playwright/test';
import { LoginPage } from '../src/pages/login.page';
import { AuthHelper } from '../src/helpers/auth.helper';

/**
 * Global auth setup — runs once before all test projects.
 * Logs in to MDA via Entra ID and saves the browser storageState.
 */
setup('authenticate', async ({ page }) => {
  // Skip if storageState is still valid
  if (AuthHelper.isStorageStateValid()) {
    return;
  }

  AuthHelper.ensureAuthDir();

  const mdaUrl = process.env.MDA_URL;
  const username = process.env.MDA_USERNAME;
  const password = process.env.MDA_PASSWORD;

  if (!mdaUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: MDA_URL, MDA_USERNAME, MDA_PASSWORD'
    );
  }

  // Navigate to MDA — redirects to Entra ID login
  await page.goto(mdaUrl);

  // Perform login
  const loginPage = new LoginPage(page);
  await loginPage.login(username, password);

  // Save storageState for reuse
  await page.context().storageState({ path: AuthHelper.getStorageStatePath() });
});
