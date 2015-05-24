var Editor = {

	selectedElement: $("body"),
	stack: null,

	init: function (doc) {

		// Cache dom elements
		Editor.overlay = $("#overlay");
		Editor.iframe = doc.contents();

		// Inject CSS
		Editor.iframe.find("head").append('<link rel="stylesheet" href="css/injected.css">');

		// All sorts of bindings
		Editor.setupKeys();
		Editor.bind();

		// Initial marker update
		Editor.updateMarkers();

		// show editor
		Editor.toggle()

		var newValue = "";

		EditCommand = Undo.Command.extend({
			constructor: function(dom) {
				this.dom = dom;
			},
			execute: function() {
				// Editor.iframe.find("body").innerHTML(start);
			},
			undo: function() {
				Editor.iframe.find("body")[0].innerHTML = this.dom;
			}
		})

		var dom = Editor.iframe.find("body")[0].innerHTML;
		Editor.previousDOM = null;
		// Setup a new observer to get notified of changes
		var observer = new MutationObserver(function (mutations) {
    		Editor.stack.execute(new EditCommand(Editor.previousDOM));
    		Editor.previousDOM = Editor.iframe.find("body")[0].innerHTML;

		});
		// Observe a specific DOM node / subtree
		var options = {
		  subtree: true,
		  childList: true,
		  attributes: false
		};
		observer.observe(Editor.iframe.find("body")[0], options);

		// create a new undo stack
		Editor.stack = new Undo.Stack();

		$("#undo").on("click", function () {
			Editor.stack["undo"]();
		})

	},
	addContainer: function () {
		var container = $("<div class='ui button'>foo</div>");
		Editor.selectedElement.append(container);
	},
	bind: function () {
		Editor.bindControls();
		Editor.bindBehaviors();
	},
	bindControls: function () {
		Editor.bindControlsForAlignment();
		Editor.bindControlsForClassName();
		Editor.bindControlsForDistribution();
		Editor.bindControlsForFlowOfElements();
		Editor.bindControlsForSpacing();
	},
	bindBehaviors: function () {
		Editor.bindBehaviorForElementSelection();
		Editor.bindBehaviorForMultiSelection();
		Editor.bindBehaviorForElementDragging();
	},
	bindControlsForAlignment: function () {
		$(".js-toggle-start").on("click", function () {
			Editor.selectedElement.removeClass("centered")
			Editor.updateMarkers();
		})

		$(".js-toggle-center").on("click", function () {
			Editor.selectedElement.addClass("centered")
			Editor.updateMarkers();
		})
	},
	bindBehaviorForElementDragging: function () {
		Editor.iframe.find("*").on("mousedown", Editor.handleDrag);

	},
	bindBehaviorForElementSelection: function () {
		// Clicking any element
		Editor.iframe.find("*").on('click', function(event) {

			// prevent event from bubbling up the dom
			event.stopPropagation();

			Editor.selectedElement.removeAttr("style")

			var target = $(event.target);
			target.removeClass("js-is-dragging")
			if (!target.hasClass("marker")) {
				// remove class from others
				Editor.iframe.find(".selected").removeClass("selected");
				Editor.select(target);

				if (target.is("html")) {
					Editor.iframe.find("body").toggleClass("selected")
				}

				// update editor description
				var label = "A ";
				label += "container, that ";
				label += $(event.target).attr("class");
				$("header").find(".title").text(label)


				Editor.iframe.find(".marker").remove()

				// highlight margins
				if (target.hasClass("space")) {

					target.children().each(function () {
						var marker = $("<div class='marker'></div>");
						var element = $(this);
						element.css("position", "relative")
						// marker.offset({top: element.position().top, left: element.position().left + element.outerWidth()})

						marker.height(element.outerHeight())
						marker.width(element.css("margin-right"))
						var left = element.outerWidth();
						var top = element.offset().top;
						// marker.css("-webkit-transform", "translate(" + left + "px, 0")
						element.append(marker);
						marker.css("right", "0px")
						marker.css("top", "0px")
					})
				}


				$(".js-input-width").val(target.outerWidth())
				$(".js-input-height").val(target.outerHeight())

				Editor.selectedElement = target;

				window.addEventListener("webkitTransitionEnd", Editor.updateMarkers, false);
			} else {
				// marker
				Editor.removeClassesOfSpacingForElement(Editor.selectedElement);
				Editor.selectedElement.addClass("double");
				Editor.updateMarkers();
			}
			// update document
			Editor.visualize();
		});
	},
	bindControlsForDistribution: function () {
		// Fit / Stretch
		$(".js-toggle-fit").on("click", function () {
			Editor.handleDistribute();
		})

		$("#maximum").on("change", function (event) {
			var maximum = $(this).val();
			switch (maximum) {
				case "stretch":
					Editor.stretch();
					break;
				case "none":
					Editor.removeMaximum();
					break;
				default:
					Editor.handleDistribute();
					break;
			}
		})
	},
	bindControlsForFlowOfElements: function () {
		$(".js-switch-vertical").on("click", function () {
			Editor.selectedElement.removeClass("from left")
			Editor.selectedElement.addClass("from top")
			Editor.updateMarkers();
		})

		$(".js-switch-horizontal").on("click", function () {
			Editor.selectedElement.addClass("from left")
			Editor.selectedElement.removeClass("from top")
			Editor.updateMarkers();
		})
	},
	bindControlsForSpacing: function () {
		$(".js-switch-space-none").on("click", function () {
			Editor.removeClassesOfSpacingForElement(Editor.selectedElement);
			Editor.updateMarkers();
		})

		$(".js-switch-space-half").on("click", function () {
			Editor.addSpacingClass("half");
		})

		$(".js-switch-space-normal").on("click", function () {
			Editor.addSpacingClass("normal");
		})

		$(".js-switch-space-double").on("click", function () {
			Editor.addSpacingClass("double");
		})

		$(".js-switch-space-quad").on("click", function () {
			Editor.addSpacingClass("quad");
		})
	},
	bindControlsForClassName: function () {
		$(".title").on("blur", function (event) {
			Editor.selectedElement.removeClass();
			Editor.selectedElement.addClass($(this).text());
		})
	},
	addSpacingClass: function (className) {
		Editor.removeClassesOfSpacingForElement(Editor.selectedElement);
		Editor.selectedElement.addClass(className)
		Editor.updateMarkers();
	},
	removeClassesOfSpacingForElement: function (element) {
		element.removeClass("half normal double quad");
	},
	save: function() {

		Editor.toggle();
		var dom = $("#document").contents().find("html").html();

		$.post("php/save.php", {
			dom: dom
		}).success(function(data) {
			alert("saved")
		});
		Editor.toggle();
	},
	setupKeys: function () {
		key('esc', function(){ Editor.toggle();});
		key('s', function(){ Editor.save(); });
		key('backspace', function(){Editor.removeElement();return false});

		Editor.iframe.on("keydown", function (e) {
			console.log(e);
			switch (e.keyCode) {
				case 8:
					e.preventDefault();
					Editor.removeElement(Editor.selectedElement);
				break;
				case 38:
					e.preventDefault();
					Editor.selectPrevious();
				break;
				case 40:
					e.preventDefault();
					Editor.selectNext();
				break;
			}
		})

		Editor.iframe.on("keyup", function (e) {
			switch (e.keyCode) {
				case 65:
					Editor.addContainer();
					break;
			}
		})
	},
	toggle: function() {
		$("header").toggleClass("js-is-visible");
		$("#document").toggleClass("js-is-offset js-has-editor");
		$("#document").contents().find("body").toggleClass("js-is-offset js-has-editor");
		Editor.selectedElement.removeAttr("style");
	},
	getDistanceBetweenElements: function (a, b) {
		var o1 = $(a).offset();
		var o2 = $(b).offset();
		var dx = o1.left - o2.left;
		var dy = o1.top - o2.top;
		var distance = Math.sqrt(dx * dx + dy * dy);
		return distance;
	},
	getNearestNeighborForElement: function (element) {
		var neighbors = element.parent().children();

		var nearestDistance = 0;
		var nearestElement = null;

		neighbors.each(function () {
			if (!$(this).hasClass("selected")) {
				var distance = Editor.getDistanceBetweenElements($(this), element);
				if (distance < nearestDistance || nearestElement == null) {
					nearestDistance = distance;
					nearestElement = $(this);
				}
			}
		})
		return nearestElement;
	},
	handleDistribute: function () {
		Editor.selectedElement.addClass("distribute")
		Editor.selectedElement.removeClass("stretch")

		var maximum = $("#maximum").val();
		Editor.selectedElement.removeClass("none one two three four five six seven eight")
		Editor.selectedElement.addClass("maximum " + maximum + " items per row");
	},

	removeMaximum: function () {
		Editor.selectedElement.removeClass("maximum items per row")
		Editor.selectedElement.removeClass("none one two three four five six seven eight")
		Editor.updateMarkers();
	},

	stretch: function () {
		Editor.selectedElement.addClass("stretch")
		Editor.selectedElement.removeClass("distribute")
		Editor.updateMarkers();
	},

	updateMarkers: function () {
		$('#document').contents().find(".marker").each(function () {
			var marker = $(this);
			var element = Editor.selectedElement;
			var width = Editor.selectedElement.children().css("margin-right");
			marker.height(marker.parent().outerHeight())
			marker.width(width)

			marker.css("right", "-" + width)
			marker.css("top", "0px")
		});

		Editor.visualize();
	},
	updateDimensions: function () {
		$('#document').contents().find(".dimensions").each(function () {
			var dimensions = $(this);
		});
	},
	hasMinWidth: function (element) {
		return element.css("min-width") != "0px";
	},

	hasMaxWidth: function (element) {
		return element.css("max-width") != "none";
	},
	handleDrag: function (event) {

		var element = $(event.target);

		var offsetX = event.pageX - element.offset().left
		var offsetY = event.pageY - element.offset().top;

		// Editor.startReflow(element);

		// Editor.bindDragging();

		$("#document").contents().on("mouseup", function () {
			// detach all event listener
			$("#document").contents().off("mousemove");
			element.removeClass("js-is-dragging")
			element.children().removeAttr("style")

			var dropTarget = Editor.getNearestNeighborForElement(element);

			if (dropTarget != null) {
				// figute out wether to add the element before or after
				if (Editor.getDistanceBetweenElements(dropTarget, element) > dropTarget.outerWidth() / 2) {
					// dropTarget.after(element)
				} else {
					// dropTarget.before(element)
				}
			}
			// element.removeAttr("style")
		})
	},
	bindBehaviorForMultiSelection: function () {
		Editor.iframe.on("mousedown", Editor.onMultiSelectStart)
	},
	onMultiSelectStart: function (event) {

		Editor.iframe.on("mouseup", Editor.onMultiSelectEnd)

		// visualize the selection
		Editor.lasso = $("<div class='js-selection-lasso'></div>");
		$("#overlay").after(Editor.lasso);

		// bind move event
		Editor.iframe.on("mousemove", Editor.onMultiSelectMove)

		// remember the mouse position
		Editor.initialMousePosition = {"x": event.clientX, "y": event.clientY}

		// position the lasso
		Editor.lasso.css("left", Editor.initialMousePosition.x + "px")
		Editor.lasso.css("top", Editor.initialMousePosition.y + "px")

		// duration in ms that we want to wait until we handle a long press event
		var threshold = 1000;

		// calculate the time difference between the first mouse down event and the current one
		// used to detect a long press

		if (Editor.timestampOfFirstMouseDownEvent != null) {

			var currentTimestamp = new Date().getTime();

			if (currentTimestamp - Editor.timestampOfFirstMouseDownEvent < threshold) {
				alert("long press")
			}
		} else {

			// remember the time of the initial mouse down event
			Editor.timestampOfFirstMouseDownEvent = new Date().getTime();
		}
		console.log($(window))
	},
	onMultiSelectMove: function (event) {

		var width = event.clientX - Editor.initialMousePosition.x;
		var height = event.clientY - Editor.initialMousePosition.y;

		Editor.lasso.css("width", width + "px");
		Editor.lasso.css("height", height + "px");

		// handle some sort of hit detection to figure out what elements are inside the selection
	},
	onMultiSelectEnd: function (event) {
		Editor.lasso.remove();
	},
	startReflow: function (element) {
		element.children().css("position", "absolute")
		element.children().css("left", "0px")
	},
	scrollToElement: function (element) {
		Editor.iframe.scrollTop(-element.parent().offset().top + element.offset().top);
	},
	scrollToSelectedElement: function () {
		Editor.scrollToElement(Editor.selectedElement);
	},
	select: function (element) {
		Editor.selectedElement = element;
		Editor.iframe.find(".selected").removeClass("selected")
		element.toggleClass("selected")
	},
	selectNext: function () {
		var next = Editor.selectedElement.next();
		if (next.length != 0) {
			Editor.select(next);
			Editor.scrollToSelectedElement();
		}
	},
	selectPrevious: function () {
		var prev = Editor.selectedElement.prev();
		if (prev.length != 0) {
			Editor.select(prev);
			Editor.scrollToSelectedElement();
		}
	},
	selectElementOrParent: function (element) {
		if (element == null) {
			element = Editor.selectedElement.parent();
		}
		Editor.select(element);
	},
	removeElement: function (element) {
		if (element.next() != null) {
			Editor.select(element.next())
		} else {
			Editor.select(element.parent());
		}
		element.remove();
	},
	bindDragging: function () {
		$("#document").contents().on("mousemove", function (event) {

			element.css("width", element.outerWidth())
			element.css("height", element.outerHeight())
			element.css("left", element.offset().left)
			element.css("top", element.offset().top);

			element.addClass("js-is-dragging");

			var left = event.pageX - offsetX
			var top = event.pageY - offsetY

			element.css("left", left)
			element.css("top", top);
		})
	},
	visualize: function () {
		var lock = $('<div class="lock"></div>')
		Editor.iframe.find(".lock").remove();
		Editor.iframe.find("body *").each (function () {
			var target = $(this);
			if (Editor.hasMinWidth(target) || Editor.hasMaxWidth(target)) {
				target.append(lock)
				lock.css("left", target.position().left + target.outerWidth() - 10)
				lock.css("top", target.position().top + target.outerHeight() / 2)
			}
		})

		Editor.visualizePadding();
		// Editor.visualizeMargin();
	},
	visualizePadding: function () {
		// padding of selected element
		var shadows = [];
		var value;

		var target = Editor.selectedElement;


		// padding
		var pTop = target.css("padding-top");
		var pRight = target.css("padding-right");
		var pBottom = target.css("padding-bottom");
		var pLeft = target.css("padding-left");

		if (pTop != "0px") {
			value = pTop;
			shadows.push("inset 0px " + value + " 0px 0px rgba(0, 255, 0, 0.1)");
		}

		if (pRight != "0px") {
			value = pRight;
			shadows.push("inset " + value + " 0px 0px 0px rgba(0, 255, 0, 0.1)");
		}

		if (pBottom != "0px") {
			value = pBottom;
			shadows.push("inset 0px -" + value + " 0px 0px rgba(0, 255, 0, 0.1)");
		}

		if (pLeft != "0px") {
			value = pLeft;
			shadows.push("inset -" + value + " 0px 0px 0px rgba(0, 255, 0, 0.1)");
		}

		target.css("box-shadow", shadows.join(","));
	},

	visualizeMargin: function () {
		// padding of selected element
		var shadows = [];
		var value;

		var target = Editor.selectedElement;


		// padding
		var pTop = target.css("margin-top");
		var pRight = target.css("margin-right");
		var pBottom = target.css("margin-bottom");
		var pLeft = target.css("margin-left");

		if (pTop != "0px") {
			value = pTop;
			shadows.push("0px " + value + " 0px 0px rgba(0, 255, 0, 0.1)");
		}

		if (pRight != "0px") {
			value = pRight;
			shadows.push("" + value + " 0px 0px 0px rgba(0, 255, 0, 0.1)");
		}

		if (pBottom != "0px") {
			value = pBottom;
			shadows.push("0px -" + value + " 0px 0px rgba(0, 255, 0, 0.1)");
		}

		if (pLeft != "0px") {
			value = pLeft;
			shadows.push("-" + value + " 0px 0px 0px rgba(0, 255, 0, 0.1)");
		}

		target.css("box-shadow", shadows.join(","));
	}
}

Editor.utils = {

}