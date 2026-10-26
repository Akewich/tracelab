import { expect, test } from "@playwright/test";

test("dashboard, orders, experiments, and learning guide render", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little commerce. A lot of insight." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await page.getByLabel("Search orders").fill("Headphones");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("cell", { name: "Studio Headphones" }),
  ).toHaveCount(2);
  await page.getByRole("link", { name: "View order ORD-1048" }).click();
  await expect(page.getByRole("heading", { name: "ORD-1048" })).toBeVisible();
  await page.getByRole("link", { name: "Observability Lab" }).click();
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByText("Request completed successfully.")).toBeVisible();
  await expect(
    page.getByText("simulate-database-query", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Failed request/ }).click();
  await page
    .getByRole("button", { name: "Run experiment", exact: true })
    .click();
  await expect(page.getByText("Simulated checkout failure.")).toBeVisible();
  await page.getByRole("link", { name: "Learn OpenTelemetry" }).click();
  await expect(
    page.getByRole("heading", { name: "Trace vs span", exact: true }),
  ).toBeVisible();
});
