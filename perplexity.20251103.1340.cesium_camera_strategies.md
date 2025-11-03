# Cesium GPX Tour: Four Camera Strategy Code Snippets

## Overview
All four strategies can be switched dynamically during playback using a radio button or dropdown UI.

---

## Strategy 1: Tracked Entity (Third-Person Orbit)

**What it does:** Camera orbits around the moving marker at a fixed distance and angle. The marker stays centered; camera rotates around it.

**Use case:** Overview/standard tour mode. Simple and reliable.

```javascript
function activateTrackedCamera(viewer, marker) {
  // Stop any active listeners
  viewer.scene.postUpdate.removeEventListener(overheadListener);
  viewer.scene.postUpdate.removeEventListener(firstPersonListener);
  
  // Enable tracking
  viewer.trackedEntity = marker;
  
  // Optional: customize distance and angle
  viewer.zoomTo(marker, new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(0),    // heading: 0° = north
    Cesium.Math.toRadians(-45),  // pitch: -45° = 45° downward look
    500                          // range: 500 meters away
  ));
}

// Activate
activateTrackedCamera(viewer, marker);
```

**Pros:**
- One-line camera control (`viewer.trackedEntity = entity`)
- Automatic offset calculations by Cesium
- Works with all entity types (models, points, billboards)

**Cons:**
- Fixed relative position (can't orbit heading dynamically)
- Limited customization

---

## Strategy 2: Overhead / Dynamic Camera

**What it does:** Camera stays above the route, rotating heading each frame for cinematic effect. Always maintains downward-looking pitch.

**Use case:** Scenic tour, route overview from above. Shows terrain and surroundings.

```javascript
// Define a callback function to update camera each frame
const overheadListener = function() {
  const currentPos = marker.position.getValue(viewer.clock.currentTime);
  
  if (!Cesium.defined(currentPos)) return;
  
  // Dynamic heading: rotates over time for orbiting effect
  const heading = Cesium.Math.toRadians(
    45 + (viewer.clock.currentTime.secondsOfDay * 5) % 360
  );
  
  const pitch = Cesium.Math.toRadians(-35);    // look down at ~35°
  const range = 1000;                          // stay 1km away
  
  viewer.camera.lookAt(
    currentPos,
    new Cesium.HeadingPitchRange(heading, pitch, range)
  );
};

function activateOverheadCamera(viewer, marker) {
  // Stop any active listeners
  viewer.scene.postUpdate.removeEventListener(firstPersonListener);
  viewer.trackedEntity = undefined;
  
  // Register new listener
  viewer.scene.postUpdate.addEventListener(overheadListener);
}

// Activate
activateOverheadCamera(viewer, marker);
```

**Pros:**
- Cinematic rotating effect
- Marker visible in context of terrain/surroundings
- Can adjust heading rotation speed or disable rotation

**Cons:**
- Requires manual listener management
- Terrain may occasionally occlude marker
- More complex setup

**Customize:**
- Change `pitch` value to look steeper/shallower
- Adjust `range` for closer/farther views
- Modify heading formula for different rotation speeds: `45 + (viewer.clock.currentTime.secondsOfDay * SPEED) % 360`

---

## Strategy 3: First-Person / POV Camera

**What it does:** Camera positioned at marker's location, looking in direction of travel. Very immersive perspective.

**Use case:** Hiking/running replay. Immersive playback of recorded movement.

```javascript
// Define a callback function to update camera each frame
const firstPersonListener = function() {
  const currentPos = marker.position.getValue(viewer.clock.currentTime);
  const currentOri = marker.orientation.getValue(viewer.clock.currentTime);
  
  if (!Cesium.defined(currentPos) || !Cesium.defined(currentOri)) return;
  
  // Create transformation matrix from marker's position + orientation
  const transform = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromQuaternion(currentOri),
    currentPos
  );
  
  // Position camera in marker's local reference frame
  // Offset: look straight ahead with slight downward pitch
  const offset = new Cesium.HeadingPitchRange(
    0,                          // heading: 0° = straight ahead
    Cesium.Math.toRadians(-20), // pitch: -20° = slight downward tilt
    0                           // range: 0 = at the marker center
  );
  
  viewer.camera.lookAtTransform(transform, offset);
};

function activateFirstPersonCamera(viewer, marker) {
  // Stop any active listeners
  viewer.scene.postUpdate.removeEventListener(overheadListener);
  viewer.trackedEntity = undefined;
  
  // Register new listener
  viewer.scene.postUpdate.addEventListener(firstPersonListener);
}

// Activate
activateFirstPersonCamera(viewer, marker);

// To exit first-person mode, reset camera lock:
function exitFirstPersonCamera(viewer) {
  viewer.scene.postUpdate.removeEventListener(firstPersonListener);
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}
```

**Pros:**
- Highly immersive
- Natural head-turning with marker's heading
- Great for action replay

**Cons:**
- Can be disorienting at sharp turns
- Requires smooth GPX data (interpolation helps)
- Complex quaternion math

**Tips:**
- For smoother experience, ensure GPX data is dense enough (small time steps between samples)
- Adjust `pitch` value (e.g., `-30` for more downward tilt)
- Adjust `range` if needed (0 = at marker, -100 = behind marker)

---

## Strategy 4a: Cinematic Path Camera (Smooth Follow-Cam)

**What it does:** Camera follows a secondary, interpolated path offset from the main route. Creates drone-like effect with smooth leading/trailing.

**Use case:** Professional tour presentation. Cinematic video-like replay.

```javascript
// Build separate camera path
function buildCinematicPath(gpxData, startTime) {
  const cameraPositions = new Cesium.SampledPositionProperty();
  const cameraLookAt = new Cesium.SampledPositionProperty();
  
  gpxData.forEach((waypoint, index) => {
    const time = Cesium.JulianDate.addSeconds(startTime, index * timeStep);
    
    // Camera position: elevated and offset behind route
    const camHeight = (waypoint.ele || 0) + 300;  // 300m above ground
    const camPos = Cesium.Cartesian3.fromDegrees(
      waypoint.lon,
      waypoint.lat,
      camHeight
    );
    cameraPositions.addSample(time, camPos);
    
    // Look-at point: ahead of current position
    const lookPos = Cesium.Cartesian3.fromDegrees(
      waypoint.lon,
      waypoint.lat,
      (waypoint.ele || 0) + 50  // look at lower altitude
    );
    cameraLookAt.addSample(time, lookPos);
  });
  
  return { positions: cameraPositions, lookAt: cameraLookAt };
}

// Use it
const cinemaPath = buildCinematicPath(gpxData, startTime);

// Define callback to update camera
const cinematicListener = function() {
  const camPos = cinemaPath.positions.getValue(viewer.clock.currentTime);
  const lookPos = cinemaPath.lookAt.getValue(viewer.clock.currentTime);
  
  if (!Cesium.defined(camPos) || !Cesium.defined(lookPos)) return;
  
  viewer.camera.position = camPos;
  viewer.camera.lookAt(
    lookPos,
    new Cesium.Cartesian3(0, 0, 1) // up vector
  );
};

function activateCinematicCamera(viewer) {
  // Stop any active listeners
  viewer.scene.postUpdate.removeEventListener(overheadListener);
  viewer.scene.postUpdate.removeEventListener(firstPersonListener);
  viewer.trackedEntity = undefined;
  
  // Register new listener
  viewer.scene.postUpdate.addEventListener(cinematicListener);
}

// Activate
activateCinematicCamera(viewer);
```

**Pros:**
- Professional, smooth camera movement
- Follows route with optimal framing
- Great for video/presentation

**Cons:**
- Complex to compute camera path
- Memory intensive for large GPX files
- Requires careful offset tuning

---

## Strategy 4b: Fixed Position Camera (Constant Viewpoint)

**What it does:** Camera fixed at a single location throughout playback, viewing the entire route from a stable vantage point. Camera never moves; only the marker moves.

**Use case:** Route overview. Shows full context without moving. Terrain/buildings don't occlude if positioned well.

```javascript
// Compute route centroid (center point)
function computeRouteCentroid(gpxData) {
  let sumLat = 0, sumLon = 0, sumEle = 0;
  gpxData.forEach(pt => {
    sumLat += pt.lat;
    sumLon += pt.lon;
    sumEle += (pt.ele || 0);
  });
  const count = gpxData.length;
  return {
    lat: sumLat / count,
    lon: sumLon / count,
    ele: sumEle / count
  };
}

function activateFixedCamera(viewer, gpxData) {
  // Stop any active listeners
  viewer.scene.postUpdate.removeEventListener(overheadListener);
  viewer.scene.postUpdate.removeEventListener(firstPersonListener);
  viewer.trackedEntity = undefined;
  
  const center = computeRouteCentroid(gpxData);
  
  // Position camera above and to the side of route center
  // Adjust these values based on your route's scale
  const cameraPosition = Cesium.Cartesian3.fromDegrees(
    center.lon,           // same longitude as center
    center.lat,           // same latitude as center
    center.ele + 2000     // 2km above route center (adjust as needed)
  );
  
  // Set camera view
  viewer.camera.setView({
    destination: cameraPosition,
    orientation: {
      heading: Cesium.Math.toRadians(0),    // north-facing
      pitch: Cesium.Math.toRadians(-60),    // 60° downward look
      roll: 0
    }
  });
}

// Activate
activateFixedCamera(viewer, gpxData);
```

**Pros:**
- Simplest to implement
- Camera never moves (stable viewing)
- Low performance impact
- Good for showing full route context

**Cons:**
- Static view (less cinematic)
- Terrain may block parts of route (adjust altitude/pitch)
- Only shows what's within view frustum

**Tune for your use case:**
```javascript
// Experiment with these parameters:
center.ele + 1000    // decrease for closer view, increase for farther
Cesium.Math.toRadians(-45)   // less negative = look more horizontal, more negative = look more down
Cesium.Math.toRadians(45)    // change heading to rotate view angle
```

---

## Complete UI Switch (All 4 Strategies)

```html
<div id="cameraControls">
  <label>Camera Mode:</label>
  <select id="cameraMode">
    <option value="tracked">Tracked (Orbit)</option>
    <option value="overhead">Overhead (Dynamic)</option>
    <option value="firstPerson">First-Person (POV)</option>
    <option value="cinematicDynamic">Cinematic (Follow-Cam)</option>
    <option value="cinematicFixed">Cinematic (Fixed View)</option>
  </select>
</div>
```

```javascript
const cameraStrategies = {
  tracked: () => activateTrackedCamera(viewer, marker),
  overhead: () => activateOverheadCamera(viewer, marker),
  firstPerson: () => activateFirstPersonCamera(viewer, marker),
  cinematicDynamic: () => activateCinematicCamera(viewer),
  cinematicFixed: () => activateFixedCamera(viewer, gpxData)
};

document.getElementById('cameraMode').addEventListener('change', (e) => {
  const strategy = e.target.value;
  cameraStrategies[strategy]();
});

// Default on load
activateTrackedCamera(viewer, marker);
```

---

## Key Implementation Notes

### Event Listeners
- **`viewer.scene.postUpdate`**: Fires after scene updates, before render. Use for camera updates[123][125].
- **`viewer.scene.preRender`**: Fires before rendering. Can use but postUpdate is more common for camera work[78][123].

### Camera Methods
- **`viewer.trackedEntity`**: Automatic tracking; simplest but least flexible[120][46].
- **`viewer.camera.lookAt()`**: Manual positioning; works with absolute world positions[121].
- **`viewer.camera.lookAtTransform()`**: Positions camera in a local reference frame (entity-relative)[37][121].
- **`viewer.camera.setView()`**: One-time camera placement; doesn't lock position[121].

### Removing Listeners
Always clean up old listeners before adding new ones to prevent duplicate callbacks:
```javascript
viewer.scene.postUpdate.removeEventListener(overheadListener);
viewer.scene.postUpdate.removeEventListener(firstPersonListener);
viewer.trackedEntity = undefined;
```

### HeadingPitchRange Parameters
- **Heading**: Azimuth direction (radians, 0 = north, π/2 = east)
- **Pitch**: Look angle (radians, 0 = horizontal, -π/2 = straight down)
- **Range**: Distance from target (meters)

---

## Summary Table

| Strategy | Complexity | Visual | Use Case |
|----------|-----------|--------|----------|
| Tracked | Low | Standard orbiting | Quick overview |
| Overhead | Medium | Dynamic rotating above | Scenic presentation |
| First-Person | Medium-High | Immersive forward view | Action replay |
| Cinematic (Dynamic) | High | Smooth follow-cam | Professional video |
| Cinematic (Fixed) | Low | Static overview | Full context view |

Choose based on your tour's purpose and audience!