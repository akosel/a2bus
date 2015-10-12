import React from 'react/addons';
import sprintf from 'underscore.string/sprintf';

import dispatcher from '../dispatcher';

class Map extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      map : null,
      lines: {},
      markers : [],
      directionsDisplay: null,
      destinationMarker: null,
      originMarker: null,
    };

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

  getColor(adherence) {
    if (adherence > 0) {
      return '#0F0';
    } else if (adherence < 0) {
      return '#F00';
    } else {
      return '#FFF';
    }
  }

  // update geo-encoded markers
  updateMarkers(stops, locations) {

    var markers = this.state.markers;
    var map = this.state.map;

    // remove everything
    markers.forEach( function(marker) {
      marker.setMap(null);
    } );
    this.state.markers = [];



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
          strokeColor: this.getColor(point.adherence),
          fillColor: this.getColor(point.adherence),
          scale: 5,
        },
        title: point.label
      });

      marker.addListener('click', function() {
        infoWindow.open(map, marker);
      });

      markers.push( marker );

    }.bind(this)) );

    locations.forEach( (function( point ) {

      var location = new google.maps.LatLng( point.lat, point.lng );
      var infoWindow = new google.maps.InfoWindow({
        content: [point.timePointName, point.routeAbbr, point.routeDirection, this.getLateBy(point.adherence)].join('<br>')
      });
      var image = {
        url: '/dist/icons/favIcon_32x32.ico',
        size: new google.maps.Size(32, 32),
      };

      var marker = new google.maps.Marker({
        position: location,
        map: map,
        icon: image,
        title: point.label
      });

      marker.addListener('click', function() {
        infoWindow.open(map, marker);
      });

      markers.push( marker );

    }.bind(this)) );
    this.setState({ markers : markers });

    if (!this.state.originMarker && map) {
      var currentLocation = new google.maps.LatLng(this.props.initLat, this.props.initLon);
      var marker = new google.maps.Marker({
        position: currentLocation,
        map: map,
        label: {
          fontSize: '12px',
          text: '\u25B6',
        },
        draggable: true,
        title: 'Current Location'
      });
      this.setState({ originMarker: marker });
      marker.addListener('dragend', function(event) {
        this.updateTransitLayer(event.latLng);
      }.bind(this));
    }

    if (!this.state.destinationMarker && map) {
      // TODO this should be set better
      var dest = this.state.draggableMarker ? this.state.draggableMarker : new google.maps.LatLng(42.2795334, -83.747347);
      var destinationMarker = new google.maps.Marker({
        position: dest,
        draggable: true,
        map: map,
        label: {
          fontSize: '16px',
          text: '\u25A0',
        },
        animation: google.maps.Animation.DROP,
        title: 'Destination'
      });
      this.setState({ destinationMarker: destinationMarker });
      if (!this.state.draggableMarker) {
        var infoWindow = new google.maps.InfoWindow({
          content: 'Drag me to set your destination! \nI\'m currently in downtown Ann Arbor, but you can drag it anywhere.'
        });
        infoWindow.open(map, destinationMarker);
      }
      destinationMarker.addListener('dragend', function(event) {
        this.updateTransitLayer(event.latLng);
        if (infoWindow) {
          infoWindow.close();
        }
      }.bind(this));
    }

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
    var currentLocation, destination;
    if (!this.state.originMarker) {
      currentLocation = new google.maps.LatLng(this.props.initLat, this.props.initLon);
    } else {
      currentLocation = this.state.originMarker.getPosition();
    }
    if (!this.state.destinationMarker && destination) {
      destination = destination;
    } else if (this.state.destinationMarker) {
      destination = this.state.destinationMarker.getPosition();
    } else {
      console.log('No destination available');
    }
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
          dispatcher.dispatch({
            type: 'directionsUpdate',
            data:result
          });

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

      if(this.props) {
        this.updateMarkers(this.props.stops, this.props.locations);
      }


    }).bind(this);

    createMap()
  }

  // update props (ignores the initial on: initLat, initLon, initZoom)
  componentWillReceiveProps(props) {
    if(props) {
      this.updateMarkers(props.stops, props.locations);
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
