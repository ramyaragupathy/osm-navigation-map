var MapboxClient = require('mapbox/lib/services/datasets');
var dataset = 'ciotrgzko002ew8m29jh4lvhf';
var DATASETS_BASE = 'https://api.mapbox.com/datasets/v1/planemad/' + dataset + '/';
var mapboxAccessDatasetToken = 'sk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiY2lvdHNnd2xmMDBjb3VvbThmaXlsbnd5dCJ9.7Ui7o2K3U6flUzDGvYNZJw';
var mapbox = new MapboxClient(mapboxAccessDatasetToken);

mapboxgl.accessToken = 'pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/planemad/cinpwopfb008hcam0mqxbxwuq', //stylesheet location
    center: [-122.4310, 37.7638], // starting position
    zoom: 11, // starting zoom
    hash: true,
    attributionControl: false
});


map.addControl(new mapboxgl.Navigation());
var geocoder = new mapboxgl.Geocoder({
    container: 'geocoder-container' 
});

map.addControl(geocoder);



// Layer for review markers
var reviewedRestrictionsSource = new mapboxgl.GeoJSONSource({
    data: {}
});
var reviewedRestrictions = {
    'id': 'reviewedRestrictions',
    'type': 'circle',
    'source': 'reviewedRestrictionsSource',
    'interactive': true,
    'layout': {
        visibility: 'visible'
    },
    'paint': {
        'circle-radius': 15,
        'circle-color': '#5deb5e',
        'circle-blur': .9
    }
};

// Define switchable map layers
var toggleLayers = {
    'turn-restrictions': {
        'layers': ['noturn', 'noturn from', 'noturn via', 'noturn via highlight', 'noturn labels'],
        'title': 'Turn restrictions',
        'description': 'Junctions where a regular turn is prohibited'
    },
    'oneways': {
        'layers': ['oneways', 'oneways arrows'],
        'title': 'Oneway Streets',
        'description': 'Includes oneways segments part of a two way dual carriageway road'
    },
    'traffic-signals': {
        'layers': ['trafficsignals'],
        'title': 'Traffic signals',
        'description': 'Junctions with a street light'
    },
    'turn-lanes': {
        'layers': ['turnlanes'],
        'title': 'Turn lanes',
        'description': 'Streets with turn restricted lanes'
    },
    'maxspeed': {
        'layers': ['maxspeed', 'maxspeed labels'],
        'title': 'Speed limits',
        'description': 'Legal speed limits'
    }
};

// Define switchable map layer filters
var toggleFilters = {
    'mapbox-team': {
        'filter-mode': 'any',
        'filter-compare': ['==', 'meta_user'],
        'filter-values': ["ruthmaben", "PlaneMad", "srividya_c", "Chetan_Gowda", "ramyaragupathy", "nikhilprabhakar", "jinalfoflia", "pratikyadav", "aarthy", "oini", "Jothirnadh", "saikabhi", "geohacker", "shvrm", "manings", "sanjayb", "Arunasank", "nammala", "poornibadrinath"]
    }
}

// Parse the toggleFilters to build the compound filter arrays
function parseToggleFilters() {
    for (var filterItem in toggleFilters) {

        var parsedFilter = new Array();
        parsedFilter.push(toggleFilters[filterItem]['filter-mode']);

        for (var value in toggleFilters[filterItem]['filter-values']) {
            var filter = new Array();
            filter.push(toggleFilters[filterItem]['filter-compare'][0], toggleFilters[filterItem]['filter-compare'][1], toggleFilters[filterItem]['filter-values'][value]);
            parsedFilter.push(filter);
        }

        toggleFilters[filterItem]['filter'] = parsedFilter;
    }
}
parseToggleFilters();

// Map ready
map.on('style.load', function(e) {
    init();

    showOnlyLayers(toggleLayers, 'turn-restrictions');

    // Highlight only team edits
    // toggleLayerFilters('turn-restrictions','mapbox-team');

    // Toggle map layers list
    $('.toggles a').on('click', function(e) {
        e.preventDefault();
        var toggleItem = e.target.id.split('#')[0];

        // Highlight clicked item
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
        } else {
            $(this).addClass('active');
        }

        // Mapillary overlay toggle
        if (toggleItem === 'mapillary') {
            toggleMapillary();
        } else {
            var layers = toggleLayers[toggleItem].layers;
            for (var i in layers) {
                toggle(layers[i]);
            }
        }

        // Style layers toggle

        // Object.keys(toggleLayers).forEach(function (type) {
        //   if (type != listId) {
        //     hide(toggleLayers[type].id);
        //   }
        // });



        // setInfo(toggleItem);
    });
});

function init() {
    // do all initialisation stuff here
    var mapillaryTrafficSigns = {
        "type": "vector",
        "tiles": [
            // "https://crossorigin.me/http://mapillary-vector.mapillary.io/tiles/{z}/{x}/{y}.mapbox?ors=key,l,package,value,validated,image_key,user,score,obj,rect",
            "http://mapillary-vector.mapillary.io/tiles/{z}/{x}/{y}.mapbox?ors=key,l,package,value,validated,image_key,user,score,obj,rect",
        ],
        "minzoon": 16,
        "maxzoom": 16
    };

    var mapillaryCoverage = {
        "type": "vector",
        "tiles": [
            "https://d2munx5tg0hw47.cloudfront.net/tiles/{z}/{x}/{y}.mapbox"
        ],
        "minzoom": 2,
        "maxzoom": 16
    };

    map.addSource("mapillary", mapillaryTrafficSigns);
    map.addSource("mapillaryCoverage", mapillaryCoverage);
    map.addSource('reviewedRestrictionsSource', reviewedRestrictionsSource);
    map.addLayer(reviewedRestrictions);
    getFeatures();

    var mapillaryRestrictionsFilter = ["in", "value", "regulatory--no-left-turn--us", "regulatory--no-right-turn--us", "regulatory--no-straight-through--us", "regulatory--no-u-turn--us", "regulatory--no-left-or-u-turn--us"]

    var mapillaryTraffic = {
        "id": "mapillaryTraffic",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'ors',
        'layout': {
            'visibility': 'none'
        },
        "paint": {
            "circle-radius": 2,
            "circle-color": "white"
        }
    };

    var mapillaryTrafficRestrictions = {
        "id": "mapillaryTrafficRestrictions",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'ors',
        'layout': {
            'visibility': 'none'
        },
        "paint": {
            "circle-radius": 4,
            "circle-color": "#05d107"
        },
        "filter": mapillaryRestrictionsFilter
    };

    var mapillaryCoverageLine = {
        "id": "mapillaryCoverageLine",
        "type": "line",
        "source": "mapillaryCoverage",
        "source-layer": "mapillary-sequences",
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "line-color": '#007501',
            "line-width": 2,
            "line-opacity": 0.5
        }
    };

    var mapillaryCoverageLineDirection = {
        "id": "mapillaryCoverageLineDirection",
        "type": "symbol",
        "source": "mapillaryCoverage",
        "source-layer": "mapillary-sequences",
        "layout": {
            "icon-image": "mapillary-direction",
            "icon-rotation-alignment": "map",
            "icon-keep-upright": false,
            "symbol-spacing": 100,
            "icon-rotate": 90,
            "icon-allow-overlap": false,
            "symbol-placement": "line",
            "visibility": "none",
            "icon-size": {
                "base": 1,
                "stops": [
                    [
                        13,
                        0.3
                    ],
                    [
                        17,
                        0.6
                    ]
                ]
            },
            "icon-ignore-placement": false
        },
        "paint": {
            "icon-opacity": 1
        }
    };

    var mapillaryTrafficHighlight = {
        "id": "mapillaryTrafficHighlight",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'ors',
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "circle-radius": 5,
            "circle-color": "white"
        },
        "filter": ["==", "key", ""]
    };

    var mapillaryTrafficLabel = {
        "id": "mapillaryTrafficLabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "ors",
        "layout": {
            "text-field": "{value}",
            "text-size": 8,
            "text-offset": [0, 2],
            "visibility": "none"
        },
        "paint": {
            "text-color": "white",
            "text-halo-color": "black",
            "text-halo-width": 1
        }
    };

    var mapillaryTrafficRestrictionsLabel = {
        "id": "mapillaryTrafficRestrictionsLabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "ors",
        "layout": {
            "text-field": "{value}",
            "text-size": 12,
            "text-offset": [0, 2],
            "visibility": "none"
        },
        "paint": {
            "text-color": "#05d107",
            "text-halo-color": "black",
            "text-halo-width": 1
        },
        "filter": mapillaryRestrictionsFilter
    };

    map.addLayer(mapillaryCoverageLine, 'noturn');
    map.addLayer(mapillaryCoverageLineDirection);
    map.addLayer(mapillaryTrafficHighlight);
    map.addLayer(mapillaryTraffic, 'noturn');
    map.addLayer(mapillaryTrafficLabel);
    map.addLayer(mapillaryTrafficRestrictions, 'noturn');
    map.addLayer(mapillaryTrafficRestrictionsLabel);


    map.on('click', function(e) {

        var mapillaryRestrictions = map.queryRenderedFeatures([
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ], {
            layers: ['mapillaryTraffic']
        });


        if (mapillaryRestrictions.length) {
            var imageKey = mapillaryRestrictions[0].properties.image_key;
            var imageUrl = 'https://d1cuyjsrcm0gby.cloudfront.net/' + imageKey + '/thumb-640.jpg';
            map.setFilter('mapillaryTrafficHighlight', ['==', 'key', mapillaryRestrictions[0].properties.key]);
            $('#mapillary-image').removeClass('hidden');
            $('#mapillary-image').attr('src', imageUrl);

            openInJOSM();

        }

        // Show popup of OSM feature
        var osmFeature = map.queryRenderedFeatures(e.point, {
            layers: ['noturn']
        });
        if (osmFeature.length) {

            // Check if feature is node or a way
            var osmType = osmFeature[0].geometry.type == 'LineString' ? 'way' : 'node';
            var point = osmType == 'way' ? e.lngLat : osmFeature[0].geometry.coordinates;
            var popupHTML = "<strong>OpenStreetMap Turn Restriction</strong><br>" + osmType + "</b>: <a href='https://www.openstreetmap.org/" + osmType + "/" + osmFeature[0].properties.id + "'>" + osmFeature[0].properties.id + "</a>"

            var popup = new mapboxgl.Popup()
                .setLngLat(point)
                .setHTML(popupHTML)
                .addTo(map);
            openInJOSM();
        }

        // Add review marker
        var newfeaturesGeoJSON = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "coordinates": [

                ],
                "type": "Point"
            },

        };

        // Create review popup if there is a mapillary restriction nearby
        if (mapillaryRestrictions.length) {

            var restriction = mapillaryRestrictions[0].properties.value;

            if (!featuresGeoJSON.features.length) {
                console.log("This is an empty dataset");
                provideOptions();

            } else {

                var reviewedFeatures = map.queryRenderedFeatures(e.point, {
                    layers: ['reviewedRestrictions']
                });
                if (reviewedFeatures.length) {
                    provideOptions(reviewedFeatures[0]);

                    // var popupHTML = "<h3>" + restriction + "</h3>" + "already reviewed as " + reviewedFeatures[0].properties["status"];
                    // var popup = new mapboxgl.Popup()
                    //     .setLngLat(e.lngLat)
                    //     .setHTML(popupHTML)
                    //     .addTo(map);

                } else {
                    provideOptions();
                }
            }

            function provideOptions(feature) {
                var formOptions = "<div class='radio-pill pill pad2y clearfix'><input id='valid' type='radio' name='review' value='valid' checked='checked'><label for='valid' class='col4 button short icon check fill-green'>Valid</label><input id='redundant' type='radio' name='review' value='redundant'><label for='redundant' class='col4 button short icon check fill-mustard'>Redundant</label><input id='invalid' type='radio' name='review' value='invalid'><label for='invalid' class='col4 button icon short check fill-red'>Invalid</label></div>";
                var formNotes = "<fieldset><label>Notes</label><textarea name=''></textarea></fieldset>"
                var popupHTML = "<h3>" + restriction + "</h3>" + formOptions + "<input id='saveReview' class='button col4' value='Save'>";
                var popup = new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(popupHTML)
                    .addTo(map);

                // Show existing status if available
                if (feature) {
                    $("input[name=review][value=" + feature.properties["status"] + "]").prop('checked', true);
                    newfeaturesGeoJSON = feature;
                    newfeaturesGeoJSON["id"] = feature.properties["id"];
                    console.log(feature);
                } else {
                    newfeaturesGeoJSON.properties["name"] = restriction;
                    newfeaturesGeoJSON.geometry.coordinates = e.lngLat.toArray();
                }

                // Update dataset on clicking save
                document.getElementById("saveReview").onclick = function() {
                    newfeaturesGeoJSON.properties["status"] = $("input[name=review]:checked").val();
                    // newfeaturesGeoJSON.properties["description"] = description;
                    popup.remove();
                    mapbox.insertFeature(newfeaturesGeoJSON, dataset, function(err, response) {
                        console.log(response);
                        featuresGeoJSON.features = featuresGeoJSON.features.concat(response);
                        reviewedRestrictionsSource.setData(featuresGeoJSON);
                    });
                }
            }
        }
    });

    map.on('load', function() {
        // Set feature counts
        var turnrestrictionsCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'turnrestrictions'
        }).length;
        var onewayCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'road'
        }).length;
        var turnlanesCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'turnlanes'
        }).length;
        var trafficsignalsCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'trafficsignals'
        }).length;
        var speedCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'maxspeed'
        }).length;
        var mapillaryphotoCount = map.querySourceFeatures('mapillary', {
            'sourceLayer': 'ors'
        }).length;

        $('#turn-restriction-count').text(Math.floor(turnrestrictionsCount / 3));
        $('#oneway-count').text(onewayCount);
        $('#turn-lanes-count').text(turnlanesCount);
        $('#traffic-signals-count').text(trafficsignalsCount);
        $('#maxspeed-count').text(speedCount);
    });
}



function toggleMapillary() {
    var mapillaryLayers = ['mapillaryCoverageLine', 'mapillaryCoverageLineDirection', 'mapillaryTrafficHighlight', 'mapillaryTraffic', 'mapillaryTrafficRestrictions', 'mapillaryTrafficLabel', 'mapillaryTrafficRestrictionsLabel'];
    mapillaryLayers.forEach(function(id) {
        var currentState = map.getLayoutProperty(id, 'visibility');
        var nextState = currentState === 'none' ? 'visible' : 'none';
        map.setLayoutProperty(id, 'visibility', nextState);
    });
    if (!$("#mapillary-image").hasClass('hidden')) {
        $("#mapillary-image").addClass('hidden');
    }
}

// Get data from a Mapbox dataset
var featuresGeoJSON = {
    'type': 'FeatureCollection',
    'features': []
};

function getFeatures(startID) {

    var url = DATASETS_BASE + 'features';
    var params = {
        'access_token': mapboxAccessDatasetToken
    };

    // Begin with the last feature of previous request
    if (startID) {
        params.start = startID;
    }

    $.getJSON(url, params, function(data) {

        console.log(data);

        if (data.features.length) {
            data.features.forEach(function(feature) {
                // Add dataset feature id as a property
                feature.properties.id = feature.id;
            });
            featuresGeoJSON.features = featuresGeoJSON.features.concat(data.features);
            var lastFeatureID = data.features[data.features.length - 1].id;
            getFeatures(lastFeatureID);
            reviewedRestrictionsSource.setData(featuresGeoJSON);
        }
        reviewedRestrictionsSource.setData(featuresGeoJSON);
    });
}

// Toggle visibility of a layer
function toggle(id) {
    var currentState = map.getLayoutProperty(id, 'visibility');
    var nextState = currentState === 'none' ? 'visible' : 'none';
    map.setLayoutProperty(id, 'visibility', nextState);
}

// Show only a specific group of layers
function showOnlyLayers(toggleLayers, showLayerItem) {
    for (var layerItem in toggleLayers) {
        for (var layer in toggleLayers[layerItem].layers) {
            if (showLayerItem == layerItem)
                map.setLayoutProperty(toggleLayers[layerItem].layers[layer], 'visibility', 'visible');
            else
                map.setLayoutProperty(toggleLayers[layerItem].layers[layer], 'visibility', 'none');
        }
    }
    // Highlight menu items
    $('.toggles a').removeClass('active');
    $('#' + showLayerItem).addClass('active');
}



// Toggle a set of filters for a set of layers
function toggleLayerFilters(layerItems, filterItem) {

    for (var i in layerItems) {
        for (var j in toggleLayers[layerItems[i]].layers) {

            var existingFilter = map.getFilter(toggleLayers[layerItems[i]].layers[j]);

            // Construct and add the filters if none exist for the layers
            if (typeof existingFilter == 'undefined') {
                map.setFilter(toggleLayers[layerItems[i]].layers[j], toggleFilters[filterItem].filter);
            } else {
                // Not implemented
                var newFilter = mergeLayerFilters(existingFilter, toggleFilters[filterItem].filter);
                map.setFilter(toggleLayers[layerItems[i]].layers[j], newFilter);
                // console.log(newFilter);
            }

        }
    }
}

// Merge two GL layer filters into one
function mergeLayerFilters(existingFilter, mergeFilter) {
    var newFilter = new Array();

    // If the layer has a simple single filter
    if (existingFilter[0] == '==') {
        newFilter.push("all", existingFilter, mergeFilter)
    }

    return newFilter;
}

function openInJOSM() {
    //Open map location in JOSM
    var bounds = map.getBounds();
    var top = bounds.getNorth();
    var bottom = bounds.getSouth();
    var left = bounds.getWest();
    var right = bounds.getEast();
    // var josmUrl = 'https://127.0.0.1:8112/load_and_zoom?left='+left+'&right='+right+'&top='+top+'&bottom='+bottom;
    var josmUrl = 'http://127.0.0.1:8111/load_and_zoom?left=' + left + '&right=' + right + '&top=' + top + '&bottom=' + bottom;
    $.ajax(josmUrl, function() {});
}
