;(function() {
	"use strict";
	owid.namespace("App.Models.ChartModel");

	App.Models.ChartModel = Backbone.Model.extend( {
		//urlRoot: Global.rootUrl + '/charts/',
		//urlRoot: Global.rootUrl + '/data/config/',
		url: function(id) {
			id = id || this.id;
			if( $("#form-view").length ) {
				if( id ) {
					//editing existing
					return Global.rootUrl + "/charts/" + id;
				} else {
					//saving new
					return Global.rootUrl + "/charts";
				}

			} else {
				// Pass any query parameters on to config
				return Global.rootUrl + "/data/config/" + id + window.location.search;
			}
		},

		defaults: {
			"chart-name": "",
			"chart-subname": "",
			"chart-slug": "",
			"chart-notes": "",
			"chart-type": App.ChartType.LineChart,
			"published": false,
			// A range of form e.g. [0, 2015] with null meaning "all of it"
			"chart-time": null,
			"cache": true,
			"selected-countries": [], // e.g. [{id: "1", name: "United Kingdom"}]
			"tabs": [ "chart", "data", "sources" ],
			"default-tab": "chart",
			"line-type": 0,
			"line-tolerance": 1,
			"chart-description": "",
			"sourceDesc": "",
			"chart-dimensions": [],
			"logos": ['OWD'],
			"y-axis": {"axis-label-distance":"-10"},
			"x-axis": {},
			"margins": { top: 10, left: 60, bottom: 10, right: 10 },
			"units": "",
			"hide-legend": false,
			"hide-toggle": false,
			"entity-type": "country",
			"group-by-variables": false,
			"add-country-mode": "add-country",
			"x-axis-scale-selector": false,
			"y-axis-scale-selector": false,
			"activeLegendKeys": null,
			"currentStackMode": null,
            "timeline": null
		},

		// Get defaults appropriate for this kind of chart
		getDefaults: function(chartType) {
			chartType = chartType || App.ChartModel.get("chart-type");
			var defaults = _.clone(this.defaults);

			if (chartType == App.ChartType.ScatterPlot) {
				_.extend(defaults, {
					"hide-legend": true,
				});
			} else if (chartType == App.ChartType.StackedArea) {
				_.extend(defaults, {
					"add-country-mode": "change-country"
				});
			}

			return defaults;
		},

		getDefault: function(key) {
			return this.getDefaults()[key];
		},

		hasChangedFromDefault: function(key) {
			return this.get(key) != this.getDefault(key);
		},

		initialize: function() {
			this.on("change:chart-type", this.onChangeType, this);
			App.MapModel = new App.Models.MapModel();
		},

		bind: function() {
			App.MapModel.bind(this);
		},

		// When the chart type is changed, we update values to the new defaults
		// Unless those values have been altered by the user
		onChangeType: function() {
			var oldDefaults = this.getDefaults(this.previous("chart-type")),
				newDefaults = this.getDefaults(),
				changes = {};

			_.each(newDefaults, function(value, key) {
				var current = this.get(key);
				if (current == oldDefaults[key] && current != newDefaults[key])
					changes[key] = newDefaults[key];
			}.bind(this));

			if (this.get("chart-type") == App.ChartType.ScatterPlot)
				changes["selected-countries"] = [];

			if (!_.isEmpty(changes)) this.set(changes);
		},

		getSelectedEntities: function() {
			return App.ChartModel.get("selected-countries");
		},

		getUnselectedEntities: function() {
			var availableEntities = chart.vardata.get('availableEntities'),
				selectedEntitiesById = this.getSelectedEntitiesById();

			return _.sortBy(_.filter(availableEntities, function(entity) {
				return !selectedEntitiesById[entity.id];
			}), function(entity) {
				return entity.name;
			});
		},

		getSelectedEntitiesById: function() {
			var entities = {};

			_.each(App.ChartModel.get("selected-countries"), function(entity) {
				entities[entity.id] = entity;
			});

			return entities;
		},

		addSelectedCountry: function(country) {
			var selectedCountries = _.clone(this.get("selected-countries"));

			//make sure the selected contry is not there 
			if (!_.find(selectedCountries, { id: country.id })) {
				selectedCountries.push(country);
				this.set('selected-countries', selectedCountries);
			}
		},

		addSelectedEntity: function(country) {
			if (this.get("add-country-mode") == "change-country") {
				this.set("selected-countries", [country]);
				return;
			}

			var selectedCountries = _.clone(this.get("selected-countries"));

			//make sure the selected contry is not there 
			if (!_.find(selectedCountries, { id: country.id })) {
				selectedCountries.push(country);
				this.set('selected-countries', selectedCountries);
			}
		},

		updateSelectedCountry: function(countryId, color) {
			var country = this.findCountryById(countryId);
			if (country) {
				country.color = color;
				this.trigger("change:selected-countries");
				this.trigger("change");
			}
		},

		removeSelectedCountry: function(entityId) {
			var selectedCountries = this.get("selected-countries");

			selectedCountries = _.filter(selectedCountries, function(entity) {
				return entity.id != entityId;
			});

			this.set("selected-countries", selectedCountries);
		},

		replaceSelectedCountry: function(country) {
			if (country) {
				this.set("selected-countries", [country]);
			}
		},

		findCountryById: function(entityId) {
			return _.find(this.get("selected-countries"), function(entity) {
				return entity.id == entityId;
			});
		},

		setAxisConfig: function(axisName, prop, value) {
			var axis = _.extend({}, this.get(axisName));
			if (axis[prop] !== value) {
				axis[prop] = value;
				this.set(axisName, axis);				
			}
		},

		getAxisConfig: function(axisName, prop) {
			var axis = this.get(axisName);
			if (!axis) return undefined;
			if (axis[prop] !== undefined) return axis[prop];

			// Defaults
			if (prop == 'axis-scale') return 'linear';
		},

		// DEPRECATED: use App.MapModel instead
		updateMapConfig: function(propName, propValue, silent, eventName) {
			App.MapModel.set(propName, propValue, { silent: silent });

			if (!silent && eventName)
				this.trigger(eventName);
		},

		isNew: function() {
			return !this.get("id");
		},

		hasVariables: function() {
			var dims = this.getDimensions();
			return _.some(dims, function(dim) { return dim.property == 'x' || dim.property == 'y'; });
		},

		hasEntities: function() {
			return !_.isEmpty(this.get("selected-countries"));
		},

		// Get the empty dimension slots appropriate for this type of chart
		getEmptyDimensions: function() {
			var chartType = this.get("chart-type");

			var xAxis = { property: 'x', name: 'X axis', },
				yAxis = { property: 'y', name: 'Y axis', },
				color = { property: 'color', name: 'Color' },
				size = { property: 'size', name: 'Size' };

			if (chartType == App.ChartType.ScatterPlot)
				return [xAxis, yAxis, size, color];
			else
				return [yAxis];
		},

		// Get chart dimensions, ensuring we return only those appropriate for the type
		getDimensions: function() {
			var dimensions = this.get("chart-dimensions"),
				validProperties = _.map(this.getEmptyDimensions(), 'property'),
				validDimensions = _.filter(dimensions, function(dim) { return _.includes(validProperties, dim.property); });

			// Give scatterplots a default color dimension if they don't have one
			if (this.get("chart-type") == App.ChartType.ScatterPlot && !_.find(dimensions, { property: 'color' })) {
				validDimensions = validDimensions.concat([{"variableId":"123","property":"color","unit":"","name":"Color","tolerance":"5"}]);
			}

			_.each(validDimensions, function(dim) {
				if (App.VariableData) {
					var variable = App.VariableData.getVariableById(dim.variableId);
					if (variable)
						dim.displayName = dim.displayName || variable.name;
				}

			});

			return validDimensions;
		},

		getDimensionById: function(id) {
			return _.find(this.getDimensions(), function(dim) {
				return dim.variableId == id;
			});
		},

		getDimensionByProp: function(prop) {
			return _.find(this.getDimensions(), function(dim) {
				return dim.property == prop;
			});
		},

		getTimeFrom: function() {
			var chartTime = this.get("chart-time");
			if (_.isEmpty(chartTime))
				return -Infinity;
			else
				return chartTime[0];
		},

		getTimeTo: function() {
			var chartTime = this.get("chart-time");
			if (_.isEmpty(chartTime) || chartTime.length < 2)
				return Infinity;
			else
				return chartTime[1];
		},

		toggleLegendKey: function(key, offon) {
			var activeLegendKeys = _.clone(this.get("activeLegendKeys")),
				legendData = App.ChartData.get("legendData");

			// In a null default state, they're all on
			if (activeLegendKeys === null) {
				if (offon === true) return;
				else {
					activeLegendKeys = _.map(legendData, "key");
				}
			}

			if (offon === true) {
				activeLegendKeys.push(key);
				if (activeLegendKeys.length == legendData.length)
					activeLegendKeys = null;
			} else if (offon === false) {
				activeLegendKeys = _.filter(activeLegendKeys, function(k) { return k != key; });
			} else {
				return this.toggleLegendKey(key, !_.includes(activeLegendKeys, key));
			}

			this.set("activeLegendKeys", activeLegendKeys);
		},

		focusToggleLegendKey: function(key) {
			var activeLegendKeys = this.get("activeLegendKeys");
			if (activeLegendKeys && activeLegendKeys[0] == key)
				this.set("activeLegendKeys", null);
			else
				this.set("activeLegendKeys", [key]);
		},

		isLegendKeyActive: function(key) {
			var activeLegendKeys = this.get("activeLegendKeys");
			return activeLegendKeys === null || _.includes(activeLegendKeys, key);
		},

		isMultiEntity: function() {
			if (this.getSelectedEntities().length > 1)
				return true;
			else if (this.get("add-country-mode") == "add-country" && App.VariableData.countEntities() > 1)
				return true;
			else
				return false;
		},

		isMultiVariable: function() {
			return this.getDimensions().length > 1;
		},

		checkMissingData: function() {
			var dims = _.keyBy(this.getDimensions(), "property"),
				chartType = this.get("chart-type"),
				entityType = this.get("entity-type");

			if (!dims.y)
				return "Missing data for Y axis.";
			else if (!dims.x && chartType == App.ChartType.ScatterPlot)
				return "Missing data for X axis.";
			else if (!this.hasEntities() && chartType != App.ChartType.ScatterPlot)
				return "No " + entityType + " selected.";
			else
				return false;
		}
	});
})();
