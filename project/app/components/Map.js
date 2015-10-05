import React from 'react/addons';

class Map extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      map : null,
      lines: {},
      markers : [],
      directionsDisplay: null,
      destinationMarker: null,
    };
  }

  // update geo-encoded markers
  updateMarkers(stops, locations) {

    var markers = this.state.markers;
    var map = this.state.map;

    // remove everything
    markers.forEach( function(marker) {
      marker.setMap(null);
    } );
    var currentLocation = new google.maps.LatLng(this.props.initLat, this.props.initLon);
    this.state.markers = [];

    var marker = new google.maps.Marker({
      position: currentLocation,
      map: map,
      title: 'Current Location'
    });
    this.state.markers.push(marker);

    if (this.state.destinationMarker) {
      this.state.destinationMarker.setMap(null);
    }
    // TODO this should be set better
    var dest = this.state.draggableMarker ? this.state.draggableMarker : new google.maps.LatLng(this.props.initLat + .001, this.props.initLon + .001);
    var destinationMarker = new google.maps.Marker({
      position: dest,
      draggable: true,
      map: map,
      animation: google.maps.Animation.DROP,
      title: 'Current Location'
    });
    this.setState({ destinationMarker: destinationMarker });

    if (!this.state.draggableMarker) {
      var infoWindow = new google.maps.InfoWindow({
        content: 'Drag me to set your destination!'
      });
      infoWindow.open(map, destinationMarker);
    }
    destinationMarker.addListener('dragend', function(event) {
      this.updateTransitLayer(event.latLng);
      if (infoWindow) {
        infoWindow.close();
      }
    }.bind(this));


    // add new markers
    stops.forEach( (function( point ) {

      var location = new google.maps.LatLng( point.lat, point.lng );
      var infoWindow = new google.maps.InfoWindow({
        content: [point.name, point.abbreviation, point.directionName].join('<br>')
      });

      var marker = new google.maps.Marker({
        position: location,
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
        },
        title: point.label
      });

      marker.addListener('click', function() {
        infoWindow.open(map, marker);
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

  updateTransitLayer(destination) {

    //var map = this.state.map;

    if (this.state.directionsDisplay) {
      this.state.directionsDisplay.setMap(null);
    }
    var directionsDisplay = new google.maps.DirectionsRenderer({
      draggable: true,
      suppressMarkers: true,
      map: this.state.map
    });
    this.setState({ directionsDisplay: directionsDisplay });
    var directionsService = new google.maps.DirectionsService();
    var currentLocation = new google.maps.LatLng(this.props.initLat, this.props.initLon);
    var request = {
      destination: destination, // TODO add interface to allow user to input destination
      origin: currentLocation,
      waypoints: [],
      travelMode: google.maps.TravelMode.TRANSIT,
    };
    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        console.log('setting directions', result);
        if (result && result.routes 
            && result.routes.length
            && result.routes[0]
            && result.routes[0].legs
            && result.routes[0].legs.length) {
          this.setState({ draggableMarker: result.routes[0].legs[0].end_location });
        }
        directionsDisplay.setDirections(result);
      }
    }.bind(this));
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
        this.updateTransitLayer(this.props.destination);
      }

      if( this.props.stops ) {
        this.updateMarkers(this.props.stops);
      }

    }).bind(this);

    createMap()
  }

  // update props (ignores the initial on: initLat, initLon, initZoom)
  componentWillReceiveProps(props) {
    if(props.stops) {
      this.updateMarkers(props.stops);
    }
    if(props.destination) {
      this.updateTransitLayer(props.destination);
    }
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
