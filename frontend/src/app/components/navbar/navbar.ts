import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  template: `
    <nav>
      <strong>🚻 PottyPal</strong> |
      <a routerLink="/">Home</a> |
      <a routerLink="/add-restroom">Add Restroom</a> |
      @if (auth.isAdmin()) {
        <a routerLink="/flagged-restrooms">🚩 Community Flagged</a> |
      }
      <a routerLink="/maps">Maps</a> |
      @if (auth.isLoggedIn()) {
        <a routerLink="/profile">Profile</a> |
        <a routerLink="/saved">Saved</a> |
        <a routerLink="/flagged">Flagged</a> |
        <a routerLink="/reviewed">Reviewed</a> |
        <a routerLink="/added">My Restrooms</a> |
        <button (click)="logout()">Logout ({{ auth.currentUser()?.username }})</button>
      } @else {
        <a routerLink="/auth">Login / Signup</a>
      }
    </nav>
    <hr>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
