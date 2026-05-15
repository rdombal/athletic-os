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
function SessionLogger({ workout, programId, phaseId, userId, onFinish, onBack }) {
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

  const buildStats = () => {
    let totalVolume=0; let totalSets=0; const prs=[]
    loggedSets.forEach(ex => {
      ex.sets.forEach(s=>{ totalVolume+=(s.weight||0)*(s.reps||0); totalSets++ })
      const lastEx=getLastSession(ex.exerciseId)
      const myMax=ex.sets.reduce((b,s)=>Math.max(b,s.weight||0),0)
      const lastMax=lastEx?lastEx.sets.reduce((b,s)=>Math.max(b,s.weight||0),0):0
      if(myMax>lastMax&&myMax>0) prs.push(`${ex.name}: ${myMax} lb`)
    })
    const mins=Math.floor(elapsed/60); const secs=elapsed%60
    return { workoutName:workout.name, duration:`${mins}:${secs.toString().padStart(2,'0')}`, volume:totalVolume, totalSets, prs, exerciseNames:loggedSets.map(e=>e.name) }
  }

  const finishSession = async () => {
    const stats=buildStats()
    await saveSession(userId,{ programId, phaseId, workoutId:workout.id, workoutName:workout.name, exercises:loggedSets }).catch(()=>{})
    setSessionStats(stats)
    setSessionComplete(true)
  }



  return (
    <div style={{ padding:'0 20px', paddingBottom:80 }}>

      {sessionComplete && sessionStats && (
        <SessionCompleteModal stats={sessionStats} onDone={()=>onFinish(sessionStats)} />
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
              style={{ background:T.surface, border:`0.5px solid ${allDone ? 'var(--green-dim)' : isExpanded ? T.text : T.border}`,
                borderRadius: isExpanded ? `${rr('md')} ${rr('md')} 0 0` : rr('md'),
                padding:'12px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:14, fontWeight:500, color: allDone ? 'var(--green)' : T.text }}>{ex.name}</div>
                  {allDone && <div style={{ fontSize:10, color:'var(--green)', border:'0.5px solid var(--green-dim)', borderRadius:20, padding:'1px 7px' }}>done</div>}
                </div>
                <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                  {targetSets} sets × {ex.targetReps} reps
                  {setsLogged > 0 && !allDone && <span style={{ color:T.text2, marginLeft:6 }}>{setsLogged}/{targetSets} logged</span>}
                </div>
              </div>
              <div style={{ fontSize:14, color:T.text3, transition:'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>∨</div>
            </div>

            {isExpanded && (
              <div style={{ background:T.surface, border:`0.5px solid ${isExpanded ? T.text : T.border}`, borderTop:'none',
                borderRadius:`0 0 ${rr('md')} ${rr('md')}`, padding:'12px 14px' }}>
                {lastSess && (
                  <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'8px 12px', marginBottom:12 }}>
                    <div style={{ fontSize:10, color:T.text3, marginBottom:4 }}>Last session</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {lastSess.sets.map((s,i)=><div key={i} style={{ fontSize:12, color:T.text2 }}>{s.weight}×{s.reps}</div>)}
                    </div>
                  </div>
                )}
                {Array.from({ length:targetSets }).map((_,i) => {
                  const done = logged.sets[i]
                  const lastSet = lastSess?.sets?.[i]
                  return (
                    <InlineSetRow
                      key={i}
                      setNum={i+1}
                      initial={done}
                      lastSet={lastSess?.sets?.[i]}
                      onSave={data => logSet(exIdx, i, data)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ marginTop:16 }}>
        <Btn onClick={finishSession} style={{ width:'100%', padding:'12px', background:'var(--green-dim)', color:'#fff', border:'none', fontSize:14 }}>
          Finish session
        </Btn>
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
  const getBestSet = (ex) => ex?.sets?.reduce((best, s) => (s.weight||0) > (best.weight||0) ? s : best, {weight:0,reps:0})
  const allBest = sessions.map(s => getBestSet(getExData(s))).filter(s => s?.weight > 0)
  const overallBest = allBest.reduce((b, s) => (s.weight||0) > (b.weight||0) ? s : b, {weight:0,reps:0})
  const last5 = sessions.slice(-5)

  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back" onClick={onBack} />
      <div style={{ fontSize:20, fontWeight:400, color:T.text, letterSpacing:-.3, marginBottom:4 }}>{exerciseName}</div>
      <div style={{ fontSize:12, color:T.text2, marginBottom:20 }}>Progress over time</div>

      {overallBest.weight > 0 && (
        <div style={{ background:'var(--green-bg)', border:'0.5px solid var(--green-dim)', borderRadius:rr('md'), padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Best set</div>
          <div style={{ fontSize:24, fontWeight:500, color:T.text }}>{overallBest.weight} lb <span style={{ fontSize:14, color:T.text2, fontWeight:400 }}>× {overallBest.reps} reps</span></div>
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
          <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'12px 14px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ fontSize:12, color:T.text3 }}>{date}</div>
              {trend && <div style={{ fontSize:14, color: trend==='↑'?'var(--green)':trend==='↓'?'var(--coral)':T.text3 }}>{trend}</div>}
            </div>
            <div style={{ fontSize:15, fontWeight:500, color:T.text, marginTop:4 }}>
              {best?.weight} lb × {best?.reps} reps
              <span style={{ fontSize:11, color:T.text3, fontWeight:400, marginLeft:8 }}>best set</span>
            </div>
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

// ─── Weekly overview ──────────────────────────────────────────────────────────
function WeeklyOverview({ programs, sessions, activeProgramId, lastWorkoutId, onSelectProgram, onNewProgram, loading }) {
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

          {nextUp && (
            <div style={{ background:T.surface, border:`1.5px solid ${T.text}`, borderRadius:rr('md'), padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:6 }}>Up next</div>
              <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{nextUp.workout.name}</div>
              <div style={{ fontSize:12, color:T.text2, marginTop:3 }}>
                {nextUp.phase.name} · {nextUp.workout.exercises.length} exercise{nextUp.workout.exercises.length!==1?'s':''}
              </div>
              <button onClick={()=>onSelectProgram(activeProgram, nextUp.workout, nextUp.phase.id)}
                style={{ marginTop:12, width:'100%', padding:'10px', borderRadius:rr('sm'), border:'none',
                  background:T.text, color:T.bg, fontSize:13, fontWeight:500, cursor:'pointer' }}>
                Start session
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
              style={{ flex:1, padding:'9px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:12, cursor:'pointer' }}>
              View program
            </button>
            <button onClick={onNewProgram}
              style={{ flex:1, padding:'9px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:12, cursor:'pointer' }}>
              + New program
            </button>
          </div>

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
          <div style={{ textAlign:'center', padding:'3rem 0' }}>
            <div style={{ fontSize:14, color:T.text2, marginBottom:8 }}>No program yet.</div>
            <div style={{ fontSize:12, color:T.text3 }}>Build your first one to get started.</div>
          </div>
          <button onClick={onNewProgram} style={{ width:'100%', marginTop:10, padding:'12px 16px', borderRadius:rr('md'), border:'none', background:T.text, color:T.bg, fontSize:14, fontWeight:500, cursor:'pointer' }}>
            + New program
          </button>
          {programs.length > 0 && (
            <button onClick={()=>onSelectProgram(programs[0])} style={{ width:'100%', marginTop:8, padding:'10px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13, cursor:'pointer' }}>
              View all programs
            </button>
          )}
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
function ProgramDetail({ program, lastWorkoutId, onBack, onEdit, onStartWorkout, onViewHistory, onViewProgress }) {
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
          phaseId={activeSession.phaseId} userId={userId}
          onFinish={handleFinishSession}
          onBack={()=>{ setActiveSession(null); setView('detail') }} />
      )}
      {view==='history' && selectedProgram && (
        <SessionHistory userId={userId} programId={selectedProgram.id}
          onBack={()=>setView('detail')}
          onViewProgress={(name,id)=>{ setProgressExercise({ name, id }); setView('progress') }} />
      )}
      {view==='progress' && progressExercise && selectedProgram && (
        <ExerciseProgress userId={userId} programId={selectedProgram.id}
          exerciseName={progressExercise.name} exerciseId={progressExercise.id}
          onBack={()=>setView(view==='progress'?'history':'detail')} />
      )}
    </div>
  )
}
