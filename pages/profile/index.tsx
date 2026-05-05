import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/effects.module.css';
import animations from '@/styles/animations.module.css';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_status: string | null;
  two_factor_enabled: number;
  created_at: string;
  preferences: {
    email_notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={animations.shimmer}>Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    enterprise: 'bg-purple-100 text-purple-800',
  };

  return (
    <>
      <Head>
        <title>Profile - YouTube Finder</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8 mb-6`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-6">
                {/* Avatar */}
                <div className={`${animations.scaleBounce} relative`}>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name || 'User'}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                      {profile.name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full ${profile.two_factor_enabled ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center border-2 border-white`}>
                    {profile.two_factor_enabled ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {profile.name || 'Anonymous User'}
                  </h1>
                  <p className="text-gray-600 mb-3">{profile.email}</p>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierColors[profile.subscription_tier]}`}>
                      {profile.subscription_tier.toUpperCase()}
                    </span>
                    {profile.two_factor_enabled === 1 && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        2FA Enabled
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <Link
                href="/profile/edit"
                className={`${animations.glowPulse} px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg`}
              >
                Edit Profile
              </Link>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-700">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-xl p-6 text-center`} style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                {profile.subscription_tier === 'free' ? '10' : profile.subscription_tier === 'pro' ? '1,000' : '∞'}
              </div>
              <div className="text-gray-600 text-sm">Channels/Month</div>
            </div>

            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-xl p-6 text-center`} style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
              <div className="text-gray-600 text-sm">Member Since</div>
            </div>

            <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-xl p-6 text-center`} style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl font-bold text-pink-600 mb-2">
                {profile.subscription_status === 'active' ? 'Active' : 'Inactive'}
              </div>
              <div className="text-gray-600 text-sm">Subscription Status</div>
            </div>
          </div>

          {/* Preferences */}
          <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8`} style={{ animationDelay: '0.4s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-600">Receive updates about your account</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${profile.preferences.email_notifications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {profile.preferences.email_notifications ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">Theme</div>
                  <div className="text-sm text-gray-600">Interface appearance</div>
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 capitalize">
                  {profile.preferences.theme}
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-gray-900">Language</div>
                  <div className="text-sm text-gray-600">Interface language</div>
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 uppercase">
                  {profile.preferences.language}
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className={`${styles.liquidGlass} ${animations.fadeInUp} rounded-2xl p-8 mt-6`} style={{ animationDelay: '0.5s' }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-600">Add an extra layer of security</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${profile.two_factor_enabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {profile.two_factor_enabled ? 'Enabled' : 'Not Enabled'}
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-gray-900">Password</div>
                  <div className="text-sm text-gray-600">Last changed recently</div>
                </div>
                <Link
                  href="/profile/edit#security"
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Change Password
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
