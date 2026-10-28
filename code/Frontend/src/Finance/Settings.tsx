'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import {
  financeApi,
  type FinanceCategory,
  type FinancePreset,
  type FinanceSettings,
} from '../services/finance'
import { api, fetchMultipartClient } from '../api/apiClient'
import { LogoImage } from './LogoImage'

export default function Settings() {
  const [settings, setSettings] = useState<FinanceSettings | null>(null)
  const [presets, setPresets] = useState<FinancePreset[]>([])
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [categoryKind, setCategoryKind] = useState<FinanceCategory['kind']>('INCOME')
  const [categoryName, setCategoryName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('')
  const [unitPrice, setUnitPrice] = useState('0')
  const [suggestedVatRate, setSuggestedVatRate] = useState('0')
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [s, p, c] = await Promise.all([
        financeApi.settings(),
        financeApi.presets(),
        financeApi.categories(),
      ])
      setSettings(s)
      setPresets(p)
      setCategories(c)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load settings')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    queueMicrotask(() => void load())
  }, [])
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) return
    setBusy(true)
    setError('')
    try {
      setSettings(await financeApi.saveSettings(settings))
      toast.success('Settings saved')
    } catch (reason) {
      await load()
      setError(reason instanceof Error ? reason.message : 'Could not save settings')
    } finally {
      setBusy(false)
    }
  }
  const upload = async (file: File) => {
    if (!settings) return
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Logo must be PNG or JPEG, at most 1 MB')
      return
    }
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const result = await fetchMultipartClient<{ id: string }>('/finance/assets/logo', body)
      setSettings(await financeApi.saveSettings({ ...settings, logoAssetId: result.data.id }))
      toast.success('Logo saved')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not upload logo')
    } finally {
      setBusy(false)
    }
  }
  const createPreset = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await financeApi.savePreset({
        name,
        description,
        quantity,
        unit,
        unitPrice,
        suggestedVatRate,
      })
      setName('')
      setDescription('')
      setPresets(await financeApi.presets())
      toast.success('Preset saved')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save preset')
    } finally {
      setBusy(false)
    }
  }
  return (
    <FinanceShell
      title="Business settings & templates"
      description="These details are copied into documents when issued. Existing documents keep their original details."
    >
      {loading && <p role="status">Loading…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}{' '}
          <button className={secondary} onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      {settings && (
        <form className={`${panel} space-y-4`} onSubmit={(event) => void save(event)}>
          <h2 className="text-lg font-semibold">Document identity</h2>
          {(
            [
              ['businessName', 'Business name'],
              ['address', 'Address'],
              ['taxId', 'Tax ID'],
              ['branch', 'Branch'],
              ['bankDetails', 'Bank details'],
              ['footer', 'Footer note'],
            ] as const
          ).map(([key, label]) => (
            <label className="block text-sm" key={key}>
              {label}
              <input
                className={input}
                value={settings[key]}
                onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.vatRegistered}
              onChange={(event) =>
                setSettings({ ...settings, vatRegistered: event.target.checked })
              }
            />{' '}
            VAT registered
          </label>
          <label className="block text-sm">
            Brand color
            <input
              className={input}
              type="color"
              value={settings.brandColor}
              onChange={(event) => setSettings({ ...settings, brandColor: event.target.value })}
            />
          </label>
          <label className="block text-sm">
            Logo PNG/JPEG up to 1 MB
            <input
              className={input}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
              }}
            />
          </label>
          {settings.logoAssetId && (
            <LogoImage id={settings.logoAssetId} className="max-h-24 max-w-48 object-contain" />
          )}
          <button className={primary} disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      )}
      <section className={panel}>
        <h2 className="text-lg font-semibold">Service presets</h2>
        <p className="mb-4 text-sm text-text-secondary">
          Choosing a preset copies its values into a new invoice line.
        </p>
        <div className="space-y-2">
          {presets.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-border py-2">
              <span>
                {p.name} · {p.description} · {p.quantity} {p.unit} × {p.unitPrice} THB
              </span>
              <button
                className="text-destructive"
                onClick={() =>
                  void api
                    .delete(`/finance/presets/${p.id}?version=${p.version}`)
                    .then(() => load())
                    .catch((reason) =>
                      setError(
                        reason instanceof Error ? reason.message : 'Could not delete preset',
                      ),
                    )
                }
              >
                Delete
              </button>
            </div>
          ))}
          {!presets.length && <p className="py-5 text-text-secondary">No presets yet.</p>}
        </div>
        <form
          className="mt-5 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => void createPreset(event)}
        >
          <label className="text-sm">
            Preset name
            <input
              className={input}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Description
            <input
              className={input}
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Quantity
            <input
              className={input}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Unit
            <input
              className={input}
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Unit price THB
            <input
              className={input}
              required
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
            />
          </label>
          <label className="text-sm">
            Suggested VAT %
            <input
              className={input}
              value={suggestedVatRate}
              onChange={(event) => setSuggestedVatRate(event.target.value)}
            />
          </label>
          <button className={primary} disabled={busy}>
            Add preset
          </button>
        </form>
      </section>
      <section className={panel}>
        <h2 className="text-lg font-semibold">Income and expense categories</h2>
        <div className="mt-3 space-y-2">
          {categories.map((item) => (
            <div key={item.id} className="flex justify-between border-b border-border py-2 text-sm">
              <span>
                {item.kind} · {item.name}
              </span>
              <button
                className="text-destructive"
                disabled={busy}
                onClick={() => {
                  void financeApi
                    .deleteCategory(item)
                    .then(() => load())
                    .catch((reason) =>
                      setError(
                        reason instanceof Error ? reason.message : 'Could not delete category',
                      ),
                    )
                }}
              >
                Delete
              </button>
            </div>
          ))}
          {!categories.length && <p className="py-4 text-text-secondary">No categories yet.</p>}
        </div>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            void financeApi
              .createCategory(categoryKind, categoryName)
              .then(() => {
                setCategoryName('')
                return load()
              })
              .catch((reason) =>
                setError(reason instanceof Error ? reason.message : 'Could not add category'),
              )
              .finally(() => setBusy(false))
          }}
        >
          <label className="text-sm">
            Type
            <select
              className={input}
              value={categoryKind}
              onChange={(event) => setCategoryKind(event.target.value as FinanceCategory['kind'])}
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </label>
          <label className="text-sm">
            Name
            <input
              className={input}
              required
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
            />
          </label>
          <button className={primary} disabled={busy}>
            Add category
          </button>
        </form>
      </section>
    </FinanceShell>
  )
}
