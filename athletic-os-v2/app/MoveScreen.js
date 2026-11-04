'use client'
import { useState } from 'react'
import { Chip, ChipRow, Card, Button, Row, Section, Segmented, Field, TextArea, Skeleton, Disclosure, ScreenHeader } from './ui'
import { RoutineCard, ExerciseList } from './ui/Routine'


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
    return data.text || ''
  } catch(e) {
    if (e.name === 'AbortError') throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ─── Shared warmup-type helper ────────────────────────────────────────────────
export function getWarmupType(workoutName) {
  const n = (workoutName||'').toLowerCase()
  if (n.includes('lower') || n.includes('squat') || n.includes('deadlift') || n.includes('leg') || n.includes('hip')) return 'lower'
  if (n.includes('upper') || n.includes('press') || n.includes('pull') || n.includes('bench') || n.includes('arm')) return 'upper'
  return 'lower' // default to lower for full body
}

// ─── Pre-built sport library ──────────────────────────────────────────────────
// Informed by TPI (golf), Kelly Starrett/The Ready State (mobility),
// Squat University (lifting), Ben Patrick/ATG (running/durability),
// Mike Boyle (athletic performance)

export const SPORT_LIBRARY = {
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
// ─── AI routine card (parses AI text into structured cards) ───────────────────
function AIRoutineCard({ text, onSave, saved }) {
  if (!text) return null
  // Strip markdown the model sometimes adds (**bold**, __bold__, # headings, bullets)
  const clean = l => l.replace(/\*\*|__/g, '').replace(/^#+\s*/, '').replace(/^[-•]\s+/, '').trim()
  const lines = text.split('\n').map(clean).filter(Boolean)
  const exercises = []
  let current = null
  for (const line of lines) {
    const isNumbered = /^\d+\.\s/.test(line)
    if (isNumbered) {
      if (current) exercises.push(current)
      current = { name: line.replace(/^\d+\.\s*/, ''), cue: '', why: '', reps: '' }
    } else if (current) {
      // Reps/duration: a known unit ("45 sec") or any line that leads with a count ("10 circles each direction")
      const repsMatch = line.match(/(\d+\s*(reps?|sets?|sec|min|seconds?|minutes?|rounds?|x\s*\d+))/i) || /^\d/.test(line)
      // "This releases/helps/reduces/loosens/improves..." → why line
      const whyMatch = line.match(/^(this |these |it )/i)
      if (repsMatch && !current.reps) current.reps = line
      else if (whyMatch && !current.why) current.why = line
      else if (!current.cue) current.cue = line
      else if (!current.reps && line.length < 60) current.reps = line
    }
  }
  if (current) exercises.push(current)

  if (exercises.length === 0) {
    return (
      <Card style={{ marginTop:12 }}>
        <p className="t-body" style={{ whiteSpace:'pre-wrap' }}>{text}</p>
        {onSave && <Button size="md" full variant={saved?'secondary':'primary'} icon={saved?'check':'plus'} aria-disabled={saved} onClick={saved?undefined:onSave} style={{ marginTop:12 }}>{saved?'Saved to your rotation':'Save to rotation'}</Button>}
      </Card>
    )
  }
  const merged = exercises.map(ex => ({ ...ex, cue: [ex.cue, ex.why].filter(Boolean).join(' ') }))
  return <RoutineCard exercises={merged} onSave={onSave} saved={saved} style={{ marginTop:12 }} />
}

// ─── Source-informed prompts ──────────────────────────────────────────────────
function buildMobilityPrompt(activity, focus, when, extra) {
  // Area-specific context — what to address, kept simple
  const focusGuide = {
    Hips: 'Focus on hip flexors, glutes, and hip rotators. Include a hip flexor stretch, a glute stretch, and a hip rotation exercise.',
    'Lower back': 'Focus on relieving lower back tension through hip mobility and gentle spinal movement. Avoid anything that loads the spine — use stretches and controlled movements only.',
    Shoulders: 'Focus on opening the chest, loosening the upper back, and mobilizing the shoulder joint. Simple stretches and arm circles work well.',
    Hamstrings: 'Focus on gentle hamstring lengthening through stretching and controlled movement. No aggressive stretching — slow and held.',
    'Upper back': 'Focus on thoracic mobility — chest openers, upper back stretches, and gentle rotation.',
    'Ankles and knees': 'Focus on ankle circles, calf stretching, and gentle knee mobilization. All exercises should be low-load and pain-free.',
    Achilles: 'Focus on gentle calf and Achilles tendon relief. Use only low-load, non-aggressive movements — calf raises, calf stretches, and ankle mobility. Nothing that strains the tendon.',
    Calves: 'Focus on calf stretching and ankle mobility. Slow, controlled movements only.',
    Neck: 'Focus on gentle neck stretches and upper trap release. Slow, controlled movements — no aggressive rotation.',
    Wrists: 'Focus on wrist circles, forearm stretching, and finger mobility. All gentle and pain-free.',
  }
  const focusNote = focusGuide[focus] || `Focus on relieving tightness in the ${focus || 'area mentioned'} using simple, accessible movements.`
  const timingNote = when === 'Before activity' ? 'Keep everything dynamic and movement-based — no long holds. This is preparation, not deep stretching.'
    : when === 'After activity' ? 'Use longer holds (30-45 seconds) for the stretches. The body is warm so this is a good time for deeper relief.'
    : 'Mix of gentle movement and held stretches. Keep it calm and accessible.'

  return `You are a certified personal trainer and mobility coach. Someone needs help with a tight or sore area. Your job is to give them 5 simple exercises they can do right now — at home, on the floor, no equipment needed.

READ THEIR NOTES CAREFULLY: "${extra || 'none'}" — adapt everything to what they actually told you. If they mention pain or soreness, keep everything gentle. If they mention timing (before bed, after a run, at work), adapt the exercises to fit that context. If they describe something specific, address it specifically.

CRITICAL RULES:
- Simple, familiar exercise names only. Good examples: "Standing calf stretch", "Seated hamstring stretch", "Hip flexor lunge stretch", "Lying glute stretch", "Ankle circles", "Child's pose", "Cat-cow stretch", "Doorway chest stretch", "Knee hug stretch", "Pigeon pose", "Supine twist".
- No equipment, no jargon, no complex names. If someone's never been to a gym they should still understand it.
- If the area is painful or injured, keep everything low-load and gentle. Nothing aggressive.
- Based on Kelly Starrett, Dr. Aaron Horschig, and Ben Patrick principles — expressed in plain everyday language.

Context:
- Area: ${focus || extra || 'general tightness'}
- Activity: ${activity || 'none'}
- Timing: ${when}
- ${focusNote}
- ${timingNote}

Format EXACTLY like this — 5 exercises, plain text only, no markdown:

1. [Exercise name]
[What to do — one clear sentence in plain English]
[Why this helps — one short sentence explaining the benefit]
[How long or how many reps]

Example of perfect output:
1. Standing calf stretch
Step forward into a small lunge, back heel pressed flat to the floor, and hold.
This releases tension in the calf muscle and takes load off the Achilles tendon.
Hold 30 seconds each side, 2 rounds

Every exercise must be this clear, this simple, and include the why.`
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

// ─── Daily mobility section ───────────────────────────────────────────────────
// A balanced, head-to-toe flow for off days — not for soreness in any one area,
// but to keep the whole body moving well. Drawn from the same sources as the
// rest of the library (ATG, Squat University, TPI, Starrett).
const DAILY_MOBILITY = {
  title: 'Daily Mobility',
  duration: '10 min',
  source: 'ATG + Squat University + Starrett-informed',
  exercises: [
    { name: 'Cat-cow flow', cue: 'On all fours, slowly alternate rounding and arching the spine, moving with your breath. Wakes up the whole spine from neck to pelvis before anything else.', reps: '8 slow reps' },
    { name: 'World\u2019s greatest stretch', cue: 'Lunge forward, drop same-side elbow toward the floor, then rotate that arm to the ceiling. One movement that opens hips, groin, and thoracic spine together.', reps: '5 each side' },
    { name: 'Hip CARs (controlled circles)', cue: 'On all fours or standing, draw the biggest slow circle you can with one knee, keeping the rest of the body still. Maintains the hip\u2019s full active range.', reps: '4 each direction each side' },
    { name: 'Deep squat hold with pry', cue: 'Sink into a flat-foot deep squat, elbows inside knees, gently pry the knees open and shift side to side. ATG-style restoration of the position we evolved to rest in.', reps: '60 sec' },
    { name: 'Cossack squat', cue: 'Wide stance, shift to one side keeping the other leg straight, stay tall. Opens the groin and hip capsule through a full lateral range.', reps: '6 each side' },
    { name: 'Thoracic rotation (open book)', cue: 'Side-lying, knees bent, sweep the top arm across and open the chest to the floor behind you, following the hand with your eyes. Restores rotation to the mid-back.', reps: '8 each side' },
    { name: 'Shoulder CARs', cue: 'Slow, full-range shoulder circles, one arm at a time, moving through the largest path you can control. Keeps the shoulder joint healthy and mobile.', reps: '4 each direction each arm' },
    { name: 'Ankle rock + calf raise', cue: 'Knee drives forward over the toes with the heel flat, then rise onto the ball of the foot. Ankles feed everything below the hips \u2014 keep them free.', reps: '10 rocks + 10 raises each side' },
    { name: 'Standing forward fold to halfway', cue: 'Fold forward with soft knees, hang, then lift to a flat back with hands on shins, alternating slowly. Gently lengthens the whole posterior chain.', reps: '8 reps' },
    { name: 'Walkout to plank reach', cue: 'From the fold, walk hands out to a plank, reach one arm forward, hold a beat, walk back. Integrates the whole body and finishes warm and switched-on.', reps: '5 reps' },
  ]
}

// ─── Daily mobility component ─────────────────────────────────────────────────
export function DailyMobility({ onSave, defaultOpen=false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [saved, setSaved] = useState(false)
  const save = () => {
    onSave({ label: DAILY_MOBILITY.title, text: JSON.stringify({ exercises: DAILY_MOBILITY.exercises, title: DAILY_MOBILITY.title, duration: DAILY_MOBILITY.duration }), type: 'routine' })
    setSaved(true)
  }
  if (open) {
    return <RoutineCard exercises={DAILY_MOBILITY.exercises} title="Full-body flow" duration={DAILY_MOBILITY.duration} source={DAILY_MOBILITY.source} onSave={save} saved={saved} />
  }
  return (
    <Row icon="sparkle" title="Full-body flow" subtitle="10 min. Not sore anywhere, just keep moving well." onClick={()=>setOpen(true)} />
  )
}

// ─── Quick relief section ─────────────────────────────────────────────────────
export function QuickRelief({ onSave, bare }) {
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(false)
  const areas = Object.keys(QUICK_RELIEF)
  const routine = selected ? QUICK_RELIEF[selected] : null

  const save = () => {
    onSave({ label: `${selected} relief`, text: JSON.stringify({ exercises: routine, title: `${selected} relief`, duration: 'About 5 min' }), type: 'routine' })
    setSaved(true)
  }

  return (
    <div style={{ marginBottom: bare ? 0 : 20 }}>
      {!bare && <div className="t-footnote c-2" style={{ marginBottom:10 }}>Quick relief, 5 min</div>}
      <ChipRow style={{ marginBottom: routine ? 14 : 0 }}>
        {areas.map(a => (
          <Chip key={a} selected={selected===a} onClick={()=>{ setSelected(selected===a?null:a); setSaved(false) }}>{a}</Chip>
        ))}
      </ChipRow>
      {routine && (
        <RoutineCard exercises={routine} title={`${selected} relief`} duration="About 5 min" onSave={save} saved={saved} style={bare ? { padding:0, boxShadow:'none' } : undefined} />
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
    onSave({ label: routine.title, text: JSON.stringify({ exercises: routine.exercises, title: routine.title, duration: routine.duration, source: routine.source }), type: 'routine' })
    setSaved(true)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <ChipRow>
        {sports.map(sp => <Chip key={sp} small selected={sport===sp} onClick={()=>{ setSport(sport===sp?null:sp); setSaved(false) }}>{sp}</Chip>)}
      </ChipRow>
      {sport === 'Lifting' && (
        <Segmented label="Body" value={liftType} onChange={k=>{ setLiftType(k); setSaved(false) }}
          options={[{ key:'lower', label:'Lower body' }, { key:'upper', label:'Upper body' }]} />
      )}
      {sport && (
        <Segmented label="Timing" value={type} onChange={t=>{ setType(t); setSaved(false) }}
          options={[{ key:'warmup', label:'Warmup' }, { key:'recovery', label:'Recovery' }]} />
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const go = async () => {
    if (!activity && !focus && !extra) return
    setLoading(true); setResp(''); setError(''); setSaved(false)
    try {
      const text = await callAI(buildMobilityPrompt(activity, focus, when, extra))
      setResp(text)
    } catch(e) {
      setError(e.message === 'timeout'
        ? 'Taking longer than usual. Check your connection and try again.'
        : 'Something went wrong. Try again.')
    }
    setLoading(false)
  }

  const save = () => {
    onSave({ label: `${activity || focus || 'Custom'} routine`, text: resp, type: 'routine' })
    setSaved(true)
  }

  const ready = !!(activity || focus || extra)
  return (
    <Card style={{ padding:'4px 20px' }}>
      <Disclosure open={open} onToggle={()=>setOpen(!open)}>
        <span className="t-callout" style={{ fontWeight:600 }}>Build your own</span>
        <span className="t-footnote c-2" style={{ display:'block', fontWeight:400 }}>Tell it what's going on, get a routine for it</span>
      </Disclosure>
      {open && (
        <div style={{ display:'flex', flexDirection:'column', gap:18, padding:'8px 0 20px' }}>
          <Field label="Activity">
            <ChipRow>{['Golf','Running','Lifting','Basketball','Tennis','Pickleball'].map(a => <Chip key={a} small selected={activity===a} onClick={()=>setActivity(activity===a?'':a)}>{a}</Chip>)}</ChipRow>
          </Field>
          <Field label="Focus area">
            <ChipRow>{['Hips','Lower back','Shoulders','Hamstrings','Upper back','Ankles and knees','Achilles','Calves','Neck','Wrists'].map(f => <Chip key={f} small selected={focus===f} onClick={()=>setFocus(focus===f?'':f)}>{f}</Chip>)}</ChipRow>
          </Field>
          <Field label="When">
            <Segmented label="When" value={when} onChange={setWhen}
              options={[{ key:'Before activity', label:'Before' }, { key:'After activity', label:'After' }, { key:'General relief', label:'Anytime' }]} />
          </Field>
          <Field label="Anything else?">
            <TextArea value={extra} onChange={setExtra} rows={2} placeholder="My achilles is sore, I want this before bed" aria-label="Anything else" />
          </Field>
          <Button full onClick={go} disabled={loading || !ready}>{loading ? 'Building your routine' : 'Build routine'}</Button>
          {loading && <Skeleton lines={4} label="Building your routine" />}
          {error && !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <p className="t-subhead c-2">{error}</p>
              <Button size="md" variant="secondary" onClick={go} style={{ alignSelf:'flex-start' }}>Try again</Button>
            </div>
          )}
          {resp && !loading && !error && <AIRoutineCard text={resp} onSave={save} saved={saved} />}
        </div>
      )}
    </Card>
  )
}

// ─── Post-lift recovery suggestion ───────────────────────────────────────────
export function PostLiftRecovery({ workoutName, exercises, onSave }) {
  const [resp, setResp] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shown, setShown] = useState(false)
  const [failed, setFailed] = useState(false)

  const go = async () => {
    setLoading(true); setShown(true); setFailed(false)
    const muscleGroups = exercises.map(e => e.name).join(', ')
    try {
      const text = await callAI(`You are a certified trainer helping someone recover after a workout. Give 5 simple recovery exercises they can do at home on a mat. Use only common exercise names that anyone would understand — like "Child's pose", "Lying quad stretch", "Seated hamstring stretch", "Hip flexor stretch", "Supine twist". No equipment needed, no jargon.

Apply Kelly Starrett recovery principles but in plain language.
The user just completed: ${workoutName} (${muscleGroups}).
Give a 5-minute post-workout recovery flow targeting the primary muscles just trained.

Format EXACTLY like this:
1. [Movement name]
[One precise coaching cue]
[Duration]

5 movements max. Focus on tissue restoration, not more training stimulus.`)
      setResp(text)
    } catch { setResp(''); setFailed(true) }
    setLoading(false)
  }

  const save = () => {
    onSave({ label: `${workoutName} recovery flow`, text: resp, type: 'routine' })
    setSaved(true)
  }

  if (!shown) {
    return <Button variant="secondary" size="md" full iconAfter="arrowRight" onClick={go} style={{ marginTop:10 }}>Recovery flow for this session</Button>
  }
  return (
    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
      <span className="t-footnote c-2" style={{ fontWeight:600 }}>Recovery flow</span>
      {loading ? <Skeleton lines={4} label="Building your recovery flow" />
        : resp ? <AIRoutineCard text={resp} onSave={save} saved={saved} />
        : failed ? <Button variant="secondary" size="sm" onClick={go} style={{ alignSelf:'flex-start' }}>Couldn't load it. Try again</Button>
        : null}
    </div>
  )
}

// ─── Saved routine renderer ───────────────────────────────────────────────────
export function SavedRoutineCard({ item }) {
  // Handle both real newlines and escaped \n from JSON storage
  const rawText = item.text.replace(/\\n/g, '\n')
  const lines = rawText.split('\n').map(l => l.replace(/\*\*|__/g, '').trim()).filter(Boolean)
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
export default function MoveScreen({ onSave, pendingSession, onClearPending, onStartSession }) {

  // ─── Pre-session warmup: the step between Home's "Start" and the lift ─────────
  if (pendingSession) {
    const { warmupType, workoutName } = pendingSession
    const routine = SPORT_LIBRARY.Lifting[`${warmupType}_warmup`] || SPORT_LIBRARY.Lifting.lower_warmup
    return (
      <>
      <ScreenHeader title={routine.title} subtitle={`Before ${workoutName} · ${routine.duration}`} onBack={onClearPending} />
      <div style={{ padding:'0 var(--edge)', display:'flex', flexDirection:'column', gap:16 }}>
        <Card style={{ padding:'4px 20px' }}><ExerciseList exercises={routine.exercises} /></Card>
        <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:8 }}>
          <Button full iconAfter="arrowRight" onClick={()=>onStartSession(pendingSession)}>Warmed up. Start {workoutName}</Button>
          <Button variant="quiet" full onClick={()=>{ onSave({ label:`${routine.title} · Pre-session`, text: JSON.stringify(routine), type:'routine' }); onClearPending() }}>
            Save this warmup to rotation
          </Button>
        </div>
      </div>
      </>
    )
  }

  return (
    <div style={{ padding:'0 var(--edge)', display:'flex', flexDirection:'column', gap:32 }}>
      <Section title="What feels tight? 5 minutes, no setup">
        <QuickRelief onSave={onSave} bare />
      </Section>
      <Section title="Daily mobility">
        <DailyMobility onSave={onSave} />
      </Section>
      <Section title="Warmups and recovery for your sport">
        <SportLibrary onSave={onSave} />
      </Section>
      <CustomRoutine onSave={onSave} />
    </div>
  )
}
