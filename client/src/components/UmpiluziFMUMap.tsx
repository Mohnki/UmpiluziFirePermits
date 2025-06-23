import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as shp from 'shpjs';
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

        // Load the shapefile from attached assets
        const shpUrl = '/attached_assets/Umpiluzi FMU_1750684429695.shp';
        const dbfUrl = '/attached_assets/Umpiluzi FMU_1750684429693.dbf';
        
        // Convert shapefile to GeoJSON
        const geojson = await shp.combine([
          shp.parseShp(await fetch(shpUrl).then(r => r.arrayBuffer())),
          shp.parseDbf(await fetch(dbfUrl).then(r => r.arrayBuffer()))
        ]);

        setGeoData(geojson);
      } catch (err) {
        console.error('Error loading shapefile:', err);
        setError('Failed to load map data. Please check that the shapefile is accessible.');
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
            <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" />
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

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Protected Areas
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              View the boundaries of our fire management zones
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Interactive Features
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Click on the map areas to see detailed information
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Real-time Data
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Access current fire management information
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}