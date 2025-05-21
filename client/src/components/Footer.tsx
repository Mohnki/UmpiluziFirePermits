import { Flame, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#343A40] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Flame className="h-6 w-6 text-primary mr-2" />
              <div>
                <h3 className="text-lg font-bold">Umpiluzi</h3>
                <p className="text-xs text-primary">Fire Protection Association</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              We provide an integrated community fire management service to members of the Association.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Home</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-white transition">What We Do</a></li>
              <li><a href="#permits" className="text-gray-400 hover:text-white transition">Fire Permits</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Information</h4>
            <div className="flex items-center mb-3">
              <Phone className="h-5 w-5 text-primary mr-2" />
              <p className="text-white">060 906 0319</p>
            </div>
            <p className="text-gray-400 text-sm mb-2">UFPA Building Ferniehaug Jessievale, Warburton, 2333</p>
            <p className="text-gray-400 text-sm mb-3">Office Hours: Monday-Friday: 8:00 AM - 5:00 PM</p>
            <p className="text-gray-400 text-sm">Saturday: 8:00 AM - 12:00 PM | Sunday: Closed</p>
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
