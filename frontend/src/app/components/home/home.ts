import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <h2>All Restrooms</h2>
    <button (click)="fetchData()">Refresh</button>
    <p>{{ statusMsg }}</p>

    @if (restrooms.length === 0 && !statusMsg) {
      <p>No restrooms found.</p>
    }

    @for (r of restrooms; track r._id) {
      <div style="border:1px solid #ccc; margin:8px; padding:8px;">
        <strong>{{ r.name }}</strong><br>
        <span>{{ r.description }}</span><br>
        @if (r.location) {
          <small>📍 {{ r.location.latitude }}, {{ r.location.longitude }}</small><br>
        }
        <small>Amenities: {{ r.amenities?.join(', ') || 'None' }}</small><br>
        <small>Flagged: {{ r.isFlagged }}</small><br>
        <a [routerLink]="['/restrooms', r._id]">View Details →</a>
      </div>
    }
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  restrooms: Restroom[] = [];
  statusMsg = '';

  ngOnInit() {
    // Defer initial fetch to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.fetchData(), 0);

    // Refetch data whenever navigation completes to this page
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

  fetchData() {
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    this.api.getAllRestrooms().subscribe({
      next: (res) => {
        console.log('[Home] Restrooms fetched:', res);
        this.restrooms = res;
        this.statusMsg = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[Home] Error:', err);
        this.statusMsg = `❌ ${err.error?.message || 'Failed to load restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }
}
