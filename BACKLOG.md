# Application Backlog

This file contains a list of proposed features and enhancements for the GPX 3D Player application.

## Planned

### Epic: Multi-Route Management & Shareability

- **[FEATURE] Manage Routes:** Add UI to allow renaming and deleting routes from the library.

### Core Functionality Enhancements
- **[FIX] Prevent Camera Clipping on Mobile:**
  - **Problem:** The camera can clip through terrain during tour playback on mobile devices because collision detection is disabled by default for performance reasons (`screenSpaceCameraController.enableCollisionDetection = false`).
  - **Solution (Option 3 - Hybrid Approach):** Programmatically enable Cesium's built-in collision detection *only* during tour playback on mobile devices. This balances the need for performance during general map interaction with the requirement for a clean visual experience during the cinematic tour.
  - **Scope:**
    -   Modify the application's state machine (`app.js`).
    -   When the state transitions to `TOUR_PLAYING`, set `viewer.scene.screenSpaceCameraController.enableCollisionDetection = true`.
    -   When the state transitions away from `TOUR_PLAYING` (e.g., to `TOUR_PAUSED` or `ROUTE_LOADED`), revert `enableCollisionDetection` to `false` if the device is mobile.

### UI/UX Enhancements

- **[FEATURE] Preset Speed/Zoom Buttons:** As an alternative to sliders, offer preset buttons for speed and zoom levels.
- **[FEATURE] Reset Camera Functionality:**
  - **Problem:** The existing "Reset Style" functionality is strictly for visual styling (route color, width, clamp; person color, size) and does not affect camera or playback settings. Users may expect a comprehensive reset of the view to default camera angle, zoom, playback speed, and camera strategy. Architecturally, it is crucial to keep style resets separate from camera state resets to prevent disruptive side effects during tour playback.
  - **Solution:** Implement a dedicated "Reset Camera" feature, separate from "Reset Style," that restores camera pitch, camera distance, playback speed, and camera strategy to their default values.
  - **Scope:**
    -   **Camera Pitch:** Reset to default of -45 degrees (a standard isometric viewing angle).
    -   **Camera Distance:** Reset to default of 1000 meters (a balanced view of the traveler and surroundings).
    -   **Playback Speed:** Reset to the "smart" default speed calculated by the `SpeedController` for the current route.
    -   **Camera Strategy:** Reset to the "Overhead" strategy, which provides a good overall view of the route.
  - **Implementation Notes:**
    -   **`UIManager.js`:** Add a new "Reset Camera" button (both in the main panel and custom controls), along with `onResetCamera` and `onCustomResetCamera` callbacks. Implement a method to visually reset the corresponding slider inputs and the camera strategy dropdown to their default positions/values.
    -   **`TourController.js`:** Introduce a `resetCamera()` method to set `this.cameraPitch` to -45, `this.cameraDistance` to 1000, and apply the "Overhead" camera strategy.
    -   **`SpeedController.js`:** Add a `resetSpeed()` method to restore `this.currentRelativeSpeed` to 1 and re-apply the calculated `defaultMultiplier`.
    -   **`app.js`:** Orchestrate the reset by wiring UI events to a `handleResetCamera()` method, which will call `tourController.resetCamera()`, `speedController.resetSpeed()`, and `uiManager` methods to update the UI elements.
- **[REFACTOR] Horizontal Quick Controls:**
  - **Problem:** When the side panel is collapsed, the vertical sliders for Speed, Distance, and Pitch in the "quick controls" area are not very responsive on mobile devices and can accidentally trigger page reloads.
  - **Solution (Option 1):** Rearchitect the quick controls to be horizontal and relocate them to the bottom of the screen. When the side panel is collapsed, instead of appearing vertically on the left, the sliders for Speed, Distance, and Pitch will appear in a new horizontal container positioned above the main playback controls (time scrubber, play/pause, etc.).
  - **Scope:**
    -   Create a new horizontal container for the quick controls that is only visible when the side panel is collapsed.
    -   Modify `UIManager.js` to move the Speed, Distance, and Pitch sliders to this new bottom container instead of the left-side vertical container.
    -   Remove the logic for applying the `.vertical-slider` class.
    -   Update CSS to style the new container and ensure the sliders within it are horizontal and visually consistent with the main time scrubber.
    -   Increase the width of all bottom sliders (the new three plus the existing time scrubber) to approximately 85% of the screen width to allow for more precise user control.

### File Management

- **[FEATURE] Download GPX(s) with Enrichment and Smart Naming:**
  - **Problem:** Users need to download the currently loaded GPX route, including any elevation data enriched by the application, and with a descriptive filename.
  - **Solution:** Implement a feature to allow users to download the active GPX route. The downloaded file will incorporate Cesium-sampled elevation data if the original GPX was 2D. The filename will be automatically generated to be descriptive and useful.
  - **Scope:**
    -   **Download Target:** The currently active GPX route displayed in the application.
    -   **Enrichment:** If the original GPX lacked elevation data, the downloaded file will include the elevation data sampled from Cesium World Terrain.
    -   **File Format:** A single `.gpx` file.
    -   **File Naming:** The filename will combine the route's start timestamp (in local time, if available) and the route's name (derived from the original file or URL). For example: `YYYY-MM-DD-HHmm_RouteName.gpx`.
  - **Implementation Notes:**
    -   **`GpxGenerator.js` (New Module):** Create a dedicated module to construct a GPX XML string from in-memory route point data (latitude, longitude, elevation, time). This module will handle converting the processed data back into a valid GPX format.
    -   **`FilenameGenerator.js` (Existing Backlog Item - Refine Scope):** This module will be responsible for generating the filename. It will take route data as input and apply the logic to include the start timestamp and route name.
    -   **`UIManager.js`:** Add a "Download GPX" button to the UI (e.g., in the Route Stats or a new Route Actions section) and wire up an `onDownloadGpx` callback.
    -   **`app.js`:** Orchestrate the download process. It will:
        1.  Retrieve the currently loaded, *enriched* route points from memory.
        2.  Call `GpxGenerator.generateGpxString()` to get the file content.
        3.  Call `FilenameGenerator.generate()` to get the filename.
        4.  Use browser APIs (`Blob`, `URL.createObjectURL`) to trigger the download.

### Interactive Elevation Chart

- **[EPIC] Interactive Elevation Chart:**
  - **[FEATURE] Render Chart:** Use a charting library to draw the elevation profile.
  - **[FEATURE] Live Position Indicator:** Sync a marker on the chart with the tour playback.
  - **[FEATURE] Chart-to-Map Sync:** Allow clicking/scrubbing on the chart to move the person on the 3D map.

### Code Architecture

- **[REFACTOR] Filename Generator Module:** Create a dedicated `FilenameGenerator.js` module to encapsulate the logic for constructing the suggested filename. This will make the logic more maintainable and easier to extend in the future.
- **[Superseded][REFACTOR] Smoothed Camera Velocity:** Implement a moving average on the position data to calculate a smoother velocity vector for the camera to follow. **This item is now part of the "Camera Strategy Framework and Cinematic Camera" Epic.**

---

### Completed Items

- **[EPIC] Camera Strategy Framework and Cinematic Camera:**
  - **[REFACTOR] Camera Strategy Framework:** Refactored all camera logic into a modular framework with a central `CameraController` and strategy-specific classes. This resolved numerous state management and camera control bugs.
  - **[REFACTOR] Overhead & Third-Person Camera Strategies:** Migrated the existing interactive cameras into the new framework, stabilizing their behavior by using a consistent `onTick` update loop.
  - **[FEATURE] Cinematic Camera Strategy:** Implemented a new, sophisticated cinematic camera based on a `lookAt` design. It uses a multi-phase pre-calculation pipeline to generate a smooth, anticipatory camera path with an EMA-weighted look-ahead target.
  - **[FEATURE] Cinematic Camera Tuning:** Exposed new parameters (`Gaze Smoothing`, `Path Density`) to the UI to allow for fine-tuning of the cinematic camera's behavior.
  - **[FIX] Time Scrubber Reset:** Fixed a bug where the time scrubber UI would not reset to zero when a tour was stopped or reset.

- **[EPIC] Performance Tuning & Debugging:**
  - **[FEATURE] Intelligent Performance Tuning:** Rearchitected the `PerformanceTuner` to be configuration-driven. The new system uses a target FPS to throttle the engine and a dynamic quality ceiling for each profile ('Performance', 'Balanced', 'Power Saver') to intelligently balance frame rate and power consumption, preventing resource over-utilization on high-end hardware.
- **[UI/UX] Remove "Top-Down" Camera Strategy:**
  - **Reason:** The "Top-Down" camera strategy provides a view that can be replicated by setting the manual pitch control to -90° in other camera modes (like "Overhead"). Removing this redundant strategy simplifies the camera selection UI.
  - **Scope:**
    -   **`index.html`:** Remove the "Top-Down" `<option>` from the camera strategy `<select>` element.
    -   **`TourController.js`:** Remove the "top-down" case from the camera strategy implementation logic.
    -   **Documentation:** Update `DESIGN.md` and other relevant documents to reflect the removal of this strategy.

- **[EPIC] Configuration and UI Refactoring:** A foundational refactoring to centralize all application settings, enabling new features like URL-based configuration and enhancing maintainability. This epic also includes a significant UI overhaul for how statistics are presented.
  - **[REFACTOR] Centralize Parameters and Constants:** Created a new `SettingsManager.js` module to act as a single source of truth for all configurable parameters, removing hard-coded values from other modules.
  - **[FEATURE] Make Parameters Configurable via URL:** Extended the `SettingsManager` to parse URL query parameters, allowing users to share links that pre-configure the application state (e.g., camera, speed).
  - **[FEATURE] Consolidated Statistics Overlay:** Rearchitected the UI to display all route statistics (both static and live) in a new, consolidated overlay layer (HUD), replacing the traveler billboard label and the stats section of the side panel.
  - **[FEATURE] Configurable Smoothing Factor:** Exposed the number of points used for the moving average calculation as a user-configurable parameter via the UI (`--/-/+/++` buttons) and the new settings manager.
  - **[REFACTOR] Refined Performance Tuner Logic:** Modified the `PerformanceTuner` to be active *only* during `TOUR_PLAYING` state. When playback stops, rendering quality reverts to a default high-quality preset.
- **[EPIC] Performance Analysis & Simulation:** Implemented a comprehensive analysis suite for route planning and post-activity review.
  - **[FEATURE] Detailed Statistics:** Calculates and displays total distance, elevation gain, Km-effort, Est. Calories, Planned Time, and for timestamped routes, Total Duration and Average Speed/Vertical Speed.
  - **[FEATURE] Live Performance Dashboard:** The traveler label now shows a rich, context-aware dashboard. For timestamped routes, it displays a real-time "Actual vs. Planned" comparison for Speed, Vertical Speed, and Km-effort Rate.
  - **[FEATURE] Simulation & Planning:** Added an "Athlete Profile" for user-input targets (weight, speed, etc.). The application now generates a full performance plan for routes without timestamps, including a variable-speed timeline based on a simplified Tobler's hiking function.
  - **[FEATURE] Refuel Markers:** Displays markers on the route at projected calorie expenditure intervals.
  - **[REFACTOR] Advanced Smoothing:** Replaced initial instantaneous calculations with a smoother, more accurate Exponential Moving Average (EMA) for all live rate metrics (`Speed`, `V.Speed`, `Km-e Rate`).
  - **[REFACTOR] Standardized Architecture:** Refactored the analysis pipeline for robustness, renamed `TimeSimulator` to `PerformancePlanner`, and standardized terminology (`Target`/`Planned`/`Estimated`) across the codebase.

- **[REFACTOR] Persistent & Robust Elevation Enrichment:**
  - **Problem:** When the app enriches a 2D GPX file with elevation data, this data is not saved. It must be re-fetched on every load, which is inefficient. Furthermore, the "Download GPX" feature would not have access to this enriched data if it's not in memory.
  - **Solution (Hybrid Approach):** Refactor the enrichment process to be persistent. When elevation is fetched for a route, generate a new, complete 3D GPX string and overwrite the primary `gpxString` in `localStorage`, while preserving the original 2D data in a separate field for archival purposes.
  - **Scope:**
    -   **`RouteStorage.js` Schema:** Add a new optional field to the route record schema: `originalGpxString`.
    -   **`app.js` - Route Loading:** When a new 2D route is added via file or URL, its content should be stored in both `gpxString` and `originalGpxString`.
    -   **`app.js` - Enrichment Workflow:**
        1. When `enrichAndRenderRoute` successfully fetches elevation, it must use a (to-be-created) `GpxGenerator` to build a new, complete 3D GPX string from the enriched points.
        2. It will then call `RouteStorage.updateRoute()` to overwrite the main `gpxString` with the new 3D version. `originalGpxString` will remain untouched.
        3. The app's logic will no longer need a special `hasEnrichedElevation` flag; it can simply check if the parsed `gpxString` contains elevation on load.
    -   **Benefits:** This makes the "Download GPX" feature work seamlessly (it just serves the `gpxString`) and makes subsequent loads of the route much faster, while still preserving the original user-uploaded file.
- **[FEATURE] Robust Elevation Enrichment with Graceful Degradation:**
  - **Problem:** The current elevation enrichment process fails silently if the Cesium terrain service is unavailable, simply resetting the app. This is a poor user experience.
  - **Solution:** Implement a "graceful degradation" approach. If the elevation fetch fails, the app should notify the user and proceed to render the route clamped to the ground, rather than resetting.
  - **Scope:**
    -   In `app.js`, modify the `catch` block within the `enrichAndRenderRoute` method.
    -   On failure, display a non-blocking notification to the user (e.g., a toast message) explaining that elevation data could not be loaded.
    -   Proceed to render the 2D route by calling `renderRoute` with the original points (which will be clamped to the ground).
    -   While in this degraded state, programmatically disable the "Clamp to Ground" checkbox in the UI to prevent the user from un-checking it, which would cause rendering issues for a 2D route.
    -   Ensure the "Clamp to Ground" checkbox is re-enabled when a new, valid route is loaded.
- **[FEATURE] Manual Pitch Control:** Added a slider to allow the user to manually adjust the camera's pitch angle during the tour for most camera strategies.
- **[UI/UX] Increased Max Zoom:** Increased the maximum camera distance from 20,000 meters to 50,000 meters.
- **[FEATURE] Shareable URLs:** Implemented logic to read a `route_id` or a `url` URL parameter on page load, automatically selecting and loading the specified route. This allows sharing of both pre-packaged and ad-hoc URL routes.
- **[FEATURE] GPX Coordinate Precision Reduction:** Implemented a function in `RouteStorage.js` that reduces the decimal precision of latitude, longitude, and elevation values within the `gpxString` before saving to `localStorage`. This significantly reduces the storage footprint with negligible impact on visual accuracy.
- **[REFACTOR] Storage-First Architecture:** Re-architected the application to use a "storage-first" model. All routes, regardless of source (file, URL, static), are now managed by a central `RouteStorage.js` module that uses `localStorage` for persistence. This decouples data acquisition from rendering and is the foundation for multi-route management.
- **[FEATURE] Route Library & Selector:** Implemented a `<select>` dropdown in the UI that lists all routes available in `RouteStorage`. This is now the primary mechanism for loading routes.
- **[FEATURE] Load GPX from Public URL:** Added a text input and "Load" button to the UI, allowing users to add a new route to the library from a public URL.
- **[FEATURE] Pre-packaged Route Loading:** The application now reads one or more `manifest.json` files to discover and pre-populate the route library with a set of static, pre-packaged GPX files on first load.
- **[REFACTOR] Unified Data Flow:** Refactored the file-picker and new URL loader to follow the storage-first model: they now add the new GPX data to `RouteStorage` and then automatically select it in the library dropdown to trigger loading, rather than rendering it directly.
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

- **[UI/UX] Unified Bottom Panel for Stats and Tour Controls:**
  - **Problem:** Stats overlay and tour controls were separate, overlapping panels.
  - **Solution:** Restructured the DOM and CSS to place both into a single, cohesive bottom container, managed by JavaScript, preventing overlap and enhancing visual consistency.
- **[UI/UX] Compact Stats Display Refinements:**
  - **Solution:** Reworked "Route Stats" and "Replay Stats" content for improved compactness and readability:
    -   Moved key summary figures (e.g., Distance, Elevation, Calories, Km-effort, Elapsed Time) to section headers, including consistent icons (↔️, ▲, 🔥, 👟, ⏱️).
    -   Transposed "Replay Stats" table.
    -   Standardized font sizes (13px) and weights (normal) for all metric labels and values across both stats sections.
    -   Implemented responsive unit display (units hidden on mobile devices to save space).
    *   Expanded clickable area for stats section toggles to include summary metrics, improving usability.
- **[FIX] "Actual" Time NaN in Route Stats:**
  - **Problem:** 'Actual' time in Route Stats displayed 'NaN' when a route had native timestamps.
  - **Solution:** Corrected the `updateRouteStats` method to remove an erroneous `_formatTime()` wrapper around `stats.totalDurationString`, ensuring correct time display.
- **[FIX] Smoothing Factor Controls Functional:**
  - **Problem:** The UI controls for adjusting the smoothing factor were unresponsive.
  - **Solution:** Verified and ensured all UI elements, `SettingsManager` subscriptions, and `app.js` recalculation triggers were correctly wired, restoring functionality.
- **[FEATURE] POI Icons Clamped to Ground:**
  - **Problem:** POI icons/labels floated at a constant height above the terrain, appearing disconnected.
  - **Solution:** Modified `PoiService.js` to remove hardcoded altitude and correctly apply `heightReference: Cesium.HeightReference.CLAMP_TO_GROUND` to both POI billboards and labels, ensuring they are visually attached to the ground.
- **[FEATURE] Replay Stats Show Accumulated Values at Tour End:**
  - **Problem:** Replay stats displayed zero or inconsistent values when the tour reached its end point.
  - **Solution:** Modified `app.js`'s `postRender` listener to detect tour completion (100% progress) and, at that point, display the final, cumulative values from the last point of the route analysis, providing a meaningful summary.