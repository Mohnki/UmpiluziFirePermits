import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Flame, Menu, X } from "lucide-react";
import LoginButton from "@/components/LoginButton";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/AuthContext";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="mr-3">
            <div className="flex items-center">
              <Flame className="h-8 w-8 text-primary mr-2" />
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Umpiluzi</h1>
                <p className="text-xs text-primary font-semibold">Fire Protection Association</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <a href="#" className="text-foreground hover:text-primary transition font-medium">Home</a>
          <a href="#about" className="text-foreground hover:text-primary transition font-medium">About Us</a>
          <a href="#permits" className="text-foreground hover:text-primary transition font-medium">Fire Permits</a>
          <a href="#contact" className="text-foreground hover:text-primary transition font-medium">Contact</a>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          <LoginButton />
          {user && (
            <>
              <Link href="/my-farms">
                <Button variant="outline">My Farms</Button>
              </Link>
              <Link href="/apply-permit">
                <Button className="bg-primary text-white hover:bg-primary/90">Apply for Permit</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <ThemeToggle />
          <div className="mx-2">
            <LoginButton />
          </div>
          <button 
            onClick={toggleMobileMenu}
            className="text-foreground focus:outline-none"
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
        <div className="md:hidden bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-2 flex flex-col space-y-3">
            <a 
              href="#" 
              className="text-foreground hover:text-primary transition py-2 border-b border-gray-100 dark:border-gray-700"
              onClick={closeMobileMenu}
            >
              Home
            </a>
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
              className="text-foreground hover:text-primary transition py-2"
              onClick={closeMobileMenu}
            >
              Contact
            </a>
            {user && (
              <>
                <Link href="/my-farms" onClick={closeMobileMenu}>
                  <Button variant="outline" className="w-full mb-2">
                    My Farms
                  </Button>
                </Link>
                <Link href="/apply-permit" onClick={closeMobileMenu}>
                  <Button className="w-full bg-primary text-white hover:bg-primary/90">
                    Apply for Permit
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
