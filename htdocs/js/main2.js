$(document).ready(function() {
	//google.load('visualization', '1', {});
	/**
	 * The [C]hicago [P]othole [R]epair object
	 */
	var cpr = {
		/* ===== PROPERTIES ============================= */
		// Map properties
		mapDOM : document.getElementById('theMap'), // the DOM object (div) in which to place the Google Map.
		mapCenter : new google.maps.LatLng('41.845', '-87.669'), //initial center of the map
		mapOptions : {
			zoom : 11,
			mapTypeControl : true,
			mapTypeId : google.maps.MapTypeId.TERRAIN,
			streetViewControl : false,
			panControl : false,
			zoomControl : true,
			zoomControlOptions : {
				style : google.maps.ZoomControlStyle.SMALL,
				position : google.maps.ControlPosition.LEFT_TOP
			}
		},
		// Pot hole properties
		potholeDataURL : 'http://data.cityofchicago.org/api/views/ktq5-qe3d/rows.json?jsonp=?',
		potholeMarkers : Array(),
		potholeInfo : Array(),
		potholeData : null,
		// Ward layer properties
		wardLayer : null, // The Ward boundary map layer
		wardTableId : '3057562', // The Google Fusion Table ID for Ward Boundary data
		wardColumn : 'geometry', // The Fusion Table column that holds the Ward location data
		theAddress : false,
		geocoder : new google.maps.Geocoder(),
		addrMarker : false,
		/* ===== METHODS =================================== */
		/**
		 * Add commas into numbers
		 */
		addCommas : function(theStr) {
			theStr += '';
			subStr = theStr.split('.');
			subStr1 = subStr[0];
			subStr2 = subStr.length > 1 ? '.' + subStr[1] : '';
			regx = /(\d+)(\d{3})/;
			while (regx.test(subStr1))
			{
				subStr1 = subStr1.replace(regx, '$1' + ',' + '$2');
			}
			return subStr1 + subStr2;
		},
		/**
		 * Display the pot hole Count
		 */
		displayCount : function(rows) {
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
			});
			$("#numResults").fadeIn(function() {
				$("#numResults").html('<div class="alert alert-info"><strong>'+cpr.addCommas(rows)+' Open Requests</strong></div>');
			});
		},
		/**
		 * Factory method to open info boxes
		 * @param theMap
		 * @param theMarker
		 * @param theInfoWindow
		 * @returns {Function}
		 */
		openInfoBox : function(theMap,theMarker,theInfoBox) {
			return function() { theInfoBox.open(theMap,theMarker); };
		},
		/**
		 * This pot hole data handler
		 * @param potholeData
		 */
		potholeDataHandler : function(dataParam) {
			if (dataParam == null)
			{
				isAddrSearch = true;
				markerLat = cpr.addrMarker.getPosition().lat();
				markerLng = cpr.addrMarker.getPosition().lng();
			}
			else
			{
				isAddrSearch = false;
				cpr.potholeData = dataParam;
			}
			numRows = parseInt(cpr.potholeData.data.length);
			potholeLatLng = Array();
			cpr.potholeMarkers = Array();
			potholeText = Array();
			cpr.potholeInfo = Array();
			numShown = 0;
			for (var i=1;i<numRows;i++) {
				if(isAddrSearch == false || (
					isAddrSearch == true && 
					cpr.potholeData.data[i][13][1] != null &&
					cpr.potholeData.data[i][13][2] != null && (
						(cpr.potholeData.data[i][13][1] < (markerLat + 0.004)) &&
						(cpr.potholeData.data[i][13][1] > (markerLat - 0.004)) &&
						(cpr.potholeData.data[i][13][2] < (markerLng + 0.005)) &&
						(cpr.potholeData.data[i][13][2] > (markerLng - 0.005))
					)
				))
				{
					numShown++;
					potholeLatLng[i] = new google.maps.LatLng(cpr.potholeData.data[i][13][1],cpr.potholeData.data[i][13][2]);
					date = cpr.potholeData.data[i][8].replace('T00:00:00','');;
					potholeText[i] = '<div class="infoWindow" style="border:1px solid rgb(188,232,241); margin-top:8px; background:rgb(217,237,247); padding:5px; font-size:80%;">'+
						cpr.potholeData.data[i][12]+'<br />'+
						'Ticket: '+cpr.potholeData.data[i][11]+'<br />'+
						'Created: '+date+'<br /></div>';
					cpr.potholeMarkers[i] = new google.maps.Marker({
						position: potholeLatLng[i],
						map: theMap,
						icon: 'img/r.png'
					});
					potholeInfoBoxOptions = {
						content: potholeText[i]
						,disableAutoPan: false
						,maxWidth: 0
						,pixelOffset: new google.maps.Size(-140, 0)
						,zIndex: null
						,boxStyle: { 
							background: "url('img/tipbox.gif') no-repeat"
							,opacity: 0.95
							,width: "160px"
						}
						,closeBoxMargin: "10px 2px 2px 2px"
						,closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif"
						,infoBoxClearance: new google.maps.Size(1, 1)
						,isHidden: false
						,pane: "floatPane"
						,enableEventPropagation: false
					};
					cpr.potholeInfo[i] = new InfoBox(potholeInfoBoxOptions);
					google.maps.event.addListener(cpr.potholeMarkers[i], 'click', cpr.openInfoBox(theMap,cpr.potholeMarkers[i],cpr.potholeInfo[i]));
				}
			}
			cpr.displayCount(numShown);
		},
		addressSearch : function() {
			cpr.theAddress = $("#address").val();
			if (cpr.theAddress != '' && cpr.theAddress != false)
			{ 
				cpr.theAddress += ' Chicago IL';
				cpr.geocoder.geocode({'address': cpr.theAddress}, function(results, status)
				{
					if (status == google.maps.GeocoderStatus.OK)
					{
						if(cpr.addrMarker != false)
						{
							cpr.addrMarker.setMap(null);
						}
						cpr.clearMarkers();
						theMap.setCenter(results[0].geometry.location);
						theMap.setZoom(15);
						cpr.addrMarker = new google.maps.Marker({
							position: results[0].geometry.location,
							map: theMap,
							animation: google.maps.Animation.DROP
						});
						cpr.potholeDataHandler(null);
					}
					else
					{
						alert("We could not locate your address: " + status);
					}
				});
			}
			else
			{
				if(cpr.addrMarker != false)
				{
					cpr.addrMarker.setMap(null);
				}
			}
		},
		clearMarkers : function() {
			alert('clearing markers');
			if (cpr.potholeMarkers.length > 0) {
				for (var i=1; i<cpr.potholeMarkers.length; i++ ) {
					cpr.potholeMarkers[i].setMap(null);
					cpr.potholeInfo[i].setMap(null);
				}
			}

		}
	};
	// END cpr object
	var theMap = new google.maps.Map(cpr.mapDOM, cpr.mapOptions);
	theMap.setCenter(cpr.mapCenter);
	$.get(cpr.potholeDataURL, cpr.potholeDataHandler, 'jsonp');
	// Get the Ward Layer
	cpr.wardLayer = new google.maps.FusionTablesLayer(cpr.wardTableId, {
		query : "SELECT " + cpr.wardColumn + " FROM " + cpr.wardTableId
	});
	// Ward Layer Event Listener
	$("#wards").click(function() {
		if ($("#wards").is(':checked')) {
			cpr.wardLayer.setMap(theMap);
		} else {
			cpr.wardLayer.setMap(null);
		}
	});
	// Address Search Form Listener
	$("#map-refresh").click(cpr.addressSearch);
	// Map All listener
	$('#map-all').click(function(){
		if(cpr.addrMarker != false)
		{
			cpr.addrMarker.setMap(null);
			theMap.setCenter(cpr.mapCenter);
			theMap.setZoom(11);
		}
		cpr.potholeDataHandler(cpr.potholeData);
		$('#address').val('');
	});
});