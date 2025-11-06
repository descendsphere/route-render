# Application Backlog

This file contains a list of proposed features, enhancements, and bug fixes for the GPX 3D Renderer application.

## Epic: Multi-Route Management & Shareability

- **[EPIC] Local Route Storage & Management:**
  - **[FEATURE] Store User Routes:** When a user uploads a GPX file, store its points and fetched POIs in `localStorage`.
  - **[FEATURE] Pre-packaged Routes:** Include several default GPX files in a `resources` folder and load them on startup.
  - **[FEATURE] Route List UI:** Display a combined list of pre-packaged and locally stored routes in the side panel, with radio buttons to select the active route.
  - **[FEATURE] Active Route Switching:** Allow the user to switch the active route, which will update the main view, tour controls, and stats.
  - **[FEATURE] Remove Local Routes:** Add a "remove" button for routes stored in `localStorage`.
  - **[FEATURE] "No Route" Option:** Always include a "No Route" option at the top of the list, which is the default state.
- **[FEATURE] Shareable URLs:** Implement logic to read a URL parameter (e.g., `?route=route_id`) to automatically load a specific pre-packaged or locally stored route on page load.

## High Priority UI/UX

- **[FIXED] Mobile Responsiveness:** Used CSS media queries to improve the layout on mobile devices. This includes making the side panel full-width and increasing the size of fonts and touch targets. Also added viewport meta tag and Cesium resolution scaling.
- **[FEATURE] Custom Tour Controls:** Replace the small default Cesium animation widget with larger, custom-built UI controls (Play/Pause buttons, a progress bar/timeline) for a better mobile experience.
- **[FIXED] Integrated Panel Toggle:** Reworked the collapsible panel so the entire header is clickable to toggle, and an icon (like a chevron) rotates to indicate state, instead of a separate button.

## Medium Priority UI/UX

- **[FIXED] Global Camera Distance:** Added a "Distance" slider that adjusts the camera distance for all applicable camera strategies (Top-Down, Overhead, First-Person), not just one.
- **[FIXED] Logarithmic Sliders:** Implemented a logarithmic scale for both the speed and camera distance sliders to provide better precision for smaller values.
- **[REFACTOR] Consistent POI/Waypoint Labels:** Update the styling (font, background, color, offset) of POI and Waypoint labels to match the "Person" entity's label for a consistent look.

## Core Functionality Enhancements

- **[FEATURE] Accurate POI/Waypoint Altitude:** Use `Cesium.sampleTerrainMostDetailed` to fetch the correct terrain height for all POIs and waypoints, ensuring they are rendered at their true altitude instead of being clamped to the ground.

## Code Architecture

- **[REFACTOR] Filename Generator Module:** Create a dedicated `FilenameGenerator.js` module to encapsulate the logic for constructing the suggested filename. This will make the logic more maintainable and easier to extend in the future.

---

### Completed Items

- **[FIXED] Collapsible Panel:** The side panel's toggle button is now correctly positioned outside the panel, allowing it to be collapsed and expanded.
- **[FIXED] Remove Camera Info Section:** The "Camera Info" section has been removed from the UI as it provides debug information that is not useful to the end-user.
- **[FIXED] Concise Style Controls:** Redesigned the "Style" section to be more compact. Placed the route width control to the right of the color picker and implemented `+`/`-` buttons for changing the width value.
- **[FIXED] Local Time Display:** Changed the "Person" entity's label to display the current tour time in the user's local time zone instead of UTC.