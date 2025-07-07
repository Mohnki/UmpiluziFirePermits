import { useState, useEffect } from "react";
import { BurnPermit, PermitStatus } from "@/lib/permit-types";
import { BurnType } from "@/lib/area-types";
import { updatePermitStatus } from "@/lib/permit-service";
import { firestore } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp 
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  XCircle,
  Eye,
  User,
  MapPin,
  Calendar,
  Info,
  Loader2,
  CheckCircle2,
  XCircle as XCircleIcon,
  Building
} from "lucide-react";
import { format } from "date-fns";

// Define an interface for audit log entries
interface AuditLogEntry {
  id?: string;
  permitId: string;
  action: 'approved' | 'rejected' | 'cancelled' | 'viewed';
  performedBy: string;
  performedByName?: string;
  timestamp: Date;
  details?: string;
  permitData?: Partial<BurnPermit>;
}

interface PermitManagementProps {
  permits: BurnPermit[];
  burnTypes: BurnType[];
  areaName: string;
  userId: string;
  userName?: string;
  onPermitUpdated: () => void;
}

export default function PermitManagement({ 
  permits, 
  burnTypes, 
  areaName,
  userId,
  userName = "Administrator",
  onPermitUpdated
}: PermitManagementProps) {
  const { toast } = useToast();
  const [selectedPermit, setSelectedPermit] = useState<BurnPermit | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  
  // Firestore collection references
  const auditLogsCollection = collection(firestore, "permitAuditLogs");
  
  // Filter permits by status for organization
  const pendingPermits = permits.filter(permit => permit.status === "pending");
  // Active permits that can be cancelled
  const activePermits = permits.filter(permit => 
    permit.status === "approved" && 
    new Date(permit.endDate) >= new Date()
  );
  // Completed or rejected permits that can't be modified
  const completedPermits = permits.filter(permit => 
    permit.status === "completed" || 
    permit.status === "cancelled" || 
    permit.status === "rejected" ||
    (permit.status === "approved" && new Date(permit.endDate) < new Date())
  );
  
  // Load audit logs for a specific permit
  const loadAuditLogs = async (permitId: string) => {
    try {
      setLoadingAuditLogs(true);
      
      const q = query(
        auditLogsCollection,
        where("permitId", "==", permitId),
        orderBy("timestamp", "desc")
      );
      
      const snapshot = await getDocs(q);
      
      const logs: AuditLogEntry[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          permitId: data.permitId,
          action: data.action,
          performedBy: data.performedBy,
          performedByName: data.performedByName,
          timestamp: data.timestamp.toDate(),
          details: data.details,
          permitData: data.permitData
        });
      });
      
      setAuditLogs(logs);
      setShowAuditLog(true);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAuditLogs(false);
    }
  };
  
  // Create an audit log entry
  const createAuditLog = async (entry: Omit<AuditLogEntry, 'timestamp'>) => {
    try {
      await addDoc(auditLogsCollection, {
        ...entry,
        performedByName: userName,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error creating audit log:", error);
      // Don't throw, we don't want to interrupt the flow if logging fails
    }
  };
  
  // Get burn type name
  const getBurnTypeName = (burnTypeId: string) => {
    const burnType = burnTypes.find(bt => bt.id === burnTypeId);
    return burnType ? burnType.name : "Unknown Burn Type";
  };
  
  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'outline';
      case 'completed':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  // Handle view details click
  const handleViewDetails = (permit: BurnPermit) => {
    setSelectedPermit(permit);
    setViewDetailsOpen(true);
  };
  
  // Handle approve click
  const handleApproveClick = (permit: BurnPermit) => {
    setSelectedPermit(permit);
    setApproveDialogOpen(true);
  };
  
  // Handle reject click
  const handleRejectClick = (permit: BurnPermit) => {
    setSelectedPermit(permit);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };
  
  // Handle cancel click
  const handleCancelClick = (permit: BurnPermit) => {
    setSelectedPermit(permit);
    setCancellationReason("");
    setCancelDialogOpen(true);
  };
  
  // Handle view audit log click
  const handleViewAuditLog = (permit: BurnPermit) => {
    setSelectedPermit(permit);
    loadAuditLogs(permit.id);
  };
  
  // Approve permit
  const approvePermit = async () => {
    if (!selectedPermit) return;
    
    try {
      setIsSubmitting(true);
      
      await updatePermitStatus(
        selectedPermit.id,
        "approved",
        userId
      );
      
      // Create audit log
      await createAuditLog({
        permitId: selectedPermit.id,
        action: 'approved',
        performedBy: userId,
        details: "Permit approved by area manager",
        permitData: {
          status: "approved",
          approvedBy: userId,
          approvedAt: new Date()
        }
      });
      
      toast({
        title: "Permit Approved",
        description: "The burn permit has been approved successfully.",
      });
      
      setApproveDialogOpen(false);
      onPermitUpdated();
    } catch (error: any) {
      console.error("Error approving permit:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve permit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reject permit
  const rejectPermit = async () => {
    if (!selectedPermit || !rejectionReason.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      await updatePermitStatus(
        selectedPermit.id,
        "rejected",
        undefined,
        rejectionReason
      );
      
      // Create audit log
      await createAuditLog({
        permitId: selectedPermit.id,
        action: 'rejected',
        performedBy: userId,
        details: rejectionReason,
        permitData: {
          status: "rejected",
          rejectionReason: rejectionReason
        }
      });
      
      toast({
        title: "Permit Rejected",
        description: "The burn permit has been rejected.",
      });
      
      setRejectDialogOpen(false);
      onPermitUpdated();
    } catch (error: any) {
      console.error("Error rejecting permit:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject permit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancel permit
  const cancelPermit = async () => {
    if (!selectedPermit || !cancellationReason.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      await updatePermitStatus(
        selectedPermit.id,
        "cancelled",
        undefined,
        cancellationReason
      );
      
      // Create audit log
      await createAuditLog({
        permitId: selectedPermit.id,
        action: 'cancelled',
        performedBy: userId,
        details: cancellationReason,
        permitData: {
          status: "cancelled",
          rejectionReason: cancellationReason // Using the same field for simplicity
        }
      });
      
      toast({
        title: "Permit Cancelled",
        description: "The burn permit has been cancelled.",
      });
      
      setCancelDialogOpen(false);
      onPermitUpdated();
    } catch (error: any) {
      console.error("Error cancelling permit:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel permit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (permits.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-md">
        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <h4 className="text-lg font-medium mb-1">No Permit Applications</h4>
        <p className="text-muted-foreground">
          There are no burn permit applications for this area.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pendingPermits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
            <CardDescription>
              These burn permit applications need your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Pending permit applications for {areaName}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Burn Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Compartment</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPermits.map(permit => (
                  <TableRow key={permit.id}>
                    <TableCell className="font-medium">
                      {getBurnTypeName(permit.burnTypeId)}
                    </TableCell>
                    <TableCell>
                      {format(permit.startDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {permit.compartment ? (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{permit.compartment}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>User</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(permit.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(permit)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200"
                          onClick={() => handleApproveClick(permit)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                          onClick={() => handleRejectClick(permit)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {activePermits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Permits</CardTitle>
            <CardDescription>
              Currently active permits that can be cancelled if needed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Active permits for {areaName}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Burn Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Compartment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePermits.map(permit => (
                  <TableRow key={permit.id}>
                    <TableCell className="font-medium">
                      {getBurnTypeName(permit.burnTypeId)}
                    </TableCell>
                    <TableCell>
                      {format(permit.startDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {permit.compartment ? (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{permit.compartment}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(permit.status) as any}>
                        {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>User</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(permit)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                          onClick={() => handleCancelClick(permit)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewAuditLog(permit)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {completedPermits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed and Past Permits</CardTitle>
            <CardDescription>
              History of completed and past permit applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Completed, cancelled and rejected permits for {areaName}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Burn Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Compartment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedPermits.map(permit => (
                  <TableRow key={permit.id}>
                    <TableCell className="font-medium">
                      {getBurnTypeName(permit.burnTypeId)}
                    </TableCell>
                    <TableCell>
                      {format(permit.startDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {permit.compartment ? (
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>{permit.compartment}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(permit.status) as any}>
                        {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span>User</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(permit)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewAuditLog(permit)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={setShowAuditLog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Permit History</DialogTitle>
            <DialogDescription>
              Complete activity log for this permit
            </DialogDescription>
          </DialogHeader>
          
          {loadingAuditLogs ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading audit logs...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <Info className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <h4 className="text-lg font-medium mb-1">No History</h4>
                  <p className="text-muted-foreground">
                    There are no recorded activities for this permit yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log, index) => (
                          <TableRow key={log.id || index}>
                            <TableCell className="whitespace-nowrap">
                              {format(log.timestamp, "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  log.action === 'approved' 
                                    ? 'success' as any 
                                    : log.action === 'rejected' || log.action === 'cancelled' 
                                      ? 'destructive' as any 
                                      : 'secondary'
                                }
                                className="capitalize"
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.performedByName || log.performedBy.substring(0, 8)}
                            </TableCell>
                            <TableCell>
                              {log.details || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditLog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Permit Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Burn Permit</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this burn permit. This information will be shared with the applicant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Reason for Cancellation</h4>
              <Textarea 
                placeholder="Enter the reason for cancelling this permit..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={cancelPermit}
              disabled={isSubmitting || !cancellationReason.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <XCircleIcon className="h-4 w-4 mr-1" />
              Cancel Permit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Permit Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Permit Details</DialogTitle>
            <DialogDescription>
              Detailed information about this burn permit application
            </DialogDescription>
          </DialogHeader>
          
          {selectedPermit && (
            <div className="space-y-6">
              {/* Header with Permit Type and Status */}
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="text-xl font-semibold text-primary">
                    {getBurnTypeName(selectedPermit.burnTypeId)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permit ID: {selectedPermit.id.substring(0, 12)}...
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(selectedPermit.status) as any} className="text-sm px-3 py-1">
                  {selectedPermit.status.charAt(0).toUpperCase() + selectedPermit.status.slice(1)}
                </Badge>
              </div>

              {/* Key Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dates Section */}
                <div className="p-4 border rounded-lg bg-card">
                  <h4 className="font-semibold mb-3 text-primary">Dates & Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Burn Date</span>
                      <div className="flex items-center text-sm font-medium">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(selectedPermit.startDate, "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Applied</span>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(selectedPermit.createdAt, "MMM d, yyyy HH:mm")}
                      </div>
                    </div>
                    {selectedPermit.status === "approved" && selectedPermit.approvedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Approved</span>
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {format(selectedPermit.approvedAt, "MMM d, yyyy HH:mm")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Details Section */}
                <div className="p-4 border rounded-lg bg-card">
                  <h4 className="font-semibold mb-3 text-primary">Location & Details</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">Coordinates</span>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {selectedPermit.location.latitude.toFixed(6)}, {selectedPermit.location.longitude.toFixed(6)}
                      </div>
                      {selectedPermit.location.address && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedPermit.location.address}</p>
                      )}
                    </div>
                    
                    {selectedPermit.compartment && (
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">Compartment</span>
                        <div className="flex items-center text-sm font-medium">
                          <Building className="h-4 w-4 mr-1" />
                          {selectedPermit.compartment}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">Applicant</span>
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-1" />
                        User ID: {selectedPermit.userId.substring(0, 10)}...
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {selectedPermit.details && (
                <div className="p-4 border rounded-lg bg-card">
                  <h4 className="font-semibold mb-3 text-primary">Additional Details</h4>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {selectedPermit.details}
                  </div>
                </div>
              )}

              {/* Status-specific Information */}
              {selectedPermit.status === "approved" && selectedPermit.approvedBy && selectedPermit.approvedAt && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="font-semibold text-green-800 dark:text-green-300">Approval Information</h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Approved by: <span className="font-medium">{selectedPermit.approvedBy}</span> on {format(selectedPermit.approvedAt, "MMMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              )}
              
              {selectedPermit.status === "rejected" && selectedPermit.rejectionReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                    <h4 className="font-semibold text-red-800 dark:text-red-300">Reason for Rejection</h4>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-400">{selectedPermit.rejectionReason}</p>
                  </div>
                </div>
              )}

              {selectedPermit.status === "cancelled" && selectedPermit.rejectionReason && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center mb-2">
                    <XCircleIcon className="h-5 w-5 text-orange-600 mr-2" />
                    <h4 className="font-semibold text-orange-800 dark:text-orange-300">Cancellation Details</h4>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-md">
                    <p className="text-sm text-orange-700 dark:text-orange-400">{selectedPermit.rejectionReason}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
            
            {selectedPermit && selectedPermit.status === "pending" && (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200"
                  onClick={() => {
                    setViewDetailsOpen(false);
                    handleApproveClick(selectedPermit);
                  }}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
                  onClick={() => {
                    setViewDetailsOpen(false);
                    handleRejectClick(selectedPermit);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Burn Permit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this burn permit? This will notify the applicant that their permit has been approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={approvePermit}
              disabled={isSubmitting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve Permit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Burn Permit</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this burn permit. This information will be shared with the applicant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Reason for Rejection</h4>
              <Textarea 
                placeholder="Enter the reason for rejecting this permit request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={rejectPermit}
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <XCircleIcon className="h-4 w-4 mr-1" />
              Reject Permit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}