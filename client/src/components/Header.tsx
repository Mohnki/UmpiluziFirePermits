import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Flame, Menu, X } from "lucide-react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
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

        <div className="hidden md:block">
          <a href="#apply">
            <Button className="bg-primary text-white hover:bg-primary/90">Apply for Permit</Button>
          </a>
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden text-foreground focus:outline-none"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white">
          <div className="container mx-auto px-4 py-2 flex flex-col space-y-3">
            <a 
              href="#" 
              className="text-foreground hover:text-primary transition py-2 border-b border-gray-100"
              onClick={closeMobileMenu}
            >
              Home
            </a>
            <a 
              href="#about" 
              className="text-foreground hover:text-primary transition py-2 border-b border-gray-100"
              onClick={closeMobileMenu}
            >
              About Us
            </a>
            <a 
              href="#permits" 
              className="text-foreground hover:text-primary transition py-2 border-b border-gray-100"
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
            <a 
              href="#apply" 
              onClick={closeMobileMenu}
            >
              <Button className="w-full bg-primary text-white hover:bg-primary/90">
                Apply for Permit
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
