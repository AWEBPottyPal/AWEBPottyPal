import { Component } from '@angular/core';

@Component({
  selector: 'app-maps',
  template: `
    <h2>🗺️ Maps</h2>
    <p>Google Maps integration coming soon.</p>
    <p>This page will display restroom markers based on their latitude/longitude coordinates.</p>
    <div id="map-placeholder" style="border:2px dashed #ccc; height:300px; display:flex; align-items:center; justify-content:center;">
      [ Map will render here ]
    </div>
  `
})
export class MapsComponent {}
