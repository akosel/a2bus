import React from 'react/addons';
import DirectionsList from './DirectionsList';
import api from '../scripts/api';

class DirectionsBox extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="status">
        <DirectionsList steps={this.props.steps} />
      </div>
    );
  }
}

export default DirectionsBox;
