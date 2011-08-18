(function(){
    var map, data, parent = $('#map');

    function createNewMap() {
        parent.html('');
        var m = $('<div style="width: 800px;height: 400px;"></div>');
        parent.append(m);
        return m;
    }

    module("Basic Map Test");

    test("jQuery initialisation", function() {
        ok($, 'jQuery present');
        map = createNewMap();
        ok(map, 'map element present');
    });

    test("map initialisation", function() {
        map = createNewMap();
        equal(map.html(), '', 'map element empty before');
        map.gMap({});
        notEqual(map.html(), '', 'map element not empty after');
    });

    test('google object', function() {
        ok(google, 'google object present');
        ok(google.maps, 'google.maps object present');
        ok(google.maps.Map, 'google.maps.Map object present');
    });

    test('correct data() values', function() {
        map = createNewMap();
        map.gMap({});

        data = map.data('gmap');
        var compatibilityData = map.data('$gmap');
        ok(compatibilityData instanceof google.maps.Map, 'fallback $gmap present');

        ok(data, 'data object present');
        ok(data.gmap instanceof google.maps.Map, 'data.gmap is google.maps.Map');
        ok(data.markers instanceof Array, 'data.markers is an array');
        equal(data.markers.length, 0, 'data.markers is empty');
        ok($.isPlainObject(data.markerKeys), 'data.markerKeys is an object');
        ok($.isEmptyObject(data.markerKeys), 'data.markerKeys is empty');
        equal(data.infoWindow, null, 'data.infoWindow is present and null');
    });

    test('default values', function() {
        map = createNewMap();
        
        map.gMap({});
        data = map.data('gmap');

        var center = data.gmap.getCenter();
        var mapType = data.gmap.getMapTypeId();
        var zoom = data.gmap.getZoom();

        ok(center.lat() === 0 && center.lng() === 0, 'default center is (0,0)');
        equal(mapType, google.maps.MapTypeId.ROADMAP, 'default mapttype is roadmap');
        equal(zoom, 3, 'default zoom is 3');
    });

    module("Marker Test");

    test("map with lat/lng markers", function() {
        map = createNewMap();
        map.gMap({
            markers: [
                {
                    latitude: 50.083,
                    longitude: 19.917,
                    html: '<div class="test_marker">marker 1</div>'
                }, {
                    latitude: 50.09,
                    longitude: 19.92,
                    html: 'marker 2'
                }
            ],
            zoom: 12
        });
        data = map.data('gmap');

        equal(data.markers.length, 2, 'two markers in data.markers');

        var count = 0;
        if(data.markers[0].getMap() === data.gmap) count++;
        if(data.markers[1].getMap() === data.gmap) count++;
        equal(count, 2, 'two markers on map');

        ok(data.markers[0].getPosition().lat() && data.markers[0].getPosition().lng(), 'marker position correct');
    });


    test("removeAllMarkers", function() {
        map = createNewMap();
        map.gMap({
            markers: [
                {
                    latitude: 50.083,
                    longitude: 19.917,
                    html: '<div class="test_marker">marker 1</div>'
                }, {
                    latitude: 50.09,
                    longitude: 19.92,
                    html: 'marker 2'
                }
            ],
            zoom: 12,
            onComplete: function() {
                data = map.data('gmap');

                map.gMap('removeAllMarkers');

                equal(data.markers.length, 0, '0 length data.markers');
                var i = 0;
                for(var o in data.markers) {
                    i++;
                }
                equal(i, 0, '[] in data.markers');
            }
        });
    });

    test("map with address markers", function() {
        map = createNewMap();
        stop();
        map.gMap({
            markers: [
                {
                    address: "Kraków, ul. Grodzka",
                    html: 'marker 1'
                }, {
                    address: "Kraków, ul. Basztowa",
                    html: 'marker 2'
                }
            ],
            zoom: 12,
            onComplete: function() {
                data = map.data('gmap');
                equal(data.markers.length, 2, 'two markers in data.markers');

                var count = 0;
                if(data.markers[0].getMap() === data.gmap) count++;
                if(data.markers[1].getMap() === data.gmap) count++;
                equal(count, 2, 'two markers on map');

                ok(data.markers[0].getPosition().lat() && data.markers[0].getPosition().lng(), 'marker position correct');

                start();
            }
        });
    });

    module("Infowindow Test");

    test("infowindow", function() {
        map = createNewMap();
        stop();
        map.gMap({
            markers: [
                {
                    latitude: 50.083,
                    longitude: 19.917,
                    html: '<div class="test_marker">marker 1</div>'
                }, {
                    latitude: 50.09,
                    longitude: 19.92,
                    html: 'marker 2'
                }
            ],
            zoom: 12,
            onComplete: function() {
                data = map.data('gmap');

                equal(data.infoWindow, null, 'infowindow empty');
                equal($('.gmap_marker').size(), 0, 'no .gmap_marker');
                equal($('.test_marker').size(), 0, 'no .test_marker');
                google.maps.event.trigger(data.markers[0], 'click');

                window.setTimeout(function() {
                    ok(data.infoWindow, 'infowindow set');
                    equal($('.gmap_marker').size(), 1, '.gmap_marker present');
                    equal($('.test_marker').size(), 1, '.test_marker present');
                    start();
                }, 1000);
            }
        });

    });

    test("infowindow popup", function() {
        map = createNewMap();
        map.gMap({
            markers: [
                {
                    latitude: 50.083,
                    longitude: 19.917,
                    html: '<div class="test_marker">marker 1</div>',
                    popup: true
                }, {
                    latitude: 50.09,
                    longitude: 19.92,
                    html: '<div class="test_marker">marker 2</div>'
                }
            ],
            zoom: 12
        });
        data = map.data('gmap');

        stop();
        window.setTimeout(function() {
            var popup = data.infoWindow;
            data.infoWindow.__test = 1;
            ok(data.infoWindow, 'popup infowindow set');
            equal($('.gmap_marker').size(), 1, 'one .gmap_marker after init');
            equal($('.test_marker').size(), 1, 'one .test_marker aftr init');
            google.maps.event.trigger(data.markers[1], 'click');
            window.setTimeout(function() {
                ok(data.infoWindow, 'infowindow set');
                notEqual(data.infoWindow.__test, 1, 'infowindow is not number 1');
                data.infoWindow.__test = 2;
                equal($('.gmap_marker').size(), 1, 'only one .gmap_marker after click');
                equal($('.test_marker').size(), 1, 'only one .test_marker after click');
                google.maps.event.trigger(data.markers[0], 'click');
                window.setTimeout(function() {
                    ok(data.infoWindow, 'infowindow set');
                    equal(data.infoWindow.__test, 1, 'infowindow is number 1');
                    equal($('.gmap_marker').size(), 1, 'only one .gmap_marker after click');
                    equal($('.test_marker').size(), 1, 'only one .test_marker after click');
                    start();
                }, 1000);
            }, 1000);
        }, 1000);
    });
}());