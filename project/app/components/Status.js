import React from 'react/addons';

class Status extends React.Component {
  render() {
      return (
        <div className="info clearfix">
          <ul>
            <li className="adherence">
              Late by: { this.props.routeInfo.adherence }
            </li>
            <li className="timestamp">
              { this.props.routeInfo.timestamp }
            </li>
            <li className="direction">
              { this.props.routeInfo.routeDirection }
            </li>
            <li className="news">
              <p>
                { this.props.routeInfo.timePointName }
              </p>
            </li>
          </ul>
        </div>
      );
  }
}

export default Status;
