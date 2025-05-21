import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin 
} from "lucide-react";

export default function Contact() {
  return (
    <section id="contact" className="py-12 md:py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Contact Us</h2>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 mb-6"></div>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Have questions about fire permits or our services? Reach out to us using the information below.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Send Us a Message</h3>
            <form>
              <div className="mb-4">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  type="text" 
                  id="name" 
                  placeholder="Your name" 
                  className="mt-1"
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  type="email" 
                  id="email" 
                  placeholder="Your email" 
                  className="mt-1"
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  type="text" 
                  id="subject" 
                  placeholder="Message subject" 
                  className="mt-1"
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  rows={4} 
                  placeholder="Your message" 
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="bg-primary text-white hover:bg-primary/90">
                Send Message
              </Button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="text-primary mr-4">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Office Address</h4>
                  <p className="text-muted-foreground">
                    123 Fire Safety Road<br />
                    Umpiluzi Region<br />
                    Eswatini
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-primary mr-4">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Phone Numbers</h4>
                  <p className="text-muted-foreground">
                    Mobile: 060 906 0319
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-primary mr-4">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Email Addresses</h4>
                  <p className="text-muted-foreground">
                    General Inquiries: info@umpiluzifpa.org<br />
                    Permit Applications: permits@umpiluzifpa.org
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="text-primary mr-4">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Office Hours</h4>
                  <p className="text-muted-foreground">
                    Monday-Friday: 8:00 AM - 5:00 PM<br />
                    Saturday: 8:00 AM - 12:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium mb-2">Connect With Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-primary hover:text-accent transition">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-primary hover:text-accent transition">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-primary hover:text-accent transition">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-primary hover:text-accent transition">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
