import cx from 'classnames';
import React from 'react';
import { observer } from 'mobx-react';

import settings from '../../models/settings.js';

const settingsMap = [
  ['addJitterToMoves', 'Add randomness to moves'],
  ['enableMapDragging', 'Enable Map Dragging'],
  ['stationaryUpdates', 'Update even when stationary'],
  ['updateXcodeLocation', 'Auto update Xcode location'],
];

const BooleanSettings = observer(() =>
  <div className='boolean-settings'>
    { settingsMap.map(([setting, label], idx) =>
      <div
        key={ idx }
        onClick={ () => (settings[setting] = !settings[setting]) }
        className={ cx('btn btn-sm', {
          'btn-primary': settings[setting],
          'btn-default': !settings[setting]
        }) }
      >
        { label }
      </div>
    ) }
  </div>
);

export default BooleanSettings;
