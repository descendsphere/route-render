import logger from './Logger.js';

class Person {
  constructor(viewer) {
    this.viewer = viewer;
    this.entity = null;
  }

  /**
   * Creates the person entity with a billboard and a label.
   */
  create() {
    logger.info('Creating person entity.');
      this.entity = this.viewer.entities.add({
        billboard: {
          image: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', // A generic marker icon
          color: Cesium.Color.ORANGE,
          scale: 1,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // Anchor billboard at its bottom
        },
        label: {
          text: '',
          font: '12pt sans-serif',
          showBackground: true,
          backgroundColor: new Cesium.Color(0.1, 0.1, 0.1, 0.7),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // Anchor label at its bottom
          pixelOffset: new Cesium.Cartesian2(0, -50),
        },
      });
  }

  /**
   * Updates the style of the person entity.
   * @param {object} style - The style options.
   * @param {number} style.size - The new size (scale) of the billboard.
   * @param {string} style.color - The new color of the billboard.
   */
  updateStyle({ size, color }) {
    if (this.entity) {
      if (size) {
        this.entity.billboard.scale = size;
      }
      if (color) {
        this.entity.billboard.color = Cesium.Color.fromCssColorString(color);
      }
    }
  }
}

export default Person;
