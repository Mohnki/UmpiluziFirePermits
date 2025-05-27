import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "wouter";
import umpiluziLogo from "../assets/umpiluzi-logo.png";

export default function Hero() {
  const { user } = useAuth();

  // Function to handle the Apply for Permit button click
  const handleApplyClick = () => {
    if (!user) {
      // If user is not logged in, we'll show login dialog by dispatching a custom event
      const loginEvent = new CustomEvent("show-login-dialog");
      window.dispatchEvent(loginEvent);
    }
    // If logged in, the Link component will handle the navigation
  };

  return (
    <section className="bg-gradient-to-r from-primary to-accent text-white py-12 md:py-20">
      <div className="container mx-auto px-4">
        {/* Logo section - prominently displayed */}
        <div className="flex justify-center mb-10">
          <img
            src={umpiluziLogo}
            alt="Umpiluzi Fire Protection Association Logo"
            className="max-w-full md:max-w-lg h-auto"
          />
        </div>

        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Protecting Our Communities from Wildfire
            </h1>
            <p className="text-lg md:text-xl mb-6 opacity-90">
              Apply for fire permits, learn about fire safety, and help protect
              our environment.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              {user ? (
                <Link href="/apply-permit">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-primary hover:bg-gray-100 w-full sm:w-auto"
                  >
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
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-white hover:bg-white/10 w-full sm:w-auto text-[#dd321e]"
                >
                  Learn More
                </Button>
              </a>
            </div>
          </div>
          <div className=" md:pl-12">
            <div className="rounded-lg shadow-lg overflow-hidden"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
