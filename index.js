module.exports = function () {

var baseURL  = 'https://qua.firebaseIO.com/',
    quanta = new Firebase(baseURL),
    UserData = null,
    Vue = require('vue'),
    utils = require('./utils'),
    time = require('./time');


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
        parent: utils.empty,
        logs: utils.empty,
        type: 'timer'
    },
    computed: {
        running: function() {
            return utils.arrayEquals(this.parent.concat([this.id]), this.$root.running);
        },
        children: function() {
            this.parent;
            this.$root.qs;
            console.log('recomputing children for ' + this.name);
            var searchPath = this.parent.slice().concat(this.id);
            console.log(searchPath);
            return this.$root.qs.filter(function (q) {
                console.log(q.parent);
                return utils.beginsWith(q.parent, searchPath);
            });
        },
        childRunning: function() {
            return utils.beginsWith(this.$root.running, this.parent.concat([this.id]), true);
        },
        newSeconds: function() {
            this.$root.recompute;
            this.logs;
            this.children;
            var reduction = function (current, next) {
                    var amount = next.type == 'interval'
                        ? (((next.stopTime || Date.now()) - next.startTime) / 1000)
                        : next.type == 'addition'
                            ? next.amount
                            : 0;
                    return current + amount;
                },
                seconds = this.logs.reduce(reduction, 0);
                childSeconds = this.children.reduce(function (current, next) {
                    return current + next.logs.reduce(reduction, 0);
                }, 0);
            return seconds + childSeconds;
        }
    },
    ready: function () {
        this.logs = utils.resetArray(this.logs);
        this.parent = utils.resetArray(this.parent);
        if (this.id === null) {
            this.id = utils.UUID.generate();
            this.init();
        }
    },
    methods: {
        timeRecorded: function(q) {
        },
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
        running: [],
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
        this.$watch('running', function(running) {
            if (this.user) {
                UserData.child('running').set(running);
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
            var runningID = this.running[this.running.length - 1],
                runningTimer = this.qs.filter(function (q) {
                    return q.id == runningID;
                }),
                lastLog = null;
            if (runningTimer.length > 0) {
                runningTimer = runningTimer[0];
                last = utils.lastOfType(runningTimer.logs, 'interval');
                if (last && last.stopTime == null) {
                    last.stopTime = Date.now();
                }
            }
            timer.logs.push({
                type: 'interval',
                startTime: Date.now(),
                stopTime: null
            });
            this.running = timer.parent.slice().concat(timer.id);
        });

        this.$on('stopping', function(timer) {
            var last = utils.lastOfType(timer.logs, 'interval');
            if (last) last.stopTime = Date.now();
            this.running = [];
        });
    },
    computed: {
        json: function () {
            return JSON.stringify(this.qs, undefined, 2);
        },
        items: function() {
            this.qs;
            this.path;
            return this.qs.filter(function (q) {
                return utils.arrayEquals(q.parent || [], this.path.map(function (p) {
                    return p.id;
                }));
            }.bind(this));
        },
        current: function () {
            var last = null, i = 0, q = null;
            for (; i < this.qs; i++) {
                q = this.qs[i];
                last = utils.lastOfType(q.logs, 'interval');
                if (last && last.stopTime == null) 
                    return q.parent.slice().concat(q.id);
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
        niceTime: time.niceTime
    },
    methods: {
        addTimer: function () {
            var parent = this.path.map(function (p) {
                return p.id;
            });
            this.qs.push({
                name: '',
                editing: true,
                parent: parent,
                type: 'timer'
            });
        },
        kill: function (q) {
            if (arrayEquals(this.running, q.parent.slice().concat(q.id))) this.running = [];
            this.qs = this.qs.filter(function (i) {
                return i.id != q.id;
            });
        },
        changePath: function (index) {
            this.$dispatch('changePath:up',
                           this.path.slice(0, index + 1));
        },
        logOut: function() {
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
                    that.emailAddress = getEmail[app](user);

                    UserData = quanta.child('users/' + user.uid);
                    UserData.once('value', function(snapshot) {
                        if(snapshot.val() !== null) {
                            that.qs = snapshot.val().qs || [];
                            that.path = snapshot.val().path || [];
                            that.running = snapshot.val().running || [];
                        } else {
                            that.qs = [];
                            that.path = [];
                            that.running = [];
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
