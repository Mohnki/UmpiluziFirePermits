import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { firestore } from "./firebase";
import { Area, BurnType } from "./area-types";
import { UserProfile } from "./firebase";

// Collection references
const areasCollection = collection(firestore, "areas");
const burnTypesCollection = collection(firestore, "burnTypes");

// Convert Firestore timestamp to Date
const convertTimestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Area Management
export const createArea = async (area: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Area> => {
  try {
    const newAreaRef = doc(areasCollection);
    
    const newArea: Area = {
      ...area,
      id: newAreaRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId
    };
    
    await setDoc(newAreaRef, {
      ...newArea,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return newArea;
  } catch (error) {
    console.error("Error creating area:", error);
    throw error;
  }
};

export const updateArea = async (areaId: string, updates: Partial<Omit<Area, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> => {
  try {
    const areaRef = doc(firestore, "areas", areaId);
    await updateDoc(areaRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating area:", error);
    throw error;
  }
};

export const deleteArea = async (areaId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "areas", areaId));
  } catch (error) {
    console.error("Error deleting area:", error);
    throw error;
  }
};

export const getAreaById = async (areaId: string): Promise<Area | null> => {
  try {
    const areaDoc = await getDoc(doc(firestore, "areas", areaId));
    
    if (!areaDoc.exists()) {
      return null;
    }
    
    const areaData = areaDoc.data() as any;
    return {
      ...areaData,
      id: areaDoc.id,
      createdAt: convertTimestampToDate(areaData.createdAt),
      updatedAt: convertTimestampToDate(areaData.updatedAt)
    } as Area;
  } catch (error) {
    console.error("Error getting area:", error);
    throw error;
  }
};

export const getAllAreas = async (): Promise<Area[]> => {
  try {
    const querySnapshot = await getDocs(query(areasCollection, orderBy("name")));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as Area;
    });
  } catch (error) {
    console.error("Error getting all areas:", error);
    throw error;
  }
};

export const getAreasByManager = async (managerId: string): Promise<Area[]> => {
  try {
    const q = query(areasCollection, where("areaManagerId", "==", managerId), orderBy("name"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as Area;
    });
  } catch (error) {
    console.error("Error getting areas by manager:", error);
    throw error;
  }
};

// Update burn type permissions for an area
export const updateAreaBurnTypes = async (areaId: string, burnTypePermissions: { [burnTypeId: string]: boolean }): Promise<void> => {
  try {
    const areaRef = doc(firestore, "areas", areaId);
    await updateDoc(areaRef, {
      allowedBurnTypes: burnTypePermissions,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating burn type permissions:", error);
    throw error;
  }
};

// Burn Type Management
export const createBurnType = async (burnType: Omit<BurnType, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<BurnType> => {
  try {
    const newBurnTypeRef = doc(burnTypesCollection);
    
    const newBurnType: BurnType = {
      ...burnType,
      id: newBurnTypeRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId
    };
    
    await setDoc(newBurnTypeRef, {
      ...newBurnType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return newBurnType;
  } catch (error) {
    console.error("Error creating burn type:", error);
    throw error;
  }
};

export const updateBurnType = async (burnTypeId: string, updates: Partial<Omit<BurnType, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> => {
  try {
    const burnTypeRef = doc(firestore, "burnTypes", burnTypeId);
    await updateDoc(burnTypeRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating burn type:", error);
    throw error;
  }
};

export const deleteBurnType = async (burnTypeId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "burnTypes", burnTypeId));
  } catch (error) {
    console.error("Error deleting burn type:", error);
    throw error;
  }
};

export const getBurnTypeById = async (burnTypeId: string): Promise<BurnType | null> => {
  try {
    const burnTypeDoc = await getDoc(doc(firestore, "burnTypes", burnTypeId));
    
    if (!burnTypeDoc.exists()) {
      return null;
    }
    
    const burnTypeData = burnTypeDoc.data() as any;
    return {
      ...burnTypeData,
      id: burnTypeDoc.id,
      createdAt: convertTimestampToDate(burnTypeData.createdAt),
      updatedAt: convertTimestampToDate(burnTypeData.updatedAt)
    } as BurnType;
  } catch (error) {
    console.error("Error getting burn type:", error);
    throw error;
  }
};

export const getAllBurnTypes = async (): Promise<BurnType[]> => {
  try {
    const querySnapshot = await getDocs(query(burnTypesCollection, orderBy("name")));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as BurnType;
    });
  } catch (error) {
    console.error("Error getting all burn types:", error);
    throw error;
  }
};