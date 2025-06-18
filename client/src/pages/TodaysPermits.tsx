import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { 
  getAllAreas, 
  getAllBurnTypes
} from "@/lib/area-service";
import { Area, BurnType } from "@/lib/area-types";
import { BurnPermit } from "@/lib/permit-types";
import { getAllUsers, UserProfile } from "@/lib/firebase";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Badge } from "@/components/ui/badge";
import { Map, MapPin, Loader2 } from "lucide-react";

// Fix Leaflet icon issues
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Status-based marker icons
const markerIcons = {
  approved: L.icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  pending: L.icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  rejected: L.icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  cancelled: L.icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  completed: L.icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
};

export default function TodaysPermits() {
  const { user, userProfile, loading, isAdmin, isAreaManager } = useAuth();
  const { toast } = useToast();
  
  const [permits, setPermits] = useState<BurnPermit[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [loadingPermits, setLoadingPermits] = useState(false);

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Redirect to="/" />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userProfile) return;

      try {
        setLoadingPermits(true);
        
        // Fetch areas and burn types
        const [areasData, burnTypesData] = await Promise.all([
          getAllAreas(),
          getAllBurnTypes()
        ]);
        
        setAreas(areasData || []);
        setBurnTypes(burnTypesData || []);

        // Fetch permits
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
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load permits data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingPermits(false);
      }
    };

    fetchData();
  }, [user, userProfile, toast]);

  // Filter today's permits based on user permissions
  const getTodaysPermits = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const normalizeDate = (date: Date): Date => {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };
    
    return permits.filter(p => {
      const startDate = new Date(p.startDate);
      const endDate = new Date(p.endDate);
      
      const normalizedStart = normalizeDate(startDate);
      const normalizedEnd = normalizeDate(endDate);
      const normalizedToday = normalizeDate(today);
      
      // Check if permit is active today
      const isForToday = normalizedStart <= normalizedToday && normalizedEnd >= normalizedToday;
      
      // Filter by area if user is area manager (not admin)
      let hasAreaAccess = true;
      if (isAreaManager && !isAdmin && userProfile) {
        const userManagedAreas = areas.filter(area => area.areaManagerId === userProfile.uid);
        hasAreaAccess = userManagedAreas.some(area => area.id === p.areaId);
      }
      
      return isForToday && hasAreaAccess && p.location?.latitude && p.location?.longitude;
    });
  };

  const todaysPermits = getTodaysPermits();

  return (
    <>
      <Helmet>
        <title>Today's Permits Map - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="View today's active burn permits on an interactive map." />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Map className="h-6 w-6 mr-2 text-primary" />
                <h1 className="text-2xl font-semibold">Today's Active Permits Map</h1>
              </div>
              <Badge variant="secondary" className="text-sm">
                {todaysPermits.length} Active Today
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
                  {todaysPermits.length === 0 ? (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-700">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No Active Permits Today
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          There are no approved permits with location data for today.
                        </p>
                      </div>
                    </div>
                  ) : (
                    (() => {
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
                            
                            return (
                              <Marker
                                key={permit.id}
                                position={[permit.location!.latitude, permit.location!.longitude]}
                                icon={markerIcons[permit.status] || markerIcons.approved}
                              >
                                <Popup>
                                  <div className="p-2 min-w-[200px]">
                                    <div className="font-semibold text-lg mb-2">
                                      Burn Permit #{permit.id.substring(0, 8)}
                                    </div>
                                    <div className="space-y-1 text-sm">
                                      <div><strong>Burn Type:</strong> {burnType?.name || 'Unknown Type'}</div>
                                      <div><strong>Area:</strong> {area?.name || 'Unknown Area'}</div>
                                      <div><strong>Valid:</strong> {new Date(permit.startDate).toLocaleDateString()} - {new Date(permit.endDate).toLocaleDateString()}</div>
                                      <div><strong>Status:</strong> 
                                        <Badge variant="default" className="ml-1 text-xs">
                                          {permit.status.toUpperCase()}
                                        </Badge>
                                      </div>
                                      {permit.location?.address && (
                                        <div><strong>Location:</strong> {permit.location.address}</div>
                                      )}
                                      {/* Only show permit holder details to admins and area managers */}
                                      {(isAdmin || isAreaManager) && permit.details && (
                                        <div><strong>Details:</strong> {permit.details}</div>
                                      )}
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          })}
                        </MapContainer>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium mb-2 text-blue-800 dark:text-blue-200">Map Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Approved</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>Rejected</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                  <span>Cancelled</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Completed</span>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}