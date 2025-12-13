# Configuration and UI Refactor: Design Document

This document outlines the technical design for a significant refactoring of the application's configuration management and the enhancement of its UI, including a new statistics overlay and refined performance tuning logic.

## 1. Epic: Centralized Configuration & Dynamic UI

This epic covers a series of interconnected features and refactorings aimed at improving maintainability, enhancing user control, and making the application state more transparent and shareable.

## 2. Core Architecture: `SettingsManager.js`

A new singleton module, `SettingsManager.js`, will be introduced as the **single source of truth** for all configurable parameters.

### 2.1. Responsibilities

-   **Schema-Driven:** It will define a schema for all settings, including `type`, `defaultValue`, validation rules (`min`, `max`), and metadata for UI and URL handling (`url`, `step`, `bigStep`).
-   **Layered Loading:** It will load settings with a clear precedence: **Defaults -> URL Parameters**. This ensures URL parameters reliably override defaults for shareability.
-   **Reactive API:** It will provide two methods for data access:
    -   `get(key)`: For synchronous, on-demand retrieval of a setting's value. Used when a value is needed once at the start of an operation.
    -   `subscribe(key, callback)`: For reactive updates. A module can listen for changes to a setting and execute a callback. Used for parameters that need to trigger immediate side effects (e.g., real-time smoothing adjustment).

### 2.2. Implementation

-   **`SettingsManager.js`:** A new file in `modules/`.
-   **Refactoring:** All modules currently using hard-coded constants (`TourController`, `SpeedController`, `StatisticsCalculator`, etc.) will be refactored to source their configuration from `SettingsManager`.

## 3. Feature: URL-based Configuration

-   **Mechanism:** The `SettingsManager`'s `_parseUrl()` method will read query parameters from `window.location.search` on startup.
-   **Scope:** Only parameters explicitly flagged with `url: true` in the settings schema will be configurable via the URL, preventing accidental exposure of internal parameters.
-   **Example:** `?route_id=...&cameraStrategy=third-person&smoothingFactor=20`

## 4. Feature: Enhanced Statistics UI

The entire display of performance and route statistics will be redesigned.

### 4.1. New Module: `StatsOverlay.js`

-   A new UI module responsible for rendering all statistics.
-   **Implementation:** It will create a `<div>` element styled as a semi-transparent overlay (HUD). Inside, it will use CSS Flexbox or Grid for a structured, table-like presentation of data. This avoids semantic misuse of `<table>` tags while achieving a clean, aligned layout.
-   **Responsibilities:**
    -   `updateStatic(stats)`: A method to populate the summary statistics (Total Distance, Elevation, etc.) once when a route is loaded.
    -   `updateLive(stats)`: A method to update the real-time playback data (Speed, V.Speed, etc.) on every frame. This method will handle number formatting (e.g., `toFixed(1)`) and alignment.
    -   `show()` / `hide()`: To control visibility.

### 4.2. UI Consolidation

-   The existing statistics sections within the main side panel will be **removed**.
-   The new `StatsOverlay` will become the sole location for viewing all route and performance data, simplifying the overall UI.
-   The `Billboard` label currently attached to the traveler entity will be removed or repurposed, solving its text rendering issues.

## 5. Feature: Configurable Smoothing

-   **`SettingsManager` Schema:** The `smoothingFactor` will be added to the schema with a `defaultValue`, `min`, `max`, `step: 1`, and `bigStep: 5`.
-   **`UIManager.js`:** New buttons (`--`, `-`, `+`, `++`) will be added. Their click handlers will calculate the new value and call `settingsManager.set('smoothingFactor', newValue)`.
-   **`StatisticsCalculator.js`:** This module will `subscribe` to `smoothingFactor` changes. Upon receiving an update, it must trigger a recalculation of all smoothed data within the application's main `tourData` array. This will likely involve calling a new orchestrator method in `app.js`, such as `app.recalculateAnalytics()`.

## 6. Feature: Refined Performance Tuning

The automatic performance tuning logic will be restricted to be active only during cinematic playback.

### 6.1. `PerformanceTuner.js` Enhancements

-   It will have its own internal state flag: `_isActive`.
-   The `handlePostRender()` method will do nothing if `_isActive` is `false`.
-   A new `activate()` method will set `_isActive` to `true`.
-   A new `deactivate()` method will set `_isActive` to `false` and, critically, will immediately apply a pre-defined high-quality or default preset to restore the application's visual fidelity.

### 6.2. `app.js` State Machine Integration

-   The main `setState()` method will be the single point of control.
-   When the state transitions **to** `TOUR_PLAYING`, it will call `performanceTuner.activate()`.
-   When the state transitions **from** `TOUR_PLAYING` to any other state, it will call `performanceTuner.deactivate()`. This ensures the behavior is deterministic and tightly coupled to the application's lifecycle.
