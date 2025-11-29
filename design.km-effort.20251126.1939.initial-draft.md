# Km-effort & Performance Analysis Feature: Initial Draft

This document captures the initial requirements and architectural design for the comprehensive performance analysis feature set, including Km-effort, energy expenditure, and time simulation.

## 1. User Requirements & Experience

This feature epic aims to transform the application from a simple route viewer into a powerful tool for both planning and post-activity analysis.

### 1.1. Core Metrics

- **Km-effort (Kilomètre-effort):** The application will calculate and display the Km-effort, a standard metric for hiking difficulty, using the formula: `Km-effort = [Distance in km] + ([Ascent in meters] / 100)`.
- **Energy Expenditure:** The application will estimate the total calories (kcal) burned during the activity.
- **Time Projection:** The application will provide a projected completion time for the route.

### 1.2. Desired User Experience

#### 1.2.1. Pre-Activity Planning

1.  **User Configuration:** A new "Athlete Profile" UI section will allow users to input personal data for accurate planning:
    -   `Weight (kg)`
    -   `Target Average Speed (km/h)`
    -   `Refuel Threshold (kcal)` (e.g., refuel every 300 kcal)
    -   `Rest per Refuel (minutes)`
    -   `Performance Degradation (%)` (e.g., 5% speed loss per hour)
2.  **Static Analysis:** After loading a route, the main statistics panel will immediately display the key planning metrics:
    -   Total Distance
    -   Total Elevation Gain
    -   **Total Km-effort**
    -   **Estimated Total Calories**
    -   **Projected Completion Time**
3.  **Fueling Strategy:** The 3D map will display visual markers (e.g., "energy bar" icons) at the locations along the route where the user is projected to cross their `Refuel Threshold`.

#### 1.2.2. Live Tour Playback

1.  **Live Dashboard:** The label attached to the moving "person" entity will serve as a live dashboard, with its content adapting based on the available data.
    -   **Planning Mode (No Timestamps):** When viewing a route without actual time data, the label will show the *projected* cumulative stats based on the simulation.
        -   Example: `Time: 01:23:45 | Dist: 10.5km | Km-E: 13.8 | Kcal: 750`
    -   **Analysis Mode (With Timestamps):** When viewing a route with actual time data, the label will display a direct comparison of **Actual vs. Planned** instantaneous (smoothed) performance.
        -   Example: `Speed (Act/Plan): 4.5 / 4.8 km/h`
        -   (Could cycle through other metrics like `Ascent Rate (Act/Plan)`)

#### 1.2.3. Post-Activity Analysis (for GPX files with timestamps)

If a GPX file contains timestamp data, the application will automatically calculate the *actual* performance metrics, providing two distinct sets of figures:

1.  **Overall Average Metrics:** The average performance over the entire duration of the activity.
    -   **Overall Average Speed:** The total distance divided by the total time.
    -   **Overall Average Ascent Rate:** Total elevation gain divided by total time.
    -   These values will be displayed in the main statistics panel for a high-level summary.

2.  **Instantaneous (Moving Average) Metrics:** The performance at any given moment during the tour, smoothed over a time window (e.g., the last 60 seconds) to provide a stable, real-time reading.
    -   **Smoothed Instantaneous Speed** (e.g., km/h).
    -   **Smoothed Instantaneous Elevation Rate** (e.g., m/hr).
    -   **Smoothed Instantaneous Km-effort Rate** (e.g., km-effort/hr).
    -   These values will be used for the live dashboard on the "person" label and for charting.

3.  **Comparative Analysis:** Users will be able to compare their plan against their actual performance. Future integration with a chart will allow for overlaying "Projected Speed" vs. "Smoothed Instantaneous Speed" along the route's elevation profile.

## 2. Architectural Design

To support these varied requirements in a clean and maintainable way, the logic will be encapsulated in three main modules.

### 2.1. `StatisticsCalculator.js` (The Foundation)

This module analyzes the physical and recorded properties of the route.

-   **`calculate(points)`:** This method will analyze the route's **geometry**. It will iterate through the points once and produce a rich data array where each point contains cumulative `distance`, `ascent`, `descent`, and `kmEffort`. This is the foundational data used by all other modules.
-   **`analyzePerformance(points, routeData)` (New Method):** This method will analyze the **recorded performance**. It will only run if timestamps are present.
    -   **Outputs (Summary):** It will calculate and return the **Overall Average** metrics (e.g., `overallAverageSpeed`, `overallAverageAscentRate`).
    -   **Outputs (Per-Point):** It will augment the `routeData` array by adding the **Instantaneous (Smoothed)** metrics to each point (e.g., `actualSmoothedSpeed`, `actualSmoothedAscentRate`, `actualKmEffortRate`), calculated using a moving average over a configurable time window.

### 2.2. `EnergyCalculator.js` (New Module)

This module will handle all user-specific energy and fueling calculations.

-   **Responsibilities:**
    1.  **Calculate Energy Profile:** Takes the foundational route data and the user's `Weight` to calculate `cumulativeKcal` for each point.
    2.  **Identify Fueling Stops:** Takes the energy profile and a `kcalThreshold` to find and return the coordinates for refuel markers.

### 2.3. `TimeSimulator.js` (New Module)

This module will handle all performance simulations and time projections.

-   **Dependencies:** Requires the geometric data from `StatisticsCalculator` and the refuel point locations from `EnergyCalculator`.
-   **Responsibilities:**
    1.  **Project Performance Profile:** Takes the foundational route data, a `Target Speed`, a `Performance Degradation` factor, the list of refuel points, and the `Rest per Refuel` duration. It will simulate the activity segment by segment, adjusting speed based on incline and elapsed time, and adding the specified rest time at each refuel point.
    2.  **Outputs:**
        -   It will return the **Total Projected Time** (including moving time and all rest time).
        -   It will also return a **per-point data array** containing the `plannedSmoothedSpeed` and other planned instantaneous metrics for each point on the route. This data is essential for the "Actual vs. Plan" live comparison.

## 3. Phased Implementation Plan

This epic will be implemented in distinct phases to ensure stability and correctness at each step.

-   **Phase 1: Foundational Calculation & Km-effort Display**
    1.  Refactor `StatisticsCalculator.js` to generate the rich per-point data array.
    2.  Display the **Total Km-effort** in the main statistics panel.

-   **Phase 2: Energy & Fueling**
    1.  Create `EnergyCalculator.js`.
    2.  Add the "Athlete Profile" UI section for `Weight` and `Refuel Threshold`.
    3.  Calculate and display **Total Calories**.
    4.  Display **Refuel Markers** on the map.

-   **Phase 3: Time Projection & Live Label**
    1.  Create `TimeSimulator.js`.
    2.  Add UI inputs for `Target Speed` and `Performance Degradation`.
    3.  Calculate and display **Projected Time**.
    4.  Enhance the live "person" label to show all relevant cumulative stats during tour playback.

-   **Phase 4: Actual vs. Planned Analysis**
    1.  Implement the `analyzePerformance` method in `StatisticsCalculator.js`.
    2.  Calculate and display **Average Actual Speed** in the stats panel when timestamped data is available.
    3.  (Future) Provide data hooks for a chart to visualize planned vs. actual speed.
