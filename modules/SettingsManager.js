import logger from './Logger.js';

/**
 * @typedef {object} SettingMeta
 * @property {'string'|'number'|'boolean'} type - The data type of the setting.
 * @property {*} defaultValue - The default value for the setting.
 * @property {boolean} [url=false] - Whether this setting can be configured via URL parameters.
 * @property {number} [min] - The minimum allowed value (for 'number' type).
 * @property {number} [max] - The maximum allowed value (for 'number' type).
 * @property {Array<string>} [options] - A list of valid string options (for 'string' type).
 */

class SettingsManager {
    /**
     * @private
     * @type {Object.<string, SettingMeta>}
     */
    _settingsSchema = {
        cameraStrategy: {
            type: 'string',
            defaultValue: 'cinematic',
            url: true,
            options: ['overhead', 'third-person', 'cinematic'],
        },
        cameraDistance: {
            type: 'number',
            defaultValue: 1000,
            url: true,
            min: 50,
            max: 50000,
        },
        cameraPitch: {
            type: 'number',
            defaultValue: -45,
            url: true,
            min: -90,
            max: 0,
        },
        smoothingPeriodSeconds: {
            type: 'number',
            defaultValue: 10, // Default to 10 seconds smoothing
            url: true,
            min: 1, // Minimum 1 second smoothing
            max: 60, // Maximum 60 seconds smoothing
        },
        debugOverlay: {
            type: 'boolean',
            defaultValue: false,
            url: true
        },

    // --- Camera Settings ---
        cameraPathDetail: {
            type: 'number',
            defaultValue: 100,
            url: true,
            min: 50,
            max: 1000,
        },
        cameraSplineTension: {
            type: 'number',
            defaultValue: 0.5,
            url: true,
            min: 0.0,
            max: 1.0,
        },
        cameraLookAheadTime: {
            type: 'number',
            defaultValue: 3600, // 60 minutes
            url: true,
            min: 900,   // 15 minutes
            max: 36000, // 600 minutes
        },
        cameraMaxAzimuth: {
            type: 'number',
            defaultValue: 45, // degrees
            url: true,
            min: 0,
            max: 180,
        },
        cameraAzimuthFreq: {
            type: 'number',
            defaultValue: 0.1,
            url: true,
            min: 0.01,
            max: 1.0,
        },
        cameraTransitionDur: {
            type: 'number',
            defaultValue: 3, // seconds
            url: true,
            min: 0,
            max: 10,
        },
        cameraGazeSmoothing: {
            type: 'number',
            defaultValue: 1800, // 30 minutes
            url: true,
            min: 300,  // 5 minutes
            max: 3600, // 60 minutes
        },
        cameraPathSampleDensity: {
            type: 'number',
            defaultValue: 2, // Samples per minute. Larger = smoother path but longer load time.
            url: true,
            min: 1,  // 1 sample per minute
            max: 12, // 1 sample every 5 seconds
        },
        tourSpeed: {
            type: 'number',
            defaultValue: 1,
            url: true,
            min: 0.03125,
            max: 8,
        },
        // Other settings will be added here as we refactor the application.
    };

    /**
     * @private
     * @type {Map<string, any>}
     */
    _values = new Map();

    /**
     * @private
     * @type {Map<string, Array<Function>>}
     */
    _subscribers = new Map();

    constructor() {
        if (SettingsManager._instance) {
            return SettingsManager._instance;
        }
        SettingsManager._instance = this;

        this._initializeDefaults();
        this._parseUrlParameters(); // NEW: Parse URL parameters on startup
        logger.info('SettingsManager initialized.');
    }

    /**
     * @private
     * Parses URL query parameters and applies them to settings if they are marked as 'url: true' in the schema.
     */
    _parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        for (const [key, value] of urlParams.entries()) {
            const schema = this._settingsSchema[key];
            if (schema && schema.url) {
                logger.info(`SettingsManager: Applying URL parameter "${key}" with value "${value}".`);
                this.set(key, value); // Use set to apply value and trigger validation/notification
            }
        }
    }

    /**
     * @private
     * Initializes the settings with default values from the schema.
     */
    _initializeDefaults() {
        for (const key in this._settingsSchema) {
            this._values.set(key, this._settingsSchema[key].defaultValue);
        }
    }

    /**
     * Retrieves the current value of a setting.
     * @param {string} key The key of the setting to retrieve.
     * @returns {*} The value of the setting.
     */
    get(key) {
        if (!this._values.has(key)) {
            logger.warn(`SettingsManager: Attempted to get unknown setting "${key}".`);
            return null;
        }
        return this._values.get(key);
    }

    /**
     * Updates the value of a setting and notifies subscribers.
     * @param {string} key The key of the setting to update.
     * @param {*} value The new value.
     */
    set(key, value) {
        const schema = this._settingsSchema[key];
        if (!schema) {
            logger.warn(`SettingsManager: Attempted to set unknown setting "${key}".`);
            return;
        }

        const validatedValue = this._validate(key, schema, value);

        if (this._values.get(key) !== validatedValue) {
            this._values.set(key, validatedValue);
            logger.info(`SettingsManager: Set "${key}" to`, validatedValue);
            this._notify(key, validatedValue);
        }
    }

    /**
     * Subscribes to changes for a specific setting.
     * @param {string} key The key of the setting to subscribe to.
     * @param {Function} callback The function to call when the setting changes.
     * @returns {Function} An unsubscribe function.
     */
    subscribe(key, callback) {
        if (!this._subscribers.has(key)) {
            this._subscribers.set(key, []);
        }
        this._subscribers.get(key).push(callback);

        // Return an unsubscribe function for cleanup
        return () => {
            const subs = this._subscribers.get(key);
            if (subs) {
                const index = subs.indexOf(callback);
                if (index > -1) {
                    subs.splice(index, 1);
                }
            }
        };
    }

    /**
     * @private
     */
    _notify(key, value) {
        if (this._subscribers.has(key)) {
            this._subscribers.get(key).forEach(callback => callback(value));
        }
    }

    /**
     * @private
     * Validates a value against its schema definition.
     */
    _validate(key, schema, value) {
        let result = value;
        switch (schema.type) {
            case 'number':
                result = parseFloat(value);
                if (isNaN(result)) {
                    logger.warn(`SettingsManager: Invalid number value for "${key}". Reverting to default.`);
                    return schema.defaultValue;
                }
                if (schema.min !== undefined) result = Math.max(schema.min, result);
                if (schema.max !== undefined) result = Math.min(schema.max, result);
                return result;
            case 'string':
                if (schema.options && !schema.options.includes(value)) {
                    logger.warn(`SettingsManager: Invalid option "${value}" for "${key}". Reverting to default.`);
                    return schema.defaultValue;
                }
                return result;
            case 'boolean':
                return String(value) === 'true';
            default:
                return result;
        }
    }
}

// Export a single, frozen instance to enforce the singleton pattern.
const instance = new SettingsManager();
Object.freeze(instance);

export default instance;
