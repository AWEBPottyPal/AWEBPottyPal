import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import type * as L from 'leaflet';

const AMENITIES = ['Bidet', 'Soap', 'PWD Friendly', 'Clean', 'Lock', 'Tissue'];

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, CommonModule],
  standalone: true,
  styles: [`
    .fullscreen-map {
      position: fixed !important;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999;
      margin: 0 !important;
      border-radius: 0 !important;
    }
    .osm-custom-tiles {
      filter: saturate(0.6) brightness(1.05) contrast(1.05) hue-rotate(-10deg);
    }
  `],
  template: `
    <h2>All Restrooms</h2>
    
    <!-- Filters Area -->
    <div style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
      <h3 style="margin-top: 0; margin-bottom: 15px;">Advanced Filters</h3>
      
      <!-- Open Status -->
      <div style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
        <label style="font-weight: bold; cursor: pointer; color: #28a745;">
          <input type="checkbox" [(ngModel)]="showOpenOnly" (change)="onFilterChange()" /> Show Open Now Only
        </label>
      </div>

      <!-- Radius -->
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
        <label for="radiusSlider" style="min-width: 110px; font-weight: bold;">Radius: {{ radius / 1000 | number:'1.0-1' }} km</label>
        <input type="range" id="radiusSlider" min="500" max="20000" step="500" [(ngModel)]="radius" (change)="onFilterChange()" style="flex: 1;">
      </div>

      <!-- Rating -->
      <div style="margin-bottom: 15px; display: flex; align-items: center;">
        <label style="font-weight: bold;">Minimum Rating:</label>
        <input type="number" min="1" max="5" step="0.1" [(ngModel)]="minRating" (change)="onFilterChange()" style="width: 60px; margin-left: 10px; padding: 4px;">
        <span style="font-size: 0.85em; color: #666; margin-left: 10px;">(1.0 - 5.0)</span>
        @if (minRating !== null) {
          <button (click)="clearRating()" style="margin-left: 15px; padding: 4px 8px; font-size: 0.85em; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;">Clear Rating</button>
        }
      </div>

      <!-- Amenities -->
      <div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <label style="font-weight: bold;">Required Amenities:</label>
          @if (selectedAmenities.length > 0) {
            <button (click)="clearAmenities()" style="padding: 4px 8px; font-size: 0.85em; cursor: pointer; border-radius: 4px; border: 1px solid #ccc;">Clear Amenities</button>
          }
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;">
          @for (a of amenityOptions; track a) {
            <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">
              <input type="checkbox" [checked]="selectedAmenities.includes(a)" (change)="toggleAmenity(a)"> {{ a }}
            </label>
          }
        </div>
      </div>
    </div>

    <!-- Map Controls Area -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px;">
      <div>
        <label style="cursor: pointer; font-weight: bold;">
          <input type="checkbox" [checked]="locationEnabled" (change)="toggleLocation($event)"> Allow Location Sharing
        </label>
        <p style="font-size: 0.85em; color: #555; margin: 5px 0 0 0;">
          If disabled, default location is Angeles City Holy Angel University.
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <button (click)="recenterMap()" style="padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;">📍 Recenter Map</button>
        <button (click)="toggleFullscreen()" style="padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: #fff;">⛶ Fullscreen</button>
      </div>
    </div>

    <!-- Map Container -->
    <div id="home-map" style="height: 400px; width: 100%; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 20px; transition: all 0.3s ease;"></div>

    @if (isFullscreen) {
      <div style="position: fixed; top: 20px; right: 20px; z-index: 10000;">
        <button (click)="toggleFullscreen()" style="padding: 10px 16px; font-size: 1.1em; background: #fff; border: 2px solid rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-weight: bold;">
          ⛶ Exit Fullscreen
        </button>
      </div>
    }

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <h3 style="margin: 0;">Restrooms found ({{ filteredRestrooms.length }})</h3>
      <button (click)="fetchData()" style="padding: 5px 10px;">Refresh List</button>
    </div>
    
    <p style="color: red; margin: 0;">{{ statusMsg }}</p>

    <!-- List -->
    @if (filteredRestrooms.length === 0 && !statusMsg) {
      <p style="color: #666; font-style: italic;">No restrooms found matching your filters.</p>
    }

    @for (r of filteredRestrooms; track r._id) {
      <div style="border:1px solid #e0e0e0; margin-bottom:12px; padding:15px; border-radius: 8px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; gap: 15px; align-items: flex-start;">
          
          @if (r.images && r.images.length > 0) {
            <img [src]="r.images[0]" alt="Restroom Cover" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />
          }
          
          <div style="flex: 1; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong style="font-size: 1.1em;">{{ r.name }}</strong>
              @if (r.averageRating != null) {
                <span style="color: #f39c12; font-weight: bold; margin-left: 8px; font-size: 1.1em;">★ {{ r.averageRating | number:'1.1-1' }}</span>
              } @else {
                <span style="color: #999; font-size: 0.9em; margin-left: 8px;">(No ratings)</span>
              }
              <br>
              <span style="color: #666; display: inline-block; margin-top: 5px;">{{ r.description || 'No description' }}</span><br>
              <small style="display: inline-block; margin-top: 5px; color: #555;"><b>Amenities:</b> {{ r.amenities?.join(', ') || 'None' }}</small>
            </div>
            <div>
              <a [routerLink]="['/restrooms', r._id]" style="text-decoration: none; color: #fff; background: #0066cc; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 0.9em; display: inline-block;">View Details →</a>
            </div>
          </div>

        </div>
      </div>
    }
  `
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private locationService = inject(LocationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  private leaflet: any;
  private map!: L.Map;
  private userMarker?: L.Marker;
  private radiusCircle?: L.Circle;
  private markersMap: Map<string, L.Marker> = new Map();

  restrooms: Restroom[] = [];
  filteredRestrooms: Restroom[] = [];
  savedRestroomIds = new Set<string>();
  statusMsg = '';

  locationEnabled = false;
  hasAutoCentered = false;
  userPos: {lat: number; lng: number} | null = null;
  radius = 5000; // 5km default
  isFullscreen = false;
  
  // Advanced Filters
  minRating: number | null = null;
  amenityOptions = AMENITIES;
  selectedAmenities: string[] = [];
  showOpenOnly = false;

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      setTimeout(() => {
        if (document.getElementById('home-map') && !this.map) {
          this.initMap();
        }
      }, 50);
    }
  }

  ngOnInit() {
    setTimeout(() => this.fetchData(), 0);

    this.locationService.locationEnabled$.pipe(takeUntil(this.destroy$)).subscribe(enabled => {
      this.locationEnabled = enabled;
      // Auto-recenter exactly once when freshly enabled
      if (enabled && this.userPos) {
        this.recenterMap();
        this.hasAutoCentered = true;
      } else if (!enabled) {
        this.hasAutoCentered = false;
      }
      this.cdr.markForCheck();
    });

    this.locationService.userPos$.pipe(takeUntil(this.destroy$)).subscribe(pos => {
      this.userPos = pos;
      this.updateUserMarkerAndRadius();
      this.filterRestrooms();
      
      if (this.locationEnabled && !this.hasAutoCentered) {
        this.recenterMap();
        this.hasAutoCentered = true;
      }
      
      this.cdr.markForCheck();
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url === '/' || this.router.url === '/home') {
          // Re-fetch when navigating to this page
          this.fetchData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleLocation(event: Event) {
    const target = event.target as HTMLInputElement;
    this.locationService.toggleLocation(target.checked);
  }

  toggleAmenity(a: string) {
    this.selectedAmenities = this.selectedAmenities.includes(a)
      ? this.selectedAmenities.filter(x => x !== a)
      : [...this.selectedAmenities, a];
    this.onFilterChange();
  }

  clearRating() {
    this.minRating = null;
    this.onFilterChange();
  }

  clearAmenities() {
    this.selectedAmenities = [];
    this.onFilterChange();
  }

  onFilterChange() {
    this.updateUserMarkerAndRadius();
    this.filterRestrooms();
  }

  recenterMap() {
    if (!this.map || !this.leaflet) return;
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    this.map.setView(center, 14, { animate: true });
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const mapElement = document.getElementById('home-map');
    if (mapElement) {
      if (this.isFullscreen) {
        mapElement.classList.add('fullscreen-map');
      } else {
        mapElement.classList.remove('fullscreen-map');
      }
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 300);
    }
  }

  private initMap(): void {
    const L = this.leaflet;
    this.map = L.map('home-map').setView(this.locationService.HAU_COORDS, 14);
    
    // Standard OpenStreetMap with high detail for buildings/texts, but filtered for modern aesthetics
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    this.updateUserMarkerAndRadius();
    this.updateRestroomMarkers();
  }

  // Haversine formula to find distance between two lat/lng in meters
  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  isRestroomOpenNow(r: Restroom): boolean {
    if (!r.operatingHours) return true; // default assume open
    
    const { is24Hours, openTime, closeTime } = r.operatingHours;
    if (is24Hours) return true;
    if (!openTime || !closeTime) return true;

    const now = new Date();
    const phTimeStr = now.toLocaleString("en-US", {timeZone: "Asia/Manila"});
    const phTime = new Date(phTimeStr);
    
    const currentHour = phTime.getHours();
    const currentMinute = phTime.getMinutes();
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const currentTotalMins = currentHour * 60 + currentMinute;
    const openTotalMins = openH * 60 + openM;
    const closeTotalMins = closeH * 60 + closeM;
    
    if (closeTotalMins < openTotalMins) {
      // Crosses midnight, e.g. open 22:00, close 02:00
      return currentTotalMins >= openTotalMins || currentTotalMins <= closeTotalMins;
    } else {
      // Normal day, e.g. open 08:00, close 22:00
      return currentTotalMins >= openTotalMins && currentTotalMins <= closeTotalMins;
    }
  }

  private filterRestrooms() {
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    
    this.filteredRestrooms = this.restrooms.filter(r => {
      // 1. Radius Filter
      if (!r.location || !r.location.latitude || !r.location.longitude) return false;
      const d = this.getDistance(center.lat, center.lng, r.location.latitude, r.location.longitude);
      if (d > this.radius) return false;

      // 2. Rating Filter
      if (this.minRating !== null && this.minRating > 0) {
        if (r.averageRating == null || r.averageRating < this.minRating) return false;
      }

      // 3. Amenities Filter
      if (this.selectedAmenities.length > 0) {
        if (!r.amenities) return false;
        const hasAllAmenities = this.selectedAmenities.every(a => r.amenities!.includes(a));
        if (!hasAllAmenities) return false;
      }

      // 4. Open Now Filter
      if (this.showOpenOnly) {
        if (!this.isRestroomOpenNow(r)) return false;
      }

      return true;
    });

    // 5. Sort nearest to farthest
    this.filteredRestrooms.sort((a, b) => {
      const distA = this.getDistance(center.lat, center.lng, a.location!.latitude, a.location!.longitude);
      const distB = this.getDistance(center.lat, center.lng, b.location!.latitude, b.location!.longitude);
      return distA - distB;
    });

    this.updateRestroomMarkers();
  }

  fetchData() {
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    
    const userId = this.auth.getUserId();
    if (userId) {
      this.api.getSavedRestrooms(userId).subscribe({
        next: (saved: any[]) => {
          this.savedRestroomIds.clear();
          if (Array.isArray(saved)) {
            saved.forEach(s => this.savedRestroomIds.add(s._id || s));
          }
          this.fetchRestroomsList();
        },
        error: (err) => {
          console.error('[Home] Failed to load saved restrooms', err);
          this.fetchRestroomsList();
        }
      });
    } else {
      this.savedRestroomIds.clear();
      this.fetchRestroomsList();
    }
  }

  private fetchRestroomsList() {
    this.api.getAllRestrooms().subscribe({
      next: (res) => {
        this.restrooms = res;
        this.statusMsg = '';
        this.filterRestrooms();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[Home] Error:', err);
        this.statusMsg = `❌ ${err.error?.message || 'Failed to load restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  private updateRestroomMarkers() {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;

    // Remove existing markers
    this.markersMap.forEach(m => this.map.removeLayer(m));
    this.markersMap.clear();

    // Add new ones
    this.filteredRestrooms.forEach(r => {
      if (r.location && r.location.latitude && r.location.longitude) {
        
        const isSaved = this.savedRestroomIds.has(r._id!);
        const isOpen = this.isRestroomOpenNow(r);
        
        let bgColor = isSaved ? '#28a745' : '#003366';
        let opacity = 1;
        
        if (!isOpen) {
          bgColor = '#e74c3c'; // red
          opacity = 0.6; // low opacity
        }

        const customPinIcon = L.divIcon({
          className: 'custom-restroom-pin',
          html: `<div style="background-color: ${bgColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); opacity: ${opacity}; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px; font-weight: bold;">R</span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14]
        });

        const statusLabel = isOpen ? `<span style="color: #28a745; font-weight: bold;">🟢 Open Now</span>` : `<span style="color: #e74c3c; font-weight: bold;">🔴 Closed</span>`;

        const marker = L.marker([r.location.latitude, r.location.longitude], { icon: customPinIcon })
          .addTo(this.map)
          .bindPopup(`
            <div style="font-size:1.1em; font-weight:bold;">${r.name}</div>
            <div style="margin-bottom: 5px;">${statusLabel}</div>
            <div style="color: #f39c12; margin-bottom: 5px;">★ ${r.averageRating ? r.averageRating.toFixed(1) : 'No ratings'}</div>
            <div style="margin-bottom: 5px;">${r.description || 'No description'}</div>
            <div style="font-size: 0.85em; color: #555; margin-bottom: 8px;"><b>Amenities:</b> ${r.amenities?.join(', ') || 'None'}</div>
            <div><a href="/restrooms/${r._id}">View Details</a></div>
          `);
        
        // Open popup on hover
        marker.on('mouseover', (e: any) => {
          e.target.openPopup();
        });

        this.markersMap.set(r._id!, marker);
      }
    });
  }

  private updateUserMarkerAndRadius() {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    const popupText = this.userPos && this.locationEnabled ? 'You are here' : 'Default Location: Holy Angel University';

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="background-color: #4285F4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(center).bindPopup(popupText);
    } else {
      this.userMarker = L.marker(center, { icon: userIcon }).addTo(this.map).bindPopup(popupText);
    }

    if (this.radiusCircle) {
      this.radiusCircle.setLatLng(center);
      this.radiusCircle.setRadius(this.radius);
    } else {
      this.radiusCircle = L.circle(center, {
        color: '#4285F4',
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        radius: this.radius
      }).addTo(this.map);
    }
  }
}
