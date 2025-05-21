import { Goal, MapPinIcon, ScaleIcon, Clipboard, Shield, AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function About() {
  const aims = [
    "Ensure that all members comply with the legal requirements of the National Veld and Forest Fire Act.",
    "Encourage integrated fire management for private landowners and public entities.",
    "Prevent and control wildfires.",
    "Manage wildfires in natural areas in order to maintain diversity of species and ecosystems.",
    "Manage wildfire hazards so as to minimise the risk and any adverse consequences."
  ];

  const services = [
    "Develop and implement a Veldfire Management Strategy for the area",
    "Assist members to meet their responsibilities according to the Act, our constitution and our rules",
    "Improve the knowledge base to help land users implement integrated fire management strategies",
    "Improve awareness on integrated fire management and prevention and empower local communities to become more aware of the risks of fire",
    "Reduce fire risk associated with the occurrence of wildfires by devising integrated fire management plans",
    "Assist members with managing any incidents of wildfire as appropriate",
    "Represent landowners at local and provincial forums for veldfire management and report back to landowners on decisions that may impact them"
  ];

  const nonServices = [
    "Provide a firefighting service",
    "Fulfil the role of the fire brigade services",
    "Get involved in structural firefighting or related issues",
    "Enforce membership to the organisation. Membership is voluntary other than for state organisations that own land or manage land, for which membership is compulsory"
  ];

  return (
    <section id="about" className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            WHAT WE DO
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 mb-6"></div>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            We provide an integrated community fire management service to members of the Association.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-12">
          <div className="bg-muted p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-primary flex items-center">
              <Clipboard className="h-6 w-6 mr-2" />
              INTEGRATED FIRE MANAGEMENT PLANNING
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We help you to become legally compliant, as per national regulations</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We identify high risk areas and help with risk reduction</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We support Fire Management Plans</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We facilitate fire break planning for communal areas and strategic fire breaks</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We offer advice on compliance with the law (National Veld and Forest Fire Act)</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We help map members</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We offer advice on Integrated Fire Management (including fire breaks, fuel reduction, equipment needed, etc.)</span>
              </li>
            </ul>
          </div>

          <div className="bg-muted p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-primary flex items-center">
              <Shield className="h-6 w-6 mr-2" />
              FIRE PREPAREDNESS
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We organise training courses (including courses on Basic Fire Suppression, Controlled Burning, Infield Simulation and more)</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We provide a daily Fire Danger Index forecast during the fire season</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We watch the Advanced Fire Information System (AFIS), which provides early fire detection warning</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We support awareness: Media, Social Media and general public</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We facilitate Fire Management Unit preparedness</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We support stakeholder engagement (including with the Fire Brigade, Eskom, Farmers' Associations, Working on Fire, Municipalities, Forestry, Transnet, national government departments, donors, conservancies)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-orange-50 p-6 rounded-lg shadow-md mb-10">
          <h3 className="text-xl font-semibold mb-4 text-primary flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2" />
            UFPA DOES NOT
          </h3>
          <ul className="space-y-2">
            {nonServices.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 text-center">THE AIMS OF UFPA ARE TO</h3>
          <ul className="space-y-2 max-w-3xl mx-auto">
            {aims.map((aim, index) => (
              <li key={index} className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>{aim}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-muted p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-center">WE PROVIDE AN INTEGRATED COMMUNITY FIRE MANAGEMENT SERVICE</h3>
          <ul className="space-y-2">
            {services.map((service, index) => (
              <li key={index} className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>{service}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
