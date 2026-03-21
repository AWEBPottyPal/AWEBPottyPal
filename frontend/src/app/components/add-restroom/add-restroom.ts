import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

const AMENITIES = ['Bidet', 'Soap', 'PWD Friendly', 'Clean', 'Lock', 'Tissue'];

@Component({
  selector: 'app-add-restroom',
  imports: [FormsModule],
  template: `
    <h2>Add Restroom</h2>
    @if (!auth.isLoggedIn()) {
      <p>⚠️ You must be logged in to add a restroom.</p>
    } @else {
      <label>Name: <input [(ngModel)]="name" placeholder="Restroom name" /></label><br>
      <label>Description: <input [(ngModel)]="description" placeholder="Description" /></label><br>
      <label>Latitude: <input [(ngModel)]="latitude" type="number" /></label><br>
      <label>Longitude: <input [(ngModel)]="longitude" type="number" /></label><br>

      <fieldset>
        <legend>Amenities</legend>
        @for (a of amenityOptions; track a) {
          <label>
            <input type="checkbox" [checked]="selectedAmenities.includes(a)"
              (change)="toggleAmenity(a)" /> {{ a }}
          </label><br>
        }
      </fieldset>

      <button (click)="submit()">Add Restroom</button>
      <p>{{ statusMsg }}</p>
    }
  `
})
export class AddRestroomComponent {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);

  name = ''; description = '';
  latitude: number | null = null; longitude: number | null = null;
  amenityOptions = AMENITIES;
  selectedAmenities: string[] = [];
  statusMsg = '';

  toggleAmenity(a: string) {
    this.selectedAmenities = this.selectedAmenities.includes(a)
      ? this.selectedAmenities.filter(x => x !== a)
      : [...this.selectedAmenities, a];
  }

  submit() {
    const payload = {
      name: this.name,
      description: this.description,
      location: { latitude: this.latitude, longitude: this.longitude },
      amenities: this.selectedAmenities
    };
    this.api.addRestroom(payload).subscribe({
      next: (r) => {
        console.log('[AddRestroom] Created:', r);
        this.statusMsg = `✅ Restroom "${r.name}" added!`;
        setTimeout(() => this.router.navigate(['/']), 1000);
      },
      error: (e) => {
        console.error('[AddRestroom] Error:', e);
        this.statusMsg = `❌ ${e.error?.message || 'Failed to add restroom'}`;
      }
    });
  }
}
