import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getBansByArea, createBurnBan, updateBurnBan, deleteBurnBan } from "@/lib/permit-service";
import { BurnBan } from "@/lib/permit-types";
import { Area } from "@/lib/area-types";

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle,
  CalendarIcon, 
  Flame, 
  Loader2, 
  Plus, 
  ShieldAlert, 
  Trash 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isWithinInterval, addDays } from "date-fns";
import * as z from "zod";

// Form schema
const banFormSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
}).refine(data => {
  // Allow same day burn bans (start date = end date)
  return data.endDate >= data.startDate;
}, {
  message: "End date must be on or after the start date",
  path: ["endDate"],
});

interface BanManagementProps {
  area: Area;
}

export default function BanManagement({ area }: BanManagementProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [bans, setBans] = useState<BurnBan[]>([]);
  const [loadingBans, setLoadingBans] = useState(true);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof banFormSchema>>({
    resolver: zodResolver(banFormSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      reason: "",
    },
  });

  // Fetch area bans
  useEffect(() => {
    const fetchBans = async () => {
      try {
        setLoadingBans(true);
        const areaBans = await getBansByArea(area.id);
        setBans(areaBans);
      } catch (error) {
        console.error("Error fetching bans:", error);
        toast({
          title: "Error",
          description: "Failed to load burn bans. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingBans(false);
      }
    };

    fetchBans();
  }, [area.id, toast]);

  const onSubmit = async (values: z.infer<typeof banFormSchema>) => {
    if (!userProfile) return;
    
    try {
      setIsSubmitting(true);
      
      await createBurnBan({
        areaId: area.id,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason,
        createdBy: userProfile.uid,
      });
      
      // Refresh the bans list
      const updatedBans = await getBansByArea(area.id);
      setBans(updatedBans);
      
      toast({
        title: "Burn Ban Created",
        description: "The burn ban has been successfully created.",
      });
      
      // Reset form and close dialog
      form.reset();
      setBanDialogOpen(false);
    } catch (error) {
      console.error("Error creating burn ban:", error);
      toast({
        title: "Error",
        description: "Failed to create burn ban. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBan = async (banId: string) => {
    try {
      await deleteBurnBan(banId);
      
      // Update local state
      setBans(prevBans => prevBans.filter(ban => ban.id !== banId));
      
      toast({
        title: "Burn Ban Deleted",
        description: "The burn ban has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting burn ban:", error);
      toast({
        title: "Error",
        description: "Failed to delete burn ban. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isDateBanned = (date: Date): boolean => {
    return bans.some(ban => 
      isWithinInterval(date, { start: ban.startDate, end: ban.endDate })
    );
  };

  const getActiveBans = (): BurnBan[] => {
    const today = new Date();
    return bans.filter(ban => 
      isWithinInterval(today, { start: ban.startDate, end: ban.endDate })
    );
  };

  const activeBans = getActiveBans();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Burn Bans for {area.name}</h3>
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Ban
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Burn Ban</DialogTitle>
              <DialogDescription>
                Create a ban for all controlled burns in this area for a specific date range.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                // Allow the same date as start date
                                return startDate && date < new Date(startDate.setHours(0, 0, 0, 0));
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Ban</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Why are you implementing this burn ban? E.g., high winds, drought conditions, etc." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This will be visible to users when they apply for permits during this period
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
                      form.reset();
                      setBanDialogOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Ban
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {activeBans.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start">
            <div className="mr-3 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-400">
                Active Burn Ban{activeBans.length > 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                There {activeBans.length > 1 ? 'are' : 'is'} currently {activeBans.length} active burn ban{activeBans.length > 1 ? 's' : ''} for this area.
                No new burn permits will be approved during this time.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {loadingBans ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2">Loading burn bans...</span>
        </div>
      ) : bans.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <h4 className="text-lg font-medium mb-1">No Burn Bans</h4>
          <p className="text-muted-foreground">
            There are currently no burn bans for this area. Create a new ban if needed.
          </p>
        </div>
      ) : (
        <Table>
          <TableCaption>List of all burn bans for {area.name}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bans.map(ban => {
              const isActive = ban.isActive;
              
              return (
                <TableRow key={ban.id}>
                  <TableCell>
                    <Badge variant={isActive ? "destructive" : "outline"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(ban.startDate, "PPP")}</TableCell>
                  <TableCell>{format(ban.endDate, "PPP")}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">{ban.reason}</div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteBan(ban.id)}
                      aria-label="Delete ban"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}