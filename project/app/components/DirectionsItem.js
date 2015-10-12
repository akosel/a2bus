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
      this.props.step.steps.map(function(step, idx) {
        substeps.push(<li dangerouslySetInnerHTML={{__html: step.instructions}}></li>);
      });
      return (
        <div className="status-item clearfix">
          <Card initiallyExpanded={false}>
            <CardHeader
              title={ this.props.step.instructions || 'No expected crossing time' }
              subtitle={ this.props.step.duration.text }
              avatar={<Avatar>{this.props.stepNumber}</Avatar>}
              showExpandableButton={true}>
            </CardHeader>
            <CardText expandable={true}>
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
