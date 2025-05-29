import admin from 'firebase-admin';
import { 
  getFirestore, 
  Timestamp, 
  Query, 
  WhereFilterOp 
} from 'firebase-admin/firestore';
import { 
  UserProfile, 
  BurnPermit, 
  Area, 
  BurnType, 
  PermitQuery 
} from '../shared/schema';

// Initialize Firebase Admin
if (!admin.apps.length) {
  // For production, you would use a service account key
  // For development, this will use the default credentials
  admin.initializeApp({
    projectId: "umpiluzi-fire-permits",
  });
}

const db = getFirestore();

// Helper function to convert Firestore Timestamp to Date
const convertTimestampToDate = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Authentication service
export class AuthService {
  static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const data = userDoc.data()!;
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL || undefined,
        role: data.role,
        createdAt: convertTimestampToDate(data.createdAt),
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to get user profile');
    }
  }
}

// Permit service
export class PermitService {
  static async getPermits(query: PermitQuery): Promise<BurnPermit[]> {
    try {
      let permitQuery: Query = db.collection('burnPermits');

      // Apply filters
      if (query.userId) {
        permitQuery = permitQuery.where('userId', '==', query.userId);
      }
      if (query.areaId) {
        permitQuery = permitQuery.where('areaId', '==', query.areaId);
      }
      if (query.status) {
        permitQuery = permitQuery.where('status', '==', query.status);
      }
      if (query.startDate) {
        const startDate = new Date(query.startDate);
        permitQuery = permitQuery.where('startDate', '>=', Timestamp.fromDate(startDate));
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        permitQuery = permitQuery.where('endDate', '<=', Timestamp.fromDate(endDate));
      }

      // Apply ordering and pagination
      permitQuery = permitQuery.orderBy('createdAt', 'desc');
      
      if (query.limit) {
        permitQuery = permitQuery.limit(query.limit);
      }
      if (query.offset) {
        permitQuery = permitQuery.offset(query.offset);
      }

      const snapshot = await permitQuery.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          burnTypeId: data.burnTypeId,
          areaId: data.areaId,
          startDate: convertTimestampToDate(data.startDate),
          endDate: convertTimestampToDate(data.endDate),
          status: data.status,
          location: data.location,
          details: data.details,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt ? convertTimestampToDate(data.approvedAt) : undefined,
          rejectionReason: data.rejectionReason,
          createdAt: convertTimestampToDate(data.createdAt),
          updatedAt: convertTimestampToDate(data.updatedAt),
        };
      });
    } catch (error) {
      console.error('Error getting permits:', error);
      throw new Error('Failed to retrieve permits');
    }
  }

  static async getPermitById(permitId: string): Promise<BurnPermit | null> {
    try {
      const permitDoc = await db.collection('burnPermits').doc(permitId).get();
      
      if (!permitDoc.exists) {
        return null;
      }

      const data = permitDoc.data()!;
      return {
        id: permitDoc.id,
        userId: data.userId,
        burnTypeId: data.burnTypeId,
        areaId: data.areaId,
        startDate: convertTimestampToDate(data.startDate),
        endDate: convertTimestampToDate(data.endDate),
        status: data.status,
        location: data.location,
        details: data.details,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt ? convertTimestampToDate(data.approvedAt) : undefined,
        rejectionReason: data.rejectionReason,
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt),
      };
    } catch (error) {
      console.error('Error getting permit by ID:', error);
      throw new Error('Failed to retrieve permit');
    }
  }
}

// Area service
export class AreaService {
  static async getAllAreas(): Promise<Area[]> {
    try {
      const snapshot = await db.collection('areas').get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          areaManagerId: data.areaManagerId,
          location: data.location,
          allowedBurnTypes: data.allowedBurnTypes,
          createdAt: convertTimestampToDate(data.createdAt),
          createdBy: data.createdBy,
          updatedAt: convertTimestampToDate(data.updatedAt),
        };
      });
    } catch (error) {
      console.error('Error getting areas:', error);
      throw new Error('Failed to retrieve areas');
    }
  }

  static async getAreaById(areaId: string): Promise<Area | null> {
    try {
      const areaDoc = await db.collection('areas').doc(areaId).get();
      
      if (!areaDoc.exists) {
        return null;
      }

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
    } catch (error) {
      console.error('Error getting area by ID:', error);
      throw new Error('Failed to retrieve area');
    }
  }
}

// Burn type service
export class BurnTypeService {
  static async getAllBurnTypes(): Promise<BurnType[]> {
    try {
      const snapshot = await db.collection('burnTypes').get();
      
      return snapshot.docs.map(doc => {
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
    } catch (error) {
      console.error('Error getting burn types:', error);
      throw new Error('Failed to retrieve burn types');
    }
  }

  static async getBurnTypeById(burnTypeId: string): Promise<BurnType | null> {
    try {
      const burnTypeDoc = await db.collection('burnTypes').doc(burnTypeId).get();
      
      if (!burnTypeDoc.exists) {
        return null;
      }

      const data = burnTypeDoc.data()!;
      return {
        id: burnTypeDoc.id,
        name: data.name,
        description: data.description,
        defaultAllowed: data.defaultAllowed,
        requiresPermit: data.requiresPermit,
        createdAt: convertTimestampToDate(data.createdAt),
        createdBy: data.createdBy,
        updatedAt: convertTimestampToDate(data.updatedAt),
      };
    } catch (error) {
      console.error('Error getting burn type by ID:', error);
      throw new Error('Failed to retrieve burn type');
    }
  }
}