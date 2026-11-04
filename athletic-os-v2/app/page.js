'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import AuthScreen from './AuthScreen'
import LiftScreen from './LiftScreen'
import MoveScreen, { QuickRelief, getWarmupType } from './MoveScreen'
import { ExerciseList } from './ui/Routine'
import { Toast, TabBar, ScreenHeader, HaleMark as HaleLogo, Button, IconButton, Card as UICard, Row, Skeleton, Icon,
  Chip as UIChip, ChipRow as UIChipRow, Section, Field, TextInput, TextArea, Segmented, OptionCards, Token, Disclosure, Hairline, ChoiceList, StepProgress } from './ui'
import {
  getProfile, saveProfile,
  getPantry, savePantry,
  getTasteMemory, updateTasteMemory,
  getSavedItems, addSavedItem, deleteSavedItem,
  getDailyCache, setDailyCache,
  getPrograms, getSessions,
} from './db'

// A password reset or invite link signs the person in. Read the URL at load, before
// Supabase strips it, so the app asks for a new password instead of going to Home.
const ARRIVED_TO_SET_PASSWORD = typeof window !== 'undefined' &&
  /type=(recovery|invite)|setPassword=true/.test(window.location.search + window.location.hash)

const T = {
  bg:'var(--bg)', surface:'var(--surface)', surface2:'var(--surface2)', surface3:'var(--surface3)',
  border:'var(--border)', border2:'var(--border2)',
  text:'var(--text)', text2:'var(--text2)', text3:'var(--text3)',
}

const SECTION_COLORS = {
  feel:   { bg:'var(--purple-bg)', dot:'var(--purple-dim)' },
  eat:    { bg:'var(--green-bg)',  dot:'var(--green-dim)'  },
  play:   { bg:'var(--coral-bg)', dot:'var(--coral-dim)'  },
  pillars:{ bg:'var(--cream-bg)',  dot:'var(--cream-dim)'   },
}

const PILLAR_COLORS = {
  purple:{ bg:'var(--purple-bg)', accent:'var(--purple)' },
  green: { bg:'var(--green-bg)',  accent:'var(--green)'  },
  amber: { bg:'var(--amber-bg)',  accent:'var(--amber)'  },
  blue:  { bg:'var(--cream-bg)',   accent:'var(--cream)'   },
  coral: { bg:'var(--coral-bg)', accent:'var(--coral)'  },
  pink:  { bg:'var(--pink-bg)',   accent:'var(--pink)'   },
}

const PILLARS = [
  { num:1, color:'purple', title:'Sleep',
    identity:'People who prioritize recovery perform better and feel better — consistently.',
    body:`Your body gets stronger while you sleep, not while you train. Growth hormone releases, muscles repair, movement patterns consolidate. Every hour of quality sleep is an investment in who you are becoming.`,
    good:'Consistent bedtime. Cool dark room. No screens 30 min before bed.',
    skip:'Sleep score obsession. Expensive supplements. Polyphasic sleep.',
    prompt:'Give me 3 practical things I can do tonight to improve my sleep quality. Keep it simple and realistic.' },
  { num:2, color:'green', title:'Protein',
    identity:'People who feel strong and energetic fuel themselves consistently — not perfectly.',
    body:`If you build one nutrition habit, make it protein. 0.7-1g per pound of bodyweight, spread across meals. It preserves muscle, keeps you full, and drives recovery. Everything else is secondary to this one consistent habit.`,
    good:'Protein at every meal. Whole foods first. Hitting your range most days.',
    skip:'Timing windows. Expensive powders. Tracking every macro every day.',
    prompt:'How do I hit 150g of protein a day using simple everyday foods without obsessing over it?' },
  { num:3, color:'amber', title:'Movement',
    identity:'Healthy people move often — not perfectly. Consistency is the whole game.',
    body:`Three sessions a week for a year will change your life. One month of daily intense workouts will not. The people who feel athletic long-term are the ones who made movement a system, not an event.`,
    good:'Showing up consistently. Walking more. Movement you actually enjoy.',
    skip:'Perfect programming. Optimal splits. Guilt about missing a day.',
    prompt:'What does a realistic, sustainable weekly movement routine look like for a busy person?' },
  { num:4, color:'blue', title:'Zone 2',
    identity:'Active people build their aerobic base quietly — walks, easy rides, light jogs.',
    body:`Zone 2 is low enough intensity that you can hold a full conversation. 3-4 hours per week builds the engine that powers everything else — fat metabolism, recovery, endurance. Most of it can just be walking.`,
    good:'Walking more. Easy bike rides. Any activity you sustain for 30+ min.',
    skip:'Heart rate zone obsession. Expensive equipment. Going hard every session.',
    prompt:'What is Zone 2 cardio and how do I know if I am in it without a fancy monitor?' },
  { num:5, color:'coral', title:'Progressive overload',
    identity:'People who get stronger over time do one simple thing — they add a little more, consistently.',
    body:`Your body adapts to whatever you ask of it. Add a little more weight, a few more reps, or slightly more difficulty over time — and you will get stronger. This is the only mechanism that matters. Small, consistent additions compound.`,
    good:'Logging your lifts. Small weekly increments. Tracking over months not days.',
    skip:'Switching programs every few weeks. Chasing soreness. Complex periodization.',
    prompt:'Explain progressive overload simply — how do I apply it to my workouts week to week?' },
  { num:6, color:'green', title:'Recovery',
    identity:'People who perform well long-term treat rest as part of the work — not a break from it.',
    body:`Training is the signal. Recovery is where adaptation happens. Rest days are not lazy days — they are the days you actually improve. The people who plateau are usually under-recovered, not undertrained.`,
    good:'Rest days. Eating enough. Light movement. Reducing stress.',
    skip:'Ice baths unless you enjoy them. Compression gadgets. Foam rolling for more than 5 min.',
    prompt:'How do I know when I actually need a rest day vs when I am just being lazy?' },
  { num:7, color:'pink', title:'Stress and balance',
    identity:'Healthy people protect their energy — they know that life balance is part of health.',
    body:`Chronic stress breaks down muscle, disrupts sleep, and tanks motivation. Your relationships, hobbies, and social life are not obstacles to being healthy — they are part of it. An app that ignores this is not a health app.`,
    good:'Time away from screens. Doing things you love. Not skipping life for the gym.',
    skip:'Optimizing every variable. All-or-nothing thinking. Guilt about imperfect weeks.',
    prompt:'How do I stay consistent with fitness without letting it take over my life or create anxiety?' },
  { num:8, color:'blue', title:'Hydration',
    identity:'People who feel and perform well stay consistently hydrated — it is simpler than most think.',
    body:`Even mild dehydration impairs strength, focus, and endurance. Most people are chronically under-hydrated without realizing it. The fix is simple: water with every meal, a big glass first thing in the morning.`,
    good:'Water with every meal. Big glass in the morning. Electrolytes on hard training days.',
    skip:'Expensive hydration products. Tracking exact ounces obsessively.',
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

const VIBE_SUGGESTIONS = ['high protein','comforting','fresh','post-workout','lighter','cheesy','spicy','something different','macro friendly','quick and easy']
const EFFORT_LEVELS = [
  { key:'low',    label:'Low effort',  desc:'One pan, minimal prep' },
  { key:'normal', label:'Normal',      desc:'Standard weeknight'    },
  { key:'chef',   label:'Chef up',     desc:'Worth the extra time'  },
]
const CUISINES = ['Mexican','Asian','Mediterranean','Italian','American','Middle Eastern','Indian']
const IDENTITY_STATEMENTS = [
  'Someone who moves consistently',
  'Someone who feels strong and healthy',
  'Someone who takes care of their body',
  'Someone with more energy',
  'Someone who can keep doing the activities they love',
  'Someone who feels athletic',
]
const GOALS = ['Build muscle','Lose body fat','Maintain','Athletic performance','Feel good']
const ACTIVITY_LEVELS = ['Light (1-2x/week)','Moderate (3-4x/week)','Very active (5+/week)']
const ADJUST_BUTTONS = [
  { key:'calories_up',   label:'More filling'      },
  { key:'calories_down', label:'Lighter feel'      },
  { key:'protein_up',    label:'More protein'      },
  { key:'carbs_up',      label:'More energy'       },
  { key:'quicker',       label:'Make it quicker'   },
  { key:'simpler',       label:'Keep it simple'    },
]
const TIP_CATEGORIES  = ['sleep','nutrition','movement','recovery','mindset','performance','hydration']
const FACT_CATEGORIES = ['exercise science','nutrition science','sleep science','the human body','sports performance','longevity','mental health and exercise']

// ─── API ──────────────────────────────────────────────────────────────────────
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
    return data.text
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function buildTasteContext(mem) {
  const parts = []
  if (mem.savedIngredients?.length > 3) {
    const freq = {}
    mem.savedIngredients.forEach(i => { freq[i] = (freq[i]||0)+1 })
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k)
    parts.push(`Ingredients this user saves most: ${top.join(', ')}`)
  }
  if (mem.vibes?.length > 2) {
    const freq = {}
    mem.vibes.forEach(v => { freq[v] = (freq[v]||0)+1 })
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k)
    parts.push(`Vibes they gravitate toward: ${top.join(', ')}`)
  }
  if (mem.efforts?.length > 2) {
    const freq = {}
    mem.efforts.forEach(e => { freq[e] = (freq[e]||0)+1 })
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]
    if (top) parts.push(`Usually cooks at: ${top[0]} effort`)
  }
  return parts.length ? `\nUser taste profile (use quietly):\n${parts.join('\n')}\n` : ''
}

function buildProfileContext(profile) {
  if (!profile) return ''
  const parts = []
  if (profile.goal) parts.push(`Goal: ${profile.goal}`)
  if (profile.activity) parts.push(`Activity level: ${profile.activity}`)
  if (profile.calories) parts.push(`Daily calorie target: ${profile.calories} cal`)
  if (profile.protein) parts.push(`Daily protein target: ${profile.protein}g`)
  if (profile.notes) parts.push(`About them: ${profile.notes}`)
  return parts.length ? `\nUser profile (use to inform recipe portions and macros):\n${parts.join('\n')}\n` : ''
}

function buildNutritionNudge(profile, workoutType) {
  if (!profile?.goal) return ''
  const isMuscle = profile.goal?.toLowerCase().includes('muscle')
  const isFat = profile.goal?.toLowerCase().includes('fat')
  const isLower = workoutType?.toLowerCase().includes('lower') || workoutType?.toLowerCase().includes('leg') || workoutType?.toLowerCase().includes('squat') || workoutType?.toLowerCase().includes('deadlift')
  const isUpper = workoutType?.toLowerCase().includes('upper') || workoutType?.toLowerCase().includes('push') || workoutType?.toLowerCase().includes('pull') || workoutType?.toLowerCase().includes('press')
  if (isMuscle) {
    if (isLower) return 'High carb + high protein recovery meal. Lower body sessions deplete glycogen heavily — prioritize replenishment.'
    if (isUpper) return 'High protein focus. Upper body sessions demand muscle protein synthesis — aim for 40-50g protein in this meal.'
    return 'Prioritize protein and carbs in your next meal to support muscle growth.'
  }
  if (isFat) return 'Moderate protein, lower carb. Keep total calories in check while hitting your protein target.'
  return 'Prioritize protein in your next meal to support recovery.'
}

// ─── UI primitives ────────────────────────────────────────────────────────────
function rr(s) { return s==='sm'?'8px':s==='lg'?'16px':'12px' }
// Legacy helpers, now thin wrappers over app/ui so older call sites match the system.
function Eyebrow({ children, style }) {
  return <div className="t-footnote c-2" style={{ marginBottom:8, ...style }}>{children}</div>
}
function PrefLabel({ children }) {
  return <div className="t-footnote c-2" style={{ fontWeight:600, marginBottom:8 }}>{children}</div>
}
function Chip({ label, selected, onClick }) {
  return <UIChip small selected={selected} onClick={onClick}>{label}</UIChip>
}
function ChipRow({ options, selected, onSelect }) {
  return (
    <UIChipRow style={{ marginBottom:20 }}>
      {options.map(o=><UIChip key={o} small selected={selected===o} onClick={()=>onSelect(o)}>{o}</UIChip>)}
    </UIChipRow>
  )
}
function PrimaryBtn({ children, onClick, disabled }) {
  return <Button variant="primary" full onClick={onClick} disabled={disabled} style={{ marginTop:12 }}>{children}</Button>
}
function SecondaryBtn({ children, onClick, style }) {
  return <Button variant="secondary" size="md" full onClick={onClick} style={{ marginTop:8, ...style }}>{children}</Button>
}
function LoadingDots() {
  return <Skeleton lines={3} />
}
function ResponseBox({ text, loading }) {
  if (!loading && !text) return null
  return (
    <UICard style={{ marginTop:12 }}>
      {loading ? <Skeleton lines={4} /> : <div className="t-body" style={{ whiteSpace:'pre-wrap', lineHeight:1.7 }}>{text}</div>}
    </UICard>
  )
}
function Card({ children, style }) {
  return <UICard style={{ marginBottom:12, ...style }}>{children}</UICard>
}
function Divider() { return <Hairline style={{ margin:'20px 0' }} /> }


// ─── Toast notification ───────────────────────────────────────────────────────
// ─── Daily cards ──────────────────────────────────────────────────────────────
const CAT_COLORS = {
  sleep:'var(--purple-bg)', nutrition:'var(--green-bg)', movement:'var(--amber-bg)',
  recovery:'var(--cream-bg)', mindset:'var(--pink-bg)', performance:'var(--coral-bg)',
  hydration:'var(--cream-bg)', 'exercise science':'var(--coral-bg)',
  'nutrition science':'var(--green-bg)', 'sleep science':'var(--purple-bg)',
  'the human body':'var(--amber-bg)', 'sports performance':'var(--coral-bg)',
  'longevity':'var(--cream-bg)', 'mental health and exercise':'var(--pink-bg)'
}
const CAT_TEXT = {
  sleep:'var(--purple)', nutrition:'var(--green)', movement:'var(--amber)',
  recovery:'var(--cream)', mindset:'var(--pink)', performance:'var(--coral)',
  hydration:'var(--cream)', 'exercise science':'var(--coral)',
  'nutrition science':'var(--green)', 'sleep science':'var(--purple)',
  'the human body':'var(--amber)', 'sports performance':'var(--coral)',
  'longevity':'var(--cream)', 'mental health and exercise':'var(--pink)'
}

function DailyTip({ userId, cacheKey, category, cardLabel, promptFn, fallback }) {
  const [item, setItem] = useState(null)
  useEffect(() => {
    if (!userId) return
    getDailyCache(userId, cacheKey).then(cached => {
      if (cached) { setItem(cached); return }
      callAI(promptFn(category))
        .then(text => {
          const titleMatch = text.match(/TITLE:\s*(.+)/i)
          const bodyMatch = text.match(/(?:TIP|FACT):\s*([\s\S]+)/i)
          const parsed = { category, title: titleMatch?titleMatch[1].trim():cardLabel, text: bodyMatch?bodyMatch[1].trim():text.trim() }
          setDailyCache(userId, cacheKey, parsed)
          setItem(parsed)
        })
        .catch(() => setItem({ title:cardLabel, category, text:fallback }))
    })
  }, [userId])
  return (
    <section style={{ padding:'0 var(--s-1)' }} aria-live="polite">
      <div className="t-footnote c-accent" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span aria-hidden="true" style={{ width:6, height:6, borderRadius:3, background:'var(--c-accent)' }} />
        {cardLabel}{item?.title && item.title !== cardLabel ? ` · ${item.title}` : ''}
      </div>
      {item
        ? <p style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:300, lineHeight:1.45, color:'var(--c-text)' }}>{item.text}</p>
        : <Skeleton lines={2} label="Loading today's tip" />}
    </section>
  )
}

// ─── Pantry hook ──────────────────────────────────────────────────────────────
function usePantry(userId) {
  const [pantry, setPantry] = useState([])
  useEffect(() => {
    if (!userId) return
    getPantry(userId).then(setPantry)
  }, [userId])
  const add = async (item) => {
    const t = item.trim()
    if (!t || pantry.map(p=>p.toLowerCase()).includes(t.toLowerCase())) return false
    const next = [...pantry, t]
    setPantry(next)
    await savePantry(userId, next)
    return true
  }
  const remove = async (item) => {
    const next = pantry.filter(p=>p!==item)
    setPantry(next)
    await savePantry(userId, next)
  }
  return { pantry, add, remove }
}

// ─── Pantry editor ────────────────────────────────────────────────────────────
const QUICK_ADD = [
  'Eggs','Chicken','Ground beef','Salmon','Steak',
  'Rice','Pasta','Potatoes','Beans','Corn',
  'Broccoli','Spinach','Tomatoes','Cheese','Greek yogurt',
  'Banana','Blueberries','Sweet potato','Avocado','Oats',
]

function PantryEditor({ pantry, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [showQuick, setShowQuick] = useState(pantry.length === 0)
  const handleAdd = async (item) => {
    const t = (item ?? input).trim()
    if (!t) return
    const ok = await onAdd(t)
    if (ok) { setInput(''); setError('') } else setError('Already in your pantry')
  }
  const have = pantry.map(p=>p.toLowerCase())
  const quickAvailable = QUICK_ADD.filter(q => !have.includes(q.toLowerCase()))
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {pantry.length > 0
        ? <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {pantry.map(ing => <Token key={ing} onRemove={()=>onRemove(ing)}>{ing}</Token>)}
          </div>
        : <p className="t-subhead c-2">Add a few things you have. One good recipe comes back, built from them.</p>}

      <form onSubmit={e=>{ e.preventDefault(); handleAdd() }} style={{ display:'flex', gap:8 }}>
        <TextInput value={input} onChange={v=>{ setInput(v); setError('') }} placeholder="Add an ingredient"
          aria-label="Add an ingredient" enterKeyHint="done" style={{ flex:1 }} />
        <Button type="submit" variant="secondary" size="lg" disabled={!input.trim()} style={{ padding:'0 20px' }}>Add</Button>
      </form>
      {error && <span className="t-footnote" style={{ color:'var(--c-danger)', fontWeight:400 }} role="alert">{error}</span>}

      {showQuick && quickAvailable.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {quickAvailable.slice(0,12).map(q=>(
            <UIChip key={q} small onClick={()=>handleAdd(q)}>
              <Icon name="plus" size={14} strokeWidth={2} style={{ color:'var(--c-text-3)', marginLeft:-4 }} />{q}
            </UIChip>
          ))}
        </div>
      )}
      {pantry.length > 0 && (
        <button onClick={()=>setShowQuick(v=>!v)} className="t-subhead c-accent" style={{ alignSelf:'flex-start', minHeight:36, border:'none', background:'none', padding:0, fontWeight:500 }}>
          {showQuick ? 'Hide suggestions' : 'Show suggestions'}
        </button>
      )}
    </div>
  )
}

// ─── Recipe card ──────────────────────────────────────────────────────────────
function RecipeCard({ text, onAdjust, adjusting }) {
  const [showMacros, setShowMacros] = useState(false)
  if (!text) return null
  const lines = text.split('\n').map(l=>l.trim().replace(/^#+\s*/,'').replace(/\*\*/g,'')).filter(Boolean)
  const name = lines[0]||''
  const ingStart  = lines.findIndex(l=>l.toLowerCase().startsWith('ingredient'))
  const stepStart = lines.findIndex(l=>l.toLowerCase().match(/^steps?:?$|^directions?:?$|^instructions?:?$/))
  const macroStart= lines.findIndex(l=>l.toLowerCase().match(/^macros?|^nutrition/))
  const varStart  = lines.findIndex(l=>l.toLowerCase().match(/^variations?:?$/))
  const firstSection = [ingStart,stepStart,macroStart,varStart].filter(i=>i>0)
  const intro = firstSection.length ? lines.slice(1, Math.min(...firstSection)) : []
  const slice = (from,tos) => { const ends=tos.filter(t=>t>from); const end=ends.length?Math.min(...ends):undefined; return lines.slice(from+1,end).filter(l=>l) }
  const ingredients = ingStart>=0  ? slice(ingStart,[stepStart,macroStart,varStart]) : []
  const steps       = stepStart>=0 ? slice(stepStart,[macroStart,varStart])          : []
  const macroLines  = macroStart>=0? slice(macroStart,[varStart])                    : []
  const varLines    = varStart>=0  ? slice(varStart,[])                              : []
  const macros = {}
  macroLines.forEach(l=>{ const nums=l.match(/\d+/g)||[]; const num=nums.length?nums.reduce((a,b)=>a.length>=b.length?a:b):''; const low=l.toLowerCase(); if(low.includes('calorie')||low.includes('kcal'))macros.cal=num; else if(low.includes('protein'))macros.protein=num; else if(low.includes('carb'))macros.carbs=num; else if(low.includes('fat'))macros.fat=num })
  const macroList = [['cal','Calories',''],['protein','Protein','g'],['carbs','Carbs','g'],['fat','Fat','g']].filter(([k])=>macros[k])
  const clean = l => l.replace(/^\d+[\.\)]\s*/,'').replace(/^[-*•]\s*/,'')

  return (
    <UICard style={{ padding:0, overflow:'hidden' }}>
      <div style={{ padding:'24px 20px 20px' }}>
        <h2 className="t-title2" style={{ fontSize:26, lineHeight:1.15 }}>{name}</h2>
        {intro.length > 0 && <p className="t-subhead c-2" style={{ marginTop:8 }}>{intro.join(' ')}</p>}
      </div>

      {ingredients.length>0 && (
        <div style={{ padding:'0 20px 20px' }}>
          <h3 className="t-footnote c-2" style={{ fontWeight:600, marginBottom:10 }}>Ingredients</h3>
          <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
            {ingredients.map((ing,i)=>(
              <li key={i} className="t-body" style={{ display:'flex', gap:10, alignItems:'baseline' }}>
                <span aria-hidden="true" style={{ width:5, height:5, borderRadius:3, background:'var(--c-accent)', flexShrink:0, transform:'translateY(-3px)' }} />
                {clean(ing)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length>0 && (
        <div style={{ padding:'20px', background:'var(--c-muted)' }}>
          <h3 className="t-footnote c-2" style={{ fontWeight:600, marginBottom:12 }}>Steps</h3>
          <ol style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:14 }}>
            {steps.map((step,i)=>(
              <li key={i} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <span className="t-num" style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:300, lineHeight:1.1, color:'var(--c-accent-text)', minWidth:18 }}>{i+1}</span>
                <span className="t-body">{clean(step)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(macroList.length>0 || varLines.length>0) && (
        <div style={{ padding:'4px 20px' }}>
          {macroList.length>0 && (
            <>
              <Disclosure open={showMacros} onToggle={()=>setShowMacros(v=>!v)}>Macros</Disclosure>
              {showMacros && (
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${macroList.length}, minmax(0,1fr))`, gap:8, paddingBottom:16 }}>
                  {macroList.map(([k,label,unit])=>(
                    <div key={k} style={{ background:'var(--c-muted)', borderRadius:'var(--r-input)', padding:'10px 6px', textAlign:'center' }}>
                      <div className="t-headline t-num">{macros[k]}{unit}</div>
                      <div className="t-caption c-2">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {varLines.length>0 && (
            <div style={{ padding:'12px 0 16px', borderTop: macroList.length ? '1px solid var(--c-line)' : 'none' }}>
              <h3 className="t-footnote c-2" style={{ fontWeight:600, marginBottom:8 }}>Easy variations</h3>
              {varLines.map((v,i)=><p key={i} className="t-subhead c-2" style={{ marginBottom:6 }}>{clean(v)}</p>)}
            </div>
          )}
        </div>
      )}

      {onAdjust && (
        <div style={{ padding:'16px 20px 20px', borderTop:'1px solid var(--c-line)' }}>
          <h3 className="t-footnote c-2" style={{ fontWeight:600, marginBottom:10 }}>Adjust it</h3>
          {adjusting
            ? <Skeleton lines={2} label="Adjusting the recipe" />
            : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {ADJUST_BUTTONS.map(b=><UIChip key={b.key} small onClick={()=>onAdjust(b.key,name,text)}>{b.label}</UIChip>)}
              </div>}
        </div>
      )}
    </UICard>
  )
}

// ─── Low energy / real life mode ─────────────────────────────────────────────
function LowEnergyCard({ onNav, onNavMove, onNavEat }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div style={{ marginBottom:16 }}>
      {!open ? (
        <button onClick={()=>setOpen(true)} style={{
          width:'100%', background:T.surface, border:`0.5px solid ${T.border}`,
          borderRadius:rr('md'), padding:'12px 16px', cursor:'pointer',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:14, fontWeight:500, color:T.text }}>Low energy today?</div>
            <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>That is fine. Here are easy wins.</div>
          </div>
          <div style={{ fontSize:14, color:T.text3 }}>›</div>
        </button>
      ) : (
        <div style={{ background:T.surface, borderRadius:rr('md'), padding:'16px', position:'relative' }}>
          <button onClick={()=>setDismissed(true)} style={{ position:'absolute', top:12, right:14, border:'none', background:'none', color:T.text3, fontSize:16, cursor:'pointer', padding:0 }}>×</button>
          <div style={{ fontSize:15, fontWeight:500, color:T.text, marginBottom:4 }}>That is completely fine.</div>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:14 }}>
            Low energy days are part of it. Small actions still count.
          </div>
          {[
            { label:'5-min mobility flow',   sub:'Tap an area, get moving in seconds', action: ()=>{ onNavMove?.() || onNav('move'); setDismissed(true) } },
            { label:'Easy meal idea',         sub:'Low effort, simple, no stress',      action: ()=>{ onNavEat?.() || onNav('eat'); setDismissed(true) } },
          ].map((item,i) => (
            <div className="pressable" key={i} onClick={item.action}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 0', borderBottom: i<2 ? `0.5px solid ${T.border}` : 'none', cursor:'pointer' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500, color:T.text }}>{item.label}</div>
                <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{item.sub}</div>
              </div>
              <div style={{ fontSize:16, color:T.text3 }}>›</div>
            </div>
          ))}
          <div style={{ fontSize:12, color:T.text3, marginTop:14, fontStyle:'italic' }}>
            10 minutes still counts. A walk still counts. Showing up at all counts.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Something small card ─────────────────────────────────────────────────────
function findNextWorkout(programs, recentSessions, activeProgramId) {
  if (!programs?.length) return null
  const program = programs.find(p => p.id === activeProgramId) || programs[0]
  const phases = program?.phases || []
  if (!phases.length) return null

  const lastWorkoutId = recentSessions?.[0]?.workoutId || recentSessions?.[0]?.workout_id
  let phase = null, workout = null
  if (lastWorkoutId) {
    for (let pi = 0; pi < phases.length && !workout; pi++) {
      const idx = (phases[pi].workouts || []).findIndex(w => w.id === lastWorkoutId)
      if (idx < 0) continue
      if (idx + 1 < phases[pi].workouts.length) { phase = phases[pi]; workout = phases[pi].workouts[idx + 1]; break }
      for (let ni = pi + 1; ni < phases.length; ni++) {
        if (phases[ni].workouts?.length) { phase = phases[ni]; workout = phases[ni].workouts[0]; break }
      }
      if (!workout) { phase = phases[0]; workout = phases[0].workouts?.[0] }
    }
  }
  if (!workout) {
    phase = phases.find(p => p.workouts?.length > 0)
    workout = phase?.workouts?.[0]
  }
  if (!workout || !phase) return null
  return { program, phase, workout, warmupType: getWarmupType(workout.name) }
}

// ─── Onboarding flow ──────────────────────────────────────────────────────────
function OnboardingFlow({ userId, onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [identity, setIdentity] = useState('')
  const [goal, setGoal] = useState('')
  const [activity, setActivity] = useState('')
  const [saving, setSaving] = useState(false)
  const TOTAL = 4 // questions after the welcome screen

  const questions = [
    null, // welcome
    { title:"What should we call you?", sub:null, skippable:true,
      body: <TextInput value={name} onChange={setName} placeholder="First name" autoFocus autoComplete="given-name" aria-label="First name" enterKeyHint="next"
              onKeyDown={e=>{ if (e.key==='Enter') next() }} /> },
    { title:'Who are you becoming?', sub:'Pick the one that sounds most like you.', skippable:true,
      body: <ChoiceList label="Who are you becoming" options={IDENTITY_STATEMENTS} value={identity} onChange={setIdentity} /> },
    { title:"What's the main goal right now?", sub:'You can change this any time.', skippable:true,
      body: <ChoiceList label="Main goal" options={GOALS} value={goal} onChange={setGoal} /> },
    { title:'How often do you train?', sub:null, skippable:false,
      body: <ChoiceList label="How often you train" options={ACTIVITY_LEVELS} value={activity} onChange={setActivity} /> },
  ]

  async function next() {
    if (step < TOTAL) { setStep(s => s + 1); return }
    setSaving(true)
    await saveProfile(userId, { name, identity, goal, activity })
    setSaving(false)
    onComplete({ name, identity, goal, activity })
  }

  const shell = { maxWidth:'var(--app-max)', margin:'0 auto', minHeight:'100dvh', display:'flex', flexDirection:'column', padding:'0 var(--edge)' }
  const footer = { position:'sticky', bottom:0, padding:'16px 0 calc(24px + env(safe-area-inset-bottom))', background:'linear-gradient(to top, var(--c-bg) 70%, transparent)', display:'flex', flexDirection:'column', gap:4 }

  if (step === 0) {
    return (
      <div style={shell}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start', gap:28, paddingTop:48 }}>
          <HaleLogo size={64} />
          <div>
            <h1 className="t-display" style={{ fontSize:44 }}>Feel better without overthinking it.</h1>
            <p className="t-body c-2" style={{ marginTop:14 }}>Four quick questions so Hale fits your life. About thirty seconds.</p>
          </div>
        </div>
        <div style={footer}><Button full onClick={next}>Get started</Button></div>
      </div>
    )
  }

  const q = questions[step]
  return (
    <div style={shell}>
      <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:'calc(env(safe-area-inset-top) + 8px)', height:'calc(env(safe-area-inset-top) + 60px)' }}>
        <IconButton icon="chevronLeft" label="Back" onClick={()=>setStep(s=>s-1)} style={{ marginLeft:-12 }} />
        <div style={{ flex:1 }}><StepProgress total={TOTAL} current={step} label={`Question ${step} of ${TOTAL}`} /></div>
        <div style={{ width:32 }} />
      </div>
      <div key={step} className="screen-enter" style={{ flex:1, paddingTop:24, display:'flex', flexDirection:'column', gap:24 }}>
        <div>
          <h1 className="t-title1">{q.title}</h1>
          {q.sub && <p className="t-body c-2" style={{ marginTop:8 }}>{q.sub}</p>}
        </div>
        {q.body}
      </div>
      <div style={footer}>
        <Button full onClick={next} disabled={saving}>{saving ? 'Saving' : step === TOTAL ? 'Done' : 'Continue'}</Button>
        {q.skippable && <Button variant="quiet" full onClick={next}>Skip</Button>}
      </div>
    </div>
  )
}


// ─── Screens ──────────────────────────────────────────────────────────────────
function HomeScreen({ onNav, onSave, profile, userId, programs, recentSessions, activeProgramId, onStartWarmup }) {
  const now = new Date()
  const hour = now.getHours()
  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const when = hour < 12 ? 'this morning' : hour < 17 ? 'today' : 'tonight'
  const dayName = now.toLocaleDateString(undefined, { weekday:'long' })
  const firstName = profile?.name?.trim().split(' ')[0]
  const isNewUser = !profile?.goal && !profile?.name

  const next = findNextWorkout(programs, recentSessions, activeProgramId)
  const lastDate = recentSessions?.[0]?.date ? new Date(recentSessions[0].date) : null
  const liftedToday = !!lastDate && lastDate.toDateString() === now.toDateString()
  // The hero is the one thing worth doing now: the next lift, unless there is
  // no program or the user already lifted today. Then it is five minutes of relief.
  const heroIsLift = !!next && !liftedToday

  const day = now.getDate()
  const isTipDay = day % 2 === 0
  const tipProps = isTipDay
    ? { cacheKey:'daily_tip', category:TIP_CATEGORIES[day%TIP_CATEGORIES.length], cardLabel:'Daily tip',
        promptFn:cat=>'You are a knowledgeable health advisor. Give ONE practical tip about '+cat+'. 2-3 sentences. Specific and surprising. No fluff, no exclamation marks. Give a 2-4 word title. Format: TITLE: [title] TIP: [tip]',
        fallback:'Consistency over intensity. Showing up three times a week for a year will outperform any extreme program you can only stick to for a month.' }
    : { cacheKey:'daily_fact', category:FACT_CATEGORIES[day%FACT_CATEGORIES.length], cardLabel:'Daily fact',
        promptFn:cat=>'You are a science communicator. Give ONE surprising fact about '+cat+'. 2-3 sentences. Make it feel worth sharing. No obvious facts. No fluff. Give a 2-4 word title. Format: TITLE: [title] FACT: [fact]',
        fallback:'Your muscles grow during rest, not during the workout itself. The training session is just the signal. Sleep and nutrition are where the actual adaptation happens.' }

  const exercises = next?.workout?.exercises || []
  const shown = exercises.slice(0, 3)

  return (
    <div style={{ padding:'calc(env(safe-area-inset-top) + 56px) var(--edge) 0', display:'flex', flexDirection:'column', gap:'var(--s-6)' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div>
          <div className="t-subhead c-2" style={{ marginBottom:2 }}>{dayName} {partOfDay}</div>
          <h1 className="t-title1">{firstName ? `Hi, ${firstName}` : 'Hi there'}</h1>
        </div>
        <IconButton icon="profile" label="Profile" filled onClick={()=>onNav('profile')} />
      </header>

      {isNewUser && (
        <Row icon="sparkle" title="Make Hale yours" subtitle="Two minutes. Your goals shape what you see here." onClick={()=>onNav('profile')} />
      )}

      {heroIsLift ? (
        <UICard tone="inverse" style={{ position:'relative', overflow:'hidden', padding:'24px 22px 22px', display:'flex', flexDirection:'column', gap:20 }}>
          <div aria-hidden="true" style={{ position:'absolute', right:-70, top:-70, opacity:.16, pointerEvents:'none' }}>
            <HaleLogo size={220} />
          </div>
          <div className="t-footnote" style={{ color:'var(--c-accent)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Your one thing {when}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div className="t-display">{next.workout.name}</div>
            <div className="t-subhead" style={{ color:'#B8B3A9', fontSize:15 }}>
              {next.phase.name} · {next.program.name}. Warmup first, about 6 minutes.
            </div>
          </div>
          {shown.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {shown.map((ex, i) => (
                <span key={i} className="t-footnote" style={{ height:28, padding:'0 12px', borderRadius:14, background:'#2C2C32', color:'#D8D2C7', display:'inline-flex', alignItems:'center', fontWeight:500 }}>{ex.name}</span>
              ))}
              {exercises.length > shown.length && (
                <span className="t-footnote" style={{ height:28, padding:'0 12px', borderRadius:14, background:'#2C2C32', color:'#A8A49B', display:'inline-flex', alignItems:'center' }}>+{exercises.length - shown.length}</span>
              )}
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <Button variant="accent" full iconAfter="arrowRight"
              onClick={()=>onStartWarmup({ programId:next.program.id, phaseId:next.phase.id, workoutId:next.workout.id, workoutName:next.workout.name, warmupType:next.warmupType })}>
              Start with warmup
            </Button>
            <button onClick={()=>onNav('lift')} className="t-callout" style={{ height:44, border:'none', background:'none', color:'#B8B3A9' }}>
              Skip the warmup
            </button>
          </div>
        </UICard>
      ) : (
        <UICard style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div className="t-footnote c-accent" style={{ marginBottom:4 }}>
              {liftedToday ? 'You lifted today. Nice work.' : 'Five minutes, no setup'}
            </div>
            <h2 className="t-title2">{liftedToday ? 'Help it recover' : 'What feels tight?'}</h2>
          </div>
          <QuickRelief onSave={onSave} bare />
        </UICard>
      )}

      <section style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <p className="t-subhead c-2" style={{ padding:'0 var(--s-1)' }}>
          {heroIsLift ? 'Not feeling it? Smaller works too.' : 'Or try one of these.'}
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:12 }}>
          {heroIsLift
            ? <SmallTile icon="move" title="Loosen up" sub="5 min, pick a spot" onClick={()=>onNav('move')} />
            : <SmallTile icon="lift" title={next ? 'Next lift' : 'Start lifting'} sub={next ? next.workout.name : 'Pick a program'} onClick={()=>onNav('lift')} />}
          <SmallTile icon="eat" title="Dinner idea" sub="From what you have" onClick={()=>onNav('eat')} />
        </div>
      </section>

      <DailyTip userId={userId} {...tipProps} />

      <button onClick={()=>onNav('pillars')} className="t-callout c-accent" style={{ alignSelf:'flex-start', minHeight:44, border:'none', background:'none', padding:'0 var(--s-1)', display:'inline-flex', alignItems:'center', gap:6 }}>
        The Pillars: what actually matters <Icon name="chevronRight" size={16} strokeWidth={2} />
      </button>
    </div>
  )
}

function SmallTile({ icon, title, sub, onClick }) {
  return (
    <UICard onClick={onClick} style={{ minHeight:120, padding:16, display:'flex', flexDirection:'column', justifyContent:'space-between', gap:12 }}>
      <Icon name={icon} size={24} style={{ color:'var(--c-accent-text)' }} />
      <span style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0 }}>
        <span className="t-headline" style={{ fontSize:16 }}>{title}</span>
        <span className="t-footnote c-2" style={{ fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</span>
      </span>
    </UICard>
  )
}

// ─── Curated restaurant data ──────────────────────────────────────────────────
const CURATED_SPOTS = {
  'Boston — Southie & Seaport': [
    { name:'Placeholder Restaurant 1', neighborhood:'South Boston', cuisine:'American', priceRange:"$",
      description:'A neighborhood staple known for fresh, quality ingredients and generous portions. Great for a post-workout meal.',
      mustOrder:'Grilled salmon bowl', tags:['high-protein','local-favorite','post-workout'], curated:true, curatorNote:'Ryan recommends' },
    { name:'Placeholder Restaurant 2', neighborhood:'Seaport', cuisine:'Mediterranean', priceRange:"$$$",
      description:'Farm-to-table driven menu that changes seasonally. One of the best spots in the Seaport for a quality meal.',
      mustOrder:'Roasted chicken with seasonal vegetables', tags:['farm-to-table','chef-driven','worth-the-splurge'], curated:true, curatorNote:'Ryan recommends' },
    { name:'Placeholder Restaurant 3', neighborhood:'South Boston', cuisine:'Seafood', priceRange:"$",
      description:'Local seafood done right. Simple preparations that let the quality of the fish speak for itself.',
      mustOrder:'Fish tacos', tags:['local-favorite','high-protein','hidden-gem'], curated:true, curatorNote:'Ryan recommends' },
    { name:'Placeholder Restaurant 4', neighborhood:'Seaport', cuisine:'Japanese', priceRange:"$",
      description:'Clean, simple Japanese food with an emphasis on quality protein and fresh ingredients.',
      mustOrder:'Salmon bowl with brown rice', tags:['macro-friendly','high-protein','light-and-fresh'], curated:true, curatorNote:'Ryan recommends' },
    { name:'Placeholder Restaurant 5', neighborhood:'South Boston', cuisine:'Breakfast & Lunch', priceRange:"$",
      description:'The neighborhood spot everyone knows. Best breakfast in Southie, locally owned and run.',
      mustOrder:'Egg white veggie scramble', tags:['local-favorite','locally-owned','hidden-gem'], curated:true, curatorNote:'Ryan recommends' },
  ]
}


const TAG_META = {
  'high-protein':      { bg:'var(--green-bg)',  text:'var(--green)',  label:'High protein'      },
  'local-favorite':    { bg:'var(--cream-bg)',   text:'var(--cream)',   label:'Local favorite'    },
  'farm-to-table':     { bg:'var(--green-bg)',  text:'var(--green)',  label:'Farm to table'     },
  'chef-driven':       { bg:'var(--purple-bg)', text:'var(--purple)', label:'Chef driven'       },
  'worth-the-splurge': { bg:'var(--amber-bg)',  text:'var(--amber)',  label:'Worth the splurge' },
  'post-workout':      { bg:'var(--green-bg)',  text:'var(--green)',  label:'Post-workout'      },
  'macro-friendly':    { bg:'var(--cream-bg)',   text:'var(--cream)',   label:'Macro friendly'    },
  'light-and-fresh':   { bg:'var(--cream-bg)',   text:'var(--cream)',   label:'Light & fresh'     },
  'hidden-gem':        { bg:'var(--coral-bg)',  text:'var(--coral)',  label:'Hidden gem'        },
  'locally-owned':     { bg:'var(--purple-bg)', text:'var(--purple)', label:'Locally owned'     },
}

function RestaurantCard({ spot }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background:T.surface, borderRadius:rr('md'), marginBottom:10, overflow:'hidden' }}>
      <div className="pressable" onClick={()=>setExpanded(v=>!v)} style={{ padding:'14px 16px', cursor:'pointer' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <div style={{ fontSize:15, fontWeight:500, color:T.text }}>{spot.name}</div>
              {spot.curated && <div style={{ fontSize:12, padding:'2px 7px', borderRadius:20, background:'var(--amber-bg)', color:'var(--amber)', fontWeight:500, flexShrink:0 }}>✓ Curated</div>}
            </div>
            <div style={{ fontSize:12, color:T.text3 }}>{spot.neighborhood} · {spot.cuisine} · {spot.priceRange}</div>
          </div>
          <div style={{ fontSize:13, color:T.text3, marginLeft:8, transform:expanded?'rotate(180deg)':'none', transition:'transform .2s' }}>▼</div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {spot.tags.map(tag => {
            const s = TAG_META[tag] || { bg:T.surface2, text:T.text2, label:tag }
            return <div key={tag} style={{ fontSize:12, padding:'2px 8px', borderRadius:20, background:s.bg, color:s.text, fontWeight:500 }}>{s.label}</div>
          })}
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop:`0.5px solid ${T.border}`, padding:'12px 16px' }}>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.65, marginBottom:10 }}>{spot.description}</div>
          <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:8 }}>
            <div style={{ fontSize:12, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Order this</div>
            <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{spot.mustOrder}</div>
          </div>
          {spot.curatorNote && <div style={{ fontSize:12, color:T.text3, fontStyle:'italic' }}>— {spot.curatorNote}</div>}
        </div>
      )}
    </div>
  )
}

function EatOutScreen() {
  const [selectedCity, setSelectedCity] = useState('Boston — Southie & Seaport')
  const [activeTag, setActiveTag] = useState(null)
  const cities = Object.keys(CURATED_SPOTS)
  const allSpots = CURATED_SPOTS[selectedCity] || []
  const filtered = activeTag ? allSpots.filter(s => s.tags.includes(activeTag)) : allSpots
  const allTags = [...new Set(allSpots.flatMap(s => s.tags))]
  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Location</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {cities.map(city => (
            <button key={city} onClick={()=>{ setSelectedCity(city); setActiveTag(null) }} style={{
              padding:'7px 14px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`, cursor:'pointer',
              background: selectedCity===city ? T.text : T.surface, color: selectedCity===city ? T.bg : T.text2,
            }}>{city}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Filter</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          <button onClick={()=>setActiveTag(null)} style={{ padding:'5px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`, cursor:'pointer', background:!activeTag?T.text:T.surface, color:!activeTag?T.bg:T.text2 }}>All</button>
          {allTags.map(tag => {
            const s = TAG_META[tag] || { bg:T.surface2, text:T.text2, label:tag }
            return <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer', border:`0.5px solid ${activeTag===tag?s.text:T.border}`, background:activeTag===tag?s.bg:T.surface, color:activeTag===tag?s.text:T.text2, fontWeight:activeTag===tag?500:400 }}>{s.label||tag}</button>
          })}
        </div>
      </div>
      <div style={{ fontSize:12, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:12 }}>{filtered.length} spot{filtered.length!==1?'s':''} · Personally curated</div>
      {filtered.map((spot,i) => <RestaurantCard key={i} spot={spot} />)}
      <div style={{ marginTop:16, padding:'12px 14px', background:T.surface, borderRadius:rr('md') }}>
        <div style={{ fontSize:12, color:T.text3, lineHeight:1.6 }}>More cities coming soon. Know a spot that belongs here? Recommendations welcome.</div>
      </div>
    </div>
  )
}

function EatScreen({ onSave, userId }) {
  const [eatMode, setEatMode] = useState('cook')
  const { pantry, add, remove } = usePantry(userId)
  const [effort, setEffort] = useState('normal')
  const [meal, setMeal] = useState('Lunch')
  const [vibe, setVibe] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [suggestedNames, setSuggestedNames] = useState([])
  const [editing, setEditing] = useState(false)

  const ASSUMED_STAPLES = 'olive oil, butter, garlic, onion, salt, pepper, cumin, paprika, chili flakes, Italian seasoning, soy sauce, hot sauce, lemon, lime, vinegar, chicken broth, mustard, honey, Worcestershire sauce'
  const TECHNIQUES = ['pan sear and sauce', 'sheet pan roast', 'stir fry', 'skillet scramble', 'soup or stew', 'marinate and grill', 'stuffed or wrapped', 'rice bowl with sauce', 'fried rice', 'frittata or egg bake']
  const effortDesc = { low:'minimal prep, one pan, 15 min max', normal:'standard weeknight, 20-30 min', chef:'more involved, worth the effort, up to 45 min' }

  const ADJUST_PROMPTS = {
    calories_up:   (_,r)=>`Make this recipe significantly higher calorie. Add more calorie-dense ingredients or increase portions.\n\nOriginal:\n${r}\n\nReturn full modified recipe in same plain text format. No markdown.`,
    calories_down: (_,r)=>`Make this recipe lighter. Reduce portions or swap high-calorie ingredients for lighter versions.\n\nOriginal:\n${r}\n\nReturn full modified recipe in same plain text format. No markdown.`,
    protein_up:    (_,r)=>`Increase the protein in this recipe. Add more of the protein source or add another.\n\nOriginal:\n${r}\n\nReturn full modified recipe in same plain text format. No markdown.`,
    carbs_up:      (_,r)=>`Increase the carbs. Add more rice, potatoes, or bread to this recipe.\n\nOriginal:\n${r}\n\nReturn full modified recipe in same plain text format. No markdown.`,
    quicker:       (_,r)=>`Make this recipe faster. Should be doable in 10-15 minutes max.\n\nOriginal:\n${r}\n\nReturn full modified recipe in same plain text format. No markdown.`,
    simpler:       (_,r)=>`Reduce the ingredient count to 5 or fewer while keeping the core dish.\n\nOriginal:\n${r}\n\nReturn full modified recipe in same plain text format. No markdown.`,
  }

  const buildPrompt = async (attempt) => {
    const mem = userId ? await getTasteMemory(userId) : {}
    const profile = userId ? await getProfile(userId) : {}
    const tasteCtx = buildTasteContext(mem)
    const profileCtx = buildProfileContext(profile)
    const avoidNote = suggestedNames.length > 0
      ? `\nAVOID these exact recipes already suggested: ${suggestedNames.join(', ')}. Give something genuinely different — different main protein, different cuisine style, different cooking method. Do not recycle the same base dish with minor tweaks.`
      : ''
    const cuisineNote = cuisine ? `Cuisine direction: ${cuisine}\n` : ''
    const techNote = TECHNIQUES[Math.floor(Math.random()*TECHNIQUES.length)]
    return `You are a skilled home cook who genuinely loves food. Your job is to suggest ONE recipe that someone will look at and immediately think "I want to make that tonight."

The recipe must be:
- Something a normal person would actually cook on a weeknight — not a restaurant project
- Built around ingredients that genuinely go well together — never force an ingredient that doesn't belong
- Specific and crave-worthy in name and execution — not generic or bland
- The kind of thing a friend would text you after making: "dude this was so good"

Think of the best recipes you see on food TikTok or Instagram — not the weird ones, the ones that go viral because they look achievable AND delicious. Birria tacos. Marry me chicken. Crispy rice with spicy tuna. One pan lemon butter salmon. Those have a hook AND they actually taste incredible.
${tasteCtx}${profileCtx}
Available ingredients (use what makes sense, ignore what doesn't fit): ${pantry.join(', ')}
Pantry staples always available: ${ASSUMED_STAPLES}
Meal: ${meal}
Effort: ${effortDesc[effort]}
Vibe: ${vibe||'delicious, satisfying, something I would genuinely be excited to eat'}
${cuisineNote}${avoidNote}

Rules:
- Pick the protein and base that make the most sense from what's available — do not combine ingredients that don't belong together
- The name must be specific and make someone hungry just reading it ("Crispy Garlic Butter Chicken Thighs with Lemon Pan Sauce" not "Garlic Chicken")
- Steps must be clear enough that a confident home cook can execute without second-guessing
- Include the one technique detail that makes the dish actually good — the hard sear, the sauce reduction, the resting time
- Macros should be realistic estimates, not inflated
- Variations should be genuinely different — different protein, different cuisine spin, different cooking method

IMPORTANT: No markdown, no # symbols, plain text only. Recipe name on the FIRST LINE with no prefix.

Format exactly:

[Specific crave-worthy recipe name]

Ingredients:
- [amount] [ingredient]

Steps:
1. [Clear, specific step with the key detail that makes it work]
2. [One line]
3. [One line]
4. [One line]
5. [The finishing touch]

Macros per serving:
Calories: [number]
Protein: [number]g
Carbs: [number]g
Fat: [number]g

Variations:
- [Genuinely different spin — different protein, cuisine, or cooking method]
- [Another real variation]
- [One more]`
  }

  const go = async (isRetry) => {
    setLoading(true); setResp(''); setSaved(false)
    const attempt = isRetry?attempts+1:0
    setAttempts(attempt)
    if (vibe&&userId) updateTasteMemory(userId,{vibes:[vibe]})
    if (userId) updateTasteMemory(userId,{efforts:[effort],meals:[meal]})
    try {
      const prompt = await buildPrompt(attempt)
      const text = await callAI(prompt)
      setResp(text)
      // Extract recipe name (first non-empty line) and track it
      const firstName = text.split('\n').map(l=>l.trim()).find(l=>l.length>0)
      if (firstName) setSuggestedNames(prev => [...prev.slice(-4), firstName])
    } catch(e) {
      setResp(e.message === 'timeout'
        ? 'Taking longer than usual. Check your connection and try again.'
        : 'Something went wrong. Try again.')
    }
    setLoading(false)
  }

  const adjust = async (type,name,currentRecipe) => {
    setAdjusting(true)
    try { const text = await callAI(ADJUST_PROMPTS[type](name,currentRecipe)); setResp(text); setSaved(false) } catch(e) {
      setResp(e.message === 'timeout' ? 'Taking longer than usual. Try again.' : 'Something went wrong. Try again.')
    }
    setAdjusting(false)
  }

  const save = () => {
    if (userId) updateTasteMemory(userId,{savedIngredients:pantry})
    // Use the actual recipe name (first non-empty line of response)
    // Extract name exactly like RecipeCard does — first non-empty line after stripping markdown
    const recipeLines = resp.split('\n').map(l=>l.trim().replace(/^#+\s*/,'')).filter(Boolean)
    const recipeName = recipeLines[0] || `${meal} — ${cuisine||vibe||'recipe'}`
    onSave({ label:recipeName, text:resp, type:'recipe' })
    setSaved(true)
  }

  const hasRecipe = resp && !loading && !resp.startsWith('Taking longer') && !resp.startsWith('Something went wrong')
  const hasError  = resp && !loading && (resp.startsWith('Taking longer') || resp.startsWith('Something went wrong'))
  const formOpen = editing || (!hasRecipe && !loading)
  const effortLabel = EFFORT_LEVELS.find(e=>e.key===effort)?.label

  return (
    <div style={{ padding:'0 var(--edge)', display:'flex', flexDirection:'column', gap:24 }}>
      {!formOpen && (
        <UICard flat tone="muted" style={{ padding:'4px 16px' }}>
          <Disclosure open={false} onToggle={()=>setEditing(true)}>
            <span className="t-callout">{meal}{cuisine ? ` · ${cuisine}` : ''} · {effortLabel}</span>
            <span className="t-footnote c-2" style={{ display:'block', fontWeight:400 }}>{pantry.length} ingredient{pantry.length!==1?'s':''}{vibe ? ` · ${vibe}` : ''}</span>
          </Disclosure>
        </UICard>
      )}

      {formOpen && (
        <>
          <Section title="What you have"><PantryEditor pantry={pantry} onAdd={add} onRemove={remove} /></Section>
          <Section title="Meal">
            <Segmented label="Meal" value={meal} onChange={setMeal}
              options={['Breakfast','Lunch','Dinner','Snack'].map(m=>({ key:m, label:m }))} />
          </Section>
          <Section title="Effort">
            <OptionCards label="Effort" value={effort} onChange={setEffort}
              options={EFFORT_LEVELS.map(e=>({ key:e.key, label:e.label, desc:e.desc }))} />
          </Section>
          <Section title="Cuisine, if you have one in mind">
            <UIChipRow>
              {CUISINES.map(cu=><UIChip key={cu} small selected={cuisine===cu} onClick={()=>setCuisine(cuisine===cu?'':cu)}>{cu}</UIChip>)}
            </UIChipRow>
          </Section>
          <Section title="Anything specific?">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <TextInput value={vibe} onChange={setVibe} placeholder="High protein, comforting, post-workout" aria-label="Anything specific" />
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {VIBE_SUGGESTIONS.slice(0,6).map(v=><UIChip key={v} small selected={vibe===v} onClick={()=>setVibe(vibe===v?'':v)}>{v}</UIChip>)}
              </div>
            </div>
          </Section>
          <Button full onClick={()=>{ setEditing(false); go(false) }} disabled={loading||pantry.length===0}>
            {hasRecipe ? 'Get a new recipe' : 'Get a recipe'}
          </Button>
          {pantry.length===0 && <p className="t-footnote c-2" style={{ textAlign:'center', fontWeight:400, marginTop:-12 }}>Add at least one ingredient first.</p>}
        </>
      )}

      {loading && (
        <UICard style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <span className="t-footnote c-accent">Finding something good</span>
          <Skeleton lines={5} label="Finding a recipe" />
        </UICard>
      )}

      {hasError && (
        <UICard style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <h2 className="t-headline">{resp.startsWith('Taking longer') ? 'Taking a moment' : 'Something went wrong'}</h2>
          <p className="t-subhead c-2">{resp}</p>
          <Button size="md" onClick={()=>go(false)} style={{ alignSelf:'flex-start' }}>Try again</Button>
        </UICard>
      )}

      {hasRecipe && (
        <>
          <RecipeCard text={resp} onAdjust={adjust} adjusting={adjusting} />
          <div style={{ display:'flex', gap:8 }}>
            <Button full variant={saved ? 'secondary' : 'primary'} onClick={saved ? undefined : save} aria-disabled={saved} icon={saved ? 'check' : 'plus'}>{saved ? 'Saved' : 'Save to rotation'}</Button>
            <Button variant="secondary" onClick={()=>go(true)} style={{ flexShrink:0 }}>Try another</Button>
          </div>
        </>
      )}
    </div>
  )
}

function PillarCard({ p, onDeepDive }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <UICard style={{ padding:'20px 20px 8px' }}>
      <div style={{ display:'flex', gap:14, alignItems:'baseline', marginBottom:8 }}>
        <span className="t-num" style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:200, color:'var(--c-accent-text)', lineHeight:1 }}>
          {String(p.num).padStart(2,'0')}
        </span>
        <h2 className="t-title2">{p.title}</h2>
      </div>
      <p className="t-body c-2">{p.identity}</p>

      {expanded && (
        <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:16 }}>
          <p className="t-body">{p.body}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ background:'var(--c-muted)', borderRadius:'var(--r-row)', padding:14 }}>
              <div className="t-footnote" style={{ fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:6, color:'var(--c-done)' }}>
                <Icon name="check" size={16} strokeWidth={2.2} />Worth your time
              </div>
              <p className="t-subhead c-2">{p.good}</p>
            </div>
            <div style={{ background:'var(--c-muted)', borderRadius:'var(--r-row)', padding:14 }}>
              <div className="t-footnote c-2" style={{ fontWeight:600, display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <Icon name="close" size={16} strokeWidth={2.2} />Skip this
              </div>
              <p className="t-subhead c-2">{p.skip}</p>
            </div>
          </div>
          <Button variant="secondary" size="md" full iconAfter="arrowRight" onClick={()=>onDeepDive(p.prompt)}>Go deeper</Button>
        </div>
      )}
      <Disclosure open={expanded} onToggle={()=>setExpanded(v=>!v)}>
        <span className="t-subhead c-accent" style={{ fontWeight:500 }}>{expanded ? 'Show less' : 'Read more'}</span>
      </Disclosure>
    </UICard>
  )
}

function PillarsScreen({ onDeepDive }) {
  return (
    <div style={{ padding:'0 var(--edge)', display:'flex', flexDirection:'column', gap:12 }}>
      {PILLARS.map(p => <PillarCard key={p.num} p={p} onDeepDive={onDeepDive} />)}
    </div>
  )
}

function DeepDiveScreen({ prompt, onBack }) {
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(true)
  const pillar = PILLARS.find(p => p.prompt === prompt)
  useEffect(() => {
    callAI(prompt+'\n\nBe conversational, practical, and concise. No fluff.')
      .then(setResp)
      .catch(e => setResp(e.message === 'timeout'
        ? 'Taking a bit longer than usual. Go back and try again.'
        : 'Something went wrong. Go back and try again.'))
      .finally(()=>setLoading(false))
  }, [prompt])
  const paragraphs = resp.replace(/\*\*/g,'').split(/\n{2,}/).map(t=>t.trim()).filter(Boolean)
  return (
    <>
      <ScreenHeader title={pillar ? pillar.title : 'Go deeper'} subtitle={pillar ? 'Going deeper' : null} onBack={onBack} backLabel="Back to Pillars" />
      <div style={{ padding:'0 var(--edge)' }}>
        <UICard>
          {loading
            ? <Skeleton lines={6} label="Writing your answer" />
            : <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {paragraphs.map((t,i)=><p key={i} className="t-body" style={{ whiteSpace:'pre-wrap' }}>{t}</p>)}
              </div>}
        </UICard>
      </div>
    </>
  )
}

function ProfileScreen({ userId, onSaved, onNav }) {
  const [profile, setProfile] = useState({
    name:'', age:'', gender:'',
    goal:'', activity:'', experience:'',
    protein:'', calories:'',
    sports:'', notes:''
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { if (userId) getProfile(userId).then(p=>{ setProfile(p||{}); setLoading(false) }) }, [userId])
  const update = (key,val) => { setProfile(p=>({ ...p, [key]:val })); setSaved(false) }
  const handleSave = async () => {
    await saveProfile(userId, profile)
    setSaved(true); setTimeout(()=>setSaved(false),2000)
    if (onSaved) onSaved(profile)
  }
  if (loading) return <div style={{ padding:'0 var(--edge)' }}><Skeleton lines={6} label="Loading your profile" /></div>

  const pick = (key, options) => (
    <UIChipRow>
      {options.map(o => <UIChip key={o} small selected={profile[key]===o} onClick={()=>update(key, profile[key]===o ? '' : o)}>{o}</UIChip>)}
    </UIChipRow>
  )
  const group = { display:'flex', flexDirection:'column', gap:18 }

  return (
    <div style={{ padding:'0 var(--edge)', display:'flex', flexDirection:'column', gap:32 }}>
      <Section title="About you">
        <UICard style={group}>
          <Field label="First name" htmlFor="pf-name"><TextInput id="pf-name" value={profile.name} onChange={v=>update('name',v)} placeholder="First name" autoComplete="given-name" /></Field>
          <Field label="Age" htmlFor="pf-age"><TextInput id="pf-age" type="number" inputMode="numeric" value={profile.age} onChange={v=>update('age',v)} placeholder="28" style={{ maxWidth:140 }} /></Field>
          <Field label="Gender (optional)">{pick('gender', ['Male','Female','Prefer not to say'])}</Field>
        </UICard>
      </Section>

      <Section title="Your training">
        <UICard style={group}>
          <Field label="Main goal">{pick('goal', GOALS)}</Field>
          <Field label="How often you train">{pick('activity', ACTIVITY_LEVELS)}</Field>
          <Field label="Experience">{pick('experience', ['Beginner','Intermediate','Experienced'])}</Field>
          <Field label="Sports or activities" htmlFor="pf-sports"><TextInput id="pf-sports" value={profile.sports} onChange={v=>update('sports',v)} placeholder="Golf, running, pickleball" /></Field>
        </UICard>
      </Section>

      <Section title="Nutrition targets (optional)">
        <UICard style={group}>
          <p className="t-subhead c-2">Used to shape recipe ideas and post-workout meals. Leave blank if you don't track.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:12 }}>
            <Field label="Protein a day (g)" htmlFor="pf-protein"><TextInput id="pf-protein" type="number" inputMode="numeric" value={profile.protein} onChange={v=>update('protein',v)} placeholder="160" /></Field>
            <Field label="Calories a day" htmlFor="pf-cal"><TextInput id="pf-cal" type="number" inputMode="numeric" value={profile.calories} onChange={v=>update('calories',v)} placeholder="2,800" /></Field>
          </div>
        </UICard>
      </Section>

      <Section title="Anything else Hale should know?">
        <TextArea value={profile.notes} onChange={v=>update('notes',v)} rows={3}
          placeholder="Injuries, foods you avoid, how you like to train" aria-label="Anything else Hale should know" />
      </Section>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <Button full onClick={handleSave} icon={saved ? 'check' : undefined}>{saved ? 'Saved' : 'Save profile'}</Button>
        <Button variant="quiet" full onClick={async()=>{ await supabase.auth.signOut() }} style={{ color:'var(--c-danger)' }}>Sign out</Button>
      </div>
    </div>
  )
}


function SavedItemDetail({ item }) {
  if (item.type === 'routine') {
    try {
      const parsed = JSON.parse(item.text)
      if (parsed.exercises?.length) {
        const meta = [parsed.duration, parsed.source].filter(Boolean).join(' · ')
        return (
          <div style={{ padding:'0 20px 12px' }}>
            {meta && <p className="t-subhead c-2" style={{ marginBottom:4 }}>{meta}</p>}
            <ExerciseList exercises={parsed.exercises} />
          </div>
        )
      }
    } catch(e) {}
    return <p className="t-subhead c-2" style={{ padding:'0 20px 20px', whiteSpace:'pre-wrap' }}>{item.text}</p>
  }
  return <div style={{ padding:'0 12px 12px' }}><RecipeCard text={item.text} /></div>
}

function StackScreen({ items, onDelete, onRename }) {
  const [tab, setTab] = useState('routines')
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingLabel, setEditingLabel] = useState('')
  const filtered = items.filter(i=>tab==='routines'?i.type==='routine':i.type==='recipe')
  const fmtDate = d => new Date(d||Date.now()).toLocaleDateString(undefined, { month:'short', day:'numeric' })
  const commitRename = id => { onRename(id, editingLabel); setEditingId(null) }

  return (
    <div style={{ padding:'0 var(--edge)', display:'flex', flexDirection:'column', gap:16 }}>
      <Segmented label="Show" value={tab} onChange={t=>{ setTab(t); setExpandedId(null); setEditingId(null) }}
        options={[{ key:'routines', label:'Routines' }, { key:'recipes', label:'Recipes' }]} />

      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'48px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <span style={{ width:56, height:56, borderRadius:28, background:'var(--c-muted)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--c-accent-text)' }}>
            <Icon name={tab==='routines' ? 'move' : 'eat'} size={26} />
          </span>
          <h2 className="t-headline">Nothing saved yet</h2>
          <p className="t-subhead c-2" style={{ maxWidth:280 }}>
            {tab==='routines' ? 'Save a routine from Move and it lives here, one tap away next time.' : 'Save a recipe from Eat and it lives here, ready for next week.'}
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(item => {
            const isOpen = expandedId === item.id
            const isEditing = editingId === item.id
            return (
              <UICard key={item.id} style={{ padding:0, overflow:'hidden' }}>
                {isEditing ? (
                  <form onSubmit={e=>{ e.preventDefault(); commitRename(item.id) }} style={{ display:'flex', gap:8, alignItems:'center', padding:12 }}>
                    <TextInput autoFocus value={editingLabel} onChange={setEditingLabel} aria-label="New name"
                      onKeyDown={e=>{ if(e.key==='Escape') setEditingId(null) }} style={{ flex:1 }} />
                    <Button type="submit" size="md">Save</Button>
                    <IconButton icon="close" label="Cancel rename" onClick={()=>setEditingId(null)} />
                  </form>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 6px 6px 0' }}>
                    <button onClick={()=>setExpandedId(isOpen?null:item.id)} aria-expanded={isOpen}
                      style={{ flex:1, minWidth:0, minHeight:56, border:'none', background:'none', textAlign:'left', padding:'8px 0 8px 20px', display:'flex', flexDirection:'column', gap:2 }}>
                      <span className="t-callout" style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
                      <span className="t-footnote c-2" style={{ fontWeight:400 }}>Saved {fmtDate(item.created_at)}</span>
                    </button>
                    <IconButton icon="edit" label={`Rename ${item.label}`} size={20} onClick={()=>{ setEditingId(item.id); setEditingLabel(item.label) }} />
                    <IconButton icon="trash" label={`Remove ${item.label}`} size={20} onClick={()=>onDelete(item.id)} />
                  </div>
                )}
                {isOpen && !isEditing && <SavedItemDetail item={item} />}
              </UICard>
            )
          })}
          <p className="t-subhead c-3" style={{ textAlign:'center', padding:'12px 0' }}>Every save here is a vote for who you're becoming.</p>
        </div>
      )}
    </div>
  )
}

const NAV = [
  { key:'home',  label:'Home',     icon:'home'     },
  { key:'move',  label:'Move',     icon:'move'     },
  { key:'eat',   label:'Eat',      icon:'eat'      },
  { key:'lift',  label:'Lift',     icon:'lift'     },
  { key:'stack', label:'Rotation', icon:'rotation' },
]

const TOPBAR = {
  move:    { title:'Move',        sub:'Mobility, warmups and recovery'                },
  eat:     { title:'Eat better',  sub:'New ideas, your ingredients'                   },
  lift:    { title:'Lift',        sub:'Your programs and sessions'                    },
  pillars: { title:'The Pillars', sub:'The only things that actually move the needle' },
  stack:   { title:'Your Rotation', sub:'Your saved routines and recipes'             },
  profile: { title:'Profile',     sub:null                                            },
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [deepDive, setDeepDive] = useState(null)
  const [pendingSession, setPendingSession] = useState(null) // { programId, phaseId, workoutId, warmupType }
  const [liftDeepLink, setLiftDeepLink] = useState(null) // deep link into a specific workout
  const [savedItems, setSavedItems] = useState([])
  const [toast, setToast] = useState({ visible:false, message:'', action:null })
  const toastTimer = useRef(null)
  // Deletes wait here for a few seconds so they can be undone: id -> { item, index, timer }
  const pendingDeletes = useRef(new Map())

  const hideToast = () => {
    clearTimeout(toastTimer.current)
    setToast({ visible:false, message:'', action:null })
  }
  const showToast = (message, action = null, duration = 2200) => {
    clearTimeout(toastTimer.current)
    setToast({ visible:true, message, action })
    toastTimer.current = setTimeout(hideToast, duration)
  }

  // If the app is closed or backgrounded, finish any deletes still waiting on Undo
  useEffect(() => {
    const flush = () => {
      if (pendingDeletes.current.size === 0) return
      hideToast() // the Undo would no longer be true once the delete is sent
      pendingDeletes.current.forEach(({ timer }, id) => {
        clearTimeout(timer)
        deleteSavedItem(id).catch(()=>{})
      })
      pendingDeletes.current.clear()
    }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])
  const [profile, setProfile] = useState(null)
  const [settingPassword, setSettingPassword] = useState(ARRIVED_TO_SET_PASSWORD)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setSettingPassword(true)
      setSession(session)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const [programs, setPrograms] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [activeProgramId, setActiveProgramId] = useState(null)

  useEffect(() => {
    if (!session?.user) return
    const userId = session.user.id
    getProfile(userId).then(p => {
      setProfile(p)
      // Show onboarding if profile is empty (new user). The localStorage flag stops
      // someone who skipped every question from being asked again on this device.
      let alreadyOnboarded = false
      try { alreadyOnboarded = localStorage.getItem(`hale_onboarded_${userId}`) === '1' } catch {}
      if (!alreadyOnboarded && (!p || (!p.name && !p.goal && !p.identity))) {
        setShowOnboarding(true)
      }
    })
    getSavedItems(userId).then(setSavedItems)
    getPrograms(userId).then(setPrograms).catch(()=>{})
    getSessions(userId).then(setRecentSessions).catch(()=>{})
    try { setActiveProgramId(localStorage.getItem('active_program_id')) } catch {}
  }, [session])

  const handleSave = async (item) => {
    if (!session?.user) return
    const saved = await addSavedItem(session.user.id, item)
    if (saved) {
      setSavedItems(prev=>[saved, ...prev])
      const msg = item.type === 'recipe' ? 'Meal saved to your rotation' : 'Routine saved to your rotation'
      showToast(msg)
    }
  }

  const handleDelete = (id) => {
    const index = savedItems.findIndex(i=>i.id===id)
    if (index === -1) return
    const item = savedItems[index]
    setSavedItems(prev=>prev.filter(i=>i.id!==id))

    const restore = () => {
      setSavedItems(prev => {
        if (prev.some(i=>i.id===id)) return prev
        const next = [...prev]
        next.splice(Math.min(index, next.length), 0, item)
        return next
      })
    }
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(id)
      try { await deleteSavedItem(id) }
      catch { restore(); showToast("Couldn't remove that. Try again.") }
    }, 5000)
    pendingDeletes.current.set(id, { item, index, timer })

    showToast('Removed from your rotation', { label:'Undo', onPress: () => {
      const pending = pendingDeletes.current.get(id)
      if (pending) { clearTimeout(pending.timer); pendingDeletes.current.delete(id) }
      restore()
      hideToast()
    }}, 5000)
  }

  const handleRename = async (id, newLabel) => {
    if (!newLabel.trim()) return
    await supabase.from('saved_items').update({ label: newLabel.trim() }).eq('id', id)
    setSavedItems(prev => prev.map(i => i.id===id ? { ...i, label:newLabel.trim() } : i))
  }

  const go = (next) => {
    setDeepDive(null)
    setTab(next)
    window.scrollTo(0, 0)
  }
  const handleDeepDive = prompt => { setDeepDive(prompt); setTab('pillars'); window.scrollTo(0, 0) }

  if (authLoading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center' }} role="status" aria-label="Loading">
        <HaleLogo size={36} />
      </div>
    )
  }

  if (settingPassword) return <AuthScreen initialMode="setpassword" onPasswordSet={()=>setSettingPassword(false)} />
  if (!session) return <AuthScreen />
  if (showOnboarding) return <OnboardingFlow userId={session.user.id} onComplete={(profile) => {
    try { localStorage.setItem(`hale_onboarded_${session.user.id}`, '1') } catch {}
    setProfile(profile); setShowOnboarding(false)
  }} />

  const userId = session.user.id
  const tb = TOPBAR[tab]
  // Screens reached from Home rather than the tab bar get a back button
  const backTarget = tab==='profile' ? 'home' : (tab==='pillars' && !deepDive) ? 'home' : null

  return (
    <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', minHeight:'100dvh' }}>
      {tab!=='home' && tb && !(tab==='pillars' && deepDive) && !(tab==='move' && pendingSession) && (
        <ScreenHeader key={`h-${tab}`} title={tb.title} subtitle={tb.sub}
          onBack={backTarget ? ()=>go(backTarget) : undefined} />
      )}
      <main key={`${tab}-${deepDive?'d':''}`} className="screen-enter"
        style={{ paddingBottom:'calc(var(--tabbar-h) + 48px + env(safe-area-inset-bottom))' }}>
        {tab==='home'    && <HomeScreen onNav={go} onSave={handleSave} profile={profile} userId={userId} programs={programs} recentSessions={recentSessions} activeProgramId={activeProgramId} onStartWarmup={(info)=>{ setPendingSession(info); go('move') }} />}
        {tab==='move'    && <MoveScreen onSave={handleSave} pendingSession={pendingSession} onClearPending={()=>setPendingSession(null)} onStartSession={(info)=>{ setPendingSession(null); setLiftDeepLink(info); go('lift') }} />}
        {tab==='eat'     && <EatScreen onSave={handleSave} userId={userId} />}
        {tab==='lift'    && <LiftScreen userId={userId} userProfile={profile} onGoEat={()=>go('eat')} onGoMove={()=>go('move')} deepLinkWorkout={liftDeepLink} onClearDeepLink={()=>setLiftDeepLink(null)} />}
        {tab==='pillars' && !deepDive && <PillarsScreen onDeepDive={handleDeepDive} />}
        {tab==='pillars' && deepDive  && <DeepDiveScreen prompt={deepDive} onBack={()=>{ setDeepDive(null); window.scrollTo(0,0) }} />}
        {tab==='stack'   && <StackScreen items={savedItems} onDelete={handleDelete} onRename={handleRename} />}
        {tab==='profile' && <ProfileScreen userId={userId} onSaved={setProfile} onNav={go} />}
      </main>
      <Toast message={toast.message} visible={toast.visible} action={toast.action} />
      <TabBar items={NAV} active={tab} onChange={go} />
    </div>
  )
}
