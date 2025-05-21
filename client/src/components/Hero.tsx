import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "wouter";

export default function Hero() {
  const { user } = useAuth();

  // Function to handle the Apply for Permit button click
  const handleApplyClick = () => {
    if (!user) {
      // If user is not logged in, we'll show login dialog by dispatching a custom event
      const loginEvent = new CustomEvent('show-login-dialog');
      window.dispatchEvent(loginEvent);
    }
    // If logged in, the Link component will handle the navigation
  };

  return (
    <section className="bg-gradient-to-r from-primary to-accent text-white py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="md:flex items-center">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Protecting Our Communities from Wildfire
            </h1>
            <p className="text-lg md:text-xl mb-6 opacity-90">
              Apply for fire permits, learn about fire safety, and help protect our environment.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {user ? (
                <Link href="/apply-permit">
                  <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-gray-100 w-full sm:w-auto">
                    Apply for Permit
                  </Button>
                </Link>
              ) : (
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="bg-white text-primary hover:bg-gray-100 w-full sm:w-auto"
                  onClick={handleApplyClick}
                >
                  Apply for Permit
                </Button>
              )}
              <a href="#info">
                <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white/10 w-full sm:w-auto">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
          <div className="md:w-1/2 md:pl-8">
            <div className="rounded-lg shadow-lg overflow-hidden">
              <img 
                src="https://pixabay.com/get/g33f835a417158a45da970b96b0b318357c882d3477681af443056582efef276188cc794e980a3870e491a20f6c8c7c7cf6c8216b1b4da3e7080450cf233264b6_1280.jpg" 
                alt="Controlled fire burn being monitored by professionals" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
