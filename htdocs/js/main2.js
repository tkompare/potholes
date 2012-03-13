$(document).ready(function() {
	/**
	 * The [C]hicago [P]othole [R]epair object
	 */
	var cpr = {
			// Map properties
			mapDOM : document.getElementById('theMap'), // the DOM object (div) in which to place the Google Map.
			mapCenter : new google.maps.LatLng('41.845', '-87.669'), //initial center of the map
			mapOptions : {
				zoom : 11,
				mapTypeControl : true,
				streetViewControl : false,
				panControl : false,
				zoomControl : true,
				zoomControlOptions : {
					style : google.maps.ZoomControlStyle.SMALL,
					position : google.maps.ControlPosition.LEFT_TOP
				},
				mapTypeId : google.maps.MapTypeId.TERRAIN
			},
			// Pot hole properties
			potholeDataURL : 'http://data.cityofchicago.org/api/views/ktq5-qe3d/rows.json?jsonp=?'
	};
	var theMap = new google.maps.Map(cpr.mapDOM, cpr.mapOptions);
	theMap.setCenter(cpr.mapCenter);
	$.get(cpr.potholeDataURL, potholeDataHandler, 'jsonp');
	function potholeDataHandler (potholeData) {
		numRows = parseInt(potholeData.data.length);
		displayCount();
		potholeLatLng = Array();
		potholeMarkers = Array();
		potholeText = Array();
		potholeInfo = Array();
		function openInfoWindow(theMap,theMarker,theInfoWindow) {
			return function() { theInfoWindow.open(theMap,theMarker); };
		}
		for (var i=1;i<numRows;i++) {
				potholeLatLng[i] = new google.maps.LatLng(potholeData.data[i][13][1],potholeData.data[i][13][2]);
				date = potholeData.data[i][8].replace('T00:00:00','');;
				potholeText[i] = '<div class="infoWindow" style="border:1px solid rgb(188,232,241); margin-top:8px; background:rgb(217,237,247); padding:5px; font-size:80%;">'+
					potholeData.data[i][12]+'<br />'+
					'Ticket: '+potholeData.data[i][11]+'<br />'+
					'Created: '+date+'<br /></div>';
				potholeMarkers[i] = new google.maps.Marker({
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
				}
				potholeInfo[i] = new InfoBox(potholeInfoBoxOptions);
				google.maps.event.addListener(potholeMarkers[i], 'click', openInfoWindow(theMap,potholeMarkers[i],potholeInfo[i]));
		}
		/**
		 * Getting pothole Count
		 */
		function displayCount() {
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
			});
			$("#numResults").fadeIn(function() {
				$("#numResults").html('<div class="alert alert-info"><strong>'+addCommas(numRows)+' Open Requests</strong></div>');
			});
		}
	}
	/**
	 * Add commas into numbers
	 */
	function addCommas(theStr) {
		theStr += '';
		cpr.subStr = theStr.split('.');
		cpr.subStr1 = cpr.subStr[0];
		cpr.subStr2 = cpr.subStr.length > 1 ? '.' + cpr.subStr[1] : '';
		cpr.regx = /(\d+)(\d{3})/;
		while (cpr.regx.test(cpr.subStr1))
		{
			cpr.subStr1 = cpr.subStr1.replace(cpr.regx, '$1' + ',' + '$2');
		}
		return cpr.subStr1 + cpr.subStr2;
	}
});