import React from 'react/addons';

class Map extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      map : null,
      lines: {},
      markers : []
    };
  }

  // update geo-encoded markers
  updateMarkers(stops) {

    var markers = this.state.markers;
    var map = this.state.map;

    // remove everything
    //markers.forEach( function(marker) {
    //  marker.setMap(null);
    //} );

    this.state.markers = [];

    // add new markers
    stops.forEach( (function( point ) {

      var location = new google.maps.LatLng( point.lat, point.lng );

      var marker = new google.maps.Marker({
        position: location,
        map: map,
        title: point.label
      });

      markers.push( marker );

    }) );

    this.setState({ markers : markers });
  }

  updateZoom(newZoom) {
    this.state.map.setZoom(newZoom)
  }

  updateCenter(newLat, newLon){
    var newCenter = new google.maps.LatLng(newLat, newLon)
    this.state.map.setCenter(newCenter)
  }

  render() {
    var style = {
      width: this.props.width,
      height: this.props.height,
    }

    return React.DOM.div({style:style})
  }

  updateTransitLayer(map) {

    //var map = this.state.map;

    var directionsDisplay = new google.maps.DirectionsRenderer({
        draggable: true,
        map: map
    });
    var directionsService = new google.maps.DirectionsService();
    var currentLocation = new google.maps.LatLng(this.props.initLat, this.props.initLon);
    var request = {
      destination: this.props.destination, // TODO add interface to allow user to input destination
      origin: currentLocation,
      waypoints: [],
      travelMode: google.maps.TravelMode.TRANSIT,
    };
    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        console.log('setting directions', result);
        directionsDisplay.setDirections(result);
      }
    });
  }

  componentDidMount() {
    var createMap = (function() {
      var mapOptions = {
        zoom: this.props.initZoom,
        center: new google.maps.LatLng( this.props.initLat , this.props.initLon ),
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };

      var map = new google.maps.Map( React.findDOMNode(this), mapOptions);

      this.setState( { map : map } );
      if (this.props.destination) {
        this.updateTransitLayer(map);
      }

      if( this.props.stops ) this.updateMarkers(this.props.stops);

    }).bind(this);

    createMap()
  }

  // update props (ignores the initial ones: initLat, initLon, initZoom)
  componentWillReceiveProps(props) {
    if( props.stops ) this.updateMarkers(props.stops);
  }

}
Map.defaultProps = {
  initLat: 0,
  initLon: 0,
  initZoom: 4,
  width: 500,
  height: 500,
  stops: [],
  lines:{},
  gmaps_api_key: 'AIzaSyB7GsL0qvb10WBpJzFznuf3caOUUJSmPUw',
  gmaps_sensor: false
};

export default Map;
