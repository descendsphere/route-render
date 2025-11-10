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
    *   Provides a single `updateUIForState(state)` method that shows/hides all relevant UI sections based on the current application state.
    *   Provides methods to update the state of custom controls (e.g., `setPlayPauseButtonState`) by toggling CSS classes, which in turn control the visibility of different SVG icons.

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
*   `PoiService`: Now uses a robust fallback strategy (`name`, `name:en`, `alt_name`, `old_name`) to find a valid name for POIs, significantly reducing the number of "Unnamed" features.
*   Other components remain as previously designed, providing specific, modular functionalities.

## 4. Data Flow (State-Driven)

1.  **User selects a GPX file.** (`UIManager`)
2.  `App` transitions to `LOADING` state.
3.  `App` parses the file. If needed, it enriches the data with elevation.
4.  `App` calls `renderRoute`, which draws the polyline and then calls `tourController.prepareTour()`.
5.  `App` transitions to `ROUTE_LOADED` state. The UI updates to show all controls. The tour is now ready for playback or scrubbing.
6.  **User clicks "Play"**: `App` transitions to `TOUR_PLAYING`. The `setState` logic calls `tourController.startTour()`.
7.  **User clicks "Pause"**: `App` transitions to `TOUR_PAUSED`. The `setState` logic calls `tourController.pauseTour()`.
8.  **User clicks "Reset"**: `App` transitions to `ROUTE_LOADED`. The `setState` logic calls `tourController.stopTour()` and resets the UI.
9.  **User scrubs timeline**: The `onCustomScrub` handler in `App` calls `tourController.seek()`, which updates the clock time. The handler then manually updates the UI time displays, as the `postRender` listener is not active in the `ROUTE_LOADED` state.

## 5. Camera Strategy Architecture

The `TourController` manages a dictionary of camera strategy functions. When a strategy is selected, the `_applyCameraStrategy` method is called, which first calls `_cleanupCamera` to remove any previous listeners, then executes the function for the newly selected strategy.

### 5.1. Third-Person Follow
*   **Implementation:** A listener on the `viewer.clock.onTick` event that uses `viewer.camera.lookAt()`.

### 5.2. Top-Down Tracking
*   **Implementation:** A single call to `viewer.camera.setView()`. The camera does not move during the tour.

### 5.3. Overhead Orbit
*   **Implementation:** A listener on the `viewer.scene.postUpdate` event. The heading is calculated based on the tour's percentage complete to ensure a smooth, full rotation.