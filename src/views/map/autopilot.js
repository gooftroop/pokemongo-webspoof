import { capitalize } from 'lodash';

import React, { Component } from 'react';
import { action, observable, computed } from 'mobx';
import { observer } from 'mobx-react';
import places from 'places.js';
import cx from 'classnames';

// import Shortcuts from './shortcuts.js';
import autopilot from '../../models/autopilot.js';

const KEY_ESCAPE = 27;
const KEY_SPACE = 32;

@observer
export default class Autopilot extends Component {

  @observable travelMode = 'walk'
  @observable isModalOpen = false
  @observable travelMode = 'cycling'

  @computed get speed() {
    const [ , speed ] = autopilot.travelModes.find(([ t ]) => t === this.travelMode);
    return speed;
  }

  @computed get travelModeName() {
    const [ travelModeName ] = autopilot.travelModes.find(([ t ]) => t === this.travelMode);
    return travelModeName;
  }

  @computed get travelModeIcon() {
    const [ , , travelModeIcon ] = autopilot.travelModes.find(([ t ]) => t === this.travelMode);
    return travelModeIcon;
  }

  componentDidMount() {
    // initialize algolia places input
    this.placesAutocomplete = places({ container: this.placesEl });
    this.placesAutocomplete.on('change', this.handleSuggestionChange);

    window.addEventListener('keyup', ({ keyCode }) => {
      if (keyCode === KEY_ESCAPE && this.isModalOpen) {
        this.handleCancelAutopilot();
      }
      // use the space bar to pause/start autopilot
      if (keyCode === KEY_SPACE) {
        if (autopilot.running && !autopilot.paused) {
          autopilot.pause();
        } else if (autopilot.paused) {
          autopilot.resume();
        }
      }
    });
  }

  @action handleDestinationRequest = ({ destination: { latlng: { lat, lng } } }) => {
    autopilot.stop();

    // TODO: currently we assume whatever speed is set
    // var travelmode = travelModes[1];
    // autopilot.speed = travelmode[1] / 3600
    // this.travelMode = travelmode[0]

    autopilot.scheduleTrip(lat, lng)
      .then(() => {
        // TODO:
        autopilot.steps = JSON.parse(JSON.stringify(autopilot.accurateSteps));
        autopilot.start();
      })
      .catch(() => this.placesAutocomplete.setVal(null));
  }


  @action handleSuggestionChange = ({ suggestion: { latlng: { lat, lng } } }) => {
    autopilot.scheduleTrip(lat, lng)
      .then(() => { if (!this.isModalOpen) this.isModalOpen = true; })
      .catch(() => this.placesAutocomplete.setVal(null));
  }

  @action handleDestinationChange = ({ target }) => {
    const value = target.value;
    if (value.indexOf(',') !== -1) {
      const latLongs = target.value.split(',');
      if (latLongs.length > 1 && latLongs[1]) {
        autopilot.scheduleTrip(parseFloat(latLongs[0]), parseFloat(latLongs[1]))
          .then(() => { if (!this.isModalOpen) this.isModalOpen = true; })
          .catch(() => this.placesAutocomplete.setVal(null));
      }
    }
  }

  @action handleStartAutopilot = () => {
    // reset modal state
    this.placesAutocomplete.setVal(null);

    // TODO: Refactor it's ugly
    // update `autopilot` data
    autopilot.steps = JSON.parse(JSON.stringify(autopilot.accurateSteps));
    autopilot.start();

    this.isModalOpen = false;
  }

  @action handleCancelAutopilot = () => {
    // reset modal state
    this.placesAutocomplete.setVal(null);
    this.placesEl.value = '';
    this.isModalOpen = false;
  }

  @action handleSelectTravelMode = (name, speed) => () => {
    autopilot.speed = speed / 3600;
    this.travelMode = name;
  }

  @action handleChangeSpeed = () => {
    const { destination: { lat, lng } } = autopilot;

    autopilot.pause();
    autopilot.scheduleTrip(lat, lng)
      .then(() => { if (!this.isModalOpen) this.isModalOpen = true; });
  }

  @action shortcutClickHandler = (event, coords) => {
    autopilot.stop();

    // Set Speed
    const travelmode = event.shiftKey ? autopilot.travelModes[
      autopilot.travelModes.length - 1
    ] : autopilot.travelModes[1];

    autopilot.speed = travelmode[1] / 3600;
    this.travelMode = travelmode[0];

    autopilot.scheduleTrip(coords.lat, coords.long)
      .then(() => {
        autopilot.steps = JSON.parse(JSON.stringify(autopilot.accurateSteps));
        autopilot.start();
      });
  }

  renderTogglePause() {
    if (autopilot.running && !autopilot.paused) {
      return (
        <button
          className='toggle pause btn btn-warning'
          onClick={ autopilot.pause }>
          <i className='fa fa-pause' />
        </button>
      );
    } else {
      return (
        <button
          className='toggle resume btn btn-success'
          onClick={ autopilot.start }>
          <i className='fa fa-play' />
        </button>
      );
    }
  }

  render() {
    return (
      <div className='autopilot'>

        <div className={ cx('search-container', 'form-group', 'algolia-places') }>
          <input
            ref={ (input) => { this.placesEl = input; } }
            className='form-control'
            type='search'
            placeholder='Destination'
            onChange={ this.handleDestinationChange } />
        </div>

        <div className={ cx('status-container', { hide: autopilot.clean }) }>
          <button
            className='autopilot-btn btn btn-danger'
            onClick={ autopilot.stop }
            disabled={ !autopilot.running }>
            Stop autopilot
          </button>
          { this.renderTogglePause() }
          <button
            className='edit btn btn-primary'
            onClick={ this.handleChangeSpeed }>
            <i className={ `fa fa-${this.travelModeIcon}` } />
          </button>
          {/* <Shortcuts onShortcutClick={ this.shortcutClickHandler } /> */}
        </div>

        <div className={ cx('autopilot-modal', { open: this.isModalOpen }) }>
          <div className='travel-modes row'>
            { autopilot.travelModes.map(([ name, speed, icon ]) =>
              <div
                key={ name }
                className={ `col-sm-4 text-center ${name}` }
                onClick={ this.handleSelectTravelMode(name, speed) }>
                <div className={ cx('travel-mode', { selected: name === this.travelMode }) }>
                  <div>
                    <div className={ `fa fa-${icon}` } />
                    <div className='desc'>
                      <strong>{ capitalize(name) } </strong>
                      <span>{ speed } { speed !== '~' && 'km/h' }</span>
                    </div>
                  </div>
                </div>
              </div>
            ) }
          </div>

          {
            (autopilot.accurateSteps.length !== 0) ? (
              <div className='infos row'>
                <div className='col-sm-4 text-center'>
                  <strong>Distance: </strong>
                  <span className='tag tag-info'>
                    { autopilot.distance.toFixed(2) } km
                  </span>
                </div>

                <div className='col-sm-4 text-center'>
                  <strong>Speed: </strong>
                  <span className='tag tag-info'>
                    { this.speed } km/h
                  </span>
                </div>

                <div className='col-sm-4 text-center'>
                  <strong>Time: </strong>
                  <span className='tag tag-info'>
                    { autopilot.time }
                  </span>
                </div>
              </div>
            ) : <noscript />
          }

          <div className='text-center row'>
            <div className='col-sm-2'>
              <button
                type='button'
                className='btn btn-block btn-sm btn-danger'
                onClick={ this.handleCancelAutopilot }>
                Cancel
              </button>
            </div>
            <div className='col-sm-10'>
              <button
                type='button'
                className='btn btn-block btn-sm btn-success'
                disabled={ autopilot.accurateSteps.length === 0 }
                onClick={ this.handleStartAutopilot }>
                { !autopilot.clean ? 'Update' : 'Start' } autopilot!
              </button>
            </div>
          </div>
        </div>

      </div>
    );
  }
}
