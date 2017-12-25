import { times } from 'lodash';
import { action, observable, computed } from 'mobx';
import haversine from 'haversine';
import Alert from 'react-s-alert';

import userLocation from './user-location.js';

class Autopilot {

  steptimer = null // inner setTimout to move next location

  @observable paused = false
  @observable running = false // is the autopilot running
  @observable steps = []
  @observable speed = 13 / 3600 // 0.0025 ~= 2,5m/s ~= 9 km/h
  @observable distance = 0 // remaining distance to arrival in km
  @observable rawOverviewPath = null // save last query to re-calculate optimized route
  @observable destination = { lat: null, lng: null };

  @computed get accurateSteps() {
    if (this.rawOverviewPath) {
      const { steps } = this.calculateIntermediateSteps(this.rawOverviewPath);
      return steps;
    }
    return [];
  }

  @computed get clean() {
    return !this.running && !this.paused;
  }

  @computed get time() {
    const speed = this.speed * 3600; // to km/h
    const hours = Math.floor(this.distance / speed);
    const minutes = Math.floor(((this.distance / speed) * 60) % 60);

    if (isNaN(hours) || isNaN(minutes)) {
      return '0 minutes';
    }

    if (hours >= 1) {
      return `${hours}h ${minutes} minutes`;
    }
    return `${minutes} minutes`;
  }

  travelModes = [
    ['walk', 9, 'blind'],
    ['cycling', 13, 'bicycle'], // Credit to https://github.com/DJLectr0
    ['bike', 35, 'motorcycle'], // Credit to https://github.com/DJLectr0
    ['truck', 80, 'truck'],
    ['car', 120, 'car'],
    ['teleport', '~', 'star']
  ];

  findDirectionPath = (lat, lng) => new Promise((resolve, reject) => {
    const { google: { maps } } = window;
    this.destination = { lat, lng };

    // prepare `directionsRequest` to google map
    const directionsService = new maps.DirectionsService();
    const directionsRequest = {
      origin: new maps.LatLng({ lat: userLocation[0], lng: userLocation[1] }),
      destination: new maps.LatLng(this.destination),
      travelMode: maps.TravelMode.WALKING,
      unitSystem: maps.UnitSystem.METRIC
    };

    // ask google map to find a route
    directionsService.route(directionsRequest, (response, status) => {
      if (status === maps.DirectionsStatus.OK) {
        const { routes: [{ overviewPath }] } = response;
        this.rawOverviewPath = overviewPath;
        return resolve(overviewPath);
      }

      this.rawOverviewPath = null;
      return reject(status);
    });
  })

  calculateIntermediateSteps = foundPath =>
    foundPath.reduce(
      (result, { lat: endLat, lng: endLng }, idx) => {
        if (idx > 0) {
          const { lat: startLat, lng: startLng } = foundPath[idx - 1];

          const pendingDistance = haversine(
            { latitude: startLat(), longitude: startLng() },
            { latitude: endLat(), longitude: endLng() }
          );

          if (isNaN(this.speed)) {
            return {
              distance: result.distance + pendingDistance,
              steps: [{ lat: endLat(), lng: endLng() }]
            };
          }

          // 0.0025 ~= 2,5m/s ~= 9 km/h
          const splitInto = (pendingDistance / this.speed).toFixed();

          const latSteps = (Math.abs(startLat() - endLat())) / splitInto;
          const lngSteps = (Math.abs(startLng() - endLng())) / splitInto;

          const stepsInBetween = times(splitInto, (step) => {
            const calculatedLat = (startLat() > endLat()) ?
              startLat() - (latSteps * step) : startLat() + (latSteps * step);
            const calculatedLng = (startLng() > endLng()) ?
              startLng() - (lngSteps * step) : startLng() + (lngSteps * step);

            return { lat: calculatedLat, lng: calculatedLng };
          });

          // TODO: force step on last desired coord in each segment
          // NOTE: this potentially simulates a stop at each 'intersection' and final destination
          stepsInBetween.push({ lat: endLat(), lng: endLng() });

          return {
            distance: result.distance + pendingDistance,
            steps: [...result.steps, ...stepsInBetween]
          };
        }
        return result;
      },
      { distance: 0, steps: [] }
    )

  @action scheduleTrip = async (lat, lng) => {
    try {
      const foundPath = await this.findDirectionPath(lat, lng);
      const { distance } = this.calculateIntermediateSteps(foundPath);

      this.distance = distance;
    } catch (error) {
      Alert.error(`
        <strong>Error with schedule trip</strong>
        <div class='stack'>${error}</div>
      `);

      throw error;
    }
  }

  // move every second to next location into `this.steps`
  start = () => {
    this.running = true;
    this.paused = false;

    const moveNextPoint = action(() => {
      if (this.steps.length > 0) {
        const [{ lat: nextLat, lng: nextLng }] = this.steps;

        // move to locaiton
        userLocation.replace([nextLat, nextLng]);
        // remove first location that we moved to
        this.steps.remove(this.steps[0]);

        // move on to the next location
        if (this.steps.length !== 0) {
          this.steptimer = setTimeout(moveNextPoint, 1000);
        } else {
          Alert.success(`
            <strong>Alert</strong>
            <div class=stack>Arrived at destination...</div`, {
              beep: 'src/assets/martian-gun.mp3',
              timeout: 2000
            }
          );
          this.stop();
        }
      }
    });

    moveNextPoint();
  }

  @action resume = async () => {
    try {
      const foundPath = await this.findDirectionPath(this.destination.lat, this.destination.lng);
      const { distance } = this.calculateIntermediateSteps(foundPath);

      this.distance = distance;

      this.steps = JSON.parse(JSON.stringify(this.accurateSteps));
      this.start();
    } catch (error) {
      Alert.error(`
        <strong>Error with schedule trip</strong>
        <div class='stack'>${error}</div>
      `);

      throw error;
    }
  }

  @action pause = () => {
    // TODO: better check
    if (this.steptimer) {
      clearTimeout(this.steptimer);
      this.steptimer = null;
      this.running = false;
      this.paused = true;
    }
  }

  // reset all store state
  @action stop = () => {
    clearTimeout(this.steptimer);
    this.steptimer = null;
    this.paused = false;
    this.running = false;
    this.distance = 0;
    this.steps.clear();
  }

}

export default new Autopilot();
