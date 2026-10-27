import type { Dispatch, SetStateAction } from 'react'
import type { FinanceLine, FinancePreset } from '../services/finance'
import { input, secondary } from './FinanceShell'

export const blankLine = (): FinanceLine => ({
  description: '',
  quantity: '1',
  unit: '',
  unitPrice: '0.00',
})

type Props = {
  lines: FinanceLine[]
  presets: FinancePreset[]
  setLines: Dispatch<SetStateAction<FinanceLine[]>>
  setVatRate: Dispatch<SetStateAction<string>>
}

export function SalesDocumentLineItems({ lines, presets, setLines, setVatRate }: Props) {
  const updateLine = (index: number, patch: Partial<FinanceLine>) => {
    setLines((current) =>
      current.map((line, position) => (position === index ? { ...line, ...patch } : line)),
    )
  }

  return (
    <>
      <label className="block text-sm">
        Add service preset
        <select
          className={input}
          value=""
          onChange={(event) => {
            const preset = presets.find((item) => item.id === event.target.value)
            if (!preset) return
            setLines((current) => [
              ...current,
              {
                description: preset.description,
                quantity: preset.quantity,
                unit: preset.unit,
                unitPrice: preset.unitPrice,
              },
            ])
            setVatRate(preset.suggestedVatRate)
          }}
        >
          <option value="">Choose preset</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>
      {lines.map((line, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-border p-3">
          <label className="block text-sm">
            Description
            <input
              className={input}
              required
              value={line.description}
              onChange={(event) => updateLine(index, { description: event.target.value })}
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm">
              Quantity
              <input
                className={input}
                required
                inputMode="decimal"
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Unit
              <input
                className={input}
                value={line.unit}
                onChange={(event) => updateLine(index, { unit: event.target.value })}
              />
            </label>
            <label className="text-sm">
              Price
              <input
                className={input}
                required
                inputMode="decimal"
                value={line.unitPrice}
                onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
              />
            </label>
          </div>
          {lines.length > 1 && (
            <button
              type="button"
              className="min-h-11 text-destructive"
              onClick={() =>
                setLines((current) => current.filter((_, position) => position !== index))
              }
            >
              Remove line
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className={secondary}
        disabled={lines.length >= 100}
        onClick={() => setLines((current) => [...current, blankLine()])}
      >
        Add line
      </button>
    </>
  )
}
