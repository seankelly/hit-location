(function ($) {
    'use strict';
    var bip;

    function get_year() { return $("#years").val(); }

    function msgbox(msg) {
        var box = $("#strerror");
        if (msg) {
            box.text(msg).show();
        }
        else {
            box.hide();
        }
    }

    function toggle_canvas() {
        var canvas = bip.canvas;
        var toggle = $("#toggle_canvas");
        if (canvas === undefined || toggle === undefined)
            return;
        if (canvas.height === 250) {
            canvas.height = 500;
            canvas.width = 500;
            toggle.text("Shrink park map");
        }
        else {
            canvas.height = 250;
            canvas.width = 250;
            toggle.text("Expand park map");
        }
        bip.draw();
    }

    function export_canvas() {
        var png = bip.canvas.toDataURL('image/png');
        // Add 5% to the window size to attempt to compensate for the window
        // borders. Just hoping to prevent scrolling or scaling of image.
        // The 500x500 had no scaling for me, but 250x250 did. Close enough.
        var width = parseInt(bip.canvas.width*1.05);
        var height = parseInt(bip.canvas.height*1.05);
        window.open(png, 'png_canvas', 'width=' + width + ',height=' + height);
    }

    function fetch_bip(id, update) {
        var year = get_year();
        var url = "bip/park-" + id + "-" + year + ".json";
        bip.fetching(true);
        $.getJSON(url, function(json) {
            msgbox();
            parse_bip(id, year, json);
            populate_filter_list(id);
            bip.fetching(false);
        });
    }

    function parse_bip(id, year, bip_json) {
        // Here I thought there would be one or two events that need mapping.
        // Turns out there is going to be a ton. WTF MLBAM?
        var event_map = {
            'force out': 'ground out', 'forceout': 'ground out',
            'grounded into dp': 'ground out', 'groundout': 'ground out',
            'fielders choice out': 'ground out',
            'sac fly': 'fly out', 'flyout': 'fly out',
            'lineout': 'line out'
        };
        var park = {
            batters: { },
            pitchers: { }
        };

        park.hit = [ ];

        var image = bip.get_park_factors(id, year);
        if (!image) {
            msgbox("Couldn't get image scale factors for park id " + id + ".");
            return;
        }
        // The scale I derive is from a 500x500 image. The BIP marked by the
        // Gameday stringers is based on a 250x250 image, so re-scale the BIP
        // based on that.
        image.scale *= 2;
        image.hp_x *= 250;
        image.hp_y *= 250;

        for (var i = 0; i < bip_json.length; i++) {
            var hit = bip_json[i];
            hit.x = (hit.x - image.hp_x) * image.scale;
            hit.y = (image.hp_y - hit.y) * image.scale;
            hit.event = hit.event.toLowerCase();

            if (event_map[hit.event])
                hit.event = event_map[hit.event];

            if (park.batters[hit.batter])
                park.batters[hit.batter]++;
            else
                park.batters[hit.batter] = 1;

            if (park.pitchers[hit.pitcher])
                park.pitchers[hit.pitcher]++;
            else
                park.pitchers[hit.pitcher] = 1;

            park.hit.push(hit);
        }

        bip.add_bip(id, year, park);
    }

    function update_year() {
        var update = {};
        update.year = get_year();
        populate_parks_from();

        bip.update(update);
    }

    function update_bip(arg) {
        var update = {};
        var id_map = {
            'bip_po': 'pop out', 'bip_fo': 'fly out',
            'bip_lo': 'line out', 'bip_go': 'ground out',
            'bip_1b': 'single', 'bip_2b': 'double',
            'bip_3b': 'triple', 'bip_hr': 'home run'
        };

        var f = function(e) {
            var id, checked;
            if (e instanceof Object) {
                id = e.target.id;
                checked = e.target.checked;
            }
            else {
                var el = $(this);
                id = el.attr('id');
                checked = el.attr('checked');
            }
            var type = id_map[id];
            update[type] = checked;
        }

        if (arg) {
            f(arg);
        }
        else {
            $("input[id^='bip_']").each(f);
        }

        bip.update({ hit: update });
    }

    function initialize() {
        msgbox();
        $("#strerror").ajaxError(function() {
            msgbox("Park fetch failed");
        });

        var canvas = document.getElementById('park-map');
        if (!canvas.getContext) {
            msgbox("A browser that supports the canvas element is required. Known browsers to support it include Chrome, Firefox, Opera, and Safari.");
            return;
        }

        bip = new K.ParkBIP(canvas);
        fetch_parks();
        update_bip();
    }

    function fetch_parks() {
        bip.fetching(true);
        $.getJSON("bip/parks.json", function(park_data) {
            bip.add_parks(park_data);
            populate_years_list(park_data);
            bip.fetching(false);
        });
    }

    function populate_years_list(parks) {
        var years = {};
        var year_list = [];

        for (var id in parks) {
            for (var year in parks[id].years) {
                if (!(year in years)) {
                    years[year] = true;
                    year_list.push(year);
                }
            }
        }

        year_list.sort();
        year_list.reverse();
        var options = '';
        for (var i = 0; i < year_list.length; i++) {
            var selected = (i === 0 ? 'selected="selected" ' : '');
            options += '<option ' + selected + 'value="' + year_list[i] + '">' + year_list[i] + '</option>';
        }

        var year_select = $("#years");
        year_select.empty();
        year_select.append(options);
        update_year();

        populate_parks_list();
    }

    // parks is a mapping of id => stuff
    // I need a mapping of park => id, but sorted
    function _sorted_parks() {
        var sorted = { };
        var list = [ ];
        var parks = bip._park;
        for (var id in parks) {
            if (isNaN(parseInt(id))) continue;
            sorted[parks[id].name] = id;
            list.push(parks[id].name);
        }
        list.sort(function(a, b) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        });

        list.push(sorted);
        return list;
    }

    function populate_parks_from() {
        var from = $("#park-from");
        var year = get_year();
        var parks = bip._park;

        var list = _sorted_parks();
        var sorted_list = list.pop();
        var insert =  '<option selected="selected" disabled="disabled">Select a park</option>';
        for (var i = 0; i < list.length; i++) {
            var park = parks[sorted_list[list[i]]];
            if (park.bip > 0 && park.years[year])
                insert += '<option value="' + sorted_list[list[i]] + '">' + list[i] + '</option>';
        }

        from.empty();
        from.append(insert);
    }

    function populate_parks_on() {
        var on = $("#park-on");

        var list = _sorted_parks();
        var sorted_list = list.pop();
        var insert =  '<option selected="selected" disabled="disabled">Select a park</option>';
        for (var i = 0; i < list.length; i++) {
            insert += '<option value="' + sorted_list[list[i]] + '">' + list[i] + '</option>';
        }

        on.empty();
        on.append(insert);
    }

    function populate_parks_list() {
        populate_parks_from();
        populate_parks_on();
    }

    function update_park(ev) {
        var update = {};
        var id = ev.target.id;
        var park = ev.target.value;
        if (id === 'park-from') {
            var year = get_year();
            update.park_from = park;
            if (bip.bip_exists(park, year)) {
                populate_filter_list(park);
            }
            else {
                fetch_bip(park);
            }
        }
        else if (id === 'park-on') {
            update.park_on = park;
        }

        bip.update(update);
    }

    function update_filter(ev) {
        var update = {};
        function m(v) { return (v != "all" ? v : undefined); }
        var id = ev.target.id;
        if (id === 'pitcher-filter') {
            update.pitcher = m(ev.target.value);
        }
        else if (id === 'batter-filter') {
            update.batter = m(ev.target.value);
        }

        bip.update(update);
    }

    function populate_filter_list(id) {
        var which = function(w, element) {
            var suffix_map = { 'pitchers': 'P', 'batters': 'H' };
            var suffix = suffix_map[w];
            var list = bip.get_players(id, w);
            element.empty();
            var insert_text = '<option value="all">All</option><option value="L">LH' + suffix + '</option><option value="R">RH' + suffix + '</option>';
            for (var i = 0; i < list.length; i++) {
                insert_text += '<option value="' + list[i] + '">' + list[i] + '</option>';
            }
            element.append(insert_text);
        }

        which('pitchers', $("#pitcher-filter"));
        which('batters', $("#batter-filter"));
    }

    var id_func_map = [
        [ 'click',  '#toggle_canvas',  toggle_canvas, ],
        [ 'click',  '#export_canvas',  export_canvas, ],
        [ 'change', '#years',          update_year ],
        [ 'change', '#bip_po',         update_bip ],
        [ 'change', '#bip_lo',         update_bip ],
        [ 'change', '#bip_fo',         update_bip ],
        [ 'change', '#bip_go',         update_bip ],
        [ 'change', '#bip_1b',         update_bip ],
        [ 'change', '#bip_2b',         update_bip ],
        [ 'change', '#bip_3b',         update_bip ],
        [ 'change', '#bip_hr',         update_bip ],
        [ 'change', '#park-from',      update_park, ],
        [ 'change', '#park-on',        update_park, ],
        [ 'change', '#pitcher-filter', update_filter, ],
        [ 'change', '#batter-filter',  update_filter, ],
    ];

    for (var i = 0; i < id_func_map.length; i++) {
        var ev = id_func_map[i][0];
        var id = id_func_map[i][1];
        var fn = id_func_map[i][2];
        $(id).on(ev, fn);
    }

    $(initialize);

}(jQuery));
