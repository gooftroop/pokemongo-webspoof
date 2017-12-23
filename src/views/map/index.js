import 'bootstrap/dist/css/bootstrap.css';

import Alert from 'react-s-alert';
import axios from 'axios';
import config from 'config';
import GoogleMap from 'google-map-react';
import React, { Component } from 'react';
import { observable, action, toJS } from 'mobx';
import { observer } from 'mobx-react';
import settings from '../../models/settings.js';
import userLocation from '../../models/user-location.js';

import SpeedCounter from './speed-counter.js';
import BooleanSettings from './boolean-settings.js';
import Location from './location.js';
import SpeedLimit from './speed-limit.js';
import Controls from './controls.js';
import TotalDistance from './total-distance.js';
import Autopilot from './autopilot.js';
import Pokeball from './pokeball.js';

import MapsApi from '../../config/api.js';

// import Coordinates from './coordinates.js'; // TODO Needed?
@observer
export default class Map extends Component {

	@observable
	mapOptions = {
		keyboardShortcuts: false,
		draggable: true
	};

  home;

  @observable mapOptions;

  constructor(props, context) {
    super(props, context);

    this.home = {
      lat: config.map.home.lat,
      lng: config.map.home.lng
    };

    this.mapOptions = {
      keyboardShortcuts: config.map.keyboardShortcuts,
      draggable: config.map.draggable,
      disableDoubleClickZoom: config.map.disableDoubleClickZoom
    };
  }

  componentWillMount() {
    // get user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.handleGeolocationSuccess,
        this.handleGeolocationFail,
        {
          enableHighAccuracy: config.map.enableHighAccuracy,
          maximumAge: config.map.maximumAge
        }
      );
    }
	}

	// geolocation API might be down, use http://ipinfo.io
	// source: http://stackoverflow.com/a/32338735
	handleGeolocationFail = async (geolocationErr) => {
		Alert.warning(
			`
      <strong>Error getting your geolocation, using IP location</strong>
      <div class='stack'>${geolocationErr.message}</div>
    `, { timeout: 3000 });

    try {
      const { data: { loc } } = await axios({ url: 'http://ipinfo.io/' });
      const [ latitude, longitude ] = loc.split(',').map(coord => parseFloat(coord));
      this.handleGeolocationSuccess({ coords: { latitude, longitude } });
    } catch (xhrErr) {
      Alert.error(`
        <strong>Could not use IP location</strong>
        <div>Try to restart app, report issue to github</div>
        <div class='stack'>${xhrErr}</div>
      `);
    }
  }

  @action handleGeolocationSuccess({ coords: { latitude, longitude } }) {
    userLocation.replace([ latitude, longitude ]);
  }

  clicks = 0
  timer = null
  
	@action
	toggleMapDrag = () => {
		this.mapOptions.draggable = !this.mapOptions.draggable;
		this.map.map_.setOptions(toJS(this.mapOptions));
	};

  handleDoubleClick = (lat, lng) => {
    console.log('double click', arguments);
    this.autopilot.handleDestinationRequest({ destination: { latlng: { lat, lng } } });
  }

  @action handleClick = ({ lat, lng, shiftdown }) => {
    this.clicks += 1;

    if (this.clicks === 1) {
      setTimeout(() => {
        if (this.clicks === 2) {
          this.handleDoubleClick.call(this, lat, lng, shiftdown);
        }
        this.clicks = 0;
      }, 300);
    }
  }

  render() {
    const [ latitude, longitude ] = userLocation;
    return (
      <div className='google-map-container'>
        { /* only display google map when user geolocated */ }
        { (latitude && longitude) ?
          (
            <GoogleMap
              bootstrapURLKeys={ { key: config.google.maps.apiKey } }
              ref={ (ref) => { this.map = ref; } }
              zoom={ settings.zoom.get() }
              center={ [ latitude, longitude ] }
              onClick={ (result) => {
                this.handleClick({
                  lat: result.lat,
                  lng: result.lng,
                  shiftdown: result.event.shiftKey
                });
              } }
              options={ () => this.mapOptions }
              onGoogleApiLoaded={ this.handleGoogleMapLoaded }
              yesIWantToUseGoogleMapApiInternals
            >
              { /* userlocation center */ }
              <Pokeball lat={ userLocation[0] } lng={ userLocation[1] } />
            </GoogleMap>
          ) : (
            <div
              style={ {
                position: 'absolute',
                top: 'calc(50vh - (100px / 2) - 60px)',
                left: 'calc(50vw - (260px / 2))'
              } }
              className='alert alert-info text-center'
            >
              <i
                style={ { marginBottom: 10 } }
                className='fa fa-spin fa-2x fa-refresh'
              />
              <div>Loading user location & map...</div>
            </div>
          )
        }

        <div className='btn btn-drag-map'>
          { this.mapOptions.draggable ?
            (
              <div
                className='btn btn-sm btn-primary'
                onClick={this.toggleMapDrag}
              >
                Map Dragging Enabled
              </div>
            ) : (
              <div
                className='btn btn-sm btn-secondary'
                onClick={this.toggleMapDrag}
              >
                Map Dragging Locked
              </div>
            )
          }
        </div>
        { /* controls, settings displayed on top of the map */ }
        <Autopilot ref={ (ref) => { this.autopilot = ref; } } />
        <Location />
        <SpeedCounter />
        <SpeedLimit />
        <BooleanSettings />
        <Controls />
        <TotalDistance />
      </div>
    );
  }
}
