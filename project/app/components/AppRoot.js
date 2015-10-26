import React from 'react/addons';
import Map from './Map';
import DirectionsBox from './DirectionsBox';
import api from '../scripts/api';
import _ from 'underscore';
import sprintf from 'underscore.string/sprintf';
import toSentence from 'underscore.string/toSentence';
import moment from 'moment';
import dispatcher from '../dispatcher';

import injectTapEventPlugin from 'react-tap-event-plugin';
import ThemeManager from 'material-ui/lib/styles/theme-manager';

import AppBar from 'material-ui/lib/app-bar';
import FlatButton from 'material-ui/lib/flat-button';
import LeftNav from 'material-ui/lib/left-nav';
import Snackbar from 'material-ui/lib/snackbar';
import Dialog from 'material-ui/lib/dialog';
import Checkbox from 'material-ui/lib/checkbox';
import TextField from 'material-ui/lib/text-field';

var tm = ThemeManager();
var menuItems = [
  { text: 'Settings', view: 'settings' },
  { text: 'Set Destination', view: 'destination' },
];

//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();

var A2_LAT = 42.267;
var A2_LNG = -83.770;

class AppRoot extends React.Component {
  constructor(props) {
    super(props);

    var distanceFromAnnArbor = this._getDistance(this.props.state.position.coords.latitude, this.props.state.position.coords.longitude, A2_LAT, A2_LNG);
    var position, message, isFarAway;
    if (distanceFromAnnArbor > 50) {
      position = { coords: { longitude: A2_LNG, latitude: A2_LAT }};
      message = 'Woah nelly! Looks like you are pretty far from Ann Arbor. Unfortunately, this is designed to work specifically in Ann Arbor. However, for demo purposes, we will set your location to a location in Ann Arbor';
      isFarAway = true;
    } else {
      position = this.props.state.position;
      isFarAway = false;
    }
    this.state = {
      activeView: 'Map',
      modal: false,
      label: '',
      userRoutes: this.props.state.userRoutes,
      destination: '',
      routeList: [],
      locations: [],
      warningMessage: message,
      isFarAway: isFarAway,
      position: position,
      stops: this.props.state.stops,
    };
    this.viewToggleClick = this.viewToggleClick.bind(this);
    this.showLeftNav = this.showLeftNav.bind(this);
    this._onLeftNavChange = this._onLeftNavChange.bind(this);
    this._onGreetingSubmit = this._onGreetingSubmit.bind(this);
    this._onSettingsSubmit = this._onSettingsSubmit.bind(this);
    this._onDestinationSubmit = this._onDestinationSubmit.bind(this);
    this.updateActiveRoutes = this.updateActiveRoutes.bind(this);
    this.getUserMessage = this.getUserMessage.bind(this);

    this.greetingActions = [
      { text: 'Sounds good', ref: 'ok', onTouchTap: this._onGreetingSubmit },
    ];

    this.settingsActions = [
      { text: 'Submit', ref: 'ok', onTouchTap: this._onSettingsSubmit },
    ];

    this.destinationActions = [
      { text: 'Submit', ref: 'ok', onTouchTap: this._onDestinationSubmit },
    ];
  }

  getChildContext() {
    return {
      muiTheme: tm.getCurrentTheme()
    };
  }

  _getDistance(lat1, lon1, lat2, lon2) {

    function _toRad(value) {
      return value * Math.PI / 180;
    }
    var R = 6371; // km
    var dLat = _toRad(lat2-lat1);
    var dLon = _toRad(lon2-lon1);
    var lat1 = _toRad(lat1);
    var lat2 = _toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d;
  }

  getMobileOperatingSystem() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if( userAgent.match( /iPad/i ) || userAgent.match( /iPhone/i ) || userAgent.match( /iPod/i ) )
    {
      return 'iOS';

    }
    else if( userAgent.match( /Android/i ) )
    {

      return 'Android';
    }
    else
    {
      return 'unknown';
    }
  }

  _onSettingsSubmit() {
    var userRoutes = [];
    _(this.state.routeList).each(function(route) {
      var refKey = sprintf('checkbox-%s', route.routeAbbr);
      if (this.refs[refKey].isChecked()) {
        userRoutes.push(route.routeAbbr);
      }
    }.bind(this));
    this.setState({ userRoutes: userRoutes });
    this.refs.settings.dismiss();
  }

  _onGreetingSubmit() {
    this.refs.greeting.dismiss();
  }

  _onDestinationSubmit() {
    this.setState({ destination: this.refs.destinationInput.getValue() });
    this.refs.destination.dismiss();
  }

  showLeftNav() {
    this.refs.leftNav.toggle();
  }

  _onLeftNavChange(e, key, menuItem) {
    this.refs[menuItem.view].show();
  }

  viewToggleClick() {
    if (this.state.activeView === 'Map') {
      this.setState({ activeView: 'Directions', label: 'Hide Directions' });
    } else {
      this.setState({ activeView: 'Map', label: 'Show Directions' });
    }
  }

  updateActiveRoutes(activeRoutes) {
    var userActiveRoutes = _(activeRoutes).filter(function(route) {
      return _(this.state.userRoutes).contains(route.routeAbbr);
    }.bind(this));

    console.log('STATUS BOX DEBUG: ', activeRoutes);
    var userMessage = this.getUserMessage(activeRoutes, userActiveRoutes);
    this.setState({ allRoutes: activeRoutes, userMessage: userMessage, locations: userActiveRoutes });
  }

  getUserMessage(allRoutes, userActiveRoutes) {
    var userMessage = '';
    var now = moment();
    if (!allRoutes || !allRoutes.length) {
      var base = 'We don\'t seem to have any route data at this time.';
      var reason = 'The AATA might not be providing any data at this time.';
      var remedy = 'Try back a little later.';

      if (this.props.positionError && this.props.positionError.code === 1) {
        base = 'There is an issue.';
        reason = 'We don\'t know where you are, which makes it tough to find the nearest stops!';
        remedy = 'You can either enable allow us to use your location or you can manually enter information here'; // TODO implement interface for configuring route info
      } else if (now.hour() > 0 && now.hour() < 6) {
        reason = 'The buses typically don\'t run at this hour.';
      } else if ((allRoutes && allRoutes.length) && !userActiveRoutes.length) {
        reason = 'Buses are running, but there are none running at nearby stops.';

        // TODO Implement a way for user to add routes or wider radius
        remedy = 'You can select a wider area, or manually add routes you would like to see here.';
      }
      return sprintf('%s %s %s', base, reason, remedy);
    }
    return sprintf('Nearby routes %s.', toSentence(this.state.userRoutes));
  }

  componentDidMount() {
    this.setState({ userMessage: this.getUserMessage([], []) });
    // TODO Implement a way of reopening connection if it is dropped
    var receiver = new WebSocket('wss://' + location.host + '/receive');
    receiver.onmessage = function(status) {
      var activeRoutes = status && status.data && _(status.data).isString() ? JSON.parse(status.data) : [];
      this.updateActiveRoutes(activeRoutes);
    }.bind(this);

    dispatcher.register(function(payload) {
      if (payload.type === 'directionsUpdate') {
        console.log(payload);
        var routes = payload.data.routes;
        if (routes && routes.length === 1) {
          var route = routes[0];
          var steps = route.legs[0].steps;
          var formatStr = 'h:mma';
          _(steps).each(function(step, idx) {
            if (step.travel_mode === 'TRANSIT') {
              if (idx >= 1) {
                var previousStep = steps[idx - 1];
                var departureTime = moment(step.transit.departure_time.value.getTime());
                var durationMs = previousStep.duration.value * 1000;
                previousStep.startTime = departureTime.clone().subtract(durationMs, 'ms').format(formatStr);
                previousStep.endTime = step.transit.departure_time.text;

                step.startTime = step.transit.departure_time.text;
                step.endTime = step.transit.arrival_time.text;
              }
            }
            if (idx === steps.length - 1) {
              if (steps.length === 1) {
                step.startTime = moment().format(formatStr);
                step.endTime = moment().add(step.duration.value, 'seconds').format(formatStr);
              } else {
                var previousStep = steps[idx - 1];
                step.startTime = previousStep.endTime;
                step.endTime = moment(previousStep.endTime, formatStr).add(step.duration.value, 'seconds').format(formatStr);
              }
            }
          });
          var userRoutes = _(steps).chain()
                                    .map(function(step) {
                                      if (step.travel_mode === 'TRANSIT') {
                                        return step.transit.line.short_name;
                                      }
                                      return false;
                                    })
                                    .compact().value();
          console.log(steps, userRoutes);


          this.setState({ userRoutes: userRoutes, steps: steps, label: 'Show Directions' });
          this.updateActiveRoutes(this.state.allRoutes);
        }
      }
    }.bind(this));

    if (!this.state.isFarAway) {
      //navigator.geolocation.watchPosition(function(position) {
      //  api.getNearbyStops(position, function(stops) {
      //    var userRoutes = _(stops).chain()
      //      .map(function(stop) {
      //        return stop.abbreviation;
      //      })
      //      .uniq()
      //      .value();
      //    this.setState({ userRoutes: userRoutes });
      //  }.bind(this))
      //}.bind(this));
    }
    api.getLastLocations(this.updateActiveRoutes);
    api.getRouteNames(function(routeList) {
      this.setState({ routeList: _(routeList).sortBy(function(route) { return parseInt(route.routeAbbr); }) });
    }.bind(this));
    window.localStorage.setItem('greeted', true);
    // XXX Hack to remove hamburger toggle for now
    document.querySelector('.hamburger-toggle').parentElement.parentElement.remove();
  }

  render() {
    var checkboxes = [];
    this.state.routeList.forEach(function(v) {
      checkboxes.push(
        <Checkbox
          ref={sprintf('checkbox-%s', v.routeAbbr)}
          name={v.routeAbbr}
          key={v.routeAbbr}
          value={v.routeAbbr}
          label={sprintf("%s (Route %s)", v.name, v.routeAbbr)}
          defaultChecked={this.state.userRoutes.indexOf(String(v.routeAbbr)) > -1}/>
      );
    }.bind(this));
    return <div>
        <AppBar
          title="Ann Arbus"
          style={{ position: 'relative' }} /* XXX used to get stacking to work. warning, may affect mobile scroll smoothness! */
          onLeftIconButtonTouchTap={this.showLeftNav}
          iconClassNameLeft="hamburger-toggle"
          iconElementRight={<FlatButton onClick={this.viewToggleClick} label={this.state.label}/>} />
        <LeftNav
          onChange={this._onLeftNavChange}
          ref='leftNav'
          docked={false}
          disableSwipeToOpen={true}
          menuItems={menuItems} />
        <Snackbar
          message="Do something"
          action="undo"/>
        <Dialog
          title="Welcome to Ann Arbus!"
          ref='greeting'
          actions={this.greetingActions}
          actionFocus="ok"
          openImmediately={window.localStorage.getItem('greeted') ? false : true}
          modal={this.state.modal}>
          <p>{this.state.warningMessage}</p>
          <p>This site can be used to quickly find information about buses and bus stops near you.</p>
          <p>To use it, simply drag the destination marker and directions will be plotted for you.
              You can then view the written out directions by clicking "Show Directions" in the upper-right hand corner.</p>
        </Dialog>
        <Dialog
          title="Settings"
          ref='settings'
          actions={this.settingsActions}
          actionFocus="ok"
          openImmediately={false}
          autoDetectWindowHeight={true}
          autoScrollBodyContent={true}
          modal={false}>
          <div style={{height: '700px'}}>{checkboxes}</div>
        </Dialog>
        <Dialog
          title="Set Destination"
          ref='destination'
          actions={this.destinationActions}
          actionFocus="ok"
          openImmediately={false}
          modal={false}>
          <TextField
            hintText="i.e. Blake Transit Center, Ypsilanti"
            ref="destinationInput"/>
        </Dialog>
        <main>
          <div className={"map-box" + (this.state.activeView === 'Map' ? ' visible' : '')}>
            <Map ref="map" locations={this.state.locations} destination={this.state.destination} stops={this.props.state.stops} initLat={this.state.position.coords.latitude} initLon={this.state.position.coords.longitude} initZoom={13} width='100%' height='100%'></Map>
          </div>
          <div className={"directions-box" + (this.state.activeView === 'Directions' ? ' visible' : '' )}>
            <DirectionsBox steps={this.state.steps}/>
          </div>
        </main>
      </div>;
  }
}

AppRoot.childContextTypes = {
  muiTheme: React.PropTypes.object
}

export default AppRoot;
