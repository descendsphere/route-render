# GPX 3D Player

This project is a web-based application for visualizing GPX track data in a rich, interactive 3D environment. It provides a "Google Earth-like" experience, allowing users to upload a GPX file and see the route rendered on a 3D globe with a cinematic fly-through tour.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Select a GPX file** using the "Choose File" button.
3.  The application will automatically render the route on the 3D globe.
4.  **On Desktop:** Use the controls in the collapsible side panel to start the tour, change camera angles, and customize styles.
5.  **On Mobile:** A touch-friendly control bar will appear at the bottom of the screen for all playback functions.

## Key Features

### What's New

*   **Refined UI/UX for Stats Display:**
    *   **Unified Bottom Panel:** The stats display and tour controls are now integrated into a single, cohesive panel at the bottom of the screen, improving visual organization and preventing overlap.
    *   **Compact & Responsive Stats:** The route and replay stats are now even more compact, featuring key metrics with icons in the headers, a transposed table for replay stats, consistent font sizing, and units that automatically hide on mobile for better readability.
    *   **Enhanced Interactivity:** The entire header of each stats section is now a clickable area for easy collapsing and expanding.
*   **Improved POI Visualization:** Points of Interest (POI) icons and their labels are now correctly clamped to the ground, ensuring they appear naturally on the terrain.
*   **Smarter Replay Stats:** When the tour reaches its end, the replay stats will now display the final, cumulative values for the route, providing a more meaningful summary.
*   **Smoothing Factor Controls Fixed:** The UI controls for adjusting the smoothing factor are now fully functional.


### Performance Analysis & Simulation
*   **Actual vs. Planned Analysis:** For GPX files with timestamps, the application provides a detailed, real-time comparison between your *actual* performance and your *planned* performance.
*   **Consolidated Statistics HUD:** All key metrics (overall, live, and planned) are displayed in a clean, centralized Heads-Up Display during tour playback.
*   **Refuel Markers:** Automatically places markers on the map at locations where you are projected to hit your calorie-expenditure "refuel" threshold.
*   **Sophisticated Smoothing:** Uses an Exponential Moving Average (EMA) to provide smooth and responsive readouts for all live rate-based metrics, filtering out GPS noise.

### General Features
*   **Intelligent Performance Tuning:** The application features a sophisticated auto-tuner that, during tour playback, intelligently balances frame rate and visual quality. The 'Performance' profile aims for the highest visual quality while maintaining a high FPS. The 'Balanced' and 'Power Saver' profiles use a lower target FPS and actively cap the maximum rendering quality to ensure a smooth experience while conserving system resources, even on powerful hardware.
*   **Configurable Smoothing:** The EMA (Exponential Moving Average) smoothing factor used for all live metrics can be adjusted in real-time via the UI, allowing users to choose between smoother but less responsive, or more responsive but noisier, data.
*   **Shareable URLs:** The page URL automatically updates to include the loaded route and can be used to pre-configure application state (e.g., camera perspective, zoom level, tour speed), making it easy to share a direct link to a specific route and view.
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