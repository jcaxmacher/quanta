var utils = require('../../utils.js');
var assert = require('assert');

describe('Utils', function() {
    describe('UUID', function() {
        var newUUID = '';

        beforeEach(function() {
            newUUID = utils.UUID.generate();
        });

        it('should generate a new UUID', function() {
            assert(newUUID.length === 36);
        });
        it('should be hexadecimal with hyphens', function() {
            assert(/^[0-9a-f\-]+$/g.test(newUUID));
        });
    });

    describe('any', function() {
        it('should be true when an item in the list causes the function to be true', function() {
            assert(utils.any([1, 2, 3], function(i) { return i === 2; }));
        });

        it('should be false when no items in the list cause the function to be true', function() {
            assert(!utils.any([1, 2, 3], function(i) { return i === 4; }));
        });
    });

    describe('beginsWith', function() {
        it('should be true when parent and child match', function() {
            var childArray1 = [3, 6, 3, 234, 12, 'asdf', 12];
            var parentArray1 = [3, 6, 3, 234, 12, 'asdf'];
            assert(utils.beginsWith(childArray1, parentArray1));
        });

        it('should be true when parent and child match and parent is short', function() {
            var childArray1 = [3, 6, 3, 234, 12, 'asdf', 12];
            assert(utils.beginsWith(childArray1, [3]));
        });

        it('should be true when parent and child are the same length', function() {
            var childArray2 = [3, 6, 3, 234, 12, 'asdf', 12];
            var parentArray2 = [3, 6, 3, 234, 12, 'asdf', 12];
            assert(utils.beginsWith(childArray2, parentArray2));
        });

        it('should be false when parent and child are the same length and comparison is hard', function() {
            var childArray2 = [3, 6, 3, 234, 12, 'asdf', 12];
            var parentArray2 = [3, 6, 3, 234, 12, 'asdf', 12];
            assert(!utils.beginsWith(childArray2, parentArray2, true));
        });

        it('should be false when parent and child do not match', function() {
            var childArray3 = [3, 6, 3, 34, 12, 'asdf', 12];
            var parentArray3 = [4, 7];
            assert(!utils.beginsWith(childArray3, parentArray3));
        });
    });

    describe('arrayEquals', function() {
        it('should be true if array values are equal', function() {
            var testArray1 = [3, 6, 3, 234, 12, 'asdf', 12];
            var testArray2 = [3, 6, 3, 234, 12, 'asdf', 12];
            assert(utils.arrayEquals(testArray1, testArray2));
        });

        it('should be false if the arrays are different', function() {
            var testArray2 = [3, 6, 3, 234, 12, 'asdf', 12];
            var testArray3 = [3, 6, 3, 34, 12, 'asdf', 12];
            assert(!utils.arrayEquals(testArray2, testArray3));
        });

        it('should be false if the arrays have different lengths', function() {
            var testArray3 = [3, 6, 3, 34, 12, 'asdf', 12];
            var testArray4 = [3, 6];
            assert(!utils.arrayEquals(testArray3, testArray4));
        });

        it('should be false if one of the arrays is empty', function() {
            var testArray4 = [3, 6];
            var testArray5 = [];
            assert(!utils.arrayEquals(testArray4, testArray5));
        });

        it('should be false if one of the arrays is null', function() {
            var testArray4 = [3, 6];
            var testArray6 = null;
            assert(!utils.arrayEquals(testArray4, testArray6));
        });
    });

    describe('lastOfType', function() {
        var objects = [{
            type: 'zero',
            value: 4
        }, {
            type: 'one',
            value: 5
        }, {
            type: 'two',
            value: 6
        }, {
            type: 'one',
            value: 7
        }, {
            type: 'two',
            value: 8
        }, {
            type: 'three',
            value: 9
        }];

        it('should find the last if it\'s the first object in the array', function() {
            assert(utils.lastOfType(objects, 'zero').value === 4);
        });

        it('should find the last if it\'s the last', function() {
            assert(utils.lastOfType(objects, 'three').value === 9);
        });

        it('should find the last if it\'s in the middle', function() {
            assert(utils.lastOfType(objects, 'one').value === 7);
        });

        it('should return null if the type is not found', function() {
            assert(utils.lastOfType(objects, 'five') === null);
        });
    });
});
