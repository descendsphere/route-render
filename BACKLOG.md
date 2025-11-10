# Application Backlog

This file contains a list of proposed features and enhancements for the GPX 3D Player application.

## Epic: Multi-Route Management & Shareability

- **[EPIC] Local Route Storage & Management:**
  - **[FEATURE] Store User Routes:** When a user uploads a GPX file, store its points and fetched POIs in `localStorage`.
  - **[FEATURE] Pre-packaged Routes:** Include several default GPX files in a `resources` folder and load them on startup.
  - **[FEATURE] Route List UI:** Display a combined list of pre-packaged and locally stored routes in the side panel, with radio buttons to select the active route.
  - **[FEATURE] Active Route Switching:** Allow the user to switch the active route, which will update the main view, tour controls, and stats.
  - **[FEATURE] Remove Local Routes:** Add a "remove" button for routes stored in `localStorage`.
  - **[FEATURE] "No Route" Option:** Always include a "No Route" option at the top of the list, which is the default state.
- **[FEATURE] Shareable URLs:** Implement logic to read a URL parameter (e.g., `?route=route_id`) to automatically load a specific pre-packaged or locally stored route on page load.

## Core Functionality Enhancements

- **[FEATURE] Load GPX from Public URL:** Add a text input field to the UI where users can paste a URL to a GPX file. The application will then attempt to fetch and render the GPX data from that URL.
- **[FEATURE] Accurate POI/Waypoint Altitude:** Use `Cesium.sampleTerrainMostDetailed` to fetch the correct terrain height for all POIs and waypoints, ensuring they are rendered at their true altitude instead of being clamped to the ground.

## Km-effort Integration

- **[EPIC] Km-effort Integration:**
  - **[REFACTOR] Calculate Km-effort:** Create a new method in `StatisticsCalculator.js` that processes the entire route to calculate the cumulative Km-effort at each point.
  - **[FEATURE] Km-effort Route Coloring:** Implement a new color scheme that colors the route polyline based on the cumulative Km-effort.
  - **[FEATURE] Km-effort Person Label:** Add the current cumulative Km-effort to the "Person" entity's label during tour playback.
  - **[FEATURE] Display Total Km-effort:** Show the total Km-effort for the entire route in the main statistics panel.

## UI/UX Enhancements

- **[FEATURE] Manual Pitch Control:** Add controls to adjust the camera pitch during the tour.
- **[UI/UX] Preset Speed/Zoom Buttons:** As an alternative to sliders, offer preset buttons for speed and zoom levels.

## Interactive Elevation Chart

- **[EPIC] Interactive Elevation Chart:**
  - **[FEATURE] Render Chart:** Use a charting library to draw the elevation profile.
  - **[FEATURE] Live Position Indicator:** Sync a marker on the chart with the tour playback.
  - **[FEATURE] Chart-to-Map Sync:** Allow clicking/scrubbing on the chart to move the person on the 3D map.

## Code Architecture

- **[REFACTOR] Filename Generator Module:** Create a dedicated `FilenameGenerator.js` module to encapsulate the logic for constructing the suggested filename. This will make the logic more maintainable and easier to extend in the future.
- **[REFACTOR] Smoothed Camera Velocity:** Implement a moving average on the position data to calculate a smoother velocity vector for the camera to follow.

---

### Completed Items

- **[FEATURE] Page Title Update:** Changed the application title to "GPX 3D Player" for better branding.
- **[UI/UX] POI Visibility Toggle:** Added a button to the custom tour controls to toggle the visibility of Points of Interest.
- **[FIX] Robust POI Naming:** The `PoiService` now uses a comprehensive fallback strategy (`name`, `name:en`, `alt_name`, `old_name`) to significantly reduce the number of "Unnamed" POIs.
- **[FIX] Camera State Lockout & Improved State Transitions:** Resolved critical state management issues that led to camera "lockout" and unpredictable behavior during tour playback and style resets.
- **[UI/UX] Auto-Collapse Panel on Play:** When the tour starts, the side panel now automatically collapses for a full-screen view.
- **[REFACTOR] State Machine Architecture:** Refactored the entire application to be driven by a formal state machine (`NO_ROUTE`, `LOADING`, `ROUTE_LOADED`, `TOUR_PLAYING`, `TOUR_PAUSED`) in `app.js`. This resolved numerous UI consistency bugs.
- **[FEATURE] Universal Custom Tour Controls:** The custom, touch-friendly tour control bar (including Play/Pause, Direction Toggle, Reset, Zoom to Route, Reset Style buttons, and a high-granularity time scrubber) is now used universally on both mobile and desktop, replacing the default Cesium widgets.
- **[FIXED] Vertical Quick Controls:** Implemented a vertical quick-controls bar on the left of the screen, which appears when the main panel is collapsed. This bar contains vertical sliders with icons for speed and zoom.
- **[FIXED] Integrated Panel Toggle:** Reworked the collapsible panel so the entire header is clickable to toggle, and an icon rotates to indicate state.
- **[FIXED] Global Camera Distance:** Added a "Distance" slider that adjusts the camera distance for all applicable camera strategies.
- **[FIXED] Logarithmic Sliders:** Implemented a logarithmic scale for both the speed and camera distance sliders to provide better precision for smaller values.
- **[FIXED] Local Time Display:** Changed the "Person" entity's label to display the current tour time in the user's local time zone (`yyyy-MM-dd HH:mm:ss`) instead of UTC.
- **[FIXED] Mobile Responsiveness:** Used CSS media queries to improve the layout on mobile devices.
- **[FIXED] Collapsible Panel:** The side panel's toggle button is now correctly positioned outside the panel, allowing it to be collapsed and expanded.
- **[FIXED] Remove Camera Info Section:** The "Camera Info" section has been removed from the UI.
- **[FIXED] Concise Style Controls:** Redesigned the "Style" section to be more compact and use `+/-` buttons.
- **[REFACTOR] Consistent POI/Waypoint Labels:** Updated the styling of POI and Waypoint labels.