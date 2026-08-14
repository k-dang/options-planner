import { instant } from "@next/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * Guards Next.js Instant Navigations. Inside an `instant()` scope the
 * navigation renders only what was prefetched; dynamic data stays blocked
 * until the scope closes. So an assertion that passes in here proves the UI
 * was available on click, with no network round trip.
 *
 * Each route's dynamic half sits behind a `role="status"` skeleton, which is
 * what we assert on: heading visible, skeleton visible, real content absent.
 */
const ROUTES = [
  {
    name: "Optimizer",
    path: "/optimize",
    heading: "Strategy Optimizer",
    skeleton: "Loading optimizer",
  },
  {
    name: "Scan",
    path: "/scan",
    heading: "Risk/Reward Scanner",
    skeleton: "Loading scanner",
  },
  {
    name: "Watchlist",
    path: "/watchlist",
    heading: "Watchlist",
    skeleton: "Loading watchlist",
  },
  {
    name: "Positions",
    path: "/positions",
    heading: "Positions",
    skeleton: "Loading saved strategies",
  },
] as const;

function shell(page: Page, route: (typeof ROUTES)[number]) {
  return {
    heading: page.getByRole("heading", { name: route.heading, level: 1 }),
    skeleton: page.getByRole("status", { name: route.skeleton }),
  };
}

for (const route of ROUTES) {
  test.describe(`${route.name} (${route.path})`, () => {
    test("is instant on a client navigation from the home page", async ({
      page,
    }) => {
      await page.goto("/");
      const { heading, skeleton } = shell(page, route);

      await instant(page, async () => {
        await page.getByRole("link", { name: route.name, exact: true }).click();
        await page.waitForURL((url) => url.pathname === route.path);
        await expect(heading).toBeVisible();
        await expect(skeleton).toBeVisible();
      });

      // Dynamic half streams in only after the instant scope releases.
      await expect(skeleton).toBeHidden();
    });

    test("is instant on an initial page load", async ({ page, baseURL }) => {
      const { heading, skeleton } = shell(page, route);

      await instant(
        page,
        async () => {
          await page.goto(route.path);
          await expect(heading).toBeVisible();
          await expect(skeleton).toBeVisible();
        },
        { baseURL },
      );

      await expect(skeleton).toBeHidden();
    });
  });
}

test.describe("Positions row link (/positions -> /build)", () => {
  test("navigates to the builder with a real prefetchable anchor", async ({
    page,
  }) => {
    await page.goto("/positions");
    const rowLink = page.locator('tbody a[href^="/build/"]').first();

    // A saved position is required to exercise the row. Skipping loudly beats
    // passing silently, since this is the guard against the row regressing
    // back to a router.push() handler with no href to prefetch.
    await expect(
      page.getByRole("status", { name: "Loading saved strategies" }),
    ).toBeHidden();
    const rowCount = await page.locator('tbody a[href^="/build/"]').count();
    test.skip(rowCount === 0, "no saved strategies in this database");

    await instant(page, async () => {
      await rowLink.click();
      await page.waitForURL((url) => url.pathname.startsWith("/build/"));
      await expect(
        page.getByRole("status", { name: "Loading strategy builder" }),
      ).toBeVisible();
    });

    await expect(
      page.getByRole("status", { name: "Loading strategy builder" }),
    ).toBeHidden();
  });
});
