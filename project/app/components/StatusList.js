import React from 'react/addons';
import StatusItem from './StatusItem';
import moment from 'moment';
import sprintf from 'underscore.string/sprintf';

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

class  StatusList extends React.Component {
  constructor(props) {
    super(props);
    this.getLateBy = this.getLateBy.bind(this);
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

  render() {
    var statusNodes = this.props.slice.map(function(routeInfo, idx) {
      return (
        <StatusItem lateByMessage={this.getLateBy(routeInfo.adherence)} lastUpdated={moment()} stops={this.props.stops} lat={this.props.lat} lng={this.props.lng} key={routeInfo.busNum} routeInfo={routeInfo}></StatusItem>
      );
    }.bind(this));
    return (
      <div className='status-list'>
        {statusNodes}
      </div>
    );
  }
}

StatusList.defaultProps = {
  slice: []
};

export default StatusList;
