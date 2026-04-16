import { MapPin, Phone, Mail, Clock, ArrowUpRight } from "lucide-react";

const items = [
  {
    icon: MapPin,
    label: "Office",
    primary: "UFPA Building, Ferniehaug Jessievale",
    secondary: "Warburton 2333, South Africa",
    href: "https://www.google.com/maps/search/?api=1&query=Ferniehaug+Jessievale+Warburton",
    linkLabel: "Open in Maps",
  },
  {
    icon: Phone,
    label: "Phone",
    primary: "060 906 0319",
    secondary: "Mobile",
    href: "tel:+27609060319",
    linkLabel: "Call now",
  },
  {
    icon: Mail,
    label: "Email",
    primary: "manager.ufpa@gmail.com",
    secondary: "General enquiries",
    href: "mailto:manager.ufpa@gmail.com",
    linkLabel: "Send email",
  },
  {
    icon: Clock,
    label: "Hours",
    primary: "Mon–Fri · 08:00–17:00",
    secondary: "Weekends: on call during fire season",
  },
];

export default function Contact() {
  return (
    <section id="contact" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">
            Contact
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Get in touch with UFPA.
          </h2>
          <p className="text-muted-foreground text-lg">
            Questions about burn permits, membership, or fire management?
            Reach us directly.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            const card = (
              <div className="h-full rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  {item.label}
                </p>
                <p className="font-semibold text-foreground leading-snug">{item.primary}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.secondary}</p>
                {item.href && (
                  <p className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                    {item.linkLabel}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </p>
                )}
              </div>
            );
            return item.href ? (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {card}
              </a>
            ) : (
              <div key={item.label}>{card}</div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 p-5 flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
          >
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">In a fire emergency</h3>
            <p className="text-sm text-muted-foreground">
              Dial <strong className="tabular-nums text-foreground">10111</strong> or your local Fire
              Brigade immediately. This app is not an emergency service.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
