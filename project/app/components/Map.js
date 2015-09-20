import React from 'react/addons';

class Map extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      map : null,
      lines: {},
      show: false,
      markers : []
    };
  }

  // update geo-encoded markers
  updateMarkers(points) {

    var markers = this.state.markers;
    var map = this.state.map;

    // remove everything
    markers.forEach( function(marker) {
      marker.setMap(null);
    } );

    this.state.markers = [];

    // add new markers
    points.forEach( (function( point ) {

      var location = new google.maps.LatLng( point.latitude , point.longitude );

      var marker = new google.maps.Marker({
        position: location,
        map: map,
        title: point.label
      });

      markers.push( marker );

    }) );

    this.setState( { markers : markers });
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

  updateTransitLayer() {

    var map = this.state.map;
    var transitLayer = new google.maps.TransitLayer();
    transitLayer.setMap(map);

    var directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
    var directionsService = new google.maps.DirectionsService();
    var currentLocation = new google.maps.LatLng(this.props.initLat, this.props.initLon);
    var request = {
      destination: "341 Larkspur St, Ann Arbor, MI", // TODO add interface to allow user to input destination
      origin: currentLocation,
      waypoints: [],
      provideRouteAlternatives: true,
      travelMode: google.maps.TravelMode.TRANSIT,
      unitSystem: google.maps.UnitSystem.IMPERIAL
    };
    directionsService.route(request, function(result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
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
      this.updateTransitLayer();

      if( this.props.points ) this.updateMarkers(this.props.points);

    }).bind(this);

    if (typeof google !== 'undefined') {
      // scripts already loaded, create map immediately
      createMap()
    } else {
      if (!window.reactMapCallback) {
        // if this is the first time, load the scripts:
        var s =document.createElement('script');
        s.src = 'https://maps.googleapis.com/maps/api/js?key=' + this.props.gmaps_api_key + '&sensor=' + this.props.gmaps_sensor + '&callback=reactMapCallback';
        document.head.appendChild( s );

        // when the script has loaded, run all the callbacks
        window.reactMapCallbacks = []
        window.reactMapCallback = function(){
          while (window.reactMapCallbacks.length > 0)
            (window.reactMapCallbacks.shift())() // remove from front
        }
      }

      // add a callback to the end of the chain
      window.reactMapCallbacks.push(createMap);
    }
  }

  // update props (ignores the initial ones: initLat, initLon, initZoom)
  componentWillReceiveProps(props) {
    if( props.points ) this.updateMarkers(props.points);
  }

}
Map.defaultProps = {
  initLat: 0,
  initLon: 0,
  initZoom: 4,
  width: 500,
  height: 500,
  points: [],
  lines:{},
  gmaps_api_key: 'AIzaSyB7GsL0qvb10WBpJzFznuf3caOUUJSmPUw',
  gmaps_sensor: false
};

export default Map;
