import { Component, inject, PLATFORM_ID, ChangeDetectorRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type * as L from 'leaflet';

const AMENITIES = ['Bidet', 'Soap', 'PWD Friendly', 'Clean', 'Lock', 'Tissue'];

@Component({
  selector: 'app-edit-restroom',
  standalone: true,
  imports: [FormsModule, CommonModule],
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
    .leaflet-container {
      cursor: crosshair !important;
    }
  `],
  template: `
    <h2>Edit Restroom</h2>
    @if (!auth.isLoggedIn()) {
      <p>⚠️ You must be logged in to edit a restroom.</p>
    } @else {
      <label>Name: <input [(ngModel)]="name" placeholder="Restroom name" /></label><br>
      <label>Description: <input [(ngModel)]="description" placeholder="Description" /></label><br>
      <label>Address (Optional): <input [(ngModel)]="address" placeholder="e.g. 1st Floor, Building A" style="width: 100%; box-sizing: border-box; padding: 8px; margin-top: 4px;" /></label><br>
      
      <div style="margin-top: 15px; margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; background: #f9f9f9;">
        <label style="display: block; font-weight: bold; margin-bottom: 5px;">Update Restroom Photos (Max 3):</label>
        
        <input type="file" accept="image/*" multiple (change)="onFilesSelected($event)" [disabled]="images.length >= 3" />
        <p style="font-size: 0.85em; color: #666; margin: 5px 0 0 0;">{{ images.length }} / 3 photos uploaded</p>
        
        @if (images.length > 0) {
          <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
            @for (img of images; track $index) {
              <div style="position: relative;">
                <img [src]="img" alt="Preview" style="height: 100px; width: 100px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc;" />
                <button (click)="removeImage($index)" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">x</button>
              </div>
            }
          </div>
        }
      </div>

      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; margin-top: 20px;">
        <p style="margin: 0;">📍 Click on the map to re-pin the restroom location:</p>
        <button (click)="recenterMap()" style="padding: 4px 8px; font-size: 0.9em; background: #e0e0e0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
          📍 Recenter Map
        </button>
        <button (click)="toggleFullscreen()" style="padding: 4px 8px; font-size: 0.9em; background: #e0e0e0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
          ⛶ Fullscreen
        </button>
      </div>

      <div id="edit-map" style="height: 300px; width: 100%; border: 1px solid #ccc; margin-bottom: 1rem; border-radius: 8px; transition: all 0.3s ease;"></div>
      
      @if (isFullscreen) {
        <div style="position: fixed; top: 20px; right: 20px; z-index: 10000;">
          <button (click)="toggleFullscreen()" style="padding: 10px 16px; font-size: 1.1em; background: #fff; border: 2px solid rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-weight: bold;">
            ⛶ Exit Fullscreen
          </button>
        </div>
      }
      
      <label>Latitude: <input [(ngModel)]="latitude" type="number" readonly /></label><br>
      <label>Longitude: <input [(ngModel)]="longitude" type="number" readonly /></label><br>

      <fieldset>
        <legend>Amenities</legend>
        @for (a of amenityOptions; track a) {
          <label>
            <input type="checkbox" [checked]="selectedAmenities.includes(a)"
              (change)="toggleAmenity(a)" /> {{ a }}
          </label><br>
        }
      </fieldset>

      <fieldset style="margin-top: 15px; border: 1px solid #ccc; border-radius: 8px; padding: 10px; background: #fdfdfd;">
        <legend style="font-weight: bold;">Operating Hours</legend>
        <label style="cursor: pointer; display: block; margin-bottom: 10px;">
          <input type="checkbox" [(ngModel)]="is24Hours" /> Open 24 Hours
        </label>
        
        @if (!is24Hours) {
          <div style="display: flex; gap: 15px;">
            <label>Open Time:<br> <input type="time" [(ngModel)]="openTime" style="padding: 4px;" /></label>
            <label>Close Time:<br> <input type="time" [(ngModel)]="closeTime" style="padding: 4px;" /></label>
          </div>
        }
      </fieldset>

      <button (click)="submit()" style="margin-top: 15px; background: #4285f4; color: white;">Save Changes</button>
      <p>{{ statusMsg }}</p>
    }
  `
})
export class EditRestroomComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private locationService = inject(LocationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  restroomId!: string;
  name = ''; description = ''; address = '';
  latitude: number | null = null; longitude: number | null = null;
  amenityOptions = AMENITIES;
  selectedAmenities: string[] = [];
  statusMsg = '';

  is24Hours = false;
  openTime = '';
  closeTime = '';

  images: string[] = [];

  private map!: L.Map;
  private marker?: L.Marker; // the pinned restroom location
  private leaflet: any;

  locationEnabled = false;
  private userMarker?: L.Marker; // the user's location indicator (blue dot)
  private userPos: { lat: number; lng: number } | null = null;

  isFullscreen = false;

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      setTimeout(() => {
        if (document.getElementById('edit-map') && !this.map) {
          this.initMap();
        }
      }, 100);
    }
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.restroomId = id;
        this.fetchRestroom(id);
      }
    });

    this.locationService.locationEnabled$.pipe(takeUntil(this.destroy$)).subscribe(enabled => {
      this.locationEnabled = enabled;
      this.updateUserMarker();
      this.cdr.markForCheck();
    });

    this.locationService.userPos$.pipe(takeUntil(this.destroy$)).subscribe(pos => {
      this.userPos = pos;
      this.updateUserMarker();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchRestroom(id: string) {
    this.api.getRestroom(id).subscribe({
      next: (r) => {
        this.name = r.name;
        this.description = r.description || '';
        this.address = r.location?.address || '';
        this.latitude = r.location?.latitude || null;
        this.longitude = r.location?.longitude || null;
        this.selectedAmenities = r.amenities || [];
        this.images = r.images || [];
        this.is24Hours = r.operatingHours?.is24Hours || false;
        this.openTime = r.operatingHours?.openTime || '';
        this.closeTime = r.operatingHours?.closeTime || '';
        
        if (this.map && this.latitude && this.longitude) {
          const latlng = this.leaflet.latLng(this.latitude, this.longitude);
          if (this.marker) {
            this.marker.setLatLng(latlng);
          } else {
            const customPinIcon = this.getCustomPinIcon();
            this.marker = this.leaflet.marker(latlng, { icon: customPinIcon }).addTo(this.map);
          }
          this.recenterMap();
        }
        this.cdr.markForCheck();
      },
      error: (e) => this.statusMsg = '❌ Failed to load restroom details.'
    });
  }

  onFilesSelected(event: any) {
    const files = event.target.files;
    if (!files) return;

    const remaining = 3 - this.images.length;
    const filesToProcess = Array.from(files).slice(0, remaining) as File[];

    for (const file of filesToProcess) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.images.push(e.target.result);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
    
    // reset input
    event.target.value = '';
  }

  removeImage(index: number) {
    this.images.splice(index, 1);
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const mapElement = document.getElementById('edit-map');
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

  recenterMap() {
    if (!this.map || !this.leaflet) return;
    if (this.latitude && this.longitude) {
      this.map.setView([this.latitude, this.longitude], 16, { animate: true });
    } else if (this.locationEnabled && this.userPos) {
      this.map.setView([this.userPos.lat, this.userPos.lng], 16, { animate: true });
    } else {
      this.map.setView(this.locationService.HAU_COORDS, 16, { animate: true });
    }
  }

  private getCustomPinIcon() {
    return this.leaflet.divIcon({
      className: 'custom-restroom-pin',
      html: `<div style="background-color: #003366; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px; font-weight: bold;">R</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
  }

  private initMap(): void {
    const L = this.leaflet;
    this.map = L.map('edit-map').setView(this.locationService.HAU_COORDS, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    const customPinIcon = this.getCustomPinIcon();
    L.Marker.prototype.options.icon = customPinIcon;

    this.updateUserMarker();

    if (this.latitude && this.longitude) {
      const latlng = L.latLng(this.latitude, this.longitude);
      this.marker = L.marker(latlng, { icon: customPinIcon }).addTo(this.map);
      this.recenterMap();
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.latitude = e.latlng.lat;
      this.longitude = e.latlng.lng;

      if (this.marker) {
        this.marker.setLatLng(e.latlng);
      } else {
        this.marker = L.marker(e.latlng, { icon: customPinIcon }).addTo(this.map);
      }
      this.cdr.markForCheck();
    });
  }

  private updateUserMarker(): void {
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
  }

  toggleAmenity(a: string) {
    this.selectedAmenities = this.selectedAmenities.includes(a)
      ? this.selectedAmenities.filter(x => x !== a)
      : [...this.selectedAmenities, a];
  }

  submit() {
    if (!this.latitude || !this.longitude) {
      this.statusMsg = '❌ Please select a location on the map.';
      return;
    }

    const payload: any = {
      name: this.name,
      description: this.description,
      location: { latitude: this.latitude, longitude: this.longitude, address: this.address },
      amenities: this.selectedAmenities,
      operatingHours: {
        is24Hours: this.is24Hours,
        openTime: this.openTime,
        closeTime: this.closeTime
      }
    };

    if (this.images.length > 0) {
      payload.images = this.images;
    }

    this.api.updateRestroom(this.restroomId, payload).subscribe({
      next: (r) => {
        this.statusMsg = `✅ Restroom "${r.name}" updated!`;
        setTimeout(() => this.router.navigate(['/restrooms', this.restroomId]), 1000);
      },
      error: (e) => {
        this.statusMsg = `❌ ${e.error?.message || 'Failed to update restroom'}`;
      }
    });
  }
}
