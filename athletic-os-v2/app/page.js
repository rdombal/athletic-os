'use client'
import { useState, useEffect, useRef } from 'react'

const T = {
  bg:'var(--bg)', surface:'var(--surface)', surface2:'var(--surface2)',
  border:'var(--border)', border2:'var(--border2)',
  text:'var(--text)', text2:'var(--text2)', text3:'var(--text3)',
}

const SECTION_COLORS = {
  feel:   { bg:'var(--purple-bg)', accent:'var(--purple)' },
  eat:    { bg:'var(--green-bg)',  accent:'var(--green)'  },
  play:   { bg:'var(--coral-bg)', accent:'var(--coral)'  },
  pillars:{ bg:'var(--blue-bg)',  accent:'var(--blue)'   },
}

const PILLAR_COLORS = {
  purple:{ bg:'var(--purple-bg)', accent:'var(--purple)' },
  green: { bg:'var(--green-bg)',  accent:'var(--green)'  },
  amber: { bg:'var(--amber-bg)',  accent:'var(--amber)'  },
  blue:  { bg:'var(--blue-bg)',   accent:'var(--blue)'   },
  coral: { bg:'var(--coral-bg)', accent:'var(--coral)'  },
  pink:  { bg:'var(--pink-bg)',   accent:'var(--pink)'   },
}

const PILLARS = [
  { num:1, color:'purple', title:'Sleep',
    body:`Your body doesn't get stronger in the gym — it gets stronger while you sleep. Growth hormone releases, muscles repair, motor patterns consolidate. No supplement, no biohack comes close to 7-9 hours of quality sleep.`,
    good:'Consistent bedtime. Cool dark room. No screens 30 min before bed.',
    skip:'Sleep score obsession. Expensive supplements. Polyphasic sleep.',
    prompt:'Give me 3 practical things I can do tonight to improve my sleep quality. Keep it simple and realistic.' },
  { num:2, color:'green', title:'Protein',
    body:`If you track one thing, track protein. 0.7-1g per pound of bodyweight, spread across 3-4 meals. It preserves muscle, keeps you full, and drives recovery. Everything else in nutrition is secondary to hitting this consistently.`,
    good:'Hitting your daily target. Protein at every meal. Whole foods first.',
    skip:'Protein timing windows. Expensive powders over real food. Tracking every macro daily.',
    prompt:'How do I hit 150g of protein a day using simple everyday foods without obsessing over it?' },
  { num:3, color:'amber', title:'Movement',
    body:`Consistency beats intensity every single time. Three 30-minute sessions a week for a year beats one month of daily two-hour workouts followed by burnout. The best workout is the one you actually do — repeatedly, over years.`,
    good:'Showing up consistently. Walking more. Finding movement you enjoy.',
    skip:'Optimal training splits. Perfect programming. Guilt about missing a day.',
    prompt:'What does a realistic, sustainable weekly movement routine look like for a busy person?' },
  { num:4, color:'blue', title:'Zone 2 cardio',
    body:`Zone 2 is low-intensity cardio where you can hold a full conversation — brisk walk, easy bike, light jog. 3-4 hours per week builds your aerobic engine, improves fat metabolism, and accelerates recovery from everything else.`,
    good:'Walking more. Easy bike rides. Any activity you can sustain 30+ min.',
    skip:'Expensive cardio equipment. Heart rate zone obsession. Going hard every session.',
    prompt:'What is Zone 2 cardio and how do I know if I am in it without a fancy monitor?' },
  { num:5, color:'coral', title:'Progressive overload',
    body:`Your body adapts to stress. If you do the same thing every week, you stop improving. Progressive overload means gradually adding more — weight, reps, or difficulty — over time. It's the only proven mechanism for getting stronger.`,
    good:'Logging your lifts. Adding small increments weekly. Tracking trends over months.',
    skip:'Switching programs every 3 weeks. Chasing soreness. Complex periodization before mastering basics.',
    prompt:'Explain progressive overload simply — how do I apply it to my workouts week to week?' },
  { num:6, color:'green', title:'Recovery',
    body:`Training is just the stimulus. Recovery is where adaptation happens. Most people plateau not because they train too little — but because they never fully recover. Rest days are not lazy days. They are when you get better.`,
    good:'Rest days. Eating enough. Reducing stress. Light movement between sessions.',
    skip:'Ice baths unless you enjoy them. Compression gadgets. Foam rolling for more than 5 min.',
    prompt:'How do I know when I actually need a rest day vs when I am just being lazy?' },
  { num:7, color:'pink', title:'Stress and balance',
    body:`Chronic stress raises cortisol — it breaks down muscle, disrupts sleep, tanks motivation. Your social life, hobbies, and relationships are not obstacles to being healthy. They are part of it. Health includes enjoying your life.`,
    good:'Time away from screens. Doing things you love. Not skipping life for the gym.',
    skip:'Optimizing every variable. Guilt from missing workouts. All-or-nothing thinking.',
    prompt:'How do I stay consistent with fitness without letting it take over my life or create anxiety?' },
  { num:8, color:'blue', title:'Hydration',
    body:`Even mild dehydration — just 1-2% — impairs strength, cognition, and endurance. Most people are chronically under-hydrated without realizing it. Half your bodyweight in ounces per day is your baseline target.`,
    good:'Water with every meal. Big glass first thing in the morning. Electrolytes on hard training days.',
    skip:'Expensive hydration products. Tracking exact oz obsessively.',
    prompt:'What are the simplest habits to stay consistently hydrated without thinking about it?' },
]

const SPORTS = [
  { name:'Golf',       sub:'Rotation + mobility' },
  { name:'Running',    sub:'Hip + glute'         },
  { name:'Lifting',    sub:'Joint prep'          },
  { name:'Basketball', sub:'Legs + explosion'    },
  { name:'Tennis',     sub:'Shoulder + hip'      },
  { name:'Pickleball', sub:'Wrist + lateral'     },
]

const DEFAULT_PANTRY = ['Ground beef','Chicken','Rice','Eggs','Greek yogurt','Potatoes','Cheese','Bread']
const VIBE_SUGGESTIONS = ['high protein','comforting','fresh','post-workout','lighter','cheesy','spicy','something different','macro friendly','quick and easy']
const EFFORT_LEVELS = [
  { key:'low',    label:'Low effort',  desc:'One pan, minimal prep' },
  { key:'normal', label:'Normal',      desc:'Standard weeknight'    },
  { key:'chef',   label:'Chef up',     desc:'Worth the extra time'  },
]

function loadMemory() {
  try { return JSON.parse(localStorage.getItem('taste_memory') || '{}') } catch { return {} }
}

function saveMemory(mem) {
  try { localStorage.setItem('taste_memory', JSON.stringify(mem)) } catch {}
}

function updateMemory(patch) {
  const mem = loadMemory()
  const next = { ...mem }
  if (patch.savedIngredients) next.savedIngredients = [...(mem.savedIngredients||[]), ...patch.savedIngredients].slice(-30)
  if (patch.vibes) next.vibes = [...(mem.vibes||[]), ...patch.vibes].slice(-20)
  if (patch.efforts) next.efforts = [...(mem.efforts||[]), ...patch.efforts].slice(-10)
  if (patch.meals) next.meals = [...(mem.meals||[]), ...patch.meals].slice(-20)
  saveMemory(next)
}

function buildTasteContext(mem) {
  const parts = []
  if (mem.savedIngredients && mem.savedIngredients.length > 3) {
    const freq = {}
    mem.savedIngredients.forEach(i => { freq[i] = (freq[i]||0)+1 })
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k)
    parts.push(`Ingredients this user saves most often: ${top.join(', ')}`)
  }
  if (mem.vibes && mem.vibes.length > 2) {
    const freq = {}
    mem.vibes.forEach(v => { freq[v] = (freq[v]||0)+1 })
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k)
    parts.push(`Vibes they gravitate toward: ${top.join(', ')}`)
  }
  if (mem.efforts && mem.efforts.length > 2) {
    const freq = {}
    mem.efforts.forEach(e => { freq[e] = (freq[e]||0)+1 })
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]
    if (top) parts.push(`Usually cooks at: ${top[0]} effort`)
  }
  return parts.length ? `\nUser taste profile (use quietly to improve suggestions — do not mention it):\n${parts.join('\n')}\n` : ''
}

async function callAI(prompt) {
  const res = await fetch('/api/claude', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
}

function rr(size) { return size==='sm'?'8px':size==='lg'?'16px':'12px' }

function Eyebrow({ children, style }) {
  return <div style={{ fontSize:11, letterSpacing:.7, textTransform:'uppercase', color:T.text3, fontWeight:500, marginBottom:8, ...style }}>{children}</div>
}

function PrefLabel({ children }) {
  return <div style={{ fontSize:12, color:T.text3, marginBottom:6, letterSpacing:.2 }}>{children}</div>
}

function Chip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 13px', borderRadius:20, fontSize:12, border:'none',
      background: selected ? T.text : T.surface2,
      color: selected ? T.bg : T.text2,
      fontWeight: selected ? 500 : 400, transition:'all .15s',
    }}>{label}</button>
  )
}

function ChipRow({ options, selected, onSelect }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
      {options.map(o=>(
        <Chip key={o} label={o} selected={selected===o} onClick={()=>onSelect(o)} />
      ))}
    </div>
  )
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', marginTop:10, padding:'12px 16px', borderRadius:rr('md'),
      border:'none', background: disabled ? T.surface2 : T.text,
      color: disabled ? T.text3 : T.bg, fontSize:14, fontWeight:500,
    }}>{children}</button>
  )
}

function SecondaryBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', marginTop:8, padding:'9px 16px', borderRadius:rr('md'),
      border:`0.5px solid ${T.border}`, background:'transparent',
      color:T.text2, fontSize:13, ...style,
    }}>{children}</button>
  )
}

function LoadingDots() {
  return (
    <div style={{ display:'flex', gap:5, padding:'10px 0', alignItems:'center' }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:T.text3,
          animation:'blink 1.2s infinite', animationDelay:`${i*.2}s` }} />
      ))}
      <style>{`@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
    </div>
  )
}

function ResponseBox({ text, loading }) {
  if (!loading && !text) return null
  return (
    <div style={{ marginTop:12, background:T.surface, border:`0.5px solid ${T.border}`,
      borderRadius:rr('md'), padding:16, fontSize:14, lineHeight:1.75, color:T.text, whiteSpace:'pre-wrap' }}>
      {loading ? <LoadingDots /> : text}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background:T.surface, border:`0.5px solid ${T.border}`,
      borderRadius:rr('md'), padding:'14px 16px', marginBottom:10, ...style }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height:'0.5px', background:T.border, margin:'12px 0' }} />
}

function usePantry() {
  const [pantry, setPantry] = useState([])
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pantry')
      setPantry(stored ? JSON.parse(stored) : DEFAULT_PANTRY)
    } catch { setPantry(DEFAULT_PANTRY) }
  }, [])
  const persist = (items) => {
    setPantry(items)
    try { localStorage.setItem('pantry', JSON.stringify(items)) } catch {}
  }
  const add = (item) => {
    const t = item.trim()
    if (!t || pantry.map(p=>p.toLowerCase()).includes(t.toLowerCase())) return false
    persist([...pantry, t]); return true
  }
  const remove = (item) => persist(pantry.filter(p=>p!==item))
  return { pantry, add, remove }
}

function PantryEditor({ pantry, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    if (!input.trim()) return
    const ok = onAdd(input)
    if (ok) { setInput(''); setError('') }
    else setError('Already in your pantry')
  }

  return (
    <div style={{ marginBottom:14 }}>
      <PrefLabel>Your pantry — tap x to remove</PrefLabel>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {pantry.map(ing=>(
          <div key={ing} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'5px 10px', borderRadius:20, fontSize:12,
            background:T.surface2, color:T.text2,
          }}>
            <span>{ing}</span>
            <button onClick={()=>onRemove(ing)} style={{
              border:'none', background:'none', color:T.text3,
              fontSize:12, padding:0, lineHeight:1, cursor:'pointer',
            }}>x</button>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <input
          value={input}
          onChange={e=>{ setInput(e.target.value); setError('') }}
          onKeyDown={e=>e.key==='Enter'&&handleAdd()}
          placeholder="Add an ingredient..."
          style={{
            flex:1, padding:'8px 12px', borderRadius:rr('sm'), fontSize:13,
            border:`0.5px solid ${T.border}`, background:T.surface,
            color:T.text, outline:'none',
          }}
        />
        <button onClick={handleAdd} style={{
          padding:'8px 14px', borderRadius:rr('sm'), fontSize:13,
          border:'none', background:T.text, color:T.bg, fontWeight:500,
        }}>Add</button>
      </div>
      {error && <div style={{ fontSize:11, color:'var(--coral)', marginTop:4 }}>{error}</div>}
    </div>
  )
}

function RecipeCard({ text }) {
  if (!text) return null
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
  const name = lines[0] || ''
  const ingStart = lines.findIndex(l=>l.toLowerCase().startsWith('ingredient'))
  const stepStart = lines.findIndex(l=>l.toLowerCase().match(/^steps?:?$|^directions?:?$|^how to/))
  const macroStart = lines.findIndex(l=>l.toLowerCase().match(/^macros?|^nutrition/))
  const varStart = lines.findIndex(l=>l.toLowerCase().match(/^variations?:?$/))

  const slice = (from, tos) => {
    const ends = tos.filter(t=>t>from)
    const end = ends.length ? Math.min(...ends) : undefined
    return lines.slice(from+1, end).filter(l=>l)
  }

  const ingredients = ingStart>=0 ? slice(ingStart,[stepStart,macroStart,varStart]) : []
  const steps = stepStart>=0 ? slice(stepStart,[macroStart,varStart]) : []
  const macroLines = macroStart>=0 ? slice(macroStart,[varStart]) : []
  const varLines = varStart>=0 ? slice(varStart,[]) : []

  const macros = {}
  macroLines.forEach(l=>{
    const num = l.match(/\d+/)?.[0]||''
    const low = l.toLowerCase()
    if (low.includes('calorie')||low.includes('kcal')) macros.cal=num
    else if (low.includes('protein')) macros.protein=num
    else if (low.includes('carb')) macros.carbs=num
    else if (low.includes('fat')) macros.fat=num
  })

  const stepIcons = ['1','2','3','4','5','6']

  return (
    <div style={{ marginTop:14, background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), overflow:'hidden' }}>
      <div style={{ padding:'16px 16px 12px', borderBottom:`0.5px solid ${T.border}` }}>
        <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{name}</div>
      </div>

      {ingredients.length>0 && (
        <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Ingredients</div>
          {ingredients.map((ing,i)=>(
            <div key={i} style={{ fontSize:13, color:T.text2, paddingBottom:5, lineHeight:1.4 }}>
              - {ing.replace(/^[-*]\s*/,'')}
            </div>
          ))}
        </div>
      )}

      {steps.length>0 && (
        <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Steps</div>
          {steps.map((step,i)=>(
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', background:T.surface2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, color:T.text2, flexShrink:0 }}>{stepIcons[i]||'+'}</div>
              <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{step.replace(/^\d+[\.\)]\s*/,'').replace(/^[-*]\s*/,'')}</div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(macros).length>0 && (
        <div style={{ padding:'12px 16px', borderBottom:varLines.length>0?`0.5px solid ${T.border}`:'none' }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>Macros per serving</div>
          <div style={{ display:'flex', gap:8 }}>
            {macros.cal&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.cal}</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>cal</div></div>}
            {macros.protein&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.protein}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>protein</div></div>}
            {macros.carbs&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.carbs}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>carbs</div></div>}
            {macros.fat&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.fat}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>fat</div></div>}
          </div>
        </div>
      )}

      {varLines.length>0 && (
        <div style={{ padding:'12px 16px', background:T.surface2 }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Quick variations</div>
          {varLines.map((v,i)=>(
            <div key={i} style={{ fontSize:12, color:T.text2, paddingBottom:5, lineHeight:1.5 }}>
              {v.replace(/^[-*]\s*/,'')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HomeScreen({ onNav, savedItems }) {
  const hour = new Date().getHours()
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const tiles = [
    { tab:'feel',    label:'Feel better',  desc:'Sport-specific mobility',    color:SECTION_COLORS.feel    },
    { tab:'eat',     label:'Eat better',   desc:'New ideas, same ingredients', color:SECTION_COLORS.eat    },
    { tab:'play',    label:'Play better',  desc:'Warmups and recovery',        color:SECTION_COLORS.play   },
    { tab:'pillars', label:'The Pillars',  desc:'What actually matters',       color:SECTION_COLORS.pillars},
  ]
  return (
    <div style={{ padding:'32px 20px 20px' }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:13, color:T.text3, marginBottom:6 }}>{greeting}</div>
        <div style={{ fontSize:28, fontWeight:400, color:T.text, letterSpacing:-.5, lineHeight:1.2 }}>Good day,<br/>Ryan.</div>
        <div style={{ fontSize:14, color:T.text2, marginTop:8 }}>What do you need today?</div>
      </div>
      <Eyebrow>Quick access</Eyebrow>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:28 }}>
        {tiles.map(t=>(
          <button key={t.tab} onClick={()=>onNav(t.tab)} style={{
            background:T.surface, border:`0.5px solid ${T.border}`,
            borderRadius:rr('md'), padding:14, textAlign:'left',
          }}>
            <div style={{ width:28, height:28, borderRadius:7, background:t.color.bg, marginBottom:10 }} />
            <div style={{ fontSize:13, fontWeight:500, color:T.text, marginBottom:2 }}>{t.label}</div>
            <div style={{ fontSize:11, color:T.text2, lineHeight:1.4 }}>{t.desc}</div>
          </button>
        ))}
      </div>
      {savedItems.length>0 && <>
        <Eyebrow>Recently saved</Eyebrow>
        {savedItems.slice(0,3).map((item,i)=>(
          <Card key={i} style={{ marginBottom:8 }}>
            <div style={{ fontSize:10, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>{item.type}</div>
            <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{item.label}</div>
            <div style={{ fontSize:12, color:T.text2, marginTop:3, lineHeight:1.5, overflow:'hidden', maxHeight:36 }}>{item.text.substring(0,100)}...</div>
          </Card>
        ))}
      </>}
    </div>
  )
}

function FeelScreen({ onSave }) {
  const [activity, setActivity] = useState('')
  const [focus, setFocus] = useState('')
  const [when, setWhen] = useState('Before activity')
  const [extra, setExtra] = useState('')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const go = async () => {
    if (!activity && !focus && !extra) return
    setLoading(true); setResp(''); setSaved(false)
    try {
      const text = await callAI(`You are a sports performance and mobility coach. Give exactly 5 specific exercises.
Activity: ${activity||'general'}
Focus area: ${focus||'general'}
Timing: ${when}
Extra context: ${extra||'none'}

Format each exercise as:
[Number]. [Exercise name]
[1-2 sentence instruction with exact execution cues]
[Sets/reps or duration]

Be specific to the activity — not generic stretches. End with one sentence on why this matters for ${activity||'performance'}.`)
      setResp(text)
    } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }

  const save = () => {
    onSave({ label:`${activity||focus||'Mobility'} routine`, text:resp, type:'routine' })
    setSaved(true)
  }

  return (
    <div style={{ padding:'20px 20px' }}>
      <PrefLabel>Activity</PrefLabel>
      <ChipRow options={['Golf','Running','Lifting','Basketball','Tennis','Pickleball']} selected={activity} onSelect={v=>setActivity(activity===v?'':v)} />
      <PrefLabel>Focus area</PrefLabel>
      <ChipRow options={['Hips','Lower back','Shoulders','Hamstrings','Upper back','Ankles and knees']} selected={focus} onSelect={v=>setFocus(focus===v?'':v)} />
      <PrefLabel>When</PrefLabel>
      <ChipRow options={['Before activity','After activity','General relief']} selected={when} onSelect={setWhen} />
      <PrefLabel>Extra detail (optional)</PrefLabel>
      <textarea value={extra} onChange={e=>setExtra(e.target.value)}
        placeholder="e.g. hips tight from sitting all day, lower back stiff after golf yesterday..." rows={3}
        style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 12px', fontSize:14, color:T.text, resize:'none', outline:'none' }} />
      <PrimaryBtn onClick={go} disabled={loading||(!activity&&!focus&&!extra)}>
        {loading?'Getting exercises...':'Get exercises'}
      </PrimaryBtn>
      <ResponseBox text={resp} loading={loading} />
      {resp&&!loading&&<SecondaryBtn onClick={save}>{saved?'Saved to My Stack':'+ Save to My Stack'}</SecondaryBtn>}
    </div>
  )
}

function EatScreen({ onSave }) {
  const { pantry, add, remove } = usePantry()
  const [effort, setEffort] = useState('normal')
  const [meal, setMeal] = useState('Lunch')
  const [vibe, setVibe] = useState('')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const effortDesc = { low:'minimal prep, one pan if possible', normal:'standard weeknight cooking', chef:'more involved, worth the extra effort' }

  const buildPrompt = (attempt) => {
    const mem = loadMemory()
    const tasteCtx = buildTasteContext(mem)
    const avoidNote = attempt > 0 ? '\nGive a DIFFERENT recipe than before — be creative, try another protein or preparation style.' : ''
    return `You are a smart, friendly home cook helping someone eat well without overcomplicating it. Sound like a knowledgeable friend — casual, clear, zero fluff.
${tasteCtx}
Pantry: ${pantry.join(', ')}
Meal: ${meal}
Effort: ${effortDesc[effort]}
Vibe: ${vibe||'tasty and simple'}
${avoidNote}

Give ONE recipe the person would actually make tonight. Use only ingredients from their pantry. No specialty items.

Format EXACTLY like this (use these exact section headers):

[Recipe name]

Ingredients:
- [amount] [ingredient]

Steps:
1. [One line. They know how to cook. No hand-holding.]
2. [One line.]
3. [One line.]
4. [One line.]

Macros per serving:
Calories: [number]
Protein: [number]g
Carbs: [number]g
Fat: [number]g

Variations:
- [One-line swap or add-on that changes the vibe]
- [Another quick variation]
- [One more]`
  }

  const go = async (isRetry) => {
    setLoading(true); setResp(''); setSaved(false)
    const attempt = isRetry ? attempts+1 : 0
    setAttempts(attempt)
    if (vibe) updateMemory({ vibes:[vibe] })
    updateMemory({ efforts:[effort], meals:[meal] })
    try {
      const text = await callAI(buildPrompt(attempt))
      setResp(text)
    } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }

  const save = () => {
    updateMemory({ savedIngredients: pantry })
    onSave({ label:`${meal} — ${vibe||'recipe'}`, text:resp, type:'recipe' })
    setSaved(true)
  }

  return (
    <div style={{ padding:'20px 20px' }}>
      <PantryEditor pantry={pantry} onAdd={add} onRemove={remove} />
      <Divider />

      <PrefLabel>Effort level</PrefLabel>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {EFFORT_LEVELS.map(e=>(
          <button key={e.key} onClick={()=>setEffort(e.key)} style={{
            flex:1, padding:'10px 6px', borderRadius:rr('sm'), fontSize:11, textAlign:'center',
            border: effort===e.key ? 'none' : `0.5px solid ${T.border}`,
            background: effort===e.key ? T.text : T.surface,
            color: effort===e.key ? T.bg : T.text2,
          }}>
            <div style={{ fontWeight:500, marginBottom:2, fontSize:12 }}>{e.label}</div>
            <div style={{ opacity:.7, lineHeight:1.3 }}>{e.desc}</div>
          </button>
        ))}
      </div>

      <PrefLabel>Meal type</PrefLabel>
      <ChipRow options={['Breakfast','Lunch','Dinner','Snack']} selected={meal} onSelect={setMeal} />

      <PrefLabel>What's the vibe?</PrefLabel>
      <textarea value={vibe} onChange={e=>setVibe(e.target.value)}
        placeholder="high protein, comforting, fresh, post-workout, cheesy..." rows={2}
        style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 12px', fontSize:14, color:T.text, resize:'none', outline:'none', marginBottom:8 }} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:4 }}>
        {VIBE_SUGGESTIONS.map(v=>(
          <button key={v} onClick={()=>setVibe(vibe===v?'':v)} style={{
            padding:'4px 10px', borderRadius:20, fontSize:11,
            border:`0.5px solid ${T.border}`,
            background: vibe===v ? T.text : T.surface2,
            color: vibe===v ? T.bg : T.text3,
          }}>{v}</button>
        ))}
      </div>

      <PrimaryBtn onClick={()=>go(false)} disabled={loading||pantry.length===0}>
        {loading?'Finding something good...':'Get recipe ideas'}
      </PrimaryBtn>

      {loading && <div style={{ marginTop:12 }}><LoadingDots /></div>}
      {resp&&!loading&&<RecipeCard text={resp} />}
      {resp&&!loading&&(
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={()=>go(true)} style={{ flex:1, padding:'9px 16px', borderRadius:rr('md'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13 }}>Try another</button>
          <button onClick={save} style={{ flex:1, padding:'9px 16px', borderRadius:rr('md'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13 }}>{saved?'Saved':'+ Save'}</button>
        </div>
      )}
    </div>
  )
}

function PlayScreen({ onSave }) {
  const [sport, setSport] = useState('')
  const [rtype, setRtype] = useState('Pre-session warmup')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const go = async () => {
    if (!sport) return
    setLoading(true); setResp(''); setSaved(false)
    try {
      const text = await callAI(`You are a sports performance coach. Give a targeted ${rtype} for ${sport}.
List exactly 6 movements. For each:
[Number]. [Movement name]
[1-2 sentences on execution]
[Duration or reps]
Focus on what actually matters for ${sport} — sport-specific patterns, relevant muscles, injury prevention. Total time under 15 minutes. No filler.`)
      setResp(text)
    } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }

  const save = () => {
    onSave({ label:`${sport} — ${rtype}`, text:resp, type:'routine' })
    setSaved(true)
  }

  return (
    <div style={{ padding:'20px 20px' }}>
      <PrefLabel>Select your sport</PrefLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginBottom:14 }}>
        {SPORTS.map(s=>(
          <button key={s.name} onClick={()=>setSport(s.name)} style={{
            background:T.surface, border: sport===s.name?`1.5px solid ${T.text}`:`0.5px solid ${T.border}`,
            borderRadius:rr('md'), padding:'12px 14px', textAlign:'left',
          }}>
            <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{s.name}</div>
            <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{s.sub}</div>
          </button>
        ))}
      </div>
      <PrefLabel>Routine type</PrefLabel>
      <ChipRow options={['Pre-session warmup','Post-session recovery','Both']} selected={rtype} onSelect={setRtype} />
      <PrimaryBtn onClick={go} disabled={loading||!sport}>
        {loading?'Building routine...':'Get routine'}
      </PrimaryBtn>
      {!sport&&<div style={{ fontSize:12, color:T.text3, textAlign:'center', marginTop:8 }}>Select a sport above</div>}
      <ResponseBox text={resp} loading={loading} />
      {resp&&!loading&&<SecondaryBtn onClick={save}>{saved?'Saved to My Stack':'+ Save to My Stack'}</SecondaryBtn>}
    </div>
  )
}

function PillarsScreen({ onDeepDive }) {
  return (
    <div style={{ padding:'20px 20px' }}>
      {PILLARS.map(p=>{
        const c = PILLAR_COLORS[p.color]
        return (
          <Card key={p.num}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:c.bg, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:10, fontWeight:500, color:c.accent, letterSpacing:.5, textTransform:'uppercase' }}>Pillar {p.num}</div>
                <div style={{ fontSize:16, fontWeight:500, color:T.text, marginTop:1 }}>{p.title}</div>
              </div>
            </div>
            <div style={{ fontSize:13, color:T.text2, lineHeight:1.7, marginBottom:12 }}>{p.body}</div>
            <Divider />
            <div style={{ display:'flex', gap:14, marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Worth your time</div>
                <div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{p.good}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:500, color:'var(--coral)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Ignore this</div>
                <div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{p.skip}</div>
              </div>
            </div>
            <button onClick={()=>onDeepDive(p.prompt)} style={{
              width:'100%', padding:'9px 12px', borderRadius:rr('sm'),
              border:`0.5px solid ${T.border}`, background:'transparent',
              color:T.text2, fontSize:13, textAlign:'left',
            }}>Go deeper</button>
          </Card>
        )
      })}
    </div>
  )
}

function DeepDiveScreen({ prompt, onBack }) {
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    callAI(prompt+'\n\nBe conversational, practical, and concise. No fluff.')
      .then(setResp).catch(e=>setResp('Error: '+e.message)).finally(()=>setLoading(false))
  }, [prompt])
  return (
    <div style={{ padding:'20px 20px' }}>
      <button onClick={onBack} style={{ border:'none', background:'none', color:T.text2, fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:4, padding:0 }}>
        Back to Pillars
      </button>
      <ResponseBox text={resp} loading={loading} />
    </div>
  )
}

function StackScreen({ items, onDelete }) {
  const [tab, setTab] = useState('routines')
  const filtered = items.filter(i=>tab==='routines'?i.type==='routine':i.type==='recipe')
  return (
    <div style={{ padding:'20px 20px' }}>
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['routines','recipes'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:'8px', borderRadius:rr('sm'), fontSize:13,
            border:'none', background:tab===t?T.text:T.surface2,
            color:tab===t?T.bg:T.text2, textTransform:'capitalize',
          }}>{t}</button>
        ))}
      </div>
      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'3rem 0', color:T.text3, fontSize:14, lineHeight:1.8 }}>
          Nothing saved yet.<br/><span style={{ fontSize:12 }}>Generate something and tap Save.</span>
        </div>
      ) : filtered.map((item,i)=>(
        <Card key={i}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:3 }}>{item.date}</div>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{item.label}</div>
              <div style={{ fontSize:12, color:T.text2, marginTop:4, lineHeight:1.5, overflow:'hidden', maxHeight:44 }}>{item.text.substring(0,130)}...</div>
            </div>
            <button onClick={()=>onDelete(item.id)} style={{ border:'none', background:'none', color:T.text3, fontSize:13, paddingLeft:12, flexShrink:0 }}>x</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

const NAV = [
  { tab:'home',    label:'Home'     },
  { tab:'feel',    label:'Feel'     },
  { tab:'eat',     label:'Eat'      },
  { tab:'play',    label:'Play'     },
  { tab:'stack',   label:'My Stack' },
]

const TOPBAR = {
  feel:    { title:'Feel better',  sub:'Sport-specific mobility and targeted relief'   },
  eat:     { title:'Eat better',   sub:'New ideas, your ingredients'                  },
  play:    { title:'Play better',  sub:'Sport-specific warmups and recovery'           },
  pillars: { title:'The Pillars',  sub:'The only things that actually move the needle' },
  stack:   { title:'My Stack',     sub:'Your saved routines and recipes'               },
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [deepDive, setDeepDive] = useState(null)
  const [saved, setSaved] = useState([])

  const handleSave = item => setSaved(prev=>[{ ...item, id:Date.now(), date:new Date().toLocaleDateString() }, ...prev])
  const handleDelete = id => setSaved(prev=>prev.filter(i=>i.id!==id))
  const handleDeepDive = prompt => { setDeepDive(prompt); setTab('pillars') }
  const tb = TOPBAR[tab]

  return (
    <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg, display:'flex', flexDirection:'column' }}>
      {tab!=='home' && (
        <div style={{ padding:'48px 20px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg, flexShrink:0 }}>
          {tb&&<>
            <div style={{ fontSize:22, fontWeight:400, color:T.text, letterSpacing:-.3 }}>{tb.title}</div>
            <div style={{ fontSize:13, color:T.text2, marginTop:4 }}>{tb.sub}</div>
          </>}
        </div>
      )}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:80 }}>
        {tab==='home'    && <HomeScreen onNav={setTab} savedItems={saved} />}
        {tab==='feel'    && <FeelScreen onSave={handleSave} />}
        {tab==='eat'     && <EatScreen onSave={handleSave} />}
        {tab==='play'    && <PlayScreen onSave={handleSave} />}
        {tab==='pillars' && !deepDive && <PillarsScreen onDeepDive={handleDeepDive} />}
        {tab==='pillars' && deepDive  && <DeepDiveScreen prompt={deepDive} onBack={()=>setDeepDive(null)} />}
        {tab==='stack'   && <StackScreen items={saved} onDelete={handleDelete} />}
      </div>
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:430, background:T.bg,
        borderTop:`0.5px solid ${T.border}`, display:'flex',
        padding:'10px 0 max(14px, env(safe-area-inset-bottom))', zIndex:100,
      }}>
        {NAV.map(n=>{
          const active = tab===n.tab
          return (
            <button key={n.tab} onClick={()=>{ setDeepDive(null); setTab(n.tab) }} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:4, padding:'4px 0', border:'none', background:'none',
            }}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:active?T.text:'transparent', transition:'background .2s' }} />
              <span style={{ fontSize:10, color:active?T.text:T.text3, fontWeight:active?500:400, letterSpacing:.2 }}>{n.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
