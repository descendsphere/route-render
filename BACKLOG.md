# Application Backlog

This file contains a list of proposed features, enhancements, and bug fixes for the GPX 3D Renderer application.

## High Priority

- **[FIXED] Collapsible Panel:** The side panel's toggle button is now correctly positioned outside the panel, allowing it to be collapsed and expanded.

## UI/UX Enhancements

- **[FEATURE] Mobile Responsiveness:** Use CSS media queries to improve the layout on mobile devices. This includes making the side panel full-width and increasing the size of fonts and touch targets.
- **[FIXED] Concise Style Controls:** Redesigned the "Style" section to be more compact. Placed the route width control to the right of the color picker and implemented `+`/`-` buttons for changing the width value.
- **[FEATURE] Custom Tour Controls:** Replace the small default Cesium animation widget with larger, custom-built UI controls (Play/Pause buttons, a progress bar/timeline) for a better mobile experience.
- **[FEATURE] Adjustable Camera Distance:** Add a slider to the "Camera" section to allow the user to control the distance of the "First-Person" (chase) camera from the person entity.
- **[FIXED] Remove Camera Info Section:** The "Camera Info" section has been removed from the UI as it provides debug information that is not useful to the end-user.

## Core Functionality Enhancements

- **[FEATURE] Accurate POI/Waypoint Altitude:** Use `Cesium.sampleTerrainMostDetailed` to fetch the correct terrain height for all POIs and waypoints, ensuring they are rendered at their true altitude instead of being clamped to the ground.
- **[FIXED] Local Time Display:** Changed the "Person" entity's label to display the current tour time in the user's local time zone instead of UTC.

## Code Architecture

- **[REFACTOR] Filename Generator Module:** Create a dedicated `FilenameGenerator.js` module to encapsulate the logic for constructing the suggested filename. This will make the logic more maintainable and easier to extend in the future.
