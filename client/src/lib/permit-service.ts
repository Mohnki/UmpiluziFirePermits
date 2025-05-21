import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp,
  and,
  or
} from "firebase/firestore";
import { firestore } from "./firebase";
import { BurnPermit, BurnBan, PermitStatus } from "./permit-types";
import { getAreaById } from "./area-service";
import { getBurnTypeById } from "./area-service";

// Collection references
const permitsCollection = collection(firestore, "burnPermits");
const bansCollection = collection(firestore, "burnBans");

// Convert Firestore timestamp to Date
const convertTimestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Convert Date to Firestore timestamp
const convertDateToTimestamp = (date: Date) => {
  return Timestamp.fromDate(date);
};

// Create a new burn permit
export const createBurnPermit = async (permit: Omit<BurnPermit, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<BurnPermit> => {
  try {
    // Check if there's a ban in place for this area on the requested dates
    const bans = await getBansForAreaAndDate(permit.areaId, permit.startDate);
    if (bans.length > 0) {
      throw new Error(`Burn permits are currently banned in this area until ${bans[0].endDate.toLocaleDateString()}. Reason: ${bans[0].reason}`);
    }

    // Get area to check if burn type is allowed
    const area = await getAreaById(permit.areaId);
    if (!area) {
      throw new Error("Area not found");
    }

    // Get burn type details
    const burnType = await getBurnTypeById(permit.burnTypeId);
    if (!burnType) {
      throw new Error("Burn type not found");
    }

    // Check if burn type is allowed in this area
    const isBurnTypeAllowed = area.allowedBurnTypes[permit.burnTypeId] !== undefined
      ? area.allowedBurnTypes[permit.burnTypeId]
      : burnType.defaultAllowed;

    if (!isBurnTypeAllowed) {
      throw new Error(`The burn type "${burnType.name}" is not allowed in this area.`);
    }

    // Auto-approve the permit if the burn type is allowed
    const status: PermitStatus = isBurnTypeAllowed ? "approved" : "pending";
    const now = new Date();

    const newPermitRef = doc(permitsCollection);
    const newPermit: BurnPermit = {
      ...permit,
      id: newPermitRef.id,
      status,
      createdAt: now,
      updatedAt: now
    };

    // If auto-approved, set approval fields
    if (status === "approved") {
      newPermit.approvedAt = now;
      newPermit.approvedBy = "system";
    }

    await setDoc(newPermitRef, {
      ...newPermit,
      startDate: convertDateToTimestamp(permit.startDate),
      endDate: convertDateToTimestamp(permit.endDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(status === "approved" ? { approvedAt: serverTimestamp() } : {})
    });

    return newPermit;
  } catch (error) {
    console.error("Error creating burn permit:", error);
    throw error;
  }
};

// Get a burn permit by ID
export const getPermitById = async (permitId: string): Promise<BurnPermit | null> => {
  try {
    const permitDoc = await getDoc(doc(firestore, "burnPermits", permitId));
    if (!permitDoc.exists()) {
      return null;
    }

    const data = permitDoc.data() as any;
    return {
      ...data,
      id: permitDoc.id,
      startDate: convertTimestampToDate(data.startDate),
      endDate: convertTimestampToDate(data.endDate),
      createdAt: convertTimestampToDate(data.createdAt),
      updatedAt: convertTimestampToDate(data.updatedAt),
      ...(data.approvedAt ? { approvedAt: convertTimestampToDate(data.approvedAt) } : {})
    } as BurnPermit;
  } catch (error) {
    console.error("Error getting burn permit:", error);
    throw error;
  }
};

// Get permits for a user
export const getPermitsByUser = async (userId: string): Promise<BurnPermit[]> => {
  try {
    const q = query(
      permitsCollection,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt),
        ...(data.approvedAt ? { approvedAt: convertTimestampToDate(data.approvedAt) } : {})
      } as BurnPermit;
    });
  } catch (error) {
    console.error("Error getting permits by user:", error);
    throw error;
  }
};

// Get permits for an area
export const getPermitsByArea = async (areaId: string): Promise<BurnPermit[]> => {
  try {
    const q = query(
      permitsCollection,
      where("areaId", "==", areaId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt),
        ...(data.approvedAt ? { approvedAt: convertTimestampToDate(data.approvedAt) } : {})
      } as BurnPermit;
    });
  } catch (error) {
    console.error("Error getting permits by area:", error);
    throw error;
  }
};

// Get active permits (permits with dates including today)
export const getActivePermits = async (areaId?: string): Promise<BurnPermit[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const conditions = [
      where("startDate", "<=", convertDateToTimestamp(today)),
      where("endDate", ">=", convertDateToTimestamp(today)),
      where("status", "==", "approved")
    ];
    
    if (areaId) {
      conditions.push(where("areaId", "==", areaId));
    }
    
    const q = query(permitsCollection, ...conditions);
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt),
        ...(data.approvedAt ? { approvedAt: convertTimestampToDate(data.approvedAt) } : {})
      } as BurnPermit;
    });
  } catch (error) {
    console.error("Error getting active permits:", error);
    throw error;
  }
};

// Update permit status
export const updatePermitStatus = async (
  permitId: string, 
  status: PermitStatus, 
  approverId?: string,
  rejectionReason?: string
): Promise<void> => {
  try {
    const permitRef = doc(firestore, "burnPermits", permitId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === "approved" && approverId) {
      updateData.approvedBy = approverId;
      updateData.approvedAt = serverTimestamp();
    } else if (status === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    await updateDoc(permitRef, updateData);
  } catch (error) {
    console.error("Error updating permit status:", error);
    throw error;
  }
};

// Create a burn ban for an area
export const createBurnBan = async (ban: Omit<BurnBan, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<BurnBan> => {
  try {
    const newBanRef = doc(bansCollection);
    const now = new Date();
    
    // Determine if the ban is currently active
    const isActive = ban.startDate <= now && ban.endDate >= now;
    
    const newBan: BurnBan = {
      ...ban,
      id: newBanRef.id,
      isActive,
      createdAt: now,
      updatedAt: now
    };
    
    await setDoc(newBanRef, {
      ...newBan,
      startDate: convertDateToTimestamp(ban.startDate),
      endDate: convertDateToTimestamp(ban.endDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return newBan;
  } catch (error) {
    console.error("Error creating burn ban:", error);
    throw error;
  }
};

// Get burn bans for an area
export const getBansByArea = async (areaId: string): Promise<BurnBan[]> => {
  try {
    const q = query(
      bansCollection,
      where("areaId", "==", areaId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        ...data,
        id: doc.id,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as BurnBan;
    });
  } catch (error) {
    console.error("Error getting bans by area:", error);
    throw error;
  }
};

// Get active bans (bans with dates including a specific date)
export const getBansForAreaAndDate = async (areaId: string, date: Date): Promise<BurnBan[]> => {
  try {
    const dateTimestamp = convertDateToTimestamp(date);
    
    // Query for area-specific bans that apply to the date
    const areaQuery = query(
      bansCollection,
      where("areaId", "==", areaId),
      where("startDate", "<=", dateTimestamp),
      where("endDate", ">=", dateTimestamp)
    );
    
    // Query for global bans that apply to the date
    const globalQuery = query(
      bansCollection,
      where("areaId", "==", "global"),
      where("startDate", "<=", dateTimestamp),
      where("endDate", ">=", dateTimestamp)
    );
    
    // Execute both queries
    const [areaSnapshot, globalSnapshot] = await Promise.all([
      getDocs(areaQuery),
      getDocs(globalQuery)
    ]);
    
    // Combine the results
    const bans: BurnBan[] = [];
    
    areaSnapshot.forEach(doc => {
      const data = doc.data() as any;
      bans.push({
        ...data,
        id: doc.id,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as BurnBan);
    });
    
    globalSnapshot.forEach(doc => {
      const data = doc.data() as any;
      bans.push({
        ...data,
        id: doc.id,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as BurnBan);
    });
    
    return bans;
  } catch (error) {
    console.error("Error getting bans for area and date:", error);
    throw error;
  }
};

// Update a burn ban
export const updateBurnBan = async (banId: string, updates: Partial<Omit<BurnBan, 'id' | 'createdAt' | 'createdBy' | 'updatedAt'>>): Promise<void> => {
  try {
    const banRef = doc(firestore, "burnBans", banId);
    
    // If dates are being updated, recalculate isActive
    if (updates.startDate || updates.endDate) {
      const banDoc = await getDoc(banRef);
      if (!banDoc.exists()) {
        throw new Error("Ban not found");
      }
      
      const banData = banDoc.data() as any;
      const startDate = updates.startDate || convertTimestampToDate(banData.startDate);
      const endDate = updates.endDate || convertTimestampToDate(banData.endDate);
      const now = new Date();
      
      updates.isActive = startDate <= now && endDate >= now;
    }
    
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Convert Date objects to Timestamps
    if (updates.startDate) {
      updateData.startDate = convertDateToTimestamp(updates.startDate);
    }
    
    if (updates.endDate) {
      updateData.endDate = convertDateToTimestamp(updates.endDate);
    }
    
    await updateDoc(banRef, updateData);
  } catch (error) {
    console.error("Error updating burn ban:", error);
    throw error;
  }
};

// Delete a burn ban
export const deleteBurnBan = async (banId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, "burnBans", banId));
  } catch (error) {
    console.error("Error deleting burn ban:", error);
    throw error;
  }
};