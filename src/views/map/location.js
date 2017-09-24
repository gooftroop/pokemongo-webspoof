import cx from 'classnames';
import places from 'places.js';
import React, { Component } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react';

import userLocation from '../../models/user-location.js';

@observer
export default class Location extends Component {

  componentDidMount() {
    // initialize algolia places input
    this.placesAutocomplete = places({ container: this.placesEl });
    this.placesAutocomplete.on('change', this.handleSuggestionChange);
  }

  @action handleSuggestionChange = ({ suggestion: { latlng: { lat, lng } } }) => {
    userLocation[0] = parseFloat(lat);
    userLocation[1] = parseFloat(lng);
  }

  @action setUserCoordLocation = (idx) => action(({ target: { value } }) => {
    userLocation[idx] = parseFloat(value);
  })

  render() {
    return (<div className='clearfix location-container'>
      <div className={ cx('form-group', 'algolia-places') }>
        <input
          ref={ (input) => { this.placesEl = input; } }
          className='form-control'
          type='search'
          placeholder='Starting Location' />
      </div>
      <div className='coordinates'>
        { [ 'lat', 'lng' ].map((direction, idx) =>
          <div key={ idx } className='pull-xs-left'>
            <div className='input-group'>
              <span className='input-group-addon' id='basic-addon1'>
                { direction }
              </span>
              <input
                type='text'
                className='form-control'
                placeholder={ direction }
                value={ userLocation[idx] }
                onChange={ this.setUserCoordLocation(idx) }
                aria-describedby='basic-addon1' />
            </div>
          </div>
        ) }
      </div>
    </div>);
  }
}
