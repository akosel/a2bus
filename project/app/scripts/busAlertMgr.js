// yeah, it's on the window. what are you going to do about it?
// XXX DEPRECATED Refactor to use React to manage this view
(function(window) {

window.BusAlertMgr = function(args) {
  this.defaults = {
    dashItems: ['adherence', 'direction'],
    userConfig: {
      stopMinutes: {
        name: 'Time (i.e. 8:04)',
        labelText: 'What time does your bus come? (enter up to two times)',
        allowMultiple: true,
        $formElements: [],
        inputConfig: {
          type: 'time',
          min: 0,
          max: 59
        }
      },
      walkTime: {
        name: 'Walk Time',
        labelText: 'How long does it take you to walk to the bus stop?',
        allowMultiple: false,
        $formElements: [],
        inputConfig: {
          type: 'number',
          min: 0
        }
      },
      route: {
        name: 'Route',
        labelText: 'What is your route number?',
        allowMultiple: false,
        $formElements: [],
        inputConfig: {
          type: 'select',
          min: 0,
          max: 59
        }
      }
    },
    selectorClasses: ['config', 'notifications', 'reset', 'news', 'controls'],
    routes: ['1', '1U', '2', '2C', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12A', '12B', '13', '14', '15', '16', '17', '18', '20', '22', '33', '36', '39', '46', '351', '352', '353', '354', '501', '502', '505', '609', '710', '711', '787']
  };
  this.options = _({}).extend(this.defaults, args);
  this.socket = io.connect(window.location.origin);
  this.$selectors = {};
  this.init();
};

_(BusAlertMgr.prototype).extend({

  init: function() {
    var self = this;

    _(self.options.selectorClasses).each(function(c) {
      self.$selectors[c] = document.querySelector('.' + c);
    });

    // listen to the server for changes to the bus data
    this.socket.on('busData', function(json) {
      self.socket.emit('news', null);
      var toBusGroup = [];
      _(json).each(function(v) {
          if (v.direction === 'To Downtown') {
            toBusGroup.push(v);
          }
      });
      if (!toBusGroup.length) {
          toBusGroup.push(json[0]);
      }

      var bus = toBusGroup[0];

      var updateValues = self.options.dashItems;

      _(updateValues).each(function(val) {
        self._updateElement(val, bus[val]);
      });

    });

    this.socket.on('news', function(news) {
      var $p = self.$selectors['news'].querySelector('p');
      $p.textContent = news;
    });

    this.socket.on('abbrToId', function(json) {
      console.log('reset abbrToId', json);
      self.abbrToId = Object.keys(json);
      // TODO sort them, by number, not string
    });

    this._pageSetup();

  },

  _pageSetup: function() {
    var self = this;
    var userConfigKeys = _(this.options.userConfig).keys();
    var isReady = _(userConfigKeys).every(function(val) {
      if (!self._getItem(val)) {
        console.log('MISSING: ', val);
        self.showConfig(val);
        return false;
      }
      return true;
    });

    if(!isReady) {
      return false;
    }

    this.$selectors['reset'].onclick = function (e) {
      e.preventDefault();

      localStorage.clear();
      self._pageSetup();
    };

    this.socket.emit('route', this._getItem('route'));
    this._startClock();
  },

  _addInput: function(val) {
    var $input = document.createElement('input');
    $input.placeholder = this.options.userConfig[val].name;
    $input.type = this.options.userConfig[val].inputConfig.type;
    $input.min = 0;
    $input.required = true;
    $input.className = val;

    this.options.userConfig[val].$formElements.push($input);
    this.$selectors[val].appendChild($input);
  },

  _addDropdown: function(val) {
    var self = this;
    var $select = document.createElement('select');

    for (var i = 0; i < this.options.routes.length; i += 1) {
      var $option = document.createElement('option');
      $option.value = this.options.routes[i];
      $option.textContent = this.options.routes[i];
      $select.appendChild($option);
    }

    $select.onchange = function() {
      $select.value = self.options.routes[$select.selectedIndex];
      console.log('NEW VALUE: ', $select.value);
    };

    this.options.userConfig[val].$formElements.push($select);
    this.$selectors[val].appendChild($select);
  },

  _addButton: function(args, clickFn) {
    var $button = document.createElement('button');
    $button.type = 'button';
    $button.textContent = args.text;
    $button.className = args.className || '';

    $button.onclick = clickFn.bind(this);

    this.$selectors[args.context].appendChild($button);
  },

  _addBox: function(val) {
    var $div = document.createElement('div');
    $div.className = val + ' box';

    var $label = document.createElement('p');
    $label.textContent = this.options.userConfig[val].labelText;
    $div.appendChild($label);

    this.$selectors[val] = $div;
    this.$selectors['notifications'].appendChild($div);
  },

  showConfig: function() {
    var self = this;
    this.$selectors['config'].style.display = 'block';
    var userConfigKeys = _(this.options.userConfig).keys();

    _(userConfigKeys).each(function(val) {
      self._addBox(val);

      if (self.options.userConfig[val].inputConfig.type === 'select') {
        self._addDropdown(val);
      } else {
        self._addInput(val);
      }

      if (self.options.userConfig[val].allowMultiple) {
          self._addInput(val);
      }
    });


    this._addButton({
      text: 'All done',
      context: 'notifications'
    }, function() {
      var self = this;

      var userConfig = {};
      _(userConfigKeys).each(function(key) {
        var value;
        var $formElements = self.options.userConfig[key].$formElements;

        if (self.options.userConfig[key].allowMultiple) {

          value = [];
          _($formElements).each(function ($elem) {
            if ($elem.value) {
              value.push($elem.value);
            }
          });
          value = JSON.stringify(value);
        } else {
          console.log($formElements);
          value = $formElements[0].value;
        }

        userConfig[key] = value;

        // var $span = document.createElement('span');
        // $span.textContent = value;
        // self.$selectors['controls'].appendChild($span);
        self._setItem(key, value);
      });
      this.socket.emit('userConfig', userConfig);
      this.hideConfig();
    });

  },

  hideConfig: function () {
    var self = this;
    _(Object.keys(this.options.userConfig)).each(function(key) {
      self.options.userConfig[key].$formElements = [];
    });
    this.$selectors['notifications'].innerHTML = null;
    this.$selectors['config'].style.display = 'none';
    this._pageSetup();
  },

  _getLateBy: function(adherence) {
    var lateBy = Number(adherence[0]) || 0;

    if (adherence.match('ahead')) {
        lateBy = lateBy * -1;
    }
    return lateBy;
  },


  _startClock: function() {
    var self = this;
    var lateBy = 0;
    var fmt = 'HH:mm';
    var $timestamp = document.querySelector('.timestamp');

    this.socket.on('busData', function(data) {
      lateBy = self._getLateBy(data[0].adherence);
    });

    setInterval(function() {
      var hour = moment().hour();
      var minute = moment().minute();
      var second = moment().second();
      var stopMinutesStr = self._getItem('stopMinutes');
      var stopMinutes = JSON.parse(stopMinutesStr).map(function(v) { var idx = v.indexOf(':') + 1; return Number(v.slice(idx)); });

      var timeToNextStop = stopMinutes.map(function(v) { var next = v - minute + lateBy < 0 ? v + 59 - minute + lateBy : v - minute + lateBy - 1; return next; });

      var minutesLeft = _(timeToNextStop).min();

      $timestamp.textContent = minutesLeft + ':' + moment((59 - second) * 1000).format('ss');
    }, 1000);

    setInterval(function() {
      var hour = moment().hour();
      var minute = moment().minute();
      var second = moment().second();
      var stopMinutesStr = self._getItem('stopMinutes');
      var stopMinutes = JSON.parse(stopMinutesStr).map(function(v) { var idx = v.indexOf(':') + 1; return Number(v.slice(idx)); });

      var timeToNextStop = stopMinutes.map(function(v) { var next = v - minute + lateBy < 0 ? v + 59 - minute + lateBy : v - minute + lateBy - 1; return next; });
      var minutesLeft = _(timeToNextStop).min();
      self._setBgColor(minutesLeft);
    }, 5000);
  },


  _setBgColor: function(minutesLeft) {
    var walkTime = Number(this._getItem('walkTime'));

    if (minutesLeft < walkTime) {
      document.querySelector('body').className = 'go';
      this.socket.emit('lightData', { className: 'go', pinState: 1 });
    } else if (minutesLeft < walkTime + 2) {
      document.querySelector('body').className = 'set';
      this.socket.emit('lightData', { className: 'set', pinState: 1 });
    } else if (minutesLeft < walkTime + 5) {
      document.querySelector('body').className = 'ready';
      this.socket.emit('lightData', { className: 'ready', pinState: 1 });
    } else {
      document.querySelector('body').className = '';
      this.socket.emit('lightData', { className: 'ready', pinState: 0 });
      this.socket.emit('lightData', { className: 'set', pinState: 0 });
      this.socket.emit('lightData', { className: 'go', pinState: 0 });
    }

  },

  _updateElement: function(className, textContent) {
    var $element = document.querySelector('.' + className);
    $element.textContent = textContent;
  },

  _setItem: function(item, value) {
    localStorage.setItem(item, value);
  },

  _getItem: function(item) {
    return localStorage.getItem(item);
  }

});

})(window);
