$(document).ready(function() {
	//google.load('visualization', '1', {});
	/**
	 * The [C]hicago [P]othole [R]epair object
	 */
	var cpr = {
		/* ===== PROPERTIES ============================= */
		// Map properties
		mDOM : document.getElementById('theMap'), // the DOM object (div) in which to place the Google Map.
		mCtr : new google.maps.LatLng('41.845', '-87.669'), //initial center of the map
		mOpt : {
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
		pDURL : 'http://data.cityofchicago.org/api/views/ktq5-qe3d/rows.json?jsonp=?',
		pMkrs : Array(), // pothole Google Markers
		pInf : Array(), // pothole Info Windows
		pD : null, // pothole Data
		// Ward layer properties
		wLyr : null, // The Ward boundary map layer
		wTID : '3057562', // The Google Fusion Table ID for Ward Boundary data
		wCol : 'geometry', // The Fusion Table column that holds the Ward location data
		addr : false,
		gcodr : new google.maps.Geocoder(),
		aMkr : false,
		/* ===== METHODS =================================== */
		/**
		 * Add commas into numbers
		 */
		commas : function(theStr) {
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
		dCnt : function(rows) {
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
			});
			$("#numResults").fadeIn(function() {
				$("#numResults").html('<div class="alert alert-info"><strong>'+cpr.commas(rows)+' Open Requests</strong></div>');
			});
		},
		/**
		 * Factory method to open info boxes
		 * @param theMap
		 * @param theMarker
		 * @param theInfoWindow
		 * @returns {Function}
		 */
		oIBx : function(theMap,theMarker,theInfoBox) {
			return function() { theInfoBox.open(theMap,theMarker); };
		},
		cIBx : function(theMap,theMarker,theInfoBox) {
			return function() { theInfoBox.close(theMap,theMarker); };
		},
		/**
		 * This pot hole data handler
		 * @param pD
		 */
		pDH : function(dataParam) {
			if (dataParam == null)
			{
				isAddrSearch = true;
				markerLat = cpr.aMkr.getPosition().lat();
				markerLng = cpr.aMkr.getPosition().lng();
			}
			else
			{
				isAddrSearch = false;
				cpr.pD = dataParam;
			}
			numRows = parseInt(cpr.pD.data.length);
			potholeLatLng = Array();
			cpr.pMkrs = Array();
			potholeText = Array();
			cpr.pInf = Array();
			numShown = 0;
			for (var i=1;i<numRows;i++) {
				if(isAddrSearch == false || (
					isAddrSearch == true && 
					cpr.pD.data[i][13][1] != null &&
					cpr.pD.data[i][13][2] != null && (
						(cpr.pD.data[i][13][1] < (markerLat + 0.004)) &&
						(cpr.pD.data[i][13][1] > (markerLat - 0.004)) &&
						(cpr.pD.data[i][13][2] < (markerLng + 0.005)) &&
						(cpr.pD.data[i][13][2] > (markerLng - 0.005))
					)
				))
				{
					numShown++;
					potholeLatLng[i] = new google.maps.LatLng(cpr.pD.data[i][13][1],cpr.pD.data[i][13][2]);
					date = cpr.pD.data[i][8].replace('T00:00:00','');;
					potholeText[i] = '<div class="infoWindow" style="border:1px solid rgb(0,0,0); margin-top:8px; background:rgb(217,237,247); padding:5px; font-size:80%;">'+
						cpr.pD.data[i][12]+'<br />'+
						'Ticket: '+cpr.pD.data[i][11]+'<br />'+
						'Created: '+date+'<br /></div>';
					cpr.pMkrs[i] = new google.maps.Marker({
						position: potholeLatLng[i],
						map: theMap,
						icon: 'img/r.png'
					});
					pInfBoxOptions = {
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
					cpr.pInf[i] = new InfoBox(pInfBoxOptions);
					google.maps.event.addListener(cpr.pMkrs[i], 'mouseover', cpr.oIBx(theMap,cpr.pMkrs[i],cpr.pInf[i]));
					google.maps.event.addListener(cpr.pMkrs[i], 'click', cpr.oIBx(theMap,cpr.pMkrs[i],cpr.pInf[i]));
					google.maps.event.addListener(cpr.pMkrs[i], 'mouseout', cpr.cIBx(theMap,cpr.pMkrs[i],cpr.pInf[i]));
				}
			}
			cpr.dCnt(numShown);
		},
		/**
		 * Address Search
		 */
		aSrch : function() {
			cpr.addr = $("#address").val();
			if (cpr.addr != '' && cpr.addr != false)
			{ 
				cpr.addr += ' Chicago IL';
				cpr.gcodr.geocode({'address': cpr.addr}, function(results, status)
				{
					if (status == google.maps.GeocoderStatus.OK)
					{
						if(cpr.aMkr != false)
						{
							cpr.aMkr.setMap(null);
						}
						cpr.cMkrs();
						theMap.setCenter(results[0].geometry.location);
						theMap.setZoom(15);
						cpr.aMkr = new google.maps.Marker({
							position: results[0].geometry.location,
							map: theMap,
							animation: google.maps.Animation.DROP
						});
						cpr.pDH(null);
					}
					else
					{
						alert("We could not locate your address: " + status);
					}
				});
			}
			else
			{
				if(cpr.aMkr != false)
				{
					cpr.aMkr.setMap(null);
					cpr.cMkrs();
					theMap.setCenter(cpr.mCtr);
					theMap.setZoom(11);
					cpr.pDH(cpr.pD);
					$('#address').val('');
				}
			}
		},
		/**
		 * Clear All Markers
		 */
		cMkrs : function() {
			if (cpr.pMkrs.length > 0) {
				for (var i in cpr.pMkrs) {
					cpr.pMkrs[i].setMap(null);
					cpr.pInf[i].setMap(null);
				}
			}
		}
	};
	// END cpr object
	var theMap = new google.maps.Map(cpr.mDOM, cpr.mOpt);
	theMap.setCenter(cpr.mCtr);
	$.get(cpr.pDURL, cpr.pDH, 'jsonp');
	// Get the Ward Layer
	cpr.wLyr = new google.maps.FusionTablesLayer(cpr.wTID, {
		query : "SELECT " + cpr.wCol + " FROM " + cpr.wTID
	});
	// Ward Layer Event Listener
	$("#wards").click(function() {
		if ($("#wards").is(':checked')) {
			cpr.wLyr.setMap(theMap);
		} else {
			cpr.wLyr.setMap(null);
		}
	});
	// Address Search Form Listener
	$("#map-refresh").click(cpr.aSrch);
	// Map All listener
	$('#map-all').click(function(){
		if(cpr.aMkr != false)
		{
			cpr.aMkr.setMap(null);
			theMap.setCenter(cpr.mCtr);
			theMap.setZoom(11);
		}
		cpr.pDH(cpr.pD);
		$('#address').val('');
	});
	$('#toggle-more').click(function(ev) { 
		$('#content-more').toggle('fast'); 
		$('#toggle-more').text(($('#toggle-more').text() == 'Show more') ? 'Show less' : 'Show more');
	 });
	$("#theForm").submit(function() {
		return false;
	});
});