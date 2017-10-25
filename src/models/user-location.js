/* eslint max-len: 0 */
import { random, throttle } from 'lodash';
import { observable } from 'mobx';
import Alert from 'react-s-alert';

import settings from './settings.js';
import stats from './stats.js';

// electron specific import
const { writeFile } = window.require('fs');
const { resolve } = window.require('path');
const { exec } = window.require('child_process');
const { remote } = window.require('electron');

const userLocation = observable([ 0, 0 ]);

const isValidLocation = /^([-+]?\d{1,2}([.]\d+)?),\s*([-+]?\d{1,3}([.]\d+)?)$/;

const validateCoordinates = ((change) => {
  // check that we have valid coordinates before update
  if (change.type === 'splice') {
    const { added: [ lat, lng ] } = change;
    const isValid = isValidLocation.test(`${lat}, ${lng}`);
    if (isValid) {
      return change;
    } else {
      Alert.warning(`
        <strong>Invalid coordinates received</strong>
        <div class='stack'>{ lat: ${lat}, lng: ${lng} }</div>
      `);

      throw new Error(`Invalid coordinates ${lat}, ${lng}`);
    }
  }

  return change;
});

let rnormv2 = null;
const getRandom = (mean, stdev) => {
  let u1;
  let u2;
  let v1;
  let v2;
  let s;
  if (mean === undefined) {
    mean = 0.0;
  }

  if (stdev === undefined) {
    stdev = 1.0;
  }

  if (rnormv2 === null) {
    do {
      u1 = Math.random();
      u2 = Math.random();

      v1 = 2 * (u1 - 1);
      v2 = 2 * (u2 - 1);
      s = v1 * v1 + v2 * v2;
    } while (s === 0 || s >= 1);

    rnormv2 = v2 * Math.sqrt(-2 * Math.log(s) / s);
    return stdev * v1 * Math.sqrt(-2 * Math.log(s) / s) + mean;
  }

  v2 = rnormv2;
  rnormv2 = null;
  return stdev * v2 + mean;
};

const updateXcodeLocation = throttle(([ lat, lng ]) => {
  console.log('update xcode locations');
  // track location changes for total distance & average speed
  stats.pushMove(lat, lng);

  const jitter = settings.addJitterToMoves.get() ? getRandom(0, 0.000006) : 0;

  const xcodeLocationData =
    `<gpx creator="Xcode" version="1.1"><wpt lat="${(lat + jitter).toFixed(6)}" lon="${(lng + jitter).toFixed(6)}"><name>PokemonLocation</name></wpt></gpx>`;

  // write `pokemonLocation.gpx` file fro xcode spoof location
  const filePath = resolve(remote.getGlobal('tmpProjectPath'), 'pokemonLocation.gpx');
  writeFile(filePath, xcodeLocationData, async (error) => {
    if (error) {
      Alert.error(`
        <strong>Error writting 'pokemonLocation.gpx' to file</strong>
        <div class='stack'>${error.message}</div>
        <div class='stack'>${error.stack}</div>
      `);

      return console.warn(error);
    }

    if (settings.updateXcodeLocation.get()) {
      // reload location into xcode
      const scriptPath = resolve(window.__dirname, 'autoclick.applescript');
      exec(`osascript ${scriptPath}`, (autoclickErr, stdout, stderr) => {
        if (stderr) {
          Alert.error(`
            <strong>Error autoclick Xcode - Code 2</strong>
            <div class='stack'>${stderr}</div>
          `);

          return console.warn(stderr);
        }
      });
    }
  });
}, 1000);


userLocation.intercept(validateCoordinates);

// after update
userLocation.observe(() => { return updateXcodeLocation(userLocation); });

// updated at random intervals to prevent reversion
let currentTimer = null;
function scheduleUpdate() {
  const randomWait = random(1000, 10000, true);
  if (!settings.stationaryUpdates.get()) {
    if (currentTimer) {
      window.clearTimeout(currentTimer);
      currentTimer = null;
    }
    return;
  }

  currentTimer = window.setTimeout(() => {
    currentTimer = null;

    if (!settings.stationaryUpdates.get()) {
      return;
    }

    updateXcodeLocation(userLocation);
    scheduleUpdate();
  }, randomWait);
}

// watch settings for updates
settings.stationaryUpdates.observe(() => { return scheduleUpdate(); });

// initial trigger
scheduleUpdate();

export default userLocation;
