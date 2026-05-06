import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from '../styles/Profile.module.css';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import BlacklistManager from '@/components/BlacklistManager';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.success) {
        setProfile(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email || '');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Name updated successfully');
        fetchProfile();
      } else {
        setError(data.error || 'Failed to update name');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/user/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Email updated successfully');
        fetchProfile();
      } else {
        setError(data.error || 'Failed to update email');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !profile) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>Profile Settings</h1>

        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.section}>
          <h2>Subscription</h2>
          <SubscriptionStatus />
        </section>

        <section className={styles.section}>
          <h2>Account Information</h2>
          <div className={styles.info}>
            <p><strong>Tier:</strong> {profile.tier}</p>
            <p><strong>Member since:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Update Name</h2>
          <form onSubmit={handleUpdateName}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.btn}>
              Update Name
            </button>
          </form>
        </section>

        <section className={styles.section}>
          <h2>Update Email</h2>
          <form onSubmit={handleUpdateEmail}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.btn}>
              Update Email
            </button>
          </form>
        </section>

        <section className={styles.section}>
          <h2>Change Password</h2>
          <form onSubmit={handleUpdatePassword}>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" disabled={loading} className={styles.btn}>
              Change Password
            </button>
          </form>
        </section>

        <section className={styles.section}>
          <h2>Blacklisted Channels</h2>
          <BlacklistManager />
        </section>
      </div>
    </div>
  );
}
