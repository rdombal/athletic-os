'use client'
// Bottom sheet: slides up from the bottom, follows the finger 1:1 when dragged,
// and settles with a spring that carries the release velocity. A flick down
// closes it. Interruptible: grabbing it mid-animation continues from where it is.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './ui.module.css'
import { Button, IconButton } from './index'

// ─── Spring (Apple-style parameters: response in seconds, damping ratio) ─────
function spring({ from, to, velocity = 0, response = 0.3, damping = 1, onUpdate, onDone }) {
  const k = Math.pow((2 * Math.PI) / response, 2)
  const c = (4 * Math.PI * damping) / response
  let x = from, v = velocity, last = performance.now(), raf
  const step = (now) => {
    let dt = Math.min(0.064, (now - last) / 1000); last = now
    while (dt > 0) {                       // fixed substeps keep it stable
      const h = Math.min(dt, 1 / 240)
      const a = -k * (x - to) - c * v
      v += a * h; x += v * h; dt -= h
    }
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 5) { onUpdate(to); onDone?.(); return }
    onUpdate(x); raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

// Where a flick would come to rest (UIScrollView-style deceleration).
const project = (v, rate = 0.998) => (v / 1000) * rate / (1 - rate)
// Resistance when dragged past the top edge.
const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over))

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function Sheet({ open, onClose, title, children, footer, label }) {
  const [mounted, setMounted] = useState(open)
  const panelRef = useRef(null)
  const scrimRef = useRef(null)
  const bodyRef = useRef(null)
  const y = useRef(0)               // current offset from resting position, px
  const h = useRef(600)             // panel height
  const stop = useRef(null)
  const drag = useRef(null)
  const returnFocus = useRef(null)
  const closing = useRef(false)

  const paint = useCallback((val) => {
    y.current = val
    if (panelRef.current) panelRef.current.style.transform = `translate3d(0, ${Math.max(val, -40)}px, 0)`
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, Math.min(1, 1 - val / h.current)))
  }, [])

  const animateTo = useCallback((to, velocity = 0, then, opts = {}) => {
    stop.current?.()
    if (reducedMotion()) { paint(to); then?.(); return }
    stop.current = spring({ from: y.current, to, velocity, response: opts.response ?? 0.32, damping: opts.damping ?? 1, onUpdate: paint, onDone: then })
  }, [paint])

  // notify=false when the parent closed it (it already knows); true when the person did
  const dismiss = useCallback((velocity = 0, notify = true) => {
    if (closing.current) return
    closing.current = true
    animateTo(h.current + 40, velocity, () => { setMounted(false); if (notify) onClose?.() }, { damping: 1, response: 0.28 })
  }, [animateTo, onClose])

  // Open / close driven by the parent
  useEffect(() => { if (open) { closing.current = false; setMounted(true) } else if (mounted && !closing.current) dismiss(0, false) }, [open])

  // Enter: start below the screen, spring up
  useLayoutEffect(() => {
    if (!mounted || !open) return
    h.current = panelRef.current?.offsetHeight || 600
    paint(h.current)
    animateTo(0, 0, null, { damping: 1, response: 0.34 })
    returnFocus.current = document.activeElement
    panelRef.current?.focus({ preventScroll: true })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      stop.current?.()
      returnFocus.current?.focus?.({ preventScroll: true })
    }
  }, [mounted])

  // ─── Dragging ────────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    // From inside the scroll area, only take over when it is scrolled to the top
    const inBody = bodyRef.current?.contains(e.target)
    if (inBody && bodyRef.current.scrollTop > 0) return
    if (e.target.closest('input, textarea, select')) return
    stop.current?.()                                   // grab it mid-flight
    drag.current = { id: e.pointerId, startY: e.clientY, startOffset: y.current, active: !inBody, inBody, samples: [{ t: e.timeStamp, y: e.clientY }] }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dy = e.clientY - d.startY
    if (!d.active) {
      if (dy > 8) { d.active = true; d.startY = e.clientY; d.startOffset = y.current; panelRef.current.setPointerCapture?.(e.pointerId) }
      else if (dy < -8) { drag.current = null; return }   // they meant to scroll the content
      else return
    }
    const raw = d.startOffset + (e.clientY - d.startY)
    paint(raw < 0 ? -rubberband(-raw, h.current) : raw)
    d.samples.push({ t: e.timeStamp, y: e.clientY })
    if (d.samples.length > 6) d.samples.shift()
    e.preventDefault?.()
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d || !d.active) return
    const a = d.samples[0], b = d.samples[d.samples.length - 1]
    const v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0   // px/s
    const landing = y.current + project(v)
    if (landing > h.current * 0.45 || v > 1100) dismiss(v)
    else animateTo(0, v, null, { damping: 0.82, response: 0.32 })   // it was flicked: allow a little overshoot
  }

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(
    <div className={s.sheetRoot}>
      <div ref={scrimRef} className={s.sheetScrim} onClick={() => dismiss()} aria-hidden="true" />
      <div ref={panelRef} className={s.sheet} role="dialog" aria-modal="true" aria-label={label || title} tabIndex={-1}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className={s.sheetGrabber} aria-hidden="true" />
        {title && (
          <div className={s.sheetHead}>
            <h2 className="t-headline">{title}</h2>
            <IconButton icon="close" label="Close" filled size={18} onClick={() => dismiss()} />
          </div>
        )}
        <div ref={bodyRef} className={s.sheetBody}>{children}</div>
        {footer && <div className={s.sheetFoot}>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

// A decision that needs a second look, in place of window.confirm.
export function ConfirmSheet({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, onConfirm, onCancel }) {
  return (
    <Sheet open={open} onClose={onCancel} label={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 4px 4px' }}>
        <h2 className="t-title2">{title}</h2>
        {message && <p className="t-body c-2">{message}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 20 }}>
        <Button full variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}
          style={destructive ? { background: 'var(--c-danger)', color: '#fff' } : undefined}>{confirmLabel}</Button>
        <Button full variant="quiet" onClick={onCancel}>{cancelLabel}</Button>
      </div>
    </Sheet>
  )
}
