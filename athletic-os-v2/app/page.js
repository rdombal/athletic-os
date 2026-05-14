'use client'
import { useState, useEffect } from 'react'

// ─── Design tokens (mirrors globals.css for inline styles) ───────────────────
const T = {
  bg:       'var(--bg)',
  surface:  'var(--surface)',
  surface2: 'var(--surface2)',
  border:   'var(--border)',
  border2:  'var(--border2)',
  text:     'var(--text)',
  text2:    'var(--text2)',
  text3:    'var(--text3)',
}

// ─── Data ────────────────────────────────────────────────────────────────────
const INGREDIENTS = [
  'Ground beef','Chicken','Rice','Eggs','Greek yogurt',
  'Potatoes','Cheese','Bread','Pasta','Oats',
  'Salmon','Shrimp','Spinach','Broccoli','Sweet potato','Avocado',
]
const DEFAULT_INGS = new Set(['Ground beef','Chicken','Rice','Eggs','Greek yogurt','Potatoes','Cheese','Bread'])

const SECTION_COLORS = {
  feel:   { bg:'var(--purple-bg)', accent:'var(--purple)' },
  eat:    { bg:'var(--green-bg)',  accent:'var(--green)'  },
  play:   { bg:'var(--coral-bg)', accent:'var(--coral)'  },
  pillars:{ bg:'var(--blue-bg)',  accent:'var(--blue)'   },
}

const PILLARS = [
  { num:1, color:'purple', title:'Sleep',
    body:`Your body doesn't get stronger in the gym — it gets stronger while you sleep. Growth hormone releases, muscles repair, motor patterns consolidate. No supplement, no biohack comes close to 7–9 hours of quality sleep.`,
    good:'Consistent bedtime. Cool dark room. No screens 30 min before bed.',
    skip:'Sleep score obsession. Expensive supplements. Polyphasic sleep.',
    prompt:'Give me 3 practical things I can do tonight to improve my sleep quality. Keep it simple and realistic.' },
  { num:2, color:'green', title:'Protein',
    body:`If you track one thing, track protein. 0.7–1g per pound of bodyweight, spread across 3–4 meals. It preserves muscle, keeps you full, and drives recovery. Everything else in nutrition is secondary to hitting this consistently.`,
    good:'Hitting your daily target. Protein at every meal. Whole foods first.',
    skip:'Protein timing windows. Expensive powders over real food. Tracking every macro daily.',
    prompt:'How do I hit 150g of protein a day using simple everyday foods without obsessing over it?' },
  { num:3, color:'amber', title:'Movement',
    body:`Consistency beats intensity every single time. Three 30-minute sessions a week for a year beats one month of daily two-hour workouts followed by burnout. The best workout is the one you actually do — repeatedly, over years.`,
    good:'Showing up consistently. Walking more. Finding movement you enjoy.',
    skip:'Optimal training splits. Perfect programming. Guilt about missing a day.',
    prompt:'What does a realistic, sustainable weekly movement routine look like for a busy person?' },
  { num:4, color:'blue', title:'Zone 2 cardio',
    body:`Zone 2 is low-intensity cardio where you can hold a full conversation — brisk walk, easy bike, light jog. 3–4 hours per week builds your aerobic engine, improves fat metabolism, and accelerates recovery from everything else.`,
    good:'Walking more. Easy bike rides. Any activity you can sustain 30+ min.',
    skip:'Expensive cardio equipment. Heart rate zone obsession. Going hard every session.',
    prompt:'What is Zone 2 cardio and how do I know if I am in it without a fancy monitor?' },
  { num:5, color:'coral', title:'Progressive overload',
    body:`Your body adapts to stress. If you do the same thing every week, you stop improving. Progressive overload means gradually adding more — weight, reps, or difficulty — over time. It's the only proven mechanism for getting stronger.`,
    good:'Logging your lifts. Adding small increments weekly. Tracking trends over months.',
    skip:'Switching programs every 3 weeks. Chasing soreness. Complex periodization before mastering basics.',
    prompt:'Explain progressive overload simply — how do I apply it to my workouts week to week?' },
  { num:6, color:'green', title:'Recovery',
    body:`Training is just the stimulus. Recovery is where adaptation happens. Most people plateau not because they train too little — but because they never fully recover. Rest days aren't lazy days. They're when you get better.`,
    good:'Rest days. Eating enough. Reducing stress. Light movement between sessions.',
    skip:'Ice baths unless you enjoy them. Compression gadgets. Foam rolling for more than 5 min.',
    prompt:'How do I know when I actually need a rest day vs when I am just being lazy?' },
  { num:7, color:'pink', title:'Stress & balance',
    body:`Chronic stress raises cortisol — it breaks down muscle, disrupts sleep, tanks motivation. Your social life, hobbies, and relationships aren't obstacles to being healthy. They're part of it. Health includes enjoying your life.`,
    good:'Time away from screens. Doing things you love. Not skipping life for the gym.',
    skip:'Optimizing every variable. Guilt from missing workouts. All-or-nothing thinking.',
    prompt:'How do I stay consistent with fitness without letting it take over my life or create anxiety?' },
  { num:8, color:'blue', title:'Hydration',
    body:`Even mild dehydration — just 1–2% — impairs strength, cognition, and endurance. Most people are chronically under-hydrated without realizing it. Half your bodyweight in ounces per day is your baseline target.`,
    good:'Water with every meal. Big glass first thing in the morning. Electrolytes on hard training days.',
    skip:'Expensive hydration products. Tracking exact oz obsessively.',
    prompt:'What are the simplest habits to stay consistently hydrated without thinking about it?' },
]

const PILLAR_COLORS = {
  purple: { bg:'var(--purple-bg)', accent:'var(--purple)' },
  green:  { bg:'var(--green-bg)',  accent:'var(--green)'  },
  amber:  { bg:'var(--amber-bg)',  accent:'var(--amber)'  },
  blue:   { bg:'var(--blue-bg)',   accent:'var(--blue)'   },
  coral:  { bg:'var(--coral-bg)',  accent:'var(--coral)'  },
  pink:   { bg:'var(--pink-bg)',   accent:'var(--pink)'   },
}

const SPORTS = [
  { name:'Golf',       sub:'Rotation + mobility' },
  { name:'Running',    sub:'Hip + glute'         },
  { name:'Lifting',    sub:'Joint prep'          },
  { name:'Basketball', sub:'Legs + explosion'    },
  { name:'Tennis',     sub:'Shoulder + hip'      },
  { name:'Pickleball', sub:'Wrist + lateral'     },
]

// ─── API helper ───────────────────────────────────────────────────────────────
async function callAI(prompt) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function Eyebrow({ children, style }) {
  return <div style={{ fontSize:11, letterSpacing:.7, textTransform:'uppercase', color:T.text3, fontWeight:500, marginBottom:8, ...style }}>{children}</div>
}

function Chip({ label, selected, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 13px', borderRadius:20, fontSize:12, border:'none',
      background: selected ? (color || T.text) : T.surface2,
      color: selected ? (color ? '#fff' : T.bg) : T.text2,
      transition:'all .15s', fontWeight: selected ? 500 : 400,
    }}>{label}</button>
  )
}

function ChipRow({ options, selected, onSelect, single=true }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
      {options.map(o => (
        <Chip key={o} label={o}
          selected={single ? selected===o : selected.has(o)}
          onClick={() => onSelect(o)} />
      ))}
    </div>
  )
}

function PrefLabel({ children }) {
  return <div style={{ fontSize:12, color:T.text3, marginBottom:6, letterSpacing:.2 }}>{children}</div>
}

function StyledTextarea({ value, onChange, placeholder, rows=3 }) {
  return (
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:var_r('md'),
        padding:'10px 12px', fontSize:14, color:T.text, resize:'none', outline:'none',
        '::placeholder':{ color:T.text3 } }} />
  )
}

function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', marginTop:10, padding:'12px 16px', borderRadius:var_r('md'),
      border:'none', background: disabled ? T.surface2 : T.text,
      color: disabled ? T.text3 : T.bg, fontSize:14, fontWeight:500, letterSpacing:.1,
    }}>{children}</button>
  )
}

function SecondaryBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', marginTop:8, padding:'9px 16px', borderRadius:var_r('md'),
      border:`0.5px solid ${T.border}`, background:'transparent',
      color:T.text2, fontSize:13,
    }}>{children}</button>
  )
}

function LoadingDots() {
  return (
    <div style={{ display:'flex', gap:5, padding:'10px 0', alignItems:'center' }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:6,height:6,borderRadius:'50%',background:T.text3,
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
      borderRadius:var_r('md'), padding:16, fontSize:14, lineHeight:1.75,
      color:T.text, whiteSpace:'pre-wrap' }}>
      {loading ? <LoadingDots /> : text}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background:T.surface, border:`0.5px solid ${T.border}`,
      borderRadius:var_r('md'), padding:'14px 16px', marginBottom:10, ...style }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height:'0.5px', background:T.border, margin:'12px 0' }} />
}

function var_r(size) {
  return size==='sm'?'8px':size==='lg'?'16px':'12px'
}

// ─── Screens ─────────────────────────────────────────────────────────────────
function HomeScreen({ onNav, savedItems }) {
  const time = new Date().getHours()
  const greeting = time<12 ? 'Good morning' : time<17 ? 'Good afternoon' : 'Good evening'

  const tiles = [
    { tab:'feel',    label:'Feel better',  desc:'Sport-specific mobility',   color:SECTION_COLORS.feel    },
    { tab:'eat',     label:'Eat better',   desc:'New ideas, same ingredients',color:SECTION_COLORS.eat    },
    { tab:'play',    label:'Play better',  desc:'Warmups & recovery',         color:SECTION_COLORS.play   },
    { tab:'pillars', label:'The Pillars',  desc:'What actually matters',      color:SECTION_COLORS.pillars},
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
            borderRadius:var_r('md'), padding:14, textAlign:'left',
          }}>
            <div style={{ width:28,height:28,borderRadius:7,background:t.color.bg,marginBottom:10 }} />
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
      <ChipRow options={['Golf','Running','Lifting','Basketball','Tennis','Pickleball']}
        selected={activity} onSelect={v=>setActivity(activity===v?'':v)} />
      <PrefLabel>Focus area</PrefLabel>
      <ChipRow options={['Hips','Lower back','Shoulders','Hamstrings','Upper back','Ankles & knees']}
        selected={focus} onSelect={v=>setFocus(focus===v?'':v)} />
      <PrefLabel>When</PrefLabel>
      <ChipRow options={['Before activity','After activity','General relief']}
        selected={when} onSelect={setWhen} />
      <PrefLabel>Extra detail (optional)</PrefLabel>
      <StyledTextarea value={extra} onChange={setExtra}
        placeholder="e.g. hips tight from sitting all day, lower back stiff after golf yesterday..." />
      <PrimaryBtn onClick={go} disabled={loading||(!activity&&!focus&&!extra)}>
        {loading ? 'Getting exercises...' : 'Get exercises'}
      </PrimaryBtn>
      <ResponseBox text={resp} loading={loading} />
      {resp && !loading && (
        <SecondaryBtn onClick={save}>{saved ? '✓ Saved to My Stack' : '+ Save to My Stack'}</SecondaryBtn>
      )}
    </div>
  )
}

function RecipeCard({ text }) {
  if (!text) return null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const name = lines[0] || ''
  const ingStart = lines.findIndex(l => l.toLowerCase().includes('ingredient'))
  const stepStart = lines.findIndex(l => l.toLowerCase().match(/^steps?:?$/))
  const macroStart = lines.findIndex(l => l.toLowerCase().includes('macro') || l.toLowerCase().includes('calorie'))
  const ingredients = ingStart >= 0 ? lines.slice(ingStart+1, stepStart > 0 ? stepStart : macroStart > 0 ? macroStart : undefined).filter(l => !l.toLowerCase().includes('ingredient')) : []
  const steps = stepStart >= 0 ? lines.slice(stepStart+1, macroStart > 0 ? macroStart : undefined).filter(l => !l.toLowerCase().match(/^steps?:?$/)) : []
  const macroLines = macroStart >= 0 ? lines.slice(macroStart+1) : []
  const macros = {}
  macroLines.forEach(l => {
    const num = l.match(/[\d]+/)?.[0] || ''
    const lower = l.toLowerCase()
    if (lower.includes('calorie') || lower.includes('kcal')) macros.cal = num
    else if (lower.includes('protein')) macros.protein = num
    else if (lower.includes('carb')) macros.carbs = num
    else if (lower.includes('fat')) macros.fat = num
  })
  const stepIcons = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣']
  return (
    <div style={{ marginTop:14, background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:var_r('md'), overflow:'hidden' }}>
      <div style={{ padding:'16px 16px 12px', borderBottom:`0.5px solid ${T.border}` }}>
        <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{name}</div>
      </div>
      {ingredients.length > 0 && (
        <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>🛒 Ingredients</div>
          {ingredients.map((ing, i) => (
            <div key={i} style={{ fontSize:13, color:T.text2, paddingBottom:5, lineHeight:1.4 }}>— {ing.replace(/^[-•*]\s*/, '')}</div>
          ))}
        </div>
      )}
      {steps.length > 0 && (
        <div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>👨‍🍳 Steps</div>
          {steps.map((step, i) => (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
              <span style={{ fontSize:14, flexShrink:0 }}>{stepIcons[i] || '▸'}</span>
              <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{step.replace(/^\d+[\.)\s]+/, '').replace(/^[-•*]\s*/, '')}</div>
            </div>
          ))}
        </div>
      )}
      {Object.keys(macros).length > 0 && (
        <div style={{ padding:'12px 16px' }}>
          <div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>📊 Macros per serving</div>
          <div style={{ display:'flex', gap:8 }}>
            {macros.cal && <div style={{ flex:1, background:T.surface2, borderRadius:var_r('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.cal}</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>cal</div></div>}
            {macros.protein && <div style={{ flex:1, background:T.surface2, borderRadius:var_r('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.protein}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>protein</div></div>}
            {macros.carbs && <div style={{ flex:1, background:T.surface2, borderRadius:var_r('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.carbs}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>carbs</div></div>}
            {macros.fat && <div style={{ flex:1, background:T.surface2, borderRadius:var_r('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.fat}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>fat</div></div>}
          </div>
        </div>
      )}
    </div>
  )
}

function EatScreen({ onSave }) {
  const [ings, setIngs] = useState(new Set(DEFAULT_INGS))
  const [time, setTime] = useState('Under 20 min')
  const [meal, setMeal] = useState('Lunch')
  const [extra, setExtra] = useState('')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggle = ing => setIngs(prev=>{ const n=new Set(prev); n.has(ing)?n.delete(ing):n.add(ing); return n })

  const go = async () => {
    setLoading(true); setResp(''); setSaved(false)
    try {
      const text = await callAI(`You are a fun, friendly home cook. Give ONE recipe using these ingredients. Keep the tone light — like a friend texting you a recipe.

Available ingredients: ${[...ings].join(', ')}
Meal: ${meal}
Time: ${time}
Vibe: ${extra||'something tasty and simple'}

Format EXACTLY like this:

[Fun recipe name]

Ingredients:
- [amount] [ingredient]

Steps:
1. [One punchy line. Assume they know how to cook.]
2. [One line.]
3. [One line.]
4. [One line.]

Macros per serving:
Calories: [number]
Protein: [number]g
Carbs: [number]g
Fat: [number]g

Max 5 steps. One line each. No explaining basic techniques.`)
      setResp(text)
    } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }

  const save = () => {
    onSave({ label:`${meal} recipe`, text:resp, type:'recipe' })
    setSaved(true)
  }

  return (
    <div style={{ padding:'20px 20px' }}>
      <PrefLabel>Your ingredients — tap to toggle</PrefLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:6, marginBottom:14 }}>
        {INGREDIENTS.map(ing=>(
          <button key={ing} onClick={()=>toggle(ing)} style={{
            padding:'8px 10px', borderRadius:var_r('sm'), fontSize:12, textAlign:'center',
            border:'none',
            background: ings.has(ing) ? T.text : T.surface2,
            color: ings.has(ing) ? T.bg : T.text2,
          }}>{ing}</button>
        ))}
      </div>
      <Divider />
      <PrefLabel>Meal type</PrefLabel>
      <ChipRow options={['Breakfast','Lunch','Dinner','Snack']} selected={meal} onSelect={setMeal} />
      <PrefLabel>Cooking time</PrefLabel>
      <ChipRow options={['Under 20 min','20–40 min','I have time']} selected={time} onSelect={setTime} />
      <PrefLabel>Any craving or vibe? (optional)</PrefLabel>
      <StyledTextarea value={extra} onChange={setExtra}
        placeholder="e.g. something warm and filling, bold flavors, super simple..." />
      <PrimaryBtn onClick={go} disabled={loading}>
        {loading ? 'Finding something good...' : 'Get recipe ideas'}
      </PrimaryBtn>
      {loading && <ResponseBox text='' loading={true} />}
      {resp && !loading && <RecipeCard text={resp} />}
      {resp && !loading && (
        <SecondaryBtn onClick={save}>{saved ? '✓ Saved to My Stack' : '+ Save to My Stack'}</SecondaryBtn>
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

Focus on what actually matters for ${sport} — sport-specific patterns, relevant muscles, injury prevention for that sport. Total time under 15 minutes. No filler.`)
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
            background:T.surface, border: sport===s.name ? `1.5px solid ${T.text}` : `0.5px solid ${T.border}`,
            borderRadius:var_r('md'), padding:'12px 14px', textAlign:'left',
          }}>
            <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{s.name}</div>
            <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{s.sub}</div>
          </button>
        ))}
      </div>
      <PrefLabel>Routine type</PrefLabel>
      <ChipRow options={['Pre-session warmup','Post-session recovery','Both']}
        selected={rtype} onSelect={setRtype} />
      <PrimaryBtn onClick={go} disabled={loading||!sport}>
        {loading ? 'Building routine...' : 'Get routine'}
      </PrimaryBtn>
      {!sport && <div style={{ fontSize:12, color:T.text3, textAlign:'center', marginTop:8 }}>Select a sport above</div>}
      <ResponseBox text={resp} loading={loading} />
      {resp && !loading && (
        <SecondaryBtn onClick={save}>{saved ? '✓ Saved to My Stack' : '+ Save to My Stack'}</SecondaryBtn>
      )}
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
              width:'100%', padding:'9px 12px', borderRadius:var_r('sm'),
              border:`0.5px solid ${T.border}`, background:'transparent',
              color:T.text2, fontSize:13, textAlign:'left',
            }}>Go deeper ↗</button>
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
    callAI(prompt + '\n\nBe conversational, practical, and concise. No fluff.')
      .then(setResp).catch(e=>setResp('Error: '+e.message))
      .finally(()=>setLoading(false))
  }, [prompt])

  return (
    <div style={{ padding:'20px 20px' }}>
      <button onClick={onBack} style={{ border:'none', background:'none', color:T.text2, fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:4, padding:0 }}>
        ← Back to Pillars
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
            flex:1, padding:'8px', borderRadius:var_r('sm'), fontSize:13,
            border:'none',
            background: tab===t ? T.text : T.surface2,
            color: tab===t ? T.bg : T.text2,
            textTransform:'capitalize',
          }}>{t}</button>
        ))}
      </div>
      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'3rem 0', color:T.text3, fontSize:14, lineHeight:1.8 }}>
          Nothing saved yet.<br/>
          <span style={{ fontSize:12 }}>Generate something and tap Save.</span>
        </div>
      ) : filtered.map((item,i)=>(
        <Card key={i}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:3 }}>{item.date}</div>
              <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{item.label}</div>
              <div style={{ fontSize:12, color:T.text2, marginTop:4, lineHeight:1.5, overflow:'hidden', maxHeight:44 }}>{item.text.substring(0,130)}...</div>
            </div>
            <button onClick={()=>onDelete(item.id)} style={{ border:'none', background:'none', color:T.text3, fontSize:13, paddingLeft:12, flexShrink:0 }}>✕</button>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV = [
  { tab:'home',    label:'Home'     },
  { tab:'feel',    label:'Feel'     },
  { tab:'eat',     label:'Eat'      },
  { tab:'play',    label:'Play'     },
  { tab:'stack',   label:'My Stack' },
]

const TOPBAR = {
  feel:    { title:'Feel better',  sub:'Sport-specific mobility & targeted relief'    },
  eat:     { title:'Eat better',   sub:'New combinations from your usual ingredients' },
  play:    { title:'Play better',  sub:'Sport-specific warmups & recovery'            },
  pillars: { title:'The Pillars',  sub:'The only things that actually move the needle'},
  stack:   { title:'My Stack',     sub:'Your saved routines & recipes'                },
}

// ─── Root app ─────────────────────────────────────────────────────────────────
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
          {tb && <>
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
          const active = tab===n.tab || (n.tab==='pillars' && tab==='pillars')
          return (
            <button key={n.tab} onClick={()=>{ setDeepDive(null); setTab(n.tab) }} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:4, padding:'4px 0', border:'none', background:'none',
            }}>
              <div style={{ width:4, height:4, borderRadius:'50%',
                background: active ? T.text : 'transparent',
                transition:'background .2s' }} />
              <span style={{ fontSize:10, color: active ? T.text : T.text3,
                fontWeight: active ? 500 : 400, letterSpacing:.2 }}>
                {n.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
