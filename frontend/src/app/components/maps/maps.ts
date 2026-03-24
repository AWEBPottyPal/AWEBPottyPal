import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Restroom } from '../../models/restroom.model';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

declare global {
  interface Window {
    google: any;
    __googleMapsLoadingPromise?: Promise<void>;
    GOOGLE_MAPS_API_KEY?: string;
  }
}

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: block;
      }

      .maps-shell {
        width: 100%;
        height: calc(100vh - 4rem);
        min-height: calc(100vh - 4rem);
        position: relative;
      }

      .google-map {
        width: 100%;
        height: 100%;
      }

      .overlay {
        position: absolute;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        width: min(90%, 700px);
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .overlay.error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      .overlay.info {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e3a8a;
      }
    `,
  ],
  template: `
    <div class="maps-shell">
      @if (errorMessage) {
        <div class="overlay error">{{ errorMessage }}</div>
      } @else if (isLoading) {
        <div class="overlay info">Loading Google Maps and restroom markers...</div>
      }
      <div #mapCanvas class="google-map"></div>
    </div>
  `
})
export class MapsComponent implements AfterViewInit {
  @ViewChild('mapCanvas', { static: true }) mapCanvas!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(ApiService);

  isLoading = true;
  errorMessage = '';

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      await this.loadGoogleMapsApi();
      const restrooms = await this.getRestrooms();
      this.renderMap(restrooms);
      this.isLoading = false;
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage = error?.message || 'Failed to load Google Maps.';
    }
  }

  private getApiKey(): string {
    const metaKey = document.querySelector('meta[name="google-maps-api-key"]')?.getAttribute('content')?.trim() || '';
    const windowKey = window.GOOGLE_MAPS_API_KEY?.trim() || '';
    return metaKey || windowKey;
  }

  private loadGoogleMapsApi(): Promise<void> {
    if (window.google?.maps) {
      return Promise.resolve();
    }

    if (window.__googleMapsLoadingPromise) {
      return window.__googleMapsLoadingPromise;
    }

    const key = this.getApiKey();
    if (!key) {
      return Promise.reject(
        new Error('Missing Google Maps API key. Add it in frontend/src/index.html as <meta name="google-maps-api-key" content="YOUR_KEY">.')
      );
    }

    window.__googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Google Maps script timed out. Check internet connection, API restrictions, and billing.'));
      }, 12000);

      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error('Google Maps script failed to load. Check your API key and billing settings.'));
      };
      document.head.appendChild(script);
    });

    return window.__googleMapsLoadingPromise;
  }

  private async getRestrooms(): Promise<Restroom[]> {
    const data = await firstValueFrom(
      this.api.getAllRestrooms().pipe(
        timeout(8000),
        catchError(() => of([]))
      )
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data as Restroom[];
  }

  private renderMap(restrooms: Restroom[]): void {
    const center = { lat: 14.5995, lng: 120.9842 };
    const map = new window.google.maps.Map(this.mapCanvas.nativeElement, {
      center,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const bounds = new window.google.maps.LatLngBounds();
    const infoWindow = new window.google.maps.InfoWindow();
    let hasMarker = false;

    for (const restroom of restrooms) {
      const lat = restroom.location?.latitude;
      const lng = restroom.location?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        continue;
      }

      hasMarker = true;
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        title: restroom.name,
      });

      const ratingText = restroom.averageRating ? restroom.averageRating.toFixed(1) : 'New';
      const content = `
        <div style="min-width:220px;padding:4px 2px;">
          <div style="font-weight:800;font-size:15px;color:#0f172a;">${this.escapeHtml(restroom.name)}</div>
          <div style="font-size:12px;color:#475569;margin-top:4px;">Rating: ${this.escapeHtml(ratingText)}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${this.escapeHtml(restroom.location?.address || 'No address provided')}</div>
        </div>
      `;

      marker.addListener('click', () => {
        infoWindow.setContent(content);
        infoWindow.open({ anchor: marker, map });
      });

      bounds.extend({ lat, lng });
    }

    if (hasMarker) {
      map.fitBounds(bounds, 64);
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
