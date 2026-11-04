'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { Button, Field, TextInput, HaleMark } from './ui'

export default function AuthScreen() {
  const [mode, setMode] = useState('signin') // signin | signup | setpassword | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setPasswordParam = params.get('setPassword')
    const tokenHash = params.get('token_hash')
    const type = params.get('type')

    if (setPasswordParam === 'true') {
      setMode('setpassword')
      return
    }
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

  const handleSignUp = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setMessage('Check your email to confirm your account, then sign in.')
    setLoading(false)
  }

  const handleSetPassword = async () => {
    if (!password) { setError('Please enter a password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    window.history.replaceState({}, '', '/')
    // Session is already active after updateUser — onAuthStateChange will fire
    setMessage('Password set. Getting you in...')
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

  const switchTo = m => { setMode(m); setError(''); setMessage('') }
  const titles = {
    signin:      ['Welcome back.', 'Sign in to pick up where you left off.'],
    signup:      ['Create your account.', 'Feel better without overthinking it.'],
    setpassword: ['Set your password.', 'Choose a password to secure your account.'],
    forgot:      ['Reset your password.', "Enter your email and we'll send a link."],
  }
  const [title, sub] = titles[mode]
  const submit = { signin:handleSignIn, signup:handleSignUp, setpassword:handleSetPassword, forgot:handleForgotPassword }[mode]
  const cta = {
    signin:      loading ? 'Signing in' : 'Sign in',
    signup:      loading ? 'Creating your account' : 'Create account',
    setpassword: loading ? 'Saving' : 'Set password and continue',
    forgot:      loading ? 'Sending' : 'Send reset link',
  }[mode]
  const linkBtn = { border:'none', background:'none', padding:0, minHeight:44, color:'var(--c-accent-text)', fontSize:15, fontWeight:500 }

  return (
    <div style={{ maxWidth:'var(--app-max)', margin:'0 auto', minHeight:'100dvh', display:'flex', flexDirection:'column', justifyContent:'center', padding:'48px var(--edge)' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:24, marginBottom:32 }}>
        <HaleMark size={48} />
        <div>
          <h1 className="t-title1">{title}</h1>
          <p className="t-body c-2" style={{ marginTop:8 }}>{sub}</p>
        </div>
      </div>

      {message && (
        <div role="status" className="t-subhead" style={{ background:'var(--c-done-soft)', color:'var(--c-done)', borderRadius:'var(--r-input)', padding:'12px 14px', marginBottom:16 }}>{message}</div>
      )}
      {error && (
        <div role="alert" className="t-subhead" style={{ background:'var(--c-danger-soft)', color:'var(--c-danger)', borderRadius:'var(--r-input)', padding:'12px 14px', marginBottom:16 }}>{error}</div>
      )}

      <form onSubmit={e=>{ e.preventDefault(); submit() }} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {mode !== 'setpassword' && (
          <Field label="Email" htmlFor="auth-email">
            <TextInput id="auth-email" type="email" value={email} onChange={setEmail} autoComplete="email" inputMode="email" placeholder="you@example.com" />
          </Field>
        )}
        {mode !== 'forgot' && (
          <Field label={mode==='setpassword' ? 'New password' : 'Password'} htmlFor="auth-pw">
            <TextInput id="auth-pw" type="password" value={password} onChange={setPassword}
              autoComplete={mode==='signin' ? 'current-password' : 'new-password'} />
          </Field>
        )}
        {(mode === 'signup' || mode === 'setpassword') && (
          <Field label="Confirm password" htmlFor="auth-pw2" hint="At least 6 characters.">
            <TextInput id="auth-pw2" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
          </Field>
        )}
        <Button type="submit" full disabled={loading} style={{ marginTop:8 }}>{cta}</Button>
      </form>

      <div style={{ display:'flex', justifyContent: mode==='signin' ? 'space-between' : 'center', marginTop:12 }}>
        {mode === 'signin' && <>
          <button type="button" style={linkBtn} onClick={()=>switchTo('forgot')}>Forgot password?</button>
          <button type="button" style={linkBtn} onClick={()=>switchTo('signup')}>Create account</button>
        </>}
        {mode === 'signup' && <button type="button" style={linkBtn} onClick={()=>switchTo('signin')}>Already have an account? Sign in</button>}
        {mode === 'forgot' && <button type="button" style={linkBtn} onClick={()=>switchTo('signin')}>Back to sign in</button>}
      </div>
    </div>
  )
}
