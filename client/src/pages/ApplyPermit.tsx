import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { createBurnPermit } from "@/lib/permit-service";
import { getAllAreas, getAllBurnTypes } from "@/lib/area-service";
import { getFarmsByUser } from "@/lib/farm-service";
import { Area, BurnType, Farm } from "@/lib/area-types";
import { BurnPermit } from "@/lib/permit-types";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Flame, Loader2, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";

// Form schema
const permitFormSchema = z.object({
  burnTypeId: z.string({
    required_error: "Please select a burn type",
  }),
  farmId: z.string({
    required_error: "Please select a farm",
  }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
  }),
  details: z.string().optional(),
  acceptDisclaimer: z.boolean().refine(val => val === true, {
    message: "You must accept the disclaimer before proceeding",
  }),
});

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

// Map click handler component
function LocationPicker({ position, setPosition }: { 
  position: [number, number] | null, 
  setPosition: (pos: [number, number]) => void 
}) {
  // Set up click events
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
      },
    });
    return null;
  };
  
  // Set up Leaflet icons
  useEffect(() => {
    // Fix the broken icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);
  
  return (
    <div className="w-full h-full">
      <MapContainer 
        center={position || [-26.233070192235484, 30.497703552246097]} // Default to specified coordinates
        zoom={position ? 13 : 9} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />
        <MapClickHandler />
        {position && (
          <Marker position={position} />
        )}
      </MapContainer>
    </div>
  );
}

export default function ApplyPermitPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const [farms, setFarms] = useState<Farm[]>([]);
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  
  const form = useForm<z.infer<typeof permitFormSchema>>({
    resolver: zodResolver(permitFormSchema),
    defaultValues: {
      burnTypeId: "",
      farmId: "",
      details: "",
      location: {
        latitude: 0,
        longitude: 0,
      },
      acceptDisclaimer: false,
    },
  });

  // Fetch farms and burn types
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoadingData(true);
        
        // Fetch farms first
        let userFarms: Farm[] = [];
        try {
          userFarms = await getFarmsByUser(user.uid);
          setFarms(userFarms);
          
          if (userFarms.length === 0) {
            toast({
              title: "No Farms Found",
              description: "You need to register a farm before applying for a burn permit. Redirecting to the farm management page.",
              duration: 5000,
            });
            
            // Give the user time to read the message before redirecting
            setTimeout(() => {
              navigate("/my-farms");
            }, 2500);
            return; // Exit early if no farms
          }
        } catch (farmError) {
          console.error("Error fetching farms:", farmError);
          toast({
            title: "Farm Data Error",
            description: "Unable to load your farm information. Please try again later.",
            variant: "destructive",
          });
          setLoadingData(false);
          return; // Exit if we can't get farms
        }
        
        // Then fetch burn types
        try {
          const allBurnTypes = await getAllBurnTypes();
          setBurnTypes(allBurnTypes);
        } catch (burnTypeError) {
          console.error("Error fetching burn types:", burnTypeError);
          // Create some default burn types if the query fails due to permissions
          setBurnTypes([
            {
              id: "default-burn",
              name: "Standard Burn",
              description: "Standard controlled burn",
              defaultAllowed: true,
              requiresPermit: true,
              createdAt: new Date(),
              createdBy: "system",
              updatedAt: new Date()
            }
          ]);
          
          toast({
            title: "Burn Types Unavailable",
            description: "We're using default burn types as the complete list couldn't be loaded.",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error in data fetching:", error);
        toast({
          title: "Error",
          description: "Failed to load application data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, toast, navigate]);

  // Get user's location
  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        setLocationError(null);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            setMarkerPosition([latitude, longitude]);
            form.setValue("location", {
              latitude,
              longitude,
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            let errorMessage = "Could not get your current location.";
            
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = "Location access was denied. Please enable location services in your browser.";
                setLocationError("PERMISSION_DENIED");
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = "Location information is unavailable.";
                setLocationError("POSITION_UNAVAILABLE");
                break;
              case error.TIMEOUT:
                errorMessage = "The request to get your location timed out.";
                setLocationError("TIMEOUT");
                break;
              default:
                setLocationError("UNKNOWN_ERROR");
                break;
            }
            
            toast({
              title: "Location Error",
              description: errorMessage,
              variant: "destructive",
            });
          }
        );
      } else {
        setLocationError("NOT_SUPPORTED");
        toast({
          title: "Location Not Supported",
          description: "Geolocation is not supported by this browser.",
          variant: "destructive",
        });
      }
    };
    
    getLocation();
  }, [form, toast]);
  
  // Update form values when marker position changes
  useEffect(() => {
    if (markerPosition) {
      const [latitude, longitude] = markerPosition;
      form.setValue("location.latitude", latitude);
      form.setValue("location.longitude", longitude);
    }
  }, [markerPosition, form]);

  // Update selected farm when farm ID changes
  useEffect(() => {
    const farmId = form.watch("farmId");
    if (farmId) {
      const farm = farms.find(f => f.id === farmId);
      setSelectedFarm(farm || null);
    } else {
      setSelectedFarm(null);
    }
  }, [form.watch("farmId"), farms]);

  const onSubmit = async (values: z.infer<typeof permitFormSchema>) => {
    if (!user || !selectedFarm) return;
    
    try {
      setIsSubmitting(true);
      
      // Use today's date for the permit
      const today = new Date();
      
      const permit = await createBurnPermit({
        userId: user.uid,
        burnTypeId: values.burnTypeId,
        areaId: selectedFarm.areaId, // Use the farm's area ID
        startDate: today,
        endDate: today, // Same as start date for single-day permits
        location: values.location,
        details: values.details || "", // Use empty string if details are not provided
      });
      
      toast({
        title: "Permit Application Submitted",
        description: permit.status === "approved" 
          ? "Your burn permit has been automatically approved!" 
          : "Your permit application is pending review.",
      });
      
      navigate("/my-permits");
    } catch (error: any) {
      console.error("Error submitting permit application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit permit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  // Redirect if not logged in
  if (!loading && !user) {
    return <Redirect to="/" />;
  }

  return (
    <>
      <Helmet>
        <title>Apply for Burn Permit - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="Apply for a burn permit in your area" />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold mb-6">Apply for a Burn Permit</h1>
              
              <Card>
                <CardHeader>
                  <CardTitle>Burn Permit Application</CardTitle>
                  <CardDescription>
                    Fill out this form to apply for a permit to conduct a controlled burn.
                    Permits for allowed burn types will be automatically approved.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading form data...</span>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="farmId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Farm</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a farm" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {farms.map(farm => (
                                      <SelectItem key={farm.id} value={farm.id}>
                                        {farm.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Select the farm where the burn will take place
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="burnTypeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Burn Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a burn type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {burnTypes.map(burnType => (
                                      <SelectItem key={burnType.id} value={burnType.id}>
                                        {burnType.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The type of controlled burn you plan to conduct
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 rounded-lg mb-4">
                          <p className="text-sm flex items-start gap-2">
                            <CalendarIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <span>
                              <strong>Today's date will be used for your permit.</strong> Burn permits are only valid for the day they are issued. If you need to burn on a different day, please apply on that day.
                            </span>
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-base font-medium">Burn Location</h3>
                              
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(
                                      (position) => {
                                        const { latitude, longitude } = position.coords;
                                        setMarkerPosition([latitude, longitude]);
                                        setLocationError(null);
                                      },
                                      (error) => {
                                        console.error("Error getting location:", error);
                                        setLocationError("PERMISSION_DENIED");
                                        toast({
                                          title: "Location Error",
                                          description: "Could not get your current location. Please check your browser permissions.",
                                          variant: "destructive",
                                        });
                                      }
                                    );
                                  }
                                }}
                                className="flex items-center gap-1"
                              >
                                <MapPin className="h-4 w-4" />
                                Use My Location
                              </Button>
                            </div>
                            
                            {locationError === "PERMISSION_DENIED" && (
                              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
                                <div className="flex items-start">
                                  <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="ml-3">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                      Location permission was denied. Click 'Use My Location' and allow location access, or manually set a location by clicking on the map below.
                                    </p>
                                    <div className="mt-2">
                                      <Button 
                                        type="button" 
                                        size="sm" 
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => {
                                          // This opens browser settings for most browsers
                                          if (window.confirm("Would you like to open your browser settings to enable location access?")) {
                                            if (navigator.userAgent.indexOf("Chrome") !== -1) {
                                              window.open('chrome://settings/content/location');
                                            } else if (navigator.userAgent.indexOf("Firefox") !== -1) {
                                              window.open('about:preferences#privacy');
                                            } else {
                                              alert("Please manually enable location access in your browser settings.");
                                            }
                                          }
                                        }}
                                      >
                                        Open Browser Settings
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="border rounded-md h-[300px] mb-4 overflow-hidden relative">
                              {!markerPosition && (
                                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/5 pointer-events-none">
                                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg text-center">
                                    <p className="text-sm font-medium mb-2">Click on the map to set your burn location</p>
                                    <p className="text-xs text-muted-foreground">Or use the "Use My Location" button above</p>
                                  </div>
                                </div>
                              )}
                              
                              <LocationPicker 
                                position={markerPosition}
                                setPosition={(pos) => {
                                  setMarkerPosition(pos);
                                }}
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name="location.latitude"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Latitude</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="any" 
                                        placeholder="Latitude" 
                                        {...field}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value);
                                          field.onChange(value);
                                          if (markerPosition) {
                                            setMarkerPosition([value, markerPosition[1]]);
                                          }
                                        }}
                                        value={field.value || ""} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="location.longitude"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Longitude</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="any" 
                                        placeholder="Longitude" 
                                        {...field}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value);
                                          field.onChange(value);
                                          if (markerPosition) {
                                            setMarkerPosition([markerPosition[0], value]);
                                          }
                                        }}
                                        value={field.value || ""} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="details"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Additional Details</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Provide details about your controlled burn" 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Optional: Include information about the size of the area to be burned, safety measures in place, etc.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="border rounded-md p-4 mb-6 bg-gray-50 dark:bg-gray-800/50 max-h-80 overflow-y-auto">
                          <h3 className="font-semibold mb-2">Disclaimer</h3>
                          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-4">
                            <p>Please read this disclaimer carefully before using the Alasia Marketing permit management app ("the App"). By using the App, you agree to the terms and conditions stated below.</p>
                            
                            <div className="space-y-2">
                              <p className="font-medium">1. Facilitation of Permit Management</p>
                              <p>The App developed by Alasia Marketing is intended to facilitate the management of burning permits on behalf of the local authority. Alasia Marketing does not issue permits directly. The App serves as a tool for users to manage their permits in accordance with the rules and regulations of the Fire Protection Associations (FPAs) and applicable legislation.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-medium">2. No Permit Issuance Responsibility</p>
                              <p>Alasia Marketing explicitly states that it does not issue burning permits. The issuance of permits is solely the responsibility of the local authority and/or the relevant FPA. Alasia Marketing acts as a facilitator in managing the permits, providing a platform for users to apply for, receive, and track their permits.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-medium">3. No Liability for Permit Compliance</p>
                              <p>By using the App, users acknowledge and agree that they are solely responsible for their compliance with the rules and regulations of the FPA and all applicable legislation. Alasia Marketing will not be held responsible for any non-compliance or violation of FPA rules, regulations, or any legal obligations by the users of the App.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-medium">4. No Warranty or Endorsement</p>
                              <p>Alasia Marketing provides the App "as is" without any warranties or guarantees of any kind, either expressed or implied. While every effort is made to ensure the accuracy and reliability of the App, Alasia Marketing does not warrant or endorse the completeness, reliability, or suitability of the information and materials provided within the App.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-medium">5. Limitation of Liability</p>
                              <p>In no event shall Alasia Marketing be liable for any direct, indirect, incidental, consequential, or special damages arising out of or in connection with the use or inability to use the App or the information provided within it. This limitation of liability applies to all damages, including, but not limited to, damages for loss of data, loss of profits, or interruption of business.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-medium">6. Use at Your Own Risk</p>
                              <p>The use of the App is entirely at your own risk. Alasia Marketing shall not be responsible for any damage to your device, data loss, or any other harm that may arise from the use of the App.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="font-medium">7. Compliance with Laws</p>
                              <p>Users of the App are responsible for complying with all applicable laws, rules, and regulations, including those related to burning permits, fire safety, and environmental protection.</p>
                            </div>
                            
                            <p>By using the App, you acknowledge that you have read and understood this disclaimer and agree to its terms and conditions. If you do not agree with any part of this disclaimer, please refrain from using the App.</p>
                            
                            <p>This disclaimer is subject to change without notice. It is your responsibility to review and understand the most up-to-date version of the disclaimer before using the App.</p>
                          </div>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="acceptDisclaimer"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-6">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium cursor-pointer">
                                  I have read and agree to the disclaimer
                                </FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={isSubmitting || !form.watch("acceptDisclaimer")} 
                            className="w-full md:w-auto"
                          >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Application
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}