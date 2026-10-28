import { expect, test } from '@playwright/test'

test('Free account starts a seven-day trial and keeps it after reload', async ({
  page,
  request,
}) => {
  const email = `trial-${crypto.randomUUID()}@example.com`
  const password = 'test-password-123'
  const registration = await request.post('/api/auth/register', {
    data: { email, password, displayName: 'Trial Studio' },
  })
  expect(registration.ok()).toBeTruthy()
  const { data } = await registration.json()
  const headers = { Authorization: `Bearer ${data.token}` }
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/finance')
  const start = page.getByRole('button', { name: 'Start 7-day Premium trial' })
  await expect(start).toBeVisible()
  await start.click()
  await expect(page.getByRole('status').filter({ hasText: 'Premium trial ends' })).toContainText(
    'Premium trial ends',
  )
  await expect(start).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'Premium trial ends' })).toContainText(
    'Premium trial ends',
  )
  const featuresResponse = await request.get('/api/users/me/features', { headers })
  const { data: features } = await featuresResponse.json()
  expect(features).toMatchObject({
    plan: 'FREE',
    finance: true,
    trialActive: true,
    trialAvailable: false,
  })
  const remaining = new Date(features.trialEndsAt).getTime() - Date.now()
  expect(remaining).toBeGreaterThan(7 * 86400000 - 120000)
  expect(remaining).toBeLessThanOrEqual(7 * 86400000)
  const duplicate = await request.post('/api/users/me/premium-trial', { headers })
  expect(duplicate.status()).toBe(409)
})
