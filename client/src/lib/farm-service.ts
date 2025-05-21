import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
import { Farm } from './area-types';

const convertTimestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

const farmsCollection = collection(firestore, 'farms');

// Create a new farm
export const createFarm = async (farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm> => {
  try {
    const docRef = await addDoc(farmsCollection, {
      ...farm,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const newFarm: Farm = {
      ...farm,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return newFarm;
  } catch (error) {
    console.error('Error creating farm:', error);
    throw error;
  }
};

// Update an existing farm
export const updateFarm = async (farmId: string, updates: Partial<Omit<Farm, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  try {
    const farmRef = doc(firestore, 'farms', farmId);
    await updateDoc(farmRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating farm:', error);
    throw error;
  }
};

// Delete a farm
export const deleteFarm = async (farmId: string): Promise<void> => {
  try {
    const farmRef = doc(firestore, 'farms', farmId);
    await deleteDoc(farmRef);
  } catch (error) {
    console.error('Error deleting farm:', error);
    throw error;
  }
};

// Get a farm by ID
export const getFarmById = async (farmId: string): Promise<Farm | null> => {
  try {
    const farmRef = doc(firestore, 'farms', farmId);
    const farmSnap = await getDoc(farmRef);
    
    if (farmSnap.exists()) {
      const farmData = farmSnap.data();
      return {
        id: farmSnap.id,
        ...farmData,
        createdAt: farmData.createdAt ? convertTimestampToDate(farmData.createdAt) : new Date(),
        updatedAt: farmData.updatedAt ? convertTimestampToDate(farmData.updatedAt) : new Date()
      } as Farm;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting farm:', error);
    throw error;
  }
};

// Get all farms for a user
export const getFarmsByUser = async (userId: string): Promise<Farm[]> => {
  try {
    const q = query(farmsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const farms: Farm[] = [];
    querySnapshot.forEach((doc) => {
      const farmData = doc.data();
      farms.push({
        id: doc.id,
        ...farmData,
        createdAt: farmData.createdAt ? convertTimestampToDate(farmData.createdAt) : new Date(),
        updatedAt: farmData.updatedAt ? convertTimestampToDate(farmData.updatedAt) : new Date()
      } as Farm);
    });
    
    return farms;
  } catch (error) {
    console.error('Error getting farms for user:', error);
    throw error;
  }
};

// Get all farms in a specific area
export const getFarmsByArea = async (areaId: string): Promise<Farm[]> => {
  try {
    const q = query(farmsCollection, where('areaId', '==', areaId));
    const querySnapshot = await getDocs(q);
    
    const farms: Farm[] = [];
    querySnapshot.forEach((doc) => {
      const farmData = doc.data();
      farms.push({
        id: doc.id,
        ...farmData,
        createdAt: farmData.createdAt ? convertTimestampToDate(farmData.createdAt) : new Date(),
        updatedAt: farmData.updatedAt ? convertTimestampToDate(farmData.updatedAt) : new Date()
      } as Farm);
    });
    
    return farms;
  } catch (error) {
    console.error('Error getting farms for area:', error);
    throw error;
  }
};