import { instant } from "@next/playwright";
import { expect, type Page, test } from "@playwright/test";

test.describe.configure({ retries: 0 });

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
    resolved: "optimizer-resolved",
  },
  {
    name: "Scan",
    path: "/scan",
    heading: "Risk/Reward Scanner",
    skeleton: "Loading scanner",
    resolved: "scanner-resolved",
  },
  {
    name: "Watchlist",
    path: "/watchlist",
    heading: "Watchlist",
    skeleton: "Loading watchlist",
    resolved: "watchlist-resolved",
  },
  {
    name: "Positions",
    path: "/positions",
    heading: "Positions",
    skeleton: "Loading saved strategies",
    resolved: "positions-resolved",
  },
] as const;

function shell(page: Page, route: (typeof ROUTES)[number]) {
  return {
    heading: page.getByRole("heading", { name: route.heading, level: 1 }),
    skeleton: page.getByRole("status", { name: route.skeleton }),
    resolved: page.getByTestId(route.resolved),
  };
}

function stableControls(page: Page, route: (typeof ROUTES)[number]) {
  if (route.path === "/optimize") {
    return [
      page.getByText("Target Price at Expiration", { exact: true }),
      page.getByRole("group", { name: "Rank by" }),
      page.getByText("Expiration", { exact: true }),
    ];
  }

  if (route.path === "/scan") {
    return [
      page.getByRole("group", { name: "Days to expiration" }),
      page.getByRole("group", { name: "Minimum probability of profit" }),
      page.getByRole("button", { name: "Long Call", exact: true }),
    ];
  }

  return [];
}

test.describe("Home (/)", () => {
  test("has an instant identifying shell on an initial page load", async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto("/");
        await expect(page.getByTestId("home-shell")).toBeVisible();
      },
      { baseURL },
    );
  });
});

for (const route of ROUTES) {
  test.describe(`${route.name} (${route.path})`, () => {
    test("is instant on a client navigation from the home page", async ({
      page,
    }) => {
      await page.goto("/");
      const { heading, resolved, skeleton } = shell(page, route);

      await instant(page, async () => {
        await page.getByRole("link", { name: route.name, exact: true }).click();
        await page.waitForURL((url) => url.pathname === route.path);
        await expect(heading).toBeVisible();
        await expect(skeleton).toBeVisible();
        await expect(resolved).toHaveCount(0);
        for (const control of stableControls(page, route)) {
          await expect(control).toBeVisible();
        }
      });

      // Dynamic half streams in only after the instant scope releases.
      await expect(resolved).toBeVisible();
      await expect(skeleton).toBeHidden();
    });

    test("is instant on an initial page load", async ({ page, baseURL }) => {
      const { heading, resolved, skeleton } = shell(page, route);

      await instant(
        page,
        async () => {
          await page.goto(route.path);
          await expect(heading).toBeVisible();
          await expect(skeleton).toBeVisible();
          await expect(resolved).toHaveCount(0);
          for (const control of stableControls(page, route)) {
            await expect(control).toBeVisible();
          }
        },
        { baseURL },
      );

      await expect(resolved).toBeVisible();
      await expect(skeleton).toBeHidden();
    });

    if (route.path === "/optimize" || route.path === "/scan") {
      test("keeps its instant shell on mobile", async ({ page, baseURL }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        const { heading, resolved, skeleton } = shell(page, route);

        await instant(
          page,
          async () => {
            await page.goto(route.path);
            await expect(heading).toBeVisible();
            await expect(skeleton).toBeVisible();
            await expect(resolved).toHaveCount(0);
            for (const control of stableControls(page, route)) {
              await expect(control).toBeVisible();
            }
          },
          { baseURL },
        );

        await expect(resolved).toBeVisible();
        await expect(skeleton).toBeHidden();
      });
    }
  });
}

test.describe("Strategy builder (/build/[strategy]/[symbol])", () => {
  test("has an instant identifying shell on an initial page load", async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto("/build/long-call/AAPL");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(
          page.getByRole("status", { name: "Loading strategy builder" }),
        ).toBeVisible();
        await expect(page.getByTestId("builder-resolved")).toHaveCount(0);
      },
      { baseURL },
    );

    await expect(
      page.getByRole("heading", { name: "Long Call on AAPL", level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId("builder-resolved")).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Loading strategy builder" }),
    ).toBeHidden();
  });
});

test.describe("Positions row link (/positions -> /build)", () => {
  test("navigates to the builder with a real prefetchable anchor", async ({
    page,
  }) => {
    await page.goto("/positions");
    const rowLink = page.getByRole("link", {
      name: "Instant Navigation Long Call",
      exact: true,
    });

    await expect(
      page.getByRole("status", { name: "Loading saved strategies" }),
    ).toBeHidden();
    await expect(rowLink).toHaveAttribute(
      "href",
      /^\/build\/long-call\/AAPL\?positionId=/,
    );

    await instant(page, async () => {
      await rowLink.click();
      await page.waitForURL((url) => url.pathname.startsWith("/build/"));
      await expect(
        page.getByRole("status", { name: "Loading strategy builder" }),
      ).toBeVisible();
      await expect(page.getByTestId("builder-resolved")).toHaveCount(0);
    });

    await expect(page.getByTestId("builder-resolved")).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Loading strategy builder" }),
    ).toBeHidden();
  });
});
