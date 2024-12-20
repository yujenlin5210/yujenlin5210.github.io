/**
 *    Wave oscillators by Ken Fyrstenberg Nilsen
 *    http://abdiassoftware.com/
 *
 *    CC-Attribute 3.0 License
*/
// var c = $("#canvas");
var ctx = canvas.getContext('2d');
var w;
var h;
var osc1 = new osc();
var osc2 = new osc();
var osc3 = new osc();
var horizon = 0;
var count = 100;
var step = 1;
var buffer;
var points;



function fill() {
    for (var i = 0; i < count; i++) {
        points[i] = mixer(osc1, osc2, osc3);
    }
}


function loop() {


    var i;

    /// move points to the left
    for (i = 0; i < count - 1; i++) {
        points[i] = points[i + 1];
    }

    /// get a new point
    points[count - 1] = mixer(osc1, osc2, osc3);

    //ctx.clearRect(0, 0, w, h);
    ctx.fillRect(0, 0, w, h);

    /// render wave
    ctx.beginPath();
    ctx.moveTo(0, points[0]);

    for (i = 1; i < count; i++) {
        ctx.lineTo(i * step, points[i]);
    }

    ctx.stroke();

    requestAnimationFrame(loop);
}


/// oscillator object
function osc() {

    this.variation = 0.001;
    this.max = 150;
    this.speed = 0.01;

    var me = this,
        a = 0,
        max = getMax();

    this.getAmp = function () {

        a += this.speed;

        if (a >= 2.0) {
            a = 0;
            max = getMax();
        }

        return max * Math.sin(a * Math.PI);
    }

    function getMax() {
        return Math.random() * me.max * me.variation +
            me.max * (1 - me.variation);
    }

    return this;
}

function mixer() {

    var d = arguments.length,
        i = d,
        sum = 0;

    if (d < 1) return 0;

    while (i--) sum += arguments[i].getAmp();

    return sum / d + horizon;
}

function init() {
    canvas.width = w = $("#canvas-container").innerWidth();
    canvas.height = h = $("#canvas-container").innerHeight();


    horizon = h * 0.5;
    count = 80;
    step = Math.ceil(w / count),
    //points = new Array(count);
    buffer = new ArrayBuffer(count * 4);
    points = new Float32Array(buffer);

    osc1.max = h * 0.5;
    osc1.speed = 0.02;

    osc2.max = h * 1.2;
    osc2.speed = 0.005;

    osc3.max = 10;
    osc3.speed = 0.08;

    fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(66, 235, 244)';
    ctx.fillStyle = 'rgba(0, 0, 31, 0.05)';
}

$(document).ready(function () {
    init();
    loop();
});

$(window).resize(function () {
    init();
});