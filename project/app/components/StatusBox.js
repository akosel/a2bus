import React from 'react/addons';
import StatusList from './StatusList';
import api from '../scripts/api';
import _ from 'underscore';

class StatusBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { data: [], slice: [], show: true };
    this.updateActiveRoutes = this.updateActiveRoutes.bind(this);
  }

  updateActiveRoutes(activeRoutes) {
    var userActiveRoutes = _(activeRoutes).filter(function(route) {
      return _(window.userRoutes).contains(route.routeAbbr);
    });
    console.log('updating routes', activeRoutes, userActiveRoutes);
    this.setState({ data: userActiveRoutes });
  }

  componentDidMount() {
    console.log('Mounting status box');
    var receiver = new WebSocket('ws://' + location.host + '/receive');
    receiver.onmessage = function(status) {
      var activeRoutes = status && status.data && _(status.data).isString() ? JSON.parse(status.data) : [];
      this.updateActiveRoutes(activeRoutes);
    }.bind(this);
    window.onbeforeunload = function() {
      receiver.onclose = function() {};
      receiver.close();
    }
    api.getLastLocations(this.updateActiveRoutes);
  }

  render() {
    return (
    <div id="status">
        <h4>Status</h4>
        <StatusList slice={this.state.data} />
      </div>
    );
  }
}

export default StatusBox;
