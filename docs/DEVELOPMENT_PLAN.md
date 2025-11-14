# Development Plan and Checklist

## 1. Introduction

This document outlines the iterative development plan for the GPX 3D Route Renderer. The project was developed in phases, starting with a Minimum Viable Product (MVP) to establish core functionality, followed by subsequent phases that enriched the application with advanced features.

## 2. Phase 1: MVP - Core Route Visualization

**Goal:** A user can upload a GPX file and see it rendered as a 3D line on a globe.

**Checklist:**

-   [x] **Project Setup:**
    -   [x] Create `index.html` with a container for the Cesium viewer.
    -   [x] Structure `app.js` as the main ES6 module entry point.
    -   [x] Create a `modules` directory to house all JavaScript modules.
    -   [x] Include CesiumJS library.
    -   [x] Include `gpxparser` library.
-   [x] **Logging Setup:**
    -   [x] Create a `Logger.js` module.
    -   [x] Configure the logger to prepend timestamps to messages.
-   [x] **Cesium Viewer:**
    -   [x] Initialize the Cesium `Viewer` instance.
    -   [x] Configure the viewer with high-quality world terrain.
-   [x] **File Handling:**
    -   [x] Add an `<input type="file">` element to the UI.
    -   [x] Implement an event listener to detect when a file is selected.
    -   [x] Read the content of the selected `.gpx` file.
-   [x] **GPX Parsing:**
    -   [x] Use `gpxparser` to parse the file string.
    -   [x] Extract the array of track points (latitude, longitude, elevation, time).
-   [x] **Basic 3D Rendering:**
    -   [x] Convert the parsed track points into Cesium's `Cartesian3` format.
    -   [x] Render the route on the globe as a Cesium `Polyline` entity.
    -   [x] Implement a function to automatically zoom the camera to fit the entire route upon loading.
    -   [x] Implement a "Zoom to Route" button.
-   [x] **2D->3D Enrichment:**
    -   [x] Detect if the loaded GPX file lacks elevation data.
    -   [x] Implement automatic enrichment using `Cesium.sampleTerrainMostDetailed`.
    -   [x] Display a user-friendly `alert` to inform the user about the automatic enrichment.

## 3. Phase 2: Cinematic Tour

**Goal:** The user can experience a smooth, automated "fly-through" tour of the loaded route.

**Checklist:**

-   [x] **Tour Controls UI:**
    -   [x] Add "Start Tour" and "Reset Tour" buttons.
    -   [x] Integrate with the main Cesium Timeline widget for play/pause.
    -   [x] Add a slider to control the tour speed relative to a smart default.
-   [x] **Time-Based Animation:**
    -   [x] Create a `Person` entity to represent the user on the route.
    -   [x] Use a `SampledPositionProperty` to define the Person's position over time.
    -   [x] Use a `VelocityOrientationProperty` to automatically orient the Person in the direction of travel.
-   [x] **Animation Engine:**
    -   [x] Create a `TourController` class to manage the tour.
    -   [x] Use Cesium's `Clock` to drive the animation, instead of `requestAnimationFrame`.
    -   [x] Configure the clock's start, stop, and current times based on the GPX data.
-   [x] **Timestamp Synthesis:**
    -   [x] Implement a fallback in `TourController` to generate synthetic timestamps for GPX files that lack them, enabling tour functionality for all valid tracks.

## 4. Phase 3: Route Intelligence

**Goal:** Enhance the experience by providing contextual information about the route.

**Checklist:**

-   [x] **Route Statistics:**
    -   [x] Implement a `StatisticsCalculator` module.
    -   [x] Calculate and display total route distance and elevation gain.
-   [x] **Waypoint Rendering:**
    -   [x] Parse waypoints (`<wpt>`) from the GPX file.
    -   [x] Display them on the globe as clickable `Billboard` entities.
-   [x] **Points of Interest (POIs):**
    -   [x] Implement a `PoiService` to query the Overpass API.
    -   [x] Define a bounding box around the route to limit the POI search area.
    -   [x] Display the returned POIs as distinct markers on the globe.
-   [x] **Filename Suggestion:**
    -   [x] Implement a `ReverseGeocodingService`.
    -   [x] Get location names for the start and end points of the route.
    -   [x] Construct and display a suggested filename in the format `yyyy-MM-dd.HHmm_startLocation_endLocation.gpx`.

## 5. Phase 4: UI/UX Polish and Refinement

**Goal:** Improve usability, add polish, and handle edge cases.

**Checklist:**

-   [x] **UI Architecture:**
    -   [x] Implement a clean, collapsible side panel for all controls and information.
    -   [x] Create a `UIManager` class to handle all DOM interactions, decoupling it from the main `App` logic.
-   [x] **Loading Indicators:**
    -   [x] Add loading indicators for all asynchronous operations.
-   [x] **Camera Strategy Selection:**
    -   [x] Implement "Third-Person Follow" camera strategy.
    -   [x] Implement "Top-Down Tracking" camera strategy.
    -   [x] Implement "First-Person (Over-the-Shoulder)" camera strategy.
    -   [x] Implement "Overhead Orbit" camera strategy.
    -   [x] Add a UI dropdown selector for camera strategies.
-   [x] **Interactivity & Customization:**
    -   [x] Make UI sliders robust against mouse capture conflicts with the Cesium canvas.
    -   [x] Add UI controls to allow the user to change the route line's color and width.
    -   [x] Add UI controls to allow the user to change the person icon's color and size.
    -   [x] Add a "Clamp to Ground" option for both the route and the person icon.
-   [x] **Error Handling:**
    -   [x] Add robust error handling for failed API requests and invalid GPX files.
    -   [x] Display user-friendly `alert` messages for critical errors.

## 6. Phase 5: Future Enhancements

**Goal:** Add additional high-value features and user-requested enhancements.

**Checklist:**

- **[FEATURE] POI in Filename:**
    -   [ ] Identify a key POI that is closest to the midpoint of the route.
    -   [ ] Integrate the key POI's name into the suggested filename string.

## 7. Phase 6: Architecture and UI Overhaul

**Goal:** Refactor the core application logic to be more robust and overhaul the UI for a professional, mobile-first experience.

**Checklist:**

-   [x] **State Machine Refactoring:**
    -   [x] Re-architect the `App` class to function as a formal state machine (`NO_ROUTE`, `LOADING`, `ROUTE_LOADED`, `TOUR_PLAYING`, `TOUR_PAUSED`).
    -   [x] Create a single `setState()` method to manage all state transitions and UI updates, eliminating numerous bugs related to inconsistent state.
    -   [x] Refactor the `TourController` to have distinct `prepareTour()`, `startTour()`, and `pauseTour()` methods, clarifying the tour lifecycle.
-   [x] **Mobile-First UI Overhaul:**
    -   [x] Design and implement a custom tour control bar for mobile, replacing the default Cesium widgets.
    -   [x] Replace all text-based emoji buttons with a consistent set of high-quality SVG icons.
    -   [x] Implement a two-row layout for the custom controls, providing a larger, high-granularity time scrubber.
    *   [x] Style all buttons, sliders, and controls for a cohesive, modern, and professional look and feel.
-   [x] **Playback & Control Enhancements:**
    -   [x] Implement a playback direction toggle (forward/reverse) controlled by the new custom UI.
    -   [x] Ensure all time displays (labels, custom UI) are consistently formatted (`yyyy-MM-dd HH:mm:ss`) and use the user's local time.
-   [x] **Code & Documentation Cleanup:**
    -   [x] Remove the "First-Person" camera view to simplify the UI.
    -   [x] Update all project documentation (`README.md`, `DESIGN.md`, etc.) to reflect the new architecture and features.
    -   [x] Add `LICENSE` and `NOTICE.md` files to ensure full open-source license compliance.

## 7. Phase 7: Storage-First Architecture & Multi-Route Management

**Goal:** Rearchitect the application to manage multiple routes, persist them locally, and load them from various sources.

**Checklist:**

-   [x] **Storage-First Architecture:**
    -   [x] Implement `RouteStorage.js`, a dedicated service to abstract all `localStorage` interactions for CRUD (Create, Read, Update, Delete) operations on route records.
    -   [x] Re-architect the entire data flow to be "storage-first," where all routes from any source are first saved to storage and then loaded into the viewer from this single source of truth.
-   [x] **Multi-Source Route Loading:**
    -   [x] **From File:** Refactor the file-picker to save the GPX data into `RouteStorage` before triggering a render.
    -   [x] **From URL:** Implement a new UI with a text input and "Load" button to allow users to add a route from a public URL. This also saves the route to `RouteStorage`.
    -   [x] **Pre-packaged Routes:** Implement a manifest-based system (`gpx/manifest.json`) to automatically discover and populate the library with a set of default, pre-packaged routes on first load.
-   [x] **Route Library UI:**
    -   [x] Add a `<select>` dropdown to the main UI to act as the "Route Library."
    -   [x] Populate the dropdown with all routes found in `RouteStorage`.
    -   [x] Make the dropdown the primary mechanism for selecting and loading a route into the viewer.
-   [x] **POI Data Persistence:**
    -   [x] Enhance `RouteStorage` to cache and persist fetched POI data alongside its corresponding route, preventing redundant API calls on subsequent loads.
-   [x] **Modular Service Refactoring:**
    -   [x] Refactor `PoiService` from a static class into an instantiable service to better manage state and dependencies.
    -   [x] Update the main `App` to instantiate and use the new `PoiService`.