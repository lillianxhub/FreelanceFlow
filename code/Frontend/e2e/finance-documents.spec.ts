import { expect, test, type APIRequestContext } from '@playwright/test'
const password = 'test-password-123'
async function api(
  request: APIRequestContext,
  path: string,
  method: 'get' | 'post' | 'put' | 'patch',
  data?: unknown,
  token?: string,
) {
  const response = await request[method](`/api${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy()
  return (await response.json()).data
}

test('Free user previews unsaved quotations and invoices, preserves snapshots and creates one invoice', async ({
  page,
  request,
}, testInfo) => {
  const email = `documents-${crypto.randomUUID()}@example.com`
  const registration = await api(request, '/auth/register', 'post', {
    email,
    password,
    displayName: 'Example Studio',
  })
  const token = registration.token
  const flags = await api(request, '/users/me/features', 'get', undefined, token)
  expect(flags).toMatchObject({ plan: 'FREE', finance: true, premiumEnforced: false })
  const client = await api(
    request,
    '/clients',
    'post',
    { name: 'ลูกค้าตัวอย่าง', address: 'ขอนแก่น', taxId: '1234567890123' },
    token,
  )
  const settings = await api(request, '/finance/settings', 'get', undefined, token)
  await api(
    request,
    '/finance/settings',
    'put',
    {
      ...settings,
      businessName: 'Example Studio',
      address: 'Khon Kaen',
      taxId: '1234567890123',
      vatRegistered: true,
      bankDetails: 'Bank transfer: Example bank',
      footer: 'Thank you for your business',
    },
    token,
  )
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/finance/quotations')
  await page.getByRole('button', { name: 'New quotation' }).click()
  const form = page.getByRole('dialog', { name: 'New quotation', exact: true })
  await form.getByLabel('Client', { exact: true }).selectOption(client.id)
  await form.getByLabel('Issue date', { exact: true }).fill('2026-10-14')
  await form.getByLabel('Valid until', { exact: true }).fill('2026-11-13')
  await form.getByLabel('Description', { exact: true }).fill('ออกแบบเว็บไซต์')
  await form.getByLabel('Quantity', { exact: true }).fill('1.005')
  await form.getByLabel('Price', { exact: true }).fill('1000.00')
  await form.getByLabel('Discount THB').fill('5.00')
  await form.getByLabel('VAT %').fill('7')
  await form.getByRole('button', { name: 'Preview', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'ใบเสนอราคา / Quotation preview' })
  await expect(preview).toContainText('EXAMPLE / DRAFT')
  await expect(preview).toContainText('ลูกค้าตัวอย่าง')
  await expect(preview).toContainText('฿1,070.00')
  expect(await api(request, '/finance/quotations', 'get', undefined, token)).toHaveLength(0)
  await page.screenshot({ path: testInfo.outputPath('quotation-preview.png'), fullPage: true })
  await preview.press('Escape')
  await expect(form.getByRole('button', { name: 'Preview', exact: true })).toBeFocused()
  await form.getByLabel('Quantity', { exact: true }).fill('2')
  await form.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(preview).toContainText('฿2,134.65')
  await preview.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(form.getByLabel('Quantity', { exact: true })).toHaveValue('2')
  await form.getByLabel('Quantity', { exact: true }).fill('invalid')
  await form.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(preview.getByRole('alert')).toContainText('Some amounts cannot be calculated')
  await preview.press('Escape')
  await form.getByLabel('Quantity', { exact: true }).fill('2')
  await form.getByRole('button', { name: 'Save draft' }).click()
  const row = page.getByRole('row').filter({ hasText: 'ลูกค้าตัวอย่าง' })
  await expect(row).toContainText('DRAFT')
  page.once('dialog', (dialog) => dialog.accept())
  await row.getByRole('button', { name: 'Issue', exact: true }).click()
  await expect(row).toContainText('QT-2026-')
  const [quotation] = await api(request, '/finance/quotations', 'get', undefined, token)
  await api(
    request,
    `/clients/${client.id}`,
    'patch',
    { name: 'Changed customer', address: 'Changed address' },
    token,
  )
  await row.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(preview).toContainText('ลูกค้าตัวอย่าง')
  await expect(preview).not.toContainText('Changed customer')
  await preview.press('Escape')
  await row.getByRole('button', { name: 'Create invoice', exact: true }).click()
  const conversion = page.getByRole('dialog', { name: 'Create invoice from quotation' })
  await conversion.getByLabel('Invoice issue date').fill('2026-10-15')
  await conversion.getByLabel('Invoice due date').fill('2026-11-15')
  await conversion.getByRole('button', { name: 'Create draft' }).click()
  await expect(page).toHaveURL(/\/finance\/invoices\?invoice=/)
  const invoiceForm = page.getByRole('dialog', { name: 'Edit draft', exact: true })
  await expect(invoiceForm.getByLabel('Description', { exact: true })).toHaveValue('ออกแบบเว็บไซต์')
  await invoiceForm.getByLabel('Note', { exact: true }).fill('Unsaved invoice note')
  await invoiceForm.getByRole('button', { name: 'Preview', exact: true }).click()
  const invoicePreview = page.getByRole('dialog', { name: 'ใบแจ้งหนี้ / Invoice preview' })
  await expect(invoicePreview).toContainText('Unsaved invoice note')
  await expect(invoicePreview).toContainText('Changed customer')
  await invoicePreview.press('Escape')
  await invoiceForm.getByRole('button', { name: 'Save draft' }).click()
  const invoices = await api(request, '/finance/invoices', 'get', undefined, token)
  const retry = await api(
    request,
    `/finance/quotations/${quotation.id}/invoice`,
    'post',
    { version: quotation.version, issueDate: '2026-10-15', dueDate: '2026-11-15' },
    token,
  )
  expect(retry.id).toBe(invoices[0].id)
  expect(await api(request, '/finance/invoices', 'get', undefined, token)).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'Edit draft' }).getByLabel('Note')).toHaveValue(
    'Unsaved invoice note',
  )
  await page.goto('/finance/quotations')
  await expect(page.getByRole('link', { name: 'Open invoice' })).toBeVisible()
})

test('Admin switch revokes and restores Free access without changing plans or documents', async ({
  page,
  request,
}) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    'Admin test credentials are required',
  )
  const admin = await api(request, '/auth/login', 'post', {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  })
  const original = await api(request, '/admin/features', 'get', undefined, admin.token)
  const email = `toggle-${crypto.randomUUID()}@example.com`
  const user = await api(request, '/auth/register', 'post', {
    email,
    password,
    displayName: 'Free Account',
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL!)
  await page.locator('input[name=password]').fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/admin')
  const toggle = page.getByRole('switch', { name: 'Require Premium for Finance' })
  try {
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    const denied = await request.get('/api/finance/summary', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
    expect(denied.status()).toBe(403)
    expect(await api(request, '/users/me/features', 'get', undefined, user.token)).toMatchObject({
      plan: 'FREE',
      finance: false,
    })
    await page.reload()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await toggle.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(await api(request, '/users/me/features', 'get', undefined, user.token)).toMatchObject({
      plan: 'FREE',
      finance: true,
    })
  } finally {
    const current = await api(request, '/admin/features', 'get', undefined, admin.token)
    if (current.premiumEnforced !== original.premiumEnforced)
      await api(
        request,
        '/admin/features',
        'patch',
        { premiumEnforced: original.premiumEnforced, version: current.version },
        admin.token,
      )
  }
})

test('A4 quotation printing keeps long Thai documents across multiple pages', async ({
  page,
  request,
}, testInfo) => {
  const email = `print-${crypto.randomUUID()}@example.com`
  const registration = await api(request, '/auth/register', 'post', {
    email,
    password,
    displayName: 'Print Studio',
  })
  const token = registration.token
  const client = await api(
    request,
    '/clients',
    'post',
    { name: 'ลูกค้าสำหรับเอกสารหลายหน้า', address: 'ขอนแก่น' },
    token,
  )
  const draft = await api(
    request,
    '/finance/quotations',
    'post',
    {
      clientId: client.id,
      issueDate: '2026-10-14',
      validUntil: '2026-11-13',
      discount: '0',
      vatRate: '0',
      note: 'หมายเหตุท้ายเอกสาร',
      lines: Array.from({ length: 60 }, (_, index) => ({
        description: `รายการ ${index + 1} ออกแบบและพัฒนาเว็บไซต์สำหรับลูกค้า`,
        quantity: '1',
        unit: 'งาน',
        unitPrice: '100.00',
      })),
    },
    token,
  )
  await api(
    request,
    `/finance/quotations/${draft.id}/issue`,
    'post',
    { version: draft.version },
    token,
  )
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/finance/quotations')
  await page
    .getByRole('row')
    .filter({ hasText: 'ลูกค้าสำหรับเอกสารหลายหน้า' })
    .getByRole('button', { name: 'Preview' })
    .click()
  await expect(page.getByRole('dialog')).toContainText('รายการ 60')
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Print / Save PDF' })).toBeHidden()
  const pdf = await page.pdf({
    path: testInfo.outputPath('quotation-a4.pdf'),
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
  })
  expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1)
  await page.screenshot({ path: testInfo.outputPath('quotation-print.png'), fullPage: true })
})
