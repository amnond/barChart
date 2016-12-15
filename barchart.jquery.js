;(function ( $, window, document, undefined ) {

	'use strict';

	var pluginName = "barChart";

	function defaultTooltipFormat(value, custom) {
		return value; //value + ' custom:' + JSON.stringify(custom);
	}

	function defaultSortValues(a, b) {
		return b.value - a.value;
	}

	function defaultFormatDate(date) {
		var dd = date.getDate();
		var mm = date.getMonth() + 1;
		var yyyy = date.getFullYear().toString().substring(2);

		var theDate = [ dd, mm, yyyy ].join('.');
		return theDate;
	}


	function Plugin( element, options ) {

		var defaults = {
			bars : [],
			hiddenBars : [],
			vertical : true,
			showBarSum: true,
			gridYFormat: true,
			autoVertical: true,
			legend_checkboxes : false,
			sortValues: defaultSortValues,
			formatTooltip: defaultTooltipFormat,
			formatDate: defaultFormatDate,
			legendContainer : null,
			colors : [
				"#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
				"#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
				"#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
				"#ff5722", "#795548", "#9e9e9e", "#607d8b", "#263238"
			],
			barGap : 5,
			stepsCount : 5,
			defaultWidth : 40,
			totalSumHeight : 25,
			defaultColumnWidth : 65,
		};

		var el = $.extend( true, element, {} );

		this.element = element;
		this.options = $.extend( {}, defaults, options );
		this._defaults = defaults;
		this._name = pluginName;

		this.init();

		options.vertical_needed = this.vertical_needed;

		if (this.vertical_needed() && this.options.autoVertical) {
			// TODO: Not the cleanest implementation... we can do this because
			//       this.element has been wrapped with the bar-chart-wrapper div
			//       int the init() method above.
			$(this.element).children().remove();  // remove the chart objects (bars etc.)
			$(this.element).siblings().remove();  // remove the legend (if an internal container)
			$(this.element).unwrap(); // remove the bar-chart-wrapper div

        	this.options.vertical = true;
        	this.init(); // this will wrap again with bar-chart-wrapper
        }

        var self = this;

	    $(window).resize(function() {
	    });

	}

	Plugin.prototype = {
		vertical_needed: function() {
	        // Hack to check if the text on the x-axis (dates) has text-overflow ellipsis
	        // check comments here, as apparently does not work in every browser
	        // http://stackoverflow.com/questions/7738117/html-text-overflow-ellipsis-detection
	        var vneeded = false;
	        $('.bar-title').each(function(e,obj) {
	            if (obj.offsetWidth < obj.scrollWidth) {
	                vneeded = true;
	            }
	        });

	        return vneeded;
		},

		render : function() {
			this.init();

			if (this.vertical_needed() && this.options.autoVertical) {
				// TODO: Not the cleanest implementation... we can do this because
				//       this.element has been wrapped with the bar-chart-wrapper div
				//       int the init() method above.
				$(this.element).children().remove();  // remove the chart objects (bars etc.)
				$(this.element).siblings().remove();  // remove the legend (if an internal container)
				$(this.element).unwrap(); // remove the bar-chart-wrapper div

	        	this.options.vertical = true;
	        	this.init(); // this will wrap again with bar-chart-wrapper
	        }
		},

		init: function() {

			$(this.element)
				.css( 'height', this.options.height && !this.options.vertical ? this.options.height : 'auto' )
				.addClass('bar-chart')
				.addClass( this.options.vertical ? 'bar-chart-vertical' : '' )
				.wrap('<div class="bar-chart-wrapper"></div>');


			this.options.maxHeight =
				this.options.vertical ?
					( $(this.element).width() ) :
					( $(this.element).height() - this.options.totalSumHeight );

			this.options.maxWidth =
				this.options.vertical ?
					( this.options.defaultWidth ) :
					( $(this.element).width() );


			this.options.barGapPercent = this.options.barGap / (this.options.maxWidth / 100);

			this.options.bars = this.colorizeBars(this.options.bars, this.options.colors);

			this.options.columns = this.groupByKey(this.options.bars, this.options.hiddenBars, this.options.custom);


			this.drawY(this.element, this.options);
			this.drawX(this.element, this.options);

			var container = this.element;
			var container_id = this.options.legendContainer;
			if (container_id != null) {
				container = document.getElementById(container_id);
			}

			this.drawLegend(container, this.options);

			return this;
		},

		update : function(el, options) {

			$(el).find('.bar, .bar-y, .bar-x').remove();

			options.columns = this.groupByKey(options.bars, options.hiddenBars, options.custom);
			this.drawY(el, options);
			this.drawX(el, options);

			return this;
		},

		groupByKey : function(bars, hiddenBars, custom){

			hiddenBars = hiddenBars || [];

			var columns = {};

			bars.forEach(function(bar, i){

				if (hiddenBars.indexOf(bar.name) !== -1) {
					return true;
				}

				bar.values.forEach(function(value, i){
					var elem = { value : parseFloat(value[1]), name : bar.name, color : bar.color }
					if ('custom' in bar && i<bar.custom.length) {
						var custom = bar.custom[i];
						elem.custom = custom;
					}
					columns[ value[0] ] = columns[ value[0] ] || [];
					columns[ value[0] ].push(elem);
				});

			});

			return columns;
		},

		colorizeBars : function(bars, colors){

			var colorIndex = 0;

			bars.forEach(function(bar){

				if (typeof bar.color === 'undefined') {
					bar.color = colors[colorIndex];
				}

				colorIndex++;

				if (colorIndex >= colors.length) {
					colorIndex = 0;
				}

			});

			return bars;
		},

		findMax : function(columns){

			var result = 0;

			for (var i in columns) {

				if (columns.hasOwnProperty(i)) {

					var max = 0;

					columns[i].forEach(function(value){
						max += value.value;
					});

					if (max > result) {
						result = max;
					}

				}

			}

			return result;
		},

		totalSum : function(columns){

			var result = 0;

			for (var i in columns) {

				if (columns.hasOwnProperty(i)) {

					columns[i].forEach(function(value){
						result += value.value;
					});

				}

			}

			return result;
		},

		drawY: function(el, options) {

			var container = document.createElement('div');

			var max = this.findMax(options.columns);

			var milestonesCount = Math.round( max ).toString().length;

			var multiplier = Math.pow(10, milestonesCount - 1);

			container.classList.add( options.vertical ? 'bar-x' : 'bar-y' );

			max = options.vertical ? Math.ceil(max) : Math.ceil(max / multiplier) * multiplier;

			var step = (max / options.stepsCount);

			if (step < 1) {
				step = 1;
			}

			var top = 0;
			var value = 0;

			var yClassName = options.vertical ? 'bar-x-value' : 'bar-y-value';
			var yPropertyName = options.vertical ? 'left' : 'bottom';

			while (top < options.maxHeight) {

				top = (value * options.maxHeight) / max;

				var gridValue = value;

				if (options.gridYFormat) {
					if (gridValue < 1000) {
						gridValue = gridValue.toFixed(2);
					}

					if (gridValue >= 1000 && gridValue <= 1000000) {
						gridValue = (gridValue / 1000).toFixed(2) + ' K';
					}

					if (gridValue >= 1000000 && gridValue <= 1000000000) {
						gridValue = (gridValue / 1000000).toFixed(2) + ' M';
					}
				}

				var y = document.createElement('div');

				y.classList.add( yClassName );
				y.style[ yPropertyName ] = top + 'px';
				gridValue = '';
				y.innerHTML = '<div>' + gridValue + '</div>';

				container.appendChild( y );

				value += step;

			}

			el.appendChild( container );

			return this;
		},

		drawX: function(el, options) {

			var columns = options.columns;

			var keys = Object.keys(columns);
			var columnsCount = keys.length;
			var columnSize = Math.round((options.maxWidth - options.barGap * (columnsCount + 1)) / columnsCount);

			if (options.vertical) {
				columnSize = options.defaultWidth;
			}

			var max = this.findMax(columns);
			var total = this.totalSum(columns);

			if (!options.vertical) {
				if (columnSize < options.defaultColumnWidth) { //options.defaultColumnWidth = 65
					$(this).addClass('bar-titles-vertical');
				}
				columnSize = (columnSize / (options.maxWidth / 100));
			}


			keys.sort(function(a,b){ return parseInt(a) - parseInt(b); });


			var bars = document.createDocumentFragment();

			for (var k in keys) {

				if (keys.hasOwnProperty(k)) {

					var key = keys[k];

					var column = columns[key];

					var localMax = 0;
					var localSum = 0;
					var localMaxHeight = 0;

					//sort values desc

					// Use the sort function to arange the order in which the stacked bars for the same column
					// (or line in vertical mode) will appear. The default is order by value associated with the bar
					column.sort( options.sortValues );

					column.forEach(function(bar) {
						localMax = bar.value > localMax ? bar.value : localMax;
						localSum += bar.value;
					});

					localMaxHeight = (localMax * options.maxHeight / max);

					var text = key.toString();

					//it's timestamp, so let's format it
					if (text.length === 10 && text == parseInt(text)) {
						text = this.options.formatDate(new Date(text * 1000));
					}

					var bar = document.createElement('div');
					var barTitle = document.createElement('div');
					var barValue = document.createElement('div');


					barTitle.classList.add('bar-title');
					//barTitle.textContent = text;
					barTitle.innerHTML = text;

					barValue.classList.add('bar-value');
					barValue.style[ options.vertical ? 'width' : 'height' ] = localMaxHeight;

					bar.classList.add('bar');

					if (options.vertical) {
						bar.style.height = columnSize;
					} else {
						bar.style.width = columnSize + '%';
						bar.style.marginLeft = options.barGapPercent + '%';
					}

					bar.setAttribute('data-id', key);

					bar.appendChild(barTitle);
					bar.appendChild(barValue);

					var bottom = 0;
					var previousBottom = 0;
					var previousHeight = 0;

					var partial = document.createDocumentFragment();

					column.forEach(function (bar) {
						if (bar.value) {
							var height = localMaxHeight / localMax * bar.value;
							var percentage = (bar.value / (total / 100)).toFixed(2);

							bottom = previousHeight + previousBottom;

							var barLine = document.createElement('div');

							barLine.classList.add('bar-line');
							//barLine.classList.add('tooltip');

							var custom_info = ('custom' in bar) ? bar.custom : {};

							barLine.style.backgroundColor = bar.color;
							barLine.style[ options.vertical ? 'width' : 'height' ] = height + 'px';
							barLine.style[ options.vertical ? 'left' : 'bottom' ] = bottom + 'px';

						    barLine.style['white-space'] = 'nowrap';
						    barLine.style['overflow'] = 'hidden';
						    barLine.style['text-overflow'] = 'ellipsis';
						    barLine.style['text-align'] = 'center';
						    // 24px is taken from jquery-barchart.css (.bar-chart-vertical .bar /  height)
						    barLine.style['line-height'] = options.vertical ? "24px" : barLine.style['height'];

							var html = options.formatTooltip(bar.value, custom_info);
							var inner = "<span style='padding:2px; border-radius:5px; background-color:rgba(255, 255, 255, 0.5); color:black'>"+html+"</span>";
							//inner += "<span class='tooltiptext'>"+html+"</span>";
							barLine.innerHTML = inner;
						    $(barLine).attr("title", html);
							$(barLine).attr("display_id", bar.name);

							partial.appendChild(barLine);

							previousBottom = bottom;
							previousHeight = height;
						}
					});

					barValue.appendChild( partial );

					var barSum = document.createElement('div');

					barSum.classList.add('bar-value-sum');

					barSum.style[ options.vertical ? 'left' : 'bottom' ] = previousBottom + previousHeight + 'px';

					barSum.textContent = Number( localSum.toFixed(4)).toString(); // trim trailing zeros

					if (options.showBarSum == true) {
						bar.appendChild(barSum);
					}

				}

				bars.appendChild(bar);

			}

			//$(this).append(bars);
			el.appendChild(bars);

			return this;
		},

		legendClickFunc : function(self) {
			return function(obj) {
				self.options.hiddenBars = [];
				$('.legend_cb').each(function(e,obj) {
					var checked = $(obj).prop('checked');
					if (!checked) {
						var name = obj.attributes['dispname'].nodeValue;
						self.options.hiddenBars.push(name);
					}
				});
				self.update(self.element, self.options);
			}
		},

		drawLegend : function(el, options) {
			var bars = options.bars;
			var hiddenBars = options.hiddenBars;
			var html = '';
			bars.forEach(function(bar) {
				html += "<div style='background-color:"+bar.color+"; padding:3px;' class='legend-colrect'>";
				if (options.legend_checkboxes) {
					var checked = (hiddenBars.indexOf(bar.name) == -1) ? 'checked' : '';
					html += "<input type='checkbox' class='legend_cb' dispname='"+bar.name+"' "+checked+" />";
				}
				html += "</div>";
				html += "<div class='legend-text'>"+bar.name+"</div>";
			});

			if (options.legendContainer != null) {
				var legend = $(document.getElementById(options.legendContainer));
				legend.addClass('bar-chart-legend')
				legend.html(html);
			}
			else {
				var legend = document.createElement('div');
				legend.innerHTML = html;
				$(legend).addClass('bar-chart-legend')
				el.parentNode.appendChild( legend );
			}

			if (options.legend_checkboxes) {
				$('.legend_cb').on('click', this.legendClickFunc(this));
			}

			return this;
		}
	};


	$.fn[pluginName] = function ( options ) {

		return this.each(function () {

			if (!$.data(this, "plugin_" + pluginName)) {

				$.data(this, "plugin_" + pluginName, new Plugin(this, options));

			}

		});

	};


})( jQuery, window, document );
