import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { 
  Flame, 
  Menu, 
  X, 
  LayoutDashboard, 
  MapPin, 
  FileText,
  Settings,
  LogOut,
  HelpCircle,
  Bookmark,
  CheckSquare,
  BarChart3,
  Code
} from "lucide-react";
import LoginButton from "@/components/LoginButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";
import { logOut } from "@/lib/firebase";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, userProfile, isAdmin, isAreaManager, isApiUser, hasManagerAccess } = useAuth();
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Check if we're on the home page
  const isHomePage = location === "/";
  
  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  
  // Listen for custom login dialog event
  useEffect(() => {
    const handleShowLoginDialog = () => {
      const loginButton = document.querySelector('[data-login-trigger]');
      if (loginButton && loginButton instanceof HTMLElement) {
        loginButton.click();
      }
    };
    
    window.addEventListener('show-login-dialog', handleShowLoginDialog);
    return () => {
      window.removeEventListener('show-login-dialog', handleShowLoginDialog);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  const handleLogout = async () => {
    try {
      await logOut();
      setLocation("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!userProfile || !userProfile.displayName) return "U";
    
    const names = userProfile.displayName.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className={`sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md transition-all duration-300 ${
      isScrolled ? 'py-2' : 'py-3'
    }`}>
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <div className="mr-3">
            <div className="flex items-center">
              <Flame className="h-8 w-8 text-primary mr-2" />
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Umpiluzi</h1>
                <p className="text-xs text-primary font-semibold">Fire Protection Association</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          {isHomePage ? (
            // Home page navigation with hash links
            <>
              <a href="#" className="text-foreground hover:text-primary transition font-medium">Home</a>
              <a href="#about" className="text-foreground hover:text-primary transition font-medium">About Us</a>
              {user ? (
                <Link href="/apply-permit" className="text-foreground hover:text-primary transition font-medium">
                  Fire Permits
                </Link>
              ) : (
                <button 
                  onClick={() => {
                    const loginEvent = new CustomEvent('show-login-dialog');
                    window.dispatchEvent(loginEvent);
                  }}
                  className="text-foreground hover:text-primary transition font-medium bg-transparent border-none cursor-pointer p-0"
                >
                  Fire Permits
                </button>
              )}
              <a href="#contact" className="text-foreground hover:text-primary transition font-medium">Contact</a>
            </>
          ) : (
            // Other pages navigation
            <>
              <Link href="/" className="text-foreground hover:text-primary transition font-medium">
                Home
              </Link>
              <Link href="/my-permits" className="text-foreground hover:text-primary transition font-medium">
                My Permits
              </Link>
              <Link href="/apply-permit" className="text-foreground hover:text-primary transition font-medium">
                Apply for Permit
              </Link>
              <Link href="/my-farms" className="text-foreground hover:text-primary transition font-medium">
                My Farms
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-foreground hover:text-primary transition font-medium">
                  Admin Panel
                </Link>
              )}
              {isAreaManager && (
                <Link href="/area-manager" className="text-foreground hover:text-primary transition font-medium">
                  Manage Areas
                </Link>
              )}
              {hasManagerAccess && (
                <Link href="/admin?tab=todays-permits" className="text-foreground hover:text-primary transition font-medium">
                  Today's Permits Map
                </Link>
              )}
              {hasManagerAccess && (
                <Link href="/reports" className="text-foreground hover:text-primary transition font-medium">
                  Reports
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition">
                  <AvatarImage src={userProfile?.photoURL || ""} alt={userProfile?.displayName || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-normal text-xs text-muted-foreground">Signed in as</div>
                  <div className="font-medium truncate">{userProfile?.email}</div>
                </DropdownMenuLabel>
                
                <DropdownMenuSeparator />
                
                <Link href="/my-permits">
                  <DropdownMenuItem className="cursor-pointer">
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>My Permits</span>
                  </DropdownMenuItem>
                </Link>

                <Link href="/apply-permit">
                  <DropdownMenuItem className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Apply for Permit</span>
                  </DropdownMenuItem>
                </Link>
                
                <Link href="/my-farms">
                  <DropdownMenuItem className="cursor-pointer">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>My Farms</span>
                  </DropdownMenuItem>
                </Link>
                
                {isAdmin && (
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                
                {isAreaManager && (
                  <Link href="/area-manager">
                    <DropdownMenuItem className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Manage Areas</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                
                {hasManagerAccess && (
                  <Link href="/admin?tab=todays-permits">
                    <DropdownMenuItem className="cursor-pointer">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>Today's Permits Map</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                
                {hasManagerAccess && (
                  <Link href="/reports">
                    <DropdownMenuItem className="cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Reports</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                
                {(isAdmin || isAreaManager || isApiUser) && (
                  <Link href="/api-docs">
                    <DropdownMenuItem className="cursor-pointer">
                      <Code className="mr-2 h-4 w-4" />
                      <span>API Documentation</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                
                <DropdownMenuSeparator />
                
                <Link href="/#contact">
                  <DropdownMenuItem className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                </Link>
                
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <ThemeToggle />
          {!user && (
            <div className="mx-2">
              <LoginButton />
            </div>
          )}
          {user && (
            <div className="mx-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={userProfile?.photoURL || ""} alt={userProfile?.displayName || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <button 
            onClick={toggleMobileMenu}
            className="text-foreground focus:outline-none ml-2"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col space-y-3">
            <Link href="/"
              className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700"
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            
            {isHomePage && (
              <>
                <a 
                  href="#about" 
                  className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700"
                  onClick={closeMobileMenu}
                >
                  About Us
                </a>
                <a 
                  href="#permits" 
                  className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700"
                  onClick={closeMobileMenu}
                >
                  Fire Permits
                </a>
                <a 
                  href="#contact" 
                  className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700"
                  onClick={closeMobileMenu}
                >
                  Contact
                </a>
              </>
            )}
            
            {user && (
              <>
                <Link href="/my-permits" 
                  className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700 flex items-center"
                  onClick={closeMobileMenu}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  My Permits
                </Link>
                
                <Link href="/apply-permit" 
                  className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700 flex items-center"
                  onClick={closeMobileMenu}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Apply for Permit
                </Link>
                
                <Link href="/my-farms" 
                  className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700 flex items-center"
                  onClick={closeMobileMenu}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  My Farms
                </Link>
                
                {isAdmin && (
                  <Link href="/admin"
                    className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700 flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Link>
                )}
                
                {isAreaManager && (
                  <Link href="/area-manager"
                    className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700 flex items-center"
                    onClick={closeMobileMenu}
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Manage Areas
                  </Link>
                )}
                
                <button 
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="text-destructive hover:text-destructive/90 transition py-2 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
