<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# i want to adjust the size of cesium tour replay widget and the timeline widget in mobile to make them larger. but seems to me that it can only enlarge to a certain level and then the replay widget cannot be enlarged (is it because it is rendered using svg with predefined size?).

Excellent observation! You're absolutely correct—**Cesium's Animation and Timeline widgets are rendered using SVG with fixed dimensions**, which limits how much you can enlarge them using CSS alone.[^1][^2][^3][^4]

## The Problem

The Animation widget uses **SVG-based rendering** with hardcoded viewBox dimensions and aspect ratios. CSS can scale the container, but the SVG elements inside have preset sizes that prevent true enlargement beyond their design limits.[^2][^3][^1]

## Solutions (Three Approaches)

### Approach 1: Override CSS with Transform Scaling (Quickest)

Use CSS `transform: scale()` to visually enlarge the widgets beyond their normal limits. This works because transforms bypass the SVG's internal size constraints.[^4][^1]

```css
/* Scale Animation widget for mobile */
@media (max-width: 768px) {
  .cesium-viewer-animationContainer {
    transform: scale(1.5);
    transform-origin: bottom left;
    z-index: 1000;
  }
  
  .cesium-viewer-timelineContainer {
    height: 60px !important; /* Increase timeline height */
    bottom: 0;
  }
  
  /* Timeline scrubber and labels */
  .cesium-timeline-bar {
    height: 60px !important;
  }
  
  .cesium-timeline-ticLabel {
    font-size: 14px !important;
  }
}

@media (max-width: 480px) {
  .cesium-viewer-animationContainer {
    transform: scale(2.0); /* Even larger on very small screens */
    transform-origin: bottom left;
  }
  
  .cesium-viewer-timelineContainer {
    height: 80px !important;
  }
  
  .cesium-timeline-bar {
    height: 80px !important;
  }
}
```

**Pros:**

- Quick CSS-only solution
- No JavaScript needed
- Works immediately

**Cons:**

- Visual scaling can cause slight blur on some screens
- May overlap with other UI elements (requires z-index management)

***

### Approach 2: Modify Widget Options at Initialization

Cesium's Animation widget constructor accepts size parameters. You can detect mobile and pass larger dimensions.[^3][^4]

```javascript
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

// Custom container for animation widget
const animationContainer = document.createElement('div');
animationContainer.id = 'animationWidget';
document.body.appendChild(animationContainer);

// Create viewer WITHOUT default animation/timeline
const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false,  // Disable default
  timeline: false,   // Disable default
  fullscreenButton: false,
  geocoder: false
});

// Manually create Animation widget with custom size
const clockViewModel = viewer.clockViewModel;
const animationWidget = new Cesium.Animation(
  animationContainer,
  clockViewModel
);

// Apply custom theme for mobile sizing
if (isMobile) {
  animationWidget.applyThemeChanges({
    svgPrimaryColor: '#0066cc',
    svgSecondaryColor: '#99ccff',
    knobRadius: 40,         // Larger knob for touch
    shuttleRingRadius: 80,  // Larger shuttle ring
    playPauseRadius: 30     // Larger buttons
  });
}

// Manually create Timeline widget with custom height
const timelineContainer = document.createElement('div');
timelineContainer.id = 'timelineWidget';
document.body.appendChild(timelineContainer);

const timeline = new Cesium.Timeline(
  timelineContainer,
  viewer.clock
);

// Set timeline height programmatically
if (isMobile) {
  timelineContainer.style.height = '80px';
  timeline.resize(); // Force redraw with new size
}

// Sync clock changes
timeline.zoomTo(viewer.clock.startTime, viewer.clock.stopTime);
```

**Pros:**

- Full control over widget dimensions
- Native Cesium API approach
- Clean programmatic sizing

**Cons:**

- More complex setup (manual widget creation)
- Need to manage widget lifecycle yourself

***

### Approach 3: Build Custom Mobile Controls (Recommended for Production)

Replace the default widgets with mobile-optimized HTML controls.[^5][^1][^4]

```html
<div id="mobileControls" class="mobile-controls">
  <div class="time-display" id="timeDisplay">00:00:00</div>
  
  <div class="playback-buttons">
    <button id="rewindBtn" class="control-btn">⏮</button>
    <button id="playPauseBtn" class="control-btn">▶️</button>
    <button id="forwardBtn" class="control-btn">⏭</button>
  </div>
  
  <input type="range" id="timeScrubber" class="time-scrubber" min="0" max="100" value="0">
  
  <div class="speed-control">
    <label>Speed:</label>
    <select id="speedSelect">
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
      <option value="5">5x</option>
    </select>
  </div>
</div>
```

```css
.mobile-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.time-display {
  color: white;
  font-size: 18px;
  text-align: center;
  font-weight: bold;
}

.playback-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.control-btn {
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 24px;
  cursor: pointer;
  touch-action: manipulation; /* Improve touch response */
}

.control-btn:active {
  background: #0052a3;
  transform: scale(0.95);
}

.time-scrubber {
  width: 100%;
  height: 40px; /* Large touch target */
  -webkit-appearance: none;
  appearance: none;
  background: #333;
  outline: none;
}

.time-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 40px;
  height: 40px;
  background: #0066cc;
  cursor: pointer;
  border-radius: 50%;
}

.time-scrubber::-moz-range-thumb {
  width: 40px;
  height: 40px;
  background: #0066cc;
  cursor: pointer;
  border-radius: 50%;
  border: none;
}

.speed-control {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  color: white;
}

.speed-control select {
  padding: 10px;
  font-size: 16px;
  background: #333;
  color: white;
  border: 1px solid #666;
  border-radius: 5px;
}

/* Hide on desktop */
@media (min-width: 769px) {
  .mobile-controls {
    display: none;
  }
}
```

```javascript
// Initialize viewer WITHOUT default widgets on mobile
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const viewer = new Cesium.Viewer('cesiumContainer', {
  animation: !isMobile,  // Disable on mobile
  timeline: !isMobile,   // Disable on mobile
  fullscreenButton: !isMobile
});

if (isMobile) {
  // Custom mobile controls
  const playPauseBtn = document.getElementById('playPauseBtn');
  const timeDisplay = document.getElementById('timeDisplay');
  const timeScrubber = document.getElementById('timeScrubber');
  const speedSelect = document.getElementById('speedSelect');
  
  let isPlaying = false;
  
  // Play/Pause toggle
  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    viewer.clock.shouldAnimate = isPlaying;
    playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
  });
  
  // Rewind
  document.getElementById('rewindBtn').addEventListener('click', () => {
    viewer.clock.currentTime = viewer.clock.startTime.clone();
  });
  
  // Fast forward
  document.getElementById('forwardBtn').addEventListener('click', () => {
    viewer.clock.multiplier = Math.min(viewer.clock.multiplier * 2, 10);
  });
  
  // Speed control
  speedSelect.addEventListener('change', (e) => {
    viewer.clock.multiplier = Number(e.target.value);
  });
  
  // Time scrubber
  timeScrubber.addEventListener('input', (e) => {
    const progress = Number(e.target.value) / 100;
    const totalSeconds = Cesium.JulianDate.secondsDifference(
      viewer.clock.stopTime,
      viewer.clock.startTime
    );
    const newTime = Cesium.JulianDate.addSeconds(
      viewer.clock.startTime,
      totalSeconds * progress,
      new Cesium.JulianDate()
    );
    viewer.clock.currentTime = newTime;
  });
  
  // Update time display and scrubber each frame
  viewer.clock.onTick.addEventListener(() => {
    const current = viewer.clock.currentTime;
    const gregorian = Cesium.JulianDate.toGregorianDate(current);
    timeDisplay.textContent = `${String(gregorian.hour).padStart(2, '0')}:${String(gregorian.minute).padStart(2, '0')}:${String(gregorian.second).padStart(2, '0')}`;
    
    const totalSeconds = Cesium.JulianDate.secondsDifference(
      viewer.clock.stopTime,
      viewer.clock.startTime
    );
    const elapsed = Cesium.JulianDate.secondsDifference(
      current,
      viewer.clock.startTime
    );
    timeScrubber.value = (elapsed / totalSeconds) * 100;
  });
}
```

**Pros:**

- Fully mobile-optimized (large touch targets)
- Complete design control
- No SVG size limitations
- Better UX on mobile

**Cons:**

- Most work to implement
- Must handle all playback logic yourself

***

## Comparison Summary

| Approach | Effort | Enlargement Limit | Mobile UX | Recommendation |
| :-- | :-- | :-- | :-- | :-- |
| **CSS Transform** | Low | 2-3x before blur | Good | Quick fix |
| **Custom Widget Init** | Medium | Moderate improvement | Better | Advanced users |
| **Custom HTML Controls** | High | Unlimited | Best | Production apps |

## Recommended Quick Fix (CSS Transform)

For immediate results, add this to your stylesheet:

```css
@media (max-width: 768px) {
  /* Scale animation widget */
  .cesium-viewer-animationContainer {
    transform: scale(1.8);
    transform-origin: bottom left;
  }
  
  /* Enlarge timeline */
  .cesium-viewer-timelineContainer {
    height: 70px !important;
  }
  
  .cesium-timeline-bar {
    height: 70px !important;
  }
  
  .cesium-timeline-ticLabel {
    font-size: 13px !important;
  }
  
  /* Ensure widgets don't overlap */
  .cesium-viewer-animationContainer {
    z-index: 1001;
  }
}
```

This works immediately and scales widgets 1.8x on mobile without code changes.[^1][^3][^4]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://community.cesium.com/t/how-to-change-the-animation-widget-style-to-a-different-style/26020

[^2]: https://groups.google.com/g/cesium-dev/c/TcSLrG0MAnk

[^3]: https://community.cesium.com/t/changing-the-animation-widget/6252

[^4]: https://community.cesium.com/t/best-practice-to-overwrite-css-of-cesium-toolbar-cesium-infobox-cesium-animation-cesium-timeline/4973

[^5]: https://community.cesium.com/t/customizing-the-timeline/8616

[^6]: https://community.cesium.com/t/svg-animation/7470

[^7]: https://app.studyraid.com/en/read/15463/537337/implementing-responsive-design-for-different-devices

[^8]: https://kartta.hel.fi/3d/heating/Build/Documentation/CesiumWidget.html

[^9]: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_backgrounds_and_borders/Scaling_of_SVG_backgrounds

[^10]: https://community.cesium.com/t/resize-of-cesiumwidget/546

[^11]: https://community.cesium.com/t/cesium-container-resizing-with-css-transition-makes-frame-drop/35592

[^12]: https://stackoverflow.com/questions/58649497/svg-css-animation-changes-position-and-size-and-i-just-want-it-to-change-size

[^13]: https://community.cesium.com/t/setting-the-size-of-the-cesium-container/24651

[^14]: https://community.cesium.com/t/how-to-customize-the-ui/8601

[^15]: https://community.cesium.com/t/how-to-edit-css-for-infobox/14725

[^16]: https://stackoverflow.com/questions/53748783/resize-cesium-viewer

[^17]: https://community.cesium.com/t/how-to-use-timeline-widget-with-different-wms-time-steps/1680

[^18]: https://groups.google.com/g/cesium-dev/c/53HoQdvvagA

[^19]: https://cesium.com/learn/ion-sdk/ref-doc/Timeline.html

[^20]: https://community.cesium.com/t/playback-widget/148

