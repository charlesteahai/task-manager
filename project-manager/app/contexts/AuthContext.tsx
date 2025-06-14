"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  UserCredential,
} from "firebase/auth";
import { getFirebaseServices } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, pass: string) => Promise<UserCredential | void>;
  signIn: (email: string, pass: string) => Promise<UserCredential | void>;
  signInWithGoogle: () => Promise<UserCredential | void>;
  signOut: () => Promise<void>;
  handleAuthError: (error: unknown, context: string) => void;
  refreshUser: () => void;
  notifications: {id: string, name: string}[];
  setNotifications: React.Dispatch<React.SetStateAction<{id: string, name: string}[]>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  handleAuthError: () => {},
  refreshUser: () => {},
  notifications: [],
  setNotifications: () => {},
});

const { auth, db } = getFirebaseServices();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [notifications, setNotifications] = useState<{id: string, name: string}[]>([]);

  const createUserDocument = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }, { merge: true });
    } catch (error) {
      console.error("Error creating user document:", error);
      // Don't throw error - this shouldn't block the auth flow
    }
  };

  const handleAuthError = (error: unknown, context: string) => {
    console.error(`Auth error during ${context}:`, error);
    let message = "An unexpected error occurred. Please try again.";
    
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "This email is already in use. Please use a different email or log in.";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
          message = "Invalid email or password. Please try again.";
          break;
        case "auth/invalid-email":
          message = "The email address is not valid.";
          break;
        case "auth/user-disabled":
          message = "This user account has been disabled.";
          break;
        case "auth/too-many-requests":
          message = "Too many attempts. Please try again later.";
          break;
        case "auth/popup-closed-by-user":
          message = "The sign-in popup was closed before completion.";
          break;
        default:
          message = error.message;
          break;
      }
    }
    
    toast.error("Authentication Failed", {
      description: message,
    });
  };

  const signUp = async (email: string, pass: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        if (userCredential.user) {
          // Create user document in background - don't wait for it
          createUserDocument(userCredential.user);
          toast.success("Account created successfully!");
          router.push("/dashboard");
        }
        return userCredential;
    } catch (error: unknown) {
        handleAuthError(error, "sign-up");
    }
  }

  const signIn = async (email: string, pass: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        if (userCredential.user) {
          toast.success("Signed in successfully!");
          router.push("/dashboard");
        }
        return userCredential;
    } catch (error: unknown) {
        handleAuthError(error, "sign-in");
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        // Create user document in background - don't wait for it
        createUserDocument(result.user);
        toast.success("Signed in successfully!");
        router.push("/dashboard");
      }
      return result;
    } catch (error: unknown) {
      handleAuthError(error, "sign-in-with-google");
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      router.push("/login");
    } catch (error: unknown) {
      console.error("Error signing out: ", error);
      handleAuthError(error, "sign-out");
    }
  }

  const refreshUser = () => {
    // Force refresh the current user data
    if (auth.currentUser) {
      auth.currentUser.reload().then(() => {
        setUser(auth.currentUser);
      });
    }
  };

  useEffect(() => {
    // Simple auth state listener - just use the Firebase user directly
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    handleAuthError,
    refreshUser,
    notifications,
    setNotifications
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 