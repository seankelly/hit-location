var K = (function(my, $) {
    'use strict';

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
        this.year = 2009;
    }


    ParkBIP.prototype.update = function(arg) {
        var updated = false;
        if (!arg)
            return;
        if ("year" in arg) {
            this.year = arg.year;
            this._park.from = undefined;
            updated = true;
        }
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
        if (arg.hit) {
            for (var type in arg.hit) {
                if (type in this.selected_bip) {
                    this.selected_bip[type] = arg.hit[type];
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


    ParkBIP.prototype.add_parks = function(arg) {
        // Add in the 'default' park
        arg['default'] = {};
        for (var id in arg) {
            if (arg[id].years) {
                var order = [];
                for (var year in arg[id].images) {
                    order.push(parseInt(year))
                }
                order.sort();
                arg[id].images.order = order;
            }
            this._park[id] = arg[id];
        }
    }

    ParkBIP.prototype.add_bip = function(id, year, bip) {
        if (this._park[id] instanceof Object) {
            var park = this._park[id];
            if (!park.year) {
                park.year = { };
            }
            if (!park.year[year]) {
                park.year[year] = { };
            }
            for (var prop in bip) {
                park.year[year][prop] = bip[prop];
            }
        }
    }

    ParkBIP.prototype.bip_exists = function(id, year) {
        if (this._park[id] && this._park[id].year && this._park[id].year[year])
            return true;
        return false;
    }

    ParkBIP.prototype.get_players = function(id, type, player) {
        var list = new Array();
        var park = this._park[id];
        var year = this.year;
        if (!park || !park.year || !park.year[year][type])
            return list;

        for (var name in park.year[year][type]) {
            if (player) {
                if (player === name)
                    list.push(name);
            }
            else
                list.push(name);
        }

        list.sort();
        return list;
    }

    ParkBIP.prototype.get_park_factors = function(id, year) {
        if (this._park[id] && this._park[id].images) {
            var order = this._park[id].images.order;
            var image_year = 0;
            for (var i = 0; i < order.length; i++) {
                if (year >= order[i]) {
                    image_year = order[i];
                }
            }
            if (image_year > 0) {
                return {
                    hp_x: this._park[id].images[image_year].hp_x,
                    hp_y: this._park[id].images[image_year].hp_y,
                    scale: this._park[id].images[image_year].scale,
                    file: this._park[id].images[image_year].file
                };
            }
        }
    }


    var draw_bip = function(that) {
        if (that._park.on === undefined ||
            that._park.on === "default" ||
            that._park.from === undefined)
            return;

        var on_id = that._park.on;
        var park_on = that._park[on_id];
        var pitcher = that.filter.pitcher;
        var batter = that.filter.batter;
        var ctx = that.ctx;
        var year = that.year;

        var factors = that.get_park_factors(on_id, year);
        if (!factors)
            return;
        var scale = factors.scale;
        var hp_x = factors.hp_x * that.canvas.width;
        var hp_y = factors.hp_y * that.canvas.height;
        var radius = 2;

        if (that.canvas.height === 250) {
            scale *= 2;
            radius = 1;
        }

        var color = {
            'pop out': '#eb3b22',
            'line out': '#ec5925',
            'fly out': '#ef8528',
            'ground out': '#f3b02f',
            'single': '#68e4fd',
            'double': '#4aa4fb',
            'triple': '#215cfa',
            'home run': '#032bfa',
        };
        var bip_list = that._park[that._park.from].year[year].hit;
        for (var i = 0; i < bip_list.length; i++) {
            var bip = bip_list[i];
            if (!that.selected_bip[bip.event] || (pitcher && (pitcher != bip.pitcher && pitcher != bip['throw'])) || (batter && (batter != bip.batter && batter != bip.stand)))
                continue;

            ctx.fillStyle = color[bip.event];
            ctx.beginPath();
            ctx.arc(bip.x/scale + hp_x, hp_y - bip.y/scale, radius, 1, 2*Math.PI, false);
            ctx.fill();
        }
    }

    var draw_park = function(that) {
        var id = that._park.on;
        if (id === undefined || that._park[id] === undefined)
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

    ParkBIP.prototype.draw = function() {
        if (!this._fetching) {
            draw_park(this);
        }
    }

    my.ParkBIP = ParkBIP;
    return my;
}(K || {}, jQuery));
