function ParkBIP(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._fetching = false;
    this.fetch_queue = [ ];
    this.filter = {
        pitcher: undefined,
        batter: undefined
    };
    this._park = {
        on: 'default',
        from: undefined
    };
    this.selected_bip = {
        'pop out': true, 'fly out': true, 'line out': true, 'ground out': true,
        'single': true, 'double': true, 'triple': true, 'home run': true
    };
}

/**********/

ParkBIP.prototype.update = function(arg) {
    var updated = false;
    if (!arg)
        return;
    if (arg.park_from) {
        this._park.from = arg.park_from;
        this.filter.pitcher = this.filter.batter = undefined;
        updated = true;
    }
    if (arg.park_on) {
        this._park.on = arg.park_on;
        updated = true;
    }
    if ("pitcher" in arg) {
        this.filter.pitcher = arg.pitcher;
        updated = true;
    }
    if ("batter" in arg) {
        this.filter.batter = arg.batter;
        updated = true;
    }
    if (arg.bip) {
        for (var type in arg.bip) {
            if (type in this.selected_bip) {
                this.selected_bip[type] = arg.bip[type];
            }
        }
        updated = true;
    }

    if (updated)
        this.draw();
}

ParkBIP.prototype.fetching = function(are_fetching) {
    if (are_fetching) {
        this._fetching = true;
    }
    else {
        this._fetching = false;
        this.draw();
    }
}

/**********/

ParkBIP.prototype.add_parks = function(arg) {
    // Add in the 'default' park
    arg['default'] = {};
    for (var id in arg) {
        this._park[id] = arg[id];
    }
}

ParkBIP.prototype.add_bip = function(id, bip) {
    if (this._park[id] instanceof Object) {
        for (var prop in bip) {
            this._park[id][prop] = bip[prop];
        }
    }
    else {
        this._park[id] = bip;
    }
}

ParkBIP.prototype.bip_exists = function(id) {
    if (this._park[id] && this._park[id].bip instanceof Object)
        return true;
    return false;
}

ParkBIP.prototype.get_players = function(id, type, player) {
    var list = new Array();
    if (!this._park[id] || !this._park[id][type])
        return list;

    for (var name in this._park[id][type]) {
        if (player) {
            if (player == name)
                list.push(name);
        }
        else
            list.push(name);
    }

    list.sort();
    return list;
}

ParkBIP.prototype.get_park_factors = function(id) {
    if (this._park[id]) {
        return {
            hp_x: this._park[id].hp_x,
            hp_y: this._park[id].hp_y,
            scale: this._park[id].scale
        };
    }
}

/**********/

ParkBIP.prototype.draw = function() {
    if (!this._fetching) {
        var draw_bip = function(that) {
            if (that._park.on == undefined || that._park.on == "default" || that._park.from == undefined)
                return;

            var park_on = that._park[that._park.on];
            var pitcher = that.filter.pitcher;
            var batter = that.filter.batter;
            var ctx = that.ctx;

            var scale = parseFloat(park_on.scale);
            var hp_x = parseFloat(park_on.hp_x);
            var hp_y = parseFloat(park_on.hp_y);
            var radius = 2;

            if (that.canvas.height == 250) {
                scale *= 2;
                hp_x /= 2;
                hp_y /= 2;
                radius = 1;
            }

            var color = {
                'pop out': '#eb3b22',
                'line out': '#ec5925',
                'fly out': '#ef8528',
                'ground out': '#f3b02f',
                'single': '#54bafb',
                'double': '#3f8ffb',
                'triple': '#2962fa',
                'home run': '#173cfa',
            };
            var bip_list = that._park[that._park.from].bip;
            for (var i = 0; i < bip_list.length; i++) {
                var bip = bip_list[i];
                if (!that.selected_bip[bip.event] || (pitcher && pitcher != bip.pitcher) || (batter && batter != bip.batter))
                    continue;

                ctx.fillStyle = color[bip.event];
                ctx.beginPath();
                ctx.arc(bip.x/scale + hp_x, hp_y - bip.y/scale, radius, 1, 2*Math.PI, false);
                ctx.fill();
            }
        }

        var draw_park = function(that) {
            var id = that._park.on;
            if (id == undefined || that._park[id] == undefined)
                return;
            var ctx = that.ctx;
            var width = that.ctx.canvas.width;
            var height = that.ctx.canvas.height;
            var park = that._park[id];
            if (park.image) {
                ctx.drawImage(park.image, 0, 0, width, height);
                draw_bip(that);
            }
            else {
                var img = new Image();
                img.src = "img/" + id + ".png";
                park.image = img;
                var f;
                f = function() {
                    if (img.complete) {
                        ctx.drawImage(img, 0, 0, width, height);
                        draw_bip(that);
                    }
                    else {
                        setTimeout(f, 10);
                    }
                }
                setTimeout(f, 10);
            }
        }

        draw_park(this);
    }
}
