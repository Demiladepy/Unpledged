import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor',
  'aria-hidden': true,
} as const

export function IconShield({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        d="M12 3 4 6.5v6.5c0 4.4 3.4 7.6 8 8.5 4.6-.9 8-4.1 8-8.5V6.5L12 3Z"
      />
    </svg>
  )
}

export function IconDocument({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path
        strokeLinecap="square"
        d="M8 3h8l4 4v14H8V3Z"
      />
      <path strokeLinecap="square" d="M16 3v4h4M10 12h8M10 16h8" />
    </svg>
  )
}

export function IconEyeOff({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M3 3l18 18" />
      <path
        strokeLinecap="square"
        d="M10.7 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-4.3M6.4 6.4C4.2 7.8 2.7 9.7 2 12c1.5 4.5 6 7.5 10 7.5 1.8 0 3.5-.5 5-1.3M17.1 17.1c2.1-1.3 3.6-3.2 4.3-5.1"
      />
    </svg>
  )
}

export function IconCheck({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M5 12l5 5L20 7" />
    </svg>
  )
}

export function IconX({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconBuilding({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M4 21V5h6v16M14 21V9h6v12" />
      <path strokeLinecap="square" d="M7 8h1M7 12h1M7 16h1M17 12h1M17 16h1" />
    </svg>
  )
}

export function IconArrowRight({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function IconLock({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M7 10V7a5 5 0 0 1 10 0v3" />
      <path strokeLinecap="square" d="M6 10h12v10H6V10Z" />
    </svg>
  )
}

export function IconCopy({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M8 8h10v12H8V8Z" />
      <path strokeLinecap="square" d="M6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10" />
    </svg>
  )
}

export function IconMenu({ className, ...props }: IconProps) {
  return (
    <svg className={className} {...base} {...props}>
      <path strokeLinecap="square" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
