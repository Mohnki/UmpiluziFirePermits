import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, logOut } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ShieldAlert } from "lucide-react";
import { AuthForms } from "@/components/AuthForms";

export default function LoginButton() {
  const { user, userProfile, loading, isAdmin, isAreaManager } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing out.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="min-w-[120px]">
        Loading...
      </Button>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {user.photoURL ? (
                <AvatarImage src={user.photoURL} alt={user.displayName || "User"} />
              ) : (
                <AvatarFallback>
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 
                   user.email ? user.email.charAt(0).toUpperCase() : 
                   <User className="h-6 w-6" />}
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem disabled className="flex flex-col items-start">
            <span>{user.displayName || user.email || "User"}</span>
            {userProfile && (
              <span className="text-xs text-muted-foreground mt-1">
                Role: {userProfile.role === 'admin' ? 'Admin' : 
                      userProfile.role === 'area-manager' ? 'Area Manager' : 'User'}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldAlert className="mr-2 h-4 w-4" />
                <span>Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          {isAreaManager && !isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/area-manager">
                <ShieldAlert className="mr-2 h-4 w-4" />
                <span>Area Manager</span>
              </Link>
            </DropdownMenuItem>
          )}
          
          {(isAdmin || isAreaManager) && <DropdownMenuSeparator />}
          
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-w-[120px]" data-login-trigger>
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0" aria-describedby={undefined}>
        <VisuallyHidden><DialogTitle>Sign in or create an account</DialogTitle></VisuallyHidden>
        <AuthForms onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}