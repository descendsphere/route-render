class GpxGenerator {
  /**
   * Generates a GPX XML string from an array of route points.
   * @param {Array<object>} points - Array of points with lat, lon, ele, and time properties.
   * @param {string} routeName - The name of the route.
   * @returns {string} A string containing the GPX data in XML format.
   */
  static generate(points, routeName) {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="GPX 3D Player">
  <metadata>
    <name>${routeName}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${routeName}</name>
    <trkseg>`;

    const footer = `    </trkseg>
  </trk>
</gpx>`;

    const trackPoints = points.map(p => {
      const timeTag = p.time ? `<time>${p.time.toISOString()}</time>` : '';
      const eleTag = p.ele !== undefined && p.ele !== null ? `<ele>${p.ele.toFixed(2)}</ele>` : '';
      let trkpt = `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">`;
      if (eleTag) {
        trkpt += `\n        ${eleTag}`;
      }
      if (timeTag) {
        trkpt += `\n        ${timeTag}`;
      }
      trkpt += `\n      </trkpt>`;
      return trkpt;
    }).join('\n');

    return `${header}\n${trackPoints}\n${footer}`;
  }
}

export default GpxGenerator;
