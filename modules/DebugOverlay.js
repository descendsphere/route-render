import logger from './Logger.js';

/**
 * A utility class to manage a circular buffer for calculating moving averages.
 */
class MovingAverage {
    constructor(size = 60) {
        this.size = size;
        this.buffer = [];
        this.sum = 0;
        this.pointer = 0;
    }

    add(value) {
        if (this.buffer.length < this.size) {
            this.buffer.push(value);
        } else {
            this.sum -= this.buffer[this.pointer];
            this.buffer[this.pointer] = value;
        }
        this.sum += value;
        this.pointer = (this.pointer + 1) % this.size;
    }

    get average() {
        if (this.buffer.length === 0) return 0;
        return this.sum / this.buffer.length;
    }
}


/**
 * A real-time on-screen display for performance and memory metrics.
 */
class DebugOverlay {
    constructor(parentContainer) {
        this.overlay = document.createElement('div');
        this.overlay.id = 'debug-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 70px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00FF00;
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #00FF00;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            display: none; /* Hidden by default */
            line-height: 1.5;
        `;
        parentContainer.appendChild(this.overlay);

        // Initialize moving averages
        this.heapAvg = new MovingAverage(120);

        logger.info('DebugOverlay initialized.');
    }

    show() {
        this.overlay.style.display = 'block';
    }

    hide() {
        this.overlay.style.display = 'none';
    }

    _getLocalStorageUsage() {
        let total = 0;
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length * 2; // UTF-16 characters are 2 bytes
            }
        }
        return total; // size in bytes
    }

    update(metrics = {}) {
        const { usedHeap = 'N/A' } = metrics;
        
        // Update moving average for heap
        if (usedHeap !== 'N/A') {
            this.heapAvg.add(usedHeap);
        }

        const heapNow = (usedHeap !== 'N/A') ? (usedHeap / 1048576).toFixed(1) : 'N/A';
        const heapAvg = (this.heapAvg.average / 1048576).toFixed(1);
        const memoryString = `JS Heap (MB): ${heapNow} (Avg: ${heapAvg})`;

        // Note: LocalStorage is updated by a separate, slower timer.
        const storageUsed = metrics.storageUsed !== undefined ? metrics.storageUsed : this.lastStorageUsed;
        this.lastStorageUsed = storageUsed; // Cache the value
        const storageString = `LocalStorage: ${(storageUsed !== undefined) ? (storageUsed / 1024).toFixed(2) : 'N/A'} KB`;

        this.overlay.innerHTML = `
            ${memoryString}<br>
            ${storageString}
        `;
    }
}

export default DebugOverlay;
