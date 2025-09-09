// Permit status types
export type PermitStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

// Burn permit model
export interface BurnPermit {
  id: string;
  userId: string; // User who requested the permit
  burnTypeId: string; // Type of burn
  areaId: string; // Area where burn will happen
  farmId: string; // Farm where burn will happen
  startDate: Date; // When the burn will start
  endDate: Date; // When the burn will end
  status: PermitStatus;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  compartment?: string; // Compartment number or section within the farm/area
  details: string; // Additional details provided by the user
  approvedBy?: string; // User ID of approver (if manually approved)
  approvedAt?: Date; // When the permit was approved
  rejectionReason?: string; // Reason for rejection if applicable
  createdAt: Date;
  updatedAt: Date;
}

// Ban model for global area bans
export interface BurnBan {
  id: string;
  areaId: string; // Area ID, or "global" for system-wide ban
  startDate: Date; // When the ban starts
  endDate: Date; // When the ban ends
  reason: string; // Reason for the ban
  createdBy: string; // Admin or area manager who created the ban
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean; // Whether the ban is currently active
}