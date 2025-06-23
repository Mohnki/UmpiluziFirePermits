import { ArrowRight, Shield } from "lucide-react";
import { Link } from "wouter";

export default function FireSafety() {
  const resources = [
    {
      image: "https://pixabay.com/get/gdf4d3dc9711e87d17198582b435765645d5af31d5d013c922c0a0f7ba3020b740f6efa20a728b1c9a19f2b130e3c00350937cc2b02197a8a8fe608f1b1beb5fe_1280.jpg",
      title: "Prevention Guidelines",
      description: "Learn how to create defensible space around your property and reduce fire hazards.",
      link: "#",
      linkText: "View Guidelines"
    },
    {
      image: "https://pixabay.com/get/gfcf12579303da22bc5f7ba345dc0fd9e55fee8230536ba2bced8d2e058fb5f5f8d69606779019fb2721b109cd3577509620b3d3e3808c13403da01051715084c_1280.jpg",
      title: "Safe Burning Practices",
      description: "Essential guidelines for planning and conducting controlled burns safely.",
      link: "#",
      linkText: "Learn More"
    },
    {
      image: "https://images.unsplash.com/photo-1590856029620-9b5a4825d3be?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=400",
      title: "Current Fire Danger",
      description: "Stay updated on current fire danger levels and weather conditions in your area.",
      link: "#",
      linkText: "Check Status"
    }
  ];

  return (
    <section id="info" className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Fire Safety Resources</h2>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 mb-6"></div>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Learn how to prevent wildfires and protect your property with these essential resources.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {resources.map((resource, index) => (
            <div key={index} className="bg-muted rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <img 
                src={resource.image} 
                alt={resource.title} 
                className="w-full h-48 object-cover" 
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
                <p className="text-muted-foreground mb-4">{resource.description}</p>
                <a href={resource.link} className="text-primary font-medium hover:underline inline-flex items-center">
                  {resource.linkText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
