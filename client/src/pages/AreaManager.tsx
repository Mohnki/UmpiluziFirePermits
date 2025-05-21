import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { 
  getAreasByManager, 
  getAllBurnTypes,
  updateAreaBurnTypes,
  getAreaById
} from "@/lib/area-service";
import { Area, BurnType } from "@/lib/area-types";
import BanManagement from "@/components/BanManagement";
import { getPermitsByArea } from "@/lib/permit-service";
import { BurnPermit } from "@/lib/permit-types";
import PermitManagement from "@/components/PermitManagement";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  MapPin, 
  Flame,
  CheckCircle2,
  XCircle,
  Info,
  Calendar,
  SquareUser
} from "lucide-react";
import { format } from "date-fns";

export default function AreaManagerPage() {
  const { user, userProfile, isAreaManager, hasManagerAccess, loading } = useAuth();
  const { toast } = useToast();
  
  // Areas state
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  
  // Burn types state
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [loadingBurnTypes, setLoadingBurnTypes] = useState(true);
  
  // Permission state
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [burnTypePermissions, setBurnTypePermissions] = useState<{ [key: string]: boolean }>({});
  
  // Permits state
  const [permits, setPermits] = useState<BurnPermit[]>([]);
  const [loadingPermits, setLoadingPermits] = useState(false);

  // Fetch areas managed by the current user
  useEffect(() => {
    const fetchAreas = async () => {
      if (userProfile && hasManagerAccess) {
        try {
          setLoadingAreas(true);
          const userAreas = await getAreasByManager(userProfile.uid);
          setAreas(userAreas);
          if (userAreas.length > 0 && !selectedArea) {
            setSelectedArea(userAreas[0]);
            setBurnTypePermissions(userAreas[0].allowedBurnTypes || {});
            fetchPermits(userAreas[0].id);
          }
        } catch (error) {
          console.error("Error fetching areas:", error);
          toast({
            title: "Error",
            description: "Failed to load your managed areas. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingAreas(false);
        }
      }
    };

    if (!loading && hasManagerAccess) {
      fetchAreas();
    }
  }, [hasManagerAccess, loading, userProfile, toast, selectedArea]);

  // Fetch all burn types
  useEffect(() => {
    const fetchBurnTypes = async () => {
      if (hasManagerAccess) {
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

    if (!loading && hasManagerAccess) {
      fetchBurnTypes();
    }
  }, [hasManagerAccess, loading, toast]);

  // Fetch permits for an area
  const fetchPermits = async (areaId: string) => {
    try {
      setLoadingPermits(true);
      const areaPermits = await getPermitsByArea(areaId);
      setPermits(areaPermits);
    } catch (error) {
      console.error("Error fetching permits:", error);
      toast({
        title: "Error",
        description: "Failed to load permit applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPermits(false);
    }
  };

  // Handle area selection
  const handleAreaSelect = async (area: Area) => {
    setSelectedArea(area);
    setBurnTypePermissions(area.allowedBurnTypes || {});
    fetchPermits(area.id);
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

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'outline';
      default:
        return 'default';
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

  // Redirect if not an area manager or admin
  if (!loading && !hasManagerAccess) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <Helmet>
        <title>Area Management - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="Manage your assigned areas and burn type permissions" />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Area Management</h1>
            
            {loadingAreas || loadingBurnTypes ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading data...</span>
              </div>
            ) : areas.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <MapPin className="h-10 w-10 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">No Areas Assigned</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You don't have any areas assigned to manage. Please contact an administrator to be assigned to an area.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-12 gap-6">
                {/* Areas List */}
                <div className="md:col-span-4 lg:col-span-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                    <h2 className="text-lg font-semibold mb-4">Your Areas</h2>
                    <div className="space-y-2">
                      {areas.map(area => (
                        <Card 
                          key={area.id}
                          className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
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
                
                {/* Area Management Sections */}
                <div className="md:col-span-8 lg:col-span-9">
                  {selectedArea ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold">{selectedArea.name}</h2>
                        <p className="text-muted-foreground">{selectedArea.description}</p>
                      </div>
                      
                      <Tabs defaultValue="permissions" className="w-full">
                        <TabsList>
                          <TabsTrigger value="permissions">Burn Type Permissions</TabsTrigger>
                          <TabsTrigger value="bans">Burn Bans</TabsTrigger>
                          <TabsTrigger value="permits">Permit Applications</TabsTrigger>
                        </TabsList>
                        
                        {/* Permissions Tab */}
                        <TabsContent value="permissions" className="pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Burn Type Permissions</h3>
                            <Button 
                              onClick={saveBurnTypePermissions}
                              disabled={savingPermissions}
                            >
                              {savingPermissions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Save Permissions
                            </Button>
                          </div>
                          
                          {burnTypes.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-md">
                              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No burn types have been defined yet. Contact an administrator to set up burn types.</p>
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
                                  // Check if burnTypeId exists in allowedBurnTypes
                                  // If it doesn't exist at all (not just false), it's not allowed
                                  const exists = burnType.id in burnTypePermissions;
                                  const isAllowed = exists ? burnTypePermissions[burnType.id] : burnType.defaultAllowed;
                                  
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
                        </TabsContent>
                        
                        {/* Burn Bans Tab */}
                        <TabsContent value="bans" className="pt-4">
                          {selectedArea && <BanManagement area={selectedArea} />}
                        </TabsContent>
                        
                        {/* Permits Tab */}
                        <TabsContent value="permits" className="pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Burn Permit Management</h3>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => fetchPermits(selectedArea.id)}
                              disabled={loadingPermits}
                            >
                              {loadingPermits && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Refresh Permits
                            </Button>
                          </div>
                          
                          {loadingPermits ? (
                            <div className="flex items-center justify-center py-10">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="ml-2">Loading permit applications...</span>
                            </div>
                          ) : (
                            <PermitManagement
                              permits={permits}
                              burnTypes={burnTypes}
                              areaName={selectedArea.name}
                              userId={user.uid}
                              onPermitUpdated={() => fetchPermits(selectedArea.id)}
                            />
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center justify-center h-full">
                      <div className="text-center">
                        <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <h3 className="text-lg font-medium">Select an Area</h3>
                        <p className="text-muted-foreground mt-1">
                          Please select an area from the list to manage burn type permissions
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}