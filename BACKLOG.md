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

- **[FEATURE] Accurate POI/Waypoint Altitude:** Use `Cesium.sampleTerrainMostDetailed` to fetch the correct terrain height for all POIs and waypoints, ensuring they are rendered at their true altitude instead of being clamped to the ground.

## Code Architecture

- **[REFACTOR] Filename Generator Module:** Create a dedicated `FilenameGenerator.js` module to encapsulate the logic for constructing the suggested filename. This will make the logic more maintainable and easier to extend in the future.

---

### Completed Items

- **[REFACTOR] State Machine Architecture:** Refactored the entire application to be driven by a formal state machine (`NO_ROUTE`, `LOADING`, `ROUTE_LOADED`, `TOUR_PLAYING`, `TOUR_PAUSED`) in `app.js`. This resolved numerous UI consistency bugs.
- **[FEATURE] Professional UI Overhaul:** Replaced all emoji-based text buttons with high-quality, consistent SVG icons. Styled all buttons, sliders, and controls for a cohesive, modern, and professional look and feel.
- **[FEATURE] Custom Tour Controls:** Implemented a custom, touch-friendly tour control bar for mobile devices, replacing the default Cesium widgets. This includes Play/Pause, Direction Toggle, Reset, Zoom to Route, and Reset Style buttons, as well as a high-granularity time scrubber.
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