google.load('visualization', '1', {});
$(document).ready(function() {
		/*
		 * Address Help tool-tip
		 */
		$('#help-address').tooltip();
		/*
		* Set up various variables
		*/
		var cpr = {}; // The local master object: cpr: (C)hicago (P)othole (R)epair
		cpr.mapDOM = document.getElementById('theMap'); // the DOM object (div) in which to place the Google Map.
		cpr.CenterLatLng = new google.maps.LatLng('41.845', '-87.669'); //initial center of the map
		cpr.potholeLayer = null; // the pothole data map layer
		cpr.potholeTableId = '3142020'; // the Google Fusion Table ID for pothole data
		cpr.potholeColumn = 'LOCATION'; // the Fusion Table column than holds the pothole location data
		cpr.wardLayer = null; // The Ward boundary map layer
		cpr.wardTableId = '3057562'; // The Google Fusion Table ID for Ward Boundary data
		cpr.wardColumn = 'geometry'; // The Fusion Table column that holds the Ward location data
		cpr.queryString = null; // The pothole data query string
		cpr.countQueryString = null; // The pothole data selection count
		cpr.insertAnd = ''; // set to 'AND' if the cpr.queryString needs an AND clause
		cpr.geocoder = new google.maps.Geocoder(); // Google Maps geocoder object.
		cpr.searchRadius = '805'; // Search radius for address-based search.
		cpr.addrMarker = false; // Google Maps marker object.
		cpr.isStatsRequest = false; // 'true' if we we need stats
		cpr.isAddressRequest = false; // 'true' if use filled out address.
		cpr.createDates = new Array(); // pothole create dates.
		cpr.completeDates = new Array(); // pothole completeion dates
		cpr.dateDiffs = new Array(); // difference between create and completion dates.
		cpr.total = new Array(); // holds the count of pothole requests for bar graph.
		cpr.flot = new Array(); // the data to send to the bar graph
		cpr.openComplete = null; // used in title of bar graph div
		cpr.i = null; // iterator
		cpr.statResults = {}; // stats results object
		cpr.queryText = null; // query text used for stats
		cpr.numRows = null; // number of rows returned
		cpr.subStr = null; // used to insert commas in numbers
		cpr.subStr1 = null; // used to insert commas in numbers
		cpr.subStr2 = null; // used to insert commas in numbers
		cpr.regex = null; // used to insert commas in numbers
		cpr.myOptions = {
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
		}; // Google Map settings
		cpr.radiusCircle = null; // The radius circle object for the map
		cpr.radiusCircleOptions = null; // The radius circle's appearance
		/*
		 * Make the base map
		 */
		cpr.theMap = new google.maps.Map(cpr.mapDOM, cpr.myOptions); // The Google Map object
		cpr.theMap.setCenter(cpr.CenterLatLng);
		/* 
		 * Add the pothole Data Layer.
		 */
		function setQueryString() {
			cpr.isStatsRequest = false;
			cpr.queryString = "SELECT " + cpr.potholeColumn + " FROM " + cpr.potholeTableId;
		}
		setQueryString();
		cpr.potholeLayer = new google.maps.FusionTablesLayer(cpr.potholeTableId, {
			query : cpr.queryString
		});
		cpr.potholeLayer.setMap(cpr.theMap);
		displayCount(cpr.queryString,false);
		/*
		 * pothole Data Listeners
		 */
		$("#map-refresh").click(function() {
			cpr.yearCreation = $("#year-creation").val();
			cpr.yearCompleted = $("#year-completed").val();
			cpr.address = $("#address").val();
			if (cpr.yearCreation == 'none' || cpr.yearCompleted == 'none')
			{
				$("#yearWarn").html('<div class="alert alert-error alert-block"><a class="close" data-dismiss="alert">x</a>Choose both a Request and Completion year.</div>');
			}
			else
			{
				setQueryString();
				if (cpr.yearCreation != 'all' || cpr.yearCompleted != 'all')
				{
					cpr.queryString = cpr.queryString + " WHERE " + cpr.potholeColumn + " NOT EQUAL TO '' AND";
					if (cpr.yearCreation != 'all')
					{
						cpr.queryString = cpr.queryString + " CREATIONDATE >= '01/01/" + cpr.yearCreation + "' AND CREATIONDATE <= '12/31/" + cpr.yearCreation + "'";
						cpr.insertAnd = ' AND';
					}
					if (cpr.yearCompleted != 'open' && cpr.yearCompleted != 'all')
					{
						cpr.isStatsRequest = true;
						cpr.queryString = cpr.queryString + cpr.insertAnd + " COMPLETIONDATE >= '01/01/" + cpr.yearCompleted + "' AND COMPLETIONDATE <= '12/31/" + cpr.yearCompleted + "'";
					}
					if (cpr.yearCompleted == 'open')
					{
						cpr.isStatsRequest = true;
						cpr.queryString = cpr.queryString + cpr.insertAnd + " STATUS LIKE '%Open%'";
					}
					if (cpr.yearCompleted == 'all')
					{
						cpr.isStatsRequest = true;
						cpr.queryString = cpr.queryString + cpr.insertAnd + " STATUS LIKE '%Completed%'";
					}
				}
				else
				{
					cpr.isStatsRequest = true;
					cpr.queryString = cpr.queryString + " WHERE STATUS LIKE '%Completed%' AND " + cpr.potholeColumn + " NOT EQUAL TO ''";
				}
				if (cpr.address != '')
				{
					cpr.isAddressRequest = true; 
					cpr.address += ' Chicago IL';
					cpr.geocoder.geocode({'address': cpr.address}, function(results, status)
					{
						if (status == google.maps.GeocoderStatus.OK)
						{
							if(cpr.addrMarker != false)
							{
								cpr.addrMarker.setMap(null);
							}
							cpr.theMap.setCenter(results[0].geometry.location);
							cpr.theMap.setZoom(14);
							cpr.addrMarker = new google.maps.Marker({
								position: results[0].geometry.location,
								map: cpr.theMap,
								animation: google.maps.Animation.DROP,
								title:cpr.address
							});
							if(cpr.radiusCircle != null)
							{
								cpr.radiusCircle.setMap(null);
							}
							drawSearchRadiusCircle(results[0].geometry.location);
							cpr.queryString = cpr.queryString + " AND ST_INTERSECTS(" + cpr.potholeColumn + ", CIRCLE(LATLNG" + results[0].geometry.location.toString() + "," + cpr.searchRadius + "))";
							resetMap(cpr.queryString);
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
					if(cpr.radiusCircle != null)
					{
						cpr.radiusCircle.setMap(null);
					}
					cpr.isAddressRequest = false;
					$("#statResults").fadeOut(function() { $("#statResults").html('');});
					resetMap(cpr.queryString);
				}
			}
		});
		/**
		 * Draw the 1/2 mile radius on the map
		 */
		function drawSearchRadiusCircle(theLocation) {
			cpr.radiusCircleOptions = {
				strokeColor: "#a0522d",
				strokeOpacity: 0.4,
				strokeWeight: 1,
				fillColor: "#a0522d",
				fillOpacity: 0.05,
				map: cpr.theMap,
				center: theLocation,
				clickable: false,
				zIndex: -1,
				radius: parseInt(cpr.searchRadius)
			};
			cpr.radiusCircle = new google.maps.Circle(cpr.radiusCircleOptions);
		}
		/**
		 * Reset the map back to show all pothole data
		 */
		$("#map-all").click(function() {
			setQueryString();
			if(cpr.addrMarker != false)
			{
				cpr.addrMarker.setMap(null);
			}
			if(cpr.radiusCircle != null)
			{
				cpr.radiusCircle.setMap(null);
			}
			resetMap(cpr.queryString);
			$("#year-creation").val('none');
			$("#year-completed").val('none');
			$("#address").val('');
			$("#statResults").fadeOut(function() { $("#statResults").html('');});
		});
		/**
		 * Reload the pothole map data based on new query string
		 */
		function resetMap(queryString)
		{
			cpr.potholeLayer.setMap(null);
			cpr.potholeLayer = new google.maps.FusionTablesLayer(
					cpr.potholeTableId, {
						query : queryString
					});
			cpr.potholeLayer.setMap(cpr.theMap);
			displayCount(queryString);
		}
		/**
		 * Get the Ward Layer
		 */
		cpr.wardLayer = new google.maps.FusionTablesLayer(cpr.wardTableId, {
			query : "SELECT " + cpr.wardColumn + " FROM " + cpr.wardTableId
		});
		/**
		 * Ward Layer Event Listener
		 */
		$("#wards").click(function() {
			if ($("#wards").is(':checked')) {
				cpr.potholeLayer.setMap(null);
				cpr.wardLayer.setMap(cpr.theMap);
				cpr.potholeLayer.setMap(cpr.theMap);
			} else {
				cpr.wardLayer.setMap(null);
			}
		});
		/**
		 * Getting pothole Count
		 */
		function displayCount(queryString) {
			$("#numResults").fadeOut(function() {
				$("#numResults").html('<div class="alert"><strong>Calculating...</strong></div>');
			});
			$("#numResults").fadeIn();
			cpr.countQueryString = queryString.replace("SELECT " + cpr.potholeColumn,
					"SELECT Count() ");
			getFTQuery(cpr.countQueryString).send(displaySearchCount);
			if(cpr.isStatsRequest && cpr.isAddressRequest)
			{
				displayStatistics(queryString);
			}
		}
		/**
		 * Get the COUNT of the pothole requests
		 */
		function getFTQuery(sql) {
			cpr.queryText = encodeURIComponent(sql);
			return new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq=' + cpr.queryText);
		}
		/**
		 * Display the COUNT of the potholes in the results DOM div
		 */
		function displaySearchCount(response) {
			cpr.numRows = 0;
			if (response.getDataTable().getNumberOfRows() > 0) {
				cpr.numRows = parseInt(response.getDataTable().getValue(0, 0));
			}
			$("#numResults").fadeOut(function() {
				$('#statsResults').fadeOut();
				$("#numResults").html('<div class="alert alert-info"><strong>' + addCommas(cpr.numRows) + '</strong> Requests Selected</div>');
			});
			$("#numResults").fadeIn();
		}
		/**
		 * Query Fusion Tables for data needed to do the pothole statistics
		 */
		function displayStatistics(queryString)
		{
			cpr.statQueryString = queryString.replace("SELECT " + cpr.potholeColumn, "SELECT CREATIONDATE, COMPLETIONDATE");
			getFTQuery(cpr.statQueryString).send(processStatistics);
		}
		/**
		 * Create and display the statistics
		 */
		function processStatistics(response)
		{
			cpr.numStatsRows = parseInt(response.getDataTable().getNumberOfRows());
			for(cpr.i=1;cpr.i<=6;cpr.i++)
			{
				cpr.total[cpr.i] = 0;
			}

			for (cpr.i=0;cpr.i<cpr.numStatsRows;cpr.i++)
			{
				cpr.createDates[cpr.i] = new XDate(response.getDataTable().getValue(cpr.i,0));
				cpr.completeDates[cpr.i] = new XDate(response.getDataTable().getValue(cpr.i,1));
				cpr.openComplete = 'DAYS TO COMPLETE REQUESTS';
				if (cpr.completeDates[cpr.i] == '21600000')
				{
					cpr.openComplete = 'DAYS SINCE REQUESTS OPENED';
					cpr.completeDates[cpr.i] = new XDate();
				}
				cpr.dateDiffs[cpr.i] = cpr.createDates[cpr.i].diffDays(cpr.completeDates[cpr.i]);
				if(cpr.dateDiffs[cpr.i] < 3) { cpr.total[1]++; }
				else if(cpr.dateDiffs[cpr.i] < 6) { cpr.total[2]++; }
				else if(cpr.dateDiffs[cpr.i] < 9) { cpr.total[3]++; }
				else if(cpr.dateDiffs[cpr.i] < 12) { cpr.total[4]++; }
				else if(cpr.dateDiffs[cpr.i] < 15) { cpr.total[5]++; }
				else { cpr.total[6]++; }
			}
			cpr.statResults.min = jStat.min(cpr.dateDiffs);
			cpr.statResults.max = jStat.max(cpr.dateDiffs);
			cpr.statResults.mean = jStat.mean(cpr.dateDiffs);
			cpr.statResults.median = jStat.median(cpr.dateDiffs);
			cpr.statResults.stdev = jStat.stdev(cpr.dateDiffs);
			for(cpr.i=1;cpr.i<=6;cpr.i++)
			{
				cpr.flot[cpr.i] = [cpr.i,cpr.total[cpr.i]];
			}
			$("#statResults").fadeOut(function() {
				$("#statResults").html('<div class="alert alert-info"><strong>' + cpr.openComplete + '<br/>' + roundNum(cpr.statResults.min,0) + '</strong> minimum<br/><strong>' + roundNum(cpr.statResults.max,0) + '</strong> maximum<br/><strong>' + roundNum(cpr.statResults.mean,1) + '</strong> average<br/><strong>' + roundNum(cpr.statResults.median,1) + '</strong> median<br/><strong>' + roundNum(cpr.statResults.stdev,1) + '</strong> standard deviation<div id="flot" style="width:240px;height:100px"></div><p>&nbsp;<br/>requests - vertical&nbsp;&nbsp;|&nbsp;&nbsp;days - horizonal</p></div>');
				$.plot($("#flot"), [{ data: cpr.flot}],
							{
								bars: { show: true },
								xaxis: {
									ticks: [[1,"0"],[2,"3"],[3,"6"],[4,"9"],[5,"12"],[6,"15"],[7,"&#x221E;"]]
								}
							}
				);
			});
			$("#statResults").fadeIn();
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
		/**
		 * Round numbers to the given decimal (dec)
		 */
		function roundNum(num, dec) {
			cpr.roundResult = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
			return cpr.roundResult;
		}
});