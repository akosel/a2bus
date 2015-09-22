import React from 'react/addons';
import StatusItem from './StatusItem';

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class  StatusList extends React.Component {
  render() {
    var statusNodes = this.props.slice.map(function(routeInfo, idx) {
      return (
        <StatusItem stops={this.props.stops} lat={this.props.lat} lng={this.props.lng} key={routeInfo.busNum} routeInfo={routeInfo}></StatusItem>
      );
    }.bind(this));
    return (
      <div className='status-list'>
        <ReactCSSTransitionGroup transitionName="fade">
          {statusNodes}
        </ReactCSSTransitionGroup>
      </div>
    );
  }
}

export default StatusList;
