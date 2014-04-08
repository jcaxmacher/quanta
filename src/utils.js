var empty = [];
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
  };
  return self;
})();


/*
 * Create new array if the existing one matches the empty singleton
 *
 */
function resetArray(a) {
    return a === empty ? [] : a;
}

/*
 * Run function on items in a tree
 *
 */
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

/*
 * Walk a tree to find a particular branch
 *
 */
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
            if (pathAction) pathAction(items);
        }
    });
    
    if (resultAttr) return items[resultAttr];
    return items;
}

/*
 * Get the last object from an array with a given `type` attribute
 *
 */
function lastOfType(logs, type) {
    var i = logs.length;
    if (!i) return null;
    while (i--) {
        if (logs[i].type === type) return logs[i];
    }
    return null;
}

/*
 * Test if all elements of two arrays are equal
 *
 */
function arrayEquals(a, b) {
    if (!a || !b
        || a.length === undefined
        || b.length === undefined
        || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/*
 * Test if the first m values of an n-length array, where n >= m,
 * are equal to the first m values of an m-length array.
 *
 * Optional hard argument enforces n > m
 */
function beginsWith(child, parent, hard) {
    if (!child || !parent
        || child.length === undefined
        || parent.length === undefined)
        return false;

    if (child.length <= parent.length && hard)
        return false;

    if (child.length < parent.length)
        return false;

    for (var i = 0; i < parent.length; i++) {
        if (child[i] !== parent[i]) return false;
    }
    return true;
}

/*
 * Test if a function is true for any item in a list
 *
 */
function any(list, fn) {
    for (var i = 0; i < list.length; i++) {
        if (fn(list[i])) return true;
    }
    return false;
}

module.exports = {
    UUID: UUID,
    empty: empty,
    resetArray: resetArray,
    cascadeAction: cascadeAction,
    walkPath: walkPath,
    lastOfType: lastOfType,
    arrayEquals: arrayEquals,
    beginsWith: beginsWith,
    any: any
};
