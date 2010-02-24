function ParkBIP() {
    this.park_bip = undefined;
    this.park_from = undefined;
    this.park_on = 'default';
    this.selected_bip = {
        'fly out': false, 'line out': false, 'ground out': false,
        'single': false, 'double': false,
        'triple': false, 'home run': false
    };
}

ParkBIP.prototype.update_park = function(which, value) {
    if (which == 'on') {
        this.park_on = value;
        this.redraw();
    }
    else if (which == 'from') {
        this.park_from = value;
        this.get_bip();
        this.draw_bip();
    }
}

ParkBIP.prototype.set_bip = function(which, state) {
    this.selected_bip[which] = state;
}

ParkBIP.prototype.update_bip = function(which, state) {
    this.set_bip(which, state);
    if (state == false)
        this.redraw();
    else
        this.draw_bip(which);
}

ParkBIP.prototype.get_bip = function() {
}

ParkBIP.prototype.draw_park = function() {
    if (this.park_on == undefined)
        return;
    var canvas = document.getElementById('park-map');
    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    var img = new Image();
    img.onload = function () {
        ctx.drawImage(img, 0, 0, width, height);
    }
    img.src = 'img/' + this.park_on + '.png';
}

ParkBIP.prototype.draw_bip = function(bip) {
    if (this.park_from == undefined)
        return;
}

ParkBIP.prototype.redraw = function() {
    this.draw_park();

    if (this.park_bip != undefined)
        this.draw_bip();
}


var bip = new ParkBIP();

function initialize() {
    $("input").each(function(i, E) {
        set_bip(E);
    });

    bip.redraw();
}

function toggle_canvas() {
    var canvas = document.getElementById('park-map');
    var toggle = $("#canvas-wrapper a");
    if (canvas == undefined || toggle == undefined)
        return;
    if (canvas.height == 250) {
        canvas.height = 500;
        canvas.width = 500;
        toggle.text("Shrink park map");
    }
    else {
        canvas.height = 250;
        canvas.width = 250;
        toggle.text("Expand park map");
    }

    bip.redraw();
}

function update_parks(option, which) {
    bip.update_park(which, option.value);
}


for (i in [0, 1]) {
    func = ['set', 'update'][i] + "_bip";
    eval("function " + func + "(check){ id_map = { 'bip_fo': 'fly out', 'bip_lo': 'line out', 'bip_go': 'ground out', 'bip_1b': 'single', 'bip_2b': 'double', 'bip_3b': 'triple', 'bip_hr': 'home run', }; bip." + func + "(id_map[check.id], check.checked); }");
}
