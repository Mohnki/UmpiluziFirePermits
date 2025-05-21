import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import PermitsInfo from "@/components/PermitsInfo";
import CallToAction from "@/components/CallToAction";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet";

export default function Home() {
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
          <CallToAction />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
