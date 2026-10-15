import { expect, test, type Page } from "@playwright/test";

const ID = process.env.E2E_ADMIN_ID!;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

async function signIn(page: Page, id = ID, password = PASSWORD) {
  await page.goto("/admin/login");
  await page.fill("#loginId", id);
  await page.fill("#password", password);
  await page.click("form button[type=submit]");
}

test("signed-out visitors cannot reach the admin", async ({ page, request }) => {
  await page.goto("/admin/projects");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await request.get("/api/admin/media")).status()).toBe(401);
  const res = await request.get("/admin/login");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /admin");
});

test("wrong credentials get one generic message", async ({ page }) => {
  await signIn(page, ID, "definitely-not-the-password");
  await expect(page.locator("form [role=alert]")).toHaveText("Invalid administrator ID or password.");
  await signIn(page, "no-such-admin", "definitely-not-the-password");
  await expect(page.locator("form [role=alert]")).toHaveText("Invalid administrator ID or password.");
});

test("sign-in sets a hardened session cookie and sign-out ends it", async ({ page, context }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  const cookie = (await context.cookies()).find((c) => c.name.endsWith("rk_admin"))!;
  expect(cookie.name).toBe("__Host-rk_admin");
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("drafts stay private until published", async ({ page, browser }) => {
  const marker = `E2E project ${Date.now()}`;
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/projects/new");
  await page.getByLabel("Title").first().fill(marker);
  await page.getByLabel("URL identifier (slug)").fill(`e2e-${Date.now()}`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.").filter({ visible: true })).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto("/");
  await expect(visitor.locator("#projects")).not.toContainText(marker);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published.").filter({ visible: true })).toBeVisible();
  await visitor.goto("/");
  await expect(visitor.locator("#projects")).toContainText(marker);

  await page.getByLabel("Title").first().fill(`${marker} (unpublished edit)`);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.").filter({ visible: true })).toBeVisible();
  // The administrator's preview shows the draft...
  const [preview] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("button", { name: "Preview" }).click()]);
  await expect(preview.locator("#projects")).toContainText("(unpublished edit)");
  await expect(preview.getByText("Draft preview")).toBeVisible();
  const bypass = (await page.context().cookies()).find((c) => c.name === "__prerender_bypass");
  expect(bypass).toBeTruthy();
  // ...but the same draft-mode cookie without an admin session does not.
  await visitor.context().addCookies([bypass!]);
  await visitor.goto("/");
  await expect(visitor.locator("#projects")).not.toContainText("(unpublished edit)");
  await visitor.close();
});

test("password change signs out other sessions and the new password works", async ({ page, browser }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  // A second browser signed in as the same administrator.
  const other = await browser.newPage();
  await signIn(other);
  await expect(other).toHaveURL(/\/admin$/);

  const next = `${PASSWORD}-changed-${Date.now()}`;
  await page.goto("/admin/account");
  await page.fill("#current", PASSWORD);
  await page.fill("#next", next);
  await page.fill("#confirm", next);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible();

  // This browser stays signed in with a fresh session; the other one is signed out.
  await page.goto("/admin/account");
  await expect(page).toHaveURL(/\/admin\/account$/);
  await other.goto("/admin");
  await expect(other).toHaveURL(/\/admin\/login$/);
  await other.close();

  // Old password rejected, new one accepted; then restore the original for other tests.
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await signIn(page, ID, PASSWORD);
  await expect(page.locator("form [role=alert]")).toHaveText("Invalid administrator ID or password.");
  await signIn(page, ID, next);
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/account");
  await page.fill("#current", next);
  await page.fill("#next", PASSWORD);
  await page.fill("#confirm", PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible();
});
