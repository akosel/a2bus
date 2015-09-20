import App from '../../app';
import api from '../../app/scripts/api';
import _ from 'underscore';

var attachElement = document.querySelector('body');


function getParsedKey(key) {
  var keys = ['routeAbbr', 'stopID', 'directionID'];
  var values = key.split('.');
  return _(keys).object(values);
}

function getBusLocations(routes) {
  return _(routes).filter(function(route) {
    return route.routeAbbr
  });
}

navigator.geolocation.watchPosition(function(position) {
  window.userPosition = position;
  api.getNearbyStops(function(v) { console.log(v); })
});

navigator.geolocation.getCurrentPosition(function(position) {
  window.userPosition = position;
  api.getNearbyStops(function(stopKeys) {
    console.log('stopKeys', stopKeys);
    var points = stopKeys.map(function(stop) {
      return { latitude: stop.lat, longitude: stop.lng };
    });

    var state = {
      points: points,
      position: position
    }
    var app = new App({
      state: state
    });
    app.renderToDOM(attachElement);
    window.userRoutes = _(stopKeys).chain()
      .map(function(stopKey) {
        return stopKey.abbreviation;
      })
      .uniq()
      .value();
  });
});

window.sender = new WebSocket('ws://' + location.host + '/send');
window.onbeforeunload = function() {
  sender.onclose = function() {};
  sender.close();
}
