import { supabase } from './supabase'

// ─── Profile ──────────────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data || { name:'', goal:'Athletic performance', activity:'Very active (5+/week)', calories:'', protein:'', notes:'' }
}

export async function saveProfile(userId, profile) {
  await supabase.from('profiles').upsert({ id: userId, ...profile, updated_at: new Date().toISOString() })
}

// ─── Pantry ───────────────────────────────────────────────────────────────────
const DEFAULT_PANTRY = ['Ground beef','Chicken','Rice','Eggs','Greek yogurt','Potatoes','Cheese','Bread']

export async function getPantry(userId) {
  const { data } = await supabase.from('pantry').select('ingredients').eq('user_id', userId).single()
  return data?.ingredients || DEFAULT_PANTRY
}

export async function savePantry(userId, ingredients) {
  const { data } = await supabase.from('pantry').select('id').eq('user_id', userId).single()
  if (data) {
    await supabase.from('pantry').update({ ingredients, updated_at: new Date().toISOString() }).eq('user_id', userId)
  } else {
    await supabase.from('pantry').insert({ user_id: userId, ingredients })
  }
}

// ─── Taste memory ─────────────────────────────────────────────────────────────
export async function getTasteMemory(userId) {
  const { data } = await supabase.from('taste_memory').select('data').eq('user_id', userId).single()
  return data?.data || {}
}

export async function updateTasteMemory(userId, patch) {
  const current = await getTasteMemory(userId)
  const next = { ...current }
  if (patch.savedIngredients) next.savedIngredients = [...(current.savedIngredients||[]), ...patch.savedIngredients].slice(-30)
  if (patch.vibes) next.vibes = [...(current.vibes||[]), ...patch.vibes].slice(-20)
  if (patch.efforts) next.efforts = [...(current.efforts||[]), ...patch.efforts].slice(-10)
  if (patch.meals) next.meals = [...(current.meals||[]), ...patch.meals].slice(-20)
  const { data } = await supabase.from('taste_memory').select('id').eq('user_id', userId).single()
  if (data) {
    await supabase.from('taste_memory').update({ data: next, updated_at: new Date().toISOString() }).eq('user_id', userId)
  } else {
    await supabase.from('taste_memory').insert({ user_id: userId, data: next })
  }
  return next
}

// ─── Saved items ──────────────────────────────────────────────────────────────
export async function getSavedItems(userId) {
  const { data } = await supabase.from('saved_items').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return data || []
}

export async function addSavedItem(userId, item) {
  const { data } = await supabase.from('saved_items').insert({
    user_id: userId, label: item.label, text: item.text, type: item.type
  }).select().single()
  return data
}

export async function deleteSavedItem(id) {
  await supabase.from('saved_items').delete().eq('id', id)
}

// ─── Daily cache ──────────────────────────────────────────────────────────────
export async function getDailyCache(userId, cacheKey) {
  const today = new Date().toDateString()
  const { data } = await supabase.from('daily_cache').select('data, date').eq('user_id', userId).eq('cache_key', cacheKey).single()
  if (data && data.date === today) return data.data
  return null
}

export async function setDailyCache(userId, cacheKey, cacheData) {
  const today = new Date().toDateString()
  await supabase.from('daily_cache').upsert({
    user_id: userId, cache_key: cacheKey, data: cacheData, date: today, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,cache_key' })
}

// ─── Lift programs ────────────────────────────────────────────────────────────
export async function getPrograms(userId) {
  const { data, error } = await supabase.from('lift_programs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) console.error('getPrograms error:', error)
  return (data || []).map(p => ({ ...p, phases: p.phases || [] }))
}

export async function saveProgram(userId, program) {
  const { id, ...rest } = program
  const { data, error } = await supabase
    .from('lift_programs')
    .upsert({ id, user_id: userId, ...rest, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()
  if (error) console.error('saveProgram error:', error)
  return data || program
}

export async function deleteProgram(programId) {
  await supabase.from('lift_programs').delete().eq('id', programId)
}

// ─── Lift sessions ────────────────────────────────────────────────────────────
export async function getSessions(userId, programId) {
  let query = supabase.from('lift_sessions').select('*').eq('user_id', userId).order('logged_at', { ascending: false })
  if (programId) query = query.eq('program_id', programId)
  const { data } = await query
  return (data || []).map(s => ({ ...s, date: s.logged_at }))
}

export async function saveSession(userId, session) {
  const { data } = await supabase.from('lift_sessions').insert({
    user_id: userId,
    program_id: session.programId,
    phase_id: session.phaseId,
    workout_id: session.workoutId,
    workout_name: session.workoutName,
    exercises: session.exercises,
  }).select().single()
  return data
}
