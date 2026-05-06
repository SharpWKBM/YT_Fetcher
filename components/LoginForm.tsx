import { useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from './LoginForm.module.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        onSuccess?.();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    await signIn(provider, { callbackUrl: '/' });
  };

  return (
    <div className={styles.loginForm}>
      <h2>Sign In</h2>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="your@email.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            placeholder="••••••••"
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <div className={styles.oauthButtons}>
        <button
          onClick={() => handleOAuthSignIn('google')}
          disabled={loading}
          className={styles.oauthBtn}
        >
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuthSignIn('github')}
          disabled={loading}
          className={styles.oauthBtn}
        >
          Continue with GitHub
        </button>
      </div>

      {onSwitchToRegister && (
        <p className={styles.switchText}>
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className={styles.switchBtn}>
            Sign up
          </button>
        </p>
      )}
    </div>
  );
}
