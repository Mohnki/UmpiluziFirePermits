import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import PermitsInfo from "@/components/PermitsInfo";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";

export default function Home() {
  const { isApiUser, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect API users to documentation page
  useEffect(() => {
    if (!loading && isApiUser) {
      navigate('/api-docs');
    }
  }, [isApiUser, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Umpiluzi Fire Protection Association - Fire Permit System</title>
        <meta name="description" content="Apply for fire permits, learn about fire safety, and help protect our communities from wildfires with the Umpiluzi Fire Protection Association." />
        <meta property="og:title" content="Umpiluzi Fire Protection Association - Fire Permit System" />
        <meta property="og:description" content="Apply for fire permits, learn about fire safety, and help protect our communities from wildfires." />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Hero />
          <About />
          <PermitsInfo />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
