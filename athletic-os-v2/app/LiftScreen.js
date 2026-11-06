'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { EXERCISE_LIBRARY, EXERCISE_GROUPS } from './exercises'
import { getPrograms, saveProgram, deleteProgram, getSessions, saveSession } from './db'
import { PostLiftRecovery, SPORT_LIBRARY, getWarmupType } from './MoveScreen'
import { Button, IconButton, Card, Chip, ChipRow, Section, Row, Field, TextInput, Skeleton, Disclosure, ScreenHeader, NumberStepper, Icon, HaleMark } from './ui'
import { Sheet, ConfirmSheet } from './ui/Sheet'
import { ExerciseList } from './ui/Routine'

function buildNutritionNudge(profile, workoutType) {
  if (!profile?.goal) return ''
  const isMuscle = profile.goal?.toLowerCase().includes('muscle')
  const isFat = profile.goal?.toLowerCase().includes('fat')
  const isLower = /lower|leg|squat|deadlift|hip|glute/i.test(workoutType||'')
  const isUpper = /upper|push|pull|press|chest|back|shoulder/i.test(workoutType||'')
  if (isMuscle) {
    if (isLower) return 'Heavy lower body session. Make your next meal high in carbs and protein to refill glycogen and drive repair.'
    if (isUpper) return 'Upper body session done. Aim for 40 to 50 g of protein in your next meal.'
    return 'Prioritize protein and carbs in your next meal to support growth and recovery.'
  }
  if (isFat) return 'Good session. Keep your next meal high in protein and moderate in carbs to hold on to muscle.'
  return 'Fuel recovery with a protein-rich meal in the next hour or two.'
}

function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16) }) }

// Accessory and athletic moves left out of workout previews so the main lifts read clearly
const ATHLETIC_ADDONS = ['Nordic Hamstring Curl Negatives','Reverse Nordics','Pistol Box Squat',
  'Turkish Half Get Up','Med Ball Rotational Slam','Med Ball Glute Bridge',
  'Lateral Bounds','Box Jumps','Reverse Plank to Leg Lifts',
  'S/L Hip Flexor Up & Overs','S/L Plate Hops']

const toInt = (v, d) => typeof v === 'number' ? v : (parseInt(v, 10) || d)
const pad = { padding:'0 var(--edge)' }
const stack = (gap) => ({ display:'flex', flexDirection:'column', gap })

// ─── Small shared pieces ──────────────────────────────────────────────────────
function EmptyState({ icon = 'lift', title, body, children }) {
  return (
    <div style={{ textAlign:'center', padding:'40px 16px', ...stack(10), alignItems:'center' }}>
      <span style={{ width:56, height:56, borderRadius:28, background:'var(--c-muted)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-accent-text)' }}>
        <Icon name={icon} size={26} />
      </span>
      <h2 className="t-headline">{title}</h2>
      {body && <p className="t-subhead c-2" style={{ maxWidth:300 }}>{body}</p>}
      {children}
    </div>
  )
}

function SetChips({ sets }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
      {(sets || []).filter(Boolean).map((s, i) => (
        <span key={i} className="t-footnote t-num" style={{ height:28, padding:'0 10px', borderRadius:14, background:'var(--c-muted)', display:'inline-flex', alignItems:'center' }}>
          {s.weight} × {s.reps}
        </span>
      ))}
    </div>
  )
}

// trend comes from getBandTrend: '↑' up, '→' holding, '—' not enough data
function TrendBadge({ trend, diff }) {
  if (trend === '↑') return (
    <span className="t-footnote t-num" style={{ display:'inline-flex', alignItems:'center', gap:4, color:'var(--c-done)', fontWeight:600, flexShrink:0 }}>
      <Icon name="trendUp" size={16} strokeWidth={2} />{diff > 0 ? `+${diff} lb` : 'Up'}
    </span>
  )
  if (trend === '→') return <span className="t-footnote c-3" style={{ flexShrink:0 }}>Holding</span>
  return null
}

function ExerciseTable({ exercises }) {
  const all = exercises || []
  const labels = supersetLabels(all)
  const main = all.map((ex, i) => ({ ex, tag: labels[i] })).filter(({ ex }) => !ATHLETIC_ADDONS.includes(ex.name))
  const extra = all.length - main.length
  return (
    <div style={stack(0)}>
      {main.map(({ ex, tag }, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'10px 0', borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
          <span className="t-subhead">{tag && <span className="t-num" style={{ color:'var(--c-accent-text)', fontWeight:600, marginRight:6 }}>{tag}</span>}{ex.name}</span>
          <span className="t-subhead c-2 t-num" style={{ flexShrink:0 }}>{ex.sets || 3} × {ex.targetReps || 8}{ex.targetWeight ? ` @ ${ex.targetWeight}` : ''}</span>
        </div>
      ))}
      {extra > 0 && <div className="t-footnote c-2" style={{ fontWeight:400, paddingTop:8 }}>Plus {extra} athletic add-on{extra !== 1 ? 's' : ''}</div>}
    </div>
  )
}

const rowBtn = { width:'100%', minHeight:56, display:'flex', alignItems:'center', gap:12, padding:'10px 0', border:'none', background:'none', textAlign:'left', color:'var(--c-text)' }


function useStopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const frameRef = useRef(null)
  useEffect(() => {
    // Only set start time once, never reset it
    if (!startRef.current) startRef.current = Date.now()
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [])
  const fmt = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }
  return { elapsed, formatted: fmt(elapsed) }
}

// ─── AI helper ────────────────────────────────────────────────────────────────
async function callAI(prompt, timeoutMs = 25000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.text || ''
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ─── Exercise picker ──────────────────────────────────────────────────────────

// ─── Exercise picker (sheet) ──────────────────────────────────────────────────
function ExercisePicker({ open, title = 'Add exercise', onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [customName, setCustomName] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = EXERCISE_LIBRARY.filter(e => (group === 'All' || e.group === group) && (!q || e.name.toLowerCase().includes(q)))
  const pick = (e) => { onSelect(e); setSearch(''); setCustomName('') }
  const custom = (customName || search).trim()
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div style={{ position:'sticky', top:0, zIndex:1, background:'var(--c-bg)', paddingBottom:12, ...stack(10) }}>
        <TextInput value={search} onChange={setSearch} placeholder="Search exercises" aria-label="Search exercises" type="search" />
        <div style={{ display:'flex', gap:8, overflowX:'auto', margin:'0 calc(-1 * var(--edge))', padding:'0 var(--edge) 2px', scrollbarWidth:'none' }}>
          {EXERCISE_GROUPS.map(g => <Chip key={g} small selected={group === g} onClick={() => setGroup(g)} style={{ flexShrink:0 }}>{g}</Chip>)}
        </div>
      </div>
      <ul style={{ listStyle:'none' }}>
        {filtered.map((e, i) => (
          <li key={e.id} style={{ borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
            <button onClick={() => pick(e)} style={rowBtn}>
              <span style={{ flex:1, minWidth:0, ...stack(2) }}>
                <span className="t-callout">{e.name}</span>
                <span className="t-footnote c-2" style={{ fontWeight:400 }}>{e.group}</span>
              </span>
              <Icon name="plus" size={20} style={{ color:'var(--c-accent-text)' }} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="t-subhead c-2" style={{ padding:'12px 0' }}>Nothing matches. Add it as your own below.</li>}
      </ul>
      <form onSubmit={e => { e.preventDefault(); if (custom) pick({ id:uid(), name:custom, group:'Custom' }) }}
        style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--c-line)', ...stack(8) }}>
        <label className="t-footnote c-2" style={{ fontWeight:600 }} htmlFor="custom-ex">Not in the list?</label>
        <div style={{ display:'flex', gap:8 }}>
          <TextInput id="custom-ex" value={customName} onChange={setCustomName} placeholder={search || 'Exercise name'} style={{ flex:1 }} />
          <Button type="submit" variant="secondary" disabled={!custom}>Add</Button>
        </div>
      </form>
    </Sheet>
  )
}

// ─── Session complete: a full-screen moment ───────────────────────────────────
function SessionComplete({ stats, profile, onDone, onGoEat, saveState = 'saved', onRetrySave, dark }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(true)
  const [showTargets, setShowTargets] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  // Keep the page behind still while this screen is up
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    try { navigator.vibrate?.([14, 70, 22]) } catch {}
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const prText = stats.prs.length ? `PRs hit: ${stats.prs.map(p => p.name + ': ' + p.weight + 'lb' + (p.firstEver ? ' (first ever)' : '')).join(', ')}. ` : ''
    const prompt = `You are an encouraging coach giving a brief post-workout summary. Keep it warm, real, and concise, like a friend who also trains.

Session: ${stats.workoutName}
Duration: ${stats.duration}
Total volume: ${stats.volume.toLocaleString()} lbs
Exercises: ${stats.exerciseNames.join(', ')}
${prText}

Give 2-3 sentences max. Mention any PRs. Note one small win. No fluff, no exclamation marks, no em dashes. Be real.`
    let cancelled = false
    callAI(prompt)
      .then(text => { if (!cancelled) { setAnalysis(text); setLoading(false) } })
      .catch(() => { if (!cancelled) { setAnalysis('Solid session. Logged and in the books, and every one of these adds up.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const nutritionNudge = buildNutritionNudge(profile, stats.workoutName)
  const hasPR = stats.prs.length > 0
  const done = () => saveState === 'error' ? setConfirmLeave(true) : onDone()

  // Portal to body: a transformed ancestor (screen-enter) would otherwise trap this fixed layer under the tab bar
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className={dark ? 'screen-enter theme-gym' : 'screen-enter'} role="dialog" aria-modal="true" aria-label="Session complete"
      style={{ position:'fixed', inset:0, zIndex:550, background:'var(--c-bg)', color:'var(--c-text)', overflowY:'auto', overscrollBehavior:'contain' }}>
      <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', minHeight:'100%', padding:'calc(env(safe-area-inset-top) + 56px) var(--edge) 0', ...stack(24) }}>
        <div>
          <HaleMark size={40} />
          <h1 className="t-display" style={{ fontSize:44, marginTop:20 }}>You showed up.</h1>
          <p className="t-body c-2" style={{ marginTop:8 }}>{stats.workoutName} · {stats.duration}</p>
        </div>

        {saveState === 'error' ? (
          <Card flat style={{ background:'var(--c-danger-soft)', ...stack(10) }} role="alert">
            <h2 className="t-headline" style={{ color:'var(--c-danger)' }}>This session didn't save</h2>
            <p className="t-subhead c-2">Your numbers are still here. Try again before you leave this screen.</p>
            <Button size="md" onClick={onRetrySave} style={{ alignSelf:'flex-start' }}>Try saving again</Button>
          </Card>
        ) : (
          <div className="t-subhead" role="status" style={{ display:'flex', alignItems:'center', gap:8, color: saveState === 'saved' ? 'var(--c-done)' : 'var(--c-text-2)', marginTop:-12 }}>
            {saveState === 'saved' ? <><Icon name="check" size={18} strokeWidth={2.2} />Saved to your history</> : 'Saving your session'}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:12 }}>
          <Card style={{ padding:'18px 16px' }}>
            <div className="t-display t-num" style={{ fontSize:44 }}>{stats.totalSets}</div>
            <div className="t-footnote c-2" style={{ fontWeight:400, marginTop:4 }}>{stats.totalSets === 1 ? 'set' : 'sets'} logged</div>
          </Card>
          <Card style={{ padding:'18px 16px' }}>
            <div className="t-display t-num" style={{ fontSize:44 }}>{stats.volume >= 10000 ? `${Math.round(stats.volume / 1000)}k` : stats.volume.toLocaleString()}</div>
            <div className="t-footnote c-2" style={{ fontWeight:400, marginTop:4 }}>pounds moved</div>
          </Card>
        </div>

        {hasPR && (
          <Card tone="inverse" style={stack(12)}>
            <div className="t-footnote" style={{ color:'var(--c-accent)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {stats.prs.length > 1 ? `${stats.prs.length} personal bests` : 'Personal best'}
            </div>
            {stats.prs.map((pr, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}>
                <span className="t-callout" style={{ color:'#F2EDE4' }}>{pr.name}</span>
                <span className="t-title2 t-num" style={{ color:'#F2EDE4', flexShrink:0 }}>{pr.weight} lb</span>
              </div>
            ))}
            {stats.prs.some(p => p.firstEver) && <p className="t-subhead" style={{ color:'#B8B3A9' }}>First time logging some of these. That's your starting line.</p>}
          </Card>
        )}

        <Section title="Coach's note">
          <Card>{loading ? <Skeleton lines={3} label="Writing your summary" /> : <p className="t-body">{analysis}</p>}</Card>
        </Section>

        {stats.nextTargets?.length > 0 && (
          <Card style={{ padding:'4px 20px' }}>
            <Disclosure open={showTargets} onToggle={() => setShowTargets(v => !v)}>
              <span className="t-callout" style={{ fontWeight:600 }}>Next time</span>
              <span className="t-footnote c-2" style={{ display:'block', fontWeight:400 }}>What to aim for on each lift</span>
            </Disclosure>
            {showTargets && (
              <div style={{ paddingBottom:12 }}>
                {stats.nextTargets.map((t, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'10px 0', borderTop:'1px solid var(--c-line)' }}>
                    <span className="t-subhead">{t.name}</span>
                    <span className="t-subhead t-num" style={{ flexShrink:0, color: t.next > t.current ? 'var(--c-done)' : 'var(--c-text-2)', fontWeight: t.next > t.current ? 600 : 400 }}>
                      {t.next > t.current ? `Try ${t.next} lb` : 'Same weight, all reps'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {nutritionNudge && (
          <Card style={stack(12)}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <span style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--c-muted)', color:'var(--c-accent-text)' }}><Icon name="eat" size={22} /></span>
              <div style={stack(4)}>
                <h2 className="t-headline">Refuel</h2>
                <p className="t-subhead c-2">{nutritionNudge}</p>
              </div>
            </div>
            {onGoEat && <Button variant="secondary" size="md" iconAfter="arrowRight" onClick={onGoEat} style={{ alignSelf:'flex-start' }}>Get a meal idea</Button>}
          </Card>
        )}

        <PostLiftRecovery workoutName={stats.workoutName} exercises={stats.exerciseNames.map(n => ({ name:n }))} onSave={() => {}} />

        <div style={{ position:'sticky', bottom:0, padding:'16px 0 calc(24px + env(safe-area-inset-bottom))', background:'linear-gradient(to top, var(--c-bg) 70%, transparent)' }}>
          <Button full onClick={done}>Done</Button>
        </div>
      </div>

      <ConfirmSheet open={confirmLeave} title="Leave without saving?"
        message="This session still hasn't saved. If you leave now, the numbers you logged are lost."
        confirmLabel="Leave anyway" cancelLabel="Stay and retry" destructive
        onConfirm={() => { setConfirmLeave(false); onDone() }} onCancel={() => setConfirmLeave(false)} />
    </div>
  , document.body)
}

// ─── Program builder: program › phase › workout › exercise ───────────────────
function ExerciseEditor({ exercise, onChange, onRemove }) {
  const sets = toInt(exercise.sets, 3)
  const reps = toInt(exercise.targetReps, 8)
  return (
    <Card style={{ padding:'16px 16px 18px', ...stack(16) }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="t-headline">{exercise.name}</div>
          <div className="t-footnote c-2" style={{ fontWeight:400 }}>{exercise.group}</div>
        </div>
        <IconButton icon="trash" size={20} label={`Remove ${exercise.name}`} onClick={onRemove} style={{ margin:'-10px -10px 0 0' }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:12 }}>
        <Field label="Sets"><NumberStepper label="Sets" value={sets} min={1} max={10} onChange={v => onChange({ ...exercise, sets:v })} /></Field>
        <Field label="Target reps"><NumberStepper label="Target reps" value={reps} min={1} max={100} onChange={v => onChange({ ...exercise, targetReps:v })} /></Field>
      </div>
      <Field label="Target weight (optional)" htmlFor={`tw-${exercise.id}`}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TextInput id={`tw-${exercise.id}`} type="number" inputMode="decimal" value={exercise.targetWeight ?? ''} placeholder="Leave blank to use last session"
            onChange={v => onChange({ ...exercise, targetWeight: v === '' ? null : (parseFloat(v) || 0) })} style={{ flex:1 }} />
          <span className="t-subhead c-2">lb</span>
        </div>
      </Field>
      <Field label="Target RPE (optional)">
        <ChipRow>
          {[6, 7, 8, 9, 10].map(r => (
            <Chip key={r} small selected={exercise.targetRpe === r} onClick={() => onChange({ ...exercise, targetRpe: exercise.targetRpe === r ? null : r })}
              style={{ minWidth:52, justifyContent:'center' }}>{r}</Chip>
          ))}
        </ChipRow>
      </Field>
      <Field label="Coach note (optional)" htmlFor={`note-${exercise.id}`}>
        <TextInput id={`note-${exercise.id}`} value={exercise.notes || ''} onChange={v => onChange({ ...exercise, notes:v })} placeholder="Pause at the bottom, control the lowering" />
      </Field>
    </Card>
  )
}

// ─── Supersets ────────────────────────────────────────────────────────────────
// Exercises next to each other that share a supersetId are done as one superset:
// a set of each, back to back, then rest. supersetRest is the pause between them
// inside a round (30 sec unless the program says 0).
const SUPERSET_REST_DEFAULT = 30
function supersetGroup(exercises, idx) {
  const id = exercises[idx]?.supersetId
  if (!id) return [idx]
  let a = idx, b = idx
  while (a > 0 && exercises[a - 1]?.supersetId === id) a--
  while (b < exercises.length - 1 && exercises[b + 1]?.supersetId === id) b++
  return Array.from({ length: b - a + 1 }, (_, k) => a + k)
}
// Drop superset ids that no longer join two neighbours (after a remove or unlink)
function normalizeSupersets(exercises) {
  return exercises.map((ex, i) => {
    if (!ex.supersetId) return ex
    const linked = exercises[i - 1]?.supersetId === ex.supersetId || exercises[i + 1]?.supersetId === ex.supersetId
    if (linked) return ex
    const { supersetId, supersetRest, ...rest } = ex
    return rest
  })
}
// Letter labels for display: A1, A2, B1 ... (only for exercises in a superset)
function supersetLabels(exercises) {
  const out = {}; let letter = 0; let i = 0
  while (i < exercises.length) {
    const g = supersetGroup(exercises, i)
    if (g.length > 1) { const L = String.fromCharCode(65 + letter++); g.forEach((k, n) => { out[k] = `${L}${n + 1}` }) }
    i = g[g.length - 1] + 1
  }
  return out
}

function SupersetLink({ linked, rest, onLink, onUnlink, onRest }) {
  if (!linked) return (
    <div style={{ display:'flex', justifyContent:'center', margin:'-4px 0' }}>
      <Button variant="quiet" size="sm" icon="plus" onClick={onLink}>Superset with next</Button>
    </div>
  )
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'center', padding:'2px 0' }}>
      <span className="t-footnote" style={{ color:'var(--c-accent-text)', background:'var(--c-accent-soft)', borderRadius:999, padding:'6px 12px', fontWeight:600 }}>Superset</span>
      <ChipRow>
        <Chip small selected={rest !== 0} onClick={() => onRest(SUPERSET_REST_DEFAULT)}>30 sec between</Chip>
        <Chip small selected={rest === 0} onClick={() => onRest(0)}>No rest between</Chip>
      </ChipRow>
      <Button variant="quiet" size="sm" onClick={onUnlink}>Unlink</Button>
    </div>
  )
}

function WorkoutBuilder({ workout, onChange, onBack }) {
  const [showPicker, setShowPicker] = useState(false)
  const addExercise = (ex) => { onChange({ ...workout, exercises:[...workout.exercises, { id:uid(), exerciseId:ex.id, name:ex.name, group:ex.group, sets:3, targetReps:8 }] }); setShowPicker(false) }
  const updateExercise = (idx, updated) => { const e = [...workout.exercises]; e[idx] = updated; onChange({ ...workout, exercises:e }) }
  const removeExercise = (idx) => { onChange({ ...workout, exercises:normalizeSupersets(workout.exercises.filter((_, i) => i !== idx)) }) }
  const linkNext = (idx) => {
    const e = [...workout.exercises]
    const id = e[idx].supersetId || uid()
    const oldNext = e[idx + 1].supersetId
    const rest = e[idx].supersetRest ?? SUPERSET_REST_DEFAULT
    // Join the next exercise, and anything already supersetted with it
    e.forEach((x, i) => { if (i === idx || i === idx + 1 || (oldNext && x.supersetId === oldNext) || x.supersetId === id) e[i] = { ...x, supersetId:id, supersetRest:rest } })
    onChange({ ...workout, exercises:normalizeSupersets(e) })
  }
  const unlinkNext = (idx) => {
    const e = [...workout.exercises]
    const id = e[idx].supersetId; const fresh = uid()
    for (let i = idx + 1; i < e.length && e[i].supersetId === id; i++) e[i] = { ...e[i], supersetId:fresh }
    onChange({ ...workout, exercises:normalizeSupersets(e) })
  }
  const setGroupRest = (idx, secs) => {
    const g = supersetGroup(workout.exercises, idx)
    onChange({ ...workout, exercises:workout.exercises.map((x, i) => g.includes(i) ? { ...x, supersetRest:secs } : x) })
  }
  const n = workout.exercises.length
  return (
    <>
      <ScreenHeader title={workout.name || 'Workout'} subtitle={`${n} exercise${n !== 1 ? 's' : ''}`} onBack={onBack} backLabel="Back to phase" />
      <div style={{ ...pad, ...stack(24) }}>
        <Field label="Workout name" htmlFor="wb-name">
          <TextInput id="wb-name" value={workout.name} onChange={v => onChange({ ...workout, name:v })} placeholder="Push A" />
        </Field>
        <Section title="Exercises">
          <div style={stack(10)}>
            {n === 0 && <p className="t-subhead c-2">No exercises yet. Add the first one below.</p>}
            {workout.exercises.map((ex, i) => {
              const next = workout.exercises[i + 1]
              const linked = !!(next && ex.supersetId && ex.supersetId === next.supersetId)
              return (
                <div key={ex.id} style={stack(10)}>
                  <ExerciseEditor exercise={ex} onChange={u => updateExercise(i, u)} onRemove={() => removeExercise(i)} />
                  {next && <SupersetLink linked={linked} rest={ex.supersetRest ?? SUPERSET_REST_DEFAULT}
                    onLink={() => linkNext(i)} onUnlink={() => unlinkNext(i)} onRest={secs => setGroupRest(i, secs)} />}
                </div>
              )
            })}
            <Button variant="secondary" full icon="plus" onClick={() => setShowPicker(true)}>Add exercise</Button>
          </div>
        </Section>
        <Button full onClick={onBack}>Done</Button>
      </div>
      <ExercisePicker open={showPicker} onSelect={addExercise} onClose={() => setShowPicker(false)} />
    </>
  )
}

// A list row with an open action and a remove action, used by the builders
function BuilderRow({ title, subtitle, onOpen, onRemove, removeLabel }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 4px 4px 0' }}>
      <button onClick={onOpen} style={{ ...rowBtn, flex:1, minWidth:0, padding:'10px 0 10px 16px' }}>
        <span style={{ flex:1, minWidth:0, ...stack(2) }}>
          <span className="t-callout" style={{ fontWeight:600 }}>{title}</span>
          <span className="t-footnote c-2" style={{ fontWeight:400 }}>{subtitle}</span>
        </span>
        <Icon name="chevronRight" size={18} style={{ color:'var(--c-text-3)' }} />
      </button>
      <IconButton icon="trash" size={20} label={removeLabel} onClick={onRemove} />
    </div>
  )
}

function PhaseBuilder({ phase, onChange, onBack }) {
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const addWorkout = () => {
    const newW = { id:uid(), name:`Workout ${String.fromCharCode(65 + phase.workouts.length)}`, exercises:[] }
    const updated = { ...phase, workouts:[...phase.workouts, newW] }
    onChange(updated); setEditingWorkout(updated.workouts.length - 1)
  }
  const updateWorkout = (idx, updated) => { const w = [...phase.workouts]; w[idx] = updated; onChange({ ...phase, workouts:w }) }
  const removeWorkout = (idx) => { onChange({ ...phase, workouts:phase.workouts.filter((_, i) => i !== idx) }) }
  const askRemove = (idx) => phase.workouts[idx].exercises.length ? setConfirmRemove(idx) : removeWorkout(idx)
  if (editingWorkout !== null && phase.workouts[editingWorkout]) {
    return <WorkoutBuilder workout={phase.workouts[editingWorkout]} onChange={u => updateWorkout(editingWorkout, u)} onBack={() => setEditingWorkout(null)} />
  }
  const n = phase.workouts.length
  return (
    <>
      <ScreenHeader title={phase.name || 'Phase'} subtitle={`${n} workout${n !== 1 ? 's' : ''} · ${phase.weeks} weeks`} onBack={onBack} backLabel="Back to program" />
      <div style={{ ...pad, ...stack(24) }}>
        <Field label="Phase name" htmlFor="pb-name">
          <TextInput id="pb-name" value={phase.name} onChange={v => onChange({ ...phase, name:v })} placeholder="Phase 1: Build the base" />
        </Field>
        <Field label="Length">
          <NumberStepper label="Weeks" suffix="weeks" value={toInt(phase.weeks, 4)} min={1} max={52} onChange={v => onChange({ ...phase, weeks:v })} />
        </Field>
        <Section title="Workouts">
          <div style={stack(10)}>
            {n > 0 && (
              <Card style={{ padding:0 }}>
                {phase.workouts.map((w, i) => (
                  <div key={w.id} style={{ borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
                    <BuilderRow title={w.name} subtitle={`${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}`}
                      onOpen={() => setEditingWorkout(i)} onRemove={() => askRemove(i)} removeLabel={`Remove ${w.name}`} />
                  </div>
                ))}
              </Card>
            )}
            {n === 0 && <p className="t-subhead c-2">No workouts yet.</p>}
            <Button variant="secondary" full icon="plus" onClick={addWorkout}>Add workout</Button>
          </div>
        </Section>
      </div>
      <ConfirmSheet open={confirmRemove !== null} title={`Remove ${phase.workouts[confirmRemove]?.name || 'this workout'}?`}
        message="Its exercises are removed from the phase. Sessions you already logged stay in your history."
        confirmLabel="Remove workout" destructive
        onConfirm={() => { removeWorkout(confirmRemove); setConfirmRemove(null) }} onCancel={() => setConfirmRemove(null)} />
    </>
  )
}

function ProgramBuilder({ program, onSave, onBack, onDelete }) {
  const [prog, setProg] = useState(program)
  const [editingPhase, setEditingPhase] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [saving, setSaving] = useState(false)
  const addPhase = () => { setProg(p => ({ ...p, phases:[...p.phases, { id:uid(), name:`Phase ${p.phases.length + 1}`, weeks:4, workouts:[] }] })) }
  const updatePhase = (idx, updated) => { setProg(p => { const phases = [...p.phases]; phases[idx] = updated; return { ...p, phases } }) }
  const removePhase = (idx) => { setProg(p => ({ ...p, phases:p.phases.filter((_, i) => i !== idx) })); if (editingPhase === idx) setEditingPhase(null) }
  const askRemove = (idx) => prog.phases[idx].workouts.length ? setConfirmRemove(idx) : removePhase(idx)
  if (editingPhase !== null && prog.phases[editingPhase]) {
    return <PhaseBuilder phase={prog.phases[editingPhase]} onChange={u => updatePhase(editingPhase, u)} onBack={() => setEditingPhase(null)} />
  }
  const n = prog.phases.length
  const save = async () => { setSaving(true); try { await onSave(prog) } finally { setSaving(false) } }
  return (
    <>
      <ScreenHeader title={prog.name || 'New program'} subtitle={`${n} phase${n !== 1 ? 's' : ''}`} onBack={onBack} backLabel="Back" />
      <div style={{ ...pad, ...stack(24) }}>
        <Field label="Program name" htmlFor="prog-name">
          <TextInput id="prog-name" value={prog.name} onChange={v => setProg(p => ({ ...p, name:v }))} placeholder="Hypertrophy block" />
        </Field>
        <Section title="Phases">
          <div style={stack(10)}>
            {n > 0 && (
              <Card style={{ padding:0 }}>
                {prog.phases.map((ph, i) => (
                  <div key={ph.id} style={{ borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
                    <BuilderRow title={ph.name} subtitle={`${ph.weeks} weeks · ${ph.workouts.length} workout${ph.workouts.length !== 1 ? 's' : ''}`}
                      onOpen={() => setEditingPhase(i)} onRemove={() => askRemove(i)} removeLabel={`Remove ${ph.name}`} />
                  </div>
                ))}
              </Card>
            )}
            {n === 0 && <p className="t-subhead c-2">A phase is a block of weeks with its own workouts. Most programs start with one.</p>}
            <Button variant="secondary" full icon="plus" onClick={addPhase}>Add phase</Button>
          </div>
        </Section>
        <div style={stack(8)}>
          <Button full onClick={save} disabled={!prog.name.trim() || saving}>{saving ? 'Saving' : 'Save program'}</Button>
          {!prog.name.trim() && <p className="t-footnote c-2" style={{ textAlign:'center', fontWeight:400 }}>Give it a name to save it.</p>}
          {onDelete && <Button variant="quiet" full onClick={onDelete} style={{ color:'var(--c-danger)' }}>Delete program</Button>}
        </div>
      </div>
      <ConfirmSheet open={confirmRemove !== null} title={`Remove ${prog.phases[confirmRemove]?.name || 'this phase'}?`}
        message="Its workouts are removed from the program when you save. Sessions you already logged stay in your history."
        confirmLabel="Remove phase" destructive
        onConfirm={() => { removePhase(confirmRemove); setConfirmRemove(null) }} onCancel={() => setConfirmRemove(null)} />
    </>
  )
}


// ─── Inline set row ───────────────────────────────────────────────────────────
function InlineSetRow({ setNum, initial, lastSet, prevSet, isCurrent, onSave, onUndo, onRestStart, useRpe, targetReps, targetRpe, targetWeight }) {
  // Pre-fill from last session on mount, so the increment chips work immediately
  const hasTarget = targetWeight != null && targetWeight !== ''
  const defaultWeight = initial?.weight?.toString() || (hasTarget ? String(targetWeight) : '') || lastSet?.weight?.toString() || ''
  const defaultReps   = initial?.reps?.toString()   || lastSet?.reps?.toString()   || ''
  const [weight, setWeight] = useState(defaultWeight)
  const [reps,   setReps]   = useState(defaultReps)
  const [rpe,    setRpe]    = useState(initial?.rpe?.toString() || '')
  const [saved,  setSaved]  = useState(!!initial)
  const [popKey, setPopKey] = useState(0)
  const [focused, setFocused] = useState(false)

  // Empty fields fall back to what the placeholder shows (last session, or the
  // program's target reps), so logging the suggested numbers is one tap.
  const effWeight = weight || (hasTarget ? String(targetWeight) : '') || lastSet?.weight?.toString() || ''
  const effReps   = reps   || lastSet?.reps?.toString()   || (targetReps ? String(targetReps) : '')
  const canSave = !!(effWeight && effReps)

  const handleSave = () => {
    if (!canSave) return
    setWeight(effWeight); setReps(effReps)
    onSave({ weight: parseFloat(effWeight) || 0, reps: parseInt(effReps) || 0, ...(useRpe && rpe ? { rpe: parseFloat(rpe) } : {}) })
    setSaved(true); setPopKey(k => k + 1)
    try { navigator.vibrate?.(12) } catch {}
    if (onRestStart) onRestStart()
  }
  const handleUndo = () => {
    setSaved(false)
    setWeight(lastSet?.weight?.toString() || '')
    setReps(lastSet?.reps?.toString() || '')
    if (onUndo) onUndo()
  }
  const adjustWeight = (delta) => {
    const current = parseFloat(weight) || parseFloat(lastSet?.weight) || 0
    const next = Math.max(0, current + delta)
    setWeight(next % 1 === 0 ? next.toString() : next.toFixed(1))
    setSaved(false)
  }
  const copyPrev = () => {
    if (!prevSet) return
    setWeight(prevSet.weight.toString()); setReps(prevSet.reps.toString()); setSaved(false)
  }

  const active = isCurrent && !saved
  const input = {
    width:'100%', minWidth:0, height:48, borderRadius:12, textAlign:'center', outline:'none',
    fontFamily:'var(--font-text)', fontSize:20, fontWeight:600, fontVariantNumeric:'tabular-nums',
    border: saved ? '1px solid transparent' : `1px solid ${active ? 'var(--c-accent)' : 'var(--c-line-strong)'}`,
    background: saved ? 'transparent' : 'var(--c-card)',
    color: saved ? 'var(--c-text-2)' : 'var(--c-text)',
  }
  const onField = { onFocus:()=>setFocused(true), onBlur:()=>setTimeout(()=>setFocused(false), 150), onKeyDown:e=>{ if (e.key === 'Enter') handleSave() } }
  const cols = `28px minmax(0,1fr) minmax(0,1fr) ${useRpe ? '56px ' : ''}48px`
  const showChips = !saved && (active || focused)

  return (
    <div style={{ padding: active ? '8px 6px' : '2px 6px', margin:'0 -6px', borderRadius:16, background: active ? 'var(--c-muted)' : 'transparent', transition:'background-color var(--t-base) var(--ease-out)' }}>
      <div style={{ display:'grid', gridTemplateColumns:cols, gap:8, alignItems:'center' }}>
        <div className="t-num" style={{ textAlign:'center', fontSize:15, fontWeight: active ? 700 : 500, color: active ? 'var(--c-text)' : 'var(--c-text-3)' }}>{setNum}</div>
        <input type="number" inputMode="decimal" value={weight} aria-label={`Set ${setNum} weight, pounds`} {...onField}
          onChange={e => { setWeight(e.target.value); setSaved(false) }}
          placeholder={lastSet?.weight?.toString() || '–'} style={input} />
        <input type="number" inputMode="numeric" value={reps} aria-label={`Set ${setNum} reps`} {...onField}
          onChange={e => { setReps(e.target.value); setSaved(false) }}
          placeholder={lastSet?.reps?.toString() || (targetReps ? String(targetReps) : '–')} style={input} />
        {useRpe && (
          <input type="number" inputMode="decimal" value={rpe} aria-label={`Set ${setNum} RPE`} {...onField}
            onChange={e => { setRpe(e.target.value); setSaved(false) }}
            placeholder={targetRpe ? String(targetRpe) : 'RPE'} style={{ ...input, fontSize:16 }} />
        )}
        <button key={popKey} className={saved && popKey ? 'pop' : undefined} onClick={saved ? handleUndo : handleSave}
          aria-label={saved ? `Set ${setNum} logged. Undo` : `Log set ${setNum}`} disabled={!saved && !canSave}
          style={{
            width:48, height:48, borderRadius:24, border:'none', padding:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: saved ? 'var(--c-accent-soft)' : canSave ? 'var(--c-accent)' : 'var(--c-muted-2)',
            color: saved ? 'var(--c-accent-text)' : canSave ? '#1A1A1E' : 'var(--c-text-3)',
            boxShadow: !saved && canSave && active ? '0 6px 16px rgba(200,146,42,0.35)' : 'none',
          }}>
          <Icon name="check" size={20} strokeWidth={2.4} />
        </button>
      </div>
      {showChips && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'8px 0 0 36px' }}>
          {[2.5, 5, 10].map(d => <Chip key={d} small onClick={() => adjustWeight(d)} style={{ height:32, padding:'0 12px' }}>+{d}</Chip>)}
          {prevSet && <Chip small onClick={copyPrev} style={{ height:32, padding:'0 12px' }}>Same as last set</Chip>}
        </div>
      )}
    </div>
  )
}

// ─── Warmup, inside the session ───────────────────────────────────────────────
// Same curated routines as the Home warmup flow: instant, no AI call.
function WarmupSuggestion({ workout }) {
  const [open, setOpen] = useState(false)
  const warmupType = getWarmupType(workout.name)
  const routine = SPORT_LIBRARY.Lifting[`${warmupType}_warmup`] || SPORT_LIBRARY.Lifting.lower_warmup
  return (
    <Card flat tone="muted" style={{ padding:'4px 16px' }}>
      <Disclosure open={open} onToggle={() => setOpen(v => !v)}>
        <span className="t-callout" style={{ fontWeight:600 }}>Warmup</span>
        <span className="t-footnote c-2" style={{ display:'block', fontWeight:400 }}>{routine.title} · {routine.duration}</span>
      </Disclosure>
      {open && <div style={{ paddingBottom:8 }}><ExerciseList exercises={routine.exercises} /></div>}
    </Card>
  )
}

// ─── Rest timer: a floating pill above the tab bar ────────────────────────────
const REST_TARGET = 90
function RestTimer({ onDismiss }) {
  const [seconds, setSeconds] = useState(0)
  const startRef = useRef(Date.now())
  useEffect(() => {
    document.body.classList.add('hale-resting')
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 250)
    return () => { clearInterval(id); document.body.classList.remove('hale-resting') }
  }, [])
  useEffect(() => { if (seconds === REST_TARGET) { try { navigator.vibrate?.([10, 80, 10]) } catch {} } }, [seconds])
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const ready = seconds >= REST_TARGET
  const C = 2 * Math.PI * 11.5
  return (
    <div role="timer" aria-label={`Resting, ${fmt(seconds)}`} style={{
      position:'fixed', zIndex:400, left:'50%', transform:'translateX(-50%)',
      bottom:'calc(var(--tabbar-h) + 24px + env(safe-area-inset-bottom))',
      width:'calc(min(100vw, var(--app-max)) - 32px)', height:64, borderRadius:32,
      padding:'0 8px 0 20px', display:'flex', alignItems:'center', gap:14,
      background:'rgba(26,26,30,0.92)', color:'#F2EDE4',
      WebkitBackdropFilter:'blur(20px)', backdropFilter:'blur(20px)',
      boxShadow:'0 16px 40px rgba(26,26,30,0.28)',
      animation:'hale-rise var(--t-base) var(--ease-out) both',
    }}>
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="11.5" fill="none" stroke="#3A3A41" strokeWidth="3" />
        <circle cx="14" cy="14" r="11.5" fill="none" stroke="#C8922A" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, seconds / REST_TARGET))} transform="rotate(-90 14 14)"
          style={{ transition:'stroke-dashoffset .25s linear' }} />
      </svg>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="t-caption" style={{ color:'#A8A49B' }}>{ready ? 'Ready when you are' : 'Resting'}</div>
        <div className="t-num" style={{ fontSize:20, fontWeight:600, lineHeight:1.2 }}>{fmt(seconds)}</div>
      </div>
      <button onClick={onDismiss} style={{ height:48, padding:'0 20px', borderRadius:24, border:'none', fontSize:15, fontWeight:600, background: ready ? '#C8922A' : '#F2EDE4', color:'#1A1A1E' }}>
        Ready
      </button>
    </div>
  )
}

// ─── Gym mode: one set at a time, dark, full screen ───────────────────────────
// Shares all session state with SessionLogger; this is only a different view of it.
const VIEW_KEY = 'hale_session_view'
function readSessionView() { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'gym' } catch { return 'gym' } }
function writeSessionView(v) { try { localStorage.setItem(VIEW_KEY, v) } catch {} }

const restFor = (ex) => toInt(ex?.targetReps, 8) <= 5 ? 150 : 90   // heavier sets get longer rest
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
const fmtNum = (n) => (n % 1 === 0 ? String(n) : n.toFixed(1))
const buzz = (p) => { try { navigator.vibrate?.(p) } catch {} }

// Keep the phone awake while lifting, where the browser allows it
function useWakeLock(on) {
  useEffect(() => {
    if (!on || typeof navigator === 'undefined' || !navigator.wakeLock) return
    let lock = null, cancelled = false
    const get = () => navigator.wakeLock.request('screen').then(l => { if (cancelled) l.release(); else lock = l }).catch(() => {})
    get()
    const onVis = () => { if (document.visibilityState === 'visible') get() }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); lock?.release?.().catch?.(() => {}) }
  }, [on])
}

function BigStepper({ label, value, onChange, step, unit, hint, inputMode = 'decimal' }) {
  const n = parseFloat(value)
  const bump = (d) => { const next = Math.max(0, (isNaN(n) ? 0 : n) + d); onChange(fmtNum(next)); buzz(6) }
  const btn = { width:56, height:56, borderRadius:28, border:'none', background:'var(--c-muted-2)', color:'var(--c-text)', display:'grid', placeItems:'center', flexShrink:0 }
  return (
    <div style={{ ...stack(6), alignItems:'center', flex:1, minWidth:0 }}>
      <span className="t-footnote" style={{ color:'var(--c-text-2)' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6, width:'100%', justifyContent:'center' }}>
        <button className="pressable" aria-label={`Less ${label.toLowerCase()}`} onClick={() => bump(-step)} style={btn}><Icon name="minus" size={22} strokeWidth={2.2} /></button>
        <input type="number" inputMode={inputMode} value={value} onChange={e => onChange(e.target.value)} aria-label={label} placeholder="0"
          onFocus={e => e.target.select()}
          style={{ width:'100%', minWidth:0, background:'transparent', border:'none', outline:'none', textAlign:'center', color: hint ? 'var(--c-text-2)' : 'var(--c-text)',
            fontFamily:'var(--font-display)', fontWeight:300, fontSize:52, lineHeight:1, fontVariantNumeric:'tabular-nums', padding:0 }} />
        <button className="pressable" aria-label={`More ${label.toLowerCase()}`} onClick={() => bump(step)} style={btn}><Icon name="plus" size={22} strokeWidth={2.2} /></button>
      </div>
      <span className="t-caption" style={{ color: hint ? 'var(--c-accent-text)' : 'var(--c-text-3)' }}>{unit}{hint ? ` · ${hint}` : ''}</span>
    </div>
  )
}

function RestRing({ total, left }) {
  const R = 108, C = 2 * Math.PI * R
  const pct = total ? Math.max(0, left) / total : 0
  const done = left <= 0
  return (
    <div style={{ position:'relative', width:240, height:240 }} role="timer" aria-label={done ? 'Rest done' : `Rest, ${fmtClock(left)} left`}>
      <svg width="240" height="240" viewBox="0 0 240 240" aria-hidden="true" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="120" cy="120" r={R} fill="none" stroke="var(--c-muted-2)" strokeWidth="8" />
        <circle cx="120" cy="120" r={R} fill="none" stroke={done ? 'var(--c-done)' : 'var(--c-accent)'} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition:'stroke-dashoffset 250ms linear, stroke 300ms' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
        <span className="t-num" style={{ fontFamily:'var(--font-display)', fontWeight:200, fontSize:64, lineHeight:1 }}>{done ? 'Go' : fmtClock(left)}</span>
        <span className="t-footnote" style={{ color:'var(--c-text-2)' }}>{done ? 'Rest is up' : 'Rest'}</span>
      </div>
    </div>
  )
}

function GymView({ workout, liveExercises, loggedSets, getLastSession, onLog, onUndo, rpeFor, formatted,
  onExit, onList, onFinish, onSwap, onAdd, onRemove }) {
  const firstOpen = () => {
    const i = liveExercises.findIndex((ex, k) => (loggedSets[k]?.sets.filter(Boolean).length || 0) < (ex.sets || 3))
    return i < 0 ? Math.max(0, liveExercises.length - 1) : i
  }
  const [exIdx, setExIdx] = useState(firstOpen)
  const [editing, setEditing] = useState(null)       // a logged set reopened for a fix
  const [rest, setRest] = useState(null)             // { total, endsAt, logged:{...}, pr }
  const [now, setNow] = useState(Date.now())
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState(null)
  const [wHint, setWHint] = useState(null)        // where the suggested weight came from
  const [rHint, setRHint] = useState(null)
  const [flash, setFlash] = useState(null)        // "Set 1 logged" when a superset moves on with no rest
  const [listOpen, setListOpen] = useState(false)
  const restDoneBuzzed = useRef(false)

  useWakeLock(true)
  useEffect(() => {
    // Dark for everything while this is up, sheets and confirms included (they portal to body)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('theme-gym')
    return () => { document.body.style.overflow = prev; document.body.classList.remove('theme-gym') }
  }, [])

  const safeIdx = Math.min(exIdx, Math.max(0, liveExercises.length - 1))
  const ex = liveExercises[safeIdx]
  const logged = loggedSets[safeIdx]?.sets || []
  const targetSets = ex?.sets || 3
  const doneHere = logged.filter(Boolean).length
  const openSet = (() => { for (let i = 0; i < targetSets; i++) if (!logged[i]) return i; return null })()
  const setIdx = editing ?? openSet
  const lastSess = ex ? getLastSession(ex.exerciseId || ex.id, ex.name) : null
  const rpeOn = ex ? rpeFor(ex) : false
  const allDone = liveExercises.every((e, k) => (loggedSets[k]?.sets.filter(Boolean).length || 0) >= (e.sets || 3))
  const exDone = (k) => (loggedSets[k]?.sets.filter(Boolean).length || 0) >= (liveExercises[k]?.sets || 3)

  // Prefill every set so logging the plan is one tap. Weight: what you logged, else your
  // last set today, else the program's target, else the same set last session.
  // Anything we suggest is marked under the number until you change it.
  useEffect(() => {
    if (!ex || setIdx === null) return
    const own = logged[setIdx]
    const prevToday = setIdx > 0 ? logged[setIdx - 1] : null
    const last = lastSess?.sets?.[setIdx] || lastSess?.sets?.filter(Boolean).slice(-1)[0]
    const target = ex.targetWeight != null && ex.targetWeight !== '' ? Number(ex.targetWeight) : null
    let w = '', wh = null
    if (own) { w = fmtNum(own.weight || 0) }
    else if (prevToday) { w = fmtNum(prevToday.weight || 0); wh = 'same as last set' }
    else if (target != null) { w = fmtNum(target); wh = 'target' }
    else if (last?.weight != null) { w = fmtNum(last.weight); wh = 'last session' }
    let r = '', rh = null
    if (own) { r = String(own.reps) }
    else if (prevToday) { r = String(prevToday.reps); rh = 'same as last set' }
    else { r = String(toInt(ex.targetReps, 8)); rh = 'target' }
    setWeight(w); setWHint(wh); setReps(r); setRHint(rh)
    setRpe(own?.rpe ?? null)
  }, [safeIdx, setIdx, ex?.id])
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1800); return () => clearTimeout(t) }, [flash])

  // Superset this exercise belongs to (just [safeIdx] if none)
  const group = supersetGroup(liveExercises, safeIdx)
  const inSuperset = group.length > 1
  const labels = supersetLabels(liveExercises)

  // Rest clock
  useEffect(() => {
    if (!rest) return
    restDoneBuzzed.current = false
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [rest?.endsAt])
  const restLeft = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0
  useEffect(() => {
    if (rest && restLeft <= 0 && !restDoneBuzzed.current) { restDoneBuzzed.current = true; buzz([30, 80, 30]) }
  }, [restLeft, rest])

  const advanceAfterRest = () => {
    const nextIdx = rest?.nextIdx
    setRest(null)
    if (nextIdx != null && nextIdx >= 0) setExIdx(nextIdx)
  }

  const canLog = setIdx !== null && (weight === '' || parseFloat(weight) >= 0) && parseInt(reps) > 0   // empty weight = bodyweight
  const log = () => {
    if (!canLog) return
    const data = { weight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, ...(rpeOn && rpe ? { rpe } : {}) }
    const bestBefore = Math.max(0, ...(lastSess?.sets || []).filter(Boolean).map(s => s.weight || 0), ...logged.filter((s, i) => s && i !== setIdx).map(s => s.weight || 0))
    const pr = !!lastSess && data.weight > bestBefore
    const wasEdit = editing !== null
    onLog(safeIdx, setIdx, data)
    setEditing(null)
    if (wasEdit) { buzz(10); return }   // fixing a set doesn't restart rest
    buzz(pr ? [18, 60, 18, 60, 40] : 16)
    // Counts as they'll be once this set lands
    const count = (k) => (loggedSets[k]?.sets.filter(Boolean).length || 0) + (k === safeIdx && !logged[setIdx] ? 1 : 0)
    const need = (k) => count(k) < (liveExercises[k]?.sets || 3)
    if (!liveExercises.some((e, k) => need(k))) { setRest(null); return }

    let nextIdx, total, between = false
    const pending = group.filter(need)
    if (inSuperset && pending.length) {
      // Next exercise in this round, or back to the top for the next round
      const after = pending.find(k => k > safeIdx)
      between = after != null
      nextIdx = between ? after : pending[0]
      total = between ? (ex.supersetRest ?? SUPERSET_REST_DEFAULT) : 90
    } else {
      const stay = !inSuperset && need(safeIdx)
      const lastOfGroup = group[group.length - 1]
      const later = liveExercises.findIndex((e, k) => k > lastOfGroup && need(k))
      nextIdx = stay ? safeIdx : later >= 0 ? later : liveExercises.findIndex((e, k) => need(k))
      total = inSuperset ? 90 : restFor(ex)
    }
    const loggedInfo = { ...data, setNum: setIdx + 1, name: ex.name }
    if (total <= 0) {   // superset with no rest between: straight to the next exercise
      setRest(null); setExIdx(nextIdx); setFlash(pr ? `New best: ${ex.name}` : `Set ${setIdx + 1} logged · ${ex.name}`)
      return
    }
    setNow(Date.now())
    setRest({ total, endsAt: Date.now() + total * 1000, logged: loggedInfo, pr, nextIdx, between })
  }

  // What comes after this rest
  const upNext = (() => {
    if (!rest || rest.nextIdx == null || rest.nextIdx < 0) return null
    const n = liveExercises[rest.nextIdx]; if (!n) return null
    const c = loggedSets[rest.nextIdx]?.sets.filter(Boolean).length || 0
    const tag = labels[rest.nextIdx] ? `${labels[rest.nextIdx]} · ` : ''
    return { name: n.name, label: `${rest.between ? 'Superset · ' : ''}${tag}Set ${c + 1} of ${n.sets || 3}` }
  })()

  const go = (d) => { setEditing(null); setRest(null); setExIdx(i => Math.min(liveExercises.length - 1, Math.max(0, i + d))) }
  const topBtn = { width:44, height:44, borderRadius:22, border:'none', background:'var(--c-muted)', color:'var(--c-text)', display:'grid', placeItems:'center' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="theme-gym" role="dialog" aria-modal="true" aria-label={`${workout.name}, gym mode`}
      style={{ position:'fixed', inset:0, zIndex:500, background:'var(--c-bg)', color:'var(--c-text)', overflowY:'auto', overscrollBehavior:'contain' }}>
      <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', minHeight:'100%', display:'flex', flexDirection:'column',
        padding:'calc(env(safe-area-inset-top) + 12px) var(--edge) calc(env(safe-area-inset-bottom) + 20px)' }}>

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="pressable" aria-label="Leave session" onClick={onExit} style={topBtn}><Icon name="close" size={20} /></button>
          <button onClick={() => setListOpen(true)} aria-haspopup="dialog"
            style={{ flex:1, minWidth:0, border:'none', background:'none', color:'var(--c-text)', display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'4px 0' }}>
            <span className="t-num t-callout" style={{ fontWeight:600 }}>{formatted}</span>
            <span className="t-footnote" style={{ color:'var(--c-text-2)', display:'inline-flex', alignItems:'center', gap:4 }}>
              Exercise {safeIdx + 1} of {liveExercises.length}<Icon name="chevronDown" size={14} strokeWidth={2} />
            </span>
          </button>
          <button className="pressable" aria-label="Switch to list view" onClick={onList} style={topBtn}><Icon name="list" size={20} /></button>
        </div>

        {/* Progress across exercises */}
        <div style={{ display:'flex', gap:4, marginTop:16 }} aria-hidden="true">
          {liveExercises.map((e, k) => {
            const n = loggedSets[k]?.sets.filter(Boolean).length || 0
            const f = Math.min(1, n / (e.sets || 3))
            return (
              <span key={e.id || k} style={{ flex:1, height:4, borderRadius:2, background:'var(--c-muted-2)', overflow:'hidden' }}>
                <span style={{ display:'block', height:4, width:`${f * 100}%`, background: k === safeIdx ? 'var(--c-accent)' : f >= 1 ? 'var(--c-done)' : 'var(--c-text-3)', transition:'width var(--t-base) var(--ease-out)' }} />
              </span>
            )
          })}
        </div>

        {allDone && !rest ? (
          <div className="screen-enter" style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:16, padding:'32px 0' }}>
            <span className="pop" style={{ width:64, height:64, borderRadius:32, background:'var(--c-done)', color:'#111113', display:'grid', placeItems:'center' }}>
              <Icon name="check" size={32} strokeWidth={2.4} />
            </span>
            <h2 className="t-display" style={{ fontSize:40 }}>Every set is in.</h2>
            <p className="t-body" style={{ color:'var(--c-text-2)' }}>Finish to save it, or add one more exercise if you have it in you.</p>
            <div style={{ ...stack(10), marginTop:16 }}>
              <Button full onClick={onFinish}>Finish session</Button>
              <Button full variant="quiet" icon="plus" onClick={onAdd}>Add exercise</Button>
            </div>
          </div>
        ) : rest ? (
          /* Rest, right after a set is logged */
          <div className="screen-enter" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:24, padding:'28px 0 0' }}>
            <div style={{ ...stack(6), alignItems:'center', textAlign:'center' }}>
              <span key={rest.endsAt} className="pop" style={{ width:44, height:44, borderRadius:22, background: rest.pr ? 'var(--c-accent)' : 'var(--c-done)', color:'#111113', display:'grid', placeItems:'center' }}>
                <Icon name={rest.pr ? 'trendUp' : 'check'} size={22} strokeWidth={2.4} />
              </span>
              <span className="t-headline">{rest.pr ? 'New best on this lift' : rest.between ? 'Quick switch' : `Set ${rest.logged.setNum} logged`}</span>
              <span className="t-subhead t-num" style={{ color:'var(--c-text-2)' }}>{rest.logged.name} · {fmtNum(rest.logged.weight)} lb × {rest.logged.reps}</span>
            </div>
            <RestRing total={rest.total} left={restLeft} />
            <div style={{ display:'flex', gap:10 }}>
              <Button variant="secondary" size="md" onClick={() => setRest(r => ({ ...r, total: r.total + 30, endsAt: Math.max(r.endsAt, Date.now()) + 30000 }))}>+30 sec</Button>
            </div>
            {upNext && (
              <div style={{ ...stack(2), alignItems:'center', textAlign:'center', marginTop:'auto' }}>
                <span className="t-footnote" style={{ color:'var(--c-text-2)' }}>Up next · {upNext.label}</span>
                <span className="t-title2">{upNext.name}</span>
              </div>
            )}
            <Button full variant={restLeft <= 0 ? 'primary' : 'secondary'} onClick={advanceAfterRest} style={{ marginTop: upNext ? 0 : 'auto' }}>
              {restLeft <= 0 ? 'Start next set' : 'Skip rest'}
            </Button>
          </div>
        ) : ex ? (
          /* The set */
          <div key={`${safeIdx}-${setIdx}`} className="screen-enter" style={{ flex:1, display:'flex', flexDirection:'column', gap:24, paddingTop:28 }}>
            <div style={stack(8)}>
              {flash && (
                <span className="pop t-footnote" role="status" style={{ alignSelf:'flex-start', display:'inline-flex', alignItems:'center', gap:6, color:'var(--c-done)', fontWeight:600 }}>
                  <Icon name="check" size={16} strokeWidth={2.4} />{flash}
                </span>
              )}
              {inSuperset && (
                <div aria-label={`Superset: ${group.map(k => liveExercises[k].name).join(' then ')}`}
                  style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span className="t-caption" style={{ color:'var(--c-accent-text)', fontWeight:700, letterSpacing:'0.04em' }}>SUPERSET</span>
                  {group.map((k, n) => (
                    <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                      {n > 0 && <Icon name="arrowRight" size={14} style={{ color:'var(--c-text-3)' }} />}
                      <span className="t-footnote" style={{ color: k === safeIdx ? 'var(--c-text)' : 'var(--c-text-3)', fontWeight: k === safeIdx ? 600 : 400 }}>
                        {labels[k]} {liveExercises[k].name}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <h2 className="t-display" style={{ flex:1, minWidth:0, fontSize:36, lineHeight:1.1 }}>{ex.name}</h2>
              </div>
              <span className="t-subhead t-num" style={{ color:'var(--c-text-2)' }}>
                {setIdx === null ? 'All sets logged' : `Set ${setIdx + 1} of ${targetSets}`} · target {ex.targetReps || 8} reps{ex.targetRpe ? ` at RPE ${ex.targetRpe}` : ''}
              </span>
              {lastSess?.sets?.length > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span className="t-footnote" style={{ color:'var(--c-text-3)' }}>Last time</span>
                  <SetChips sets={lastSess.sets} />
                </div>
              )}
              {ex.notes && <p className="t-footnote" style={{ color:'var(--c-text-2)', fontWeight:400 }}>{ex.notes}</p>}
            </div>

            {setIdx !== null ? (
              <>
                <div style={{ display:'flex', gap:8 }}>
                  <BigStepper label="Weight" unit="lb" value={weight} hint={wHint} onChange={v => { setWeight(v); setWHint(null) }} step={5} />
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:-12 }}>
                  {[2.5, 10].map(d => (
                    <Chip key={d} small onClick={() => { setWeight(fmtNum(Math.max(0, (parseFloat(weight) || 0) + d))); setWHint(null); buzz(6) }}>+{d}</Chip>
                  ))}
                </div>
                <BigStepper label="Reps" unit="reps" value={reps} hint={rHint} onChange={v => { setReps(v); setRHint(null) }} step={1} inputMode="numeric" />
                {rpeOn && (
                  <div style={{ ...stack(8), alignItems:'center' }}>
                    <span className="t-footnote" style={{ color:'var(--c-text-2)' }}>How hard (RPE)</span>
                    <ChipRow>
                      {[6, 7, 8, 9, 10].map(v => <Chip key={v} small selected={rpe === v} onClick={() => setRpe(rpe === v ? null : v)}>{v}</Chip>)}
                    </ChipRow>
                  </div>
                )}
              </>
            ) : (
              <Card style={{ ...stack(10), background:'var(--c-card)' }}>
                <span className="t-headline">{ex.name} is done.</span>
                <Button size="md" iconAfter="arrowRight" onClick={() => go(1)} disabled={safeIdx >= liveExercises.length - 1}>Next exercise</Button>
              </Card>
            )}

            {/* Sets so far: tap one to fix it */}
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              {Array.from({ length: targetSets }).map((_, i) => {
                const s = logged[i]
                const cur = i === setIdx
                return (
                  <button key={i} onClick={() => { if (s) { setEditing(i); buzz(6) } }} disabled={!s} aria-label={s ? `Set ${i + 1}: ${fmtNum(s.weight)} by ${s.reps}. Tap to fix` : `Set ${i + 1}, not logged`}
                    style={{ minWidth:64, height:40, padding:'0 10px', borderRadius:20, border: cur ? '1.5px solid var(--c-accent)' : '1px solid var(--c-line-strong)',
                      background: s ? 'var(--c-muted)' : 'transparent', color: s ? 'var(--c-text)' : 'var(--c-text-3)', fontSize:14, fontWeight:600, fontVariantNumeric:'tabular-nums' }}>
                    {s ? `${fmtNum(s.weight)} × ${s.reps}` : i + 1}
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop:'auto', ...stack(10) }}>
              {setIdx !== null && (
                <Button full onClick={log} disabled={!canLog} icon="check" style={{ height:64, fontSize:18 }}>
                  {editing !== null ? `Update set ${setIdx + 1}` : `Log set ${setIdx + 1}`}
                </Button>
              )}
              {editing !== null && logged[editing] && (
                <Button full variant="quiet" onClick={() => { onUndo(safeIdx, editing); setEditing(null) }}>Clear this set</Button>
              )}
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <Button variant="quiet" size="sm" icon="chevronLeft" onClick={() => go(-1)} disabled={safeIdx === 0}>Previous</Button>
                <Button variant="quiet" size="sm" iconAfter="chevronRight" onClick={() => go(1)} disabled={safeIdx >= liveExercises.length - 1}>Next exercise</Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* All exercises: jump, swap, add, remove */}
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title={workout.name}>
        <div style={{ ...stack(4), paddingBottom:8 }}>
          {liveExercises.map((e, k) => {
            const n = loggedSets[k]?.sets.filter(Boolean).length || 0
            const t = e.sets || 3
            return (
              <div key={e.id || k} style={{ display:'flex', alignItems:'center', gap:8, borderTop: k ? '1px solid var(--c-line)' : 'none' }}>
                <button onClick={() => { setRest(null); setEditing(null); setExIdx(k); setListOpen(false) }}
                  style={{ flex:1, minWidth:0, minHeight:56, border:'none', background:'none', textAlign:'left', color:'var(--c-text)', padding:'8px 0', ...stack(2) }}>
                  <span className="t-callout" style={{ fontWeight: k === safeIdx ? 700 : 600 }}>{e.name}</span>
                  <span className="t-footnote t-num" style={{ fontWeight:400, color: n >= t ? 'var(--c-done)' : 'var(--c-text-2)' }}>{n >= t ? 'Done' : `${n} of ${t} sets`}</span>
                </button>
                <IconButton icon="swap" label={`Swap ${e.name}`} onClick={() => { setListOpen(false); onSwap(k) }} />
                <IconButton icon="trash" label={`Remove ${e.name}`} onClick={() => { setListOpen(false); onRemove(k) }} />
              </div>
            )
          })}
          <Button variant="secondary" full icon="plus" onClick={() => { setListOpen(false); onAdd() }} style={{ marginTop:8 }}>Add exercise</Button>
          <Button variant="quiet" full onClick={() => { setListOpen(false); onFinish() }}>Finish session</Button>
        </div>
      </Sheet>
    </div>,
    document.body
  )
}

// ─── Session logger (list view) ───────────────────────────────────────────────
function SessionLogger({ workout, programId, phaseId, userId, profile, onGoEat, onFinish, onBack, program }) {
  const [sessions, setSessions] = useState([])
  const [loggedSets, setLoggedSets] = useState(
    workout.exercises.map(ex => ({ exerciseId:ex.exerciseId || ex.id, name:ex.name, sets:[] }))
  )
  const [liveExercises, setLiveExercises] = useState(workout.exercises)
  const [expandedEx, setExpandedEx] = useState(0)
  const [swappingIdx, setSwappingIdx] = useState(null)
  const [addingExercise, setAddingExercise] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState(null)
  const [saveState, setSaveState] = useState('saving') // 'saving' | 'saved' | 'error'
  const [restActive, setRestActive] = useState(false)
  const [restKey, setRestKey] = useState(0)
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [view, setView] = useState(readSessionView)   // 'gym' (default) or 'list'
  const switchView = (v) => { setView(v); writeSessionView(v); setRestActive(false); window.scrollTo(0, 0) }
  const { elapsed, formatted } = useStopwatch()

  const addExerciseLive = (ex) => {
    const newEx = { id:uid(), exerciseId:ex.id, name:ex.name, group:ex.group, sets:3, targetReps:8 }
    setLiveExercises(prev => [...prev, newEx])
    setLoggedSets(prev => [...prev, { exerciseId:ex.id, name:ex.name, sets:[] }])
    setAddingExercise(false)
    setExpandedEx(liveExercises.length)
  }
  const swapExerciseLive = (idx, ex) => {
    const newEx = { ...liveExercises[idx], id:uid(), exerciseId:ex.id, name:ex.name, group:ex.group }
    setLiveExercises(prev => { const next = [...prev]; next[idx] = newEx; return next })
    setLoggedSets(prev => { const next = [...prev]; next[idx] = { exerciseId:ex.id, name:ex.name, sets:[] }; return next })
    setSwappingIdx(null)
    setExpandedEx(idx)
  }
  const removeExerciseLive = (idx) => {
    setLiveExercises(prev => prev.filter((_, i) => i !== idx))
    setLoggedSets(prev => prev.filter((_, i) => i !== idx))
    if (expandedEx === idx) setExpandedEx(null)
  }

  useEffect(() => {
    if (userId) getSessions(userId, programId).then(s => setSessions(s)).catch(() => {})
  }, [programId])

  const getLastSession = (exerciseId, exerciseName) => {
    const prev = sessions
      .filter(s => {
        const pid = s.program_id ?? s.programId
        // Accept the program match, OR any session that logged this exercise
        // (covers sessions saved with a null/mismatched program_id).
        return !pid || pid === programId || (s.exercises || []).some(e => e.exerciseId === exerciseId || e.name === exerciseName)
      })
      .sort((a, b) => new Date(b.logged_at || b.date) - new Date(a.logged_at || a.date))
      .find(s => (s.exercises || []).some(e => e.exerciseId === exerciseId || e.name === exerciseName))
    if (!prev) return null
    return prev.exercises.find(e => e.exerciseId === exerciseId || e.name === exerciseName)
  }

  const undoSet = (exIdx, setIdx) => {
    setLoggedSets(prev => { const next = [...prev]; const sets = [...next[exIdx].sets]; sets[setIdx] = undefined; next[exIdx] = { ...next[exIdx], sets }; return next })
  }
  const logSet = (exIdx, setIdx, data) => {
    setLoggedSets(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = data
      next[exIdx] = { ...next[exIdx], sets }
      return next
    })
    // Open the next exercise once every set of this one is logged
    const ex = liveExercises[exIdx]
    const filled = loggedSets[exIdx].sets.filter(Boolean).length + 1
    if (filled >= (ex?.sets || 3) && exIdx < liveExercises.length - 1) setExpandedEx(exIdx + 1)
  }

  const buildStats = () => {
    let totalVolume = 0; let totalSets = 0; const prs = []; const nextTargets = []
    loggedSets.forEach((ex) => {
      const sets = ex.sets.filter(Boolean)
      sets.forEach(s => { totalVolume += (s.weight || 0) * (s.reps || 0); totalSets++ })
      const lastEx = getLastSession(ex.exerciseId, ex.name)
      const myMax = sets.reduce((b, s) => Math.max(b, s.weight || 0), 0)
      const lastMax = lastEx ? lastEx.sets.reduce((b, s) => Math.max(b, s?.weight || 0), 0) : 0
      const isFirstEver = !lastEx && myMax > 0
      if (myMax > lastMax && myMax > 0) prs.push({ name:ex.name, weight:myMax, firstEver:isFirstEver })
      // Progressive overload target: if every set hit its reps, suggest +5 lb next time
      const def = liveExercises.find(e => (e.exerciseId || e.id) === ex.exerciseId)
      const targetSets = def?.sets || 3
      const targetReps = toInt(def?.targetReps, 8)   // tolerates "8-12" or "10/side"
      const avgReps = sets.length ? sets.reduce((a, s) => a + (s.reps || 0), 0) / sets.length : 0
      if (sets.length >= targetSets && myMax > 0) {
        if (avgReps >= targetReps) nextTargets.push({ name:ex.name, current:myMax, next:myMax + 5 })
        else nextTargets.push({ name:ex.name, current:myMax, next:myMax })
      }
    })
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    const s = elapsed % 60
    const duration = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
    return { workoutName:workout.name, duration, volume:totalVolume, totalSets, prs, nextTargets, exerciseNames:loggedSets.map(e => e.name) }
  }

  const persist = async () => {
    setSaveState('saving')
    try {
      await saveSession(userId, { programId, phaseId, workoutId:workout.id, workoutName:workout.name, exercises:loggedSets.map(e => ({ ...e, sets:e.sets.filter(Boolean) })) })
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
    }
  }
  const finishSession = () => {
    setConfirmFinish(false)
    setRestActive(false)
    setSessionStats(buildStats())
    setSessionComplete(true)
    persist()
  }

  const totalSetsLogged = loggedSets.reduce((a, e) => a + e.sets.filter(Boolean).length, 0)
  const doneCount = liveExercises.filter((ex, i) => (loggedSets[i]?.sets.filter(Boolean).length || 0) >= (ex.sets || 3)).length
  const pct = liveExercises.length ? doneCount / liveExercises.length : 0
  const anyRpe = (ex) => !!(workout.useRpe || ex.useRpe || program?.useRpe || ex.targetRpe)
  const exit = () => totalSetsLogged ? setConfirmExit(true) : onBack()
  const askRemove = (idx) => (loggedSets[idx]?.sets.filter(Boolean).length ? setConfirmRemove(idx) : removeExerciseLive(idx))
  const tryFinish = () => totalSetsLogged ? finishSession() : setConfirmFinish(true)
  const listLabels = supersetLabels(liveExercises)

  return (
    <>
      {/* The list stays out of the page (and the accessibility tree) while gym mode is up */}
      {view === 'list' && (<>
      <ScreenHeader title={workout.name} subtitle={`${formatted} · ${doneCount} of ${liveExercises.length} done`} onBack={exit} backLabel="Leave session"
        right={<IconButton icon="lift" label="Switch to gym mode" onClick={() => switchView('gym')} />} />
      <div style={{ ...pad, marginTop:-8, marginBottom:20 }}>
        <div role="progressbar" aria-label="Exercises done" aria-valuemin={0} aria-valuemax={liveExercises.length} aria-valuenow={doneCount}
          style={{ height:4, borderRadius:2, background:'var(--c-line)', overflow:'hidden' }}>
          <div style={{ width:`${pct * 100}%`, height:4, borderRadius:2, background:'var(--c-accent)', transition:'width var(--t-base) var(--ease-out)' }} />
        </div>
      </div>

      {/* While resting, the timer pill floats above the tab bar: leave room so Finish can scroll clear of it */}
      <div style={{ ...pad, ...stack(12), paddingBottom: restActive ? 96 : 0, transition:'padding var(--t-base) var(--ease-out)' }}>
        <WarmupSuggestion workout={workout} />

        {liveExercises.map((ex, exIdx) => {
          const logged = loggedSets[exIdx] || { sets:[] }
          const lastSess = getLastSession(ex.exerciseId || ex.id, ex.name)
          const targetSets = ex.sets || 3
          const isExpanded = expandedEx === exIdx
          const setsLogged = logged.sets.filter(Boolean).length
          const allDone = setsLogged >= targetSets
          const rpeOn = anyRpe(ex)
          const status = allDone ? 'Done' : setsLogged ? `${setsLogged} of ${targetSets} sets` : null
          return (
            <Card key={ex.id || exIdx} flat={!isExpanded} tone={allDone && !isExpanded ? 'muted' : 'default'} style={{ padding:0, overflow:'hidden' }}>
              <button aria-expanded={isExpanded} onClick={() => setExpandedEx(isExpanded ? null : exIdx)}
                style={{ width:'100%', minHeight:64, display:'flex', alignItems:'center', gap:12, padding:'16px 16px 14px 20px', border:'none', background:'none', textAlign:'left', color:'var(--c-text)' }}>
                <span style={{ flex:1, minWidth:0, ...stack(4) }}>
                  <span className="t-title2" style={{ fontSize: isExpanded ? 24 : 19 }}>{ex.name}</span>
                  <span className="t-subhead c-2 t-num">
                    {listLabels[exIdx] && <span style={{ color:'var(--c-accent-text)', fontWeight:600 }}>Superset {listLabels[exIdx]} · </span>}
                    {targetSets} × {ex.targetReps || 8}{ex.targetWeight ? ` @ ${ex.targetWeight} lb` : ''}{ex.targetRpe ? ` · RPE ${ex.targetRpe}` : ''}
                    {status && <span style={{ color: allDone ? 'var(--c-done)' : 'var(--c-accent-text)', fontWeight:500 }}> · {status}</span>}
                  </span>
                </span>
                {allDone
                  ? <span style={{ width:28, height:28, borderRadius:14, background:'var(--c-done)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="check" size={16} strokeWidth={2.6} /></span>
                  : <Icon name="chevronDown" size={18} strokeWidth={2} style={{ color:'var(--c-text-3)', transition:'transform var(--t-base) var(--ease-out)', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />}
              </button>

              {isExpanded && (
                <div style={{ padding:'0 16px 16px', ...stack(12) }}>
                  {ex.notes && <p className="t-subhead c-2" style={{ padding:'0 4px' }}>{ex.notes}</p>}
                  {lastSess && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'0 4px' }}>
                      <span className="t-footnote c-2">Last time</span>
                      <SetChips sets={lastSess.sets} />
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:`28px minmax(0,1fr) minmax(0,1fr) ${rpeOn ? '56px ' : ''}48px`, gap:8, padding:'4px 0 0' }} aria-hidden="true">
                    <span className="t-caption c-3" style={{ textAlign:'center' }}>Set</span>
                    <span className="t-caption c-3" style={{ textAlign:'center' }}>lb</span>
                    <span className="t-caption c-3" style={{ textAlign:'center' }}>Reps</span>
                    {rpeOn && <span className="t-caption c-3" style={{ textAlign:'center' }}>RPE</span>}
                    <span />
                  </div>
                  <div style={stack(6)}>
                    {Array.from({ length:targetSets }).map((_, i) => {
                      const done = logged.sets[i]
                      return (
                        <InlineSetRow key={i} setNum={i + 1} initial={done} lastSet={lastSess?.sets?.[i]}
                          prevSet={i > 0 ? (logged.sets[i - 1] || lastSess?.sets?.[i - 1] || null) : null}
                          isCurrent={!done && logged.sets.filter(Boolean).length === i}
                          onSave={data => logSet(exIdx, i, data)}
                          onUndo={() => { setLoggedSets(prev => { const next = [...prev]; const sets = [...next[exIdx].sets]; sets[i] = undefined; next[exIdx] = { ...next[exIdx], sets }; return next }) }}
                          onRestStart={() => { setRestActive(true); setRestKey(k => k + 1) }}
                          useRpe={rpeOn} targetReps={ex.targetReps || 8} targetRpe={ex.targetRpe} targetWeight={ex.targetWeight} />
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', gap:4, marginTop:4, marginLeft:-8 }}>
                    <Button variant="quiet" size="sm" icon="swap" onClick={() => setSwappingIdx(exIdx)}>Swap</Button>
                    <Button variant="quiet" size="sm" icon="trash" onClick={() => askRemove(exIdx)}>Remove</Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        <Button variant="secondary" full icon="plus" onClick={() => setAddingExercise(true)}>Add exercise</Button>
        <Button full onClick={tryFinish} style={{ marginTop:12 }}>Finish session</Button>
      </div>
      </>)}

      {restActive && view === 'list' && <RestTimer key={restKey} onDismiss={() => setRestActive(false)} />}

      {view === 'gym' && !sessionComplete && (
        <GymView workout={workout} liveExercises={liveExercises} loggedSets={loggedSets} getLastSession={getLastSession}
          onLog={logSet} onUndo={undoSet} rpeFor={anyRpe} formatted={formatted}
          onExit={exit} onList={() => switchView('list')} onFinish={tryFinish}
          onSwap={setSwappingIdx} onAdd={() => setAddingExercise(true)} onRemove={askRemove} />
      )}

      <ExercisePicker open={addingExercise || swappingIdx !== null} title={swappingIdx !== null ? `Swap ${liveExercises[swappingIdx]?.name || 'exercise'}` : 'Add exercise'}
        onSelect={ex => swappingIdx !== null ? swapExerciseLive(swappingIdx, ex) : addExerciseLive(ex)}
        onClose={() => { setAddingExercise(false); setSwappingIdx(null) }} />

      <ConfirmSheet open={confirmExit} title="Leave this session?"
        message={`You've logged ${totalSetsLogged} ${totalSetsLogged === 1 ? 'set that hasn\'t' : 'sets that haven\'t'} been saved yet. Leaving now discards ${totalSetsLogged === 1 ? 'it' : 'them'}.`}
        confirmLabel="Leave and discard" cancelLabel="Keep going" destructive
        onConfirm={() => { setConfirmExit(false); setRestActive(false); onBack() }} onCancel={() => setConfirmExit(false)} />
      <ConfirmSheet open={confirmRemove !== null} title={`Remove ${liveExercises[confirmRemove]?.name || 'this exercise'}?`}
        message="The sets you logged for it are removed from this session."
        confirmLabel="Remove" destructive
        onConfirm={() => { removeExerciseLive(confirmRemove); setConfirmRemove(null) }} onCancel={() => setConfirmRemove(null)} />
      <ConfirmSheet open={confirmFinish} title="Finish without any sets?"
        message="Nothing is logged yet, so this saves an empty session."
        confirmLabel="Finish anyway" cancelLabel="Keep going"
        onConfirm={finishSession} onCancel={() => setConfirmFinish(false)} />

      {sessionComplete && sessionStats && (
        <SessionComplete stats={sessionStats} profile={profile} onGoEat={onGoEat} onDone={() => onFinish(sessionStats)} saveState={saveState} onRetrySave={persist} dark={view === 'gym'} />
      )}
    </>
  )
}


// ─── Session history ──────────────────────────────────────────────────────────
function SessionHistory({ userId, program, programId, preloadedSessions, onBack, onViewProgress }) {
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    // With the program available, match across ALL sessions (resilient to
    // null/mismatched program_id). Otherwise fall back to the strict query.
    if (program) {
      const base = preloadedSessions ? Promise.resolve(preloadedSessions) : getSessions(userId)
      base.then(all => { setSessions((all || []).filter(s => sessionBelongsToProgram(s, program))); setLoading(false) })
        .catch(() => { setSessions([]); setLoading(false) })
    } else {
      getSessions(userId, programId).then(s => { setSessions(s); setLoading(false) }).catch(() => { setSessions([]); setLoading(false) })
    }
  }, [])

  const list = (sessions || []).slice().sort((a, b) => new Date(b.logged_at || b.date) - new Date(a.logged_at || a.date))
  return (
    <>
      <ScreenHeader title="History" subtitle={loading ? null : `${list.length} session${list.length !== 1 ? 's' : ''} logged`} onBack={onBack} backLabel="Back to program" />
      <div style={{ ...pad, ...stack(10) }}>
        {loading && <Skeleton lines={5} label="Loading your history" />}
        {!loading && list.length === 0 && <EmptyState icon="history" title="No sessions yet" body="Finish a workout and it shows up here." />}
        {list.map((s, i) => {
          const date = new Date(s.logged_at || s.date).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })
          const isOpen = expanded === i
          const exs = s.exercises || []
          const sets = exs.reduce((a, e) => a + (e.sets || []).filter(Boolean).length, 0)
          const vol = exs.reduce((sum, ex) => sum + (ex.sets || []).reduce((a, set) => a + (set?.weight || 0) * (set?.reps || 0), 0), 0)
          return (
            <Card key={s.id || i} style={{ padding:'4px 16px 4px 20px' }}>
              <Disclosure open={isOpen} onToggle={() => setExpanded(isOpen ? null : i)}>
                <span style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'6px 0' }}>
                  <span style={{ minWidth:0 }}>
                    <span className="t-callout" style={{ fontWeight:600, display:'block' }}>{s.workout_name || s.workoutName}</span>
                    <span className="t-footnote c-2" style={{ fontWeight:400 }}>{date}</span>
                  </span>
                  <span style={{ textAlign:'right', flexShrink:0 }}>
                    <span className="t-footnote t-num" style={{ display:'block' }}>{sets} sets</span>
                    <span className="t-footnote c-2 t-num" style={{ fontWeight:400 }}>{vol.toLocaleString()} lb</span>
                  </span>
                </span>
              </Disclosure>
              {isOpen && (
                <div style={{ padding:'4px 0 16px', ...stack(14) }}>
                  {exs.map((ex, j) => (
                    <div key={j} style={stack(6)}>
                      {onViewProgress
                        ? <button onClick={() => onViewProgress(ex.name, ex.exerciseId)} className="t-subhead c-accent" style={{ border:'none', background:'none', padding:0, textAlign:'left', fontWeight:600, display:'inline-flex', alignItems:'center', gap:4, minHeight:32 }}>
                            {ex.name}<Icon name="chevronRight" size={14} strokeWidth={2} />
                          </button>
                        : <span className="t-subhead" style={{ fontWeight:600 }}>{ex.name}</span>}
                      <SetChips sets={ex.sets} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

// ─── Exercise progress ────────────────────────────────────────────────────────
function ExerciseProgress({ userId, programId, exerciseName, exerciseId, onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessions(userId, programId).then(s => {
      const relevant = s.filter(sess => (sess.exercises || []).some(e => e.exerciseId === exerciseId || e.name === exerciseName))
        .sort((a, b) => new Date(a.logged_at || a.date) - new Date(b.logged_at || b.date))
      setSessions(relevant); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const getExData = (sess) => (sess.exercises || []).find(e => e.exerciseId === exerciseId || e.name === exerciseName)
  const getBestSet = (ex) => (ex?.sets || []).filter(Boolean).reduce((best, s) => (s.weight || 0) > (best.weight || 0) ? s : best, { weight:0, reps:0 })
  const allHistory = sessions.map(s => {
    const ex = getExData(s); const best = getBestSet(ex)
    return { date:s.logged_at || s.date, weight:best?.weight, reps:best?.reps, sets:(ex?.sets || []).filter(Boolean), band:getRepBand(best?.reps) }
  }).filter(h => h.weight > 0)
  const overallBest = allHistory.reduce((b, s) => (s.weight || 0) > (b.weight || 0) ? s : b, { weight:0, reps:0 })
  const byBand = {}
  allHistory.forEach(h => { if (h.band) (byBand[h.band] = byBand[h.band] || []).push(h) })
  const bandOrder = ['strength', 'moderate', 'volume']

  return (
    <>
      <ScreenHeader title={exerciseName} subtitle="Your history on this lift" onBack={onBack} />
      <div style={{ ...pad, ...stack(28) }}>
        {loading && <Skeleton lines={5} label="Loading progress" />}
        {!loading && overallBest.weight > 0 && (
          <Card tone="inverse" style={stack(6)}>
            <span className="t-footnote" style={{ color:'var(--c-accent)', textTransform:'uppercase', letterSpacing:'0.06em' }}>All-time best set</span>
            <span className="t-display t-num" style={{ color:'#F2EDE4' }}>{overallBest.weight} lb</span>
            <span className="t-subhead" style={{ color:'#B8B3A9' }}>for {overallBest.reps} rep{overallBest.reps !== 1 ? 's' : ''}</span>
          </Card>
        )}
        {bandOrder.filter(b => byBand[b]?.length).map(band => {
          const bandHistory = byBand[band]
          const { trend, diff } = getBandTrend(bandHistory.map(h => ({ weight:h.weight, reps:h.reps })), band)
          return (
            <section key={band}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'0 4px', marginBottom:12 }}>
                <h2 className="t-footnote c-2" style={{ fontWeight:600 }}>{REP_BAND_LABEL[band]}</h2>
                <TrendBadge trend={trend} diff={diff} />
              </div>
              <Card style={{ padding:'4px 20px' }}>
                {bandHistory.slice().reverse().map((h, i) => (
                  <div key={i} style={{ padding:'12px 0', borderTop: i ? '1px solid var(--c-line)' : 'none', ...stack(8) }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}>
                      <span className="t-callout t-num" style={{ fontWeight:600 }}>{h.weight} lb × {h.reps}</span>
                      <span className="t-footnote c-2" style={{ fontWeight:400 }}>{new Date(h.date).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</span>
                    </div>
                    {h.sets.length > 1 && <SetChips sets={h.sets} />}
                  </div>
                ))}
              </Card>
            </section>
          )
        })}
        {!loading && allHistory.length === 0 && <EmptyState icon="trendUp" title="Nothing logged yet" body="Log this lift in a session and your progress shows up here." />}
      </div>
    </>
  )
}


// ─── Rep range helpers ────────────────────────────────────────────────────────
function getRepBand(reps) {
  if (!reps || reps <= 0) return null
  if (reps <= 5)  return 'strength'    // 1-5 reps
  if (reps <= 10) return 'moderate'    // 6-10 reps
  return 'volume'                       // 11+ reps
}
const REP_BAND_LABEL = { strength:'Strength (1–5)', moderate:'Moderate (6–10)', volume:'Volume (11+)' }

// Get dominant band from a history array (most common band in last 3 sessions)
function getDominantBand(history) {
  if (!history?.length) return null
  const recent = history.slice(-3)
  const counts = {}
  recent.forEach(h => {
    const b = getRepBand(h.reps)
    if (b) counts[b] = (counts[b]||0) + 1
  })
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null
}

// Filter history to only sessions in the same band, return trend
function getBandTrend(history, band) {
  if (!band || !history?.length) return { trend:'—', diff:0, inBand:[] }
  const inBand = history.filter(h => getRepBand(h.reps) === band)
  if (inBand.length < 2) return { trend:'—', diff:0, inBand }
  const last = inBand[inBand.length-1]
  const prev = inBand[inBand.length-2]
  const diff = last.weight - prev.weight
  const trend = diff > 0 ? '↑' : diff < 0 ? '→' : '→' // never show down arrow
  return { trend, diff, inBand, last, prev }
}

// ─── Progress summary (home screen) ──────────────────────────────────────────

// ─── Progress summary (Lift home) ─────────────────────────────────────────────
function bestOf(sets) {
  return (sets || []).filter(Boolean).reduce((b, s) => (s.weight || 0) > (b.weight || 0) ? s : b, { weight:0, reps:0 })
}

function ProgressRow({ name, history, onClick, showBand = true, first }) {
  const band = getDominantBand(history)
  const { trend, diff, last: bandLast } = getBandTrend(history, band)
  const last = bandLast || history[history.length - 1]
  return (
    <button onClick={onClick} style={{ ...rowBtn, padding:'12px 0', borderTop: first ? 'none' : '1px solid var(--c-line)' }}>
      <span style={{ flex:1, minWidth:0, ...stack(2) }}>
        <span className="t-callout" style={{ fontWeight:600 }}>{name}</span>
        <span className="t-footnote c-2 t-num" style={{ fontWeight:400 }}>
          {last ? `${last.weight} lb × ${last.reps}` : 'Not enough sessions yet'}{showBand && band ? ` · ${REP_BAND_LABEL[band]}` : ''}
        </span>
      </span>
      <TrendBadge trend={trend} diff={diff} />
      <Icon name="chevronRight" size={18} style={{ color:'var(--c-text-3)' }} />
    </button>
  )
}

function ProgressSummary({ sessions, onViewExercise }) {
  if (!sessions.length) return null
  const exerciseMap = {}
  ;[...sessions].sort((a, b) => new Date(a.logged_at || a.date) - new Date(b.logged_at || b.date)).forEach(sess => {
    (sess.exercises || []).forEach(ex => {
      if (!ex.name) return
      const best = bestOf(ex.sets)
      if (!best.weight) return
      if (!exerciseMap[ex.name]) exerciseMap[ex.name] = { name:ex.name, exerciseId:ex.exerciseId, history:[] }
      exerciseMap[ex.name].history.push({ weight:best.weight, reps:best.reps, date:sess.logged_at || sess.date })
    })
  })
  const exercises = Object.values(exerciseMap).filter(e => e.history.length >= 2).sort((a, b) => b.history.length - a.history.length).slice(0, 5)
  if (!exercises.length) return null
  return (
    <Section title="Your progress">
      <Card style={{ padding:'4px 20px' }}>
        {exercises.map((ex, i) => <ProgressRow key={ex.name} first={i === 0} name={ex.name} history={ex.history} onClick={() => onViewExercise(ex.name, ex.exerciseId)} />)}
      </Card>
    </Section>
  )
}

// ─── Session ↔ program matching ───────────────────────────────────────────────
// A session belongs to a program if its program_id matches, OR (fallback) the
// workout it logged is one of this program's workouts. The fallback rescues
// sessions saved with a null/mismatched program_id, common when a program was
// (re)created via the SQL editor with a different id than the one logged under.
function sessionBelongsToProgram(session, program) {
  const pid = session.program_id ?? session.programId
  if (pid && pid === program.id) return true
  const wid = session.workout_id ?? session.workoutId
  if (!wid) return false
  return (program.phases || []).some(ph => (ph.workouts || []).some(w => w.id === wid))
}

// ─── Program progress (inside program detail), grouped by phase ───────────────
function ProgramProgress({ program, sessions, onViewExercise }) {
  const programSessions = sessions.filter(s => sessionBelongsToProgram(s, program))
    .sort((a, b) => new Date(a.logged_at || a.date) - new Date(b.logged_at || b.date))
  if (!programSessions.length) return null

  const historyFor = (ex, list) => {
    const history = []
    list.forEach(sess => {
      const found = (sess.exercises || []).find(e => e.exerciseId === ex.exerciseId || e.name === ex.name)
      const best = bestOf(found?.sets)
      if (best.weight) history.push({ weight:best.weight, reps:best.reps, date:sess.logged_at || sess.date })
    })
    return history
  }
  const uniqueExercises = (workouts) => {
    const seen = new Set(); const out = []
    workouts.forEach(w => (w.exercises || []).forEach(ex => { if (!seen.has(ex.name)) { seen.add(ex.name); out.push(ex) } }))
    return out
  }

  const phaseProgress = program.phases.map(ph => {
    const ids = new Set(ph.workouts.map(w => w.id))
    const phaseSessions = programSessions.filter(s => ids.has(s.workoutId || s.workout_id))
    const exerciseData = uniqueExercises(ph.workouts).map(ex => ({ ...ex, history:historyFor(ex, phaseSessions) })).filter(e => e.history.length > 0)
    return { phase:ph, exerciseData }
  }).filter(p => p.exerciseData.length > 0)

  // Older sessions without a workout id: one flat list
  const flat = phaseProgress.length ? [] :
    uniqueExercises(program.phases.flatMap(ph => ph.workouts)).map(ex => ({ ...ex, history:historyFor(ex, programSessions) })).filter(e => e.history.length > 0)

  const card = (list, showBand) => (
    <Card style={{ padding:'4px 20px' }}>
      {list.map((ex, i) => <ProgressRow key={ex.name} first={i === 0} name={ex.name} history={ex.history} showBand={showBand} onClick={() => onViewExercise(ex.name, ex.exerciseId || ex.id)} />)}
    </Card>
  )
  return (
    <Section title="Progress in this program">
      <div style={stack(16)}>
        {phaseProgress.length ? phaseProgress.map(pp => (
          <div key={pp.phase.id} style={stack(8)}>
            <span className="t-footnote" style={{ fontWeight:600, padding:'0 4px' }}>{pp.phase.name}</span>
            {card(pp.exerciseData, true)}
          </div>
        )) : card(flat, false)}
      </div>
    </Section>
  )
}

// ─── Up next (Lift home) ──────────────────────────────────────────────────────
function UpNextCard({ nextUp, activeProgram, onSelectProgram }) {
  const [expanded, setExpanded] = useState(false)
  const exercises = nextUp.workout.exercises || []
  return (
    <Card style={{ padding:'22px 20px 20px', ...stack(16) }}>
      <div>
        <div className="t-footnote c-accent">Up next</div>
        <div className="t-display" style={{ fontSize:34, marginTop:6 }}>{nextUp.workout.name}</div>
        <div className="t-subhead c-2" style={{ marginTop:6 }}>{nextUp.phase.name} · {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ borderTop:'1px solid var(--c-line)', marginBottom:-8 }}>
        <Disclosure open={expanded} onToggle={() => setExpanded(v => !v)}>
          <span className="t-subhead c-accent" style={{ fontWeight:500 }}>{expanded ? 'Hide exercises' : 'See exercises'}</span>
        </Disclosure>
        {expanded && <div style={{ paddingBottom:16 }}><ExerciseTable exercises={exercises} /></div>}
      </div>
      <Button full iconAfter="arrowRight" onClick={() => onSelectProgram(activeProgram, nextUp.workout, nextUp.phase.id)}>Start session</Button>
    </Card>
  )
}


// ─── Hale Foundation program template ────────────────────────────────────────
const mkEx = (name, sets, reps, group, notes='') => ({
  id:uid(), exerciseId:uid(), name, group, sets,
  targetReps: typeof reps==='string' ? parseInt(reps)||10 : reps, notes
})
const mkW = (name, exercises) => ({ id:uid(), name, exercises })

function buildFoundationProgram() {
  const p1A = [
    mkEx('Barbell Back Squat',3,10,'Legs','Sub: Goblet Squat or Leg Press. Focus on depth and control — find your working weight this phase.'),
    mkEx('Barbell Bench Press',3,10,'Chest','Sub: Dumbbell Bench Press. Keep shoulder blades retracted and chest up throughout.'),
    mkEx('Seated Cable Row',3,12,'Back','Sub: Dumbbell Row. Drive elbows back, pause at full contraction. Do not let shoulders round.'),
    mkEx('Dumbbell Lateral Raise',3,15,'Shoulders','Light weight, full control. Slight forward lean, lead with elbows not wrists.'),
    mkEx('Dead Bug',3,8,'Core','8 reps each side. Press lower back into floor throughout. Slow and controlled.'),
  ]
  const p1B = [
    mkEx('Romanian Deadlift',3,10,'Legs','Sub: Dumbbell RDL. Hinge at hips, soft knee bend, feel the hamstring stretch. Bar stays close to legs.'),
    mkEx('Overhead Press',3,10,'Shoulders','Sub: Dumbbell Shoulder Press. Brace core hard, avoid excessive lower back arch.'),
    mkEx('Lat Pull Down',3,12,'Back','Sub: Pull Up. Pull to upper chest, lean back slightly. Full stretch at top each rep.'),
    mkEx('Leg Curl',3,12,'Legs','Sub: Nordic Curl Negative. Control the eccentric — lower slowly, do not let hips come up.'),
    mkEx('Hanging Knee Raise',3,12,'Core','Sub: Dumbbell Russian Twist. Tuck knees toward chest, avoid swinging. Pause at top.'),
  ]
  const p1C = [
    mkEx('Bulgarian Split Squat',3,10,'Legs','10 each side. Sub: Reverse Lunge. Front foot far enough forward that knee tracks over toes.'),
    mkEx('Incline Dumbbell Press',3,12,'Chest','30-45 degree incline. Full range of motion, controlled descent.'),
    mkEx('Single Arm Dumbbell Row',3,12,'Back','12 each side. Brace on bench, full stretch at bottom, full row at top.'),
    mkEx('Leg Press',3,15,'Legs','Sub: Goblet Squat. Feet shoulder width, full depth. Do not lock out knees at top.'),
    mkEx('Bicep Curl',2,15,'Biceps','No swinging. Full supination at top. Control the lowering phase.'),
    mkEx('Tricep Pushdown',2,15,'Triceps','Elbows pinned at sides. Full extension at bottom, do not flare elbows.'),
  ]
  const p2A = [
    mkEx('Barbell Back Squat',4,6,'Legs','Increase weight from Phase 1. Same depth and control — load has gone up, form stays the same.'),
    mkEx('Barbell Bench Press',4,6,'Chest','Heavier than Phase 1. Spot or use safeties — you are working closer to failure now.'),
    mkEx('Seated Cable Row',3,10,'Back','Add weight from Phase 1. Drive elbows back hard, hold 1 second at contraction.'),
    mkEx('Dumbbell Lateral Raise',3,15,'Shoulders','Same weight or slightly heavier. Quality over load on this one.'),
    mkEx('Cable Chop',3,10,'Core','10 each side. Sub: Resistance band chop. Rotate from core not arms. Keep hips square.'),
  ]
  const p2B = [
    mkEx('Trap Bar Deadlift',3,5,'Legs','Sub: Dumbbell Romanian Deadlift. Heavy strength lift — full 3-4 min rest between sets.'),
    mkEx('Overhead Press',4,6,'Shoulders','Heavier than Phase 1. Brace hard, full lockout at top, controlled descent.'),
    mkEx('Pull Up',3,8,'Back','Add weight if bodyweight is easy. Full dead hang at bottom, chin over bar at top.'),
    mkEx('Leg Curl',3,10,'Legs','Add weight from Phase 1. Control the negative — 3 seconds down.'),
    mkEx('Hanging Knee Raise',3,15,'Core','Add reps from Phase 1 or add ankle weight. No swinging.'),
  ]
  const p2C = [
    mkEx('Bulgarian Split Squat',4,8,'Legs','8 each side. More weight than Phase 1. Controlled descent, drive through heel to stand.'),
    mkEx('Incline Dumbbell Press',3,10,'Chest','Heavier than Phase 1. Pause 1 second at bottom for extra range of motion benefit.'),
    mkEx('Single Arm Dumbbell Row',3,10,'Back','10 each side. Heavier than Phase 1. Row to hip not to chest.'),
    mkEx('Leg Press',3,12,'Legs','Add weight from Phase 1. Push through full range — do not cut depth.'),
    mkEx('Hammer Curl',3,12,'Biceps','Neutral grip. Trains brachialis and brachioradialis — adds thickness to the arm.'),
    mkEx('Skull Crusher',3,12,'Triceps','Sub: Overhead Tricep Extension. Lower slowly, elbows stay pointed at ceiling.'),
  ]
  const p3A = [
    mkEx('Barbell Back Squat',4,4,'Legs','Heaviest weights of the program. Full warmup before working sets — do not rush this.'),
    mkEx('Barbell Bench Press',4,4,'Chest','Heaviest bench of the program. Use a spotter. This is your strength test.'),
    mkEx('Seated Cable Row',4,8,'Back','Heavy. Full contraction every rep. No momentum.'),
    mkEx('Dumbbell Lateral Raise',3,15,'Shoulders','Keep these controlled even as everything else gets heavier.'),
    mkEx('Cable Chop',3,10,'Core','10 each side. Heavier than Phase 2 if you can maintain form.'),
  ]
  const p3B = [
    mkEx('Trap Bar Deadlift',3,3,'Legs','Your heaviest deadlift of the program. 4 min rest between sets. Treat this lift seriously.'),
    mkEx('Overhead Press',4,4,'Shoulders','Heaviest press of the program. Full lockout, tight core.'),
    mkEx('Pull Up',4,6,'Back','Add weight if able. 4 sets this phase. Full range every rep.'),
    mkEx('Leg Curl',3,10,'Legs','Controlled. 3 second negative each rep.'),
    mkEx('Hanging Knee Raise',3,15,'Core','Add ankle weight or extend legs for more difficulty.'),
  ]
  const p3C = [
    mkEx('Bulgarian Split Squat',4,6,'Legs','6 each side. Heaviest of the program. Full depth, controlled.'),
    mkEx('Incline Dumbbell Press',4,8,'Chest','4 sets this phase. Heavy but controlled. Pause at bottom.'),
    mkEx('Single Arm Dumbbell Row',4,8,'Back','8 each side. Heaviest of the program. Row from full stretch.'),
    mkEx('Leg Press',3,10,'Legs','Heavy. Full depth. Slow controlled descent.'),
    mkEx('Bicep Curl + Tricep Pushdown',3,12,'Full Body','Superset — curl then pushdown back to back, rest 60s.'),
  ]
  const dl = (exercises) => exercises.map(e => ({...e, id:uid(), exerciseId:uid(),
    notes:'DELOAD — drop weight 40-50% from last week. Same reps, same form. Recovery not effort.'}))

  return {
    name: 'Hale Foundation',
    useRpe: false,
    phases: [
      { id:uid(), name:'Phase 1 — Build the Base', weeks:4,
        notes:'Higher reps, lower intensity. Establish movement patterns and find your working weights. Add 1 rep or small weight each week.',
        workouts:[mkW('Workout A — Squat & Push/Pull',p1A),mkW('Workout B — Hinge & Vertical',p1B),mkW('Workout C — Unilateral & Accessories',p1C)]},
      { id:uid(), name:'Phase 2 — Build Strength', weeks:4,
        notes:'Reps drop, weight goes up. You built the pattern in Phase 1 — now load it. Focus on adding weight each week to your main lifts.',
        workouts:[mkW('Workout A — Squat & Push/Pull',p2A),mkW('Workout B — Hinge & Vertical',p2B),mkW('Workout C — Unilateral & Accessories',p2C)]},
      { id:uid(), name:'Phase 3 — Peak & Deload', weeks:4,
        notes:'Weeks 9-11 are your heaviest. Week 12 is a full deload — drop weight 40-50%, keep the movement. Recovery is part of the program.',
        workouts:[mkW('Workout A — Squat & Push/Pull',p3A),mkW('Workout B — Hinge & Vertical',p3B),mkW('Workout C — Unilateral & Accessories',p3C),
          mkW('Workout A — Deload',dl(p3A)),mkW('Workout B — Deload',dl(p3B)),mkW('Workout C — Deload',dl(p3C))]},
    ]
  }
}

// ─── Common structure templates (Lift empty state "Use →") ───────────────────
// Built from EXERCISE_LIBRARY so exerciseIds match what the builder and the
// progress tracking use. Each call returns fresh ids, so a template can be used
// more than once without collisions.
const tEx = (name, sets, targetReps, notes='') => {
  const lib = EXERCISE_LIBRARY.find(e => e.name === name)
  return { id:uid(), exerciseId: lib ? lib.id : uid(), name, group: lib ? lib.group : 'Full Body', sets, targetReps, notes }
}

const PROGRAM_TEMPLATES = {
  'Push / Pull / Legs': () => ({
    name: 'Push / Pull / Legs',
    phases: [
      { id:uid(), name:'Phase 1', weeks:6,
        notes:'Run it 3 days a week (one of each) or 6 days (twice through). Add a rep or a little weight each week.',
        workouts:[
          mkW('Push', [tEx('Barbell Bench Press',3,8), tEx('Barbell Overhead Press',3,8), tEx('Incline Dumbbell Press',3,10), tEx('Lateral Raise',3,15), tEx('Rope Pushdown',3,12)]),
          mkW('Pull', [tEx('Pull-Up',3,8), tEx('Barbell Row',3,8), tEx('Seated Cable Row',3,10), tEx('Face Pull',3,15), tEx('Dumbbell Curl',3,12)]),
          mkW('Legs', [tEx('Barbell Back Squat',3,8), tEx('Romanian Deadlift',3,10), tEx('Leg Press',3,12), tEx('Hamstring Curl',3,12), tEx('Standing Calf Raise',3,15)]),
        ]},
    ],
  }),
  'Upper / Lower': () => ({
    name: 'Upper / Lower',
    phases: [
      { id:uid(), name:'Phase 1', weeks:6,
        notes:'Four days a week: Upper, Lower, rest, Upper, Lower. Add a rep or a little weight each week.',
        workouts:[
          mkW('Upper', [tEx('Barbell Bench Press',3,8), tEx('Seated Cable Row',3,10), tEx('Dumbbell Shoulder Press',3,10), tEx('Lat Pulldown',3,10), tEx('Dumbbell Curl',2,12), tEx('Rope Pushdown',2,12)]),
          mkW('Lower', [tEx('Barbell Back Squat',3,8), tEx('Romanian Deadlift',3,10), tEx('Bulgarian Split Squat',3,10,'Each side.'), tEx('Hamstring Curl',3,12), tEx('Plank',3,45,'Seconds, not reps.')]),
        ]},
    ],
  }),
  'Full Body 3x': () => ({
    name: 'Full Body 3x',
    phases: [
      { id:uid(), name:'Phase 1', weeks:6,
        notes:'Same workout three days a week with a rest day between. Add a rep or a little weight each session when it feels solid.',
        workouts:[
          mkW('Full Body', [tEx('Goblet Squat',3,10), tEx('Dumbbell Bench Press',3,10), tEx('Dumbbell Row',3,10,'Each side.'), tEx('Romanian Deadlift',3,10), tEx('Dumbbell Shoulder Press',2,10), tEx('Dead Bug',2,8,'Each side.')]),
        ]},
    ],
  }),
  'Hybrid Strength + Cardio': () => ({
    name: 'Hybrid Strength + Cardio',
    phases: [
      { id:uid(), name:'Phase 1 — Base', weeks:4,
        notes:'Lift 2 days, run or ride 3 days. Keep most cardio easy, conversational pace.',
        workouts:[
          mkW('Upper Strength', [tEx('Barbell Bench Press',3,8), tEx('Pull-Up',3,8), tEx('Dumbbell Shoulder Press',3,10), tEx('Seated Cable Row',3,10), tEx('Plank',3,45,'Seconds, not reps.')]),
          mkW('Lower Strength', [tEx('Trap Bar Deadlift',3,6), tEx('Bulgarian Split Squat',3,8,'Each side.'), tEx('Hamstring Curl',3,10), tEx('Standing Calf Raise',3,15), tEx('Dead Bug',2,8,'Each side.')]),
        ]},
      { id:uid(), name:'Phase 2 — Build', weeks:4,
        notes:'Same split, slightly heavier lifts. Add one harder cardio session a week.',
        workouts:[
          mkW('Upper Strength', [tEx('Barbell Bench Press',4,6), tEx('Pull-Up',4,6), tEx('Barbell Overhead Press',3,8), tEx('Barbell Row',3,8), tEx('Pallof Press',3,10,'Each side.')]),
          mkW('Lower Power', [tEx('Trap Bar Deadlift',4,5), tEx('Box Jump',3,5), tEx('Reverse Lunges',3,8,'Each side.'), tEx('Kettlebell Swing',3,12), tEx('Side Plank',2,30,'Seconds each side.')]),
        ]},
    ],
  }),
}
PROGRAM_TEMPLATES['Hale Foundation'] = buildFoundationProgram

// ─── Lift home ────────────────────────────────────────────────────────────────
const STRUCTURES = [
  { name:'Push / Pull / Legs',        desc:'3 or 6 days. A classic split for building muscle' },
  { name:'Upper / Lower',             desc:'4 days. Balanced strength and size' },
  { name:'Full Body 3x',              desc:'3 days. Good for beginners and busy weeks' },
  { name:'Hybrid Strength + Cardio',  desc:'5 days. Lifting and running together' },
]

function WeeklyOverview({ programs, sessions, activeProgramId, onSelectProgram, onOpenProgram, onNewProgram, onUseTemplate, onViewExercise, onGoMove, loading }) {
  const activeProgram = programs.find(p => p.id === activeProgramId) || programs[0]

  const getNextWorkout = (program) => {
    if (!program) return null
    const phases = program.phases || []
    const firstWithWorkouts = phases.find(p => p.workouts?.length > 0)
    // "Last workout" comes from the most recent LOGGED session for this program
    // (database truth), so this agrees with Home. The local-storage pointer is
    // unreliable: it gets set on Start even if the session never saved.
    const programWorkoutIds = new Set(phases.flatMap(p => (p.workouts || []).map(w => w.id)))
    const lastLogged = [...sessions].filter(s => programWorkoutIds.has(s.workoutId || s.workout_id))
      .sort((a, b) => new Date(b.logged_at || b.date) - new Date(a.logged_at || a.date))[0]
    const effectiveLastId = (lastLogged?.workoutId || lastLogged?.workout_id) || null
    if (!effectiveLastId) return firstWithWorkouts ? { workout:firstWithWorkouts.workouts[0], phase:firstWithWorkouts } : null
    for (let pi = 0; pi < phases.length; pi++) {
      const workouts = phases[pi].workouts || []
      const idx = workouts.findIndex(w => w.id === effectiveLastId)
      if (idx >= 0) {
        if (idx + 1 < workouts.length) return { workout:workouts[idx + 1], phase:phases[pi] }
        for (let ni = pi + 1; ni < phases.length; ni++) {
          if (phases[ni].workouts?.length > 0) return { workout:phases[ni].workouts[0], phase:phases[ni] }
        }
        return firstWithWorkouts ? { workout:firstWithWorkouts.workouts[0], phase:firstWithWorkouts } : null
      }
    }
    return firstWithWorkouts ? { workout:firstWithWorkouts.workouts[0], phase:firstWithWorkouts } : null
  }

  // This week, framed only positively
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentSessions = sessions.filter(s => new Date(s.logged_at || s.date).getTime() > sevenDaysAgo)
    .sort((a, b) => new Date(b.logged_at || b.date) - new Date(a.logged_at || a.date))
  const n = recentSessions.length
  const consistencyNote = n >= 4 ? 'Strong week.' : n >= 2 ? `${n} sessions this week. Keep it going.` : n === 1 ? 'One session in this week. Build on it.' : null
  const nextUp = getNextWorkout(activeProgram)

  if (loading) return (
    <>
      <ScreenHeader title="Lift" />
      <div style={pad}><Skeleton lines={6} label="Loading your programs" /></div>
    </>
  )

  if (!activeProgram) return (
    <>
      <ScreenHeader title="Lift" subtitle="Know what you lifted last time, and do a little more." />
      <div style={{ ...pad, ...stack(28) }}>
        <Card tone="inverse" style={{ position:'relative', overflow:'hidden', padding:'24px 22px 22px', ...stack(16) }}>
          <div aria-hidden="true" style={{ position:'absolute', right:-70, top:-70, opacity:.16, pointerEvents:'none' }}><HaleMark size={220} /></div>
          <div className="t-footnote" style={{ color:'var(--c-accent)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Free program</div>
          <div style={stack(8)}>
            <div className="t-display">Hale Foundation</div>
            <p className="t-subhead" style={{ color:'#B8B3A9', fontSize:15 }}>12 weeks, full body, three workouts a week. Built for steady progress, with swaps for every lift.</p>
          </div>
          <Button variant="accent" full iconAfter="arrowRight" onClick={() => onUseTemplate('Hale Foundation')}>Start with Foundation</Button>
        </Card>
        <Section title="Or start from a structure">
          <Card style={{ padding:'4px 20px' }}>
            {STRUCTURES.map((s, i) => (
              <button key={s.name} onClick={() => onUseTemplate(s.name)} style={{ ...rowBtn, borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
                <span style={{ flex:1, minWidth:0, ...stack(2) }}>
                  <span className="t-callout" style={{ fontWeight:600 }}>{s.name}</span>
                  <span className="t-footnote c-2" style={{ fontWeight:400 }}>{s.desc}</span>
                </span>
                <Icon name="chevronRight" size={18} style={{ color:'var(--c-text-3)' }} />
              </button>
            ))}
          </Card>
        </Section>
        <div style={stack(8)}>
          <Button variant="secondary" full icon="plus" onClick={onNewProgram}>Build my own</Button>
          <p className="t-footnote c-2" style={{ textAlign:'center', fontWeight:400 }}>Working with a coach? They can load your program for you.</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <ScreenHeader title="Lift" subtitle={activeProgram.name} />
      <div style={{ ...pad, ...stack(28) }}>
        <div style={stack(10)}>
          {consistencyNote && (
            <p className="t-subhead" style={{ display:'flex', alignItems:'center', gap:8, color:'var(--c-text-2)', padding:'0 4px' }}>
              <span aria-hidden="true" style={{ width:6, height:6, borderRadius:3, background:'var(--c-done)' }} />{consistencyNote}
            </p>
          )}
          {nextUp
            ? <UpNextCard nextUp={nextUp} activeProgram={activeProgram} onSelectProgram={onSelectProgram} />
            : (
              <Card style={stack(10)}>
                <h2 className="t-headline">No workouts yet</h2>
                <p className="t-subhead c-2">Add a phase and a workout to {activeProgram.name} to get started.</p>
                <Button size="md" variant="secondary" onClick={() => onOpenProgram(activeProgram)} style={{ alignSelf:'flex-start' }}>Open program</Button>
              </Card>
            )}
          <Button variant="quiet" full onClick={onGoMove}>Not lifting today? Just move</Button>
        </div>

        {recentSessions.length > 0 && (
          <Section title="This week">
            <Card style={{ padding:'4px 20px' }}>
              {recentSessions.slice(0, 4).map((s, i) => {
                const date = new Date(s.logged_at || s.date).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })
                const sets = (s.exercises || []).reduce((a, e) => a + (e.sets || []).filter(Boolean).length, 0)
                return (
                  <div key={s.id || i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'12px 0', borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
                    <span style={stack(2)}>
                      <span className="t-callout" style={{ fontWeight:600 }}>{s.workout_name || s.workoutName}</span>
                      <span className="t-footnote c-2" style={{ fontWeight:400 }}>{date}</span>
                    </span>
                    <span className="t-footnote c-2 t-num" style={{ flexShrink:0 }}>{sets} sets</span>
                  </div>
                )
              })}
            </Card>
          </Section>
        )}

        <ProgressSummary sessions={sessions} onViewExercise={onViewExercise} />

        <Section title="Programs">
          <div style={stack(10)}>
            <Card style={{ padding:'4px 20px' }}>
              {programs.map((p, i) => {
                const workouts = p.phases.reduce((a, ph) => a + ph.workouts.length, 0)
                const current = p.id === (activeProgram?.id)
                return (
                  <button key={p.id} onClick={() => onOpenProgram(p)} style={{ ...rowBtn, borderTop: i ? '1px solid var(--c-line)' : 'none' }}>
                    <span style={{ flex:1, minWidth:0, ...stack(2) }}>
                      <span className="t-callout" style={{ fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>
                        {p.name}
                        {current && <span className="t-caption" style={{ color:'var(--c-accent-text)', background:'var(--c-accent-soft)', borderRadius:999, padding:'2px 8px' }}>Current</span>}
                      </span>
                      <span className="t-footnote c-2" style={{ fontWeight:400 }}>{p.phases.length} phase{p.phases.length !== 1 ? 's' : ''} · {workouts} workout{workouts !== 1 ? 's' : ''}</span>
                    </span>
                    <Icon name="chevronRight" size={18} style={{ color:'var(--c-text-3)' }} />
                  </button>
                )
              })}
            </Card>
            <Button variant="secondary" full icon="plus" onClick={onNewProgram}>New program</Button>
          </div>
        </Section>
      </div>
    </>
  )
}

// ─── Program detail ───────────────────────────────────────────────────────────
function WorkoutRow({ w, isNext, onStart, first }) {
  const [expanded, setExpanded] = useState(false)
  const exercises = w.exercises || []
  return (
    <div style={{ borderTop: first ? 'none' : '1px solid var(--c-line)', background: isNext ? 'var(--c-accent-soft)' : 'transparent' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px 8px 20px' }}>
        <button aria-expanded={expanded} onClick={() => setExpanded(v => !v)}
          style={{ flex:1, minWidth:0, minHeight:52, border:'none', background:'none', padding:'4px 0', textAlign:'left', color:'var(--c-text)', ...stack(2) }}>
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="t-callout" style={{ fontWeight:600 }}>{w.name}</span>
            {isNext && <span className="t-caption" style={{ color:'var(--c-accent-text)', background:'var(--c-card)', borderRadius:999, padding:'2px 8px' }}>Up next</span>}
          </span>
          <span className="t-footnote c-2" style={{ fontWeight:400, display:'flex', alignItems:'center', gap:4 }}>
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
            <Icon name="chevronDown" size={14} strokeWidth={2} style={{ transition:'transform var(--t-base) var(--ease-out)', transform: expanded ? 'rotate(180deg)' : 'none' }} />
          </span>
        </button>
        <Button size="sm" variant={isNext ? 'primary' : 'secondary'} onClick={onStart}>Start</Button>
      </div>
      {expanded && <div style={{ padding:'0 20px 14px' }}><ExerciseTable exercises={exercises} /></div>}
    </div>
  )
}

function ProgramDetail({ program, sessions, onBack, onEdit, onStartWorkout, onViewHistory, onViewProgress }) {
  // The single next workout across the program, with phase completion by weeks
  const getGlobalNextWorkout = () => {
    try {
      const phases = program?.phases || []
      const firstPhaseWithWorkouts = phases.find(p => (p.workouts || []).length > 0)
      if (!firstPhaseWithWorkouts) return null
      const programWorkoutIds = new Set(phases.flatMap(p => (p.workouts || []).map(w => w.id)))
      const lastLogged = [...(sessions || [])].filter(s => programWorkoutIds.has(s.workoutId || s.workout_id))
        .sort((a, b) => new Date(b.logged_at || b.date) - new Date(a.logged_at || a.date))[0]
      const effectiveLastId = (lastLogged?.workoutId || lastLogged?.workout_id) || null
      if (!effectiveLastId) return { phaseId:firstPhaseWithWorkouts.id, workoutId:firstPhaseWithWorkouts.workouts[0].id }

      const sessionCountByWorkout = {}
      sessions.forEach(s => { const wid = s.workoutId || s.workout_id; if (wid) sessionCountByWorkout[wid] = (sessionCountByWorkout[wid] || 0) + 1 })
      const isPhaseComplete = (phase) => {
        const workouts = phase.workouts || []
        if (!workouts.length) return false
        return workouts.every(w => (sessionCountByWorkout[w.id] || 0) >= (phase.weeks || 4))
      }
      for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi]
        const workouts = phase.workouts || []
        const idx = workouts.findIndex(w => w.id === effectiveLastId)
        if (idx >= 0) {
          if (isPhaseComplete(phase)) {
            for (let ni = pi + 1; ni < phases.length; ni++) {
              const nw = phases[ni].workouts || []
              if (nw.length > 0) return { phaseId:phases[ni].id, workoutId:nw[0].id }
            }
            return { phaseId:firstPhaseWithWorkouts.id, workoutId:firstPhaseWithWorkouts.workouts[0].id }
          }
          return { phaseId:phase.id, workoutId:workouts[(idx + 1) % workouts.length].id }
        }
      }
      return { phaseId:firstPhaseWithWorkouts.id, workoutId:firstPhaseWithWorkouts.workouts[0].id }
    } catch (e) {
      return null
    }
  }
  const nextUp = getGlobalNextWorkout()
  const workouts = program.phases.reduce((a, ph) => a + ph.workouts.length, 0)

  return (
    <>
      <ScreenHeader title={program.name} subtitle={`${program.phases.length} phase${program.phases.length !== 1 ? 's' : ''} · ${workouts} workouts`}
        onBack={onBack} backLabel="Back to Lift" right={<IconButton icon="edit" label="Edit program" onClick={onEdit} />} />
      <div style={{ ...pad, ...stack(28) }}>
        <Button variant="secondary" size="md" icon="history" onClick={onViewHistory} style={{ alignSelf:'flex-start' }}>Session history</Button>
        {program.phases.map(ph => (
          <Section key={ph.id} title={`${ph.name} · ${ph.weeks} weeks`}>
            <Card style={{ padding:0, overflow:'hidden' }}>
              {ph.workouts.length === 0 && <p className="t-subhead c-2" style={{ padding:'16px 20px' }}>No workouts in this phase.</p>}
              {ph.workouts.map((w, i) => (
                <WorkoutRow key={w.id} w={w} first={i === 0} isNext={nextUp?.phaseId === ph.id && nextUp?.workoutId === w.id}
                  onStart={() => onStartWorkout(w, program.id, ph.id)} />
              ))}
            </Card>
          </Section>
        ))}
        <ProgramProgress program={program} sessions={sessions || []} onViewExercise={onViewProgress || (() => {})} />
      </div>
    </>
  )
}

// ─── Root Lift screen ─────────────────────────────────────────────────────────
export default function LiftScreen({ userId, userProfile, onGoEat, onGoMove, deepLinkWorkout, onClearDeepLink, homeSignal }) {
  const [view, setView] = useState('home')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [editingProgram, setEditingProgram] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [programs, setPrograms] = useState([])
  const [sessions, setSessions] = useState([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [activeProgramId, setActiveProgramId] = useState(null)
  const [progressExercise, setProgressExercise] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!userId) return
    getPrograms(userId).then(p => { setPrograms(p); setProgramsLoading(false) }).catch(() => setProgramsLoading(false))
    getSessions(userId).then(s => setSessions(s)).catch(() => {})
    try { setActiveProgramId(localStorage.getItem('active_program_id')) } catch {}
  }, [userId])

  // Re-tapping the Lift tab returns to Lift home, except mid-session
  useEffect(() => { if (homeSignal && view !== 'session') setView('home') }, [homeSignal])

  // Each Lift screen starts at the top
  useEffect(() => { window.scrollTo(0, 0) }, [view])

  // Deep link from Home's warmup flow (after programs load)
  useEffect(() => {
    if (!deepLinkWorkout || !programs.length) return
    const { programId, phaseId, workoutId } = deepLinkWorkout
    const prog = programs.find(p => p.id === programId)
    if (!prog) return
    let workout = null
    for (const ph of prog.phases || []) {
      const w = (ph.workouts || []).find(w => w.id === workoutId)
      if (w) { workout = w; break }
    }
    if (!workout) return
    setSelectedProgram(prog)
    setActiveSession({ workout, programId, phaseId })
    setView('session')
    if (onClearDeepLink) onClearDeepLink()
  }, [deepLinkWorkout, programs])

  const reloadAll = async () => {
    const [freshPrograms, freshSessions] = await Promise.all([getPrograms(userId), getSessions(userId).catch(() => [])])
    setPrograms(freshPrograms)
    setSessions(freshSessions)
    if (selectedProgram) {
      const found = freshPrograms.find(p => p.id === selectedProgram.id)
      if (found) setSelectedProgram(found)
    }
  }

  const handleStartWorkout = (workout, programId, phaseId) => {
    setActiveSession({ workout, programId, phaseId })
    setView('session')
    try { localStorage.setItem('active_program_id', programId); setActiveProgramId(programId) } catch {}
  }
  const handleFinishSession = () => {
    try { localStorage.setItem(`last_workout_${activeSession.programId}`, activeSession.workout.id) } catch {}
    setActiveSession(null)
    reloadAll()
    setView('home')
  }
  const handleSaveProgram = async (prog) => {
    await saveProgram(userId, prog)
    setSelectedProgram(prog)
    setView('detail')
    await reloadAll()
  }
  const handleDeleteProgram = async () => {
    setConfirmDelete(false)
    await deleteProgram(editingProgram.id)
    setSelectedProgram(null)
    setView('home')
    await reloadAll()
  }
  const openProgram = (p) => { setSelectedProgram(p); setView('detail') }
  const newProgram = () => { setEditingProgram({ id:uid(), name:'', phases:[] }); setView('builder') }

  return (
    <div>
      {view === 'home' && (
        <WeeklyOverview programs={programs} sessions={sessions} activeProgramId={activeProgramId} loading={programsLoading}
          onViewExercise={(name, id) => { setProgressExercise({ name, id, from:'home' }); setView('progress') }}
          onGoMove={onGoMove}
          onOpenProgram={openProgram}
          onSelectProgram={(prog, workout, phaseId) => {
            setSelectedProgram(prog)
            if (workout && phaseId) handleStartWorkout(workout, prog.id, phaseId)
            else setView('detail')
          }}
          onNewProgram={newProgram}
          onUseTemplate={(name) => {
            const make = PROGRAM_TEMPLATES[name]
            setSelectedProgram(null)
            setEditingProgram(make ? { id:uid(), ...make() } : { id:uid(), name:'', phases:[] })
            setView('builder')
          }} />
      )}
      {view === 'detail' && selectedProgram && (
        <ProgramDetail program={selectedProgram} sessions={sessions}
          onBack={() => setView('home')}
          onEdit={() => { setEditingProgram(selectedProgram); setView('builder') }}
          onStartWorkout={handleStartWorkout}
          onViewHistory={() => setView('history')}
          onViewProgress={(name, id) => { setProgressExercise({ name, id }); setView('progress') }} />
      )}
      {view === 'builder' && editingProgram && (
        <ProgramBuilder key={editingProgram.id} program={editingProgram} onSave={handleSaveProgram}
          onBack={() => { setView(selectedProgram ? 'detail' : 'home'); reloadAll() }}
          onDelete={selectedProgram ? () => setConfirmDelete(true) : null} />
      )}
      {view === 'session' && activeSession && (
        <SessionLogger workout={activeSession.workout} programId={activeSession.programId}
          phaseId={activeSession.phaseId} userId={userId} profile={userProfile} onGoEat={onGoEat}
          program={programs.find(p => p.id === activeSession.programId)}
          onFinish={handleFinishSession}
          onBack={() => { setActiveSession(null); setView(selectedProgram ? 'detail' : 'home') }} />
      )}
      {view === 'history' && selectedProgram && (
        <SessionHistory userId={userId} program={selectedProgram} preloadedSessions={sessions}
          onBack={() => setView('detail')}
          onViewProgress={(name, id) => { setProgressExercise({ name, id }); setView('progress') }} />
      )}
      {view === 'progress' && progressExercise && (
        <ExerciseProgress userId={userId} programId={progressExercise.from === 'home' ? undefined : selectedProgram?.id}
          exerciseName={progressExercise.name} exerciseId={progressExercise.id}
          onBack={() => setView(progressExercise.from || 'detail')} />
      )}
      <ConfirmSheet open={confirmDelete} title={`Delete ${editingProgram?.name || 'this program'}?`}
        message="The program is removed for good. Sessions you already logged stay in your history."
        confirmLabel="Delete program" destructive
        onConfirm={handleDeleteProgram} onCancel={() => setConfirmDelete(false)} />
    </div>
  )
}
