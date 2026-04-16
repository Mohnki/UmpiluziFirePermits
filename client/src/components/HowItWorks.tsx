import { MapPinned, FileCheck2, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: MapPinned,
    title: "Register your farm",
    body: "Add your farm once — location, area, compartments — and use it for every permit after that.",
    href: "/my-farms",
  },
  {
    icon: FileCheck2,
    title: "Apply in under two minutes",
    body: "Pick a burn type, drop a pin on the map, and submit. No paper, no phone calls, no office visits.",
    href: "/apply-permit",
  },
  {
    icon: ShieldCheck,
    title: "Burn with confidence",
    body: "Approved burns are on record with the FPA and shareable with neighbours and emergency services.",
    href: "/my-permits",
  },
];

export default function HowItWorks() {
  const { user } = useAuth();

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Three steps from application to approval.
          </h2>
        </div>

        <ol className="grid gap-6 md:grid-cols-3 relative">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-mono tabular-nums text-muted-foreground">
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-gradient-to-r from-primary/5 to-orange-500/5 p-6">
          <div>
            <h3 className="text-lg font-semibold">Ready to apply?</h3>
            <p className="text-sm text-muted-foreground">
              Most permits are auto-approved the moment you submit.
            </p>
          </div>
          {user ? (
            <Link href="/apply-permit">
              <Button size="lg" className="h-11">
                Apply now
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
        </div>
      </div>
    </section>
  );
}
