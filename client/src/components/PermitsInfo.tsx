import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { ShieldCheck, AlertCircle, Users, Gavel, Megaphone, ArrowRight } from "lucide-react";

const reasons = [
  { icon: ShieldCheck, title: "Safe, controlled burns", body: "A permit confirms that your burn has been planned and logged." },
  { icon: AlertCircle, title: "Prevent accidental wildfires", body: "Approved burns are tracked and visible to the FPA and neighbours." },
  { icon: Gavel, title: "Legal compliance", body: "Required under local fire regulations and the National Veld and Forest Fire Act." },
  { icon: Users, title: "Regional coordination", body: "Fire management is coordinated across farms in the Umpiluzi FMU." },
  { icon: Megaphone, title: "Emergency awareness", body: "Emergency services know about planned burns before they start." },
];

export default function PermitsInfo() {
  const { user } = useAuth();
  return (
    <section id="permits" className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
            Why a permit
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Every controlled burn needs a permit.
          </h2>
          <p className="text-muted-foreground text-lg">
            Our permit system keeps controlled burns safe, legal, and
            coordinated — for your land, your neighbours, and emergency
            services.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">{r.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {user ? (
            <Link href="/apply-permit">
              <Button size="lg" className="h-11">
                Apply for a permit
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="h-11"
              onClick={() => window.dispatchEvent(new CustomEvent("show-login-dialog"))}
            >
              Sign in to apply
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Link href="/safety" className="text-sm font-medium text-primary hover:underline">
            Read about fire safety →
          </Link>
        </div>
      </div>
    </section>
  );
}
