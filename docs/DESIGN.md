# Design Document

## 1. Introduction

This document provides the technical design and architecture for the GPX 3D Route Renderer. It is based on the specifications outlined in the [Requirements Document](./REQUIREMENTS.md).

## 2. System Architecture

The application is a purely client-side, single-page application (SPA) that runs entirely in the web browser. No backend server is required for application logic.

### 2.1. Core Technologies

*   **3D Rendering Engine:** **CesiumJS** is the cornerstone of the application.
*   **GPX Parsing:** The lightweight **`gpxparser`** library is used.
*   **UI:** The UI is constructed with **plain HTML, CSS, and modern JavaScript**.
*   **Modularity:** All JavaScript code is structured using **ES6 Modules** (`import`/`export` syntax) to ensure a clean, maintainable, and scalable architecture. Each file represents a distinct module.
*   **Logging:** A custom `Logger.js` module prepends timestamps to all console messages.

### 2.2. External Services

The application relies on several external APIs:

*   **Terrain and Elevation:** **Cesium World Terrain**, a high-resolution global terrain dataset, is used for both 3D terrain visualization and for fetching elevation data for 2D GPX files.
*   **Points of Interest (POI):** The **OpenStreetMap Overpass API** is queried to find relevant POIs near the loaded route.
*   **Reverse Geocoding:** A free, public reverse geocoding service (Nominatim) is used to convert the start and end coordinates of the route into human-readable location names for the filename suggestion.

## 3. Component Design

The application is architected in a modular fashion, with distinct components responsible for specific functionalities.

### 3.1. `App` (Main Controller)
*   **Description:** The central orchestrator of the application.
*   **Responsibilities:**
    *   Initializes all other components (`UIManager`, `TourController`, etc.).
    *   Manages the overall application state (e.g., `currentPoints`).
    *   Handles the main event flow by wiring up callbacks from the `UIManager` to the appropriate controllers.

### 3.2. `UIManager`
*   **Description:** Manages all interactions with the DOM.
*   **Responsibilities:**
    *   Holds references to all interactive DOM elements.
    *   Initializes all UI event listeners (file input, buttons, sliders).
    *   Provides public methods for the `App` controller to update the UI (e.g., `updateStatsContent`, `showLoadingIndicator`).
    *   Provides public getter methods for the `App` controller to retrieve UI state (e.g., `getRouteColor`).
    *   Fires callbacks to notify the `App` controller of user actions.

### 3.3. `TourController`
*   **Description:** Manages the logic for the cinematic tour, camera strategies, and playback.
*   **Responsibilities:**
    *   Takes the `Person` entity as input.
    *   Populates a `Cesium.SampledPositionProperty` with the route's position and time data.
    *   Manages the Cesium `Clock` to control playback (start, stop, speed).
    *   Manages the selection and application of different camera strategies.
    *   Synthesizes timestamp data for GPX files that lack it, enabling playback for all valid tracks.

### 3.4. `SpeedController`
*   **Description:** A dedicated class to manage all aspects of tour playback speed.
*   **Responsibilities:**
    *   Calculates a "smart" default speed to target a consistent tour duration (e.g., 90 seconds).
    *   Handles relative speed adjustments from the UI slider.
    *   Applies the final calculated speed multiplier to the Cesium `Clock`.

### 3.5. `Person`
*   **Description:** Represents the moving entity that traverses the GPX route during the tour.
*   **Responsibilities:**
    *   Creates and manages a Cesium `Entity` with a `Billboard` and a `Label`.
    *   Its `position` property is assigned the `SampledPositionProperty` from the `TourController`, allowing Cesium to drive its animation automatically.
    *   Provides an `updateStyle` method to change its color and size dynamically.

### 3.6. `PoiService` & Other Services
*   **Description:** A collection of modules responsible for fetching and processing external data.
*   **Responsibilities:**
    *   `PoiService`: Fetches and processes POI data from the Overpass API.
    *   `ReverseGeocodingService`: Converts coordinates to location names.
    *   `StatisticsCalculator`: Calculates route distance and elevation gain.

### 3.7. `Logger`
*   **Description:** A centralized logging utility.
*   **Responsibilities:**
    *   Prepends all log messages with an ISO-formatted timestamp.

## 4. Data Flow

1.  **User selects a GPX file.** (`UIManager`)
2.  The `onFileSelected` callback is fired, notifying the `App` controller.
3.  `App` reads the file and uses `gpx-parser` to get the points.
4.  `App` checks if the data has elevation. If not, it uses `Cesium.sampleTerrainMostDetailed` to enrich it.
5.  `App` calls `renderRoute`, which in turn calls `updateRouteStyle` to draw the polyline on the map.
6.  `App` fetches POIs and reverse geocoding data and updates the UI via the `UIManager`.
7.  When the user clicks "Start Tour", `App` calls `tourController.startTour()`.
8.  `TourController` populates the `SampledPositionProperty` and configures the `Clock`.
9.  `TourController` initializes the `SpeedController` with the route's duration.
10. `TourController` applies the default camera strategy.
11. The user interacts with the timeline or speed slider, which updates the `Clock` via the `UIManager` -> `App` -> `TourController` -> `SpeedController` chain.

## 5. Camera Strategy Architecture

The cinematic tour is no longer driven by a manual `requestAnimationFrame` loop. Instead, it leverages Cesium's native, time-based animation system, which is more robust and performant.

The `TourController` manages a dictionary of camera strategy functions. When a strategy is selected, the `_applyCameraStrategy` method is called, which first calls `_cleanupCamera` to remove any previous listeners or tracked entities, then executes the function for the newly selected strategy.

### 5.1. Third-Person Follow
*   **Implementation:** Uses Cesium's native `viewer.trackedEntity` property.
*   **Logic:** The camera is told to track the `Person` entity. The initial view is zoomed to show all entities (the entire route), providing context before the tour begins.

### 5.2. Top-Down Tracking
*   **Implementation:** A single call to `viewer.camera.setView()`.
*   **Logic:** The camera is moved to a static position high above the calculated center of the route, looking straight down. It does not move or rotate during the tour.

### 5.3. First-Person (Chase Camera)
*   **Implementation:** A listener on the `viewer.clock.onTick` event.
*   **Logic:** On each tick of the simulation clock, the camera is positioned at a fixed offset (e.g., 50 meters behind and 25 degrees pitched down) relative to the Person entity's current position and orientation, using `viewer.camera.lookAtTransform()`.

### 5.4. Overhead Orbit
*   **Implementation:** A listener on the `viewer.scene.postUpdate` event.
*   **Logic:** After each scene update, the camera's view is set using `viewer.camera.lookAt()`. The heading is calculated based on the tour's percentage complete (`tourProgress * 360`), ensuring it completes exactly one full rotation over the tour's duration. The pitch and range are fixed to maintain a consistent orbiting view.