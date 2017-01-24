import React from 'react'
import { observer } from 'mobx-react'
import cx from 'classnames'

import autopilot from '../../models/autopilot.js'

// import { addJitterToMoves, stationaryUpdates, updateXcodeLocation } from '../../models/settings.js'

const shortcuts = [
  [ 'Base', {lat: 37.749272, long: -122.427651}],
  [ 'Pier 39', {lat: 37.811159, long: -122.410799}],
  [ 'Wharf', {lat: 37.810453, long: -122.417390}],
  [ 'Ferry Building', {lat: 37.795349, long: -122.392167}],
  [ 'Union Square', {lat: 37.788355, long: -122.406944}]
]

// TODO: add randomization to destinations

const Shortcuts = observer(() =>
  <div className="shortcuts">
    { shortcuts.map(([ location, coords ], idx) =>
      <div
        onClick={ (event) => {
          autopilot.stop()
          // TODO:
          autopilot.speed = (event.shiftKey === true ? "~" : 13) / 3600 
          
          autopilot.scheduleTrip(coords.lat, coords.long)
            .then(() => {
              autopilot.steps = JSON.parse(JSON.stringify(autopilot.accurateSteps))
              autopilot.start()    
            })
        }}
        className="btn btn-sm btn-default"
        key={ location }
      >
        Go { location }
      </div>
    )}
  </div>
)

export default Shortcuts
          
// 1 foot to degree
// 0.000002742696154