// Area and burn type definitions

// Area model
export interface Area {
  id: string;
  name: string;
  description: string;
  areaManagerId: string; // User ID of the area manager
  location?: {
    latitude: number;
    longitude: number;
  };
  allowedBurnTypes: { [key: string]: boolean }; // Map of burn type IDs to true/false
  createdAt: Date;
  createdBy: string; // Admin user ID
  updatedAt: Date;
}

// Burn type model
export interface BurnType {
  id: string;
  name: string;
  description: string;
  defaultAllowed: boolean; // Default permission status
  requiresPermit: boolean; // Whether this burn type requires a permit
  createdAt: Date;
  createdBy: string; // Admin user ID
  updatedAt: Date;
}