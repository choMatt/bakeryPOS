
import { useState } from 'react'
import './Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (onLogin(username, password)) {
      return
    }

    setError('Incorrect username or password.')
    setPassword('')
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img
            src="/apple-touch-icon.png"
            alt="Flava & Flour"
            className="login-logo"
          />
        </div>
        <p className="login-subtitle">
          Log in to continue to your bakery POS.
        </p>

        <label>
          Username
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
            required
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            required
          />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button className="login-submit" type="submit">
          Log in
        </button>
      </form>
    </main>
  )
}
