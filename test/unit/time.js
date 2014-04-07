var time = require('../../time.js');
var assert = require('assert');

describe('Time', function() {
    describe('niceTime', function() {
        it('should display 0s for zero seconds', function() {
            assert(time.niceTime(0), '0s');
        });

        it('should display 1m, 0s for 60 seconds', function() {
            assert(time.niceTime(60), '1m, 0s');
        });

        it('should display 1m, 30s for 90 seconds', function() {
            assert(time.niceTime(90), '1m, 30s');
        });

        it('should display 1h, 1m, 1s for 3661 seconds', function() {
            assert(time.niceTime(3661), '1h, 1m, 1s');
        });
    });
});
