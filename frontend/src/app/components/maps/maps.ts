import { Component, inject, afterNextRender, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../../services/api.service';
import type * as L from 'leaflet';

@Component({
  selector: 'app-maps',
  standalone: true,
  template: `
    <h2>🗺️ Maps</h2>
    <div style="margin-bottom: 15px;">
      <label style="cursor: pointer; font-weight: bold;">
        <input type="checkbox" [checked]="locationEnabled" (change)="toggleLocation($event)"> Allow Location Sharing
      </label>
      <p style="font-size: 0.9em; color: #555;">
        If disabled, default location is Angeles City Holy Angel University.
      </p>
    </div>
    <div id="map" style="height: 500px; width: 100%; border: 1px solid #ccc; border-radius: 8px;"></div>
  `
})
export class MapsComponent {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  private leaflet: any;
  
  locationEnabled = false;

  private map!: L.Map;
  private userMarker?: L.Marker;
  private userPos: { lat: number; lng: number } | null = null;
  private watchId?: number;

  private HAU_COORDS: [number, number] = [15.1332, 120.5907];
  private routingLayer?: L.GeoJSON;

  constructor() {
    afterNextRender(async () => {
      this.leaflet = await import('leaflet');
      this.initMap();
      this.loadRestrooms();
    });
  }

  private initMap(): void {
    const L = this.leaflet;
    // Default location: Holy Angel University, Pampanga
    this.map = L.map('map').setView(this.HAU_COORDS, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Fix for default Leaflet icon not showing in Angular/Webpack
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.setDefaultUserMarker();
  }

  toggleLocation(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.locationEnabled = target.checked;

    if (this.locationEnabled) {
      this.startTracking();
    } else {
      this.disableLocation();
    }
  }

  private disableLocation(): void {
    this.locationEnabled = false;
    this.stopTracking();
    // Back to default location
    this.map.setView(this.HAU_COORDS, 16);
    this.userPos = null;
    this.setDefaultUserMarker();
  }

  private startTracking(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.updateUserMarker();
        },
        (err) => {
          console.warn('Geolocation error:', err);
          if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
            this.disableLocation();
          }
        },
        { enableHighAccuracy: true }
      );
    }
  }

  private stopTracking(): void {
    if (this.watchId !== undefined && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
  }

  private setDefaultUserMarker(): void {
    const L = this.leaflet;
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="background-color: #4285F4; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
      iconSize: [21, 21],
      iconAnchor: [10, 10]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(this.HAU_COORDS).bindPopup('Default Location: Holy Angel University');
    } else {
      this.userMarker = L.marker(this.HAU_COORDS, { icon: userIcon })
        .addTo(this.map)
        .bindPopup('Default Location: Holy Angel University');
    }
  }

  private updateUserMarker(): void {
    if (!this.userPos || !this.locationEnabled) return;
    const L = this.leaflet;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="background-color: #4285F4; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
      iconSize: [21, 21],
      iconAnchor: [10, 10]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([this.userPos.lat, this.userPos.lng]).bindPopup('You are here');
      this.map.setView([this.userPos.lat, this.userPos.lng], 16);
    } else {
      this.userMarker = L.marker([this.userPos.lat, this.userPos.lng], { icon: userIcon })
        .addTo(this.map)
        .bindPopup('You are here');
      
      this.map.setView([this.userPos.lat, this.userPos.lng], 16);
    }
  }

  private loadRestrooms(): void {
    const L = this.leaflet;
    this.api.getAllRestrooms().subscribe({
      next: (restrooms) => {
        restrooms.forEach((r: any) => {
          if (r.location?.latitude && r.location?.longitude) {
            L.marker([r.location.latitude, r.location.longitude])
              .addTo(this.map)
              .bindPopup(`
                <b>${r.name}</b><br>
                ${r.description || 'No description'}<br>
                <button id="dir-${r._id}" class="dir-btn">Get Directions</button>
              `)
              .on('popupopen', () => {
                const btn = document.getElementById(`dir-${r._id}`);
                if (btn) {
                  btn.onclick = () => this.getDirections(r.location.latitude, r.location.longitude);
                }
              });
          }
        });
      },
      error: (err) => console.error('Error loading restrooms:', err)
    });
  }

  private getDirections(destLat: number, destLng: number): void {
    const start = (this.locationEnabled && this.userPos)
      ? { latitude: this.userPos.lat, longitude: this.userPos.lng }
      : { latitude: this.HAU_COORDS[0], longitude: this.HAU_COORDS[1] };
    
    const end = { latitude: destLat, longitude: destLng };
    this.fetchAndDrawRoute(start, end);
  }

  private fetchAndDrawRoute(start: any, end: any): void {
    const L = this.leaflet;
    this.api.getDirections(start, end).subscribe({
      next: (data) => {
        if (this.routingLayer) {
          this.map.removeLayer(this.routingLayer);
        }
        this.routingLayer = L.geoJSON(data, {
          style: { color: '#3388ff', weight: 6, opacity: 0.8 }
        }).addTo(this.map);
        
        if (this.routingLayer) {
          this.map.fitBounds(this.routingLayer.getBounds(), { padding: [50, 50] });
        }
      },
      error: (err) => {
        console.error('Error fetching directions:', err);
        alert('Could not fetch directions. Make sure the ORS API key is valid.');
      }
    });
  }
}
