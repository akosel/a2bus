import React from 'react/addons';
import StatusList from './StatusList';
import api from '../scripts/api';
import _ from 'underscore';
import sprintf from 'underscore.string/sprintf';
import toSentence from 'underscore.string/toSentence';
import moment from 'moment';

class StatusBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { userMessage: '', data: [], slice: [] };
    this.updateActiveRoutes = this.updateActiveRoutes.bind(this);
    this.getUserMessage = this.getUserMessage.bind(this);
  }

  getUserMessage(allRoutes, userActiveRoutes) {
    var userMessage = '';
    var now = moment();
    if (!allRoutes.length) {
      var base = 'We don\'t seem to have any route data at this time.';
      var reason = 'The AATA might not be providing any data at this time.';
      var remedy = 'Try back a little later.';

      if (this.props.positionError && this.props.positionError.code === 1) {
        base = 'There is an issue.';
        reason = 'We don\'t know where you are, which makes it tough to find the nearest stops!';
        remedy = 'You can either enable allow us to use your location or you can manually enter information here'; // TODO implement interface for configuring route info
      } else if (now.hour() > 0 && now.hour() < 6) {
        reason = 'The busses typically don\'t run at this hour.';
      } else if (allRoutes.length && !userActiveRoutes.length) {
        reason = 'Busses are running, but there are none running at nearby stops.';

        // TODO Implement a way for user to add routes or wider radius
        remedy = 'You can select a wider area, or manually add routes you would like to see here.';
      }
      return sprintf('%s %s %s', base, reason, remedy);
    }
    return sprintf('Nearby routes %s.', toSentence(this.props.userRoutes));
  }

  updateActiveRoutes(activeRoutes) {
    var userActiveRoutes = _(activeRoutes).filter(function(route) {
      return _(this.props.userRoutes).contains(route.routeAbbr);
    }.bind(this));

    console.log('STATUS BOX DEBUG: ', activeRoutes);
    var userMessage = this.getUserMessage(activeRoutes, userActiveRoutes);
    this.setState({ userMessage: userMessage, data: userActiveRoutes });
  }

  componentDidMount() {
    this.setState({ userMessage: this.getUserMessage([], []) });
    // TODO Implement a way of reopening connection if it is dropped
    var receiver = new WebSocket('wss://' + location.host + '/receive');
    receiver.onmessage = function(status) {
      var activeRoutes = status && status.data && _(status.data).isString() ? JSON.parse(status.data) : [];
      this.updateActiveRoutes(activeRoutes);
    }.bind(this);
    api.getLastLocations(this.updateActiveRoutes);
  }


  render() {
    return (
      <div id="status">
        <p>{this.state.userMessage}</p>
        <StatusList stops={this.props.stops} lat={this.props.initLat} lng={this.props.initLon} slice={this.state.data} />
      </div>
    );
  }
}

export default StatusBox;
