import App from '../../app';
import api from '../../app/scripts/api';
import _ from 'underscore';

window.onload = function() {
  var attachElement = document.querySelector('body');

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
      position: { coords: { latitude: 42.267, longitude: -83.770 }},
      stops: [],
      userRoutes: [],
      positionError: positionError
    };
    var app = new App({
      state: state
    });
    app.renderToDOM(attachElement);
  });
}

window.sender = new WebSocket('wss://' + location.host + '/send');
