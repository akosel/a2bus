import React from 'react/addons';
import Map from './Map';
import StatusBox from './StatusBox';

import injectTapEventPlugin from 'react-tap-event-plugin';
import ThemeManager from 'material-ui/lib/styles/theme-manager';

import AppBar from 'material-ui/lib/app-bar';
import FlatButton from 'material-ui/lib/flat-button';
import LeftNav from 'material-ui/lib/left-nav';

var tm = ThemeManager();
var menuItems = [
  { text: 'Add Routes', view: 'add-routes' }
];


//Needed for onTouchTap
//Can go away when react 1.0 release
//Check this repo:
//https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();

class AppRoot extends React.Component {
  constructor(props) {
    super(props);
    this.state = { activeView: 'Status' };
    this.viewToggleClick = this.viewToggleClick.bind(this);
    this.showLeftNav = this.showLeftNav.bind(this);
    this._onLeftNavChange = this._onLeftNavChange.bind(this);
  }

  getChildContext() {
    return {
      muiTheme: tm.getCurrentTheme()
    };
  }

  showLeftNav() {
    this.refs.leftNav.toggle();
  }

  _onLeftNavChange(e, key, menuItem) {
    this.setState({ activeView: menuItem.view });
  }

  viewToggleClick() {
    if (this.state.activeView === 'Map') {
      this.setState({ activeView: 'Status' });
    } else {
      this.setState({ activeView: 'Map' });
    }
  }

  render() {
    return <div>
        <AppBar
          title="A2Bus"
          style={{ position: 'relative' }} /* XXX used to get stacking to work. warning, may affect mobile scroll smoothness! */
          iconClassNameRight="nav-items"
          onLeftIconButtonTouchTap={this.showLeftNav}
          iconElementRight={<FlatButton onClick={this.viewToggleClick} label={this.state.activeView}/>} />
        <LeftNav onChange={this._onLeftNavChange} ref='leftNav' docked={false} menuItems={menuItems} />
        <main>
          <div className={"map-box" + (this.state.activeView === 'Map' ? ' visible' : '')}>
            <Map ref="map" stops={this.props.state.stops} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} initZoom={16} width='100%' height='100%'></Map>
          </div>
          <div className={"status-box" + (this.state.activeView === 'Status' ? ' visible' : '')}>
            <StatusBox stops={this.props.state.stops} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} userRoutes={this.props.state.userRoutes} positionError={this.props.state.positionError} ref="status"></StatusBox>
          </div>
        </main>
      </div>;
  }
}

        //<nav className="config">
        //  <ul className="nav-items nav-items-left">
        //    <li>Menu</li>
        //  </ul>
        //  <ul className="nav-items nav-items-right">
        //    <li onClick={this.viewToggleClick} id="view-toggle-handler">{ this.state.activeView === 'Map' ? 'Status' : 'Map' }</li>
        //  </ul>
        //</nav>

AppRoot.childContextTypes = {
  muiTheme: React.PropTypes.object
}

export default AppRoot;
