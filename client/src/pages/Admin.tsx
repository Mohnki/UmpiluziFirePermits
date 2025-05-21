import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Redirect } from "wouter";
import { getAllUsers, updateUserRole, UserProfile } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRole } from "@/lib/roles";
import { Loader2, User } from "lucide-react";

export default function AdminPage() {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

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

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'area-manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="Administrative dashboard for managing users and roles" />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-6">Admin Dashboard</h1>
            
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
                             user.role === 'area-manager' ? 'Area Manager' : 'User'}
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
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}