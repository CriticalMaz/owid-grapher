;( function() {
	
	"use strict";

	App.Views.Form.EntitiesSectionView = Backbone.View.extend({

		el: "#form-view #data-tab .entities-section",
		events: {
			"change .countries-select": "onCountriesSelect",
		},

		initialize: function( options ) {
			
			this.dispatcher = options.dispatcher;
			App.AvailableEntitiesCollection.on( "change add remove reset", this.render, this );
			
			this.$entitiesSelect = this.$el.find( ".countries-select" );

			this.render();

		},

		render: function() {

			var $entitiesSelect = this.$entitiesSelect;
			$entitiesSelect.empty();
			
			//append default 
			$entitiesSelect.append( $( "<option selected disabled>Select entity</option>" ) );	

			App.AvailableEntitiesCollection.each( function( model ) {
				$entitiesSelect.append( $( "<option>" + model.get( "name" ) + "</option>" ) );	
			});

		},

		onCountriesSelect: function( evt ) {

			var $select = $( evt.target );
			App.ChartModel.addSelectedCountry( { name: $select.val() } );

		}


	});

})();