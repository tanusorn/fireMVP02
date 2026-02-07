import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, MapPin, ExternalLink, Loader2, AlertCircle, X, LocateFixed } from "lucide-react";
import { toast } from "sonner";

interface IncidentNavigationMapProps {
  incidentLat: number;
  incidentLon: number;
  incidentId: string;
  onClose: () => void;
}

interface UserLocation {
  lat: number;
  lon: number;
}

export default function IncidentNavigationMap({
  incidentLat,
  incidentLon,
  incidentId,
  onClose,
}: IncidentNavigationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const watchId = useRef<number | null>(null);

  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem("mapbox_token") || ""
  );
  const [tokenInput, setTokenInput] = useState(mapboxToken);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const saveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem("mapbox_token", tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      toast.success("Mapbox token saved");
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || isMapInitialized) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [incidentLon, incidentLat],
        zoom: 12,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      // Add incident marker
      const incidentMarkerEl = document.createElement("div");
      incidentMarkerEl.className = "incident-marker";
      incidentMarkerEl.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #ef4444, #dc2626);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        </div>
      `;

      // Create popup using DOM methods to prevent XSS
      const popupDiv = document.createElement("div");
      popupDiv.style.padding = "8px";
      popupDiv.style.color = "#1a1a2e";
      const strong = document.createElement("strong");
      strong.textContent = `Incident ${incidentId}`;
      popupDiv.appendChild(strong);
      popupDiv.appendChild(document.createElement("br"));
      popupDiv.appendChild(document.createTextNode("Target Location"));

      new mapboxgl.Marker({ element: incidentMarkerEl })
        .setLngLat([incidentLon, incidentLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupDiv)
        )
        .addTo(map.current);

      map.current.on("load", () => {
        setIsMapInitialized(true);
      });
    } catch (error) {
      toast.error("Failed to initialize map. Please check your Mapbox token.");
      setMapboxToken("");
      localStorage.removeItem("mapbox_token");
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      map.current?.remove();
    };
  }, [mapboxToken, incidentLat, incidentLon, incidentId, isMapInitialized]);

  // Fetch and draw route
  const fetchRoute = useCallback(
    async (userLat: number, userLon: number) => {
      if (!map.current || !mapboxToken) return;

      setIsLoadingRoute(true);

      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${userLon},${userLat};${incidentLon},${incidentLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
        );

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const routeGeometry = route.geometry;

          // Remove existing route layer if present
          if (map.current.getSource("route")) {
            map.current.removeLayer("route");
            map.current.removeSource("route");
          }

          // Add route to map
          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: routeGeometry,
            },
          });

          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#3b82f6",
              "line-width": 5,
              "line-opacity": 0.8,
            },
          });

          // Fit map to route bounds
          const coordinates = routeGeometry.coordinates;
          const bounds = new mapboxgl.LngLatBounds(
            coordinates[0],
            coordinates[0]
          );

          coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });

          map.current.fitBounds(bounds, { padding: 60 });

          const distanceKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.round(route.duration / 60);
          toast.success(`Route: ${distanceKm} km, ~${durationMin} min`);
        }
      } catch (error) {
        console.error("Failed to fetch route:", error);
        toast.error("Failed to calculate route");
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [incidentLat, incidentLon, mapboxToken]
  );

  // Update user marker and route
  const updateUserLocation = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lon: longitude });
      setIsLoadingLocation(false);
      setLocationError(null);

      if (map.current) {
        // Update or create user marker
        if (userMarker.current) {
          userMarker.current.setLngLat([longitude, latitude]);
        } else {
          const userMarkerEl = document.createElement("div");
          userMarkerEl.innerHTML = `
            <div style="
              background: linear-gradient(135deg, #3b82f6, #2563eb);
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
          `;

          userMarker.current = new mapboxgl.Marker({ element: userMarkerEl })
            .setLngLat([longitude, latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 15 }).setHTML(
                `<div style="padding: 8px; color: #1a1a2e;"><strong>Your Location</strong></div>`
              )
            )
            .addTo(map.current);
        }

        // Fetch route
        fetchRoute(latitude, longitude);
      }
    },
    [fetchRoute]
  );

  // Request location permission and start tracking
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    watchId.current = navigator.geolocation.watchPosition(
      updateUserLocation,
      (error) => {
        setIsLoadingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError(
              "Location access denied. Please enable location permissions in your browser settings."
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out. Please try again.");
            break;
          default:
            setLocationError("An unknown error occurred.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  }, [updateUserLocation]);

  // Auto-request location when map is ready
  useEffect(() => {
    if (isMapInitialized && !userLocation && !isLoadingLocation && !locationError) {
      requestLocation();
    }
  }, [isMapInitialized, userLocation, isLoadingLocation, locationError, requestLocation]);

  const openInExternalMaps = () => {
    const destination = `${incidentLat},${incidentLon}`;
    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lon}`
      : "";

    // Try to detect if on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // Apple Maps
      window.open(
        `maps://maps.apple.com/?daddr=${destination}${origin ? `&saddr=${origin}` : ""}`,
        "_blank"
      );
    } else {
      // Google Maps
      window.open(
        `https://www.google.com/maps/dir/${origin}/${destination}`,
        "_blank"
      );
    }
  };

  // Token input screen
  if (!mapboxToken) {
    return (
      <Card className="glass mt-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Navigation Map
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your Mapbox public token to enable navigation. Get one at{" "}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="pk.eyJ1IjoiLi4uIiwiYSI6Ii4uLiJ9..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={saveToken} disabled={!tokenInput.trim()}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass mt-4 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Navigation to Incident
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {/* Map Container */}
        <div className="relative w-full h-[400px] sm:h-[500px]">
          <div ref={mapContainer} className="absolute inset-0" />

          {/* Loading Overlay */}
          {(isLoadingLocation || isLoadingRoute) && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  {isLoadingLocation ? "Detecting your location..." : "Calculating route..."}
                </p>
              </div>
            </div>
          )}

          {/* Location Error */}
          {locationError && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-destructive/90 text-destructive-foreground p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{locationError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 bg-background/20 border-background/30 hover:bg-background/30"
                    onClick={requestLocation}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 p-4 pt-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={requestLocation}
            disabled={isLoadingLocation}
          >
            <LocateFixed className="h-4 w-4 mr-2" />
            Update My Location
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={openInExternalMaps}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Maps App
          </Button>
        </div>

        {/* Location Info */}
        {userLocation && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-muted-foreground">Your Location</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">Incident Location</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
