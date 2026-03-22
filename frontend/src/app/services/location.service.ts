import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private platformId = inject(PLATFORM_ID);

  private locationEnabledSubject = new BehaviorSubject<boolean>(false);
  locationEnabled$ = this.locationEnabledSubject.asObservable();

  private userPosSubject = new BehaviorSubject<{ lat: number; lng: number } | null>(null);
  userPos$ = this.userPosSubject.asObservable();

  private watchId?: number;
  public readonly HAU_COORDS: [number, number] = [15.1332, 120.5907];

  toggleLocation(enabled: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.locationEnabledSubject.next(enabled);
    if (enabled) {
      this.startTracking();
    } else {
      this.disableLocation();
    }
  }

  private disableLocation(): void {
    this.stopTracking();
    this.userPosSubject.next(null);
  }

  private startTracking(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.userPosSubject.next({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) {
            this.locationEnabledSubject.next(false);
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
}
