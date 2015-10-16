import React from 'react/addons';
import moment from 'moment';
import _ from 'underscore';
import sprintf from 'underscore.string/sprintf';

import Avatar from 'material-ui/lib/avatar';
import Card from 'material-ui/lib/card/card';
import CardHeader from 'material-ui/lib/card/card-header';
import CardText from 'material-ui/lib/card/card-text';


class StatusItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      lateByMessage: '',
      bgColor: '#eee',
      minutesToArrival: undefined,
      stopMinutesList: []
    };
  }

  render() {
      var substeps = [];
      if (this.props.step.steps) {
        this.props.step.steps.map(function(step, idx) {
          substeps.push(<li dangerouslySetInnerHTML={{__html: step.instructions}}></li>);
        });
      }
      if (this.props.step.travel_mode === 'TRANSIT') {
        var departureTime = this.props.step.transit.departure_time.text;
        var routeAbbreviation = this.props.step.transit.line.short_name;
        var routeName = this.props.step.transit.line.name;
        var title = sprintf('Take bus %s (%s) at %s', routeAbbreviation, routeName, departureTime);
      }
      return (
        <div className="status-item clearfix">
          <Card initiallyExpanded={true}>
            <CardHeader
              title={ sprintf('%s-%s', this.props.step.startTime, this.props.step.endTime) }
              subtitle={ this.props.step.duration.text }
              avatar={<Avatar>{this.props.stepNumber}</Avatar>}
              showExpandableButton={true}>
            </CardHeader>
            <CardText expandable={true}>
              <h3>{ title || this.props.step.instructions }</h3>
              <ul>
                {substeps}
              </ul>
            </CardText>
          </Card>
        </div>
      );

  }
}

export default StatusItem;
