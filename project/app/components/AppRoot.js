import React from 'react/addons';
import Map from './Map';
import StatusBox from './StatusBox';
import api from '../scripts/api';
import _ from 'underscore';
import sprintf from 'underscore.string/sprintf';
import toSentence from 'underscore.string/toSentence';
import moment from 'moment';

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

class AppRoot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeView: 'Status',
      modal: false,
      label: 'Show Map',
      userRoutes: this.props.state.userRoutes,
      destination: '',
      routeList: [],
      locations: [],
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
      this.setState({ activeView: 'Status', label: 'Show Map' });
    } else {
      this.setState({ activeView: 'Map', label: 'Hide Map' });
    }
  }

  updateActiveRoutes(activeRoutes) {
    var userActiveRoutes = _(activeRoutes).filter(function(route) {
      return _(this.state.userRoutes).contains(route.routeAbbr);
    }.bind(this));

    console.log('STATUS BOX DEBUG: ', activeRoutes);
    var userMessage = this.getUserMessage(activeRoutes, userActiveRoutes);
    this.setState({ userMessage: userMessage, locations: userActiveRoutes });
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
        reason = 'The buses typically don\'t run at this hour.';
      } else if (allRoutes.length && !userActiveRoutes.length) {
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
    api.getLastLocations(this.updateActiveRoutes);
    api.getRouteNames(function(routeList) {
      this.setState({ routeList: _(routeList).sortBy(function(route) { return parseInt(route.routeAbbr); }) });
    }.bind(this));
  }

  render() {
    var checkboxes = [];
    window.localStorage.setItem('greeted', true);
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
          This site can be used to quickly find information about buses near you.
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
            <Map ref="map" destination={this.state.destination} stops={this.props.state.stops} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} initZoom={16} width='100%' height='100%'></Map>
          </div>
          <div className={"status-box" + (this.state.activeView === 'Status' ? ' visible' : '')}>
            <StatusBox data={this.state.locations} userMessage={this.state.userMessage} stops={this.state.stops} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} positionError={this.props.state.positionError} ref="status"></StatusBox>
          </div>
        </main>
      </div>;
  }
}

AppRoot.childContextTypes = {
  muiTheme: React.PropTypes.object
}

export default AppRoot;
