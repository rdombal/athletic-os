'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import AuthScreen from './AuthScreen'
import LiftScreen from './LiftScreen'
import {
  getProfile, saveProfile,
  getPantry, savePantry,
  getTasteMemory, updateTasteMemory,
  getSavedItems, addSavedItem, deleteSavedItem,
  getDailyCache, setDailyCache,
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
  pillars:{ bg:'var(--blue-bg)',  dot:'var(--blue-dim)'   },
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

const VIBE_SUGGESTIONS = ['high protein','comforting','fresh','post-workout','lighter','cheesy','spicy','something different','macro friendly','quick and easy']
const EFFORT_LEVELS = [
  { key:'low',    label:'Low effort',  desc:'One pan, minimal prep' },
  { key:'normal', label:'Normal',      desc:'Standard weeknight'    },
  { key:'chef',   label:'Chef up',     desc:'Worth the extra time'  },
]
const CUISINES = ['Mexican','Asian','Mediterranean','Italian','American','Middle Eastern','Indian']
const GOALS = ['Build muscle','Lose fat','Maintain','Athletic performance']
const ACTIVITY_LEVELS = ['Light (1-2x/week)','Moderate (3-4x/week)','Very active (5+/week)']
const ADJUST_BUTTONS = [
  { key:'calories_up',   label:'Higher calorie'    },
  { key:'calories_down', label:'Make lighter'      },
  { key:'protein_up',    label:'More protein'      },
  { key:'carbs_up',      label:'More carbs'        },
  { key:'quicker',       label:'Make it quicker'   },
  { key:'simpler',       label:'Fewer ingredients' },
]
const TIP_CATEGORIES  = ['sleep','nutrition','movement','recovery','mindset','performance','hydration']
const FACT_CATEGORIES = ['exercise science','nutrition science','sleep science','the human body','sports performance','longevity','mental health and exercise']

// ─── API ──────────────────────────────────────────────────────────────────────
async function callAI(prompt) {
  const res = await fetch('/api/claude', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
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

// ─── Daily cards ──────────────────────────────────────────────────────────────
const CAT_COLORS = {
  sleep:'var(--purple-bg)', nutrition:'var(--green-bg)', movement:'var(--amber-bg)',
  recovery:'var(--blue-bg)', mindset:'var(--pink-bg)', performance:'var(--coral-bg)',
  hydration:'var(--blue-bg)', 'exercise science':'var(--coral-bg)',
  'nutrition science':'var(--green-bg)', 'sleep science':'var(--purple-bg)',
  'the human body':'var(--amber-bg)', 'sports performance':'var(--coral-bg)',
  'longevity':'var(--blue-bg)', 'mental health and exercise':'var(--pink-bg)'
}
const CAT_TEXT = {
  sleep:'var(--purple)', nutrition:'var(--green)', movement:'var(--amber)',
  recovery:'var(--blue)', mindset:'var(--pink)', performance:'var(--coral)',
  hydration:'var(--blue)', 'exercise science':'var(--coral)',
  'nutrition science':'var(--green)', 'sleep science':'var(--purple)',
  'the human body':'var(--amber)', 'sports performance':'var(--coral)',
  'longevity':'var(--blue)', 'mental health and exercise':'var(--pink)'
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
  return (
    <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), overflow:'hidden', marginBottom:12 }}>
      <div style={{ padding:'9px 14px', background:item?(CAT_COLORS[item.category]||'var(--green-bg)'):T.surface2, borderBottom:`0.5px solid ${T.border}` }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:.6, textTransform:'uppercase', color:T.text2 }}>
          {cardLabel}{item ? <span style={{ color: CAT_TEXT[item.category]||'var(--green)', marginLeft:4 }}>· {item.category}</span> : ''}
        </div>
      </div>
      <div style={{ padding:'12px 14px' }}>
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
function PantryEditor({ pantry, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const handleAdd = async () => {
    if (!input.trim()) return
    const ok = await onAdd(input)
    if (ok) { setInput(''); setError('') } else setError('Already in your pantry')
  }
  return (
    <div style={{ marginBottom:14 }}>
      <PrefLabel>Your pantry — tap x to remove</PrefLabel>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {pantry.map(ing=>(
          <div key={ing} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:20, fontSize:12, background:T.surface2, color:T.text2 }}>
            <span>{ing}</span>
            <button onClick={()=>onRemove(ing)} style={{ border:'none', background:'none', color:T.text3, fontSize:12, padding:0, lineHeight:1, cursor:'pointer' }}>x</button>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <input value={input} onChange={e=>{ setInput(e.target.value); setError('') }}
          onKeyDown={e=>e.key==='Enter'&&handleAdd()} placeholder="Add an ingredient..."
          style={{ flex:1, padding:'8px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none' }} />
        <button onClick={handleAdd} style={{ padding:'8px 14px', borderRadius:rr('sm'), fontSize:13, border:'none', background:T.text, color:T.bg, fontWeight:500 }}>Add</button>
      </div>
      {error && <div style={{ fontSize:11, color:'var(--coral)', marginTop:4 }}>{error}</div>}
    </div>
  )
}

// ─── Recipe card ──────────────────────────────────────────────────────────────
function RecipeCard({ text, onAdjust, adjusting }) {
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
      {Object.keys(macros).length>0&&<div style={{ padding:'12px 16px', borderBottom:varLines.length>0||onAdjust?`0.5px solid ${T.border}`:'none' }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>Macros per serving</div><div style={{ display:'flex', gap:8 }}>{macros.cal&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.cal}</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>cal</div></div>}{macros.protein&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.protein}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>protein</div></div>}{macros.carbs&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.carbs}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>carbs</div></div>}{macros.fat&&<div style={{ flex:1, background:T.surface2, borderRadius:rr('sm'), padding:'8px 6px', textAlign:'center' }}><div style={{ fontSize:15, fontWeight:500, color:T.text }}>{macros.fat}g</div><div style={{ fontSize:10, color:T.text3, marginTop:2 }}>fat</div></div>}</div></div>}
      {varLines.length>0&&<div style={{ padding:'12px 16px', background:T.surface2, borderBottom:onAdjust?`0.5px solid ${T.border}`:'none' }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Quick variations</div>{varLines.map((v,i)=><div key={i} style={{ fontSize:12, color:T.text2, paddingBottom:5, lineHeight:1.5 }}>{v.replace(/^[-*]\s*/,'')}</div>)}</div>}
      {onAdjust&&<div style={{ padding:'12px 16px' }}><div style={{ fontSize:11, fontWeight:500, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:8 }}>Adjust this meal</div>{adjusting?<div style={{ padding:'8px 0' }}><LoadingDots /></div>:<div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{ADJUST_BUTTONS.map(b=><button key={b.key} onClick={()=>onAdjust(b.key,name,text)} style={{ padding:'6px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`, background:T.surface2, color:T.text2, cursor:'pointer' }}>{b.label}</button>)}</div>}</div>}
    </div>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function HomeScreen({ onNav, savedItems, profile, userId }) {
  const hour = new Date().getHours()
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'
  const name = profile?.name?`, ${profile.name}`:''
  const tiles = [
    { tab:'move',    label:'Feel better',  desc:'Sport-specific mobility',    color:SECTION_COLORS.feel    },
    { tab:'eat',     label:'Eat better',   desc:'New ideas, same ingredients', color:SECTION_COLORS.eat    },
    { tab:'lift',    label:'Lift',         desc:'Programs and sessions',       color:SECTION_COLORS.pillars },
    { tab:'pillars', label:'The Pillars',  desc:'What actually matters',       color:SECTION_COLORS.pillars},
  ]
  const day = new Date().getDate()
  return (
    <div style={{ padding:'32px 20px 20px' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:13, color:T.text3, marginBottom:6 }}>{greeting}</div>
        <div style={{ fontSize:28, fontWeight:400, color:T.text, letterSpacing:-.5, lineHeight:1.2 }}>Good day{name}.</div>
        <div style={{ fontSize:14, color:T.text2, marginTop:8 }}>What do you need today?</div>
      </div>
      <DailyCard userId={userId} cacheKey="daily_tip" category={TIP_CATEGORIES[day%TIP_CATEGORIES.length]} cardLabel="Daily tip"
        promptFn={cat=>'You are a knowledgeable health advisor. Give ONE practical tip about '+cat+'. 2-3 sentences. Specific and surprising. No fluff, no exclamation marks. Give a 2-4 word title. Format: TITLE: [title] TIP: [tip]'}
        fallback="Consistency over intensity. Showing up three times a week for a year will outperform any extreme program you can only stick to for a month." />
      <DailyCard userId={userId} cacheKey="daily_fact" category={FACT_CATEGORIES[day%FACT_CATEGORIES.length]} cardLabel="Daily fact"
        promptFn={cat=>'You are a science communicator. Give ONE surprising fact about '+cat+'. 2-3 sentences. Make it feel worth sharing. No obvious facts. No fluff. Give a 2-4 word title. Format: TITLE: [title] FACT: [fact]'}
        fallback="Your muscles grow during rest, not during the workout itself. The training session is just the signal — sleep and nutrition are where the actual adaptation happens." />
      <Eyebrow>Quick access</Eyebrow>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:28 }}>
        {tiles.map(t=>(
          <button key={t.tab} onClick={()=>onNav(t.tab)} style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:14, textAlign:'left' }}>
            <div style={{ width:28, height:28, borderRadius:7, background:t.color.bg, marginBottom:10 }} />
            <div style={{ fontSize:13, fontWeight:500, color:T.text, marginBottom:2 }}>{t.label}</div>
            <div style={{ fontSize:11, color:T.text2, lineHeight:1.4 }}>{t.desc}</div>
          </button>
        ))}
      </div>
      {savedItems.length>0&&<>
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
    if (!activity&&!focus&&!extra) return
    setLoading(true); setResp(''); setSaved(false)
    try { const text = await callAI(`You are a sports performance and mobility coach. Give exactly 5 specific exercises.\nActivity: ${activity||'general'}\nFocus area: ${focus||'general'}\nTiming: ${when}\nExtra context: ${extra||'none'}\n\nFormat each exercise as:\n[Number]. [Exercise name]\n[1-2 sentence instruction with exact execution cues]\n[Sets/reps or duration]\n\nBe specific to the activity. End with one sentence on why this matters for ${activity||'performance'}.`); setResp(text) } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }
  const save = () => { onSave({ label:`${activity||focus||'Mobility'} routine`, text:resp, type:'routine' }); setSaved(true) }
  return (
    <div style={{ padding:'20px 20px' }}>
      <PrefLabel>Activity</PrefLabel>
      <ChipRow options={['Golf','Running','Lifting','Basketball','Tennis','Pickleball']} selected={activity} onSelect={v=>setActivity(activity===v?'':v)} />
      <PrefLabel>Focus area</PrefLabel>
      <ChipRow options={['Hips','Lower back','Shoulders','Hamstrings','Upper back','Ankles and knees']} selected={focus} onSelect={v=>setFocus(focus===v?'':v)} />
      <PrefLabel>When</PrefLabel>
      <ChipRow options={['Before activity','After activity','General relief']} selected={when} onSelect={setWhen} />
      <PrefLabel>Extra detail (optional)</PrefLabel>
      <textarea value={extra} onChange={e=>setExtra(e.target.value)} placeholder="e.g. hips tight from sitting all day..." rows={3} style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 12px', fontSize:14, color:T.text, resize:'none', outline:'none' }} />
      <PrimaryBtn onClick={go} disabled={loading||(!activity&&!focus&&!extra)}>{loading?'Getting exercises...':'Get exercises'}</PrimaryBtn>
      <ResponseBox text={resp} loading={loading} />
      {resp&&!loading&&<SecondaryBtn onClick={save}>{saved?'Saved to My Stack':'+ Save to My Stack'}</SecondaryBtn>}
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
    try { const text = await callAI(`You are a sports performance coach. Give a targeted ${rtype} for ${sport}.\nList exactly 6 movements. For each:\n[Number]. [Movement name]\n[1-2 sentences on execution]\n[Duration or reps]\nFocus on what matters for ${sport}. Total time under 15 minutes. No filler.`); setResp(text) } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }
  const save = () => { onSave({ label:`${sport} — ${rtype}`, text:resp, type:'routine' }); setSaved(true) }
  return (
    <div style={{ padding:'20px 20px' }}>
      <PrefLabel>Select your sport</PrefLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginBottom:14 }}>
        {SPORTS.map(s=><button key={s.name} onClick={()=>setSport(s.name)} style={{ background:T.surface, border:sport===s.name?`1.5px solid ${T.text}`:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'12px 14px', textAlign:'left' }}><div style={{ fontSize:13, fontWeight:500, color:T.text }}>{s.name}</div><div style={{ fontSize:11, color:T.text3, marginTop:2 }}>{s.sub}</div></button>)}
      </div>
      <PrefLabel>Routine type</PrefLabel>
      <ChipRow options={['Pre-session warmup','Post-session recovery','Both']} selected={rtype} onSelect={setRtype} />
      <PrimaryBtn onClick={go} disabled={loading||!sport}>{loading?'Building routine...':'Get routine'}</PrimaryBtn>
      {!sport&&<div style={{ fontSize:12, color:T.text3, textAlign:'center', marginTop:8 }}>Select a sport above</div>}
      <ResponseBox text={resp} loading={loading} />
      {resp&&!loading&&<SecondaryBtn onClick={save}>{saved?'Saved to My Stack':'+ Save to My Stack'}</SecondaryBtn>}
    </div>
  )
}

function MoveScreen({ onSave }) {
  const [mode, setMode] = useState('mobility')
  return (
    <div>
      <div style={{ display:'flex', gap:8, padding:'12px 20px 0', borderBottom:`0.5px solid ${T.border}` }}>
        {[['mobility','Mobility & relief'],['sport','Sport routines']].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)} style={{ padding:'8px 16px', borderRadius:'8px 8px 0 0', fontSize:13, border:'none', background:mode===k?T.surface:'transparent', color:mode===k?T.text:T.text3, fontWeight:mode===k?500:400, borderBottom:mode===k?`2px solid ${T.text}`:'none' }}>{l}</button>
        ))}
      </div>
      {mode==='mobility'&&<FeelScreen onSave={onSave} />}
      {mode==='sport'&&<PlayScreen onSave={onSave} />}
    </div>
  )
}

function EatScreen({ onSave, userId }) {
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
    const avoidNote = attempt>0?'\nGive a COMPLETELY DIFFERENT recipe — different protein, different technique, different flavor profile.':''
    const cuisineNote = cuisine ? `Cuisine direction: ${cuisine}\n` : ''
    const techNote = TECHNIQUES[Math.floor(Math.random()*TECHNIQUES.length)]
    return `You are a skilled home cook helping someone eat well and actually enjoy their food. Sound like a knowledgeable friend giving a real recipe — not a meal prep slop bowl.
${tasteCtx}${profileCtx}
Main ingredients (proteins and bases): ${pantry.join(', ')}
Assumed pantry staples always available: ${ASSUMED_STAPLES}
Meal: ${meal}
Effort: ${effortDesc[effort]}
Vibe: ${vibe||'tasty, satisfying, something I would actually want to eat'}
${cuisineNote}Cooking technique to try: ${techNote}
${avoidNote}

Give ONE recipe that feels like something from a good casual restaurant — not a bland bowl. Use the main ingredients as the base and enhance freely with assumed staples. The result should taste like a real dish with a name, not just "protein + carb."

IMPORTANT: No markdown. No # symbols. Plain text only. Recipe name goes on the FIRST LINE with no prefix.

Format exactly like this:

[Creative recipe name]

Ingredients:
- [amount] [ingredient]

Steps:
1. [One punchy line. They know how to cook.]
2. [One line.]
3. [One line.]
4. [One line.]

Macros per serving:
Calories: [number]
Protein: [number]g
Carbs: [number]g
Fat: [number]g

Variations:
- [One-line twist that changes the whole vibe]
- [Another quick variation]
- [One more]`
  }

  const go = async (isRetry) => {
    setLoading(true); setResp(''); setSaved(false)
    const attempt = isRetry?attempts+1:0
    setAttempts(attempt)
    if (vibe&&userId) updateTasteMemory(userId,{vibes:[vibe]})
    if (userId) updateTasteMemory(userId,{efforts:[effort],meals:[meal]})
    try { const prompt = await buildPrompt(attempt); const text = await callAI(prompt); setResp(text) } catch(e) { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }

  const adjust = async (type,name,currentRecipe) => {
    setAdjusting(true)
    try { const text = await callAI(ADJUST_PROMPTS[type](name,currentRecipe)); setResp(text); setSaved(false) } catch(e) { setResp('Something went wrong.') }
    setAdjusting(false)
  }

  const save = () => {
    if (userId) updateTasteMemory(userId,{savedIngredients:pantry})
    onSave({ label:`${meal} — ${cuisine||vibe||'recipe'}`, text:resp, type:'recipe' })
    setSaved(true)
  }

  return (
    <div style={{ padding:'20px 20px' }}>
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
      <PrimaryBtn onClick={()=>go(false)} disabled={loading||pantry.length===0}>{loading?'Finding something good...':'Get recipe ideas'}</PrimaryBtn>
      {loading&&<div style={{ marginTop:12 }}><LoadingDots /></div>}
      {resp&&!loading&&<RecipeCard text={resp} onAdjust={adjust} adjusting={adjusting} />}
      {resp&&!loading&&<div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button onClick={()=>go(true)} style={{ flex:1, padding:'9px 16px', borderRadius:rr('md'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13 }}>Try another</button>
        <button onClick={save} style={{ flex:1, padding:'9px 16px', borderRadius:rr('md'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13 }}>{saved?'Saved':'+ Save'}</button>
      </div>}
    </div>
  )
}

function PillarsScreen({ onDeepDive }) {
  return (
    <div style={{ padding:'20px 20px' }}>
      {PILLARS.map(p=>{ const c=PILLAR_COLORS[p.color]; return (
        <Card key={p.num}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:c.bg, flexShrink:0 }} />
            <div><div style={{ fontSize:10, fontWeight:500, color:c.accent, letterSpacing:.5, textTransform:'uppercase' }}>Pillar {p.num}</div><div style={{ fontSize:16, fontWeight:500, color:T.text, marginTop:1 }}>{p.title}</div></div>
          </div>
          <div style={{ fontSize:13, color:T.text2, lineHeight:1.7, marginBottom:12 }}>{p.body}</div>
          <Divider />
          <div style={{ display:'flex', gap:14, marginBottom:12 }}>
            <div style={{ flex:1 }}><div style={{ fontSize:10, fontWeight:500, color:'var(--green)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Worth your time</div><div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{p.good}</div></div>
            <div style={{ flex:1 }}><div style={{ fontSize:10, fontWeight:500, color:'var(--coral)', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>Ignore this</div><div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{p.skip}</div></div>
          </div>
          <button onClick={()=>onDeepDive(p.prompt)} style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:13, textAlign:'left' }}>Go deeper</button>
        </Card>
      )})}
    </div>
  )
}

function DeepDiveScreen({ prompt, onBack }) {
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { callAI(prompt+'\n\nBe conversational, practical, and concise. No fluff.').then(setResp).catch(e=>setResp('Error: '+e.message)).finally(()=>setLoading(false)) }, [prompt])
  return (
    <div style={{ padding:'20px 20px' }}>
      <button onClick={onBack} style={{ border:'none', background:'none', color:T.text2, fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:4, padding:0 }}>Back to Pillars</button>
      <ResponseBox text={resp} loading={loading} />
    </div>
  )
}

function ProfileScreen({ userId, onSaved }) {
  const [profile, setProfile] = useState({ name:'', goal:'Athletic performance', activity:'Very active (5+/week)', calories:'', protein:'', notes:'' })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { if (userId) getProfile(userId).then(p=>{ setProfile(p); setLoading(false) }) }, [userId])
  const update = (key,val) => setProfile(p=>({ ...p, [key]:val }))
  const handleSave = async () => {
    await saveProfile(userId, profile)
    setSaved(true); setTimeout(()=>setSaved(false),2000)
    if (onSaved) onSaved(profile)
  }
  if (loading) return <div style={{ padding:20 }}><LoadingDots /></div>
  return (
    <div style={{ padding:'20px 20px' }}>
      <PrefLabel>Your name</PrefLabel>
      <input value={profile.name} onChange={e=>update('name',e.target.value)} placeholder="First name" style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none', marginBottom:10 }} />
      <PrefLabel>Primary goal</PrefLabel>
      <ChipRow options={GOALS} selected={profile.goal} onSelect={v=>update('goal',v)} />
      <PrefLabel>Activity level</PrefLabel>
      <ChipRow options={ACTIVITY_LEVELS} selected={profile.activity} onSelect={v=>update('activity',v)} />
      <PrefLabel>Daily calorie target (optional)</PrefLabel>
      <input type="number" value={profile.calories} onChange={e=>update('calories',e.target.value)} placeholder="e.g. 2800" style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none', marginBottom:10 }} />
      <PrefLabel>Daily protein target in grams (optional)</PrefLabel>
      <input type="number" value={profile.protein} onChange={e=>update('protein',e.target.value)} placeholder="e.g. 160" style={{ width:'100%', padding:'9px 12px', borderRadius:rr('sm'), fontSize:13, border:`0.5px solid ${T.border}`, background:T.surface, color:T.text, outline:'none', marginBottom:10 }} />
      <PrefLabel>Anything else the app should know?</PrefLabel>
      <textarea value={profile.notes} onChange={e=>update('notes',e.target.value)} placeholder="e.g. I run and lift a lot, need to eat big." rows={3} style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 12px', fontSize:14, color:T.text, resize:'none', outline:'none' }} />
      <PrimaryBtn onClick={handleSave}>{saved?'Saved':'Save profile'}</PrimaryBtn>
      <div style={{ marginTop:20, padding:'14px 16px', background:T.surface2, borderRadius:rr('md') }}>
        <div style={{ fontSize:12, color:T.text3, lineHeight:1.7 }}>Your profile is stored securely in your account and used to personalize your experience.</div>
      </div>
    </div>
  )
}

function StackScreen({ items, onDelete }) {
  const [tab, setTab] = useState('routines')
  const filtered = items.filter(i=>tab==='routines'?i.type==='routine':i.type==='recipe')
  return (
    <div style={{ padding:'20px 20px' }}>
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        {['routines','recipes'].map(t=><button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px', borderRadius:rr('sm'), fontSize:13, border:'none', background:tab===t?T.text:T.surface2, color:tab===t?T.bg:T.text2, textTransform:'capitalize' }}>{t}</button>)}
      </div>
      {filtered.length===0?<div style={{ textAlign:'center', padding:'3rem 0', color:T.text3, fontSize:14, lineHeight:1.8 }}>Nothing saved yet.<br/><span style={{ fontSize:12 }}>Generate something and tap Save.</span></div>:filtered.map((item,i)=>(
        <Card key={i}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:3 }}>{new Date(item.created_at||Date.now()).toLocaleDateString()}</div>
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

function MoreScreen({ onNav }) {
  const items = [
    { tab:'pillars', label:'The Pillars',  sub:'What actually moves the needle'  },
    { tab:'stack',   label:'My Stack',     sub:'Your saved routines and recipes'  },
    { tab:'profile', label:'Profile',      sub:'Your goals and preferences'       },
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

const NAV = [
  { tab:'home',  label:'Home'  },
  { tab:'move',  label:'Move'  },
  { tab:'eat',   label:'Eat'   },
  { tab:'lift',  label:'Lift'  },
  { tab:'more',  label:'More'  },
]

const TOPBAR = {
  move:    { title:'Move',        sub:'Mobility, warmups and recovery'                },
  eat:     { title:'Eat better',  sub:'New ideas, your ingredients'                   },
  lift:    { title:'Lift',        sub:'Your programs and sessions'                    },
  more:    { title:'More',        sub:''                                              },
  pillars: { title:'The Pillars', sub:'The only things that actually move the needle' },
  stack:   { title:'My Stack',    sub:'Your saved routines and recipes'               },
  profile: { title:'Profile',     sub:'Your goals and preferences'                    },
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [deepDive, setDeepDive] = useState(null)
  const [savedItems, setSavedItems] = useState([])
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

  useEffect(() => {
    if (!session?.user) return
    const userId = session.user.id
    getProfile(userId).then(setProfile)
    getSavedItems(userId).then(setSavedItems)
  }, [session])

  const handleSave = async (item) => {
    if (!session?.user) return
    const saved = await addSavedItem(session.user.id, item)
    if (saved) setSavedItems(prev=>[saved, ...prev])
  }

  const handleDelete = async (id) => {
    await deleteSavedItem(id)
    setSavedItems(prev=>prev.filter(i=>i.id!==id))
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

  const userId = session.user.id
  const tb = TOPBAR[tab]

  return (
    <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg, display:'flex', flexDirection:'column' }}>
      {tab!=='home'&&(
        <div style={{ padding:'48px 20px 16px', borderBottom:`0.5px solid ${T.border}`, background:T.bg, flexShrink:0 }}>
          {tb&&<><div style={{ fontSize:22, fontWeight:400, color:T.text, letterSpacing:-.3 }}>{tb.title}</div><div style={{ fontSize:13, color:T.text2, marginTop:4 }}>{tb.sub}</div></>}
        </div>
      )}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:80 }}>
        {tab==='home'    && <HomeScreen onNav={setTab} savedItems={savedItems} profile={profile} userId={userId} />}
        {tab==='move'    && <MoveScreen onSave={handleSave} />}
        {tab==='eat'     && <EatScreen onSave={handleSave} userId={userId} />}
        {tab==='lift'    && <LiftScreen userId={userId} />}
        {tab==='more'    && <MoreScreen onNav={setTab} />}
        {tab==='pillars' && !deepDive && <PillarsScreen onDeepDive={handleDeepDive} />}
        {tab==='pillars' && deepDive  && <DeepDiveScreen prompt={deepDive} onBack={()=>setDeepDive(null)} />}
        {tab==='stack'   && <StackScreen items={savedItems} onDelete={handleDelete} />}
        {tab==='profile' && <ProfileScreen userId={userId} onSaved={setProfile} />}
      </div>
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:430, background:T.bg, borderTop:`0.5px solid ${T.border}`, display:'flex', padding:'10px 0 max(14px, env(safe-area-inset-bottom))', zIndex:100 }}>
        {NAV.map(n=>{ const active=tab===n.tab; return (
          <button key={n.tab} onClick={()=>{ setDeepDive(null); setTab(n.tab) }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'4px 0', border:'none', background:'none' }}>
            <div style={{ width:4, height:4, borderRadius:'50%', background:active?T.text:'transparent', transition:'background .2s' }} />
            <span style={{ fontSize:10, color:active?T.text:T.text3, fontWeight:active?500:400, letterSpacing:.2 }}>{n.label}</span>
          </button>
        )})}
      </nav>
    </div>
  )
}
