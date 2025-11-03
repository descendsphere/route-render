# GPX 3D Route Renderer

This project is a web-based application for visualizing GPX track data in a rich, interactive 3D environment. It provides a "Google Earth-like" experience, allowing users to upload a GPX file and see the route rendered on a 3D globe with a cinematic fly-through tour.

## How to Use

1.  **Open `index.html`** in a modern web browser.
2.  **Select a GPX file** using the "Choose File" button.
3.  The application will automatically render the route on the 3D globe.
4.  Use the controls in the collapsible side panel to:
    *   Start and reset the cinematic tour.
    *   Control the playback speed.
    *   Change the camera strategy (Third-Person, Top-Down, etc.).
    *   Customize the style of the route and the person icon.
    *   Reset all styles to their default state.

## Key Features

*   **Collapsible UI:** The side panel can be collapsed for a full-screen viewing experience.
*   **3D Route Visualization:** Renders GPX tracks on a high-resolution 3D globe with real-world terrain.
*   **Cinematic Tour:** Provides an automated fly-through of the route with multiple, dynamically switchable camera perspectives:
    *   **Overhead (Default):** A dynamic camera that orbits the traveler, completing one full circle over the course of the tour.
    *   **Third-Person:** A classic follow-cam view that now shows the entire route on initialization.
    *   **Top-Down:** A static, bird's-eye view.
    *   **First-Person:** A stable, over-the-shoulder chase camera view.
*   **Time-Based Animation:** Utilizes Cesium's native clock and `SampledPositionProperty` for robust, smooth, and performant animation. Playback can be controlled via the main timeline widget.
*   **Smart Speed Control:** Automatically calculates a pleasant default playback speed to target a ~90-second tour duration, with a relative slider for easy speed adjustments.
*   **Data Enrichment:**
    *   Automatically fetches elevation data from Cesium World Terrain for 2D GPX files.
    *   Synthesizes timestamps for GPX files that lack them, enabling tour playback for any valid track.
*   **Route Intelligence:**
    *   Calculates and displays key route statistics (distance, elevation gain).
    *   Fetches and displays nearby Points of Interest (POIs) from OpenStreetMap.
    *   Suggests a descriptive filename based on the route's start/end locations.
*   **Customization:** Allows real-time customization of route color/width and person icon color/size.

## Project Documentation

This project's detailed documentation is broken down into the following sections:

*   **[Requirements Document](./docs/REQUIREMENTS.md):** Detailed functional and non-functional requirements for the application.
*   **[Design Document](./docs/DESIGN.md):** The technical architecture and design of the system.
*   **[Development Plan](./docs.DEVELOPMENT_PLAN.md):** The iterative plan used to build the application.