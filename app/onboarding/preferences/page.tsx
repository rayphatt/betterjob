"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, Building2, Coffee, MapPin, DollarSign } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { signInAnonymouslyUser } from "@/lib/auth";
import { createUserOnboarding } from "@/lib/firestore";

export default function PreferencesPage() {
  const router = useRouter();
  const { data, updateData, getProfile } = useOnboarding();
  const [workEnvironment, setWorkEnvironment] = useState("flexible");
  const [location, setLocation] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [includeRemote, setIncludeRemote] = useState(true);
  const [includeInternational, setIncludeInternational] = useState(false);
  const [salaryRange, setSalaryRange] = useState([60000]);
  const [salaryType, setSalaryType] = useState<"yearly" | "hourly">("yearly");
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = async () => {
    setIsSaving(true);
    
    try {
      const preferences = {
        workEnvironment,
        location,
        includeRemote,
        includeInternational,
        desiredSalaryMin: salaryRange[0] * 0.8, // 80% of desired as min
        desiredSalaryMax: salaryRange[0] * 1.2, // 120% of desired as max
        salaryType,
      };

      updateData({ preferences });

      // Sign in anonymously to get a user ID
      const user = await signInAnonymouslyUser();
      
      // Get the complete profile
      const profile = getProfile();
      
      if (!profile) {
        throw new Error("Profile data is incomplete");
      }

      // Generate matching tags from skills, tasks, and interests
      const matchingTags = [
        ...data.skills,
        ...data.tasks.map(task => task.toLowerCase()),
        ...(data.interests || []).map(interest => interest.toLowerCase()),
      ];

      // Save to Firestore
      await createUserOnboarding(user.uid, {
        currentRole: data.role,
        currentCompany: data.company,
        profile,
        matchingTags,
      });

      router.push("/explore");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      alert("Failed to save your preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatSalary = (value: number) => {
    if (salaryType === "yearly") {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}/hr`;
    }
  };

  // Debounced location search
  useEffect(() => {
    // State abbreviation mapping for better matching
    const stateAbbreviations: Record<string, string> = {
      'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas',
      'ca': 'California', 'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware',
      'fl': 'Florida', 'ga': 'Georgia', 'hi': 'Hawaii', 'id': 'Idaho',
      'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa', 'ks': 'Kansas',
      'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
      'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi',
      'mo': 'Missouri', 'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada',
      'nh': 'New Hampshire', 'nj': 'New Jersey', 'nm': 'New Mexico', 'ny': 'New York',
      'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio', 'ok': 'Oklahoma',
      'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
      'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah',
      'vt': 'Vermont', 'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia',
      'wi': 'Wisconsin', 'wy': 'Wyoming'
    };

    // Major US cities (population > 200K or major metropolitan areas)
    const majorUSCities = new Set([
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
      'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
      'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
      'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Detroit',
      'Nashville', 'Portland', 'Memphis', 'Oklahoma City', 'Las Vegas',
      'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson',
      'Fresno', 'Sacramento', 'Mesa', 'Kansas City', 'Atlanta', 'Long Beach',
      'Colorado Springs', 'Raleigh', 'Omaha', 'Miami', 'Virginia Beach',
      'Oakland', 'Minneapolis', 'Tulsa', 'Arlington', 'Tampa', 'New Orleans',
      'Wichita', 'Cleveland', 'Tampa', 'Bakersfield', 'Aurora', 'Anaheim',
      'Honolulu', 'Santa Ana', 'Riverside', 'Corpus Christi', 'Lexington',
      'Henderson', 'Stockton', 'Saint Paul', 'St. Louis', 'Cincinnati',
      'St. Petersburg', 'Pittsburgh', 'Greensboro', 'Lincoln', 'Anchorage',
      'Plano', 'Orlando', 'Irvine', 'Newark', 'Durham', 'Chula Vista',
      'Toledo', 'Fort Wayne', 'St. Petersburg', 'Laredo', 'Jersey City',
      'Chandler', 'Madison', 'Lubbock', 'Scottsdale', 'Reno', 'Buffalo',
      'Gilbert', 'Glendale', 'North Las Vegas', 'Winston-Salem', 'Chesapeake',
      'Norfolk', 'Fremont', 'Garland', 'Irving', 'Hialeah', 'Richmond',
      'Boise', 'Spokane', 'Baton Rouge', 'Tacoma', 'San Bernardino',
      'Modesto', 'Fontana', 'Des Moines', 'Moreno Valley', 'Santa Clarita',
      'Fayetteville', 'Birmingham', 'Oxnard', 'Rochester', 'Port St. Lucie',
      'Grand Rapids', 'Salt Lake City', 'Tallahassee', 'Huntsville',
      'Grand Prairie', 'Knoxville', 'Worcester', 'Newport News', 'Brownsville',
      'Overland Park', 'Santa Rosa', 'Fort Lauderdale', 'Garden Grove',
      'Vancouver', 'Sioux Falls', 'Ontario', 'Tempe', 'Providence',
      'Chattanooga', 'Fort Collins', 'Reading', 'Oceanside', 'Elk Grove',
      'Salem', 'Lancaster', 'Corona', 'Eugene', 'Pembroke Pines', 'Peoria',
      'Frisco', 'Cary', 'Amarillo', 'Lafayette', 'Clarksville', 'Hayward',
      'Salinas', 'Springfield', 'Lakewood', 'Palmdale', 'Hollywood',
      'Alexandria', 'Pasadena', 'Sunnyvale', 'Macon', 'Pomona', 'Lakewood',
      'Escondido', 'Kansas City', 'Torrance', 'Syracuse', 'Fort Collins',
      'Bridgeport', 'Rockford', 'Savannah', 'Paterson', 'McAllen', 'Mesquite',
      'Joliet', 'Killeen', 'Bellevue', 'Yonkers', 'Warren', 'Sterling Heights',
      'Surprise', 'Elgin', 'Miramar', 'Thousand Oaks', 'Topeka', 'Waco',
      'Hartford', 'Vallejo', 'Carrollton', 'Mobile', 'Flint', 'Abilene',
      'Beaumont', 'Peoria', 'Round Rock', 'Cape Coral', 'Evansville',
      'Lakeland', 'Temecula', 'Midland', 'Palm Bay', 'Columbia', 'Clearwater'
    ]);

    const searchLocations = async (query: string) => {
      if (query.length < 2) {
        setLocationSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const queryLower = query.trim().toLowerCase();
        const queryParts = queryLower.split(/\s+/);
        
        // Check if query might be a state abbreviation or partial state name
        const possibleStateAbbr = queryLower.match(/^([a-z]{1,2})(\s|$)/)?.[1];
        
        // Find states that start with the query or match partial state names (e.g., "new j" -> "New Jersey")
        const matchingStates = Object.values(stateAbbreviations).filter(state => {
          const stateLower = state.toLowerCase();
          // Check if query matches beginning of state name
          if (stateLower.startsWith(queryLower)) return true;
          
          // Check if query matches first word(s) of state name (e.g., "new j" matches "New Jersey")
          if (queryParts.length >= 2) {
            const stateParts = stateLower.split(/\s+/);
            if (queryParts.length <= stateParts.length) {
              // Match each query part to corresponding state part
              return queryParts.every((part, idx) => {
                if (!stateParts[idx]) return false;
                // Allow partial matches within words (e.g., "j" matches "jersey")
                return stateParts[idx].startsWith(part) || 
                       stateParts[idx].includes(part);
              });
            }
          }
          
          // Also check if query is a substring of state name (handles cases like "new j" -> "new jersey")
          const stateWithoutSpaces = stateLower.replace(/\s+/g, '');
          const queryWithoutSpaces = queryLower.replace(/\s+/g, '');
          if (stateWithoutSpaces.startsWith(queryWithoutSpaces)) return true;
          
          return false;
        });
        
        // Build queries - try both state-level and city-level searches
        const queries: string[] = [];
        
        // If it looks like a state search, prioritize state-level query
        if (possibleStateAbbr && stateAbbreviations[possibleStateAbbr]) {
          queries.push(`${stateAbbreviations[possibleStateAbbr]}, USA`);
        }
        
        // Add all matching states
        matchingStates.forEach(state => {
          queries.push(`${state}, USA`);
        });
        
        // Always include the original query
        let searchQuery = query.trim();
        if (!searchQuery.match(/,\s*(USA|US|United States)$/i)) {
          searchQuery = `${searchQuery}, USA`;
        }
        queries.push(searchQuery);
        
        // Remove duplicates
        const uniqueQueries = [...new Set(queries)];
        
        // Fetch results for all queries and combine
        const allResponses = await Promise.all(
          uniqueQueries.map(async (q) => {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=10&countrycodes=us&extratags=1&namedetails=1&accept-language=en`,
              {
                headers: {
                  'User-Agent': 'BetterJob App',
                },
              }
            );
            if (response.ok) {
              return await response.json();
            }
            return [];
          })
        );
        
        // Combine all results
        const data = allResponses.flat();
        
        // Format and prioritize suggestions - only US states and major cities
        const formattedSuggestions = data
          .map((item: any) => {
              const addr = item.address || {};
              
              // Check if it's a US location (must have state)
              const state = addr.state || '';
              const stateCode = addr.state_code || '';
              
              // Only process if we have a valid US state
              if (!state || !Object.values(stateAbbreviations).includes(state)) {
                return null; // Skip non-US locations
              }
              
              // Prioritize state-level matches
              if ((item.type === 'administrative' && item.class === 'boundary') || 
                  (item.osm_type === 'relation' && item.class === 'boundary' && item.type === 'administrative')) {
                // Return state with abbreviation if available
                return stateCode ? `${state}, ${stateCode}` : `${state}, US`;
              }
              
              // For cities, only include major cities
              const city = addr.city || '';
              if (city && state) {
                // Check if city is in our major cities list (case-insensitive)
                const cityLower = city.toLowerCase();
                const isMajorCity = Array.from(majorUSCities).some(majorCity => 
                  majorCity.toLowerCase() === cityLower
                );
                
                // Also check if it's a significant city by importance score (cities with importance > 0.6 are usually major)
                const isSignificantCity = item.importance && item.importance > 0.6;
                
                // Only include major cities or very significant cities
                if (isMajorCity || isSignificantCity) {
                  return `${city}, ${stateCode || state}`;
                }
              }
              
              // Fallback: try to extract from display_name if it's a major city
              const displayName = item.display_name || '';
              const parts = displayName.split(', ');
              
              if (parts.length >= 2) {
                // Look for state abbreviation (2 uppercase letters) or full state name
                const stateIndex = parts.findIndex((p: string) => 
                  /^[A-Z]{2}$/.test(p) || 
                  Object.values(stateAbbreviations).includes(p)
                );
                
                if (stateIndex > 0) {
                  const cityName = parts[0];
                  const cityState = parts[stateIndex];
                  
                  // Check if city is major
                  const cityLower = cityName.toLowerCase();
                  const isMajorCity = Array.from(majorUSCities).some(majorCity => 
                    majorCity.toLowerCase() === cityLower
                  );
                  
                  // Only return if it's a major city or the state itself
                  if (isMajorCity || stateIndex === 1) {
                    return `${cityName}, ${cityState}`;
                  }
                }
              }
              
              return null; // Skip if not a state or major city
            })
          .filter((loc: string | null): loc is string => loc !== null && loc.trim().length > 0)
          .filter((loc: string, index: number, self: string[]) => 
            self.indexOf(loc) === index // Remove duplicates
          );
        
        // Sort by relevance: prioritize states, then exact matches
        formattedSuggestions.sort((a: string, b: string) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();
          const queryLower = query.toLowerCase();
          
          // Check if matches state name/abbreviation
          const aIsState = Object.values(stateAbbreviations).some(state => aLower.includes(state.toLowerCase())) ||
                          Object.entries(stateAbbreviations).some(([abbr, state]) => 
                            aLower.includes(abbr.toLowerCase()) || aLower.includes(state.toLowerCase())
                          );
          const bIsState = Object.values(stateAbbreviations).some(state => bLower.includes(state.toLowerCase())) ||
                          Object.entries(stateAbbreviations).some(([abbr, state]) => 
                            bLower.includes(abbr.toLowerCase()) || bLower.includes(state.toLowerCase())
                          );
          
          // Prioritize states when query looks like state search
          if (queryLower.length <= 5 && (aIsState || bIsState)) {
            if (aIsState && !bIsState) return -1;
            if (!aIsState && bIsState) return 1;
          }
          
          // Exact matches first
          if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
          if (!aLower.startsWith(queryLower) && bLower.startsWith(queryLower)) return 1;
          
          // Contains query
          if (aLower.includes(queryLower) && !bLower.includes(queryLower)) return -1;
          if (!aLower.includes(queryLower) && bLower.includes(queryLower)) return 1;
          
          return 0;
        });
          
        const suggestions = formattedSuggestions.slice(0, 5); // Limit to 5 suggestions
        
        setLocationSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error("Error fetching location suggestions:", error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (location.trim()) {
        searchLocations(location);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [location]);

  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleLocationBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <main className="min-h-screen bg-background-page flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center px-4 sm:px-6 pt-6 sm:pt-8">
          <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2 leading-tight">
            What's your ideal work environment?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6 pb-6 sm:pb-8">
          {/* Work Environment */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-base sm:text-lg font-semibold">Work Environment</Label>
            <RadioGroup value={workEnvironment} onValueChange={setWorkEnvironment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation min-h-[80px] ${
                  workEnvironment === "remote"
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                }`}
                onClick={() => setWorkEnvironment("remote")}
              >
                <RadioGroupItem value="remote" id="remote" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="w-5 h-5 text-primary" />
                    <Label htmlFor="remote" className="cursor-pointer text-sm sm:text-base font-semibold">Remote</Label>
                  </div>
                  <p className="text-xs text-text-secondary">Work from anywhere</p>
                </div>
              </div>
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation min-h-[80px] ${
                  workEnvironment === "hybrid"
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                }`}
                onClick={() => setWorkEnvironment("hybrid")}
              >
                <RadioGroupItem value="hybrid" id="hybrid" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee className="w-5 h-5 text-primary" />
                    <Label htmlFor="hybrid" className="cursor-pointer text-sm sm:text-base font-semibold">Hybrid</Label>
                  </div>
                  <p className="text-xs text-text-secondary">Mix of remote and office</p>
                </div>
              </div>
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation min-h-[80px] ${
                  workEnvironment === "office"
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                }`}
                onClick={() => setWorkEnvironment("office")}
              >
                <RadioGroupItem value="office" id="office" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-primary" />
                    <Label htmlFor="office" className="cursor-pointer text-sm sm:text-base font-semibold">Office</Label>
                  </div>
                  <p className="text-xs text-text-secondary">Work from the office</p>
                </div>
              </div>
              <div
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all touch-manipulation min-h-[80px] ${
                  workEnvironment === "flexible"
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                }`}
                onClick={() => setWorkEnvironment("flexible")}
              >
                <RadioGroupItem value="flexible" id="flexible" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-primary" />
                    <Label htmlFor="flexible" className="cursor-pointer text-sm sm:text-base font-semibold">Flexible</Label>
                  </div>
                  <p className="text-xs text-text-secondary">Open to all options</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Location */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <Label className="text-base sm:text-lg font-semibold">Where do you want to work?</Label>
            </div>
            {workEnvironment === "remote" && (
              <p className="text-xs sm:text-sm text-text-secondary bg-blue-50 border border-blue-200 rounded-lg p-3">
                💡 Since you selected Remote, location is optional. We'll still show you remote opportunities if you specify a location.
              </p>
            )}
            <div className="relative">
              <Input
                type="text"
                placeholder="Start typing a city or state..."
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (locationSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={handleLocationBlur}
                className="text-base sm:text-lg h-12 w-full"
              />
              {showSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-sm sm:text-base"
                      onClick={() => handleLocationSelect(suggestion)}
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 min-h-[44px]">
              <Checkbox
                id="include-remote"
                checked={includeRemote}
                onCheckedChange={(checked) => setIncludeRemote(checked === true)}
                className="w-5 h-5"
              />
              <Label htmlFor="include-remote" className="cursor-pointer text-sm sm:text-base touch-manipulation">
                Include Remote Jobs
              </Label>
            </div>
            <div className="flex items-center space-x-2 min-h-[44px]">
              <Checkbox
                id="include-international"
                checked={includeInternational}
                onCheckedChange={(checked) => setIncludeInternational(checked === true)}
                className="w-5 h-5"
              />
              <Label htmlFor="include-international" className="cursor-pointer text-sm sm:text-base touch-manipulation">
                Include International Jobs
              </Label>
            </div>
          </div>

          {/* Salary */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <Label className="text-base sm:text-lg font-semibold">What's your desired salary?</Label>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant={salaryType === "yearly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Convert hourly to yearly if switching (approximate: hourly * 2080)
                    if (salaryType === "hourly") {
                      setSalaryRange([Math.max(30000, Math.min(300000, Math.round(salaryRange[0] * 2080)))]);
                    }
                    setSalaryType("yearly");
                  }}
                  className="flex-1 sm:flex-none min-h-[44px] touch-manipulation"
                >
                  Yearly
                </Button>
                <Button
                  variant={salaryType === "hourly" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Convert yearly to hourly if switching (approximate: yearly / 2080)
                    if (salaryType === "yearly") {
                      setSalaryRange([Math.max(15, Math.min(150, Math.round(salaryRange[0] / 2080)))]);
                    }
                    setSalaryType("hourly");
                  }}
                  className="flex-1 sm:flex-none min-h-[44px] touch-manipulation"
                >
                  Hourly
                </Button>
              </div>
            </div>
            <div className="space-y-2 px-2">
              <Slider
                value={salaryRange}
                onValueChange={setSalaryRange}
                min={salaryType === "yearly" ? 30000 : 15}
                max={salaryType === "yearly" ? 300000 : 150}
                step={salaryType === "yearly" ? 5000 : 5}
                className="w-full"
              />
              <div className="flex items-center justify-center gap-2">
                <div className="text-center text-xl sm:text-2xl font-bold text-primary">
                  {formatSalary(salaryRange[0])}
                </div>
                {salaryType === "yearly" && (
                  <span className="text-xs sm:text-sm text-text-secondary">
                    ≈ ${Math.round(salaryRange[0] / 2080)}/hr
                  </span>
                )}
                {salaryType === "hourly" && (
                  <span className="text-xs sm:text-sm text-text-secondary">
                    ≈ ${(salaryRange[0] * 2080 / 1000).toFixed(0)}K/year
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary text-center">
                We'll match you with jobs within ±20% of this range
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleNext}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-6 text-base sm:text-lg min-h-[44px] touch-manipulation"
              size="lg"
            >
              {isSaving ? "Saving..." : "Find My Career Matches →"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

