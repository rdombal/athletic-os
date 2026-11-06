'use client'
// One way to show a routine everywhere: Move, Home's Quick Relief, Rotation.
import { useState, useEffect, useRef } from 'react'
import { Button, Card, Icon } from './index'
import { Sheet } from './Sheet'

export function ExerciseList({ exercises }) {
  return (
    <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
      {exercises.map((ex, i) => (
        <li key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
          <span className="t-num" aria-hidden="true"
            style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 300, lineHeight: 1.1, color: 'var(--c-accent-text)', minWidth: 18 }}>
            {i + 1}
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span className="t-callout" style={{ fontWeight: 600 }}>{ex.name}</span>
              {ex.reps && <span className="t-footnote c-accent t-num" style={{ flexShrink: 0, textAlign: 'right' }}>{ex.reps}</span>}
            </span>
            {ex.cue && <span className="t-subhead c-2">{ex.cue}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

// "30s", "45 sec", "60 seconds each side", "1 min", "2 minutes" → seconds. Reps-based moves return null.
export function holdSeconds(reps) {
  if (!reps) return null
  const t = String(reps).toLowerCase()
  const min = t.match(/(\d+(?:\.\d+)?)\s*(?:min|minute)/)
  if (min) return Math.round(parseFloat(min[1]) * 60)
  const sec = t.match(/(\d+)\s*(?:s\b|sec|second)/)
  return sec ? parseInt(sec[1], 10) : null
}

function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

// A countdown for timed holds. Starts on tap, never on its own.
function HoldTimer({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(false)
  const endAt = useRef(0)
  useEffect(() => {
    if (!running) return
    endAt.current = Date.now() + left * 1000
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) { setRunning(false); try { navigator.vibrate?.([20, 60, 20]) } catch {} ; onDone?.() }
    }, 200)
    return () => clearInterval(id)
  }, [running])
  const R = 52, C = 2 * Math.PI * R, pct = left / seconds
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }} role="timer" aria-label={`${fmt(left)} left`}>
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--c-line)" strokeWidth="6" />
          <circle cx="60" cy="60" r={R} fill="none" stroke={left === 0 ? 'var(--c-done)' : 'var(--c-accent)'} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 200ms linear' }} />
        </svg>
        <span className="t-title1 t-num" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          {left === 0 ? <Icon name="check" size={32} style={{ color: 'var(--c-done)' }} /> : fmt(left)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {left > 0
          ? <Button size="md" variant={running ? 'secondary' : 'accent'} icon={running ? 'pause' : 'play'} onClick={() => setRunning(r => !r)}>
              {running ? 'Pause' : left < seconds ? 'Resume' : 'Start timer'}
            </Button>
          : <span className="t-callout" style={{ fontWeight: 600, color: 'var(--c-done)' }}>Done</span>}
        {left < seconds && (
          <Button size="sm" variant="quiet" icon="restart" onClick={() => { setRunning(false); setLeft(seconds) }}>Reset</Button>
        )}
      </div>
    </div>
  )
}

// Follow a routine one move at a time.
export function RoutinePlayer({ open, onClose, exercises, title }) {
  const [i, setI] = useState(0)
  const [finished, setFinished] = useState(false)
  useEffect(() => { if (open) { setI(0); setFinished(false) } }, [open])
  const n = exercises.length
  const ex = exercises[Math.min(i, n - 1)] || {}
  const secs = holdSeconds(ex.reps)
  const last = i === n - 1

  const footer = finished
    ? <Button full onClick={onClose}>Done</Button>
    : (
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" icon="chevronLeft" onClick={() => setI(v => Math.max(0, v - 1))} disabled={i === 0} aria-label="Previous move" style={{ flexShrink: 0, width: 56, paddingLeft: 0, paddingRight: 0 }} />
        <Button full iconAfter={last ? 'check' : 'arrowRight'} onClick={() => last ? setFinished(true) : setI(v => v + 1)}>
          {last ? 'Finish' : 'Next'}
        </Button>
      </div>
    )

  return (
    <Sheet open={open} onClose={onClose} title={title || 'Routine'} footer={footer}>
      {finished ? (
        <div className="pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: '24px 0 32px', minHeight: 'min(56vh, 460px)' }}>
          <span style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--c-done-soft)', color: 'var(--c-done)', display: 'grid', placeItems: 'center' }}>
            <Icon name="check" size={28} strokeWidth={2.2} />
          </span>
          <h3 className="t-title1">That's the routine.</h3>
          <p className="t-body c-2">{n} moves done. Notice how you feel compared to when you started.</p>
        </div>
      ) : (
        // A steady height, so the sheet doesn't jump as moves change
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 16, minHeight: 'min(56vh, 460px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="t-footnote c-2 t-num" aria-live="polite">Move {i + 1} of {n}</span>
            <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
              {exercises.map((_, k) => (
                <span key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: k <= i ? 'var(--c-accent)' : 'var(--c-line)', transition: 'background var(--t-base) var(--ease-out)' }} />
              ))}
            </div>
          </div>
          <div key={`move-${i}`} className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150 }}>
            <h3 className="t-display" style={{ fontSize: 34 }}>{ex.name}</h3>
            {ex.reps && <span className="t-headline c-accent t-num">{ex.reps}</span>}
            {ex.cue && <p className="t-body c-2">{ex.cue}</p>}
          </div>
          {secs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <HoldTimer key={`timer-${i}`} seconds={secs} />
              {/each|per side|each leg|each arm/i.test(ex.reps) && <p className="t-footnote c-2" style={{ fontWeight: 400 }}>Timer is for one side. Reset it for the other.</p>}
            </div>
          ) : null}
          {!last && exercises[i + 1] && (
            <p className="t-footnote c-2" style={{ fontWeight: 400 }}>Next: {exercises[i + 1].name}</p>
          )}
        </div>
      )}
    </Sheet>
  )
}

// A routine as a card: title, meta line, the exercises, a follow-along player, and an optional save button.
export function RoutineCard({ exercises, title, duration, source, onSave, saved, style }) {
  const [playing, setPlaying] = useState(false)
  const meta = [duration, source].filter(Boolean).join(' · ')
  const canPlay = exercises?.length > 1
  return (
    <Card style={{ padding: '20px 20px 16px', ...style }}>
      {title && (
        <div style={{ marginBottom: 6 }}>
          <h3 className="t-title2">{title}</h3>
          {meta && <p className="t-subhead c-2" style={{ marginTop: 4 }}>{meta}</p>}
        </div>
      )}
      <ExerciseList exercises={exercises} />
      {(canPlay || onSave) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {canPlay && <Button size="md" full icon="play" onClick={() => setPlaying(true)}>Follow along</Button>}
          {onSave && (
            <Button variant="secondary" size="md" full icon={saved ? 'check' : 'plus'}
              onClick={saved ? undefined : onSave} aria-disabled={saved}>
              {saved ? 'Saved to your rotation' : 'Save to rotation'}
            </Button>
          )}
        </div>
      )}
      {canPlay && <RoutinePlayer open={playing} onClose={() => setPlaying(false)} exercises={exercises} title={title} />}
    </Card>
  )
}
