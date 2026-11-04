'use client'
// One way to show a routine everywhere: Move, Home's Quick Relief, Rotation.
import { Button, Card } from './index'

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

// A routine as a card: title, meta line, the exercises, and an optional save button.
export function RoutineCard({ exercises, title, duration, source, onSave, saved, style }) {
  const meta = [duration, source].filter(Boolean).join(' · ')
  return (
    <Card style={{ padding: '20px 20px 16px', ...style }}>
      {title && (
        <div style={{ marginBottom: 6 }}>
          <h3 className="t-title2">{title}</h3>
          {meta && <p className="t-subhead c-2" style={{ marginTop: 4 }}>{meta}</p>}
        </div>
      )}
      <ExerciseList exercises={exercises} />
      {onSave && (
        <Button variant={saved ? 'secondary' : 'primary'} size="md" full icon={saved ? 'check' : 'plus'}
          onClick={saved ? undefined : onSave} aria-disabled={saved} style={{ marginTop: 8 }}>
          {saved ? 'Saved to your rotation' : 'Save to rotation'}
        </Button>
      )}
    </Card>
  )
}
