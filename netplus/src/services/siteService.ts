import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Site } from '../types';

const COLLECTION_NAME = 'sites';

export const getSites = (callback: (sites: Site[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('siteId', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const sites = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Site[];
    callback(sites);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME, auth);
  });
};

export const getSite = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Site;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`, auth);
  }
};

export const subscribeToSite = (id: string, callback: (site: Site | null) => void) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Site);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${COLLECTION_NAME}/${id}`, auth);
  });
};

export const createSite = async (site: Partial<Site>) => {
  try {
    const data = {
      ...site,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    };
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME, auth);
  }
};

export const updateSite = async (id: string, site: Partial<Site>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const data = {
      ...site,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email || 'unknown'
    };
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`, auth);
  }
};

export const deleteSite = async (id: string) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`, auth);
  }
};
