import React from 'react/addons';
import StatusList from './StatusList';
import api from '../scripts/api';

class StatusBox extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="status">
        <p>{this.props.userMessage}</p>
        <StatusList stops={this.props.stops} lat={this.props.initLat} lng={this.props.initLon} slice={this.props.data} />
      </div>
    );
  }
}

export default StatusBox;
