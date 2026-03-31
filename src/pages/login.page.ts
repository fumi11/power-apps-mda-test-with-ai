import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  /**
   * Full Entra ID login flow: email → password → optional MFA → Stay signed in.
   */
  async login(username: string, password: string): Promise<void> {
    // Enter email address
    await this.page.locator('input[type="email"]').fill(username);
    await this.page.locator('input[type="submit"]').click();

    // Enter password
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.locator('input[type="submit"]').click();

    // Wait for MFA or "Stay signed in?" prompt
    await this.waitForMfaOrStaySignedIn();

    // Handle "Stay signed in?" dialog
    await this.handleStaySignedIn();

    // Wait for MDA app to load
    await this.waitForAppLoad();
  }

  /**
   * Wait for MFA challenge to complete or "Stay signed in?" to appear.
   * Timeout is extended to 120s to allow manual MFA approval.
   */
  private async waitForMfaOrStaySignedIn(): Promise<void> {
    await this.page
      .locator('#KmsButton, #idSIButton9, #declineButton')
      .first()
      .waitFor({ timeout: 120_000 });
  }

  /**
   * Click "Yes" on the "Stay signed in?" prompt if it appears.
   */
  private async handleStaySignedIn(): Promise<void> {
    const staySignedInButton = this.page.locator('#idSIButton9');
    if (await staySignedInButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await staySignedInButton.click();
    }
  }

  /**
   * Wait for the MDA shell to finish loading after login.
   */
  private async waitForAppLoad(): Promise<void> {
    await this.page.waitForURL('**/main.aspx**', { timeout: 60_000 });
    // Wait for the MDA shell to render
    await this.page.locator('#ApplicationShell').waitFor({ state: 'visible', timeout: 60_000 });
  }
}
