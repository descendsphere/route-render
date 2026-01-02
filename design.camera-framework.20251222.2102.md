# Design Document: Camera Strategy Framework and Cinematic Camera

## Table of Contents
1.  Introduction
2.  Goals
3.  Core Concepts
    3.1. CameraController Subsystem
    3.2. CameraPath
    3.3. Camera States (FADE_IN, PLAYING, FADE_OUT)
4.  Detailed Design
    4.1. New Modules
        4.1.1. CameraController.js
        4.1.2. CameraStrategy.js (Base Class)
        4.1.3. PathSimplifier.js
        4.1.4. CatmullRomSpline.js
        4.1.5. CinematicCameraStrategy.js
    4.2. Modified Modules
        4.2.1. app.js
        4.2.2. TourController.js
        4.2.3. SettingsManager.js
        4.2.4. UIManager.js
5.  New User-Configurable Parameters
6.  Camera Calculation Logic (Cinematic Strategy)
7.  Fade-In/Fade-Out Transitions
8.  Backlog Update

---

## 1. Introduction
This document outlines the design for a new, modular camera strategy framework and the implementation of a sophisticated "Cinematic Camera" within this framework. The goal is to provide a highly configurable and dynamic camera experience that can smoothly track the user's route, offer advanced cinematic effects, and serve as a robust foundation for future camera modes.

## 2. Goals
*   **Architectural Modularity:** Decouple camera logic from the `TourController` and centralize it into a dedicated `CameraController` subsystem.
*   **Pluggable Strategies:** Allow easy addition and switching between different camera behaviors (e.g., Overhead, Third-Person, Cinematic).
*   **Cinematic Experience:** Implement a "Cinematic Camera" strategy with:
    *   Smooth, spline-based camera paths.
    *   Anticipatory look-ahead gaze.
    *   Dynamic, curvature-aware orbiting (azimuth) around the subject.
    *   Configurable fade-in and fade-out transitions at the start and end of the tour.
*   **Robust Configuration:** All new parameters must be user-configurable via the UI and shareable via URL parameters.
*   **Performance:** Pre-calculate camera paths to ensure smooth playback during tour execution.
*   **Maintainability:** Improve code organization and reduce complexity in core modules like `app.js` and `TourController.js`.

## 3. Core Concepts

### 3.1. CameraController Subsystem
The `CameraController` will be the central orchestrator for all camera-related concerns. `app.js` and `TourController.js` will delegate camera management entirely to this new module.

### 3.2. CameraPath
Each `CameraStrategy` will generate a `CameraPath` object. This is an array of camera states, typically one entry per route data point (or a sampled point along the route's timeline). Each state will contain:
*   `time`: The JulianDate or relative time (seconds) for this camera state.
*   `position`: `Cesium.Cartesian3` representing the camera's world location.
*   `orientation`: An object containing `heading`, `pitch`, and `roll` (Cesium's standard Euler angles).

### 3.3. Camera States (FADE_IN, PLAYING, FADE_OUT)
The `CameraController` will manage its own internal state machine to handle the cinematic transitions:
*   `IDLE`: No tour active or camera is manually controlled.
*   `FADING_IN`: Transitioning from the overview camera position to the tour's start.
*   `PLAYING`: Following the pre-calculated `CameraPath`.
*   `FADING_OUT`: Transitioning from the tour's end to the overview camera position.

## 4. Detailed Design

### 4.1. New Modules

#### 4.1.1. `CameraController.js`
*   **Purpose:** Orchestrates camera strategies, manages transitions, and provides current camera state.
*   **Responsibilities:**
    *   Holds an instance of the currently active `CameraStrategy`.
    *   Manages the internal `IDLE`, `FADING_IN`, `PLAYING`, `FADING_OUT` states.
    *   Handles the Cesium `Tween` animations for fade-in/fade-out transitions.
    *   Provides API for `app.js` to start/stop tours, switch strategies, and update settings.
*   **Key Methods:**
    *   `constructor(viewer, settingsManager)`
    *   `setStrategy(strategyName, tourData)`: Instantiates the chosen strategy and triggers `generateCameraPath`.
    *   `startTour(tourData, overviewCameraState)`: Initiates the `FADING_IN` transition. Delegates to `app.js` to start the `viewer.clock` upon completion.
    *   `stopTour()`: Initiates the `FADING_OUT` transition. Notifies `app.js` upon completion.
    *   `updateCamera(currentTime)`: Called by `app.js`'s post-render loop. Applies the correct camera state (from `CameraPath` during `PLAYING`, or `Tween` controls during `FADING` states).
    *   `onSettingsChange()`: Triggers `regeneratePath` on the active strategy.
*   **Internal State:**
    *   `this._viewer`: Cesium viewer instance.
    *   `this._settingsManager`: SettingsManager instance.
    *   `this._activeStrategy`: Current `CameraStrategy` instance.
    *   `this._state`: Current state (`IDLE`, `FADING_IN`, `PLAYING`, `FADING_OUT`).
    *   `this._currentTourData`: The `tourData` being played.
    *   `this._fadeTween`: Cesium.Tween object for transitions.

#### 4.1.2. `CameraStrategy.js` (Base Class)
*   **Purpose:** Defines the contract and common functionality for all camera strategies.
*   **Key Methods (Abstract):**
    *   `generateCameraPath(tourData, settings)`: Must be implemented by subclasses. Returns a `CameraPath`.
*   **Key Methods (Concrete):**
    *   `getCameraStateAtTime(currentTime)`: Interpolates the pre-calculated `CameraPath` to find the precise camera state (`position`, `orientation`) for any given `currentTime`.
    *   `regeneratePath(tourData, settings)`: Abstractly handles path regeneration on settings changes.
*   **Internal State:**
    *   `this._settingsManager`: Instance of `SettingsManager`.
    *   `this._cameraPath`: The pre-calculated `CameraPath` array.

#### 4.1.3. `PathSimplifier.js`
*   **Purpose:** Utility module to reduce the number of points in a path while preserving its overall shape.
*   **Key Methods:**
    *   `static simplify(points, minDistance)`: Takes an array of `points` (with `lon`, `lat`, `ele`) and a `minDistance` (meters). Returns a new array of points where consecutive points are at least `minDistance` apart. Uses a simple distance-based filter to remove redundant points.

#### 4.1.4. `CatmullRomSpline.js`
*   **Purpose:** Utility module to create and query a 3D Catmull-Rom spline.
*   **Key Methods:**
    *   `constructor(controlPoints, tension)`: `controlPoints` are `Cartesian3` or equivalent objects; `tension` is a float (0.0 to 1.0).
    *   `getPointAt(t)`: Returns a `Cesium.Cartesian3` position on the spline for a `t` value between 0 and 1 (where `t=0` is the start, `t=1` is the end).
    *   `getTangentAt(t)`: Returns a normalized `Cesium.Cartesian3` vector representing the forward direction along the spline at `t`.

#### 4.1.5. `CinematicCameraStrategy.js` (Extends `CameraStrategy`)
*   **Purpose:** Implements the cinematic camera logic using the new framework.
*   **Note:** The final implementation follows the more detailed, `lookAt`-based design outlined in [perplexity.20260101.2020.cesium_cinematic_route_playback_complete_guide.md](./perplexity.20260101.2020.cesium_cinematic_route_playback_complete_guide.md).
*   **Key Methods:**
    *   `generateCameraPath(tourData, settings)`: This method will implement the full, multi-stage pipeline:
        1.  **Path Simplification:** `simplifiedPoints = PathSimplifier.simplify(tourData.perPointData, settings.cameraPathDetail)`.
        2.  **Spline Generation:** `spline = new CatmullRomSpline(simplifiedPoints, settings.cameraSplineTension)`. The spline will be created from `Cesium.Cartesian3` representations of the simplified points.
        3.  **Camera Path Generation Loop:** Iterate through the `tourData.perPointData`. For each point `P` at `currentTime`:
            *   **`Look-At Target`:** Get `splinePos = spline.getPointAt(t_current_on_spline)` (where `t_current_on_spline` maps `currentTime` to the spline's 0-1 range).
            *   **`Gaze Target`:** Calculate `futureTime = currentTime + settings.cameraLookAheadTime`. Get `futureSplinePos = spline.getPointAt(t_future_on_spline)`.
            *   **"Front" Vector:** `frontVector = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(futureSplinePos, splinePos, new Cesium.Cartesian3()))`.
            *   **Curvature Calculation (for Azimuth Oscillation):** Estimate local curvature at `splinePos` (e.g., by comparing `frontVector` to a slightly earlier `frontVector`).
            *   **Dynamic Azimuth Angle:** Use the local curvature, `settings.cameraAzimuthFreq`, and `settings.cameraMaxAzimuth` to calculate the `currentAzimuthAngle`. (e.g., `sin(time * freq)` modulated by curvature).
            *   **Camera Position Calculation:**
                1.  Start with `cameraPos = splinePos`.
                2.  Move backward along `frontVector` by `settings.cameraDistance`.
                3.  Apply `settings.cameraPitch` rotation around `splinePos`.
                4.  Apply `currentAzimuthAngle` rotation around `frontVector` (using `frontVector` as the axis of rotation centered at `splinePos`). This gives the final `cameraPos`.
            *   **Camera Orientation:** Compute the `heading`, `pitch`, `roll` that points the camera from `cameraPos` towards `splinePos`.
            *   Store `currentTime`, `cameraPos`, `orientation` in the `CameraPath`.

#### 4.1.6. `OverheadCameraStrategy.js` (New - Extends `CameraStrategy`)
*   **Purpose:** Adapts the existing overhead camera logic to the new framework.
*   **Key Methods:**
    *   `generateCameraPath(tourData, settings)`: Replicates current overhead logic, calculating `position` and `orientation` for each point using `tourData`, `settings.cameraDistance`, `settings.cameraPitch`, etc.

#### 4.1.7. `ThirdPersonCameraStrategy.js` (New - Extends `CameraStrategy`)
*   **Purpose:** Adapts the existing third-person camera logic to the new framework.
*   **Key Methods:**
    *   `generateCameraPath(tourData, settings)`: Replicates current third-person logic.

### 4.2. Modified Modules

#### 4.2.1. `app.js`
*   **Key Changes:**
    *   Remove direct camera management.
    *   Instantiate `CameraController`.
    *   Delegate all camera-related calls (start/stop tour, settings changes) to `this.cameraController`.
    *   The `postRender` listener will call `this.cameraController.updateCamera(currentTime)`.
    *   Update main state machine for `TOUR_PLAYING` state to defer to `CameraController` for starting `viewer.clock`.

#### 4.2.2. `TourController.js`
*   **Key Changes:**
    *   Remove all methods related to camera positioning (`_updateOverheadCamera`, `_updateThirdPersonCamera`, etc.).
    *   Its sole responsibility regarding the camera will be to provide tour progress (`currentTime`) to the `CameraController`.

#### 4.2.3. `SettingsManager.js`
*   **Key Changes:**
    *   Add all new parameters defined in Section 5 to the `_settingsSchema`, ensuring they are `url: true`.
    *   Update `min` and `max` for `cameraLookAheadTime` to `60` (1 min) and `7200` (120 min) respectively.

#### 4.2.4. `UIManager.js`
*   **Key Changes:**
    *   Update DOM element references for existing camera strategy selectors if necessary.
    *   Add new UI elements (sliders, inputs) for all new parameters from Section 5.
    *   Implement event listeners for these new elements to call `SettingsManager.set()`.
    *   Modify `_initializeSettingsBasedUI` to hydrate the new controls from `SettingsManager` and subscribe to changes.
    *   Conditionally show/hide specific controls (e.g., cinematic controls only visible when cinematic strategy is chosen).

## 5. New User-Configurable Parameters

| UI Label | Setting Name | Type | Default | Min | Max | URL | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Path Detail | `cameraPathDetail` | `number` | 20 | 5 | 100 | `true` | Minimum distance (meters) between points for spline generation. Higher value = smoother but less accurate path. |
| Path Tension | `cameraSplineTension` | `number` | 0.5 | 0.0 | 1.0 | `true` | Tension of the Catmull-Rom spline. 0.0 is loose, 1.0 is tight. |
| Look-Ahead | `cameraLookAheadTime`| `number` | 900 | 60 | 7200 | `true` | How many seconds into the future the camera should look, creating a smoother, anticipatory gaze. (1 minute to 120 minutes) |
| Orbit Angle | `cameraMaxAzimuth` | `number` | 45 | 0 | 180 | `true` | Maximum angle (degrees) for the automatic camera orbit effect. |
| Orbit Speed | `cameraAzimuthFreq` | `number` | 0.1 | 0.01 | 1.0 | `true` | Base speed of the camera's orbit oscillation. |
| Transition Time|`cameraTransitionDur`| `number` | 3 | 0 | 10 | `true` | Duration (seconds) of the fade-in and fade-out camera transitions. |

## 6. Camera Calculation Logic (Cinematic Strategy)

For each point in time, the `CinematicCameraStrategy` performs the following geometric calculations to determine the camera's position and orientation:

1.  **Determine `Look-At Target`:** For the current time of the tour, identify the corresponding 3D position on the `CatmullRomSpline`. This is the point the camera will pivot around and look at.
2.  **Determine `Gaze Target`:** Calculate a future time by adding `settings.cameraLookAheadTime` to the current time. Find the corresponding 3D position on the `CatmullRomSpline` for this future time.
3.  **Establish "Front" Vector:** Compute the normalized vector from the `Look-At Target` to the `Gaze Target`. This vector defines the camera's primary forward direction.
4.  **Calculate Base Camera Position (Behind):** Starting at the `Look-At Target`, move backward along the "Front" Vector by `settings.cameraDistance`. This establishes a preliminary camera position directly behind the subject.
5.  **Apply Pitch Rotation:** Rotate this preliminary camera position around the `Look-At Target` by `settings.cameraPitch`. The axis of rotation for pitch will be perpendicular to the "Front" Vector and the local up-vector (i.e., horizontal relative to the path).
6.  **Apply Azimuth (Orbit) Rotation:** Rotate the pitched camera position around the `Look-At Target` by the dynamically calculated `currentAzimuthAngle`. **The axis of this rotation is precisely the "Front" Vector itself.** This rotates the camera *around* the subject's line of travel, creating the orbiting effect.
7.  **Final Camera Position:** The result of these rotations is the camera's final 3D world position (`cameraPos`).
8.  **Final Camera Orientation:** The camera is then oriented to look from this `cameraPos` directly at the `Look-At Target`. This generates the `heading`, `pitch`, and `roll` for Cesium's camera.

## 7. Fade-In/Fade-Out Transitions

*   **Initialization (Fade-In):** When `CameraController.startTour()` is called, it will capture the current `viewer.camera` state (the overview state). It will then initiate a `Cesium.Tween` animation to smoothly interpolate the camera's `position` and `orientation` from this overview state to the first calculated state of the active strategy's `CameraPath`. The duration of this tween is `settings.cameraTransitionDur`. Once complete, the `viewer.clock` is started.
*   **Termination (Fade-Out):** When the tour reaches its end, or `CameraController.stopTour()` is called, it will initiate another `Cesium.Tween` animation. This tween will interpolate the camera's `position` and `orientation` from the tour's current camera state (the last point of the `CameraPath`) back to the initial overview state. The duration is `settings.cameraTransitionDur`. Once complete, the `viewer.clock` is stopped.

## 8. Backlog Update
A new Epic will be added to `BACKLOG.md` referencing this design document.
