import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";
import { getPermitsByUser, updatePermitStatus } from "@/lib/permit-service";
import { getAllBurnTypes } from "@/lib/area-service";
import { getAllAreas } from "@/lib/area-service";
import { getFarmsByUser } from "@/lib/farm-service";
import { BurnPermit } from "@/lib/permit-types";
import { BurnType, Area } from "@/lib/area-types";
import { Farm } from "@/lib/area-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FileCheck,
  FileX,
  FileClock,
  Calendar,
  Loader2,
  MapPin,
  Info,
  FileText,
  Share2,
} from "lucide-react";
import { format } from "date-fns";

export default function MyPermits() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [permits, setPermits] = useState<BurnPermit[]>([]);
  const [burnTypes, setBurnTypes] = useState<BurnType[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingPermit, setCompletingPermit] = useState<string | null>(null);

  // Fetch user's permits, areas and burn types
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // First fetch the user's permits
        const userPermits = await getPermitsByUser(user.uid);
        setPermits(userPermits);

        // Then fetch burn types, areas, and farms for displaying names
        try {
          const [allBurnTypes, allAreas, userFarms] = await Promise.all([
            getAllBurnTypes(),
            getAllAreas(),
            getFarmsByUser(user.uid)
          ]);

          setBurnTypes(allBurnTypes);
          setAreas(allAreas);
          setFarms(userFarms);
        } catch (secondaryError) {
          console.error("Error fetching secondary data:", secondaryError);
          toast({
            title: "Note",
            description:
              "Some permit details may not display correctly due to data loading issues.",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error fetching permits:", error);
        toast({
          title: "Error",
          description: "Failed to load your permits. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  // Get status badge styling
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "completed":
        return "secondary";
      default:
        return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <FileCheck className="h-4 w-4 mr-1" />;
      case "rejected":
        return <FileX className="h-4 w-4 mr-1" />;
      case "pending":
        return <FileClock className="h-4 w-4 mr-1" />;
      case "completed":
        return <FileCheck className="h-4 w-4 mr-1" />;
      default:
        return <Info className="h-4 w-4 mr-1" />;
    }
  };

  // Get area name by ID
  const getAreaName = (areaId: string) => {
    const area = areas.find((a) => a.id === areaId);
    return area ? area.name : "Unknown Area";
  };

  // Get burn type name by ID
  const getBurnTypeName = (burnTypeId: string) => {
    const burnType = burnTypes.find((bt) => bt.id === burnTypeId);
    return burnType ? burnType.name : "Unknown Burn Type";
  };

  // Get farm name by ID
  const getFarmName = (farmId: string) => {
    console.log("Looking for farm with ID:", farmId);
    console.log("Available farms:", farms);
    const farm = farms.find((f) => f.id === farmId);
    console.log("Found farm:", farm);
    return farm ? farm.name : "Unknown Farm";
  };

  // Handle completing a permit
  const handleCompletePermit = async (permitId: string) => {
    if (!user) return;

    try {
      setCompletingPermit(permitId);
      await updatePermitStatus(permitId, "completed");

      // Update the local state
      setPermits((prev) =>
        prev.map((p) =>
          p.id === permitId
            ? { ...p, status: "completed" as const, updatedAt: new Date() }
            : p,
        ),
      );

      toast({
        title: "Permit Completed",
        description: "Your burn permit has been marked as completed.",
      });
    } catch (error) {
      console.error("Error completing permit:", error);
      toast({
        title: "Error",
        description: "Failed to complete the permit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingPermit(null);
    }
  };

  // Handle sharing a permit
  const handleSharePermit = async (permit: BurnPermit) => {
    console.log("Sharing permit:", permit);
    console.log("Permit farmId:", permit.farmId);
    const permitNumber = permit.id.substring(0, 8);
    const burnTypeName = getBurnTypeName(permit.burnTypeId);
    const areaName = getAreaName(permit.areaId);
    const farmName = permit.farmId ? getFarmName(permit.farmId) : "No Farm Specified";
    const startDate = format(new Date(permit.startDate), "MMM d, yyyy");
    const endDate = format(new Date(permit.endDate), "MMM d, yyyy");

    const message = `🔥 BURN PERMIT ACTIVE 🔥

📋 Permit #: ${permitNumber}
👤 Permit Holder: ${user?.displayName || user?.email}
🏡 Farm: ${farmName}
🔥 Burn Type: ${burnTypeName}
📍 Area: ${areaName}
📅 Valid: ${startDate} - ${endDate}
✅ Status: ${permit.status.toUpperCase()}

⚠️ Please follow all fire safety regulations and monitor weather conditions.

#UmpiluziFPA #BurnPermit #FireSafety`;

    try {
      if (navigator.share) {
        // Use native share API if available
        await navigator.share({
          title: `Burn Permit #${permitNumber}`,
          text: message,
        });
      } else {
        // Fallback: copy to clipboard and show WhatsApp link
        await navigator.clipboard.writeText(message);

        // Create WhatsApp share URL
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");

        toast({
          title: "Message Copied",
          description:
            "Permit details copied to clipboard and WhatsApp opened.",
        });
      }
    } catch (error) {
      console.error("Error sharing permit:", error);

      // Final fallback: just copy to clipboard
      try {
        await navigator.clipboard.writeText(message);
        toast({
          title: "Copied to Clipboard",
          description:
            "Permit details copied. You can paste and share manually.",
        });
      } catch (clipboardError) {
        toast({
          title: "Share Not Available",
          description: "Unable to share or copy permit details.",
          variant: "destructive",
        });
      }
    }
  };

  // Get today's date with time set to 00:00:00
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log("Current date:", today.toISOString());

  // Log each permit's dates for debugging
  permits.forEach((p) => {
    console.log(
      `Permit ${p.id.substring(0, 8)}: status=${p.status}, startDate=${new Date(p.startDate).toISOString()}, endDate=${new Date(p.endDate).toISOString()}`,
    );
  });

  // Helper function to check if a date is today (ignoring time)
  const isToday = (date: Date): boolean => {
    const d = new Date(date);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Helper to convert Firebase timestamp to date with consistent time zone handling
  const normalizeDate = (dateString: string | Date): Date => {
    const date = new Date(dateString);
    // Create a new date using UTC components but in local time
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  // Group permits - focus only on today's active permits
  const activePermits = permits.filter((p) => {
    const status = p.status === "approved";
    const startDate = normalizeDate(p.startDate);
    const endDate = normalizeDate(p.endDate);

    // Check if either the start or end date is today, or if today falls between them
    const isActiveToday =
      isToday(startDate) ||
      isToday(endDate) ||
      (startDate <= today && endDate >= today);

    return status && isActiveToday;
  });

  // All other permits (for history) - everything that's not active today
  const historyPermits = permits.filter((p) => !activePermits.includes(p));

  console.log("Total permits:", permits.length);
  console.log("Active permits:", activePermits.length);
  console.log("History permits:", historyPermits.length);

  // Handle redirect if not logged in
  if (!loading && !user) {
    return <Redirect to="/" />;
  }

  // Loading state
  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your permits...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Burn Permits - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="View and manage your burn permits" />
      </Helmet>

      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">My Burn Permits</h1>
                <p className="text-muted-foreground mt-2">
                  View and manage your burn permit applications
                </p>
              </div>
              <div className="mt-3 md:mt-0 flex items-center space-x-4">
                <Link
                  href="/apply-permit"
                  className="flex items-center bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 text-sm font-medium"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Apply for Permit
                </Link>
                <Link
                  href="/my-farms"
                  className="flex items-center text-primary hover:text-primary/80 text-sm font-medium"
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Manage Farms
                </Link>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-bold flex items-center mb-4">
                <FileCheck className="h-5 w-5 mr-2 text-primary" />
                Today's Active Permits
                {activePermits.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activePermits.length}
                  </Badge>
                )}
              </h2>
            </div>

            <div>
              {activePermits.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">
                      No Active Permits For Today
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any active burn permits for today.
                    </p>
                    <Button asChild>
                      <a href="/apply-permit">Apply for a Permit</a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Permit Number</TableHead>
                            <TableHead>Burn Type</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activePermits.map((permit) => (
                            <TableRow key={permit.id}>
                              <TableCell className="font-medium">
                                {permit.id.substring(0, 8)}
                              </TableCell>
                              <TableCell>
                                {getBurnTypeName(permit.burnTypeId)}
                              </TableCell>
                              <TableCell>
                                {getAreaName(permit.areaId)}
                              </TableCell>
                              <TableCell>
                                {format(
                                  new Date(permit.startDate),
                                  "MMM d, yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className="flex items-center gap-1 capitalize bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800">
                                  {getStatusIcon(permit.status)}
                                  {permit.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      alert(
                                        `Permit details: ${permit.details || "No additional details"}`,
                                      );
                                    }}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSharePermit(permit)}
                                  >
                                    <Share2 className="h-4 w-4 mr-1" />
                                    Share
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      handleCompletePermit(permit.id)
                                    }
                                    disabled={completingPermit === permit.id}
                                  >
                                    {completingPermit === permit.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Completing...
                                      </>
                                    ) : (
                                      "Complete"
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="mt-12">
              <h2 className="text-xl font-bold flex items-center mb-4">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                Permit History
                {historyPermits.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {historyPermits.length}
                  </Badge>
                )}
              </h2>

              {historyPermits.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">
                      No Permit History
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You don't have any past permit records.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Permit Number</TableHead>
                            <TableHead>Burn Type</TableHead>
                            <TableHead>Area</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyPermits.map((permit) => (
                            <TableRow key={permit.id}>
                              <TableCell className="font-medium">
                                {permit.id.substring(0, 8)}
                              </TableCell>
                              <TableCell>
                                {getBurnTypeName(permit.burnTypeId)}
                              </TableCell>
                              <TableCell>
                                {getAreaName(permit.areaId)}
                              </TableCell>
                              <TableCell>
                                {format(
                                  new Date(permit.startDate),
                                  "MMM d, yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className="flex items-center capitalize"
                                  variant={
                                    getStatusBadgeVariant(permit.status) as any
                                  }
                                >
                                  {getStatusIcon(permit.status)}
                                  {permit.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Display more details in a modal if needed
                                    alert(
                                      `Permit details: ${permit.details || "No additional details"}`,
                                    );
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {permits.length === 0 && (
              <div className="text-center mt-8">
                <p className="mb-4">
                  You haven't applied for any burn permits yet.
                </p>
                <Button asChild>
                  <a href="/apply-permit">Apply for a Permit</a>
                </Button>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

interface PermitCardProps {
  permit: BurnPermit;
  areaName: string;
  burnTypeName: string;
  statusIcon: React.ReactNode;
  statusBadgeVariant: string;
}

function PermitCard({
  permit,
  areaName,
  burnTypeName,
  statusIcon,
  statusBadgeVariant,
}: PermitCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{burnTypeName}</CardTitle>
            <CardDescription>{areaName}</CardDescription>
          </div>
          <Badge
            className="flex items-center capitalize"
            variant={statusBadgeVariant as any}
          >
            {statusIcon}
            {permit.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Burn Date</h4>
            <p className="text-sm text-muted-foreground">
              {format(new Date(permit.startDate), "MMMM d, yyyy")}
              {permit.startDate.toDateString() !==
                permit.endDate.toDateString() &&
                ` - ${format(new Date(permit.endDate), "MMMM d, yyyy")}`}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-1">Location</h4>
            <p className="text-sm text-muted-foreground flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {permit.location.latitude.toFixed(6)},{" "}
              {permit.location.longitude.toFixed(6)}
              {permit.location.address && (
                <span className="ml-1">({permit.location.address})</span>
              )}
            </p>
          </div>
        </div>

        {permit.details && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-1">Details</h4>
            <p className="text-sm text-muted-foreground">{permit.details}</p>
          </div>
        )}

        {permit.status === "rejected" && permit.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
              Reason for Rejection
            </h4>
            <p className="text-sm text-red-600 dark:text-red-400">
              {permit.rejectionReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Function to check if a date is in a range
function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const checkDate = new Date(date);
  const startDate = new Date(start);
  const endDate = new Date(end);

  checkDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return checkDate >= startDate && checkDate <= endDate;
}
