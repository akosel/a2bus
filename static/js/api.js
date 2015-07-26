/*
 *  Basic wrapper for managing AJAX requests
 *
 */
var api = {};

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
