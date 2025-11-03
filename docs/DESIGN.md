# Design Document

## 1. Introduction

This document provides the technical design and architecture for the GPX 3D Route Renderer. It is based on the specifications outlined in the [Requirements Document](./REQUIREMENTS.md).

## 2. System Architecture

The application is a purely client-side, single-page application (SPA) that runs entirely in the web browser. No backend server is required for application logic.

### 2.1. Core Technologies

*   **3D Rendering Engine:** **CesiumJS** will be the cornerstone of the application.
*   **GPX Parsing:** The lightweight **`gpxparser`** library will be used.
*   **UI:** The UI will be constructed with **plain HTML, CSS, and modern JavaScript**.
*   **Modularity:** All JavaScript code will be structured using **ES6 Modules** (`import`/`export` syntax) to ensure a clean, maintainable, and scalable architecture. Each file will represent a distinct module.
*   **Logging:** A lightweight, open-source logging library (e.g., **`loglevel`**) will be integrated to provide comprehensive and controllable logging throughout the application.

### 2.2. External Services

The application will rely on several external APIs:

*   **Terrain and Elevation:** **Cesium World Terrain**, a high-resolution global terrain dataset, will be used for both 3D terrain visualization and for fetching elevation data for 2D GPX files.
*   **Points of Interest (POI):** The **OpenStreetMap Overpass API** will be queried to find relevant POIs near the loaded route.
*   **Reverse Geocoding:** A free, public reverse geocoding service (e.g., Nominatim) will be used to convert the start and end coordinates of the route into human-readable location names for the filename suggestion.

## 3. Component Design

The application will be architected in a modular fashion, with distinct components responsible for specific functionalities.

### 3.1. `App` (Main Controller)
*   **Description:** The central orchestrator of the application.
*   **Responsibilities:**
    *   Initializes all other components.
    *   Manages the overall application state.
    *   Handles the main event flow (e.g., file loaded -> parse -> render).

### 3.2. `UIManager`
*   **Description:** Manages all interactions with the DOM.
*   **Responsibilities:**
    *   Handles event listeners for file input, buttons, and sliders.
    *   Updates the UI to display route statistics, POIs, and filename suggestions.
    *   Shows/hides loading indicators and modal dialogs (e.g., for manual enrichment instructions).

### 3.3. `GpxParser`
*   **Description:** A wrapper around the `gpx-parser-builder` library.
*   **Responsibilities:**
    *   Takes a raw GPX file string as input.
    *   Parses the string and extracts track points, waypoints, and metadata.
    *   Returns a standardized data structure (see Data Model section) for the rest of the application to use.

### 3.4. `CesiumViewer`
*   **Description:** Manages the CesiumJS instance and all 3D scene manipulations.
*   **Responsibilities:**
    *   Initializes the Cesium `Viewer` object.
    *   Renders the 3D route path (as a `Polyline` entity).
    *   Renders waypoints and POIs (as `Billboard` entities).
    *   Manages camera controls and animations for the cinematic tour.
    *   Provides methods to add/remove entities from the scene.

### 3.5. `TourController`
*   **Description:** Manages the logic for the cinematic tour and orchestrates camera behavior.
*   **Responsibilities:**
    *   Takes the `Person` entity as input to animate along the route.
    *   Generates the *Person's* movement path using a Catmull-Rom or Hermite spline.
    *   Manually controls the `CesiumViewer`'s camera to implement different camera strategies (e.g., Top-Down, Third-Person) relative to the `Person` entity.
    *   Controls the animation loop (`requestAnimationFrame`) to update the `Person`'s position and the camera's view for each frame of the tour.

### 3.6. `Person`
*   **Description:** Represents the moving entity that traverses the GPX route during the tour.
*   **Responsibilities:**
    *   Creates and manages a Cesium `Entity` (e.g., an ellipsoid or model) in the `CesiumViewer`.
    *   Provides methods to update its position on the globe, animated by the `TourController`.

### 3.7. `EnrichmentService`
*   **Description:** Handles the 2D-to-3D data enrichment.
*   **Responsibilities:**
    *   Takes an array of 2D coordinates.
    *   Uses Cesium's `sampleTerrainMostDetailed` function to query the terrain provider for the elevation of each point.
    *   Returns the updated array of 3D coordinates.

### 3.7. `PoiService`
*   **Description:** Fetches and processes POI data.
*   **Responsibilities:**
    *   Constructs a query for the Overpass API based on the bounding box of the loaded route.
    *   Sends the request and parses the JSON response.
    *   Filters and formats the POI data for display.

### 3.8. `Logger`
*   **Description:** A centralized logging utility for the entire application.
*   **Responsibilities:**
    *   Initializes and configures the chosen logging library (e.g., `loglevel`).
    *   Provides a simple, static interface for logging messages at different levels (e.g., `Logger.info()`, `Logger.warn()`, `Logger.error()`).
    *   Prepends all log messages with a timestamp and the name of the calling module to provide context.
    *   Manages the collection of logs for potential download by the user.

## 4. Data Flow

1.  **User selects a GPX file.** (`UIManager`)
2.  The file is read as a string. (`UIManager`)
3.  The string is passed to the `GpxParser`. (`App`)
4.  The parsed data is returned. (`GpxParser`)
5.  The `App` checks if the data has elevation. If not, it consults the `EnrichmentService`.
6.  The (now 3D) route data is passed to the `CesiumViewer`, which renders the path.
7.  The route data is passed to the `PoiService` and a reverse geocoding service to fetch external data.
8.  The results are passed to the `UIManager` to be displayed.
9.  If the user starts the tour, the `TourController` is initialized with the route data and takes control of the `CesiumViewer`'s camera.

## 5. Data Model

The application will use a consistent data structure for route points:

```javascript
// A single point in the route
interface RoutePoint {
  longitude: number;
  latitude: number;
  elevation: number;
}

// The main route data object
interface RouteData {
  points: RoutePoint[];
  waypoints: RoutePoint[];
  stats: {
    distance: number;
    elevationGain: number;
```

## 6. Camera Strategy

The cinematic tour is powered by a moving `Person` entity, which the camera then tracks based on the selected strategy. This approach ensures a smooth and stable camera motion, free from real-time calculation jitters.

### 6.1. Third-Person Follow (Default)

This strategy positions the camera behind and slightly above the `Person` entity, always looking at it. The camera's position and orientation are dynamically adjusted to maintain this perspective as the `Person` moves along the route.

*   **Person Position:** The `Person` entity's position is updated using a `CatmullRomSpline` generated from the original GPX route points.
*   **Camera Position & Orientation:** The camera's position and orientation are determined by a pre-calculated `cameraTrack` (generated from an elevated spline) and applied manually using `viewer.camera.setView()`.

### 6.2. Top-Down Tracking

This strategy provides a static, bird's-eye view of the `Person` entity as it traverses the route. The camera's position remains fixed, and only its orientation changes to keep the `Person` in view.

*   **Person Position:** The `Person` entity's position is updated using a `CatmullRomSpline` generated from the original GPX route points.
*   **Camera Position:** Fixed at a calculated point high above the center of the route. The height is typically a multiple of the route's maximum elevation. This position is set once at the start of the tour.
*   **Camera Orientation:** The camera's `lookAt` function is used to continuously point towards the `Person` entity as it moves. This automatically adjusts the camera's heading and pitch.

### 6.3. Adding New Camera Strategies

The system is designed to be extensible with new camera strategies. To add a new strategy:

1.  **Define Strategy Logic:** In `TourController.js`, implement the logic for the new camera behavior within the `animate` method's conditional blocks. This will involve manually setting the `viewer.camera.position` and `viewer.camera.orientation` (or using `viewer.camera.lookAt`) based on the desired perspective relative to the `Person` entity.
2.  **Add a UI Selector:** In `index.html` and `app.js`, add a dropdown option or radio buttons to allow the user to select the new camera strategy.
3.  **Integrate into `animate`:** In the `animate` method of `TourController.js`, add a conditional block to apply the new strategy's logic based on the user's selection.
