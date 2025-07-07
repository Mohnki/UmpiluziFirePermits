import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect, useLocation } from "wouter";
import { getAllUsers, updateUserRole, UserProfile } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { 
  getAllAreas, 
  getAllBurnTypes, 
  createArea, 
  createBurnType, 
  updateArea, 
  updateBurnType,
  deleteArea,
  deleteBurnType,
  updateAreaBurnTypes,
  getAreaById
} from "@/lib/area-service";
import { Area, BurnType } from "@/lib/area-types";
import { BurnPermit } from "@/lib/permit-types";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserRole } from "@/lib/roles";
import { 
  Loader2, 
  User, 
  Plus, 
  Trash, 
  Pencil, 
  MapPin, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  Info,
  Code,
  Map,
  Building
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom marker icons for different permit statuses
const createMarkerIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const markerIcons = {
  approved: createMarkerIcon('orange'),
  completed: createMarkerIcon('blue'),
  cancelled: createMarkerIcon('red'),
  rejected: createMarkerIcon('red'),
  pending: createMarkerIcon('yellow')
};

// Form schemas
const areaFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  areaManagerId: z.string().min(1, "You must select an area manager"),
});

const burnTypeFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  defaultAllowed: z.boolean().default(false),
  requiresPermit: z.boolean().default(true),
});

export default function AdminPage() {
  const { user, userProfile, isAdmin, isAreaManager, loading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Get tab from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const defaultTab = tabFromUrl || (isAdmin ? "users" : "todays-permits");
  
  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  
  // Areas state
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  
  // Burn types state
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [loadingBurnTypes, setLoadingBurnTypes] = useState(true);
  const [burnTypeDialogOpen, setBurnTypeDialogOpen] = useState(false);
  const [editingBurnTypeId, setEditingBurnTypeId] = useState<string | null>(null);
  
  // Area permissions state
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [burnTypePermissions, setBurnTypePermissions] = useState<{ [key: string]: boolean }>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  
  // Permits state
  const [permits, setPermits] = useState<BurnPermit[]>([]);
  const [loadingPermits, setLoadingPermits] = useState(true);
  const [cancellingPermitId, setCancellingPermitId] = useState<string | null>(null);
  const [selectedPermit, setSelectedPermit] = useState<BurnPermit | null>(null);
  const [permitDetailsOpen, setPermitDetailsOpen] = useState(false);

  // Area form
  const areaForm = useForm<z.infer<typeof areaFormSchema>>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      name: "",
      description: "",
      areaManagerId: "",
    },
  });

  // Burn type form
  const burnTypeForm = useForm<z.infer<typeof burnTypeFormSchema>>({
    resolver: zodResolver(burnTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultAllowed: false,
      requiresPermit: true,
    },
  });

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        try {
          setLoadingUsers(true);
          const allUsers = await getAllUsers();
          setUsers(allUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
          toast({
            title: "Error",
            description: "Failed to load users. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingUsers(false);
        }
      }
    };

    if (!loading && isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, loading, toast]);

  // Fetch all areas
  useEffect(() => {
    const fetchAreas = async () => {
      if (isAdmin) {
        try {
          setLoadingAreas(true);
          const allAreas = await getAllAreas();
          setAreas(allAreas);
        } catch (error) {
          console.error("Error fetching areas:", error);
          toast({
            title: "Error",
            description: "Failed to load areas. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingAreas(false);
        }
      }
    };

    if (!loading && isAdmin) {
      fetchAreas();
    }
  }, [isAdmin, loading, toast]);

  // Fetch all burn types
  useEffect(() => {
    const fetchBurnTypes = async () => {
      if (isAdmin) {
        try {
          setLoadingBurnTypes(true);
          const allBurnTypes = await getAllBurnTypes();
          setBurnTypes(allBurnTypes);
        } catch (error) {
          console.error("Error fetching burn types:", error);
          toast({
            title: "Error",
            description: "Failed to load burn types. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingBurnTypes(false);
        }
      }
    };

    if (!loading && isAdmin) {
      fetchBurnTypes();
    }
  }, [isAdmin, loading, toast]);

  // Fetch all permits
  useEffect(() => {
    const fetchPermits = async () => {
      if (user && userProfile) {
        try {
          setLoadingPermits(true);
          const idToken = await user.getIdToken();
          const response = await fetch('/api/permits', {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch permits');
          }
          
          const data = await response.json();
          setPermits(data.data || []);
        } catch (error) {
          console.error("Error fetching permits:", error);
          toast({
            title: "Error",
            description: "Failed to load permits. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingPermits(false);
        }
      }
    };

    if (!loading && user && userProfile) {
      fetchPermits();
    }
  }, [user, userProfile, loading, toast]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setSavingUserId(userId);
      await updateUserRole(userId, newRole);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.uid === userId ? { ...user, role: newRole } : user
        )
      );
      
      toast({
        title: "Role updated",
        description: "The user's role has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  // Handle permit cancellation
  const handleCancelPermit = async (permitId: string) => {
    if (!user) return;
    
    try {
      setCancellingPermitId(permitId);
      const idToken = await user.getIdToken();
      
      const response = await fetch(`/api/permits/${permitId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          rejectionReason: 'Cancelled by administrator'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel permit');
      }
      
      // Update local state
      setPermits(prevPermits => 
        prevPermits.map(permit => 
          permit.id === permitId 
            ? { ...permit, status: 'cancelled' as const, rejectionReason: 'Cancelled by administrator' }
            : permit
        )
      );
      
      toast({
        title: "Permit cancelled",
        description: "The permit has been cancelled successfully.",
      });
    } catch (error) {
      console.error("Error cancelling permit:", error);
      toast({
        title: "Error",
        description: "Failed to cancel permit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingPermitId(null);
    }
  };

  // Handle area form submission
  const handleAreaSubmit = async (values: z.infer<typeof areaFormSchema>) => {
    if (!userProfile) return;
    
    try {
      if (editingAreaId) {
        // Updating an existing area
        await updateArea(editingAreaId, {
          name: values.name,
          description: values.description,
          areaManagerId: values.areaManagerId,
        });
        
        // Update local state
        setAreas(prevAreas => 
          prevAreas.map(area => 
            area.id === editingAreaId 
              ? { 
                  ...area, 
                  name: values.name, 
                  description: values.description,
                  areaManagerId: values.areaManagerId,
                  updatedAt: new Date()
                } 
              : area
          )
        );
        
        toast({
          title: "Area updated",
          description: "The area has been updated successfully.",
        });
      } else {
        // Creating a new area
        const newArea = await createArea({
          name: values.name,
          description: values.description,
          areaManagerId: values.areaManagerId,
          allowedBurnTypes: {},
        }, userProfile.uid);
        
        // Update local state
        setAreas(prevAreas => [...prevAreas, newArea]);
        
        toast({
          title: "Area created",
          description: "The new area has been created successfully.",
        });
      }
      
      // Reset form and close dialog
      areaForm.reset();
      setAreaDialogOpen(false);
      setEditingAreaId(null);
    } catch (error) {
      console.error("Error saving area:", error);
      toast({
        title: "Error",
        description: "Failed to save area. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle burn type form submission
  const handleBurnTypeSubmit = async (values: z.infer<typeof burnTypeFormSchema>) => {
    if (!userProfile) return;
    
    try {
      if (editingBurnTypeId) {
        // Updating an existing burn type
        await updateBurnType(editingBurnTypeId, {
          name: values.name,
          description: values.description,
          defaultAllowed: values.defaultAllowed,
          requiresPermit: values.requiresPermit,
        });
        
        // Update local state
        setBurnTypes(prevBurnTypes => 
          prevBurnTypes.map(burnType => 
            burnType.id === editingBurnTypeId 
              ? { 
                  ...burnType, 
                  name: values.name, 
                  description: values.description,
                  defaultAllowed: values.defaultAllowed,
                  requiresPermit: values.requiresPermit,
                  updatedAt: new Date()
                } 
              : burnType
          )
        );
        
        toast({
          title: "Burn type updated",
          description: "The burn type has been updated successfully.",
        });
      } else {
        // Creating a new burn type
        const newBurnType = await createBurnType({
          name: values.name,
          description: values.description,
          defaultAllowed: values.defaultAllowed,
          requiresPermit: values.requiresPermit,
        }, userProfile.uid);
        
        // Update local state
        setBurnTypes(prevBurnTypes => [...prevBurnTypes, newBurnType]);
        
        toast({
          title: "Burn type created",
          description: "The new burn type has been created successfully.",
        });
      }
      
      // Reset form and close dialog
      burnTypeForm.reset();
      setBurnTypeDialogOpen(false);
      setEditingBurnTypeId(null);
    } catch (error) {
      console.error("Error saving burn type:", error);
      toast({
        title: "Error",
        description: "Failed to save burn type. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle area deletion
  const handleDeleteArea = async (areaId: string) => {
    try {
      await deleteArea(areaId);
      
      // Update local state
      setAreas(prevAreas => prevAreas.filter(area => area.id !== areaId));
      
      toast({
        title: "Area deleted",
        description: "The area has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting area:", error);
      toast({
        title: "Error",
        description: "Failed to delete area. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle burn type deletion
  const handleDeleteBurnType = async (burnTypeId: string) => {
    try {
      await deleteBurnType(burnTypeId);
      
      // Update local state
      setBurnTypes(prevBurnTypes => prevBurnTypes.filter(burnType => burnType.id !== burnTypeId));
      
      toast({
        title: "Burn type deleted",
        description: "The burn type has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting burn type:", error);
      toast({
        title: "Error",
        description: "Failed to delete burn type. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Edit area handler
  const handleEditArea = (area: Area) => {
    areaForm.reset({
      name: area.name,
      description: area.description,
      areaManagerId: area.areaManagerId,
    });
    setEditingAreaId(area.id);
    setAreaDialogOpen(true);
  };

  // Edit burn type handler
  const handleEditBurnType = (burnType: BurnType) => {
    burnTypeForm.reset({
      name: burnType.name,
      description: burnType.description,
      defaultAllowed: burnType.defaultAllowed,
      requiresPermit: burnType.requiresPermit,
    });
    setEditingBurnTypeId(burnType.id);
    setBurnTypeDialogOpen(true);
  };
  
  // Handle area selection for permissions
  const handleAreaSelect = async (area: Area) => {
    setSelectedArea(area);
    setBurnTypePermissions(area.allowedBurnTypes || {});
  };

  // Handle burn type toggle
  const handleBurnTypeToggle = (burnTypeId: string, allowed: boolean) => {
    setBurnTypePermissions(prev => ({
      ...prev,
      [burnTypeId]: allowed
    }));
  };

  // Save burn type permissions
  const saveBurnTypePermissions = async () => {
    if (!selectedArea) return;
    
    try {
      setSavingPermissions(true);
      await updateAreaBurnTypes(selectedArea.id, burnTypePermissions);
      
      // Update local state
      setAreas(prevAreas => 
        prevAreas.map(area => 
          area.id === selectedArea.id 
            ? { ...area, allowedBurnTypes: burnTypePermissions } 
            : area
        )
      );
      
      // Update selected area
      setSelectedArea(prev => 
        prev ? { ...prev, allowedBurnTypes: burnTypePermissions } : null
      );
      
      toast({
        title: "Permissions saved",
        description: "Burn type permissions have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast({
        title: "Error",
        description: "Failed to save burn type permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Redirect if not admin or area manager
  if (!loading && !isAdmin && !isAreaManager) {
    return <Redirect to="/" />;
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'area-manager':
        return 'secondary';
      case 'api-user':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Get area managers for dropdown
  const areaManagers = users.filter(user => 
    user.role === 'admin' || user.role === 'area-manager'
  );

  return (
    <>
      <Helmet>
        <title>{isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'} - Umpiluzi Fire Protection Association</title>
        <meta name="description" content={isAdmin ? "Administrative dashboard for managing users and roles" : "Manager dashboard for permit oversight"} />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0">{isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}</h1>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <a href="/api-docs" target="_blank" rel="noopener noreferrer">
                    <Code className="h-4 w-4 mr-2" />
                    API Documentation
                  </a>
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="mb-6">
                {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
                {isAdmin && <TabsTrigger value="permits">Permit Management</TabsTrigger>}
                <TabsTrigger value="todays-permits">Today's Permits</TabsTrigger>
                {isAdmin && <TabsTrigger value="areas">Areas</TabsTrigger>}
                {isAdmin && <TabsTrigger value="burn-types">Burn Types</TabsTrigger>}
                {isAdmin && <TabsTrigger value="area-permissions">Area Permissions</TabsTrigger>}
              </TabsList>
              
              {/* User Management Tab */}
              <TabsContent value="users">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">User Management</h2>
                  
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading users...</span>
                    </div>
                  ) : (
                    <Table>
                      <TableCaption>List of all registered users</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Current Role</TableHead>
                          <TableHead>Change Role</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.uid}>
                            <TableCell>
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  {user.photoURL ? (
                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                  ) : (
                                    <AvatarFallback>
                                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 
                                      user.email ? user.email.charAt(0).toUpperCase() : 
                                      <User className="h-4 w-4" />}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <span className="font-medium">
                                  {user.displayName || "No name"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {user.role === 'admin' ? 'Admin' : 
                                 user.role === 'area-manager' ? 'Area Manager' : 
                                 user.role === 'api-user' ? 'API User' : 'User'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(value: UserRole) => handleRoleChange(user.uid, value)}
                                disabled={user.uid === userProfile?.uid || savingUserId === user.uid}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="area-manager">Area Manager</SelectItem>
                                    <SelectItem value="api-user">API User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {savingUserId === user.uid ? (
                                <Button variant="ghost" size="sm" disabled>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Saving...
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={user.uid === userProfile?.uid}
                                >
                                  {user.uid === userProfile?.uid ? "Current User" : "View Details"}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              {/* Permits Management Tab */}
              <TabsContent value="permits">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Permit Management</h2>
                  
                  {loadingPermits ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading permits...</span>
                    </div>
                  ) : permits.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-500 dark:text-gray-400">No permits found.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableCaption>List of all burn permits</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permit ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Burn Type</TableHead>
                          <TableHead>Compartment</TableHead>
                          <TableHead>Date Range</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permits.map((permit) => {
                          const area = areas.find(a => a.id === permit.areaId);
                          const burnType = burnTypes.find(bt => bt.id === permit.burnTypeId);
                          const user = users.find(u => u.uid === permit.userId);
                          
                          return (
                            <TableRow key={permit.id}>
                              <TableCell className="font-mono text-sm">
                                {permit.id.substring(0, 8)}...
                              </TableCell>
                              <TableCell>
                                {user ? user.displayName || user.email : 'Unknown User'}
                              </TableCell>
                              <TableCell>
                                {area ? area.name : 'Unknown Area'}
                              </TableCell>
                              <TableCell>
                                {burnType ? burnType.name : 'Unknown Type'}
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
                                {new Date(permit.startDate).toLocaleDateString()} - {new Date(permit.endDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    permit.status === 'approved' ? 'default' :
                                    permit.status === 'pending' ? 'secondary' :
                                    permit.status === 'rejected' || permit.status === 'cancelled' ? 'destructive' :
                                    'outline'
                                  }
                                >
                                  {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPermit(permit);
                                      setPermitDetailsOpen(true);
                                    }}
                                  >
                                    View Details
                                  </Button>
                                  {(permit.status === 'pending' || permit.status === 'approved') && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCancelPermit(permit.id)}
                                      disabled={cancellingPermitId === permit.id}
                                    >
                                      {cancellingPermitId === permit.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                          Cancelling...
                                        </>
                                      ) : (
                                        'Cancel'
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              {/* Today's Permits Map Tab */}
              <TabsContent value="todays-permits">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <Map className="h-6 w-6 mr-2 text-primary" />
                      <h2 className="text-xl font-semibold">Today's Active Permits Map</h2>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {permits.filter(p => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const startDate = new Date(p.startDate);
                        const endDate = new Date(p.endDate);
                        
                        // Use same normalization logic as the map
                        const normalizeDate = (date: Date): Date => {
                          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        };
                        
                        const normalizedStart = normalizeDate(startDate);
                        const normalizedEnd = normalizeDate(endDate);
                        const normalizedToday = normalizeDate(today);
                        
                        const isActiveToday = normalizedStart <= normalizedToday && normalizedEnd >= normalizedToday && p.status === 'approved';
                        
                        // Filter by area if user is area manager
                        let hasAreaAccess = true;
                        if (isAreaManager && !isAdmin && userProfile) {
                          const userManagedAreas = areas.filter(area => area.areaManagerId === userProfile.uid);
                          hasAreaAccess = userManagedAreas.some(area => area.id === p.areaId);
                        }
                        
                        return isActiveToday && hasAreaAccess;
                      }).length} Active Today
                    </Badge>
                  </div>
                  
                  {loadingPermits ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading permits map...</span>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border">
                      <div style={{ height: '600px', width: '100%' }}>
                        {(() => {
                          // Filter today's active permits
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Debug: Log all permits to see what we have
                          console.log('All permits:', permits);
                          
                          const allTodaysPermits = permits.filter(p => {
                            const startDate = new Date(p.startDate);
                            const endDate = new Date(p.endDate);
                            
                            // Normalize dates to just the date part (no time)
                            const normalizeDate = (date: Date): Date => {
                              return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                            };
                            
                            const normalizedStart = normalizeDate(startDate);
                            const normalizedEnd = normalizeDate(endDate);
                            const normalizedToday = normalizeDate(today);
                            
                            // Include all permits for today, regardless of status
                            const isForToday = normalizedStart <= normalizedToday && normalizedEnd >= normalizedToday;
                            
                            // Filter by area if user is area manager
                            let hasAreaAccess = true;
                            if (isAreaManager && !isAdmin && userProfile) {
                              const userManagedAreas = areas.filter(area => area.areaManagerId === userProfile.uid);
                              hasAreaAccess = userManagedAreas.some(area => area.id === p.areaId);
                            }
                            
                            console.log(`Permit ${p.id.substring(0, 8)}: start=${normalizedStart.toISOString()}, end=${normalizedEnd.toISOString()}, today=${normalizedToday.toISOString()}, status=${p.status}, forToday=${isForToday}, hasAreaAccess=${hasAreaAccess}`);
                            
                            return isForToday && hasAreaAccess;
                          });
                          
                          console.log('All todays permits:', allTodaysPermits);
                          
                          const todaysPermits = allTodaysPermits.filter(p => 
                            p.location?.latitude && p.location?.longitude
                          );
                          
                          console.log('Todays permits with location:', todaysPermits);

                          if (allTodaysPermits.length === 0) {
                            return (
                              <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700">
                                <div className="text-center">
                                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    No Active Permits Today
                                  </h3>
                                  <p className="text-gray-500 dark:text-gray-400">
                                    There are no approved permits for today.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          
                          if (todaysPermits.length === 0) {
                            return (
                              <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700">
                                <div className="text-center">
                                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Active Permits Without Location Data
                                  </h3>
                                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                                    There are {allTodaysPermits.length} permit(s) today, but none have location data for mapping.
                                  </p>
                                  <div className="text-left bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm">
                                    <h4 className="font-medium mb-2">Today's Permits:</h4>
                                    {allTodaysPermits.map(permit => {
                                      const area = areas.find(a => a.id === permit.areaId);
                                      const burnType = burnTypes.find(bt => bt.id === permit.burnTypeId);
                                      const user = users.find(u => u.uid === permit.userId);
                                      return (
                                        <div key={permit.id} className="mb-2 p-2 border rounded text-sm">
                                          <div><strong>#{permit.id.substring(0, 8)}</strong></div>
                                          <div>User: {user?.displayName || user?.email || 'Unknown'}</div>
                                          <div>Type: {burnType?.name || 'Unknown'}</div>
                                          <div>Area: {area?.name || 'Unknown'}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Calculate map bounds to fit all permits
                          const latitudes = todaysPermits.map(p => p.location!.latitude);
                          const longitudes = todaysPermits.map(p => p.location!.longitude);
                          
                          const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
                          const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

                          return (
                            <MapContainer
                              center={[centerLat, centerLng]}
                              zoom={10}
                              style={{ height: '100%', width: '100%' }}
                              bounds={todaysPermits.map(p => [p.location!.latitude, p.location!.longitude])}
                              boundsOptions={{ padding: [20, 20] }}
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              {todaysPermits.map((permit) => {
                                const area = areas.find(a => a.id === permit.areaId);
                                const burnType = burnTypes.find(bt => bt.id === permit.burnTypeId);
                                const user = users.find(u => u.uid === permit.userId);
                                
                                return (
                                  <Marker
                                    key={permit.id}
                                    position={[permit.location!.latitude, permit.location!.longitude]}
                                    icon={markerIcons[permit.status] || markerIcons.approved}
                                  >
                                    <Popup>
                                      <div className="p-2 min-w-[200px]">
                                        <div className="font-semibold text-lg mb-2">
                                          Permit #{permit.id.substring(0, 8)}
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          <div><strong>Permit Holder:</strong> {user?.displayName || user?.email || 'Unknown'}</div>
                                          <div><strong>Burn Type:</strong> {burnType?.name || 'Unknown Type'}</div>
                                          <div><strong>Area:</strong> {area?.name || 'Unknown Area'}</div>
                                          <div><strong>Valid:</strong> {new Date(permit.startDate).toLocaleDateString()} - {new Date(permit.endDate).toLocaleDateString()}</div>
                                          <div><strong>Status:</strong> 
                                            <Badge variant="default" className="ml-1 text-xs">
                                              {permit.status.toUpperCase()}
                                            </Badge>
                                          </div>
                                          {permit.compartment && (
                                            <div><strong>Compartment:</strong> {permit.compartment}</div>
                                          )}
                                          {permit.details && (
                                            <div><strong>Details:</strong> {permit.details}</div>
                                          )}
                                          {permit.location?.address && (
                                            <div><strong>Address:</strong> {permit.location.address}</div>
                                          )}
                                        </div>
                                      </div>
                                    </Popup>
                                  </Marker>
                                );
                              })}
                            </MapContainer>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>This map shows all burn permits for today. Click on markers to view permit details.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                        <span>Active</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        <span>Cancelled/Rejected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span>Pending</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Areas Tab */}
              <TabsContent value="areas">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Areas Management</h2>
                    <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setEditingAreaId(null);
                          areaForm.reset({
                            name: "",
                            description: "",
                            areaManagerId: "",
                          });
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Area
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                          <DialogTitle>{editingAreaId ? "Edit Area" : "Create New Area"}</DialogTitle>
                          <DialogDescription>
                            {editingAreaId 
                              ? "Update the area information below." 
                              : "Fill in the details to create a new area."}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...areaForm}>
                          <form onSubmit={areaForm.handleSubmit(handleAreaSubmit)} className="space-y-6">
                            <FormField
                              control={areaForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Area Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter area name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={areaForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter area description" 
                                      {...field} 
                                      className="min-h-[100px]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={areaForm.control}
                              name="areaManagerId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Area Manager</FormLabel>
                                  <FormControl>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an area manager" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          {areaManagers.map(manager => (
                                            <SelectItem key={manager.uid} value={manager.uid}>
                                              {manager.displayName || manager.email}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormDescription>
                                    The user who will manage this area and its permissions
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <DialogFooter>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  areaForm.reset();
                                  setAreaDialogOpen(false);
                                  setEditingAreaId(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">
                                {editingAreaId ? "Update Area" : "Create Area"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {loadingAreas ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading areas...</span>
                    </div>
                  ) : areas.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <MapPin className="h-10 w-10 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">No Areas Found</h3>
                      <p>Click "Add New Area" to create your first area.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {areas.map(area => {
                        const manager = users.find(user => user.uid === area.areaManagerId);
                        
                        return (
                          <Card key={area.id} className="h-full flex flex-col">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <CardTitle>{area.name}</CardTitle>
                                <div className="flex space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditArea(area)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteArea(area.id)}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <CardDescription>{area.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Area Manager</h4>
                                  <div className="flex items-center">
                                    <Avatar className="h-6 w-6 mr-2">
                                      {manager?.photoURL ? (
                                        <AvatarImage src={manager.photoURL} alt={manager.displayName} />
                                      ) : (
                                        <AvatarFallback>
                                          {manager?.displayName ? manager.displayName.charAt(0).toUpperCase() : 
                                           manager?.email ? manager.email.charAt(0).toUpperCase() : 
                                           <User className="h-4 w-4" />}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <span>{manager?.displayName || manager?.email || "Unknown Manager"}</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium mb-1">Allowed Burn Types</h4>
                                  {area.allowedBurnTypes && Object.entries(area.allowedBurnTypes).some(([_, allowed]) => allowed) ? (
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(area.allowedBurnTypes).map(([id, allowed]) => {
                                        if (!allowed) return null;
                                        const burnType = burnTypes.find(bt => bt.id === id);
                                        if (!burnType) return null;
                                        
                                        return (
                                          <Badge key={id} variant="secondary" className="mr-1 mb-1">
                                            {burnType.name}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">No burn types allowed</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Burn Types Tab */}
              <TabsContent value="burn-types">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Burn Types Management</h2>
                    <Dialog open={burnTypeDialogOpen} onOpenChange={setBurnTypeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setEditingBurnTypeId(null);
                          burnTypeForm.reset({
                            name: "",
                            description: "",
                            defaultAllowed: false,
                            requiresPermit: true,
                          });
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Burn Type
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px]">
                        <DialogHeader>
                          <DialogTitle>{editingBurnTypeId ? "Edit Burn Type" : "Create New Burn Type"}</DialogTitle>
                          <DialogDescription>
                            {editingBurnTypeId 
                              ? "Update the burn type information below." 
                              : "Fill in the details to create a new burn type."}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...burnTypeForm}>
                          <form onSubmit={burnTypeForm.handleSubmit(handleBurnTypeSubmit)} className="space-y-6">
                            <FormField
                              control={burnTypeForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Burn Type Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter burn type name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={burnTypeForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Enter burn type description" 
                                      {...field} 
                                      className="min-h-[100px]"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={burnTypeForm.control}
                                name="defaultAllowed"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Default Allowed</FormLabel>
                                      <FormDescription>
                                        Is this burn type allowed by default in areas?
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={burnTypeForm.control}
                                name="requiresPermit"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Requires Permit</FormLabel>
                                      <FormDescription>
                                        Does this burn type require an official permit?
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  burnTypeForm.reset();
                                  setBurnTypeDialogOpen(false);
                                  setEditingBurnTypeId(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">
                                {editingBurnTypeId ? "Update Burn Type" : "Create Burn Type"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {loadingBurnTypes ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading burn types...</span>
                    </div>
                  ) : burnTypes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Flame className="h-10 w-10 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">No Burn Types Found</h3>
                      <p>Click "Add New Burn Type" to create your first burn type.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {burnTypes.map(burnType => (
                        <Card key={burnType.id} className="h-full flex flex-col">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="flex items-center">
                                {burnType.name}
                                {burnType.requiresPermit && (
                                  <Badge variant="outline" className="ml-2">
                                    Permit Required
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditBurnType(burnType)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteBurnType(burnType.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <CardDescription>{burnType.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <Label className="mr-2">Default Status:</Label>
                                <Badge variant={burnType.defaultAllowed ? "success" : "destructive"}>
                                  {burnType.defaultAllowed ? "Allowed" : "Not Allowed"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Area Permissions Tab */}
              <TabsContent value="area-permissions">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-6">Area Burn Type Permissions</h2>
                  
                  {loadingAreas || loadingBurnTypes ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading data...</span>
                    </div>
                  ) : areas.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <MapPin className="h-10 w-10 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-medium mb-2">No Areas Available</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-4">
                        There are no areas configured in the system. Create areas first before managing burn type permissions.
                      </p>
                      <Button asChild>
                        <a href="#areas" onClick={() => document.querySelector('button[value="areas"]')?.click()}>
                          Go to Area Management
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-12 gap-6">
                      {/* Areas List */}
                      <div className="md:col-span-4 lg:col-span-3">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-4">Select Area</h3>
                          <div className="space-y-2">
                            {areas.map(area => (
                              <Card 
                                key={area.id}
                                className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                                  selectedArea?.id === area.id ? 'border-2 border-primary' : ''
                                }`}
                                onClick={() => handleAreaSelect(area)}
                              >
                                <CardHeader className="p-4">
                                  <CardTitle className="text-base">{area.name}</CardTitle>
                                  <CardDescription className="text-xs line-clamp-1">
                                    {area.description}
                                  </CardDescription>
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Permission Management */}
                      <div className="md:col-span-8 lg:col-span-9">
                        {selectedArea ? (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                            <div className="mb-6">
                              <h3 className="text-lg font-medium">{selectedArea.name}</h3>
                              <p className="text-muted-foreground">{selectedArea.description}</p>
                            </div>
                            
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-base font-medium">Burn Type Permissions</h4>
                              <Button 
                                onClick={saveBurnTypePermissions}
                                disabled={savingPermissions}
                              >
                                {savingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Save Permissions
                              </Button>
                            </div>
                            
                            {burnTypes.length === 0 ? (
                              <div className="text-center py-6 bg-gray-100 dark:bg-gray-600 rounded-md">
                                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="mb-4">No burn types have been defined yet.</p>
                                <Button asChild variant="outline" size="sm">
                                  <a href="#burn-types" onClick={() => document.querySelector('button[value="burn-types"]')?.click()}>
                                    Go to Burn Type Management
                                  </a>
                                </Button>
                              </div>
                            ) : (
                              <Table>
                                <TableCaption>Toggle permissions for each burn type in this area</TableCaption>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Burn Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Requires Permit</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Allow in Area</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {burnTypes.map(burnType => {
                                    // Check if burnTypeId exists in allowedBurnTypes and is true
                                    // If it doesn't exist at all or is false, it's not allowed
                                    const exists = burnType.id in burnTypePermissions;
                                    const isAllowed = exists && burnTypePermissions[burnType.id];
                                    
                                    return (
                                      <TableRow key={burnType.id}>
                                        <TableCell className="font-medium">{burnType.name}</TableCell>
                                        <TableCell>{burnType.description}</TableCell>
                                        <TableCell>
                                          {burnType.requiresPermit 
                                            ? <Badge variant="secondary">Required</Badge>
                                            : <Badge variant="outline">Not Required</Badge>
                                          }
                                        </TableCell>
                                        <TableCell>
                                          {isAllowed 
                                            ? <div className="flex items-center text-green-600 dark:text-green-500">
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                <span>Allowed</span>
                                              </div>
                                            : <div className="flex items-center text-red-600 dark:text-red-500">
                                                <XCircle className="h-4 w-4 mr-1" />
                                                <span>Not Allowed</span>
                                              </div>
                                          }
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center space-x-2">
                                            <Switch
                                              checked={isAllowed}
                                              onCheckedChange={(checked) => 
                                                handleBurnTypeToggle(burnType.id, checked)
                                              }
                                              disabled={savingPermissions}
                                            />
                                            <Label htmlFor={`burn-type-${burnType.id}`}>
                                              {isAllowed ? "Allowed" : "Not Allowed"}
                                            </Label>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg h-full">
                            <MapPin className="h-12 w-12 text-primary opacity-50 mb-4" />
                            <h3 className="text-xl font-medium mb-2">Select an Area</h3>
                            <p className="text-center text-muted-foreground mb-6">
                              Choose an area from the list to manage its burn type permissions
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
        
        {/* Permit Details Dialog */}
        <Dialog open={permitDetailsOpen} onOpenChange={setPermitDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                      {burnTypes.find(bt => bt.id === selectedPermit.burnTypeId)?.name || 'Unknown Burn Type'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permit ID: {selectedPermit.id.substring(0, 12)}...
                    </p>
                  </div>
                  <Badge 
                    variant={
                      selectedPermit.status === 'approved' ? 'default' :
                      selectedPermit.status === 'pending' ? 'secondary' :
                      selectedPermit.status === 'rejected' || selectedPermit.status === 'cancelled' ? 'destructive' :
                      'outline'
                    }
                    className="text-sm px-3 py-1"
                  >
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
                          <MapPin className="h-4 w-4 mr-1" />
                          {new Date(selectedPermit.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Applied</span>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          {new Date(selectedPermit.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {selectedPermit.status === "approved" && selectedPermit.approvedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Approved</span>
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {new Date(selectedPermit.approvedAt).toLocaleDateString()}
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
                        <span className="text-sm text-muted-foreground block mb-1">Area</span>
                        <div className="flex items-center text-sm font-medium">
                          <MapPin className="h-4 w-4 mr-1" />
                          {areas.find(a => a.id === selectedPermit.areaId)?.name || 'Unknown Area'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground block mb-1">Coordinates</span>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          {selectedPermit.location?.latitude?.toFixed(6)}, {selectedPermit.location?.longitude?.toFixed(6)}
                        </div>
                        {selectedPermit.location?.address && (
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
                          {users.find(u => u.uid === selectedPermit.userId)?.displayName || 
                           users.find(u => u.uid === selectedPermit.userId)?.email || 
                           'Unknown User'}
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
                      Approved by: <span className="font-medium">{selectedPermit.approvedBy}</span> on {new Date(selectedPermit.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {selectedPermit.status === "rejected" && selectedPermit.rejectionReason && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center mb-2">
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
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
                      <XCircle className="h-5 w-5 text-orange-600 mr-2" />
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
              <Button variant="outline" onClick={() => setPermitDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}