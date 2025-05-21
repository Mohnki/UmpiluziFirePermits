import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { createBurnPermit } from "@/lib/permit-service";
import { getAllAreas, getAllBurnTypes } from "@/lib/area-service";
import { Area, BurnType } from "@/lib/area-types";
import { BurnPermit } from "@/lib/permit-types";

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
  areaId: z.string({
    required_error: "Please select an area",
  }),
  startDate: z.date({
    required_error: "Please select a start date",
  }),
  endDate: z.date({
    required_error: "Please select an end date",
  }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
  }),
  details: z.string().min(10, "Please provide at least 10 characters of details about your burn"),
}).refine(data => {
  return data.endDate >= data.startDate;
}, {
  message: "End date must be on or after the start date",
  path: ["endDate"],
});

export default function ApplyPermitPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const [areas, setAreas] = useState<Area[]>([]);
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  const form = useForm<z.infer<typeof permitFormSchema>>({
    resolver: zodResolver(permitFormSchema),
    defaultValues: {
      burnTypeId: "",
      areaId: "",
      details: "",
      location: {
        latitude: 0,
        longitude: 0,
      },
    },
  });

  // Fetch areas and burn types
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [allAreas, allBurnTypes] = await Promise.all([
          getAllAreas(),
          getAllBurnTypes()
        ]);
        
        setAreas(allAreas);
        setBurnTypes(allBurnTypes);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load areas and burn types. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          form.setValue("location", {
            latitude,
            longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Could not get your current location. Please enter coordinates manually.",
            variant: "destructive",
          });
        }
      );
    }
  }, [form, toast]);

  const onSubmit = async (values: z.infer<typeof permitFormSchema>) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const permit = await createBurnPermit({
        userId: user.uid,
        burnTypeId: values.burnTypeId,
        areaId: values.areaId,
        startDate: values.startDate,
        endDate: values.endDate,
        location: values.location,
        details: values.details,
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
          <div className="container mx-auto py-8 px-4">
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
                            name="areaId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Area</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select an area" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {areas.map(area => (
                                      <SelectItem key={area.id} value={area.id}>
                                        {area.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Select the area where the burn will take place
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={`w-full text-left font-normal ${
                                          !field.value && "text-muted-foreground"
                                        }`}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  The date you plan to start the burn
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>End Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={`w-full text-left font-normal ${
                                          !field.value && "text-muted-foreground"
                                        }`}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => {
                                        const startDate = form.getValues("startDate");
                                        return startDate && date < startDate;
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  The date you plan to finish the burn
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
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
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    value={field.value || (userLocation ? userLocation.latitude : "")} 
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
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    value={field.value || (userLocation ? userLocation.longitude : "")} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="details"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Burn Details</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please describe the purpose of the burn, materials to be burned, safety measures in place, etc." 
                                  className="min-h-[120px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Provide details about your controlled burn plan
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="pt-4">
                          <Button 
                            type="submit" 
                            className="w-full md:w-auto"
                            disabled={isSubmitting}
                          >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Permit Application
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