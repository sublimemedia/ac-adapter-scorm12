import Promise from 'bluebird';
import { extend } from '@sublimemedia/wicker-man-utilities'
import { blankMap, findApiInFrames } from '@sublimemedia/api-connector';

export default function(settings, debug) {
  'use strict';

  let
    api,
    store;

  const
    map = extend({}, blankMap, {
        learnerId: 'cmi.core.student_id',
        learnerName: 'cmi.core.student_name',
        location: 'cmi.core.lesson_location',
        credit: 'cmi.core.credit',
        lessonStatus: 'cmi.core.lesson_status',
        entry: 'cmi.core.entry',
        exit: 'cmi.core.exit',
        score: 'cmi.core.score',
        scoreRaw: 'cmi.core.score.raw',
        scoreMax: 'cmi.core.score.max',
        scoreMin: 'cmi.core.score.min',
        totalTime: 'cmi.core.total_time',
        sessionTime: 'cmi.core.session_time',
        mode: 'cmi.core.lesson_mode',
        suspendData: 'cmi.suspend_data',
        launchData: 'cmi.launch_data',
        scaledPassingScore: 'cmi.student_data.mastery_score',
        maximumTimeAllowed: 'cmi.student_data.max_time_allowed',
        timeLimitAction: 'cmi.student_data.time_limit_action',
        audioLevel: 'cmi.student_preference.audio',
        language: 'cmi.student_preference.language',
        deliverySpeed: 'cmi.student_preference.speed',
        audioCaptioning: 'cmi.student_preference.text'
    }),
    startTime = new Date();

  function find() {
    api = findApiInFrames('API');
    return api;
  }

  function updateTime() {
    var date = new Date() - startTime;
    var hours = Math.floor(date / 3600000);     // 3600000 = 1000 ms/sec * 60 sec/min * 60 min/hr
    date %= 3600000;
    var mins = Math.floor(date / 60000);        // 60000 = 1000 ms/sec * 60 sec/min
    date %= 60000;
    var secs = (date / 1000).toFixed(2);        // 1000 = 1000 ms/sec

    hours = Math.min(9999, hours);      // data element is limited to 9999 hours in SCORM 1.2

    var updatedTimeString = (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

    return set('sessionTime', updatedTimeString);
  }

  function initialize() {

    return new Promise(function(resolve, reject) {
      const init = api.LMSInitialize('');

      get('suspendData')
      .then(function(val){
        if (typeof val === 'string' && val) {
          store = JSON.parse(val);
        } else {
          store = {};
        }
      })
      .catch(function(){
        store = {};
      });

      if (init) {
        resolve();
      } else {
        reject();
      }
    });
  }

  function get(elem) {

    return new Promise(function(resolve, reject) {
      if (map[elem]) {
        resolve(api.LMSGetValue(map[elem]));
      } else {
        resolve(store[elem]);
      }
    });
  }

  function set(elem, val) {

    return new Promise(function(resolve, reject) {
      if (map[elem]) {
        if (api.LMSSetValue(map[elem], val)) {
          resolve();
        } else {
          reject();
        }
      } else if (typeof map[elem] === 'undefined') {
        store[elem] = val;
        set('suspendData', JSON.stringify(store));
        resolve();
      } else {
        resolve();
      }
    });
  }

 function exit() {
    return new Promise(function(resolve, reject) {
      updateTime().catch(reject);

      const lessonStatus = api.LMSGetValue(map['lessonStatus']);

      api.LMSSetValue(map['suspendData'], JSON.stringify(store));
      api.LMSSetValue(map['exit'], lessonStatus === settings.completed ? 'normal' : 'suspend');
      api.LMSCommit('');
      api.LMSFinish('');

      resolve();
    });
  }

  function sync() {

    return new Promise(function(resolve, reject) {
      if (api.LMSCommit('')) {
        resolve();
      } else {
        reject();
      }
    });
  }

  return {
    find,
    initialize,
    get,
    set,
    exit,
    sync
  };
};
