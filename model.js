var sites = [];
var units = [];
var p1 = {};

var model = {

	options: {
		dayLength: 1000,
		paused: true,
	},

	newGame: function() {
		model.currentDay = 1;
		model.newMap();
		units = [];
		p1 = {};
		
		p1.vision = 100;
		p1.knownSites = [];
		
		var startUnit = new Unit(p1,undefined,data.units.wagon);
		var startUnit = new Unit(p1,startUnit.location,data.units.wagon);
		startUnit.look();
		startUnit.location.reputation.p1 = 100;
		view.focus.unit = startUnit;
		
		view.displayMap();
	},

	newMap: function(totalSites,minDist,maxDist,minAngle) {
		if (totalSites == undefined) { totalSites = 50 };
		if (minDist == undefined) {  minDist = 20 };
		if (maxDist == undefined) {  maxDist = 2.6 };
		if (minAngle == undefined) {  minAngle = 30 };
	
		sites = [];
		for (i=0;i<totalSites*3;i++) {
			var newSite = new Site();
		};
		
		// Remove too-close sites, reduce to totalSites
		for (i in sites) {
			for (t in sites) {
				var distance = Math.pow(Math.pow(sites[i].x - sites[t].x,2) + Math.pow(sites[i].y - sites[t].y,2),.5);
				if (distance < minDist) {
					sites.splice(t,1);
				};
			};
		};
		sites.splice(totalSites);
		
		// Find Neighbors
		
		var total = 0;
		for (i in sites) {
			var shortestDistance = Infinity;
			var nearestSite = 0;
			for (t in sites) {
				var distance = Math.pow(Math.pow(sites[i].x - sites[t].x,2) + Math.pow(sites[i].y - sites[t].y,2),.5);
				if (distance < shortestDistance && t !== i) {
					shortestDistance = distance;
					nearestSite = t;
				};
			};
			sites[i].neighbors = [sites[nearestSite]];
			total += shortestDistance;
		};
		var avgDist = total / sites.length;
		for (i in sites) {
			sites[i].neighbors = [];
			for (t in sites) {
				var distance = Math.pow(Math.pow(sites[i].x - sites[t].x,2) + Math.pow(sites[i].y - sites[t].y,2),.5);
				if (distance < avgDist * maxDist && distance >= minDist) {
					sites[i].neighbors.push(sites[t]);
				};
			};
		};
		
		// Remove neighbors on too-similar vectors
		var removeList = [];
		for (i in sites) {
			neighborAngles = [];
			for (n in sites[i].neighbors) {
				neighborAngles.push(Math.atan2(sites[i].neighbors[n].y - sites[i].y,sites[i].neighbors[n].x - sites[i].x) * 180 / Math.PI);
			}
			for (a in neighborAngles) {
				for (n in neighborAngles) {
					var angleDiff = Math.abs(neighborAngles[a] - neighborAngles[n]);
					if ((360 - minAngle < angleDiff || angleDiff < minAngle) && angleDiff !== 0) {
						removeList.push([sites[i],sites[i].neighbors[n],sites[i].neighbors[a]]);
					} else {
// 						console.log('big angle');
					};
				};
			};
		};
		
		for (i in removeList) {
			var removeLink = [];
			var a = removeList[i][0];
			var b = removeList[i][1];
			var c = removeList[i][2];
			var abDist = Math.pow(Math.pow(a.x - b.x,2) + Math.pow(a.y - b.y,2),0.5);
			var acDist = Math.pow(Math.pow(a.x - c.x,2) + Math.pow(a.y - c.y,2),0.5);
			var bcDist = Math.pow(Math.pow(c.x - b.x,2) + Math.pow(c.y - b.y,2),0.5);
			if (abDist > acDist && abDist > bcDist) {
				removeLink = [a,b];
			} else if (acDist > abDist && acDist > bcDist) {
				removeLink = [a,c];
			} else {
				removeLink = [b,c];
			};
			if (removeLink[0].neighbors.indexOf(removeLink[1]) !== -1) {
				removeLink[0].neighbors.splice(removeLink[0].neighbors.indexOf(removeLink[1]),1);
			};
			if (removeLink[1].neighbors.indexOf(removeLink[0]) !== -1) {
				removeLink[1].neighbors.splice(removeLink[1].neighbors.indexOf(removeLink[0]),1);
			};
		};
	},
	
	siteName: function() {
		var consonants = ['b','c','d','f','g','h','j','k','l','m','n','p','q','r','s','t','v','w','x','y','z'];
		var vowels = ['a','e','i','o','u'];
		var syllables = 2 + Math.random() * Math.random() * 4 << 0;
		if (syllables == 5) { syllables = 1 }
		var string = '';
		for (s=0;s<syllables;s++) {
			if (Math.random() > 0.2) {
				string += consonants[Math.random() * consonants.length << 0];
			};
			string += vowels[Math.random() * vowels.length << 0];
			if (Math.random() > 0.5) {
				string += consonants[Math.random() * consonants.length << 0];
			};
		};
		return string.charAt(0).toUpperCase() + string.slice(1);
	},
	
	advanceClock: function() {
		model.currentDay++;
		
		for (i in units) {
			if (units[i].inTransit) {
				units[i].moveStep();
			};
		};
		
		view.displayUnit(view.focus.unit);
		view.displayMap();
		
		if (!model.options.paused) {
			var timedEvent = setTimeout(model.advanceClock,model.options.dayLength);
		};
	},

};

function Site() {
	this.x = 25 + Math.random() * 950 << 0;
	this.y = 25 + Math.random() * 950 << 0;
	this.name = model.siteName();
	
	this.hasVisited = {};
	
	this.population = Math.random() * Math.random() * 1000 << 0;
	this.wages = Math.random() * Math.random();
	
	this.commodities = {};
	for (c in data.commodities) {
		this.commodities[c] = Math.random() * Math.random() * data.commodities[c].rarity;
	};
	
	this.reputation = {p1:0};
	
	this.resources = [];
	var resourcesNum = 1 + Math.random() * Math.random() * 5 << 0;
	for (r=0;r<resourcesNum;r++) {
		var resources = Object.keys(data.resources);
		var newResource = data.resources[resources[Math.random() * resources.length << 0]];
		if (this.resources.indexOf(newResource) == -1) {
			this.resources.push(newResource)
		};
	};
	
	this.infrastructure = [];
	if (this.commodities.stone < 0.5) {
		this.infrastructure.push(data.infrastructure.bunker);
	};
	if (this.commodities.stone < 0.3) {
		this.infrastructure.push(data.infrastructure.stoneWall);
	};
	if (this.commodities.stone < 0.2) {
		this.infrastructure.push(data.infrastructure.fortress);
	};
	if (this.commodities.lumber < 0.4 && this.commodities.stone >= 0.3) {
		this.infrastructure.push(data.infrastructure.woodenPallisade);
	};
	if (this.commodities.lumber + this.commodities.stone < 0.2) {
		this.infrastructure.push(data.infrastructure.tenements);
	} else if (this.commodities.lumber + this.commodities.stone < 0.4) {
		this.infrastructure.push(data.infrastructure.barracks);
	} else if (this.commodities.lumber + this.commodities.stone < 0.6) {
		this.infrastructure.push(data.infrastructure.manorHouse);
	};
	
	var foodInfrastructure = 0;
	if (this.commodities.food < 0.1) {
		foodInfrastructure = 3;
	} else if (this.commodities.food < 0.3) {
		foodInfrastructure = 2;
	} else if (this.commodities.food < 0.5) {
		foodInfrastructure = 1;
	};
	var foodList = ['pens','fields','arbors'];
	for (f=0;f<foodInfrastructure;f++) {
		var num = Math.random() * foodList.length << 0;
		this.infrastructure.push(data.infrastructure[foodList[num]]);
		foodList.splice(num,1);
	};
	if (this.commodities.fiber < 0.4 && this.infrastructure.indexOf(data.infrastructure.fields) == -1) {
		this.infrastructure.push(data.infrastructure.fields);
	};
	if (this.commodities.stone < 0.4) {
		this.infrastructure.push(data.infrastructure.quarry);
	};
	if (this.commodities.ore < 0.4) {
		this.infrastructure.push(data.infrastructure.mine);
	};
	
	this.needs = function() {
		var housing = 0;
		var defense = 0;
		for (i in this.infrastructure) {
			if (this.infrastructure[i].housing > 0) {
				housing += this.infrastructure[i].housing;
			};
			if (this.infrastructure[i].defense > 0) {
				defense += this.infrastructure[i].defense;
			};
		};

		var array = [];
		if (this.wages < this.commodities.food + this.commodities.water) {
			array.push({label:'hungry',color:'salmon'});
		} else {
			array.push({label:'well-fed',color:'springgreen'});
		};
		if (housing < this.population / 5) {
			array.push({label:'cold',color:'salmon'});
		} else if (housing < this.population / 3) {
			array.push({label:'crowded',color:'yellow'});
		} else {
			array.push({label:'comfy',color:'springgreen'});
		};
		if (defense < 20) {
			array.push({label:'scared',color:'salmon'});
		} else {
			array.push({label:'bold',color:'springgreen'});
		};
		array.push({label:'bored',color:'salmon'});
		return array;
	};
	
	sites.push(this);
};

function Unit(owner,startLoc,type) {
	if (owner !== undefined) {
		this.owner = owner;
	} else {
		this.owner = p1;
	};
	if (startLoc !== undefined) {
		this.location = startLoc;
	} else {
		this.location = sites[Math.random() * sites.length << 0];
	};
	if (type == undefined) {
		type = data.units.wagon;
	};
	
	var inTransit = false;
	
	var num = units.length + 1;
	this.name = type.name + " #" + num;
	
	this.type = type;
	
	this.commodities = [
		{commodity:'food',qty:100},
		{commodity:'water',qty:100}
	];
	
	this.currentTrade = {
		unitStuff: [],
		siteStuff: [],
		balance: 0,
	};
	
	this.rename = function(newName) {
		this.name = newName;
		view.displayUnit(this);
	};
	
	this.move = function(site) {		
		var distance = Math.pow(Math.pow(this.location.x - site.x,2) + Math.pow(this.location.y - site.y,2),.5);
		var foodEaten = distance / this.type.speed * this.type.crew;
		var waterDrank = distance / this.type.speed * this.type.crew;
		var foodStore = 0;
		var waterStore = 0;
		var cargo = 0;
		for (i in this.commodities) {
			if (this.commodities[i].commodity == 'food') {
				foodStore += this.commodities[i].qty;
			} else if (this.commodities[i].commodity == 'water') {
				waterStore += this.commodities[i].qty;
			};
			if (data.commodities[this.commodities[i].commodity].cargo) {
				cargo++;
			};
		};
				
		if (this.location.neighbors.indexOf(site) !== -1 && waterStore >= waterDrank && foodStore >= foodEaten && cargo <= this.type.cargo) {
			var diffX = site.x - this.location.x;
			var diffY = site.y - this.location.y;
			var steps = distance / this.type.speed;
			this.route = [];
			this.inTransit = true;
			this.departed = false;
			for (s=0;s<steps;s++) {
				this.route.push({x:this.location.x + s*diffX/steps,y:this.location.y + s*diffY/steps});
			};
			this.route.push(site);
		} else if (this.location.neighbors.indexOf(site) == -1) {
			view.displayError('no path to ',site);
		} else if (waterStore < waterDrank) {
			view.displayError('not enough water');
		} else if (foodStore < foodEaten) {
			view.displayError('not enough food');
		} else if (cargo > this.type.cargo) {
			view.displayError('overburdened!');
		};
		view.displayUnit(this);
	};
	
	this.moveStep = function() {
		var currentStep = this.route.shift();
		this.departed = true;
		if (currentStep.name == undefined) {
			// move a step

			// consume food and water
			var foodEaten = this.type.crew;
			var waterDrank = this.type.crew;
			for (i in this.commodities) {
				if (this.commodities[i].commodity == 'food') {
					var temp = this.commodities[i].qty;
					this.commodities[i].qty = Math.round(Math.max(this.commodities[i].qty - foodEaten,0),0);
					foodEaten = Math.max(foodEaten - temp,0);
					if (this.commodities[i].qty == 0) {
						this.commodities.splice(i,1);
					};
				} else if (this.commodities[i].commodity == 'water') {
					var temp = this.commodities[i].qty;
					this.commodities[i].qty = Math.round(Math.max(this.commodities[i].qty - waterDrank,0),0);
					waterDrank = Math.max(waterDrank - temp,0);
					if (this.commodities[i].qty == 0) {
						this.commodities.splice(i,1);
					};
				};
			};
			this.look();

		} else {
			// arrived
			this.location = currentStep;
			this.route = [];
			this.inTransit = false;
			this.departed = false;
			this.look();
			model.options.paused = true;
			document.getElementById('clockPauseBtn').innerHTML = '>';
		};
		view.displayMap();
		
	};

	this.look = function() {
		if (this.inTransit) {
			unitX = this.route[0].x;
			unitY = this.route[0].y;
		} else {
			unitX = this.location.x;
			unitY = this.location.y;
		};
		for (i in sites) {
			if ((this.location.neighbors.indexOf(sites[i]) !== -1 || Math.pow(Math.pow(sites[i].x - unitX,2) + Math.pow(sites[i].y - unitY,2),.5) < this.owner.vision ) && this.owner.knownSites.indexOf(sites[i]) == -1) {
				this.owner.knownSites.push(sites[i]);
			};
		};
		this.location.hasVisited.p1 = true;
	};

	this.cancelRoute = function() {
		this.route = [];
		this.inTransit = false;
		view.displayUnit(this);
	};
	
	this.addFromSite = function(commodity) {
		this.currentTrade.siteStuff.push({commodity:commodity,qty:100});
	};
	
	this.addFromUnit = function(commodityIndex) {
		this.currentTrade.unitStuff.push(this.commodities[commodityIndex]);
	};
	
	this.clearTrade = function(commodity) {
		this.currentTrade = {unitStuff: [], siteStuff: []};
		view.updateTradeDiv();
	};
	
	this.removeUnitStuff = function(tradeIndex) {
		var commodityIndex = this.commodities.indexOf(this.currentTrade.unitStuff[tradeIndex]);
		view.enableUnitAddBtn(commodityIndex);
		this.currentTrade.unitStuff.splice(tradeIndex,1);
	};
	
	this.removeSiteStuff = function(tradeIndex) {
		this.currentTrade.siteStuff.splice(tradeIndex,1);
	};
	
	this.makeTrade = function() {
		
		// Move Goods, Adjust Site Values
		for (i in this.currentTrade.unitStuff) {
			this.commodities.splice(this.commodities.indexOf(this.currentTrade.unitStuff[i]),1);
			this.location.commodities[this.currentTrade.unitStuff[i].commodity] *= 0.9;
		};
		for (i in this.currentTrade.siteStuff) {
			this.commodities.push(this.currentTrade.siteStuff[i]);
			this.location.commodities[this.currentTrade.siteStuff[i].commodity] *= 1;
		};
		
		this.location.reputation.p1 += this.currentTrade.balance;
				
		view.displayUnit(view.focus.unit);
		view.displaySiteDetails(view.focus.unit.location);
	};
	
	this.resupply = function(commodityIndex) {
	
		this.location.reputation.p1 -= (100 - this.commodities[commodityIndex].qty) * this.location.commodities[this.commodities[commodityIndex].commodity];
		this.commodities[commodityIndex].qty = 100;
		view.displayUnit(this);
		view.displaySiteDetails(view.focus.unit.location);
	
	};
	
	units.push(this);
};