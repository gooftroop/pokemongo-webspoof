import config from 'config';
import { observable } from 'mobx';

export default observable({
  updateXcodeLocation: false,
  enableMapDragging: config.map.draggable,
  addJitterToMoves: true,
  stationaryUpdates: true,
  speedLimit: 4, // ~40-25 km/h
  zoom: 17 // map zoom
});
