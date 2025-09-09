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
  Document,
  PermitQuery,
  AreaQuery 
} from '../shared/schema';

// Initialize Firebase Admin
if (!admin.apps.length) {
  let serviceAccount;
  
  try {
    // Parse the service account key from environment variable
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      serviceAccount = JSON.parse(serviceAccountKey);
    }
  } catch (error) {
    console.error('Error parsing Firebase service account key:', error);
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log('Firebase initialized with service account credentials');
  } else {
    // Fallback to default credentials
    admin.initializeApp({
      projectId: "umpiluzi-fire-permits",
    });
    console.log('Firebase initialized with default credentials');
  }
}

const db = getFirestore();

// Export admin and db for use in other files
export { admin, db };

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
      console.log('DEBUG: getPermits called with query:', JSON.stringify(query));
      
      // Use a simple query to avoid complex index requirements
      let permitQuery: Query = db.collection('burnPermits');
      
      // For historical reports with date ranges, use Firestore date filtering when possible
      if (query.includeHistorical && query.startDate) {
        const startDate = new Date(query.startDate);
        permitQuery = permitQuery.where('createdAt', '>=', startDate);
        console.log('DEBUG: Added startDate filter:', startDate);
      }
      if (query.includeHistorical && query.endDate) {
        const endDate = new Date(query.endDate);
        permitQuery = permitQuery.where('createdAt', '<=', endDate);
        console.log('DEBUG: Added endDate filter:', endDate);
      }
      
      // Apply only one additional filter at a time to avoid complex indexes
      if (query.userId) {
        permitQuery = permitQuery.where('userId', '==', query.userId);
        console.log('DEBUG: Added userId filter:', query.userId);
      } else if (query.areaId) {
        permitQuery = permitQuery.where('areaId', '==', query.areaId);
        console.log('DEBUG: Added areaId filter:', query.areaId);
      } else if (query.status) {
        permitQuery = permitQuery.where('status', '==', query.status);
        console.log('DEBUG: Added status filter:', query.status);
      }

      // Order by createdAt which should have a simple index
      permitQuery = permitQuery.orderBy('createdAt', 'desc');
      
      // Get more documents than needed to account for filtering
      // For reports, increase the limit to fetch historical data
      // Use a much higher limit for reports to ensure we get all historical data
      const limit = query.limit || (query.includeHistorical ? 5000 : 100);
      permitQuery = permitQuery.limit(limit);
      console.log('DEBUG: Query limit set to:', limit);

      console.log('DEBUG: Executing Firestore query...');
      const snapshot = await permitQuery.get();
      console.log('DEBUG: Firestore query returned', snapshot.docs.length, 'documents');
      let permits = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          farmId: data.farmId || '',
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

      // Apply filters in memory to avoid complex Firestore indexes
      permits = permits.filter(permit => {
        // Apply date filters
        if (!query.includeHistorical) {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
          
          if (permit.startDate < startOfDay || permit.startDate >= endOfDay) {
            return false;
          }
        }

        // Apply other filters
        if (query.userId && permit.userId !== query.userId) return false;
        if (query.areaId && permit.areaId !== query.areaId) return false;
        if (query.status && permit.status !== query.status) return false;
        if (query.burnTypeId && permit.burnTypeId !== query.burnTypeId) return false;
        if (query.compartment && permit.compartment && !permit.compartment.toLowerCase().includes(query.compartment.toLowerCase())) return false;
        
        if (query.startDate && query.includeHistorical) {
          const startDate = new Date(query.startDate);
          if (permit.startDate < startDate) return false;
        }
        
        if (query.endDate && query.includeHistorical) {
          const endDate = new Date(query.endDate);
          if (permit.endDate > endDate) return false;
        }

        return true;
      });

      // Sort by startDate descending
      permits.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

      // Apply location-based filtering if specified
      if (query.location) {
        permits = this.filterByLocation(permits, query.location);
      }

      // Apply pagination
      if (query.offset) {
        permits = permits.slice(query.offset);
      }
      if (query.limit) {
        permits = permits.slice(0, query.limit);
      }

      return permits;
    } catch (error) {
      console.error('Error getting permits:', error);
      throw new Error('Failed to retrieve permits');
    }
  }

  private static filterByLocation(permits: BurnPermit[], locationFilter: { latitude: number; longitude: number; radius?: number }): BurnPermit[] {
    const radius = locationFilter.radius || 10; // Default 10km radius
    
    return permits.filter(permit => {
      if (!permit.location) return false;
      const distance = this.calculateDistance(
        locationFilter.latitude,
        locationFilter.longitude,
        permit.location.latitude,
        permit.location.longitude
      );
      return distance <= radius;
    });
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
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
        farmId: data.farmId || '',
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
    } catch (error) {
      console.error('Error getting permit by ID:', error);
      throw new Error('Failed to retrieve permit');
    }
  }
}

// Area service
export class AreaService {
  static async getAllAreas(query?: AreaQuery): Promise<Area[]> {
    try {
      let areaQuery: Query = db.collection('areas');
      
      // Apply filters
      if (query?.managerId) {
        areaQuery = areaQuery.where('areaManagerId', '==', query.managerId);
      }
      
      // Apply ordering and pagination
      areaQuery = areaQuery.orderBy('name', 'asc');
      
      if (query?.limit) {
        areaQuery = areaQuery.limit(query.limit);
      }
      if (query?.offset) {
        areaQuery = areaQuery.offset(query.offset);
      }

      const snapshot = await areaQuery.get();
      let areas = snapshot.docs.map(doc => {
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

      // Apply location-based filtering if specified
      if (query?.location) {
        areas = this.filterAreasByLocation(areas, query.location);
      }

      // Filter by allowed burn type if specified
      if (query?.allowedBurnType) {
        areas = areas.filter(area => 
          area.allowedBurnTypes[query.allowedBurnType!] === true
        );
      }

      // Filter by active bans if specified
      if (query?.hasActiveBans !== undefined) {
        if (query.hasActiveBans) {
          // Only return areas that have active bans
          const areasWithBans = await Promise.all(
            areas.map(async area => {
              const activeBans = await this.getActiveBansForArea(area.id);
              return activeBans.length > 0 ? area : null;
            })
          );
          areas = areasWithBans.filter(area => area !== null) as Area[];
        } else {
          // Only return areas without active bans
          const areasWithoutBans = await Promise.all(
            areas.map(async area => {
              const activeBans = await this.getActiveBansForArea(area.id);
              return activeBans.length === 0 ? area : null;
            })
          );
          areas = areasWithoutBans.filter(area => area !== null) as Area[];
        }
      }

      return areas;
    } catch (error) {
      console.error('Error getting areas:', error);
      throw new Error('Failed to retrieve areas');
    }
  }

  private static filterAreasByLocation(areas: Area[], locationFilter: { latitude: number; longitude: number; radius?: number }): Area[] {
    const radius = locationFilter.radius || 50; // Default 50km radius
    
    return areas.filter(area => {
      if (!area.location) return false;
      
      const distance = this.calculateDistance(
        locationFilter.latitude,
        locationFilter.longitude,
        area.location.latitude,
        area.location.longitude
      );
      return distance <= radius;
    });
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  private static async getActiveBansForArea(areaId: string): Promise<any[]> {
    try {
      const now = new Date();
      const snapshot = await db.collection('burnBans')
        .where('areaId', '==', areaId)
        .where('isActive', '==', true)
        .where('startDate', '<=', Timestamp.fromDate(now))
        .where('endDate', '>=', Timestamp.fromDate(now))
        .get();
      
      return snapshot.docs;
    } catch (error) {
      console.error('Error getting active bans for area:', areaId, error);
      return [];
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

// Document service
export class DocumentService {
  static async getAllDocuments(): Promise<Document[]> {
    try {
      const snapshot = await db.collection('documents')
        .orderBy('uploadedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
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
        };
      });
    } catch (error) {
      console.error('Error getting documents:', error);
      throw new Error('Failed to retrieve documents');
    }
  }

  static async getPublicDocuments(): Promise<Document[]> {
    try {
      const snapshot = await db.collection('documents')
        .where('isPublic', '==', true)
        .orderBy('uploadedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
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
        };
      });
    } catch (error) {
      console.error('Error getting public documents:', error);
      throw new Error('Failed to retrieve public documents');
    }
  }

  static async getDocumentById(documentId: string): Promise<Document | null> {
    try {
      const doc = await db.collection('documents').doc(documentId).get();
      
      if (!doc.exists) {
        return null;
      }
      
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
      };
    } catch (error) {
      console.error('Error getting document:', error);
      throw new Error('Failed to retrieve document');
    }
  }

  static async createDocument(document: Omit<Document, 'id' | 'uploadedAt' | 'downloadCount'>): Promise<Document> {
    try {
      const docRef = await db.collection('documents').add({
        ...document,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        downloadCount: 0,
      });
      
      const doc = await docRef.get();
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
      };
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }

  static async updateDocument(documentId: string, updates: Partial<Omit<Document, 'id' | 'uploadedAt' | 'uploadedBy'>>): Promise<void> {
    try {
      await db.collection('documents').doc(documentId).update(updates);
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('Failed to update document');
    }
  }

  static async deleteDocument(documentId: string): Promise<void> {
    try {
      await db.collection('documents').doc(documentId).delete();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  static async incrementDownloadCount(documentId: string): Promise<void> {
    try {
      await db.collection('documents').doc(documentId).update({
        downloadCount: admin.firestore.FieldValue.increment(1)
      });
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw new Error('Failed to increment download count');
    }
  }
}