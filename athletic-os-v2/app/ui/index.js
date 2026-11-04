'use client'
// Hale's shared components. Screens build from these instead of inline styles.
import { useEffect, useRef, useState } from 'react'
import s from './ui.module.css'
import Icon, { HaleMark } from './Icon'

export { Icon, HaleMark }

const cx = (...c) => c.filter(Boolean).join(' ')

// ─── Buttons ──────────────────────────────────────────────────────────────────
// variant: primary | accent | secondary | quiet | danger · size: lg | md | sm
export function Button({ variant = 'primary', size = 'lg', full, icon, iconAfter, children, className, ...rest }) {
  return (
    <button className={cx(s.btn, s[`btn-${variant}`], s[`btn-${size}`], full && s['btn-full'], className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} strokeWidth={2} />}
      {children}
      {iconAfter && <Icon name={iconAfter} size={size === 'sm' ? 18 : 20} strokeWidth={2} />}
    </button>
  )
}

// Icon-only button. `label` is required: it is what screen readers announce.
export function IconButton({ icon, label, filled, size = 22, className, ...rest }) {
  return (
    <button aria-label={label} className={cx(s.iconBtn, filled && s['iconBtn-filled'], className)} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  )
}

// ─── Chips ────────────────────────────────────────────────────────────────────
export function Chip({ selected, small, children, className, ...rest }) {
  return (
    <button aria-pressed={!!selected} className={cx(s.chip, small && s['chip-sm'], selected && s['chip-selected'], className)} {...rest}>
      {children}
    </button>
  )
}
export function ChipRow({ children, style }) {
  return <div className={s.chipRow} style={style}>{children}</div>
}

// ─── Card ─────────────────────────────────────────────────────────────────────
// tone: default | muted | inverse · pass onClick to make the whole card a button
export function Card({ tone = 'default', flat, onClick, children, className, style, ...rest }) {
  const cls = cx(s.card, tone !== 'default' && s[`card-${tone}`], flat && s['card-flat'], className)
  if (onClick) return <button className={cls} onClick={onClick} style={style} {...rest}>{children}</button>
  return <div className={cls} style={style} {...rest}>{children}</div>
}

// ─── Section header ───────────────────────────────────────────────────────────
export function Section({ title, action, onAction, children, style }) {
  return (
    <section style={style}>
      {(title || action) && (
        <div className={s.section}>
          {title && <h2 className={s.sectionTitle}>{title}</h2>}
          {action && <button className={s.sectionAction} onClick={onAction}>{action}</button>}
        </div>
      )}
      {children}
    </section>
  )
}

// ─── List row ─────────────────────────────────────────────────────────────────
export function Row({ icon, title, subtitle, trailing = 'chevronRight', onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={s.row} onClick={onClick}>
      {icon && <span className={s.rowIcon}><Icon name={icon} size={22} /></span>}
      <span className={s.rowText}>
        <span className="t-callout">{title}</span>
        {subtitle && <span className="t-subhead c-2">{subtitle}</span>}
      </span>
      {children}
      {trailing && <Icon name={trailing} size={18} style={{ color: 'var(--c-text-3)' }} />}
    </Tag>
  )
}

// ─── Skeleton: replaces the blinking dots while something loads ──────────────
export function Skeleton({ lines = 3, label = 'Loading' }) {
  const widths = ['92%', '100%', '74%', '86%', '60%']
  return (
    <div className={s.skeleton} role="status" aria-label={label}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={s.skeletonLine} style={{ width: widths[i % widths.length], animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, visible, action }) {
  if (!visible) return null
  return (
    <div role="status" className={cx(s.toast, !action && s['toast-plain'])}>
      <span>{message}</span>
      {action && <button className={s.toastAction} onClick={action.onPress}>{action.label}</button>}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
export function TabBar({ items, active, onChange }) {
  return (
    <nav className={s.tabbar} aria-label="Main">
      {items.map(it => {
        const on = it.key === active
        return (
          <button key={it.key} className={cx(s.tab, on && s['tab-active'])}
            aria-current={on ? 'page' : undefined} onClick={() => onChange(it.key)}>
            <Icon name={it.icon} size={22} strokeWidth={on ? 1.9 : 1.7} />
            <span>{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Screen header ────────────────────────────────────────────────────────────
// A large title in the content. Once it scrolls under the top edge, a compact
// title fades into a translucent bar, the way iOS large titles behave.
export function ScreenHeader({ title, subtitle, onBack, backLabel = 'Back', right }) {
  const titleRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = titleRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div className={cx(s.compactBar, !scrolled && s['compactBar-flat'], scrolled && s['compactBar-scrolled'])}>
        <div className={s.barSide}>
          {onBack && <IconButton icon="chevronLeft" label={backLabel} onClick={onBack} />}
        </div>
        <div className={cx(s.compactTitle, scrolled && s['compactTitle-visible'])} aria-hidden={!scrolled}>{title}</div>
        <div className={s.barSide}>{right}</div>
      </div>
      <header className={s.largeTitle}>
        <h1 ref={titleRef} className="t-title1">{title}</h1>
        {subtitle && <p className={cx('t-subhead c-2', s.largeTitleSub)}>{subtitle}</p>}
      </header>
    </>
  )
}
