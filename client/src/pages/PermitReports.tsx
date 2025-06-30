import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { BurnPermit } from "@/lib/permit-types";
import { Area, BurnType } from "@/lib/area-types";
import { UserProfile } from "@/lib/firebase";
import { getAllAreas, getAllBurnTypes } from "@/lib/area-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Download, Filter, BarChart3, Loader2, Search, RotateCcw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area as RechartsArea
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PermitReports() {
  const { user, userProfile, isAdmin, hasManagerAccess, loading } = useAuth();
  const { toast } = useToast();
  
  // Data state
  const [permits, setPermits] = useState<BurnPermit[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);
  
  // Filter state
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedBurnType, setSelectedBurnType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [dateRange, setDateRange] = useState<string>("30");

  // Fetch initial data (areas and burn types only)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (user && userProfile && hasManagerAccess) {
        try {
          setInitialLoading(true);
          
          // Fetch areas and burn types
          const [areasData, burnTypesData] = await Promise.all([
            getAllAreas(),
            getAllBurnTypes()
          ]);
          
          setAreas(areasData);
          setBurnTypes(burnTypesData);
          
        } catch (error) {
          console.error("Error fetching initial data:", error);
          toast({
            title: "Error",
            description: "Failed to load areas and burn types. Please try again.",
            variant: "destructive",
          });
        } finally {
          setInitialLoading(false);
        }
      }
    };

    fetchInitialData();
  }, [user, userProfile, hasManagerAccess, toast]);

  // Generate report function
  const generateReport = async () => {
    if (!user || !userProfile || !hasManagerAccess) return;
    
    try {
      setLoadingData(true);
      
      // Fetch permits
      const idToken = await user.getIdToken();
      const permitResponse = await fetch('/api/permits', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (permitResponse.ok) {
        const permitData = await permitResponse.json();
        setPermits(permitData.data || []);
        setHasGeneratedReport(true);
        toast({
          title: "Success",
          description: "Report generated successfully!",
        });
      } else {
        throw new Error('Failed to fetch permits');
      }
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Reset filters and data
  const resetReport = () => {
    setSelectedArea("all");
    setSelectedBurnType("all");
    setSelectedStatus("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setDateRange("30");
    setPermits([]);
    setHasGeneratedReport(false);
    toast({
      title: "Reset Complete",
      description: "All filters have been cleared and data reset.",
    });
  };

  // Filter permits based on selected criteria
  const filteredPermits = permits.filter(permit => {
    const permitDate = new Date(permit.createdAt);
    const now = new Date();
    
    // Normalize dates to start of day for accurate comparison (using UTC to avoid timezone issues)
    const normalizedPermitDate = new Date(Date.UTC(permitDate.getUTCFullYear(), permitDate.getUTCMonth(), permitDate.getUTCDate()));
    const normalizedNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Date range filter
    if (dateRange !== "all") {
      const daysAgo = new Date(normalizedNow.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      if (normalizedPermitDate < daysAgo) return false;
    }
    
    // Custom date range filter
    if (dateFrom) {
      const normalizedDateFrom = new Date(Date.UTC(dateFrom.getUTCFullYear(), dateFrom.getUTCMonth(), dateFrom.getUTCDate()));
      if (normalizedPermitDate < normalizedDateFrom) return false;
    }
    if (dateTo) {
      const normalizedDateTo = new Date(Date.UTC(dateTo.getUTCFullYear(), dateTo.getUTCMonth(), dateTo.getUTCDate()));
      if (normalizedPermitDate > normalizedDateTo) return false;
    }
    
    // Area filter
    if (selectedArea !== "all" && permit.areaId !== selectedArea) return false;
    
    // Burn type filter
    if (selectedBurnType !== "all" && permit.burnTypeId !== selectedBurnType) return false;
    
    // Status filter
    if (selectedStatus !== "all" && permit.status !== selectedStatus) return false;
    
    return true;
  });

  // Calculate statistics
  const totalPermits = filteredPermits.length;
  const approvedPermits = filteredPermits.filter(p => p.status === 'approved').length;
  const pendingPermits = filteredPermits.filter(p => p.status === 'pending').length;
  const rejectedPermits = filteredPermits.filter(p => p.status === 'rejected').length;
  const cancelledPermits = filteredPermits.filter(p => p.status === 'cancelled').length;

  // Prepare chart data
  const statusData = [
    { name: 'Approved', value: approvedPermits, color: '#00C49F' },
    { name: 'Pending', value: pendingPermits, color: '#FFBB28' },
    { name: 'Rejected', value: rejectedPermits, color: '#FF8042' },
    { name: 'Cancelled', value: cancelledPermits, color: '#8884d8' }
  ].filter(item => item.value > 0);

  // Permits by area
  const areaData = areas.map(area => ({
    name: area.name,
    permits: filteredPermits.filter(p => p.areaId === area.id).length
  })).filter(item => item.permits > 0);

  // Permits by burn type
  const burnTypeData = burnTypes.map(burnType => ({
    name: burnType.name,
    permits: filteredPermits.filter(p => p.burnTypeId === burnType.id).length
  })).filter(item => item.permits > 0);

  // Calculate time range for chart
  const getTimeRange = () => {
    const now = new Date();
    let startDate = new Date();
    let days = 30; // default
    
    if (dateFrom && dateTo) {
      // Use custom date range
      startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else if (dateRange !== "all") {
      // Use preset date range
      days = parseInt(dateRange);
      startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    } else {
      // For "all time", show last 30 days or date range of permits
      if (filteredPermits.length > 0) {
        const oldestPermit = filteredPermits.reduce((oldest, permit) => {
          const permitDate = new Date(permit.createdAt);
          return permitDate < oldest ? permitDate : oldest;
        }, new Date());
        
        const daysDiff = Math.ceil((now.getTime() - oldestPermit.getTime()) / (1000 * 60 * 60 * 24));
        days = Math.min(daysDiff + 1, 90); // Cap at 90 days for performance
        startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      }
    }
    
    return { startDate, days: Math.max(1, days) };
  };

  const { startDate, days } = getTimeRange();

  // Debug the actual date range being used
  console.log('Chart range debug:', {
    startDate: startDate.toISOString(),
    days,
    sampleDates: Array.from({ length: Math.min(5, days) }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString();
    })
  });

  // Permits over time based on selected range
  const timeData = Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const dayPermits = filteredPermits.filter(p => {
      const permitDate = new Date(p.createdAt);
      const normalizedPermitDate = new Date(Date.UTC(permitDate.getUTCFullYear(), permitDate.getUTCMonth(), permitDate.getUTCDate()));
      const normalizedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      
      return normalizedPermitDate.getTime() === normalizedDate.getTime();
    });
    
    // Debug the last day (today) to see what's happening
    if (i === days - 1) {
      console.log('Today\'s data debug:', {
        chartDate: date.toISOString(),
        normalizedChartDate: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString(),
        totalFilteredPermits: filteredPermits.length,
        dayPermitsCount: dayPermits.length,
        firstPermit: filteredPermits[0] ? {
          createdAt: filteredPermits[0].createdAt,
          normalized: new Date(Date.UTC(new Date(filteredPermits[0].createdAt).getUTCFullYear(), new Date(filteredPermits[0].createdAt).getUTCMonth(), new Date(filteredPermits[0].createdAt).getUTCDate())).toISOString()
        } : null
      });
    }
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      permits: dayPermits.length,
      approved: dayPermits.filter(p => p.status === 'approved').length,
      pending: dayPermits.filter(p => p.status === 'pending').length,
      rejected: dayPermits.filter(p => p.status === 'rejected').length
    };
  });

  // Generate dynamic chart title based on date range
  const getChartTitle = () => {
    if (dateFrom && dateTo) {
      return `Permits Over Time (${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d, yyyy")})`;
    } else if (dateRange !== "all") {
      const dayCount = parseInt(dateRange);
      return `Permits Over Time (Last ${dayCount} day${dayCount === 1 ? '' : 's'})`;
    } else {
      return `Permits Over Time (All Time - ${days} day${days === 1 ? '' : 's'} shown)`;
    }
  };

  // Redirect if not authorized - moved after all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile || !hasManagerAccess) {
    return <Redirect to="/admin" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Helmet>
        <title>Permit Reports - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="Comprehensive permit analytics and reporting dashboard" />
      </Helmet>
      
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Permit Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive analytics and insights for burn permit management
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Area</label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue />
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
                <label className="text-sm font-medium mb-2 block">Burn Type</label>
                <Select value={selectedBurnType} onValueChange={setSelectedBurnType}>
                  <SelectTrigger>
                    <SelectValue />
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
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={generateReport} 
                  disabled={loadingData || initialLoading}
                  className="flex-1"
                >
                  {loadingData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
                <Button 
                  onClick={resetReport} 
                  variant="outline"
                  disabled={loadingData || initialLoading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading areas and burn types...</span>
          </div>
        ) : loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Generating report...</span>
          </div>
        ) : !hasGeneratedReport ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Report Generated
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">
              Configure your filters above and click "Generate Report" to view permit analytics and insights.
            </p>
            <Button onClick={generateReport} disabled={loadingData}>
              <Search className="mr-2 h-4 w-4" />
              Generate Your First Report
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Permits</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPermits}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{approvedPermits}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalPermits > 0 ? Math.round((approvedPermits / totalPermits) * 100) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{pendingPermits}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalPermits > 0 ? Math.round((pendingPermits / totalPermits) * 100) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected/Cancelled</CardTitle>
                  <div className="h-4 w-4 rounded-full bg-red-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{rejectedPermits + cancelledPermits}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalPermits > 0 ? Math.round(((rejectedPermits + cancelledPermits) / totalPermits) * 100) : 0}% of total
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Permit Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Permits by Area */}
              <Card>
                <CardHeader>
                  <CardTitle>Permits by Area</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={areaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="permits" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Permits by Burn Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Permits by Burn Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={burnTypeData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="permits" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Permits Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>{getChartTitle()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="permits" stroke="#8884d8" name="Total" />
                      <Line type="monotone" dataKey="approved" stroke="#00C49F" name="Approved" />
                      <Line type="monotone" dataKey="pending" stroke="#FFBB28" name="Pending" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Trend Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Permit Trend Analysis</CardTitle>
                <CardDescription>
                  Daily permit submissions and approvals over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <RechartsArea
                      type="monotone"
                      dataKey="approved"
                      stackId="1"
                      stroke="#00C49F"
                      fill="#00C49F"
                      name="Approved"
                    />
                    <RechartsArea
                      type="monotone"
                      dataKey="pending"
                      stackId="1"
                      stroke="#FFBB28"
                      fill="#FFBB28"
                      name="Pending"
                    />
                    <RechartsArea
                      type="monotone"
                      dataKey="rejected"
                      stackId="1"
                      stroke="#FF8042"
                      fill="#FF8042"
                      name="Rejected"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}