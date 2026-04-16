import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect, useLocation } from "wouter";
import { UserProfile } from "@/lib/firebase";
import { BurnPermit } from "@/lib/permit-types";
import { Area, BurnType } from "@/lib/area-types";
import { getAllAreas, getAllBurnTypes } from "@/lib/area-service";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";

import {
  Card,
  CardContent,
  CardDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  User, 
  FileText, 
  Download, 
  Calendar, 
  MapPin, 
  Building,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Map,
  List
} from "lucide-react";
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

interface UserReportStats {
  totalPermits: number;
  approvedPermits: number;
  pendingPermits: number;
  rejectedPermits: number;
  cancelledPermits: number;
  completedPermits: number;
  averageProcessingTime: number; // in days
  mostUsedArea: string;
  mostUsedBurnType: string;
  totalBurnDays: number;
}

export default function UserReportsPage() {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Get user ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('userId');
  const targetUserEmail = urlParams.get('userEmail');
  const targetUserName = urlParams.get('userName');
  
  // State
  const [permits, setPermits] = useState<BurnPermit[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [loadingPermits, setLoadingPermits] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingBurnTypes, setLoadingBurnTypes] = useState(true);
  const [reportStats, setReportStats] = useState<UserReportStats | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [burnTypeFilter, setBurnTypeFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  // Fetch user permits
  useEffect(() => {
    const fetchUserPermits = async () => {
      if (user && userProfile && targetUserId) {
        try {
          setLoadingPermits(true);
          const idToken = await user.getIdToken();
          
          const response = await fetch(`/api/permits?userId=${targetUserId}&includeHistorical=true`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch user permits');
          }
          
          const data = await response.json();
          
          setPermits(data.data || []);
        } catch (error) {
          console.error("Error fetching user permits:", error);
          toast({
            title: "Error",
            description: "Failed to load user permits. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingPermits(false);
        }
      }
    };

    if (!loading && user && userProfile && isAdmin && targetUserId) {
      fetchUserPermits();
    }
  }, [user, userProfile, loading, toast, isAdmin, targetUserId]);

  // Fetch areas and burn types
  useEffect(() => {
    const fetchData = async () => {
      if (isAdmin) {
        try {
          setLoadingAreas(true);
          setLoadingBurnTypes(true);
          
          const [allAreas, allBurnTypes] = await Promise.all([
            getAllAreas(),
            getAllBurnTypes()
          ]);
          
          setAreas(allAreas);
          setBurnTypes(allBurnTypes);
        } catch (error) {
          console.error("Error fetching areas and burn types:", error);
          toast({
            title: "Error",
            description: "Failed to load areas and burn types. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoadingAreas(false);
          setLoadingBurnTypes(false);
        }
      }
    };

    if (!loading && isAdmin) {
      fetchData();
    }
  }, [isAdmin, loading, toast]);

  // Calculate report statistics
  useEffect(() => {
    if (permits.length > 0 && areas.length > 0 && burnTypes.length > 0) {
      const stats: UserReportStats = {
        totalPermits: permits.length,
        approvedPermits: permits.filter(p => p.status === 'approved').length,
        pendingPermits: permits.filter(p => p.status === 'pending').length,
        rejectedPermits: permits.filter(p => p.status === 'rejected').length,
        cancelledPermits: permits.filter(p => p.status === 'cancelled').length,
        completedPermits: permits.filter(p => p.status === 'completed').length,
        averageProcessingTime: 0,
        mostUsedArea: '',
        mostUsedBurnType: '',
        totalBurnDays: 0
      };

      // Calculate average processing time
      const processedPermits = permits.filter(p => p.approvedAt);
      if (processedPermits.length > 0) {
        const totalProcessingTime = processedPermits.reduce((acc, permit) => {
          const created = new Date(permit.createdAt);
          const approved = new Date(permit.approvedAt!);
          return acc + (approved.getTime() - created.getTime());
        }, 0);
        stats.averageProcessingTime = Math.round(totalProcessingTime / (processedPermits.length * 24 * 60 * 60 * 1000));
      }

      // Find most used area
      const areaCounts = permits.reduce((acc, permit) => {
        acc[permit.areaId] = (acc[permit.areaId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostUsedAreaId = Object.entries(areaCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
      stats.mostUsedArea = areas.find(a => a.id === mostUsedAreaId)?.name || 'N/A';

      // Find most used burn type
      const burnTypeCounts = permits.reduce((acc, permit) => {
        acc[permit.burnTypeId] = (acc[permit.burnTypeId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostUsedBurnTypeId = Object.entries(burnTypeCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
      stats.mostUsedBurnType = burnTypes.find(bt => bt.id === mostUsedBurnTypeId)?.name || 'N/A';

      // Calculate total burn days
      stats.totalBurnDays = permits.reduce((acc, permit) => {
        const start = new Date(permit.startDate);
        const end = new Date(permit.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        return acc + days;
      }, 0);

      setReportStats(stats);
    }
  }, [permits, areas, burnTypes]);

  // Filter permits based on current filters
  const filteredPermits = permits.filter(permit => {
    // Status filter
    if (statusFilter !== "all" && permit.status !== statusFilter) return false;
    
    // Area filter
    if (areaFilter !== "all" && permit.areaId !== areaFilter) return false;
    
    // Burn type filter
    if (burnTypeFilter !== "all" && permit.burnTypeId !== burnTypeFilter) return false;
    
    // Date filters
    if (dateFromFilter) {
      const permitDate = new Date(permit.startDate);
      const fromDate = new Date(dateFromFilter);
      if (permitDate < fromDate) return false;
    }
    
    if (dateToFilter) {
      const permitDate = new Date(permit.endDate);
      const toDate = new Date(dateToFilter);
      if (permitDate > toDate) return false;
    }
    
    return true;
  });

  // Export report as CSV
  const exportReport = () => {
    const csvData = [
      ['Permit ID', 'Status', 'Area', 'Burn Type', 'Start Date', 'End Date', 'Compartment', 'Details', 'Created Date', 'Approved Date'],
      ...filteredPermits.map(permit => [
        permit.id,
        permit.status,
        areas.find(a => a.id === permit.areaId)?.name || 'Unknown',
        burnTypes.find(bt => bt.id === permit.burnTypeId)?.name || 'Unknown',
        new Date(permit.startDate).toLocaleDateString(),
        new Date(permit.endDate).toLocaleDateString(),
        permit.compartment || '',
        permit.details || '',
        new Date(permit.createdAt).toLocaleDateString(),
        permit.approvedAt ? new Date(permit.approvedAt).toLocaleDateString() : ''
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_report_${targetUserName || targetUserEmail}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  // Redirect if not admin
  if (!loading && !isAdmin) {
    return <Redirect to="/" />;
  }

  // Redirect if no user ID provided
  if (!targetUserId) {
    return <Redirect to="/admin?tab=users" />;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <Helmet>
        <title>User Reports - {targetUserName || targetUserEmail} - Umpiluzi Fire Protection Association</title>
        <meta name="description" content={`Detailed report for user ${targetUserName || targetUserEmail} including permit history and statistics`} />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/admin?tab=users')}
                  className="mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Users
                </Button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">User Reports</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {targetUserName || targetUserEmail}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex rounded-lg border bg-background p-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="flex items-center gap-2"
                  >
                    <List className="h-4 w-4" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    className="flex items-center gap-2"
                  >
                    <Map className="h-4 w-4" />
                    Map
                  </Button>
                </div>
                <Button onClick={exportReport} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            {reportStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Permits</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportStats.totalPermits}</div>
                    <p className="text-xs text-muted-foreground">
                      All time permits
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportStats.totalPermits > 0 ? Math.round((reportStats.approvedPermits / reportStats.totalPermits) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reportStats.approvedPermits} of {reportStats.totalPermits} approved
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportStats.averageProcessingTime}</div>
                    <p className="text-xs text-muted-foreground">
                      Days to approval
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Burn Days</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportStats.totalBurnDays}</div>
                    <p className="text-xs text-muted-foreground">
                      Across all permits
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Most Used Area</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{reportStats.mostUsedArea}</div>
                    <p className="text-xs text-muted-foreground">
                      Primary burning location
                    </p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Most Used Burn Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{reportStats.mostUsedBurnType}</div>
                    <p className="text-xs text-muted-foreground">
                      Preferred burn method
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Status Breakdown */}
            {reportStats && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Permit Status Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{reportStats.approvedPermits}</div>
                      <div className="text-sm text-muted-foreground">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{reportStats.pendingPermits}</div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{reportStats.rejectedPermits}</div>
                      <div className="text-sm text-muted-foreground">Rejected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{reportStats.cancelledPermits}</div>
                      <div className="text-sm text-muted-foreground">Cancelled</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{reportStats.completedPermits}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Filter Permits</CardTitle>
                <CardDescription>Narrow down the permit list using the filters below</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="area-filter">Area</Label>
                    <Select value={areaFilter} onValueChange={setAreaFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All areas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Areas</SelectItem>
                        {areas.map(area => (
                          <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="burntype-filter">Burn Type</Label>
                    <Select value={burnTypeFilter} onValueChange={setBurnTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {burnTypes.map(burnType => (
                          <SelectItem key={burnType.id} value={burnType.id}>{burnType.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date-from">From Date</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="date-to">To Date</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setAreaFilter("all");
                      setBurnTypeFilter("all");
                      setDateFromFilter("");
                      setDateToFilter("");
                    }}
                  >
                    Clear All Filters
                  </Button>
                  <div className="text-sm text-muted-foreground flex items-center">
                    Showing {filteredPermits.length} of {permits.length} permits
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permits Display */}
            <Card>
              <CardHeader>
                <CardTitle>{viewMode === 'map' ? 'Permit Locations' : 'Permit History'}</CardTitle>
                <CardDescription>
                  {viewMode === 'map' 
                    ? 'Geographic view of all permit locations for this user'
                    : 'Complete list of all permits for this user'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPermits || loadingAreas || loadingBurnTypes ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Loading permits...</span>
                  </div>
                ) : filteredPermits.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">
                      {permits.length === 0 ? "No permits found for this user." : "No permits match the current filters."}
                    </p>
                  </div>
                ) : viewMode === 'table' ? (
                  <>
                    {/* Mobile cards */}
                    <ul className="md:hidden space-y-3" aria-label={`Permit list for ${targetUserName || targetUserEmail}`}>
                      {filteredPermits.map((permit) => {
                        const area = areas.find(a => a.id === permit.areaId);
                        const burnType = burnTypes.find(bt => bt.id === permit.burnTypeId);
                        return (
                          <li key={permit.id} className="rounded-md border p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-mono text-xs text-muted-foreground">#{permit.id.substring(0, 8)}</div>
                                <div className="font-semibold flex items-center"><Flame className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />{burnType?.name ?? 'Unknown Type'}</div>
                                <div className="text-sm text-muted-foreground flex items-center"><MapPin className="h-4 w-4 mr-1" aria-hidden="true" />{area?.name ?? 'Unknown Area'}</div>
                              </div>
                              <Badge variant={getStatusBadgeVariant(permit.status)}>{permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center tabular-nums"><Calendar className="h-3.5 w-3.5 mr-1" aria-hidden="true" />{new Date(permit.startDate).toLocaleDateString("en-ZA")} – {new Date(permit.endDate).toLocaleDateString("en-ZA")}</div>
                              {permit.compartment && <div className="flex items-center"><Building className="h-3.5 w-3.5 mr-1" aria-hidden="true" />{permit.compartment}</div>}
                              <div className="tabular-nums">Created: {new Date(permit.createdAt).toLocaleDateString("en-ZA")}</div>
                              {permit.approvedAt && <div className="tabular-nums">Approved: {new Date(permit.approvedAt).toLocaleDateString("en-ZA")}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {/* Desktop table */}
                    <div className="overflow-x-auto hidden md:block">
                    <Table>
                      <TableCaption>List of permits for {targetUserName || targetUserEmail}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Permit ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Burn Type</TableHead>
                          <TableHead>Compartment</TableHead>
                          <TableHead>Date Range</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Approved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPermits.map((permit) => {
                          const area = areas.find(a => a.id === permit.areaId);
                          const burnType = burnTypes.find(bt => bt.id === permit.burnTypeId);

                          return (
                            <TableRow key={permit.id}>
                              <TableCell className="font-mono text-sm">
                                {permit.id.substring(0, 8)}...
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(permit.status)}>
                                  {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />
                                  {area ? area.name : 'Unknown Area'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Flame className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />
                                  {burnType ? burnType.name : 'Unknown Type'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {permit.compartment ? (
                                  <div className="flex items-center">
                                    <Building className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />
                                    <span>{permit.compartment}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" aria-hidden="true" />
                                  {new Date(permit.startDate).toLocaleDateString("en-ZA")} – {new Date(permit.endDate).toLocaleDateString("en-ZA")}
                                </div>
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {new Date(permit.createdAt).toLocaleDateString("en-ZA")}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {permit.approvedAt ? new Date(permit.approvedAt).toLocaleDateString("en-ZA") : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    </div>
                  </>
                ) : (
                  // Map View
                  <div className="h-[600px] w-full">
                    {(() => {
                      // Filter permits with location data
                      const permitsWithLocation = filteredPermits.filter(p => 
                        p.location?.latitude && p.location?.longitude
                      );

                      if (permitsWithLocation.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-center">
                              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                No Location Data
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400">
                                {filteredPermits.length > 0 
                                  ? "None of the filtered permits have location data for mapping."
                                  : "No permits found to display on map."
                                }
                              </p>
                            </div>
                          </div>
                        );
                      }

                      // Calculate map bounds to fit all permits
                      const latitudes = permitsWithLocation.map(p => p.location!.latitude);
                      const longitudes = permitsWithLocation.map(p => p.location!.longitude);
                      
                      const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
                      const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

                      return (
                        <MapContainer
                          center={[centerLat, centerLng]}
                          zoom={10}
                          style={{ height: '100%', width: '100%' }}
                          bounds={permitsWithLocation.map(p => [p.location!.latitude, p.location!.longitude])}
                          boundsOptions={{ padding: [20, 20] }}
                          className="rounded-lg"
                          role="region"
                          aria-label="Map of permit locations for this user"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          {permitsWithLocation.map((permit) => {
                            const area = areas.find(a => a.id === permit.areaId);
                            const burnType = burnTypes.find(bt => bt.id === permit.burnTypeId);
                            
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
                                      <div><strong>Status:</strong> 
                                        <Badge variant={getStatusBadgeVariant(permit.status)} className="ml-1 text-xs">
                                          {permit.status.toUpperCase()}
                                        </Badge>
                                      </div>
                                      <div><strong>Burn Type:</strong> {burnType?.name || 'Unknown Type'}</div>
                                      <div><strong>Area:</strong> {area?.name || 'Unknown Area'}</div>
                                      <div><strong>Valid:</strong> {new Date(permit.startDate).toLocaleDateString()} - {new Date(permit.endDate).toLocaleDateString()}</div>
                                      {permit.compartment && (
                                        <div><strong>Compartment:</strong> {permit.compartment}</div>
                                      )}
                                      {permit.details && (
                                        <div><strong>Details:</strong> {permit.details}</div>
                                      )}
                                      {permit.location?.address && (
                                        <div><strong>Address:</strong> {permit.location.address}</div>
                                      )}
                                      <div><strong>Created:</strong> {new Date(permit.createdAt).toLocaleDateString()}</div>
                                      {permit.approvedAt && (
                                        <div><strong>Approved:</strong> {new Date(permit.approvedAt).toLocaleDateString()}</div>
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
                )}

                {viewMode === 'map' && filteredPermits.some(p => p.location?.latitude && p.location?.longitude) && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>This map shows {filteredPermits.filter(p => p.location?.latitude && p.location?.longitude).length} permits with location data. Click on markers to view permit details.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                        <span>Approved</span>
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
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}