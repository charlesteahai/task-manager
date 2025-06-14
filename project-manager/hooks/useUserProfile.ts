import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/app/contexts/AuthContext';
import { getFirebaseServices } from '@/lib/firebase';

const { db } = getFirebaseServices();

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  hasCustomPhoto?: boolean;
  photoUpdatedAt?: number;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // Create base profile from Firebase Auth
    const baseProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    // Listen to Firestore document for extended profile data
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const firestoreData = doc.data();
          setUserProfile({
            ...baseProfile,
            // Override with Firestore data if available
            displayName: firestoreData.displayName || baseProfile.displayName,
            photoURL: firestoreData.photoURL || baseProfile.photoURL,
            hasCustomPhoto: firestoreData.hasCustomPhoto || false,
            photoUpdatedAt: firestoreData.photoUpdatedAt,
          });
        } else {
          setUserProfile(baseProfile);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user profile:', error);
        // Fallback to Firebase Auth data
        setUserProfile(baseProfile);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { userProfile, loading };
}; 