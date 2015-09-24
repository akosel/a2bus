import React from 'react/addons';
import moment from 'moment';
import _ from 'underscore';
import sprintf from 'underscore.string/sprintf';

import Avatar from 'material-ui/lib/avatar';
import Card from 'material-ui/lib/card/card';
import CardHeader from 'material-ui/lib/card/card-header';
import CardText from 'material-ui/lib/card/card-text';


class StatusItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = { lateByMessage: '', bgColor: '#eee', minutesToArrival: undefined };
    this.getBgColor = this.getBgColor.bind(this);
    this.getWalkTimeToStop = this.getWalkTimeToStop.bind(this);
  }

  getWalkTimeToStop(stops, route) {
    var stop = _(stops).find(function(stop) { return stop.abbreviation === route.routeAbbr });
    if (!stop) {
      return;
    }
    var directionsService = new google.maps.DirectionsService();
    var currentLocation = new google.maps.LatLng(this.props.lat, this.props.lng);
    var stop = new google.maps.LatLng(stops[0].lat, stops[0].lng);
    var request = {
      destination: stop, // TODO add interface to allow user to input destination
      origin: currentLocation,
      travelMode: google.maps.TravelMode.WALKING,
    };
    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        var seconds = result.routes[0].legs[0].duration.value;
        var minutes = Math.ceil(seconds / 60);
        this.setState({ walkTime: minutes });
      }
    }.bind(this));
  }

  getBgColor(minutesLeft) {
    var walkTime = this.state.walkTime || 0; // TODO make configurable or incorporate google maps direction data

    if (minutesLeft < walkTime) {
      return 'F60';
    } else if (minutesLeft < walkTime + 2) {
      return '#FFD127';
    } else if (minutesLeft < walkTime + 5) {
      return '#27AE60'
    } else {
      return '#EEE'
    }
  }

  componentDidMount() {
    var sId = setInterval(function() {
      var adherence = this.props.routeInfo.adherence;
      var hour = moment().hour();
      var minute = moment().minute();
      var second = moment().second();
      var stopMinutesStr = ['9:04', '9:34']; // TODO Get from user input or historical data
      var stopMinutes = stopMinutesStr.map(function(v) { var idx = v.indexOf(':') + 1; return Number(v.slice(idx)); });

      var timesToNextStop = stopMinutes.map(function(v) { var next = v - minute - adherence - 1 < 0 ? v + 59 - minute - adherence : v - minute - adherence - 1; return next; });

      var minutesLeft = _(timesToNextStop).min();

      var time = minutesLeft + ':' + moment((59 - second) * 1000).format('ss');

      this.setState({ lastUpdated: sprintf('%s (%s)', this.props.lastUpdated.fromNow(), this.props.lastUpdated.format('lll')), minutesToArrival: time, style: { backgroundColor: this.getBgColor(minutesLeft) } });
    }.bind(this), 500);

    this.getWalkTimeToStop(this.props.stops, this.props.routeInfo);
  }

  render() {
      return (
        <div className="status-item clearfix">
          <Card style={ this.state.style } initiallyExpanded={false}>
            <CardHeader
              title={ this.state.minutesToArrival }
              subtitle={ this.props.lateByMessage }
              avatar={<Avatar>{this.props.routeInfo.routeAbbr}</Avatar>}
              showExpandableButton={true}>
            </CardHeader>
            <CardText expandable={true}>
              <ul>
                <li className="timestamp">
                  { this.state.lastUpdated }
                </li>
                <li className="direction">
                  { this.props.routeInfo.routeDirection }
                </li>
                <li className="news">
                  <p>
                    { this.props.routeInfo.timePointName }
                  </p>
                </li>
                <li className="news">
                  <p>
                    Walking Time: { this.state.walkTime }
                  </p>
                </li>
              </ul>
            </CardText>
          </Card>
        </div>
      );

  }
}

export default StatusItem;
