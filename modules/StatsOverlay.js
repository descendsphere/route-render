import logger from './Logger.js';

class StatsOverlay {
  constructor() {
    this.bottomPanel = document.getElementById('bottom-panel-container');
    if (!this.bottomPanel) {
      logger.error('Fatal: #bottom-panel-container not found in DOM.');
      return;
    }

    // Main container
    this.container = document.createElement('div');
    this.container.id = 'stats-overlay-content'; // New ID
    // All inline styles removed, will be controlled by CSS
    this.bottomPanel.appendChild(this.container);

    // --- Route Stats Section ---
    this.routeStatsSection = this._createCollapsibleSection('Route Stats');
    this.container.appendChild(this.routeStatsSection.container);

    const separator = document.createElement('div');
    separator.style.cssText = 'height: 1px; background-color: rgba(255, 255, 255, 0.2); margin: 2px 0;';
    this.container.appendChild(separator);

    // --- Replay Stats Section ---
    this.replayStatsSection = this._createCollapsibleSection('Replay Stats');
    this.container.appendChild(this.replayStatsSection.container);
    this.replayStatsSection.container.style.display = 'none'; // Hidden by default

    // NEW: Add slider container
    this.replayStatsSliders = document.createElement('div');
    this.replayStatsSliders.className = 'replay-stats-sliders';
    this.replayStatsSection.container.appendChild(this.replayStatsSliders);

    logger.info('StatsOverlay initialized and added to DOM.');
  }

  getSliderContainer() {
    return this.replayStatsSliders;
  }

  _createCollapsibleSection(title) {
    const container = document.createElement('div');
    
    const header = document.createElement('div');
    header.style.cssText = 'margin: 0; padding: 3px 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-weight: bold;';
    
    const titleElement = document.createElement('span');
    titleElement.textContent = title;
    titleElement.style.cssText = 'font-weight: bold; pointer-events: none;';

    const summaryElement = document.createElement('div');
    summaryElement.style.cssText = 'flex-grow: 1; text-align: center; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 4px; font-weight: normal; font-size: 13px; pointer-events: none;';

    const summaryMetrics = [
        document.createElement('span'),
        document.createElement('span'),
        document.createElement('span'),
        document.createElement('span')
    ];
    summaryMetrics.forEach(span => summaryElement.appendChild(span));

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'toggle-icon';
    toggleIcon.innerHTML = '▾';
    toggleIcon.style.cssText = 'line-height: 1; font-size: 18px; transform-origin: center; user-select: none; pointer-events: none;';
    
    header.appendChild(titleElement);
    header.appendChild(summaryElement);
    header.appendChild(toggleIcon);

    const content = document.createElement('div');
    content.style.cssText = 'padding-top: 0px; margin-top: 0px;';
    
    header.addEventListener('click', (e) => {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        toggleIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    });
    
    container.appendChild(header);
    container.appendChild(content);

    return { container, header, titleElement, summaryElement, content, summaryMetrics };
  }

  // --- Public Methods for Controlling Sections ---

  expandRouteStats() {
      this.routeStatsSection.content.style.display = 'block';
      this.routeStatsSection.header.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
  }

  collapseRouteStats() {
      this.routeStatsSection.content.style.display = 'none';
      this.routeStatsSection.header.querySelector('.toggle-icon').style.transform = 'rotate(-90deg)';
  }

  showReplayStats() {
      this.replayStatsSection.container.style.display = 'block';
  }
  
  hideReplayStats() {
      this.replayStatsSection.container.style.display = 'none';
  }

  expandReplayStats() {
      this.replayStatsSection.content.style.display = 'block';
      this.replayStatsSection.header.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
  }

  // --- Public Methods for Updating Content ---

  updateRouteStats(stats) {
    const metrics = this.routeStatsSection.summaryMetrics;
    metrics[0].innerHTML = (stats.totalDistance !== undefined) ? `↔️ ${stats.totalDistance}<span class="unit-label"> km</span>` : '';
    metrics[1].innerHTML = (stats.totalElevationGain !== undefined) ? `▲ ${parseFloat(stats.totalElevationGain).toFixed(0)}<span class="unit-label"> m</span>` : '';
    metrics[2].innerHTML = (stats.totalCalories !== undefined) ? `🔥 ${stats.totalCalories}<span class="unit-label"> KCAL</span>` : '';
    metrics[3].innerHTML = (stats.totalKmEffort !== undefined) ? `👟 ${stats.totalKmEffort}` : '';
    
    let contentHtml = '';
    
    // Line 1: Actual time and averages
    if (stats.totalDurationString) {
        contentHtml += '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 10px; align-items: center; margin-bottom: 4px;">';
        contentHtml += `<span>Actual: ${stats.totalDurationString}</span>`;
        if (stats.overallAverageSpeed) {
            contentHtml += `<span style="text-align: center;">💨 ${stats.overallAverageSpeed} km/h</span>`;
            contentHtml += `<span style="text-align: center;">📈 ${parseFloat(stats.overallAverageAscentRate).toFixed(0)} m/h</span>`;
            if (stats.overallAverageKmEffort) contentHtml += `<span style="text-align: center;">👟 ${stats.overallAverageKmEffort}/h</span>`;
        }
        contentHtml += '</div>';
    }

    // Line 2: Plan time
    if (stats.totalPlannedTime) {
        contentHtml += `<div><span>Plan: ${this._formatTime(stats.totalPlannedTime)}</span></div>`;
    }
    

    this.routeStatsSection.content.innerHTML = contentHtml;
    // Hide content if it's empty
    this.routeStatsSection.content.style.display = contentHtml.trim() ? 'block' : 'none';
    this.routeStatsSection.header.querySelector('.toggle-icon').style.display = contentHtml.trim() ? 'block' : 'none';

  }

  updateReplayStats(liveStats, hasNativeTimestamps) {
    const metrics = this.replayStatsSection.summaryMetrics;
    if (liveStats) {
        metrics[0].innerHTML = `↔️ ${liveStats.distance}<span class="unit-label"> km</span>`;
        metrics[1].innerHTML = `▲ ${liveStats.ascent}<span class="unit-label"> m</span>`;
        metrics[2].innerHTML = (liveStats.kcal) ? `🔥 ${liveStats.kcal}<span class="unit-label"> Kcal</span>` : '';
        metrics[3].innerHTML = `⏱️ ${liveStats.elapsedTime}`;
    } else {
        metrics.forEach(m => m.innerHTML = '');
    }

    let contentHtml = '<table style="width: 100%; border-spacing: 0 2px; font-size: 12px;">';
    // Add units to header on a single line
    contentHtml += `
      <thead>
        <tr>
          <th style="text-align: left; font-weight: normal; color: #ccc;">Metric</th>
          <th style="text-align: right; font-weight: normal; color: #ccc;">💨 <span>(km/h)</span></th>
          <th style="text-align: right; font-weight: normal; color: #ccc;">📈 <span>(m/h)</span></th>
          <th style="text-align: right; font-weight: normal; color: #ccc;">👟 <span>(/h)</span></th>
        </tr>
      </thead>
    `;

    contentHtml += '<tbody>';
    // Remove units from rows
    if (liveStats) {
      if (hasNativeTimestamps) {
        contentHtml += `
          <tr>
            <td style="text-align: left;">Actual</td>
            <td style="text-align: right;">${liveStats.actualSpeed}</td>
            <td style="text-align: right;">${liveStats.actualVSpeed}</td>
            <td style="text-align: right;">${liveStats.actualKmEffortRate}</td>
          </tr>
        `;
      }
      contentHtml += `
        <tr>
          <td style="text-align: left;">Plan</td>
          <td style="text-align: right;">${liveStats.plannedSpeed}</td>
          <td style="text-align: right;">${liveStats.plannedVSpeed}</td>
          <td style="text-align: right;">${liveStats.plannedKmEffortRate}</td>
        </tr>
      `;
    }
    contentHtml += '</tbody></table>';
    
    this.replayStatsSection.content.innerHTML = contentHtml;
  }
  
  _formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  show() { this.container.style.display = 'block'; }
  hide() { this.container.style.display = 'none'; }
}

export default StatsOverlay;