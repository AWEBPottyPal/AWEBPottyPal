import { Component, inject, PLATFORM_ID, ChangeDetectorRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type * as L from 'leaflet';
import { LucideAngularModule, AlertTriangle, ImagePlus, X, LocateFixed, Maximize, Minimize, PlusCircle, MapPin, CheckCircle, XCircle } from 'lucide-angular';

const AMENITIES = ['Bidet', 'Soap', 'Accessibility', 'Child Friendly'];

@Component({
  selector: 'app-add-restroom',
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
      <div class="app-page">
        <div class="bg-white rounded-[1.75rem] shadow-soft border border-white p-5 sm:p-7 relative overflow-hidden z-10">
          <div class="absolute -right-8 -top-8 text-brand-50 opacity-60 pointer-events-none transform rotate-12 z-0">
            <lucide-angular [img]="MapPinIcon" [size]="180"></lucide-angular>
          </div>

          <div class="space-y-8 relative z-10">
              <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_320px] gap-5 items-start">
                <div class="bg-brand-50 border border-brand-100 rounded-[1.5rem] p-5 sm:p-6">
                  <div class="flex items-start gap-4">
                    <div class="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-main text-white shadow-sm">
                      <lucide-angular [img]="PlusCircleIcon" [size]="24" [strokeWidth]="2.5"></lucide-angular>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-black uppercase tracking-[0.24em] text-brand-main/80 mb-2">Community Contribution</p>
                      <h2 class="text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight leading-tight">Add a new restroom to PottyPal</h2>
                      <p class="text-sm sm:text-base font-medium text-slate-500 mt-3 max-w-2xl">Share the details, pin the exact location, upload photos, and include amenities so the community can find reliable, verified restrooms faster.</p>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Photos</p>
                    <p class="mt-2 text-2xl font-extrabold text-brand-dark">{{ images.length }}</p>
                    <p class="text-xs font-medium text-slate-500">of 3 uploaded</p>
                  </div>
                  <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Amenities</p>
                    <p class="mt-2 text-2xl font-extrabold text-brand-dark">{{ selectedAmenities.length }}</p>
                    <p class="text-xs font-medium text-slate-500">selected</p>
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div class="flex items-center gap-2 mb-5">
                  <div class="h-9 w-9 rounded-xl bg-brand-50 text-brand-main flex items-center justify-center">
                    <lucide-angular [img]="MapPinIcon" [size]="18"></lucide-angular>
                  </div>
                  <div>
                    <h3 class="text-lg font-black text-brand-dark">Basic Information</h3>
                    <p class="text-sm text-slate-500">Add the name, short description, and optional address details.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Name</label>
                    <input [(ngModel)]="name" placeholder="E.g. Ground Floor Restroom" class="w-full rounded-xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-brand-main focus:bg-white focus:ring-4 focus:ring-brand-100 p-3.5 text-base font-medium text-slate-800 transition-all placeholder-slate-400" />
                  </div>
                  <div>
                    <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Description</label>
                    <input [(ngModel)]="description" placeholder="A brief description of the location" class="w-full rounded-xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-brand-main focus:bg-white focus:ring-4 focus:ring-brand-100 p-3.5 text-base font-medium text-slate-800 transition-all placeholder-slate-400" />
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-black text-slate-600 uppercase tracking-widest mb-2">Address <span class="text-slate-400 font-normal lowercase">(Optional)</span></label>
                    <input [(ngModel)]="address" placeholder="E.g. 1st Floor, Building A, Main Campus" class="w-full rounded-xl bg-slate-50 border-2 border-slate-100 shadow-inner focus:border-brand-main focus:bg-white focus:ring-4 focus:ring-brand-100 p-3.5 text-base font-medium text-slate-800 transition-all placeholder-slate-400" />
                  </div>
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div class="flex items-center gap-2 mb-5">
                  <div class="h-9 w-9 rounded-xl bg-brand-50 text-brand-main flex items-center justify-center">
                    <lucide-angular [img]="ImagePlusIcon" [size]="18"></lucide-angular>
                  </div>
                  <div>
                    <h3 class="text-lg font-black text-brand-dark">Photos</h3>
                    <p class="text-sm text-slate-500">Upload up to 3 images to help people recognize the restroom.</p>
                  </div>
                </div>

                <div class="bg-brand-50 border-2 border-brand-100 border-dashed rounded-[2rem] p-8 text-center transition-all hover:bg-brand-100/50">
                  <label class="cursor-pointer inline-flex flex-col items-center gap-3">
                    <div class="bg-white p-4 rounded-full shadow-sm text-brand-main group-hover:scale-110 transition-transform">
                      <lucide-angular [img]="ImagePlusIcon" [size]="32"></lucide-angular>
                    </div>
                    <span class="text-lg font-bold text-center text-brand-dark block mt-2">Click to Upload Photos</span>
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

              <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div class="flex flex-col xl:flex-row gap-6 xl:items-start">
                  <div class="xl:w-[300px] shrink-0">
                    <div class="flex items-center gap-2 mb-3">
                      <div class="h-9 w-9 rounded-xl bg-brand-50 text-brand-main flex items-center justify-center">
                        <lucide-angular [img]="MapPinIcon" [size]="18"></lucide-angular>
                      </div>
                      <div>
                        <h3 class="text-lg font-black text-brand-dark">Pin Location</h3>
                        <p class="text-sm text-slate-500">Click on the map to place the restroom accurately.</p>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <button (click)="recenterMap()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        <lucide-angular [img]="LocateFixedIcon" [size]="14"></lucide-angular> Recenter Map
                      </button>
                      <button (click)="toggleFullscreen()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black bg-slate-800 border border-slate-800 text-white rounded-xl hover:bg-black transition-colors shadow-sm">
                        <lucide-angular [img]="MaximizeIcon" [size]="14"></lucide-angular> Fullscreen
                      </button>
                    </div>

                    <div class="grid grid-cols-2 xl:grid-cols-1 gap-3 mt-4">
                      <div class="bg-slate-50 p-3 rounded-xl border-slate-100 border">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Latitude</span>
                        <input [(ngModel)]="latitude" type="number" readonly class="w-full bg-transparent border-none p-0 text-slate-700 font-bold focus:ring-0 text-sm" />
                      </div>
                      <div class="bg-slate-50 p-3 rounded-xl border-slate-100 border">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Longitude</span>
                        <input [(ngModel)]="longitude" type="number" readonly class="w-full bg-transparent border-none p-0 text-slate-700 font-bold focus:ring-0 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="p-2 bg-white rounded-[1.5rem] shadow-premium border-2 border-slate-100">
                      <div id="add-map" class="h-[360px] md:h-[420px] w-full rounded-[1.25rem] z-0 relative transition-all duration-300 bg-slate-100"></div>
                    </div>
                  </div>
                </div>

                @if (isFullscreen) {
                  <div class="fixed top-6 right-6 z-[10000]">
                    <button (click)="toggleFullscreen()" class="flex items-center gap-2 px-6 py-3 text-base font-black bg-white text-brand-dark rounded-2xl shadow-premium border-2 border-slate-200 hover:bg-slate-50 transition-all animate-fade-in-up">
                      <lucide-angular [img]="MinimizeIcon" [size]="20"></lucide-angular> Exit Fullscreen
                    </button>
                  </div>
                }
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                  <div class="mb-5">
                    <h3 class="text-lg font-black text-brand-dark">Amenities</h3>
                    <p class="text-sm text-slate-500">Choose the available restroom features.</p>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                  <div class="mb-5">
                    <h3 class="text-lg font-black text-brand-dark">Operating Hours</h3>
                    <p class="text-sm text-slate-500">Set whether the restroom is open 24 hours or define a schedule.</p>
                  </div>

                  <label class="cursor-pointer flex items-center bg-slate-50 border-2 px-5 py-4 rounded-xl text-base font-bold transition-all shadow-sm mb-4 focus-within:ring-2 focus-within:ring-brand-main" [ngClass]="is24Hours ? 'border-brand-main text-brand-700 bg-brand-50' : 'border-slate-100 text-slate-700 hover:border-brand-200 hover:bg-white'">
                    <input type="checkbox" [(ngModel)]="is24Hours" class="hidden" />
                    <div class="w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-colors" [ngClass]="is24Hours ? 'border-brand-main bg-brand-main text-white' : 'border-slate-300 bg-white'">
                      <lucide-angular *ngIf="is24Hours" [img]="CheckCircleIcon" [size]="14" [strokeWidth]="4"></lucide-angular>
                    </div>
                    Open 24 Hours
                  </label>

                  @if (!is24Hours) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <div class="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Open Time</span>
                        <input type="time" [(ngModel)]="openTime" class="w-full bg-slate-50 rounded-lg border-none p-2.5 font-bold text-slate-700 focus:ring-2 focus:ring-brand-main focus:bg-white transition-all cursor-pointer" />
                      </div>
                      <div class="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Close Time</span>
                        <input type="time" [(ngModel)]="closeTime" class="w-full bg-slate-50 rounded-lg border-none p-2.5 font-bold text-slate-700 focus:ring-2 focus:ring-brand-main focus:bg-white transition-all cursor-pointer" />
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                  <div>
                    <h3 class="text-lg font-black text-brand-dark">Ready to publish?</h3>
                    <p class="text-sm text-slate-500 mt-1">Review the details above, then add this restroom to the community map.</p>
                  </div>
                  <div class="flex w-full lg:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    @if (statusMsg) {
                      <div class="font-bold flex items-center gap-2 px-4 py-2 rounded-xl bg-white w-full sm:w-auto text-sm" [ngClass]="statusMsg.includes('❌') ? 'text-red-500 border border-red-100' : 'text-green-600 border border-green-100'">
                        <lucide-angular [img]="statusMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="18"></lucide-angular>
                        {{ statusMsg }}
                      </div>
                    }
                    <button (click)="submit()" [disabled]="isSubmitting" class="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-black shadow-premium transition-all flex justify-center items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0" [ngClass]="isSubmitting ? 'bg-brand-400 text-white' : 'bg-brand-main text-white hover:bg-brand-600 hover:-translate-y-1'">
                      @if (isSubmitting) {
                        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                        Adding...
                      } @else {
                        <lucide-angular [img]="CheckCircleIcon" [size]="18"></lucide-angular> Add Restroom
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  `
})
export class AddRestroomComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private locationService = inject(LocationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  AlertTriangleIcon = AlertTriangle;
  ImagePlusIcon = ImagePlus;
  XIcon = X;
  LocateFixedIcon = LocateFixed;
  MaximizeIcon = Maximize;
  MinimizeIcon = Minimize;
  PlusCircleIcon = PlusCircle;
  MapPinIcon = MapPin;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;

  name = '';
  description = '';
  address = '';
  latitude: number | null = null;
  longitude: number | null = null;
  amenityOptions = AMENITIES;
  selectedAmenities: string[] = [];
  statusMsg = '';
  isSubmitting = false;

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
        if (document.getElementById('add-map') && !this.map) {
          this.initMap();
        }
      }, 100);
    }
  }

  ngOnInit() {
    this.locationService.locationEnabled$.pipe(takeUntil(this.destroy$)).subscribe(enabled => {
      this.locationEnabled = enabled;
      this.updateUserMarker();
      if (enabled && this.userPos && !this.marker) {
        this.recenterMap();
      }
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
    const mapElement = document.getElementById('add-map');
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
    if (!this.map) return;
    if (this.locationEnabled && this.userPos) {
      this.map.setView([this.userPos.lat, this.userPos.lng], 16, { animate: true });
    } else {
      this.map.setView(this.locationService.HAU_COORDS, 16, { animate: true });
    }
  }

  private initMap(): void {
    const L = this.leaflet;
    this.map = L.map('add-map', { zoomControl: false }).setView(this.locationService.HAU_COORDS, 16);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    const customPinIcon = L.divIcon({
      className: 'custom-restroom-pin',
      html: '<div style="background-color: #2563EB; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;"><div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
    L.Marker.prototype.options.icon = customPinIcon;

    this.updateUserMarker();

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
      html: '<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(16, 185, 129, 0.6); animation: pulse 2s infinite;"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(center).bindPopup(popupText);
      if (!this.marker && this.locationEnabled && this.userPos) {
        this.recenterMap();
      }
    } else {
      this.userMarker = L.marker(center, { icon: userIcon }).addTo(this.map).bindPopup(popupText);
      if (!this.marker && this.locationEnabled && this.userPos) {
        this.recenterMap();
      }
    }
  }

  toggleAmenity(a: string) {
    this.selectedAmenities = this.selectedAmenities.includes(a)
      ? this.selectedAmenities.filter(x => x !== a)
      : [...this.selectedAmenities, a];
  }

  submit() {
    if (this.isSubmitting) return;

    if (!this.latitude || !this.longitude) {
      this.statusMsg = '❌ Please select a location on the map.';
      return;
    }

    this.isSubmitting = true;
    this.statusMsg = '';

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

    this.api.addRestroom(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.statusMsg = 'Addition successful!';
        setTimeout(() => this.router.navigate(['/']), 1000);
      },
      error: (e) => {
        this.isSubmitting = false;
        this.statusMsg = `❌ ${e.error?.message || 'Failed to add restroom'}`;
      }
    });
  }
}
