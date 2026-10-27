import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminLink, workspaceLinks } from '../constants/navigation'
import { useAuth } from '../Authentication/useAuthentication'
import { useFeatures } from '../Features/FeaturesContext'
import type { SidebarLinkProps, SidebarProps } from '../types/ui'
import { Sheet, SheetContent, SheetTitle } from './ui/sheet'
import { BrandLogo } from './BrandLogo'

function SidebarLink({ to, label, icon, badge }: SidebarLinkProps) {
  const Icon = icon
  const pathname = usePathname()
  const isActive = pathname === to || (to === '/finance' && pathname.startsWith('/finance/'))
  return (
    <Link
      href={to}
      className={`group/nav grid min-h-10 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[9px] px-[11px] py-2 text-sm no-underline transition-colors ${isActive ? 'active bg-primary-soft font-semibold text-primary-dark' : 'text-text-secondary hover:bg-surface-soft hover:text-text-primary'}`}
    >
      <span
        className="grid size-[18px] place-items-center text-base text-subtle group-[.active]/nav:text-primary"
        aria-hidden="true"
      >
        <Icon />
      </span>
      <span>{label}</span>
      {badge !== undefined && (
        <span className="min-w-[21px] rounded-full bg-surface-soft px-1.5 py-0.5 text-center text-xs text-text-secondary">
          {badge}
        </span>
      )}
    </Link>
  )
}

function SidebarContent({ onClose }: Pick<SidebarProps, 'onClose'>) {
  const { user } = useAuth()
  const { features } = useFeatures()
  return (
    <div className="flex h-full flex-col">
      <div className="mb-[22px] flex items-center gap-[11px] px-[5px]">
        <BrandLogo size={34} />
        <div className="min-w-0">
          <div className="text-base font-bold tracking-[-0.02em]">FreelanceFlow</div>
          <div className="mt-px text-[10px] font-semibold tracking-[0.16em] text-text-secondary uppercase">
            Workspace
          </div>
        </div>
      </div>

      <div className="mt-4 mb-[7px] px-[11px] text-xs font-bold tracking-[0.12em] text-subtle uppercase">
        Workspace
      </div>
      <nav className="flex flex-col gap-[3px]" onClick={onClose}>
        {workspaceLinks.map((link) => (
          <SidebarLink
            key={link.to}
            {...link}
            badge={
              link.to === '/finance' && features?.premiumEnforced && !features.finance
                ? 'Premium'
                : undefined
            }
          />
        ))}
        {user?.role === 'ADMIN' && <SidebarLink {...adminLink} />}
      </nav>
    </div>
  )
}

function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden h-screen w-[244px] shrink-0 flex-col border-r border-border bg-sidebar px-[14px] pt-6 pb-[18px] lg:sticky lg:top-0 lg:z-40 lg:flex print:hidden">
        <SidebarContent onClose={onClose} />
      </aside>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose()
        }}
      >
        <SheetContent
          side="left"
          className="w-[244px] gap-0 overflow-y-auto px-[14px] py-6 sm:max-w-[244px] lg:hidden"
        >
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          <SidebarContent onClose={onClose} />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default Sidebar
