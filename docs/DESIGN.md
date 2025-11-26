# Design Document

## 1. Introduction

This document provides the technical design and architecture for the GPX 3D Player. It is based on the specifications outlined in the [Requirements Document](./REQUIREMENTS.md).

## 2. System Architecture

The application is a purely client-side, single-page application (SPA) that runs entirely in the web browser. No backend server is required for application logic.

### 2.1. Core Technologies

*   **3D Rendering Engine:** **CesiumJS** is the cornerstone of the application.
*   **GPX Parsing:** The lightweight **`gpxparser`** library is used.
*   **UI:** The UI is constructed with **plain HTML, CSS, and modern JavaScript**. All icons are high-quality, inline **SVG** for a professional look and feel.
*   **Modularity:** All JavaScript code is structured using **ES6 Modules** (`import`/`export` syntax) to ensure a clean, maintainable, and scalable architecture.
*   **Logging:** A custom `Logger.js` module prepends timestamps to all console messages.

### 2.2. State Machine Architecture

The application's logic is governed by a formal state machine implemented in the main `App` class. This ensures predictable, robust, and bug-free transitions between different application modes.

The core states are:
*   `NO_ROUTE`: The initial state. No GPX file has been loaded.
*   `LOADING`: A GPX file is being parsed, or elevation data is being fetched.
*   `ROUTE_LOADED`: A route is loaded and displayed, but the tour is not playing. The user can scrub the timeline in this state.
*   `TOUR_PLAYING`: The cinematic tour is actively playing.
*   `TOUR_PAUSED`: The tour is paused at a specific point in time.

All state changes are managed by a single `App.setState(newState)` method, which acts as the single source of truth for all UI and logical transitions.

### 2.3. External Services

The application relies on several external APIs:
*   **Terrain and Elevation:** **Cesium World Terrain** is used for 3D terrain and for enriching 2D GPX files.
*   **Points of Interest (POI):** The **OpenStreetMap Overpass API** is queried to find relevant POIs near the loaded route.
*   **Reverse Geocoding:** A free, public reverse geocoding service (Nominatim) is used to generate descriptive filenames.

### 2.4. Mobile Responsiveness

The application is designed to be mobile-first.
*   **Custom Tour Controls:** On mobile devices, the default Cesium widgets are hidden. They are replaced by a custom, touch-friendly control bar at the bottom of the screen, featuring large SVG icon buttons and a high-granularity scrubber.
*   **Collapsible Panel & Quick Controls:** The main side panel can be collapsed. When collapsed, vertical sliders for Speed and Zoom appear on the left, allowing for quick adjustments without obscuring the view.
*   **Performance Optimizations:** Expensive terrain features are disabled on mobile, and `resolutionScale` is adjusted for high-DPI screens.

## 3. Component Design

### 3.1. `App` (Main Controller & State Machine)
*   **Description:** The central orchestrator of the application and manager of the state machine.
*   **Responsibilities:**
    *   Initializes all other components.
    *   Manages the application state via the `setState()` method.
    *   Handles the main event flow by wiring up callbacks from the `UIManager` to the appropriate controllers and state transitions.
    *   The `handleResetStyle()` method has been corrected to only reset style-related properties, and no longer interferes with camera state, preventing disruptive side effects during tour playback.
    *   Contains the `postRender` listener, which is the single source of truth for updating time-based UI elements (labels, displays) during playback.

### 3.2. `UIManager`
*   **Description:** Manages all interactions with the DOM.
*   **Responsibilities:**
    *   Holds references to all interactive DOM elements.
    *   Initializes all UI event listeners.
    *   Manages the logic for the collapsible side panel via `collapsePanel()` and `expandPanel()` methods, which are called by the panel's click handler and can be called programmatically (e.g., to auto-collapse on tour start).
    *   Provides a single `updateUIForState(state)` method that shows/hides all relevant UI sections based on the current application state. This method now ensures the custom tour controls are always visible when a route is loaded, regardless of device type.
    *   Provides methods to update the state of custom controls (e.g., `setPlayPauseButtonState`, `setPoiButtonState`) by toggling CSS classes, which in turn control the visibility of different SVG icons.

### 3.3. `TourController`
*   **Description:** Manages the logic for preparing and controlling the cinematic tour.
*   **Responsibilities:**
    *   `prepareTour()`: The main setup method. It populates the `SampledPositionProperty`, configures the Cesium `Clock`, and initializes all listeners. This is called once when a route is loaded. The UI tick listener is now managed independently here to prevent it from being destroyed by camera changes.
    *   `startTour()`: A simple method that begins or resumes animation by setting `viewer.clock.shouldAnimate = true` and re-initializes listeners.
    *   `pauseTour()`: A simple method that pauses animation.
    *   `stopTour()`: A critical state transition method. It stops the clock, cleans up all tour-related listeners, and most importantly, explicitly restores the camera to its default interactive state by calling `viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)`. This prevents camera "lockout" issues.
    *   `setCameraDistance()`: Now only updates the `cameraDistance` property. The active camera listener is responsible for reading this value on each frame, preventing the need to tear down and rebuild the camera strategy just to change the zoom level.
    *   Manages the selection and application of different camera strategies.

### 3.4. `SpeedController`
*   **Description:** A dedicated class to manage all aspects of tour playback speed and direction.
*   **Responsibilities:**
    *   Calculates a "smart" default speed to target a consistent tour duration.
    *   Handles relative speed adjustments from the UI slider.
    *   Manages the playback direction (1 for forward, -1 for backward) and provides a `toggleDirection()` method.
    *   Applies the final calculated speed and direction to the Cesium `Clock` multiplier.

### 3.5. `Person` & Other Services
*   `PoiService`: Now uses a robust fallback strategy (`name`, `name:en`, `alt_name`, `old_name`) to find a valid name for POIs, significantly reducing the number of "Unnamed" features. It also manages a static list of fetched POI data (`_poiData`) and provides methods to access and clear this data.
*   `PerformanceTuner`: A new module responsible for managing all rendering quality and performance settings. See section 7 for details.
*   `RouteStorage`: A new service responsible for abstracting all interactions with `localStorage`, providing a simple API to add and retrieve route records.
*   Other components remain as previously designed, providing specific, modular functionalities.

## 4. Data Acquisition & Storage Architecture (Storage-First Design)

To support multi-route management and persistence, the application is designed with a "storage-first" architecture. All GPX data, regardless of its source, is funneled through a unified `localStorage` layer before being rendered. This decouples data acquisition from data presentation.

### 4.1. Data Sources
The application supports three primary sources for GPX data:
1.  **Static Pre-packaged Routes:** The application can be seeded with a list of official routes from a `/gpx/` directory. This is planned for a future iteration.
2.  **User File Upload:** The user can select a `.gpx` file from their local system using a standard file input.
3.  **URL Input:** The user can load a route from a public URL, either via a UI text input or a `gpx_url` query parameter on page load.

### 4.2. The `RouteStorage` Service
*   **Description:** A static class that acts as the sole interface for interacting with the browser's `localStorage`.
*   **Responsibilities:**
    *   Manages an array of "route records" under a single `localStorage` key (`gpx_route_library`).
    *   Provides an `addRoute()` method that takes raw GPX data and metadata, creates a new route record object with a unique ID, and saves it. Before saving, it reduces the coordinate precision of the `gpxString` to 6 decimal places for lat/lon and 2 for elevation to optimize storage.
    *   Provides a `getRoutes()` method to retrieve the complete list of all saved route records.

### 4.3. The Route Record Schema
Each route is stored as a simple object with the following structure:
```javascript
{
  id: 'gpx/simathehiker/Tour+du+Mont+Blanc+(TMB).gpx', // Unique ID
  name: 'My Favorite Hike',    // A user-editable name
  sourceType: 'file',         // 'file', 'url', or 'static'
  source: 'hike.gpx',         // The original filename or URL
  gpxString: '<xml>...</xml>', // The raw, original GPX content
  createdAt: '2025-11-12T19:30:05.000Z',
}
```
The `id` is generated based on the `sourceType`:
- For `static` and `url` routes, the `id` is the `source` URL itself, providing a stable, shareable identifier.
- For `file` routes, the `id` is a `crypto.randomUUID()` since filenames are not guaranteed to be unique.

The need for data enrichment (e.g., elevation, POIs) is determined on-the-fly when a route is loaded for rendering, rather than being tracked by a separate flag.

## 5. Data Flow

The application's data flow follows the storage-first model.

1.  **Acquisition:** The user provides a GPX file via file upload or URL input.
2.  **Processing:** The `App` controller receives the raw `gpxString`. It calls `RouteStorage.addRoute()` to create and save a new route record.
3.  **Parsing & Rendering:** The `App` immediately takes the `gpxString` from the newly created record and passes it to the rendering pipeline (`_processGpxData` -> `renderGpx`).
4.  **(Future) Library-based Loading:** In a future iteration, the flow will be enhanced. Instead of immediate rendering, adding a route will simply update a "Route Library" UI. The user will then explicitly select a route from this library to trigger the rendering process.

## 6. Camera Strategy Architecture

The `TourController` manages a dictionary of camera strategy functions. When a strategy is selected, the `_applyCameraStrategy` method is called, which first calls `_cleanupCamera` to remove any previous listeners, then executes the function for the newly selected strategy.

### 6.1. Third-Person Follow
*   **Implementation:** A listener on the `viewer.clock.onTick` event that uses `viewer.camera.lookAt()`.

### 6.2. Overhead Orbit
*   **Implementation:** A listener on the `viewer.scene.postUpdate` event. The heading is calculated based on the tour's percentage complete to ensure a smooth, full rotation.

## 7. Performance Tuning Architecture

To ensure a smooth user experience across a wide range of devices, the application features a sophisticated automatic performance tuning system.

### 7.1. On-Demand Rendering
The application initializes the Cesium Viewer with `requestRenderMode: true`. This is a fundamental change that stops the default continuous render loop. A new frame is now only rendered when explicitly requested via a call to `viewer.scene.requestRender()`. This dramatically reduces CPU/GPU usage when the application is idle. All functions that cause a visual change (e.g., updating a style, scrubbing the timeline, toggling visibility) now conclude with a `requestRender()` call.

### 7.2. `PerformanceTuner` Module
A new `PerformanceTuner.js` module encapsulates all performance-related logic. It is designed as an "autopilot" for performance.

#### 7.2.1. Performance Profiles (The Goal)
The user is presented with a single, simple "Performance Profile" selector in the UI, which defines their desired experience:
*   **`Prioritize Speed`:** Aims for the highest possible frame rate.
*   **`Balanced`:** Aims for a smooth frame rate with good visual quality.
*   **`Prioritize Quality`:** Aims for the best possible visual quality, even at a lower frame rate.

Each profile corresponds to a target FPS range (e.g., 30-45 FPS for "Balanced"), which is defined in a central `TUNING_CONFIG` object.

#### 7.2.2. Quality Presets (The Tools)
The `PerformanceTuner` contains a private, ordered array of quality "presets". This array acts as a granular "ladder" of quality levels, from lowest to highest. Each preset is a collection of concrete rendering settings (e.g., `resolutionScaleFactor`, `maximumScreenSpaceError`, `fxaa`).

#### 7.2.3. The Monitor-Analyze-Act Loop
The core of the auto-tuner is a feedback loop that runs continuously:
1.  **Monitor:** A `postRender` event listener accurately measures the average FPS over a set interval (e.g., every 1-2 seconds).
2.  **Analyze:** The measured FPS is compared against the target range of the user's currently selected Performance Profile.
3.  **Act:**
    *   If the FPS is below the target range, the tuner moves down the quality ladder by applying a lower-quality preset.
    *   If the FPS is above the target range, the tuner moves up the quality ladder by applying a higher-quality preset.
    *   A "debounce" delay is used to prevent the settings from changing too frequently.

This system ensures that the application always tries to deliver the best possible visual quality while respecting the user's stated performance goals.

### 7.3. UI Controls
The "Performance" section in the side panel has been simplified to a single dropdown menu to select the desired "Performance Profile". All granular controls have been removed to provide a cleaner, more user-friendly experience.

## 8. Route Visualization

### 8.1. Corridor for Clamped Routes
To improve the visibility of routes that are clamped to the ground, the `updateRouteStyle` function was modified.
*   When "Clamp to Ground" is enabled, the route is now rendered as a `Cesium.CorridorGeometry`. This creates a wide, flat ribbon on the terrain surface, which is much more prominent and easier to see than a thin polyline.
*   The width of the corridor is derived from the "Route Width" UI setting.
*   When "Clamp to Ground" is disabled, the route is rendered using the original 3D `polyline` to accurately represent elevation changes.
*   The `renderRoute` function was updated to be robust, correctly calculating the bounding sphere from either a `corridor` or a `polyline` entity.

## 9. Shareable URLs

To allow users to easily share links to specific routes, the application automatically updates the browser's URL when a route is loaded.

### 9.1. URL Parameters
Two URL parameters are used to load routes:
*   `?route_id=...`: Used for pre-packaged "static" routes that are part of the application's built-in library.
*   `?url=...`: Used for routes loaded from an external URL.

### 9.2. Implementation
*   A private `_updateShareableUrl(route)` method in the `App` class is the central point for all URL updates.
*   This method is called from `renderRoute()` whenever a route is successfully loaded, and from `clearRoute()` to remove the parameters when no route is active.
*   It uses the `window.history.pushState()` API to update the URL in the address bar without causing a page reload.
*   The logic correctly distinguishes between `static` and `url` routes to generate the appropriate URL parameter.
*   Routes loaded from local files (`sourceType: 'file'`) are not shareable, so the URL parameters are cleared when they are active.

## 10. Manual Pitch Control

To give users more control over the camera, a manual pitch control feature has been implemented.

### 10.1. UI Control
*   A new "Pitch" slider has been added to the "Camera" section of the side panel.
*   The slider has a range from -90° (looking straight down) to 0° (looking at the horizon).
*   When the side panel is collapsed, the pitch slider moves to the "quick controls" area on the left and becomes a vertical slider.

### 10.2. Implementation
*   The `UIManager` has been updated to manage the new slider, including its movement between the side panel and the quick controls.
*   A new `onSetCameraPitch` callback has been added to the `UIManager` to communicate the slider's value to the `App` controller.
*   The `TourController` has a new `cameraPitch` property to store the current pitch value.
*   The camera strategy functions in the `TourController` have been updated to use the `cameraPitch` property when calculating the camera's orientation.

### 10.3. Strategy-Specific Behavior
*   The pitch control is enabled for the "Overhead" and "Third-Person" camera strategies.