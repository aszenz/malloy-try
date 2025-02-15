import { test, expect } from "@playwright/test";

test("Home page loads", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("Loading...")).toBeVisible();
  // wait for loading spinner
  await expect(page.getByText("Loading...")).not.toBeVisible({
    timeout: 15 * 1000,
  });
  await expect(
    page.getByRole("heading", { name: "Malloy model explorer" }),
  ).toBeVisible();
});
