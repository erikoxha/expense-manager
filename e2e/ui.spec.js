import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";

const stylesheet = fileURLToPath(new URL("../frontend/src/styles.css", import.meta.url));
const authMarkup = `
  <div class="auth-shell">
    <section class="auth-story">
      <div class="brand"><span class="brand-mark">L</span>ledger.</div>
      <div>
        <span class="eyebrow">A CLEARER VIEW OF YOUR MONEY</span>
        <h1>Small habits.<br />Bigger possibilities.</h1>
        <p>A place for your everyday spending,<br />your plans, and everything in between.</p>
      </div>
      <small>Personal Expense &amp; Budget Manager</small>
    </section>
    <section class="auth-form">
      <div>
        <span class="eyebrow">YOUR PERSONAL WORKSPACE</span>
        <h2>Welcome back.</h2>
        <p>Sign in to see your money at a glance.</p>
        <form>
          <div class="field"><label for="username">Username</label><input id="username" autocomplete="username" /></div>
          <div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" /></div>
          <button class="button full" type="submit">Sign in</button>
        </form>
      </div>
    </section>
  </div>`;

async function openStyledLogin(page, viewport) {
  await page.setViewportSize(viewport);
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${authMarkup}</body></html>`);
  await page.addStyleTag({ path: stylesheet });
}

test.describe("isolated stylesheet fixture", () => {
  test("uses the documented colors, radii, focus style, and desktop layout", async ({ page }) => {
    await openStyledLogin(page, { width: 1440, height: 900 });

    const values = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const button = getComputedStyle(document.querySelector(".button"));
      const field = getComputedStyle(document.querySelector(".field input"));
      return {
        primary: root.getPropertyValue("--primary").trim(),
        sidebar: root.getPropertyValue("--secondary").trim(),
        background: root.getPropertyValue("--background").trim(),
        buttonRadius: button.borderRadius,
        inputRadius: field.borderRadius,
        columns: getComputedStyle(document.querySelector(".auth-shell")).gridTemplateColumns,
      };
    });

    expect(values).toMatchObject({
      primary: "#087f72",
      sidebar: "#122b39",
      background: "#f4f7f8",
      buttonRadius: "8px",
      inputRadius: "7px",
    });
    expect(values.columns.split(" ")).toHaveLength(2);
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();

    const username = page.getByRole("textbox", { name: "Username" });
    await username.focus();
    await expect(username).toBeFocused();
    await expect(username).toHaveCSS("outline-width", "2px");
    await username.evaluate((element) => element.blur());
    await expect(page.locator(".auth-shell")).toHaveScreenshot("ledger-auth-desktop.png", {
      animations: "disabled",
      caret: "hide",
    });
  });

  test("fits the documented mobile breakpoint without page-level horizontal scrolling", async ({ page }) => {
    await openStyledLogin(page, { width: 390, height: 844 });

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      columns: getComputedStyle(document.querySelector(".auth-shell")).gridTemplateColumns,
      radius: getComputedStyle(document.querySelector(".button")).borderRadius,
    }));

    expect(layout.document).toBeLessThanOrEqual(layout.viewport);
    expect(layout.columns.split(" ")).toHaveLength(1);
    expect(layout.radius).toBe("8px");
    await expect(page.locator(".auth-shell")).toHaveScreenshot("ledger-auth-mobile.png", {
      animations: "disabled",
      caret: "hide",
    });
  });
});

test.describe("rendered React registration page", () => {
  test("shows the real desktop auth content, colors, spacing, and two-column layout", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Start a fresh chapter." })).toBeVisible();
    await expect(page.getByText("Create your account and make yourself at home.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Username" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.locator(".auth-benefits")).toContainText("Know where your money goes");

    const layout = await page.evaluate(() => {
      const story = document.querySelector(".auth-story");
      const form = document.querySelector(".auth-form");
      const formElement = document.querySelector(".auth-form form");
      const heading = document.querySelector(".auth-story h1");
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        columns: getComputedStyle(document.querySelector(".auth-shell")).gridTemplateColumns,
        storyColor: getComputedStyle(story).backgroundColor,
        storyTextColor: getComputedStyle(story).color,
        formPadding: getComputedStyle(form).padding,
        formTopSpacing: getComputedStyle(formElement).marginTop,
        headingVerticalSpacing: getComputedStyle(heading).marginTop,
      };
    });

    expect(layout.document).toBeLessThanOrEqual(layout.viewport);
    expect(layout.columns.split(" ")).toHaveLength(2);
    expect(layout.storyColor).toBe("rgb(18, 43, 57)");
    expect(layout.storyTextColor).toBe("rgb(255, 255, 255)");
    expect(layout.formPadding).toBe("40px");
    expect(layout.formTopSpacing).toBe("32px");
    expect(layout.headingVerticalSpacing).toBe("22px");
  });

  test("shows the real mobile auth page without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Start a fresh chapter." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      columns: getComputedStyle(document.querySelector(".auth-shell")).gridTemplateColumns,
      formPadding: getComputedStyle(document.querySelector(".auth-form")).padding,
      storyCopyDisplay: getComputedStyle(document.querySelector(".auth-story > div:not(.brand)")).display,
    }));

    expect(layout.document).toBeLessThanOrEqual(layout.viewport);
    expect(layout.columns.split(" ")).toHaveLength(1);
    expect(layout.formPadding).toBe("40px 24px");
    expect(layout.storyCopyDisplay).toBe("none");
  });
});
