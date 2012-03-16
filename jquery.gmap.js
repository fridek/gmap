/**
 * jQuery gMap v3
 *
 * @url         http://www.smashinglabs.pl/gmap
 * @author      Sebastian Poreba <sebastian.poreba@gmail.com>
 * @version     3.3.2
 * @date        16.03.2011
 */
/*jslint white: false, undef: true, regexp: true, plusplus: true, bitwise: true, newcap: true, strict: true, devel: true, maxerr: 50, indent: 4 */
/*global window, jQuery, $, google, $googlemaps */
(function ($) {
    "use strict";

    /**
     * Internals and experimental section
     */
    var Cluster = function () {
        this.markers = [];
        this.mainMarker = false;
        this.icon = "http://www.google.com/mapfiles/marker.png";
    };

    /**
     * For iterating over all clusters to find if any is close enough to be merged with marker
     *
     * @param marker
     * @param currentSize - calculated as viewport percentage (opts.clusterSize)
     * @return bool
     */
    Cluster.prototype.dist = function (marker) {
        return Math.sqrt(Math.pow(this.markers[0].latitude - marker.latitude, 2) +
            Math.pow(this.markers[0].longitude - marker.longitude, 2));
    };

    Cluster.prototype.setIcon = function (icon) {
        this.icon = icon;
    };

    Cluster.prototype.addMarker = function (marker) {
        this.markers[this.markers.length] = marker;
    };

    /**
     * returns one marker if there is only one or
     * returns special cloister marker if there are more
     */
    Cluster.prototype.getMarker = function () {
        if (this.mainmarker) {return this.mainmarker; }
        var gicon, title;
        if (this.markers.length > 1) {
            gicon = new $googlemaps.MarkerImage("http://thydzik.com/thydzikGoogleMap/markerlink.php?text=" + this.markers.length + "&color=EF9D3F");
            title = "cluster of " + this.markers.length + " markers";
        } else {
            gicon = new $googlemaps.MarkerImage(this.icon);
            title = this.markers[0].title;
        }
        this.mainmarker = new $googlemaps.Marker({
            position: new $googlemaps.LatLng(this.markers[0].latitude, this.markers[0].longitude),
            icon: gicon,
            title: title,
            map: null
        });
        return this.mainmarker;
    };

    // global google maps objects
    var $googlemaps = google.maps,
        $geocoder = new $googlemaps.Geocoder(),
        $markersToLoad = 0,
        overQueryLimit = 0,
        methods = {};
    methods = {
        /**
         * initialisation/internals
         */
            
        init: function (options) {
            var k,
            // Build main options before element iteration
            opts = $.extend({}, $.fn.gMap.defaults, options);

                // recover icon array
                for (k in $.fn.gMap.defaults.icon) {
                    if(!opts.icon[k]) {
                        opts.icon[k] = $.fn.gMap.defaults.icon[k];
                    }
                }

            // Iterate through each element
            return this.each(function () {
                var $this = $(this),
                    center = methods._getMapCenter.apply($this, [opts]),
                    i, $data;

                if (opts.zoom == "fit") {
					          opts.zoomFit = true;
                    opts.zoom = methods._autoZoom.apply($this, [opts]);
                }

                var  mapOptions = {
                        zoom: opts.zoom,
                        center: center,
                        mapTypeControl: opts.mapTypeControl,
                        mapTypeControlOptions: {},
                        zoomControl: opts.zoomControl,
                        zoomControlOptions: {},
                        panControl : opts.panControl,
                        panControlOptions: {},
                        scaleControl : opts.scaleControl,
                        scaleControlOptions: {},
                        streetViewControl: opts.streetViewControl,
                        streetViewControlOptions: {},
                        mapTypeId: opts.maptype,
                        scrollwheel: opts.scrollwheel,
                        maxZoom: opts.maxZoom,
                        minZoom: opts.minZoom
                    };
                if(opts.controlsPositions.mapType) {mapOptions.mapTypeControlOptions.position = opts.controlsPositions.mapType};
                if(opts.controlsPositions.zoom) {mapOptions.zoomControlOptions.position = opts.controlsPositions.zoom};
                if(opts.controlsPositions.pan) {mapOptions.panControlOptions.position = opts.controlsPositions.pan};
                if(opts.controlsPositions.scale) {mapOptions.scaleControlOptions.position = opts.controlsPositions.scale};
                if(opts.controlsPositions.streetView) {mapOptions.streetViewControlOptions.position = opts.controlsPositions.streetView};

                mapOptions.mapTypeControlOptions.style = opts.controlsStyle.mapType;
                mapOptions.zoomControlOptions.style = opts.controlsStyle.zoom;
				
                // Create map and set initial options
                var $gmap = new $googlemaps.Map(this, mapOptions);

                if (opts.log) {console.log('map center is:'); }
                if (opts.log) {console.log(center); }

                // Create map and set initial options

                $this.data("$gmap", $gmap);

                $this.data('gmap', {
                    'opts': opts,
                    'gmap': $gmap,
                    'markers': [],
                    'markerKeys' : {},
                    'infoWindow': null,
                    'clusters': []
                });

                // Check for map controls
                if (opts.controls.length !== 0) {
                    // Add custom map controls
                    for (i = 0; i < opts.controls.length; i += 1) {
                        $gmap.controls[opts.controls[i].pos].push(opts.controls[i].div);
                    }
                }

                if (opts.clustering.enabled) {
                    $data = $this.data('gmap');
                    (function(markers) {$data.markers = markers;}(opts.markers));
                    methods._renderCluster.apply($this, []);

                    $googlemaps.event.addListener($gmap, 'bounds_changed', function () {
                        methods._renderCluster.apply($this, []);
                    });
                } else {
                    if (opts.markers.length !== 0) {
                        methods.addMarkers.apply($this, [opts.markers]);
                    }
                }

                methods._onComplete.apply($this, []);
            });
        },


        _delayedMode: false,

        /**
         * Check every 100ms if all markers were loaded, then call onComplete
         */
        _onComplete: function () {
            var $data = this.data('gmap'),
                that = this;
            if ($markersToLoad !== 0) {
                window.setTimeout(function () {methods._onComplete.apply(that, []); }, 100);
                return;
            }
            if(methods._delayedMode) {
                var center = methods._getMapCenter.apply(this, [$data.opts, true]);
                methods._setMapCenter.apply(this, [center]);
				if($data.opts.zoomFit) {
					var zoom = methods._autoZoom.apply(this, [$data.opts, true]);
					$data.gmap.setZoom(zoom);
				}
            }
            $data.opts.onComplete();
        },

        /**
         * set map center when map is loaded (check every 100ms)
         */
        _setMapCenter: function (center) {
            var $data = this.data('gmap');
            if ($data.opts.log) {console.log('delayed setMapCenter called'); }
            if ($data.gmap !== undefined && $markersToLoad == 0) {
                $data.gmap.setCenter(center);
            } else {
                var that = this;
                window.setTimeout(function () {methods._setMapCenter.apply(that, [center]); }, 100);
            }
        },

        /**
         * calculate boundaries, optimised and independent from Google Maps
         */
        _boundaries: null,
        _getBoundaries: function (opts) {
            // if(methods._boundaries) {return methods._boundaries; }
            var markers = opts.markers, i;
            var mostN = 1000,
                mostE = -1000,
                mostW = 1000,
                mostS = -1000;
            if(markers) {
                for (i = 0; i < markers.length; i += 1) {
                    if(!markers[i].latitude || !markers[i].longitude) continue;

                    if(mostN > markers[i].latitude) {mostN = markers[i].latitude; }
                    if(mostE < markers[i].longitude) {mostE = markers[i].longitude; }
                    if(mostW > markers[i].longitude) {mostW = markers[i].longitude; }
                    if(mostS < markers[i].latitude) {mostS = markers[i].latitude; }
                    console.log(markers[i].latitude, markers[i].longitude, mostN, mostE, mostW, mostS);
                }
                methods._boundaries = {N: mostN, E: mostE, W: mostW, S: mostS};
            }

            if(mostN == -1000) methods._boundaries = {N: 0, E: 0, W: 0, S: 0};

            return methods._boundaries;
        },

        _getBoundariesFromMarkers: function () {

            var markers = this.data('gmap').markers, i;
            var mostN = 1000,
                mostE = -1000,
                mostW = 1000,
                mostS = -1000;
            if(markers) {
                for (i = 0; i < markers.length; i += 1) {
                    if(mostN > markers[i].getPosition().lat()) {mostN = markers[i].getPosition().lat(); }
                    if(mostE < markers[i].getPosition().lng()) {mostE = markers[i].getPosition().lng(); }
                    if(mostW > markers[i].getPosition().lng()) {mostW = markers[i].getPosition().lng(); }
                    if(mostS < markers[i].getPosition().lat()) {mostS = markers[i].getPosition().lat(); }
                }
                methods._boundaries = {N: mostN, E: mostE, W: mostW, S: mostS};
            }

            if(mostN == -1000) methods._boundaries = {N: 0, E: 0, W: 0, S: 0};

            return methods._boundaries;
        },

        /**
         * Priorities order:
         * - latitude & longitude in options
         * - address in options
         * - latitude & longitude of first marker having it
         * - address of first marker having it
         * - failsafe (0,0)
         *
         * Note: with geocoding returned value is (0,0) and callback sets map center. It's not very nice nor efficient.
         *       It is quite good idea to use only first option
         */
        _getMapCenter: function (opts, fromMarkers) {
            // Create new object to geocode addresses

            var center,
                that = this, // 'that' scope fix in geocoding
                i,
                selectedToCenter,
                most; //hoisting

            if (opts.markers.length && (opts.latitude == "fit" || opts.longitude == "fit")) {
                if(fromMarkers) most = methods._getBoundariesFromMarkers.apply(this);
                else most = methods._getBoundaries(opts);
                center = new $googlemaps.LatLng((most.N + most.S)/2, (most.E + most.W)/2);
                console.log(fromMarkers, most, center);
                return center;
            }

            if (opts.latitude && opts.longitude) {
                // lat & lng available, return
                center = new $googlemaps.LatLng(opts.latitude, opts.longitude);
                return center;
            } else {
                center = new $googlemaps.LatLng(0, 0);
            }

            // Check for address to center on
            if (opts.address) {
                // Get coordinates for given address and center the map
                $geocoder.geocode(
                    {address: opts.address},
                    function (result, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            methods._setMapCenter.apply(that, [result[0].geometry.location]);
                        } else {
                            if (opts.log) {console.log("Geocode was not successful for the following reason: " + status); }
                        }
                    }
                );
                return center;
            }

            // Check for a marker to center on (if no coordinates given)
            if (opts.markers.length > 0) {
                selectedToCenter = null;

                for (i = 0; i < opts.markers.length; i += 1) {
                    if(opts.markers[i].setCenter) {
                        selectedToCenter = opts.markers[i];
                        break;
                    }
                }

                if (selectedToCenter === null) {
                    for (i = 0; i < opts.markers.length; i += 1) {
                        if (opts.markers[i].latitude && opts.markers[i].longitude) {
                            selectedToCenter = opts.markers[i];
                            break;
                        }
                        if (opts.markers[i].address) {
                            selectedToCenter = opts.markers[i];
                        }
                    }
                }
                // failed to find any reasonable marker (it's quite impossible BTW)
                if (selectedToCenter === null) {
                    return center;
                }

                if (selectedToCenter.latitude && selectedToCenter.longitude) {
                    return new $googlemaps.LatLng(selectedToCenter.latitude, selectedToCenter.longitude);
                }

                // Check if the marker has an address
                if (selectedToCenter.address) {
                    // Get the coordinates for given marker address and center
                    $geocoder.geocode(
                        {address: selectedToCenter.address},
                        function (result, status) {
                            if (status === google.maps.GeocoderStatus.OK) {
                                methods._setMapCenter.apply(that, [result[0].geometry.location]);
                            } else {
                                if (opts.log) {console.log("Geocode was not successful for the following reason: " + status); }
                            }
                        }
                    );
                }
            }
            return center;
        },


        /**
         * clustering
         */
        _renderCluster: function () {
            var $data = this.data('gmap'),
                markers = $data.markers,
                clusters = $data.clusters,
                opts = $data.opts,
                i,
                j,
                viewport;

            for (i = 0; i < clusters.length; i += 1) {
                clusters[i].getMarker().setMap(null);
            }
            clusters.length = 0;

            viewport = $data.gmap.getBounds();

            if (!viewport) {
                var that = this;
                window.setTimeout(function () {methods._renderCluster.apply(that); }, 1000);
                return;
            }

            var ne = viewport.getNorthEast(),
                sw = viewport.getSouthWest(),
                width = ne.lat() - sw.lat(),
                // height = ne.lng() - sw.lng(), // unused
                clusterable = [],
                best,
                bestDist,
                maxSize = width * opts.clustering.clusterSize / 100,
                dist,
                newCluster;

            for (i = 0; i < markers.length; i += 1) {
                if (markers[i].latitude < ne.lat() &&
                    markers[i].latitude > sw.lat() &&
                    markers[i].longitude < ne.lng() &&
                    markers[i].longitude > sw.lng()) {
                    clusterable[clusterable.length] = markers[i];
                }
            }

            if (opts.log) {console.log("number of markers " + clusterable.length + "/" + markers.length); }
            if (opts.log) {console.log('cluster radius: ' + maxSize); }

            for (i = 0; i < clusterable.length; i += 1) {
                bestDist = 10000;
                best = -1;
                for (j = 0; j < clusters.length; j += 1) {
                    dist = clusters[j].dist(clusterable[i]);
                    if (dist < maxSize) {
                        bestDist = dist;
                        best = j;
                        if (opts.clustering.fastClustering) {break; }
                    }
                }
                if (best === -1) {
                    newCluster = new Cluster();
                    newCluster.addMarker(clusterable[i]);
                    clusters[clusters.length] = newCluster;
                } else {
                    clusters[best].addMarker(clusterable[i]);
                }
            }

            if (opts.log) {console.log("Total clusters in viewport: " + clusters.length); }

            for (j = 0; j < clusters.length; j += 1) {
                clusters[j].getMarker().setMap($data.gmap);
            }
        },

        _processMarker: function (marker, gicon, gshadow, location) {
            var $data = this.data('gmap'),
                $gmap = $data.gmap,
                opts = $data.opts,
                gmarker,
                markeropts;

            if (location === undefined) {
                location = new $googlemaps.LatLng(marker.latitude, marker.longitude);
            }

            if (!gicon) {

                // Set icon properties from global options
                var _gicon = {
                    image: opts.icon.image,
                    iconSize: new $googlemaps.Size(opts.icon.iconsize[0], opts.icon.iconsize[1]),
                    iconAnchor: new $googlemaps.Point(opts.icon.iconanchor[0], opts.icon.iconanchor[1]),
                    infoWindowAnchor: new $googlemaps.Size(opts.icon.infowindowanchor[0], opts.icon.infowindowanchor[1])
                };
                gicon = new $googlemaps.MarkerImage(_gicon.image, _gicon.iconSize, null, _gicon.iconAnchor);
            }

            if (!gshadow) {
                var _gshadow = {
                    image: opts.icon.shadow,
                    iconSize: new $googlemaps.Size(opts.icon.shadowsize[0], opts.icon.shadowsize[1]),
                    anchor: (_gicon && _gicon.iconAnchor)?_gicon.iconAnchor:new $googlemaps.Point(opts.icon.iconanchor[0], opts.icon.iconanchor[1])
                };
            }

            markeropts = {
                    position: location,
                    icon: gicon,
                    title: marker.title,
                    map: null,
                    draggable: ((marker.draggable === true) ? true : false)
                };

            if (!opts.clustering.enabled) {markeropts.map = $gmap; }

            gmarker = new $googlemaps.Marker(markeropts);
            gmarker.setShadow(gshadow);
            $data.markers.push(gmarker);

            if(marker.key) {$data.markerKeys[marker.key] = gmarker; }

            // Set HTML and check if info window should be opened
            var infoWindow;
            if (marker.html) {
                var infoContent = typeof(marker.html) === "string" ? opts.html_prepend + marker.html + opts.html_append : marker.html;
                var infoOpts = {
                    content: infoContent,
                    pixelOffset: marker.infoWindowAnchor
                };

                if (opts.log) {console.log('setup popup with data'); }
                if (opts.log) {console.log(infoOpts); }
                infoWindow = new $googlemaps.InfoWindow(infoOpts);

                $googlemaps.event.addListener(gmarker, 'click', function () {
                    if (opts.log) {console.log('opening popup ' + marker.html); }
                    if (opts.singleInfoWindow && $data.infoWindow) {$data.infoWindow.close(); }
                    infoWindow.open($gmap, gmarker);
                    $data.infoWindow = infoWindow;
                });
            }
            if (marker.html && marker.popup) {
                if (opts.log) {console.log('opening popup ' + marker.html); }
                infoWindow.open($gmap, gmarker);
                $data.infoWindow = infoWindow;
            }

            if (marker.onDragEnd){
                $googlemaps.event.addListener(gmarker, 'dragend', function(event) {
                    if (opts.log) {console.log('drag end');}
                    marker.onDragEnd(event);
                });
            }

        },

        _geocodeMarker: function (marker, gicon, gshadow) {
            var that = this;
            $geocoder.geocode({'address': marker.address}, function (results, status) {
                if (status === $googlemaps.GeocoderStatus.OK) {
                    $markersToLoad -= 1;
                    if (that.data('gmap').opts.log) {console.log("Geocode was successful with point: ", results[0].geometry.location); }
                    methods._processMarker.apply(that, [marker, gicon, gshadow, results[0].geometry.location]);
                } else {
                    if(status === $googlemaps.GeocoderStatus.OVER_QUERY_LIMIT) {
                        if ((!that.data('gmap').opts.noAlerts) && (overQueryLimit === 0)) {alert('Error: too many geocoded addresses! Switching to 1 marker/s mode.'); }

                        overQueryLimit+=1000;
                        window.setTimeout(function() {
                            methods._geocodeMarker.apply(that, [marker, gicon, gshadow]);
                        }, overQueryLimit);
                    }
                    if (that.data('gmap').opts.log) {console.log("Geocode was not successful for the following reason: " + status); }
                }
            });
        },

        _autoZoom: function (options, fromMarkers){
            var data = $(this).data('gmap'),
                opts = $.extend({}, data?data.opts:{}, options),
                i, boundaries, resX, resY, baseScale = 39135.758482;
            if (opts.log) {console.log("autozooming map");}

            if(fromMarkers) boundaries = methods._getBoundariesFromMarkers.apply(this);
            else boundaries = methods._getBoundaries(opts);
            
            resX = (boundaries.E - boundaries.W) * 111000 / this.width();
            resY = (boundaries.S - boundaries.N) * 111000 / this.height();

            for(i = 2; i < 20; i += 1) {
                if (resX > baseScale || resY > baseScale) {
                    break;
                }
                baseScale = baseScale / 2;
            }
            return i - 2;
        },

        /**
         * public methods section
         */

        /**
         * add array of markers
         * @param markers
         */
        addMarkers: function (markers){
            var opts = this.data('gmap').opts;

            if (markers.length !== 0) {
                if (opts.log) {console.log("adding " + markers.length +" markers");}
                // Loop through marker array
                for (var i = 0; i < markers.length; i+= 1) {
                    methods.addMarker.apply(this,[markers[i]]);
                }
            }
        },

        /**
         * add single marker
         * @param marker
         */
        addMarker: function (marker) {
            var opts = this.data('gmap').opts;

            if (opts.log) {console.log("putting marker at " + marker.latitude + ', ' + marker.longitude + " with address " + marker.address + " and html "  + marker.html); }

            // Create new icon
            // Set icon properties from global options
            var _gicon = {
                image: opts.icon.image,
                iconSize: new $googlemaps.Size(opts.icon.iconsize[0], opts.icon.iconsize[1]),
                iconAnchor: new $googlemaps.Point(opts.icon.iconanchor[0], opts.icon.iconanchor[1]),
                infoWindowAnchor: new $googlemaps.Size(opts.icon.infowindowanchor[0], opts.icon.infowindowanchor[1])
            },
            _gshadow = {
                image: opts.icon.shadow,
                iconSize: new $googlemaps.Size(opts.icon.shadowsize[0], opts.icon.shadowsize[1]),
                anchor: new $googlemaps.Point(opts.icon.shadowanchor[0], opts.icon.shadowanchor[1])
            };

            // not very nice, but useful
            marker.infoWindowAnchor = _gicon.infoWindowAnchor;

            if (marker.icon) {
                // Overwrite global options
                if (marker.icon.image) { _gicon.image = marker.icon.image; }
                if (marker.icon.iconsize) { _gicon.iconSize = new $googlemaps.Size(marker.icon.iconsize[0], marker.icon.iconsize[1]); }

                if (marker.icon.iconanchor) { _gicon.iconAnchor = new $googlemaps.Point(marker.icon.iconanchor[0], marker.icon.iconanchor[1]); }
                if (marker.icon.infowindowanchor) { _gicon.infoWindowAnchor = new $googlemaps.Size(marker.icon.infowindowanchor[0], marker.icon.infowindowanchor[1]); }

                if (marker.icon.shadow) { _gshadow.image = marker.icon.shadow; }
                if (marker.icon.shadowsize) { _gshadow.iconSize = new $googlemaps.Size(marker.icon.shadowsize[0], marker.icon.shadowsize[1]); }

                if (marker.icon.shadowanchor) { _gshadow.anchor = new $googlemaps.Point(marker.icon.shadowanchor[0], marker.icon.shadowanchor[1]); }
            }

            var gicon = new $googlemaps.MarkerImage(_gicon.image, _gicon.iconSize, null, _gicon.iconAnchor);
            var gshadow = new $googlemaps.MarkerImage( _gshadow.image,_gshadow.iconSize, null, _gshadow.anchor);

            // Check if address is available
            if (marker.address) {
                // Check for reference to the marker's address
                if (marker.html === '_address') {
                    marker.html = marker.address;
                }

                if (marker.title == '_address') {
                    marker.title = marker.address;
                }

                if (opts.log) {console.log('geocoding marker: ' + marker.address); }
                // Get the point for given address
                $markersToLoad += 1;
                methods._delayedMode = true;
                methods._geocodeMarker.apply(this, [marker, gicon, gshadow]);
            } else {
                // Check for reference to the marker's latitude/longitude
                if (marker.html === '_latlng') {
                    marker.html = marker.latitude + ', ' + marker.longitude;
                }

                if (marker.title == '_latlng') {
                    marker.title = marker.latitude + ', ' + marker.longitude;
                }

               // Create marker
                var gpoint = new $googlemaps.LatLng(marker.latitude, marker.longitude);
                methods._processMarker.apply(this, [marker, gicon, gshadow, gpoint]);
            }
        },

        /**
         * 
         */
        removeAllMarkers: function () {
            var markers = this.data('gmap').markers, i;

            for (i = 0; i < markers.length; i += 1) {
                markers[i].setMap(null);
                delete markers[i];
            }
            markers.length = 0;
        },

        /**
         * get marker by key, if set previously
         * @param key
         */
        getMarker: function (key) {
            return this.data('gmap').markerKeys[key];
        },

        /**
         * should be called if DOM element was resized
         * @param nasty
         */
        fixAfterResize: function (nasty) {
            var data = this.data('gmap');
            $googlemaps.event.trigger(data.gmap, 'resize');

            if(nasty) {
                data.gmap.panTo(new google.maps.LatLng(0,0));
            }
            data.gmap.panTo(this.gMap('_getMapCenter', data.opts));
        },

        /**
         * change zoom, works with 'fit' option as well
         * @param zoom
         */
        setZoom: function (zoom, opts, fromMarkers) {
            var $map = this.data('gmap').gmap;
            if (zoom === "fit"){
                zoom = methods._autoZoom.apply(this, [opts, fromMarkers]);
            }
            $map.setZoom(parseInt(zoom));
        },

        changeSettings: function (options) {
            var data = this.data('gmap'),
                markers = [], i;
            for (i = 0; i < data.markers.length; i += 1) {
                markers[i] = {
                    latitude: data.markers[i].getPosition().lat(),
                    longitude: data.markers[i].getPosition().lng()
                }
            }
            options.markers = markers;
            
            if(options.zoom) methods.setZoom.apply(this,[options.zoom, options]);
            if(options.latitude || options.longitude) {
                data.gmap.panTo(methods._getMapCenter.apply(this,[options]));
            }

            // add controls and maptype
        },

        mapclick: function(callback) {
            google.maps.event.addListener(this.data('gmap').gmap, 'click', function(event) {
                callback(event.latLng);
            });
        },

        geocode: function(address, callback, errorCallback) {
            $geocoder.geocode({'address': address}, function (results, status) {
                if (status === $googlemaps.GeocoderStatus.OK) {
                    callback(results[0].geometry.location);
                } else if(errorCallback) {
                    errorCallback(results, status);
                }
            });
        },

        getRoute: function (options) {

            var $data = this.data('gmap'),
            $gmap = $data.gmap,
            $directionsDisplay = new $googlemaps.DirectionsRenderer(),
            $directionsService = new $googlemaps.DirectionsService(),
            $travelModes = { 'BYCAR': $googlemaps.DirectionsTravelMode.DRIVING, 'BYBICYCLE': $googlemaps.DirectionsTravelMode.BICYCLING, 'BYFOOT': $googlemaps.DirectionsTravelMode.WALKING },
            $travelUnits = { 'MILES': $googlemaps.DirectionsUnitSystem.IMPERIAL, 'KM': $googlemaps.DirectionsUnitSystem.METRIC },
            displayObj = null,
            travelMode = null,
            travelUnit = null,
            unitSystem = null;

            // look if there is an individual or otherwise a default object for this call to display route text informations
            if(options.routeDisplay !== undefined){
                displayObj = (options.routeDisplay instanceof jQuery) ? options.routeDisplay[0] : ((typeof options.routeDisplay == "string") ? $(options.routeDisplay)[0] : null);
            } else if($data.opts.routeFinder.routeDisplay !== null){
                displayObj = ($data.opts.routeFinder.routeDisplay instanceof jQuery) ? $data.opts.routeFinder.routeDisplay[0] : ((typeof $data.opts.routeFinder.routeDisplay == "string") ? $($data.opts.routeFinder.routeDisplay)[0] : null);
            }

            // set route renderer to map
            $directionsDisplay.setMap($gmap);
            if(displayObj !== null){
                $directionsDisplay.setPanel(displayObj);
            }

            // get travel mode and unit
            travelMode = ($travelModes[$data.opts.routeFinder.travelMode] !== undefined) ? $travelModes[$data.opts.routeFinder.travelMode] : $travelModes['BYCAR'];
            travelUnit = ($travelUnits[$data.opts.routeFinder.travelUnit] !== undefined) ? $travelUnits[$data.opts.routeFinder.travelUnit] : $travelUnits['KM'];

            // build request
            var request = {
                origin: options.from,
                destination: options.to,
                travelMode: travelMode,
                unitSystem: travelUnit
            };

            // send request
            $directionsService.route(request, function(result, status) {
                // show the rout or otherwise show an error message in a defined container for route text information
                if (status == $googlemaps.DirectionsStatus.OK) {
                    $directionsDisplay.setDirections(result);
                } else if(displayObj !== null){
                    $(displayObj).html($data.opts.routeFinder.routeErrors[status]);
                }
            });
            return this;
        }
    };


    // Main plugin function
    $.fn.gMap = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.gmap');
        }
    };

    // Default settings
    $.fn.gMap.defaults = {
        log:                     false,
        address:                 '',
        latitude:                null,
        longitude:               null,
        zoom:                    3,
        maxZoom: 				 null,
        minZoom: 				 null,
        markers:                 [],
        controls:                {},
        scrollwheel:             true,
        maptype:                 google.maps.MapTypeId.ROADMAP,

        mapTypeControl:          true,
        zoomControl:             true,
        panControl:              false,
        scaleControl:            false,
        streetViewControl:       true,

        controlsPositions: {
            mapType: 			 null,
            zoom: 				 null,
            pan: 				 null,
            scale: 				 null,
            streetView: 		 null
        },
        controlsStyle: {
            mapType: 			 google.maps.MapTypeControlStyle.DEFAULT,
            zoom:				 google.maps.ZoomControlStyle.DEFAULT
        },
		
        singleInfoWindow:        true,

        html_prepend:            '<div class="gmap_marker">',
        html_append:             '</div>',
        icon: {
            image:               "http://www.google.com/mapfiles/marker.png",
            iconsize:            [20, 34],
            iconanchor:          [9, 34],
            infowindowanchor:    [9, 2],
            shadow:              "http://www.google.com/mapfiles/shadow50.png",
            shadowsize:          [37, 34],
            shadowanchor:        [9, 34]
        },

        onComplete:              function () {},

        routeFinder: {
            travelMode:              'BYCAR',
            travelUnit:              'KM',
            routeDisplay:            null,
            routeErrors:			 {
                                        'INVALID_REQUEST': 'The provided request is invalid.',
                                        'NOT_FOUND': 'One or more of the given addresses could not be found.',
                                        'OVER_QUERY_LIMIT': 'A temporary error occured. Please try again in a few minutes.',
                                        'REQUEST_DENIED': 'An error occured. Please contact us.',
                                        'UNKNOWN_ERROR': 'An unknown error occured. Please try again.',
                                        'ZERO_RESULTS': 'No route could be found within the given addresses.'
                                     }
        },

        clustering: {
            enabled: false,
            fastClustering: false,
            clusterCount: 10,
            clusterSize: 40 //radius as % of viewport width
        }
    };
}(jQuery));
