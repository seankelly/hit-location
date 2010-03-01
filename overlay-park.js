var bip;

function initialize() {
    $("input").each(function(i, E) {
        //set_bip(E);
    });

    msgbox();
    $("#strerror").ajaxError(function() {
        msgbox("Fetch failed");
    });

    var canvas = document.getElementById('park-map');
    if (!canvas.getContext) {
        msgbox("A browser that supports the canvas element is required. Known browsers to support it include Chrome, Firefox, Opera, and Safari.");
        return;
    }

    bip = new ParkBIP(canvas);
    fetch_parks();
    update_bip();
}

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
    bip.draw();
}

function update_filter(arg) {
    var update = {};
    function m(v) { return (v != "all" ? v : undefined); }
    if (arg.pitcher) {
        update.pitcher = m(arg.pitcher.value);
    }
    if (arg.batter) {
        update.batter = m(arg.batter.value);
    }

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

    f = function(e) {
        var el = $(e) || $(this);
        var type = id_map[el.attr('id')];
        update[type] = el.attr('checked');
    }

    if (arg) {
        f(arg);
    }
    else {
        $("input[id^='bip_']").each(f);
    }

    bip.update({ bip: update });
}

function update_park(arg) {
    var update = {};
    if (arg.from) {
        var id = arg.from.value;
        update.park_from = id;
        if (bip.bip_exists(id))
            populate_filter_list(id);
        else
            fetch_bip(id);
    }
    if (arg.on) {
        update.park_on = arg.on.value;
    }

    bip.update(update);
}

function fetch_parks() {
    $.get("bip/parks.xml", function(xml) {
        var parks = { };
        $(xml).find("park").each(function() {
            var el = $(this);
            var id = el.attr("id");
            var park = {
                id: id,
                hp_x: el.attr("hp_x"),
                hp_y: el.attr("hp_y"),
                name: el.attr("name"),
                scale: el.attr("scale")
            };
            parks[id] = park;
        });

        populate_parks_list(parks);
        bip.add_parks(parks);
    });
}

function fetch_bip(id, update) {
    var url = "bip/park-" + id + ".xml";
    bip.fetching(true);
    $.get(url, function(xml) {
        parse_bip(id, xml);
        populate_filter_list(id);
        bip.fetching(false);
    });
}

function parse_bip(id, xml) {
    var park = $(xml).find("park");
    var json = {
        batters: { },
        pitchers: { }
    };

    json.bip = new Array();
    // Scale things for the 250x250 image.
    var image = bip.get_park_factors(id);
    if (!image) {
        msgbox("Couldn't get image scale factors for park id " + id + ".");
        return;
    }
    image.scale *= 2;
    image.hp_x /= 2;
    image.hp_y /= 2;
    park.children().each(function() {
        var el = $(this);
        var bip = {
            x: (el.attr('x') - image.hp_x) * image.scale,
            y: (image.hp_y - el.attr('y')) * image.scale,
            'event': el.attr('event').toLowerCase(),
            batter: el.attr('batter'),
            pitcher: el.attr('pitcher'),
        };

        if (json.batters[bip.batter])
            json.batters[bip.batter]++;
        else
            json.batters[bip.batter] = 1;

        if (json.pitchers[bip.pitcher])
            json.pitchers[bip.pitcher]++;
        else
            json.pitchers[bip.pitcher] = 1;

        json.bip.push(bip);
    });

    bip.add_bip(id, json);
}

function populate_parks_list(parks) {
    var from = $("#park-from");
    var on = $("#park-on");

    // parks is a mapping of id => stuff
    // I need a mapping of park => id, but sorted
    var sorted_parks = { };
    var list = new Array();
    for (var id in parks) {
        sorted_parks[parks[id].name] = id;
        list.push(parks[id].name);
    }
    list.sort(function(a, b) {
        return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
    });

    var park_insert = '<option selected="selected" disabled="disabled">Select a park</option>';
    for (var i = 0; i < list.length; i++) {
        park_insert += '<option value="' + sorted_parks[list[i]] + '">' + list[i] + '</option>';
    }

    from.empty();
    from.append(park_insert);
    on.empty();
    on.append(park_insert);
}

function populate_filter_list(id) {
    which = function(w, element) {
        var list = bip.get_players(id, w);
        element.empty();
        var insert_text = '<option value="all">All</option>';
        for (var i = 0; i < list.length; i++) {
            insert_text += '<option value="' + list[i] + '">' + list[i] + '</option>';
        }
        element.append(insert_text);
    }

    which('pitchers', $("#pitcher-filter"));
    which('batters', $("#batter-filter"));
}
