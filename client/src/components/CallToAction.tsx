import { Button } from "@/components/ui/button";

export default function CallToAction() {
  return (
    <section id="apply" className="py-12 md:py-20 bg-primary text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Ready to Apply for a Fire Permit?
        </h2>
        <p className="max-w-2xl mx-auto mb-8 opacity-90">
          Our online application system makes it easy to apply for and manage your fire permits. 
          Get started today to ensure your controlled burns are legal and safe.
        </p>
        <Button 
          variant="secondary" 
          size="lg" 
          className="bg-white text-primary hover:bg-gray-100 px-8"
        >
          Start Application
        </Button>
        <p className="mt-4 text-sm opacity-80">
          For assistance with your application, contact our permit office at (123) 456-7890
        </p>
      </div>
    </section>
  );
}
