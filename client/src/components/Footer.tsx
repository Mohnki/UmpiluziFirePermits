import { Flame, Facebook, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#343A40] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Flame className="h-6 w-6 text-primary mr-2" />
              <div>
                <h3 className="text-lg font-bold">Umpiluzi</h3>
                <p className="text-xs text-primary">Fire Protection Association</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Protecting our communities from wildfire through prevention, education, and coordinated response.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Home</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-white transition">About Us</a></li>
              <li><a href="#permits" className="text-gray-400 hover:text-white transition">Fire Permits</a></li>
              <li><a href="#info" className="text-gray-400 hover:text-white transition">Resources</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Services</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Fire Permits</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Fire Risk Assessments</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Community Training</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Fire Prevention</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Emergency Response</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Emergency Contact</h4>
            <p className="text-gray-400 mb-2">For fire emergencies, call immediately:</p>
            <p className="text-white font-bold text-xl mb-2">(123) 456-7999</p>
            <p className="text-gray-400 text-sm">Available 24/7 for emergency response</p>
            <div className="mt-4 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Umpiluzi Fire Protection Association. All rights reserved.</p>
          <p className="mt-1">A registered non-profit organization dedicated to wildfire prevention and management.</p>
        </div>
      </div>
    </footer>
  );
}
