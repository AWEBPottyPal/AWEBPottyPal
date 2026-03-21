import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-added',
  imports: [RouterLink],
  template: `
    <h2>🏗️ My Added Restrooms</h2>
    <p>{{ statusMsg }}</p>
    @for (r of restrooms; track r._id) {
      <div style="border:1px solid #ccc; margin:6px; padding:6px;">
        <strong>{{ r.name }}</strong><br>
        <small>{{ r.description }}</small><br>
        <small>Flagged: {{ r.isFlagged }}</small><br>
        <a [routerLink]="['/restrooms', r._id]">View →</a>
        <button (click)="deleteRestroom(r._id)">🗑️ Delete</button>
      </div>
    }
    @if (restrooms.length === 0 && !statusMsg) { <p>You haven't added any restrooms yet.</p> }
  `
})
export class AddedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
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
        if (this.router.url === '/added') {
          this.fetchData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchData() {
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    const userId = this.auth.getUserId();
    if (!userId) {
      this.statusMsg = '⚠️ Not logged in.';
      this.cdr.markForCheck();
      return;
    }

    this.api.getRestroomsByUser(userId).subscribe({
      next: (data: Restroom[]) => {
        this.restrooms = Array.isArray(data) ? data : [];
        console.log('[Added] My restrooms (server):', this.restrooms);
        this.statusMsg = '';
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('[Added] Error fetching my restrooms:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }

  deleteRestroom(id: string) {
    if (!confirm('Delete this restroom?')) return;
    this.api.deleteRestroom(id).subscribe({
      next: () => {
        this.statusMsg = '✅ Restroom deleted';
        // refresh list
        this.fetchData();
      },
      error: (e) => {
        console.error('[Added] Delete restroom error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
