import React from 'react/addons';
import Status from './Status';

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class  StatusList extends React.Component {
  render() {
    var statusNodes = this.props.slice.map(function(routeInfo, idx) {
      return (
        <Status key={routeInfo.busNum} routeInfo={routeInfo}></Status>
      );
    });
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
