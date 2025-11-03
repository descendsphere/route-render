import logger from './Logger.js';

class Person {
  constructor(viewer) {
    this.viewer = viewer;
    this.entity = null;
  }

  /**
   * Creates the person entity.
   */
  create() {
    logger.info('Creating person entity.');
    this.entity = this.viewer.entities.add({
      name: 'Person',
      position: Cesium.Cartesian3.fromDegrees(0, 0, 0), // Initial position
      ellipsoid: {
        //radii: new Cesium.Cartesian3(10, 10, 10),
        radii: new Cesium.Cartesian3(2, 2, 2),
        material: Cesium.Color.BLUE,
      },
    });
  }

  /**
   * Updates the position of the person entity.
   * @param {Cesium.Cartesian3} position - The new position.
   */
  updatePosition(position) {
    if (this.entity) {
      this.entity.position = position;
    }
  }
}

export default Person;
