'use client'
import { useState, useEffect, useRef } from 'react'
import { EXERCISE_LIBRARY, EXERCISE_GROUPS } from './exercises'
import { getPrograms, saveProgram, deleteProgram, getSessions, saveSession } from './db'
import { PostLiftRecovery } from './MoveScreen'

function buildNutritionNudge(profile, workoutType) {
  if (!profile?.goal) return ''
  const isMuscle = profile.goal?.toLowerCase().includes('muscle')
  const isFat = profile.goal?.toLowerCase().includes('fat')
  const isLower = /lower|leg|squat|deadlift|hip|glute/i.test(workoutType||'')
  const isUpper = /upper|push|pull|press|chest|back|shoulder/i.test(workoutType||'')
  if (isMuscle) {
    if (isLower) return 'Heavy lower body session — prioritize high carb and high protein in your next meal to replenish glycogen and drive muscle repair.'
    if (isUpper) return 'Upper body session done — aim for 40-50g protein in your next meal to maximize muscle protein synthesis.'
    return 'Prioritize protein and carbs in your next meal to support muscle growth and recovery.'
  }
  if (isFat) return 'Good session. Keep your next meal high protein, moderate carb to stay in a deficit while preserving muscle.'
  return 'Fuel recovery with a protein-rich meal within the next hour or two.'
}

function addVote() { try { const v=parseInt(localStorage.getItem('identity_votes')||'0'); localStorage.setItem('identity_votes',String(v+1)) } catch {} }

function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16) }) }

const T = {
  bg:'var(--bg)', surface:'var(--surface)', surface2:'var(--surface2)', surface3:'var(--surface3)',
  border:'var(--border)', border2:'var(--border2)',
  text:'var(--text)', text2:'var(--text2)', text3:'var(--text3)',
}
function rr(s) { return s==='sm'?'8px':s==='lg'?'16px':'12px' }

// ─── UI primitives ────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, outline, small, danger, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small?'7px 14px':'11px 18px', borderRadius:rr('md'),
      fontSize:small?12:13, fontWeight:600, letterSpacing:.1,
      border: outline||danger?`1px solid ${danger?'var(--coral)':T.border2}`:'none',
      background: danger?'transparent':outline?T.surface2:disabled?T.surface2:T.text,
      color: danger?'var(--coral)':outline?T.text2:disabled?T.text3:T.bg,
      cursor:disabled?'not-allowed':'pointer',
      boxShadow: (!outline&&!danger&&!disabled) ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
      ...style,
    }}>{children}</button>
  )
}
function FullBtn({ children, onClick, disabled, outline, color }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', marginTop:12, padding:'13px 16px', borderRadius:rr('md'),
      fontSize:14, fontWeight:600, letterSpacing:.1,
      border: outline ? `1px solid ${T.border2}` : 'none',
      background: color ? color : outline ? T.surface2 : disabled ? T.surface2 : T.text,
      color: color ? '#fff' : outline ? T.text2 : disabled ? T.text3 : T.bg,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: (!outline && !disabled) ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
    }}>{children}</button>
  )
}
function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13,
        border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text, outline:'none', ...style }} />
  )
}
function Label({ children }) {
  return <div style={{ fontSize:11, letterSpacing:.6, textTransform:'uppercase', color:T.text3, fontWeight:500, marginBottom:6 }}>{children}</div>
}
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.surface, border:`0.5px solid ${T.border}`,
      borderRadius:rr('md'), padding:'12px 14px', marginBottom:8,
      cursor:onClick?'pointer':'default', ...style }}>
      {children}
    </div>
  )
}
function Divider() { return <div style={{ height:'0.5px', background:T.border, margin:'10px 0' }} /> }
function BackBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      border:`1px solid ${T.border}`, background:T.surface2, color:T.text2,
      fontSize:12, fontWeight:500, padding:'6px 12px', borderRadius:rr('sm'),
      cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, marginBottom:16,
    }}>
      ← {label}
    </button>
  )
}
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:28, fontWeight:500, color:T.text, letterSpacing:-.5 }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:T.text2, marginTop:3 }}>{sub}</div>}
    </div>
  )
}
function EmptyState({ message, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'3rem 0', color:T.text3 }}>
      <div style={{ fontSize:14, marginBottom:6 }}>{message}</div>
      {sub && <div style={{ fontSize:12 }}>{sub}</div>}
    </div>
  )
}
function LoadingDots() {
  return (
    <div style={{ display:'flex', gap:5, padding:'10px 0', alignItems:'center', justifyContent:'center' }}>
      {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:T.text3,animation:'blink 1.2s infinite',animationDelay:i*.2+'s' }} />)}
      <style>{"@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}"}</style>
    </div>
  )
}

// ─── Stepper (for sets/reps in builder only) ──────────────────────────────────
function Stepper({ value, onChange, min=1, max=999, label }) {
  return (
    <div style={{ flex:1 }}>
      {label && <Label>{label}</Label>}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:T.surface2, border:`0.5px solid ${T.border}`, borderRadius:rr('sm'), padding:'6px 8px' }}>
        <button onClick={()=>onChange(Math.max(min,value-1))} style={{ width:28,height:28,borderRadius:'50%',border:`0.5px solid ${T.border}`,background:T.surface,color:T.text,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>−</button>
        <div style={{ flex:1,textAlign:'center',fontSize:16,fontWeight:500,color:T.text }}>{value}</div>
        <button onClick={()=>onChange(Math.min(max,value+1))} style={{ width:28,height:28,borderRadius:'50%',border:`0.5px solid ${T.border}`,background:T.surface,color:T.text,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>+</button>
      </div>
    </div>
  )
}

// ─── Stopwatch ────────────────────────────────────────────────────────────────
function useStopwatch() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const frameRef = useRef(null)
  useEffect(() => {
    startRef.current = Date.now()
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [])
  const fmt = (s) => { const m = Math.floor(s/60); const sec = s%60; return `${m}m ${sec}s` }
  return { elapsed, formatted: fmt(elapsed) }
}

// ─── AI helper ────────────────────────────────────────────────────────────────
async function callAI(prompt) {
  try {
    const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prompt }) })
    const data = await res.json()
    return data.text || ''
  } catch { return '' }
}

// ─── Exercise picker ──────────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [customName, setCustomName] = useState('')
  const filtered = EXERCISE_LIBRARY.filter(e => (group==='All'||e.group===group) && (!search||e.name.toLowerCase().includes(search.toLowerCase())))
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'flex-end' }}>
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:'16px 16px 0 0', width:'100%', maxWidth:430, margin:'0 auto', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 16px 8px', borderBottom:`0.5px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:16, fontWeight:500, color:T.text }}>Add exercise</div>
            <button onClick={onClose} style={{ border:'none', background:'none', color:T.text3, fontSize:18, padding:0 }}>×</button>
          </div>
          <TextInput value={search} onChange={setSearch} placeholder="Search exercises..." />
          <div style={{ display:'flex', gap:6, marginTop:8, overflowX:'auto', paddingBottom:4 }}>
            {EXERCISE_GROUPS.map(g=><button key={g} onClick={()=>setGroup(g)} style={{ flexShrink:0, padding:'4px 10px', borderRadius:20, fontSize:11, border:'none', background:group===g?T.text:T.surface2, color:group===g?T.bg:T.text2 }}>{g}</button>)}
          </div>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'8px 16px' }}>
          {filtered.map(e=>(
            <div key={e.id} onClick={()=>onSelect(e)} style={{ padding:'10px 0', borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:13, fontWeight:500, color:T.text }}>{e.name}</div><div style={{ fontSize:11, color:T.text3, marginTop:1 }}>{e.group}</div></div>
              <div style={{ fontSize:12, color:T.text3 }}>+</div>
            </div>
          ))}
          <div style={{ padding:'12px 0' }}>
            <Label>Custom exercise</Label>
            <div style={{ display:'flex', gap:8 }}>
              <TextInput value={customName} onChange={setCustomName} placeholder="Exercise name..." style={{ flex:1 }} />
              <Btn onClick={()=>{ if(customName.trim()){ onSelect({ id:uid(), name:customName.trim(), group:'Custom' }); setCustomName('') }}} disabled={!customName.trim()}>Add</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Set logger modal ─────────────────────────────────────────────────────────
function SetLogger({ set, lastSet, onSave, onClose }) {
  const [weight, setWeight] = useState(lastSet?.weight?.toString() || '')
  const [reps, setReps] = useState(lastSet?.reps?.toString() || set.targetReps?.toString() || '')
  const inputStyle = { width:'100%', padding:'16px 12px', borderRadius:rr('sm'), fontSize:28, fontWeight:500, border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text, outline:'none', textAlign:'center' }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('lg'), width:'100%', maxWidth:340, padding:20 }}>
        <div style={{ fontSize:16, fontWeight:500, color:T.text, marginBottom:4 }}>Set {set.num}</div>
        {lastSet && <div style={{ fontSize:12, color:T.text3, marginBottom:16 }}>Last time: {lastSet.weight} lb × {lastSet.reps} reps</div>}
        {!lastSet && <div style={{ marginBottom:16 }} />}
        <div style={{ display:'flex', gap:12, marginBottom:20 }}>
          <div style={{ flex:1 }}><Label>Weight (lb)</Label><input type="number" inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="0" autoFocus style={inputStyle} /></div>
          <div style={{ flex:1 }}><Label>Reps</Label><input type="number" inputMode="numeric" value={reps} onChange={e=>setReps(e.target.value)} placeholder="0" style={inputStyle} /></div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn outline onClick={onClose} style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={()=>onSave({ weight:parseFloat(weight)||0, reps:parseInt(reps)||0 })} disabled={!weight||!reps} style={{ flex:1 }}>Save set</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Session complete modal ────────────────────────────────────────────────────
function SessionCompleteModal({ stats, profile, onDone, onGoEat }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const prText = stats.prs.length ? `PRs hit: ${stats.prs.map(p=>p.name+': '+p.weight+'lb'+(p.firstEver?' (first ever)':'')).join(', ')}. ` : ''
    const prompt = `You are an encouraging coach giving a brief post-workout summary. Keep it warm, real, and concise — like a friend who also trains.

Session: ${stats.workoutName}
Duration: ${stats.duration}
Total volume: ${stats.volume.toLocaleString()} lbs
Exercises: ${stats.exerciseNames.join(', ')}
${prText}

Give 2-3 sentences max. Mention any PRs. Note one small win. No fluff, no exclamation point spam. Be real.`
    callAI(prompt).then(text => { setAnalysis(text); setLoading(false) })
  }, [])

  const nutritionNudge = buildNutritionNudge(profile, stats.workoutName)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflowY:'auto' }}>
      <div style={{ background:T.surface, borderRadius:rr('lg'), width:'100%', maxWidth:360, padding:20, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ fontSize:22, fontWeight:500, color:T.text, marginBottom:2 }}>
          {stats.returningAfterGap ? 'Good to have you back.' : 'You showed up.'}
        </div>
        {stats.returningAfterGap && <div style={{ fontSize:13, color:T.text2, marginBottom:4, lineHeight:1.5 }}>That is the one that counted.</div>}
        <div style={{ fontSize:13, color:T.text3, marginBottom:4 }}>{stats.workoutName}</div>
        <div style={{ fontSize:12, color:T.text3, fontStyle:'italic', marginBottom:16 }}>Strength is built gradually, session by session.</div>

        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:500, color:T.text }}>{stats.duration}</div>
            <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>duration</div>
          </div>
          <div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:500, color:T.text }}>{stats.totalSets}</div>
            <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>sets logged</div>
          </div>
        </div>

        {stats.prs.length > 0 && (
          <div style={{ background:'var(--green-bg)', border:'0.5px solid var(--green-dim)', borderRadius:rr('sm'), padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:6 }}>PR{stats.prs.length>1?'s':''} hit</div>
            {stats.prs.map((pr,i) => (
              <div key={i} style={{ marginTop:4 }}>
                <div style={{ fontSize:13, color:'var(--green)', fontWeight:500 }}>
                  {pr.firstEver ? `🎯 ${pr.name}: ${pr.weight} lb — first time ever` : `${pr.name}: ${pr.weight} lb`}
                </div>
                {pr.firstEver && <div style={{ fontSize:11, color:'var(--green)', opacity:.8, marginTop:1 }}>That is a milestone worth noting.</div>}
              </div>
            ))}
          </div>
        )}

        <button onClick={()=>setShowDetails(v=>!v)} style={{ background:'none', border:'none', color:T.text3, fontSize:12, padding:'2px 0 10px', cursor:'pointer', display:'block' }}>
          {showDetails ? 'Less detail ▲' : 'See details ▼'}
        </button>

        {showDetails && stats.nextTargets?.length > 0 && (
          <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:500, color:T.text2, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Next session targets</div>
            {stats.nextTargets.map((t,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:6, marginBottom:6, borderBottom: i < stats.nextTargets.length-1 ? `0.5px solid ${T.border}` : 'none' }}>
                <div style={{ fontSize:12, color:T.text2 }}>{t.name}</div>
                <div style={{ fontSize:12, fontWeight:500, color: t.next > t.current ? 'var(--green)' : T.text2 }}>
                  {t.next > t.current ? `Try ${t.next} lb` : `Same weight — nail the reps first`}
                </div>
              </div>
            ))}
          </div>
        )}

        {showDetails && stats.oneRMs?.length > 0 && (
          <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:500, color:T.text2, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Estimated 1RM</div>
            {stats.oneRMs.map((e,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', paddingBottom:4 }}>
                <div style={{ fontSize:12, color:T.text2 }}>{e.name}</div>
                <div style={{ fontSize:12, fontWeight:500, color:T.text }}>{e.e1rm} lb</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize:13, color:T.text2, lineHeight:1.7, marginBottom:12 }}>
          {loading ? <LoadingDots /> : analysis}
        </div>

        {nutritionNudge && (
          <div style={{ background:'var(--amber-bg)', border:'0.5px solid var(--amber-dim)', borderRadius:rr('sm'), padding:'10px 12px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--amber)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Fuel your recovery</div>
            <div style={{ fontSize:12, color:T.text2, lineHeight:1.6, marginBottom:8 }}>{nutritionNudge}</div>
            {onGoEat && <button onClick={onGoEat} style={{ fontSize:12, color:'var(--amber)', border:'none', background:'none', padding:0, cursor:'pointer' }}>Get a meal idea →</button>}
          </div>
        )}

        <PostLiftRecovery
          workoutName={stats.workoutName}
          exercises={stats.exerciseNames.map(n=>({ name:n }))}
          onSave={()=>{}}
        />

        <button onClick={onDone} style={{
          width:'100%', padding:'13px', borderRadius:rr('md'), border:'none',
          background:T.text, color:T.bg, fontSize:14, fontWeight:600,
          cursor:'pointer', marginTop:12, boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
        }}>Done</button>
      </div>
    </div>
  )
}

// ─── Exercise editor ──────────────────────────────────────────────────────────
function ExerciseEditor({ exercise, onChange, onRemove }) {
  return (
    <div style={{ background:T.surface, borderRadius:rr('md'), overflow:'hidden', marginBottom:8 }}>
      <div style={{ padding:'12px 14px', borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{exercise.name}</div>
          <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{exercise.group}</div>
        </div>
        <button onClick={onRemove} style={{ border:'none', background:'none', color:T.text3, fontSize:16, padding:'0 0 0 12px', cursor:'pointer' }}>×</button>
      </div>
      <div style={{ padding:'10px 14px', display:'flex', gap:8 }}>
        <Stepper label="Sets" value={exercise.sets||3} onChange={v=>onChange({ ...exercise, sets:v })} min={1} max={10} />
        <Stepper label="Target reps" value={exercise.targetReps||8} onChange={v=>onChange({ ...exercise, targetReps:v })} min={1} max={100} />
      </div>
    </div>
  )
}

// ─── Workout builder ──────────────────────────────────────────────────────────
function WorkoutBuilder({ workout, onChange, onBack }) {
  const [showPicker, setShowPicker] = useState(false)
  const addExercise = (ex) => { onChange({ ...workout, exercises:[...workout.exercises, { id:uid(), exerciseId:ex.id, name:ex.name, group:ex.group, sets:3, targetReps:8 }] }); setShowPicker(false) }
  const updateExercise = (idx, updated) => { const e=[...workout.exercises]; e[idx]=updated; onChange({ ...workout, exercises:e }) }
  const removeExercise = (idx) => { onChange({ ...workout, exercises:workout.exercises.filter((_,i)=>i!==idx) }) }
  return (
    <div style={{ padding:'0 20px' }}>
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={()=>setShowPicker(false)} />}
      <BackBtn label="Back to phase" onClick={onBack} />
      <SectionHeader title={workout.name} sub={`${workout.exercises.length} exercise${workout.exercises.length!==1?'s':''}`} />
      <Label>Workout name</Label>
      <TextInput value={workout.name} onChange={v=>onChange({ ...workout, name:v })} placeholder="e.g. Push A" style={{ marginBottom:14 }} />
      <Label>Exercises</Label>
      {workout.exercises.length===0 && <div style={{ fontSize:13, color:T.text3, marginBottom:10, padding:'10px 0' }}>No exercises yet.</div>}
      {workout.exercises.map((ex,i) => <ExerciseEditor key={ex.id} exercise={ex} onChange={updated=>updateExercise(i,updated)} onRemove={()=>removeExercise(i)} />)}
      <Btn outline onClick={()=>setShowPicker(true)} style={{ width:'100%', marginTop:4 }}>+ Add exercise</Btn>
      <FullBtn onClick={onBack}>Save workout</FullBtn>
    </div>
  )
}

// ─── Phase builder ────────────────────────────────────────────────────────────
function PhaseBuilder({ phase, onChange, onBack }) {
  const [editingWorkout, setEditingWorkout] = useState(null)
  const addWorkout = () => {
    const newW = { id:uid(), name:`Workout ${String.fromCharCode(65+phase.workouts.length)}`, exercises:[] }
    const updated = { ...phase, workouts:[...phase.workouts, newW] }
    onChange(updated); setEditingWorkout(updated.workouts.length-1)
  }
  const updateWorkout = (idx, updated) => { const w=[...phase.workouts]; w[idx]=updated; onChange({ ...phase, workouts:w }) }
  const removeWorkout = (idx) => { onChange({ ...phase, workouts:phase.workouts.filter((_,i)=>i!==idx) }) }
  if (editingWorkout!==null && phase.workouts[editingWorkout]) {
    return <WorkoutBuilder workout={phase.workouts[editingWorkout]} onChange={updated=>updateWorkout(editingWorkout,updated)} onBack={()=>setEditingWorkout(null)} />
  }
  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back to program" onClick={onBack} />
      <SectionHeader title={phase.name} sub={`${phase.workouts.length} workout${phase.workouts.length!==1?'s':''} · ${phase.weeks} weeks`} />
      <Label>Phase name</Label>
      <TextInput value={phase.name} onChange={v=>onChange({ ...phase, name:v })} placeholder="e.g. Phase 1 — Foundation" style={{ marginBottom:10 }} />
      <Label>Duration (weeks)</Label>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <button onClick={()=>onChange({ ...phase, weeks:Math.max(1,(phase.weeks||4)-1) })} style={{ width:36,height:36,borderRadius:'50%',border:`0.5px solid ${T.border}`,background:T.surface2,color:T.text,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>−</button>
        <div style={{ flex:1,textAlign:'center',fontSize:20,fontWeight:500,color:T.text }}>{phase.weeks||4} <span style={{ fontSize:13,fontWeight:400,color:T.text3 }}>weeks</span></div>
        <button onClick={()=>onChange({ ...phase, weeks:Math.min(52,(phase.weeks||4)+1) })} style={{ width:36,height:36,borderRadius:'50%',border:`0.5px solid ${T.border}`,background:T.surface2,color:T.text,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>+</button>
      </div>
      <Label>Workouts</Label>
      {phase.workouts.length===0 && <div style={{ fontSize:13, color:T.text3, padding:'10px 0', marginBottom:4 }}>No workouts yet.</div>}
      {phase.workouts.map((w,i) => (
        <Card key={w.id} style={{ cursor:'default' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div onClick={()=>setEditingWorkout(i)} style={{ flex:1, cursor:'pointer' }}>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{w.name}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{w.exercises.length} exercise{w.exercises.length!==1?'s':''}</div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Btn small outline onClick={()=>setEditingWorkout(i)}>Edit</Btn>
              <button onClick={()=>removeWorkout(i)} style={{ border:'none', background:'none', color:T.text3, fontSize:13, padding:0, cursor:'pointer' }}>×</button>
            </div>
          </div>
        </Card>
      ))}
      <Btn outline onClick={addWorkout} style={{ width:'100%', marginTop:4 }}>+ Add workout</Btn>
    </div>
  )
}

// ─── Program builder ──────────────────────────────────────────────────────────
function ProgramBuilder({ program, onSave, onBack, onDelete }) {
  const [prog, setProg] = useState(program)
  const [editingPhase, setEditingPhase] = useState(null)
  const addPhase = () => { setProg(p=>({ ...p, phases:[...p.phases, { id:uid(), name:`Phase ${p.phases.length+1}`, weeks:4, workouts:[] }] })) }
  const updatePhase = (idx, updated) => { setProg(p=>{ const phases=[...p.phases]; phases[idx]=updated; return { ...p, phases } }) }
  const removePhase = (idx) => { setProg(p=>({ ...p, phases:p.phases.filter((_,i)=>i!==idx) })); if(editingPhase===idx)setEditingPhase(null) }
  if (editingPhase!==null && prog.phases[editingPhase]) {
    return <PhaseBuilder phase={prog.phases[editingPhase]} onChange={updated=>updatePhase(editingPhase,updated)} onBack={()=>setEditingPhase(null)} />
  }
  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back to programs" onClick={onBack} />
      <SectionHeader title={prog.name||'New program'} sub={`${prog.phases.length} phase${prog.phases.length!==1?'s':''}`} />
      <Label>Program name</Label>
      <TextInput value={prog.name} onChange={v=>setProg(p=>({ ...p, name:v }))} placeholder="e.g. Hypertrophy Block" style={{ marginBottom:14 }} />
      <Label>Phases</Label>
      {prog.phases.length===0 && <div style={{ fontSize:13, color:T.text3, padding:'10px 0', marginBottom:4 }}>No phases yet.</div>}
      {prog.phases.map((ph,i) => (
        <Card key={ph.id} style={{ cursor:'default' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div onClick={()=>setEditingPhase(i)} style={{ flex:1, cursor:'pointer' }}>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{ph.name}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{ph.weeks} weeks · {ph.workouts.length} workout{ph.workouts.length!==1?'s':''}</div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Btn small outline onClick={()=>setEditingPhase(i)}>Edit</Btn>
              <button onClick={()=>removePhase(i)} style={{ border:'none', background:'none', color:T.text3, fontSize:13, padding:0, cursor:'pointer' }}>×</button>
            </div>
          </div>
        </Card>
      ))}
      <Btn outline onClick={addPhase} style={{ width:'100%', marginTop:4 }}>+ Add phase</Btn>
      <FullBtn onClick={()=>onSave(prog)} disabled={!prog.name.trim()}>Save program</FullBtn>
      {onDelete && <FullBtn outline onClick={onDelete}>Delete program</FullBtn>}
    </div>
  )
}


// ─── Inline set row ───────────────────────────────────────────────────────────
function InlineSetRow({ setNum, initial, lastSet, onSave }) {
  const [weight, setWeight] = useState(initial?.weight?.toString() || lastSet?.weight?.toString() || '')
  const [reps, setReps] = useState(initial?.reps?.toString() || lastSet?.reps?.toString() || '')
  const [saved, setSaved] = useState(!!initial)

  const handleSave = () => {
    if (!weight || !reps) return
    onSave({ weight: parseFloat(weight)||0, reps: parseInt(reps)||0 })
    setSaved(true)
  }

  const inputStyle = (val) => ({
    flex:1, padding:'10px 8px', borderRadius:rr('sm'), fontSize:16, fontWeight:500,
    border: `0.5px solid ${saved && val ? 'var(--green-dim)' : T.border}`,
    background: saved && val ? 'rgba(29,158,117,0.08)' : T.surface2,
    color: T.text, outline:'none', textAlign:'center', width:'100%',
  })

  return (
    <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0,
        background: saved ? T.text : T.surface2, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:11, fontWeight:500,
        color: saved ? T.bg : T.text2 }}>{setNum}</div>
      <input
        type="number" inputMode="decimal" value={weight}
        onChange={e=>{ setWeight(e.target.value); setSaved(false) }}
        onBlur={()=>{ if(weight&&reps) handleSave() }}
        placeholder={lastSet?.weight?.toString() || 'lb'}
        style={inputStyle(weight)} />
      <div style={{ fontSize:12, color:T.text3, flexShrink:0 }}>×</div>
      <input
        type="number" inputMode="numeric" value={reps}
        onChange={e=>{ setReps(e.target.value); setSaved(false) }}
        onBlur={()=>{ if(weight&&reps) handleSave() }}
        placeholder={lastSet?.reps?.toString() || 'reps'}
        style={inputStyle(reps)} />
      <button onClick={handleSave} disabled={!weight||!reps} style={{
        width:32, height:32, borderRadius:'50%', flexShrink:0,
        border:'none', background: (!weight||!reps) ? T.surface2 : saved ? 'var(--green-dim)' : T.text,
        color: (!weight||!reps) ? T.text3 : '#fff', fontSize:14, cursor: (!weight||!reps) ? 'not-allowed' : 'pointer',
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>{saved ? '✓' : '→'}</button>
    </div>
  )
}


// ─── Warmup suggestion ────────────────────────────────────────────────────────
function WarmupSuggestion({ workout }) {
  const [open, setOpen] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)

  const getSuggestion = async () => {
    if (suggestion) { setOpen(true); return }
    setLoading(true); setOpen(true)
    const exercises = workout.exercises.map(e => e.name).join(', ')
    try {
      const res = await fetch('/api/claude', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt: `You are a sports performance coach. Give a 5-minute warmup routine for someone about to do this workout: ${exercises}.

Give 4-5 specific movements with duration. Focus on what actually prepares those muscles and joints. Be direct, no fluff.

Format each as: [Movement] — [duration or reps]` })
      })
      const data = await res.json()
      setSuggestion(data.text || '')
    } catch { setSuggestion('Hip circles 30s, leg swings 10/side, arm circles 30s, light cardio 2 min, dynamic stretching 1 min.') }
    setLoading(false)
  }

  return (
    <div style={{ marginBottom:16 }}>
      {!open ? (
        <button onClick={getSuggestion} style={{ fontSize:12, color:T.text3, border:`0.5px solid ${T.border}`, borderRadius:rr('sm'), padding:'6px 12px', background:'transparent', cursor:'pointer' }}>
          Warmup suggestions
        </button>
      ) : (
        <div style={{ background:T.surface2, borderRadius:rr('md'), padding:'12px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.5, textTransform:'uppercase' }}>Warmup</div>
            <button onClick={()=>setOpen(false)} style={{ border:'none', background:'none', color:T.text3, fontSize:12, cursor:'pointer' }}>×</button>
          </div>
          {loading ? <LoadingDots /> : <div style={{ fontSize:13, color:T.text2, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{suggestion}</div>}
        </div>
      )}
    </div>
  )
}

// ─── Session logger ────────────────────────────────────────────────────────────
function SessionLogger({ workout, programId, phaseId, userId, profile, onGoEat, onFinish, onBack }) {
  const [sessions, setSessions] = useState([])
  const [loggedSets, setLoggedSets] = useState(
    workout.exercises.map(ex => ({ exerciseId:ex.exerciseId||ex.id, name:ex.name, sets:[] }))
  )
  const [expandedEx, setExpandedEx] = useState(0)
  const [_unused1, _setUnused1] = useState(null)
  const [_unused2, _setUnused2] = useState(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState(null)
  const { elapsed, formatted } = useStopwatch()

  useEffect(() => {
    if (userId) getSessions(userId, programId).then(s=>setSessions(s)).catch(()=>{})
  }, [programId])

  const getLastSession = (exerciseId) => {
    const prev = sessions
      .filter(s=>s.program_id===programId||s.programId===programId)
      .sort((a,b)=>new Date(b.logged_at||b.date)-new Date(a.logged_at||a.date))
      .find(s=>(s.exercises||[]).some(e=>e.exerciseId===exerciseId))
    if (!prev) return null
    return prev.exercises.find(e=>e.exerciseId===exerciseId)
  }

  const logSet = (exIdx, setIdx, data) => {
    setLoggedSets(prev => {
      const next=[...prev]
      const sets=[...next[exIdx].sets]
      sets[setIdx]=data
      next[exIdx]={ ...next[exIdx], sets }
      return next
    })
    // auto-expand next exercise when all sets done
    const ex = workout.exercises[exIdx]
    const filled = loggedSets[exIdx].sets.filter(Boolean).length + 1
    if (filled >= (ex?.sets||3) && exIdx < workout.exercises.length-1) {
      setExpandedEx(exIdx+1)
    }
  }

  const epley1RM = (weight, reps) => reps === 1 ? weight : Math.round(weight * (1 + reps/30))

  const buildStats = () => {
    let totalVolume=0; let totalSets=0; const prs=[]; const nextTargets=[]; const oneRMs=[]
    loggedSets.forEach(ex => {
      ex.sets.forEach(s=>{ totalVolume+=(s.weight||0)*(s.reps||0); totalSets++ })
      const lastEx=getLastSession(ex.exerciseId)
      const bestSet=ex.sets.reduce((b,s)=>(s.weight||0)*(s.reps||0)>(b.weight||0)*(b.reps||0)?s:b, {weight:0,reps:0})
      const myMax=ex.sets.reduce((b,s)=>Math.max(b,s.weight||0),0)
      const lastMax=lastEx?lastEx.sets.reduce((b,s)=>Math.max(b,s.weight||0),0):0
      const isFirstEver = !lastEx && myMax > 0
      if(myMax>lastMax&&myMax>0) prs.push({ name:ex.name, weight:myMax, firstEver:isFirstEver })
      // Progressive overload target: if hit all sets clean, suggest +5lb next time
      const targetSets = workout.exercises.find(e=>(e.exerciseId||e.id)===ex.exerciseId)?.sets || 3
      const allSetsHit = ex.sets.filter(Boolean).length >= targetSets
      const targetReps = workout.exercises.find(e=>(e.exerciseId||e.id)===ex.exerciseId)?.targetReps || 8
      const avgReps = ex.sets.length ? ex.sets.reduce((a,s)=>a+(s.reps||0),0)/ex.sets.length : 0
      if (allSetsHit && myMax > 0) {
        const increment = avgReps >= targetReps ? 5 : 0
        if (increment > 0) nextTargets.push({ name:ex.name, current:myMax, next:myMax+increment, note:'Hit target reps — add weight next session' })
        else nextTargets.push({ name:ex.name, current:myMax, next:myMax, note:'Work on hitting all reps before adding weight' })
      }
      // Estimated 1RM
      if (bestSet.weight > 0 && bestSet.reps > 0) {
        oneRMs.push({ name:ex.name, e1rm:epley1RM(bestSet.weight, bestSet.reps), bestSet })
      }
    })
    const mins=Math.floor(elapsed/60); const secs=elapsed%60
    // Check if returning after a gap
    const lastSess = sessions.sort ? [...sessions].sort((a,b)=>new Date(b.logged_at||b.date)-new Date(a.logged_at||a.date))[0] : null
    const daysSince = lastSess ? Math.floor((Date.now()-new Date(lastSess.logged_at||lastSess.date).getTime())/(1000*60*60*24)) : 0
    const returningAfterGap = daysSince >= 5
    return { workoutName:workout.name, duration:`${mins}m ${secs}s`, volume:totalVolume, totalSets, prs, nextTargets, oneRMs, exerciseNames:loggedSets.map(e=>e.name), returningAfterGap }
  }

  const finishSession = async () => {
    const stats=buildStats()
    await saveSession(userId,{ programId, phaseId, workoutId:workout.id, workoutName:workout.name, exercises:loggedSets }).catch(()=>{})
    addVote()
    setSessionStats(stats)
    setSessionComplete(true)
  }



  return (
    <div style={{ padding:'0 20px', paddingBottom:80 }}>

      {sessionComplete && sessionStats && (
        <SessionCompleteModal stats={sessionStats} profile={profile} onGoEat={onGoEat} onDone={()=>onFinish(sessionStats)} />
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, paddingTop:4 }}>
        <button onClick={onBack} style={{ border:'none', background:'none', color:T.text3, fontSize:12, padding:0, cursor:'pointer' }}>← Exit</button>
        <div style={{ fontSize:14, fontWeight:500, color:T.text2 }}>{formatted}</div>
      </div>

      <div style={{ fontSize:18, fontWeight:500, color:T.text, letterSpacing:-.3, marginBottom:6 }}>{workout.name}</div>
      <WarmupSuggestion workout={workout} />

      {workout.exercises.map((ex, exIdx) => {
        const logged = loggedSets[exIdx]
        const lastSess = getLastSession(ex.exerciseId||ex.id)
        const targetSets = ex.sets || 3
        const isExpanded = expandedEx === exIdx
        const setsLogged = logged.sets.filter(Boolean).length
        const allDone = setsLogged >= targetSets

        return (
          <div key={ex.id||exIdx} style={{ marginBottom:8 }}>
            <div
              onClick={()=>setExpandedEx(isExpanded ? null : exIdx)}
              style={{ background:T.surface, border:`0.5px solid ${allDone ? 'var(--green-dim)' : isExpanded ? T.border2 : T.border}`,
                borderRadius: isExpanded ? `${rr('md')} ${rr('md')} 0 0` : rr('md'),
                padding:'14px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <div style={{ fontSize:15, fontWeight:500, color: allDone ? 'var(--green)' : T.text }}>{ex.name}</div>
                  {allDone && <div style={{ fontSize:10, color:'var(--green)', border:'0.5px solid var(--green-dim)', borderRadius:20, padding:'2px 8px', fontWeight:500 }}>✓ done</div>}
                </div>
                <div style={{ fontSize:11, color:T.text3 }}>
                  {targetSets} sets · {ex.targetReps} reps
                  {setsLogged > 0 && !allDone && <span style={{ color:'var(--blue)', marginLeft:6 }}>{setsLogged}/{targetSets} logged</span>}
                </div>
              </div>
              <div style={{ fontSize:13, color:T.text3, transition:'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'none', marginLeft:8 }}>∨</div>
            </div>

            {isExpanded && (
              <div style={{ background:T.surface, border:`0.5px solid ${T.border2}`, borderTop:'none',
                borderRadius:`0 0 ${rr('md')} ${rr('md')}`, overflow:'hidden' }}>
                {lastSess && (
                  <div style={{ padding:'8px 14px', borderBottom:`0.5px solid ${T.border}`, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                    <div style={{ fontSize:10, color:T.text3, marginRight:4 }}>Last</div>
                    {lastSess.sets.map((s,i)=>(
                      <div key={i} style={{ fontSize:11, color:T.text2, background:T.surface2, borderRadius:6, padding:'2px 8px' }}>{s.weight}×{s.reps}</div>
                    ))}
                  </div>
                )}
                <div style={{ padding:'8px 14px' }}>
                  <div style={{ display:'flex', paddingBottom:6, marginBottom:4 }}>
                    <div style={{ fontSize:10, color:T.text3, letterSpacing:.4, flex:1 }}>SET</div>
                    <div style={{ fontSize:10, color:T.text3, letterSpacing:.4, flex:1, textAlign:'center' }}>WEIGHT (LB)</div>
                    <div style={{ fontSize:10, color:T.text3, letterSpacing:.4, flex:1, textAlign:'center' }}>REPS</div>
                    <div style={{ width:32 }}></div>
                  </div>
                  {Array.from({ length:targetSets }).map((_,i) => {
                    const done = logged.sets[i]
                    const lastSet = lastSess?.sets?.[i]
                    return (
                      <InlineSetRow
                        key={i}
                        setNum={i+1}
                        initial={done}
                        lastSet={lastSet}
                        onSave={data => logSet(exIdx, i, data)}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop:16 }}>
        <button onClick={finishSession} style={{
          width:'100%', padding:'14px', borderRadius:rr('md'), border:'none',
          background:'var(--green-dim)', color:'#fff', fontSize:15, fontWeight:600,
          cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,0.3)', letterSpacing:.1,
        }}>
          Finish session ✓
        </button>
      </div>
    </div>
  )
}

// ─── Session history ──────────────────────────────────────────────────────────
function SessionHistory({ userId, programId, onBack, onViewProgress }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getSessions(userId, programId).then(s=>{ setSessions(s); setLoading(false) }).catch(()=>setLoading(false))
  }, [])

  if (loading) return <div style={{ padding:20 }}><LoadingDots /></div>

  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back to program" onClick={onBack} />
      <SectionHeader title="Session history" sub={`${sessions.length} session${sessions.length!==1?'s':''} logged`} />
      {sessions.length===0 && <EmptyState message="No sessions logged yet." sub="Complete a workout to see your history." />}
      {sessions.map((s,i) => {
        const date = new Date(s.logged_at||s.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
        const isOpen = expanded===i
        const totalVol = (s.exercises||[]).reduce((sum,ex) => sum + ex.sets.reduce((a,set) => a+(set.weight||0)*(set.reps||0), 0), 0)
        return (
          <Card key={s.id||i} style={{ cursor:'pointer' }} onClick={()=>setExpanded(isOpen?null:i)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{s.workout_name||s.workoutName}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{date}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:12, color:T.text2 }}>{totalVol.toLocaleString()} lbs</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{(s.exercises||[]).reduce((a,e)=>a+e.sets.length,0)} sets</div>
              </div>
            </div>
            {isOpen && (
              <div style={{ marginTop:12 }}>
                <Divider />
                {(s.exercises||[]).map((ex,j) => (
                  <div key={j} style={{ marginBottom:10 }}>
                    <div onClick={()=>onViewProgress&&onViewProgress(ex.name, ex.exerciseId)} style={{ fontSize:12, fontWeight:500, color:T.text2, marginBottom:4, cursor:onViewProgress?'pointer':'default', textDecoration:onViewProgress?'underline':'none' }}>{ex.name}</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {ex.sets.map((set,k) => (
                        <div key={k} style={{ background:T.surface2, borderRadius:rr('sm'), padding:'4px 10px', fontSize:12, color:T.text }}>
                          {set.weight} lb × {set.reps}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}


// ─── Exercise progress ────────────────────────────────────────────────────────
function ExerciseProgress({ userId, programId, exerciseName, exerciseId, onBack }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessions(userId, programId).then(s => {
      const relevant = s.filter(sess =>
        (sess.exercises||[]).some(e => e.exerciseId === exerciseId || e.name === exerciseName)
      ).sort((a,b) => new Date(a.logged_at||a.date) - new Date(b.logged_at||b.date))
      setSessions(relevant)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding:20 }}><LoadingDots /></div>

  const getExData = (sess) => (sess.exercises||[]).find(e => e.exerciseId === exerciseId || e.name === exerciseName)
  const epley = (w, r) => r===1 ? w : Math.round(w*(1+r/30))
  const getBestSet = (ex) => ex?.sets?.reduce((best, s) => (s.weight||0) > (best.weight||0) ? s : best, {weight:0,reps:0})
  const allBest = sessions.map(s => getBestSet(getExData(s))).filter(s => s?.weight > 0)
  const overallBest = allBest.reduce((b, s) => (s.weight||0) > (b.weight||0) ? s : b, {weight:0,reps:0})
  const last5 = sessions.slice(-5)

  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back" onClick={onBack} />
      <div style={{ fontSize:28, fontWeight:500, color:T.text, letterSpacing:-.5, marginBottom:4 }}>{exerciseName}</div>
      <div style={{ fontSize:12, color:T.text2, marginBottom:20 }}>Progress over time</div>

      {overallBest.weight > 0 && (
        <div style={{ background:'var(--green-bg)', border:'0.5px solid var(--green-dim)', borderRadius:rr('md'), padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Best set</div>
          <div style={{ fontSize:24, fontWeight:500, color:T.text }}>{overallBest.weight} lb <span style={{ fontSize:14, color:T.text2, fontWeight:400 }}>× {overallBest.reps} reps</span></div>
          <div style={{ fontSize:12, color:'var(--green)', marginTop:4 }}>Est. 1RM: {epley(overallBest.weight, overallBest.reps)} lb</div>
        </div>
      )}

      <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>Last {last5.length} sessions</div>
      {last5.length === 0 && <div style={{ fontSize:13, color:T.text3 }}>No data yet.</div>}
      {last5.map((sess, i) => {
        const ex = getExData(sess)
        const best = getBestSet(ex)
        const prev = i > 0 ? getBestSet(getExData(last5[i-1])) : null
        const trend = prev ? (best?.weight > prev?.weight ? '↑' : best?.weight < prev?.weight ? '↓' : '→') : null
        const date = new Date(sess.logged_at||sess.date).toLocaleDateString('en-US', { month:'short', day:'numeric' })
        return (
          <div key={i} style={{ background:T.surface, borderRadius:rr('md'), padding:'12px 16px', marginBottom:8, overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ fontSize:12, color:T.text3 }}>{date}</div>
              {trend && <div style={{ fontSize:14, color: trend==='↑'?'var(--green)':trend==='↓'?'var(--coral)':T.text3 }}>{trend}</div>}
            </div>
            <div style={{ fontSize:15, fontWeight:500, color:T.text, marginTop:4 }}>
              {best?.weight} lb × {best?.reps} reps
              <span style={{ fontSize:11, color:T.text3, fontWeight:400, marginLeft:8 }}>best set</span>
            </div>
            {best?.weight > 0 && best?.reps > 0 && (
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                Est. 1RM: <span style={{ color:T.text2, fontWeight:500 }}>{epley(best.weight, best.reps)} lb</span>
              </div>
            )}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
              {(ex?.sets||[]).map((s,j) => (
                <div key={j} style={{ fontSize:11, color:T.text2, background:T.surface2, borderRadius:rr('sm'), padding:'3px 8px' }}>
                  {s.weight}×{s.reps}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ─── Progress summary (home screen) ──────────────────────────────────────────
function ProgressSummary({ sessions, onViewExercise }) {
  if (!sessions.length) return null

  const epley = (w, r) => r===1 ? w : Math.round(w*(1+r/30))

  // Build per-exercise best sets across all sessions
  const exerciseMap = {}
  const sessionsByDate = [...sessions].sort((a,b) => new Date(a.logged_at||a.date) - new Date(b.logged_at||b.date))

  sessionsByDate.forEach(sess => {
    (sess.exercises||[]).forEach(ex => {
      if (!ex.name || !ex.sets?.length) return
      const bestSet = ex.sets.reduce((b,s) => (s.weight||0)>(b.weight||0)?s:b, {weight:0,reps:0})
      if (!bestSet.weight) return
      if (!exerciseMap[ex.name]) {
        exerciseMap[ex.name] = { name:ex.name, exerciseId:ex.exerciseId, history:[] }
      }
      exerciseMap[ex.name].history.push({ weight:bestSet.weight, reps:bestSet.reps, date:sess.logged_at||sess.date })
    })
  })

  // Get top exercises by frequency (most logged = most important to user)
  const exercises = Object.values(exerciseMap)
    .filter(e => e.history.length >= 2)
    .sort((a,b) => b.history.length - a.history.length)
    .slice(0, 5)

  if (!exercises.length) return null

  return (
    <div style={{ marginTop:20 }}>
      <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>Your progress</div>
      {exercises.map((ex, i) => {
        const last = ex.history[ex.history.length-1]
        const prev = ex.history[ex.history.length-2]
        const trend = last.weight > prev.weight ? '↑' : last.weight < prev.weight ? '↓' : '→'
        const trendColor = trend==='↑' ? 'var(--green)' : trend==='↓' ? 'var(--coral)' : T.text3
        const e1rm = epley(last.weight, last.reps)
        const diff = last.weight - prev.weight
        return (
          <div key={i} onClick={()=>onViewExercise(ex.name, ex.exerciseId)}
            style={{ background:T.surface, borderRadius:rr('md'), padding:'12px 14px', marginBottom:8,
              cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{ex.name}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                {last.weight} lb × {last.reps} · Est. 1RM: {e1rm} lb
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              {diff !== 0 && (
                <div style={{ fontSize:11, fontWeight:500, color:trendColor }}>
                  {diff > 0 ? `+${diff}` : diff} lb
                </div>
              )}
              <div style={{ fontSize:16, color:trendColor }}>{trend}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Program progress (inside program detail) ─────────────────────────────────
function ProgramProgress({ program, sessions, onViewExercise }) {
  const epley = (w, r) => r===1 ? w : Math.round(w*(1+r/30))

  // Get all unique exercises across this program's workouts
  const programExercises = []
  const seen = new Set()
  program.phases.forEach(ph => ph.workouts.forEach(w => w.exercises.forEach(ex => {
    if (!seen.has(ex.name)) { seen.add(ex.name); programExercises.push(ex) }
  })))

  // Build history per exercise from sessions
  const programSessions = sessions.filter(s => s.program_id===program.id||s.programId===program.id)
    .sort((a,b) => new Date(a.logged_at||a.date) - new Date(b.logged_at||b.date))

  const exerciseData = programExercises.map(ex => {
    const history = []
    programSessions.forEach(sess => {
      const found = (sess.exercises||[]).find(e => e.exerciseId===ex.exerciseId||e.name===ex.name)
      if (found?.sets?.length) {
        const best = found.sets.reduce((b,s)=>(s.weight||0)>(b.weight||0)?s:b,{weight:0,reps:0})
        if (best.weight) history.push({ weight:best.weight, reps:best.reps })
      }
    })
    return { ...ex, history }
  }).filter(e => e.history.length > 0)

  if (!exerciseData.length) return null

  return (
    <div style={{ marginTop:20, marginBottom:12 }}>
      <div style={{ height:'0.5px', background:T.border, marginBottom:16 }} />
      <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>Progress this program</div>
      {exerciseData.map((ex, i) => {
        const first = ex.history[0]
        const last = ex.history[ex.history.length-1]
        const trend = last.weight > first.weight ? '↑' : '→'
        const trendColor = trend==='↑' ? 'var(--green)' : T.text3
        const gain = last.weight - first.weight
        const e1rm = epley(last.weight, last.reps)
        return (
          <div key={i} onClick={()=>onViewExercise(ex.name, ex.exerciseId||ex.id)}
            style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:6,
              cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:500, color:T.text }}>{ex.name}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                {last.weight} lb · 1RM ~{e1rm} lb
                {gain !== 0 && <span style={{ color:trendColor, marginLeft:6 }}>{gain>0?`+${gain}`:gain} lb from start</span>}
              </div>
            </div>
            <div style={{ fontSize:14, color:trendColor, marginLeft:8 }}>{trend}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Weekly overview ──────────────────────────────────────────────────────────
function WeeklyOverview({ programs, sessions, activeProgramId, lastWorkoutId, onSelectProgram, onNewProgram, onViewExercise, onGoMove, loading }) {
  const activeProgram = programs.find(p => p.id === activeProgramId) || programs[0]

  const getNextWorkout = (program) => {
    if (!program) return null
    for (const ph of program.phases) {
      if (!ph.workouts.length) continue
      if (!lastWorkoutId) return { workout: ph.workouts[0], phase: ph }
      const lastIdx = ph.workouts.findIndex(w => w.id === lastWorkoutId)
      if (lastIdx >= 0) {
        const next = ph.workouts[(lastIdx + 1) % ph.workouts.length]
        return { workout: next, phase: ph }
      }
    }
    return activeProgram?.phases?.[0]?.workouts?.[0]
      ? { workout: activeProgram.phases[0].workouts[0], phase: activeProgram.phases[0] }
      : null
  }

  // Recent sessions — last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentSessions = sessions.filter(s => new Date(s.logged_at||s.date).getTime() > sevenDaysAgo)
  const sessionCount = recentSessions.length

  // Last session date — to detect gaps
  const allSorted = [...sessions].sort((a,b) => new Date(b.logged_at||b.date) - new Date(a.logged_at||a.date))
  const lastSessionDate = allSorted[0] ? new Date(allSorted[0].logged_at||allSorted[0].date) : null
  const daysSinceLast = lastSessionDate ? Math.floor((Date.now() - lastSessionDate.getTime()) / (1000*60*60*24)) : null
  const hasHistory = sessions.length > 0
  const beenAWhile = hasHistory && daysSinceLast >= 5
  const longGap = hasHistory && daysSinceLast >= 10

  // Consistency note — only positive framing, never guilt
  const consistencyNote = sessionCount >= 4
    ? "Strong week."
    : sessionCount >= 2
    ? `${sessionCount} sessions this week. Keep it going.`
    : sessionCount === 1
    ? "One session in. Build on it."
    : null

  const nextUp = getNextWorkout(activeProgram)

  if (loading) return <div style={{ padding:20 }}><LoadingDots /></div>

  return (
    <div style={{ padding:'20px 20px' }}>
      {activeProgram ? (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Current program</div>
              <div style={{ fontSize:22, fontWeight:400, color:T.text, letterSpacing:-.3 }}>{activeProgram.name}</div>
            </div>
          </div>

          {!nextUp && activeProgram && (
            <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:4 }}>No workouts yet</div>
              <div style={{ fontSize:12, color:T.text2, lineHeight:1.6, marginBottom:12 }}>Add phases and workouts to this program to get started.</div>
              <button onClick={()=>onSelectProgram(activeProgram)}
                style={{ fontSize:12, padding:'7px 14px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, cursor:'pointer' }}>
                Edit program →
              </button>
            </div>
          )}

          {consistencyNote && (
            <div style={{ fontSize:13, color:T.text3, marginBottom:16, fontStyle:'italic' }}>{consistencyNote}</div>
          )}

          {beenAWhile && !longGap && (
            <div style={{ background:T.surface, borderRadius:rr('md'), padding:'14px 16px', marginBottom:16, borderLeft:`3px solid ${T.border2}` }}>
              <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:4 }}>It has been a little while.</div>
              <div style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:10 }}>No big deal. Life gets busy. Pick up where you left off or just do something small today — even 15 minutes counts.</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>onSelectProgram(activeProgram, nextUp?.workout, nextUp?.phase?.id)} style={{ flex:1, padding:'8px', borderRadius:rr('sm'), border:'none', background:T.text, color:T.bg, fontSize:12, fontWeight:500, cursor:'pointer' }}>Resume program</button>
                <button onClick={onGoMove} style={{ flex:1, padding:'8px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:12, cursor:'pointer' }}>Move instead</button>
              </div>
            </div>
          )}

          {longGap && (
            <div style={{ background:T.surface, borderRadius:rr('md'), padding:'14px 16px', marginBottom:16, borderLeft:`3px solid var(--amber-dim)` }}>
              <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:4 }}>Welcome back.</div>
              <div style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:10 }}>No catching up needed. No guilt. Just pick one workout and do that. Everything else will follow.</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>onSelectProgram(activeProgram, nextUp?.workout, nextUp?.phase?.id)} style={{ flex:1, padding:'8px', borderRadius:rr('sm'), border:'none', background:T.text, color:T.bg, fontSize:12, fontWeight:500, cursor:'pointer' }}>Start a session</button>
                <button onClick={onGoMove} style={{ flex:1, padding:'8px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:12, cursor:'pointer' }}>Just move today</button>
              </div>
            </div>
          )}

          {nextUp && (
            <div style={{ background:T.surface, border:`1.5px solid ${T.text}`, borderRadius:rr('md'), padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:6 }}>Up next</div>
              <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{nextUp.workout.name}</div>
              <div style={{ fontSize:12, color:T.text2, marginTop:3 }}>
                {nextUp.phase.name} · {nextUp.workout.exercises.length} exercise{nextUp.workout.exercises.length!==1?'s':''}
              </div>
              <button onClick={()=>onSelectProgram(activeProgram, nextUp.workout, nextUp.phase.id)}
                style={{ marginTop:14, width:'100%', padding:'13px', borderRadius:rr('md'), border:'none',
                  background:'var(--green-dim)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.25)', letterSpacing:.1 }}>
                Start session →
              </button>
            </div>
          )}

          {recentSessions.length > 0 && (
            <>
              <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>This week</div>
              {recentSessions.slice(0,4).map((s,i) => {
                const date = new Date(s.logged_at||s.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
                const vol = (s.exercises||[]).reduce((sum,ex) => sum + ex.sets.reduce((a,set) => a+(set.weight||0)*(set.reps||0), 0), 0)
                return (
                  <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 14px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{s.workout_name||s.workoutName}</div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{date}</div>
                    </div>
                    <div style={{ fontSize:12, color:T.text2 }}>{vol.toLocaleString()} lbs</div>
                  </div>
                )
              })}
            </>
          )}

          <div style={{ marginTop:16, display:'flex', gap:8 }}>
            <button onClick={()=>onSelectProgram(activeProgram)}
              style={{ flex:1, padding:'10px', borderRadius:rr('md'), border:`1px solid ${T.border2}`, background:T.surface2, color:T.text2, fontSize:13, fontWeight:500, cursor:'pointer' }}>
              View program
            </button>
            <button onClick={onNewProgram}
              style={{ flex:1, padding:'10px', borderRadius:rr('md'), border:`1px solid ${T.border2}`, background:T.surface2, color:T.text2, fontSize:13, fontWeight:500, cursor:'pointer' }}>
              + New program
            </button>
          </div>

          <ProgressSummary sessions={sessions} onViewExercise={onViewExercise} />

          {programs.length > 0 && (
            <div style={{ marginTop:24 }}>
              <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>All programs</div>
              {programs.map(p => (
                <div key={p.id} onClick={()=>onSelectProgram(p)}
                  style={{ background:T.surface, border:`0.5px solid ${p.id===activeProgramId?'var(--green-dim)':T.border}`,
                    borderRadius:rr('md'), padding:'12px 14px', marginBottom:8, cursor:'pointer',
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    {p.id===activeProgramId && <div style={{ fontSize:10, color:'var(--green)', letterSpacing:.4, marginBottom:3 }}>Current</div>}
                    <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{p.name}</div>
                    <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                      {p.phases.length} phase{p.phases.length!==1?'s':''} · {p.phases.reduce((a,ph)=>a+ph.workouts.length,0)} workouts
                    </div>
                  </div>
                  <div style={{ fontSize:16, color:T.text3 }}>›</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
<>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:22, fontWeight:500, color:T.text, letterSpacing:-.3, marginBottom:6 }}>Start lifting.</div>
            <div style={{ fontSize:13, color:T.text2, lineHeight:1.6 }}>Build a program once. Log your sessions. Watch yourself get stronger over time.</div>
          </div>

          <button onClick={onNewProgram} style={{ width:'100%', padding:'13px', borderRadius:rr('md'), border:'none', background:T.text, color:T.bg, fontSize:14, fontWeight:500, cursor:'pointer', marginBottom:20 }}>
            + Build my program
          </button>

          <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:10 }}>Common structures</div>
          {[
            { name:'Push / Pull / Legs',     desc:'3 or 6 days · Classic split for muscle building', phases:'1 phase · 3 workouts' },
            { name:'Upper / Lower',           desc:'4 days · Balanced strength and size',             phases:'1 phase · 2 workouts' },
            { name:'Full Body 3x',            desc:'3 days · Great for beginners and busy schedules', phases:'1 phase · 1 workout'  },
            { name:'Hybrid Strength + Cardio',desc:'5 days · Lift and run combined',                  phases:'2 phases · 4 workouts'},
          ].map((s,i) => (
            <div key={i} onClick={onNewProgram} style={{ background:T.surface, borderRadius:rr('md'), padding:'12px 14px', marginBottom:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{s.name}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{s.desc}</div>
              </div>
              <div style={{ fontSize:12, color:T.text3, flexShrink:0, marginLeft:8 }}>Use →</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Programs list ────────────────────────────────────────────────────────────
function ProgramsList({ programs, loading, activeProgramId, onSelectProgram, onNewProgram }) {
  if (loading) return <div style={{ padding:20 }}><LoadingDots /></div>
  if (programs.length===0) {
    return (
      <div style={{ padding:'20px 20px' }}>
        <EmptyState message="No programs yet." sub="Build your first one to get started." />
        <FullBtn onClick={onNewProgram}>+ New program</FullBtn>
      </div>
    )
  }
  return (
    <div style={{ padding:'20px 20px' }}>
      {programs.map(p => {
        const isActive = p.id === activeProgramId
        return (
          <Card key={p.id} onClick={()=>onSelectProgram(p)} style={isActive ? { border:`1.5px solid var(--green-dim)`, background:T.surface } : {}}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ flex:1 }}>
                {isActive && <div style={{ fontSize:10, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Current program</div>}
                <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{p.name}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                  {p.phases.length} phase{p.phases.length!==1?'s':''} · {p.phases.reduce((a,ph)=>a+ph.workouts.length,0)} workouts
                </div>
              </div>
              <div style={{ fontSize:18, color:T.text3 }}>›</div>
            </div>
          </Card>
        )
      })}
      <FullBtn outline onClick={onNewProgram}>+ New program</FullBtn>
    </div>
  )
}

// ─── Program detail ───────────────────────────────────────────────────────────
function ProgramDetail({ program, lastWorkoutId, sessions, onBack, onEdit, onStartWorkout, onViewHistory, onViewProgress }) {
  const getNextWorkout = (phase) => {
    if (!phase || phase.workouts.length === 0) return null
    if (!lastWorkoutId) return phase.workouts[0]
    const lastIdx = phase.workouts.findIndex(w => w.id === lastWorkoutId)
    if (lastIdx === -1) return phase.workouts[0]
    return phase.workouts[(lastIdx + 1) % phase.workouts.length]
  }

  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Programs" onClick={onBack} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:400, color:T.text, letterSpacing:-.3 }}>{program.name}</div>
          <div style={{ fontSize:12, color:T.text2, marginTop:3 }}>{program.phases.length} phase{program.phases.length!==1?'s':''}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn small outline onClick={onViewHistory}>History</Btn>
          <Btn small outline onClick={onEdit}>Edit</Btn>
        </div>
      </div>

      {program.phases.map((ph) => {
        const nextW = getNextWorkout(ph)
        return (
          <div key={ph.id} style={{ marginBottom:12 }}>
            <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', background:T.surface2, borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{ph.name}</div>
                <div style={{ fontSize:11, color:T.text3, background:T.surface, borderRadius:20, padding:'3px 10px' }}>{ph.weeks} wks</div>
              </div>
              {ph.workouts.length===0 && <div style={{ padding:'12px 14px', fontSize:12, color:T.text3 }}>No workouts in this phase.</div>}
              {ph.workouts.map((w) => {
                const isNext = nextW?.id === w.id
                return (
                  <div key={w.id} style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background: isNext ? 'rgba(58,138,88,0.06)' : 'transparent' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{w.name}</div>
                        {isNext && <div style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'var(--green-bg)', color:'var(--green)', fontWeight:500 }}>up next</div>}
                      </div>
                      <div style={{ fontSize:11, color:T.text3 }}>{w.exercises.length} exercise{w.exercises.length!==1?'s':''}</div>
                    </div>
                    <button onClick={()=>onStartWorkout(w, program.id, ph.id)} style={{
                      padding:'8px 18px', borderRadius:rr('md'), border:'none',
                      background:isNext?'var(--green-dim)':T.surface,
                      color:isNext?'#fff':T.text2,
                      fontSize:13, fontWeight:600, cursor:'pointer',
                      border: isNext?'none':`1px solid ${T.border2}`,
                      boxShadow: isNext?'0 1px 4px rgba(0,0,0,0.25)':'none',
                    }}>
                      {isNext ? 'Start' : 'Start'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <ProgramProgress program={program} sessions={sessions||[]} onViewExercise={onViewProgress||((n,id)=>{})} />
    </div>
  )
}

// ─── Root Lift screen ─────────────────────────────────────────────────────────
export default function LiftScreen({ userId, userProfile, onGoEat, onGoMove }) {
  const [view, setView] = useState('home')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [editingProgram, setEditingProgram] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [programs, setPrograms] = useState([])
  const [sessions, setSessions] = useState([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [activeProgramId, setActiveProgramId] = useState(null)
  const [lastWorkoutId, setLastWorkoutId] = useState(null)
  const [progressExercise, setProgressExercise] = useState(null)

  useEffect(() => {
    if (!userId) return
    getPrograms(userId).then(p => { setPrograms(p); setProgramsLoading(false) })
    getSessions(userId).then(s => setSessions(s)).catch(()=>{})
    try { setActiveProgramId(localStorage.getItem('active_program_id')) } catch {}
  }, [userId])

  useEffect(() => {
    if (activeProgramId) {
      try { setLastWorkoutId(localStorage.getItem(`last_workout_${activeProgramId}`)) } catch {}
    }
  }, [activeProgramId])

  useEffect(() => {
    if (selectedProgram) {
      try { setLastWorkoutId(localStorage.getItem(`last_workout_${selectedProgram.id}`)) } catch {}
    }
  }, [selectedProgram])

  const reloadAll = async () => {
    const [freshPrograms, freshSessions] = await Promise.all([
      getPrograms(userId),
      getSessions(userId).catch(()=>[])
    ])
    setPrograms(freshPrograms)
    setSessions(freshSessions)
    if (selectedProgram) {
      const found = freshPrograms.find(p=>p.id===selectedProgram.id)
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
    setLastWorkoutId(activeSession.workout.id)
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
    if (!window.confirm('Delete this program? This cannot be undone.')) return
    await deleteProgram(editingProgram.id)
    setSelectedProgram(null)
    setView('home')
    await reloadAll()
  }

  // Handle "Start session" from weekly overview — jump straight in
  const handleOverviewStart = (program, workout, phaseId) => {
    setSelectedProgram(program)
    if (workout && phaseId) {
      handleStartWorkout(workout, program.id, phaseId)
    } else {
      setView('detail')
    }
  }

  return (
    <div style={{ paddingBottom:20 }}>
      {view==='home' && (
        <WeeklyOverview
          programs={programs} sessions={sessions}
          activeProgramId={activeProgramId} lastWorkoutId={lastWorkoutId}
          loading={programsLoading}
          onViewExercise={(name,id)=>{ setProgressExercise({name,id,from:'home'}); setView('progress') }}
          onGoMove={onGoMove}
          onSelectProgram={(prog, workout, phaseId) => {
            setSelectedProgram(prog)
            if (workout && phaseId) handleStartWorkout(workout, prog.id, phaseId)
            else setView('detail')
          }}
          onNewProgram={()=>{ setEditingProgram({ id:uid(), name:'', phases:[] }); setView('builder') }} />
      )}
      {view==='list' && (
        <ProgramsList programs={programs} loading={programsLoading} activeProgramId={activeProgramId}
          onSelectProgram={p=>{ setSelectedProgram(p); setView('detail') }}
          onNewProgram={()=>{ setEditingProgram({ id:uid(), name:'', phases:[] }); setView('builder') }} />
      )}
      {view==='detail' && selectedProgram && (
        <ProgramDetail program={selectedProgram} lastWorkoutId={lastWorkoutId}
          sessions={sessions}
          onBack={()=>setView('home')}
          onEdit={()=>{ setEditingProgram(selectedProgram); setView('builder') }}
          onStartWorkout={handleStartWorkout}
          onViewHistory={()=>setView('history')}
          onViewProgress={(name, id)=>{ setProgressExercise({ name, id }); setView('progress') }} />
      )}
      {view==='builder' && editingProgram && (
        <ProgramBuilder program={editingProgram} onSave={handleSaveProgram}
          onBack={()=>{ setView(selectedProgram?'detail':'home'); reloadAll() }}
          onDelete={selectedProgram?handleDeleteProgram:null} />
      )}
      {view==='session' && activeSession && (
        <SessionLogger workout={activeSession.workout} programId={activeSession.programId}
          phaseId={activeSession.phaseId} userId={userId} profile={userProfile} onGoEat={onGoEat}
          onFinish={handleFinishSession}
          onBack={()=>{ setActiveSession(null); setView('detail') }} />
      )}
      {view==='history' && selectedProgram && (
        <SessionHistory userId={userId} programId={selectedProgram.id}
          onBack={()=>setView('detail')}
          onViewProgress={(name,id)=>{ setProgressExercise({ name, id }); setView('progress') }} />
      )}
      {view==='progress' && progressExercise && (
        <ExerciseProgress userId={userId} programId={selectedProgram?.id}
          exerciseName={progressExercise.name} exerciseId={progressExercise.id}
          onBack={()=>setView(progressExercise.from||'detail')} />
      )}
    </div>
  )
}
