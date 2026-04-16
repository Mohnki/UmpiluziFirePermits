import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';

// Fix Leaflet icon issues
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface UmpiluziFMUMapProps {
  className?: string;
}

export default function UmpiluziFMUMap({ className }: UmpiluziFMUMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShapefile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch GeoJSON data from the server endpoint
        const response = await fetch('/api/umpiluzi-fmu-geojson');
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load shapefile data');
        }
        
        setGeoData(result.data);
      } catch (err) {
        console.error('Error loading shapefile:', err);
        setError('Unable to load the Umpiluzi FMU shapefile. The map will show without boundary data.');
        setGeoData(null);
      } finally {
        setLoading(false);
      }
    };

    loadShapefile();
  }, []);

  const geoJsonStyle = {
    color: '#ff6b35',
    weight: 2,
    opacity: 0.8,
    fillColor: '#ff6b35',
    fillOpacity: 0.2,
    dashArray: '5, 5'
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties) {
      const popupContent = Object.entries(feature.properties)
        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
        .join('<br/>');
      layer.bindPopup(popupContent);
    }
  };

  return (
    <section className={`py-16 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full mb-6">
            <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Umpiluzi Fire Management Unit
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Explore our fire management area boundaries and understand the regions we protect
          </p>
        </div>

        <Card className="overflow-hidden shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Interactive Management Area Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 w-full relative">
              {loading && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">Loading map data...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
                  <div className="text-center text-red-600 dark:text-red-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <MapContainer
                center={[-26.233070192235484, 30.497703552246097]}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                zoomControl={true}
                role="region"
                aria-label="Interactive map of the Umpiluzi Fire Management Unit"
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
                
                {geoData && !loading && (
                  <GeoJSON
                    data={geoData}
                    style={geoJsonStyle}
                    onEachFeature={onEachFeature}
                  />
                )}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}