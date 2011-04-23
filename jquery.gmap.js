/**
 * jQuery gMap v3
 *
 * @url         http://www.smashinglabs.pl/gmap
 * @author      Cedric Kastner <cedric@nur-text.de>
 * @author      Sebastian Poreba <sebastian.poreba@gmail.com>
 * @version     3.0.1
 * @date        30.03.2011
 *
 */
(function($) {
    // Main plugin function
    $.fn.gMap = function(options) {
        // Build main options before element iteration
        var opts = $.extend({}, $.fn.gMap.defaults, options);

        // Iterate through each element
        return this.each(function() {
            //performance
            var googlemaps = google.maps;
            var $this = $(this);

            var LatLng = new googlemaps.LatLng(opts.latitude, opts.longitude);
            var mapOptions = {
                zoom: opts.zoom,
                center: LatLng,

                mapTypeControl: opts.mapTypeControl,
                zoomControl: opts.zoomControl,
                panControl : opts.panControl,
                scaleControl : opts.scaleControl,
                streetViewControl: opts.streetViewControl,

                mapTypeId: opts.maptype,
                scrollwheel: opts.scrollwheel
            };

            // Create map and set initial options
            var $gmap = new googlemaps.Map(this, mapOptions);
            $this.data("$gmap", $gmap);

            // Create new object to geocode addresses
            var $geocoder = new googlemaps.Geocoder();

            // Check for address to center on
            if (opts.address) {
                // Get coordinates for given address and center the map
                $geocoder.geocode(
                {
                    address: opts.address
                },
                        function(result, status) {
                            if (status == google.maps.GeocoderStatus.OK) {
                                $gmap.setCenter(result[0].geometry.location);
                            } else {
                                if (opts.log) console.log("Geocode was not successful for the following reason: " + status);
                            }
                        });
                $gmap.setZoom(opts.zoom);
            }
            else {
                // Check for coordinates to center on
                if (opts.latitude && opts.longitude) {
                    // Center map to coordinates given by option
                    $gmap.setCenter(new googlemaps.LatLng(opts.latitude, opts.longitude), opts.zoom);
                }
                else {
                    // Check for a marker to center on (if no coordinates given)
                    if ($.isArray(opts.markers) && opts.markers.length > 0) {
                        // Check if the marker has an address
                        if (opts.markers[0].address) {
                            // Get the coordinates for given marker address and center
                            $geocoder.geocode(
                            {
                                address: opts.markers[0].address
                            },
                                    function(result, status) {
                                        if (status == google.maps.GeocoderStatus.OK) {
                                            $gmap.setCenter(result[0].geometry.location);
                                        } else {
                                            if (opts.log) console.log("Geocode was not successful for the following reason: " + status);
                                        }
                                    });
                        }
                        else {
                            // Center the map to coordinates given by marker
                            $gmap.setCenter(new googlemaps.LatLng(opts.markers[0].latitude, opts.markers[0].longitude));
                            $gmap.setZoom(opts.zoom);
                        }
                    }
                    else {
                        // Revert back to world view
                        $gmap.setCenter(new googlemaps.LatLng(opts.latitude, opts.longitude));
                        $gmap.setZoom(opts.zoom);
                    }
                }
            }

            // Check for map controls
            if (opts.controls.length != 0) {
                // Add custom map controls
                for (var i = 0; i < opts.controls.length; i++) {
                    map.controls[opts.controls[i].pos].push(opts.controls[i].div);
                }
            }

            // Loop through marker array
            for (var j in opts.markers) {
                
                var marker = opts.markers[j];

                if (opts.log) console.log("putting marker no " + j + " at " + marker.latitude + ', ' + marker.longitude + " with address " + marker.address + " and html "  + marker.html);

                // Create new icon
                var _gicon = {};

                // Set icon properties from global options
                _gicon.image = opts.icon.image;
                _gicon.iconSize = ($.isArray(opts.icon.iconsize)) ? new googlemaps.Size(opts.icon.iconsize[0], opts.icon.iconsize[1]) : opts.icon.iconsize;

                _gicon.iconAnchor = ($.isArray(opts.icon.iconanchor)) ? new googlemaps.Point(opts.icon.iconanchor[0], opts.icon.iconanchor[1]) : opts.icon.iconanchor;
                _gicon.infoWindowAnchor = ($.isArray(opts.icon.infowindowanchor)) ? new googlemaps.Size(opts.icon.infowindowanchor[0], opts.icon.infowindowanchor[1]) : opts.icon.infowindowanchor;

                var _gshadow = {};
                _gshadow.shadow = opts.icon.shadow;
                _gshadow.shadowSize = ($.isArray(opts.icon.shadowsize)) ? new googlemaps.Size(opts.icon.shadowsize[0], opts.icon.shadowsize[1]) : opts.icon.shadowsize;


                if (marker.icon) {
                    // Overwrite global options
                    _gicon.image = marker.icon.image;
                    _gicon.iconSize = ($.isArray(marker.icon.iconsize)) ? new googlemaps.Size(marker.icon.iconsize[0], marker.icon.iconsize[1]) : marker.icon.iconsize;

                    _gicon.iconAnchor = ($.isArray(marker.icon.iconanchor)) ? new googlemaps.Point(marker.icon.iconanchor[0], marker.icon.iconanchor[1]) : marker.icon.iconanchor;
                    _gicon.infoWindowAnchor = ($.isArray(marker.icon.infowindowanchor)) ? new googlemaps.Size(marker.icon.infowindowanchor[0], marker.icon.infowindowanchor[1]) : marker.icon.infowindowanchor;

                    _gshadow.shadow = marker.icon.shadow;
                    _gshadow.shadowSize = ($.isArray(marker.icon.shadowsize)) ? new googlemaps.Size(marker.icon.shadowsize[0], marker.icon.shadowsize[1]) : marker.icon.shadowsize;
                }

                var gicon = new googlemaps.MarkerImage(_gicon.image, _gicon.iconSize, null, _gicon.iconAnchor);
                var gshadow = new googlemaps.MarkerImage(_gshadow.image, _gshadow.iconSize, null, _gicon.iconAnchor);

                // Check if address is available
                if (marker.address) {
                    // Check for reference to the marker's address
                    if (marker.html == '_address') {
                        marker.html = marker.address;
                    }
                    if (marker.title == '_address') {
                        marker.title = marker.address;
                    }
                    if (opts.log) console.log('geocoding marker: ' + marker.address);
                    // Get the point for given address
                    // fixing scope issues
                    (function(marker, gicon, gshadow) {
                        $geocoder.geocode({'address': marker.address}, function(results, status) {
                            if (status == google.maps.GeocoderStatus.OK) {

                                var gmarker = new googlemaps.Marker({
                                    position: results[0].geometry.location,
                                    icon: gicon,
                                    title: marker.title,
                                    map: $gmap
                                });

                                // Set HTML and check if info window should be opened
                                var infowindow;
                                if (marker.html) {
                                    var infoOpts = {
                                        content: opts.html_prepend + marker.html + opts.html_append,
                                        pixelOffset: _gicon.infoWindowAnchor
                                    };

                                    if (opts.log) console.log('setup popup with data');
                                    if (opts.log) console.log(infoOpts);
                                    infowindow = new googlemaps.InfoWindow(infoOpts);

                                    googlemaps.event.addListener(gmarker, 'click', function() {
                                        if (opts.log) console.log('opening popup ' + marker.html);
                                        infowindow.open($gmap, gmarker);
                                    });
                                }
                                if (marker.html && marker.popup) {
                                    if (opts.log) console.log('opening popup ' + marker.html);
                                    infowindow.open($gmap, gmarker);
                                }

                            } else {
                                if (opts.log) console.log("Geocode was not successful for the following reason: " + status);
                            }
                        });
                    })(marker, gicon, gshadow);

                }
                else {
                  (function(marker, gicon, gshadow) {
                    // Check for reference to the marker's latitude/longitude
                    if (marker.html == '_latlng') {
                        marker.html = marker.latitude + ', ' + marker.longitude;
                    }
                    if (marker.title == '_latlng') {
                        marker.title = marker.latitude + ', ' + marker.longitude;
                    }
                    // Create marker
                    var gpoint = new googlemaps.LatLng(marker.latitude, marker.longitude);

                    var gmarker = new googlemaps.Marker({
                        position: gpoint,
                        icon: gicon ,
                        title: marker.title,
                        map: $gmap
                    });

                    var infowindow;
                    if(marker.html) {
                        var infoOpts = {
                            content: opts.html_prepend + marker.html + opts.html_append,
                            pixelOffset: _gicon.infoWindowAnchor
                        };
                        infowindow = new googlemaps.InfoWindow(infoOpts);

                        googlemaps.event.addListener(gmarker, 'click', function() {
                            if (opts.log) console.log('opening popup ' + marker.html);
                            infowindow.open($gmap, gmarker);
                        });
                    }
                    if (marker.html && marker.popup) {
                        if (opts.log) console.log('opening popup ' + marker.html);
                        infowindow.open($gmap, gmarker);
                    }
                  })(marker, gicon, gshadow);
                }
            }

        });

    }

    // Default settings
    $.fn.gMap.defaults =
    {
        log:                    false,
        address:                '',
        latitude:                 0,
        longitude:                0,
        zoom:                     10,
        markers:                [],
        controls:                {},
        scrollwheel:            true,
        maptype:                google.maps.MapTypeId.ROADMAP,

        mapTypeControl:         true,
        zoomControl:            true,
        panControl:             false,
        scaleControl:           false,
        streetViewControl:      true,

        html_prepend:            '<div class="gmap_marker">',
        html_append:            '</div>',
        icon:
        {
            image:                "http://www.google.com/mapfiles/marker.png",
            shadow:                "http://www.google.com/mapfiles/shadow50.png",
            iconsize:            [20, 34],
            shadowsize:            [37, 34],
            iconanchor:            [9, 34],
            infowindowanchor:    [9, 2]
        }
    }
})(jQuery);