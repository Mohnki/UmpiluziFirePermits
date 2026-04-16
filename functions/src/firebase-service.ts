import admin from "firebase-admin";
import {
  getFirestore,
  Timestamp,
  Query,
} from "firebase-admin/firestore";
import {
  UserProfile,
  BurnPermit,
  Area,
  BurnType,
  Document as AppDocument,
  PermitQuery,
  AreaQuery,
} from "./schema";

if (!admin.apps.length) {
  // Cloud Functions auto-uses the default service account; no env key needed.
  admin.initializeApp();
}

const db = getFirestore();
export { admin, db };

const convertTimestampToDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export class AuthService {
  static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error("Invalid authentication token");
    }
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data()!;
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL || undefined,
      role: data.role,
      createdAt: convertTimestampToDate(data.createdAt),
      canManageBilling: data.canManageBilling || false,
    };
  }
}

export class PermitService {
  static async getPermits(query: PermitQuery): Promise<BurnPermit[]> {
    let permitQuery: Query = db.collection("burnPermits");

    if (query.includeHistorical && query.startDate) {
      permitQuery = permitQuery.where("createdAt", ">=", new Date(query.startDate));
    }
    if (query.includeHistorical && query.endDate) {
      permitQuery = permitQuery.where("createdAt", "<=", new Date(query.endDate));
    }

    if (query.userId) {
      permitQuery = permitQuery.where("userId", "==", query.userId);
    } else if (query.areaId) {
      permitQuery = permitQuery.where("areaId", "==", query.areaId);
    } else if (query.status) {
      permitQuery = permitQuery.where("status", "==", query.status);
    }

    permitQuery = permitQuery.orderBy("createdAt", "desc");

    const limit = query.limit || (query.includeHistorical ? 5000 : 100);
    permitQuery = permitQuery.limit(limit);

    const snapshot = await permitQuery.get();

    let permits: BurnPermit[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        farmId: data.farmId || "",
        burnTypeId: data.burnTypeId,
        areaId: data.areaId,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        status: data.status,
        location: data.location || { latitude: 0, longitude: 0 },
        details: data.details,
        compartment: data.compartment,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt ? convertTimestampToDate(data.approvedAt) : undefined,
        rejectionReason: data.rejectionReason,
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt),
      };
    });

    permits = permits.filter((permit) => {
      if (!query.includeHistorical) {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        if (permit.startDate < startOfDay || permit.startDate >= endOfDay) return false;
      }

      if (query.userId && permit.userId !== query.userId) return false;
      if (query.areaId && permit.areaId !== query.areaId) return false;
      if (query.status && permit.status !== query.status) return false;
      if (query.burnTypeId && permit.burnTypeId !== query.burnTypeId) return false;
      if (
        query.compartment &&
        permit.compartment &&
        !permit.compartment.toLowerCase().includes(query.compartment.toLowerCase())
      )
        return false;

      if (query.startDate && query.includeHistorical) {
        if (permit.startDate < new Date(query.startDate)) return false;
      }
      if (query.endDate && query.includeHistorical) {
        if (permit.endDate > new Date(query.endDate)) return false;
      }

      return true;
    });

    permits.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    if (query.location) {
      permits = PermitService.filterByLocation(permits, query.location);
    }

    if (query.offset) permits = permits.slice(query.offset);
    if (query.limit) permits = permits.slice(0, query.limit);

    return permits;
  }

  private static filterByLocation(
    permits: BurnPermit[],
    loc: { latitude: number; longitude: number; radius?: number }
  ): BurnPermit[] {
    const radius = loc.radius || 10;
    return permits.filter((permit) => {
      if (!permit.location) return false;
      const distance = PermitService.haversine(
        loc.latitude,
        loc.longitude,
        permit.location.latitude,
        permit.location.longitude
      );
      return distance <= radius;
    });
  }

  private static haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (d: number) => d * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  static async getPermitById(permitId: string): Promise<BurnPermit | null> {
    const permitDoc = await db.collection("burnPermits").doc(permitId).get();
    if (!permitDoc.exists) return null;
    const data = permitDoc.data()!;
    return {
      id: permitDoc.id,
      userId: data.userId,
      farmId: data.farmId || "",
      burnTypeId: data.burnTypeId,
      areaId: data.areaId,
      startDate: convertTimestampToDate(data.startDate),
      endDate: convertTimestampToDate(data.endDate),
      status: data.status,
      location: data.location,
      details: data.details,
      compartment: data.compartment,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? convertTimestampToDate(data.approvedAt) : undefined,
      rejectionReason: data.rejectionReason,
      createdAt: convertTimestampToDate(data.createdAt),
      updatedAt: convertTimestampToDate(data.updatedAt),
    };
  }
}

export class AreaService {
  static async getAllAreas(query?: AreaQuery): Promise<Area[]> {
    let areaQuery: Query = db.collection("areas");
    if (query?.managerId) {
      areaQuery = areaQuery.where("areaManagerId", "==", query.managerId);
    }
    areaQuery = areaQuery.orderBy("name", "asc");
    if (query?.limit) areaQuery = areaQuery.limit(query.limit);
    if (query?.offset) areaQuery = areaQuery.offset(query.offset);

    const snapshot = await areaQuery.get();
    let areas: Area[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        areaManagerId: data.areaManagerId,
        location: data.location || { latitude: 0, longitude: 0 },
        allowedBurnTypes: data.allowedBurnTypes || {},
        createdAt: convertTimestampToDate(data.createdAt),
        createdBy: data.createdBy,
        updatedAt: convertTimestampToDate(data.updatedAt),
      };
    });

    if (query?.location) {
      const radius = query.location.radius || 50;
      const { latitude, longitude } = query.location;
      areas = areas.filter((area) => {
        if (!area.location) return false;
        const R = 6371;
        const toRad = (d: number) => d * (Math.PI / 180);
        const dLat = toRad(area.location.latitude - latitude);
        const dLon = toRad(area.location.longitude - longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(latitude)) *
            Math.cos(toRad(area.location.latitude)) *
            Math.sin(dLon / 2) ** 2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return distance <= radius;
      });
    }

    if (query?.allowedBurnType) {
      areas = areas.filter(
        (area) => area.allowedBurnTypes[query.allowedBurnType!] === true
      );
    }

    if (query?.hasActiveBans !== undefined) {
      const filtered: Area[] = [];
      for (const area of areas) {
        const bans = await AreaService.getActiveBansForArea(area.id);
        if (query.hasActiveBans ? bans.length > 0 : bans.length === 0) {
          filtered.push(area);
        }
      }
      areas = filtered;
    }

    return areas;
  }

  private static async getActiveBansForArea(areaId: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    try {
      const now = new Date();
      const snapshot = await db
        .collection("burnBans")
        .where("areaId", "==", areaId)
        .where("isActive", "==", true)
        .where("startDate", "<=", Timestamp.fromDate(now))
        .where("endDate", ">=", Timestamp.fromDate(now))
        .get();
      return snapshot.docs;
    } catch (error) {
      console.error("Error getting active bans for area:", areaId, error);
      return [];
    }
  }

  static async getAreaById(areaId: string): Promise<Area | null> {
    const areaDoc = await db.collection("areas").doc(areaId).get();
    if (!areaDoc.exists) return null;
    const data = areaDoc.data()!;
    return {
      id: areaDoc.id,
      name: data.name,
      description: data.description,
      areaManagerId: data.areaManagerId,
      location: data.location,
      allowedBurnTypes: data.allowedBurnTypes,
      createdAt: convertTimestampToDate(data.createdAt),
      createdBy: data.createdBy,
      updatedAt: convertTimestampToDate(data.updatedAt),
    };
  }
}

export class BurnTypeService {
  static async getAllBurnTypes(): Promise<BurnType[]> {
    const snapshot = await db.collection("burnTypes").get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        defaultAllowed: data.defaultAllowed,
        requiresPermit: data.requiresPermit,
        createdAt: convertTimestampToDate(data.createdAt),
        createdBy: data.createdBy,
        updatedAt: convertTimestampToDate(data.updatedAt),
      };
    });
  }

  static async getBurnTypeById(id: string): Promise<BurnType | null> {
    const doc = await db.collection("burnTypes").doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      defaultAllowed: data.defaultAllowed,
      requiresPermit: data.requiresPermit,
      createdAt: convertTimestampToDate(data.createdAt),
      createdBy: data.createdBy,
      updatedAt: convertTimestampToDate(data.updatedAt),
    };
  }
}

export class DocumentService {
  static async getAllDocuments(): Promise<AppDocument[]> {
    const snapshot = await db.collection("documents").orderBy("uploadedAt", "desc").get();
    return snapshot.docs.map((doc) => DocumentService.mapDoc(doc));
  }

  static async getPublicDocuments(): Promise<AppDocument[]> {
    const snapshot = await db
      .collection("documents")
      .where("isPublic", "==", true)
      .orderBy("uploadedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => DocumentService.mapDoc(doc));
  }

  static async getDocumentById(id: string): Promise<AppDocument | null> {
    const doc = await db.collection("documents").doc(id).get();
    if (!doc.exists) return null;
    return DocumentService.mapDoc(doc as any);
  }

  static async createDocument(
    document: Omit<AppDocument, "id" | "uploadedAt" | "downloadCount">
  ): Promise<AppDocument> {
    const docRef = await db.collection("documents").add({
      ...document,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      downloadCount: 0,
    });
    const doc = await docRef.get();
    return DocumentService.mapDoc(doc as any);
  }

  static async updateDocument(
    id: string,
    updates: Partial<Omit<AppDocument, "id" | "uploadedAt" | "uploadedBy">>
  ): Promise<void> {
    await db.collection("documents").doc(id).update(updates as any);
  }

  static async deleteDocument(id: string): Promise<void> {
    await db.collection("documents").doc(id).delete();
  }

  static async incrementDownloadCount(id: string): Promise<void> {
    await db.collection("documents").doc(id).update({
      downloadCount: admin.firestore.FieldValue.increment(1),
    });
  }

  private static mapDoc(doc: FirebaseFirestore.DocumentSnapshot): AppDocument {
    const data = doc.data()!;
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      uploadedBy: data.uploadedBy,
      uploadedAt: convertTimestampToDate(data.uploadedAt),
      isPublic: data.isPublic || false,
      downloadCount: data.downloadCount || 0,
      storagePath: data.storagePath,
    };
  }
}
