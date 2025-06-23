import { Helmet } from "react-helmet";
import { Shield, AlertTriangle, Eye, Radio, Route, MapPin, Clock, Users, BookOpen, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Safety() {
  const memberBenefits = [
    {
      icon: Shield,
      title: "Fire Protection Advice",
      description: "Expert guidance on fire protection rules, requirements, and best practices"
    },
    {
      icon: BookOpen,
      title: "Minimum Requirements List",
      description: "Comprehensive checklist of minimum fire protection requirements"
    },
    {
      icon: Award,
      title: "Burning Permits",
      description: "Official issuing of burning permits for controlled fire activities"
    },
    {
      icon: Users,
      title: "Basic Firefighting Training",
      description: "Discounted training courses for farm workers and community members"
    },
    {
      icon: Radio,
      title: "Awareness & Media Coverage",
      description: "Public relations, articles, and comprehensive media coverage"
    },
    {
      icon: MapPin,
      title: "Ward-Level Campaigns",
      description: "Targeted awareness campaigns at ward level for your specific region"
    },
    {
      icon: Shield,
      title: "Legal Protection",
      description: "Presumption of innocence in legal cases until proven otherwise"
    },
    {
      icon: BookOpen,
      title: "Legal Advice",
      description: "Professional legal advice regarding fires and related responsibilities"
    },
    {
      icon: MapPin,
      title: "UFPA Ward Maps",
      description: "Detailed ward maps for better fire management planning"
    },
    {
      icon: Clock,
      title: "Fire Danger Forecasts",
      description: "Daily fire danger weather forecasts delivered via email upon request"
    }
  ];

  const firefightingOrders = [
    {
      number: 1,
      title: "Stay informed about fire weather conditions and forecasts",
      description: "Understanding environmental factors helps anticipate fire risks and behaviour."
    },
    {
      number: 2,
      title: "Know what your fire is doing at all times",
      description: "Continuous monitoring ensures prompt action and informed decision-making."
    },
    {
      number: 3,
      title: "Base all actions on the current and expected behaviour of the fire",
      description: "Adapting strategies based on fire movement improves efficiency and safety."
    },
    {
      number: 4,
      title: "Identify escape routes and safety zones, and make them known",
      description: "Clear evacuation plans reduce risk in case of sudden changes in fire behaviour."
    },
    {
      number: 5,
      title: "Post lookouts when there is potential danger",
      description: "Having observers enhances situational awareness and early detection of threats."
    },
    {
      number: 6,
      title: "Be alert. Keep calm. Think clearly. Act decisively",
      description: "Remaining composed and making informed choices is crucial in high-pressure situations."
    },
    {
      number: 7,
      title: "Maintain prompt communication with all forces, your supervisor, and adjoining teams",
      description: "Coordinated efforts are essential for effective firefighting and risk mitigation."
    },
    {
      number: 8,
      title: "Give clear instructions and ensure they are understood",
      description: "Miscommunication can lead to delays or dangerous mistakes."
    },
    {
      number: 9,
      title: "Maintain control of your forces at all times",
      description: "Strong leadership ensures safety and organization during fire operations."
    },
    {
      number: 10,
      title: "Fight fire aggressively while prioritizing safety first",
      description: "Effective firefighting requires balancing assertive action with caution."
    }
  ];

  const watchOutSituations = [
    {
      number: 1,
      title: "Fire has not been scouted or properly sized up",
      description: "Without assessing fire conditions, responders may be unaware of hazards or spread risks."
    },
    {
      number: 2,
      title: "In unfamiliar terrain that has not been seen in daylight",
      description: "Limited visibility and unknown obstacles make fire management challenging and dangerous."
    },
    {
      number: 3,
      title: "Safety zones and escape routes have not been identified",
      description: "Without planned exit routes, firefighters may be unable to evacuate safely."
    },
    {
      number: 4,
      title: "Unfamiliar with weather conditions and local factors that influence fire behavior",
      description: "Winds, humidity, and terrain can drastically impact fire movement and intensity."
    },
    {
      number: 5,
      title: "Uninformed about strategy, tactics, and potential hazards",
      description: "A lack of clear planning increases risks to crews and property."
    },
    {
      number: 6,
      title: "Instructions and assignments are unclear",
      description: "Miscommunication can lead to disorganized and ineffective firefighting efforts."
    },
    {
      number: 7,
      title: "No communication link with crew members or supervisor",
      description: "Without coordination, responders may be isolated from critical updates."
    },
    {
      number: 8,
      title: "Constructing a fireline without a secure anchor point",
      description: "A weak or unstable fireline may fail to contain the fire."
    },
    {
      number: 9,
      title: "Building a fireline downhill with the fire below",
      description: "Flames can quickly rise upslope, trapping personnel."
    },
    {
      number: 10,
      title: "Attempting a frontal assault on the fire",
      description: "Directly engaging a fire head-on can be highly dangerous."
    },
    {
      number: 11,
      title: "Unburned fuel exists between you and the fire",
      description: "The fire may spread unpredictably through dry vegetation or debris."
    },
    {
      number: 12,
      title: "Unable to see the main fire and not in contact with anyone who can",
      description: "Blind firefighting operations increase risks."
    },
    {
      number: 13,
      title: "Positioned on a hillside where rolling debris can ignite fuel below",
      description: "Falling embers or burning material can start secondary fires."
    },
    {
      number: 14,
      title: "Weather conditions are becoming hotter and drier",
      description: "Increased temperatures and low humidity heighten fire spread risk."
    },
    {
      number: 15,
      title: "Wind speed is increasing or changing direction",
      description: "Sudden wind shifts can push flames toward crews unexpectedly."
    },
    {
      number: 16,
      title: "Spot fires are frequently occurring across the fireline",
      description: "Additional flare-ups can quickly escalate fire complexity."
    },
    {
      number: 17,
      title: "Terrain and fuel conditions make escape to safety zones difficult",
      description: "Thick vegetation, steep slopes, or barriers may limit mobility."
    },
    {
      number: 18,
      title: "Taking a nap near the fireline",
      description: "Fires can change rapidly—staying alert is crucial for safety."
    }
  ];

  const lacesFramework = [
    {
      letter: "L",
      title: "Lookouts",
      description: "Lookouts serve as the eyes of the firefighter—especially for the Crew Boss, Fire Controller, or Section Fire Boss. They must position themselves where they can observe the fireline, personnel, and fire behaviour. Lookouts should recognize potential hazards and report changes immediately.",
      icon: Eye
    },
    {
      letter: "A",
      title: "Awareness",
      description: "All firefighters, including lookouts, must be fully aware of the action plan. This includes understanding fire weather, fire behaviour, terrain, and surrounding activities. Awareness ensures that personnel can adapt to changing conditions and respond effectively.",
      icon: AlertTriangle
    },
    {
      letter: "C",
      title: "Communications",
      description: "Fire officers, crew leaders, and lookouts must maintain reliable communication at all times. This can be through direct radio contact or relayed through designated personnel. Effective communication ensures coordination and safety during operations.",
      icon: Radio
    },
    {
      letter: "E",
      title: "Escape Routes",
      description: "Firefighters should plan and identify at least two escape routes. If the primary route becomes inaccessible, they must know exactly how to proceed. Every firefighter on the fireline must understand these escape plans.",
      icon: Route
    },
    {
      letter: "S",
      title: "Safety Zones",
      description: "Safety zones are designated areas where firefighters can seek refuge if conditions worsen. Their size and location depend on fuel type, terrain, weather conditions, and worst-case fire behaviour. Every firefighter must know the location of these zones before engaging in fire suppression efforts.",
      icon: Shield
    }
  ];

  return (
    <>
      <Helmet>
        <title>Fire Safety Hub - Umpiluzi Fire Protection Association</title>
        <meta name="description" content="Comprehensive fire safety resources, training materials, and firefighting protocols from the Umpiluzi Fire Protection Association." />
        <meta property="og:title" content="Fire Safety Hub - UFPA" />
        <meta property="og:description" content="Essential fire safety protocols, training resources, and member benefits for effective fire protection." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <div className="flex justify-center mb-6">
                <Shield className="h-16 w-16" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Fire Safety Hub</h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
                Comprehensive fire protection resources, training materials, and safety protocols
              </p>
              <div className="w-20 h-1 bg-white mx-auto"></div>
            </div>
          </section>

          {/* Content Tabs */}
          <section className="py-12 bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4">
              <Tabs defaultValue="benefits" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
                  <TabsTrigger value="benefits">Member Benefits</TabsTrigger>
                  <TabsTrigger value="orders">Standard Orders</TabsTrigger>
                  <TabsTrigger value="watchout">Watch Out</TabsTrigger>
                  <TabsTrigger value="laces">LACES</TabsTrigger>
                </TabsList>

                {/* Member Benefits */}
                <TabsContent value="benefits" className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Benefits of Joining UFPA</h2>
                    <p className="text-muted-foreground max-w-3xl mx-auto">
                      Discover the comprehensive benefits and services available to members of the Umpiluzi Fire Protection Association
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {memberBenefits.map((benefit, index) => {
                      const IconComponent = benefit.icon;
                      return (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <IconComponent className="h-6 w-6 text-primary" />
                              </div>
                              <CardTitle className="text-lg">{benefit.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground">{benefit.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Standard Firefighting Orders */}
                <TabsContent value="orders" className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4">Standard Firefighting Orders</h2>
                    <p className="text-muted-foreground max-w-3xl mx-auto">
                      Essential guidelines that form the foundation of safe and effective firefighting operations
                    </p>
                  </div>

                  <div className="space-y-4">
                    {firefightingOrders.map((order, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start space-x-4">
                            <Badge variant="secondary" className="text-lg px-3 py-1 min-w-[2.5rem] text-center">
                              {order.number}
                            </Badge>
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2">{order.title}</CardTitle>
                              <CardDescription className="text-base">{order.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* 18 Watch Out Situations */}
                <TabsContent value="watchout" className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4">18 Watch Out Situations</h2>
                    <p className="text-muted-foreground max-w-3xl mx-auto">
                      Critical situations that require immediate attention and caution during firefighting operations
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {watchOutSituations.map((situation, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start space-x-4">
                            <Badge variant="destructive" className="text-sm px-2 py-1 min-w-[2rem] text-center">
                              {situation.number}
                            </Badge>
                            <div className="flex-1">
                              <CardTitle className="text-base mb-2 leading-tight">{situation.title}</CardTitle>
                              <CardDescription className="text-sm">{situation.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* LACES Framework */}
                <TabsContent value="laces" className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4">LACES Framework</h2>
                    <p className="text-muted-foreground max-w-3xl mx-auto">
                      Developed by Paul Gleason, LACES simplifies key survival principles into an easy-to-remember system for firefighter safety
                    </p>
                  </div>

                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle>About LACES</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        The acronym LACES was developed by Paul Gleason, a highly respected fire specialist with the USDA Forest Service. 
                        He recognized that memorizing multiple safety guidelines—such as the 10 Standard Fire Orders, the 18 Watch Out Situations, 
                        and the 5 Common Denominators on Tragedy Fires—could overwhelm firefighters.
                      </p>
                      <p className="text-muted-foreground">
                        Initially developed as LCES (Lookouts, Communications, Escape Routes, Safety Zones), an "A" was later added for "Awareness", 
                        as situational awareness is critical for ensuring that all other safety measures are effective.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    {lacesFramework.map((item, index) => {
                      const IconComponent = item.icon;
                      return (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full text-xl font-bold">
                                {item.letter}
                              </div>
                              <div className="flex items-center space-x-3">
                                <IconComponent className="h-6 w-6 text-primary" />
                                <CardTitle className="text-xl">{item.title}</CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}