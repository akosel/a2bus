import React from 'react/addons';
import Map from './Map';
import StatusBox from './StatusBox';

class AppRoot extends React.Component {
  constructor(props) {
    super(props);
    this.state = { activeView: 'Status' };
    this.props = props;
    this.viewToggleClick = this.viewToggleClick.bind(this);
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
        <nav className="config">
          <ul className="nav-items nav-items-left">
            <li>Menu</li>
          </ul>
          <ul className="nav-items nav-items-right">
            <li onClick={this.viewToggleClick} id="view-toggle-handler">{ this.state.activeView === 'Map' ? 'Status' : 'Map' }</li>
          </ul>
        </nav>
        <main>
          <div className={"map-box" + (this.state.activeView === 'Map' ? ' visible' : '')}>
            <Map ref="map" points={this.props.state.points} initLat={this.props.state.position.coords.latitude} initLon={this.props.state.position.coords.longitude} initZoom={16} width='100%' height='100%'></Map>
          </div>
          <div className={"status-box" + (this.state.activeView === 'Status' ? ' visible' : '')}>
            <StatusBox ref="status"></StatusBox>
          </div>
        </main>
      </div>;
  }
}

export default AppRoot;
