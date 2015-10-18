/*
	CDIF Yeelight Blue module implementation
	This module is based on Sandeep Mistry's Yeelight blue library for node.js to
	control Yeelight Blue BLE lightbulb.
*/

var util = require('util');
var CdifDevice = require('cdif-device');

var SERVICE_UUID          = 'fff0';
var CONTROL_UUID          = 'fff1';
var EFFECT_UUID           = 'fffc';

var YeelightBlue = function(bleDevice) {
  //TODO: this is just a convenient way to get device spec, in the future the spec should be dynamically generated from SDP service discovery result
  var spec = require('./yeelight-blue.json');
  CdifDevice.call(this, spec);
  this.device = bleDevice;
  var service;
  service = this.services['urn:cdif-net:serviceId:BinarySwitch'];
  service.addAction('getState', getYeelightBlueState.bind(this));
  service.addAction('setState', setYeelightBlueState.bind(this));
  service = this.services['urn:cdif-net:serviceId:Dimming'];
  service.addAction('getLoadLevelState', getYeelightBlueBrightness.bind(this));
  service.addAction('setLoadLevelState', setYeelightBlueBrightness.bind(this));
  service = this.services['urn:yeelight-com:serviceId:ColorAdjust'];
  service.addAction('getColor', getYeelightBlueColor.bind(this));
  service.addAction('setColor', setYeelightBlueColor.bind(this));

  this.state = {red: 255, green: 255, blue: 255, bright: 100};
};

util.inherits(YeelightBlue, CdifDevice);

YeelightBlue.is = function(peripheral) {
  var localName = peripheral.advertisement.localName;

  return ((localName === 'Yeelight Blu') || (localName === 'LightStrips'));
};

YeelightBlue.prototype.writeServiceStringCharacteristic = function(uuid, string, callback) {
  this.device.writeStringCharacteristic(SERVICE_UUID, uuid, string, callback);
};

YeelightBlue.prototype.writeControlCharateristic = function(red, green, blue, brightness, callback) {
  var command = util.format('%d,%d,%d,%d', red, green, blue, brightness);

  for (var i = command.length; i < 18; i++) {
    command += ',';
  }

  this.writeServiceStringCharacteristic(CONTROL_UUID, command, callback);
};

YeelightBlue.prototype.turnOn = function(callback) {
  this.writeControlCharateristic(255, 255, 255, 100, callback);
};

YeelightBlue.prototype.turnOff = function(callback) {
  this.writeControlCharateristic(0, 0, 0, 0, callback);
};

YeelightBlue.prototype.setColorAndBrightness = function(red, green, blue, brightness, callback) {
  this.writeControlCharateristic(red, green, blue, brightness, callback);
};

YeelightBlue.prototype.setGradualMode = function(on, callback) {
  this.writeServiceStringCharacteristic(EFFECT_UUID, on ? 'TS' : 'TE', callback);
};

var getYeelightBlueBrightness = function(args, callback) {
  var output = {};
  output['loadLevelState'] = this.state.bright;
  callback(null, output);
};

var setYeelightBlueBrightness = function(args, callback) {
  var _this = this;
  var bright = args.newLoadLevelState;
  var red = this.state.red;
  var green = this.state.green;
  var blue = this.state.blue;

  this.setColorAndBrightness(red, green, blue, bright, function(err) {
    if (!err) {
      _this.state.bright = bright;
    }
    callback(err);
  });
};

var getYeelightBlueColor = function(args, callback) {
  var output = {};
  output['red'] = this.state.red;
  output['green'] = this.state.green;
  output['blue'] = this.state.blue;
  callback(null, output);
};

var setYeelightBlueColor = function(args, callback) {
  var _this = this;
  var red = args.red;
  var green = args.green;
  var blue = args.blue;
  var bright = this.state.bright;
  this.setColorAndBrightness(red, green, blue, bright, function(err) {
    if (!err) {
      _this.state.red = red;
      _this.state.green = green;
      _this.state.blue = blue;
    }
    callback(err);
  });
};

var getYeelightBlueState = function(args, callback) {
  var output = {};
  if (this.state.bright > 0) {
    output['stateValue'] = true;
  } else {
    output['stateValue'] = false;
  }
  callback(null, output);
};

var setYeelightBlueState = function(args, callback) {
  var _this = this;
  var arg = args.stateValue;
  if (arg == true) {
    this.turnOn(function(err) {
      if (!err) {
        _this.state.bright = 100;
        _this.state.red = 255;
        _this.state.green = 255;
        _this.state.blue = 255;
      }
      callback(err);
    });
  } else if (arg == false) {
    this.turnOff(function(err) {
      if (!err) {
        _this.state.bright = 0;
        _this.state.red = 0;
        _this.state.green = 0;
        _this.state.blue = 0;
      }
      callback(err);
    });
  }
};

module.exports = YeelightBlue;
