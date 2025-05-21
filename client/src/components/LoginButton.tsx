import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, logOut } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { AuthForms } from "@/components/AuthForms";

export default function LoginButton() {
  const { user, loading } = useAuth();
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
          <DropdownMenuItem disabled>
            {user.displayName || user.email || "User"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
        <Button variant="outline" className="min-w-[120px]">
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0">
        <AuthForms onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}