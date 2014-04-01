module.exports = function () {

// Vue.config('debug', false);
var baseURL  = 'https://horologe.firebaseIO.com/',
    horologe = new Firebase(baseURL),
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
        running: false,
        hasChildRunning: false,
        history: empty,
        children: empty,
        additions: empty
    },
    computed: {
        newSeconds: function() {
            this.$root.recompute;
            var historySeconds = this.history.reduce(function (current, next) {
                return current + (((next.stopTime || Date.now()) - next.startTime) / 1000);
            }, 0);
            var additionSeconds = this.additions.reduce(function (current, next) {
                return current + next.amount;
            }, 0);
            return historySeconds + additionSeconds;
        }
    },
    ready: function () {
        this.history = resetArray(this.history);
        this.children = resetArray(this.children);
        this.additions = resetArray(this.additions);
        if (this.id === null) {
            this.id = UUID.generate();
            this.init();
        }
    },
    methods: {
        init: function () {
            this.$dispatch('running', this);
        },
        halt: function () {
            this.$dispatch('stopping', this);
        },
        toggle: function () {
            if (!this.running) this.init();
            else this.halt();
        },
        reset: function () {
            this.history.pop();
            this.additions = [];
        },
        addTime: function(t) {
            this.additions.push({
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
        timers: [],
        counters: [],
        path: [],
        current: [],
        emailAddress: '',
        password: '',
        recompute: true
    },
    created: function () {

        // Set sync to firebase
        this.$watch('timers', function(timers) {
            if (this.user) {
                UserData.child('timers').set(timers);
            }
        });
        this.$watch('current', function(current) {
            if (this.user) {
                UserData.child('current').set(current);
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
            var path = this.path.slice(0, this.path.length),
                that = this;
            path.push({
                id: timer.id,
                name: timer.name
            });

            if (this.current.join(sep) !== path.join(sep) || !timer.running) {
                // Halt all in existing currently running path
                walkPath({
                    path: this.current,
                    items: this.timers,
                    itemAttr: 'id',
                    childAttr: 'children',
                    pathAction: this.halt
                });
                // Start all in new running path
                walkPath({
                    path: path,
                    items: this.timers,
                    itemAttr: 'id',
                    childAttr: 'children',
                    pathAction: function(timer) {
                        that.init(timer);
                        timer.hasChildRunning = true;
                    }
                });
                this.current = path;
                timer.hasChildRunning = false;
            }
        });

        this.$on('stopping', function(timer) {
            var path = this.path.slice(0, this.path.length),
                that = this;
            path.push(timer.id);
            this.current = [];
            // Halt up the tree from this timer
            walkPath({
                path: path,
                items: this.timers,
                itemAttr: 'id',
                childAttr: 'children',
                pathAction: this.halt
            });
            // Halt all children down the tree
            cascadeAction({
                items: timer,
                childAttr: 'children',
                action: this.halt
            });
        }); 
       
    },
    computed: {
        json: function () {
            return JSON.stringify(this.timers, undefined, 2);
        },
        items: function() {
            return walkPath({
                path: this.path,
                items: this.timers,
                itemAttr: 'id',
                childAttr: 'children',
                resultAttr: 'children'
            });
        },
        currentTimer: function () {
            return JSON.stringify(this.current.$data, undefined, 2);
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
        addTimer: function () {
            this.items.push({
                name: '',
                editing: true
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
                auth = new FirebaseSimpleLogin(horologe, function(error, user) {
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

                    UserData = horologe.child('users/' + user.uid);
                    UserData.once('value', function(snapshot) {
                        if(snapshot.val() !== null) {
                            that.timers = snapshot.val().timers || [];
                            that.current = snapshot.val().current || [];
                            that.path = snapshot.val().path || [];
                        } else {
                            that.timers = [];
                            that.current = [];
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
