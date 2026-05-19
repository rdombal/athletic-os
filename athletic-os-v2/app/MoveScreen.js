'use client'
import { useState } from 'react'

const T = {
  bg:'var(--bg)', surface:'var(--surface)', surface2:'var(--surface2)',
  border:'var(--border)', text:'var(--text)', text2:'var(--text2)', text3:'var(--text3)',
}
function rr(s) { return s==='sm'?'8px':s==='lg'?'16px':'12px' }

async function callAI(prompt) {
  const res = await fetch('/api/claude', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt })
  })
  const data = await res.json()
  return data.text || ''
}

// ─── Pre-built sport library ──────────────────────────────────────────────────
// Informed by TPI (golf), Kelly Starrett/The Ready State (mobility),
// Squat University (lifting), Ben Patrick/ATG (running/durability),
// Mike Boyle (athletic performance)

const SPORT_LIBRARY = {
  Golf: {
    warmup: {
      title: 'Golf Pre-Round Warmup',
      duration: '8 min',
      source: 'TPI-informed',
      exercises: [
        { name: 'Hip 90/90 with rotation', cue: 'Sit with both knees at 90°, rotate torso over front knee, hold briefly. Opens hip capsule for rotation.', reps: '8 each side' },
        { name: 'Thoracic spine rotation', cue: 'Hands behind head, thread elbow under opposite arm, then rotate open to ceiling. Unlocks the primary engine of the golf swing.', reps: '10 each side' },
        { name: 'Glute bridge', cue: 'Feet hip-width, drive hips to ceiling, squeeze glutes at top. Activates the posterior chain before you ask it to generate power.', reps: '15 reps' },
        { name: 'World greatest stretch', cue: 'Lunge forward, same-side elbow to floor, then rotate arm to ceiling. Hits hip flexor, thoracic, and groin in one movement.', reps: '6 each side' },
        { name: 'Ankle circles + calf raise', cue: 'Slow circles both directions, then 10 calf raises. Ground contact and balance start here.', reps: '10 circles + 10 raises each' },
        { name: 'Half-swing rehearsal', cue: 'Slow motion swings focusing on hip turn and shoulder turn separately. Let the body find its range before you hit.', reps: '10 swings each direction' },
      ]
    },
    recovery: {
      title: 'Post-Round Recovery',
      duration: '10 min',
      source: 'TPI + Starrett-informed',
      exercises: [
        { name: 'Supine twist', cue: 'Lie on back, pull knee across body, hold. Decompresses the lumbar spine after repeated rotation.', reps: '60 sec each side' },
        { name: 'Pigeon pose', cue: 'Front shin parallel to mat, fold forward. Addresses hip flexor and glute compression from walking and rotation.', reps: '90 sec each side' },
        { name: 'Doorframe chest stretch', cue: 'Arm at 90° on doorframe, lean through. Counteracts the forward shoulder pattern from the swing.', reps: '45 sec each side' },
        { name: 'Lower back cat-cow', cue: 'Slow, full range. Restores movement to the lumbar spine after repeated loading.', reps: '10 slow reps' },
        { name: 'Neck side stretch', cue: 'Ear to shoulder, breathe into the stretch. Releases cervical tension from address position.', reps: '45 sec each side' },
      ]
    }
  },
  Running: {
    warmup: {
      title: 'Running Pre-Run Warmup',
      duration: '7 min',
      source: 'ATG + Boyle-informed',
      exercises: [
        { name: 'Leg swing (sagittal)', cue: 'Hold wall, swing leg forward and back, progressively increasing range. Activates hip flexor and glute dynamically.', reps: '15 each leg' },
        { name: 'Lateral leg swing', cue: 'Same position, swing across body and out. Opens the hip abductors and adductors before lateral forces hit them.', reps: '15 each leg' },
        { name: 'Hip circle', cue: 'Standing hip circles, large slow movements. Lubricates the joint before impact loading.', reps: '10 each direction each leg' },
        { name: 'A-skip', cue: 'Exaggerated skip with high knee drive, land on ball of foot. Primes the hip flexor and calf for running mechanics.', reps: '20m x 2' },
        { name: 'Ankle pop', cue: 'Small, rapid hops on one foot, minimal knee bend. ATG-inspired tendon preparation before impact.', reps: '20 each foot' },
        { name: 'Glute activation lunge', cue: 'Step forward, pause, drive back through the heel. Ensures glutes are firing before they need to propel you.', reps: '8 each leg' },
      ]
    },
    recovery: {
      title: 'Post-Run Recovery',
      duration: '10 min',
      source: 'Starrett + ATG-informed',
      exercises: [
        { name: 'Standing calf stretch', cue: 'Heel off step, lower slowly, hold at bottom. Restores calf and Achilles length after repeated contraction.', reps: '60 sec each' },
        { name: 'Hip flexor couch stretch', cue: 'Rear foot on wall behind you, lunge forward, squeeze glute. Targets the hip flexor compression from running gait.', reps: '90 sec each side' },
        { name: 'Hamstring doorframe stretch', cue: 'Lie in doorframe, one leg straight up the wall. Passive decompression of the hamstring chain.', reps: '90 sec each side' },
        { name: 'IT band stretch', cue: 'Cross one leg behind the other, lean away, reach arm over. Addresses lateral hip tightness common in runners.', reps: '45 sec each side' },
        { name: 'Seated glute stretch', cue: 'Figure-four position, lean forward. Releases compression in the piriformis and glute med.', reps: '60 sec each side' },
      ]
    }
  },
  Lifting: {
    upper_warmup: {
      title: 'Upper Body Warmup',
      duration: '7 min',
      source: 'Squat University + Starrett-informed',
      exercises: [
        { name: 'Shoulder CARs', cue: 'Slow, full-range shoulder circles in both directions. Controlled articular rotation primes the joint before loading.', reps: '5 each direction each arm' },
        { name: 'Band pull-apart', cue: 'Arms straight, pull band to chest. Activates rear delts and external rotators before any pressing or pulling.', reps: '15 reps' },
        { name: 'Thoracic extension over roller', cue: 'Support head, extend over roller at mid-back, work up the spine. Restores t-spine extension for bar position and overhead.', reps: '60 sec, 3 segments' },
        { name: 'Scapular wall slides', cue: 'Back against wall, arms at 90 degrees, slide up while keeping contact. Primes scapular movement patterns.', reps: '10 reps' },
        { name: 'Face pull with pause', cue: 'Pull to face level, elbows high, pause and squeeze at end range. Activates the rotator cuff and rear delts.', reps: '15 reps' },
        { name: 'Arm circles to chest opener', cue: 'Large backward circles then clasp hands behind back, open chest. Final prep before loading the upper body.', reps: '10 circles then 5 holds' },
      ]
    },
    lower_warmup: {
      title: 'Lower Body Warmup',
      duration: '8 min',
      source: 'Squat University + ATG-informed',
      exercises: [
        { name: 'Ankle mobility drill', cue: 'Knee over toe, heel flat, drive forward 10 times each side. Ankle restriction kills every lower body pattern — address it first.', reps: '10 each side' },
        { name: 'Hip 90/90 active rotation', cue: 'Rotate between internal and external hip rotation actively, not passively. Opens the capsule where squatting and hinging happen.', reps: '10 each side' },
        { name: 'Glute bridge with pause', cue: 'Drive hips up, pause and squeeze at top for 2 seconds. Ensures glutes are firing before they need to produce force.', reps: '12 reps' },
        { name: 'Cossack squat', cue: 'Wide stance, shift weight to one side, keep other leg straight. Opens the groin and hip capsule through full range.', reps: '8 each side' },
        { name: 'Goblet squat hold', cue: 'Hold bottom of squat, use elbows to open knees, breathe. Teaches position and warms hip, knee, and ankle simultaneously.', reps: '3 x 30 sec hold' },
        { name: 'Single leg hip hinge', cue: 'Hinge on one leg, feel hamstring load, return. Activates posterior chain and primes balance before loaded work.', reps: '8 each side' },
      ]
    },
    upper_recovery: {
      title: 'Upper Body Recovery',
      duration: '7 min',
      source: 'Starrett-informed',
      exercises: [
        { name: 'Lat stretch on rack', cue: 'Hold rig or doorframe at shoulder height, sit back into hips. Decompresses the lat after pulling work.', reps: '60 sec each side' },
        { name: 'Pec doorframe stretch', cue: 'Arm at 90 degrees on wall, rotate body away. Counteracts internal rotation from pressing.', reps: '45 sec each side' },
        { name: 'Cross-body shoulder stretch', cue: 'Pull arm across chest at shoulder height, hold. Releases posterior shoulder after pressing and overhead.', reps: '45 sec each side' },
        { name: 'Neck side stretch', cue: 'Ear to shoulder, hand gently adds weight. Releases cervical tension from heavy bar positions.', reps: '45 sec each side' },
        { name: 'Child pose with reach', cue: 'Sit back on heels, reach arms forward, breathe into stretch. Full spinal decompression after loading.', reps: '90 sec' },
      ]
    },
    lower_recovery: {
      title: 'Lower Body Recovery',
      duration: '8 min',
      source: 'Starrett + Squat University-informed',
      exercises: [
        { name: 'Couch stretch', cue: 'Rear foot elevated on wall, lunge forward, squeeze glute. Addresses hip flexor compression from squatting and deadlifting.', reps: '90 sec each side' },
        { name: 'Pigeon pose', cue: 'Front shin parallel, fold forward from hips. Releases glute and piriformis compression from heavy lower body work.', reps: '90 sec each side' },
        { name: 'Seated hamstring stretch', cue: 'Legs straight, hinge from hips with flat back. Restores hamstring length after deadlift and squat patterns.', reps: '90 sec' },
        { name: 'Calf stretch on step', cue: 'Heel off step, lower slowly, hold. Addresses calf and Achilles loading from squatting and lunging.', reps: '60 sec each' },
        { name: 'Deep squat hold', cue: 'Feet shoulder-width, hold bottom passively, breathe. Restores joint space after loaded squatting.', reps: '60 sec' },
      ]
    },
    warmup: {
      title: 'General Lifting Warmup',
      duration: '8 min',
      source: 'Squat University + Starrett-informed',
      exercises: [
        { name: 'Ankle mobility drill', cue: 'Knee over toe, heel flat, drive forward 10 times. Squat University staple — ankle restriction kills every lower body pattern.', reps: '10 each side' },
        { name: 'Hip 90/90 active rotation', cue: 'Rotate between internal and external hip rotation actively, not passively. Opens the capsule where squatting happens.', reps: '10 each side' },
        { name: 'Thoracic extension over foam roller', cue: 'Support your head, extend over the roller at mid-back. Restores t-spine extension needed for overhead and bar position.', reps: '60 sec, 3 segments' },
        { name: 'Shoulder CARs', cue: 'Slow, full-range shoulder circles in both directions. Controlled articular rotation primes the joint without taxing it.', reps: '5 each direction each arm' },
        { name: 'Goblet squat hold', cue: 'Hold bottom of squat with weight, use elbows to open knees. Teaches position and warms everything simultaneously.', reps: '3 x 30 sec hold' },
        { name: 'Band pull-apart', cue: 'Arms straight, pull band to chest level. Activates rear delts and external rotators before pressing or pulling.', reps: '15 reps' },
      ]
    },
    recovery: {
      title: 'Post-Lift Recovery',
      duration: '8 min',
      source: 'Starrett + Squat University-informed',
      exercises: [
        { name: 'Couch stretch', cue: 'Rear foot elevated, lunge forward, squeeze glute. Addresses the hip flexor compression from squatting and deadlifting.', reps: '90 sec each side' },
        { name: 'Lat stretch on rack', cue: 'Hold rig or doorframe at shoulder height, sit back into stretch. Decompresses the lat after pulling.', reps: '60 sec each side' },
        { name: 'Child pose with reach', cue: 'Sit back on heels, reach arms forward, breathe into stretch. Full spinal decompression after loading.', reps: '90 sec' },
        { name: 'Pec doorframe stretch', cue: 'Arm at 90° on wall, rotate away. Counteracts internal rotation from pressing.', reps: '45 sec each side' },
        { name: 'Deep squat hold', cue: 'Feet shoulder-width, hold bottom position passively. Restores joint space after loaded squatting.', reps: '60 sec' },
      ]
    }
  },
  Basketball: {
    warmup: {
      title: 'Basketball Pre-Game Warmup',
      duration: '8 min',
      source: 'Boyle + FMS-informed',
      exercises: [
        { name: 'Inchworm', cue: 'Walk hands out to plank, walk feet to hands. Global warm-up for the entire posterior chain before explosive demands.', reps: '8 reps' },
        { name: 'Lateral shuffle', cue: 'Low athletic stance, shuffle 5m each direction, stay low. Primes lateral movement patterns before the game demands them.', reps: '4 x 5m each direction' },
        { name: 'Hip flexor lunge with rotation', cue: 'Lunge forward, rotate torso over front leg. Opens the hip and thoracic spine for cutting and jumping.', reps: '8 each side' },
        { name: 'Ankle bounces', cue: 'Quick, low bounces on balls of feet. Primes the tendon-reflex system for jump landing.', reps: '30 sec' },
        { name: 'Arm circles + chest opener', cue: 'Large circles backward, then clasp hands behind back, open chest. Prepares the shoulder for passing and overhead.', reps: '10 each direction' },
        { name: 'Broad jump to deceleration', cue: 'Jump forward, land soft and hold 2 sec. Trains landing mechanics before the game demands it at speed.', reps: '6 reps' },
      ]
    },
    recovery: {
      title: 'Post-Game Recovery',
      duration: '8 min',
      source: 'Starrett-informed',
      exercises: [
        { name: 'Quad stretch', cue: 'Stand on one leg, pull heel to glute, hold. Addresses quad compression from jumping and cutting.', reps: '60 sec each' },
        { name: 'Hip flexor stretch', cue: 'Half-kneeling, drive hip forward, squeeze glute. Releases compression from sprinting and lateral movement.', reps: '60 sec each side' },
        { name: 'Figure-four stretch', cue: 'Lie on back, cross ankle over knee, pull. Releases the glute and piriformis from lateral demands.', reps: '60 sec each side' },
        { name: 'Calf stretch on step', cue: 'Heel off step, lower slowly. Addresses Achilles loading from jump-landing.', reps: '45 sec each' },
        { name: 'Thoracic rotation stretch', cue: 'Seated, hands behind head, rotate slowly each direction. Restores rotation after defensive positioning.', reps: '10 each side' },
      ]
    }
  },
  Tennis: {
    warmup: {
      title: 'Tennis Pre-Match Warmup',
      duration: '7 min',
      source: 'Boyle + TPI rotation principles',
      exercises: [
        { name: 'Shoulder pendulum', cue: 'Lean forward, arm hangs, small circles. Gentle mobilization of the shoulder before serving loads.', reps: '30 sec each direction' },
        { name: 'Wrist circles + finger extension', cue: 'Full wrist circles, then spread fingers wide and close. Prepares the wrist and forearm for grip demands.', reps: '10 circles each direction' },
        { name: 'Lateral lunge', cue: 'Step wide, sit into hip, drive back up. Opens the groin and primes lateral movement.', reps: '10 each side' },
        { name: 'Trunk rotation with arm reach', cue: 'Athletic stance, rotate fully each direction, reaching arm across. Warms up the rotational pattern used in groundstrokes.', reps: '10 each side' },
        { name: 'Split step practice', cue: 'Quick hop to split stance, ready position. Trains the reactive footwork pattern before match speed.', reps: '15 reps' },
        { name: 'Shoulder external rotation', cue: 'Elbow at 90°, rotate forearm back. Activates the rotator cuff before serving demands.', reps: '15 each arm' },
      ]
    },
    recovery: {
      title: 'Post-Match Recovery',
      duration: '8 min',
      source: 'Starrett-informed',
      exercises: [
        { name: 'Cross-body shoulder stretch', cue: 'Pull arm across chest, hold. Releases the posterior shoulder after serving and overhead.', reps: '60 sec each' },
        { name: 'Forearm stretch both ways', cue: 'Arm straight, fingers up, pull back. Then fingers down, pull back. Addresses grip fatigue.', reps: '45 sec each position each arm' },
        { name: 'Groin stretch', cue: 'Seated wide-leg, lean forward from hips. Releases the adductors after lateral movement demands.', reps: '90 sec' },
        { name: 'Standing quad stretch', cue: 'Pull heel to glute, keep knees together. Addresses quad compression from court movement.', reps: '60 sec each' },
        { name: 'Neck side stretch', cue: 'Ear to shoulder, hand gently adds pressure. Releases cervical tension from tracking the ball.', reps: '45 sec each side' },
      ]
    }
  },
  Pickleball: {
    warmup: {
      title: 'Pickleball Pre-Game Warmup',
      duration: '6 min',
      source: 'Boyle-informed',
      exercises: [
        { name: 'Wrist mobility circles', cue: 'Full circles in both directions, then figure-eights. Prepares the primary contact joint.', reps: '10 each direction' },
        { name: 'Lateral shuffle', cue: 'Athletic stance, shuffle side to side, stay low. Primes the lateral movement pattern before game speed.', reps: '4 x 5m each direction' },
        { name: 'Hip circle', cue: 'Hands on hips, large circles. Opens the hip before court movement.', reps: '10 each direction' },
        { name: 'Arm swing across body', cue: 'Swing each arm across the body progressively. Warms the shoulder and chest for dinking and driving.', reps: '15 each arm' },
        { name: 'Quick feet on the spot', cue: 'Fast feet, light on toes, 10 sec bursts. Primes the reactive footwork needed at the kitchen.', reps: '3 x 10 sec' },
        { name: 'Thoracic rotation', cue: 'Hands behind head, rotate each direction. Warms the rotation needed for volleys and overheads.', reps: '10 each side' },
      ]
    },
    recovery: {
      title: 'Post-Game Recovery',
      duration: '7 min',
      source: 'Starrett-informed',
      exercises: [
        { name: 'Forearm stretch', cue: 'Arm straight, fingers back, hold. Addresses grip and forearm fatigue from paddle work.', reps: '45 sec each' },
        { name: 'Hip flexor stretch', cue: 'Half-kneeling, drive hip forward. Releases compression from crouched playing position.', reps: '60 sec each side' },
        { name: 'Calf stretch', cue: 'Heel to floor, lean into wall. Addresses lower leg loading from court movement.', reps: '45 sec each' },
        { name: 'Seated twist', cue: 'Cross one leg over, rotate into it, hand on knee. Restores spinal rotation after game demands.', reps: '45 sec each side' },
        { name: 'Shoulder cross-body stretch', cue: 'Pull arm across chest, hold at point of tension. Releases shoulder after overhead play.', reps: '45 sec each' },
      ]
    }
  }
}

// ─── Quick relief flows ───────────────────────────────────────────────────────
const QUICK_RELIEF = {
  'Tight hips': [
    { name: '90/90 hip stretch', cue: 'Both knees at 90°, sit tall, breathe into the front hip.', reps: '90 sec each side' },
    { name: 'Pigeon pose', cue: 'Front shin parallel, fold forward from hips not waist.', reps: '90 sec each side' },
    { name: 'Standing hip circle', cue: 'Slow, deliberate circles, finding end range.', reps: '10 each direction' },
    { name: 'Couch stretch', cue: 'Rear foot on wall, lunge forward, squeeze glute. The hip flexor antidote.', reps: '60 sec each side' },
  ],
  'Lower back': [
    { name: 'Cat-cow', cue: 'Slow, full range. Breathe out on arch, breathe in on round.', reps: '10 slow reps' },
    { name: 'Supine twist', cue: 'Pull knee across body, opposite arm extended, breathe.', reps: '60 sec each side' },
    { name: 'Child\'s pose', cue: 'Sit back on heels, arms forward, breathe into lower back.', reps: '90 sec' },
    { name: 'Glute bridge', cue: 'Feet hip-width, drive up, hold at top. Activates the glutes that should be doing the work.', reps: '15 reps' },
  ],
  'Shoulders': [
    { name: 'Pendulum swing', cue: 'Lean forward, arm hangs, small circles. Decompresses the joint.', reps: '30 sec each direction' },
    { name: 'Doorframe pec stretch', cue: 'Arm at 90° on wall, rotate body away.', reps: '45 sec each side' },
    { name: 'Cross-body stretch', cue: 'Pull arm across chest at shoulder height, hold.', reps: '45 sec each side' },
    { name: 'Shoulder CARs', cue: 'Slow full-range shoulder circles, maintain packed position.', reps: '5 each direction each arm' },
  ],
  'Hamstrings': [
    { name: 'Standing hamstring stretch', cue: 'Foot on surface, hinge from hips not waist, flat back.', reps: '60 sec each' },
    { name: 'Supine hamstring stretch', cue: 'Lie back, pull leg straight up with strap or hands.', reps: '90 sec each' },
    { name: 'Romanian deadlift stretch', cue: 'Bodyweight, hinge slow, feel the pull, return.', reps: '10 slow reps' },
    { name: 'Seated forward fold', cue: 'Legs straight, hinge from hips, breathe into the stretch.', reps: '90 sec' },
  ],
  'Upper back': [
    { name: 'Thoracic extension over roller', cue: 'Support head, extend back over roller, work up the spine in segments.', reps: '60 sec each segment' },
    { name: 'Thread the needle', cue: 'On all fours, thread one arm under body and rotate.', reps: '10 each side' },
    { name: 'Lat stretch', cue: 'Hold doorframe at shoulder height, sit back into hips.', reps: '45 sec each side' },
    { name: 'Chest opener', cue: 'Clasp hands behind back, squeeze shoulder blades, lift chest.', reps: '5 x 5 sec hold' },
  ],
  'Neck': [
    { name: 'Side neck stretch', cue: 'Ear to shoulder, breathe, hand gently adds weight.', reps: '45 sec each side' },
    { name: 'Chin tuck', cue: 'Pull chin straight back, hold 5 sec. The antidote to forward head position.', reps: '10 reps' },
    { name: 'Neck rotation', cue: 'Slow rotation each direction, stop at point of tension.', reps: '10 each side' },
    { name: 'Upper trap stretch', cue: 'Hand behind back, tilt head away and slightly forward.', reps: '45 sec each side' },
  ],
}

// ─── Routine card renderer ────────────────────────────────────────────────────
function RoutineCard({ exercises, title, duration, source, onSave, saved }) {
  return (
    <div style={{ marginTop:14, background:T.surface, borderRadius:rr('md'), overflow:'hidden' }}>
      <div style={{ height:3, background:'var(--green-dim)' }} />
      {title && (
        <div style={{ padding:'14px 16px 12px', borderBottom:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:17, fontWeight:500, color:T.text }}>{title}</div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            {duration && <span style={{ fontSize:11, color:T.text3 }}>{duration}</span>}
            {source && <span style={{ fontSize:11, color:T.text3 }}>· {source}</span>}
          </div>
        </div>
      )}
      {exercises.map((ex, i) => (
        <div key={i} style={{ padding:'12px 16px', borderBottom:`0.5px solid ${T.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:500, color:T.text, flex:1 }}>{ex.name}</div>
            <div style={{ fontSize:11, color:'var(--green)', marginLeft:8, flexShrink:0, fontWeight:500 }}>{ex.reps}</div>
          </div>
          <div style={{ fontSize:12, color:T.text2, lineHeight:1.55 }}>{ex.cue}</div>
        </div>
      ))}
      {onSave && (
        <div style={{ padding:'10px 16px' }}>
          <button onClick={onSave} style={{ width:'100%', padding:'8px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:saved?'var(--green)':T.text2, fontSize:13, cursor:'pointer' }}>
            {saved ? '✓ Saved to My Stack' : '+ Save to My Stack'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── AI routine card (parses AI text into structured cards) ───────────────────
function AIRoutineCard({ text, onSave, saved }) {
  if (!text) return null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const exercises = []
  let current = null
  for (const line of lines) {
    const isNumbered = /^\d+\./.test(line)
    const isBullet = /^[-•]/.test(line)
    if (isNumbered || isBullet) {
      if (current) exercises.push(current)
      current = { name: line.replace(/^\d+\.\s*|^[-•]\s*/, ''), cue: '', reps: '' }
    } else if (current) {
      const repsMatch = line.match(/(\d+\s*(reps?|sets?|sec|min|seconds?|minutes?|x\s*\d+))/i)
      if (repsMatch && !current.reps) current.reps = line
      else if (!current.cue) current.cue = line
    }
  }
  if (current) exercises.push(current)
  if (exercises.length === 0) {
    return (
      <div style={{ marginTop:12, background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:14, fontSize:14, lineHeight:1.75, color:T.text, whiteSpace:'pre-wrap' }}>
        {text}
        {onSave && <button onClick={onSave} style={{ display:'block', marginTop:10, width:'100%', padding:'8px', borderRadius:rr('sm'), border:`0.5px solid ${T.border}`, background:'transparent', color:saved?'var(--green)':T.text2, fontSize:13, cursor:'pointer' }}>{saved?'✓ Saved':'+ Save to My Stack'}</button>}
      </div>
    )
  }
  return <RoutineCard exercises={exercises} onSave={onSave} saved={saved} />
}

// ─── Source-informed prompts ──────────────────────────────────────────────────
function buildMobilityPrompt(activity, focus, when, extra) {
  const sourceMap = {
    Golf: 'Apply TPI (Titleist Performance Institute) principles. Focus on hip dissociation, thoracic rotation, and posterior chain activation. Sequence like a TPI practitioner would.',
    Running: 'Apply ATG (Ben Patrick/Knees Over Toes) tendon-preparation principles combined with Kelly Starrett movement quality approach. Emphasize joint preparation and landing mechanics.',
    Lifting: 'Apply Squat University methodology (Dr. Aaron Horschig). Prioritize ankle mobility, thoracic extension, and hip capsule preparation. Address common restriction patterns.',
    Basketball: 'Apply Mike Boyle athletic performance principles. Focus on reactive movement preparation, lateral mechanics, and jump-landing patterns.',
    Tennis: 'Apply Boyle and FMS rotational movement principles. Prioritize shoulder preparation, rotational patterns, and lateral movement readiness.',
    Pickleball: 'Focus on wrist and forearm preparation, lateral movement patterns, and cervical mobility for court tracking.',
  }
  const focusMap = {
    Hips: 'Apply Kelly Starrett hip mobility principles — address both the hip capsule (joint) and surrounding soft tissue. Include hip flexor, glute, and rotational work.',
    'Lower back': 'Apply McGill-informed principles — stabilization before mobilization. Address hip and thoracic mobility as root causes, not just the lower back symptoms.',
    Shoulders: 'Apply Squat University shoulder principles — address thoracic extension, scapular positioning, and rotator cuff activation before mobility work.',
    Hamstrings: 'Address both neural tension and muscular length. Include hip-hinge patterns not just passive stretching.',
    'Upper back': 'Apply Starrett thoracic mobility principles — address thoracic extension and rotation, not just stretching.',
    'Ankles and knees': 'Apply ATG/Ben Patrick principles — knee over toe progressions, tibialis work, and full ankle mobility range.',
  }
  const source = sourceMap[activity] || sourceMap[focus] || 'Apply Kelly Starrett The Ready State movement quality principles.'
  const focusNote = focusMap[focus] || ''
  return `You are a movement specialist and performance coach. Give exactly 5 specific exercises.
${source}
${focusNote}
Activity: ${activity || 'general'}
Focus area: ${focus || 'general'}
Timing: ${when}
Extra context: ${extra || 'none'}

Format EXACTLY like this (no markdown, no bold):
1. [Exercise name]
[One precise coaching cue — what to feel, not just what to do]
[Sets/reps or duration]

Be specific and evidence-informed. Each exercise should have a clear reason for being in this routine.`
}

function buildSportPrompt(sport, type) {
  const sourceMap = {
    Golf: 'TPI (Titleist Performance Institute) principles. Focus on the 5 physical skills TPI identifies: mobility, stability, strength, power, endurance — weighted for golf.',
    Running: 'ATG (Ben Patrick) tendon preparation combined with Kelly Starrett running mechanics principles.',
    Lifting: 'Squat University methodology — evidence-based joint preparation and movement pattern activation.',
    Basketball: 'Mike Boyle strength and conditioning principles for court sport athletes.',
    Tennis: 'Rotational sport principles from Boyle and FMS — shoulder, thoracic, and lateral movement focus.',
    Pickleball: 'Court sport preparation principles — wrist, lateral movement, and cervical mobility.',
  }
  return `You are a sports performance coach. Give a targeted ${type} for ${sport}.
Apply ${sourceMap[sport] || 'evidence-based sports performance'} principles.

List exactly 6 movements. Format EXACTLY like this:
1. [Movement name]
[One precise coaching cue]
[Duration or reps]

Sequence matters — order these logically for warm-up progression or cool-down. Total time under 15 minutes.`
}

// ─── Quick relief section ─────────────────────────────────────────────────────
function QuickRelief({ onSave }) {
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(false)
  const areas = Object.keys(QUICK_RELIEF)
  const routine = selected ? QUICK_RELIEF[selected] : null

  const save = () => {
    const text = routine.map(e => `${e.name}\n${e.cue}\n${e.reps}`).join('\n\n')
    onSave({ label: `${selected} relief`, text, type: 'routine' })
    setSaved(true)
  }

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>Quick relief — 5 min</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:routine?12:0 }}>
        {areas.map(a => (
          <button key={a} onClick={()=>{ setSelected(selected===a?null:a); setSaved(false) }} style={{
            padding:'7px 14px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`,
            background: selected===a ? T.text : T.surface2,
            color: selected===a ? T.bg : T.text2,
          }}>{a}</button>
        ))}
      </div>
      {routine && (
        <RoutineCard exercises={routine} title={`${selected} relief`} duration="~5 min" onSave={save} saved={saved} />
      )}
    </div>
  )
}

// ─── Sport library section ────────────────────────────────────────────────────
function SportLibrary({ onSave }) {
  const [sport, setSport] = useState(null)
  const [type, setType] = useState('warmup')
  const [liftType, setLiftType] = useState('lower')
  const [saved, setSaved] = useState(false)
  const sports = Object.keys(SPORT_LIBRARY)

  const getRoutine = () => {
    if (!sport) return null
    if (sport === 'Lifting') {
      const key = `${liftType}_${type}`
      return SPORT_LIBRARY[sport]?.[key] || SPORT_LIBRARY[sport]?.[type]
    }
    return SPORT_LIBRARY[sport]?.[type]
  }
  const routine = getRoutine()

  const save = () => {
    if (!routine) return
    const text = routine.exercises.map(e => `${e.name}\n${e.cue}\n${e.reps}`).join('\n\n')
    onSave({ label: routine.title, text, type: 'routine' })
    setSaved(true)
  }

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, color:T.text3, letterSpacing:.6, textTransform:'uppercase', marginBottom:10 }}>Sport routines</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {sports.map(s => (
          <button key={s} onClick={()=>{ setSport(sport===s?null:s); setSaved(false) }} style={{
            padding:'7px 14px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`,
            background: sport===s ? T.text : T.surface2,
            color: sport===s ? T.bg : T.text2,
          }}>{s}</button>
        ))}
      </div>
      {sport === 'Lifting' && (
        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
          {[['lower','Lower body'],['upper','Upper body']].map(([k,l]) => (
            <button key={k} onClick={()=>{ setLiftType(k); setSaved(false) }} style={{
              flex:1, padding:'7px', borderRadius:rr('sm'), fontSize:12,
              border: liftType===k ? 'none' : `0.5px solid ${T.border}`,
              background: liftType===k ? T.surface3 : 'transparent',
              color: liftType===k ? T.text : T.text2,
            }}>{l}</button>
          ))}
        </div>
      )}
      {sport && (
        <div style={{ display:'flex', gap:6, marginBottom:12 }}>
          {['warmup','recovery'].map(t => (
            <button key={t} onClick={()=>{ setType(t); setSaved(false) }} style={{
              flex:1, padding:'8px', borderRadius:rr('sm'), fontSize:12,
              border: type===t ? 'none' : `0.5px solid ${T.border}`,
              background: type===t ? T.text : 'transparent',
              color: type===t ? T.bg : T.text2, textTransform:'capitalize',
            }}>{t === 'warmup' ? 'Warmup' : 'Recovery'}</button>
          ))}
        </div>
      )}
      {routine && <RoutineCard exercises={routine.exercises} title={routine.title} duration={routine.duration} source={routine.source} onSave={save} saved={saved} />}
    </div>
  )
}

// ─── Custom AI section ────────────────────────────────────────────────────────
function CustomRoutine({ onSave }) {
  const [open, setOpen] = useState(false)
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
      const text = await callAI(buildMobilityPrompt(activity, focus, when, extra))
      setResp(text)
    } catch { setResp('Something went wrong. Try again.') }
    setLoading(false)
  }

  const save = () => {
    onSave({ label: `${activity || focus || 'Custom'} routine`, text: resp, type: 'routine' })
    setSaved(true)
  }

  return (
    <div>
      <button onClick={()=>setOpen(!open)} style={{
        width:'100%', padding:'10px 14px', borderRadius:rr('md'),
        border:`0.5px solid ${T.border}`, background:'transparent',
        color:T.text2, fontSize:13, textAlign:'left', cursor:'pointer',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <span>Custom routine</span>
        <span style={{ fontSize:11, color:T.text3 }}>{open ? '∧' : '∨'}</span>
      </button>

      {open && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:12, color:T.text3, marginBottom:6 }}>Activity</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {['Golf','Running','Lifting','Basketball','Tennis','Pickleball'].map(a => (
              <button key={a} onClick={()=>setActivity(activity===a?'':a)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`,
                background: activity===a ? T.text : T.surface2,
                color: activity===a ? T.bg : T.text2,
              }}>{a}</button>
            ))}
          </div>
          <div style={{ fontSize:12, color:T.text3, marginBottom:6 }}>Focus area</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {['Hips','Lower back','Shoulders','Hamstrings','Upper back','Ankles and knees'].map(f => (
              <button key={f} onClick={()=>setFocus(focus===f?'':f)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`,
                background: focus===f ? T.text : T.surface2,
                color: focus===f ? T.bg : T.text2,
              }}>{f}</button>
            ))}
          </div>
          <div style={{ fontSize:12, color:T.text3, marginBottom:6 }}>When</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {['Before activity','After activity','General relief'].map(w => (
              <button key={w} onClick={()=>setWhen(w)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:12, border:`0.5px solid ${T.border}`,
                background: when===w ? T.text : T.surface2,
                color: when===w ? T.bg : T.text2,
              }}>{w}</button>
            ))}
          </div>
          <textarea value={extra} onChange={e=>setExtra(e.target.value)}
            placeholder="Any extra detail..." rows={2}
            style={{ width:'100%', background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:rr('md'), padding:'10px 12px', fontSize:13, color:T.text, resize:'none', outline:'none', marginBottom:8 }} />
          <button onClick={go} disabled={loading||(!activity&&!focus&&!extra)} style={{
            width:'100%', padding:'11px', borderRadius:rr('md'), border:'none',
            background:loading||(!activity&&!focus&&!extra)?T.surface2:T.text,
            color:loading||(!activity&&!focus&&!extra)?T.text3:T.bg,
            fontSize:14, fontWeight:500, cursor:'pointer',
          }}>{loading ? 'Building routine...' : 'Get custom routine'}</button>
          {loading && (
            <div style={{ display:'flex', gap:5, padding:'10px 0', alignItems:'center' }}>
              {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:T.text3,animation:'blink 1.2s infinite',animationDelay:i*.2+'s' }} />)}
              <style>{"@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}"}</style>
            </div>
          )}
          {resp && !loading && <AIRoutineCard text={resp} onSave={save} saved={saved} />}
        </div>
      )}
    </div>
  )
}

// ─── Post-lift recovery suggestion ───────────────────────────────────────────
export function PostLiftRecovery({ workoutName, exercises, onSave }) {
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shown, setShown] = useState(false)

  const go = async () => {
    setLoading(true); setShown(true)
    const muscleGroups = exercises.map(e => e.name).join(', ')
    try {
      const text = await callAI(`You are a recovery specialist applying Kelly Starrett Ready State principles.
The user just completed: ${workoutName} (${muscleGroups}).
Give a 5-minute post-workout recovery flow targeting the primary muscles just trained.

Format EXACTLY like this:
1. [Movement name]
[One precise coaching cue]
[Duration]

5 movements max. Focus on tissue restoration, not more training stimulus.`)
      setResp(text)
    } catch { setResp('') }
    setLoading(false)
  }

  const save = () => {
    onSave({ label: `${workoutName} recovery flow`, text: resp, type: 'routine' })
    setSaved(true)
  }

  if (!shown) {
    return (
      <button onClick={go} style={{
        width:'100%', marginTop:10, padding:'10px', borderRadius:rr('md'),
        border:`0.5px solid var(--green-dim)`, background:'var(--green-bg)',
        color:'var(--green)', fontSize:13, cursor:'pointer',
      }}>Recovery flow for this session →</button>
    )
  }

  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:12, color:T.text2, marginBottom:8 }}>Recovery flow</div>
      {loading ? (
        <div style={{ display:'flex', gap:5, padding:'8px 0', alignItems:'center' }}>
          {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:T.text3,animation:'blink 1.2s infinite',animationDelay:i*.2+'s' }} />)}
        </div>
      ) : resp ? (
        <AIRoutineCard text={resp} onSave={save} saved={saved} />
      ) : null}
    </div>
  )
}

// ─── Saved routine renderer ───────────────────────────────────────────────────
export function SavedRoutineCard({ item }) {
  const lines = item.text.split('\n').map(l => l.trim()).filter(Boolean)
  const exercises = []
  let current = null
  for (const line of lines) {
    if (/^\d+\./.test(line) || /^[-•]/.test(line)) {
      if (current) exercises.push(current)
      current = { name: line.replace(/^\d+\.\s*|^[-•]\s*/, ''), cue: '', reps: '' }
    } else if (current) {
      const repsMatch = line.match(/\d+\s*(reps?|sets?|sec|min|x\s*\d+)/i)
      if (repsMatch && !current.reps) current.reps = line
      else if (!current.cue) current.cue = line
    }
  }
  if (current) exercises.push(current)
  if (exercises.length < 2) return null
  return <RoutineCard exercises={exercises} title={item.label} />
}

// ─── Main MoveScreen ──────────────────────────────────────────────────────────
export default function MoveScreen({ onSave }) {
  return (
    <div style={{ padding:'20px 20px' }}>
      <QuickRelief onSave={onSave} />
      <div style={{ height:'0.5px', background:T.border, margin:'4px 0 20px' }} />
      <SportLibrary onSave={onSave} />
      <div style={{ height:'0.5px', background:T.border, margin:'4px 0 20px' }} />
      <CustomRoutine onSave={onSave} />
    </div>
  )
}
