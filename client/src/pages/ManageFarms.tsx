import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Farm } from "@/lib/area-types";
import { Area } from "@/lib/area-types";
import { getAllAreas } from "@/lib/area-service";
import { Link } from "wouter";
import { 
  getFarmsByUser, 
  createFarm, 
  updateFarm, 
  deleteFarm 
} from "@/lib/farm-service";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  Edit, 
  Home,
  Loader2, 
  MapPin, 
  Plus, 
  Trash,
  FileEdit
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Form schema
const farmFormSchema = z.object({
  name: z.string().min(3, "Farm name must be at least 3 characters"),
  description: z.string().optional(),
  areaId: z.string().min(1, "Please select an area"),
});

type FarmFormValues = z.infer<typeof farmFormSchema>;

export default function ManageFarms() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  
  const [farms, setFarms] = useState<Farm[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FarmFormValues>({
    resolver: zodResolver(farmFormSchema),
    defaultValues: {
      name: "",
      description: "",
      areaId: "",
    },
  });
  
  // Fetch user's farms and available areas
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch all areas
        const allAreas = await getAllAreas();
        setAreas(allAreas);
        
        // Fetch user's farms
        const userFarms = await getFarmsByUser(user.uid);
        setFarms(userFarms);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load your farms. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, toast]);
  
  // Handle edit farm - populate form with farm data
  const handleEditFarm = (farm: Farm) => {
    setEditingFarm(farm);
    
    form.reset({
      name: farm.name,
      description: farm.description || "",
      areaId: farm.areaId,
    });
    
    setFormDialogOpen(true);
  };
  
  // Handle create new farm - reset form
  const handleNewFarm = () => {
    setEditingFarm(null);
    
    form.reset({
      name: "",
      description: "",
      areaId: "",
    });
    
    setFormDialogOpen(true);
  };
  
  // Handle form submission
  const onSubmit = async (values: FarmFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const farmData = {
        name: values.name,
        description: values.description,
        areaId: values.areaId,
      };
      
      if (editingFarm) {
        // Update existing farm
        await updateFarm(editingFarm.id, farmData);
        
        // Update local state
        setFarms(prevFarms => 
          prevFarms.map(farm => 
            farm.id === editingFarm.id 
              ? { 
                  ...farm, 
                  ...farmData, 
                  updatedAt: new Date() 
                } 
              : farm
          )
        );
        
        toast({
          title: "Farm Updated",
          description: "Your farm details have been updated successfully.",
        });
      } else {
        // Create new farm
        const newFarm = await createFarm({
          ...farmData,
          userId: user.uid,
        });
        
        // Update local state
        setFarms(prevFarms => [...prevFarms, newFarm]);
        
        toast({
          title: "Farm Created",
          description: "Your new farm has been created successfully.",
        });
      }
      
      // Close dialog and reset form
      setFormDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error saving farm:", error);
      toast({
        title: "Error",
        description: "Failed to save farm. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete farm
  const handleDeleteFarm = async (farmId: string) => {
    if (!confirm("Are you sure you want to delete this farm? This action cannot be undone.")) {
      return;
    }
    
    try {
      await deleteFarm(farmId);
      
      // Update local state
      setFarms(prevFarms => prevFarms.filter(farm => farm.id !== farmId));
      
      toast({
        title: "Farm Deleted",
        description: "The farm has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting farm:", error);
      toast({
        title: "Error",
        description: "Failed to delete farm. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get area name by ID
  const getAreaName = (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    return area ? area.name : "Unknown Area";
  };
  
  if (!user || !userProfile) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be logged in to manage your farms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <span className="ml-2 text-lg">Please log in to continue</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="mb-6 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Farms</h1>
            <p className="text-muted-foreground mt-1">
              Manage your farms for easy permit applications
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/apply-permit">
              <Button variant="outline" className="flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                Apply for Permit
              </Button>
            </Link>
            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewFarm} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Farm
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingFarm ? "Edit Farm Details" : "Add New Farm"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingFarm 
                      ? "Update your farm's information below."
                      : "Enter your farm's details to add it to your list."}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farm Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter farm name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of your farm" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="areaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
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
                            The fire protection area where your farm is located
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setFormDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingFarm ? "Update Farm" : "Create Farm"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading your farms...</p>
        </div>
      ) : farms.length === 0 ? (
        <Card className="text-center py-12 border border-border shadow-sm">
          <CardContent>
            <div className="mx-auto flex flex-col items-center justify-center space-y-4">
              <MapPin className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-medium">No Farms Added Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Add your farms to easily select them when applying for burn permits.
                This will save you time on future applications.
              </p>
              <Button onClick={handleNewFarm} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Farm
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map(farm => (
            <Card key={farm.id} className="transition-all duration-200 hover:shadow-md border border-border">
              <CardHeader className="bg-muted/50 rounded-t-lg">
                <CardTitle>{farm.name}</CardTitle>
                <CardDescription>
                  Area: {getAreaName(farm.areaId)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {farm.description && (
                    <p className="text-sm">{farm.description}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-end space-x-2 border-t border-border/40 pt-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDeleteFarm(farm.id)}
                  className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                >
                  <Trash className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditFarm(farm)}
                  className="hover:bg-primary/10"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}