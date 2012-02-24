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


    test("map with 12 address markers (geocoding overflow)", function() {
        map = createNewMap();
        map.gMap({
            markers: [
                {address: 'Kraków, Chałubińskiego 11'},
                {address: 'Kraków, Chałubińskiego 72'},
                {address: 'Kraków, Chałubińskiego 43'},
                {address: 'Kraków, Chałubińskiego 14'},
                {address: 'Kraków, Chałubińskiego 65'},
                {address: 'Kraków, Chałubińskiego 36'},
                {address: 'Kraków, Chałubińskiego 17'},
                {address: 'Kraków, Chałubińskiego 98'},
                {address: 'Kraków, Chałubińskiego 99'},
                {address: 'Kraków, Chałubińskiego 110'},
                {address: 'Kraków, Chałubińskiego 111'},
                {address: 'Kraków, Chałubińskiego 112'}
            ],
            zoom: 12,
            onComplete: function() {
                start();
                data = map.data('gmap');
                equal(data.markers.length, 12, '12 markers in data.markers');
                ok(data.markers[11].getPosition().lat() && data.markers[11].getPosition().lng(), 'marker 11 position correct');
            }
        });
        stop();
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

    module("Auto center/zoom");

    test("correct zoom for geocoding", function() {
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

                equal(data.gmap.getZoom(), 12, 'zoom correct');

                start();
            }
        });
    });
	
    test("all fit", function() {
        map = createNewMap();
        stop();
        map.gMap({
            markers: [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ],
            zoom: "fit",
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                start();
                var center = map.data('gmap').gmap.getCenter();
                ok(Math.abs(center.lat() - (50.083 + 50.502343)/2) < 0.001, 'center latitude correct');
                ok(Math.abs(center.lng() - (19.917 + 19.75435)/2) < 0.001, 'center longitude correct');
            }
        });
    });

    test("markers in viewport", function() {
        map = createNewMap();
        var markers = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ];
        stop();
        map.gMap({
            markers: markers,
            zoom: "fit",
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                window.setTimeout(function() {
                    var viewport = map.data('gmap').gmap.getBounds(),
                        ne = viewport.getNorthEast(),
                        sw = viewport.getSouthWest();
                    for(var i = 0;i<markers.length;i++){
                        ok(markers[i].latitude < ne.lat() &&
                            markers[i].latitude > sw.lat() &&
                            markers[i].longitude < ne.lng() &&
                            markers[i].longitude > sw.lng(), 'marker ' + i + ' in viewport');
                    }
                    start();
                },1000);
            }
        });
    });

    test("address markers in viewport", function() {
        map = createNewMap();
        var markers = [
                    {
                        address: "Kraków, ul. Kazimierza Wielkiego"
                    },
                    {
                        address: "Kraków, ul. Borkowska"
                    },
                    {
                        address: "Kraków, os. Kolorowe"
                    }
                ];
        stop();
        map.gMap({
            markers: markers,
//            log: true,
            zoom: "fit",
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                window.setTimeout(function() {
                    var viewport = map.data('gmap').gmap.getBounds(),
                        ne = viewport.getNorthEast(),
                        sw = viewport.getSouthWest();

                    var realMarkers = map.data('gmap').markers;
                    for(var i = 0;i<realMarkers.length;i++){

                        ok(realMarkers[i].getPosition().lat() < ne.lat() &&
                            realMarkers[i].getPosition().lat() > sw.lat() &&
                            realMarkers[i].getPosition().lng() < ne.lng() &&
                            realMarkers[i].getPosition().lng() > sw.lng(), 'marker ' + i + ' in viewport');
                    }
                    start();
                },1000);
            }
        });
    });

    test("fit after load", function() {
        map = createNewMap();
        stop();
        map.gMap({
            markers: [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ],
            zoom: 10,
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                start();
                map.gMap('setZoom',"fit");
                var center = map.data('gmap').gmap.getCenter();
                ok(Math.abs(center.lat() - (50.083 + 50.502343)/2) < 0.001, 'center latitude correct');
                ok(Math.abs(center.lng() - (19.917 + 19.75435)/2) < 0.001, 'center longitude correct');
            }
        });
    });


    test("markers not in viewport, fix after load", function() {
        map = createNewMap();
        var markers = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ];
        stop();
        map.gMap({
            markers: markers,
            zoom: 13,
            log: true,
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                window.setTimeout(function() {
                    var viewport = map.data('gmap').gmap.getBounds(),
                        ne = viewport.getNorthEast(),
                        sw = viewport.getSouthWest(), i;
                    for(i = 0;i<markers.length;i++){
                        ok(!(markers[i].latitude < ne.lat() &&
                            markers[i].latitude > sw.lat() &&
                            markers[i].longitude < ne.lng() &&
                            markers[i].longitude > sw.lng()), 'marker ' + i + ' not in viewport');
                    }
                    map.gMap('setZoom',"fit");
                    window.setTimeout(function() {
                        var viewport = map.data('gmap').gmap.getBounds(),
                        ne = viewport.getNorthEast(),
                        sw = viewport.getSouthWest();
                        for(i = 0;i<markers.length;i++){
                            ok(markers[i].latitude < ne.lat() &&
                                markers[i].latitude > sw.lat() &&
                                markers[i].longitude < ne.lng() &&
                                markers[i].longitude > sw.lng(), 'marker ' + i + ' in viewport');
                        }
                        start();
                    },1000);
                },1000);
            }
        });
    });

    module("new in 3.3.0");

    test("addMarkers", function() {
        map = createNewMap();
        var markers = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    }
                ];
        var markers2 = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ];
        var m;
        stop();
        map.gMap({
            markers: markers,
            zoom: 8,
            onComplete: function() {
                m = map.data('gmap').markers;
                equal(m.length, 1, 'correct number of markers');
                map.gMap('removeAllMarkers');
                window.setTimeout(function() {
                    m = map.data('gmap').markers;
                    equal(m.length, 0, 'correct number of markers');
                    map.gMap('addMarkers', markers2);
                    window.setTimeout(function() {
                        m = map.data('gmap').markers;
                        equal(m.length, 3, 'correct number of markers');
                        start();
                    },1000);
                },1000);
            }
        });
    });

    test("changeSettings - move center", function() {
        map = createNewMap();
        stop();
        map.gMap({
            zoom: 8,
            latitude: 50.083,
            longitude: 19.917,
            onComplete: function() {
                  map.gMap('changeSettings', {
                      latitude: 50.20917,
                      longitude: 19.75435
                  });
                window.setTimeout(function() {
                    var center = map.data('gmap').gmap.getCenter();
                    ok(Math.abs(center.lat() - 50.20917) < 0.001, 'center latitude correct');
                    ok(Math.abs(center.lng() - 19.75435) < 0.001, 'center longitude correct');
                    start();
                }, 1000);
            }
        });
    });

    test("changeSettings - change zoom", function() {
        map = createNewMap();
        stop();
        map.gMap({
            zoom: 8,
            latitude: 50.083,
            longitude: 19.917,
            onComplete: function() {
                  map.gMap('changeSettings', {
                      zoom: 12
                  });
                window.setTimeout(function() {
                    var zoom = map.data('gmap').gmap.getZoom();
                    equal(zoom, 12);
                    start();
                },1000);
            }
        });
    });

    test("changeSettings - fit new center", function() {
        map = createNewMap();
        var markers = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    }
                ];
        var markers2 = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ];
        stop();
        map.gMap({
            markers: markers,
            zoom: 9,
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                map.gMap('removeAllMarkers');
                window.setTimeout(function() {
                    map.gMap('addMarkers', markers2);
                    window.setTimeout(function() {
                        map.gMap('changeSettings', {
                          latitude: 'fit',
                          longitude: 'fit'
                        });
                        window.setTimeout(function() {
                            var center = map.data('gmap').gmap.getCenter();
                            ok(Math.abs(center.lat() - (50.083 + 50.502343)/2) < 0.001, 'center latitude correct');
                            ok(Math.abs(center.lng() - (19.917 + 19.75435)/2) < 0.001, 'center longitude correct');
                            start();
                        },1000);
                    },1000);
                },1000);
            }
        });
    });

    test("changeSettings - fit new zoom", function() {
        map = createNewMap();
        var markers = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    }
                ];
        var markers2 = [
                    {
                        latitude: 50.083,
                        longitude: 19.917
                    },
                    {
                        latitude: 50.20917,
                        longitude: 19.75435
                    },
                    {
                        latitude: 50.502343,
                        longitude: 19.91243
                    }
                ];
        stop();
        map.gMap({
            markers: markers,
            zoom: 10,
            latitude: "fit",
            longitude: "fit",
            onComplete: function() {
                map.gMap('removeAllMarkers');
                window.setTimeout(function() {
                    map.gMap('addMarkers', markers2);
                    window.setTimeout(function() {
                        map.gMap('changeSettings', {
                          zoom: 'fit'
                        });
                        window.setTimeout(function() {
                            var zoom = map.data('gmap').gmap.getZoom();
                            equal(zoom, 9, 'zoom correct');
                            start();
                        },1000);
                    },1000);
                },1000);
            }
        });
    });

}());