import App from '../../app';
import api from '../../app/scripts/api';
import _ from 'underscore';

window.onload = function() {
  var attachElement = document.querySelector('body');

  function getParsedKey(key) {
    var keys = ['routeAbbr', 'stopID', 'directionID'];
    var values = key.split('.');
    return _(keys).object(values);
  }

  function getBusLocations(routes) {
    return _(routes).filter(function(route) {
      return route.routeAbbr;
    });
  }

  navigator.geolocation.watchPosition(function(position) {
    api.getNearbyStops(position, function(v) { console.log('watchPosition callback: ', v); })
  });

  navigator.geolocation.getCurrentPosition(function(position) {
    api.getNearbyStops(position, function(stopKeys) {

      var userRoutes = _(stopKeys).chain()
        .map(function(stopKey) {
          return stopKey.abbreviation;
        })
        .uniq()
        .value();
      var state = {
        stops: stopKeys,
        position: position,
        userRoutes: userRoutes
      }
      var app = new App({
        state: state
      });
      app.renderToDOM(attachElement);
    });
  }, function(positionError) {
    var state = {
      position: { coords: { longitude: 42.267, latitude: -83.770 }},
      stops: [],
      userRoutes: userRoutes,
      positionError: positionError
    };
    var app = new App({
      state: state
    });
    app.renderToDOM(attachElement);
  });
}

window.sender = new WebSocket('wss://' + location.host + '/send');
