import React from 'react/addons';
import DirectionsItem from './DirectionsItem';

class  DirectionsList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var directionsNodes = this.props.steps.map(function(step, idx) {
      return (
        <DirectionsItem step={step} stepNumber={idx + 1} />
      );
    }.bind(this));
    return (
      <div className='directions-list'>
        {directionsNodes}
      </div>
    );
  }
}

DirectionsList.defaultProps = {
  steps: []
};

export default DirectionsList;
