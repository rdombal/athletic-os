'use client'
import { useState } from 'react'
import { supabase } from './supabase'

const T = {
  bg:'var(--bg)', surface:'var(--surface)', surface2:'var(--surface2)',
  border:'var(--border)', text:'var(--text)', text2:'var(--text2)', text3:'var(--text3)',
}
function rr(s) { return s==='sm'?'8px':s==='lg'?'16px':'12px' }

function Input({ value, onChange, placeholder, type='text' }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} style={{
        width:'100%', padding:'12px', borderRadius:rr('sm'), fontSize:14,
        border:`0.5px solid ${T.border}`, background:T.surface,
        color:T.text, outline:'none', marginBottom:10,
      }} />
  )
}

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSignIn = async () => {
    if (!email || !password) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUp = async () => {
    if (!email || !password) return
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user && name) {
      await supabase.from('profiles').upsert({ id: data.user.id, name })
    }
    setMessage('Account created. Check your email to confirm, then sign in.')
    setMode('signin')
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above first.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setMessage('Password reset email sent.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg,
      display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 24px' }}>

      <div style={{ marginBottom:40 }}>
        <div style={{ fontSize:28, fontWeight:400, color:T.text, letterSpacing:-.5, marginBottom:6 }}>
          Athletic OS
        </div>
        <div style={{ fontSize:14, color:T.text2 }}>
          {mode==='signin' ? 'Sign in to your account' : 'Create your account'}
        </div>
      </div>

      {message && (
        <div style={{ background:'var(--green-bg)', border:'0.5px solid var(--green)', borderRadius:rr('sm'),
          padding:'10px 12px', fontSize:13, color:'var(--green)', marginBottom:16 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ background:'var(--coral-bg)', border:'0.5px solid var(--coral)', borderRadius:rr('sm'),
          padding:'10px 12px', fontSize:13, color:'var(--coral)', marginBottom:16 }}>
          {error}
        </div>
      )}

      {mode==='signup' && (
        <Input value={name} onChange={setName} placeholder="First name (optional)" />
      )}
      <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
      <Input value={password} onChange={setPassword} placeholder="Password" type="password" />

      <button onClick={mode==='signin'?handleSignIn:handleSignUp} disabled={loading} style={{
        width:'100%', padding:'12px', borderRadius:rr('md'), border:'none',
        background:loading?T.surface2:T.text, color:loading?T.text3:T.bg,
        fontSize:14, fontWeight:500, marginBottom:12,
      }}>
        {loading ? 'Please wait...' : mode==='signin' ? 'Sign in' : 'Create account'}
      </button>

      {mode==='signin' && (
        <button onClick={handleForgotPassword} style={{ background:'none', border:'none',
          color:T.text3, fontSize:13, marginBottom:16, cursor:'pointer' }}>
          Forgot password?
        </button>
      )}

      <div style={{ textAlign:'center', fontSize:13, color:T.text2 }}>
        {mode==='signin' ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={()=>{ setMode(mode==='signin'?'signup':'signin'); setError(''); setMessage('') }}
          style={{ background:'none', border:'none', color:T.text, fontWeight:500, cursor:'pointer', fontSize:13 }}>
          {mode==='signin' ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
