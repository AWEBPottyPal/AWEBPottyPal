import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { AuthComponent } from './components/auth/auth';
import { RestroomDetailComponent } from './components/restroom-detail/restroom-detail';
import { AddRestroomComponent } from './components/add-restroom/add-restroom';
import { ProfileComponent } from './components/profile/profile';
import { SavedComponent } from './components/saved/saved';
import { FlaggedComponent } from './components/flagged/flagged';
import { ReviewedComponent } from './components/reviewed/reviewed';
import { AddedComponent } from './components/added/added';
import { MapsComponent } from './components/maps/maps';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'restrooms/:id', component: RestroomDetailComponent },
  { path: 'add-restroom', component: AddRestroomComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'saved', component: SavedComponent },
  { path: 'flagged', component: FlaggedComponent },
  { path: 'reviewed', component: ReviewedComponent },
  { path: 'added', component: AddedComponent },
  { path: 'maps', component: MapsComponent },
  { path: '**', redirectTo: '' }
];
