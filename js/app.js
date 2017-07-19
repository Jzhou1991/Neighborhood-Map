/*
*	Jeffrey Zhou
*	Udacity
*	Front-End Web Developer Nanodegree Program
*	Neighborhood Map Project
*	7/15/17
*/

// Custom map
var myMap = function(){
	this.map = {};
	this.set = function(key, value){
		this.map[key] = value;
	};
	this.get = function(key){
		return this.map[key];
	};
	this.values = function(){
		var values = [];
		$.each(this.map, function(key, value) {
		    values.push(value);
		});
		return values;
	};
	this.containsKey = function(key){
		for(var k in this.map){
			if(k.toLowerCase().includes(key.toLowerCase())){
				return true;
			}
		}
		return false;
	};
};

// Method to toggle the sidebar menu
var toggleClass = function(){
	$("#wrapper").toggleClass("toggled");
};

// Method to handle any Google Map Errors
var googleMapErrorHandler = function(){
	alert("ERROR: Google map failed to load");
};

// The View Model
var ViewModel = function() {
	var self = this;

	this.map;

	this.searchStr = ko.observable("");

	this.searchList = ko.observableArray();

	this.theInfoWindow = {};

	this.theBouncingMarker = {};
	
	this.markersMap = new myMap();

	this.wikiLinksMap = new myMap();

	// Method for the filter button
	this.search = function(searchStr){
		var originalSearchStr = "";
		// If the searchList is not empty, remove all elements in the list
		if(self.searchList() !== null && self.searchList() !== ""){
			self.searchList.removeAll();

			// If there is a Marker is bouncing, stop it 
			if(!$.isEmptyObject(self.theBouncingMarker)){
				self.theBouncingMarker.setAnimation(null);
			}

			// Close the InfoWindow
			self.theInfoWindow.close();

			// Close all markers
			self.markersMap.values().forEach(function(marker){
				marker.setVisible(false);
			});
		}


		// If the searchStr is empty, show all the Markers
		if(self.searchStr() === ""){
			self.showAllMarkers();
		}
		// If any of the location titles does not contain the searchStr, show all the Markers
		else if(!self.markersMap.containsKey(self.searchStr())){
			self.showAllMarkers();
			alert("The location you have entered can not be found");
		}
		else{
			// Else if the searchStr is not empty and the searchStr is not in the keyset of location titles, 
			//loop through all the locations and find location titles that matches. IF found push into searchList
			Location.locations.forEach(function(location){
				if(location.title.toLowerCase().includes(self.searchStr().toLowerCase())){
					originalSearchStr = location.title;
					self.searchList.push(location.title);
					self.markersMap.get(location.title).setVisible(true);
				}
			});
		}

		// If searchList is not empty and the length of the list is greater than 1, sort it
		if(self.searchList() !== null && self.searchList().length > 1){
			self.searchList.sort();
		}
		// If searchList is not empty and the length of the list is exactly 1,
		// bounce the Marker and open the InfoWindow
		if(self.searchList() !== null && self.searchList().length === 1){
			self.bounceTheMarker(originalSearchStr);
			self.openTheInfoWindow(originalSearchStr);
		}
	};

	// Method to bounce the current Marker
	this.bounceTheMarker = function(title){
		//If there is Marker bouncing Marker, deactivate bouncing
		if(!$.isEmptyObject(self.theBouncingMarker)){
			self.stopBouncingTheMarker(title);
		}
		// Set new current bouncing Marker
		self.theBouncingMarker = self.markersMap.get(title);

		// Activate bouncing
		self.markersMap.get(title).setAnimation(google.maps.Animation.BOUNCE);
	};

	// Method to deactivate bouncing of the current Marker
	// and set a new bouncing Marker as the current bouncing Marker
	this.stopBouncingTheMarker = function(title){
		self.theBouncingMarker.setAnimation(null);
		self.theBouncingMarker = self.markersMap.get(title);
	}; 

	// Method to open the current InfoWindow
	this.openTheInfoWindow = function(title){
		var marker = self.markersMap.get(title);

		// If there is an opened InfoWindow, close it
		self.theInfoWindow.close();

		// If the selected title have a wiki link,
		// set the InfoWindow mapping to that title as the current 
		// opened InfoWindow and open it
		if(self.wikiLinksMap.get(title)){
			self.theInfoWindow.open(marker.map, marker);
		}
		else{// Else make the call out to get and set the wiki link
			if(title in self.wikiLinksMap.map){
				self.makeAjaxRequest(title, function(response){		
					saveResponse(response);
				});
			}
		}

		// Helper callout method to get and set the wiki link.
		// Also to set the current opened InfoWindow and open it
		var saveResponse = function(response){
			self.wikiLinksMap.set(title, response);
			var wikiLink = response[2][0].includes("may refer to:") ? response[3][1] : response[3][0];
			var description = response[2][0].includes("may refer to:") ? response[2][1] : response[2][0];
			self.theInfoWindow.setContent("<a style=\"font-weight: 400;\" target=\"_blank\" href="+wikiLink+">"+title+"</a><br><br><span style=\"font-weight: 400;\"><i>\""+description+"\"</i></span>");
			self.theInfoWindow.open(marker.map, marker);
		};
		
	};

	// Method to show all the Markers
	this.showAllMarkers = function(){
		Location.locations.forEach(function(location){
			self.searchList.push(location.title);
			self.markersMap.get(location.title).setVisible(true);
		});
	};

	// Method to make the Wikipedia AJAX request
	// Implementation borrowed from:
	// Udacity: Front-End Web Developer Nanogree Program, 
	// Lesson 12: Building the Move Planner App
	this.makeAjaxRequest = function(title, callback){
		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + title + '&format=json&callback=wikiCallback'; 
		$.ajax({
			url: wikiUrl,
			dataType: "jsonp",
			success: function(response){
				callback(response);
			},
			error: function(err){
				alert("ERROR: Request for Wikipedia article failed");
			}
		});
	};

};

var init = function(){
	// Initializing Google Map, Markers, and InfoWindows
	// Implementation borrowed from:
	// Udacity: Front-End Web Developer Nanogree Program, 
	// Lesson 17: Getting Started with the APIs

	// Setting up the Google Map with lat and lng of Chicago
	map = new google.maps.Map(document.getElementById('map'),{
		center: {lat: 41.8708814, lng: -87.6702812},
		zoom : 12,
		draggable: true
	});
	// Instantiate the ViewModel object
	var vm = new ViewModel();	
	vm.map = map;

	// Looping through all of the locations
	Location.locations.forEach(function(location){
		//Create Marker
		var marker = new google.maps.Marker({
			position: location.location,
		 	map: map,
		 	title: location.title,
			animation: google.maps.Animation.DROP,
		});

		// Filling in data for the maps
		vm.markersMap.set(location.title, marker);
		vm.wikiLinksMap.set(location.title, "");
		
		// Add click handlers to each Markers
		marker.addListener("click", function(){

			// Pans to that Marker once clicked
			map.panTo(this.getPosition());
			// If is currently a bouncing Marker, deactivate bouncing
		 	if(!$.isEmptyObject(vm.theBouncingMarker)){
		 		vm.stopBouncingTheMarker(location.title);
		 	}
		 	// Set a new bouncing Marker as current
			vm.bounceTheMarker(location.title);

			// Open the currently selected location
			vm.openTheInfoWindow(location.title);
		});

		// Add to searchList
		vm.searchList.push(location.title);

	});

	// Sort searchList
	vm.searchList.sort();

	// Create InfoWindow
	vm.theInfoWindow = new google.maps.InfoWindow({
	 	content: ""
	});

	// Click handler for whenever the user clicks on the map(not the Markers)
	google.maps.event.addListener(map, "click", function(event) {
		// If there is a bouncing Marker, deactivate bouncing
		if(!$.isEmptyObject(vm.theBouncingMarker)){
			vm.stopBouncingTheMarker(location.title);
		}
		
		// Close the InfoWindow
		vm.theInfoWindow.close();
	});

	// Apply binding the the ViewModel instance
	ko.applyBindings(vm);
};