import React from 'react/addons';
import Map from './Map';
import StatusBox from './StatusBox';
import api from '../scripts/api';

import injectTapEventPlugin from 'react-tap-event-plugin';
import ThemeManager from 'material-ui/lib/styles/theme-manager';

import AppBar from 'material-ui/lib/app-bar';
import FlatButton from 'material-ui/lib/flat-button';
import LeftNav from 'material-ui/lib/left-nav';
import Snackbar from 'material-ui/lib/snackbar';
import Dialog from 'material-ui/lib/dialog';
import Checkbox from 'material-ui/lib/checkbox';

var tm = ThemeManager();
var menuItems = [
  { text: 'Settings', view: 'settings' },
  { text: '', view: 'add-routes' },
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
      stops: this.props.state.stops,
    };
    this.viewToggleClick = this.viewToggleClick.bind(this);
    this.showLeftNav = this.showLeftNav.bind(this);
    this._onLeftNavChange = this._onLeftNavChange.bind(this);
    this._onDialogSubmit = this._onDialogSubmit.bind(this);

    this.standardActions = [
      { text: 'Sounds good!', ref: 'ok', onTouchTap: this._onDialogSubmit },
    ];
  }

  getChildContext() {
    return {
      muiTheme: tm.getCurrentTheme()
    };
  }

  _onDialogSubmit() {
    //this.setState({ userRoutes: ["1", "2"] });
    this.refs.dialog.dismiss();
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

  render() {
    var checkboxes = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].forEach(function(v) {
      checkboxes.push(
        <Checkbox
          name={v}
          value={v}
          label={"Route " + v}
          defaultChecked={this.props.state.userRoutes.indexOf(String(v)) > -1}/>
      );
    }.bind(this));
    return <div>
        <AppBar
          title="Ann Arbus"
          style={{ position: 'relative' }} /* XXX used to get stacking to work. warning, may affect mobile scroll smoothness! */
          iconClassNameRight="nav-items"
          onLeftIconButtonTouchTap={this.showLeftNav}
          iconElementRight={<FlatButton onClick={this.viewToggleClick} label={this.state.label}/>} />
        <LeftNav onChange={this._onLeftNavChange} ref='leftNav' docked={false} menuItems={menuItems} />
        <Snackbar
          message="Do something"
          action="undo"/>
        <Dialog
          title="Welcome to Ann Arbus!"
          ref='dialog'
          actions={this.standardActions}
          actionFocus="ok"
          openImmediately={true}
          modal={this.state.modal}>
          This site can be used to quickly find information about buses near you.
        </Dialog>
        <Dialog
          title="Settings"
          ref='settings'
          actions={this.standardActions}
          actionFocus="ok"
          openImmediately={false}
          modal={false}>
        {checkboxes}
        </Dialog>
        <main>
          <div className={"map-box" + (this.state.activeView === 'Map' ? ' visible' : '')}>
            <Map ref="map" destination="Blake Transit Center" stops={this.props.state.stops} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} initZoom={16} width='100%' height='100%'></Map>
          </div>
          <div className={"status-box" + (this.state.activeView === 'Status' ? ' visible' : '')}>
            <StatusBox stops={this.state.stops} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} userRoutes={this.state.userRoutes} positionError={this.props.state.positionError} ref="status"></StatusBox>
          </div>
        </main>
      </div>;
  }
}

AppRoot.childContextTypes = {
  muiTheme: React.PropTypes.object
}

export default AppRoot;
