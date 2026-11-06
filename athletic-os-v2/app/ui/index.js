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

// ─── Form fields ──────────────────────────────────────────────────────────────
export function Field({ label, hint, error, htmlFor, children, style }) {
  return (
    <div className={s.field} style={style}>
      {label && <label className={s.fieldLabel} htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <span className={s.fieldHint}>{hint}</span>}
      {error && <span className={s.fieldError} role="alert">{error}</span>}
    </div>
  )
}
export function TextInput({ value, onChange, className, ...rest }) {
  return <input className={cx(s.input, className)} value={value ?? ''} onChange={e => onChange?.(e.target.value)} {...rest} />
}
export function TextArea({ value, onChange, rows = 3, className, ...rest }) {
  return <textarea className={cx(s.input, className)} rows={rows} value={value ?? ''} onChange={e => onChange?.(e.target.value)} {...rest} />
}

// ─── Segmented control ────────────────────────────────────────────────────────
// options: [{ key, label }]
export function Segmented({ options, value, onChange, label, style }) {
  return (
    <div className={s.segmented} role="tablist" aria-label={label} style={style}>
      {options.map(o => (
        <button key={o.key} role="tab" aria-selected={value === o.key}
          className={cx(s.segment, value === o.key && s['segment-on'])} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── Option cards: a single choice where each option needs a short description ─
// options: [{ key, label, desc }]
export function OptionCards({ options, value, onChange, label }) {
  return (
    <div className={s.options} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.key} role="radio" aria-checked={value === o.key}
          className={cx(s.option, value === o.key && s['option-on'])} onClick={() => onChange(o.key)}>
          <span className={s.optionTitle}>{o.label}</span>
          {o.desc && <span className={s.optionDesc}>{o.desc}</span>}
        </button>
      ))}
    </div>
  )
}

// ─── Removable token ──────────────────────────────────────────────────────────
export function Token({ children, onRemove, removeLabel }) {
  return (
    <span className={s.token}>
      {children}
      <button className={s.tokenX} onClick={onRemove} aria-label={removeLabel || `Remove ${children}`}>
        <Icon name="close" size={14} strokeWidth={2} />
      </button>
    </span>
  )
}

// ─── Disclosure row ───────────────────────────────────────────────────────────
export function Disclosure({ open, onToggle, children, trailing }) {
  return (
    <button className={s.disclosure} aria-expanded={!!open} onClick={onToggle}>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing}
      <Icon name="chevronDown" size={18} strokeWidth={2} className={cx(s.disclosureIcon, open && s['disclosureIcon-open'])} />
    </button>
  )
}

export function Hairline({ style }) { return <hr className={s.hairline} style={style} /> }

// ─── Choice list ──────────────────────────────────────────────────────────────
export function ChoiceList({ options, value, onChange, label }) {
  return (
    <div className={s.choices} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const key = typeof o === 'string' ? o : o.key
        const text = typeof o === 'string' ? o : o.label
        const on = value === key
        return (
          <button key={key} role="radio" aria-checked={on} className={cx(s.choice, on && s['choice-on'])} onClick={() => onChange(key)}>
            <span>{text}</span>
            <span className={s.choiceMark}><Icon name="check" size={14} strokeWidth={2.4} /></span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Step progress ────────────────────────────────────────────────────────────
export function StepProgress({ total, current, label }) {
  return (
    <div className={s.steps} role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }).map((_, i) => <span key={i} className={cx(s.step, i < current && s['step-on'])} />)}
    </div>
  )
}

// ─── Number stepper: − value + ────────────────────────────────────────────────
export function NumberStepper({ value, onChange, min = 0, max = 999, step = 1, label, suffix }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, n)))
  return (
    <div className={s.stepper} role="group" aria-label={label}>
      <button className={s.stepperBtn} aria-label={`Decrease ${label || ''}`.trim()} disabled={value <= min} onClick={() => set(value - step)}>
        <Icon name="minus" size={18} strokeWidth={2} />
      </button>
      <input className={s.stepperValue} type="number" inputMode="numeric" value={value} aria-label={label}
        onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) set(n) }} />
      {suffix && <span className="t-footnote c-2" style={{ marginRight: 6 }}>{suffix}</span>}
      <button className={s.stepperBtn} aria-label={`Increase ${label || ''}`.trim()} disabled={value >= max} onClick={() => set(value + step)}>
        <Icon name="plus" size={18} strokeWidth={2} />
      </button>
    </div>
  )
}
