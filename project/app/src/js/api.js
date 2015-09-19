/*
 *  Basic wrapper for managing AJAX requests
 *
 */
var api = {};
var base = '/api/v1.0';
api.get = function(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200 && callback) {
      callback(xhr);
    }
  }
  xhr.send();
}

api.getNearbyStops = function(callback) {
  var url = [base, 'nearbystops'].join('/');
  var params = {
    lat: userPosition.coords.latitude,
    lng: userPosition.coords.longitude,
    radius: 500,
    units: 'm'
  };
  var paramList = _(params).map(function(value, key) {
    return [key, value].join('=');
  });
  var paramString = paramList.join('&');
  this.get([url, paramString].join('?'), function(xhr) {
    var nearbyStops = xhr && _(xhr.response).isString() ? JSON.parse(xhr.response) : [];
    callback(nearbyStops);
  }); 
};

api.getLastLocations = function(callback) {
  var url = [base, 'lastlocations'].join('/');
  this.get(url, function(xhr) {
    var lastLocations = xhr && _(xhr.response).isString() ? JSON.parse(xhr.response) : [];
    if (typeof xhr.response === 'object') {
       lastLocations = xhr.response;
    }
    callback(lastLocations);
  }); 
};
