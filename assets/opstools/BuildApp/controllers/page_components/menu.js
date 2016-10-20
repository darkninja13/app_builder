steal(
	// List your Controller's dependencies here:
	'opstools/BuildApp/models/ABPage.js',
	function () {
		var Model = AD.Model.get('opstools.BuildApp.ABPage');
		var data = {},
			info = {
				name: 'Menu',
				icon: 'fa-th-list'
			},
			componentIds = {
				editView: info.name + '-edit-view',
				editMenu: 'ab-menu-edit-mode',
				propertyView: info.name + '-property-view',
				pageTree: 'ab-menu-page-tree'
			};

		return {
			getView: function () {
				return {
					view: "menu",
					autoheight: true,
					minWidth: 500,
					datatype: "json"
				};
			},

			getEditView = function () {
				var menu = $.extend(true, {}, this.getView());
				menu.id = componentIds.editMenu;

				return {
					id: componentIds.editView,
					padding: 10,
					rows: [
						menu,
						{
							view: 'label',
							label: 'Page list'
						},
						{
							id: componentIds.pageTree,
							view: 'tree',
							template: "<div class='ab-page-list-item'>" +
							"{common.icon()} {common.checkbox()} {common.folder()} #label#" +
							"</div>",
							on: {
								onItemCheck: function () {
									$$(componentIds.editMenu).clearAll();

									$$(componentIds.pageTree).getChecked().forEach(function (pageId) {
										var item = $$(componentIds.pageTree).getItem(pageId);

										$$(componentIds.editMenu).add({
											id: pageId,
											value: item.label
										}, $$(componentIds.editMenu).count());
									});
								}
							}
						}
					]
				};
			},

			getPropertyView: function () {
				return {
					view: "property",
					id: componentIds.propertyView,
					elements: [
						{ label: "Layout", type: "label" },
						{
							id: 'orientation',
							type: "richselect",
							label: "Orientation",
							options: [
								{ id: 'x', value: "Horizontal" },
								{ id: 'y', value: "Vertical" }
							]
						},
					],
					on: {
						onAfterEditStop: function (state, editor, ignoreUpdate) {
							if (state.old === state.value) return true;

							switch (editor.id) {
								case 'orientation':
									this.render(componentIds.editMenu, null, this.getSettings());
									break;
							}
						}
					}
				};
			},

			render: function (viewId, componentId, setting) {
				var q = $.Deferred(),
					self = this;

				if ($$(viewId))
					$$(viewId).clearAll();

				var view = $.extend(true, {}, this.getView());
				view.id = viewId;
				view.layout = setting.layout || 'x';

				if (setting.click)
					view.click = setting.click;

				webix.ui(view, $$(viewId));
				webix.extend($$(viewId), webix.ProgressBar);

				$$(viewId).isRendered = true;

				$$(viewId).showProgress({ type: 'icon' });

				var events = this.getEvent(viewId);

				if (setting.pageIds && setting.pageIds.length > 0) {
					// Convert array to object
					var pageIds = $.map(setting.pageIds, function (id) {
						return { id: id };
					});

					// Get selected pages
					Model.findAll({ or: pageIds })
						.then(function (pages) {

							pages.forEach(function (p) {
								if (p.translate) p.translate();
							});

							// Convert object format (same arrange)
							var pageMenu = [];
							pageIds.forEach(function (page) {
								pageMenu.push({
									id: page.id,
									value: pages.filter(function (p) { return p.id == page.id })[0].label
								});
							});

							// Show page menu
							$$(viewId).parse(pageMenu, 'json');

							$(self).trigger('render', {
								viewId: viewId,
								componentId: componentId
							});

							$$(viewId).hideProgress();

							q.resolve();
						});
				}
				else {
					$(self).trigger('render', {
						viewId: viewId,
						componentId: componentId
					});

					$$(viewId).hideProgress();

					q.resolve();
				}

				return q;
			},

			getSettings: function () {
				var values = $$(componentIds.propertyView).getValues(),
					selectedPages = $$(componentIds.editMenu).find(function () { return true; }),
					selectedPageIds = $.map(selectedPages || [], function (page) {
						return page.id;
					});

				return {
					layout: values.orientation,
					pageIds: selectedPageIds
				};
			},

			populateSettings: function (application, page, item) {
				// Menu
				this.render(componentIds.editMenu, item.id, item.setting);

				// Page list
				$$(componentIds.pageTree).clearAll();
				var pageItems = [];
				if (page) {
					webix.extend($$(componentIds.pageTree), webix.ProgressBar);

					$$(componentIds.pageTree).showProgress({ type: 'icon' });

					var parentId = page.parent ? page.parent.attr('id') : page.attr('id');
					Model.findAll({ or: [{ id: parentId }, { parent: parentId }] }) // Get children
						.fail(function (err) {
							$$(componentIds.pageTree).hideProgress();
						})
						.then(function (pages) {
							pages.forEach(function (p) {
								if (p.translate)
									p.translate();
							});

							pageItems = $.map(pages.attr(), function (p) {
								if (!p.parent) { // Get root page
									var pageItem = {
										id: p.id,
										value: p.name,
										label: p.label
									};

									// Get children pages
									pageItem.data = $.map(pages.attr(), function (subP) {
										if (subP.parent && subP.parent.id == p.id) {
											return {
												id: subP.id,
												value: subP.name,
												label: subP.label
											}
										}
									});

									return pageItem;
								}
							});

							$$(componentIds.pageTree).parse(pageItems);
							$$(componentIds.pageTree).openAll();

							// Set checked items
							if (item.setting.pageIds) {
								item.setting.pageIds.forEach(function (pageId) {
									$$(componentIds.pageTree).checkItem(pageId);
								});
							}

							$$(componentIds.pageTree).hideProgress();
						});
				}

				// Properties
				$$(componentIds.propertyView).setValues({
					orientation: item.setting.layout || 'x'
				});
				$$(componentIds.propertyView).refresh();
			},

			isRendered: function (viewId) {
				return $$(viewId).isRendered === true;
			},

			editStop: function () {
				$$(componentIds.propertyView).editStop();
			}
		};

	}
);