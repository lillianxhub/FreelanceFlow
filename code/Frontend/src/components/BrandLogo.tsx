import Image from 'next/image'

export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Image
        src="/logo-light.svg"
        alt=""
        width={size}
        height={size}
        className="absolute inset-0 h-full w-full object-contain dark:hidden"
      />
      <Image
        src="/logo-dark.svg"
        alt=""
        width={size}
        height={size}
        className="absolute inset-0 hidden h-full w-full object-contain dark:block"
      />
    </span>
  )
}
