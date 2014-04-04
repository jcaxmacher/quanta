module.exports = function () {

// Vue.config('debug', false);
var baseURL  = 'https://qua.firebaseIO.com/',
    quanta = new Firebase(baseURL),
    UserData = null,
    Vue = require('vue');

/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function() {
  var self = {};
  var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
  self.generate = function() {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
      lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
      lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
      lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
  }
  return self;
})();

var empty  = [],
    sep    = UUID.generate();
    nextID = function () {
        var counter = 1;
        return function () {
            return counter++;
        };
    }(); 

function resetArray(a) {
    return a === empty ? [] : a;
}

function cascadeAction(opts) {
    var items     = opts.items,
        childAttr = opts.childAttr,
        action    = opts.action;
    // items can be array of items or one item with child attribute
    items = items[childAttr] ? [items] : items;
    items.forEach(function (item) {
        action(item);
        opts.items = item[childAttr];
        cascadeAction(opts);
    });
}

function walkPath(opts) {
    var items      = {},
        path       = opts.path,
        itemAttr   = opts.itemAttr,
        childAttr  = opts.childAttr,
        resultAttr = opts.resultAttr,
        pathAction = opts.pathAction;
    
    items[childAttr] = opts.items;
    
    path.forEach(function (pathPart) {
        if (!items[childAttr]) return;
        items = items[childAttr].filter(function (item) {
            return item[itemAttr] === pathPart[itemAttr];
        });
        if (items &&
            items.length &&
            items.length > 0) {
            items = items[0];
            if (pathAction) pathAction(items)
        }
    });
    
    if (resultAttr) return items[resultAttr];
    return items;
}

function niceTime (value) {
    var hours = Math.floor(value / 3600),
        valueWithoutHours = value - (hours * 3600),
        minutes = Math.floor(valueWithoutHours / 60),
        seconds = Math.floor(valueWithoutHours - (minutes * 60)),
        displayText = '';
    
    if (hours > 0)    displayText += hours + 'h, ';
    if (minutes > 0)  displayText += minutes + 'm, ';
    if (seconds >= 0) displayText += seconds + 's';
    return displayText;
};

function lastOfType(logs, type) {
    var i = logs.length;
    if (!i) return null;
    while (i--) {
        if (logs[i].type == type) return logs[i];
    }
    return null;
}

function arrayEquals(a, b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
        if (a[i] != b[i]) return false;
    }
    return true;
}

function beginsWith(child, parent) {
    if (child.length < parent.length) return false;
    for (var i = 0; i < parent.length; i++) {
        if (child[i] != parent[i]) return false;
    }
    return true;
}

function any(list, fn) {
    for (var i = 0; i < list.length; i++) {
        if (fn(list[i])) return true;
    }
    return false;
}

var PathComponent = Vue.extend({
    replace: false,
    template: '#folder-path-template'
});

var EditableComponent = Vue.extend({
    template: '#editable-input',
    replace: true,
    methods: {
        stopProp: function(e) {
            if (e.targetVM.editable) e.stopPropagation();
        }
    },
    directives: {
        'editable-element': {
            bind: function(value) {
                var that = this,
                    el   = this.el;
                this._handler = function(e) {
                    if (e.keyCode === 13 || e.keyCode === 27) {
                        e.stopPropagation();
                        e.preventDefault();
                        el.blur();
                    }
                };
                this._blurHandler = function() {
                    that.vm.editable = false;
                    if (!that.vm.inputValue) that.vm.inputValue = 'replace me!'
                };
                this.el.addEventListener('keydown', this._handler);
                this.el.addEventListener('blur', this._blurHandler);
                if (value) this.el.focus();
            },
            update: function(value) {
                if (value !== undefined) this.el.contentEditable = value;
                if (value) this.el.focus();
                if (value && this.vm.inputValue == 'replace me!') this.vm.inputValue = '';
            },
            unbind: function() {
                this.el.removeEventListener('keydown', this._handler);
                this.el.removeEventListener('blur', this._blurHandler);
                this._handler = null;
            }
        }
    },
    attached: function () {
        if (this.editable) {
            setTimeout(function() {
              this.$el.focus();
              var range = document.createRange();
              range.selectNodeContents(this.$el);
              range.collapse(false);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            }.bind(this), 0);
        }
    }
});

var TimerComponent = Vue.extend({
    replace: true,
    template: '#timer-template',
    data: {
        id: null,
        parent: empty,
        logs: empty,
        type: 'timer'
    },
    computed: {
        running: function() {
            var last = lastOfType(this.logs, 'interval');
            if (!last || last.stoptime != null) return false;
            return true;
        },
        children: function() {
            var searchPath = this.parent
                                 .slice(0, this.parent.length)
                                 .concat([this.id]);
            return this.$root.qs.filter(function (q) {
                return beginsWith(q.parent, searchPath);
            });
        },
        childRunning: function() {
            return any(this.children, function (q) {
                var last = lastOfType(q.logs, 'interval');
                if (!last || last.stoptime != null) return false;
                return true;
            }.bind(this));
        },
        newSeconds: function() {
            this.$root.recompute;
            return this.timeRecorded(this);
        }
    },
    ready: function () {
        this.logs = resetArray(this.logs);
        this.parent = resetArray(this.parent);
        if (this.id === null) {
            this.id = UUID.generate();
            this.init();
        }
    },
    methods: {
        timeRecorded: function(q) {
            var reduction = function (current, next) {
                    var amount = next.type == 'interval'
                        ? (((next.stopTime || Date.now()) - next.startTime) / 1000)
                        : next.type == 'addition'
                            ? next.amount
                            : 0;
                    return current + amount;
                },
                seconds = q.logs.reduce(reduction, 0),
                childSeconds = this.children.reduce(function (current, next) {
                    return current + next.logs.reduce(reduction, 0);
                }, 0);
            return seconds + childSeconds;
        },
        init: function () {
            console.log('dispatch running');
            this.$dispatch('running', this);
        },
        halt: function () {
            console.log('dispatch stopping');
            this.$dispatch('stopping', this);
        },
        toggle: function () {
            if (!this.running) this.init();
            else this.halt();
        },
        undo: function () {
            this.logs.pop();
        },
        addTime: function(t) {
            this.logs.push({
                type: 'addition',
                timestamp: Date.now(),
                amount: t * 60
            });
        },
        drillDown: function() {
            this.$dispatch('changePath:down', this);
        },
        edit: function(e) {
            e.stopPropagation();
            e.targetVM.editing = true;
        }
    }
});

var vue = new Vue({
    el: '#main',
    data: {
        measure: 'Timer',
        comps: [{
            name: 'Timer'
        },{
            name: 'Counter'
        }],
        counters: [],
        path: [],
        qs: [],
        emailAddress: '',
        password: '',
        recompute: true
    },
    created: function () {

        // Set sync to firebase
        this.$watch('qs', function(qs) {
            if (this.user) {
                UserData.child('qs').set(qs);
            }
        });
        this.$watch('path', function(path) {
            if (this.user) {
                UserData.child('path').set(path);
            }
        });

        this.$on('changePath:up', function (timers) {
            this.path = timers;
        });

        this.$on('changePath:down', function (timer) {
            var i = [{
                id: timer.id,
                name: timer.name
            }];
            this.path.push.apply(this.path, i);
        });

        this.$on('running', function(timer) {
            console.log(timer);
            this.stopAllRunning();
            timer.logs.push({
                type: 'interval',
                startTime: Date.now(),
                stopTime: null
            });
        });

        this.$on('stopping', function(timer) {
            console.log('stopping received');
            console.log(timer);
            var last = lastOfType(timer.logs, 'interval');
            if (last) last.stopTime = Date.now();
        });
    },
    computed: {
        json: function () {
            return JSON.stringify(this.qs, undefined, 2);
        },
        items: function() {
            return this.qs.filter(function (q) {
                return arrayEquals(q.parent, this.path);
            }.bind(this));
        },
        current: function () {
            var last = null, i = 0, q = null;
            for (; i < this.qs; i++) {
                q = this.qs[i];
                last = lastOfType(q.logs, 'interval');
                if (last && last.stopTime == null) 
                    return q.parent.slice(0, q.parent.length).concat([q.id]);
            }
            return [];
        }
    },
    components: {
        timer: TimerComponent,
        folderPath: PathComponent,
        editable: EditableComponent
    },
    filters: {
        niceTime: niceTime
    },
    methods: {
        stopAllRunning: function () {
            console.log('try stopping');
            this.qs.forEach(function (q) {
                var last = lastOfType(q.logs, 'interval');
                if (last && last.stopTime == null) {
                    console.log('stopping - ' + q.name);
                    last.stopTime = Date.now();
                }
            });
        },
        addTimer: function () {
            this.qs.push({
                name: '',
                editing: true,
                parent: this.path.slice(0, this.path.length),
                type: 'timer'
            });
        },
        kill: function (i) {
            this.items.$remove(i);
        },
        changePath: function (index) {
            this.$dispatch('changePath:up',
                           this.path.slice(0, index + 1));
        },
        halt: function (timer) {
            if (timer.running) {
                timer.running = false;
                timer.history[timer.history.length - 1].stopTime = Date.now();
                timer.hasChildRunning = false;
            }
        },
        init: function (timer) {
            if (!timer.running) {
                timer.running = true;
                timer.history.push({
                  startTime: Date.now(),
                  stopTime: null
                });
            }
        },
        logOut: function() {
          console.log('attempting logout');
          this.$emit('logout');
        },
        logIn: function(app) {
            var getEmail = {
                'facebook': function (u) {
                    return u.thirdPartyUserData.email;
                },
                'github': function (u) {
                    return u.thirdPartyUserData.emails[0].email;
                }
            };
            var that = this,
                auth = new FirebaseSimpleLogin(quanta, function(error, user) {
                    if (error || !user) {
                        console.log(error);
                        that.errors = [
                            'Bad email or password'
                        ];
                        return;
                    }
                    that.errors = [];
                    console.log(user);
                    that.emailAddress = getEmail[app](user);

                    UserData = quanta.child('users/' + user.uid);
                    UserData.once('value', function(snapshot) {
                        if(snapshot.val() !== null) {
                            that.qs = snapshot.val().qs || [];
                            that.path = snapshot.val().path || [];
                        } else {
                            that.qs = [];
                            that.path = [];
                        }
                        that.user = user;
                    });
                });
            var appScopes = {
                'facebook': 'email',
                'github': 'user:email'
            };
            auth.login(app, {
                rememberMe: true,
                scope: appScopes[app]
            });
            this.$on('logout', function() {
              console.log('heard logout');
                auth.logout();
                this.user = null;
            }.bind(this));
        }
    }
});

function recompute() {
  vue.recompute = !vue.recompute;
  setTimeout(recompute, 100);
}

recompute();

};
