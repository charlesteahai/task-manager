"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is determined
    if (!loading) {
      if (user) {
        // If user is logged in, redirect to the dashboard
        router.push('/dashboard');
      } else {
        // If user is not logged in, redirect to the login page
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Render a loading state while checking for authentication
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading...</p>
    </div>
  );
}
