'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AuthScreen from './AuthScreen'
import LiftScreen from './LiftScreen'
import MoveScreen, { SavedRoutineCard } from './MoveScreen'
import {
  getProfile, saveProfile,
  getPantry, savePantry,
  getTasteMemory, updateTasteMemory,
  getSavedItems, addSavedItem, deleteSavedItem,
  getDailyCache, setDailyCache,
  getPrograms, getSessions,
} from './db'

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
      background:selected?T.text:T.surface2, color:selected?T.bg:T.text2,
      fontWeight:selected?500:400, transition:'all .15s',
    }}>{label}</button>
  )
}
function ChipRow({ options, selected, onSelect }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
      {options.map(o=><Chip key={o} label={o} selected={selected===o} onClick={()=>onSelect(o)} />)}
    </div>
  )
}
function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', marginTop:10, padding:'12px 16px', borderRadius:rr('md'),
      border:'none', background:disabled?T.surface2:T.text,
      color:disabled?T.text3:T.bg, fontSize:14, fontWeight:500,
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
      {loading?<LoadingDots />:text}
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
function Divider() { return <div style={{ height:'0.5px', background:T.border, margin:'12px 0' }} /> }


// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, visible }) {
  if (!visible) return null
  return (
    <div style={{
      position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
      background:'var(--cream)', color:'var(--bg)', padding:'10px 20px',
      borderRadius:20, fontSize:13, fontWeight:500, zIndex:500,
      animation:'slideUp .2s ease-out',
      boxShadow:'0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {message}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}

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

function DailyCard({ userId, cacheKey, category, cardLabel, promptFn, fallback }) {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) return
    getDailyCache(userId, cacheKey).then(cached => {
      if (cached) { setItem(cached); setLoading(false); return }
      callAI(promptFn(category))
        .then(text => {
          const titleMatch = text.match(/TITLE:\s*(.+)/i)
          const bodyMatch = text.match(/(?:TIP|FACT):\s*([\s\S]+)/i)
          const parsed = { category, title: titleMatch?titleMatch[1].trim():cardLabel, text: bodyMatch?bodyMatch[1].trim():text.trim() }
          setDailyCache(userId, cacheKey, parsed)
          setItem(parsed)
          setLoading(false)
        })
        .catch(() => { setItem({ title:cardLabel, category, text:fallback }); setLoading(false) })
    })
  }, [userId])
  const barColor = item ? (CAT_TEXT[item.category]||'var(--green)') : T.text3
  return (
    <div style={{ background:T.surface, borderRadius:rr('md'), overflow:'hidden', marginBottom:12 }}>
      <div style={{ padding:'12px 14px 4px' }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:.6, textTransform:'uppercase', color:barColor }}>
          {cardLabel}{item ? ` · ${item.category}` : ''}
        </div>
      </div>
      <div style={{ padding:'4px 14px 14px' }}>
        {loading?<LoadingDots />:<>
          <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:6 }}>{item.title}</div>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.7 }}>{item.text}</div>
        </>}
      </div>
    </div>
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
  '🥚 Eggs','🍗 Chicken','🥩 Ground beef','🐟 Salmon','🍖 Steak',
  '🍚 Rice','🍝 Pasta','🥔 Potatoes','🫘 Beans','🌽 Corn',
  '🥦 Broccoli','🥬 Spinach','🍅 Tomatoes','🧀 Cheese','🥛 Greek yogurt',
  '🍌 Banana','🫐 Blueberries','🍠 Sweet potato','🥑 Avocado','🧇 Oats',
]

function PantryEditor({ pantry, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [showQuick, setShowQuick] = useState(pantry.length === 0)
  const handleAdd = async (item) => {
    const t = (item||input).trim().replace(/^\S+\s/, '') // strip emoji
    if (!t) return
    const ok = await onAdd(t)
    if (ok) { setInput(''); setError('') } else setError('Already in your pantry')
  }
  const quickAvailable = QUICK_ADD.filter(q => {
    const name = q.replace(/^\S+\s/, '').toLowerCase()
    return !pantry.map(p=>p.toLowerCase()).includes(name)
  })
  return (
    <div style={{ marginBottom:14 }}>
      {/* Current pantry */}
      {pantry.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
          {pantry.map(ing=>(
            <div key={ing} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:20, fontSize:13, background:T.surface2, color:T.text }}>
              <span>{ing}</span>
              <button onClick={()=>onRemove(ing)} style={{ border:'none', background:'none', color:T.text3, fontSize:14, padding:0, lineHeight:1, cursor:'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Quick add chips */}
      {showQuick && quickAvailable.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:T.text3, marginBottom:6 }}>Quick add</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {quickAvailable.slice(0,12).map(q=>(
              <button key={q} onClick={()=>handleAdd(q)} style={{
                padding:'5px 11px', borderRadius:20, fontSize:12, cursor:'pointer',
                border:`0.5px solid ${T.border}`, background:T.surface, color:T.text2,
              }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Text input */}
      <div style={{ display:'flex', gap:6 }}>
        <input value={input} onChange={e=>{ setInput(e.target.value); setError('') }}
          onKeyDown={e=>e.key==='Enter'&&handleAdd()} placeholder="Add anything else..."
          style={{ flex:1, padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none' }} />
        <button onClick={()=>handleAdd()} style={{ padding:'9px 14px', borderRadius:rr('sm'), fontSize:13, border:'none', background:T.text, color:T.bg, fontWeight:500, cursor:'pointer' }}>Add</button>
      </div>
      {error && <div style={{ fontSize:11, color:'var(--coral)', marginTop:4 }}>{error}</div>}
      {pantry.length > 0 && (
        <button onClick={()=>setShowQuick(v=>!v)} style={{ marginTop:8, border:'none', background:'none', color:T.text3, fontSize:12, padding:0, cursor:'pointer' }}>
          {showQuick ? 'Hide suggestions' : '+ Quick add more'}
        </button>
      )}
    </div>
  )
}

// ─── Recipe card ──────────────────────────────────────────────────────────────
function RecipeCard({ text, onAdjust, adjusting }) {
  const [showMacros, setShowMacros] = useState(false)
  if (!text) return null
  const lines = text.split('\n').map(l=>l.trim().replace(/^#+\s*/,'')).filter(Boolean)
  const name = lines[0]||''
  const ingStart  = lines.findIndex(l=>l.toLowerCase().startsWith('ingredient'))
  const stepStart = lines.findIndex(l=>l.toLowerCase().match(/^steps?:?$|^directions?:?$/))
  const macroStart= lines.findIndex(l=>l.toLowerCase().match(/^macros?|^nutrition/))
  const varStart  = lines.findIndex(l=>l.toLowerCase().match(/^variations?:?$/))
  const slice = (from,tos) => { const ends=tos.filter(t=>t>from); const end=ends.length?Math.min(...ends):undefined; return lines.slice(from+1,end).filter(l=>l) }
  const ingredients = ingStart>=0  ? slice(ingStart,[stepStart,macroStart,varStart]) : []
  const steps       = stepStart>=0 ? slice(stepStart,[macroStart,varStart])          : []
  const macroLines  = macroStart>=0? slice(macroStart,[varStart])                    : []
  const varLines    = varStart>=0  ? slice(varStart,[])                              : []
  const macros = {}
  macroLines.forEach(l=>{ const nums=l.match(/\d+/g)||[]; const num=nums.length?nums.reduce((a,b)=>a.length>=b.length?a:b):''; const low=l.toLowerCase(); if(low.includes('calorie')||low.includes('kcal'))macros.cal=num; else if(low.includes('protein'))macros.protein=num; else if(low.includes('carb'))macros.carbs=num; else if(low.includes('fat'))macros.fat=num })
  return (
    <div style={{ marginTop:14, background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), overflow:'hidden' }}>
      <div style={{ padding:'16px 16px 12px', borderBottom:`0.5px solid ${T.border}` }}>
        <div style={{ fontSize:18, fontWeight:500, color:T.text }}>{name}</div>
      </div>
      {ingredients.length>0&&<div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Ingredients</div>{ingredients.map((ing,i)=><div key={i} style={{ fontSize:13, color:T.text2, paddingBottom:5, lineHeight:1.4 }}>- {ing.replace(/^[-*]\s*/,'')}</div>)}</div>}
      {steps.length>0&&<div style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Steps</div>{steps.map((step,i)=><div key={i} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}><div style={{ width:20, height:20, borderRadius:'50%', background:T.surface2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, color:T.text2, flexShrink:0 }}>{i+1}</div><div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{step.replace(/^\d+[\.\)]\s*/,'').replace(/^[-*]\s*/,'')}</div></div>)}</div>}
      {Object.keys(macros).length>0&&<div style={{ padding:'10px 16px', borderBottom:varLines.length>0||onAdjust?`0.5px solid ${T.border}`:'none' }}>
        <button onClick={()=>setShowMacros(v=>!v)} style={{ background:'none', border:'none', color:T.text3, fontSize:12, padding:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <span>Macros</span>
          <span style={{ fontSize:10 }}>{showMacros?'▲':'▼'}</span>
        </button>
        {showMacros && <div style={{ display:'flex', gap:8, marginTop:10 }}>{macros.cal&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.cal}</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>cal</div></div>}{macros.protein&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.protein}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>protein</div></div>}{macros.carbs&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.carbs}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>carbs</div></div>}{macros.fat&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.fat}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>fat</div></div>}</div>}
      </div>}
      {varLines.length>0&&<div style={{ padding:'12px 16px', background:T.surface2, borderBottom:onAdjust?`0.5px solid ${T.border}`:'none' }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Quick variations</div>{varLines.map((v,i)=><div key={i} style={{ fontSize:12, color:T.text2, paddingBottom:5, lineHeight:1.5 }}>{v.replace(/^[-*]\s*/,'')}</div>)}</div>}
      {onAdjust&&<div style={{ padding:'12px 16px' }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Adjust this meal</div>{adjusting?<div style={{ padding:'8px 0' }}><LoadingDots /></div>:<div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{ADJUST_BUTTONS.map(b=><button key={b.key} onClick={()=>onAdjust(b.key,name,text)} style={{ padding:'6px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text2, cursor:'pointer' }}>{b.label}</button>)}</div>}</div>}
    </div>
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
            <div key={i} onClick={item.action}
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
function SomethingSmallCard({ onNav }) {
  const [dismissed, setDismissed] = useState(false)
  const lastVisit = typeof window !== 'undefined' ? localStorage.getItem('last_home_visit') : null
  const daysSince = lastVisit ? Math.floor((Date.now() - parseInt(lastVisit)) / (1000*60*60*24)) : 0

  // Update last visit
  if (typeof window !== 'undefined') {
    localStorage.setItem('last_home_visit', Date.now().toString())
  }

  // Only show if it has been 4+ days since last visit and not dismissed
  if (daysSince < 4 || dismissed) return null

  const suggestions = [
    { text:'5 minutes of mobility', action:'move',  btn:'Quick relief' },
    { text:'find something to eat',  action:'eat',   btn:'Get a recipe'  },
    { text:'a quick stretch',        action:'move',  btn:'Move a little' },
  ]
  const suggestion = suggestions[daysSince % suggestions.length]

  return (
    <div style={{ background:T.surface, borderRadius:rr('md'), padding:'14px 16px', marginBottom:14, position:'relative' }}>
      <button onClick={()=>setDismissed(true)} style={{ position:'absolute', top:10, right:12, border:'none', background:'none', color:T.text3, fontSize:14, cursor:'pointer', padding:0 }}>×</button>
      <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:4, paddingRight:20 }}>
        Five minutes is enough.
      </div>
      <div style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:12 }}>
        No need to catch up or do everything at once. How about {suggestion.text}?
      </div>
      <button onClick={()=>onNav(suggestion.action)} style={{ padding:'8px 18px', borderRadius:20, border:'none', background:'var(--cream)', color:'var(--bg)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
        {suggestion.btn}
      </button>
    </div>
  )
}


// ─── Smart home card ──────────────────────────────────────────────────────────
function getWarmupType(workoutName) {
  const n = (workoutName||'').toLowerCase()
  if (n.includes('lower') || n.includes('squat') || n.includes('deadlift') || n.includes('leg') || n.includes('hip')) return 'lower'
  if (n.includes('upper') || n.includes('press') || n.includes('pull') || n.includes('bench') || n.includes('arm')) return 'upper'
  return 'lower' // default to lower for full body
}

function SmartHomeCard({ programs, recentSessions, activeProgramId, onStartWarmup, onNav }) {
  if (!programs?.length) return null

  // Find the active program — match LiftScreen's active program
  const activeProgram = programs.find(p => p.id === activeProgramId) || programs[0]
  if (!activeProgram?.phases?.length) return null

  // Find last session workout ID
  const lastSession = recentSessions?.[0]
  const lastWorkoutId = lastSession?.workoutId || lastSession?.workout_id

  // Find next workout across all phases
  let nextWorkout = null
  let nextPhase = null
  const phases = activeProgram.phases || []

  if (!lastWorkoutId) {
    const firstPhase = phases.find(p => p.workouts?.length > 0)
    if (firstPhase) { nextPhase = firstPhase; nextWorkout = firstPhase.workouts[0] }
  } else {
    for (let pi = 0; pi < phases.length; pi++) {
      const ph = phases[pi]
      const workouts = ph.workouts || []
      const idx = workouts.findIndex(w => w.id === lastWorkoutId)
      if (idx >= 0) {
        if (idx + 1 < workouts.length) { nextPhase = ph; nextWorkout = workouts[idx + 1] }
        else {
          for (let ni = pi + 1; ni < phases.length; ni++) {
            if (phases[ni].workouts?.length > 0) { nextPhase = phases[ni]; nextWorkout = phases[ni].workouts[0]; break }
          }
          if (!nextWorkout) { nextPhase = phases[0]; nextWorkout = phases[0].workouts?.[0] }
        }
        break
      }
    }
    if (!nextWorkout) {
      const firstPhase = phases.find(p => p.workouts?.length > 0)
      if (firstPhase) { nextPhase = firstPhase; nextWorkout = firstPhase.workouts[0] }
    }
  }

  if (!nextWorkout || !nextPhase) return null

  const warmupType = getWarmupType(nextWorkout.name)
  const warmupLabel = warmupType === 'upper' ? 'Upper body warmup' : 'Lower body warmup'
  const hour = new Date().getHours()
  const timeLabel = hour < 12 ? 'Ready to train this morning?' : hour < 17 ? 'Afternoon session?' : 'Evening lift?'

  return (
    <div style={{ background:T.surface, borderRadius:rr('lg'), marginBottom:16, overflow:'hidden', border:`0.5px solid ${T.border}` }}>
      <div style={{ padding:'16px 16px 12px' }}>
        <div style={{ fontSize:11, color:'var(--cream)', fontWeight:600, letterSpacing:.5, textTransform:'uppercase', marginBottom:6 }}>{timeLabel}</div>
        <div style={{ fontSize:17, fontWeight:500, color:T.text, marginBottom:4 }}>{nextWorkout.name}</div>
        <div style={{ fontSize:12, color:T.text3, marginBottom:14 }}>{activeProgram.name} · {nextPhase.name}</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>onStartWarmup({ programId:activeProgram.id, phaseId:nextPhase.id, workoutId:nextWorkout.id, workoutName:nextWorkout.name, warmupType })}
            style={{ flex:1, padding:'11px', borderRadius:rr('md'), border:'none', background:'var(--cream)', color:'var(--bg)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Start with warmup →
          </button>
          <button onClick={()=>onNav('lift')}
            style={{ padding:'11px 14px', borderRadius:rr('md'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13, cursor:'pointer' }}>
            Skip warmup
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── Onboarding flow ──────────────────────────────────────────────────────────
function OnboardingFlow({ userId, onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [identity, setIdentity] = useState('')
  const [goal, setGoal] = useState('')
  const [activity, setActivity] = useState('')
  const [saving, setSaving] = useState(false)

  const steps = [
    // Step 0 — Welcome
    {
      eyebrow: null,
      title: 'Feel better without\noverthinking it.',
      sub: 'A few quick questions to personalize your experience.',
      content: null,
      cta: 'Get started',
    },
    // Step 1 — Name
    {
      eyebrow: 'Step 1 of 3',
      title: "What's your name?",
      sub: null,
      content: (
        <input value={name} onChange={e=>setName(e.target.value)}
          placeholder="First name"
          autoFocus
          style={{ width:'100%', padding:'14px', borderRadius:rr('md'), fontSize:16,
            border:`1px solid ${T.border2}`, background:T.surface, color:T.text,
            outline:'none', marginBottom:8 }} />
      ),
      cta: 'Continue',
      canSkip: true,
    },
    // Step 2 — Identity
    {
      eyebrow: 'Step 2 of 3',
      title: 'Who are you becoming?',
      sub: 'Pick the one that resonates most.',
      content: (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {IDENTITY_STATEMENTS.map(s => (
            <button key={s} onClick={()=>setIdentity(s)} style={{
              padding:'13px 16px', borderRadius:rr('md'), fontSize:14, textAlign:'left',
              border:`1px solid ${identity===s?'var(--cream-dim)':T.border}`,
              background: identity===s ? 'var(--cream-bg)' : T.surface,
              color: identity===s ? 'var(--cream)' : T.text2,
              fontWeight: identity===s ? 500 : 400, cursor:'pointer',
              transition:'all .15s',
            }}>{s}</button>
          ))}
        </div>
      ),
      cta: 'Continue',
      canSkip: true,
    },
    // Step 3 — Goal + Activity
    {
      eyebrow: 'Step 3 of 3',
      title: 'What are you focused on?',
      sub: null,
      content: (
        <div>
          <div style={{ fontSize:12, color:T.text3, marginBottom:8, letterSpacing:.2 }}>Training goal</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
            {GOALS.map(g => (
              <button key={g} onClick={()=>setGoal(g)} style={{
                padding:'8px 14px', borderRadius:20, fontSize:13, border:'none', cursor:'pointer',
                background: goal===g ? 'var(--cream)' : T.surface2,
                color: goal===g ? 'var(--bg)' : T.text2,
                fontWeight: goal===g ? 500 : 400,
              }}>{g}</button>
            ))}
          </div>
          <div style={{ fontSize:12, color:T.text3, marginBottom:8, letterSpacing:.2 }}>How active are you?</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {ACTIVITY_LEVELS.map(a => (
              <button key={a} onClick={()=>setActivity(a)} style={{
                padding:'12px 14px', borderRadius:rr('md'), fontSize:13, textAlign:'left',
                border:`1px solid ${activity===a?'var(--cream-dim)':T.border}`,
                background: activity===a ? 'var(--cream-bg)' : T.surface,
                color: activity===a ? 'var(--cream)' : T.text2,
                cursor:'pointer',
              }}>{a}</button>
            ))}
          </div>
        </div>
      ),
      cta: "Let's go",
      canSkip: false,
    },
  ]

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
      return
    }
    // Final step — save and complete
    setSaving(true)
    await saveProfile(userId, { name, identity, goal, activity })
    setSaving(false)
    onComplete({ name, identity, goal, activity })
  }

  const current = steps[step]
  const canProceed = step === 0 || step === 3 ? true :
    step === 1 ? true : // name is optional
    step === 2 ? true : true // identity optional

  return (
    <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg,
      display:'flex', flexDirection:'column', padding:'0 24px' }}>

      {/* Progress bar */}
      {step > 0 && (
        <div style={{ display:'flex', gap:4, padding:'52px 0 0' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex:1, height:2, borderRadius:2,
              background: i <= step ? 'var(--cream)' : T.border,
              transition:'background .3s' }} />
          ))}
        </div>
      )}

      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent: step===0 ? 'center' : 'flex-start',
        paddingTop: step===0 ? 0 : 32 }}>

        {/* Eyebrow */}
        {current.eyebrow && (
          <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase',
            marginBottom:12, fontWeight:500 }}>{current.eyebrow}</div>
        )}

        {/* Title */}
        <div style={{ fontSize: step===0 ? 32 : 26, fontWeight:400, color:T.text,
          letterSpacing:-.5, lineHeight:1.25, marginBottom:current.sub?10:24,
          whiteSpace:'pre-line' }}>{current.title}</div>

        {/* Sub */}
        {current.sub && (
          <div style={{ fontSize:14, color:T.text2, marginBottom:24, lineHeight:1.6 }}>{current.sub}</div>
        )}

        {/* Content */}
        {current.content && (
          <div style={{ marginBottom:24 }}>{current.content}</div>
        )}

        {/* Welcome screen mark */}
        {step === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, marginBottom:48 }}>
            <HaleMark size={72} />
            <HaleWordmark size={28} />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{ paddingBottom:48 }}>
        <button onClick={handleNext} disabled={saving} style={{
          width:'100%', padding:'14px', borderRadius:rr('md'), border:'none',
          background:'var(--cream)', color:'var(--bg)',
          fontSize:15, fontWeight:600, cursor:'pointer', marginBottom:12,
          opacity: saving ? .7 : 1,
        }}>{saving ? 'Saving...' : current.cta}</button>

        {current.canSkip && step > 0 && (
          <button onClick={handleNext} style={{ width:'100%', padding:'10px', borderRadius:rr('md'),
            border:'none', background:'none', color:T.text3, fontSize:13, cursor:'pointer' }}>
            Skip
          </button>
        )}
      </div>
    </div>
  )
}


// ─── Hale brand components ────────────────────────────────────────────────────
function HaleMark({ size = 40, color = 'var(--cream)' }) {
  const r1 = size * 0.42, r2 = size * 0.25, r3 = size * 0.087
  const cx = size / 2, cy = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={r1} stroke={color} strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={r2} stroke={color} strokeWidth="1" opacity=".3"/>
      <circle cx={cx} cy={cy} r={r3} fill={color}/>
    </svg>
  )
}

function HaleWordmark({ size = 32, color = 'var(--cream)' }) {
  return (
    <div style={{ fontFamily:"'Outfit', sans-serif", fontWeight:200, fontSize:size,
      letterSpacing:'0.22em', textTransform:'uppercase', color, paddingLeft:'0.22em', lineHeight:1 }}>
      Hale
    </div>
  )
}

function HaleLockup({ markSize = 28, wordSize = 22, color = 'var(--cream)', gap = 10 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap }}>
      <HaleMark size={markSize} color={color} />
      <HaleWordmark size={wordSize} color={color} />
    </div>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function HomeScreen({ onNav, savedItems, profile, userId, programs, recentSessions, activeProgramId, onStartWarmup }) {
  const hour = new Date().getHours()
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const name = profile?.name?`, ${profile.name}`:''
  const tiles = [
    { tab:'move',    label:'Move',         desc:'Mobility & warmups',          iconColor:'var(--green)',   iconBg:'var(--green-bg)'   },
    { tab:'eat',     label:'Eat',          desc:'Recipes, your ingredients',   iconColor:'var(--amber)',   iconBg:'var(--amber-bg)'   },
    { tab:'lift',    label:'Lift',         desc:'Programs & sessions',         iconColor:'var(--cream)',    iconBg:'var(--cream-bg)'    },
    { tab:'stack',   label:'Your Rotation',desc:'Saved meals & routines',      iconColor:'var(--purple)',  iconBg:'var(--purple-bg)'  },
  ]

  const TILE_ICONS = {
    move: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/><path d="M12 7v6M9 10l-2 4h10l-2-4"/><path d="M9 21l1-4h4l1 4"/>
      </svg>
    ),
    eat: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
    lift: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 12h12"/>
      </svg>
    ),
    pillars: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    stack: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 11H5M19 6H5M19 16H5"/><circle cx="3" cy="6" r="1" fill={color}/><circle cx="3" cy="11" r="1" fill={color}/><circle cx="3" cy="16" r="1" fill={color}/>
      </svg>
    ),
  }
  const day = new Date().getDate()
  const isNewUser = !profile?.goal && !profile?.name
  return (
    <div style={{ padding:'32px 20px 20px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ marginBottom:16 }}>
          <HaleLockup markSize={24} wordSize={18} color="var(--cream-dim)" gap={8} />
        </div>
        <div style={{ fontSize:13, color:T.text3, marginBottom:6 }}>{greeting}</div>
        <div style={{ fontSize:28, fontWeight:400, color:T.text, letterSpacing:-.5, lineHeight:1.2 }}>Good day{name}.</div>
        <div style={{ fontSize:14, color:T.text2, marginTop:8 }}>Feel better without overthinking it.</div>
      </div>

      {isNewUser && (
        <div style={{ background:T.surface, borderRadius:rr('md'), padding:'16px', marginBottom:20, borderLeft:`3px solid var(--cream)` }}>
          <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:4 }}>Welcome.</div>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.6, marginBottom:12 }}>Your personal health and performance app. Movement, meals, and lifting — all in one place, without the overwhelm.</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>onNav('profile')} style={{ flex:1, padding:'9px', borderRadius:rr('sm'), border:'none', background:T.text, color:T.bg, fontSize:13, fontWeight:500, cursor:'pointer' }}>Set up profile</button>
            <button onClick={()=>onNav('move')} style={{ flex:1, padding:'9px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13, cursor:'pointer' }}>Explore first</button>
          </div>
        </div>
      )}
      <SmartHomeCard programs={programs} recentSessions={recentSessions} activeProgramId={activeProgramId} onStartWarmup={onStartWarmup} onNav={onNav} />
      <DailyCard userId={userId} cacheKey="daily_tip" category={TIP_CATEGORIES[day%TIP_CATEGORIES.length]} cardLabel="Daily tip"
        promptFn={cat=>'You are a knowledgeable health advisor. Give ONE practical tip about '+cat+'. 2-3 sentences. Specific and surprising. No fluff, no exclamation marks. Give a 2-4 word title. Format: TITLE: [title] TIP: [tip]'}
        fallback="Consistency over intensity. Showing up three times a week for a year will outperform any extreme program you can only stick to for a month." />
      <DailyCard userId={userId} cacheKey="daily_fact" category={FACT_CATEGORIES[day%FACT_CATEGORIES.length]} cardLabel="Daily fact"
        promptFn={cat=>'You are a science communicator. Give ONE surprising fact about '+cat+'. 2-3 sentences. Make it feel worth sharing. No obvious facts. No fluff. Give a 2-4 word title. Format: TITLE: [title] FACT: [fact]'}
        fallback="Your muscles grow during rest, not during the workout itself. The training session is just the signal — sleep and nutrition are where the actual adaptation happens." />
      <SomethingSmallCard onNav={onNav} />
      <Eyebrow>Quick access</Eyebrow>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:16 }}>
        {tiles.map(t=>(
          <button key={t.tab} onClick={()=>onNav(t.tab)} style={{ background:T.surface, borderRadius:rr('md'), padding:14, textAlign:'left', border:'none', cursor:'pointer' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:t.iconBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
              {TILE_ICONS[t.tab]?.(t.iconColor)}
            </div>
            <div style={{ fontSize:13, fontWeight:500, color:T.text, marginBottom:3 }}>{t.label}</div>
            <div style={{ fontSize:11, color:T.text2, lineHeight:1.4 }}>{t.desc}</div>
          </button>
        ))}
      </div>

    </div>
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
      <div onClick={()=>setExpanded(v=>!v)} style={{ padding:'14px 16px', cursor:'pointer' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <div style={{ fontSize:15, fontWeight:500, color:T.text }}>{spot.name}</div>
              {spot.curated && <div style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'var(--amber-bg)', color:'var(--amber)', fontWeight:500, flexShrink:0 }}>✓ Curated</div>}
            </div>
            <div style={{ fontSize:12, color:T.text3 }}>{spot.neighborhood} · {spot.cuisine} · {spot.priceRange}</div>
          </div>
          <div style={{ fontSize:13, color:T.text3, marginLeft:8, transform:expanded?'rotate(180deg)':'none', transition:'transform .2s' }}>▼</div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {spot.tags.map(tag => {
            const s = TAG_META[tag] || { bg:T.surface2, text:T.text2, label:tag }
            return <div key={tag} style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:s.bg, color:s.text, fontWeight:500 }}>{s.label}</div>
          })}
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop:`0.5px solid ${T.border}`, padding:'12px 16px' }}>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.65, marginBottom:10 }}>{spot.description}</div>
          <div style={{ background:T.surface2, borderRadius:rr('sm'), padding:'10px 12px', marginBottom:8 }}>
            <div style={{ fontSize:10, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Order this</div>
            <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{spot.mustOrder}</div>
          </div>
          {spot.curatorNote && <div style={{ fontSize:11, color:T.text3, fontStyle:'italic' }}>— {spot.curatorNote}</div>}
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
        <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Location</div>
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
        <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8 }}>Filter</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          <button onClick={()=>setActiveTag(null)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, border:`0.5px solid ${T.border}`, cursor:'pointer', background:!activeTag?T.text:T.surface, color:!activeTag?T.bg:T.text2 }}>All</button>
          {allTags.map(tag => {
            const s = TAG_META[tag] || { bg:T.surface2, text:T.text2, label:tag }
            return <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, cursor:'pointer', border:`0.5px solid ${activeTag===tag?s.text:T.border}`, background:activeTag===tag?s.bg:T.surface, color:activeTag===tag?s.text:T.text2, fontWeight:activeTag===tag?500:400 }}>{s.label||tag}</button>
          })}
        </div>
      </div>
      <div style={{ fontSize:11, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:12 }}>{filtered.length} spot{filtered.length!==1?'s':''} · Personally curated</div>
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
    addVote()
    setSaved(true)
  }

  return (
    <div style={{ padding:'20px 20px' }}>
      <div>
      <PantryEditor pantry={pantry} onAdd={add} onRemove={remove} />
      <Divider />
      <PrefLabel>Effort level</PrefLabel>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {EFFORT_LEVELS.map(e=><button key={e.key} onClick={()=>setEffort(e.key)} style={{ flex:1, padding:'10px 6px', borderRadius:rr('sm'), fontSize:11, textAlign:'center', border:effort===e.key?'none':`0.5px solid ${T.border}`, background:effort===e.key?T.text:T.surface, color:effort===e.key?T.bg:T.text2 }}><div style={{ fontWeight:500, marginBottom:2, fontSize:12 }}>{e.label}</div><div style={{ opacity:.7, lineHeight:1.3 }}>{e.desc}</div></button>)}
      </div>
      <PrefLabel>Meal type</PrefLabel>
      <ChipRow options={['Breakfast','Lunch','Dinner','Snack']} selected={meal} onSelect={setMeal} />
      <PrefLabel>Cuisine (optional)</PrefLabel>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
        {CUISINES.map(cu=><button key={cu} onClick={()=>setCuisine(cuisine===cu?'':cu)} style={{ padding:'5px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`, background:cuisine===cu?T.text:T.surface2, color:cuisine===cu?T.bg:T.text2 }}>{cu}</button>)}
      </div>
      <PrefLabel>What's the vibe?</PrefLabel>
      <textarea value={vibe} onChange={e=>setVibe(e.target.value)} placeholder="high protein, comforting, fresh, post-workout..." rows={2} style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 12px', fontSize:14, color:T.text, resize:'none', outline:'none', marginBottom:8 }} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:4 }}>
        {VIBE_SUGGESTIONS.map(v=><button key={v} onClick={()=>setVibe(vibe===v?'':v)} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, border:`0.5px solid ${T.border}`, background:vibe===v?T.text:T.surface2, color:vibe===v?T.bg:T.text3 }}>{v}</button>)}
      </div>
      <PrimaryBtn onClick={()=>go(false)} disabled={loading||pantry.length===0}>{loading?'Finding a great recipe...':'Get recipe ideas'}</PrimaryBtn>
      {loading&&<div style={{ marginTop:12 }}><LoadingDots /></div>}
      {resp&&!loading&&!resp.startsWith('Taking longer')&&!resp.startsWith('Something went wrong')&&<RecipeCard text={resp} onAdjust={adjust} adjusting={adjusting} />}
      {resp&&!loading&&(resp.startsWith('Taking longer')||resp.startsWith('Something went wrong'))&&(
        <div style={{ marginTop:16, background:T.surface, borderRadius:rr('md'), padding:'16px', border:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:14, fontWeight:500, color:T.text, marginBottom:6 }}>
            {resp.startsWith('Taking longer') ? 'Taking a moment...' : 'Something went wrong'}
          </div>
          <div style={{ fontSize:13, color:T.text2, marginBottom:14, lineHeight:1.6 }}>{resp}</div>
          <button onClick={()=>go(false)} style={{ padding:'10px 20px', borderRadius:rr('sm'), border:'none',
            background:'var(--cream)', color:'var(--bg)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            Try again
          </button>
        </div>
      )}
      {resp&&!loading&&!resp.startsWith('Taking longer')&&!resp.startsWith('Something went wrong')&&(
        <div style={{ marginTop:12 }}>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <button onClick={save} disabled={saved} style={{
              flex:1, padding:'12px', borderRadius:rr('md'), border:'none',
              background:saved?T.surface2:'var(--cream)', color:saved?'var(--green)':'var(--bg)',
              fontSize:14, fontWeight:500, cursor:saved?'default':'pointer',
            }}>
              {saved ? '✓ Saved' : '＋ Save'}
            </button>
            <button onClick={()=>go(true)} style={{
              flex:1, padding:'12px', borderRadius:rr('md'),
              border:`0.5px solid ${T.border}`, background:'transparent',
              color:T.text2, fontSize:13, cursor:'pointer',
            }}>Try another</button>
          </div>
          {saved && <div style={{ fontSize:12, color:T.text3, textAlign:'center', fontStyle:'italic' }}>Added to your rotation.</div>}
        </div>
      )}
      </div>
    </div>
  )
}

function PillarCard({ p, onDeepDive }) {
  const [expanded, setExpanded] = useState(false)
  const col = PILLAR_COLORS[p.color]
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:col.bg, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, fontWeight:500, color:col.accent, letterSpacing:.5, textTransform:'uppercase' }}>Pillar {p.num}</div>
          <div style={{ fontSize:16, fontWeight:500, color:T.text, marginTop:1 }}>{p.title}</div>
        </div>
      </div>
      <div style={{ fontSize:13, color:col.accent, lineHeight:1.6, marginBottom:8, fontStyle:'italic' }}>{p.identity}</div>
      <div style={{ fontSize:13, color:T.text2, lineHeight:1.7, marginBottom:10 }}>
        {expanded ? p.body : ''}
      </div>
      {expanded && <>
        <Divider />
        <div style={{ display:'flex', gap:14, marginBottom:12 }}>
          <div style={{ flex:1 }}><div style={{ fontSize:10, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Worth your time</div><div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{p.good}</div></div>
          <div style={{ flex:1 }}><div style={{ fontSize:10, fontWeight:500, color:'var(--coral)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Skip this</div><div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{p.skip}</div></div>
        </div>
        <button onClick={()=>onDeepDive(p.prompt)} style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13, textAlign:'left', marginBottom:6 }}>Go deeper →</button>
      </>}
      <button onClick={()=>setExpanded(v=>!v)} style={{ background:'none', border:'none', color:T.text3, fontSize:12, padding:'4px 0 0', cursor:'pointer' }}>
        {expanded ? 'Show less ▲' : 'Read more ▼'}
      </button>
    </Card>
  )
}

function PillarsScreen({ onDeepDive }) {
  return (
    <div style={{ padding:'20px 20px' }}>
      {PILLARS.map(p => <PillarCard key={p.num} p={p} onDeepDive={onDeepDive} />)}
    </div>
  )
}

function DeepDiveScreen({ prompt, onBack }) {
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    callAI(prompt+'\n\nBe conversational, practical, and concise. No fluff.')
      .then(setResp)
      .catch(e => setResp(e.message === 'timeout'
        ? 'Taking a bit longer than usual. Go back and try again.'
        : 'Something went wrong. Go back and try again.'))
      .finally(()=>setLoading(false))
  }, [prompt])
  return (
    <div style={{ padding:'20px 20px' }}>
      <button onClick={onBack} style={{ border:'none', background:'none', color:T.text2, fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:4, padding:0 }}>Back to Pillars</button>
      <ResponseBox text={resp} loading={loading} />
    </div>
  )
}

function ProfileScreen({ userId, onSaved, onNav }) {
  const [profile, setProfile] = useState({
    name:'', age:'', gender:'', location:'',
    goal:'', activity:'', experience:'',
    protein:'', calories:'',
    sports:'', notes:''
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { if (userId) getProfile(userId).then(p=>{ setProfile(p||{}); setLoading(false) }) }, [userId])
  const update = (key,val) => setProfile(p=>({ ...p, [key]:val }))
  const handleSave = async () => {
    await saveProfile(userId, profile)
    setSaved(true); setTimeout(()=>setSaved(false),2000)
    if (onSaved) onSaved(profile)
  }
  if (loading) return <div style={{ padding:20 }}><LoadingDots /></div>

  const Section = ({ label }) => (
    <div style={{ fontSize:10, color:T.text3, letterSpacing:.6, textTransform:'uppercase', fontWeight:500, marginBottom:10, marginTop:22, paddingBottom:6, borderBottom:`0.5px solid ${T.border}` }}>{label}</div>
  )

  return (
    <div style={{ padding:'20px 20px' }}>
      <Section label="About you" />
      <PrefLabel>First name</PrefLabel>
      <input value={profile.name||''} onChange={e=>update('name',e.target.value)} placeholder="First name"
        style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none', marginBottom:10 }} />

      <div style={{ display:'flex', gap:10, marginBottom:10 }}>
        <div style={{ flex:1 }}>
          <PrefLabel>Age</PrefLabel>
          <input type="number" value={profile.age||''} onChange={e=>update('age',e.target.value)} placeholder="e.g. 28"
            style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none' }} />
        </div>
        <div style={{ flex:1 }}>
          <PrefLabel>Location</PrefLabel>
          <input value={profile.location||''} onChange={e=>update('location',e.target.value)} placeholder="City"
            style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none' }} />
        </div>
      </div>

      <PrefLabel>Gender (optional)</PrefLabel>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {['Male','Female','Prefer not to say'].map(g => (
          <button key={g} onClick={()=>update('gender', profile.gender===g?'':g)} style={{
            padding:'7px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`, cursor:'pointer',
            background: profile.gender===g ? T.text : T.surface2,
            color: profile.gender===g ? T.bg : T.text2,
          }}>{g}</button>
        ))}
      </div>

      <Section label="Your training" />
      <PrefLabel>Training goal</PrefLabel>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
        {GOALS.map(g => (
          <button key={g} onClick={()=>update('goal', profile.goal===g?'':g)} style={{
            padding:'7px 13px', borderRadius:20, fontSize:12, border:'none', cursor:'pointer',
            background: profile.goal===g ? 'var(--cream)' : T.surface2,
            color: profile.goal===g ? 'var(--bg)' : T.text2,
            fontWeight: profile.goal===g ? 500 : 400,
          }}>{g}</button>
        ))}
      </div>

      <PrefLabel>Activity level</PrefLabel>
      <ChipRow options={ACTIVITY_LEVELS} selected={profile.activity||''} onSelect={v=>update('activity',v)} />

      <PrefLabel>Training experience</PrefLabel>
      <ChipRow options={['Beginner','Intermediate','Experienced']} selected={profile.experience||''} onSelect={v=>update('experience',v)} />

      <PrefLabel>Sports or activities you do</PrefLabel>
      <input value={profile.sports||''} onChange={e=>update('sports',e.target.value)} placeholder="e.g. golf, running, basketball"
        style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none', marginBottom:14 }} />

      <Section label="Nutrition targets (optional)" />
      <div style={{ fontSize:12, color:T.text3, marginBottom:10, lineHeight:1.6 }}>
        Used to personalize recipe suggestions and post-workout nutrition guidance.
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <div style={{ flex:1 }}>
          <PrefLabel>Daily protein (g)</PrefLabel>
          <input type="number" value={profile.protein||''} onChange={e=>update('protein',e.target.value)} placeholder="e.g. 160"
            style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none' }} />
        </div>
        <div style={{ flex:1 }}>
          <PrefLabel>Daily calories</PrefLabel>
          <input type="number" value={profile.calories||''} onChange={e=>update('calories',e.target.value)} placeholder="e.g. 2800"
            style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none' }} />
        </div>
      </div>

      <Section label="Anything else?" />
      <textarea value={profile.notes||''} onChange={e=>update('notes',e.target.value)}
        placeholder="Injuries, preferences, things the app should know about you..."
        rows={3} style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`,
          borderRadius:rr('md'), padding:'10px 12px', fontSize:13, color:T.text, resize:'none', outline:'none', marginBottom:14 }} />

      <PrimaryBtn onClick={handleSave}>{saved?'Profile saved ✓':'Save profile'}</PrimaryBtn>

      <div style={{ marginTop:16, padding:'12px 14px', background:T.surface2, borderRadius:rr('md') }}>
        <div style={{ fontSize:12, color:T.text3, lineHeight:1.7 }}>Your profile personalizes recipe suggestions, workout nutrition guidance, and how the app talks to you.</div>
      </div>
    </div>
  )
}

function SavedItemDetail({ item }) {
  // Try JSON routine format
  if (item.type === 'routine') {
    try {
      const parsed = JSON.parse(item.text)
      if (parsed.exercises?.length) {
        return (
          <div style={{ padding:'8px 16px 16px' }}>
            {parsed.duration && <div style={{ fontSize:11, color:T.text3, marginBottom:10 }}>{parsed.duration}{parsed.source ? ` · ${parsed.source}` : ''}</div>}
            {parsed.exercises.map((ex, i) => (
              <div key={i} style={{ padding:'12px 0', borderBottom: i < parsed.exercises.length-1 ? `0.5px solid ${T.border}` : 'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:T.text, flex:1 }}>{ex.name}</div>
                  <div style={{ fontSize:11, color:'var(--green)', marginLeft:8, flexShrink:0, fontWeight:500 }}>{ex.reps}</div>
                </div>
                {ex.cue && <div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{ex.cue}</div>}
              </div>
            ))}
          </div>
        )
      }
    } catch(e) {}
    // Plain text fallback
    return <div style={{ padding:'8px 16px 16px', fontSize:13, color:T.text2, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{item.text}</div>
  }
  // Recipe
  return <div style={{ padding:'0 16px 16px' }}><RecipeCard text={item.text} /></div>
}

function StackScreen({ items, onDelete, onRename }) {
  const [tab, setTab] = useState('routines')
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingLabel, setEditingLabel] = useState('')
  const filtered = items.filter(i=>tab==='routines'?i.type==='routine':i.type==='recipe')

  return (
    <div style={{ padding:'20px 20px' }}>
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['routines','recipes'].map(t=>(
          <button key={t} onClick={()=>{ setTab(t); setExpandedId(null) }}
            style={{ flex:1, padding:'8px', borderRadius:rr('sm'), fontSize:13, border:'none',
              background:tab===t?T.text:T.surface2, color:tab===t?T.bg:T.text2, textTransform:'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
          <div style={{ fontSize:15, fontWeight:500, color:T.text, marginBottom:8 }}>your rotation is empty for now.</div>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.7 }}>
            {tab==='routines' ? 'Save any mobility or sport routine from the Move tab and it will live here.' : 'Save any recipe from the Eat tab and it will live here — easy to find next time.'}
          </div>
        </div>
      ) : filtered.map((item) => {
        const isOpen = expandedId === item.id
        return (
          <div key={item.id} style={{ background:T.surface, borderRadius:rr('md'), marginBottom:10, overflow:'hidden' }}>
            {/* Header row — name + actions */}
            <div style={{ padding:'14px 16px', cursor:'pointer' }} onClick={()=>{ if(editingId!==item.id) setExpandedId(isOpen?null:item.id) }}>
              <div style={{ fontSize:10, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:6 }}>
                {tab==='routines'?'Routine':'Recipe'} · {new Date(item.created_at||Date.now()).toLocaleDateString()}
              </div>
              {editingId === item.id ? (
                <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                  <input
                    autoFocus
                    value={editingLabel}
                    onChange={e=>setEditingLabel(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'){ onRename(item.id,editingLabel); setEditingId(null) } if(e.key==='Escape') setEditingId(null) }}
                    style={{ flex:1, padding:'6px 10px', borderRadius:rr('sm'), border:`1px solid ${T.border2}`, background:T.surface2, color:T.text, fontSize:14, outline:'none' }}
                  />
                  <button onClick={()=>{ onRename(item.id,editingLabel); setEditingId(null) }}
                    style={{ border:'none', background:'var(--cream)', color:'var(--bg)', borderRadius:rr('sm'), padding:'6px 12px', fontSize:12, fontWeight:500, cursor:'pointer', flexShrink:0 }}>Save</button>
                  <button onClick={()=>setEditingId(null)}
                    style={{ border:'none', background:'none', color:T.text3, fontSize:12, cursor:'pointer', flexShrink:0 }}>✕</button>
                </div>
              ) : (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:14, fontWeight:500, color:T.text, flex:1 }}>{item.label}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <button onClick={e=>{ e.stopPropagation(); setEditingId(item.id); setEditingLabel(item.label) }}
                      style={{ border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text3, borderRadius:rr('sm'), padding:'4px 10px', fontSize:11, cursor:'pointer' }}>Rename</button>
                    <button onClick={e=>{ e.stopPropagation(); onDelete(item.id) }}
                      style={{ border:'none', background:'none', color:T.text3, fontSize:15, padding:0, cursor:'pointer' }}>×</button>
                  </div>
                </div>
              )}
            </div>
            {isOpen && (
              <div style={{ borderTop:`0.5px solid ${T.border}` }}>
                <SavedItemDetail item={item} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MoreScreen({ onNav }) {
  const items = [
    { tab:'stack',   label:'Your Rotation',     sub:'Your saved routines and recipes'  },
    { tab:'profile', label:'Profile',      sub:'Your profile'       },
  ]
  return (
    <div style={{ padding:'20px 20px' }}>
      {items.map(item=>(
        <div key={item.tab} onClick={()=>onNav(item.tab)} style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'14px 16px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
          <div><div style={{ fontSize:14, fontWeight:500, color:T.text }}>{item.label}</div><div style={{ fontSize:12, color:T.text3, marginTop:2 }}>{item.sub}</div></div>
          <div style={{ fontSize:18, color:T.text3 }}>›</div>
        </div>
      ))}
      <div style={{ marginTop:20, padding:'14px 16px', background:T.surface2, borderRadius:rr('md') }}>
        <button onClick={async()=>{ await supabase.auth.signOut() }} style={{ fontSize:13, color:'var(--coral)', border:'none', background:'none', cursor:'pointer', padding:0 }}>Sign out</button>
      </div>
    </div>
  )
}

const NAV_ICONS = {
  home: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  move: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v6M9 10l-2 4h10l-2-4"/>
      <path d="M9 21l1-4h4l1 4"/>
    </svg>
  ),
  eat: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 010 8h-1"/>
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/>
      <line x1="10" y1="1" x2="10" y2="4"/>
      <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  lift: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 12h12"/>
    </svg>
  ),
  more: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2:1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
    </svg>
  ),
}

const NAV = [
  { tab:'home',  label:'Home'  },
  { tab:'move',  label:'Move'  },
  { tab:'eat',   label:'Eat'   },
  { tab:'lift',  label:'Lift'  },
  { tab:'more',  label:'Me' },
]

const TOPBAR = {
  move:    { title:'Move',        sub:'Mobility, warmups and recovery'                },
  eat:     { title:'Eat better',  sub:'New ideas, your ingredients'                   },
  lift:    { title:'Lift',        sub:'Your programs and sessions'                    },
  more:    { title:'Me',          sub:''                                              },
  pillars: { title:'The Pillars', sub:'The only things that actually move the needle' },
  stack:   { title:'Your Rotation',    sub:'Your saved routines and recipes'               },
  profile: { title:'Profile',     sub:'Your profile'                    },
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
  const [toast, setToast] = useState({ visible:false, message:'' })

  const showToast = (message) => {
    setToast({ visible:true, message })
    setTimeout(() => setToast({ visible:false, message:'' }), 2200)
  }
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      // Show onboarding if profile is empty (new user)
      if (!p || (!p.name && !p.goal && !p.identity)) {
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
      const msg = item.type === 'recipe' ? '✓ Meal saved to your rotation' : '✓ Routine saved to your rotation'
      showToast(msg)
    }
  }

  const handleDelete = async (id) => {
    await deleteSavedItem(id)
    setSavedItems(prev=>prev.filter(i=>i.id!==id))
  }

  const handleRename = async (id, newLabel) => {
    if (!newLabel.trim()) return
    await supabase.from('saved_items').update({ label: newLabel.trim() }).eq('id', id)
    setSavedItems(prev => prev.map(i => i.id===id ? { ...i, label:newLabel.trim() } : i))
  }

  const handleDeepDive = prompt => { setDeepDive(prompt); setTab('pillars') }

  if (authLoading) {
    return (
      <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <LoadingDots />
      </div>
    )
  }

  if (!session) return <AuthScreen />
  if (showOnboarding) return <OnboardingFlow userId={session.user.id} onComplete={(profile) => { setProfile(profile); setShowOnboarding(false) }} />

  const userId = session.user.id
  const tb = TOPBAR[tab]

  return (
    <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg, display:'flex', flexDirection:'column' }}>
      {tab!=='home' && tb && (
        <div style={{ padding:'48px 20px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg, flexShrink:0 }}>
          {tb&&<><div style={{ fontSize:28, fontWeight:500, color:T.text, letterSpacing:-.5 }}>{tb.title}</div><div style={{ fontSize:13, color:T.text2, marginTop:4 }}>{tb.sub}</div></>}
        </div>
      )}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:80 }}>
        {tab==='home'    && <HomeScreen onNav={setTab} savedItems={savedItems} profile={profile} userId={userId} programs={programs} recentSessions={recentSessions} activeProgramId={activeProgramId} onStartWarmup={(info)=>{ setPendingSession(info); setTab('move') }} />}
        {tab==='move'    && <MoveScreen onSave={handleSave} pendingSession={pendingSession} onClearPending={()=>setPendingSession(null)} onStartSession={(info)=>{ setPendingSession(null); setLiftDeepLink(info); setTab('lift') }} />}
        {tab==='eat'     && <EatScreen onSave={handleSave} userId={userId} />}
        {tab==='lift'    && <LiftScreen userId={userId} userProfile={profile} onGoEat={()=>setTab('eat')} onGoMove={()=>setTab('move')} deepLinkWorkout={liftDeepLink} onClearDeepLink={()=>setLiftDeepLink(null)} />}
        {tab==='more'    && <MoreScreen onNav={setTab} />}
        {tab==='pillars' && !deepDive && <PillarsScreen onDeepDive={handleDeepDive} />}
        {tab==='pillars' && deepDive  && <DeepDiveScreen prompt={deepDive} onBack={()=>setDeepDive(null)} />}
        {tab==='stack'   && <StackScreen items={savedItems} onDelete={handleDelete} onRename={handleRename} />}
        {tab==='profile' && <ProfileScreen userId={userId} onSaved={setProfile} onNav={setTab} />}
      </div>
      <Toast message={toast.message} visible={toast.visible} />
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:T.surface2, borderTop:`0.5px solid ${T.border}`, display:'flex', padding:'8px 0 max(16px, env(safe-area-inset-bottom))', zIndex:100 }}>
        {NAV.map(n=>{ const active=tab===n.tab; return (
          <button key={n.tab} onClick={()=>{ setDeepDive(null); setTab(n.tab) }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 0', border:'none', background:'none', color:active?T.text:T.text3, transition:'color .15s' }}>
            {NAV_ICONS[n.tab]?.(active)}
            <span style={{ fontSize:9, fontWeight:active?600:400, letterSpacing:.3 }}>{n.label}</span>
          </button>
        )})}
      </nav>
    </div>
  )
}
