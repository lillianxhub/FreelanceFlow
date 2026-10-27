'use client'
import { useCallback, useState, type CSSProperties } from 'react'
import {
  decimalCents,
  formatBaht,
  type FinanceDocument,
  type FinanceInvoice,
} from '../services/finance'
import type { SalesPreview } from './documentPreview'
import { secondary } from './FinanceShell'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { LogoImage } from './LogoImage'

const documentFontsReady = () => globalThis.document.fonts.ready

const parse = (value: string | null): Record<string, string> => {
  try {
    return value ? (JSON.parse(value) as Record<string, string>) : {}
  } catch {
    return {}
  }
}
export function DocumentPrint({
  invoice,
  document,
  preview,
  onClose,
}: {
  invoice?: FinanceInvoice
  document?: FinanceDocument
  preview?: SalesPreview
  onClose: () => void
}) {
  const sales = preview ?? invoice
  const [returnFocus] = useState(() => globalThis.document.activeElement as HTMLElement | null)
  const [logoReady, setLogoReady] = useState(false)
  const logoSettled = useCallback(() => setLogoReady(true), [])
  const seller = parse(document?.sellerSnapshot ?? sales?.sellerSnapshot ?? null)
  const buyer = parse(document?.buyerSnapshot ?? sales?.buyerSnapshot ?? null)
  const brand = parse(document?.brandSnapshot ?? sales?.brandSnapshot ?? null)
  const status = document?.status ?? sales?.status
  const title =
    document?.type === 'TAX_INVOICE'
      ? 'ใบกำกับภาษี / Tax Invoice'
      : document?.type === 'RECEIPT'
        ? 'ใบรับเงิน / Receipt'
        : preview?.kind === 'QUOTATION'
          ? 'ใบเสนอราคา / Quotation'
          : 'ใบแจ้งหนี้ / Invoice'
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="finance-print-dialog fixed inset-0 z-[60] overflow-y-auto bg-black/40 p-3 sm:p-8"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocus?.focus()
          }}
        >
          <DialogPrimitive.Title className="sr-only">{title} preview</DialogPrimitive.Title>
          <style>{`@media print { body > :not(.finance-print-dialog) { display: none !important } .finance-print-dialog { position: static !important; overflow: visible !important; padding: 0 !important; background: white !important } #finance-print { width: 100%; min-height: 0; max-width: none; border: 0; box-shadow: none; padding: 0 !important } .finance-print-controls { display: none !important } @page { size: A4; margin: 16mm; @bottom-center { content: "Page " counter(page) } } .finance-print-table thead { display: table-header-group } .finance-print-table tr { break-inside: avoid } .finance-print-table { font-size: 10pt } .finance-print-table td { overflow-wrap: anywhere } }`}</style>
          <div className="finance-print-controls mx-auto mb-3 flex max-w-[210mm] justify-end gap-2">
            <button className={secondary} onClick={onClose}>
              Close
            </button>
            <button
              className={secondary}
              disabled={Boolean(seller.logo_asset_id) && !logoReady}
              onClick={async () => {
                await documentFontsReady()
                window.print()
              }}
            >
              Print / Save PDF
            </button>
          </div>
          <article
            id="finance-print"
            className="mx-auto min-h-[297mm] max-w-[210mm] p-4 sm:p-[16mm] text-sm shadow-xl"
            style={{ '--document-brand': brand.color || undefined } as CSSProperties}
          >
            <header className="document-brand-border flex flex-wrap justify-between gap-4 border-b-2 pb-5">
              <div>
                {seller.logo_asset_id && (
                  <LogoImage
                    id={seller.logo_asset_id}
                    onReady={logoSettled}
                    className="mb-3 max-h-16 max-w-40 object-contain"
                  />
                )}
                <h1 className="text-2xl font-bold">{seller.business_name || 'Business name'}</h1>
                <p className="whitespace-pre-wrap">{seller.address}</p>
                <p>
                  Tax ID: {seller.tax_id || '—'} {seller.branch && `· Branch ${seller.branch}`}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold">{title}</h2>
                <p>{document?.number ?? sales?.number ?? 'DRAFT'}</p>
                <p>{document?.date ?? sales?.issueDate}</p>
              </div>
            </header>
            {(preview?.example || status === 'DRAFT' || status === 'CANCELLED') && (
              <div className="document-status-banner my-4 rounded border-2 p-2 text-center text-xl font-bold">
                {preview?.example ? 'EXAMPLE / DRAFT' : status}
              </div>
            )}
            {preview && preview.errors.length > 0 && (
              <div role="alert" className="document-preview-warning my-4 rounded border p-3">
                <p className="font-semibold">Some amounts cannot be calculated:</p>
                <ul className="list-disc pl-5">
                  {preview.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <section className="my-6">
              <h3 className="font-semibold">
                {preview?.kind === 'QUOTATION' ? 'Prepared for' : 'Bill to'}
              </h3>
              <p>{buyer.company_name || buyer.name || 'Customer'}</p>
              <p className="whitespace-pre-wrap">{buyer.address}</p>
              <p>Tax ID: {buyer.tax_id || '—'}</p>
            </section>
            {sales && (
              <table className="finance-print-table w-full table-fixed border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-y">
                    <th className="w-[36%] py-2">Description</th>
                    <th className="w-[10%]">Qty</th>
                    <th className="w-[10%]">Unit</th>
                    <th className="text-right">Unit price</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="max-w-[20rem] break-words whitespace-pre-wrap py-3">
                        {line.description || 'Service description'}
                      </td>
                      <td>{line.quantity}</td>
                      <td>{line.unit}</td>
                      <td className="text-right">{formatBaht(line.unitPrice)}</td>
                      <td className="text-right">{formatBaht(line.amount ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {document && (
              <table className="w-full border-y">
                <tbody>
                  <tr>
                    <td className="py-3">{document.description}</td>
                    <td className="text-right">{formatBaht(document.baseAmount)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            <div className="ml-auto mt-6 max-w-xs space-y-2">
              {sales && (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatBaht(sales.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span>{formatBaht(sales.discount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>VAT {sales ? `${sales.vatRate}%` : ''}</span>
                <span>{formatBaht(document?.vatAmount ?? sales?.vat ?? '0')}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>
                  {document
                    ? formatBaht(
                        (() => {
                          const cents =
                            (decimalCents(document.baseAmount) ?? 0n) +
                            (decimalCents(document.vatAmount) ?? 0n)
                          return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`
                        })(),
                      )
                    : formatBaht(sales?.total ?? '0')}
                </span>
              </div>
            </div>
            {sales?.note && <p className="mt-6 whitespace-pre-wrap">{sales.note}</p>}
            {sales && (
              <p className="mt-3">
                {preview?.kind === 'QUOTATION'
                  ? `Valid until: ${preview.validUntil || '—'}`
                  : `Due date: ${preview?.dueDate ?? invoice?.dueDate ?? '—'}`}
              </p>
            )}
            {seller.bank_details && (
              <p className="mt-3 whitespace-pre-wrap">{seller.bank_details}</p>
            )}
            <footer className="mt-12 whitespace-pre-wrap border-t pt-4 text-xs">
              {brand.footer}
            </footer>
          </article>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
