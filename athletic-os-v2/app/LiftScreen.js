'use client'
import { useState, useEffect, useRef } from 'react'
import { EXERCISE_LIBRARY, EXERCISE_GROUPS } from './exercises'
import { getPrograms, saveProgram, deleteProgram, getSessions, saveSession } from './db'

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
      padding: small?'6px 12px':'10px 16px', borderRadius:rr('sm'),
      fontSize:small?12:13, fontWeight:500,
      border: outline||danger?`0.5px solid ${danger?'var(--coral)':T.border}`:'none',
      background: danger?'transparent':outline?'transparent':disabled?T.surface2:T.text,
      color: danger?'var(--coral)':outline?T.text2:disabled?T.text3:T.bg,
      cursor:disabled?'not-allowed':'pointer', ...style,
    }}>{children}</button>
  )
}
function FullBtn({ children, onClick, disabled, outline, color }) {
  return <Btn children={children} onClick={onClick} disabled={disabled} outline={outline}
    style={{ width:'100%', marginTop:10, padding:'12px 16px', fontSize:14, ...(color?{background:color,color:'#fff',border:'none'}:{}) }} />
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
  return <button onClick={onClick} style={{ border:'none', background:'none', color:T.text3, fontSize:12, padding:'0 0 12px', cursor:'pointer', display:'block' }}>← {label}</button>
}
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:20, fontWeight:400, color:T.text, letterSpacing:-.3 }}>{title}</div>
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
function useStopwatch(running) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const frameRef = useRef(null)
  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000
      const tick = () => { setElapsed(Math.floor((Date.now() - startRef.current) / 1000)); frameRef.current = requestAnimationFrame(tick) }
      frameRef.current = requestAnimationFrame(tick)
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [running])
  const fmt = (s) => { const m = Math.floor(s/60); const sec = s%60; return `${m}:${sec.toString().padStart(2,'0')}` }
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
function SessionCompleteModal({ stats, onDone }) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const prText = stats.prs.length ? `PRs hit: ${stats.prs.join(', ')}. ` : ''
    const prompt = `You are an encouraging coach giving a brief post-workout summary. Keep it warm, real, and concise — like a friend who also trains.

Session: ${stats.workoutName}
Duration: ${stats.duration}
Total volume: ${stats.volume.toLocaleString()} lbs
Exercises: ${stats.exerciseNames.join(', ')}
${prText}

Give 2-3 sentences max. Mention any PRs if there are any. Note one small win or positive observation. If they hit a milestone (e.g. first time over a certain volume) call it out. No fluff, no exclamation point spam. Just be real.`
    callAI(prompt).then(text => { setAnalysis(text); setLoading(false) })
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('lg'), width:'100%', maxWidth:360, padding:24 }}>
        <div style={{ fontSize:22, fontWeight:500, color:T.text, marginBottom:4 }}>Session done.</div>
        <div style={{ fontSize:13, color:T.text3, marginBottom:20 }}>{stats.workoutName}</div>

        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{stats.duration}</div>
            <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>duration</div>
          </div>
          <div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{stats.volume.toLocaleString()}</div>
            <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>total lbs</div>
          </div>
          <div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{stats.totalSets}</div>
            <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>sets logged</div>
          </div>
        </div>

        {stats.prs.length > 0 && (
          <div style={{ background:'var(--green-bg)', border:'0.5px solid var(--green-dim)', borderRadius:rr('sm'), padding:'10px 12px', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>PR{stats.prs.length>1?'s':''} hit</div>
            {stats.prs.map((pr,i) => <div key={i} style={{ fontSize:13, color:'var(--green)', marginTop:2 }}>{pr}</div>)}
          </div>
        )}

        <div style={{ fontSize:13, color:T.text2, lineHeight:1.7, marginBottom:20 }}>
          {loading ? <LoadingDots /> : analysis}
        </div>

        <Btn onClick={onDone} style={{ width:'100%', padding:'12px' }}>Done</Btn>
      </div>
    </div>
  )
}

// ─── Exercise editor ──────────────────────────────────────────────────────────
function ExerciseEditor({ exercise, onChange, onRemove }) {
  return (
    <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div><div style={{ fontSize:13, fontWeight:500, color:T.text }}>{exercise.name}</div><div style={{ fontSize:11, color:T.text3 }}>{exercise.group}</div></div>
        <button onClick={onRemove} style={{ border:'none', background:'none', color:T.text3, fontSize:13, padding:0, cursor:'pointer' }}>×</button>
      </div>
      <div style={{ display:'flex', gap:8 }}>
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

// ─── Session logger ────────────────────────────────────────────────────────────
function SessionLogger({ workout, programId, phaseId, userId, onFinish, onBack }) {
  const [sessions, setSessions] = useState([])
  const [currentEx, setCurrentEx] = useState(0)
  const [loggedSets, setLoggedSets] = useState(workout.exercises.map(ex => ({ exerciseId:ex.exerciseId||ex.id, name:ex.name, sets:[] })))
  const [loggingSet, setLoggingSet] = useState(null)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState(null)
  const { elapsed, formatted } = useStopwatch(true)

  useEffect(() => {
    if (userId) getSessions(userId, programId).then(s=>setSessions(s)).catch(()=>{})
  }, [programId])

  const getLastSession = (exerciseId) => {
    const prev = sessions.filter(s=>s.program_id===programId||s.programId===programId)
      .sort((a,b) => new Date(b.logged_at||b.date) - new Date(a.logged_at||a.date))
      .find(s => (s.exercises||[]).some(e=>e.exerciseId===exerciseId))
    if (!prev) return null
    return prev.exercises.find(e=>e.exerciseId===exerciseId)
  }

  const exercise = workout.exercises[currentEx]
  const logged = loggedSets[currentEx]
  const lastSession = exercise ? getLastSession(exercise.exerciseId||exercise.id) : null
  const targetSets = exercise?.sets || 3
  const nextExercise = workout.exercises[currentEx+1]

  const logSet = (setIdx, data) => {
    setLoggedSets(prev => {
      const next=[...prev]; const sets=[...next[currentEx].sets]; sets[setIdx]=data; next[currentEx]={ ...next[currentEx], sets }; return next
    })
    setLoggingSet(null)
  }

  const buildStats = () => {
    let totalVolume = 0; let totalSets = 0; const prs = []
    loggedSets.forEach(ex => {
      ex.sets.forEach(s => { totalVolume += (s.weight||0) * (s.reps||0); totalSets++ })
      const lastEx = getLastSession(ex.exerciseId)
      const myMax = ex.sets.reduce((best,s) => Math.max(best, s.weight||0), 0)
      const lastMax = lastEx ? lastEx.sets.reduce((best,s) => Math.max(best, s.weight||0), 0) : 0
      if (myMax > lastMax && myMax > 0) prs.push(`${ex.name}: ${myMax} lb`)
    })
    const mins = Math.floor(elapsed/60); const secs = elapsed%60
    return {
      workoutName: workout.name,
      duration: `${mins}:${secs.toString().padStart(2,'0')}`,
      volume: totalVolume,
      totalSets,
      prs,
      exerciseNames: loggedSets.map(e=>e.name),
    }
  }

  const finishSession = async () => {
    const stats = buildStats()
    await saveSession(userId, { programId, phaseId, workoutId:workout.id, workoutName:workout.name, exercises:loggedSets }).catch(()=>{})
    setSessionStats(stats)
    setSessionComplete(true)
  }

  if (!exercise) return null

  return (
    <div style={{ padding:'0 20px', paddingBottom:20 }}>
      {loggingSet!==null && (
        <SetLogger set={{ num:loggingSet+1, targetReps:exercise.targetReps }}
          lastSet={lastSession?.sets?.[loggingSet]}
          onSave={data=>logSet(loggingSet,data)} onClose={()=>setLoggingSet(null)} />
      )}
      {sessionComplete && sessionStats && (
        <SessionCompleteModal stats={sessionStats} onDone={()=>{ onFinish(sessionStats) }} />
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingTop:4 }}>
        <button onClick={onBack} style={{ border:'none', background:'none', color:T.text3, fontSize:12, padding:0, cursor:'pointer' }}>← Exit</button>
        <div style={{ fontSize:14, fontWeight:500, color:T.text2 }}>{formatted}</div>
      </div>

      <div style={{ marginBottom:6 }}>
        <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>
          Exercise {currentEx+1} of {workout.exercises.length}
        </div>
        <div style={{ fontSize:22, fontWeight:500, color:T.text, letterSpacing:-.3 }}>{exercise.name}</div>
        <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{exercise.sets} sets × {exercise.targetReps} reps</div>
      </div>

      {nextExercise && (
        <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'8px 12px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ fontSize:11, color:T.text3 }}>Next up</div>
          <div style={{ fontSize:12, fontWeight:500, color:T.text2 }}>{nextExercise.name}</div>
        </div>
      )}

      {lastSession && (
        <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:14 }}>
          <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>Last session</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {lastSession.sets.map((s,i) => <div key={i} style={{ fontSize:12, color:T.text2 }}>{s.weight}×{s.reps}</div>)}
          </div>
        </div>
      )}

      <Label>Your sets — tap to log</Label>
      {Array.from({ length:targetSets }).map((_,i) => {
        const done = logged.sets[i]
        return (
          <div key={i} onClick={()=>setLoggingSet(i)} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'center', cursor:'pointer' }}>
            <div style={{ width:24,height:24,borderRadius:'50%',flexShrink:0, background:done?T.text:T.surface2, display:'flex',alignItems:'center',justifyContent:'center', fontSize:11,fontWeight:500, color:done?T.bg:T.text2 }}>{i+1}</div>
            <div style={{ flex:1, background:done?T.surface:T.surface2, border:`0.5px solid ${done?T.text:T.border}`, borderRadius:rr('sm'), padding:'9px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              {done ? <><div style={{ fontSize:14,fontWeight:500,color:T.text }}>{done.weight} lb × {done.reps} reps</div><div style={{ fontSize:11,color:T.text3 }}>tap to edit</div></> : <div style={{ fontSize:13,color:T.text3 }}>Tap to log</div>}
            </div>
          </div>
        )
      })}

      <div style={{ display:'flex', gap:8, marginTop:14 }}>
        {currentEx>0 && <Btn outline onClick={()=>setCurrentEx(i=>i-1)} style={{ flex:1 }}>← Previous</Btn>}
        {currentEx<workout.exercises.length-1
          ? <Btn onClick={()=>setCurrentEx(i=>i+1)} style={{ flex:1 }}>Next exercise →</Btn>
          : <Btn onClick={finishSession} style={{ flex:1, background:'var(--green-dim)', color:'#fff', border:'none' }}>Finish session</Btn>
        }
      </div>
    </div>
  )
}

// ─── Session history ──────────────────────────────────────────────────────────
function SessionHistory({ userId, programId, onBack }) {
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
                    <div style={{ fontSize:12, fontWeight:500, color:T.text2, marginBottom:4 }}>{ex.name}</div>
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
function ProgramDetail({ program, lastWorkoutId, onBack, onEdit, onStartWorkout, onViewHistory }) {
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
              <div style={{ padding:'10px 14px', background:T.surface2, borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
                <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{ph.name}</div>
                <div style={{ fontSize:11, color:T.text3 }}>{ph.weeks} weeks</div>
              </div>
              {ph.workouts.length===0 && <div style={{ padding:'12px 14px', fontSize:12, color:T.text3 }}>No workouts in this phase.</div>}
              {ph.workouts.map((w) => {
                const isNext = nextW?.id === w.id
                return (
                  <div key={w.id} style={{ padding:'10px 14px', borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background: isNext ? 'rgba(29,158,117,0.05)' : 'transparent' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{w.name}</div>
                        {isNext && <div style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'var(--green-bg)', color:'var(--green)', border:'0.5px solid var(--green-dim)' }}>up next</div>}
                      </div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>{w.exercises.length} exercise{w.exercises.length!==1?'s':''}</div>
                    </div>
                    <Btn small onClick={()=>onStartWorkout(w, program.id, ph.id)}>Start</Btn>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Root Lift screen ─────────────────────────────────────────────────────────
export default function LiftScreen({ userId }) {
  const [view, setView] = useState('list')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [editingProgram, setEditingProgram] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [programs, setPrograms] = useState([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [activeProgramId, setActiveProgramId] = useState(null)
  const [lastWorkoutId, setLastWorkoutId] = useState(null)

  useEffect(() => {
    if (!userId) return
    getPrograms(userId).then(p => { setPrograms(p); setProgramsLoading(false) })
    try { setActiveProgramId(localStorage.getItem('active_program_id')) } catch {}
    try { setLastWorkoutId(localStorage.getItem(`last_workout_${selectedProgram?.id}`)) } catch {}
  }, [userId])

  useEffect(() => {
    if (selectedProgram) {
      try { setLastWorkoutId(localStorage.getItem(`last_workout_${selectedProgram.id}`)) } catch {}
    }
  }, [selectedProgram])

  const reloadPrograms = async () => {
    const fresh = await getPrograms(userId)
    setPrograms(fresh)
    if (selectedProgram) {
      const found = fresh.find(p=>p.id===selectedProgram.id)
      if (found) setSelectedProgram(found)
    }
  }

  const handleStartWorkout = (workout, programId, phaseId) => {
    setActiveSession({ workout, programId, phaseId })
    setView('session')
    try {
      localStorage.setItem('active_program_id', programId)
      setActiveProgramId(programId)
    } catch {}
  }

  const handleFinishSession = (stats) => {
    try { localStorage.setItem(`last_workout_${activeSession.programId}`, activeSession.workout.id) } catch {}
    setLastWorkoutId(activeSession.workout.id)
    setActiveSession(null)
    setView('detail')
  }

  const handleSaveProgram = async (prog) => {
    await saveProgram(userId, prog)
    setSelectedProgram(prog)
    setView('detail')
    const fresh = await getPrograms(userId)
    setPrograms(fresh)
  }

  const handleDeleteProgram = async () => {
    if (!window.confirm('Delete this program? This cannot be undone.')) return
    await deleteProgram(editingProgram.id)
    setSelectedProgram(null)
    setView('list')
    const fresh = await getPrograms(userId)
    setPrograms(fresh)
  }

  return (
    <div style={{ paddingBottom:20 }}>
      {view==='list' && (
        <ProgramsList programs={programs} loading={programsLoading} activeProgramId={activeProgramId}
          onSelectProgram={p=>{ setSelectedProgram(p); setView('detail') }}
          onNewProgram={()=>{ setEditingProgram({ id:uid(), name:'', phases:[] }); setView('builder') }} />
      )}
      {view==='detail' && selectedProgram && (
        <ProgramDetail program={selectedProgram} lastWorkoutId={lastWorkoutId}
          onBack={()=>setView('list')}
          onEdit={()=>{ setEditingProgram(selectedProgram); setView('builder') }}
          onStartWorkout={handleStartWorkout}
          onViewHistory={()=>setView('history')} />
      )}
      {view==='builder' && editingProgram && (
        <ProgramBuilder program={editingProgram} onSave={handleSaveProgram}
          onBack={()=>{ setView(selectedProgram?'detail':'list'); reloadPrograms() }}
          onDelete={selectedProgram?handleDeleteProgram:null} />
      )}
      {view==='session' && activeSession && (
        <SessionLogger workout={activeSession.workout} programId={activeSession.programId}
          phaseId={activeSession.phaseId} userId={userId}
          onFinish={handleFinishSession}
          onBack={()=>{ setActiveSession(null); setView('detail') }} />
      )}
      {view==='history' && selectedProgram && (
        <SessionHistory userId={userId} programId={selectedProgram.id} onBack={()=>setView('detail')} />
      )}
    </div>
  )
}
