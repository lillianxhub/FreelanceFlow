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
  await page.getByLabel('อีเมล').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'วันนี้' }).first()).toBeVisible()
  const cookies = await context.cookies()
  expect(
    cookies.some(
      (cookie) => cookie.name.includes('freelanceflow') && cookie.path.startsWith('/api/auth'),
    ),
  ).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'วันนี้' }).first()).toBeVisible()
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/projects$/)
  await page.locator('header button[aria-haspopup="menu"]').click()
  await page.getByRole('menuitem', { name: 'ออกจากระบบ' }).click()
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
  await page.getByLabel('อีเมล').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page
    .getByRole('button', { name: 'ลาก Browser Task เข้าวันนี้' })
    .dragTo(page.getByTestId('today-drop'))
  await expect(page.getByRole('table').first().getByText('Browser Task')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('table').first().getByText('Browser Task')).toBeVisible()
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
  await page.goto(`/projects/${project.id}`)
  await expect(page.getByText('Browser Task').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'เริ่มทำ' })).toBeVisible()
  await page.getByRole('button', { name: 'เริ่มทำ' }).click()
  await expect(page.getByLabel('ตัวจับเวลาที่กำลังทำงาน')).toBeVisible()
  await page.goto('/clients')
  await expect(page.getByLabel('ตัวจับเวลาที่กำลังทำงาน')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'หยุดและบันทึกเวลา' }).click()
  await expect(page.getByLabel('ตัวจับเวลาที่กำลังทำงาน')).toHaveCount(0)
  await page.goto(`/projects/${project.id}`)
  await page.getByLabel('โหมดจับเวลาบนบอร์ด').selectOption('MANUAL')
  await expect(page.getByLabel('โหมดจับเวลาบนบอร์ด')).toHaveValue('MANUAL')
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
  await page.getByLabel('อีเมล').fill(email)
  await page.locator('input[name=password]').fill(password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page.getByRole('heading', { name: 'งานค้างจากวันก่อน' })).toBeVisible()
  await expect(page.getByTestId('today-drop').getByText('Carry Task')).toHaveCount(0)
  await page.getByRole('button', { name: 'ยกมาวันนี้' }).click()
  await expect(page.getByTestId('today-drop').getByText('Carry Task')).toBeVisible()
})
