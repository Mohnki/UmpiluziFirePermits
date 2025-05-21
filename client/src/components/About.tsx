import { Goal, MapPinIcon, ScaleIcon } from "lucide-react";

export default function About() {
  const aboutItems = [
    {
      icon: <Goal className="h-8 w-8" />,
      title: "Our Mission",
      description: "To protect life, property, and natural resources from wildfire through education, prevention, and organized action."
    },
    {
      icon: <MapPinIcon className="h-8 w-8" />,
      title: "Service Area",
      description: "We serve the entire Umpiluzi region, working closely with landowners, communities, and government agencies."
    },
    {
      icon: <ScaleIcon className="h-8 w-8" />,
      title: "Legal Authority",
      description: "Established under the National Veld and Forest Fire Act to coordinate and standardize fire management practices."
    }
  ];

  return (
    <section id="about" className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            About Umpiluzi Fire Protection Association
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 mb-6"></div>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            We are dedicated to safeguarding our communities, properties, and natural environments from the devastating effects of wildfires through prevention, education, and coordinated response.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {aboutItems.map((item, index) => (
            <div key={index} className="bg-muted p-6 rounded-lg shadow-md hover:shadow-lg transition">
              <div className="text-primary text-3xl mb-4">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
