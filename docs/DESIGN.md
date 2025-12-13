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

## 3. Performance Analysis Architecture

A key feature of the application is its ability to perform detailed performance analysis. This is achieved through a multi-stage data pipeline orchestrated by the `App` class.

### 3.1. The Data Pipeline
The core principle is that raw geometric data is sequentially "enriched" by a series of pure, modular calculators.

1.  **`StatisticsCalculator.calculate()`:** This is the first stage. It takes the raw points from the GPX file and calculates fundamental geometric properties for each point: `cumulativeDistance`, `cumulativeElevationGain`, and `cumulativeKmEffort`.
2.  **`StatisticsCalculator.analyzePerformance()`:** If the route has native timestamps, this second stage is run. It takes the data from the previous step and adds detailed *actual* performance metrics, including `overallAverageSpeed` and, most importantly, a smoothed `actualSmoothedSpeedKmh`, `actualSmoothedElevationRate`, and `actualSmoothedKmEffortRate` for each point using an **Exponential Moving Average (EMA)**.
3.  **`EnergyCalculator.calculateEnergyProfile()`:** This third stage takes the (potentially performance-analyzed) data and adds user-specific energy metrics, calculating the `cumulativeKcal` for each point based on the user's weight.
4.  **`PerformancePlanner.planPerformanceProfile()`:** This final stage takes the data from all previous steps and runs a simulation based on the user's "Target" parameters. It generates a new timeline (`projectedTime`) and calculates the *planned* performance metrics, including an EMA-smoothed `plannedSmoothedSpeed`, `plannedSmoothedElevationRate`, and `plannedSmoothedKmEffortRate`.

The final output is a single, unified `tourData` array where each point contains the complete set of all geometric, actual, and planned metrics. This unified data object is then used as the single source of truth for both the UI and the tour playback, ensuring consistency.

### 3.2. Key Modules
*   **`StatisticsCalculator.js`:** Responsible for all objective analysis of the route's geometry and (if available) the recorded performance from timestamps.
*   **`EnergyCalculator.js`:** Responsible for all energy-related estimations based on physical data and user-specific inputs (e.g., weight).
*   **`PerformancePlanner.js`:** Responsible for all forward-looking simulations and "what-if" scenarios based on user-specific performance targets.

## 4. Component Design

### 4.1. `App` (Main Controller & State Machine)
*   **Description:** The central orchestrator of the application and manager of the state machine.
*   **Responsibilities:**
    *   Initializes all other components.
    *   Manages the application state via the `setState()` method.
    *   Handles the main event flow by wiring up callbacks from the `UIManager` to the appropriate controllers and state transitions.
    *   The `handleResetStyle()` method has been corrected to only reset style-related properties, and no longer interferes with camera state, preventing disruptive side effects during tour playback.
    *   Contains the `postRender` listener, which is the single source of truth for updating time-based UI elements (labels, displays) during playback and handles freezing replay stats to cumulative values at the tour's end.

### 4.2. `UIManager`
*   **Description:** Manages all interactions with the DOM.
*   **Responsibilities:**
    *   Holds references to all interactive DOM elements.
    *   Initializes all UI event listeners, including fully wired and functional smoothing factor controls.
    *   Manages the logic for the collapsible side panel via `collapsePanel()` and `expandPanel()` methods, which are called by the panel's click handler and can be called programmatically (e.g., to auto-collapse on tour start).
    *   Provides a single `updateUIForState(state)` method that shows/hides all relevant UI sections based on the current application state. This method now ensures the custom tour controls and the stats overlay (within the unified bottom panel) are always visible when a route is loaded, regardless of device type.
    *   Provides methods to update the state of custom controls (e.g., `setPlayPauseButtonState`, `setPoiButtonState`) by toggling CSS classes, which in turn control the visibility of different SVG icons.

### 4.3. `TourController`
*   **Description:** Manages the logic for preparing and controlling the cinematic tour.
*   **Responsibilities:**
    *   `prepareTour()`: The main setup method. It populates the `SampledPositionProperty`, configures the Cesium `Clock`, and initializes all listeners. This is called once when a route is loaded. The UI tick listener is now managed independently here to prevent it from being destroyed by camera changes.
    *   `startTour()`: A simple method that begins or resumes animation by setting `viewer.clock.shouldAnimate = true` and re-initializes listeners.
    *   `pauseTour()`: A simple method that pauses animation.
    *   `stopTour()`: A critical state transition method. It stops the clock, cleans up all tour-related listeners, and most importantly, explicitly restores the camera to its default interactive state by calling `viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)`. This prevents camera "lockout" issues.
    *   `setCameraDistance()`: Now only updates the `cameraDistance` property. The active camera listener is responsible for reading this value on each frame, preventing the need to tear down and rebuild the camera strategy just to change the zoom level.
    *   Manages the selection and application of different camera strategies.

### 4.4. `SpeedController`
*   **Description:** A dedicated class to manage all aspects of tour playback speed and direction.
*   **Responsibilities:**
    *   Calculates a "smart" default speed to target a consistent tour duration.
    *   Handles relative speed adjustments from the UI slider.
    *   Manages the playback direction (1 for forward, -1 for backward) and provides a `toggleDirection()` method.
    *   Applies the final calculated speed and direction to the Cesium `Clock` multiplier.

### 4.5. `Person` & Other Services
*   `PoiService`: Now uses a robust fallback strategy (`name`, `name:en`, `alt_name`, `old_name`) to find a valid name for POIs, significantly reducing the number of "Unnamed" features. POI entities (icons and labels) are now correctly clamped to the ground terrain. It also manages a static list of fetched POI data (`_poiData`) and provides methods to access and clear this data.
*   `EnergyCalculator`: A new module responsible for all user-specific energy estimations (e.g., calories) based on the route's physical properties and the user's weight.
*   `PerformancePlanner`: A new module responsible for all forward-looking simulations. It takes user targets (e.g., target speed) and generates a planned timeline and performance profile for the route.
*   `PerformanceTuner`: A new module responsible for managing all rendering quality and performance settings. See section 7 for details.
*   `RouteStorage`: A new service responsible for abstracting all interactions with `localStorage`, providing a simple API to add and retrieve route records.
*   Other components remain as previously designed, providing specific, modular functionalities.

## 5. Data Acquisition & Storage Architecture (Storage-First Design)

To support multi-route management and persistence, the application is designed with a "storage-first" architecture. All GPX data, regardless of its source, is funneled through a unified `localStorage` layer before being rendered. This decouples data acquisition from data presentation.

### 5.1. Data Sources
The application supports three primary sources for GPX data:
1.  **Static Pre-packaged Routes:** The application can be seeded with a list of official routes from a `/gpx/` directory. This is planned for a future iteration.
2.  **User File Upload:** The user can select a `.gpx` file from their local system using a standard file input.
3.  **URL Input:** The user can load a route from a public URL, either via a UI text input or a `gpx_url` query parameter on page load.

### 5.2. The `RouteStorage` Service
*   **Description:** A static class that acts as the sole interface for interacting with the browser's `localStorage`.
*   **Responsibilities:**
    *   Manages an array of "route records" under a single `localStorage` key (`gpx_route_library`).
    *   Provides an `addRoute()` method that takes raw GPX data and metadata, creates a new route record object with a unique ID, and saves it. Before saving, it reduces the coordinate precision of the `gpxString` to 6 decimal places for lat/lon and 2 for elevation to optimize storage.
    *   Provides a `getRoutes()` method to retrieve the complete list of all saved route records.

### 5.3. The Route Record Schema
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

## 6. Data Flow & Analysis Pipeline

The application's data flow is designed to be robust and linear, with a clear separation of concerns. All analysis is performed upfront when a route is loaded.

1.  **Acquisition:** The user provides a GPX file (via file upload, URL, or from the library). The raw GPX string is loaded into memory.
2.  **Base Calculation:** `renderRoute` calls `StatisticsCalculator.calculate()`. This creates the foundational `baseRouteStats` object and the `currentRouteAnalysisData` array, which contains the fundamental geometric properties of the route (`cumulativeDistance`, `cumulativeKmEffort`, etc.).
3.  **Orchestration:** `renderRoute` then calls `handleAnalysisUpdate()`, which orchestrates the main analysis pipeline.
4.  **Performance Analysis:** If the route has timestamps, `handleAnalysisUpdate` calls `StatisticsCalculator.analyzePerformance()`. This calculates overall averages and augments the data array with smoothed *actual* performance metrics (e.g., `actualSmoothedSpeedKmh`) using an EMA.
5.  **Energy Analysis:** `handleAnalysisUpdate` then calls `EnergyCalculator.calculateEnergyProfile()`, which takes the data from the previous step and adds `cumulativeKcal` to each point.
6.  **Planning Simulation:** `handleAnalysisUpdate` then calls `PerformancePlanner.planPerformanceProfile()`, which takes the data from the energy analysis and adds simulated metrics like `projectedTime` and `plannedSmoothedSpeed` (also using an EMA).
7.  **Finalization:** The final, fully-enriched data array is stored as `this.tourData`. This unified object is then used as the single source of truth for both updating all UI statistics and preparing the tour playback in `TourController`.

## 7. Camera Strategy Architecture

The `TourController` manages a dictionary of camera strategy functions. When a strategy is selected, the `_applyCameraStrategy` method is called, which first calls `_cleanupCamera` to remove any previous listeners, then executes the function for the newly selected strategy.

### 7.1. Third-Person Follow
*   **Implementation:** A listener on the `viewer.clock.onTick` event that uses `viewer.camera.lookAt()`.

### 7.2. Overhead Orbit
*   **Implementation:** A listener on the `viewer.scene.postUpdate` event. The heading is calculated based on the tour's percentage complete to ensure a smooth, full rotation.

## 8. Performance Tuning Architecture

To ensure a smooth user experience across a wide range of devices, the application features a sophisticated automatic performance tuning system.

### 8.1. On-Demand Rendering
The application initializes the Cesium Viewer with `requestRenderMode: true`. This is a fundamental change that stops the default continuous render loop. A new frame is now only rendered when explicitly requested via a call to `viewer.scene.requestRender()`. This dramatically reduces CPU/GPU usage when the application is idle. All functions that cause a visual change (e.g., updating a style, scrubbing the timeline, toggling visibility) now conclude with a `requestRender()` call.

### 8.2. `PerformanceTuner` Module
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

### 8.3. UI Controls
The "Performance" section in the side panel has been simplified to a single dropdown menu to select the desired "Performance Profile". All granular controls have been removed to provide a cleaner, more user-friendly experience.

## 9. Route Visualization

### 9.1. Corridor for Clamped Routes
To improve the visibility of routes that are clamped to the ground, the `updateRouteStyle` function was modified.
*   When "Clamp to Ground" is enabled, the route is now rendered as a `Cesium.CorridorGeometry`. This creates a wide, flat ribbon on the terrain surface, which is much more prominent and easier to see than a thin polyline.
*   The width of the corridor is derived from the "Route Width" UI setting.
*   When "Clamp to Ground" is disabled, the route is rendered using the original 3D `polyline` to accurately represent elevation changes.
*   The `renderRoute` function was updated to be robust, correctly calculating the bounding sphere from either a `corridor` or a `polyline` entity.

## 10. Shareable URLs

To allow users to easily share links to specific routes, the application automatically updates the browser's URL when a route is loaded.

### 10.1. URL Parameters
Two URL parameters are used to load routes:
*   `?route_id=...`: Used for pre-packaged "static" routes that are part of the application's built-in library.
*   `?url=...`: Used for routes loaded from an external URL.

### 10.2. Implementation
*   A private `_updateShareableUrl(route)` method in the `App` class is the central point for all URL updates.
*   This method is called from `renderRoute()` whenever a route is successfully loaded, and from `clearRoute()` to remove the parameters when no route is active.
*   It uses the `window.history.pushState()` API to update the URL in the address bar without causing a page reload.
*   The logic correctly distinguishes between `static` and `url` routes to generate the appropriate URL parameter.
*   Routes loaded from local files (`sourceType: 'file'`) are not shareable, so the URL parameters are cleared when they are active.

## 11. Manual Pitch Control

To give users more control over the camera, a manual pitch control feature has been implemented.

### 11.1. UI Control
*   A new "Pitch" slider has been added to the "Camera" section of the side panel.
*   The slider has a range from -90° (looking straight down) to 0° (looking at the horizon).
*   When the side panel is collapsed, the pitch slider moves to the "quick controls" area on the left and becomes a vertical slider.

### 11.2. Implementation
*   The `UIManager` has been updated to manage the new slider, including its movement between the side panel and the quick controls.
*   The slider's event listener in `UIManager` has been updated to call `SettingsManager.set()` directly, ensuring the value is updated in the central state.
*   The `TourController` has a new `cameraPitch` property to store the current pitch value.
*   The camera strategy functions in the `TourController` have been updated to use the `cameraPitch` property when calculating the camera's orientation.

### 11.3. Strategy-Specific Behavior
*   The pitch control is enabled for the "Overhead" and "Third-Person" camera strategies.

## 12. Application State and UI Architecture

To enhance maintainability and enable new features like URL-based configuration, the application's state management and UI architecture have been significantly refactored.

### 12.1. Centralized State Management (`SettingsManager`)

A new singleton module, `SettingsManager.js`, has been introduced as the **single source of truth** for all configurable parameters. This eliminates hard-coded constants and decentralized state that was previously scattered across multiple modules.

*   **Singleton Pattern:** The module exports a single, frozen instance, ensuring all parts of the application share the exact same state container.
*   **Schema-Driven:** A private `_settingsSchema` defines every parameter's `type`, `defaultValue`, validation rules (`min`, `max`, `options`), and whether it can be configured via a URL (`url: true`). This makes adding or modifying settings straightforward and self-documenting.
*   **Layered Loading:** On initialization, the manager first loads all default values from the schema, then immediately parses the browser's URL for any valid query parameters, which override the defaults. This provides a clean and predictable configuration hierarchy.
*   **Reactive API:** The manager provides a simple, reactive interface:
    *   `get(key)`: For synchronous retrieval of a setting's current value.
    *   `set(key, value)`: To update a setting. This method automatically validates the new value against the schema before storing it.
    *   `subscribe(key, callback)`: Allows any module to listen for changes to a specific setting and execute a callback function, enabling reactive updates throughout the application.

### 12.2. Reactive UI Architecture

The `UIManager` has been refactored to be a reactive component that synchronizes with the `SettingsManager`. This is achieved through a "UI Hydration" pattern and a clear separation of data flows.

*   **UI Hydration (`_initializeSettingsBasedUI`):** A new private method in `UIManager` is now responsible for populating the state of all UI elements. It runs once during initialization. For each settings-driven control, it performs two actions:
    1.  Sets the UI element's initial state (e.g., a slider's position) based on the value from `SettingsManager.get()`.
    2.  Subscribes to that setting via `SettingsManager.subscribe()` to ensure the UI element automatically updates if the setting is changed from any other source (e.g., a URL parameter).

*   **Two-Way Data Flow:** This creates two clear, decoupled data flows:
    1.  **UI -> State:** User interaction (e.g., moving a slider) triggers an event listener in `UIManager` which calls `SettingsManager.set()`.
    2.  **State -> UI:** A change in `SettingsManager` (from any source) triggers the subscription callback inside `UIManager`, which updates the specific UI element to reflect the new state.

*   **`StatsOverlay.js` Module:** The display of all route and performance statistics has been removed from the main side panel and the traveler's billboard label. This responsibility is now encapsulated in a new `StatsOverlay.js` module, which creates and manages a consolidated Heads-Up Display (HUD) that floats over the 3D view. It now features:
    *   **Compact Layout:** Key summary figures are displayed prominently in the section headers with icons.
    *   **Transposed Replay Stats Table:** The replay stats table has been transposed for better vertical space utilization, showing metrics as columns.
    *   **Responsive Units:** Units for metrics are dynamically hidden on mobile devices to prevent wrapping and save space.
    *   **Expanded Clickable Area:** The entire header area of each stats section is now clickable to toggle its collapsible content, improving usability.
    This simplifies the `app.js` and `UIManager` and provides a cleaner user experience.