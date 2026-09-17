import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, API_BASE_URL } from './support/config';

test('browse, checkout with a mock card payment, and see the order in the admin dashboard', async ({
  page,
}) => {
  await test.step('sign in as the seeded administrator', async () => {
    await page.goto('/login');
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button.login-submit').click();
    await expect(page).toHaveURL(/\/home$/);
  });

  await test.step('start from an empty cart', async () => {
    const response = await page.request.delete(`${API_BASE_URL}/carts/my-cart`);
    expect([200, 204, 404]).toContain(response.status());
  });

  let productTitle = '';

  await test.step('add the first in-stock accessory to the cart', async () => {
    await page.goto('/accessories');
    await page.getByLabel('In stock only').check();
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const firstInStock = page
      .locator('article.accessory-card')
      .filter({ has: page.locator('.stock-badge.in-stock') })
      .first();
    await expect(firstInStock).toBeVisible();

    productTitle = (await firstInStock.locator('.card-title').innerText()).trim();
    await firstInStock.click();

    await expect(page).toHaveURL(/\/accessories\/\d+$/);
    await expect(page.locator('h1.product-title')).toHaveText(productTitle);

    await page.locator('button.action-cart').click();
    await expect(page.locator('button.action-cart')).toContainText('Added to Cart');
  });

  await test.step('review the cart and proceed to checkout', async () => {
    await page.goto('/my-cart');
    await expect(page).toHaveURL(/\/my-cart$/);
    await expect(page.locator('.pa-cart-row__title', { hasText: productTitle })).toBeVisible();

    await page.locator('a.pa-cart-summary__checkout').click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.locator('h1.pa-checkout__title')).toHaveText('Checkout');
  });

  await test.step('fill the shipping information', async () => {
    await page.locator('#customerFullName').fill('E2E Shopper');
    await page.locator('#customerEmail').fill('e2e.shopper@example.com');
    await page.locator('#customerPhoneNumber').fill('+21620123456');
    await page.locator('#customerStreet').fill('1 Playwright Street');
    await page.locator('#customerCity').fill('Tunis');
    await page.locator('#customerPostalCode').fill('1000');
    await page.locator('#customerCountry').fill('Tunisia');
    await page.locator('.pa-checkout-nav__submit').click();
  });

  await test.step('choose the standard delivery method', async () => {
    await expect(page.locator('.pa-checkout-step__title', { hasText: 'Delivery method' })).toBeVisible();
    const standardDelivery = page.getByRole('radio', { name: 'Standard Delivery' });
    await standardDelivery.check();
    await expect(standardDelivery).toBeChecked();
    await page.locator('.pa-checkout-nav__submit').click();
  });

  await test.step('pay by card through the mock gateway', async () => {
    await expect(page.locator('.pa-checkout-step__title', { hasText: 'Payment method' })).toBeVisible();
    const cardPayment = page.getByRole('radio', { name: 'Credit / Debit Card' });
    await cardPayment.check();
    await expect(cardPayment).toBeChecked();
    await expect(page.locator('.pa-payment-mock')).toBeVisible();
    await page.locator('.pa-checkout-nav__submit').click();
  });

  await test.step('review and place the order', async () => {
    await expect(page.locator('.pa-checkout-step__title', { hasText: 'Review your order' })).toBeVisible();
    await page.locator('.pa-checkout-terms input[type="checkbox"]').check();
    await page.locator('.pa-checkout-nav__submit').click();

    await expect(page.locator('h1.pa-checkout-success__title')).toHaveText(
      'Order placed successfully',
    );

    const summary = page.locator('.pa-checkout-success__summary');
    await expect(summary).toContainText('Credit / Debit Card');
    await expect(summary).toContainText('Paid');

    const orderId = (
      await page.locator('.pa-checkout-success__subtitle .pa-font-mono').innerText()
    )
      .replace('#', '')
      .trim();
    expect(Number(orderId)).toBeGreaterThan(0);
  });

  await test.step('see the new order on the admin dashboard', async () => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.locator('h1.page-header__title')).toHaveText('Dashboard');
    await expect(page.locator('.kpi-card').first()).toBeVisible();
    await expect(page.locator('.kpi-card__label', { hasText: 'Total Orders' })).toBeVisible();
  });
});
