# Development Plan and Checklist

## 1. Introduction

This document outlines the iterative development plan for the GPX 3D Route Renderer. The project will be developed in phases, starting with a Minimum Viable Product (MVP) to establish core functionality, followed by subsequent phases to enrich the application with advanced features.

## 2. Phase 1: MVP - Core Route Visualization

**Goal:** A user can upload a GPX file and see it rendered as a 3D line on a globe.

**Checklist:**

-   [x] **Project Setup:**
    -   [x] Create `index.html` with a container for the Cesium viewer.
    -   [x] Structure `app.js` as the main ES6 module entry point (`<script type="module">`).
    -   [x] Create a `modules` directory to house all JavaScript modules.
    -   [x] Include CesiumJS library from a CDN.
    -   [x] Include `gpxparser` library from a CDN.
    -   [x] Include `loglevel` library from a CDN.
-   [x] **Logging Setup:**
    -   [x] Create a `Logger.js` module inside the `modules` directory.
    -   [x] Initialize `loglevel` in this module with a default log level.
    -   [x] Export the configured logger instance to be used by other modules.
-   [x] **Cesium Viewer:**
    -   [x] Initialize the Cesium `Viewer` instance.
    -   [x] Configure the viewer with a high-quality imagery provider and default terrain.
-   [x] **File Handling:**
    -   [x] Add an `<input type="file">` element to the UI.
    -   [x] Implement an event listener to detect when a file is selected.
    -   [x] Read the content of the selected `.gpx` file as a string.
-   [x] **GPX Parsing:**
    -   [x] Use `gpxparser` to parse the file string into a JavaScript object.
    -   [x] Extract the array of track points (latitude, longitude, elevation).
-   [x] **Basic 3D Rendering:**
    -   [x] Convert the parsed track points into Cesium's `Cartesian3` format.
    -   [x] Render the route on the globe as a Cesium `Polyline` entity.
    -   [x] Ensure polyline is always visible using `depthFailMaterial`.
    -   [x] Implement a function to automatically zoom the camera to fit the entire route upon loading.
    -   [x] Implement a "Zoom to Route" button.
-   [x] **2D->3D Enrichment (MVP version):**
    -   [x] Detect if the loaded GPX file lacks elevation data.
    -   [x] Implement the **automatic enrichment** feature using `Cesium.sampleTerrainMostDetailed`.
    -   [x] Display a simple `alert()` or console warning about potential performance issues.

## 3. Phase 2: Cinematic Tour

**Goal:** The user can experience a smooth, automated "fly-through" tour of the loaded route.

**Checklist:**

-   [x] **Tour Controls UI:**
    -   [x] Add Play, Pause, and Stop buttons to the UI.
    -   [x] Add a slider or input to control the tour speed.
-   [x] **Camera Path Generation:**
    -   [x] Implement a function to generate a smoothed camera path from the route points (using a spline).
    -   [x] Implement a "Person Object" that moves along the route.
    -   [x] Camera tracks the "Person Object." (manual control).
-   [x] **Animation Engine:**
    -   [x] Create a `TourController` class to manage the animation loop.
    -   [x] Use `requestAnimationFrame` to drive the tour.
    -   [x] In each frame, update the `Person`'s position and the camera's view.
-   [x] **Terrain Awareness:**
    -   [x] Before the tour starts, sample terrain height at key points along the camera path.
    -   [x] Adjust the camera path's altitude to ensure it remains a safe distance above the terrain.
    -   [x] Enable Cesium's built-in camera collision detection as a fallback.

## 4. Phase 3: Route Intelligence

**Goal:** Enhance the experience by providing contextual information about the route.

**Checklist:**

-   [x] **Route Statistics:**
    -   [x] Implement a function to calculate the total distance of the route.
    -   [x] Implement a function to calculate total elevation gain and loss.
    -   [x] Display these statistics in the UI.
-   [x] **Waypoint Rendering:**
    -   [x] Parse waypoints (`<wpt>`) from the GPX file.
    -   [x] Display them on the globe as `Billboard` entities (markers).
-   [x] **Points of Interest (POIs):**
    -   [x] Implement a `PoiService` to query the Overpass API.
    -   [x] Define a bounding box around the route to limit the POI search area.
    -   [x] Display the returned POIs as distinct markers on the globe.
    -   [x] Ensure POIs are always visible using `CLAMP_TO_GROUND`.
-   [x] **Filename Suggestion:**
    -   [x] Implement a reverse geocoding function to get location names for the start and end points.
    -   [x] Extract the date/time from the GPX metadata.
    -   [x] Construct the suggested filename string.
    -   [x] Display the suggested name in the UI, perhaps with a "copy to clipboard" button.

## 5. Phase 4: UI/UX Polish and Refinement

**Goal:** Improve usability, add polish, and handle edge cases.

**Checklist:**

-   [x] **UI Overhaul:**
    -   [x] Design and implement a clean, collapsible side panel for all controls and information.
-   [x] **Loading Indicators:**
    -   [x] Add loading indicators for all asynchronous operations (file loading, enrichment, POI fetching).
-   [x] **Camera Strategy Selection:**
    -   [x] Implement "Top-Down Tracking" camera strategy (with fixed position, rotating to follow).
    -   [x] Implement "Third-Person Follow" camera strategy.
    -   [x] Add UI selector for camera strategies.
-   [x] **Interactivity:**
    -   [x] Make waypoint and POI markers clickable.
    -   [x] Display an `InfoBox` or custom popup with details when a marker is clicked.
    -   [x] Display real-time camera information (heading, pitch, roll, height).
    -   [x] Allow real-time editing of camera parameters (heading, pitch, roll, height).
-   [x] **Customization:**
    -   [x] Add UI controls to allow the user to change the route line's color and width.
-   [x] **Error Handling:**
    -   [x] Add robust error handling for failed API requests, invalid GPX files, etc.
    -   [x] Display user-friendly error messages.
