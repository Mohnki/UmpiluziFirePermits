import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Flame, Clock } from "lucide-react";
import umpiluziLogo from "../assets/umpiluzi-logo.png";

export default function Hero() {
  const { user } = useAuth();

  const handleApplyClick = () => {
    if (!user) {
      const loginEvent = new CustomEvent("show-login-dialog");
      window.dispatchEvent(loginEvent);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#2b1210] to-[#4a1410] text-white">
      {/* subtle grid texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* warm glow */}
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-primary/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-orange-500/20 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 md:pt-14 md:pb-28">
        {/* Logo — small, centered at top */}
        <div className="flex justify-center mb-8">
          <img
            src={umpiluziLogo}
            alt="Umpiluzi Fire Protection Association"
            className="h-24 sm:h-28 md:h-32 w-auto drop-shadow-2xl"
          />
        </div>

        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-3 py-1 text-xs font-medium text-white/80 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Serving the Umpiluzi fire management area
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-5">
            Burn permits, without the paperwork.
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Apply for a burn permit in minutes, track its status, and stay
            compliant with the National Veld and Forest Fire Act — all from
            your phone.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            {user ? (
              <Link href="/apply-permit">
                <Button size="lg" className="h-12 px-6 text-base font-semibold shadow-lg shadow-primary/30">
                  Apply for a permit
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="h-12 px-6 text-base font-semibold shadow-lg shadow-primary/30" onClick={handleApplyClick}>
                Apply for a permit
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <a href="#how-it-works">
              <Button
                variant="ghost"
                size="lg"
                className="h-12 px-6 text-base text-white hover:bg-white/10 focus-visible:ring-white"
              >
                How it works
              </Button>
            </a>
          </div>

          <dl className="grid grid-cols-3 gap-6 max-w-md mx-auto">
            <div>
              <dt className="flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-white/60">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Compliant
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">100%</dd>
              <dd className="text-xs text-white/60">with the Fire Act</dd>
            </div>
            <div>
              <dt className="flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-white/60">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Apply
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">&lt;2 min</dd>
              <dd className="text-xs text-white/60">from phone</dd>
            </div>
            <div>
              <dt className="flex items-center justify-center gap-2 text-xs uppercase tracking-wide text-white/60">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                Approval
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">Instant</dd>
              <dd className="text-xs text-white/60">for allowed burns</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
