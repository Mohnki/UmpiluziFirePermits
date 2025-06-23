import { Helmet } from "react-helmet";
import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Home, Trees, Flame, Car, Droplets, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface RiskItem {
  id: string;
  category: string;
  question: string;
  points: number;
  checked: boolean;
  description?: string;
}

export default function RiskCalculator() {
  const [riskItems, setRiskItems] = useState<RiskItem[]>([
    // Defensible Space & Vegetation (0-3 points each)
    {
      id: "clear_space",
      category: "Defensible Space",
      question: "Is there less than 10 meters of clear defensible space around structures?",
      points: 3,
      checked: false,
      description: "Minimum 10 meters of clear space is essential - more is better"
    },
    {
      id: "tree_branches",
      category: "Defensible Space", 
      question: "Are there tree branches overhanging the roof?",
      points: 2,
      checked: false,
      description: "Remove branches that overhang roofs to prevent ember ignition"
    },
    {
      id: "ladder_fuels",
      category: "Defensible Space",
      question: "Are there 'ladder fuels' (fences, creepers, woodpiles) against walls?",
      points: 3,
      checked: false,
      description: "Keep combustible materials away from structure walls"
    },
    {
      id: "tree_crowns",
      category: "Defensible Space",
      question: "Do tree crowns touch each other?",
      points: 2,
      checked: false,
      description: "Open up spaces so tree crowns don't connect"
    },
    {
      id: "lower_branches",
      category: "Defensible Space",
      question: "Are lower tree branches within 2 meters of the ground?",
      points: 2,
      checked: false,
      description: "Remove lower branches to prevent ground fires reaching canopy"
    },
    {
      id: "leaf_litter",
      category: "Defensible Space",
      question: "Is there accumulated leaf litter and dry material under trees?",
      points: 2,
      checked: false,
      description: "Clean up dry debris before fire season"
    },
    
    // Roof & Structure (0-4 points each)
    {
      id: "roof_material",
      category: "Roof & Structure",
      question: "Is the roof made of flammable material (thatch, wood shingles)?",
      points: 4,
      checked: false,
      description: "Non-flammable roofing materials are always less risky"
    },
    {
      id: "roof_tiles",
      category: "Roof & Structure",
      question: "Are there loose or lifting roof tiles?",
      points: 3,
      checked: false,
      description: "Check for gaps where embers can accumulate"
    },
    {
      id: "gutters",
      category: "Roof & Structure",
      question: "Are gutters filled with leaf litter?",
      points: 3,
      checked: false,
      description: "Keep gutters clean and consider filling with water when fire approaches"
    },
    {
      id: "eaves",
      category: "Roof & Structure",
      question: "Are eaves open (not boxed in)?",
      points: 2,
      checked: false,
      description: "Box in eaves to prevent ember accumulation"
    },
    {
      id: "air_vents",
      category: "Roof & Structure",
      question: "Do air vents lack fine mesh screening?",
      points: 2,
      checked: false,
      description: "Fit fine mesh to prevent ember entry"
    },
    {
      id: "roof_gaps",
      category: "Roof & Structure",
      question: "Are there gaps between corrugated roofing and structure?",
      points: 3,
      checked: false,
      description: "Close gaps to prevent ember accumulation"
    },

    // Preparedness & Access (0-3 points each)
    {
      id: "water_source",
      category: "Preparedness",
      question: "Is there no independent water source (pool, tank)?",
      points: 3,
      checked: false,
      description: "Independent water source is invaluable during emergencies"
    },
    {
      id: "fire_equipment",
      category: "Preparedness",
      question: "Are fire suppression tools not readily available?",
      points: 2,
      checked: false,
      description: "Keep buckets, hose, fire beater, protective clothing ready"
    },
    {
      id: "flammable_liquids",
      category: "Preparedness",
      question: "Are large quantities of flammable liquids stored on property?",
      points: 3,
      checked: false,
      description: "Minimize storage of flammable materials"
    },
    {
      id: "driveway_access",
      category: "Preparedness",
      question: "Is the driveway too narrow for fire trucks?",
      points: 2,
      checked: false,
      description: "Ensure driveway can accommodate emergency vehicles"
    },
    {
      id: "property_numbering",
      category: "Preparedness",
      question: "Is property numbering not clearly visible from the road?",
      points: 2,
      checked: false,
      description: "Use reflective numbers for visibility in smoky conditions"
    },
    {
      id: "wooden_furniture",
      category: "Preparedness",
      question: "Is wooden garden furniture left near the house?",
      points: 1,
      checked: false,
      description: "Move combustible furniture away from structures"
    },
    {
      id: "deck_vegetation",
      category: "Preparedness",
      question: "Is there dry vegetation under decks?",
      points: 2,
      checked: false,
      description: "Clear vegetation and apply fire retardants to wooden decking"
    },
    {
      id: "evacuation_plan",
      category: "Preparedness",
      question: "Is there no evacuation plan or checklist prepared?",
      points: 2,
      checked: false,
      description: "Prepare evacuation checklist and ensure family knows the plan"
    }
  ]);

  const handleItemToggle = (id: string) => {
    setRiskItems(items => 
      items.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const totalScore = riskItems.reduce((sum, item) => sum + (item.checked ? item.points : 0), 0);
  const maxScore = riskItems.reduce((sum, item) => sum + item.points, 0);
  
  const getRiskLevel = (score: number) => {
    if (score <= 20) return { level: "Low Risk", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/20" };
    if (score <= 40) return { level: "Moderate Risk", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/20" };
    if (score <= 65) return { level: "High Risk", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/20" };
    return { level: "Extreme Risk", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/20" };
  };

  const riskLevel = getRiskLevel(totalScore);
  const uniqueCategories = new Set(riskItems.map(item => item.category));
  const categories = ["Defensible Space", "Roof & Structure", "Preparedness"].filter(cat => uniqueCategories.has(cat));

  return (
    <>
      <Helmet>
        <title>Landowner Risk Calculator - Firewise Property Assessment</title>
        <meta name="description" content="Assess your property's fire risk using our comprehensive Firewise defensible space checklist. Identify hazards and reduce wildfire damage risk." />
        <meta property="og:title" content="Property Fire Risk Assessment - UFPA" />
        <meta property="og:description" content="Use our Firewise checklist to evaluate your property's fire safety and create effective defensible space." />
        <meta property="og:type" content="website" />
      </Helmet>
      
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16">
            <div className="container mx-auto px-4 text-center">
              <div className="flex justify-center mb-6">
                <Calculator className="h-16 w-16" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Landowner Risk Calculator</h1>
              <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
                Assess your property's fire risk using the Firewise defensible space checklist
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto">
                <p className="text-lg mb-2">Target: 65 points or less for safer properties</p>
                <p className="text-sm opacity-90">Based on Firewise Communities South Africa guidelines</p>
              </div>
            </div>
          </section>

          {/* Risk Score Display */}
          <section className="py-8 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <Card className="mb-8">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl mb-4">Your Current Risk Score</CardTitle>
                    <div className={`text-6xl font-bold mb-4 ${riskLevel.color}`}>
                      {totalScore}
                    </div>
                    <Badge className={`text-lg px-4 py-2 ${riskLevel.bgColor} ${riskLevel.color} border-0`}>
                      {riskLevel.level}
                    </Badge>
                    <div className="mt-4">
                      <Progress value={(totalScore / maxScore) * 100} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {totalScore} of {maxScore} total risk points
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </section>

          {/* Assessment Checklist */}
          <section className="py-12 bg-white dark:bg-gray-900">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-foreground mb-4">Property Assessment Checklist</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Check each item that applies to your property. Lower scores indicate better fire safety preparation.
                  </p>
                </div>

                {categories.map(category => {
                  const categoryItems = riskItems.filter(item => item.category === category);
                  const categoryScore = categoryItems.reduce((sum, item) => sum + (item.checked ? item.points : 0), 0);
                  const CategoryIcon = category === "Defensible Space" ? Trees : 
                                     category === "Roof & Structure" ? Home : 
                                     category === "Preparedness" ? Shield : Flame;

                  return (
                    <Card key={category} className="mb-6">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <CategoryIcon className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle className="text-xl">{category}</CardTitle>
                          </div>
                          <Badge variant="outline" className="text-sm">
                            Score: {categoryScore}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {categoryItems.map(item => (
                          <div 
                            key={item.id} 
                            className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            onClick={() => handleItemToggle(item.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`mt-1 rounded border-2 p-1 transition-colors ${
                                  item.checked 
                                    ? 'bg-red-500 border-red-500 text-white' 
                                    : 'border-gray-300 hover:border-red-300'
                                }`}
                              >
                                {item.checked && <CheckCircle className="h-4 w-4" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-foreground">{item.question}</h4>
                                  <Badge variant={item.checked ? "destructive" : "secondary"} className="ml-2">
                                    {item.points} pts
                                  </Badge>
                                </div>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Recommendations */}
          <section className="py-12 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl text-center mb-4">Risk Reduction Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                          Immediate Actions
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• Clear 10+ meters of defensible space around structures</li>
                          <li>• Remove ladder fuels (vegetation against walls)</li>
                          <li>• Clean gutters and remove leaf litter</li>
                          <li>• Trim tree branches away from roofs</li>
                          <li>• Install fine mesh on air vents</li>
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground flex items-center">
                          <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                          Long-term Improvements
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li>• Install independent water source</li>
                          <li>• Upgrade to non-flammable roofing</li>
                          <li>• Create gravel or lawn firebreaks</li>
                          <li>• Plant fire-resistant species near structures</li>
                          <li>• Improve driveway access for emergency vehicles</li>
                        </ul>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Remember</h3>
                      <p className="text-muted-foreground">
                        Most homes that burn down ignite from flying embers after the main fire has passed, 
                        not from radiant heat. Focus on eliminating ember accumulation points and creating 
                        defensible space around your structures.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}