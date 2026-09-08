import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Leaflet's own stylesheet, bundled rather than pulled from unpkg at runtime.
//
// It was previously a <link> to unpkg.com in index.html. That stylesheet is not
// cosmetic: it sets `position: relative` on .leaflet-container and `position:
// absolute` on the panes. Without it the panes position against the document
// instead of the map, so every marker renders thousands of pixels outside the
// map viewport — the map looks empty and nothing can be clicked.
//
// Any blocked request, offline laptop, restrictive venue network or CDN outage
// therefore broke the map completely. `leaflet` is already a dependency, so the
// file is on disk; importing it removes the runtime network dependency.
//
// Imported before index.css so the theme overrides there still win.
import 'leaflet/dist/leaflet.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
