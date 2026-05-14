'use client'
import { useState, useEffect } from 'react'
import { EXERCISE_LIBRARY, EXERCISE_GROUPS } from './exercises'
import { getPrograms, saveProgram, deleteProgram, getSessions, saveSession } from './db'

function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16) }) }

// ─── Styles ───────────────────────────────────────────────────────────────────
const T = {
  bg:'var(--bg)', surface:'var(--surface)', surface2:'var(--surface2)', surface3:'var(--surface3)',
  border:'var(--border)', border2:'var(--border2)',
  text:'var(--text)', text2:'var(--text2)', text3:'var(--text3)',
}
function rr(s) { return s==='sm'?'8px':s==='lg'?'16px':'12px' }

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, outline, small, danger, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 12px' : '10px 16px',
      borderRadius: rr('sm'), fontSize: small ? 12 : 13, fontWeight: 500,
      border: outline || danger ? `0.5px solid ${danger ? '#C4866A' : T.border}` : 'none',
      background: danger ? 'transparent' : outline ? 'transparent' : disabled ? T.surface2 : T.text,
      color: danger ? '#C4866A' : outline ? T.text2 : disabled ? T.text3 : T.bg,
      cursor: disabled ? 'not-allowed' : 'pointer', ...style,
    }}>{children}</button>
  )
}

function FullBtn({ children, onClick, disabled, outline }) {
  return <Btn children={children} onClick={onClick} disabled={disabled} outline={outline} style={{ width:'100%', marginTop:10, padding:'11px 16px', fontSize:14 }} />
}

function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13,
        border:`0.5px solid ${T.border}`, background:T.surface, color:T.text,
        outline:'none', ...style }} />
  )
}

function Label({ children }) {
  return <div style={{ fontSize:11, letterSpacing:.6, textTransform:'uppercase', color:T.text3, fontWeight:500, marginBottom:6 }}>{children}</div>
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.surface, border:`0.5px solid ${T.border}`,
      borderRadius:rr('md'), padding:'12px 14px', marginBottom:8,
      cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </div>
  )
}

function Divider() { return <div style={{ height:'0.5px', background:T.border, margin:'10px 0' }} /> }

function Stepper({ value, onChange, min=1, max=999, label }) {
  return (
    <div style={{ flex:1 }}>
      {label && <Label>{label}</Label>}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('sm'), padding:'6px 8px' }}>
        <button onClick={()=>onChange(Math.max(min, value-1))} style={{ width:28, height:28, borderRadius:'50%', border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
        <div style={{ flex:1, textAlign:'center', fontSize:16, fontWeight:500, color:T.text }}>{value}</div>
        <button onClick={()=>onChange(Math.min(max, value+1))} style={{ width:28, height:28, borderRadius:'50%', border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
      </div>
    </div>
  )
}

function WeightStepper({ value, onChange, label, step=5 }) {
  const numVal = parseFloat(value) || 0
  return (
    <div style={{ flex:1 }}>
      {label && <Label>{label}</Label>}
      <div style={{ display:'flex', alignItems:'center', gap:8, background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('sm'), padding:'6px 8px' }}>
        <button onClick={()=>onChange(String(Math.max(0, numVal-step)))} style={{ width:32, height:32, borderRadius:'50%', border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
        <div style={{ flex:1, textAlign:'center', fontSize:20, fontWeight:500, color:T.text }}>{numVal||'—'}</div>
        <button onClick={()=>onChange(String(numVal+step))} style={{ width:32, height:32, borderRadius:'50%', border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
      </div>
    </div>
  )
}

function BackBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ border:'none', background:'none', color:T.text3,
      fontSize:12, padding:'0 0 12px', cursor:'pointer', display:'block' }}>
      ← {label}
    </button>
  )
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

// ─── Exercise picker modal ────────────────────────────────────────────────────
function ExercisePicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('All')
  const [customName, setCustomName] = useState('')

  const filtered = EXERCISE_LIBRARY.filter(e => {
    const matchGroup = group === 'All' || e.group === group
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchGroup && matchSearch
  })

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'flex-end' }}>
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:'16px 16px 0 0', width:'100%', maxWidth:430,
        margin:'0 auto', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 16px 8px', borderBottom:`0.5px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:16, fontWeight:500, color:T.text }}>Add exercise</div>
            <button onClick={onClose} style={{ border:'none', background:'none', color:T.text3, fontSize:18, padding:0 }}>×</button>
          </div>
          <TextInput value={search} onChange={setSearch} placeholder="Search exercises..." />
          <div style={{ display:'flex', gap:6, marginTop:8, overflowX:'auto', paddingBottom:4 }}>
            {EXERCISE_GROUPS.map(g => (
              <button key={g} onClick={()=>setGroup(g)} style={{
                flexShrink:0, padding:'4px 10px', borderRadius:20, fontSize:11,
                border:'none', background:group===g?T.text:T.surface2,
                color:group===g?T.bg:T.text2,
              }}>{g}</button>
            ))}
          </div>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'8px 16px' }}>
          {filtered.map(e => (
            <div key={e.id} onClick={()=>onSelect(e)}
              style={{ padding:'10px 0', borderBottom:`0.5px solid ${T.border}`, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{e.name}</div>
                <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>{e.group}</div>
              </div>
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

  const inputStyle = {
    width:'100%', padding:'16px 12px', borderRadius:rr('sm'), fontSize:28, fontWeight:500,
    border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text,
    outline:'none', textAlign:'center', appearance:'none', MozAppearance:'textfield',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('lg'), width:'100%', maxWidth:340, padding:20 }}>
        <div style={{ fontSize:16, fontWeight:500, color:T.text, marginBottom:4 }}>Set {set.num}</div>
        {lastSet && <div style={{ fontSize:12, color:T.text3, marginBottom:16 }}>Last time: {lastSet.weight} lb × {lastSet.reps} reps</div>}
        {!lastSet && <div style={{ marginBottom:16 }} />}
        <div style={{ display:'flex', gap:12, marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <Label>Weight (lb)</Label>
            <input type="number" inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)}
              placeholder="0" autoFocus style={inputStyle} />
          </div>
          <div style={{ flex:1 }}>
            <Label>Reps</Label>
            <input type="number" inputMode="numeric" value={reps} onChange={e=>setReps(e.target.value)}
              placeholder="0" style={inputStyle} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn outline onClick={onClose} style={{ flex:1 }}>Cancel</Btn>
          <Btn onClick={()=>onSave({ weight:parseFloat(weight)||0, reps:parseInt(reps)||0 })}
            disabled={!weight||!reps} style={{ flex:1 }}>Save set</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Exercise editor (within workout builder) ─────────────────────────────────
function ExerciseEditor({ exercise, onChange, onRemove }) {
  return (
    <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{exercise.name}</div>
          <div style={{ fontSize:11, color:T.text3 }}>{exercise.group}</div>
        </div>
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

  const addExercise = (ex) => {
    const newEx = { id:uid(), exerciseId:ex.id, name:ex.name, group:ex.group, sets:3, targetReps:8 }
    onChange({ ...workout, exercises:[...workout.exercises, newEx] })
    setShowPicker(false)
  }

  const updateExercise = (idx, updated) => {
    const exercises = [...workout.exercises]
    exercises[idx] = updated
    onChange({ ...workout, exercises })
  }

  const removeExercise = (idx) => {
    onChange({ ...workout, exercises: workout.exercises.filter((_,i)=>i!==idx) })
  }

  return (
    <div style={{ padding:'0 20px' }}>
      {showPicker && <ExercisePicker onSelect={addExercise} onClose={()=>setShowPicker(false)} />}
      <BackBtn label="Back to phase" onClick={onBack} />
      <SectionHeader title={workout.name} sub={`${workout.exercises.length} exercise${workout.exercises.length!==1?'s':''}`} />

      <Label>Workout name</Label>
      <TextInput value={workout.name} onChange={v=>onChange({ ...workout, name:v })} placeholder="e.g. Push A" style={{ marginBottom:14 }} />

      <Label>Exercises</Label>
      {workout.exercises.length===0 && (
        <div style={{ fontSize:13, color:T.text3, marginBottom:10, padding:'10px 0' }}>No exercises yet — add one below.</div>
      )}
      {workout.exercises.map((ex, i) => (
        <ExerciseEditor key={ex.id} exercise={ex}
          onChange={updated=>updateExercise(i, updated)}
          onRemove={()=>removeExercise(i)} />
      ))}
      <Btn outline onClick={()=>setShowPicker(true)} style={{ width:'100%', marginTop:4 }}>+ Add exercise</Btn>
      <Btn onClick={onBack} style={{ width:'100%', marginTop:10 }}>Save workout</Btn>
    </div>
  )
}

// ─── Phase builder ────────────────────────────────────────────────────────────
function PhaseBuilder({ phase, onChange, onBack }) {
  const [editingWorkout, setEditingWorkout] = useState(null)

  const addWorkout = () => {
    const newW = { id:uid(), name:`Workout ${String.fromCharCode(65+phase.workouts.length)}`, exercises:[] }
    const updated = { ...phase, workouts:[...phase.workouts, newW] }
    onChange(updated)
    setEditingWorkout(updated.workouts.length - 1)
  }

  const updateWorkout = (idx, updated) => {
    const workouts = [...phase.workouts]
    workouts[idx] = updated
    onChange({ ...phase, workouts })
  }

  const removeWorkout = (idx) => {
    onChange({ ...phase, workouts: phase.workouts.filter((_,i)=>i!==idx) })
  }

  if (editingWorkout !== null && phase.workouts[editingWorkout]) {
    return (
      <WorkoutBuilder
        workout={phase.workouts[editingWorkout]}
        onChange={updated=>{ updateWorkout(editingWorkout, updated) }}
        onBack={()=>setEditingWorkout(null)} />
    )
  }

  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back to program" onClick={onBack} />
      <SectionHeader title={phase.name} sub={`${phase.workouts.length} workout${phase.workouts.length!==1?'s':''} · ${phase.weeks} weeks`} />

      <Label>Phase name</Label>
      <TextInput value={phase.name} onChange={v=>onChange({ ...phase, name:v })} placeholder="e.g. Phase 1 — Foundation" style={{ marginBottom:10 }} />

      <Label>Duration (weeks)</Label>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <button onClick={()=>onChange({ ...phase, weeks:Math.max(1,(phase.weeks||4)-1) })} style={{ width:36, height:36, borderRadius:'50%', border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
        <div style={{ flex:1, textAlign:'center', fontSize:20, fontWeight:500, color:T.text }}>{phase.weeks||4} <span style={{ fontSize:13, fontWeight:400, color:T.text3 }}>weeks</span></div>
        <button onClick={()=>onChange({ ...phase, weeks:Math.min(52,(phase.weeks||4)+1) })} style={{ width:36, height:36, borderRadius:'50%', border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
      </div>

      <Label>Workouts</Label>
      {phase.workouts.length===0 && (
        <div style={{ fontSize:13, color:T.text3, padding:'10px 0', marginBottom:4 }}>No workouts yet — add one below.</div>
      )}
      {phase.workouts.map((w, i) => (
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

  const addPhase = () => {
    const newP = { id:uid(), name:`Phase ${prog.phases.length+1}`, weeks:4, workouts:[] }
    setProg(p=>({ ...p, phases:[...p.phases, newP] }))
  }

  const updatePhase = (idx, updated) => {
    setProg(p=>{ const phases=[...p.phases]; phases[idx]=updated; return { ...p, phases } })
  }

  const removePhase = (idx) => {
    setProg(p=>({ ...p, phases:p.phases.filter((_,i)=>i!==idx) }))
    if (editingPhase===idx) setEditingPhase(null)
  }

  const handleSave = () => onSave(prog)

  if (editingPhase !== null && prog.phases[editingPhase]) {
    return (
      <PhaseBuilder
        phase={prog.phases[editingPhase]}
        onChange={updated=>updatePhase(editingPhase, updated)}
        onBack={()=>setEditingPhase(null)} />
    )
  }

  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Back to programs" onClick={onBack} />
      <SectionHeader title={prog.name||'New program'} sub={`${prog.phases.length} phase${prog.phases.length!==1?'s':''}`} />

      <Label>Program name</Label>
      <TextInput value={prog.name} onChange={v=>setProg(p=>({ ...p, name:v }))} placeholder="e.g. Hypertrophy Block" style={{ marginBottom:14 }} />

      <Label>Phases</Label>
      {prog.phases.length===0 && (
        <div style={{ fontSize:13, color:T.text3, padding:'10px 0', marginBottom:4 }}>No phases yet — add one below.</div>
      )}
      {prog.phases.map((ph, i) => (
        <Card key={ph.id} style={{ cursor:'default' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div onClick={()=>setEditingPhase(i)} style={{ flex:1, cursor:'pointer' }}>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{ph.name}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                {ph.weeks} weeks · {ph.workouts.length} workout{ph.workouts.length!==1?'s':''}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Btn small outline onClick={()=>setEditingPhase(i)}>Edit</Btn>
              <button onClick={()=>removePhase(i)} style={{ border:'none', background:'none', color:T.text3, fontSize:13, padding:0, cursor:'pointer' }}>×</button>
            </div>
          </div>
        </Card>
      ))}
      <Btn outline onClick={addPhase} style={{ width:'100%', marginTop:4 }}>+ Add phase</Btn>

      <FullBtn onClick={handleSave} disabled={!prog.name.trim()}>Save program</FullBtn>
      {onDelete && <FullBtn outline onClick={onDelete}>Delete program</FullBtn>}
    </div>
  )
}

// ─── Session logger ───────────────────────────────────────────────────────────
function SessionLogger({ workout, programId, phaseId, userId, onFinish, onBack }) {
  const [sessions, setSessions] = useState([])
  const [currentEx, setCurrentEx] = useState(0)
  const [loggedSets, setLoggedSets] = useState(
    workout.exercises.map(ex => ({ exerciseId:ex.exerciseId||ex.id, name:ex.name, sets:[] }))
  )
  const [loggingSet, setLoggingSet] = useState(null)

  useEffect(() => {
    if (userId) getSessions(userId, programId).then(s => setSessions(s)).catch(()=>{})
  }, [programId])

  const getLastSession = (exerciseId) => {
    const prev = sessions.filter(s => s.programId===programId && s.phaseId===phaseId)
      .sort((a,b)=>b.date-a.date)
      .find(s => s.exercises.some(e=>e.exerciseId===exerciseId))
    if (!prev) return null
    return prev.exercises.find(e=>e.exerciseId===exerciseId)
  }

  const exercise = workout.exercises[currentEx]
  const logged = loggedSets[currentEx]
  const lastSession = exercise ? getLastSession(exercise.exerciseId||exercise.id) : null
  const targetSets = exercise?.sets || 3

  const logSet = (setIdx, data) => {
    setLoggedSets(prev => {
      const next = [...prev]
      const sets = [...next[currentEx].sets]
      sets[setIdx] = data
      next[currentEx] = { ...next[currentEx], sets }
      return next
    })
    setLoggingSet(null)
  }

  const finishSession = async () => {
    await saveSession(userId, {
      programId, phaseId,
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: loggedSets,
    }).catch(()=>{})
    onFinish()
  }

  const allSetsLogged = loggedSets.every(ex => ex.sets.length >= workout.exercises.find(e=>(e.exerciseId||e.id)===(ex.exerciseId))?.sets)

  if (!exercise) return null

  return (
    <div style={{ padding:'0 20px' }}>
      {loggingSet !== null && (
        <SetLogger
          set={{ num:loggingSet+1, targetReps:exercise.targetReps }}
          lastSet={lastSession?.sets?.[loggingSet]}
          onSave={data=>logSet(loggingSet, data)}
          onClose={()=>setLoggingSet(null)} />
      )}

      <BackBtn label="Exit session" onClick={onBack} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:3 }}>
            Exercise {currentEx+1} of {workout.exercises.length}
          </div>
          <div style={{ fontSize:20, fontWeight:400, color:T.text, letterSpacing:-.3 }}>{exercise.name}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:11, color:T.text3 }}>{exercise.sets} sets × {exercise.targetReps} reps</div>
        </div>
      </div>

      {lastSession && (
        <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:14 }}>
          <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>Last session</div>
          <div style={{ display:'flex', gap:8 }}>
            {lastSession.sets.map((s,i) => (
              <div key={i} style={{ fontSize:12, color:T.text2 }}>{s.weight}×{s.reps}</div>
            ))}
          </div>
        </div>
      )}

      <Label>Your sets — tap to log</Label>
      {Array.from({ length:targetSets }).map((_,i) => {
        const done = logged.sets[i]
        return (
          <div key={i} onClick={()=>setLoggingSet(i)}
            style={{ display:'flex', gap:10, marginBottom:8, alignItems:'center', cursor:'pointer' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0,
              background:done?T.text:T.surface2, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:11, fontWeight:500,
              color:done?T.bg:T.text2 }}>{i+1}</div>
            <div style={{ flex:1, background:done?T.surface:T.surface2,
              border:`0.5px solid ${done?T.text:T.border}`, borderRadius:rr('sm'),
              padding:'9px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              {done ? (
                <>
                  <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{done.weight} lb × {done.reps} reps</div>
                  <div style={{ fontSize:11, color:T.text3 }}>tap to edit</div>
                </>
              ) : (
                <div style={{ fontSize:13, color:T.text3 }}>Tap to log</div>
              )}
            </div>
          </div>
        )
      })}

      <div style={{ display:'flex', gap:8, marginTop:14 }}>
        {currentEx > 0 && (
          <Btn outline onClick={()=>setCurrentEx(i=>i-1)} style={{ flex:1 }}>← Previous</Btn>
        )}
        {currentEx < workout.exercises.length-1 ? (
          <Btn onClick={()=>setCurrentEx(i=>i+1)} style={{ flex:1 }}>Next exercise →</Btn>
        ) : (
          <Btn onClick={finishSession} style={{ flex:1, background:'#0F6E56', color:'#fff' }}>Finish session</Btn>
        )}
      </div>
    </div>
  )
}

// ─── Programs list ────────────────────────────────────────────────────────────
function ProgramsList({ programs, loading, onSelectProgram, onNewProgram }) {

  if (loading) return <div style={{ padding:20, display:'flex', justifyContent:'center' }}><div style={{ display:'flex', gap:5, padding:'10px 0', alignItems:'center' }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:'var(--text3)',animation:'blink 1.2s infinite',animationDelay:i*.2+'s' }} />)}<style>{"@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}"}</style></div></div>
  if (programs.length === 0) {
    return (
      <div style={{ padding:'20px 20px' }}>
        <SectionHeader title="Lift" sub="Your programs and sessions" />
        <EmptyState message="No programs yet." sub="Build your first one to get started." />
        <FullBtn onClick={onNewProgram}>+ New program</FullBtn>
      </div>
    )
  }

  return (
    <div style={{ padding:'20px 20px' }}>
      <SectionHeader title="Lift" sub="Your programs and sessions" />
      {programs.map(p => (
        <Card key={p.id} onClick={()=>onSelectProgram(p)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{p.name}</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
                {p.phases.length} phase{p.phases.length!==1?'s':''} · {p.phases.reduce((a,ph)=>a+ph.workouts.length,0)} workouts
              </div>
            </div>
            <div style={{ fontSize:18, color:T.text3 }}>›</div>
          </div>
        </Card>
      ))}
      <FullBtn outline onClick={onNewProgram}>+ New program</FullBtn>
    </div>
  )
}

// ─── Program detail ───────────────────────────────────────────────────────────
function ProgramDetail({ program, onBack, onEdit, onStartWorkout }) {
  return (
    <div style={{ padding:'0 20px' }}>
      <BackBtn label="Programs" onClick={onBack} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <SectionHeader title={program.name} sub={`${program.phases.length} phases`} />
        <Btn small outline onClick={onEdit}>Edit</Btn>
      </div>

      {program.phases.map((ph, pi) => (
        <div key={ph.id} style={{ marginBottom:12 }}>
          <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:T.surface2, borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{ph.name}</div>
              <div style={{ fontSize:11, color:T.text3 }}>{ph.weeks} weeks</div>
            </div>
            {ph.workouts.length === 0 && (
              <div style={{ padding:'12px 14px', fontSize:12, color:T.text3 }}>No workouts in this phase.</div>
            )}
            {ph.workouts.map((w) => (
              <div key={w.id} style={{ padding:'10px 14px', borderBottom:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{w.name}</div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>{w.exercises.length} exercise{w.exercises.length!==1?'s':''}</div>
                </div>
                <Btn small onClick={()=>onStartWorkout(w, program.id, ph.id)}>Start</Btn>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Session complete ─────────────────────────────────────────────────────────
function SessionComplete({ onDone }) {
  return (
    <div style={{ padding:'40px 20px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>✓</div>
      <div style={{ fontSize:22, fontWeight:400, color:T.text, marginBottom:8 }}>Session logged.</div>
      <div style={{ fontSize:14, color:T.text2, marginBottom:32 }}>Nice work. Your sets are saved.</div>
      <Btn onClick={onDone} style={{ width:'100%', padding:'12px' }}>Back to programs</Btn>
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

  useEffect(() => {
    if (!userId) return
    getPrograms(userId).then(p => { setPrograms(p); setProgramsLoading(false) })
  }, [userId])

  const reloadPrograms = async () => {
    const fresh = await getPrograms(userId)
    setPrograms(fresh)
    if (selectedProgram) {
      const found = fresh.find(p=>p.id===selectedProgram.id)
      if (found) setSelectedProgram(found)
    }
  }

  const handleNewProgram = () => {
    setEditingProgram({ id:uid(), name:'', phases:[] })
    setView('builder')
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

  const handleStartWorkout = (workout, programId, phaseId) => {
    setActiveSession({ workout, programId, phaseId })
    setView('session')
  }

  const handleFinishSession = async () => {
    setActiveSession(null)
    setView('complete')
  }

  return (
    <div style={{ paddingBottom:20 }}>
      {view==='list' && (
        <ProgramsList
          programs={programs}
          loading={programsLoading}
          onSelectProgram={p=>{ setSelectedProgram(p); setView('detail') }}
          onNewProgram={handleNewProgram} />
      )}

      {view==='detail' && selectedProgram && (
        <ProgramDetail
          program={selectedProgram}
          onBack={()=>setView('list')}
          onEdit={()=>{ setEditingProgram(selectedProgram); setView('builder') }}
          onStartWorkout={handleStartWorkout} />
      )}

      {view==='builder' && editingProgram && (
        <ProgramBuilder
          program={editingProgram}
          onSave={handleSaveProgram}
          onBack={()=>{ setView(selectedProgram?'detail':'list'); reloadPrograms() }}
          onDelete={selectedProgram ? handleDeleteProgram : null} />
      )}

      {view==='session' && activeSession && (
        <SessionLogger
          workout={activeSession.workout}
          programId={activeSession.programId}
          phaseId={activeSession.phaseId}
          userId={userId}
          onFinish={handleFinishSession}
          onBack={()=>{ setActiveSession(null); setView('detail') }} />
      )}

      {view==='complete' && (
        <SessionComplete onDone={()=>setView('detail')} />
      )}
    </div>
  )
}
