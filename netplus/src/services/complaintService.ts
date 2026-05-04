import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Complaint } from '../types';

const COLLECTION_NAME = 'complaints';

export const getComplaints = (callback: (complaints: Complaint[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const complaints = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Complaint[];
    callback(complaints);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME, auth);
  });
};

export const getSiteComplaints = (siteId: string, callback: (complaints: Complaint[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where('siteId', '==', siteId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const complaints = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Complaint[];
    callback(complaints);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME, auth);
  });
};

export const createComplaint = async (complaint: Partial<Complaint>) => {
  try {
    const data = {
      ...complaint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME, auth);
  }
};

export const updateComplaint = async (id: string, complaint: Partial<Complaint>) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const data = {
      ...complaint,
      updatedAt: serverTimestamp()
    };
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`, auth);
  }
};
