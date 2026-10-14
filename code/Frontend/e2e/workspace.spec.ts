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
  expect(response.ok(), `${method.toUpperCase()} ${path}: ${await response.text()}`).toBeTruthy()
  return (await response.json()).data
}

test('login, refresh, direct routes, and logout through the Next proxy', async ({
  page,
  request,
  context,
}) => {
  const email = `browser-${crypto.randomUUID()}@example.com`
  await api(request, '/auth/register', 'post', { email, password, displayName: 'Browser User' })
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Work overview' }).first()).toBeVisible()
  const cookies = await context.cookies()
  expect(
    cookies.some(
      (cookie) => cookie.name.includes('freelanceflow') && cookie.path.startsWith('/api/auth'),
    ),
  ).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Work overview' }).first()).toBeVisible()
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/projects$/)
  await page.locator('header button[aria-haspopup="menu"]').click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('daily plan persists, rejects a stale version, and exposes board workflow', async ({
  page,
  request,
}) => {
  const email = `planner-${crypto.randomUUID()}@example.com`
  await api(request, '/auth/register', 'post', { email, password, displayName: 'Planner User' })
  const login = await api(request, '/auth/login', 'post', { email, password })
  const token: string = login.token
  const client = await api(request, '/clients', 'post', { name: 'Browser Client' }, token)
  const project = await api(
    request,
    '/projects',
    'post',
    { clientId: client.id, name: 'Browser Project' },
    token,
  )
  await api(request, `/projects/${project.id}/status`, 'patch', { status: 'ACTIVE' }, token)
  const task = await api(
    request,
    `/projects/${project.id}/tasks`,
    'post',
    { name: 'Browser Task', sortOrder: 0 },
    token,
  )
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/task-board')
  await page
    .getByRole('button', { name: 'Drag Browser Task into Today' })
    .dragTo(page.getByTestId('today-drop'))
  await expect(page.getByRole('table').first().getByText('Browser Task')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('table').first().getByText('Browser Task')).toBeVisible()
  await page.getByRole('button', { name: 'Start timer' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/task-board$/)
  await expect(page.getByLabel('Active timer')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Stop timer' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Active timer')).toHaveCount(0)
  await api(
    request,
    `/projects/${project.id}/tasks`,
    'post',
    { name: 'Board Task', sortOrder: 1 },
    token,
  )
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const plan = await api(request, `/daily-plans/${date}`, 'get', undefined, token)
  expect(plan.tasks.map((item: { id: string }) => item.id)).toContain(task.id)
  const conflict = await request.put(`/api/daily-plans/${date}`, {
    data: { version: 0, taskIds: [] },
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(conflict.status()).toBe(409)
  await page.goto(`/task-board?tab=kanban&projectId=${project.id}`)
  await expect(page.getByText('Board Task').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start work' })).toBeVisible()
  await page.getByRole('button', { name: 'Start work' }).click()
  await expect(page.getByLabel('Active timer')).toBeVisible()
  await page.goto('/clients')
  await expect(page.getByLabel('Active timer')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Stop and save time' }).click()
  await expect(page.getByLabel('Active timer')).toHaveCount(0)
  await page.goto(`/task-board?tab=kanban&projectId=${project.id}`)
  await page.getByLabel('Board timer mode').selectOption('MANUAL')
  await expect(page.getByLabel('Board timer mode')).toHaveValue('MANUAL')
  const preference = await api(request, '/workspace/preferences', 'get', undefined, token)
  expect(preference.boardTimerMode).toBe('MANUAL')
})

test('unfinished tasks from the previous day need an explicit carry-over', async ({
  page,
  request,
}) => {
  const email = `carry-${crypto.randomUUID()}@example.com`
  await api(request, '/auth/register', 'post', { email, password, displayName: 'Carry User' })
  const token: string = (await api(request, '/auth/login', 'post', { email, password })).token
  const client = await api(request, '/clients', 'post', { name: 'Carry Client' }, token)
  const project = await api(
    request,
    '/projects',
    'post',
    { clientId: client.id, name: 'Carry Project' },
    token,
  )
  await api(request, `/projects/${project.id}/status`, 'patch', { status: 'ACTIVE' }, token)
  const task = await api(
    request,
    `/projects/${project.id}/tasks`,
    'post',
    { name: 'Carry Task', sortOrder: 0 },
    token,
  )
  const yesterday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() - 86_400_000))
  await api(request, `/daily-plans/${yesterday}`, 'put', { version: 0, taskIds: [task.id] }, token)
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/task-board')
  await expect(page.getByRole('heading', { name: 'Open tasks from previous day' })).toBeVisible()
  await expect(page.getByTestId('today-drop').getByText('Carry Task')).toHaveCount(0)
  await page.getByRole('button', { name: 'Carry into today' }).click()
  await expect(page.getByTestId('today-drop').getByText('Carry Task')).toBeVisible()
})

test('finance prototype connects invoice payments to income and outstanding totals', async ({
  page,
  request,
}) => {
  const email = `finance-${crypto.randomUUID()}@example.com`
  await api(request, '/auth/register', 'post', { email, password, displayName: 'Finance User' })
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/finance/invoices')
  await expect(
    page.getByText('Prototype — sample data only. Changes reset on reload.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'New invoice' }).click()
  await page.getByLabel('Client', { exact: true }).fill('Sample Client')
  await page.getByLabel('Project', { exact: true }).fill('Sample Project')
  await page.getByLabel('Issue date').fill('2026-10-01')
  await page.getByLabel('Due date').fill('2026-10-31')
  await page.getByLabel('Description', { exact: true }).fill('Sample work')
  await page.getByLabel('Qty').fill('2')
  await page.getByLabel('Unit price (THB)').fill('1250.50')
  await page.getByRole('button', { name: 'Save demo draft' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Sample Client' })
  await expect(row).toContainText('DRAFT')
  await row.getByRole('button', { name: 'Preview' }).click()
  await expect(page.getByText('SAMPLE', { exact: true })).toBeVisible()
  await page.getByRole('dialog').press('Escape')
  await row.getByRole('button', { name: 'Issue demo' }).click()
  await expect(row).toContainText('ISSUED')
  await page
    .getByRole('navigation', { name: 'Finance pages' })
    .getByRole('link', { name: 'Payments' })
    .click()
  await page.getByRole('button', { name: 'Record payment' }).click()
  await page
    .getByRole('combobox', { name: 'Invoice' })
    .selectOption({ label: 'SAMPLE-003 · Sample Client' })
  await page.getByLabel('Amount (THB)').fill('1000')
  await page.getByLabel('Payment date').fill('2026-10-02')
  await page.getByRole('button', { name: 'Record sample payment' }).click()
  await page
    .getByRole('navigation', { name: 'Finance pages' })
    .getByRole('link', { name: 'Invoices' })
    .click()
  await expect(page.getByRole('row').filter({ hasText: 'Sample Client' })).toContainText(
    'PARTIALLY PAID',
  )
  await page
    .getByRole('navigation', { name: 'Finance pages' })
    .getByRole('link', { name: 'Overview' })
    .click()
  await expect(page.getByText(/26,501\.00/)).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Finance pages' })
    .getByRole('link', { name: 'Income' })
    .click()
  await expect(page.getByText('Payment for SAMPLE-003')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Finance pages' })
    .getByRole('link', { name: 'Payments' })
    .click()
  await page.getByRole('button', { name: 'Record payment' }).click()
  await page
    .getByRole('combobox', { name: 'Invoice' })
    .selectOption({ label: 'SAMPLE-003 · Sample Client' })
  await page.getByLabel('Amount (THB)').fill('2000')
  await page.getByLabel('Payment date').fill('2026-10-03')
  await page.getByRole('button', { name: 'Record sample payment' }).click()
  await expect(page.getByRole('alert')).toContainText('within its outstanding balance')
  await page.getByLabel('Amount (THB)').fill('1501')
  await page.getByRole('button', { name: 'Record sample payment' }).click()
  await page
    .getByRole('navigation', { name: 'Finance pages' })
    .getByRole('link', { name: 'Invoices' })
    .click()
  await expect(page.getByRole('row').filter({ hasText: 'Sample Client' })).toContainText('PAID')
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Sample Client' })).toHaveCount(0)
})
