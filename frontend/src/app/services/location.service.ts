import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Restroom } from '../models/restroom.model';

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
  private hasInitializedLocation = false;
  public readonly HAU_COORDS: [number, number] = [15.1332, 120.5907];

  constructor() {
    this.initializeLocationOnStartup();
  }

  private initializeLocationOnStartup(): void {
    if (this.hasInitializedLocation || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.hasInitializedLocation = true;

    // Ask for location permission once on startup.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.locationEnabledSubject.next(true);
          this.userPosSubject.next({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          this.startTracking();
        },
        () => {
          this.setDemoLocation();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return;
    }

    this.setDemoLocation();
  }

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

  private setDemoLocation(): void {
    this.stopTracking();
    this.locationEnabledSubject.next(false);
    this.userPosSubject.next({ lat: this.HAU_COORDS[0], lng: this.HAU_COORDS[1] });
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

  /**
   * Calculates the Haversine distance in meters between two lat/lng coords.
   * Shared utility used by home and restroom-detail components.
   */
  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Determines whether a restroom is open right now (PH time).
   * Shared utility used by home and restroom-detail components.
   */
  isRestroomOpenNow(r: Restroom): boolean {
    if (!r.operatingHours) return true;
    const { is24Hours, openTime, closeTime } = r.operatingHours;
    if (is24Hours) return true;
    if (!openTime || !closeTime) return true;

    const now = new Date();
    const phTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const phTime = new Date(phTimeStr);

    const currentHour = phTime.getHours();
    const currentMinute = phTime.getMinutes();

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const currentTotalMins = currentHour * 60 + currentMinute;
    const openTotalMins = openH * 60 + openM;
    const closeTotalMins = closeH * 60 + closeM;

    if (closeTotalMins < openTotalMins) {
      return currentTotalMins >= openTotalMins || currentTotalMins <= closeTotalMins;
    } else {
      return currentTotalMins >= openTotalMins && currentTotalMins <= closeTotalMins;
    }
  }
}
