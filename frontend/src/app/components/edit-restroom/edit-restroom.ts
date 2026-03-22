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
import { LucideAngularModule, AlertTriangle, ImagePlus, X, LocateFixed, Maximize, Minimize, Edit3, MapPin, CheckCircle, XCircle } from 'lucide-angular';

const AMENITIES = ['Bidet', 'Soap', 'PWD Friendly', 'Clean', 'Lock', 'Tissue'];

@Component({
  selector: 'app-edit-restroom',
  standalone: true,
  imports: [FormsModule, CommonModule, LucideAngularModule],
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
      filter: saturate(0.8) brightness(1.02) contrast(1.05) hue-rotate(-10deg);
    }
    .leaflet-container {
      cursor: crosshair !important;
    }
  `],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center p-4 bg-brand-main text-white rounded-2xl shadow-soft mb-6 transform hover:scale-105 transition-transform">
            <lucide-angular [img]="Edit3Icon" [size]="40" [strokeWidth]="2.5"></lucide-angular>
          </div>
          <h2 class="text-4xl md:text-5xl font-extrabold text-brand-dark tracking-tight leading-tight">Edit Restroom</h2>
          <p class="text-base font-medium text-slate-500 mt-3 max-w-xl mx-auto">Update details to keep the community informed and the map accurate.</p>
        </div>

        <div class="bg-white rounded-[2.5rem] shadow-premium border border-white p-6 sm:p-10 relative overflow-hidden z-10">
          
          <div class="absolute -right-10 -bottom-10 text-brand-50 opacity-50 pointer-events-none transform -rotate-12 z-0">
            <lucide-angular [img]="MapPinIcon" [size]="300"></lucide-angular>
          </div>

          @if (!auth.isLoggedIn()) {
            <div class="bg-amber-50 border-2 border-amber-200 p-8 rounded-[2rem] text-center relative z-10 flex flex-col items-center">
              <div class="bg-white p-3 rounded-full shadow-sm text-amber-500 mb-4">
                <lucide-angular [img]="AlertTriangleIcon" [size]="32"></lucide-angular>
              </div>
              <p class="text-amber-800 font-bold text-lg">You must be logged in to edit a restroom.</p>
              <button (click)="goToAuth()" class="mt-6 bg-amber-500 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:bg-amber-600 transition-colors hover:-translate-y-0.5">Go to Sign In</button>
            </div>
          } @else {
            <div class="space-y-10 relative z-10">
              
              <!-- Basic Info -->
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Name</label>
                  <input [(ngModel)]="name" placeholder="E.g. Ground Floor Restroom" class="w-full rounded-xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-brand-main focus:bg-white focus:ring-4 focus:ring-brand-100 p-3.5 text-base font-medium text-slate-800 transition-all placeholder-slate-400" />
                </div>
                <div>
                  <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Description</label>
                  <input [(ngModel)]="description" placeholder="A brief description of the location" class="w-full rounded-xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-brand-main focus:bg-white focus:ring-4 focus:ring-brand-100 p-3.5 text-base font-medium text-slate-800 transition-all placeholder-slate-400" />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Address <span class="text-slate-400 font-normal lowercase">(Optional)</span></label>
                  <input [(ngModel)]="address" placeholder="E.g. 1st Floor, Building A, Main Campus" class="w-full rounded-xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-brand-main focus:bg-white focus:ring-4 focus:ring-brand-100 p-3.5 text-base font-medium text-slate-800 transition-all placeholder-slate-400" />
                </div>
              </div>
              
              <hr class="border-slate-100">
              
              <!-- Photo Upload -->
              <div>
                <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-4">Photos <span class="text-slate-400 font-normal lowercase">(Max 3)</span></label>
                
                <div class="bg-brand-50 border-2 border-brand-100 border-dashed rounded-[2rem] p-8 text-center transition-all hover:bg-brand-100/50">
                  <label class="cursor-pointer inline-flex flex-col items-center gap-3">
                    <div class="bg-white p-4 rounded-full shadow-sm text-brand-main group-hover:scale-110 transition-transform">
                      <lucide-angular [img]="ImagePlusIcon" [size]="32"></lucide-angular>
                    </div>
                    <span class="text-lg font-bold text-center text-brand-dark block mt-2">Click to Update Photos</span>
                    <span class="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-lg shadow-sm">{{ images.length }} / 3 uploaded</span>
                    <input type="file" accept="image/*" multiple (change)="onFilesSelected($event)" [disabled]="images.length >= 3" class="sr-only" />
                  </label>
                  
                  @if (images.length > 0) {
                    <div class="flex gap-4 mt-8 flex-wrap justify-center">
                      @for (img of images; track $index) {
                        <div class="relative group animate-fade-in-up">
                          <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-soft border-4 border-white">
                            <img [src]="img" alt="Preview" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          </div>
                          <button (click)="removeImage($index)" class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-premium hover:bg-red-600 transition-transform hover:-translate-y-0.5 z-10">
                            <lucide-angular [img]="XIcon" [size]="16" [strokeWidth]="3"></lucide-angular>
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
    
              <hr class="border-slate-100">
    
              <!-- Map Pinning -->
              <div>
                <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                  <label class="block text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <lucide-angular [img]="MapPinIcon" [size]="18" class="text-brand-main"></lucide-angular> Re-pin Location on Map
                  </label>
                  <div class="flex gap-2">
                    <button (click)="recenterMap()" class="flex items-center gap-2 px-4 py-2 text-xs font-black bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                      <lucide-angular [img]="LocateFixedIcon" [size]="14"></lucide-angular> Recenter Map
                    </button>
                    <button (click)="toggleFullscreen()" class="flex items-center gap-2 px-4 py-2 text-xs font-black bg-slate-800 border border-slate-800 text-white rounded-xl hover:bg-black transition-colors shadow-sm">
                      <lucide-angular [img]="MaximizeIcon" [size]="14"></lucide-angular> Fullscreen
                    </button>
                  </div>
                </div>
    
                <div class="p-2 bg-white rounded-[2rem] shadow-premium border-2 border-slate-100">
                  <div id="edit-map" class="h-[350px] w-full rounded-[1.5rem] z-0 relative transition-all duration-300 bg-slate-100"></div>
                </div>
                
                @if (isFullscreen) {
                  <div class="fixed top-6 right-6 z-[10000]">
                    <button (click)="toggleFullscreen()" class="flex items-center gap-2 px-6 py-3 text-base font-black bg-white text-brand-dark rounded-2xl shadow-premium border-2 border-slate-200 hover:bg-slate-50 transition-all animate-fade-in-up">
                      <lucide-angular [img]="MinimizeIcon" [size]="20"></lucide-angular> Exit Fullscreen
                    </button>
                  </div>
                }
                
                <div class="flex gap-4 mt-4">
                  <div class="flex-1 bg-slate-50 p-3 rounded-xl border-slate-100 border">
                    <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Latitude</span>
                    <input [(ngModel)]="latitude" type="number" readonly class="w-full bg-transparent border-none p-0 text-slate-700 font-bold focus:ring-0" />
                  </div>
                  <div class="flex-1 bg-slate-50 p-3 rounded-xl border-slate-100 border">
                    <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Longitude</span>
                    <input [(ngModel)]="longitude" type="number" readonly class="w-full bg-transparent border-none p-0 text-slate-700 font-bold focus:ring-0" />
                  </div>
                </div>
              </div>
    
              <hr class="border-slate-100">
    
              <!-- Amenities & Operations -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div>
                  <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-4">Amenities</label>
                  <div class="grid grid-cols-2 gap-3">
                    @for (a of amenityOptions; track a) {
                      <label class="cursor-pointer flex items-center bg-slate-50 border-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm focus-within:ring-2 focus-within:ring-brand-main" [ngClass]="selectedAmenities.includes(a) ? 'border-brand-main text-brand-700 bg-brand-50' : 'border-slate-100 text-slate-600 hover:border-brand-200 hover:bg-white'">
                        <input type="checkbox" [checked]="selectedAmenities.includes(a)" (change)="toggleAmenity(a)" class="hidden" />
                        <div class="w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors" [ngClass]="selectedAmenities.includes(a) ? 'border-brand-main bg-brand-main text-white' : 'border-slate-300 bg-white'">
                          <lucide-angular *ngIf="selectedAmenities.includes(a)" [img]="CheckCircleIcon" [size]="12" [strokeWidth]="4"></lucide-angular>
                        </div>
                        {{ a }}
                      </label>
                    }
                  </div>
                </div>
    
                <div>
                  <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-4">Operating Hours</label>
                  
                  <label class="cursor-pointer flex items-center bg-slate-50 border-2 px-5 py-4 rounded-xl text-base font-bold transition-all shadow-sm mb-4 focus-within:ring-2 focus-within:ring-brand-main" [ngClass]="is24Hours ? 'border-brand-main text-brand-700 bg-brand-50' : 'border-slate-100 text-slate-700 hover:border-brand-200 hover:bg-white'">
                    <input type="checkbox" [(ngModel)]="is24Hours" class="hidden" />
                    <div class="w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors" [ngClass]="is24Hours ? 'border-brand-main bg-brand-main text-white' : 'border-slate-300 bg-white'">
                      <lucide-angular *ngIf="is24Hours" [img]="CheckCircleIcon" [size]="14" [strokeWidth]="4"></lucide-angular>
                    </div>
                    Open 24 Hours
                  </label>
                  
                  @if (!is24Hours) {
                    <div class="flex gap-4 animate-fade-in">
                      <div class="flex-1 bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Open Time</span>
                        <input type="time" [(ngModel)]="openTime" class="w-full bg-slate-50 rounded-lg border-none p-2.5 font-bold text-slate-700 focus:ring-2 focus:ring-brand-main focus:bg-white transition-all cursor-pointer" />
                      </div>
                      <div class="flex-1 bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Close Time</span>
                        <input type="time" [(ngModel)]="closeTime" class="w-full bg-slate-50 rounded-lg border-none p-2.5 font-bold text-slate-700 focus:ring-2 focus:ring-brand-main focus:bg-white transition-all cursor-pointer" />
                      </div>
                    </div>
                  }
                </div>
              </div>
    
              <hr class="border-slate-100">
    
              <!-- Submit -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                @if (statusMsg) {
                  <div class="font-bold flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 w-full sm:w-auto text-sm" [ngClass]="statusMsg.includes('❌') ? 'text-red-500 border border-red-100' : 'text-green-600 border border-green-100'">
                    <lucide-angular [img]="statusMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="18"></lucide-angular>
                    {{ statusMsg }}
                  </div>
                } @else {
                  <div></div>
                }
                <button (click)="submit()" class="w-full sm:w-auto px-10 py-4 rounded-xl text-lg font-black bg-brand-main text-white shadow-premium hover:bg-brand-600 hover:-translate-y-1 transition-all flex justify-center items-center gap-2">
                  <lucide-angular [img]="CheckCircleIcon" [size]="20"></lucide-angular> Save Changes
                </button>
              </div>
              
            </div>
          }
        </div>
      </div>
    </div>
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

  AlertTriangleIcon = AlertTriangle;
  ImagePlusIcon = ImagePlus;
  XIcon = X;
  LocateFixedIcon = LocateFixed;
  MaximizeIcon = Maximize;
  MinimizeIcon = Minimize;
  Edit3Icon = Edit3;
  MapPinIcon = MapPin;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;

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
  private marker?: L.Marker;
  private leaflet: any;

  locationEnabled = false;
  private userMarker?: L.Marker;
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

  goToAuth() {
    this.router.navigate(['/auth']);
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
      html: `<div style="background-color: #2563EB; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;"><div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  }

  private initMap(): void {
    const L = this.leaflet;
    this.map = L.map('edit-map', { zoomControl: false }).setView(this.locationService.HAU_COORDS, 16);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
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
      this.latitude = Number(e.latlng.lat.toFixed(6));
      this.longitude = Number(e.latlng.lng.toFixed(6));

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
      html: `<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(16, 185, 129, 0.6); animation: pulse 2s infinite;"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
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
        this.statusMsg = `Update saved successfully!`;
        setTimeout(() => this.router.navigate(['/restrooms', this.restroomId]), 1000);
      },
      error: (e) => {
        this.statusMsg = `❌ ${e.error?.message || 'Failed to update restroom'}`;
      }
    });
  }
}
