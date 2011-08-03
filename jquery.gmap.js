/**
 * jQuery gMap v3
 *
 * @url         http://www.smashinglabs.pl/gmap
 * @author      Sebastian Poreba <sebastian.poreba@gmail.com>
 * @version     3.1.0
 * @date        23.04.2011
 */
/*jslint white: true, undef: true, regexp: true, plusplus: true, bitwise: true, newcap: true, strict: true, devel: true, maxerr: 50, indent: 4 */
/*global window, jQuery, $, google, $googlemaps */
(function ($) {

    // global google maps objects 
    var $googlemaps = google.maps,
        $geocoder = new $googlemaps.Geocoder(),
        opts = {},        
        $markersToLoad = 0,        
        methods = {
            init: function (options) {
                // Build main options before element iteration
                opts = $.extend({}, $.fn.gMap.defaults, options);

                // recover icon array
                for(var k in $.fn.gMap.defaults.icon) {
                    if(!opts.icon[k]) {
                        opts.icon[k] = $.fn.gMap.defaults.icon[k];
                    }
                }

                // Iterate through each element
                return this.each(function () {                	
                    var $this = $(this),
                        center = methods._getMapCenter.apply($this, []),    
                        mapZoom = (opts.zoom === "auto") ? 2 : opts.zoom,
                        mapOptions = {
                            zoom: mapZoom,
                            center: center,
                            mapTypeControl: opts.mapTypeControl,
                            zoomControl: opts.zoomControl,
                            panControl : opts.panControl,
                            scaleControl : opts.scaleControl,
                            streetViewControl: opts.streetViewControl,
                            mapTypeId: opts.maptype,
                            scrollwheel: opts.scrollwheel,
                            maxZoom: opts.maxZoom,
                            minZoom: opts.minZoom
                        };

                    if (opts.log) {console.log('map center is:');}
                    if (opts.log) {console.log(center);}

                    // Create map and set initial options
                    var $gmap = new $googlemaps.Map(this, mapOptions);
                    $this.data("$gmap", $gmap);

                    $this.data('gmap', {
                       'opts': opts,
                       'gmap': $gmap,
                       'markers': [],
                       'markerKeys' : {},
                       'infoWindow': null
                    });

                    // Check for map controls
                    if (opts.controls.length !== 0) {
                        // Add custom map controls
                        for (var i = 0; i < opts.controls.length; i+= 1) {
                            $gmap.controls[opts.controls[i].pos].push(opts.controls[i].div);
                        }
                    }
                    
                    if (opts.markers !== 0){
                    	methods.addMarkers.apply($this, [opts.markers]);
                    }
                    
                    if (opts.zoom === "auto"){
                    	methods.autoZoom.apply($this, []);
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

            _setMapCenter: function (center) {
                if (opts.log) {console.log('delayed setMapCenter called');}
                var $data = this.data('gmap');
                if ($data.gmap !== undefined) {
                    $data.gmap.setCenter(center);
                } else {
                    var that = this;
                    window.setTimeout(function() {methods._setMapCenter.apply(that,[center]);}, 500);
                }
                return this;
            },
            
            setZoom: function (zoom) {
            	var $map = this.data('$gmap');
            	if (zoom === "auto"){
                	methods.autoZoom.apply($(this), []);
                } else {
                	$map.setZoom(parseInt(zoom));
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

                var center, that = this; // 'that' scope fix in geocoding
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
                            function(result, status) {
                                if (status === google.maps.GeocoderStatus.OK) {
                                    methods._setMapCenter.apply(that,[result[0].geometry.location]);
                                } else {
                                    if (opts.log) {console.log("Geocode was not successful for the following reason: " + status);}
                                }
                            });
                    return center;
                }

                // Check for a marker to center on (if no coordinates given)
                if ($.isArray(opts.markers) && opts.markers.length > 0) {
                    var selectedToCenter = null;
                    for (var i = 0; i < opts.markers.length; i+= 1) {
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
                                function(result, status) {
                                    if (status === google.maps.GeocoderStatus.OK) {
                                        methods._setMapCenter.apply(that,[result[0].geometry.location]);
                                    } else {
                                        if (opts.log) {console.log("Geocode was not successful for the following reason: " + status);}
                                    }
                                });
                    }
                }
                return center;
            },

            getRoute: function (options) {
            	
                var $data = this.data('gmap'), 
                $gmap = $data.gmap,
                $directionsDisplay = new $googlemaps.DirectionsRenderer(),
                $directionsService = new $googlemaps.DirectionsService(),
                $travelModes = { 'BYCAR': $googlemaps.DirectionsTravelMode.DRIVING, 'BYBICYCLE': $googlemaps.DirectionsTravelMode.BICYCLING, 'BYFOOT': $googlemaps.DirectionsTravelMode.WALKING },
                $travelUnits = { 'MILES': $googlemaps.DirectionsUnitSystem.IMPERIAL, 'KM': $googlemaps.DirectionsUnitSystem.METRIC },
                displayObj = null,
                travelMode = null;
                unitSystem = null;
            
                // look if there is an individual or otherwise a default object for this call to display route text informations
                if(options.routeDisplay !== undefined){					
                    displayObj = (options.routeDisplay instanceof jQuery) ? options.routeDisplay[0] : ((typeof options.routeDisplay == "string") ? $(options.routeDisplay)[0] : null);
                } else if($data.opts.routeDisplay !== null){
                    displayObj = ($data.opts.routeDisplay instanceof jQuery) ? $data.opts.routeDisplay[0] : ((typeof $data.opts.routeDisplay == "string") ? $($data.opts.routeDisplay)[0] : null);
                } 
            
                // set route renderer to map
                $directionsDisplay.setMap($gmap);
                if(displayObj !== null){ 
                    $directionsDisplay.setPanel(displayObj);
                }
            
                // get travel mode and unit
                travelMode = ($travelModes[$data.opts.travelMode] !== undefined) ? $travelModes[$data.opts.travelMode] : $travelModes['BYCAR'];
                travelUnit = ($travelUnits[$data.opts.travelUnit] !== undefined) ? $travelUnits[$data.opts.travelUnit] : $travelUnits['KM'];
                
                // build request
                var request = {
                    origin: options.from,
                    destination: options.to,
                    travelMode: travelMode,
                    unitSystem: travelUnit,
                };
            
                // send request
                $directionsService.route(request, function(result, status) {
                    // show the rout or otherwise show an error message in a defined container for route text information 
                    if (status == $googlemaps.DirectionsStatus.OK) {
                        $directionsDisplay.setDirections(result);
                    } else if(displayObj !== null){						
                        $(displayObj).html($data.opts.routeErrors[status]);
                    }
                });
                return this;
            },

            processMarker: function (marker, gicon, gshadow, location) {
                var $data = this.data('gmap'),
                    $gmap = $data.gmap;

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

                var gmarker = new $googlemaps.Marker({
                    position: location,
                    icon: gicon,
                    title: marker.title,
                    map: $gmap
                });
                gmarker.setShadow(gshadow);

                $data.markers.push(gmarker);
                if(marker.key) {$data.markerKeys[marker.key] = gmarker; }

                // Set HTML and check if info window should be opened
                var infoWindow;
                if (marker.html) {
                    var infoOpts = {
                        content: opts.html_prepend + marker.html + opts.html_append,
                        pixelOffset: marker.infoWindowAnchor
                    };

                    if (opts.log) {console.log('setup popup with data');}
                    if (opts.log) {console.log(infoOpts);}
                    infoWindow = new $googlemaps.InfoWindow(infoOpts);

                    $googlemaps.event.addListener(gmarker, 'click', function() {
                        if (opts.log) {console.log('opening popup ' + marker.html);}
                        if (opts.singleInfoWindow && $data.infoWindow) {$data.infoWindow.close();}
                        infoWindow.open($gmap, gmarker);
                        $data.infoWindow = infoWindow;
                    });
                }
                if (marker.html && marker.popup) {
                    if (opts.log) {console.log('opening popup ' + marker.html);}
                    infoWindow.open($gmap, gmarker);
                }

            },

            _geocodeMarker: function (marker, gicon, gshadow) {
            	$markersToLoad += 1;
                var that = this;

                $geocoder.geocode({'address': marker.address}, function(results, status) {
                    $markersToLoad -= 1;
                    if (status === $googlemaps.GeocoderStatus.OK) {
                        methods.processMarker.apply( that, [marker, gicon, gshadow, results[0].geometry.location] );
                    } else {
                        if (opts.log) {console.log("Geocode was not successful for the following reason: " + status);}
                    }
                });
            },
            
            autoZoom: function (){
                var markers = this.data('gmap').markers,
                $map = this.data('$gmap'),
                bounds = new $googlemaps.LatLngBounds(),
                that = this;
            
                // autoloop if there are still markers to load, for example of geocoding delays
                if($markersToLoad !== 0) {
                    window.setTimeout(function () { methods.autoZoom.apply(that, [])}, 500);
                    return;
                }
            
                if (opts.log) {console.log("autozooming map");}
            
                // get position from every marker and extend the "bounds" object with new coordinates
                for(i = 0; i < markers.length; i += 1) {
                    bounds.extend(markers[i].getPosition()); 
                }
            
                // if there were markers, now fit the bounds of the map
                if(i>0){
                    $map.fitBounds(bounds);
                }
                return this;
            },
            
            addMarkers: function (markers){        	
                if (markers.length !== 0) {
                    if (opts.log) {console.log("adding " + markers.length +" markers");}
                    // Loop through marker array
                    for (var i = 0; i < markers.length; i+= 1) {
                        methods.addMarker.apply($(this),[markers[i]]);
                    }
                }
            	return this;
            },
            
            addMarker: function (marker) {
                if (opts.log) {console.log("putting marker at " + marker.latitude + ', ' + marker.longitude + " with address " + marker.address + " and html "  + marker.html);}

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
                    anchor: _gicon.iconAnchor
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

                    if (opts.log) {console.log('geocoding marker: ' + marker.address);}
                    // Get the point for given address
                    methods._geocodeMarker.apply( this, [marker, gicon, gshadow] );
                }
                else {
                    // Check for reference to the marker's latitude/longitude
                    if (marker.html === '_latlng') {
                        marker.html = marker.latitude + ', ' + marker.longitude;
                    }

                    if (marker.title == '_latlng') {
                        marker.title = marker.latitude + ', ' + marker.longitude;
                    }

                    // Create marker
                    var gpoint = new $googlemaps.LatLng(marker.latitude, marker.longitude);
                    methods.processMarker.apply(this, [marker, gicon, gshadow, gpoint] );
                }
                return this;
            },

            removeAllMarkers: function () {
                var markers = this.data('gmap').markers, i;

                for(i = 0; i < markers.length; i += 1) {
                    markers[i].setMap(null);
                }
                markers = [];
            },
            
            getMarker: function (key) {
                return this.data('gmap').markerKeys[key];
            }
        };


    // Main plugin function
    $.fn.gMap = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this,Array.prototype.slice.call(arguments,1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this,arguments);
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

        singleInfoWindow:        true,

        html_prepend:            '<div class="gmap_marker">',
        html_append:             '</div>',
        icon: {
            image:               "http://www.google.com/mapfiles/marker.png",
            iconsize:            [20, 34],
            iconanchor:          [9, 34],
            infowindowanchor:    [9, 2],
            shadow:              "http://www.google.com/mapfiles/shadow50.png",
            shadowsize:          [37, 34]
        },

        onComplete:              function() {},
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
    };
}(jQuery));