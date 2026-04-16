import {
  Clipboard,
  Shield,
  AlertTriangle,
  ArrowRight,
  Flame,
  Users,
  BookOpen,
  Target,
} from "lucide-react";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const services = [
  {
    icon: Clipboard,
    title: "Fire management planning",
    body: "Legal compliance, risk mapping, strategic fire breaks, and fire management plans for your land.",
  },
  {
    icon: Shield,
    title: "Fire preparedness",
    body: "Training courses, daily Fire Danger Index forecasts during fire season, and community awareness.",
  },
  {
    icon: Users,
    title: "Stakeholder coordination",
    body: "We represent landowners with Fire Brigade, Eskom, Working on Fire, municipalities, and government.",
  },
  {
    icon: BookOpen,
    title: "Knowledge & advice",
    body: "Guidance on integrated fire management, fuel reduction, equipment, and controlled burning.",
  },
];

const aims = [
  "Ensure all members comply with the National Veld and Forest Fire Act.",
  "Encourage integrated fire management for landowners and public entities.",
  "Prevent and control wildfires across the region.",
  "Maintain ecosystem diversity in natural areas through managed fire.",
  "Minimise the risk and adverse consequences of wildfire hazards.",
];

const nonServices = [
  "Provide a firefighting service",
  "Fulfil the role of the fire brigade",
  "Handle structural firefighting",
  "Enforce voluntary membership",
];

export default function About() {
  return (
    <section id="about" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
            About UFPA
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Integrated community fire management.
          </h2>
          <p className="text-muted-foreground text-lg">
            The Umpiluzi Fire Protection Association supports landowners with
            compliant, coordinated, and effective fire management — so the
            land, the livestock, and the people stay safe.
          </p>
        </div>

        {/* Service grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            );
          })}
        </div>

        {/* Aims + What UFPA does not do side by side */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <div className="rounded-xl border bg-card p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Our aims</h3>
            </div>
            <ul className="space-y-3">
              {aims.map((aim) => (
                <li key={aim} className="flex items-start gap-3 text-sm">
                  <Flame className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-foreground/90">{aim}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/50 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              <h3 className="text-lg font-semibold">What UFPA does not do</h3>
            </div>
            <ul className="space-y-3">
              {nonServices.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-900/50">
              Membership is voluntary except for state organisations that own or manage land.
            </p>
          </div>
        </div>

        {/* Full service list collapsed */}
        <Accordion type="single" collapsible className="max-w-4xl">
          <AccordionItem value="full-list" className="border rounded-xl bg-card px-6">
            <AccordionTrigger className="text-left font-semibold hover:no-underline">
              See the full list of what UFPA provides members
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              <ul className="space-y-2 pt-2">
                <li>• Develop and implement a veld-fire management strategy for the area</li>
                <li>• Assist members to meet their responsibilities under the Act, our constitution, and our rules</li>
                <li>• Improve the knowledge base to help land users implement integrated fire management</li>
                <li>• Raise awareness on integrated fire management and empower local communities</li>
                <li>• Reduce fire risk through integrated fire management plans</li>
                <li>• Assist members managing wildfire incidents as appropriate</li>
                <li>• Represent landowners at local and provincial forums and report back to members</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Member benefits CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-gradient-to-r from-primary/5 to-orange-500/5 p-6">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <h3 className="font-semibold">Discover your member benefits</h3>
              <p className="text-sm text-muted-foreground">Legal protection, training, fire-danger forecasts, and more.</p>
            </div>
          </div>
          <Link href="/safety">
            <button className="inline-flex items-center h-11 px-5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              View all benefits
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
