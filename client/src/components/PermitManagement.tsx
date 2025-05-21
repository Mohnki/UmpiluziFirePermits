import { useState } from "react";
import { BurnPermit, PermitStatus } from "@/lib/permit-types";
import { BurnType } from "@/lib/area-types";
import { updatePermitStatus } from "@/lib/permit-service";
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
  XCircle as XCircleIcon
} from "lucide-react";
import { format } from "date-fns";

interface PermitManagementProps {
  permits: BurnPermit[];
  burnTypes: BurnType[];
  areaName: string;
  userId: string;
  onPermitUpdated: () => void;
}

export default function PermitManagement({ 
  permits, 
  burnTypes, 
  areaName,
  userId,
  onPermitUpdated
}: PermitManagementProps) {
  const { toast } = useToast();
  const [selectedPermit, setSelectedPermit] = useState<BurnPermit | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter only pending permits for action
  const pendingPermits = permits.filter(permit => permit.status === "pending");
  const otherPermits = permits.filter(permit => permit.status !== "pending");
  
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
      
      {otherPermits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Permit Applications</CardTitle>
            <CardDescription>
              History of all burn permit applications for this area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>All permit applications for {areaName}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Burn Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherPermits.map(permit => (
                  <TableRow key={permit.id}>
                    <TableCell className="font-medium">
                      {getBurnTypeName(permit.burnTypeId)}
                    </TableCell>
                    <TableCell>
                      {format(permit.startDate, "MMM d, yyyy")}
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
                      {format(permit.createdAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewDetails(permit)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
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
            <div className="space-y-4">
              <div className="flex justify-between">
                <h3 className="text-lg font-semibold">
                  {getBurnTypeName(selectedPermit.burnTypeId)}
                </h3>
                <Badge variant={getStatusBadgeVariant(selectedPermit.status) as any}>
                  {selectedPermit.status.charAt(0).toUpperCase() + selectedPermit.status.slice(1)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Burn Date</h4>
                  <p className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(selectedPermit.startDate, "MMMM d, yyyy")}
                    {selectedPermit.startDate.toDateString() !== selectedPermit.endDate.toDateString() && 
                      ` - ${format(selectedPermit.endDate, "MMMM d, yyyy")}`}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Application Date</h4>
                  <p className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(selectedPermit.createdAt, "MMMM d, yyyy")}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Location</h4>
                  <p className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {selectedPermit.location.latitude.toFixed(6)}, {selectedPermit.location.longitude.toFixed(6)}
                    {selectedPermit.location.address && <span className="ml-1">({selectedPermit.location.address})</span>}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Applicant</h4>
                  <p className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-1" />
                    User ID: {selectedPermit.userId.substring(0, 10)}...
                  </p>
                </div>
              </div>
              
              {selectedPermit.details && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Additional Details</h4>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {selectedPermit.details}
                  </div>
                </div>
              )}
              
              {selectedPermit.status === "approved" && selectedPermit.approvedBy && selectedPermit.approvedAt && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Approval Information</h4>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Approved by: {selectedPermit.approvedBy} on {format(selectedPermit.approvedAt, "MMMM d, yyyy")}
                  </p>
                </div>
              )}
              
              {selectedPermit.status === "rejected" && selectedPermit.rejectionReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Reason for Rejection</h4>
                  <p className="text-sm text-red-700 dark:text-red-400">{selectedPermit.rejectionReason}</p>
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