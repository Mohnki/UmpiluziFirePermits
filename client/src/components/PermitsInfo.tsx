import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function PermitsInfo() {
  const whyPermitReasons = [
    "Ensures controlled burns are conducted safely",
    "Helps prevent accidental wildfires",
    "Legal requirement under local fire regulations",
    "Coordinates fire management activities across the region",
    "Enables emergency services to be aware of planned burns"
  ];

  const permitSteps = [
    {
      step: 1,
      title: "Submit Application",
      description: "Complete the online application form with all required information"
    },
    {
      step: 2,
      title: "Assessment",
      description: "Our team reviews your application and may perform a site inspection"
    },
    {
      step: 3,
      title: "Approval",
      description: "If approved, you'll receive your permit with specific conditions"
    },
    {
      step: 4,
      title: "Notification",
      description: "Notify relevant authorities before conducting your controlled burn"
    }
  ];

  return (
    <section id="permits" className="py-12 md:py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Fire Permit System</h2>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 mb-6"></div>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Our permit system ensures that controlled burns are conducted safely and responsibly, minimizing the risk of wildfires while allowing for necessary land management practices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-primary text-white p-4">
              <h3 className="text-xl font-semibold">Why You Need a Fire Permit</h3>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {whyPermitReasons.map((reason, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <a href="#apply">
                  <Button className="bg-primary text-white hover:bg-primary/90">
                    Apply for a Permit
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-primary text-white p-4">
              <h3 className="text-xl font-semibold">Permit Process</h3>
            </div>
            <div className="p-6">
              <ol className="space-y-4">
                {permitSteps.map((item) => (
                  <li key={item.step} className="flex">
                    <div className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
