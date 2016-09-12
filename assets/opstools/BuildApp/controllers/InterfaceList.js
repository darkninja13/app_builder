steal(
	// List your Controller's dependencies here:
	'opstools/BuildApp/models/ABPage.js',

	'opstools/BuildApp/controllers/InterfaceAddNewPage.js',

	'opstools/BuildApp/controllers/webix_custom_components/EditTree.js',
	function () {
		System.import('appdev').then(function () {
			steal.import('appdev/ad',
				'appdev/control/control').then(function () {

					// Namespacing conventions:
					// AD.Control.extend('[application].[controller]', [{ static },] {instance} );
					AD.Control.extend('opstools.BuildApp.InterfaceList', {

						init: function (element, options) {
							var self = this;

							options = AD.defaults({
								selectedPageEvent: 'AB_Page.Selected',
								createdPageEvent: 'AB_Page.Created',
								updatedPageEvent: 'AB_Page.Updated',
								deletedPageEvent: 'AB_Page.Deleted'
							}, options);
							this.options = options;

							this.Model = AD.Model.get('opstools.BuildApp.ABPage');

							self.data = {};

							this.webixUiId = {
								interfaceTree: 'ab-interface-tree',

								pageListMenuPopup: 'ab-page-menu-popup',
								pageListMenu: 'ab-page-menu'
							};

							self.initMultilingualLabels();
							self.initControllers();
							self.initEvents();

							self.initWebixUI();
						},

						initMultilingualLabels: function () {
							var self = this;
							self.labels = {};
							self.labels.common = {};
							self.labels.interface = {};

							self.labels.common.rename = AD.lang.label.getLabel('ab.common.rename') || "Rename";
							self.labels.common.delete = AD.lang.label.getLabel('ab.common.delete') || "Delete";
							self.labels.common.renameErrorMessage = AD.lang.label.getLabel('ab.common.rename.error') || "System could not rename <b>{0}</b>.";
							self.labels.common.renameSuccessMessage = AD.lang.label.getLabel('ab.common.rename.success') || "Rename to <b>{0}</b>.";
							self.labels.common.deleteErrorMessage = AD.lang.label.getLabel('ab.common.delete.error') || "System could not delete <b>{0}</b>.";
							self.labels.common.deleteSuccessMessage = AD.lang.label.getLabel('ab.common.delete.success') || "<b>{0}</b> is deleted.";
							self.labels.common.createSuccessMessage = AD.lang.label.getLabel('ab.common.create.success') || "<b>{0}</b> is created.";
							self.labels.common.createErrorMessage = AD.lang.label.getLabel('ab.common.create.error') || "System could not create <b>{0}</b>.";

							self.labels.interface.addNewPage = AD.lang.label.getLabel('ab.interface.addNewPage') || 'Add new page';

							self.labels.interface.confirmDeleteTitle = AD.lang.label.getLabel('ab.interface.delete.title') || "Delete page";
							self.labels.interface.confirmDeleteMessage = AD.lang.label.getLabel('ab.interface.delete.message') || "Do you want to delete <b>{0}</b>?";
						},

						initControllers: function () {
							this.controllers = {};

							var EditTree = AD.Control.get('opstools.BuildApp.EditTree'),
								AddNewPage = AD.Control.get('opstools.BuildApp.InterfaceAddNewPage');

							this.controllers.EditTree = new EditTree();
							this.controllers.AddNewPage = new AddNewPage(this.element, { data: this.data });
						},

						initEvents: function () {
							var self = this;

							// Create new page handler
							self.controllers.AddNewPage.on(self.options.createdPageEvent, function (event, data) {
								self.data.pages.push(data.newPage);

								$$(self.webixUiId.interfaceTree).add({
									id: data.newPage.id,
									value: data.newPage.name,
									label: data.newPage.label
								}, -1, data.newPage.parent ? data.newPage.parent.id : null);

								if (data.newPage.parent)
									$$(self.webixUiId.interfaceTree).open(data.newPage.parent.id, true);

								$$(self.webixUiId.interfaceTree).unselectAll();
								$$(self.webixUiId.interfaceTree).select(data.newPage.id);

								$$(self.webixUiId.interfaceTree).hideProgress();

								// Show success message
								webix.message({
									type: "success",
									text: self.labels.common.createSuccessMessage.replace('{0}', data.newPage.label)
								});

							});
						},

						initWebixUI: function () {
							var self = this;

							self.data.definition = {
								rows: [
									{
										id: self.webixUiId.interfaceTree,
										view: 'edittree',
										width: 250,
										select: true,
										editaction: 'custom',
										editable: true,
										editor: "text",
										editValue: "label",
										template: "<div class='ab-page-list-item'>" +
										"{common.icon()} {common.folder()} #label#" +
										"<div class='ab-page-list-edit'>" +
										"{common.iconGear}" +
										"</div>" +
										"</div>",
										type: {
											iconGear: "<span class='webix_icon fa-cog'></span>"
										},
										on: {
											onAfterSelect: function (id) {
												var selectedPage = self.data.pages.filter(function (p) { return p.id == id; });

												if (selectedPage && selectedPage.length > 0) {
													self.element.trigger(self.options.selectedPageEvent, { selectedPage: selectedPage[0] });
													self.data.selectedPage = selectedPage[0];
												}
												else {
													self.data.selectedPage = null;
												}

												// Show gear icon
												self.showGear(id);
											},
											onAfterOpen: function () {
												var ids = this.getSelectedId(true);

												// Show gear icon
												ids.forEach(function (id) {
													self.showGear(id);
												});
											},
											onAfterClose: function () {
												var ids = this.getSelectedId(true);

												// Show gear icon
												ids.forEach(function (id) {
													self.showGear(id);
												});
											},
											onAfterEditStop: function (state, editor, ignoreUpdate) {
												if (state.value != state.old) {
													$$(self.webixUiId.interfaceTree).showProgress({ type: 'icon' });

													var selectedPage = self.data.pages.filter(function (item, index, list) { return item.id == editor.id; })[0];
													selectedPage.attr('label', state.value);

													// Call server to rename
													selectedPage.save()
														.fail(function () {
															$$(self.webixUiId.interfaceTree).hideProgress();

															// Show gear icon
															self.showGear(result.id);

															webix.message({
																type: "error",
																text: self.labels.common.renameErrorMessage.replace("{0}", state.old)
															});

															AD.error.log('Page List : Error rename page data', { error: err });
														})
														.then(function (result) {
															if (selectedPage.translate) selectedPage.translate();

															// Show success message
															webix.message({
																type: "success",
																text: self.labels.common.renameSuccessMessage.replace('{0}', state.value)
															});

															// Show gear icon
															$($$(self.webixUiId.interfaceTree).getItemNode(editor.id)).find('.ab-object-list-edit').show();

															$$(self.webixUiId.interfaceTree).hideProgress();

															// Show gear icon
															self.showGear(result.id);

															self.element.trigger(self.options.updatedPageEvent, { updatedPageId: result.id });
														});
												}
											},
											onAfterDelete: function (id) {
												// Fire unselect page event
												self.element.trigger(self.options.deletedPageEvent, {});
											}
										},
										onClick: {
											"ab-page-list-edit": function (e, id, trg) {
												// Show menu
												$$(self.webixUiId.pageListMenuPopup).show(trg);

												return false;
											}
										}
									},
									{
										view: 'button',
										value: self.labels.interface.addNewPage,
										click: function () {
											self.controllers.AddNewPage.show();
										}
									}
								]
							};

							// Edit page menu popup
							webix.ui({
								view: "popup",
								id: self.webixUiId.pageListMenuPopup,
								width: 130,
								body: {
									id: self.webixUiId.pageListMenu,
									view: "list",
									data: [
										{ command: self.labels.common.rename, icon: "fa-pencil-square-o" },
										{ command: self.labels.common.delete, icon: "fa-trash" }
									],
									datatype: "json",

									template: "<i class='fa #icon#' aria-hidden='true'></i> #command#",
									autoheight: true,
									select: false,
									on: {
										'onItemClick': function (timestamp, e, trg) {
											var selectedPage = $$(self.webixUiId.interfaceTree).getSelectedItem();

											switch (trg.textContent.trim()) {
												case self.labels.common.rename:
													// Show textbox to rename
													$$(self.webixUiId.interfaceTree).edit(selectedPage.id);

													break;
												case self.labels.common.delete:
													webix.confirm({
														title: self.labels.interface.confirmDeleteTitle,
														ok: self.labels.common.yes,
														cancel: self.labels.common.no,
														text: self.labels.interface.confirmDeleteMessage.replace('{0}', selectedPage.label),
														callback: function (result) {
															if (result) {
																$$(self.webixUiId.interfaceTree).showProgress({ type: "icon" });

																var deletedPages = self.data.pages.filter(function (p) { return p.id == selectedPage.id; });

																// Call server to delete object data
																deletedPages[0].destroy()
																	.fail(function (err) {
																		$$(self.webixUiId.interfaceTree).hideProgress();

																		webix.message({
																			type: "error",
																			text: self.labels.common.deleteErrorMessage.replace("{0}", selectedPage.name)
																		});

																		AD.error.log('Pages List : Error delete page data', { error: err });
																	})
																	.then(function (result) {
																		self.data.pages.forEach(function (item, index, list) {
																			if (item && item.id === result.id)
																				self.data.pages.splice(index, 1);
																		});

																		$$(self.webixUiId.interfaceTree).remove(result.id);
																		$$(self.webixUiId.interfaceTree).unselectAll();

																		self.element.trigger(self.options.updatedPageEvent, { pagesList: self.data.pages });

																		webix.message({
																			type: "success",
																			text: self.labels.common.deleteSuccessMessage.replace('{0}', result.label)
																		});

																		$$(self.webixUiId.interfaceTree).hideProgress();

																	});
															}

														}
													});

													break;
											}

											$$(self.webixUiId.pageListMenuPopup).hide();
										}
									}
								}
							}).hide(); // end Edit page menu popup

						},

						webix_ready: function () {
							var self = this;

							webix.extend($$(self.webixUiId.interfaceTree), webix.ProgressBar);

							self.controllers.AddNewPage.webix_ready();
						},

						getUIDefinition: function () {
							return this.data.definition;
						},

						loadPages: function (appId) {
							var self = this;

							self.data.appId = appId;

							$$(self.webixUiId.interfaceTree).clearAll();
							$$(self.webixUiId.interfaceTree).showProgress({ type: 'icon' });

							self.Model.findAll({ application: appId })
								.fail(function (err) {
									$$(self.webixUiId.interfaceTree).hideProgress();

									webix.message({
										type: "error",
										text: err
									});

									AD.error.log('Page list : Error loading page list data', { error: err });
								})
								.then(function (data) {
									if (data && data.length > 0) {
										data.forEach(function (d) {
											if (d.translate)
												d.translate();
										});
									}

									self.data.pages = data;

									// Show data to tree component
									var treeData = $.map(data.attr(), function (d) {
										if (!d.parent) { // Get root page
											var pageItem = {
												id: d.id,
												value: d.name,
												label: d.label
											};

											// Get children pages
											pageItem.data = $.map(data.attr(), function (subD) {
												if (subD.parent && subD.parent.id == d.id) {
													return {
														id: subD.id,
														value: subD.name,
														label: subD.label
													}
												}
											});

											return pageItem;
										}
									});

									$$(self.webixUiId.interfaceTree).parse(treeData);

									$$(self.webixUiId.interfaceTree).hideProgress();
								})
						},

						showGear: function (id) {
							var self = this;

							$($$(self.webixUiId.interfaceTree).getItemNode(id)).find('.ab-page-list-edit').show();
						},

						resize: function (height) {
							var self = this,
								selectedPages = $$(self.webixUiId.interfaceTree).getSelectedId(true);

							if (selectedPages && selectedPages.length > 0)
								self.showGear(selectedPages[0]);
						}


					});
				});
		});
	}
);