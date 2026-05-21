'use client'
import { useState, useEffect } from 'react'
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
        width:'100%', padding:'13px', borderRadius:rr('sm'), fontSize:15,
        border:`1px solid ${T.border}`, background:T.surface,
        color:T.text, outline:'none', marginBottom:12,
      }} />
  )
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // signin | setpassword | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Detect invite / password reset link on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setPasswordParam = params.get('setPassword')
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    if (setPasswordParam === 'true') {
      setMode('setpassword')
      return
    }

    // Handle token hash from email link directly
    if (tokenHash && type) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
        if (!error) setMode('setpassword')
        else setError('This link has expired. Please request a new one.')
      })
    }
  }, [])

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Incorrect email or password.')
    setLoading(false)
  }

  const handleSetPassword = async () => {
    if (!password) { setError('Please enter a password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Password set. You are now signed in.')
    // Clean up URL
    window.history.replaceState({}, '', '/')
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above first.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    })
    if (error) setError(error.message)
    else setMessage('Check your email for a password reset link.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth:430, margin:'0 auto', minHeight:'100dvh', background:T.bg,
      display:'flex', flexDirection:'column', justifyContent:'center', padding:'40px 24px' }}>

      <div style={{ marginBottom:40 }}>
        <div style={{ fontSize:28, fontWeight:500, color:T.text, letterSpacing:-.5, marginBottom:6 }}>
          {mode === 'setpassword' ? 'Set your password' : 'Welcome back.'}
        </div>
        <div style={{ fontSize:14, color:T.text2 }}>
          {mode === 'setpassword'
            ? 'Choose a password to secure your account.'
            : mode === 'forgot'
            ? 'Enter your email and we will send a reset link.'
            : 'Sign in to continue.'}
        </div>
      </div>

      {message && (
        <div style={{ background:'var(--green-bg)', border:`0.5px solid var(--green-dim)`, borderRadius:rr('sm'),
          padding:'10px 12px', fontSize:13, color:'var(--green)', marginBottom:16 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ background:'var(--coral-bg)', border:`0.5px solid var(--coral-dim)`, borderRadius:rr('sm'),
          padding:'10px 12px', fontSize:13, color:'var(--coral)', marginBottom:16 }}>
          {error}
        </div>
      )}

      {/* Sign in */}
      {mode === 'signin' && <>
        <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
        <Input value={password} onChange={setPassword} placeholder="Password" type="password" />
        <button onClick={handleSignIn} disabled={loading} style={{
          width:'100%', padding:'13px', borderRadius:rr('md'), border:'none',
          background:loading?T.surface2:T.text, color:loading?T.text3:T.bg,
          fontSize:14, fontWeight:600, marginBottom:12, cursor:'pointer',
        }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <button onClick={()=>{ setMode('forgot'); setError(''); setMessage('') }}
          style={{ background:'none', border:'none', color:T.text3, fontSize:13, cursor:'pointer', padding:0 }}>
          Forgot password?
        </button>
      </>}

      {/* Set password (invited users) */}
      {mode === 'setpassword' && <>
        <Input value={password} onChange={setPassword} placeholder="Choose a password" type="password" />
        <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" type="password" />
        <button onClick={handleSetPassword} disabled={loading} style={{
          width:'100%', padding:'13px', borderRadius:rr('md'), border:'none',
          background:loading?T.surface2:'var(--green-dim)', color:'#fff',
          fontSize:14, fontWeight:600, cursor:'pointer',
        }}>
          {loading ? 'Setting password...' : 'Set password and get started'}
        </button>
      </>}

      {/* Forgot password */}
      {mode === 'forgot' && <>
        <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
        <button onClick={handleForgotPassword} disabled={loading} style={{
          width:'100%', padding:'13px', borderRadius:rr('md'), border:'none',
          background:loading?T.surface2:T.text, color:loading?T.text3:T.bg,
          fontSize:14, fontWeight:600, marginBottom:12, cursor:'pointer',
        }}>
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
        <button onClick={()=>{ setMode('signin'); setError(''); setMessage('') }}
          style={{ background:'none', border:'none', color:T.text3, fontSize:13, cursor:'pointer', padding:0 }}>
          Back to sign in
        </button>
      </>}
    </div>
  )
}
