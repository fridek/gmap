/**
 * jQuery gMap v3
 *
 * @url         http://www.smashinglabs.pl/gmap
 * @author      Sebastian Poreba <sebastian.poreba@gmail.com>
 * @version     3.2.0 alpha
 * @date        31.03.2011
 *
 * JSLint tested (with exception of multiple var statements and underscores)
 */
(function ($) {

    var Cluster = function () {
        this.markers = [];
        this.mainMarker = false;
    };

    /**
     * For iterating over all clusters to find if any is close enough to be merged with marker
     *
     * @param marker
     * @param currentSize - calculated as viewport percentage (opts.clusterSize)
     * @return bool
     */
    Cluster.prototype.dist = function (marker) {
        return Math.sqrt(Math.pow(this.markers[0].getPosition().lat() - marker.getPosition().lat(), 2) +
            Math.pow(this.markers[0].getPosition().lng() - marker.getPosition().lng(), 2));
    };

    Cluster.prototype.addMarker = function (marker) {
        this.markers.push(marker);
    };

    /**
     * returns one marker if there is only one or
     * returns special cloister marker if there are more
     */
    Cluster.prototype.getMarker = function () {
        if (this.mainmarker) {return this.mainmarker; }

        if (this.markers.length > 1) {
            var gicon = new $googlemaps.MarkerImage("/images/gmap_pin_orange.png");
            this.mainmarker = new $googlemaps.Marker({
                position: this.markers[0].getPosition(),
                icon: gicon,
                title: "cluster of " + this.markers.length + " markers",
                map: null
            });
            return this.mainmarker;
        } else {
            return this.markers[0];
        }
    };


    // global google maps objects
    var $googlemaps = google.maps,
        $geocoder = new $googlemaps.Geocoder(),
        opts = {},
        $markersToLoad = 0,
        methods = {}; // for JSLint
    methods = {
        init: function (options) {
            // Build main options before element iteration
            opts = $.extend({}, $.fn.gMap.defaults, options);

            // Iterate through each element
            return this.each(function () {
                var $this = $(this),
                    center = methods._getMapCenter.apply($this, []),

                    mapOptions = {
                        zoom: opts.zoom,
                        center: center,
                        mapTypeControl: opts.mapTypeControl,
                        zoomControl: opts.zoomControl,
                        panControl : opts.panControl,
                        scaleControl : opts.scaleControl,
                        streetViewControl: opts.streetViewControl,
                        mapTypeId: opts.maptype,
                        scrollwheel: opts.scrollwheel
                    },
                    i; //hoisting

                if (opts.log) {console.log('map center is:'); }
                if (opts.log) {console.log(center); }

                // Create map and set initial options
                var $gmap = new $googlemaps.Map(this, mapOptions);
                $this.data("$gmap", $gmap);

                $this.data('gmap', {
                    'opts': opts,
                    'gmap': $gmap,
                    'markers': [],
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

                if (opts.markers.length !== 0) {
                    // Loop through marker array
                    for (i = 0; i < opts.markers.length; i += 1) {
                        methods.addMarker.apply($this, [opts.markers[i]]);
                    }
                }

                if (opts.clustering) {
                    methods.renderCluster.apply($this, []);


                    $googlemaps.event.addListener($gmap, 'zoom_changed', function () {
                        methods.renderCluster.apply($this, []);
                    });
                }

                methods._onComplete.apply($this, []);
            });
        },

        _onComplete: function () {
            var $data = this.data('gmap'),
                that = this;
            if($markersToLoad !== 0) {
                window.setTimeout(function () { methods._onComplete.apply(that, [])}, 1000);
                return;
            }
            $data.opts.onComplete();
        },

        renderCluster: function () {
            var $data = this.data('gmap'),
                markers = $data.markers,
                clusters = $data.clusters,
                i,
                j;

            for (i = 0; i < clusters.length; i += 1) {
                clusters[i].getMarker().setMap(null);
            }
            clusters.length = 0;

            var viewport = $data.gmap.getBounds();

            if (!viewport) {
                var that = this;
                window.setTimeout(function () {methods.renderCluster.apply(that); }, 1000);
                return;
            }

            var ne = viewport.getNorthEast(),
                sw = viewport.getSouthWest();
            var width = ne.lat() - sw.lat(),
                // height = ne.lng() - sw.lng(), // unused
                clusterable = [],
                best,
                bestDist;

            var maxSize = width * opts.clusterSize / 100;

            for (i = 0; i < markers.length; i += 1) {
                if (viewport.contains(markers[i].getPosition())) {
                    clusterable.push(markers[i]);
                } else {
                    markers[i].setMap(null);
                }
            }
            if (opts.log) {console.log("number of markers " + clusterable.length + "/" + markers.length); }
            if (opts.log) {console.log('cluster radius: ' + maxSize); }


            for (i = 0; i < clusterable.length; i += 1) {
                bestDist = 10000;
                best = -1;
                for (j = 0; j < clusters.length; j += 1) {
                    var dist = clusters[j].dist(clusterable[i]);
                    if (dist < maxSize) {
                        bestDist = dist;
                        best = j;
                        if (opts.fastClustering) {break; }
                    }
                }
                if (best === -1) {
                    var newCluster = new Cluster();
                    newCluster.addMarker(clusterable[i]);
                    clusters.push(newCluster);
                } else {
                    clusters[best].addMarker(clusterable[i]);
                }
            }

            if (opts.log) {console.log("Total clusters in viewport: " + clusters.length); }

            for (j = 0; j < clusters.length; j += 1) {
                clusters[j].getMarker().setMap($data.gmap);
            }
        },

        _setMapCenter: function (center) {
            if (opts.log) {console.log('delayed setMapCenter called'); }
            var $data = this.data('gmap');
            if ($data.gmap !== undefined) {
                $data.gmap.setCenter(center);
            } else {
                var that = this;
                window.setTimeout(function () {methods._setMapCenter.apply(that, [center]); }, 500);
            }
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
        _getMapCenter: function () {
            // Create new object to geocode addresses

            var center, that = this, // 'that' scope fix in geocoding
                i; //hoisting
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
            if ($.isArray(opts.markers) && opts.markers.length > 0) {
                var selectedToCenter = null;
                for (i = 0; i < opts.markers.length; i += 1) {
                    if (opts.markers[i].latitude && opts.markers[i].longitude) {
                        selectedToCenter = opts.markers[i];
                        break;
                    }
                    if (opts.markers[i].address) {
                        selectedToCenter = opts.markers[i];
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

        processMarker: function (marker, gicon, location) {
            var $data = this.data('gmap'),
                $gmap = $data.gmap,
                gmarker;

            if (location === undefined) {
                location = new $googlemaps.LatLng(marker.latitude, marker.longitude);
            }

            if (gicon === undefined) {
                var _gicon = {};

                // Set icon properties from global options
                _gicon.image = opts.icon.image;
                _gicon.iconSize = ($.isArray(opts.icon.iconsize)) ? new $googlemaps.Size(opts.icon.iconsize[0], opts.icon.iconsize[1]) : opts.icon.iconsize;
                _gicon.iconAnchor = ($.isArray(opts.icon.iconanchor)) ? new $googlemaps.Point(opts.icon.iconanchor[0], opts.icon.iconanchor[1]) : opts.icon.iconanchor;

                gicon = new $googlemaps.MarkerImage(_gicon.image, _gicon.iconSize, null, _gicon.iconAnchor);
            }


            if (opts.clustering) {
                // create marker with no map set
                gmarker = new $googlemaps.Marker({
                    position: location,
                    icon: gicon,
                    title: marker.html,
                    map: null
                });
            } else {
                gmarker = new $googlemaps.Marker({
                    position: location,
                    icon: gicon,
                    title: marker.html,
                    map: $gmap
                });
            }
            $data.markers.push(gmarker);

            // Set HTML and check if info window should be opened
            var infoWindow;
            if (marker.html) {
                var infoOpts = {
                    content: opts.html_prepend + marker.html + opts.html_append,
                    pixelOffset: marker.infoWindowAnchor
                };

                if (opts.log) {console.log('setup popup with data'); }
                if (opts.log) {console.log(infoOpts); }
                infoWindow = new $googlemaps.InfoWindow(infoOpts);

                $googlemaps.event.addListener(gmarker, 'click', function () {
                    if (opts.log) {console.log('opening popup ' + marker.html); }
                    if (opts.singleInfoWindow && $data.infoWindow) {$data.infoWindow.close();}
                    infoWindow.open($gmap, gmarker);
                    $data.infoWindow = infoWindow;
                });
            }
            if (marker.html && marker.popup) {
                if (opts.log) {console.log('opening popup ' + marker.html); }
                infoWindow.open($gmap, gmarker);
            }

        },

        _geocodeMarker: function (marker, gicon) {
            $markersToLoad += 1;
            var that = this;

            $geocoder.geocode({'address': marker.address}, function (results, status) {
                $markersToLoad -= 1;
                if (status === $googlemaps.GeocoderStatus.OK) {
                    methods.processMarker.apply(that, [marker, gicon, results[0].geometry.location]);
                } else {
                    if (opts.log) {console.log("Geocode was not successful for the following reason: " + status); }
                }
            });
        },

        addMarker: function (marker) {
            if (opts.log) {console.log("putting marker at " + marker.latitude + ', ' + marker.longitude + " with address " + marker.address + " and html "  + marker.html); }

            // Create new icon
            var _gicon = {};

            // Set icon properties from global options
            _gicon.image = opts.icon.image;
            _gicon.iconSize = ($.isArray(opts.icon.iconsize)) ? new $googlemaps.Size(opts.icon.iconsize[0], opts.icon.iconsize[1]) : opts.icon.iconsize;

            _gicon.iconAnchor = ($.isArray(opts.icon.iconanchor)) ? new $googlemaps.Point(opts.icon.iconanchor[0], opts.icon.iconanchor[1]) : opts.icon.iconanchor;
            _gicon.infoWindowAnchor = ($.isArray(opts.icon.infowindowanchor)) ? new $googlemaps.Size(opts.icon.infowindowanchor[0], opts.icon.infowindowanchor[1]) : opts.icon.infowindowanchor;
            // not very nice, but useful
            marker.infoWindowAnchor = _gicon.infoWindowAnchor;

            if (marker.icon) {
                // Overwrite global options
                _gicon.image = marker.icon.image;
                _gicon.iconSize = ($.isArray(marker.icon.iconsize)) ? new $googlemaps.Size(marker.icon.iconsize[0], marker.icon.iconsize[1]) : marker.icon.iconsize;

                _gicon.iconAnchor = ($.isArray(marker.icon.iconanchor)) ? new $googlemaps.Point(marker.icon.iconanchor[0], marker.icon.iconanchor[1]) : marker.icon.iconanchor;
                _gicon.infoWindowAnchor = ($.isArray(marker.icon.infowindowanchor)) ? new $googlemaps.Size(marker.icon.infowindowanchor[0], marker.icon.infowindowanchor[1]) : marker.icon.infowindowanchor;

            }

            var gicon = new $googlemaps.MarkerImage(_gicon.image, _gicon.iconSize, null, _gicon.iconAnchor);

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
                methods._geocodeMarker.apply(this, [marker, gicon]);
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
                methods.processMarker.apply(this, [marker, gicon, gpoint]);
            }
        },

        removeAllMarkers: function () {
            var markers = this.data('gmap').markers, i;

            for(i = 0; i < markers.length; i += 1) {
                markers[i].setMap(null);
            }
            markers = [];
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
        markers:                 [],
        controls:                {},
        scrollwheel:             true,
        maptype:                 google.maps.MapTypeId.ROADMAP,

        mapTypeControl:          true,
        zoomControl:             true,
        panControl:              false,
        scaleControl:            false,
        streetViewControl:       true,

        singleInfoWindow:           true,

        html_prepend:            '<div class="gmap_marker">',
        html_append:             '</div>',
        icon: {
            image:               "http://www.google.com/mapfiles/marker.png",
            iconsize:            [20, 34],
            iconanchor:          [9, 34],
            infowindowanchor:    [9, 2]
        },

        onComplete:              function() {},

        clustering: false,
        fastClustering: false,
        clusterCount: 10,
        clusterSize: 40 //radius as % of viewport width
    };
}(jQuery));