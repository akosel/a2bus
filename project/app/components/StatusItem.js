import React from 'react/addons';
import moment from 'moment';
import _ from 'underscore';

import Avatar from 'material-ui/lib/avatar';
import Card from 'material-ui/lib/card/card';
import CardHeader from 'material-ui/lib/card/card-header';
import CardText from 'material-ui/lib/card/card-text';
import sprintf from 'underscore.string/sprintf';


class StatusItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = { lateByMessage: '', bgColor: '#eee', minutesToArrival: undefined };
    this.getLateBy = this.getLateBy.bind(this);
    this.getBgColor = this.getBgColor.bind(this);
    this.getWalkTimeToStop = this.getWalkTimeToStop.bind(this);
  }

  getWalkTimeToStop(stops, route) {
    console.log('walkTime', arguments);
    var directionsService = new google.maps.DirectionsService();
    var currentLocation = new google.maps.LatLng(this.props.lat, this.props.lng);
    var stop = new google.maps.LatLng(stops[0].lat, stops[0].lng);
    var request = {
      destination: stop, // TODO add interface to allow user to input destination
      origin: currentLocation,
      travelMode: google.maps.TravelMode.WALKING,
    };
    console.log(request);
    directionsService.route(request, function(result, status) {
      console.log(status);
      if (status == google.maps.DirectionsStatus.OK) {
        console.log('result', result);
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

  getLateBy(adherence) {
    var lateByMessage = 'On time';
    var unitOfTime = 'minutes';

    if (Math.abs(adherence) === 1) {
      unitOfTime = 'minute';
    }
    if (adherence > 0) {
      lateByMessage = sprintf('%s %s ahead', adherence, unitOfTime);
    } else if (adherence < 0) {
      lateByMessage = sprintf('%s %s late', Math.abs(adherence), unitOfTime);
    }
    return lateByMessage;
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

      this.setState({ minutesToArrival: time, style: { backgroundColor: this.getBgColor(minutesLeft) } });
    }.bind(this), 500);

    var lateByMessage = this.getLateBy(this.props.routeInfo.adherence);
    this.setState({ lateByMessage: lateByMessage, minutesToArrival: '' });
    this.getWalkTimeToStop(this.props.stops, this.props.routeInfo);
  }

  render() {
      return (
        <div className="status-item clearfix">
          <Card style={ this.state.style } initiallyExpanded={false}>
            <CardHeader
              title={ this.state.minutesToArrival }
              subtitle={ this.state.lateByMessage }
              avatar={<Avatar>{this.props.routeInfo.routeAbbr}</Avatar>}
              showExpandableButton={true}>
            </CardHeader>
            <CardText expandable={true}>
              <ul>
                <li className="timestamp">
                  { this.state.lateByMessage }
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
                    { this.state.walkTime }
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
