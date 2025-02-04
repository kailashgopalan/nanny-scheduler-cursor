import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { User } from '../../types';
import { auth, db } from '../../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  linkNannyToEmployer: (nannyId: string, employerId: string) => Promise<void>;
  unlinkNannyFromEmployer: (nannyId: string, employerId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, linkNannyToEmployer: async () => {}, unlinkNannyFromEmployer: async () => {} });

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser);

      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        console.log('User doc:', userDoc.data());
        
        if (!userDoc.exists()) {
          console.log('Creating new user document');
          const role = window.confirm('Are you a nanny? Click OK for nanny, Cancel for employer') ? 'nanny' : 'employer';
          
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Anonymous User',
            role,
            createdAt: new Date(),
            linkedNannies: [],
            linkedEmployers: [],
            pendingNannies: [],
            pendingEmployers: [],
            ...(role === 'nanny' ? { hourlyRate: parseFloat(prompt('What is your hourly rate?') || '0') } : {})
          } as User;

          console.log('Creating user with data:', userData);
          await setDoc(doc(db, 'users', firebaseUser.uid), userData);
          setCurrentUser(userData);
        } else {
          // When loading existing user, ensure all arrays exist
          const existingData = userDoc.data();
          console.log('Loading existing user data:', existingData);
          
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            ...existingData,
            linkedNannies: existingData.linkedNannies || [],
            linkedEmployers: existingData.linkedEmployers || [],
            pendingNannies: existingData.pendingNannies || [],
            pendingEmployers: existingData.pendingEmployers || []
          } as User;

          console.log('Processed user data:', userData);
          setCurrentUser(userData);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const linkNannyToEmployer = async (nannyId: string, employerId: string) => {
    try {
      const nannyRef = doc(db, 'users', nannyId);
      const employerRef = doc(db, 'users', employerId);

      if (currentUser?.role === 'employer') {
        // Employer initiating the link
        await updateDoc(nannyRef, {
          pendingEmployers: arrayUnion(employerId)
        });
      } else {
        // Nanny accepting the link
        const batch = writeBatch(db);
        
        // Update nanny's document
        batch.update(nannyRef, {
          linkedEmployers: arrayUnion(employerId),
          pendingEmployers: arrayRemove(employerId)
        });

        // Update employer's document
        batch.update(employerRef, {
          linkedNannies: arrayUnion(nannyId)
        });

        await batch.commit();

        // Update local state
        setCurrentUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            linkedEmployers: [...(prev.linkedEmployers || []), employerId],
            pendingEmployers: prev.pendingEmployers?.filter(id => id !== employerId) || []
          };
        });
      }
    } catch (error) {
      console.error('Error linking nanny to employer:', error);
      throw error;
    }
  };

  const unlinkNannyFromEmployer = async (nannyId: string, employerId: string) => {
    try {
      const employerRef = doc(db, 'users', employerId);
      const nannyRef = doc(db, 'users', nannyId);

      // Update employer's linkedNannies
      await updateDoc(employerRef, {
        linkedNannies: arrayRemove(nannyId)
      });

      // Update nanny's linkedEmployers
      await updateDoc(nannyRef, {
        linkedEmployers: arrayRemove(employerId)
      });

      // Update local state if current user is involved
      if (currentUser) {
        if (currentUser.uid === employerId) {
          setCurrentUser(prev => ({
            ...prev!,
            linkedNannies: prev?.linkedNannies?.filter(id => id !== nannyId) || []
          }));
        } else if (currentUser.uid === nannyId) {
          setCurrentUser(prev => ({
            ...prev!,
            linkedEmployers: prev?.linkedEmployers?.filter(id => id !== employerId) || []
          }));
        }
      }
    } catch (error) {
      console.error('Error unlinking nanny from employer:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading,
      linkNannyToEmployer,
      unlinkNannyFromEmployer
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 