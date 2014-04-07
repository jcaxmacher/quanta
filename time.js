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

module.exports = {
    niceTime: niceTime
};
