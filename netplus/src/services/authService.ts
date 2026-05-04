import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';

const USERS_COLLECTION = 'users';

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`, auth);
    return null;
  }
};

export const syncUserProfile = async (user: any) => {
  if (!user) return;
  
  try {
    const profile = await getUserProfile(user.uid);
    const isBootstrapAdmin = user.email === 'nimrp01@gmail.com' || user.email === 'dephawa363@gmail.com' || user.email === 'jackchang987@gmail.com';

    if (!profile) {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        role: isBootstrapAdmin ? 'admin' : 'viewer',
        active: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, USERS_COLLECTION, user.uid), newProfile);
    } else if (isBootstrapAdmin && profile.role !== 'admin' && profile.role !== 'superadmin') {
      // Force admin role for bootstrap user if not already set or not superadmin
      await setDoc(doc(db, USERS_COLLECTION, user.uid), { ...profile, role: 'admin' });
    }
  } catch (error) {
    console.error('Error syncing user profile:', error);
    // Even if sync fails, we might want to continue or show a specific error
    // But handleFirestoreError already re-throws, so we catch it here to prevent blocking
  }
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const docRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`, auth);
  });
};
