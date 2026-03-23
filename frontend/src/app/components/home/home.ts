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
import { LucideAngularModule, LocateFixed, Maximize, Minimize, X, RefreshCcw, Bath, Star, MapPin, Search, Filter, ArrowRight } from 'lucide-angular';

const AMENITIES = ['Bidet', 'Soap', 'Accessibility', 'Child Friendly'];

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, CommonModule, LucideAngularModule],
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
      filter: saturate(0.8) brightness(1.02) contrast(1.05) hue-rotate(-10deg);
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
  `],
  template: `
    <div class="bg-brand-50 w-full min-h-screen pb-10 pt-6 animate-fade-in font-sans">
      <div class="app-page flex flex-col h-[calc(100vh-4rem)] min-h-[800px]">
        
        <div class="mb-6 shrink-0 rounded-[2rem] border border-slate-100 bg-white/95 p-5 shadow-soft">
          <!-- Header & Top Controls -->
          <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-3xl font-black text-[#1E3A8A] tracking-tight">Potty Pal</h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">Find clean and accessible restrooms nearby.</p>
            </div>
            
            <div class="flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-white hover:shadow-md cursor-pointer">
                <input type="checkbox" [checked]="locationEnabled" (change)="toggleLocation($event)" class="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]">
                <span [class.text-[#2563EB]]="locationEnabled" [class.text-slate-600]="!locationEnabled">Live Location</span>
              </label>
              <button (click)="fetchData()" class="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-premium transition-all hover:bg-[#1D4ED8]" [title]="statusMsg">
                <lucide-angular [img]="RefreshCcwIcon" [size]="14" [ngClass]="{'animate-spin': statusMsg && statusMsg.includes('Loading')}"></lucide-angular> Refresh
              </button>
            </div>
          </div>

          <div class="my-5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
    
          <!-- Dynamic Filters Bar -->
          <div class="flex flex-wrap items-center gap-4 z-10 relative">
            
            <!-- Open Now -->
            <label class="flex items-center gap-2 cursor-pointer text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-all">
              <input type="checkbox" [(ngModel)]="showOpenOnly" (change)="onFilterChange()" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-emerald-300">
              OPEN NOW ONLY
            </label>
            
            <div class="w-px h-6 bg-slate-200 hidden sm:block"></div>
            
            <!-- Radius -->
            <div class="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <label class="text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Radius <span class="text-[#2563EB] ml-1">{{ radius / 1000 | number:'1.0-1' }}km</span></label>
              <input type="range" min="500" max="20000" step="500" [(ngModel)]="radius" (change)="onFilterChange()" class="w-24 sm:w-32 accent-[#2563EB] h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer">
            </div>
            
            <div class="w-px h-6 bg-slate-200 hidden sm:block"></div>
            
            <!-- Min Rating -->
            <div class="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <label class="text-xs font-black text-slate-500 uppercase tracking-widest">Min Rating</label>
              <div class="flex items-center bg-white border border-slate-200 rounded-md px-1 ml-1 overflow-hidden h-7 w-16">
                <lucide-angular [img]="StarIcon" [size]="12" class="text-amber-500 ml-1"></lucide-angular>
                <input type="number" min="0" max="5" step="0.5" [(ngModel)]="minRating" (ngModelChange)="onRatingChange($event)" class="w-full h-full border-none p-0 text-center text-xs font-bold text-slate-700 focus:ring-0 bg-transparent">
              </div>
              @if (minRating) {
                <button (click)="clearRating()" class="text-slate-400 hover:text-red-500"><lucide-angular [img]="XIcon" [size]="14"></lucide-angular></button>
              }
            </div>
            
            <!-- Amenities -->
            <div class="flex-1 min-w-[300px] flex items-center justify-end gap-2 ml-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <span class="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 shrink-0">Amenities:</span>
              @for (a of amenityOptions; track a) {
                <label class="cursor-pointer shrink-0">
                  <input type="checkbox" [checked]="selectedAmenities.includes(a)" (change)="toggleAmenity(a)" class="hidden">
                  <div class="text-xs font-bold px-3 py-1.5 border rounded-lg whitespace-nowrap transition-colors"
                       [ngClass]="selectedAmenities.includes(a) ? 'bg-[#EEF2FF] border-[#818CF8] text-[#4338CA]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'">
                    {{ a }}
                  </div>
                </label>
              }
            </div>
          </div>
        </div>
    
        <div class="mb-4 shrink-0 px-1">
          <h3 class="text-lg font-black text-[#1E3A8A] flex items-center gap-2">
            Restrooms in your area <span class="bg-[#2563EB] text-white px-2.5 py-0.5 rounded-full text-xs shadow-sm">{{ filteredRestrooms.length }}</span>
          </h3>
        </div>

        <!-- Main Content Area: List + Map -->
        <div class="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          <!-- Left Column: Available Restrooms List -->
          <div class="w-full lg:w-[420px] xl:w-[480px] bg-transparent flex flex-col h-full shrink-0">
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4 pb-4 h-full relative">
              
              @if (filteredRestrooms.length === 0 && !statusMsg) {
                <div class="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 p-6 text-center">
                  <lucide-angular [img]="MapPinIcon" [size]="40" class="mb-3 opacity-50 text-[#818CF8]"></lucide-angular>
                  <p class="font-bold text-sm text-slate-600 mb-1">No projects found nearby.</p>
                  <p class="text-xs">Adjust your radius or clear filters.</p>
                </div>
              }
              
              @for (r of filteredRestrooms; track r._id; let i = $index) {
                <div class="group flex flex-row bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-premium hover:border-[#818CF8]/30 hover:scale-[1.01] transition-all duration-300 relative animate-fade-in-up" [style.animation-delay]="(i * 40) + 'ms'">
                  
                  <!-- Left Side Image + CTA -->
                  <div class="m-2 sm:m-3 w-24 sm:w-[132px] shrink-0 flex flex-col gap-2">
                    <div class="relative h-24 sm:h-[132px] w-full rounded-xl sm:rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm">
                      @if (r.images && r.images.length > 0) {
                        <img [src]="r.images[0]" alt="Cover" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        <div class="absolute inset-0 bg-black/10 pointer-events-none"></div>
                      } @else {
                        <div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                          <span class="text-sm font-black tracking-widest text-[#2563EB] opacity-90 italic">Potty Pal</span>
                        </div>
                      }
                      
                      <!-- Open/Close Badge overlay -->
                      <div class="absolute top-2 left-2">
                        @if (isRestroomOpenNow(r)) {
                          <div class="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Open Now"></div>
                        } @else {
                          <div class="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm" title="Closed"></div>
                        }
                      </div>
                    </div>

                    <a [routerLink]="['/restrooms', r._id]" class="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-brand-main px-2 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md">
                      View Restroom
                      <lucide-angular [img]="ArrowRightIcon" [size]="12"></lucide-angular>
                    </a>
                  </div>
                  
                  <!-- Right Side Details -->
                  <div class="p-3 sm:p-4 flex flex-col flex-1 min-w-0 justify-center gap-2 sm:gap-3">
                    <div class="flex items-start justify-between gap-2">
                      <h4 class="min-w-0 flex-1 text-sm sm:text-lg font-black text-[#1E3A8A] leading-snug hover:text-[#2563EB] transition-colors line-clamp-2"><a [routerLink]="['/restrooms', r._id]">{{ r.name }}</a></h4>
                      @if (r.averageRating) {
                        <span class="bg-amber-50 text-amber-600 text-xs font-black px-2 py-1 rounded-lg flex items-center gap-1 shrink-0 shadow-sm self-start">
                           ★ {{ r.averageRating | number:'1.1-1' }}
                        </span>
                      }
                    </div>
                    
                    <div class="flex items-center gap-2 flex-wrap">
                      @if (isRestroomOpenNow(r)) {
                        <span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide text-emerald-700">Open</span>
                      } @else {
                        <span class="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide text-red-700">Closed</span>
                      }
                    
                      <p class="text-xs font-semibold text-slate-500 flex items-center gap-1 min-w-0 leading-relaxed flex-1">
                        <lucide-angular [img]="MapPinIcon" [size]="12" class="text-slate-400 shrink-0"></lucide-angular>
                        <span class="line-clamp-1 sm:line-clamp-2">Addr: {{r.location?.latitude | number:'1.2-2'}}, {{r.location?.longitude | number:'1.2-2'}}</span>
                      </p>
                    </div>
                    
                    <div class="min-h-[2rem] text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {{ r.description || 'No description provided.' }}
                    </div>
                    
                    <!-- Amenities Mini Tags -->
                    <div class="flex flex-wrap gap-1 mt-0.5">
                      @if (r.amenities && r.amenities.length) {
                        @for (am of r.amenities.slice(0,3); track am) {
                           <span class="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{{ am }}</span>
                        }
                        @if (r.amenities.length > 3) {
                          <span class="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">+{{ r.amenities.length - 3 }}</span>
                        }
                      } @else {
                        <span class="text-slate-300 text-xs italic">No amenities</span>
                      }
                    </div>
                  </div>
                  
                </div>
              }
            </div>
          </div>
    
          <!-- Right Column: Map -->
          <div id="home-map-container" class="flex-1 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-premium border-[6px] border-white relative h-[50vh] lg:h-full shrink-0 lg:shrink group bg-slate-200 isolation-isolate">
            
            <!-- Map Controls overlay -->
            <div class="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button (click)="recenterMap()" class="flex items-center justify-center w-10 h-10 bg-white text-brand-dark rounded-xl shadow-md hover:bg-brand-50 transition-colors" title="Recenter Map">
                <lucide-angular [img]="LocateFixedIcon" [size]="18"></lucide-angular>
              </button>
              @if (!isFullscreen) {
                <button (click)="toggleFullscreen()" class="flex items-center justify-center w-10 h-10 bg-white text-brand-dark rounded-xl shadow-md hover:bg-brand-50 transition-colors" title="Full Screen">
                  <lucide-angular [img]="MaximizeIcon" [size]="18"></lucide-angular>
                </button>
              }
            </div>
            
            <div id="home-map" class="w-full h-full z-0 transition-opacity duration-500" [ngStyle]="{'opacity': map ? 1 : 0}"></div>
            
            @if (isFullscreen) {
              <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10000]">
                <button (click)="toggleFullscreen()" class="flex items-center gap-2 px-8 py-3 text-base font-black bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-all border-2 border-slate-700/50 hover:scale-105 pointer-events-auto">
                   <lucide-angular [img]="MinimizeIcon" [size]="20"></lucide-angular> Exit Full Screen
                </button>
              </div>
            }
          </div>
          
        </div>

      </div>
    </div>
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

  /** Delegates to LocationService — used by template bindings */
  isRestroomOpenNow = (r: Restroom) => this.locationService.isRestroomOpenNow(r);


  LocateFixedIcon = LocateFixed;
  MaximizeIcon = Maximize;
  MinimizeIcon = Minimize;
  XIcon = X;
  RefreshCcwIcon = RefreshCcw;
  BathIcon = Bath;
  StarIcon = Star;
  MapPinIcon = MapPin;
  SearchIcon = Search;
  FilterIcon = Filter;
  ArrowRightIcon = ArrowRight;

  leaflet: any;
  map!: L.Map;
  userMarker?: L.Marker;
  radiusCircle?: L.Circle;
  markersMap: Map<string, L.Marker> = new Map();

  restrooms: Restroom[] = [];
  filteredRestrooms: Restroom[] = [];
  savedRestroomIds = new Set<string>();
  statusMsg = '';

  locationEnabled = false;
  hasAutoCentered = false;
  userPos: {lat: number; lng: number} | null = null;
  radius = 5000;
  isFullscreen = false;
  
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

  onRatingChange(val: number) {
    if (val < 0) this.minRating = 0;
    if (val > 5) this.minRating = 5;
    this.onFilterChange();
  }

  recenterMap() {
    if (!this.map || !this.leaflet) return;
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    this.map.setView(center, 14, { animate: true });
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const mapElement = document.getElementById('home-map-container');
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
    this.map = L.map('home-map', {
      zoomControl: false // Disable default zoom control to make it look cleaner
    }).setView(this.locationService.HAU_COORDS, 14);
    
    // Default leafet zoom control position
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    
    // Light map theme reverted to original
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    this.updateUserMarkerAndRadius();
    this.updateRestroomMarkers();
  }


  private filterRestrooms() {
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    
    this.filteredRestrooms = this.restrooms.filter(r => {
      if (!r.location || !r.location.latitude || !r.location.longitude) return false;
      const d = this.locationService.getDistance(center.lat, center.lng, r.location.latitude, r.location.longitude);
      if (d > this.radius) return false;

      if (this.minRating !== null && this.minRating > 0) {
        if (r.averageRating == null || r.averageRating < this.minRating) return false;
      }

      if (this.selectedAmenities.length > 0) {
        if (!r.amenities) return false;
        const hasAllAmenities = this.selectedAmenities.every(a => r.amenities!.includes(a));
        if (!hasAllAmenities) return false;
      }

      if (this.showOpenOnly) {
        if (!this.locationService.isRestroomOpenNow(r)) return false;
      }

      return true;
    });

    this.filteredRestrooms.sort((a, b) => {
      const distA = this.locationService.getDistance(center.lat, center.lng, a.location!.latitude, a.location!.longitude);
      const distB = this.locationService.getDistance(center.lat, center.lng, b.location!.latitude, b.location!.longitude);
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
        this.statusMsg = 'Failed to load';
        this.cdr.markForCheck();
      }
    });
  }

  private updateRestroomMarkers() {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;

    this.markersMap.forEach(m => this.map.removeLayer(m));
    this.markersMap.clear();

    this.filteredRestrooms.forEach(r => {
      if (r.location && r.location.latitude && r.location.longitude) {
        
        const isSaved = this.savedRestroomIds.has(r._id!);
        const isOpen = this.locationService.isRestroomOpenNow(r);
        
        // Match the blue theme of the second photo (with blue dots for pins)
        let bgColor = isSaved ? '#10B981' : '#2563EB'; // Green if saved, else Brand main
        let opacity = 1;
        
        if (!isOpen) {
          bgColor = '#EF4444'; // Red for closed
          opacity = 0.8;
        }

        const customPinIcon = L.divIcon({
          className: 'custom-restroom-pin',
          html: `<div style="background-color: ${bgColor}; width: 28px; height: 28px; border-radius: 50%; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4); opacity: ${opacity}; display: flex; align-items: center; justify-content: center; position: relative;"><div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div><div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${bgColor};"></div></div>`,
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -36]
        });

        const statusLabel = isOpen ? `<span style="color: #10B981; font-weight: 900; font-size: 11px; text-transform: uppercase;">Open Now</span>` : `<span style="color: #EF4444; font-weight: 900; font-size: 11px; text-transform: uppercase;">Closed</span>`;

        const marker = L.marker([r.location.latitude, r.location.longitude], { icon: customPinIcon })
          .addTo(this.map)
          .bindPopup(`
            <div style="font-family: inherit; font-size:1.15em; font-weight:900; color: #1E3A8A; margin-bottom: 2px;">${r.name}</div>
            <div style="margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">${statusLabel} <span style="color: #eab308; font-weight: 900; font-size: 11px;">★ ${r.averageRating ? r.averageRating.toFixed(1) : 'No stats'}</span></div>
            <div style="font-size: 0.85em; color: #64748b; margin-bottom: 12px; font-weight: 600; line-height: 1.4;"><b>Amenities:</b> ${r.amenities?.join(', ') || 'None'}</div>
            <a href="/restrooms/${r._id}" style="display: block; width: 100%; text-align: center; background: #2563EB; color: white; padding: 8px 0; border-radius: 8px; font-weight: 900; font-size: 13px; text-decoration: none; box-shadow: 0 2px 4px rgba(37,99,235,0.3);">View Detail</a>
          `, {
             className: 'custom-popup-theme'
          });
        
        marker.on('mouseover', (e: any) => {
          e.target.openPopup();
        });

        this.markersMap.set(r._id!, marker);
      }
    });

    // small style injection for popup
    if (!document.getElementById('leaflet-popup-custom-css')) {
      const style = document.createElement('style');
      style.id = 'leaflet-popup-custom-css';
      style.innerHTML = `
        .custom-popup-theme .leaflet-popup-content-wrapper { border-radius: 16px; padding: 4px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }
        .custom-popup-theme .leaflet-popup-content { margin: 12px; }
      `;
      document.head.appendChild(style);
    }
  }

  private updateUserMarkerAndRadius() {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    const popupText = this.userPos && this.locationEnabled ? 'You are here' : 'Default Location';

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(59, 130, 246, 0.6); animation: pulse 2s infinite;"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
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
        color: '#818CF8', // Indigo light
        fillColor: '#818CF8',
        fillOpacity: 0.1,
        weight: 1,
        radius: this.radius
      }).addTo(this.map);
    }
  }
}
