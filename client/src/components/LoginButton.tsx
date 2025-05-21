import { Button } from "@/components/ui/button";
import { signInWithGoogle, logOut } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export default function LoginButton() {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      toast({
        title: "Success!",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      toast({
        title: "Error signing in",
        description: "There was a problem signing in with Google.",
        variant: "destructive",
      });
    }
  };

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
                  <User className="h-6 w-6" />
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            {user.displayName || user.email || "User"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={handleLogin} variant="outline" className="min-w-[120px]">
      Sign in
    </Button>
  );
}