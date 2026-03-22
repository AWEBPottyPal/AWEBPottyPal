import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type * as L from 'leaflet';

@Component({
  selector: 'app-restroom-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    <h2>Restroom Detail</h2>
    @if (restroom) {
      <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="margin-top: 0; font-size: 1.5em; color: #333;">{{ restroom.name }}</h3>
        
        @if (restroom.images && restroom.images.length > 0) {
          <div style="margin-bottom: 15px; display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
            @for (img of restroom.images; track $index) {
              <img [src]="img" alt="Restroom photo" style="max-height: 300px; min-width: 250px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
            }
          </div>
        }

        <p style="font-size: 1.1em; color: #555;">{{ restroom.description || 'No description available.' }}</p>
        <p><strong>Amenities:</strong> {{ restroom.amenities?.length ? restroom.amenities?.join(', ') : 'None' }}</p>
        <p><strong>Flagged:</strong> {{ restroom.isFlagged ? 'Yes 🚩' : 'No' }}</p>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px;">
          <h4 style="margin: 0;">Location Map</h4>
          <div style="display: flex; gap: 10px;">
            <button (click)="recenterMap()" style="padding: 4px 8px; font-size: 0.9em; background: #e0e0e0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
              📍 Recenter Map
            </button>
            <button (click)="toggleFullscreen()" style="padding: 4px 8px; font-size: 0.9em; background: #e0e0e0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
              ⛶ Fullscreen
            </button>
          </div>
        </div>

        <!-- Map Area -->
        <div id="detail-map" style="height: 350px; width: 100%; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 15px; margin-top: 10px; transition: all 0.3s ease;"></div>
        
        @if (isFullscreen) {
          <div style="position: fixed; top: 20px; right: 20px; z-index: 10000;">
            <button (click)="toggleFullscreen()" style="padding: 10px 16px; font-size: 1.1em; background: #fff; border: 2px solid rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-weight: bold;">
              ⛶ Exit Fullscreen
            </button>
          </div>
        }
        
        <!-- Directions Control -->
        <div style="padding: 15px; border: 1px solid #eee; border-radius: 8px; background: #f9f9f9;">
          <h4 style="margin-top: 0; margin-bottom: 10px;">Get Directions</h4>
          <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 10px;">
            <label style="cursor: pointer;"><input type="radio" name="profile" value="driving-car" [(ngModel)]="transportProfile"> 🚗 Driving</label>
            <label style="cursor: pointer;"><input type="radio" name="profile" value="foot-walking" [(ngModel)]="transportProfile"> 🚶 Walking</label>
            <button (click)="getDirections()" style="padding: 6px 12px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; background: white;">Get Directions</button>
          </div>
          <p style="color: #666; font-size: 0.9em; margin: 0; min-height: 1.2em;">{{ routeInfo }}</p>
        </div>
      </div>

      @if (auth.isLoggedIn()) {
        <div style="margin: 15px 0;">
          @if (isSaved) {
            <button (click)="unsave()">💾 Unsave</button>
          } @else {
            <button (click)="save()">💾 Save</button>
          }
          @if (isFlagged) {
            <button (click)="unflag()" style="margin-left: 10px;">🚩 Unflag</button>
          } @else {
            <button (click)="flag()" style="margin-left: 10px;">🚩 Flag</button>
          }
        </div>
        @if (canDeleteRestroom()) {
          <div style="margin: 15px 0; display: flex; gap: 10px;">
            <button (click)="editRestroom()" style="color: #fff; background-color: #f39c12; padding: 8px 12px; border: 1px solid #e67e22; border-radius: 4px; cursor: pointer;">✏️ Edit Restroom</button>
            <button (click)="deleteRestroom()" style="color: red; background-color: #fee; padding: 8px 12px; border: 1px solid #fcc; border-radius: 4px; cursor: pointer;">🗑️ Delete Restroom</button>
          </div>
        }
        <p>{{ actionMsg }}</p>

        <hr>
        <h3>Add Review</h3>
        @if (auth.isLoggedIn() && !hasReviewed) {
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
            <label style="display: block; margin-bottom: 10px;">Rating (1–5): 
              <input [(ngModel)]="rating" type="number" min="1" max="5" style="width: 60px; padding: 4px;" />
            </label>
            <label style="display: block; margin-bottom: 10px;">Comment: 
              <input [(ngModel)]="comment" placeholder="Your experience..." style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
            </label>
            <button (click)="submitReview()" style="padding: 8px 16px; border-radius: 4px; background: #4285F4; color: white; border: none; cursor: pointer;">Submit Review</button>
            <p style="margin-top: 10px; margin-bottom: 0;">{{ reviewMsg }}</p>
          </div>
        } @else if (auth.isLoggedIn() && hasReviewed) {
           <div style="background: #e8f5e9; padding: 10px; border-radius: 8px; border: 1px solid #c8e6c9; color: #2e7d32;">
             ✅ You have already reviewed this restroom. Your review is displayed below.
           </div>
        }
      } @else {
        <p><em>Login to save, flag, or review this restroom.</em></p>
      }

      <hr>
      <h3>Reviews</h3>
      @for (r of reviews; track $index) {
        <div style="border:1px solid #e0e0e0; margin-bottom:10px; padding:15px; border-radius: 8px; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong style="font-size: 1.1em;">{{ r.user?.username || 'Unknown User' }}</strong>
              @if (auth.getUserId() && (r.user?._id === auth.getUserId() || r.user === auth.getUserId())) {
                <span style="font-size: 0.8em; background: #003366; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Your Review</span>
              }
            </div>
            <span style="color: #f39c12; font-weight: bold; font-size: 1.1em;">★ {{ r.rating }}</span>
          </div>

          @if (editingReviewId === r._id) {
            <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border: 1px solid #ccc; border-radius: 8px;">
              <label>Rating: <input type="number" min="1" max="5" [(ngModel)]="editRating" style="width: 50px;"/></label><br>
              <textarea [(ngModel)]="editComment" rows="3" style="width: 100%; margin-top: 10px; box-sizing: border-box;"></textarea><br>
              <button (click)="saveEditReview(r._id)" style="margin-top: 5px; background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Save</button>
              <button (click)="cancelEditReview()" style="margin-top: 5px; margin-left: 10px; background: #ccc; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
          } @else {
            <p style="margin: 8px 0; color: #444;">{{ r.comment }}</p>
          }

          @if (auth.getUserId() && (r.user?._id === auth.getUserId() || r.user === auth.getUserId() || auth.isAdmin())) {
            <div style="margin-top: 10px; display: flex; gap: 10px;">
              @if (auth.getUserId() && (r.user?._id === auth.getUserId() || r.user === auth.getUserId()) && editingReviewId !== r._id) {
                <button (click)="startEditReview(r)" style="font-size: 0.85em; padding: 4px 8px; border: 1px solid #ccc; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">✏️ Edit</button>
              }
              <button (click)="deleteReview(r._id)" style="font-size: 0.85em; padding: 4px 8px; border: 1px solid #ccc; background: #fee; color: red; border: none; border-radius: 4px; cursor: pointer;">🗑️ Delete</button>
            </div>
          }
        </div>
      }
      @if (reviews.length === 0) { <p style="color: #666; font-style: italic;">No reviews yet.</p> }
    } @else {
      <p>Loading...</p>
    }
  `
})
export class RestroomDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private locationService = inject(LocationService);
  private cd = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  private leaflet: any;
  private map!: L.Map;
  private restroomMarker?: L.Marker;
  private userMarker?: L.Marker;
  private routeLayer?: L.GeoJSON;

  restroom: Restroom | null = null;
  reviews: any[] = [];
  actionMsg = '';
  reviewMsg = '';
  rating = 5;
  comment = '';
  isSaved = false;
  isFlagged = false;
  
  hasReviewed = false;
  editingReviewId: string | null = null;
  editRating = 5;
  editComment = '';
  
  userPos: {lat: number; lng: number} | null = null;
  locationEnabled = false;
  transportProfile: 'driving-car' | 'foot-walking' = 'driving-car';
  routeInfo = '';
  isFullscreen = false;

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      // Adding a tiny delay allows the @if block to render if restroom is fetched very quickly
      setTimeout(() => {
        if (this.restroom && document.getElementById('detail-map') && !this.map) {
          this.initMap();
        }
      }, 100);
    }
  }

  canDeleteRestroom(): boolean {
    if (!this.auth.isLoggedIn() || !this.restroom) return false;
    const userId = this.auth.getUserId();
    let createdById: string | undefined;
    if (typeof this.restroom.createdBy === 'string') {
      createdById = this.restroom.createdBy;
    } else if (this.restroom.createdBy && typeof this.restroom.createdBy === 'object') {
      createdById = (this.restroom.createdBy as any)._id;
    }
    const isOwner = createdById === userId;
    const isAdmin = this.auth.isAdmin();
    return isOwner || isAdmin;
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.fetchData(id);
        }
      });

    this.locationService.locationEnabled$.pipe(takeUntil(this.destroy$)).subscribe(enabled => {
      this.locationEnabled = enabled;
      this.updateUserMarker();
    });

    this.locationService.userPos$.pipe(takeUntil(this.destroy$)).subscribe(pos => {
      this.userPos = pos;
      this.updateUserMarker();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const mapElement = document.getElementById('detail-map');
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
    if (!this.map || !this.leaflet || !this.restroom?.location) return;
    const lat = this.restroom.location.latitude;
    const lng = this.restroom.location.longitude;

    if (this.locationEnabled && this.userPos) {
      const bounds = this.leaflet.latLngBounds([
        [this.userPos.lat, this.userPos.lng],
        [lat, lng]
      ]);
      this.map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else {
      this.map.setView([lat, lng], 16, { animate: true });
    }
  }

  private initMap(): void {
    if (!this.leaflet || !this.restroom || !this.restroom.location || this.map) return;
    const L = this.leaflet;
    
    const lat = this.restroom.location.latitude;
    const lng = this.restroom.location.longitude;

    this.map = L.map('detail-map');
    
    // Fit bounds if user location is available and sharing is on, otherwise set view around restroom
    if (this.locationEnabled && this.userPos) {
      const bounds = L.latLngBounds([
        [this.userPos.lat, this.userPos.lng],
        [lat, lng]
      ]);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      this.map.setView([lat, lng], 16);
    }
    
    // Standard OpenStreetMap with high detail for buildings/texts, but filtered for modern aesthetics
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    // Custom dark blue marker for the restroom
    const customPinIcon = L.divIcon({
      className: 'custom-restroom-pin',
      html: `<div style="background-color: #003366; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 14px; font-weight: bold;">R</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    // Add restroom marker
    this.restroomMarker = L.marker([lat, lng], { icon: customPinIcon })
      .addTo(this.map)
      .bindPopup(`<div style="font-weight: bold; font-size: 1.1em;">${this.restroom.name}</div>`);
      
    this.updateUserMarker();
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

  getDirections() {
    if (!this.map || !this.leaflet || !this.restroom?.location) return;
    const L = this.leaflet;
    
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    const start = { latitude: center.lat, longitude: center.lng };
    const end = { latitude: this.restroom.location.latitude, longitude: this.restroom.location.longitude };

    this.routeInfo = `Calculating ${this.transportProfile === 'foot-walking' ? 'walking' : 'driving'} directions...`;
    
    this.api.getDirections(start, end, this.transportProfile).subscribe({
      next: (res) => {
        if (this.routeLayer) {
          this.map.removeLayer(this.routeLayer);
        }

        this.routeLayer = L.geoJSON(res, {
          style: {
            color: this.transportProfile === 'foot-walking' ? '#28a745' : '#0055ff',
            weight: 5,
            opacity: 0.7
          }
        }).addTo(this.map);

        const bounds = this.routeLayer?.getBounds();
        if (bounds) {
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Safely extract distance and duration from ORS response
        const props = res.features?.[0]?.properties;
        if (props && props.summary) {
          const distKm = (props.summary.distance / 1000).toFixed(2);
          const timeMins = Math.round(props.summary.duration / 60);
          this.routeInfo = `✅ Route found: ${distKm} km, ~${timeMins} min`;
        } else {
          this.routeInfo = '✅ Route found';
        }
        this.cd.markForCheck();
      },
      error: (err) => {
        console.error('Directions error:', err);
        this.routeInfo = '❌ Failed to get directions. Try a different profile or location.';
        this.cd.markForCheck();
      }
    });
  }

  private fetchData(id: string) {
    this.api.getRestroom(id).subscribe({
      next: (r) => { 
        this.restroom = r;
        this.cd.markForCheck();
        // Initialize map if it hasn't been yet and leaflet is loaded
        if (this.leaflet && !this.map) {
          setTimeout(() => {
            if (document.getElementById('detail-map')) {
              this.initMap();
            }
          }, 50);
        }
      },
      error: (e) => console.error('[Detail] Error:', e)
    });
    this.api.getReviews(id).subscribe({
      next: (r) => { 
        this.reviews = r;
        
        const currentUserId = this.auth.getUserId();
        if (currentUserId) {
          // Check if the user has already reviewed
          this.hasReviewed = this.reviews.some((rev: any) => rev.user && (rev.user._id === currentUserId || rev.user === currentUserId));
          
          // Sort to put current user's review on top
          this.reviews.sort((a: any, b: any) => {
            const aIsCurrent = a.user && (a.user._id === currentUserId || a.user === currentUserId);
            const bIsCurrent = b.user && (b.user._id === currentUserId || b.user === currentUserId);
            if (aIsCurrent && !bIsCurrent) return -1;
            if (!aIsCurrent && bIsCurrent) return 1;
            return 0;
          });
        }
        
        this.cd.markForCheck();
      },
      error: (e) => console.error('[Detail] Reviews error:', e)
    });

    const userId = this.auth.getUserId();
    if (userId) {
      this.api.getSavedRestrooms(userId).subscribe({
        next: (saved) => {
          this.isSaved = Array.isArray(saved) && saved.some((s: any) => s._id === id);
          this.cd.markForCheck();
        }
      });
      this.api.getFlaggedRestrooms(userId).subscribe({
        next: (flagged) => {
          this.isFlagged = Array.isArray(flagged) && flagged.some((f: any) => f._id === id);
          this.cd.markForCheck();
        }
      });
    }
  }

  save() {
    this.api.saveRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `✅ ${r.message}`;
        this.isSaved = true;
        this.cd.markForCheck();
      },
      error: (e) => { this.actionMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  unsave() {
    this.api.saveRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `✅ ${r.message}`;
        this.isSaved = false;
        this.cd.markForCheck();
      },
      error: (e) => { this.actionMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  flag() {
    this.api.flagRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `✅ ${r.message}`;
        this.isFlagged = r.flagged === true;
        this.restroom!.isFlagged = true;
        this.cd.markForCheck();
      },
      error: (e) => {
        this.actionMsg = `❌ ${e.error?.message || e.message}`; 
        this.cd.markForCheck();
      }
    });
  }

  unflag() {
    this.api.flagRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `✅ ${r.message}`;
        this.isFlagged = r.flagged === true;
        if (r.flagged === false) {
          this.restroom!.isFlagged = false;
        }
        this.cd.markForCheck();
      },
      error: (e) => {
        this.actionMsg = `❌ ${e.error?.message || e.message}`; 
        this.cd.markForCheck();
      }
    });
  }

  submitReview() {
    this.api.addReview(this.restroom!._id, this.rating, this.comment).subscribe({
      next: (r) => {
        this.reviewMsg = '✅ Review submitted!';
        this.hasReviewed = true;
        this.reviews.unshift({ ...r, user: { _id: this.auth.getUserId(), username: this.auth.currentUser()?.username } });
        this.cd.markForCheck();
      },
      error: (e) => { this.reviewMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  deleteReview(reviewId: string) {
    if (!confirm('Delete this review?')) return;
    this.api.deleteReview(reviewId).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r._id !== reviewId);
        // If they deleted their own review, they can review again
        const currentUserId = this.auth.getUserId();
        this.hasReviewed = this.reviews.some((rev: any) => rev.user && (rev.user._id === currentUserId || rev.user === currentUserId));

        this.reviewMsg = '✅ Review deleted';
        this.cd.markForCheck();
      },
      error: (e) => {
        this.reviewMsg = `❌ ${e.error?.message || e.message}`;
        this.cd.markForCheck();
      }
    });
  }

  startEditReview(rev: any) {
    this.editingReviewId = rev._id;
    this.editRating = rev.rating;
    this.editComment = rev.comment;
  }

  cancelEditReview() {
    this.editingReviewId = null;
  }

  saveEditReview(reviewId: string) {
    this.api.editReview(reviewId, this.editRating, this.editComment).subscribe({
      next: (r) => {
        const idx = this.reviews.findIndex(rev => rev._id === reviewId);
        if (idx !== -1) {
          this.reviews[idx].rating = r.rating;
          this.reviews[idx].comment = r.comment;
        }
        this.editingReviewId = null;
        this.reviewMsg = '✅ Review updated';
        this.cd.markForCheck();
      },
      error: (e) => {
        this.reviewMsg = `❌ ${e.error?.message || e.message}`;
        this.cd.markForCheck();
      }
    });
  }

  editRestroom() {
    if (this.restroom) {
      this.router.navigate(['/edit-restroom', this.restroom._id]);
    }
  }

  deleteRestroom() {
    if (!this.restroom) return;
    if (!confirm(`Are you sure you want to DELETE "${this.restroom.name}"? This action cannot be undone.`)) return;

    const deleteCall = this.auth.isAdmin() 
      ? this.api.adminDeleteRestroom(this.restroom._id)
      : this.api.deleteRestroom(this.restroom._id);

    deleteCall.subscribe({
      next: (response) => {
        this.actionMsg = '✅ Restroom deleted successfully!';
        setTimeout(() => this.router.navigate(['/flagged-restrooms']), 2000);
        this.cd.markForCheck();
      },
      error: (e) => {
        this.actionMsg = `❌ ${e.error?.message || 'Failed to delete restroom'}`;
        this.cd.markForCheck();
      }
    });
  }
}
