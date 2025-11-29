# GPX 3D Player

This project is a web-based application for visualizing GPX track data in a rich, interactive 3D environment. It provides a "Google Earth-like" experience, allowing users to upload a GPX file and see the route rendered on a 3D globe with a cinematic fly-through tour.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Select a GPX file** using the "Choose File" button.
3.  The application will automatically render the route on the 3D globe.
4.  **On Desktop:** Use the controls in the collapsible side panel to start the tour, change camera angles, and customize styles.
5.  **On Mobile:** A touch-friendly control bar will appear at the bottom of the screen for all playback functions.

## Key Features

### Performance Analysis & Simulation
*   **Actual vs. Planned Analysis:** For GPX files with timestamps, the application provides a detailed, real-time comparison between your *actual* performance and your *planned* performance.
*   **Live Performance Dashboard:** During playback, a detailed label on the traveler entity shows live, smoothed metrics including `Speed (Act/Plan)`, `Vertical Speed (Act/Plan)`, and `Km-effort Rate (Act/Plan)`.
*   **Comprehensive Statistics:** The main panel displays key overall metrics, including:
    *   Total Distance, Elevation Gain, and Km-effort.
    *   For timestamped routes: Total Duration and Overall Average Speed/Ascent Rate.
    *   `Est. Calories` burned.
    *   `Planned Time` based on your profile.
*   **Refuel Markers:** Automatically places markers on the map at locations where you are projected to hit your calorie-expenditure "refuel" threshold.
*   **Sophisticated Smoothing:** Uses an Exponential Moving Average (EMA) to provide smooth and responsive readouts for all live rate-based metrics, filtering out GPS noise.

### General Features
*   **Automatic Performance Tuning:** The application automatically adjusts rendering quality to maintain a target frame rate based on the user's selected profile ("Performance", "Balanced", or "Power Saver").
*   **Shareable URLs:** The page URL automatically updates to include the loaded route (e.g., `?route_id=...` or `?url=...`), making it easy to copy and share a direct link to a specific route.
*   **State Machine Architecture:** The application is driven by a robust state machine (`NO_ROUTE`, `LOADING`, `ROUTE_LOADED`, `TOUR_PLAYING`, `TOUR_PAUSED`) for predictable and stable UI behavior.
*   **Mobile-First Custom Tour Controls:** A custom control bar provides a professional, touch-friendly experience with SVG icons, including:
    *   Play/Pause and Reset.
    *   Direction toggle (Forward/Reverse playback).
    *   A full-width, high-granularity time scrubber.
    *   "Zoom to Route" and "Reset Style" functions.
    *   **POI Visibility Toggle:** A dedicated button to show or hide Points of Interest on the map.
*   **Collapsible UI & Quick Controls:** The main side panel can be collapsed into a narrow bar containing vertical sliders for quick, on-the-fly adjustments to speed and zoom without obscuring the view.
*   **3D Route Visualization:** Renders GPX tracks on a high-resolution 3D globe with real-world terrain.
*   **Cinematic Tour:** Provides an automated fly-through of the route with multiple, dynamically switchable camera perspectives:
    *   **Overhead (Default):** A dynamic camera that orbits the traveler.
    *   **Third-Person:** A classic follow-cam view.
    *   **Top-Down:** A static, bird's-eye view.
*   **Time-Based Animation:** Utilizes Cesium's native clock for robust and smooth animation.
*   **Smart Speed Control:** Automatically calculates a pleasant default playback speed, with a logarithmic slider for fine-tuned adjustments.
*   **Data Enrichment:**
    *   Automatically fetches elevation data from Cesium World Terrain for 2D GPX files.
    *   Synthesizes timestamps for GPX files that lack them.
*   **Route Intelligence:**
    *   Calculates and displays key route statistics (distance, elevation gain).
    *   Fetches and displays nearby Points of Interest (POIs) from OpenStreetMap.
    *   Suggests a descriptive filename based on the route's start/end locations.
*   **Customization:** Allows real-time customization of route color/width and person icon color/size.
*   **Manual Pitch Control:** A slider allows the user to manually adjust the camera's pitch angle during the tour for most camera strategies.

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.

The licenses for third-party dependencies are detailed in the [NOTICE.md](./NOTICE.md) file.

## Project Documentation

This project's detailed documentation is broken down into the following sections:

*   **[Requirements Document](./docs/REQUIREMENTS.md):** Detailed functional and non-functional requirements for the application.
*   **[Design Document](./docs/DESIGN.md):** The technical architecture and design of the system.
*   **[Development Plan](./docs/DEVELOPMENT_PLAN.md):** The iterative plan used to build the application.