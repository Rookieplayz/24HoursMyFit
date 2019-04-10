(function() {
    /*

 Copyright 2015 Google Inc. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
    var componentHandler = {
        upgradeDom: function(optJsClass, optCssClass) {},
        upgradeElement: function(element, optJsClass) {},
        upgradeElements: function(elements) {},
        upgradeAllRegistered: function() {},
        registerUpgradedCallback: function(jsClass, callback) {},
        register: function(config) {},
        downgradeElements: function(nodes) {}
    };
    componentHandler = function() {
        var registeredComponents_ = [];
        var createdComponents_ = [];
        var componentConfigProperty_ = "mdlComponentConfigInternal_";

        function findRegisteredClass_(name, optReplace) {
            for (var i = 0; i < registeredComponents_.length; i++)
                if (registeredComponents_[i].className === name) {
                    if (typeof optReplace !== "undefined") registeredComponents_[i] = optReplace;
                    return registeredComponents_[i]
                } return false
        }

        function getUpgradedListOfElement_(element) {
            var dataUpgraded = element.getAttribute("data-upgraded");
            return dataUpgraded ===
                null ? [""] : dataUpgraded.split(",")
        }

        function isElementUpgraded_(element, jsClass) {
            var upgradedList = getUpgradedListOfElement_(element);
            return upgradedList.indexOf(jsClass) !== -1
        }

        function createEvent_(eventType, bubbles, cancelable) {
            if ("CustomEvent" in window && typeof window.CustomEvent === "function") return new CustomEvent(eventType, {
                bubbles: bubbles,
                cancelable: cancelable
            });
            else {
                var ev = document.createEvent("Events");
                ev.initEvent(eventType, bubbles, cancelable);
                return ev
            }
        }

        function upgradeDomInternal(optJsClass,
            optCssClass) {
            if (typeof optJsClass === "undefined" && typeof optCssClass === "undefined")
                for (var i = 0; i < registeredComponents_.length; i++) upgradeDomInternal(registeredComponents_[i].className, registeredComponents_[i].cssClass);
            else {
                var jsClass = optJsClass;
                if (typeof optCssClass === "undefined") {
                    var registeredClass = findRegisteredClass_(jsClass);
                    if (registeredClass) optCssClass = registeredClass.cssClass
                }
                var elements = document.querySelectorAll("." + optCssClass);
                for (var n = 0; n < elements.length; n++) upgradeElementInternal(elements[n],
                    jsClass)
            }
        }

        function upgradeElementInternal(element, optJsClass) {
            if (!(typeof element === "object" && element instanceof Element)) throw new Error("Invalid argument provided to upgrade MDL element.");
            var upgradingEv = createEvent_("mdl-componentupgrading", true, true);
            element.dispatchEvent(upgradingEv);
            if (upgradingEv.defaultPrevented) return;
            var upgradedList = getUpgradedListOfElement_(element);
            var classesToUpgrade = [];
            if (!optJsClass) {
                var classList = element.classList;
                registeredComponents_.forEach(function(component) {
                    if (classList.contains(component.cssClass) &&
                        classesToUpgrade.indexOf(component) === -1 && !isElementUpgraded_(element, component.className)) classesToUpgrade.push(component)
                })
            } else if (!isElementUpgraded_(element, optJsClass)) classesToUpgrade.push(findRegisteredClass_(optJsClass));
            for (var i = 0, n = classesToUpgrade.length, registeredClass; i < n; i++) {
                registeredClass = classesToUpgrade[i];
                if (registeredClass) {
                    upgradedList.push(registeredClass.className);
                    element.setAttribute("data-upgraded", upgradedList.join(","));
                    var instance = new registeredClass.classConstructor(element);
                    instance[componentConfigProperty_] = registeredClass;
                    createdComponents_.push(instance);
                    for (var j = 0, m = registeredClass.callbacks.length; j < m; j++) registeredClass.callbacks[j](element);
                    if (registeredClass.widget) element[registeredClass.className] = instance
                } else throw new Error("Unable to find a registered component for the given class.");
                var upgradedEv = createEvent_("mdl-componentupgraded", true, false);
                element.dispatchEvent(upgradedEv)
            }
        }

        function upgradeElementsInternal(elements) {
            if (!Array.isArray(elements))
                if (elements instanceof Element) elements = [elements];
                else elements = Array.prototype.slice.call(elements);
            for (var i = 0, n = elements.length, element; i < n; i++) {
                element = elements[i];
                if (element instanceof HTMLElement) {
                    upgradeElementInternal(element);
                    if (element.children.length > 0) upgradeElementsInternal(element.children)
                }
            }
        }

        function registerInternal(config) {
            var widgetMissing = typeof config.widget === "undefined" && typeof config["widget"] === "undefined";
            var widget = true;
            if (!widgetMissing) widget = config.widget || config["widget"];
            var newConfig = {
                classConstructor: config.constructor ||
                    config["constructor"],
                className: config.classAsString || config["classAsString"],
                cssClass: config.cssClass || config["cssClass"],
                widget: widget,
                callbacks: []
            };
            registeredComponents_.forEach(function(item) {
                if (item.cssClass === newConfig.cssClass) throw new Error("The provided cssClass has already been registered: " + item.cssClass);
                if (item.className === newConfig.className) throw new Error("The provided className has already been registered");
            });
            if (config.constructor.prototype.hasOwnProperty(componentConfigProperty_)) throw new Error("MDL component classes must not have " +
                componentConfigProperty_ + " defined as a property.");
            var found = findRegisteredClass_(config.classAsString, newConfig);
            if (!found) registeredComponents_.push(newConfig)
        }

        function registerUpgradedCallbackInternal(jsClass, callback) {
            var regClass = findRegisteredClass_(jsClass);
            if (regClass) regClass.callbacks.push(callback)
        }

        function upgradeAllRegisteredInternal() {
            for (var n = 0; n < registeredComponents_.length; n++) upgradeDomInternal(registeredComponents_[n].className)
        }

        function deconstructComponentInternal(component) {
            if (component) {
                var componentIndex =
                    createdComponents_.indexOf(component);
                createdComponents_.splice(componentIndex, 1);
                var upgrades = component.element_.getAttribute("data-upgraded").split(",");
                var componentPlace = upgrades.indexOf(component[componentConfigProperty_].classAsString);
                upgrades.splice(componentPlace, 1);
                component.element_.setAttribute("data-upgraded", upgrades.join(","));
                var ev = createEvent_("mdl-componentdowngraded", true, false);
                component.element_.dispatchEvent(ev)
            }
        }

        function downgradeNodesInternal(nodes) {
            var downgradeNode = function(node) {
                createdComponents_.filter(function(item) {
                    return item.element_ ===
                        node
                }).forEach(deconstructComponentInternal)
            };
            if (nodes instanceof Array || nodes instanceof NodeList)
                for (var n = 0; n < nodes.length; n++) downgradeNode(nodes[n]);
            else if (nodes instanceof Node) downgradeNode(nodes);
            else throw new Error("Invalid argument provided to downgrade MDL nodes.");
        }
        return {
            upgradeDom: upgradeDomInternal,
            upgradeElement: upgradeElementInternal,
            upgradeElements: upgradeElementsInternal,
            upgradeAllRegistered: upgradeAllRegisteredInternal,
            registerUpgradedCallback: registerUpgradedCallbackInternal,
            register: registerInternal,
            downgradeElements: downgradeNodesInternal
        }
    }();
    componentHandler.ComponentConfigPublic;
    componentHandler.ComponentConfig;
    componentHandler.Component;
    componentHandler["upgradeDom"] = componentHandler.upgradeDom;
    componentHandler["upgradeElement"] = componentHandler.upgradeElement;
    componentHandler["upgradeElements"] = componentHandler.upgradeElements;
    componentHandler["upgradeAllRegistered"] = componentHandler.upgradeAllRegistered;
    componentHandler["registerUpgradedCallback"] = componentHandler.registerUpgradedCallback;
    componentHandler["register"] = componentHandler.register;
    componentHandler["downgradeElements"] = componentHandler.downgradeElements;
    window.componentHandler = componentHandler;
    window["componentHandler"] = componentHandler;
    window.addEventListener("load", function() {
        if ("classList" in document.createElement("div") && "querySelector" in document && "addEventListener" in window && Array.prototype.forEach) {
            document.documentElement.classList.add("mdl-js");
            componentHandler.upgradeAllRegistered()
        } else {
            componentHandler.upgradeElement = function() {};
            componentHandler.register = function() {}
        }
    });
    (function() {
        var MaterialButton = function MaterialButton(element) {
            this.element_ = element;
            this.init()
        };
        window["MaterialButton"] = MaterialButton;
        MaterialButton.prototype.Constant_ = {};
        MaterialButton.prototype.CssClasses_ = {
            RIPPLE_EFFECT: "mdl-js-ripple-effect",
            RIPPLE_CONTAINER: "mdl-button__ripple-container",
            RIPPLE: "mdl-ripple"
        };
        MaterialButton.prototype.blurHandler_ = function(event) {
            if (event) this.element_.blur()
        };
        MaterialButton.prototype.disable = function() {
            this.element_.disabled = true
        };
        MaterialButton.prototype["disable"] =
            MaterialButton.prototype.disable;
        MaterialButton.prototype.enable = function() {
            this.element_.disabled = false
        };
        MaterialButton.prototype["enable"] = MaterialButton.prototype.enable;
        MaterialButton.prototype.init = function() {
            if (this.element_) {
                if (this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)) {
                    var rippleContainer = document.createElement("span");
                    rippleContainer.classList.add(this.CssClasses_.RIPPLE_CONTAINER);
                    this.rippleElement_ = document.createElement("span");
                    this.rippleElement_.classList.add(this.CssClasses_.RIPPLE);
                    rippleContainer.appendChild(this.rippleElement_);
                    this.boundRippleBlurHandler = this.blurHandler_.bind(this);
                    this.rippleElement_.addEventListener("mouseup", this.boundRippleBlurHandler);
                    this.element_.appendChild(rippleContainer)
                }
                this.boundButtonBlurHandler = this.blurHandler_.bind(this);
                this.element_.addEventListener("mouseup", this.boundButtonBlurHandler);
                this.element_.addEventListener("mouseleave", this.boundButtonBlurHandler)
            }
        };
        componentHandler.register({
            constructor: MaterialButton,
            classAsString: "MaterialButton",
            cssClass: "mdl-js-button",
            widget: true
        })
    })();
    (function() {
        var MaterialProgress = function MaterialProgress(element) {
            this.element_ = element;
            this.init()
        };
        window["MaterialProgress"] = MaterialProgress;
        MaterialProgress.prototype.Constant_ = {};
        MaterialProgress.prototype.CssClasses_ = {
            INDETERMINATE_CLASS: "mdl-progress__indeterminate"
        };
        MaterialProgress.prototype.setProgress = function(p) {
            if (this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)) return;
            this.progressbar_.style.width = p + "%"
        };
        MaterialProgress.prototype["setProgress"] = MaterialProgress.prototype.setProgress;
        MaterialProgress.prototype.setBuffer = function(p) {
            this.bufferbar_.style.width = p + "%";
            this.auxbar_.style.width = 100 - p + "%"
        };
        MaterialProgress.prototype["setBuffer"] = MaterialProgress.prototype.setBuffer;
        MaterialProgress.prototype.init = function() {
            if (this.element_) {
                var el = document.createElement("div");
                el.className = "progressbar bar bar1";
                this.element_.appendChild(el);
                this.progressbar_ = el;
                el = document.createElement("div");
                el.className = "bufferbar bar bar2";
                this.element_.appendChild(el);
                this.bufferbar_ = el;
                el = document.createElement("div");
                el.className = "auxbar bar bar3";
                this.element_.appendChild(el);
                this.auxbar_ = el;
                this.progressbar_.style.width = "0%";
                this.bufferbar_.style.width = "100%";
                this.auxbar_.style.width = "0%";
                this.element_.classList.add("is-upgraded")
            }
        };
        componentHandler.register({
            constructor: MaterialProgress,
            classAsString: "MaterialProgress",
            cssClass: "mdl-js-progress",
            widget: true
        })
    })();
    (function() {
        var MaterialSpinner = function MaterialSpinner(element) {
            this.element_ = element;
            this.init()
        };
        window["MaterialSpinner"] = MaterialSpinner;
        MaterialSpinner.prototype.Constant_ = {
            MDL_SPINNER_LAYER_COUNT: 4
        };
        MaterialSpinner.prototype.CssClasses_ = {
            MDL_SPINNER_LAYER: "mdl-spinner__layer",
            MDL_SPINNER_CIRCLE_CLIPPER: "mdl-spinner__circle-clipper",
            MDL_SPINNER_CIRCLE: "mdl-spinner__circle",
            MDL_SPINNER_GAP_PATCH: "mdl-spinner__gap-patch",
            MDL_SPINNER_LEFT: "mdl-spinner__left",
            MDL_SPINNER_RIGHT: "mdl-spinner__right"
        };
        MaterialSpinner.prototype.createLayer = function(index) {
            var layer = document.createElement("div");
            layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER);
            layer.classList.add(this.CssClasses_.MDL_SPINNER_LAYER + "-" + index);
            var leftClipper = document.createElement("div");
            leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
            leftClipper.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);
            var gapPatch = document.createElement("div");
            gapPatch.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);
            var rightClipper =
                document.createElement("div");
            rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER);
            rightClipper.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);
            var circleOwners = [leftClipper, gapPatch, rightClipper];
            for (var i = 0; i < circleOwners.length; i++) {
                var circle = document.createElement("div");
                circle.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE);
                circleOwners[i].appendChild(circle)
            }
            layer.appendChild(leftClipper);
            layer.appendChild(gapPatch);
            layer.appendChild(rightClipper);
            this.element_.appendChild(layer)
        };
        MaterialSpinner.prototype["createLayer"] = MaterialSpinner.prototype.createLayer;
        MaterialSpinner.prototype.stop = function() {
            this.element_.classList.remove("is-active")
        };
        MaterialSpinner.prototype["stop"] = MaterialSpinner.prototype.stop;
        MaterialSpinner.prototype.start = function() {
            this.element_.classList.add("is-active")
        };
        MaterialSpinner.prototype["start"] = MaterialSpinner.prototype.start;
        MaterialSpinner.prototype.init = function() {
            if (this.element_) {
                for (var i = 1; i <= this.Constant_.MDL_SPINNER_LAYER_COUNT; i++) this.createLayer(i);
                this.element_.classList.add("is-upgraded")
            }
        };
        componentHandler.register({
            constructor: MaterialSpinner,
            classAsString: "MaterialSpinner",
            cssClass: "mdl-js-spinner",
            widget: true
        })
    })();
    (function() {
        var MaterialTextfield = function MaterialTextfield(element) {
            this.element_ = element;
            this.maxRows = this.Constant_.NO_MAX_ROWS;
            this.init()
        };
        window["MaterialTextfield"] = MaterialTextfield;
        MaterialTextfield.prototype.Constant_ = {
            NO_MAX_ROWS: -1,
            MAX_ROWS_ATTRIBUTE: "maxrows"
        };
        MaterialTextfield.prototype.CssClasses_ = {
            LABEL: "mdl-textfield__label",
            INPUT: "mdl-textfield__input",
            IS_DIRTY: "is-dirty",
            IS_FOCUSED: "is-focused",
            IS_DISABLED: "is-disabled",
            IS_INVALID: "is-invalid",
            IS_UPGRADED: "is-upgraded",
            HAS_PLACEHOLDER: "has-placeholder"
        };
        MaterialTextfield.prototype.onKeyDown_ = function(event) {
            var currentRowCount = event.target.value.split("\n").length;
            if (event.keyCode === 13)
                if (currentRowCount >= this.maxRows) event.preventDefault()
        };
        MaterialTextfield.prototype.onFocus_ = function(event) {
            this.element_.classList.add(this.CssClasses_.IS_FOCUSED)
        };
        MaterialTextfield.prototype.onBlur_ = function(event) {
            this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)
        };
        MaterialTextfield.prototype.onReset_ = function(event) {
            this.updateClasses_()
        };
        MaterialTextfield.prototype.updateClasses_ =
            function() {
                this.checkDisabled();
                this.checkValidity();
                this.checkDirty();
                this.checkFocus()
            };
        MaterialTextfield.prototype.checkDisabled = function() {
            if (this.input_.disabled) this.element_.classList.add(this.CssClasses_.IS_DISABLED);
            else this.element_.classList.remove(this.CssClasses_.IS_DISABLED)
        };
        MaterialTextfield.prototype["checkDisabled"] = MaterialTextfield.prototype.checkDisabled;
        MaterialTextfield.prototype.checkFocus = function() {
            if (Boolean(this.element_.querySelector(":focus"))) this.element_.classList.add(this.CssClasses_.IS_FOCUSED);
            else this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)
        };
        MaterialTextfield.prototype["checkFocus"] = MaterialTextfield.prototype.checkFocus;
        MaterialTextfield.prototype.checkValidity = function() {
            if (this.input_.validity)
                if (this.input_.validity.valid) this.element_.classList.remove(this.CssClasses_.IS_INVALID);
                else this.element_.classList.add(this.CssClasses_.IS_INVALID)
        };
        MaterialTextfield.prototype["checkValidity"] = MaterialTextfield.prototype.checkValidity;
        MaterialTextfield.prototype.checkDirty =
            function() {
                if (this.input_.value && this.input_.value.length > 0) this.element_.classList.add(this.CssClasses_.IS_DIRTY);
                else this.element_.classList.remove(this.CssClasses_.IS_DIRTY)
            };
        MaterialTextfield.prototype["checkDirty"] = MaterialTextfield.prototype.checkDirty;
        MaterialTextfield.prototype.disable = function() {
            this.input_.disabled = true;
            this.updateClasses_()
        };
        MaterialTextfield.prototype["disable"] = MaterialTextfield.prototype.disable;
        MaterialTextfield.prototype.enable = function() {
            this.input_.disabled = false;
            this.updateClasses_()
        };
        MaterialTextfield.prototype["enable"] = MaterialTextfield.prototype.enable;
        MaterialTextfield.prototype.change = function(value) {
            this.input_.value = value || "";
            this.updateClasses_()
        };
        MaterialTextfield.prototype["change"] = MaterialTextfield.prototype.change;
        MaterialTextfield.prototype.init = function() {
            if (this.element_) {
                this.label_ = this.element_.querySelector("." + this.CssClasses_.LABEL);
                this.input_ = this.element_.querySelector("." + this.CssClasses_.INPUT);
                if (this.input_) {
                    if (this.input_.hasAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE)) {
                        this.maxRows =
                            parseInt(this.input_.getAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE), 10);
                        if (isNaN(this.maxRows)) this.maxRows = this.Constant_.NO_MAX_ROWS
                    }
                    if (this.input_.hasAttribute("placeholder")) this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER);
                    this.boundUpdateClassesHandler = this.updateClasses_.bind(this);
                    this.boundFocusHandler = this.onFocus_.bind(this);
                    this.boundBlurHandler = this.onBlur_.bind(this);
                    this.boundResetHandler = this.onReset_.bind(this);
                    this.input_.addEventListener("input", this.boundUpdateClassesHandler);
                    this.input_.addEventListener("focus", this.boundFocusHandler);
                    this.input_.addEventListener("blur", this.boundBlurHandler);
                    this.input_.addEventListener("reset", this.boundResetHandler);
                    if (this.maxRows !== this.Constant_.NO_MAX_ROWS) {
                        this.boundKeyDownHandler = this.onKeyDown_.bind(this);
                        this.input_.addEventListener("keydown", this.boundKeyDownHandler)
                    }
                    var invalid = this.element_.classList.contains(this.CssClasses_.IS_INVALID);
                    this.updateClasses_();
                    this.element_.classList.add(this.CssClasses_.IS_UPGRADED);
                    if (invalid) this.element_.classList.add(this.CssClasses_.IS_INVALID);
                    if (this.input_.hasAttribute("autofocus")) {
                        this.element_.focus();
                        this.checkFocus()
                    }
                }
            }
        };
        componentHandler.register({
            constructor: MaterialTextfield,
            classAsString: "MaterialTextfield",
            cssClass: "mdl-js-textfield",
            widget: true
        })
    })();
    (function() {
        var supportCustomEvent = window.CustomEvent;
        if (!supportCustomEvent || typeof supportCustomEvent === "object") {
            supportCustomEvent = function CustomEvent(event, x) {
                x = x || {};
                var ev = document.createEvent("CustomEvent");
                ev.initCustomEvent(event, !!x.bubbles, !!x.cancelable, x.detail || null);
                return ev
            };
            supportCustomEvent.prototype = window.Event.prototype
        }

        function createsStackingContext(el) {
            while (el && el !== document.body) {
                var s = window.getComputedStyle(el);
                var invalid = function(k, ok) {
                    return !(s[k] === undefined || s[k] ===
                        ok)
                };
                if (s.opacity < 1 || invalid("zIndex", "auto") || invalid("transform", "none") || invalid("mixBlendMode", "normal") || invalid("filter", "none") || invalid("perspective", "none") || s["isolation"] === "isolate" || s.position === "fixed" || s.webkitOverflowScrolling === "touch") return true;
                el = el.parentElement
            }
            return false
        }

        function findNearestDialog(el) {
            while (el) {
                if (el.localName === "dialog") return el;
                el = el.parentElement
            }
            return null
        }

        function safeBlur(el) {
            if (el && el.blur && el !== document.body) el.blur()
        }

        function inNodeList(nodeList,
            node) {
            for (var i = 0; i < nodeList.length; ++i)
                if (nodeList[i] === node) return true;
            return false
        }

        function isFormMethodDialog(el) {
            if (!el || !el.hasAttribute("method")) return false;
            return el.getAttribute("method").toLowerCase() === "dialog"
        }

        function dialogPolyfillInfo(dialog) {
            this.dialog_ = dialog;
            this.replacedStyleTop_ = false;
            this.openAsModal_ = false;
            if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
            dialog.show = this.show.bind(this);
            dialog.showModal = this.showModal.bind(this);
            dialog.close = this.close.bind(this);
            if (!("returnValue" in dialog)) dialog.returnValue = "";
            if ("MutationObserver" in window) {
                var mo = new MutationObserver(this.maybeHideModal.bind(this));
                mo.observe(dialog, {
                    attributes: true,
                    attributeFilter: ["open"]
                })
            } else {
                var removed = false;
                var cb = function() {
                    removed ? this.downgradeModal() : this.maybeHideModal();
                    removed = false
                }.bind(this);
                var timeout;
                var delayModel = function(ev) {
                    if (ev.target !== dialog) return;
                    var cand = "DOMNodeRemoved";
                    removed |= ev.type.substr(0, cand.length) === cand;
                    window.clearTimeout(timeout);
                    timeout =
                        window.setTimeout(cb, 0)
                };
                ["DOMAttrModified", "DOMNodeRemoved", "DOMNodeRemovedFromDocument"].forEach(function(name) {
                    dialog.addEventListener(name, delayModel)
                })
            }
            Object.defineProperty(dialog, "open", {
                set: this.setOpen.bind(this),
                get: dialog.hasAttribute.bind(dialog, "open")
            });
            this.backdrop_ = document.createElement("div");
            this.backdrop_.className = "backdrop";
            this.backdrop_.addEventListener("click", this.backdropClick_.bind(this))
        }
        dialogPolyfillInfo.prototype = {
            get dialog() {
                return this.dialog_
            },
            maybeHideModal: function() {
                if (this.dialog_.hasAttribute("open") &&
                    document.body.contains(this.dialog_)) return;
                this.downgradeModal()
            },
            downgradeModal: function() {
                if (!this.openAsModal_) return;
                this.openAsModal_ = false;
                this.dialog_.style.zIndex = "";
                if (this.replacedStyleTop_) {
                    this.dialog_.style.top = "";
                    this.replacedStyleTop_ = false
                }
                this.backdrop_.parentNode && this.backdrop_.parentNode.removeChild(this.backdrop_);
                dialogPolyfill.dm.removeDialog(this)
            },
            setOpen: function(value) {
                if (value) this.dialog_.hasAttribute("open") || this.dialog_.setAttribute("open", "");
                else {
                    this.dialog_.removeAttribute("open");
                    this.maybeHideModal()
                }
            },
            backdropClick_: function(e) {
                if (!this.dialog_.hasAttribute("tabindex")) {
                    var fake = document.createElement("div");
                    this.dialog_.insertBefore(fake, this.dialog_.firstChild);
                    fake.tabIndex = -1;
                    fake.focus();
                    this.dialog_.removeChild(fake)
                } else this.dialog_.focus();
                var redirectedEvent = document.createEvent("MouseEvents");
                redirectedEvent.initMouseEvent(e.type, e.bubbles, e.cancelable, window, e.detail, e.screenX, e.screenY, e.clientX, e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
                this.dialog_.dispatchEvent(redirectedEvent);
                e.stopPropagation()
            },
            focus_: function() {
                var target = this.dialog_.querySelector("[autofocus]:not([disabled])");
                if (!target && this.dialog_.tabIndex >= 0) target = this.dialog_;
                if (!target) {
                    var opts = ["button", "input", "keygen", "select", "textarea"];
                    var query = opts.map(function(el) {
                        return el + ":not([disabled])"
                    });
                    query.push('[tabindex]:not([disabled]):not([tabindex=""])');
                    target = this.dialog_.querySelector(query.join(", "))
                }
                safeBlur(document.activeElement);
                target && target.focus()
            },
            updateZIndex: function(dialogZ, backdropZ) {
                if (dialogZ < backdropZ) throw new Error("dialogZ should never be < backdropZ");
                this.dialog_.style.zIndex = dialogZ;
                this.backdrop_.style.zIndex = backdropZ
            },
            show: function() {
                if (!this.dialog_.open) {
                    this.setOpen(true);
                    this.focus_()
                }
            },
            showModal: function() {
                if (this.dialog_.hasAttribute("open")) throw new Error("Failed to execute 'showModal' on dialog: The element is already open, and therefore cannot be opened modally.");
                if (!document.body.contains(this.dialog_)) throw new Error("Failed to execute 'showModal' on dialog: The element is not in a Document.");
                if (!dialogPolyfill.dm.pushDialog(this)) throw new Error("Failed to execute 'showModal' on dialog: There are too many open modal dialogs.");
                if (createsStackingContext(this.dialog_.parentElement)) console.warn("A dialog is being shown inside a stacking context. " + "This may cause it to be unusable. For more information, see this link: " + "https://github.com/GoogleChrome/dialog-polyfill/#stacking-context");
                this.setOpen(true);
                this.openAsModal_ = true;
                if (dialogPolyfill.needsCentering(this.dialog_)) {
                    dialogPolyfill.reposition(this.dialog_);
                    this.replacedStyleTop_ = true
                } else this.replacedStyleTop_ = false;
                this.dialog_.parentNode.insertBefore(this.backdrop_, this.dialog_.nextSibling);
                this.focus_()
            },
            close: function(opt_returnValue) {
                if (!this.dialog_.hasAttribute("open")) throw new Error("Failed to execute 'close' on dialog: The element does not have an 'open' attribute, and therefore cannot be closed.");
                this.setOpen(false);
                if (opt_returnValue !== undefined) this.dialog_.returnValue = opt_returnValue;
                var closeEvent = new supportCustomEvent("close", {
                    bubbles: false,
                    cancelable: false
                });
                this.dialog_.dispatchEvent(closeEvent)
            }
        };
        var dialogPolyfill = {};
        dialogPolyfill.reposition = function(element) {
            var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
            var topValue = scrollTop + (window.innerHeight - element.offsetHeight) / 2;
            element.style.top = Math.max(scrollTop, topValue) + "px"
        };
        dialogPolyfill.isInlinePositionSetByStylesheet = function(element) {
            for (var i = 0; i < document.styleSheets.length; ++i) {
                var styleSheet = document.styleSheets[i];
                var cssRules = null;
                try {
                    cssRules =
                        styleSheet.cssRules
                } catch (e) {}
                if (!cssRules) continue;
                for (var j = 0; j < cssRules.length; ++j) {
                    var rule = cssRules[j];
                    var selectedNodes = null;
                    try {
                        selectedNodes = document.querySelectorAll(rule.selectorText)
                    } catch (e$0) {}
                    if (!selectedNodes || !inNodeList(selectedNodes, element)) continue;
                    var cssTop = rule.style.getPropertyValue("top");
                    var cssBottom = rule.style.getPropertyValue("bottom");
                    if (cssTop && cssTop !== "auto" || cssBottom && cssBottom !== "auto") return true
                }
            }
            return false
        };
        dialogPolyfill.needsCentering = function(dialog) {
            var computedStyle =
                window.getComputedStyle(dialog);
            if (computedStyle.position !== "absolute") return false;
            if (dialog.style.top !== "auto" && dialog.style.top !== "" || dialog.style.bottom !== "auto" && dialog.style.bottom !== "") return false;
            return !dialogPolyfill.isInlinePositionSetByStylesheet(dialog)
        };
        dialogPolyfill.forceRegisterDialog = function(element) {
            if (window.HTMLDialogElement || element.showModal) console.warn("This browser already supports <dialog>, the polyfill " + "may not work correctly", element);
            if (element.localName !== "dialog") throw new Error("Failed to register dialog: The element is not a dialog.");
            new dialogPolyfillInfo(element)
        };
        dialogPolyfill.registerDialog = function(element) {
            if (!element.showModal) dialogPolyfill.forceRegisterDialog(element)
        };
        dialogPolyfill.DialogManager = function() {
            this.pendingDialogStack = [];
            var checkDOM = this.checkDOM_.bind(this);
            this.overlay = document.createElement("div");
            this.overlay.className = "_dialog_overlay";
            this.overlay.addEventListener("click", function(e) {
                this.forwardTab_ = undefined;
                e.stopPropagation();
                checkDOM([])
            }.bind(this));
            this.handleKey_ = this.handleKey_.bind(this);
            this.handleFocus_ = this.handleFocus_.bind(this);
            this.zIndexLow_ = 1E5;
            this.zIndexHigh_ = 1E5 + 150;
            this.forwardTab_ = undefined;
            if ("MutationObserver" in window) this.mo_ = new MutationObserver(function(records) {
                var removed = [];
                records.forEach(function(rec) {
                    for (var i = 0, c; c = rec.removedNodes[i]; ++i) {
                        if (!(c instanceof Element)) continue;
                        else if (c.localName === "dialog") removed.push(c);
                        removed = removed.concat(c.querySelectorAll("dialog"))
                    }
                });
                removed.length && checkDOM(removed)
            })
        };
        dialogPolyfill.DialogManager.prototype.blockDocument =
            function() {
                document.documentElement.addEventListener("focus", this.handleFocus_, true);
                document.addEventListener("keydown", this.handleKey_);
                this.mo_ && this.mo_.observe(document, {
                    childList: true,
                    subtree: true
                })
            };
        dialogPolyfill.DialogManager.prototype.unblockDocument = function() {
            document.documentElement.removeEventListener("focus", this.handleFocus_, true);
            document.removeEventListener("keydown", this.handleKey_);
            this.mo_ && this.mo_.disconnect()
        };
        dialogPolyfill.DialogManager.prototype.updateStacking = function() {
            var zIndex =
                this.zIndexHigh_;
            for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i) {
                dpi.updateZIndex(--zIndex, --zIndex);
                if (i === 0) this.overlay.style.zIndex = --zIndex
            }
            var last = this.pendingDialogStack[0];
            if (last) {
                var p = last.dialog.parentNode || document.body;
                p.appendChild(this.overlay)
            } else if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay)
        };
        dialogPolyfill.DialogManager.prototype.containedByTopDialog_ = function(candidate) {
            while (candidate = findNearestDialog(candidate)) {
                for (var i = 0, dpi; dpi = this.pendingDialogStack[i]; ++i)
                    if (dpi.dialog ===
                        candidate) return i === 0;
                candidate = candidate.parentElement
            }
            return false
        };
        dialogPolyfill.DialogManager.prototype.handleFocus_ = function(event) {
            if (this.containedByTopDialog_(event.target)) return;
            event.preventDefault();
            event.stopPropagation();
            safeBlur(event.target);
            if (this.forwardTab_ === undefined) return;
            var dpi = this.pendingDialogStack[0];
            var dialog = dpi.dialog;
            var position = dialog.compareDocumentPosition(event.target);
            if (position & Node.DOCUMENT_POSITION_PRECEDING)
                if (this.forwardTab_) dpi.focus_();
                else document.documentElement.focus();
            else;
            return false
        };
        dialogPolyfill.DialogManager.prototype.handleKey_ = function(event) {
            this.forwardTab_ = undefined;
            if (event.keyCode === 27) {
                event.preventDefault();
                event.stopPropagation();
                var cancelEvent = new supportCustomEvent("cancel", {
                    bubbles: false,
                    cancelable: true
                });
                var dpi = this.pendingDialogStack[0];
                if (dpi && dpi.dialog.dispatchEvent(cancelEvent)) dpi.dialog.close()
            } else if (event.keyCode === 9) this.forwardTab_ = !event.shiftKey
        };
        dialogPolyfill.DialogManager.prototype.checkDOM_ = function(removed) {
            var clone = this.pendingDialogStack.slice();
            clone.forEach(function(dpi) {
                if (removed.indexOf(dpi.dialog) !== -1) dpi.downgradeModal();
                else dpi.maybeHideModal()
            })
        };
        dialogPolyfill.DialogManager.prototype.pushDialog = function(dpi) {
            var allowed = (this.zIndexHigh_ - this.zIndexLow_) / 2 - 1;
            if (this.pendingDialogStack.length >= allowed) return false;
            if (this.pendingDialogStack.unshift(dpi) === 1) this.blockDocument();
            this.updateStacking();
            return true
        };
        dialogPolyfill.DialogManager.prototype.removeDialog = function(dpi) {
            var index = this.pendingDialogStack.indexOf(dpi);
            if (index ===
                -1) return;
            this.pendingDialogStack.splice(index, 1);
            if (this.pendingDialogStack.length === 0) this.unblockDocument();
            this.updateStacking()
        };
        dialogPolyfill.dm = new dialogPolyfill.DialogManager;
        dialogPolyfill.formSubmitter = null;
        dialogPolyfill.useValue = null;
        if (window.HTMLDialogElement === undefined) {
            var testForm = document.createElement("form");
            testForm.setAttribute("method", "dialog");
            if (testForm.method !== "dialog") {
                var methodDescriptor = Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, "method");
                if (methodDescriptor) {
                    var realGet =
                        methodDescriptor.get;
                    methodDescriptor.get = function() {
                        if (isFormMethodDialog(this)) return "dialog";
                        return realGet.call(this)
                    };
                    var realSet = methodDescriptor.set;
                    methodDescriptor.set = function(v) {
                        if (typeof v === "string" && v.toLowerCase() === "dialog") return this.setAttribute("method", v);
                        return realSet.call(this, v)
                    };
                    Object.defineProperty(HTMLFormElement.prototype, "method", methodDescriptor)
                }
            }
            document.addEventListener("click", function(ev) {
                dialogPolyfill.formSubmitter = null;
                dialogPolyfill.useValue = null;
                if (ev.defaultPrevented) return;
                var target = ev.target;
                if (!target || !isFormMethodDialog(target.form)) return;
                var valid = target.type === "submit" && ["button", "input"].indexOf(target.localName) > -1;
                if (!valid) {
                    if (!(target.localName === "input" && target.type === "image")) return;
                    dialogPolyfill.useValue = ev.offsetX + "," + ev.offsetY
                }
                var dialog = findNearestDialog(target);
                if (!dialog) return;
                dialogPolyfill.formSubmitter = target
            }, false);
            var nativeFormSubmit = HTMLFormElement.prototype.submit;
            var replacementFormSubmit = function() {
                if (!isFormMethodDialog(this)) return nativeFormSubmit.call(this);
                var dialog = findNearestDialog(this);
                dialog && dialog.close()
            };
            HTMLFormElement.prototype.submit = replacementFormSubmit;
            document.addEventListener("submit", function(ev) {
                var form = ev.target;
                if (!isFormMethodDialog(form)) return;
                ev.preventDefault();
                var dialog = findNearestDialog(form);
                if (!dialog) return;
                var s = dialogPolyfill.formSubmitter;
                if (s && s.form === form) dialog.close(dialogPolyfill.useValue || s.value);
                else dialog.close();
                dialogPolyfill.formSubmitter = null
            }, true)
        }
        dialogPolyfill["forceRegisterDialog"] = dialogPolyfill.forceRegisterDialog;
        dialogPolyfill["registerDialog"] = dialogPolyfill.registerDialog;
        if (typeof define === "function" && "amd" in define) define(function() {
            return dialogPolyfill
        });
        else if (typeof module === "object" && typeof module["exports"] === "object") module["exports"] = dialogPolyfill;
        else window["dialogPolyfill"] = dialogPolyfill
    })();
    (function() {
        var k, aa = "function" == typeof Object.defineProperties ? Object.defineProperty : function(a, b, c) {
                a != Array.prototype && a != Object.prototype && (a[b] = c.value)
            },
            ba = "undefined" != typeof window && window === this ? this : "undefined" != typeof global && null != global ? global : this;

        function ca(a) {
            if (a) {
                for (var b = ba, c = ["Promise"], d = 0; d < c.length - 1; d++) {
                    var e = c[d];
                    e in b || (b[e] = {});
                    b = b[e]
                }
                c = c[c.length - 1];
                d = b[c];
                a = a(d);
                a != d && null != a && aa(b, c, {
                    configurable: !0,
                    writable: !0,
                    value: a
                })
            }
        }

        function da(a) {
            var b = 0;
            return function() {
                return b <
                    a.length ? {
                        done: !1,
                        value: a[b++]
                    } : {
                        done: !0
                    }
            }
        }

        function ea(a) {
            var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
            return b ? b.call(a) : {
                next: da(a)
            }
        }
        ca(function(a) {
            function b(a) {
                this.g = 0;
                this.h = void 0;
                this.a = [];
                var b = this.j();
                try {
                    a(b.resolve, b.reject)
                } catch (n) {
                    b.reject(n)
                }
            }

            function c() {
                this.a = null
            }

            function d(a) {
                return a instanceof b ? a : new b(function(b) {
                    b(a)
                })
            }
            if (a) return a;
            c.prototype.g = function(a) {
                null == this.a && (this.a = [], this.j());
                this.a.push(a)
            };
            c.prototype.j = function() {
                var a = this;
                this.h(function() {
                    a.u()
                })
            };
            var e = ba.setTimeout;
            c.prototype.h = function(a) {
                e(a, 0)
            };
            c.prototype.u = function() {
                for (; this.a && this.a.length;) {
                    var a = this.a;
                    this.a = [];
                    for (var b = 0; b < a.length; ++b) {
                        var c = a[b];
                        a[b] = null;
                        try {
                            c()
                        } catch (y) {
                            this.i(y)
                        }
                    }
                }
                this.a = null
            };
            c.prototype.i = function(a) {
                this.h(function() {
                    throw a;
                })
            };
            b.prototype.j = function() {
                function a(a) {
                    return function(d) {
                        c || (c = !0, a.call(b, d))
                    }
                }
                var b = this,
                    c = !1;
                return {
                    resolve: a(this.F),
                    reject: a(this.i)
                }
            };
            b.prototype.F = function(a) {
                if (a === this) this.i(new TypeError("A Promise cannot resolve to itself"));
                else if (a instanceof b) this.J(a);
                else {
                    a: switch (typeof a) {
                        case "object":
                            var c = null != a;
                            break a;
                        case "function":
                            c = !0;
                            break a;
                        default:
                            c = !1
                    }
                    c ? this.D(a) : this.u(a)
                }
            };
            b.prototype.D = function(a) {
                var b = void 0;
                try {
                    b = a.then
                } catch (n) {
                    this.i(n);
                    return
                }
                "function" == typeof b ? this.N(b, a) : this.u(a)
            };
            b.prototype.i = function(a) {
                this.w(2, a)
            };
            b.prototype.u = function(a) {
                this.w(1, a)
            };
            b.prototype.w = function(a, b) {
                if (0 != this.g) throw Error("Cannot settle(" + a + ", " + b + "): Promise already settled in state" + this.g);
                this.g = a;
                this.h = b;
                this.B()
            };
            b.prototype.B = function() {
                if (null != this.a) {
                    for (var a = 0; a < this.a.length; ++a) f.g(this.a[a]);
                    this.a = null
                }
            };
            var f = new c;
            b.prototype.J = function(a) {
                var b = this.j();
                a.Ba(b.resolve, b.reject)
            };
            b.prototype.N = function(a, b) {
                var c = this.j();
                try {
                    a.call(b, c.resolve, c.reject)
                } catch (y) {
                    c.reject(y)
                }
            };
            b.prototype.then = function(a, c) {
                function d(a, b) {
                    return "function" == typeof a ? function(b) {
                        try {
                            e(a(b))
                        } catch (Qk) {
                            f(Qk)
                        }
                    } : b
                }
                var e, f, g = new b(function(a, b) {
                    e = a;
                    f = b
                });
                this.Ba(d(a, e), d(c, f));
                return g
            };
            b.prototype.catch = function(a) {
                return this.then(void 0,
                    a)
            };
            b.prototype.Ba = function(a, b) {
                function c() {
                    switch (d.g) {
                        case 1:
                            a(d.h);
                            break;
                        case 2:
                            b(d.h);
                            break;
                        default:
                            throw Error("Unexpected state: " + d.g);
                    }
                }
                var d = this;
                null == this.a ? f.g(c) : this.a.push(c)
            };
            b.resolve = d;
            b.reject = function(a) {
                return new b(function(b, c) {
                    c(a)
                })
            };
            b.race = function(a) {
                return new b(function(b, c) {
                    for (var e = ea(a), f = e.next(); !f.done; f = e.next()) d(f.value).Ba(b, c)
                })
            };
            b.all = function(a) {
                var c = ea(a),
                    e = c.next();
                return e.done ? d([]) : new b(function(a, b) {
                    function f(b) {
                        return function(c) {
                            g[b] = c;
                            h--;
                            0 ==
                                h && a(g)
                        }
                    }
                    var g = [],
                        h = 0;
                    do g.push(void 0), h++, d(e.value).Ba(f(g.length - 1), b), e = c.next(); while (!e.done)
                })
            };
            return b
        });
        var l = this;

        function fa(a) {
            return void 0 !== a
        }

        function m(a) {
            return "string" == typeof a
        }
        var ha = /^[\w+/_-]+[=]{0,2}$/,
            ia = null;

        function ja() {}

        function ka(a) {
            a.U = void 0;
            a.Pa = function() {
                return a.U ? a.U : a.U = new a
            }
        }

        function la(a) {
            var b = typeof a;
            if ("object" == b)
                if (a) {
                    if (a instanceof Array) return "array";
                    if (a instanceof Object) return b;
                    var c = Object.prototype.toString.call(a);
                    if ("[object Window]" == c) return "object";
                    if ("[object Array]" == c || "number" == typeof a.length && "undefined" != typeof a.splice && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("splice")) return "array";
                    if ("[object Function]" == c || "undefined" != typeof a.call && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("call")) return "function"
                } else return "null";
            else if ("function" == b && "undefined" == typeof a.call) return "object";
            return b
        }

        function ma(a) {
            return null != a
        }

        function oa(a) {
            return "array" == la(a)
        }

        function pa(a) {
            var b = la(a);
            return "array" == b || "object" == b && "number" == typeof a.length
        }

        function qa(a) {
            return "function" == la(a)
        }

        function ra(a) {
            var b = typeof a;
            return "object" == b && null != a || "function" == b
        }
        var sa = "closure_uid_" + (1E9 * Math.random() >>> 0),
            ta = 0;

        function ua(a, b, c) {
            return a.call.apply(a.bind, arguments)
        }

        function va(a, b, c) {
            if (!a) throw Error();
            if (2 < arguments.length) {
                var d = Array.prototype.slice.call(arguments, 2);
                return function() {
                    var c = Array.prototype.slice.call(arguments);
                    Array.prototype.unshift.apply(c, d);
                    return a.apply(b, c)
                }
            }
            return function() {
                return a.apply(b,
                    arguments)
            }
        }

        function p(a, b, c) {
            Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? p = ua : p = va;
            return p.apply(null, arguments)
        }

        function wa(a, b) {
            var c = Array.prototype.slice.call(arguments, 1);
            return function() {
                var b = c.slice();
                b.push.apply(b, arguments);
                return a.apply(this, b)
            }
        }

        function q(a, b) {
            for (var c in b) a[c] = b[c]
        }
        var xa = Date.now || function() {
            return +new Date
        };

        function ya(a, b) {
            a = a.split(".");
            var c = l;
            a[0] in c || "undefined" == typeof c.execScript || c.execScript("var " + a[0]);
            for (var d; a.length && (d = a.shift());) !a.length && fa(b) ? c[d] = b : c[d] && c[d] !== Object.prototype[d] ? c = c[d] : c = c[d] = {}
        }

        function r(a, b) {
            function c() {}
            c.prototype = b.prototype;
            a.o = b.prototype;
            a.prototype = new c;
            a.prototype.constructor = a;
            a.$b = function(a, c, f) {
                for (var d = Array(arguments.length - 2), e = 2; e < arguments.length; e++) d[e - 2] = arguments[e];
                return b.prototype[c].apply(a, d)
            }
        }

        function za(a) {
            if (Error.captureStackTrace) Error.captureStackTrace(this, za);
            else {
                var b = Error().stack;
                b && (this.stack = b)
            }
            a && (this.message = String(a))
        }
        r(za, Error);
        za.prototype.name = "CustomError";
        var Aa;

        function Ba(a, b) {
            a = a.split("%s");
            for (var c = "", d = a.length - 1, e = 0; e < d; e++) c += a[e] + (e < b.length ? b[e] : "%s");
            za.call(this, c + a[d])
        }
        r(Ba, za);
        Ba.prototype.name = "AssertionError";

        function Ca(a, b) {
            throw new Ba("Failure" + (a ? ": " + a : ""), Array.prototype.slice.call(arguments, 1));
        }
        var Da = Array.prototype.indexOf ? function(a, b) {
                return Array.prototype.indexOf.call(a, b, void 0)
            } : function(a, b) {
                if (m(a)) return m(b) && 1 == b.length ? a.indexOf(b, 0) : -1;
                for (var c = 0; c < a.length; c++)
                    if (c in
                        a && a[c] === b) return c;
                return -1
            },
            Ea = Array.prototype.forEach ? function(a, b, c) {
                Array.prototype.forEach.call(a, b, c)
            } : function(a, b, c) {
                for (var d = a.length, e = m(a) ? a.split("") : a, f = 0; f < d; f++) f in e && b.call(c, e[f], f, a)
            };

        function Fa(a, b) {
            var c = a.length,
                d = m(a) ? a.split("") : a;
            for (--c; 0 <= c; --c) c in d && b.call(void 0, d[c], c, a)
        }
        var Ga = Array.prototype.filter ? function(a, b) {
                return Array.prototype.filter.call(a, b, void 0)
            } : function(a, b) {
                for (var c = a.length, d = [], e = 0, f = m(a) ? a.split("") : a, g = 0; g < c; g++)
                    if (g in f) {
                        var h = f[g];
                        b.call(void 0,
                            h, g, a) && (d[e++] = h)
                    } return d
            },
            Ha = Array.prototype.map ? function(a, b) {
                return Array.prototype.map.call(a, b, void 0)
            } : function(a, b) {
                for (var c = a.length, d = Array(c), e = m(a) ? a.split("") : a, f = 0; f < c; f++) f in e && (d[f] = b.call(void 0, e[f], f, a));
                return d
            },
            Ia = Array.prototype.some ? function(a, b) {
                return Array.prototype.some.call(a, b, void 0)
            } : function(a, b) {
                for (var c = a.length, d = m(a) ? a.split("") : a, e = 0; e < c; e++)
                    if (e in d && b.call(void 0, d[e], e, a)) return !0;
                return !1
            };

        function Ja(a, b, c) {
            for (var d = a.length, e = m(a) ? a.split("") : a, f =
                    0; f < d; f++)
                if (f in e && b.call(c, e[f], f, a)) return f;
            return -1
        }

        function Ka(a, b) {
            return 0 <= Da(a, b)
        }

        function La(a, b) {
            b = Da(a, b);
            var c;
            (c = 0 <= b) && Ma(a, b);
            return c
        }

        function Ma(a, b) {
            return 1 == Array.prototype.splice.call(a, b, 1).length
        }

        function Na(a, b) {
            b = Ja(a, b, void 0);
            0 <= b && Ma(a, b)
        }

        function Oa(a, b) {
            var c = 0;
            Fa(a, function(d, e) {
                b.call(void 0, d, e, a) && Ma(a, e) && c++
            })
        }

        function Pa(a) {
            return Array.prototype.concat.apply([], arguments)
        }

        function Qa(a) {
            var b = a.length;
            if (0 < b) {
                for (var c = Array(b), d = 0; d < b; d++) c[d] = a[d];
                return c
            }
            return []
        }

        function Ra(a, b, c, d) {
            return Array.prototype.splice.apply(a, Sa(arguments, 1))
        }

        function Sa(a, b, c) {
            return 2 >= arguments.length ? Array.prototype.slice.call(a, b) : Array.prototype.slice.call(a, b, c)
        }
        var Ta = String.prototype.trim ? function(a) {
            return a.trim()
        } : function(a) {
            return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1]
        };

        function Ua(a) {
            if (!Va.test(a)) return a; - 1 != a.indexOf("&") && (a = a.replace(Wa, "&amp;")); - 1 != a.indexOf("<") && (a = a.replace(Xa, "&lt;")); - 1 != a.indexOf(">") && (a = a.replace(Ya, "&gt;")); - 1 != a.indexOf('"') &&
                (a = a.replace(Za, "&quot;")); - 1 != a.indexOf("'") && (a = a.replace($a, "&#39;")); - 1 != a.indexOf("\x00") && (a = a.replace(ab, "&#0;"));
            return a
        }
        var Wa = /&/g,
            Xa = /</g,
            Ya = />/g,
            Za = /"/g,
            $a = /'/g,
            ab = /\x00/g,
            Va = /[\x00&<>"']/;

        function bb(a, b) {
            return a < b ? -1 : a > b ? 1 : 0
        }
        var cb;
        a: {
            var db = l.navigator;
            if (db) {
                var eb = db.userAgent;
                if (eb) {
                    cb = eb;
                    break a
                }
            }
            cb = ""
        }

        function t(a) {
            return -1 != cb.indexOf(a)
        }

        function fb(a, b, c) {
            for (var d in a) b.call(c, a[d], d, a)
        }

        function gb(a) {
            var b = {},
                c;
            for (c in a) b[c] = a[c];
            return b
        }
        var hb = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");

        function ib(a, b) {
            for (var c, d, e = 1; e < arguments.length; e++) {
                d = arguments[e];
                for (c in d) a[c] = d[c];
                for (var f = 0; f < hb.length; f++) c = hb[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c])
            }
        }

        function jb() {
            return (t("Chrome") || t("CriOS")) && !t("Edge")
        }

        function kb(a) {
            kb[" "](a);
            return a
        }
        kb[" "] = ja;

        function lb(a, b) {
            var c = mb;
            return Object.prototype.hasOwnProperty.call(c, a) ? c[a] : c[a] = b(a)
        }
        var nb = t("Opera"),
            u = t("Trident") || t("MSIE"),
            ob = t("Edge"),
            pb = ob || u,
            qb = t("Gecko") && !(-1 != cb.toLowerCase().indexOf("webkit") &&
                !t("Edge")) && !(t("Trident") || t("MSIE")) && !t("Edge"),
            rb = -1 != cb.toLowerCase().indexOf("webkit") && !t("Edge"),
            sb = rb && t("Mobile"),
            tb = t("Macintosh");

        function ub() {
            var a = l.document;
            return a ? a.documentMode : void 0
        }
        var vb;
        a: {
            var wb = "",
                xb = function() {
                    var a = cb;
                    if (qb) return /rv:([^\);]+)(\)|;)/.exec(a);
                    if (ob) return /Edge\/([\d\.]+)/.exec(a);
                    if (u) return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);
                    if (rb) return /WebKit\/(\S+)/.exec(a);
                    if (nb) return /(?:Version)[ \/]?(\S+)/.exec(a)
                }();xb && (wb = xb ? xb[1] : "");
            if (u) {
                var yb = ub();
                if (null != yb && yb > parseFloat(wb)) {
                    vb = String(yb);
                    break a
                }
            }
            vb = wb
        }
        var mb = {};

        function zb(a) {
            return lb(a, function() {
                for (var b = 0, c = Ta(String(vb)).split("."), d = Ta(String(a)).split("."), e = Math.max(c.length, d.length), f = 0; 0 == b && f < e; f++) {
                    var g = c[f] || "",
                        h = d[f] || "";
                    do {
                        g = /(\d*)(\D*)(.*)/.exec(g) || ["", "", "", ""];
                        h = /(\d*)(\D*)(.*)/.exec(h) || ["", "", "", ""];
                        if (0 == g[0].length && 0 == h[0].length) break;
                        b = bb(0 == g[1].length ? 0 : parseInt(g[1], 10), 0 == h[1].length ? 0 : parseInt(h[1], 10)) || bb(0 == g[2].length, 0 == h[2].length) || bb(g[2], h[2]);
                        g = g[3];
                        h = h[3]
                    } while (0 == b)
                }
                return 0 <= b
            })
        }
        var Ab;
        var Bb = l.document;
        Ab = Bb && u ? ub() || ("CSS1Compat" == Bb.compatMode ? parseInt(vb, 10) : 5) : void 0;

        function Cb(a, b) {
            this.a = a === Db && b || "";
            this.g = Eb
        }
        Cb.prototype.na = !0;
        Cb.prototype.ka = function() {
            return this.a
        };
        Cb.prototype.toString = function() {
            return "Const{" + this.a + "}"
        };

        function Fb(a) {
            if (a instanceof Cb && a.constructor === Cb && a.g === Eb) return a.a;
            Ca("expected object of type Const, got '" + a + "'");
            return "type_error:Const"
        }
        var Eb = {},
            Db = {};

        function Gb() {
            this.a = "";
            this.h = Hb
        }
        Gb.prototype.na = !0;
        Gb.prototype.ka = function() {
            return this.a
        };
        Gb.prototype.g = function() {
            return 1
        };
        Gb.prototype.toString = function() {
            return "TrustedResourceUrl{" + this.a + "}"
        };

        function Ib(a) {
            if (a instanceof Gb && a.constructor === Gb && a.h === Hb) return a.a;
            Ca("expected object of type TrustedResourceUrl, got '" + a + "' of type " + la(a));
            return "type_error:TrustedResourceUrl"
        }
        var Hb = {};

        function Jb(a) {
            var b = new Gb;
            b.a = a;
            return b
        }

        function Kb() {
            this.a = "";
            this.h = Lb
        }
        Kb.prototype.na = !0;
        Kb.prototype.ka = function() {
            return this.a
        };
        Kb.prototype.g = function() {
            return 1
        };
        Kb.prototype.toString = function() {
            return "SafeUrl{" + this.a + "}"
        };

        function Mb(a) {
            if (a instanceof Kb && a.constructor === Kb && a.h === Lb) return a.a;
            Ca("expected object of type SafeUrl, got '" + a + "' of type " + la(a));
            return "type_error:SafeUrl"
        }
        var Nb = /^(?:(?:https?|mailto|ftp):|[^:/?#]*(?:[/?#]|$))/i;

        function Ob(a) {
            if (a instanceof Kb) return a;
            a = "object" == typeof a && a.na ? a.ka() : String(a);
            Nb.test(a) || (a = "about:invalid#zClosurez");
            return Pb(a)
        }
        var Lb = {};

        function Pb(a) {
            var b = new Kb;
            b.a = a;
            return b
        }
        Pb("about:blank");

        function Qb() {
            this.a = "";
            this.j = Rb;
            this.h = null
        }
        Qb.prototype.g = function() {
            return this.h
        };
        Qb.prototype.na = !0;
        Qb.prototype.ka = function() {
            return this.a
        };
        Qb.prototype.toString = function() {
            return "SafeHtml{" + this.a + "}"
        };

        function Sb(a) {
            if (a instanceof Qb && a.constructor === Qb && a.j === Rb) return a.a;
            Ca("expected object of type SafeHtml, got '" + a + "' of type " + la(a));
            return "type_error:SafeHtml"
        }
        var Rb = {};

        function Tb(a, b) {
            var c = new Qb;
            c.a = a;
            c.h = b;
            return c
        }
        Tb("<!DOCTYPE html>", 0);
        Tb("",
            0);
        Tb("<br>", 0);
        var Ub = function(a) {
            var b = !1,
                c;
            return function() {
                b || (c = a(), b = !0);
                return c
            }
        }(function() {
            if ("undefined" === typeof document) return !1;
            var a = document.createElement("div");
            a.innerHTML = "<div><div></div></div>";
            if (!a.firstChild) return !1;
            var b = a.firstChild.firstChild;
            a.innerHTML = "";
            return !b.parentElement
        });

        function Vb(a, b) {
            a.src = Ib(b);
            if (null === ia) {
                a: {
                    b = l.document;
                    if ((b = b.querySelector && b.querySelector("script[nonce]")) && (b = b.nonce || b.getAttribute("nonce")) && ha.test(b)) break a;b = null
                }
                ia = b || ""
            }(b =
                ia) && a.setAttribute("nonce", b)
        }

        function Wb(a, b) {
            this.a = fa(a) ? a : 0;
            this.g = fa(b) ? b : 0
        }
        Wb.prototype.toString = function() {
            return "(" + this.a + ", " + this.g + ")"
        };
        Wb.prototype.ceil = function() {
            this.a = Math.ceil(this.a);
            this.g = Math.ceil(this.g);
            return this
        };
        Wb.prototype.floor = function() {
            this.a = Math.floor(this.a);
            this.g = Math.floor(this.g);
            return this
        };
        Wb.prototype.round = function() {
            this.a = Math.round(this.a);
            this.g = Math.round(this.g);
            return this
        };

        function Xb(a, b) {
            this.width = a;
            this.height = b
        }
        k = Xb.prototype;
        k.toString =
            function() {
                return "(" + this.width + " x " + this.height + ")"
            };
        k.aspectRatio = function() {
            return this.width / this.height
        };
        k.ceil = function() {
            this.width = Math.ceil(this.width);
            this.height = Math.ceil(this.height);
            return this
        };
        k.floor = function() {
            this.width = Math.floor(this.width);
            this.height = Math.floor(this.height);
            return this
        };
        k.round = function() {
            this.width = Math.round(this.width);
            this.height = Math.round(this.height);
            return this
        };

        function Yb(a) {
            return a ? new Zb($b(a)) : Aa || (Aa = new Zb)
        }

        function ac(a, b) {
            var c = b || document;
            return c.querySelectorAll && c.querySelector ? c.querySelectorAll("." + a) : bc(document, a, b)
        }

        function cc(a, b) {
            var c = b || document;
            if (c.getElementsByClassName) a = c.getElementsByClassName(a)[0];
            else {
                c = document;
                var d = b || c;
                a = d.querySelectorAll && d.querySelector && a ? d.querySelector(a ? "." + a : "") : bc(c, a, b)[0] || null
            }
            return a || null
        }

        function bc(a, b, c) {
            var d;
            a = c || a;
            if (a.querySelectorAll && a.querySelector && b) return a.querySelectorAll(b ? "." + b : "");
            if (b && a.getElementsByClassName) {
                var e = a.getElementsByClassName(b);
                return e
            }
            e =
                a.getElementsByTagName("*");
            if (b) {
                var f = {};
                for (c = d = 0; a = e[c]; c++) {
                    var g = a.className;
                    "function" == typeof g.split && Ka(g.split(/\s+/), b) && (f[d++] = a)
                }
                f.length = d;
                return f
            }
            return e
        }

        function dc(a, b) {
            fb(b, function(b, d) {
                b && "object" == typeof b && b.na && (b = b.ka());
                "style" == d ? a.style.cssText = b : "class" == d ? a.className = b : "for" == d ? a.htmlFor = b : ec.hasOwnProperty(d) ? a.setAttribute(ec[d], b) : 0 == d.lastIndexOf("aria-", 0) || 0 == d.lastIndexOf("data-", 0) ? a.setAttribute(d, b) : a[d] = b
            })
        }
        var ec = {
            cellpadding: "cellPadding",
            cellspacing: "cellSpacing",
            colspan: "colSpan",
            frameborder: "frameBorder",
            height: "height",
            maxlength: "maxLength",
            nonce: "nonce",
            role: "role",
            rowspan: "rowSpan",
            type: "type",
            usemap: "useMap",
            valign: "vAlign",
            width: "width"
        };

        function fc(a) {
            return a.scrollingElement ? a.scrollingElement : rb || "CSS1Compat" != a.compatMode ? a.body || a.documentElement : a.documentElement
        }

        function gc(a) {
            a && a.parentNode && a.parentNode.removeChild(a)
        }

        function $b(a) {
            return 9 == a.nodeType ? a : a.ownerDocument || a.document
        }

        function hc(a, b) {
            if ("textContent" in a) a.textContent = b;
            else if (3 ==
                a.nodeType) a.data = String(b);
            else if (a.firstChild && 3 == a.firstChild.nodeType) {
                for (; a.lastChild != a.firstChild;) a.removeChild(a.lastChild);
                a.firstChild.data = String(b)
            } else {
                for (var c; c = a.firstChild;) a.removeChild(c);
                a.appendChild($b(a).createTextNode(String(b)))
            }
        }

        function ic(a, b) {
            return b ? jc(a, function(a) {
                return !b || m(a.className) && Ka(a.className.split(/\s+/), b)
            }) : null
        }

        function jc(a, b) {
            for (var c = 0; a;) {
                if (b(a)) return a;
                a = a.parentNode;
                c++
            }
            return null
        }

        function Zb(a) {
            this.a = a || l.document || document
        }
        Zb.prototype.M =
            function() {
                return m(void 0) ? this.a.getElementById(void 0) : void 0
            };
        var kc = "StopIteration" in l ? l.StopIteration : {
            message: "StopIteration",
            stack: ""
        };

        function lc() {}
        lc.prototype.next = function() {
            throw kc;
        };
        lc.prototype.da = function() {
            return this
        };

        function mc(a) {
            if (a instanceof lc) return a;
            if ("function" == typeof a.da) return a.da(!1);
            if (pa(a)) {
                var b = 0,
                    c = new lc;
                c.next = function() {
                    for (;;) {
                        if (b >= a.length) throw kc;
                        if (b in a) return a[b++];
                        b++
                    }
                };
                return c
            }
            throw Error("Not implemented");
        }

        function nc(a, b) {
            if (pa(a)) try {
                Ea(a,
                    b, void 0)
            } catch (c) {
                if (c !== kc) throw c;
            } else {
                a = mc(a);
                try {
                    for (;;) b.call(void 0, a.next(), void 0, a)
                } catch (c$1) {
                    if (c$1 !== kc) throw c$1;
                }
            }
        }

        function oc(a) {
            if (pa(a)) return Qa(a);
            a = mc(a);
            var b = [];
            nc(a, function(a) {
                b.push(a)
            });
            return b
        }

        function pc(a, b) {
            this.g = {};
            this.a = [];
            this.j = this.h = 0;
            var c = arguments.length;
            if (1 < c) {
                if (c % 2) throw Error("Uneven number of arguments");
                for (var d = 0; d < c; d += 2) this.set(arguments[d], arguments[d + 1])
            } else if (a)
                if (a instanceof pc)
                    for (c = a.ga(), d = 0; d < c.length; d++) this.set(c[d], a.get(c[d]));
                else
                    for (d in a) this.set(d, a[d])
        }
        k = pc.prototype;
        k.ha = function() {
            qc(this);
            for (var a = [], b = 0; b < this.a.length; b++) a.push(this.g[this.a[b]]);
            return a
        };
        k.ga = function() {
            qc(this);
            return this.a.concat()
        };
        k.clear = function() {
            this.g = {};
            this.j = this.h = this.a.length = 0
        };

        function qc(a) {
            if (a.h != a.a.length) {
                for (var b = 0, c = 0; b < a.a.length;) {
                    var d = a.a[b];
                    rc(a.g, d) && (a.a[c++] = d);
                    b++
                }
                a.a.length = c
            }
            if (a.h != a.a.length) {
                var e = {};
                for (c = b = 0; b < a.a.length;) d = a.a[b], rc(e, d) || (a.a[c++] = d, e[d] = 1), b++;
                a.a.length = c
            }
        }
        k.get = function(a,
            b) {
            return rc(this.g, a) ? this.g[a] : b
        };
        k.set = function(a, b) {
            rc(this.g, a) || (this.h++, this.a.push(a), this.j++);
            this.g[a] = b
        };
        k.forEach = function(a, b) {
            for (var c = this.ga(), d = 0; d < c.length; d++) {
                var e = c[d],
                    f = this.get(e);
                a.call(b, f, e, this)
            }
        };
        k.da = function(a) {
            qc(this);
            var b = 0,
                c = this.j,
                d = this,
                e = new lc;
            e.next = function() {
                if (c != d.j) throw Error("The map has changed since the iterator was created");
                if (b >= d.a.length) throw kc;
                var e = d.a[b++];
                return a ? e : d.g[e]
            };
            return e
        };

        function rc(a, b) {
            return Object.prototype.hasOwnProperty.call(a,
                b)
        }
        var sc = /^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;

        function tc(a, b) {
            if (a) {
                a = a.split("&");
                for (var c = 0; c < a.length; c++) {
                    var d = a[c].indexOf("="),
                        e = null;
                    if (0 <= d) {
                        var f = a[c].substring(0, d);
                        e = a[c].substring(d + 1)
                    } else f = a[c];
                    b(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "")
                }
            }
        }

        function uc(a, b, c, d) {
            for (var e = c.length; 0 <= (b = a.indexOf(c, b)) && b < d;) {
                var f = a.charCodeAt(b - 1);
                if (38 == f || 63 == f)
                    if (f = a.charCodeAt(b + e), !f || 61 == f || 38 == f || 35 ==
                        f) return b;
                b += e + 1
            }
            return -1
        }
        var vc = /#|$/;

        function wc(a, b) {
            var c = a.search(vc),
                d = uc(a, 0, b, c);
            if (0 > d) return null;
            var e = a.indexOf("&", d);
            if (0 > e || e > c) e = c;
            d += b.length + 1;
            return decodeURIComponent(a.substr(d, e - d).replace(/\+/g, " "))
        }
        var yc = /[?&]($|#)/;

        function zc(a, b) {
            this.h = this.w = this.j = "";
            this.B = null;
            this.i = this.g = "";
            this.u = !1;
            var c;
            a instanceof zc ? (this.u = fa(b) ? b : a.u, Ac(this, a.j), this.w = a.w, this.h = a.h, Bc(this, a.B), this.g = a.g, Cc(this, Dc(a.a)), this.i = a.i) : a && (c = String(a).match(sc)) ? (this.u = !!b, Ac(this, c[1] ||
                "", !0), this.w = Ec(c[2] || ""), this.h = Ec(c[3] || "", !0), Bc(this, c[4]), this.g = Ec(c[5] || "", !0), Cc(this, c[6] || "", !0), this.i = Ec(c[7] || "")) : (this.u = !!b, this.a = new Fc(null, this.u))
        }
        zc.prototype.toString = function() {
            var a = [],
                b = this.j;
            b && a.push(Gc(b, Hc, !0), ":");
            var c = this.h;
            if (c || "file" == b) a.push("//"), (b = this.w) && a.push(Gc(b, Hc, !0), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.B, null != c && a.push(":", String(c));
            if (c = this.g) this.h && "/" != c.charAt(0) && a.push("/"), a.push(Gc(c,
                "/" == c.charAt(0) ? Ic : Jc, !0));
            (c = this.a.toString()) && a.push("?", c);
            (c = this.i) && a.push("#", Gc(c, Kc));
            return a.join("")
        };
        zc.prototype.resolve = function(a) {
            var b = new zc(this),
                c = !!a.j;
            c ? Ac(b, a.j) : c = !!a.w;
            c ? b.w = a.w : c = !!a.h;
            c ? b.h = a.h : c = null != a.B;
            var d = a.g;
            if (c) Bc(b, a.B);
            else if (c = !!a.g) {
                if ("/" != d.charAt(0))
                    if (this.h && !this.g) d = "/" + d;
                    else {
                        var e = b.g.lastIndexOf("/"); - 1 != e && (d = b.g.substr(0, e + 1) + d)
                    } e = d;
                if (".." == e || "." == e) d = "";
                else if (-1 != e.indexOf("./") || -1 != e.indexOf("/.")) {
                    d = 0 == e.lastIndexOf("/", 0);
                    e = e.split("/");
                    for (var f = [], g = 0; g < e.length;) {
                        var h = e[g++];
                        "." == h ? d && g == e.length && f.push("") : ".." == h ? ((1 < f.length || 1 == f.length && "" != f[0]) && f.pop(), d && g == e.length && f.push("")) : (f.push(h), d = !0)
                    }
                    d = f.join("/")
                } else d = e
            }
            c ? b.g = d : c = "" !== a.a.toString();
            c ? Cc(b, Dc(a.a)) : c = !!a.i;
            c && (b.i = a.i);
            return b
        };

        function Ac(a, b, c) {
            a.j = c ? Ec(b, !0) : b;
            a.j && (a.j = a.j.replace(/:$/, ""))
        }

        function Bc(a, b) {
            if (b) {
                b = Number(b);
                if (isNaN(b) || 0 > b) throw Error("Bad port number " + b);
                a.B = b
            } else a.B = null
        }

        function Cc(a, b, c) {
            b instanceof Fc ? (a.a = b, Lc(a.a, a.u)) :
                (c || (b = Gc(b, Mc)), a.a = new Fc(b, a.u))
        }

        function Nc(a) {
            return a instanceof zc ? new zc(a) : new zc(a, void 0)
        }

        function Oc(a, b) {
            a instanceof zc || (a = Nc(a));
            b instanceof zc || (b = Nc(b));
            return a.resolve(b)
        }

        function Ec(a, b) {
            return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : ""
        }

        function Gc(a, b, c) {
            return m(a) ? (a = encodeURI(a).replace(b, Pc), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null
        }

        function Pc(a) {
            a = a.charCodeAt(0);
            return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16)
        }
        var Hc = /[#\/\?@]/g,
            Jc = /[#\?:]/g,
            Ic = /[#\?]/g,
            Mc = /[#\?@]/g,
            Kc = /#/g;

        function Fc(a, b) {
            this.g = this.a = null;
            this.h = a || null;
            this.j = !!b
        }

        function Qc(a) {
            a.a || (a.a = new pc, a.g = 0, a.h && tc(a.h, function(b, c) {
                a.add(decodeURIComponent(b.replace(/\+/g, " ")), c)
            }))
        }
        k = Fc.prototype;
        k.add = function(a, b) {
            Qc(this);
            this.h = null;
            a = Rc(this, a);
            var c = this.a.get(a);
            c || this.a.set(a, c = []);
            c.push(b);
            this.g += 1;
            return this
        };

        function Sc(a, b) {
            Qc(a);
            b = Rc(a, b);
            rc(a.a.g, b) && (a.h = null, a.g -= a.a.get(b).length, a = a.a, rc(a.g, b) && (delete a.g[b], a.h--, a.j++, a.a.length >
                2 * a.h && qc(a)))
        }
        k.clear = function() {
            this.a = this.h = null;
            this.g = 0
        };

        function Tc(a, b) {
            Qc(a);
            b = Rc(a, b);
            return rc(a.a.g, b)
        }
        k.forEach = function(a, b) {
            Qc(this);
            this.a.forEach(function(c, d) {
                Ea(c, function(c) {
                    a.call(b, c, d, this)
                }, this)
            }, this)
        };
        k.ga = function() {
            Qc(this);
            for (var a = this.a.ha(), b = this.a.ga(), c = [], d = 0; d < b.length; d++)
                for (var e = a[d], f = 0; f < e.length; f++) c.push(b[d]);
            return c
        };
        k.ha = function(a) {
            Qc(this);
            var b = [];
            if (m(a)) Tc(this, a) && (b = Pa(b, this.a.get(Rc(this, a))));
            else {
                a = this.a.ha();
                for (var c = 0; c < a.length; c++) b =
                    Pa(b, a[c])
            }
            return b
        };
        k.set = function(a, b) {
            Qc(this);
            this.h = null;
            a = Rc(this, a);
            Tc(this, a) && (this.g -= this.a.get(a).length);
            this.a.set(a, [b]);
            this.g += 1;
            return this
        };
        k.get = function(a, b) {
            if (!a) return b;
            a = this.ha(a);
            return 0 < a.length ? String(a[0]) : b
        };
        k.toString = function() {
            if (this.h) return this.h;
            if (!this.a) return "";
            for (var a = [], b = this.a.ga(), c = 0; c < b.length; c++) {
                var d = b[c],
                    e = encodeURIComponent(String(d));
                d = this.ha(d);
                for (var f = 0; f < d.length; f++) {
                    var g = e;
                    "" !== d[f] && (g += "=" + encodeURIComponent(String(d[f])));
                    a.push(g)
                }
            }
            return this.h =
                a.join("&")
        };

        function Dc(a) {
            var b = new Fc;
            b.h = a.h;
            a.a && (b.a = new pc(a.a), b.g = a.g);
            return b
        }

        function Rc(a, b) {
            b = String(b);
            a.j && (b = b.toLowerCase());
            return b
        }

        function Lc(a, b) {
            b && !a.j && (Qc(a), a.h = null, a.a.forEach(function(a, b) {
                var c = b.toLowerCase();
                b != c && (Sc(this, b), Sc(this, c), 0 < a.length && (this.h = null, this.a.set(Rc(this, c), Qa(a)), this.g += a.length))
            }, a));
            a.j = b
        }
        var Uc = {
                jc: !0
            },
            Vc = {
                lc: !0
            },
            Wc = {
                kc: !0
            };

        function Xc() {
            throw Error("Do not instantiate directly");
        }
        Xc.prototype.ra = null;
        Xc.prototype.toString = function() {
            return this.content
        };

        function Yc(a, b, c, d) {
            a = a(b || Zc, void 0, c);
            d = (d || Yb()).a.createElement("DIV");
            a = $c(a);
            a.match(ad);
            if (Ub())
                for (; d.lastChild;) d.removeChild(d.lastChild);
            d.innerHTML = a;
            1 == d.childNodes.length && (a = d.firstChild, 1 == a.nodeType && (d = a));
            return d
        }

        function $c(a) {
            if (!ra(a)) return String(a);
            if (a instanceof Xc) {
                if (a.ea === Uc) return a.content;
                if (a.ea === Wc) return Ua(a.content)
            }
            Ca("Soy template output is unsafe for use as HTML: " + a);
            return "zSoyz"
        }
        var ad = /^<(body|caption|col|colgroup|head|html|tr|td|th|tbody|thead|tfoot)>/i,
            Zc = {};

        function bd(a) {
            if (null != a) switch (a.ra) {
                case 1:
                    return 1;
                case -1:
                    return -1;
                case 0:
                    return 0
            }
            return null
        }

        function cd() {
            Xc.call(this)
        }
        r(cd, Xc);
        cd.prototype.ea = Uc;

        function v(a) {
            return null != a && a.ea === Uc ? a : a instanceof Qb ? w(Sb(a), a.g()) : w(Ua(String(String(a))), bd(a))
        }

        function dd() {
            Xc.call(this)
        }
        r(dd, Xc);
        dd.prototype.ea = Vc;
        dd.prototype.ra = 1;

        function ed(a, b) {
            this.content = String(a);
            this.ra = null != b ? b : null
        }
        r(ed, Xc);
        ed.prototype.ea = Wc;

        function x(a) {
            return new ed(a, void 0)
        }
        var w = function(a) {
                function b(a) {
                    this.content =
                        a
                }
                b.prototype = a.prototype;
                return function(a, d) {
                    a = new b(String(a));
                    void 0 !== d && (a.ra = d);
                    return a
                }
            }(cd),
            fd = function(a) {
                function b(a) {
                    this.content = a
                }
                b.prototype = a.prototype;
                return function(a) {
                    return new b(String(a))
                }
            }(dd);

        function gd(a) {
            function b() {}
            var c = {
                label: z("New password")
            };
            b.prototype = a;
            a = new b;
            for (var d in c) a[d] = c[d];
            return a
        }

        function z(a) {
            return (a = String(a)) ? new ed(a, void 0) : ""
        }
        var hd = function(a) {
            function b(a) {
                this.content = a
            }
            b.prototype = a.prototype;
            return function(a, d) {
                a = String(a);
                if (!a) return "";
                a = new b(a);
                void 0 !== d && (a.ra = d);
                return a
            }
        }(cd);

        function id(a) {
            return null != a && a.ea === Uc ? String(String(a.content).replace(jd, "").replace(kd, "&lt;")).replace(ld, md) : Ua(String(a))
        }

        function nd(a) {
            null != a && a.ea === Vc ? a = String(a).replace(od, pd) : a instanceof Kb ? a = String(Mb(a)).replace(od, pd) : (a = String(a), qd.test(a) ? a = a.replace(od, pd) : (Ca("Bad value `%s` for |filterNormalizeUri", [a]), a = "#zSoyz"));
            return a
        }
        var rd = {
            "\x00": "&#0;",
            "\t": "&#9;",
            "\n": "&#10;",
            "\x0B": "&#11;",
            "\f": "&#12;",
            "\r": "&#13;",
            " ": "&#32;",
            '"': "&quot;",
            "&": "&amp;",
            "'": "&#39;",
            "-": "&#45;",
            "/": "&#47;",
            "<": "&lt;",
            "=": "&#61;",
            ">": "&gt;",
            "`": "&#96;",
            "\u0085": "&#133;",
            "\u00a0": "&#160;",
            "\u2028": "&#8232;",
            "\u2029": "&#8233;"
        };

        function md(a) {
            return rd[a]
        }
        var sd = {
            "\x00": "%00",
            "\u0001": "%01",
            "\u0002": "%02",
            "\u0003": "%03",
            "\u0004": "%04",
            "\u0005": "%05",
            "\u0006": "%06",
            "\u0007": "%07",
            "\b": "%08",
            "\t": "%09",
            "\n": "%0A",
            "\x0B": "%0B",
            "\f": "%0C",
            "\r": "%0D",
            "\u000e": "%0E",
            "\u000f": "%0F",
            "\u0010": "%10",
            "\u0011": "%11",
            "\u0012": "%12",
            "\u0013": "%13",
            "\u0014": "%14",
            "\u0015": "%15",
            "\u0016": "%16",
            "\u0017": "%17",
            "\u0018": "%18",
            "\u0019": "%19",
            "\u001a": "%1A",
            "\u001b": "%1B",
            "\u001c": "%1C",
            "\u001d": "%1D",
            "\u001e": "%1E",
            "\u001f": "%1F",
            " ": "%20",
            '"': "%22",
            "'": "%27",
            "(": "%28",
            ")": "%29",
            "<": "%3C",
            ">": "%3E",
            "\\": "%5C",
            "{": "%7B",
            "}": "%7D",
            "\u007f": "%7F",
            "\u0085": "%C2%85",
            "\u00a0": "%C2%A0",
            "\u2028": "%E2%80%A8",
            "\u2029": "%E2%80%A9",
            "\uff01": "%EF%BC%81",
            "\uff03": "%EF%BC%83",
            "\uff04": "%EF%BC%84",
            "\uff06": "%EF%BC%86",
            "\uff07": "%EF%BC%87",
            "\uff08": "%EF%BC%88",
            "\uff09": "%EF%BC%89",
            "\uff0a": "%EF%BC%8A",
            "\uff0b": "%EF%BC%8B",
            "\uff0c": "%EF%BC%8C",
            "\uff0f": "%EF%BC%8F",
            "\uff1a": "%EF%BC%9A",
            "\uff1b": "%EF%BC%9B",
            "\uff1d": "%EF%BC%9D",
            "\uff1f": "%EF%BC%9F",
            "\uff20": "%EF%BC%A0",
            "\uff3b": "%EF%BC%BB",
            "\uff3d": "%EF%BC%BD"
        };

        function pd(a) {
            return sd[a]
        }
        var ld = /[\x00\x22\x27\x3c\x3e]/g,
            od = /[\x00- \x22\x27-\x29\x3c\x3e\\\x7b\x7d\x7f\x85\xa0\u2028\u2029\uff01\uff03\uff04\uff06-\uff0c\uff0f\uff1a\uff1b\uff1d\uff1f\uff20\uff3b\uff3d]/g,
            qd = /^(?![^#?]*\/(?:\.|%2E){2}(?:[\/?#]|$))(?:(?:https?|mailto):|[^&:\/?#]*(?:[\/?#]|$))/i,
            jd = /<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g,
            kd = /</g;

        function td() {
            return x("Enter a valid phone number")
        }

        function ud() {
            return x("Something went wrong. Please try again.")
        }

        function vd() {
            return x("This email already exists without any means of sign-in. Please reset the password to recover.")
        }

        function wd() {
            return x("Please login again to perform this operation")
        }

        function xd(a, b, c) {
            this.code = yd + a;
            if (!(a = b)) {
                a = "";
                switch (this.code) {
                    case "firebaseui/merge-conflict":
                        a += "The current anonymous user failed to upgrade. The non-anonymous credential is already associated with a different user account.";
                        break;
                    default:
                        a += ud()
                }
                a = x(a).toString()
            }
            this.message = a || "";
            this.credential = c || null
        }
        r(xd, Error);
        xd.prototype.ja = function() {
            return {
                code: this.code,
                message: this.message
            }
        };
        xd.prototype.toJSON = function() {
            return this.ja()
        };
        var yd = "firebaseui/";

        function zd() {
            this.U = {}
        }

        function Ad(a, b, c) {
            if (b.toLowerCase() in a.U) throw Error("Configuration " + b + " has already been defined.");
            a.U[b.toLowerCase()] = c
        }

        function Bd(a, b, c) {
            if (!(b.toLowerCase() in a.U)) throw Error("Configuration " + b + " is not defined.");
            a.U[b.toLowerCase()] =
                c
        }
        zd.prototype.get = function(a) {
            if (!(a.toLowerCase() in this.U)) throw Error("Configuration " + a + " is not defined.");
            return this.U[a.toLowerCase()]
        };

        function Cd(a, b) {
            a = a.get(b);
            if (!a) throw Error("Configuration " + b + " is required.");
            return a
        }

        function Dd() {
            this.g = void 0;
            this.a = {}
        }
        k = Dd.prototype;
        k.set = function(a, b) {
            Ed(this, a, b, !1)
        };
        k.add = function(a, b) {
            Ed(this, a, b, !0)
        };

        function Ed(a, b, c, d) {
            for (var e = 0; e < b.length; e++) {
                var f = b.charAt(e);
                a.a[f] || (a.a[f] = new Dd);
                a = a.a[f]
            }
            if (d && void 0 !== a.g) throw Error('The collection already contains the key "' +
                b + '"');
            a.g = c
        }
        k.get = function(a) {
            a: {
                for (var b = this, c = 0; c < a.length; c++)
                    if (b = b.a[a.charAt(c)], !b) {
                        a = void 0;
                        break a
                    } a = b
            }
            return a ? a.g : void 0
        };
        k.ha = function() {
            var a = [];
            Fd(this, a);
            return a
        };

        function Fd(a, b) {
            void 0 !== a.g && b.push(a.g);
            for (var c in a.a) Fd(a.a[c], b)
        }
        k.ga = function() {
            var a = [];
            Gd(this, "", a);
            return a
        };

        function Gd(a, b, c) {
            void 0 !== a.g && c.push(b);
            for (var d in a.a) Gd(a.a[d], b + d, c)
        }
        k.clear = function() {
            this.a = {};
            this.g = void 0
        };

        function Hd(a) {
            this.a = a;
            this.g = new Dd;
            for (a = 0; a < this.a.length; a++) {
                var b = this.g.get("+" +
                    this.a[a].b);
                b ? b.push(this.a[a]) : this.g.add("+" + this.a[a].b, [this.a[a]])
            }
        }

        function Id(a, b) {
            a = a.g;
            var c = {},
                d = 0;
            void 0 !== a.g && (c[d] = a.g);
            for (; d < b.length; d++) {
                var e = b.charAt(d);
                if (!(e in a.a)) break;
                a = a.a[e];
                void 0 !== a.g && (c[d] = a.g)
            }
            for (var f in c)
                if (c.hasOwnProperty(f)) return c[f];
            return []
        }

        function Jd(a) {
            for (var b = 0; b < Kd.length; b++)
                if (Kd[b].c === a) return Kd[b];
            return null
        }

        function Ld(a) {
            a = a.toUpperCase();
            for (var b = [], c = 0; c < Kd.length; c++) Kd[c].f === a && b.push(Kd[c]);
            return b
        }

        function Md(a) {
            if (0 < a.length &&
                "+" == a.charAt(0)) {
                a = a.substring(1);
                for (var b = [], c = 0; c < Kd.length; c++) Kd[c].b == a && b.push(Kd[c]);
                a = b
            } else a = Ld(a);
            return a
        }

        function Nd(a) {
            a.sort(function(a, c) {
                return a.name.localeCompare(c.name, "en")
            })
        }
        var Kd = [{
                name: "Afghanistan",
                c: "93-AF-0",
                b: "93",
                f: "AF"
            }, {
                name: "\u00c5land Islands",
                c: "358-AX-0",
                b: "358",
                f: "AX"
            }, {
                name: "Albania",
                c: "355-AL-0",
                b: "355",
                f: "AL"
            }, {
                name: "Algeria",
                c: "213-DZ-0",
                b: "213",
                f: "DZ"
            }, {
                name: "American Samoa",
                c: "1-AS-0",
                b: "1",
                f: "AS"
            }, {
                name: "Andorra",
                c: "376-AD-0",
                b: "376",
                f: "AD"
            }, {
                name: "Angola",
                c: "244-AO-0",
                b: "244",
                f: "AO"
            }, {
                name: "Anguilla",
                c: "1-AI-0",
                b: "1",
                f: "AI"
            }, {
                name: "Antigua and Barbuda",
                c: "1-AG-0",
                b: "1",
                f: "AG"
            }, {
                name: "Argentina",
                c: "54-AR-0",
                b: "54",
                f: "AR"
            }, {
                name: "Armenia",
                c: "374-AM-0",
                b: "374",
                f: "AM"
            }, {
                name: "Aruba",
                c: "297-AW-0",
                b: "297",
                f: "AW"
            }, {
                name: "Ascension Island",
                c: "247-AC-0",
                b: "247",
                f: "AC"
            }, {
                name: "Australia",
                c: "61-AU-0",
                b: "61",
                f: "AU"
            }, {
                name: "Austria",
                c: "43-AT-0",
                b: "43",
                f: "AT"
            }, {
                name: "Azerbaijan",
                c: "994-AZ-0",
                b: "994",
                f: "AZ"
            }, {
                name: "Bahamas",
                c: "1-BS-0",
                b: "1",
                f: "BS"
            }, {
                name: "Bahrain",
                c: "973-BH-0",
                b: "973",
                f: "BH"
            }, {
                name: "Bangladesh",
                c: "880-BD-0",
                b: "880",
                f: "BD"
            }, {
                name: "Barbados",
                c: "1-BB-0",
                b: "1",
                f: "BB"
            }, {
                name: "Belarus",
                c: "375-BY-0",
                b: "375",
                f: "BY"
            }, {
                name: "Belgium",
                c: "32-BE-0",
                b: "32",
                f: "BE"
            }, {
                name: "Belize",
                c: "501-BZ-0",
                b: "501",
                f: "BZ"
            }, {
                name: "Benin",
                c: "229-BJ-0",
                b: "229",
                f: "BJ"
            }, {
                name: "Bermuda",
                c: "1-BM-0",
                b: "1",
                f: "BM"
            }, {
                name: "Bhutan",
                c: "975-BT-0",
                b: "975",
                f: "BT"
            }, {
                name: "Bolivia",
                c: "591-BO-0",
                b: "591",
                f: "BO"
            }, {
                name: "Bosnia and Herzegovina",
                c: "387-BA-0",
                b: "387",
                f: "BA"
            }, {
                name: "Botswana",
                c: "267-BW-0",
                b: "267",
                f: "BW"
            }, {
                name: "Brazil",
                c: "55-BR-0",
                b: "55",
                f: "BR"
            }, {
                name: "British Indian Ocean Territory",
                c: "246-IO-0",
                b: "246",
                f: "IO"
            }, {
                name: "British Virgin Islands",
                c: "1-VG-0",
                b: "1",
                f: "VG"
            }, {
                name: "Brunei",
                c: "673-BN-0",
                b: "673",
                f: "BN"
            }, {
                name: "Bulgaria",
                c: "359-BG-0",
                b: "359",
                f: "BG"
            }, {
                name: "Burkina Faso",
                c: "226-BF-0",
                b: "226",
                f: "BF"
            }, {
                name: "Burundi",
                c: "257-BI-0",
                b: "257",
                f: "BI"
            }, {
                name: "Cambodia",
                c: "855-KH-0",
                b: "855",
                f: "KH"
            }, {
                name: "Cameroon",
                c: "237-CM-0",
                b: "237",
                f: "CM"
            }, {
                name: "Canada",
                c: "1-CA-0",
                b: "1",
                f: "CA"
            }, {
                name: "Cape Verde",
                c: "238-CV-0",
                b: "238",
                f: "CV"
            }, {
                name: "Caribbean Netherlands",
                c: "599-BQ-0",
                b: "599",
                f: "BQ"
            }, {
                name: "Cayman Islands",
                c: "1-KY-0",
                b: "1",
                f: "KY"
            }, {
                name: "Central African Republic",
                c: "236-CF-0",
                b: "236",
                f: "CF"
            }, {
                name: "Chad",
                c: "235-TD-0",
                b: "235",
                f: "TD"
            }, {
                name: "Chile",
                c: "56-CL-0",
                b: "56",
                f: "CL"
            }, {
                name: "China",
                c: "86-CN-0",
                b: "86",
                f: "CN"
            }, {
                name: "Christmas Island",
                c: "61-CX-0",
                b: "61",
                f: "CX"
            }, {
                name: "Cocos [Keeling] Islands",
                c: "61-CC-0",
                b: "61",
                f: "CC"
            }, {
                name: "Colombia",
                c: "57-CO-0",
                b: "57",
                f: "CO"
            },
            {
                name: "Comoros",
                c: "269-KM-0",
                b: "269",
                f: "KM"
            }, {
                name: "Democratic Republic Congo",
                c: "243-CD-0",
                b: "243",
                f: "CD"
            }, {
                name: "Republic of Congo",
                c: "242-CG-0",
                b: "242",
                f: "CG"
            }, {
                name: "Cook Islands",
                c: "682-CK-0",
                b: "682",
                f: "CK"
            }, {
                name: "Costa Rica",
                c: "506-CR-0",
                b: "506",
                f: "CR"
            }, {
                name: "C\u00f4te d'Ivoire",
                c: "225-CI-0",
                b: "225",
                f: "CI"
            }, {
                name: "Croatia",
                c: "385-HR-0",
                b: "385",
                f: "HR"
            }, {
                name: "Cuba",
                c: "53-CU-0",
                b: "53",
                f: "CU"
            }, {
                name: "Cura\u00e7ao",
                c: "599-CW-0",
                b: "599",
                f: "CW"
            }, {
                name: "Cyprus",
                c: "357-CY-0",
                b: "357",
                f: "CY"
            }, {
                name: "Czech Republic",
                c: "420-CZ-0",
                b: "420",
                f: "CZ"
            }, {
                name: "Denmark",
                c: "45-DK-0",
                b: "45",
                f: "DK"
            }, {
                name: "Djibouti",
                c: "253-DJ-0",
                b: "253",
                f: "DJ"
            }, {
                name: "Dominica",
                c: "1-DM-0",
                b: "1",
                f: "DM"
            }, {
                name: "Dominican Republic",
                c: "1-DO-0",
                b: "1",
                f: "DO"
            }, {
                name: "East Timor",
                c: "670-TL-0",
                b: "670",
                f: "TL"
            }, {
                name: "Ecuador",
                c: "593-EC-0",
                b: "593",
                f: "EC"
            }, {
                name: "Egypt",
                c: "20-EG-0",
                b: "20",
                f: "EG"
            }, {
                name: "El Salvador",
                c: "503-SV-0",
                b: "503",
                f: "SV"
            }, {
                name: "Equatorial Guinea",
                c: "240-GQ-0",
                b: "240",
                f: "GQ"
            }, {
                name: "Eritrea",
                c: "291-ER-0",
                b: "291",
                f: "ER"
            }, {
                name: "Estonia",
                c: "372-EE-0",
                b: "372",
                f: "EE"
            }, {
                name: "Ethiopia",
                c: "251-ET-0",
                b: "251",
                f: "ET"
            }, {
                name: "Falkland Islands [Islas Malvinas]",
                c: "500-FK-0",
                b: "500",
                f: "FK"
            }, {
                name: "Faroe Islands",
                c: "298-FO-0",
                b: "298",
                f: "FO"
            }, {
                name: "Fiji",
                c: "679-FJ-0",
                b: "679",
                f: "FJ"
            }, {
                name: "Finland",
                c: "358-FI-0",
                b: "358",
                f: "FI"
            }, {
                name: "France",
                c: "33-FR-0",
                b: "33",
                f: "FR"
            }, {
                name: "French Guiana",
                c: "594-GF-0",
                b: "594",
                f: "GF"
            }, {
                name: "French Polynesia",
                c: "689-PF-0",
                b: "689",
                f: "PF"
            }, {
                name: "Gabon",
                c: "241-GA-0",
                b: "241",
                f: "GA"
            }, {
                name: "Gambia",
                c: "220-GM-0",
                b: "220",
                f: "GM"
            }, {
                name: "Georgia",
                c: "995-GE-0",
                b: "995",
                f: "GE"
            }, {
                name: "Germany",
                c: "49-DE-0",
                b: "49",
                f: "DE"
            }, {
                name: "Ghana",
                c: "233-GH-0",
                b: "233",
                f: "GH"
            }, {
                name: "Gibraltar",
                c: "350-GI-0",
                b: "350",
                f: "GI"
            }, {
                name: "Greece",
                c: "30-GR-0",
                b: "30",
                f: "GR"
            }, {
                name: "Greenland",
                c: "299-GL-0",
                b: "299",
                f: "GL"
            }, {
                name: "Grenada",
                c: "1-GD-0",
                b: "1",
                f: "GD"
            }, {
                name: "Guadeloupe",
                c: "590-GP-0",
                b: "590",
                f: "GP"
            }, {
                name: "Guam",
                c: "1-GU-0",
                b: "1",
                f: "GU"
            }, {
                name: "Guatemala",
                c: "502-GT-0",
                b: "502",
                f: "GT"
            }, {
                name: "Guernsey",
                c: "44-GG-0",
                b: "44",
                f: "GG"
            },
            {
                name: "Guinea Conakry",
                c: "224-GN-0",
                b: "224",
                f: "GN"
            }, {
                name: "Guinea-Bissau",
                c: "245-GW-0",
                b: "245",
                f: "GW"
            }, {
                name: "Guyana",
                c: "592-GY-0",
                b: "592",
                f: "GY"
            }, {
                name: "Haiti",
                c: "509-HT-0",
                b: "509",
                f: "HT"
            }, {
                name: "Heard Island and McDonald Islands",
                c: "672-HM-0",
                b: "672",
                f: "HM"
            }, {
                name: "Honduras",
                c: "504-HN-0",
                b: "504",
                f: "HN"
            }, {
                name: "Hong Kong",
                c: "852-HK-0",
                b: "852",
                f: "HK"
            }, {
                name: "Hungary",
                c: "36-HU-0",
                b: "36",
                f: "HU"
            }, {
                name: "Iceland",
                c: "354-IS-0",
                b: "354",
                f: "IS"
            }, {
                name: "India",
                c: "91-IN-0",
                b: "91",
                f: "IN"
            }, {
                name: "Indonesia",
                c: "62-ID-0",
                b: "62",
                f: "ID"
            }, {
                name: "Iran",
                c: "98-IR-0",
                b: "98",
                f: "IR"
            }, {
                name: "Iraq",
                c: "964-IQ-0",
                b: "964",
                f: "IQ"
            }, {
                name: "Ireland",
                c: "353-IE-0",
                b: "353",
                f: "IE"
            }, {
                name: "Isle of Man",
                c: "44-IM-0",
                b: "44",
                f: "IM"
            }, {
                name: "Israel",
                c: "972-IL-0",
                b: "972",
                f: "IL"
            }, {
                name: "Italy",
                c: "39-IT-0",
                b: "39",
                f: "IT"
            }, {
                name: "Jamaica",
                c: "1-JM-0",
                b: "1",
                f: "JM"
            }, {
                name: "Japan",
                c: "81-JP-0",
                b: "81",
                f: "JP"
            }, {
                name: "Jersey",
                c: "44-JE-0",
                b: "44",
                f: "JE"
            }, {
                name: "Jordan",
                c: "962-JO-0",
                b: "962",
                f: "JO"
            }, {
                name: "Kazakhstan",
                c: "7-KZ-0",
                b: "7",
                f: "KZ"
            }, {
                name: "Kenya",
                c: "254-KE-0",
                b: "254",
                f: "KE"
            }, {
                name: "Kiribati",
                c: "686-KI-0",
                b: "686",
                f: "KI"
            }, {
                name: "Kosovo",
                c: "377-XK-0",
                b: "377",
                f: "XK"
            }, {
                name: "Kosovo",
                c: "381-XK-0",
                b: "381",
                f: "XK"
            }, {
                name: "Kosovo",
                c: "386-XK-0",
                b: "386",
                f: "XK"
            }, {
                name: "Kuwait",
                c: "965-KW-0",
                b: "965",
                f: "KW"
            }, {
                name: "Kyrgyzstan",
                c: "996-KG-0",
                b: "996",
                f: "KG"
            }, {
                name: "Laos",
                c: "856-LA-0",
                b: "856",
                f: "LA"
            }, {
                name: "Latvia",
                c: "371-LV-0",
                b: "371",
                f: "LV"
            }, {
                name: "Lebanon",
                c: "961-LB-0",
                b: "961",
                f: "LB"
            }, {
                name: "Lesotho",
                c: "266-LS-0",
                b: "266",
                f: "LS"
            }, {
                name: "Liberia",
                c: "231-LR-0",
                b: "231",
                f: "LR"
            }, {
                name: "Libya",
                c: "218-LY-0",
                b: "218",
                f: "LY"
            }, {
                name: "Liechtenstein",
                c: "423-LI-0",
                b: "423",
                f: "LI"
            }, {
                name: "Lithuania",
                c: "370-LT-0",
                b: "370",
                f: "LT"
            }, {
                name: "Luxembourg",
                c: "352-LU-0",
                b: "352",
                f: "LU"
            }, {
                name: "Macau",
                c: "853-MO-0",
                b: "853",
                f: "MO"
            }, {
                name: "Macedonia",
                c: "389-MK-0",
                b: "389",
                f: "MK"
            }, {
                name: "Madagascar",
                c: "261-MG-0",
                b: "261",
                f: "MG"
            }, {
                name: "Malawi",
                c: "265-MW-0",
                b: "265",
                f: "MW"
            }, {
                name: "Malaysia",
                c: "60-MY-0",
                b: "60",
                f: "MY"
            }, {
                name: "Maldives",
                c: "960-MV-0",
                b: "960",
                f: "MV"
            }, {
                name: "Mali",
                c: "223-ML-0",
                b: "223",
                f: "ML"
            }, {
                name: "Malta",
                c: "356-MT-0",
                b: "356",
                f: "MT"
            }, {
                name: "Marshall Islands",
                c: "692-MH-0",
                b: "692",
                f: "MH"
            }, {
                name: "Martinique",
                c: "596-MQ-0",
                b: "596",
                f: "MQ"
            }, {
                name: "Mauritania",
                c: "222-MR-0",
                b: "222",
                f: "MR"
            }, {
                name: "Mauritius",
                c: "230-MU-0",
                b: "230",
                f: "MU"
            }, {
                name: "Mayotte",
                c: "262-YT-0",
                b: "262",
                f: "YT"
            }, {
                name: "Mexico",
                c: "52-MX-0",
                b: "52",
                f: "MX"
            }, {
                name: "Micronesia",
                c: "691-FM-0",
                b: "691",
                f: "FM"
            }, {
                name: "Moldova",
                c: "373-MD-0",
                b: "373",
                f: "MD"
            }, {
                name: "Monaco",
                c: "377-MC-0",
                b: "377",
                f: "MC"
            }, {
                name: "Mongolia",
                c: "976-MN-0",
                b: "976",
                f: "MN"
            }, {
                name: "Montenegro",
                c: "382-ME-0",
                b: "382",
                f: "ME"
            }, {
                name: "Montserrat",
                c: "1-MS-0",
                b: "1",
                f: "MS"
            }, {
                name: "Morocco",
                c: "212-MA-0",
                b: "212",
                f: "MA"
            }, {
                name: "Mozambique",
                c: "258-MZ-0",
                b: "258",
                f: "MZ"
            }, {
                name: "Myanmar [Burma]",
                c: "95-MM-0",
                b: "95",
                f: "MM"
            }, {
                name: "Namibia",
                c: "264-NA-0",
                b: "264",
                f: "NA"
            }, {
                name: "Nauru",
                c: "674-NR-0",
                b: "674",
                f: "NR"
            }, {
                name: "Nepal",
                c: "977-NP-0",
                b: "977",
                f: "NP"
            }, {
                name: "Netherlands",
                c: "31-NL-0",
                b: "31",
                f: "NL"
            }, {
                name: "New Caledonia",
                c: "687-NC-0",
                b: "687",
                f: "NC"
            }, {
                name: "New Zealand",
                c: "64-NZ-0",
                b: "64",
                f: "NZ"
            }, {
                name: "Nicaragua",
                c: "505-NI-0",
                b: "505",
                f: "NI"
            }, {
                name: "Niger",
                c: "227-NE-0",
                b: "227",
                f: "NE"
            }, {
                name: "Nigeria",
                c: "234-NG-0",
                b: "234",
                f: "NG"
            }, {
                name: "Niue",
                c: "683-NU-0",
                b: "683",
                f: "NU"
            }, {
                name: "Norfolk Island",
                c: "672-NF-0",
                b: "672",
                f: "NF"
            }, {
                name: "North Korea",
                c: "850-KP-0",
                b: "850",
                f: "KP"
            }, {
                name: "Northern Mariana Islands",
                c: "1-MP-0",
                b: "1",
                f: "MP"
            }, {
                name: "Norway",
                c: "47-NO-0",
                b: "47",
                f: "NO"
            }, {
                name: "Oman",
                c: "968-OM-0",
                b: "968",
                f: "OM"
            }, {
                name: "Pakistan",
                c: "92-PK-0",
                b: "92",
                f: "PK"
            }, {
                name: "Palau",
                c: "680-PW-0",
                b: "680",
                f: "PW"
            }, {
                name: "Palestinian Territories",
                c: "970-PS-0",
                b: "970",
                f: "PS"
            }, {
                name: "Panama",
                c: "507-PA-0",
                b: "507",
                f: "PA"
            }, {
                name: "Papua New Guinea",
                c: "675-PG-0",
                b: "675",
                f: "PG"
            }, {
                name: "Paraguay",
                c: "595-PY-0",
                b: "595",
                f: "PY"
            }, {
                name: "Peru",
                c: "51-PE-0",
                b: "51",
                f: "PE"
            }, {
                name: "Philippines",
                c: "63-PH-0",
                b: "63",
                f: "PH"
            }, {
                name: "Poland",
                c: "48-PL-0",
                b: "48",
                f: "PL"
            }, {
                name: "Portugal",
                c: "351-PT-0",
                b: "351",
                f: "PT"
            }, {
                name: "Puerto Rico",
                c: "1-PR-0",
                b: "1",
                f: "PR"
            }, {
                name: "Qatar",
                c: "974-QA-0",
                b: "974",
                f: "QA"
            }, {
                name: "R\u00e9union",
                c: "262-RE-0",
                b: "262",
                f: "RE"
            }, {
                name: "Romania",
                c: "40-RO-0",
                b: "40",
                f: "RO"
            }, {
                name: "Russia",
                c: "7-RU-0",
                b: "7",
                f: "RU"
            }, {
                name: "Rwanda",
                c: "250-RW-0",
                b: "250",
                f: "RW"
            }, {
                name: "Saint Barth\u00e9lemy",
                c: "590-BL-0",
                b: "590",
                f: "BL"
            }, {
                name: "Saint Helena",
                c: "290-SH-0",
                b: "290",
                f: "SH"
            }, {
                name: "St. Kitts",
                c: "1-KN-0",
                b: "1",
                f: "KN"
            }, {
                name: "St. Lucia",
                c: "1-LC-0",
                b: "1",
                f: "LC"
            }, {
                name: "Saint Martin",
                c: "590-MF-0",
                b: "590",
                f: "MF"
            }, {
                name: "Saint Pierre and Miquelon",
                c: "508-PM-0",
                b: "508",
                f: "PM"
            }, {
                name: "St. Vincent",
                c: "1-VC-0",
                b: "1",
                f: "VC"
            }, {
                name: "Samoa",
                c: "685-WS-0",
                b: "685",
                f: "WS"
            }, {
                name: "San Marino",
                c: "378-SM-0",
                b: "378",
                f: "SM"
            }, {
                name: "S\u00e3o Tom\u00e9 and Pr\u00edncipe",
                c: "239-ST-0",
                b: "239",
                f: "ST"
            }, {
                name: "Saudi Arabia",
                c: "966-SA-0",
                b: "966",
                f: "SA"
            }, {
                name: "Senegal",
                c: "221-SN-0",
                b: "221",
                f: "SN"
            }, {
                name: "Serbia",
                c: "381-RS-0",
                b: "381",
                f: "RS"
            }, {
                name: "Seychelles",
                c: "248-SC-0",
                b: "248",
                f: "SC"
            }, {
                name: "Sierra Leone",
                c: "232-SL-0",
                b: "232",
                f: "SL"
            }, {
                name: "Singapore",
                c: "65-SG-0",
                b: "65",
                f: "SG"
            }, {
                name: "Sint Maarten",
                c: "1-SX-0",
                b: "1",
                f: "SX"
            },
            {
                name: "Slovakia",
                c: "421-SK-0",
                b: "421",
                f: "SK"
            }, {
                name: "Slovenia",
                c: "386-SI-0",
                b: "386",
                f: "SI"
            }, {
                name: "Solomon Islands",
                c: "677-SB-0",
                b: "677",
                f: "SB"
            }, {
                name: "Somalia",
                c: "252-SO-0",
                b: "252",
                f: "SO"
            }, {
                name: "South Africa",
                c: "27-ZA-0",
                b: "27",
                f: "ZA"
            }, {
                name: "South Georgia and the South Sandwich Islands",
                c: "500-GS-0",
                b: "500",
                f: "GS"
            }, {
                name: "South Korea",
                c: "82-KR-0",
                b: "82",
                f: "KR"
            }, {
                name: "South Sudan",
                c: "211-SS-0",
                b: "211",
                f: "SS"
            }, {
                name: "Spain",
                c: "34-ES-0",
                b: "34",
                f: "ES"
            }, {
                name: "Sri Lanka",
                c: "94-LK-0",
                b: "94",
                f: "LK"
            },
            {
                name: "Sudan",
                c: "249-SD-0",
                b: "249",
                f: "SD"
            }, {
                name: "Suriname",
                c: "597-SR-0",
                b: "597",
                f: "SR"
            }, {
                name: "Svalbard and Jan Mayen",
                c: "47-SJ-0",
                b: "47",
                f: "SJ"
            }, {
                name: "Swaziland",
                c: "268-SZ-0",
                b: "268",
                f: "SZ"
            }, {
                name: "Sweden",
                c: "46-SE-0",
                b: "46",
                f: "SE"
            }, {
                name: "Switzerland",
                c: "41-CH-0",
                b: "41",
                f: "CH"
            }, {
                name: "Syria",
                c: "963-SY-0",
                b: "963",
                f: "SY"
            }, {
                name: "Taiwan",
                c: "886-TW-0",
                b: "886",
                f: "TW"
            }, {
                name: "Tajikistan",
                c: "992-TJ-0",
                b: "992",
                f: "TJ"
            }, {
                name: "Tanzania",
                c: "255-TZ-0",
                b: "255",
                f: "TZ"
            }, {
                name: "Thailand",
                c: "66-TH-0",
                b: "66",
                f: "TH"
            },
            {
                name: "Togo",
                c: "228-TG-0",
                b: "228",
                f: "TG"
            }, {
                name: "Tokelau",
                c: "690-TK-0",
                b: "690",
                f: "TK"
            }, {
                name: "Tonga",
                c: "676-TO-0",
                b: "676",
                f: "TO"
            }, {
                name: "Trinidad/Tobago",
                c: "1-TT-0",
                b: "1",
                f: "TT"
            }, {
                name: "Tunisia",
                c: "216-TN-0",
                b: "216",
                f: "TN"
            }, {
                name: "Turkey",
                c: "90-TR-0",
                b: "90",
                f: "TR"
            }, {
                name: "Turkmenistan",
                c: "993-TM-0",
                b: "993",
                f: "TM"
            }, {
                name: "Turks and Caicos Islands",
                c: "1-TC-0",
                b: "1",
                f: "TC"
            }, {
                name: "Tuvalu",
                c: "688-TV-0",
                b: "688",
                f: "TV"
            }, {
                name: "U.S. Virgin Islands",
                c: "1-VI-0",
                b: "1",
                f: "VI"
            }, {
                name: "Uganda",
                c: "256-UG-0",
                b: "256",
                f: "UG"
            }, {
                name: "Ukraine",
                c: "380-UA-0",
                b: "380",
                f: "UA"
            }, {
                name: "United Arab Emirates",
                c: "971-AE-0",
                b: "971",
                f: "AE"
            }, {
                name: "United Kingdom",
                c: "44-GB-0",
                b: "44",
                f: "GB"
            }, {
                name: "United States",
                c: "1-US-0",
                b: "1",
                f: "US"
            }, {
                name: "Uruguay",
                c: "598-UY-0",
                b: "598",
                f: "UY"
            }, {
                name: "Uzbekistan",
                c: "998-UZ-0",
                b: "998",
                f: "UZ"
            }, {
                name: "Vanuatu",
                c: "678-VU-0",
                b: "678",
                f: "VU"
            }, {
                name: "Vatican City",
                c: "379-VA-0",
                b: "379",
                f: "VA"
            }, {
                name: "Venezuela",
                c: "58-VE-0",
                b: "58",
                f: "VE"
            }, {
                name: "Vietnam",
                c: "84-VN-0",
                b: "84",
                f: "VN"
            }, {
                name: "Wallis and Futuna",
                c: "681-WF-0",
                b: "681",
                f: "WF"
            }, {
                name: "Western Sahara",
                c: "212-EH-0",
                b: "212",
                f: "EH"
            }, {
                name: "Yemen",
                c: "967-YE-0",
                b: "967",
                f: "YE"
            }, {
                name: "Zambia",
                c: "260-ZM-0",
                b: "260",
                f: "ZM"
            }, {
                name: "Zimbabwe",
                c: "263-ZW-0",
                b: "263",
                f: "ZW"
            }
        ];
        Nd(Kd);
        var Od = new Hd(Kd);

        function Pd(a, b) {
            this.a = a;
            this.ta = b
        }

        function Qd(a) {
            a = Ta(a);
            var b = Id(Od, a);
            return 0 < b.length ? new Pd("1" == b[0].b ? "1-US-0" : b[0].c, Ta(a.substr(b[0].b.length + 1))) : null
        }

        function Rd(a) {
            var b = Jd(a.a);
            if (!b) throw Error("Country ID " + a.a + " not found.");
            return "+" + b.b + a.ta
        }

        function Sd(a) {
            for (var b = 0; b < a.length; b++)
                if (!Ka(Td, a[b])) return a[b];
            return null
        }
        var Td = ["emailLink", "password", "phone"],
            Ud = {
                "facebook.com": "FacebookAuthProvider",
                "github.com": "GithubAuthProvider",
                "google.com": "GoogleAuthProvider",
                password: "EmailAuthProvider",
                "twitter.com": "TwitterAuthProvider",
                phone: "PhoneAuthProvider"
            };
        var Vd = Object.freeze || function(a) {
            return a
        };

        function Wd(a, b, c) {
            this.reset(a, b, c, void 0, void 0)
        }
        Wd.prototype.a = null;
        var Xd = 0;
        Wd.prototype.reset = function(a, b, c, d, e) {
            "number" == typeof e ||
                Xd++;
            this.h = d || xa();
            this.j = a;
            this.i = b;
            this.g = c;
            delete this.a
        };

        function Yd(a) {
            this.i = a;
            this.a = this.h = this.j = this.g = null
        }

        function Zd(a, b) {
            this.name = a;
            this.value = b
        }
        Zd.prototype.toString = function() {
            return this.name
        };
        var $d = new Zd("SHOUT", 1200),
            ae = new Zd("SEVERE", 1E3),
            be = new Zd("WARNING", 900),
            ce = new Zd("CONFIG", 700);

        function de(a) {
            if (a.j) return a.j;
            if (a.g) return de(a.g);
            Ca("Root logger has no level set.");
            return null
        }
        Yd.prototype.log = function(a, b, c) {
            if (a.value >= de(this).value)
                for (qa(b) && (b = b()), a = new Wd(a,
                        String(b), this.i), c && (a.a = c), c = this; c;) {
                    var d = c,
                        e = a;
                    if (d.a)
                        for (var f = 0; b = d.a[f]; f++) b(e);
                    c = c.g
                }
        };
        var ee = {},
            fe = null;

        function ge() {
            fe || (fe = new Yd(""), ee[""] = fe, fe.j = ce)
        }

        function he(a) {
            ge();
            var b;
            if (!(b = ee[a])) {
                b = new Yd(a);
                var c = a.lastIndexOf("."),
                    d = a.substr(c + 1);
                c = he(a.substr(0, c));
                c.h || (c.h = {});
                c.h[d] = b;
                b.g = c;
                ee[a] = b
            }
            return b
        }

        function ie() {
            this.a = xa()
        }
        var je = null;
        ie.prototype.set = function(a) {
            this.a = a
        };
        ie.prototype.reset = function() {
            this.set(xa())
        };
        ie.prototype.get = function() {
            return this.a
        };

        function ke(a) {
            this.j =
                a || "";
            je || (je = new ie);
            this.i = je
        }
        ke.prototype.a = !0;
        ke.prototype.g = !0;
        ke.prototype.h = !1;

        function le(a) {
            return 10 > a ? "0" + a : String(a)
        }

        function me(a, b) {
            a = (a.h - b) / 1E3;
            b = a.toFixed(3);
            var c = 0;
            if (1 > a) c = 2;
            else
                for (; 100 > a;) c++, a *= 10;
            for (; 0 < c--;) b = " " + b;
            return b
        }

        function ne(a) {
            ke.call(this, a)
        }
        r(ne, ke);

        function oe() {
            this.i = p(this.h, this);
            this.a = new ne;
            this.a.g = !1;
            this.a.h = !1;
            this.g = this.a.a = !1;
            this.j = {}
        }
        oe.prototype.h = function(a) {
            if (!this.j[a.g]) {
                var b = this.a;
                var c = [];
                c.push(b.j, " ");
                if (b.g) {
                    var d = new Date(a.h);
                    c.push("[", le(d.getFullYear() - 2E3) + le(d.getMonth() + 1) + le(d.getDate()) + " " + le(d.getHours()) + ":" + le(d.getMinutes()) + ":" + le(d.getSeconds()) + "." + le(Math.floor(d.getMilliseconds() / 10)), "] ")
                }
                c.push("[", me(a, b.i.get()), "s] ");
                c.push("[", a.g, "] ");
                c.push(a.i);
                b.h && (d = a.a) && c.push("\n", d instanceof Error ? d.message : d.toString());
                b.a && c.push("\n");
                b = c.join("");
                if (c = pe) switch (a.j) {
                    case $d:
                        qe(c, "info", b);
                        break;
                    case ae:
                        qe(c, "error", b);
                        break;
                    case be:
                        qe(c, "warn", b);
                        break;
                    default:
                        qe(c, "log", b)
                }
            }
        };
        var pe = l.console;

        function qe(a, b, c) {
            if (a[b]) a[b](c);
            else a.log(c)
        }

        function re(a, b) {
            var c = se;
            c && c.log(ae, a, b)
        }
        var se;
        se = he("firebaseui");
        var te = new oe;
        if (1 != te.g) {
            var ue;
            ge();
            ue = fe;
            var ve = te.i;
            ue.a || (ue.a = []);
            ue.a.push(ve);
            te.g = !0
        }

        function we(a) {
            var b = se;
            b && b.log(be, a, void 0)
        }

        function xe(a) {
            a.prototype.then = a.prototype.then;
            a.prototype.$goog_Thenable = !0
        }

        function ye(a) {
            if (!a) return !1;
            try {
                return !!a.$goog_Thenable
            } catch (b) {
                return !1
            }
        }

        function ze(a, b) {
            this.h = a;
            this.j = b;
            this.g = 0;
            this.a = null
        }
        ze.prototype.get = function() {
            if (0 <
                this.g) {
                this.g--;
                var a = this.a;
                this.a = a.next;
                a.next = null
            } else a = this.h();
            return a
        };

        function Be(a, b) {
            a.j(b);
            100 > a.g && (a.g++, b.next = a.a, a.a = b)
        }

        function Ce() {
            this.g = this.a = null
        }
        var Ee = new ze(function() {
            return new De
        }, function(a) {
            a.reset()
        });
        Ce.prototype.add = function(a, b) {
            var c = Ee.get();
            c.set(a, b);
            this.g ? this.g.next = c : this.a = c;
            this.g = c
        };

        function Fe() {
            var a = Ge,
                b = null;
            a.a && (b = a.a, a.a = a.a.next, a.a || (a.g = null), b.next = null);
            return b
        }

        function De() {
            this.next = this.g = this.a = null
        }
        De.prototype.set = function(a, b) {
            this.a =
                a;
            this.g = b;
            this.next = null
        };
        De.prototype.reset = function() {
            this.next = this.g = this.a = null
        };

        function He(a) {
            l.setTimeout(function() {
                throw a;
            }, 0)
        }
        var Ie;

        function Je() {
            var a = l.MessageChannel;
            "undefined" === typeof a && "undefined" !== typeof window && window.postMessage && window.addEventListener && !t("Presto") && (a = function() {
                var a = document.createElement("IFRAME");
                a.style.display = "none";
                a.src = "";
                document.documentElement.appendChild(a);
                var b = a.contentWindow;
                a = b.document;
                a.open();
                a.write("");
                a.close();
                var c = "callImmediate" +
                    Math.random(),
                    d = "file:" == b.location.protocol ? "*" : b.location.protocol + "//" + b.location.host;
                a = p(function(a) {
                    if (("*" == d || a.origin == d) && a.data == c) this.port1.onmessage()
                }, this);
                b.addEventListener("message", a, !1);
                this.port1 = {};
                this.port2 = {
                    postMessage: function() {
                        b.postMessage(c, d)
                    }
                }
            });
            if ("undefined" !== typeof a && !t("Trident") && !t("MSIE")) {
                var b = new a,
                    c = {},
                    d = c;
                b.port1.onmessage = function() {
                    if (fa(c.next)) {
                        c = c.next;
                        var a = c.Za;
                        c.Za = null;
                        a()
                    }
                };
                return function(a) {
                    d.next = {
                        Za: a
                    };
                    d = d.next;
                    b.port2.postMessage(0)
                }
            }
            return "undefined" !==
                typeof document && "onreadystatechange" in document.createElement("SCRIPT") ? function(a) {
                    var b = document.createElement("SCRIPT");
                    b.onreadystatechange = function() {
                        b.onreadystatechange = null;
                        b.parentNode.removeChild(b);
                        b = null;
                        a();
                        a = null
                    };
                    document.documentElement.appendChild(b)
                } : function(a) {
                    l.setTimeout(a, 0)
                }
        }

        function Ke(a, b) {
            Le || Me();
            Ne || (Le(), Ne = !0);
            Ge.add(a, b)
        }
        var Le;

        function Me() {
            if (l.Promise && l.Promise.resolve) {
                var a = l.Promise.resolve(void 0);
                Le = function() {
                    a.then(Oe)
                }
            } else Le = function() {
                var a = Oe;
                !qa(l.setImmediate) ||
                    l.Window && l.Window.prototype && !t("Edge") && l.Window.prototype.setImmediate == l.setImmediate ? (Ie || (Ie = Je()), Ie(a)) : l.setImmediate(a)
            }
        }
        var Ne = !1,
            Ge = new Ce;

        function Oe() {
            for (var a; a = Fe();) {
                try {
                    a.a.call(a.g)
                } catch (b) {
                    He(b)
                }
                Be(Ee, a)
            }
            Ne = !1
        }

        function A(a, b) {
            this.a = Pe;
            this.w = void 0;
            this.j = this.g = this.h = null;
            this.i = this.u = !1;
            if (a != ja) try {
                var c = this;
                a.call(b, function(a) {
                    Qe(c, Re, a)
                }, function(a) {
                    if (!(a instanceof Se)) try {
                        if (a instanceof Error) throw a;
                        throw Error("Promise rejected.");
                    } catch (e) {}
                    Qe(c, Te, a)
                })
            } catch (d) {
                Qe(this,
                    Te, d)
            }
        }
        var Pe = 0,
            Re = 2,
            Te = 3;

        function Ue() {
            this.next = this.context = this.g = this.h = this.a = null;
            this.j = !1
        }
        Ue.prototype.reset = function() {
            this.context = this.g = this.h = this.a = null;
            this.j = !1
        };
        var Ve = new ze(function() {
            return new Ue
        }, function(a) {
            a.reset()
        });

        function We(a, b, c) {
            var d = Ve.get();
            d.h = a;
            d.g = b;
            d.context = c;
            return d
        }

        function B(a) {
            if (a instanceof A) return a;
            var b = new A(ja);
            Qe(b, Re, a);
            return b
        }

        function Xe(a) {
            return new A(function(b, c) {
                c(a)
            })
        }
        A.prototype.then = function(a, b, c) {
            return Ye(this, qa(a) ? a : null, qa(b) ?
                b : null, c)
        };
        xe(A);

        function Ze(a, b) {
            return Ye(a, null, b, void 0)
        }
        A.prototype.cancel = function(a) {
            this.a == Pe && Ke(function() {
                var b = new Se(a);
                $e(this, b)
            }, this)
        };

        function $e(a, b) {
            if (a.a == Pe)
                if (a.h) {
                    var c = a.h;
                    if (c.g) {
                        for (var d = 0, e = null, f = null, g = c.g; g && (g.j || (d++, g.a == a && (e = g), !(e && 1 < d))); g = g.next) e || (f = g);
                        e && (c.a == Pe && 1 == d ? $e(c, b) : (f ? (d = f, d.next == c.j && (c.j = d), d.next = d.next.next) : af(c), bf(c, e, Te, b)))
                    }
                    a.h = null
                } else Qe(a, Te, b)
        }

        function cf(a, b) {
            a.g || a.a != Re && a.a != Te || df(a);
            a.j ? a.j.next = b : a.g = b;
            a.j = b
        }

        function Ye(a,
            b, c, d) {
            var e = We(null, null, null);
            e.a = new A(function(a, g) {
                e.h = b ? function(c) {
                    try {
                        var e = b.call(d, c);
                        a(e)
                    } catch (y) {
                        g(y)
                    }
                } : a;
                e.g = c ? function(b) {
                    try {
                        var e = c.call(d, b);
                        !fa(e) && b instanceof Se ? g(b) : a(e)
                    } catch (y) {
                        g(y)
                    }
                } : g
            });
            e.a.h = a;
            cf(a, e);
            return e.a
        }
        A.prototype.D = function(a) {
            this.a = Pe;
            Qe(this, Re, a)
        };
        A.prototype.F = function(a) {
            this.a = Pe;
            Qe(this, Te, a)
        };

        function Qe(a, b, c) {
            if (a.a == Pe) {
                a === c && (b = Te, c = new TypeError("Promise cannot resolve to itself"));
                a.a = 1;
                a: {
                    var d = c,
                        e = a.D,
                        f = a.F;
                    if (d instanceof A) {
                        cf(d, We(e || ja,
                            f || null, a));
                        var g = !0
                    } else if (ye(d)) d.then(e, f, a),
                    g = !0;
                    else {
                        if (ra(d)) try {
                            var h = d.then;
                            if (qa(h)) {
                                ef(d, h, e, f, a);
                                g = !0;
                                break a
                            }
                        } catch (n) {
                            f.call(a, n);
                            g = !0;
                            break a
                        }
                        g = !1
                    }
                }
                g || (a.w = c, a.a = b, a.h = null, df(a), b != Te || c instanceof Se || ff(a, c))
            }
        }

        function ef(a, b, c, d, e) {
            function f(a) {
                h || (h = !0, d.call(e, a))
            }

            function g(a) {
                h || (h = !0, c.call(e, a))
            }
            var h = !1;
            try {
                b.call(a, g, f)
            } catch (n) {
                f(n)
            }
        }

        function df(a) {
            a.u || (a.u = !0, Ke(a.B, a))
        }

        function af(a) {
            var b = null;
            a.g && (b = a.g, a.g = b.next, b.next = null);
            a.g || (a.j = null);
            return b
        }
        A.prototype.B =
            function() {
                for (var a; a = af(this);) bf(this, a, this.a, this.w);
                this.u = !1
            };

        function bf(a, b, c, d) {
            if (c == Te && b.g && !b.j)
                for (; a && a.i; a = a.h) a.i = !1;
            if (b.a) b.a.h = null, gf(b, c, d);
            else try {
                b.j ? b.h.call(b.context) : gf(b, c, d)
            } catch (e) {
                hf.call(null, e)
            }
            Be(Ve, b)
        }

        function gf(a, b, c) {
            b == Re ? a.h.call(a.context, c) : a.g && a.g.call(a.context, c)
        }

        function ff(a, b) {
            a.i = !0;
            Ke(function() {
                a.i && hf.call(null, b)
            })
        }
        var hf = He;

        function Se(a) {
            za.call(this, a)
        }
        r(Se, za);
        Se.prototype.name = "cancel";
        var jf = !u || 9 <= Number(Ab),
            kf = u && !zb("9"),
            lf = function() {
                if (!l.addEventListener ||
                    !Object.defineProperty) return !1;
                var a = !1,
                    b = Object.defineProperty({}, "passive", {
                        get: function() {
                            a = !0
                        }
                    });
                try {
                    l.addEventListener("test", ja, b), l.removeEventListener("test", ja, b)
                } catch (c) {}
                return a
            }();

        function mf() {
            0 != nf && ( of [this[sa] || (this[sa] = ++ta)] = this);
            this.N = this.N;
            this.B = this.B
        }
        var nf = 0,
            of = {};
        mf.prototype.N = !1;
        mf.prototype.m = function() {
            if (!this.N && (this.N = !0, this.l(), 0 != nf)) {
                var a = this[sa] || (this[sa] = ++ta);
                if (0 != nf && this.B && 0 < this.B.length) throw Error(this + " did not empty its onDisposeCallbacks queue. This probably means it overrode dispose() or disposeInternal() without calling the superclass' method.");
                delete of [a]
            }
        };

        function pf(a, b) {
            a.N ? fa(void 0) ? b.call(void 0) : b() : (a.B || (a.B = []), a.B.push(fa(void 0) ? p(b, void 0) : b))
        }
        mf.prototype.l = function() {
            if (this.B)
                for (; this.B.length;) this.B.shift()()
        };

        function qf(a) {
            a && "function" == typeof a.m && a.m()
        }

        function rf(a, b) {
            this.type = a;
            this.g = this.target = b;
            this.h = !1;
            this.eb = !0
        }
        rf.prototype.stopPropagation = function() {
            this.h = !0
        };
        rf.prototype.preventDefault = function() {
            this.eb = !1
        };

        function sf(a, b) {
            rf.call(this, a ? a.type : "");
            this.relatedTarget = this.g = this.target = null;
            this.button =
                this.screenY = this.screenX = this.clientY = this.clientX = 0;
            this.key = "";
            this.j = this.keyCode = 0;
            this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
            this.pointerId = 0;
            this.pointerType = "";
            this.a = null;
            if (a) {
                var c = this.type = a.type,
                    d = a.changedTouches ? a.changedTouches[0] : null;
                this.target = a.target || a.srcElement;
                this.g = b;
                if (b = a.relatedTarget) {
                    if (qb) {
                        a: {
                            try {
                                kb(b.nodeName);
                                var e = !0;
                                break a
                            } catch (f) {}
                            e = !1
                        }
                        e || (b = null)
                    }
                } else "mouseover" == c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);
                this.relatedTarget = b;
                null === d ?
                    (this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0) : (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0);
                this.button = a.button;
                this.keyCode = a.keyCode || 0;
                this.key = a.key || "";
                this.j = a.charCode || ("keypress" == c ? a.keyCode : 0);
                this.ctrlKey = a.ctrlKey;
                this.altKey = a.altKey;
                this.shiftKey = a.shiftKey;
                this.metaKey =
                    a.metaKey;
                this.pointerId = a.pointerId || 0;
                this.pointerType = m(a.pointerType) ? a.pointerType : tf[a.pointerType] || "";
                this.a = a;
                a.defaultPrevented && this.preventDefault()
            }
        }
        r(sf, rf);
        var tf = Vd({
            2: "touch",
            3: "pen",
            4: "mouse"
        });
        sf.prototype.stopPropagation = function() {
            sf.o.stopPropagation.call(this);
            this.a.stopPropagation ? this.a.stopPropagation() : this.a.cancelBubble = !0
        };
        sf.prototype.preventDefault = function() {
            sf.o.preventDefault.call(this);
            var a = this.a;
            if (a.preventDefault) a.preventDefault();
            else if (a.returnValue = !1,
                kf) try {
                if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode) a.keyCode = -1
            } catch (b) {}
        };
        var uf = "closure_listenable_" + (1E6 * Math.random() | 0),
            vf = 0;

        function wf(a, b, c, d, e) {
            this.listener = a;
            this.proxy = null;
            this.src = b;
            this.type = c;
            this.capture = !!d;
            this.Da = e;
            this.key = ++vf;
            this.oa = this.Aa = !1
        }

        function xf(a) {
            a.oa = !0;
            a.listener = null;
            a.proxy = null;
            a.src = null;
            a.Da = null
        }

        function yf(a) {
            this.src = a;
            this.a = {};
            this.g = 0
        }
        yf.prototype.add = function(a, b, c, d, e) {
            var f = a.toString();
            a = this.a[f];
            a || (a = this.a[f] = [], this.g++);
            var g = zf(a, b, d,
                e); - 1 < g ? (b = a[g], c || (b.Aa = !1)) : (b = new wf(b, this.src, f, !!d, e), b.Aa = c, a.push(b));
            return b
        };

        function Af(a, b) {
            var c = b.type;
            c in a.a && La(a.a[c], b) && (xf(b), 0 == a.a[c].length && (delete a.a[c], a.g--))
        }

        function zf(a, b, c, d) {
            for (var e = 0; e < a.length; ++e) {
                var f = a[e];
                if (!f.oa && f.listener == b && f.capture == !!c && f.Da == d) return e
            }
            return -1
        }
        var Bf = "closure_lm_" + (1E6 * Math.random() | 0),
            Cf = {},
            Df = 0;

        function Ef(a, b, c, d, e) {
            if (d && d.once) return Ff(a, b, c, d, e);
            if (oa(b)) {
                for (var f = 0; f < b.length; f++) Ef(a, b[f], c, d, e);
                return null
            }
            c = Gf(c);
            return a && a[uf] ? a.D.add(String(b), c, !1, ra(d) ? !!d.capture : !!d, e) : Hf(a, b, c, !1, d, e)
        }

        function Hf(a, b, c, d, e, f) {
            if (!b) throw Error("Invalid event type");
            var g = ra(e) ? !!e.capture : !!e,
                h = If(a);
            h || (a[Bf] = h = new yf(a));
            c = h.add(b, c, d, g, f);
            if (c.proxy) return c;
            d = Jf();
            c.proxy = d;
            d.src = a;
            d.listener = c;
            if (a.addEventListener) lf || (e = g), void 0 === e && (e = !1), a.addEventListener(b.toString(), d, e);
            else if (a.attachEvent) a.attachEvent(Kf(b.toString()), d);
            else if (a.addListener && a.removeListener) a.addListener(d);
            else throw Error("addEventListener and attachEvent are unavailable.");
            Df++;
            return c
        }

        function Jf() {
            var a = Lf,
                b = jf ? function(c) {
                    return a.call(b.src, b.listener, c)
                } : function(c) {
                    c = a.call(b.src, b.listener, c);
                    if (!c) return c
                };
            return b
        }

        function Ff(a, b, c, d, e) {
            if (oa(b)) {
                for (var f = 0; f < b.length; f++) Ff(a, b[f], c, d, e);
                return null
            }
            c = Gf(c);
            return a && a[uf] ? a.D.add(String(b), c, !0, ra(d) ? !!d.capture : !!d, e) : Hf(a, b, c, !0, d, e)
        }

        function Mf(a, b, c, d, e) {
            if (oa(b))
                for (var f = 0; f < b.length; f++) Mf(a, b[f], c, d, e);
            else(d = ra(d) ? !!d.capture : !!d, c = Gf(c), a && a[uf]) ? (a = a.D, b = String(b).toString(), b in a.a && (f = a.a[b],
                c = zf(f, c, d, e), -1 < c && (xf(f[c]), Ma(f, c), 0 == f.length && (delete a.a[b], a.g--)))) : a && (a = If(a)) && (b = a.a[b.toString()], a = -1, b && (a = zf(b, c, d, e)), (c = -1 < a ? b[a] : null) && Nf(c))
        }

        function Nf(a) {
            if ("number" != typeof a && a && !a.oa) {
                var b = a.src;
                if (b && b[uf]) Af(b.D, a);
                else {
                    var c = a.type,
                        d = a.proxy;
                    b.removeEventListener ? b.removeEventListener(c, d, a.capture) : b.detachEvent ? b.detachEvent(Kf(c), d) : b.addListener && b.removeListener && b.removeListener(d);
                    Df--;
                    (c = If(b)) ? (Af(c, a), 0 == c.g && (c.src = null, b[Bf] = null)) : xf(a)
                }
            }
        }

        function Kf(a) {
            return a in
                Cf ? Cf[a] : Cf[a] = "on" + a
        }

        function Of(a, b, c, d) {
            var e = !0;
            if (a = If(a))
                if (b = a.a[b.toString()])
                    for (b = b.concat(), a = 0; a < b.length; a++) {
                        var f = b[a];
                        f && f.capture == c && !f.oa && (f = Pf(f, d), e = e && !1 !== f)
                    }
            return e
        }

        function Pf(a, b) {
            var c = a.listener,
                d = a.Da || a.src;
            a.Aa && Nf(a);
            return c.call(d, b)
        }

        function Lf(a, b) {
            if (a.oa) return !0;
            if (!jf) {
                if (!b) a: {
                    b = ["window", "event"];
                    for (var c = l, d = 0; d < b.length; d++)
                        if (c = c[b[d]], null == c) {
                            b = null;
                            break a
                        } b = c
                }
                d = b;
                b = new sf(d, this);
                c = !0;
                if (!(0 > d.keyCode || void 0 != d.returnValue)) {
                    a: {
                        var e = !1;
                        if (0 == d.keyCode) try {
                            d.keyCode = -1;
                            break a
                        } catch (g) {
                            e = !0
                        }
                        if (e || void 0 == d.returnValue) d.returnValue = !0
                    }
                    d = [];
                    for (e = b.g; e; e = e.parentNode) d.push(e);a = a.type;
                    for (e = d.length - 1; !b.h && 0 <= e; e--) {
                        b.g = d[e];
                        var f = Of(d[e], a, !0, b);
                        c = c && f
                    }
                    for (e = 0; !b.h && e < d.length; e++) b.g = d[e],
                    f = Of(d[e], a, !1, b),
                    c = c && f
                }
                return c
            }
            return Pf(a, new sf(b, this))
        }

        function If(a) {
            a = a[Bf];
            return a instanceof yf ? a : null
        }
        var Qf = "__closure_events_fn_" + (1E9 * Math.random() >>> 0);

        function Gf(a) {
            if (qa(a)) return a;
            a[Qf] || (a[Qf] = function(b) {
                return a.handleEvent(b)
            });
            return a[Qf]
        }

        function Rf(a,
            b, c) {
            b || (b = {});
            c = c || window;
            var d = a instanceof Kb ? a : Ob("undefined" != typeof a.href ? a.href : String(a));
            a = b.target || a.target;
            var e = [];
            for (f in b) switch (f) {
                case "width":
                case "height":
                case "top":
                case "left":
                    e.push(f + "=" + b[f]);
                    break;
                case "target":
                case "noopener":
                case "noreferrer":
                    break;
                default:
                    e.push(f + "=" + (b[f] ? 1 : 0))
            }
            var f = e.join(",");
            (t("iPhone") && !t("iPod") && !t("iPad") || t("iPad") || t("iPod")) && c.navigator && c.navigator.standalone && a && "_self" != a ? (f = c.document.createElement("A"), d instanceof Kb || d instanceof Kb || (d = "object" == typeof d && d.na ? d.ka() : String(d), Nb.test(d) || (d = "about:invalid#zClosurez"), d = Pb(d)), f.href = Mb(d), f.setAttribute("target", a), b.noreferrer && f.setAttribute("rel", "noreferrer"), b = document.createEvent("MouseEvent"), b.initMouseEvent("click", !0, !0, c, 1), f.dispatchEvent(b), c = {}) : b.noreferrer ? (c = c.open("", a, f), b = Mb(d), c && (pb && -1 != b.indexOf(";") && (b = "'" + b.replace(/'/g, "%27") + "'"), c.opener = null, b = '<meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0; url=' + Ua(b) + '">',
                b = Tb(b, null), c.document.write(Sb(b)), c.document.close())) : (c = c.open(Mb(d), a, f)) && b.noopener && (c.opener = null);
            return c
        }

        function Sf(a) {
            window.location.assign(Mb(Ob(a)))
        }

        function Tf() {
            try {
                return !!(window.opener && window.opener.location && window.opener.location.assign && window.opener.location.hostname === window.location.hostname && window.opener.location.protocol === window.location.protocol)
            } catch (a) {}
            return !1
        }

        function Uf(a) {
            Rf(a, {
                target: window.cordova && window.cordova.InAppBrowser ? "_system" : "_blank"
            }, void 0)
        }

        function Vf(a) {
            a = ra(a) && 1 == a.nodeType ? a : document.querySelector(String(a));
            if (null == a) throw Error("Could not find the FirebaseUI widget element on the page.");
            return a
        }

        function Wf() {
            return window.location.href
        }

        function Xf() {
            var a = null;
            return Ze(new A(function(b) {
                "complete" == l.document.readyState ? b() : (a = function() {
                    b()
                }, Ff(window, "load", a))
            }), function(b) {
                Mf(window, "load", a);
                throw b;
            })
        }

        function Yf() {
            for (var a = 32, b = []; 0 < a;) b.push("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(62 *
                Math.random()))), a--;
            return b.join("")
        }

        function Zf() {
            this.a = new zd;
            Ad(this.a, "acUiConfig");
            Ad(this.a, "autoUpgradeAnonymousUsers");
            Ad(this.a, "callbacks");
            Ad(this.a, "credentialHelper", $f);
            Ad(this.a, "popupMode", !1);
            Ad(this.a, "privacyPolicyUrl");
            Ad(this.a, "queryParameterForSignInSuccessUrl", "signInSuccessUrl");
            Ad(this.a, "queryParameterForWidgetMode", "mode");
            Ad(this.a, "signInFlow");
            Ad(this.a, "signInOptions");
            Ad(this.a, "signInSuccessUrl");
            Ad(this.a, "siteName");
            Ad(this.a, "tosUrl");
            Ad(this.a, "widgetUrl")
        }
        var $f = "accountchooser.com",
            ag = {
                Pb: $f,
                Sb: "googleyolo",
                NONE: "none"
            },
            bg = {
                Tb: "popup",
                Vb: "redirect"
            };

        function cg(a) {
            return a.a.get("acUiConfig") || null
        }
        var dg = {
                Rb: "callback",
                Ub: "recoverEmail",
                Wb: "resetPassword",
                Xb: "select",
                Yb: "signIn",
                Zb: "verifyEmail"
            },
            eg = ["anonymous"],
            fg = ["sitekey", "tabindex", "callback", "expired-callback"];

        function gg(a) {
            var b = a.a.get("widgetUrl") || Wf();
            return hg(a, b)
        }

        function hg(a, b) {
            a = ig(a);
            for (var c = b.search(vc), d = 0, e, f = []; 0 <= (e = uc(b, d, a, c));) f.push(b.substring(d, e)), d = Math.min(b.indexOf("&",
                e) + 1 || c, c);
            f.push(b.substr(d));
            b = f.join("").replace(yc, "$1");
            c = "=" + encodeURIComponent("select");
            (a += c) ? (c = b.indexOf("#"), 0 > c && (c = b.length), d = b.indexOf("?"), 0 > d || d > c ? (d = c, e = "") : e = b.substring(d + 1, c), b = [b.substr(0, d), e, b.substr(c)], c = b[1], b[1] = a ? c ? c + "&" + a : a : c, a = b[0] + (b[1] ? "?" + b[1] : "") + b[2]) : a = b;
            return a
        }

        function jg(a) {
            var b = !!a.a.get("autoUpgradeAnonymousUsers");
            b && !kg(a) && re('Missing "signInFailure" callback: "signInFailure" callback needs to be provided when "autoUpgradeAnonymousUsers" is set to true.',
                void 0);
            return b
        }

        function lg(a) {
            a = a.a.get("signInOptions") || [];
            for (var b = [], c = 0; c < a.length; c++) {
                var d = a[c];
                d = ra(d) ? d : {
                    provider: d
                };
                (Ud[d.provider] || Ka(eg, d.provider)) && b.push(d)
            }
            return b
        }

        function mg(a, b) {
            a = lg(a);
            for (var c = 0; c < a.length; c++)
                if (a[c].provider === b) return a[c];
            return null
        }

        function pg(a) {
            return Ha(lg(a), function(a) {
                return a.provider
            })
        }

        function qg(a) {
            var b = [],
                c = [];
            Ea(lg(a), function(a) {
                a.authMethod && (b.push(a.authMethod), a.clientId && c.push({
                    uri: a.authMethod,
                    clientId: a.clientId
                }))
            });
            var d = null;
            "googleyolo" === rg(a) && b.length && (d = {
                supportedIdTokenProviders: c,
                supportedAuthMethods: b
            });
            return d
        }

        function sg(a, b) {
            var c = null;
            Ea(lg(a), function(a) {
                a.authMethod === b && (c = a.provider)
            });
            return c
        }

        function tg(a) {
            var b = null;
            Ea(lg(a), function(a) {
                a.provider == firebase.auth.PhoneAuthProvider.PROVIDER_ID && ra(a.recaptchaParameters) && !oa(a.recaptchaParameters) && (b = gb(a.recaptchaParameters))
            });
            if (b) {
                var c = [];
                Ea(fg, function(a) {
                    "undefined" !== typeof b[a] && (c.push(a), delete b[a])
                });
                c.length && we('The following provided "recaptchaParameters" keys are not allowed: ' +
                    c.join(", "))
            }
            return b
        }

        function ug(a, b) {
            a = (a = mg(a, b)) && a.scopes;
            return oa(a) ? a : []
        }

        function vg(a, b) {
            a = (a = mg(a, b)) && a.customParameters;
            return ra(a) ? (a = gb(a), b === firebase.auth.GoogleAuthProvider.PROVIDER_ID && delete a.login_hint, a) : null
        }

        function wg(a) {
            a = mg(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID);
            var b = null;
            a && m(a.loginHint) && (b = Qd(a.loginHint));
            return a && a.defaultNationalNumber || b && b.ta || null
        }

        function xg(a) {
            var b = (a = mg(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID)) && a.defaultCountry || null;
            b = b &&
                Ld(b);
            var c = null;
            a && m(a.loginHint) && (c = Qd(a.loginHint));
            return b && b[0] || c && Jd(c.a) || null
        }

        function yg(a) {
            a = mg(a, firebase.auth.PhoneAuthProvider.PROVIDER_ID);
            if (!a) return null;
            var b = a.whitelistedCountries,
                c = a.blacklistedCountries;
            if ("undefined" !== typeof b && (!oa(b) || 0 == b.length)) throw Error("WhitelistedCountries must be a non-empty array.");
            if ("undefined" !== typeof c && !oa(c)) throw Error("BlacklistedCountries must be an array.");
            if (b && c) throw Error("Both whitelistedCountries and blacklistedCountries are provided.");
            if (!b && !c) return Kd;
            a = [];
            if (b) {
                c = {};
                for (var d = 0; d < b.length; d++) {
                    var e = Md(b[d]);
                    for (var f = 0; f < e.length; f++) c[e[f].c] = e[f]
                }
                for (var g in c) c.hasOwnProperty(g) && a.push(c[g])
            } else {
                g = {};
                for (d = 0; d < c.length; d++)
                    for (e = Md(c[d]), f = 0; f < e.length; f++) g[e[f].c] = e[f];
                for (b = 0; b < Kd.length; b++) null !== g && Kd[b].c in g || a.push(Kd[b])
            }
            return a
        }

        function ig(a) {
            return Cd(a.a, "queryParameterForWidgetMode")
        }

        function C(a) {
            var b = a.a.get("tosUrl") || null;
            a = a.a.get("privacyPolicyUrl") || null;
            b && !a && we("Privacy Policy URL is missing, the link will not be displayed.");
            if (b && a) {
                if (qa(b)) return b;
                if (m(b)) return function() {
                    Uf(b)
                }
            }
            return null
        }

        function D(a) {
            var b = a.a.get("tosUrl") || null,
                c = a.a.get("privacyPolicyUrl") || null;
            c && !b && we("Term of Service URL is missing, the link will not be displayed.");
            if (b && c) {
                if (qa(c)) return c;
                if (m(c)) return function() {
                    Uf(c)
                }
            }
            return null
        }

        function zg(a) {
            return (a = mg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID)) && "undefined" !== typeof a.requireDisplayName ? !!a.requireDisplayName : !0
        }

        function Ag(a) {
            a = mg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID);
            return !(!a || a.signInMethod !== firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD)
        }

        function Bg(a) {
            a = mg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID);
            return !(!a || !a.forceSameDevice)
        }

        function Cg(a) {
            if (Ag(a)) {
                var b = {
                    url: Wf(),
                    handleCodeInApp: !0
                };
                (a = mg(a, firebase.auth.EmailAuthProvider.PROVIDER_ID)) && "function" === typeof a.emailLinkSignIn && ib(b, a.emailLinkSignIn());
                b.url = Oc(Wf(), b.url).toString();
                return b
            }
            return null
        }

        function Dg(a) {
            a = a.a.get("signInFlow");
            for (var b in bg)
                if (bg[b] == a) return bg[b];
            return "redirect"
        }

        function Eg(a) {
            return Fg(a).uiShown || null
        }

        function Gg(a) {
            return Fg(a).signInSuccess || null
        }

        function Hg(a) {
            return Fg(a).signInSuccessWithAuthResult || null
        }

        function kg(a) {
            return Fg(a).signInFailure || null
        }

        function Fg(a) {
            return a.a.get("callbacks") || {}
        }

        function rg(a) {
            if ("http:" !== (window.location && window.location.protocol) && "https:" !== (window.location && window.location.protocol)) return "none";
            a = a.a.get("credentialHelper");
            for (var b in ag)
                if (ag[b] == a) return ag[b];
            return $f
        }

        function Ig(a) {
            this.a =
                Nc(a)
        }
        var E = {
            Ha: "ui_auid",
            Qb: "apiKey",
            Ia: "ui_sd",
            hb: "mode",
            Ta: "oobCode",
            PROVIDER_ID: "ui_pid",
            Ka: "ui_sid"
        };

        function Jg(a, b) {
            b ? a.a.a.set(E.Ka, b) : Sc(a.a.a, E.Ka)
        }

        function Kg(a, b) {
            null !== b ? a.a.a.set(E.Ia, b ? "1" : "0") : Sc(a.a.a, E.Ia)
        }

        function Lg(a) {
            return a.a.a.get(E.Ha) || null
        }

        function Mg(a, b) {
            b ? a.a.a.set(E.PROVIDER_ID, b) : Sc(a.a.a, E.PROVIDER_ID)
        }
        Ig.prototype.toString = function() {
            return this.a.toString()
        };

        function F() {
            mf.call(this);
            this.D = new yf(this);
            this.ib = this;
            this.za = null
        }
        r(F, mf);
        F.prototype[uf] = !0;
        F.prototype.Ra =
            function(a) {
                this.za = a
            };
        F.prototype.removeEventListener = function(a, b, c, d) {
            Mf(this, a, b, c, d)
        };

        function Ng(a, b) {
            var c, d = a.za;
            if (d)
                for (c = []; d; d = d.za) c.push(d);
            a = a.ib;
            d = b.type || b;
            if (m(b)) b = new rf(b, a);
            else if (b instanceof rf) b.target = b.target || a;
            else {
                var e = b;
                b = new rf(d, a);
                ib(b, e)
            }
            e = !0;
            if (c)
                for (var f = c.length - 1; !b.h && 0 <= f; f--) {
                    var g = b.g = c[f];
                    e = Og(g, d, !0, b) && e
                }
            b.h || (g = b.g = a, e = Og(g, d, !0, b) && e, b.h || (e = Og(g, d, !1, b) && e));
            if (c)
                for (f = 0; !b.h && f < c.length; f++) g = b.g = c[f], e = Og(g, d, !1, b) && e;
            return e
        }
        F.prototype.l = function() {
            F.o.l.call(this);
            if (this.D) {
                var a = this.D,
                    b = 0,
                    c;
                for (c in a.a) {
                    for (var d = a.a[c], e = 0; e < d.length; e++) ++b, xf(d[e]);
                    delete a.a[c];
                    a.g--
                }
            }
            this.za = null
        };

        function Og(a, b, c, d) {
            b = a.D.a[String(b)];
            if (!b) return !0;
            b = b.concat();
            for (var e = !0, f = 0; f < b.length; ++f) {
                var g = b[f];
                if (g && !g.oa && g.capture == c) {
                    var h = g.listener,
                        n = g.Da || g.src;
                    g.Aa && Af(a.D, g);
                    e = !1 !== h.call(n, d) && e
                }
            }
            return e && 0 != d.eb
        }
        var Pg = {},
            Qg = 0;

        function Rg(a, b) {
            if (!a) throw Error("Event target element must be provided!");
            a = Sg(a);
            if (Pg[a] && Pg[a].length)
                for (var c = 0; c < Pg[a].length; c++) Ng(Pg[a][c],
                    b)
        }

        function Tg(a) {
            var b = Sg(a.M());
            Pg[b] && Pg[b].length && (Na(Pg[b], function(b) {
                return b == a
            }), Pg[b].length || delete Pg[b])
        }

        function Sg(a) {
            "undefined" === typeof a.a && (a.a = Qg, Qg++);
            return a.a
        }

        function Ug(a) {
            if (!a) throw Error("Event target element must be provided!");
            this.a = a;
            F.call(this)
        }
        r(Ug, F);
        Ug.prototype.M = function() {
            return this.a
        };
        Ug.prototype.register = function() {
            var a = Sg(this.M());
            Pg[a] ? Ka(Pg[a], this) || Pg[a].push(this) : Pg[a] = [this]
        };

        function Vg(a, b) {
            this.i = [];
            this.N = a;
            this.J = b || null;
            this.j = this.a = !1;
            this.h = void 0;
            this.D = this.s = this.w = !1;
            this.u = 0;
            this.g = null;
            this.B = 0
        }
        Vg.prototype.cancel = function(a) {
            if (this.a) this.h instanceof Vg && this.h.cancel();
            else {
                if (this.g) {
                    var b = this.g;
                    delete this.g;
                    a ? b.cancel(a) : (b.B--, 0 >= b.B && b.cancel())
                }
                this.N ? this.N.call(this.J, this) : this.D = !0;
                this.a || (a = new Wg(this), Xg(this), Yg(this, !1, a))
            }
        };
        Vg.prototype.F = function(a, b) {
            this.w = !1;
            Yg(this, a, b)
        };

        function Yg(a, b, c) {
            a.a = !0;
            a.h = c;
            a.j = !b;
            Zg(a)
        }

        function Xg(a) {
            if (a.a) {
                if (!a.D) throw new $g(a);
                a.D = !1
            }
        }

        function ah(a, b, c) {
            a.i.push([b,
                c, void 0
            ]);
            a.a && Zg(a)
        }
        Vg.prototype.then = function(a, b, c) {
            var d, e, f = new A(function(a, b) {
                d = a;
                e = b
            });
            ah(this, d, function(a) {
                a instanceof Wg ? f.cancel() : e(a)
            });
            return f.then(a, b, c)
        };
        xe(Vg);

        function bh(a) {
            return Ia(a.i, function(a) {
                return qa(a[1])
            })
        }

        function Zg(a) {
            if (a.u && a.a && bh(a)) {
                var b = a.u,
                    c = ch[b];
                c && (l.clearTimeout(c.a), delete ch[b]);
                a.u = 0
            }
            a.g && (a.g.B--, delete a.g);
            b = a.h;
            for (var d = c = !1; a.i.length && !a.w;) {
                var e = a.i.shift(),
                    f = e[0],
                    g = e[1];
                e = e[2];
                if (f = a.j ? g : f) try {
                    var h = f.call(e || a.J, b);
                    fa(h) && (a.j = a.j && (h ==
                        b || h instanceof Error), a.h = b = h);
                    if (ye(b) || "function" === typeof l.Promise && b instanceof l.Promise) d = !0, a.w = !0
                } catch (n) {
                    b = n, a.j = !0, bh(a) || (c = !0)
                }
            }
            a.h = b;
            d && (h = p(a.F, a, !0), d = p(a.F, a, !1), b instanceof Vg ? (ah(b, h, d), b.s = !0) : b.then(h, d));
            c && (b = new dh(b), ch[b.a] = b, a.u = b.a)
        }

        function $g() {
            za.call(this)
        }
        r($g, za);
        $g.prototype.message = "Deferred has already fired";
        $g.prototype.name = "AlreadyCalledError";

        function Wg() {
            za.call(this)
        }
        r(Wg, za);
        Wg.prototype.message = "Deferred was canceled";
        Wg.prototype.name = "CanceledError";

        function dh(a) {
            this.a = l.setTimeout(p(this.h, this), 0);
            this.g = a
        }
        dh.prototype.h = function() {
            delete ch[this.a];
            throw this.g;
        };
        var ch = {};

        function eh(a) {
            var b = {},
                c = b.document || document,
                d = Ib(a),
                e = document.createElement("SCRIPT"),
                f = {
                    fb: e,
                    gb: void 0
                },
                g = new Vg(fh, f),
                h = null,
                n = null != b.timeout ? b.timeout : 5E3;
            0 < n && (h = window.setTimeout(function() {
                gh(e, !0);
                var a = new hh(ih, "Timeout reached for loading script " + d);
                Xg(g);
                Yg(g, !1, a)
            }, n), f.gb = h);
            e.onload = e.onreadystatechange = function() {
                e.readyState && "loaded" != e.readyState &&
                    "complete" != e.readyState || (gh(e, b.bc || !1, h), Xg(g), Yg(g, !0, null))
            };
            e.onerror = function() {
                gh(e, !0, h);
                var a = new hh(jh, "Error while loading script " + d);
                Xg(g);
                Yg(g, !1, a)
            };
            f = b.attributes || {};
            ib(f, {
                type: "text/javascript",
                charset: "UTF-8"
            });
            dc(e, f);
            Vb(e, a);
            kh(c).appendChild(e);
            return g
        }

        function kh(a) {
            var b = (a || document).getElementsByTagName("HEAD");
            return b && 0 != b.length ? b[0] : a.documentElement
        }

        function fh() {
            if (this && this.fb) {
                var a = this.fb;
                a && "SCRIPT" == a.tagName && gh(a, !0, this.gb)
            }
        }

        function gh(a, b, c) {
            null != c &&
                l.clearTimeout(c);
            a.onload = ja;
            a.onerror = ja;
            a.onreadystatechange = ja;
            b && window.setTimeout(function() {
                gc(a)
            }, 0)
        }
        var jh = 0,
            ih = 1;

        function hh(a, b) {
            var c = "Jsloader error (code #" + a + ")";
            b && (c += ": " + b);
            za.call(this, c);
            this.code = a
        }
        r(hh, za);

        function lh(a) {
            this.a = a || l.googleyolo;
            this.g = null;
            this.h = !1
        }
        ka(lh);
        var mh = new Cb(Db, "https://smartlock.google.com/client");
        lh.prototype.cancel = function() {
            this.a && this.h && (this.g = this.a.cancelLastOperation().catch(function() {}))
        };

        function nh(a, b, c) {
            if (a.a && b) {
                var d = function() {
                    a.h = !0;
                    var d = Promise.resolve(null);
                    c || (d = a.a.retrieve(b).catch(function(a) {
                        if ("userCanceled" === a.type || "illegalConcurrentRequest" === a.type) throw a;
                        return null
                    }));
                    return d.then(function(c) {
                        return c ? c : a.a.hint(b)
                    }).catch(function(d) {
                        if ("userCanceled" === d.type) a.g = Promise.resolve();
                        else if ("illegalConcurrentRequest" === d.type) return a.cancel(), nh(a, b, c);
                        return null
                    })
                };
                return a.g ? a.g.then(d) : d()
            }
            if (b) return d = Ze(oh.Pa().load().then(function() {
                a.a = l.googleyolo;
                return nh(a, b, c)
            }), function() {
                return null
            }), Promise.resolve(d);
            if ("undefined" !== typeof Promise) return Promise.resolve(null);
            throw Error("One-Tap sign in not supported in the current browser!");
        }

        function oh() {
            this.a = null
        }
        ka(oh);
        oh.prototype.load = function() {
            var a = this;
            if (this.a) return this.a;
            var b = Jb(Fb(mh));
            return l.googleyolo ? B() : this.a = Xf().then(function() {
                if (!l.googleyolo) return new A(function(c, d) {
                    var e = setTimeout(function() {
                        a.a = null;
                        d(Error("Network error!"))
                    }, 1E4);
                    l.onGoogleYoloLoad = function() {
                        clearTimeout(e);
                        c()
                    };
                    Ze(B(eh(b)), function(b) {
                        clearTimeout(e);
                        a.a = null;
                        d(b)
                    })
                })
            })
        };

        function ph(a, b) {
            this.a = a;
            this.g = b || function(a) {
                throw a;
            }
        }
        ph.prototype.confirm = function(a) {
            return Ze(B(this.a.confirm(a)), this.g)
        };

        function qh(a, b, c, d) {
            this.a = a;
            this.h = b || null;
            this.j = c || null;
            this.g = d || null
        }
        qh.prototype.ja = function() {
            return {
                email: this.a,
                displayName: this.h,
                photoUrl: this.j,
                providerId: this.g
            }
        };

        function rh(a) {
            return a.email ? new qh(a.email, a.displayName, a.photoUrl, a.providerId) : null
        }

        function sh() {
            this.a = ("undefined" == typeof document ? null : document) || {
                cookie: ""
            }
        }
        k = sh.prototype;
        k.set = function(a, b, c, d, e, f) {
            if (/[;=\s]/.test(a)) throw Error('Invalid cookie name "' + a + '"');
            if (/[;\r\n]/.test(b)) throw Error('Invalid cookie value "' + b + '"');
            fa(c) || (c = -1);
            e = e ? ";domain=" + e : "";
            d = d ? ";path=" + d : "";
            f = f ? ";secure" : "";
            c = 0 > c ? "" : 0 == c ? ";expires=" + (new Date(1970, 1, 1)).toUTCString() : ";expires=" + (new Date(xa() + 1E3 * c)).toUTCString();
            this.a.cookie = a + "=" + b + e + d + c + f
        };
        k.get = function(a, b) {
            for (var c = a + "=", d = (this.a.cookie || "").split(";"), e = 0, f; e < d.length; e++) {
                f = Ta(d[e]);
                if (0 == f.lastIndexOf(c, 0)) return f.substr(c.length);
                if (f == a) return ""
            }
            return b
        };
        k.ga = function() {
            return th(this).keys
        };
        k.ha = function() {
            return th(this).values
        };
        k.clear = function() {
            for (var a = th(this).keys, b = a.length - 1; 0 <= b; b--) {
                var c = a[b];
                this.get(c);
                this.set(c, "", 0, void 0, void 0)
            }
        };

        function th(a) {
            a = (a.a.cookie || "").split(";");
            for (var b = [], c = [], d, e, f = 0; f < a.length; f++) e = Ta(a[f]), d = e.indexOf("="), -1 == d ? (b.push(""), c.push(e)) : (b.push(e.substring(0, d)), c.push(e.substring(d + 1)));
            return {
                keys: b,
                values: c
            }
        }
        var uh = new sh;
        uh.g = 3950;

        function vh() {}

        function wh(a, b,
            c, d) {
            this.h = "undefined" !== typeof a && null !== a ? a : -1;
            this.g = b || null;
            this.a = c || null;
            this.j = !!d
        }
        r(wh, vh);
        wh.prototype.set = function(a, b) {
            uh.set(a, b, this.h, this.g, this.a, this.j)
        };
        wh.prototype.get = function(a) {
            return uh.get(a) || null
        };
        wh.prototype.ma = function(a) {
            var b = this.g,
                c = this.a;
            uh.get(a);
            uh.set(a, "", 0, b, c)
        };

        function xh(a, b) {
            this.g = a;
            this.a = b || null
        }
        xh.prototype.ja = function() {
            return {
                email: this.g,
                credential: this.a && gb(this.a)
            }
        };

        function yh(a) {
            if (a && a.email) {
                var b;
                if (b = a.credential) {
                    var c = (b = a.credential) &&
                        b.providerId;
                    b = Ud[c] && firebase.auth[Ud[c]] ? b.secret && b.accessToken ? firebase.auth[Ud[c]].credential(b.accessToken, b.secret) : c == firebase.auth.GoogleAuthProvider.PROVIDER_ID ? firebase.auth[Ud[c]].credential(b.idToken, b.accessToken) : firebase.auth[Ud[c]].credential(b.accessToken) : null
                }
                return new xh(a.email, b)
            }
            return null
        }

        function zh(a) {
            for (var b = [], c = 0, d = 0; d < a.length; d++) {
                var e = a.charCodeAt(d);
                255 < e && (b[c++] = e & 255, e >>= 8);
                b[c++] = e
            }
            return b
        }

        function Ah(a) {
            return Ha(a, function(a) {
                a = a.toString(16);
                return 1 <
                    a.length ? a : "0" + a
            }).join("")
        }

        function Bh(a) {
            this.u = a;
            this.g = this.u.length / 4;
            this.j = this.g + 6;
            this.h = [
                [],
                [],
                [],
                []
            ];
            this.i = [
                [],
                [],
                [],
                []
            ];
            this.a = Array(Ch * (this.j + 1));
            for (a = 0; a < this.g; a++) this.a[a] = [this.u[4 * a], this.u[4 * a + 1], this.u[4 * a + 2], this.u[4 * a + 3]];
            var b = Array(4);
            for (a = this.g; a < Ch * (this.j + 1); a++) {
                b[0] = this.a[a - 1][0];
                b[1] = this.a[a - 1][1];
                b[2] = this.a[a - 1][2];
                b[3] = this.a[a - 1][3];
                if (0 == a % this.g) {
                    var c = b,
                        d = c[0];
                    c[0] = c[1];
                    c[1] = c[2];
                    c[2] = c[3];
                    c[3] = d;
                    Dh(b);
                    b[0] ^= Eh[a / this.g][0];
                    b[1] ^= Eh[a / this.g][1];
                    b[2] ^=
                        Eh[a / this.g][2];
                    b[3] ^= Eh[a / this.g][3]
                } else 6 < this.g && 4 == a % this.g && Dh(b);
                this.a[a] = Array(4);
                this.a[a][0] = this.a[a - this.g][0] ^ b[0];
                this.a[a][1] = this.a[a - this.g][1] ^ b[1];
                this.a[a][2] = this.a[a - this.g][2] ^ b[2];
                this.a[a][3] = this.a[a - this.g][3] ^ b[3]
            }
        }
        Bh.prototype.w = 16;
        var Ch = Bh.prototype.w / 4;

        function Fh(a, b) {
            for (var c, d = 0; d < Ch; d++)
                for (var e = 0; 4 > e; e++) c = 4 * e + d, c = b[c], a.h[d][e] = c
        }

        function Gh(a) {
            for (var b = [], c = 0; c < Ch; c++)
                for (var d = 0; 4 > d; d++) b[4 * d + c] = a.h[c][d];
            return b
        }

        function Hh(a, b) {
            for (var c = 0; 4 > c; c++)
                for (var d =
                        0; 4 > d; d++) a.h[c][d] ^= a.a[4 * b + d][c]
        }

        function Ih(a, b) {
            for (var c = 0; 4 > c; c++)
                for (var d = 0; 4 > d; d++) a.h[c][d] = b[a.h[c][d]]
        }

        function Jh(a) {
            for (var b = 1; 4 > b; b++)
                for (var c = 0; 4 > c; c++) a.i[b][c] = a.h[b][c];
            for (b = 1; 4 > b; b++)
                for (c = 0; 4 > c; c++) a.h[b][c] = a.i[b][(c + b) % Ch]
        }

        function Kh(a) {
            for (var b = 1; 4 > b; b++)
                for (var c = 0; 4 > c; c++) a.i[b][(c + b) % Ch] = a.h[b][c];
            for (b = 1; 4 > b; b++)
                for (c = 0; 4 > c; c++) a.h[b][c] = a.i[b][c]
        }

        function Dh(a) {
            a[0] = Lh[a[0]];
            a[1] = Lh[a[1]];
            a[2] = Lh[a[2]];
            a[3] = Lh[a[3]]
        }
        var Lh = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103,
                43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136,
                70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22
            ],
            Mh = [82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129, 243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68, 196, 222, 233, 203, 84, 123,
                148, 50, 166, 194, 35, 61, 238, 76, 149, 11, 66, 250, 195, 78, 8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162, 73, 109, 139, 209, 37, 114, 248, 246, 100, 134, 104, 152, 22, 212, 164, 92, 204, 93, 101, 182, 146, 108, 112, 72, 80, 253, 237, 185, 218, 94, 21, 70, 87, 167, 141, 157, 132, 144, 216, 171, 0, 140, 188, 211, 10, 247, 228, 88, 5, 184, 179, 69, 6, 208, 44, 30, 143, 202, 63, 15, 2, 193, 175, 189, 3, 1, 19, 138, 107, 58, 145, 17, 65, 79, 103, 220, 234, 151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116, 34, 231, 173, 53, 133, 226, 249, 55, 232, 28, 117, 223, 110, 71, 241, 26, 113, 29, 41, 197, 137, 111, 183, 98, 14, 170, 24,
                190, 27, 252, 86, 62, 75, 198, 210, 121, 32, 154, 219, 192, 254, 120, 205, 90, 244, 31, 221, 168, 51, 136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169, 25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59, 77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4, 126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125
            ],
            Eh = [
                [0, 0, 0, 0],
                [1, 0, 0, 0],
                [2, 0, 0, 0],
                [4, 0, 0, 0],
                [8, 0, 0, 0],
                [16, 0, 0, 0],
                [32, 0, 0, 0],
                [64, 0, 0, 0],
                [128, 0, 0, 0],
                [27, 0, 0, 0],
                [54, 0, 0, 0]
            ],
            Nh = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58,
                60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142, 144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 166, 168, 170, 172, 174, 176, 178, 180, 182, 184, 186, 188, 190, 192, 194, 196, 198, 200, 202, 204, 206, 208, 210, 212, 214, 216, 218, 220, 222, 224, 226, 228, 230, 232, 234, 236, 238, 240, 242, 244, 246, 248, 250, 252, 254, 27, 25, 31, 29, 19, 17, 23, 21, 11, 9, 15, 13, 3, 1, 7, 5, 59, 57, 63, 61, 51, 49, 55, 53, 43, 41, 47, 45, 35, 33, 39, 37, 91, 89, 95, 93, 83, 81, 87, 85, 75, 73, 79, 77, 67,
                65, 71, 69, 123, 121, 127, 125, 115, 113, 119, 117, 107, 105, 111, 109, 99, 97, 103, 101, 155, 153, 159, 157, 147, 145, 151, 149, 139, 137, 143, 141, 131, 129, 135, 133, 187, 185, 191, 189, 179, 177, 183, 181, 171, 169, 175, 173, 163, 161, 167, 165, 219, 217, 223, 221, 211, 209, 215, 213, 203, 201, 207, 205, 195, 193, 199, 197, 251, 249, 255, 253, 243, 241, 247, 245, 235, 233, 239, 237, 227, 225, 231, 229
            ],
            Oh = [0, 3, 6, 5, 12, 15, 10, 9, 24, 27, 30, 29, 20, 23, 18, 17, 48, 51, 54, 53, 60, 63, 58, 57, 40, 43, 46, 45, 36, 39, 34, 33, 96, 99, 102, 101, 108, 111, 106, 105, 120, 123, 126, 125, 116, 119, 114, 113, 80, 83, 86, 85, 92, 95,
                90, 89, 72, 75, 78, 77, 68, 71, 66, 65, 192, 195, 198, 197, 204, 207, 202, 201, 216, 219, 222, 221, 212, 215, 210, 209, 240, 243, 246, 245, 252, 255, 250, 249, 232, 235, 238, 237, 228, 231, 226, 225, 160, 163, 166, 165, 172, 175, 170, 169, 184, 187, 190, 189, 180, 183, 178, 177, 144, 147, 150, 149, 156, 159, 154, 153, 136, 139, 142, 141, 132, 135, 130, 129, 155, 152, 157, 158, 151, 148, 145, 146, 131, 128, 133, 134, 143, 140, 137, 138, 171, 168, 173, 174, 167, 164, 161, 162, 179, 176, 181, 182, 191, 188, 185, 186, 251, 248, 253, 254, 247, 244, 241, 242, 227, 224, 229, 230, 239, 236, 233, 234, 203, 200, 205, 206, 199, 196,
                193, 194, 211, 208, 213, 214, 223, 220, 217, 218, 91, 88, 93, 94, 87, 84, 81, 82, 67, 64, 69, 70, 79, 76, 73, 74, 107, 104, 109, 110, 103, 100, 97, 98, 115, 112, 117, 118, 127, 124, 121, 122, 59, 56, 61, 62, 55, 52, 49, 50, 35, 32, 37, 38, 47, 44, 41, 42, 11, 8, 13, 14, 7, 4, 1, 2, 19, 16, 21, 22, 31, 28, 25, 26
            ],
            Ph = [0, 9, 18, 27, 36, 45, 54, 63, 72, 65, 90, 83, 108, 101, 126, 119, 144, 153, 130, 139, 180, 189, 166, 175, 216, 209, 202, 195, 252, 245, 238, 231, 59, 50, 41, 32, 31, 22, 13, 4, 115, 122, 97, 104, 87, 94, 69, 76, 171, 162, 185, 176, 143, 134, 157, 148, 227, 234, 241, 248, 199, 206, 213, 220, 118, 127, 100, 109, 82, 91, 64, 73,
                62, 55, 44, 37, 26, 19, 8, 1, 230, 239, 244, 253, 194, 203, 208, 217, 174, 167, 188, 181, 138, 131, 152, 145, 77, 68, 95, 86, 105, 96, 123, 114, 5, 12, 23, 30, 33, 40, 51, 58, 221, 212, 207, 198, 249, 240, 235, 226, 149, 156, 135, 142, 177, 184, 163, 170, 236, 229, 254, 247, 200, 193, 218, 211, 164, 173, 182, 191, 128, 137, 146, 155, 124, 117, 110, 103, 88, 81, 74, 67, 52, 61, 38, 47, 16, 25, 2, 11, 215, 222, 197, 204, 243, 250, 225, 232, 159, 150, 141, 132, 187, 178, 169, 160, 71, 78, 85, 92, 99, 106, 113, 120, 15, 6, 29, 20, 43, 34, 57, 48, 154, 147, 136, 129, 190, 183, 172, 165, 210, 219, 192, 201, 246, 255, 228, 237, 10, 3, 24,
                17, 46, 39, 60, 53, 66, 75, 80, 89, 102, 111, 116, 125, 161, 168, 179, 186, 133, 140, 151, 158, 233, 224, 251, 242, 205, 196, 223, 214, 49, 56, 35, 42, 21, 28, 7, 14, 121, 112, 107, 98, 93, 84, 79, 70
            ],
            Qh = [0, 11, 22, 29, 44, 39, 58, 49, 88, 83, 78, 69, 116, 127, 98, 105, 176, 187, 166, 173, 156, 151, 138, 129, 232, 227, 254, 245, 196, 207, 210, 217, 123, 112, 109, 102, 87, 92, 65, 74, 35, 40, 53, 62, 15, 4, 25, 18, 203, 192, 221, 214, 231, 236, 241, 250, 147, 152, 133, 142, 191, 180, 169, 162, 246, 253, 224, 235, 218, 209, 204, 199, 174, 165, 184, 179, 130, 137, 148, 159, 70, 77, 80, 91, 106, 97, 124, 119, 30, 21, 8, 3, 50, 57, 36,
                47, 141, 134, 155, 144, 161, 170, 183, 188, 213, 222, 195, 200, 249, 242, 239, 228, 61, 54, 43, 32, 17, 26, 7, 12, 101, 110, 115, 120, 73, 66, 95, 84, 247, 252, 225, 234, 219, 208, 205, 198, 175, 164, 185, 178, 131, 136, 149, 158, 71, 76, 81, 90, 107, 96, 125, 118, 31, 20, 9, 2, 51, 56, 37, 46, 140, 135, 154, 145, 160, 171, 182, 189, 212, 223, 194, 201, 248, 243, 238, 229, 60, 55, 42, 33, 16, 27, 6, 13, 100, 111, 114, 121, 72, 67, 94, 85, 1, 10, 23, 28, 45, 38, 59, 48, 89, 82, 79, 68, 117, 126, 99, 104, 177, 186, 167, 172, 157, 150, 139, 128, 233, 226, 255, 244, 197, 206, 211, 216, 122, 113, 108, 103, 86, 93, 64, 75, 34, 41, 52, 63, 14,
                5, 24, 19, 202, 193, 220, 215, 230, 237, 240, 251, 146, 153, 132, 143, 190, 181, 168, 163
            ],
            Rh = [0, 13, 26, 23, 52, 57, 46, 35, 104, 101, 114, 127, 92, 81, 70, 75, 208, 221, 202, 199, 228, 233, 254, 243, 184, 181, 162, 175, 140, 129, 150, 155, 187, 182, 161, 172, 143, 130, 149, 152, 211, 222, 201, 196, 231, 234, 253, 240, 107, 102, 113, 124, 95, 82, 69, 72, 3, 14, 25, 20, 55, 58, 45, 32, 109, 96, 119, 122, 89, 84, 67, 78, 5, 8, 31, 18, 49, 60, 43, 38, 189, 176, 167, 170, 137, 132, 147, 158, 213, 216, 207, 194, 225, 236, 251, 246, 214, 219, 204, 193, 226, 239, 248, 245, 190, 179, 164, 169, 138, 135, 144, 157, 6, 11, 28, 17, 50, 63,
                40, 37, 110, 99, 116, 121, 90, 87, 64, 77, 218, 215, 192, 205, 238, 227, 244, 249, 178, 191, 168, 165, 134, 139, 156, 145, 10, 7, 16, 29, 62, 51, 36, 41, 98, 111, 120, 117, 86, 91, 76, 65, 97, 108, 123, 118, 85, 88, 79, 66, 9, 4, 19, 30, 61, 48, 39, 42, 177, 188, 171, 166, 133, 136, 159, 146, 217, 212, 195, 206, 237, 224, 247, 250, 183, 186, 173, 160, 131, 142, 153, 148, 223, 210, 197, 200, 235, 230, 241, 252, 103, 106, 125, 112, 83, 94, 73, 68, 15, 2, 21, 24, 59, 54, 33, 44, 12, 1, 22, 27, 56, 53, 34, 47, 100, 105, 126, 115, 80, 93, 74, 71, 220, 209, 198, 203, 232, 229, 242, 255, 180, 185, 174, 163, 128, 141, 154, 151
            ],
            Sh = [0, 14, 28,
                18, 56, 54, 36, 42, 112, 126, 108, 98, 72, 70, 84, 90, 224, 238, 252, 242, 216, 214, 196, 202, 144, 158, 140, 130, 168, 166, 180, 186, 219, 213, 199, 201, 227, 237, 255, 241, 171, 165, 183, 185, 147, 157, 143, 129, 59, 53, 39, 41, 3, 13, 31, 17, 75, 69, 87, 89, 115, 125, 111, 97, 173, 163, 177, 191, 149, 155, 137, 135, 221, 211, 193, 207, 229, 235, 249, 247, 77, 67, 81, 95, 117, 123, 105, 103, 61, 51, 33, 47, 5, 11, 25, 23, 118, 120, 106, 100, 78, 64, 82, 92, 6, 8, 26, 20, 62, 48, 34, 44, 150, 152, 138, 132, 174, 160, 178, 188, 230, 232, 250, 244, 222, 208, 194, 204, 65, 79, 93, 83, 121, 119, 101, 107, 49, 63, 45, 35, 9, 7, 21, 27, 161,
                175, 189, 179, 153, 151, 133, 139, 209, 223, 205, 195, 233, 231, 245, 251, 154, 148, 134, 136, 162, 172, 190, 176, 234, 228, 246, 248, 210, 220, 206, 192, 122, 116, 102, 104, 66, 76, 94, 80, 10, 4, 22, 24, 50, 60, 46, 32, 236, 226, 240, 254, 212, 218, 200, 198, 156, 146, 128, 142, 164, 170, 184, 182, 12, 2, 16, 30, 52, 58, 40, 38, 124, 114, 96, 110, 68, 74, 88, 86, 55, 57, 43, 37, 15, 1, 19, 29, 71, 73, 91, 85, 127, 113, 99, 109, 215, 217, 203, 197, 239, 225, 243, 253, 167, 169, 187, 181, 159, 145, 131, 141
            ];

        function Th(a, b) {
            a = new Bh(Uh(a));
            b = zh(b);
            for (var c = Ra(b, 0, 16), d = "", e; c.length;) {
                e = 16 - c.length;
                for (var f =
                        0; f < e; f++) c.push(0);
                e = a;
                Fh(e, c);
                Hh(e, 0);
                for (c = 1; c < e.j; ++c) {
                    Ih(e, Lh);
                    Jh(e);
                    f = e.h;
                    for (var g = e.i[0], h = 0; 4 > h; h++) g[0] = f[0][h], g[1] = f[1][h], g[2] = f[2][h], g[3] = f[3][h], f[0][h] = Nh[g[0]] ^ Oh[g[1]] ^ g[2] ^ g[3], f[1][h] = g[0] ^ Nh[g[1]] ^ Oh[g[2]] ^ g[3], f[2][h] = g[0] ^ g[1] ^ Nh[g[2]] ^ Oh[g[3]], f[3][h] = Oh[g[0]] ^ g[1] ^ g[2] ^ Nh[g[3]];
                    Hh(e, c)
                }
                Ih(e, Lh);
                Jh(e);
                Hh(e, e.j);
                d += Ah(Gh(e));
                c = Ra(b, 0, 16)
            }
            return d
        }

        function Vh(a, b) {
            a = new Bh(Uh(a));
            for (var c = [], d = 0; d < b.length; d += 2) c.push(parseInt(b.substring(d, d + 2), 16));
            var e = Ra(c, 0, 16);
            for (b =
                ""; e.length;) {
                d = a;
                Fh(d, e);
                Hh(d, d.j);
                for (e = 1; e < d.j; ++e) {
                    Kh(d);
                    Ih(d, Mh);
                    Hh(d, d.j - e);
                    for (var f = d.h, g = d.i[0], h = 0; 4 > h; h++) g[0] = f[0][h], g[1] = f[1][h], g[2] = f[2][h], g[3] = f[3][h], f[0][h] = Sh[g[0]] ^ Qh[g[1]] ^ Rh[g[2]] ^ Ph[g[3]], f[1][h] = Ph[g[0]] ^ Sh[g[1]] ^ Qh[g[2]] ^ Rh[g[3]], f[2][h] = Rh[g[0]] ^ Ph[g[1]] ^ Sh[g[2]] ^ Qh[g[3]], f[3][h] = Qh[g[0]] ^ Rh[g[1]] ^ Ph[g[2]] ^ Sh[g[3]]
                }
                Kh(d);
                Ih(d, Mh);
                Hh(d, 0);
                d = Gh(d);
                if (8192 >= d.length) d = String.fromCharCode.apply(null, d);
                else {
                    e = "";
                    for (f = 0; f < d.length; f += 8192) e += String.fromCharCode.apply(null,
                        Sa(d, f, f + 8192));
                    d = e
                }
                b += d;
                e = Ra(c, 0, 16)
            }
            return b.replace(/(\x00)+$/, "")
        }

        function Uh(a) {
            a = zh(a.substring(0, 32));
            for (var b = 32 - a.length, c = 0; c < b; c++) a.push(0);
            return a
        }

        function Wh(a) {
            var b = [];
            Xh(new Yh, a, b);
            return b.join("")
        }

        function Yh() {}

        function Xh(a, b, c) {
            if (null == b) c.push("null");
            else {
                if ("object" == typeof b) {
                    if (oa(b)) {
                        var d = b;
                        b = d.length;
                        c.push("[");
                        for (var e = "", f = 0; f < b; f++) c.push(e), Xh(a, d[f], c), e = ",";
                        c.push("]");
                        return
                    }
                    if (b instanceof String || b instanceof Number || b instanceof Boolean) b = b.valueOf();
                    else {
                        c.push("{");
                        e = "";
                        for (d in b) Object.prototype.hasOwnProperty.call(b, d) && (f = b[d], "function" != typeof f && (c.push(e), Zh(d, c), c.push(":"), Xh(a, f, c), e = ","));
                        c.push("}");
                        return
                    }
                }
                switch (typeof b) {
                    case "string":
                        Zh(b, c);
                        break;
                    case "number":
                        c.push(isFinite(b) && !isNaN(b) ? String(b) : "null");
                        break;
                    case "boolean":
                        c.push(String(b));
                        break;
                    case "function":
                        c.push("null");
                        break;
                    default:
                        throw Error("Unknown type: " + typeof b);
                }
            }
        }
        var $h = {
                '"': '\\"',
                "\\": "\\\\",
                "/": "\\/",
                "\b": "\\b",
                "\f": "\\f",
                "\n": "\\n",
                "\r": "\\r",
                "\t": "\\t",
                "\x0B": "\\u000b"
            },
            ai = /\uffff/.test("\uffff") ? /[\\"\x00-\x1f\x7f-\uffff]/g : /[\\"\x00-\x1f\x7f-\xff]/g;

        function Zh(a, b) {
            b.push('"', a.replace(ai, function(a) {
                var b = $h[a];
                b || (b = "\\u" + (a.charCodeAt(0) | 65536).toString(16).substr(1), $h[a] = b);
                return b
            }), '"')
        }

        function bi(a) {
            this.a = a
        }
        bi.prototype.set = function(a, b) {
            fa(b) ? this.a.set(a, Wh(b)) : this.a.ma(a)
        };
        bi.prototype.get = function(a) {
            try {
                var b = this.a.get(a)
            } catch (c) {
                return
            }
            if (null !== b) try {
                return JSON.parse(b)
            } catch (c$2) {
                throw "Storage: Invalid value was encountered";
            }
        };

        function ci() {}
        r(ci, vh);
        ci.prototype.clear = function() {
            var a = oc(this.da(!0)),
                b = this;
            Ea(a, function(a) {
                b.ma(a)
            })
        };

        function di(a) {
            this.a = a
        }
        r(di, ci);

        function ei(a) {
            if (!a.a) return !1;
            try {
                return a.a.setItem("__sak", "1"), a.a.removeItem("__sak"), !0
            } catch (b) {
                return !1
            }
        }
        k = di.prototype;
        k.set = function(a, b) {
            try {
                this.a.setItem(a, b)
            } catch (c) {
                if (0 == this.a.length) throw "Storage mechanism: Storage disabled";
                throw "Storage mechanism: Quota exceeded";
            }
        };
        k.get = function(a) {
            a = this.a.getItem(a);
            if (!m(a) && null !== a) throw "Storage mechanism: Invalid value was encountered";
            return a
        };
        k.ma = function(a) {
            this.a.removeItem(a)
        };
        k.da = function(a) {
            var b = 0,
                c = this.a,
                d = new lc;
            d.next = function() {
                if (b >= c.length) throw kc;
                var d = c.key(b++);
                if (a) return d;
                d = c.getItem(d);
                if (!m(d)) throw "Storage mechanism: Invalid value was encountered";
                return d
            };
            return d
        };
        k.clear = function() {
            this.a.clear()
        };
        k.key = function(a) {
            return this.a.key(a)
        };

        function fi() {
            var a = null;
            try {
                a = window.localStorage || null
            } catch (b) {}
            this.a = a
        }
        r(fi, di);

        function gi() {
            var a = null;
            try {
                a = window.sessionStorage || null
            } catch (b) {}
            this.a =
                a
        }
        r(gi, di);

        function hi(a, b) {
            this.g = a;
            this.a = b + "::"
        }
        r(hi, ci);
        hi.prototype.set = function(a, b) {
            this.g.set(this.a + a, b)
        };
        hi.prototype.get = function(a) {
            return this.g.get(this.a + a)
        };
        hi.prototype.ma = function(a) {
            this.g.ma(this.a + a)
        };
        hi.prototype.da = function(a) {
            var b = this.g.da(!0),
                c = this,
                d = new lc;
            d.next = function() {
                for (var d = b.next(); d.substr(0, c.a.length) != c.a;) d = b.next();
                return a ? d.substr(c.a.length) : c.g.get(d)
            };
            return d
        };
        var ii, ji = new fi;
        ii = ei(ji) ? new hi(ji, "firebaseui") : null;
        var ki = new bi(ii),
            li, mi = new gi;
        li = ei(mi) ? new hi(mi, "firebaseui") : null;
        var ni = new bi(li),
            oi = {
                name: "pendingEmailCredential",
                storage: ni
            },
            pi = {
                name: "pendingRedirect",
                storage: ni
            },
            qi = {
                name: "redirectUrl",
                storage: ni
            },
            ri = {
                name: "rememberAccount",
                storage: ni
            },
            si = {
                name: "rememberedAccounts",
                storage: ki
            },
            ti = {
                name: "emailForSignIn",
                storage: new bi(new wh(3600, "/"))
            },
            ui = {
                name: "pendingEncryptedCredential",
                storage: new bi(new wh(3600, "/"))
            };

        function vi(a, b) {
            return a.storage.get(b ? a.name + ":" + b : a.name)
        }

        function G(a, b) {
            a.storage.a.ma(b ? a.name + ":" + b : a.name)
        }

        function wi(a, b, c) {
            a.storage.set(c ? a.name + ":" + c : a.name, b)
        }

        function xi(a) {
            return vi(qi, a) || null
        }

        function yi(a, b) {
            wi(qi, a, b)
        }

        function zi(a, b) {
            wi(ri, a, b)
        }

        function Ai(a) {
            a = vi(si, a) || [];
            a = Ha(a, function(a) {
                return rh(a)
            });
            return Ga(a, ma)
        }

        function Bi(a, b) {
            var c = Ai(b),
                d = Ja(c, function(b) {
                    return b.a == a.a && (b.g || null) == (a.g || null)
                }); - 1 < d && Ma(c, d);
            c.unshift(a);
            wi(si, Ha(c, function(a) {
                return a.ja()
            }), b)
        }

        function Ci(a) {
            a = vi(oi, a) || null;
            return yh(a)
        }

        function Di(a, b) {
            wi(oi, a.ja(), b)
        }

        function Ei(a) {
            wi(pi, "pending",
                a)
        }

        function Fi(a, b) {
            b = vi(ti, b);
            var c = null;
            if (b) try {
                var d = Vh(a, b),
                    e = JSON.parse(d);
                c = e && e.email || null
            } catch (f) {}
            return c
        }

        function Gi(a, b) {
            b = vi(ui, b);
            var c = null;
            if (b) try {
                var d = Vh(a, b);
                c = JSON.parse(d)
            } catch (e) {}
            return yh(c || null)
        }

        function Hi(a, b, c) {
            wi(ui, Th(a, JSON.stringify(b.ja())), c)
        }
        var Ii = null;

        function Ji(a) {
            return !(!a || -32E3 != a.code || "Service unavailable" != a.message)
        }

        function Ki(a, b, c, d) {
            Ii || (a = {
                callbacks: {
                    empty: a,
                    select: function(a, d) {
                        a && a.account && b ? b(rh(a.account)) : c && c(!Ji(d))
                    },
                    store: a,
                    update: a
                },
                language: "en",
                providers: void 0,
                ui: d
            }, "undefined" != typeof accountchooser && accountchooser.Api && accountchooser.Api.init ? Ii = accountchooser.Api.init(a) : (Ii = new Li(a), Mi()))
        }

        function Ni(a, b, c) {
            function d() {
                var a = Oc(window.location.href, c).toString();
                Ii.select(Ha(b || [], function(a) {
                    return a.ja()
                }), {
                    clientCallbackUrl: a
                })
            }
            b && b.length ? d() : Ii.checkEmpty(function(b, c) {
                b || c ? a(!Ji(c)) : d()
            })
        }

        function Li(a) {
            this.a = a;
            this.a.callbacks = this.a.callbacks || {}
        }

        function Mi() {
            var a = Ii;
            qa(a.a.callbacks.empty) && a.a.callbacks.empty()
        }
        var Oi = {
            code: -32E3,
            message: "Service unavailable",
            data: "Service is unavailable."
        };
        k = Li.prototype;
        k.store = function() {
            qa(this.a.callbacks.store) && this.a.callbacks.store(void 0, Oi)
        };
        k.select = function() {
            qa(this.a.callbacks.select) && this.a.callbacks.select(void 0, Oi)
        };
        k.update = function() {
            qa(this.a.callbacks.update) && this.a.callbacks.update(void 0, Oi)
        };
        k.checkDisabled = function(a) {
            a(!0)
        };
        k.checkEmpty = function(a) {
            a(void 0, Oi)
        };
        k.checkAccountExist = function(a, b) {
            b(void 0, Oi)
        };
        k.checkShouldUpdate = function(a,
            b) {
            b(void 0, Oi)
        };
        var Pi, Qi, Ri, Si, H = {};

        function I(a, b, c, d) {
            H[a].apply(null, Array.prototype.slice.call(arguments, 1))
        }
        var Ti = /MSIE ([\d.]+).*Windows NT ([\d.]+)/,
            Ui = /Firefox\/([\d.]+)/,
            Vi = /Opera[ \/]([\d.]+)(.*Version\/([\d.]+))?/,
            Wi = /Chrome\/([\d.]+)/,
            Xi = /((Windows NT ([\d.]+))|(Mac OS X ([\d_]+))).*Version\/([\d.]+).*Safari/,
            Yi = /Mac OS X;.*(?!(Version)).*Safari/,
            Zi = /Android ([\d.]+).*Safari/,
            $i = /OS ([\d_]+) like Mac OS X.*Mobile.*Safari/,
            aj = /Konqueror\/([\d.]+)/,
            bj = /MSIE ([\d.]+).*Windows Phone OS ([\d.]+)/;

        function cj(a, b) {
            a = a.split(b || ".");
            this.a = [];
            for (b = 0; b < a.length; b++) this.a.push(parseInt(a[b], 10))
        }

        function dj(a, b) {
            b instanceof cj || (b = new cj(String(b)));
            for (var c = Math.max(a.a.length, b.a.length), d = 0; d < c; d++) {
                var e = a.a[d],
                    f = b.a[d];
                if (void 0 !== e && void 0 !== f && e !== f) return e - f;
                if (void 0 === e) return -1;
                if (void 0 === f) return 1
            }
            return 0
        }

        function ej(a, b) {
            return 0 <= dj(a, b)
        }

        function fj() {
            var a = window.navigator && window.navigator.userAgent;
            if (a) {
                var b;
                if (b = a.match(Vi)) {
                    var c = new cj(b[3] || b[1]);
                    return 0 <= a.indexOf("Opera Mini") ?
                        !1 : 0 <= a.indexOf("Opera Mobi") ? 0 <= a.indexOf("Android") && ej(c, "10.1") : ej(c, "8.0")
                }
                if (b = a.match(Ui)) return ej(new cj(b[1]), "2.0");
                if (b = a.match(Wi)) return ej(new cj(b[1]), "6.0");
                if (b = a.match(Xi)) return c = new cj(b[6]), a = b[3] && new cj(b[3]), b = b[5] && new cj(b[5], "_"), (!(!a || !ej(a, "6.0")) || !(!b || !ej(b, "10.5.6"))) && ej(c, "3.0");
                if (b = a.match(Zi)) return ej(new cj(b[1]), "3.0");
                if (b = a.match($i)) return ej(new cj(b[1], "_"), "4.0");
                if (b = a.match(aj)) return ej(new cj(b[1]), "4.7");
                if (b = a.match(bj)) return c = new cj(b[1]),
                    a = new cj(b[2]), ej(c, "7.0") && ej(a, "7.0");
                if (b = a.match(Ti)) return c = new cj(b[1]), a = new cj(b[2]), ej(c, "7.0") && ej(a, "6.0");
                if (a.match(Yi)) return !1
            }
            return !0
        }

        function gj(a) {
            if (a.classList) return a.classList;
            a = a.className;
            return m(a) && a.match(/\S+/g) || []
        }

        function hj(a, b) {
            return a.classList ? a.classList.contains(b) : Ka(gj(a), b)
        }

        function ij(a, b) {
            a.classList ? a.classList.add(b) : hj(a, b) || (a.className += 0 < a.className.length ? " " + b : b)
        }

        function jj(a, b) {
            a.classList ? a.classList.remove(b) : hj(a, b) && (a.className = Ga(gj(a),
                function(a) {
                    return a != b
                }).join(" "))
        }

        function J(a) {
            var b = a.type;
            switch (m(b) && b.toLowerCase()) {
                case "checkbox":
                case "radio":
                    return a.checked ? a.value : null;
                case "select-one":
                    return b = a.selectedIndex, 0 <= b ? a.options[b].value : null;
                case "select-multiple":
                    b = [];
                    for (var c, d = 0; c = a.options[d]; d++) c.selected && b.push(c.value);
                    return b.length ? b : null;
                default:
                    return null != a.value ? a.value : null
            }
        }

        function kj(a, b) {
            var c = a.type;
            switch (m(c) && c.toLowerCase()) {
                case "checkbox":
                case "radio":
                    a.checked = b;
                    break;
                case "select-one":
                    a.selectedIndex = -1;
                    if (m(b))
                        for (var d = 0; c = a.options[d]; d++)
                            if (c.value == b) {
                                c.selected = !0;
                                break
                            } break;
                case "select-multiple":
                    m(b) && (b = [b]);
                    for (d = 0; c = a.options[d]; d++)
                        if (c.selected = !1, b)
                            for (var e, f = 0; e = b[f]; f++) c.value == e && (c.selected = !0);
                    break;
                default:
                    a.value = null != b ? b : ""
            }
        }

        function lj(a) {
            if (a.altKey && !a.ctrlKey || a.metaKey || 112 <= a.keyCode && 123 >= a.keyCode) return !1;
            switch (a.keyCode) {
                case 18:
                case 20:
                case 93:
                case 17:
                case 40:
                case 35:
                case 27:
                case 36:
                case 45:
                case 37:
                case 224:
                case 91:
                case 144:
                case 12:
                case 34:
                case 33:
                case 19:
                case 255:
                case 44:
                case 39:
                case 145:
                case 16:
                case 38:
                case 252:
                case 224:
                case 92:
                    return !1;
                case 0:
                    return !qb;
                default:
                    return 166 > a.keyCode || 183 < a.keyCode
            }
        }

        function mj(a, b, c, d, e, f) {
            if (rb && !zb("525")) return !0;
            if (tb && e) return nj(a);
            if (e && !d) return !1;
            if (!qb) {
                "number" == typeof b && (b = oj(b));
                var g = 17 == b || 18 == b || tb && 91 == b;
                if ((!c || tb) && g || tb && 16 == b && (d || f)) return !1
            }
            if ((rb || ob) && d && c) switch (a) {
                case 220:
                case 219:
                case 221:
                case 192:
                case 186:
                case 189:
                case 187:
                case 188:
                case 190:
                case 191:
                case 192:
                case 222:
                    return !1
            }
            if (u && d && b == a) return !1;
            switch (a) {
                case 13:
                    return qb ? f || e ? !1 : !(c && d) : !0;
                case 27:
                    return !(rb || ob ||
                        qb)
            }
            return qb && (d || e || f) ? !1 : nj(a)
        }

        function nj(a) {
            if (48 <= a && 57 >= a || 96 <= a && 106 >= a || 65 <= a && 90 >= a || (rb || ob) && 0 == a) return !0;
            switch (a) {
                case 32:
                case 43:
                case 63:
                case 64:
                case 107:
                case 109:
                case 110:
                case 111:
                case 186:
                case 59:
                case 189:
                case 187:
                case 61:
                case 188:
                case 190:
                case 191:
                case 192:
                case 222:
                case 219:
                case 220:
                case 221:
                    return !0;
                default:
                    return !1
            }
        }

        function oj(a) {
            if (qb) a = pj(a);
            else if (tb && rb) switch (a) {
                case 93:
                    a = 91
            }
            return a
        }

        function pj(a) {
            switch (a) {
                case 61:
                    return 187;
                case 59:
                    return 186;
                case 173:
                    return 189;
                case 224:
                    return 91;
                case 0:
                    return 224;
                default:
                    return a
            }
        }

        function qj(a) {
            F.call(this);
            this.a = a;
            Ef(a, "keydown", this.g, !1, this);
            Ef(a, "click", this.h, !1, this)
        }
        r(qj, F);
        qj.prototype.g = function(a) {
            (13 == a.keyCode || rb && 3 == a.keyCode) && rj(this, a)
        };
        qj.prototype.h = function(a) {
            rj(this, a)
        };

        function rj(a, b) {
            var c = new sj(b);
            if (Ng(a, c)) {
                c = new tj(b);
                try {
                    Ng(a, c)
                } finally {
                    b.stopPropagation()
                }
            }
        }
        qj.prototype.l = function() {
            qj.o.l.call(this);
            Mf(this.a, "keydown", this.g, !1, this);
            Mf(this.a, "click", this.h, !1, this);
            delete this.a
        };

        function tj(a) {
            sf.call(this,
                a.a);
            this.type = "action"
        }
        r(tj, sf);

        function sj(a) {
            sf.call(this, a.a);
            this.type = "beforeaction"
        }
        r(sj, sf);

        function uj(a) {
            F.call(this);
            this.a = a;
            a = u ? "focusout" : "blur";
            this.g = Ef(this.a, u ? "focusin" : "focus", this, !u);
            this.h = Ef(this.a, a, this, !u)
        }
        r(uj, F);
        uj.prototype.handleEvent = function(a) {
            var b = new sf(a.a);
            b.type = "focusin" == a.type || "focus" == a.type ? "focusin" : "focusout";
            Ng(this, b)
        };
        uj.prototype.l = function() {
            uj.o.l.call(this);
            Nf(this.g);
            Nf(this.h);
            delete this.a
        };

        function vj(a, b) {
            F.call(this);
            this.g = a || 1;
            this.a =
                b || l;
            this.h = p(this.Lb, this);
            this.j = xa()
        }
        r(vj, F);
        k = vj.prototype;
        k.Ca = !1;
        k.W = null;
        k.Lb = function() {
            if (this.Ca) {
                var a = xa() - this.j;
                0 < a && a < .8 * this.g ? this.W = this.a.setTimeout(this.h, this.g - a) : (this.W && (this.a.clearTimeout(this.W), this.W = null), Ng(this, "tick"), this.Ca && (wj(this), this.start()))
            }
        };
        k.start = function() {
            this.Ca = !0;
            this.W || (this.W = this.a.setTimeout(this.h, this.g), this.j = xa())
        };

        function wj(a) {
            a.Ca = !1;
            a.W && (a.a.clearTimeout(a.W), a.W = null)
        }
        k.l = function() {
            vj.o.l.call(this);
            wj(this);
            delete this.a
        };

        function xj(a,
            b) {
            if (qa(a)) b && (a = p(a, b));
            else if (a && "function" == typeof a.handleEvent) a = p(a.handleEvent, a);
            else throw Error("Invalid listener argument");
            return 2147483647 < Number(0) ? -1 : l.setTimeout(a, 0)
        }

        function yj(a) {
            mf.call(this);
            this.g = a;
            this.a = {}
        }
        r(yj, mf);
        var zj = [];

        function Aj(a, b, c, d) {
            oa(c) || (c && (zj[0] = c.toString()), c = zj);
            for (var e = 0; e < c.length; e++) {
                var f = Ef(b, c[e], d || a.handleEvent, !1, a.g || a);
                if (!f) break;
                a.a[f.key] = f
            }
        }

        function Bj(a) {
            fb(a.a, function(a, c) {
                this.a.hasOwnProperty(c) && Nf(a)
            }, a);
            a.a = {}
        }
        yj.prototype.l =
            function() {
                yj.o.l.call(this);
                Bj(this)
            };
        yj.prototype.handleEvent = function() {
            throw Error("EventHandler.handleEvent not implemented");
        };

        function Cj(a) {
            F.call(this);
            this.a = null;
            this.g = a;
            a = u || ob || rb && !zb("531") && "TEXTAREA" == a.tagName;
            this.h = new yj(this);
            Aj(this.h, this.g, a ? ["keydown", "paste", "cut", "drop", "input"] : "input", this)
        }
        r(Cj, F);
        Cj.prototype.handleEvent = function(a) {
            if ("input" == a.type) u && zb(10) && 0 == a.keyCode && 0 == a.j || (Dj(this), Ng(this, Ej(a)));
            else if ("keydown" != a.type || lj(a)) {
                var b = "keydown" == a.type ?
                    this.g.value : null;
                u && 229 == a.keyCode && (b = null);
                var c = Ej(a);
                Dj(this);
                this.a = xj(function() {
                    this.a = null;
                    this.g.value != b && Ng(this, c)
                }, this)
            }
        };

        function Dj(a) {
            null != a.a && (l.clearTimeout(a.a), a.a = null)
        }

        function Ej(a) {
            a = new sf(a.a);
            a.type = "input";
            return a
        }
        Cj.prototype.l = function() {
            Cj.o.l.call(this);
            this.h.m();
            Dj(this);
            delete this.g
        };

        function Fj(a, b) {
            F.call(this);
            a && (this.Ga && Gj(this), this.la = a, this.Fa = Ef(this.la, "keypress", this, b), this.Qa = Ef(this.la, "keydown", this.sb, b, this), this.Ga = Ef(this.la, "keyup", this.vb,
                b, this))
        }
        r(Fj, F);
        k = Fj.prototype;
        k.la = null;
        k.Fa = null;
        k.Qa = null;
        k.Ga = null;
        k.R = -1;
        k.ba = -1;
        k.Ma = !1;
        var Hj = {
                3: 13,
                12: 144,
                63232: 38,
                63233: 40,
                63234: 37,
                63235: 39,
                63236: 112,
                63237: 113,
                63238: 114,
                63239: 115,
                63240: 116,
                63241: 117,
                63242: 118,
                63243: 119,
                63244: 120,
                63245: 121,
                63246: 122,
                63247: 123,
                63248: 44,
                63272: 46,
                63273: 36,
                63275: 35,
                63276: 33,
                63277: 34,
                63289: 144,
                63302: 45
            },
            Ij = {
                Up: 38,
                Down: 40,
                Left: 37,
                Right: 39,
                Enter: 13,
                F1: 112,
                F2: 113,
                F3: 114,
                F4: 115,
                F5: 116,
                F6: 117,
                F7: 118,
                F8: 119,
                F9: 120,
                F10: 121,
                F11: 122,
                F12: 123,
                "U+007F": 46,
                Home: 36,
                End: 35,
                PageUp: 33,
                PageDown: 34,
                Insert: 45
            },
            Jj = !rb || zb("525"),
            Kj = tb && qb;
        k = Fj.prototype;
        k.sb = function(a) {
            if (rb || ob)
                if (17 == this.R && !a.ctrlKey || 18 == this.R && !a.altKey || tb && 91 == this.R && !a.metaKey) this.ba = this.R = -1; - 1 == this.R && (a.ctrlKey && 17 != a.keyCode ? this.R = 17 : a.altKey && 18 != a.keyCode ? this.R = 18 : a.metaKey && 91 != a.keyCode && (this.R = 91));
            Jj && !mj(a.keyCode, this.R, a.shiftKey, a.ctrlKey, a.altKey, a.metaKey) ? this.handleEvent(a) : (this.ba = oj(a.keyCode), Kj && (this.Ma = a.altKey))
        };
        k.vb = function(a) {
            this.ba = this.R = -1;
            this.Ma = a.altKey
        };
        k.handleEvent = function(a) {
            var b = a.a,
                c = b.altKey;
            if (u && "keypress" == a.type) {
                var d = this.ba;
                var e = 13 != d && 27 != d ? b.keyCode : 0
            } else(rb || ob) && "keypress" == a.type ? (d = this.ba, e = 0 <= b.charCode && 63232 > b.charCode && nj(d) ? b.charCode : 0) : nb && !rb ? (d = this.ba, e = nj(d) ? b.keyCode : 0) : (d = b.keyCode || this.ba, e = b.charCode || 0, Kj && "keypress" == a.type && (c = this.Ma), tb && 63 == e && 224 == d && (d = 191));
            var f = d = oj(d);
            d ? 63232 <= d && d in Hj ? f = Hj[d] : 25 == d && a.shiftKey && (f = 9) : b.keyIdentifier && b.keyIdentifier in Ij && (f = Ij[b.keyIdentifier]);
            qb && Jj && "keypress" ==
                a.type && !mj(f, this.R, a.shiftKey, a.ctrlKey, c, a.metaKey) || (a = f == this.R, this.R = f, b = new Lj(f, e, a, b), b.altKey = c, Ng(this, b))
        };
        k.M = function() {
            return this.la
        };

        function Gj(a) {
            a.Fa && (Nf(a.Fa), Nf(a.Qa), Nf(a.Ga), a.Fa = null, a.Qa = null, a.Ga = null);
            a.la = null;
            a.R = -1;
            a.ba = -1
        }
        k.l = function() {
            Fj.o.l.call(this);
            Gj(this)
        };

        function Lj(a, b, c, d) {
            sf.call(this, d);
            this.type = "key";
            this.keyCode = a;
            this.j = b;
            this.repeat = c
        }
        r(Lj, sf);

        function Mj(a, b, c, d) {
            this.top = a;
            this.right = b;
            this.bottom = c;
            this.left = d
        }
        Mj.prototype.toString = function() {
            return "(" +
                this.top + "t, " + this.right + "r, " + this.bottom + "b, " + this.left + "l)"
        };
        Mj.prototype.ceil = function() {
            this.top = Math.ceil(this.top);
            this.right = Math.ceil(this.right);
            this.bottom = Math.ceil(this.bottom);
            this.left = Math.ceil(this.left);
            return this
        };
        Mj.prototype.floor = function() {
            this.top = Math.floor(this.top);
            this.right = Math.floor(this.right);
            this.bottom = Math.floor(this.bottom);
            this.left = Math.floor(this.left);
            return this
        };
        Mj.prototype.round = function() {
            this.top = Math.round(this.top);
            this.right = Math.round(this.right);
            this.bottom = Math.round(this.bottom);
            this.left = Math.round(this.left);
            return this
        };

        function Nj(a, b) {
            var c = $b(a);
            return c.defaultView && c.defaultView.getComputedStyle && (a = c.defaultView.getComputedStyle(a, null)) ? a[b] || a.getPropertyValue(b) || "" : ""
        }

        function Oj(a) {
            try {
                var b = a.getBoundingClientRect()
            } catch (c) {
                return {
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0
                }
            }
            u && a.ownerDocument.body && (a = a.ownerDocument, b.left -= a.documentElement.clientLeft + a.body.clientLeft, b.top -= a.documentElement.clientTop + a.body.clientTop);
            return b
        }

        function Pj(a, b) {
            b = b || fc(document);
            var c = b || fc(document);
            var d = Qj(a),
                e = Qj(c);
            if (!u || 9 <= Number(Ab)) {
                g = Nj(c, "borderLeftWidth");
                var f = Nj(c, "borderRightWidth");
                h = Nj(c, "borderTopWidth");
                n = Nj(c, "borderBottomWidth");
                f = new Mj(parseFloat(h), parseFloat(f), parseFloat(n), parseFloat(g))
            } else {
                var g = Rj(c, "borderLeft");
                f = Rj(c, "borderRight");
                var h = Rj(c, "borderTop"),
                    n = Rj(c, "borderBottom");
                f = new Mj(h, f, n, g)
            }
            c == fc(document) ? (g = d.a - c.scrollLeft, d = d.g - c.scrollTop, !u || 10 <= Number(Ab) || (g += f.left, d += f.top)) : (g = d.a - e.a - f.left,
                d = d.g - e.g - f.top);
            e = a.offsetWidth;
            f = a.offsetHeight;
            h = rb && !e && !f;
            fa(e) && !h || !a.getBoundingClientRect ? a = new Xb(e, f) : (a = Oj(a), a = new Xb(a.right - a.left, a.bottom - a.top));
            e = c.clientHeight - a.height;
            f = c.scrollLeft;
            h = c.scrollTop;
            f += Math.min(g, Math.max(g - (c.clientWidth - a.width), 0));
            h += Math.min(d, Math.max(d - e, 0));
            c = new Wb(f, h);
            b.scrollLeft = c.a;
            b.scrollTop = c.g
        }

        function Qj(a) {
            var b = $b(a),
                c = new Wb(0, 0);
            var d = b ? $b(b) : document;
            d = !u || 9 <= Number(Ab) || "CSS1Compat" == Yb(d).a.compatMode ? d.documentElement : d.body;
            if (a == d) return c;
            a = Oj(a);
            d = Yb(b).a;
            b = fc(d);
            d = d.parentWindow || d.defaultView;
            b = u && zb("10") && d.pageYOffset != b.scrollTop ? new Wb(b.scrollLeft, b.scrollTop) : new Wb(d.pageXOffset || b.scrollLeft, d.pageYOffset || b.scrollTop);
            c.a = a.left + b.a;
            c.g = a.top + b.g;
            return c
        }
        var Sj = {
            thin: 2,
            medium: 4,
            thick: 6
        };

        function Rj(a, b) {
            if ("none" == (a.currentStyle ? a.currentStyle[b + "Style"] : null)) return 0;
            var c = a.currentStyle ? a.currentStyle[b + "Width"] : null;
            if (c in Sj) a = Sj[c];
            else if (/^\d+px?$/.test(c)) a = parseInt(c, 10);
            else {
                b = a.style.left;
                var d = a.runtimeStyle.left;
                a.runtimeStyle.left = a.currentStyle.left;
                a.style.left = c;
                c = a.style.pixelLeft;
                a.style.left = b;
                a.runtimeStyle.left = d;
                a = +c
            }
            return a
        }

        function Tj() {}
        ka(Tj);
        Tj.prototype.a = 0;

        function Uj(a) {
            F.call(this);
            this.w = a || Yb();
            this.Va = null;
            this.ia = !1;
            this.j = null;
            this.F = void 0;
            this.va = this.xa = this.X = null
        }
        r(Uj, F);
        k = Uj.prototype;
        k.xb = Tj.Pa();
        k.M = function() {
            return this.j
        };

        function K(a, b) {
            return a.j ? cc(b, a.j || a.w.a) : null
        }

        function Vj(a) {
            a.F || (a.F = new yj(a));
            return a.F
        }
        k.Ra = function(a) {
            if (this.X && this.X != a) throw Error("Method not supported");
            Uj.o.Ra.call(this, a)
        };
        k.bb = function() {
            this.j = this.w.a.createElement("DIV")
        };
        k.render = function(a) {
            if (this.ia) throw Error("Component already rendered");
            this.j || this.bb();
            a ? a.insertBefore(this.j, null) : this.w.a.body.appendChild(this.j);
            this.X && !this.X.ia || this.v()
        };
        k.v = function() {
            this.ia = !0;
            Wj(this, function(a) {
                !a.ia && a.M() && a.v()
            })
        };
        k.sa = function() {
            Wj(this, function(a) {
                a.ia && a.sa()
            });
            this.F && Bj(this.F);
            this.ia = !1
        };
        k.l = function() {
            this.ia && this.sa();
            this.F && (this.F.m(), delete this.F);
            Wj(this, function(a) {
                a.m()
            });
            this.j && gc(this.j);
            this.X = this.j = this.va = this.xa = null;
            Uj.o.l.call(this)
        };

        function Wj(a, b) {
            a.xa && Ea(a.xa, b, void 0)
        }
        k.removeChild = function(a, b) {
            if (a) {
                var c = m(a) ? a : a.Va || (a.Va = ":" + (a.xb.a++).toString(36));
                this.va && c ? (a = this.va, a = (null !== a && c in a ? a[c] : void 0) || null) : a = null;
                if (c && a) {
                    var d = this.va;
                    c in d && delete d[c];
                    La(this.xa, a);
                    b && (a.sa(), a.j && gc(a.j));
                    b = a;
                    if (null == b) throw Error("Unable to set parent component");
                    b.X = null;
                    Uj.o.Ra.call(b, null)
                }
            }
            if (!a) throw Error("Child is not in parent component");
            return a
        };

        function L(a, b) {
            var c = ic(a, "firebaseui-textfield");
            b ? (jj(a, "firebaseui-input-invalid"), ij(a, "firebaseui-input"), c && jj(c, "firebaseui-textfield-invalid")) : (jj(a, "firebaseui-input"), ij(a, "firebaseui-input-invalid"), c && ij(c, "firebaseui-textfield-invalid"))
        }

        function Xj(a, b, c) {
            b = new Cj(b);
            pf(a, wa(qf, b));
            Aj(Vj(a), b, "input", c)
        }

        function Yj(a, b, c) {
            b = new Fj(b);
            pf(a, wa(qf, b));
            Aj(Vj(a), b, "key", function(a) {
                13 == a.keyCode && (a.stopPropagation(), a.preventDefault(), c(a))
            })
        }

        function Zj(a, b, c) {
            b = new uj(b);
            pf(a, wa(qf,
                b));
            Aj(Vj(a), b, "focusin", c)
        }

        function ak(a, b, c) {
            b = new uj(b);
            pf(a, wa(qf, b));
            Aj(Vj(a), b, "focusout", c)
        }

        function M(a, b, c) {
            b = new qj(b);
            pf(a, wa(qf, b));
            Aj(Vj(a), b, "action", function(a) {
                a.stopPropagation();
                a.preventDefault();
                c(a)
            })
        }

        function bk(a) {
            ij(a, "firebaseui-hidden")
        }

        function N(a, b) {
            b && hc(a, b);
            jj(a, "firebaseui-hidden")
        }

        function ck(a) {
            return !hj(a, "firebaseui-hidden") && "none" != a.style.display
        }

        function dk(a) {
            a = a || {};
            var b = a.email,
                c = a.disabled,
                d = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="email">';
            d = a.ac ? d + "Enter new email address" : d + "Email";
            d += '</label><input type="email" name="email" autocomplete="username" class="mdl-textfield__input firebaseui-input firebaseui-id-email" value="' + id(null != b ? b : "") + '"' + (c ? "disabled" : "") + '></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-email-error"></p></div>';
            return w(d)
        }

        function ek(a) {
            a = a || {};
            a = a.label;
            var b = '<button type="submit" class="firebaseui-id-submit firebaseui-button mdl-button mdl-js-button mdl-button--raised mdl-button--colored">';
            b = a ? b + v(a) : b + "Next";
            return w(b + "</button>")
        }

        function fk() {
            var a = "" + ek({
                label: z("Sign In")
            });
            return w(a)
        }

        function gk() {
            var a = "" + ek({
                label: z("Save")
            });
            return w(a)
        }

        function hk() {
            var a = "" + ek({
                label: z("Continue")
            });
            return w(a)
        }

        function ik(a) {
            a = a || {};
            a = a.label;
            var b = '<div class="firebaseui-new-password-component"><div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="newPassword">';
            b = a ? b + v(a) : b + "Choose password";
            return w(b + '</label><input type="password" name="newPassword" autocomplete="new-password" class="mdl-textfield__input firebaseui-input firebaseui-id-new-password"></div><a href="javascript:void(0)" class="firebaseui-input-floating-button firebaseui-id-password-toggle firebaseui-input-toggle-on firebaseui-input-toggle-blur"></a><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-new-password-error"></p></div></div>')
        }

        function jk() {
            var a = {};
            var b = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="password">';
            b = a.current ? b + "Current password" : b + "Password";
            return w(b + '</label><input type="password" name="password" autocomplete="current-password" class="mdl-textfield__input firebaseui-input firebaseui-id-password"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-password-error"></p></div>')
        }

        function kk() {
            return w('<a class="firebaseui-link firebaseui-id-secondary-link" href="javascript:void(0)">Trouble signing in?</a>')
        }

        function lk(a) {
            a = a || {};
            a = a.label;
            var b = '<button class="firebaseui-id-secondary-link firebaseui-button mdl-button mdl-js-button mdl-button--primary">';
            b = a ? b + v(a) : b + "Cancel";
            return w(b + "</button>")
        }

        function mk(a) {
            var b = "";
            a.H && a.G && (b += '<ul class="firebaseui-tos-list firebaseui-tos"><li class="firebaseui-inline-list-item"><a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a></li><li class="firebaseui-inline-list-item"><a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a></li></ul>');
            return w(b)
        }

        function nk(a) {
            var b = "";
            a.H && a.G && (b += '<p class="firebaseui-tos firebaseui-tospp-full-message">By continuing, you are indicating that you accept our <a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a> and <a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a>.</p>');
            return w(b)
        }

        function ok(a) {
            a = '<div class="firebaseui-info-bar firebaseui-id-info-bar"><p class="firebaseui-info-bar-message">' +
                v(a.message) + '&nbsp;&nbsp;<a href="javascript:void(0)" class="firebaseui-link firebaseui-id-dismiss-info-bar">Dismiss</a></p></div>';
            return w(a)
        }
        ok.a = "firebaseui.auth.soy2.element.infoBar";

        function pk(a) {
            var b = a.content;
            a = a.lb;
            return w('<dialog class="mdl-dialog firebaseui-dialog firebaseui-id-dialog' + (a ? " " + id(a) : "") + '">' + v(b) + "</dialog>")
        }

        function qk(a) {
            var b = a.message;
            return w(pk({
                content: hd('<div class="firebaseui-dialog-icon-wrapper"><div class="' + id(a.Ea) + ' firebaseui-dialog-icon"></div></div><div class="firebaseui-progress-dialog-message">' +
                    v(b) + "</div>")
            }))
        }
        qk.a = "firebaseui.auth.soy2.element.progressDialog";

        function rk(a) {
            var b = '<div class="firebaseui-list-box-actions">';
            a = a.items;
            for (var c = a.length, d = 0; d < c; d++) {
                var e = a[d];
                b += '<button type="button" data-listboxid="' + id(e.id) + '" class="mdl-button firebaseui-id-list-box-dialog-button firebaseui-list-box-dialog-button">' + (e.Ea ? '<div class="firebaseui-list-box-icon-wrapper"><div class="firebaseui-list-box-icon ' + id(e.Ea) + '"></div></div>' : "") + '<div class="firebaseui-list-box-label-wrapper">' +
                    v(e.label) + "</div></button>"
            }
            b = "" + pk({
                lb: z("firebaseui-list-box-dialog"),
                content: hd(b + "</div>")
            });
            return w(b)
        }
        rk.a = "firebaseui.auth.soy2.element.listBoxDialog";

        function sk(a) {
            a = a || {};
            return w(a.Nb ? '<div class="mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>' : '<div class="mdl-progress mdl-js-progress mdl-progress__indeterminate firebaseui-busy-indicator firebaseui-id-busy-indicator"></div>')
        }
        sk.a = "firebaseui.auth.soy2.element.busyIndicator";

        function tk(a) {
            a = a || {};
            var b = "";
            switch (a.providerId) {
                case "google.com":
                    b += "Google";
                    break;
                case "github.com":
                    b += "GitHub";
                    break;
                case "facebook.com":
                    b += "Facebook";
                    break;
                case "twitter.com":
                    b += "Twitter";
                    break;
                case "anonymous":
                    b += "Guest";
                    break;
                default:
                    b += "Password"
            }
            return x(b)
        }

        function uk(a) {
            vk(a, "upgradeElement")
        }

        function wk(a) {
            vk(a, "downgradeElements")
        }
        var xk = ["mdl-js-textfield", "mdl-js-progress", "mdl-js-spinner", "mdl-js-button"];

        function vk(a, b) {
            a && window.componentHandler && window.componentHandler[b] &&
                Ea(xk, function(c) {
                    if (hj(a, c)) window.componentHandler[b](a);
                    Ea(ac(c, a), function(a) {
                        window.componentHandler[b](a)
                    })
                })
        }

        function yk(a, b, c) {
            zk.call(this);
            document.body.appendChild(a);
            a.showModal || window.dialogPolyfill.registerDialog(a);
            a.showModal();
            uk(a);
            b && M(this, a, function(b) {
                var c = a.getBoundingClientRect();
                (b.clientX < c.left || c.left + c.width < b.clientX || b.clientY < c.top || c.top + c.height < b.clientY) && zk.call(this)
            });
            if (!c) {
                var d = this.M().parentElement || this.M().parentNode;
                if (d) {
                    var e = this;
                    this.$ = function() {
                        if (a.open) {
                            var b =
                                a.getBoundingClientRect().height,
                                c = d.getBoundingClientRect().height,
                                h = d.getBoundingClientRect().top - document.body.getBoundingClientRect().top,
                                n = d.getBoundingClientRect().left - document.body.getBoundingClientRect().left,
                                y = a.getBoundingClientRect().width,
                                na = d.getBoundingClientRect().width;
                            a.style.top = (h + (c - b) / 2).toString() + "px";
                            b = n + (na - y) / 2;
                            a.style.left = b.toString() + "px";
                            a.style.right = (document.body.getBoundingClientRect().width - b - y).toString() + "px"
                        } else window.removeEventListener("resize", e.$)
                    };
                    this.$();
                    window.addEventListener("resize", this.$, !1)
                }
            }
        }

        function zk() {
            var a = Ak.call(this);
            a && (wk(a), a.open && a.close(), gc(a), this.$ && window.removeEventListener("resize", this.$))
        }

        function Ak() {
            return cc("firebaseui-id-dialog")
        }

        function Bk() {
            gc(Ck.call(this))
        }

        function Ck() {
            return K(this, "firebaseui-id-info-bar")
        }

        function Dk() {
            return K(this, "firebaseui-id-dismiss-info-bar")
        }
        var Ek = {
            tb: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
            rb: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg",
            ob: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg",
            Mb: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg",
            yb: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/mail.svg",
            Ab: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/phone.svg",
            jb: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/anonymous.png"
        };

        function Fk(a, b, c) {
            rf.call(this, a, b);
            for (var d in c) this[d] = c[d]
        }
        r(Fk, rf);

        function O(a, b, c, d, e) {
            Uj.call(this, c);
            this.Ya = a;
            this.Xa = b;
            this.ya = !1;
            this.Wa = d || null;
            this.u = this.ca = null;
            this.Y = gb(Ek);
            ib(this.Y, e || {})
        }
        r(O, Uj);
        k = O.prototype;
        k.bb = function() {
            var a = Yc(this.Ya, this.Xa, this.Y, this.w);
            uk(a);
            this.j = a
        };
        k.v = function() {
            O.o.v.call(this);
            Rg(P(this), new Fk("pageEnter", P(this), {
                pageId: this.Wa
            }));
            if (this.Ua() && this.Y.H) {
                var a = this.Y.H;
                M(this, this.Ua(), function() {
                    a()
                })
            }
            if (this.Sa() && this.Y.G) {
                var b = this.Y.G;
                M(this, this.Sa(), function() {
                    b()
                })
            }
        };
        k.sa = function() {
            Rg(P(this), new Fk("pageExit", P(this), {
                pageId: this.Wa
            }));
            O.o.sa.call(this)
        };
        k.l = function() {
            window.clearTimeout(this.ca);
            this.Xa = this.Ya = this.ca = null;
            this.ya = !1;
            this.u = null;
            wk(this.M());
            O.o.l.call(this)
        };

        function Gk(a) {
            a.ya = !0;
            var b = hj(a.M(), "firebaseui-use-spinner");
            a.ca = window.setTimeout(function() {
                a.M() && null === a.u && (a.u = Yc(sk, {
                    Nb: b
                }, null, a.w), a.M().appendChild(a.u), uk(a.u))
            }, 500)
        }
        k.L = function(a, b, c, d) {
            function e() {
                if (f.N) return null;
                f.ya = !1;
                window.clearTimeout(f.ca);
                f.ca = null;
                f.u && (wk(f.u), gc(f.u), f.u = null)
            }
            var f = this;
            if (f.ya) return null;
            Gk(f);
            return a.apply(null, b).then(c, d).then(e, e)
        };

        function P(a) {
            return a.M().parentElement ||
                a.M().parentNode
        }

        function Hk(a, b, c) {
            Yj(a, b, function() {
                c.focus()
            })
        }

        function Ik(a, b, c) {
            Yj(a, b, function() {
                c()
            })
        }
        q(O.prototype, {
            g: function(a) {
                Bk.call(this);
                var b = Yc(ok, {
                    message: a
                }, null, this.w);
                this.M().appendChild(b);
                M(this, Dk.call(this), function() {
                    gc(b)
                })
            },
            cc: Bk,
            fc: Ck,
            ec: Dk,
            V: function(a, b) {
                a = Yc(qk, {
                    Ea: a,
                    message: b
                }, null, this.w);
                yk.call(this, a)
            },
            h: zk,
            kb: Ak,
            hc: function() {
                return K(this, "firebaseui-tos")
            },
            Ua: function() {
                return K(this, "firebaseui-tos-link")
            },
            Sa: function() {
                return K(this, "firebaseui-pp-link")
            },
            ic: function() {
                return K(this, "firebaseui-tos-list")
            }
        });

        function Jk(a, b, c) {
            a = a || {};
            b = a.Na;
            var d = a.fa;
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-sign-in"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in with email</h1></div><div class="firebaseui-card-content"><div class="firebaseui-relative-wrapper">' + dk(a) + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? lk(null) : "") +
                ek(null) + '</div></div><div class="firebaseui-card-footer">' + (d ? nk(c) : mk(c)) + "</div></form></div>";
            return w(a)
        }
        Jk.a = "firebaseui.auth.soy2.page.signIn";

        function Kk(a, b, c) {
            a = a || {};
            b = a.fa;
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-sign-in"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content">' + dk(a) + jk() + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' +
                kk() + '</div><div class="firebaseui-form-actions">' + fk() + '</div></div><div class="firebaseui-card-footer">' + (b ? nk(c) : mk(c)) + "</div></form></div>";
            return w(a)
        }
        Kk.a = "firebaseui.auth.soy2.page.passwordSignIn";

        function Lk(a, b, c) {
            a = a || {};
            var d = a.Cb;
            b = a.La;
            var e = a.fa,
                f = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-sign-up"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Create account</h1></div><div class="firebaseui-card-content">' +
                dk(a);
            d ? (a = a || {}, a = a.name, a = '<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="name">First &amp; last name</label><input type="text" name="name" autocomplete="name" class="mdl-textfield__input firebaseui-input firebaseui-id-name" value="' + id(null != a ? a : "") + '"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-name-error"></p></div>',
                a = w(a)) : a = "";
            c = f + a + ik(null) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? lk(null) : "") + gk() + '</div></div><div class="firebaseui-card-footer">' + (e ? nk(c) : mk(c)) + "</div></form></div>";
            return w(c)
        }
        Lk.a = "firebaseui.auth.soy2.page.passwordSignUp";

        function Mk(a, b, c) {
            a = a || {};
            b = a.La;
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Recover password</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Get instructions sent to this email that explain how to reset your password</p>' +
                dk(a) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (b ? lk(null) : "") + ek({
                    label: z("Send")
                }) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(a)
        }
        Mk.a = "firebaseui.auth.soy2.page.passwordRecovery";

        function Nk(a, b, c) {
            b = a.S;
            var d = "";
            a = "Follow the instructions sent to <strong>" + (v(a.email) + "</strong> to recover your password");
            d += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-recovery-email-sent"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Check your email</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
                a + '</p></div><div class="firebaseui-card-actions">';
            b && (d += '<div class="firebaseui-form-actions">' + ek({
                label: z("Done")
            }) + "</div>");
            d += '</div><div class="firebaseui-card-footer">' + mk(c) + "</div></div>";
            return w(d)
        }
        Nk.a = "firebaseui.auth.soy2.page.passwordRecoveryEmailSent";

        function Ok(a, b, c) {
            return w('<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-callback"><div class="firebaseui-callback-indicator-container">' + sk(null, null, c) + "</div></div>")
        }
        Ok.a = "firebaseui.auth.soy2.page.callback";

        function Pk() {
            return w('<div class="firebaseui-container firebaseui-id-page-blank firebaseui-use-spinner"></div>')
        }
        Pk.a = "firebaseui.auth.soy2.page.blank";

        function Rk(a, b, c) {
            b = "";
            a = "A sign-in email with additional instructions was sent to <strong>" + (v(a.email) + "</strong>. Check your email to complete sign-in.");
            var d = w('<a class="firebaseui-link firebaseui-id-trouble-getting-email-link" href="javascript:void(0)">Trouble getting email?</a>');
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-sent"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign-in email sent</h1></div><div class="firebaseui-card-content"><div class="firebaseui-email-sent"></div><p class="firebaseui-text">' +
                a + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' + d + '</div><div class="firebaseui-form-actions">' + lk({
                    label: z("Back")
                }) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(b)
        }
        Rk.a = "firebaseui.auth.soy2.page.emailLinkSignInSent";

        function Sk(a, b, c) {
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-not-received"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Trouble getting email?</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Try these common fixes:<ul><li>Check if the email was marked as spam or filtered.</li><li>Check your internet connection.</li><li>Check that you did not misspell your email.</li><li>Check that your inbox space is not running out or other inbox settings related issues.</li></ul></p><p class="firebaseui-text">If the steps above didn\'t work, you can resend the email. Note that this will deactivate the link in the older email.</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' +
                w('<a class="firebaseui-link firebaseui-id-resend-email-link" href="javascript:void(0)">Resend</a>') + '</div><div class="firebaseui-form-actions">' + lk({
                    label: z("Back")
                }) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(a)
        }
        Sk.a = "firebaseui.auth.soy2.page.emailNotReceived";

        function Tk(a, b, c) {
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-confirmation"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Confirm email</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Confirm your email to complete sign in</p><div class="firebaseui-relative-wrapper">' +
                dk(a) + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + lk(null) + ek(null) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(a)
        }
        Tk.a = "firebaseui.auth.soy2.page.emailLinkSignInConfirmation";

        function Uk() {
            var a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-different-device-error"><div class="firebaseui-card-header"><h1 class="firebaseui-title">New device or browser detected</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Try opening the link using the same device or browser where you started the sign-in process.</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
                lk({
                    label: z("Dismiss")
                }) + "</div></div></div>";
            return w(a)
        }
        Uk.a = "firebaseui.auth.soy2.page.differentDeviceError";

        function Vk() {
            var a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-anonymous-user-mismatch"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Session ended</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">The session associated with this sign-in request has either expired or was cleared.</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
                lk({
                    label: z("Dismiss")
                }) + "</div></div></div>";
            return w(a)
        }
        Vk.a = "firebaseui.auth.soy2.page.anonymousUserMismatch";

        function Wk(a, b, c) {
            b = "";
            a = "You\u2019ve already used <strong>" + (v(a.email) + "</strong> to sign in. Enter your password for that account.");
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text">' +
                a + "</p>" + jk() + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-links">' + kk() + '</div><div class="firebaseui-form-actions">' + fk() + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(b)
        }
        Wk.a = "firebaseui.auth.soy2.page.passwordLinking";

        function Xk(a, b, c) {
            var d = a.email;
            b = "";
            a = "" + tk(a);
            a = z(a);
            d = "You\u2019ve already used <strong>" + (v(d) + ("</strong>. You can connect your <strong>" + (v(a) + ("</strong> account with <strong>" + (v(d) + "</strong> by signing in with email link below.")))));
            a = "For this flow to successfully connect your " + (v(a) + " account with this email, you have to open the link on the same device or browser.");
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text firebaseui-text-justify">' +
                d + '<p class="firebaseui-text firebaseui-text-justify">' + a + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + fk() + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(b)
        }
        Xk.a = "firebaseui.auth.soy2.page.emailLinkSignInLinking";

        function Yk(a, b, c) {
            b = "";
            var d = "" + tk(a);
            d = z(d);
            a = "You originally intended to connect <strong>" + (v(d) + "</strong> to your email account but have opened the link on a different device where you are not signed in.");
            d = "If you still want to connect your <strong>" + (v(d) + "</strong> account, open the link on the same device where you started sign-in. Otherwise, tap Continue to sign-in on this device.");
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-link-sign-in-linking-different-device"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text firebaseui-text-justify">' +
                a + '</p><p class="firebaseui-text firebaseui-text-justify">' + d + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + hk() + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(b)
        }
        Yk.a = "firebaseui.auth.soy2.page.emailLinkSignInLinkingDifferentDevice";

        function Zk(a, b, c) {
            var d = a.email;
            b = "";
            a = "" + tk(a);
            a = z(a);
            d = "You\u2019ve already used <strong>" + (v(d) + ("</strong>. Sign in with " + (v(a) + " to continue.")));
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-federated-linking"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">You already have an account</h2><p class="firebaseui-text">' +
                d + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + ek({
                    label: z("Sign in with " + a)
                }) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(b)
        }
        Zk.a = "firebaseui.auth.soy2.page.federatedLinking";

        function $k(a) {
            var b = "",
                c = '<p class="firebaseui-text">for <strong>' + (v(a.email) + "</strong></p>");
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Reset your password</h1></div><div class="firebaseui-card-content">' +
                c + ik(gd(a)) + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + gk() + "</div></div></form></div>";
            return w(b)
        }
        $k.a = "firebaseui.auth.soy2.page.passwordReset";

        function al(a) {
            a = a || {};
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Password changed</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new password</p></div><div class="firebaseui-card-actions">' +
                (a.S ? '<div class="firebaseui-form-actions">' + hk() + "</div>" : "") + "</div></div>";
            return w(a)
        }
        al.a = "firebaseui.auth.soy2.page.passwordResetSuccess";

        function bl(a) {
            a = a || {};
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-password-reset-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try resetting your password again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to reset your password has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' +
                (a.S ? '<div class="firebaseui-form-actions">' + ek(null) + "</div>" : "") + "</div></div>";
            return w(a)
        }
        bl.a = "firebaseui.auth.soy2.page.passwordResetFailure";

        function cl(a) {
            var b = a.S,
                c = "";
            a = "Your sign-in email address has been changed back to <strong>" + (v(a.email) + "</strong>.");
            c += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-success"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Updated email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' +
                a + '</p><p class="firebaseui-text">If you didn\u2019t ask to change your sign-in email, it\u2019s possible someone is trying to access your account and you should <a class="firebaseui-link firebaseui-id-reset-password-link" href="javascript:void(0)">change your password right away</a>.</p></div><div class="firebaseui-card-actions">' + (b ? '<div class="firebaseui-form-actions">' + ek(null) + "</div>" : "") + "</div></form></div>";
            return w(c)
        }
        cl.a = "firebaseui.auth.soy2.page.emailChangeRevokeSuccess";

        function dl(a) {
            a =
                a || {};
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-change-revoke-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Unable to update your email address</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">There was a problem changing your sign-in email back.</p><p class="firebaseui-text">If you try again and still can\u2019t reset your email, try asking your administrator for help.</p></div><div class="firebaseui-card-actions">' +
                (a.S ? '<div class="firebaseui-form-actions">' + ek(null) + "</div>" : "") + "</div></div>";
            return w(a)
        }
        dl.a = "firebaseui.auth.soy2.page.emailChangeRevokeFailure";

        function el(a) {
            a = a || {};
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-success"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Your email has been verified</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">You can now sign in with your new account</p></div><div class="firebaseui-card-actions">' +
                (a.S ? '<div class="firebaseui-form-actions">' + hk() + "</div>" : "") + "</div></div>";
            return w(a)
        }
        el.a = "firebaseui.auth.soy2.page.emailVerificationSuccess";

        function fl(a) {
            a = a || {};
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-verification-failure"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Try verifying your email again</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">Your request to verify your email has expired or the link has already been used</p></div><div class="firebaseui-card-actions">' +
                (a.S ? '<div class="firebaseui-form-actions">' + ek(null) + "</div>" : "") + "</div></div>";
            return w(a)
        }
        fl.a = "firebaseui.auth.soy2.page.emailVerificationFailure";

        function gl(a) {
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-unrecoverable-error"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Error encountered</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' + v(a.errorMessage) + "</p></div></div>";
            return w(a)
        }
        gl.a = "firebaseui.auth.soy2.page.unrecoverableError";

        function hl(a, b, c) {
            var d = a.zb;
            b = "";
            a = "Continue with " + (v(a.Ob) + "?");
            d = "You originally wanted to sign in with " + v(d);
            b += '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-email-mismatch"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Sign in</h1></div><div class="firebaseui-card-content"><h2 class="firebaseui-subtitle">' + a + '</h2><p class="firebaseui-text">' + d + '</p></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' +
                lk(null) + ek({
                    label: z("Continue")
                }) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form></div>";
            return w(b)
        }
        hl.a = "firebaseui.auth.soy2.page.emailMismatch";

        function il(a, b, c) {
            var d = '<div class="firebaseui-container firebaseui-page-provider-sign-in firebaseui-id-page-provider-sign-in firebaseui-use-spinner"><div class="firebaseui-card-content"><form onsubmit="return false;"><ul class="firebaseui-idp-list">';
            a = a.Bb;
            b = a.length;
            for (var e = 0; e < b; e++) {
                var f = {
                    providerId: a[e]
                };
                var g = c,
                    h = f.providerId,
                    n = f;
                n = n || {};
                var y = "";
                switch (n.providerId) {
                    case "google.com":
                        y += "firebaseui-idp-google";
                        break;
                    case "github.com":
                        y += "firebaseui-idp-github";
                        break;
                    case "facebook.com":
                        y += "firebaseui-idp-facebook";
                        break;
                    case "twitter.com":
                        y += "firebaseui-idp-twitter";
                        break;
                    case "phone":
                        y += "firebaseui-idp-phone";
                        break;
                    case "anonymous":
                        y += "firebaseui-idp-anonymous";
                        break;
                    default:
                        y += "firebaseui-idp-password"
                }
                n = '<button class="firebaseui-idp-button mdl-button mdl-js-button mdl-button--raised ' + id(x(y)) + ' firebaseui-id-idp-button" data-provider-id="' +
                    id(h) + '"><span class="firebaseui-idp-icon-wrapper"><img class="firebaseui-idp-icon" alt="" src="';
                y = (y = f) || {};
                var na = "";
                switch (y.providerId) {
                    case "google.com":
                        na += nd(g.tb);
                        break;
                    case "github.com":
                        na += nd(g.rb);
                        break;
                    case "facebook.com":
                        na += nd(g.ob);
                        break;
                    case "twitter.com":
                        na += nd(g.Mb);
                        break;
                    case "phone":
                        na += nd(g.Ab);
                        break;
                    case "anonymous":
                        na += nd(g.jb);
                        break;
                    default:
                        na += nd(g.yb)
                }
                g = fd(na);
                n = n + id(nd(g)) + '"></span>';
                "password" == h ? n += '<span class="firebaseui-idp-text firebaseui-idp-text-long">Sign in with email</span><span class="firebaseui-idp-text firebaseui-idp-text-short">Email</span>' :
                    "phone" == h ? n += '<span class="firebaseui-idp-text firebaseui-idp-text-long">Sign in with phone</span><span class="firebaseui-idp-text firebaseui-idp-text-short">Phone</span>' : "anonymous" == h ? n += '<span class="firebaseui-idp-text firebaseui-idp-text-long">Continue as guest</span><span class="firebaseui-idp-text firebaseui-idp-text-short">Guest</span>' : (h = "Sign in with " + v(tk(f)), n += '<span class="firebaseui-idp-text firebaseui-idp-text-long">' + h + '</span><span class="firebaseui-idp-text firebaseui-idp-text-short">' +
                        v(tk(f)) + "</span>");
                f = w(n + "</button>");
                d += '<li class="firebaseui-list-item">' + f + "</li>"
            }
            d += '</ul></form></div><div class="firebaseui-card-footer firebaseui-provider-sign-in-footer">' + nk(c) + "</div></div>";
            return w(d)
        }
        il.a = "firebaseui.auth.soy2.page.providerSignIn";

        function jl(a, b, c) {
            a = a || {};
            var d = a.nb,
                e = a.Na;
            b = a.fa;
            a = a || {};
            a = a.ta;
            a = '<div class="firebaseui-phone-number"><button class="firebaseui-id-country-selector firebaseui-country-selector mdl-button mdl-js-button"><span class="firebaseui-flag firebaseui-country-selector-flag firebaseui-id-country-selector-flag"></span><span class="firebaseui-id-country-selector-code"></span></button><div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label firebaseui-textfield firebaseui-phone-input-wrapper"><label class="mdl-textfield__label firebaseui-label" for="phoneNumber">Phone number</label><input type="tel" name="phoneNumber" class="mdl-textfield__input firebaseui-input firebaseui-id-phone-number" value="' +
                id(null != a ? a : "") + '"></div></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-phone-number-error firebaseui-id-phone-number-error"></p></div>';
            a = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-phone-sign-in-start"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Enter your phone number</h1></div><div class="firebaseui-card-content"><div class="firebaseui-relative-wrapper">' +
                w(a);
            var f;
            d ? f = w('<div class="firebaseui-recaptcha-wrapper"><div class="firebaseui-recaptcha-container"></div><div class="firebaseui-error-wrapper firebaseui-recaptcha-error-wrapper"><p class="firebaseui-error firebaseui-hidden firebaseui-id-recaptcha-error"></p></div></div>') : f = "";
            f = a + f + '</div></div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + (e ? lk(null) : "") + ek({
                label: z("Verify")
            }) + '</div></div><div class="firebaseui-card-footer">';
            b ? (b = '<p class="firebaseui-tos firebaseui-phone-tos">',
                    b = c.H && c.G ? b + 'By tapping Verify, you are indicating that you accept our <a href="javascript:void(0)" class="firebaseui-link firebaseui-tos-link" target="_blank">Terms of Service</a> and <a href="javascript:void(0)" class="firebaseui-link firebaseui-pp-link" target="_blank">Privacy Policy</a>. An SMS may be sent. Message &amp; data rates may apply.' : b + "By tapping Verify, an SMS may be sent. Message &amp; data rates may apply.", c = w(b + "</p>")) : c = w('<p class="firebaseui-tos firebaseui-phone-sms-notice">By tapping Verify, an SMS may be sent. Message &amp; data rates may apply.</p>') +
                mk(c);
            return w(f + c + "</div></form></div>")
        }
        jl.a = "firebaseui.auth.soy2.page.phoneSignInStart";

        function kl(a, b, c) {
            a = a || {};
            b = a.phoneNumber;
            var d = "";
            a = 'Enter the 6-digit code we sent to <a class="firebaseui-link firebaseui-change-phone-number-link firebaseui-id-change-phone-number-link" href="javascript:void(0)">&lrm;' + (v(b) + "</a>");
            v(b);
            b = d;
            d = w('<div class="firebaseui-textfield mdl-textfield mdl-js-textfield mdl-textfield--floating-label"><label class="mdl-textfield__label firebaseui-label" for="phoneConfirmationCode">6-digit code</label><input type="number" name="phoneConfirmationCode" class="mdl-textfield__input firebaseui-input firebaseui-id-phone-confirmation-code"></div><div class="firebaseui-error-wrapper"><p class="firebaseui-error firebaseui-text-input-error firebaseui-hidden firebaseui-id-phone-confirmation-code-error"></p></div>');
            c = '<div class="mdl-card mdl-shadow--2dp firebaseui-container firebaseui-id-page-phone-sign-in-finish"><form onsubmit="return false;"><div class="firebaseui-card-header"><h1 class="firebaseui-title">Verify your phone number</h1></div><div class="firebaseui-card-content"><p class="firebaseui-text">' + a + "</p>" + d + '</div><div class="firebaseui-card-actions"><div class="firebaseui-form-actions">' + lk(null) + ek({
                label: z("Continue")
            }) + '</div></div><div class="firebaseui-card-footer">' + mk(c) + "</div></form>";
            a = w('<div class="firebaseui-resend-container"><span class="firebaseui-id-resend-countdown"></span><a href="javascript:void(0)" class="firebaseui-id-resend-link firebaseui-hidden firebaseui-link">Resend</a></div>');
            return w(b + (c + a + "</div>"))
        }
        kl.a = "firebaseui.auth.soy2.page.phoneSignInFinish";

        function ll() {
            return K(this, "firebaseui-id-submit")
        }

        function Q() {
            return K(this, "firebaseui-id-secondary-link")
        }

        function ml(a, b) {
            M(this, ll.call(this), function(b) {
                a(b)
            });
            var c = Q.call(this);
            c && b && M(this, c, function(a) {
                b(a)
            })
        }

        function nl() {
            return K(this, "firebaseui-id-password")
        }

        function ol() {
            return K(this, "firebaseui-id-password-error")
        }

        function pl() {
            var a = nl.call(this),
                b = ol.call(this);
            Xj(this, a, function() {
                ck(b) && (L(a, !0), bk(b))
            })
        }

        function ql() {
            var a = nl.call(this);
            var b = ol.call(this);
            J(a) ? (L(a, !0), bk(b), b = !0) : (L(a, !1), N(b, x("Enter your password").toString()), b = !1);
            return b ? J(a) : null
        }

        function rl(a, b, c, d, e, f) {
            O.call(this, Wk, {
                email: a
            }, f, "passwordLinking", {
                H: d,
                G: e
            });
            this.a = b;
            this.K = c
        }
        r(rl, O);
        rl.prototype.v = function() {
            this.P();
            this.O(this.a, this.K);
            Ik(this, this.i(), this.a);
            this.i().focus();
            rl.o.v.call(this)
        };
        rl.prototype.l = function() {
            this.a = null;
            rl.o.l.call(this)
        };
        rl.prototype.I = function() {
            return J(K(this, "firebaseui-id-email"))
        };
        q(rl.prototype, {
            i: nl,
            C: ol,
            P: pl,
            A: ql,
            Z: ll,
            aa: Q,
            O: ml
        });
        var sl = /^[+a-zA-Z0-9_.!#$%&'*\/=?^`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,63}$/;

        function tl() {
            return K(this, "firebaseui-id-email")
        }

        function ul() {
            return K(this, "firebaseui-id-email-error")
        }

        function vl(a) {
            var b = tl.call(this),
                c = ul.call(this);
            Xj(this,
                b,
                function() {
                    ck(c) && (L(b, !0), bk(c))
                });
            a && Yj(this, b, function() {
                a()
            })
        }

        function wl() {
            return Ta(J(tl.call(this)) || "")
        }

        function xl() {
            var a = tl.call(this);
            var b = ul.call(this);
            var c = J(a) || "";
            c ? sl.test(c) ? (L(a, !0), bk(b), b = !0) : (L(a, !1), N(b, x("That email address isn't correct").toString()), b = !1) : (L(a, !1), N(b, x("Enter your email address to continue").toString()), b = !1);
            return b ? Ta(J(a)) : null
        }

        function yl(a, b, c, d, e, f, g) {
            O.call(this, Kk, {
                email: c,
                fa: !!f
            }, g, "passwordSignIn", {
                H: d,
                G: e
            });
            this.a = a;
            this.K = b
        }
        r(yl, O);
        yl.prototype.v =
            function() {
                this.P();
                this.Z();
                this.aa(this.a, this.K);
                Hk(this, this.s(), this.i());
                Ik(this, this.i(), this.a);
                J(this.s()) ? this.i().focus() : this.s().focus();
                yl.o.v.call(this)
            };
        yl.prototype.l = function() {
            this.K = this.a = null;
            yl.o.l.call(this)
        };
        q(yl.prototype, {
            s: tl,
            T: ul,
            P: vl,
            O: wl,
            I: xl,
            i: nl,
            C: ol,
            Z: pl,
            A: ql,
            qa: ll,
            pa: Q,
            aa: ml
        });

        function R(a, b, c, d, e, f) {
            O.call(this, a, b, d, e || "notice", f);
            this.a = c || null
        }
        r(R, O);
        R.prototype.v = function() {
            this.a && (this.s(this.a), this.i().focus());
            R.o.v.call(this)
        };
        R.prototype.l = function() {
            this.a =
                null;
            R.o.l.call(this)
        };
        q(R.prototype, {
            i: ll,
            A: Q,
            s: ml
        });

        function zl(a, b, c, d, e) {
            R.call(this, Nk, {
                email: a,
                S: !!b
            }, b, e, "passwordRecoveryEmailSent", {
                H: c,
                G: d
            })
        }
        r(zl, R);

        function Al(a, b) {
            R.call(this, el, {
                S: !!a
            }, a, b, "emailVerificationSuccess")
        }
        r(Al, R);

        function Bl(a, b) {
            R.call(this, fl, {
                S: !!a
            }, a, b, "emailVerificationFailure")
        }
        r(Bl, R);

        function Cl(a, b) {
            R.call(this, al, {
                S: !!a
            }, a, b, "passwordResetSuccess")
        }
        r(Cl, R);

        function Dl(a, b) {
            R.call(this, bl, {
                S: !!a
            }, a, b, "passwordResetFailure")
        }
        r(Dl, R);

        function El(a, b) {
            R.call(this, dl, {
                S: !!a
            }, a, b, "emailChangeRevokeFailure")
        }
        r(El, R);

        function Fl(a, b) {
            R.call(this, gl, {
                errorMessage: a
            }, void 0, b, "unrecoverableError")
        }
        r(Fl, R);
        var Gl = !1,
            Hl = null;

        function Il(a, b) {
            Gl = !!b;
            Hl || ("undefined" == typeof accountchooser && fj() ? (b = Jb(Fb(new Cb(Db, "//www.gstatic.com/accountchooser/client.js"))), Hl = Ze(B(eh(b)), function() {})) : Hl = B());
            Hl.then(a, a)
        }

        function Jl(a, b) {
            a = S(a);
            (a = Fg(a).accountChooserInvoked || null) ? a(b): b()
        }

        function Kl(a, b, c) {
            a = S(a);
            (a = Fg(a).accountChooserResult || null) ? a(b, c): c()
        }

        function Ll(a,
            b, c, d, e) {
            d ? (I("callback", a, b), Gl && c()) : Jl(a, function() {
                Ei(T(a));
                Ni(function(d) {
                    G(pi, T(a));
                    Kl(a, d ? "empty" : "unavailable", function() {
                        I("signIn", a, b);
                        (d || Gl) && c()
                    })
                }, Ai(T(a)), e)
            })
        }

        function Ml(a, b, c, d) {
            function e(a) {
                a = U(a);
                V(b, c, void 0, a);
                d()
            }
            Kl(b, "accountSelected", function() {
                zi(!1, T(b));
                var f = Nl(b);
                W(b, X(b).fetchSignInMethodsForEmail(a.a).then(function(e) {
                    Ol(b, c, e, a.a, a.h || void 0, void 0, f);
                    d()
                }, e))
            })
        }

        function Pl(a, b, c, d) {
            Kl(b, a ? "addAccount" : "unavailable", function() {
                I("signIn", b, c);
                (a || Gl) && d()
            })
        }

        function Ql(a,
            b, c, d) {
            function e() {
                var b = a();
                b && (b = Eg(S(b))) && b()
            }
            Ki(function() {
                var f = a();
                f && Ll(f, b, e, c, d)
            }, function(c) {
                var d = a();
                d && Ml(c, d, b, e)
            }, function(c) {
                var d = a();
                d && Pl(c, d, b, e)
            }, a() && cg(S(a())))
        }

        function Rl(a, b, c, d) {
            function e(c) {
                if (!c.name || "cancel" != c.name) {
                    a: {
                        var d = c.message;
                        try {
                            var e = ((JSON.parse(d).error || {}).message || "").toLowerCase().match(/invalid.+(access|id)_token/);
                            if (e && e.length) {
                                var f = !0;
                                break a
                            }
                        } catch (na) {}
                        f = !1
                    }
                    if (f) c = P(b),
                    b.m(),
                    V(a, c, void 0, x("Your sign-in session has expired. Please try again.").toString());
                    else {
                        f = c && c.message || "";
                        if (c.code) {
                            if ("auth/email-already-in-use" == c.code || "auth/credential-already-in-use" == c.code) return;
                            f = U(c)
                        }
                        b.g(f)
                    }
                }
            }
            Sl(a);
            if (d) return Tl(a, c), B();
            if (!c.credential) throw Error("No credential found!");
            d = X(a).currentUser || c.user;
            if (!d) throw Error("User not logged in.");
            d = new qh(d.email, d.displayName, d.photoURL, "password" == c.credential.providerId ? null : c.credential.providerId);
            null != vi(ri, T(a)) && !vi(ri, T(a)) || Bi(d, T(a));
            G(ri, T(a));
            try {
                var f = Ul(a, c)
            } catch (g) {
                return re(g.code || g.message,
                    g), b.g(g.code || g.message), B()
            }
            c = f.then(function(b) {
                Tl(a, b)
            }, e).then(void 0, e);
            W(a, f);
            return B(c)
        }

        function Tl(a, b) {
            if (!b.user) throw Error("No user found");
            var c = Hg(S(a));
            Gg(S(a)) && c && we("Both signInSuccess and signInSuccessWithAuthResult callbacks are provided. Only signInSuccessWithAuthResult callback will be invoked.");
            if (c) {
                c = Hg(S(a));
                var d = xi(T(a)) || void 0;
                G(qi, T(a));
                var e = !1;
                if (Tf()) {
                    if (!c || c(b, d)) e = !0, window.opener.location.assign(Mb(Ob(Vl(a, d))));
                    c || window.close()
                } else if (!c || c(b, d)) e = !0, Sf(Vl(a,
                    d));
                e || a.reset()
            } else {
                c = b.user;
                b = b.credential;
                d = Gg(S(a));
                e = xi(T(a)) || void 0;
                G(qi, T(a));
                var f = !1;
                if (Tf()) {
                    if (!d || d(c, b, e)) f = !0, window.opener.location.assign(Mb(Ob(Vl(a, e))));
                    d || window.close()
                } else if (!d || d(c, b, e)) f = !0, Sf(Vl(a, e));
                f || a.reset()
            }
        }

        function Vl(a, b) {
            a = b || S(a).a.get("signInSuccessUrl");
            if (!a) throw Error("No redirect URL has been found. You must either specify a signInSuccessUrl in the configuration, pass in a redirect URL to the widget URL, or return false from the callback.");
            return a
        }

        function U(a) {
            var b =
                "";
            switch (a.code) {
                case "auth/email-already-in-use":
                    b += "The email address is already used by another account";
                    break;
                case "auth/requires-recent-login":
                    b += wd();
                    break;
                case "auth/too-many-requests":
                    b += "You have entered an incorrect password too many times. Please try again in a few minutes.";
                    break;
                case "auth/user-cancelled":
                    b += "Please authorize the required permissions to sign in to the application";
                    break;
                case "auth/user-not-found":
                    b += "That email address doesn't match an existing account";
                    break;
                case "auth/user-token-expired":
                    b +=
                        wd();
                    break;
                case "auth/weak-password":
                    b += "Strong passwords have at least 6 characters and a mix of letters and numbers";
                    break;
                case "auth/wrong-password":
                    b += "The email and password you entered don't match";
                    break;
                case "auth/network-request-failed":
                    b += "A network error has occurred";
                    break;
                case "auth/invalid-phone-number":
                    b += td();
                    break;
                case "auth/invalid-verification-code":
                    b += x("Wrong code. Try again.");
                    break;
                case "auth/code-expired":
                    b += "This code is no longer valid";
                    break;
                case "auth/expired-action-code":
                    b +=
                        "This code has expired.";
                    break;
                case "auth/invalid-action-code":
                    b += "The action code is invalid. This can happen if the code is malformed, expired, or has already been used."
            }
            if (b = x(b).toString()) return b;
            try {
                return JSON.parse(a.message), re("Internal error: " + a.message, void 0), ud().toString()
            } catch (c) {
                return a.message
            }
        }

        function Wl(a, b, c) {
            var d = Ud[b] && firebase.auth[Ud[b]] ? new firebase.auth[Ud[b]] : null;
            if (!d) throw Error("Invalid Firebase Auth provider!");
            var e = ug(S(a), b);
            if (d && d.addScope)
                for (var f = 0; f <
                    e.length; f++) d.addScope(e[f]);
            a = vg(S(a), b);
            b == firebase.auth.GoogleAuthProvider.PROVIDER_ID && c && (a = a || {}, a.login_hint = c);
            a && d && d.setCustomParameters && d.setCustomParameters(a);
            return d
        }

        function Xl(a, b, c, d) {
            function e() {
                Ei(T(a));
                W(a, b.L(p(a.Kb, a), [n], function() {
                    if ("file:" === (window.location && window.location.protocol)) return W(a, Yl(a).then(function(c) {
                        b.m();
                        G(pi, T(a));
                        I("callback", a, h, B(c))
                    }, f))
                }, g))
            }

            function f(c) {
                G(pi, T(a));
                if (!c.name || "cancel" != c.name) switch (c.code) {
                    case "auth/popup-blocked":
                        e();
                        break;
                    case "auth/popup-closed-by-user":
                    case "auth/cancelled-popup-request":
                        break;
                    case "auth/credential-already-in-use":
                        break;
                    case "auth/network-request-failed":
                    case "auth/too-many-requests":
                    case "auth/user-cancelled":
                        b.g(U(c));
                        break;
                    default:
                        b.m(), I("callback", a, h, Xe(c))
                }
            }

            function g(c) {
                G(pi, T(a));
                c.name && "cancel" == c.name || (re("signInWithRedirect: " + c.code, void 0), c = U(c), b.g(c))
            }
            var h = P(b),
                n = Wl(a, c, d);
            "redirect" == Dg(S(a)) ? e() : W(a, Zl(a, n).then(function(c) {
                b.m();
                I("callback", a, h, B(c))
            }, f))
        }

        function $l(a, b) {
            W(a,
                b.L(p(a.Gb, a), [], function(c) {
                    b.m();
                    return Rl(a, b, c, !0)
                }, function(a) {
                    a.name && "cancel" == a.name || (re("ContinueAsGuest: " + a.code, void 0), a = U(a), b.g(a))
                }))
        }

        function am(a, b, c) {
            function d(c) {
                var d = !1;
                c = b.L(p(a.Hb, a), [c], function(c) {
                    var e = P(b);
                    b.m();
                    I("callback", a, e, B(c));
                    d = !0
                }, function(c) {
                    if (!c.name || "cancel" != c.name)
                        if (!c || "auth/credential-already-in-use" != c.code)
                            if (c && "auth/email-already-in-use" == c.code && c.email && c.credential) {
                                var d = P(b);
                                b.m();
                                I("callback", a, d, Xe(c))
                            } else c = U(c), b.g(c)
                });
                W(a, c);
                return c.then(function() {
                        return d
                    },
                    function() {
                        return !1
                    })
            }
            var e = sg(S(a), c && c.authMethod || null);
            if (c && c.idToken && e === firebase.auth.GoogleAuthProvider.PROVIDER_ID) return ug(S(a), firebase.auth.GoogleAuthProvider.PROVIDER_ID).length ? (Xl(a, b, e, c.id), c = B(!0)) : c = d(firebase.auth.GoogleAuthProvider.credential(c.idToken)), c;
            c && b.g(x("The selected credential for the authentication provider is not supported!").toString());
            return B(!1)
        }

        function bm(a, b) {
            var c = b.I(),
                d = b.A();
            if (c)
                if (d) {
                    var e = firebase.auth.EmailAuthProvider.credential(c, d);
                    W(a, b.L(p(a.Ib,
                        a), [c, d], function(c) {
                        return Rl(a, b, {
                            user: c.user,
                            credential: e,
                            operationType: c.operationType,
                            additionalUserInfo: c.additionalUserInfo
                        })
                    }, function(a) {
                        if (!a.name || "cancel" != a.name) switch (a.code) {
                            case "auth/email-already-in-use":
                                break;
                            case "auth/email-exists":
                                L(b.s(), !1);
                                N(b.T(), U(a));
                                break;
                            case "auth/too-many-requests":
                            case "auth/wrong-password":
                                L(b.i(), !1);
                                N(b.C(), U(a));
                                break;
                            default:
                                re("verifyPassword: " + a.message, void 0), b.g(U(a))
                        }
                    }))
                } else b.i().focus();
            else b.s().focus()
        }

        function Nl(a) {
            a = pg(S(a));
            return 1 == a.length && a[0] == firebase.auth.EmailAuthProvider.PROVIDER_ID
        }

        function cm(a) {
            a = pg(S(a));
            return 1 == a.length && a[0] == firebase.auth.PhoneAuthProvider.PROVIDER_ID
        }

        function V(a, b, c, d) {
            Nl(a) ? d ? I("signIn", a, b, c, d) : dm(a, b, c) : a && cm(a) && !d ? I("phoneSignInStart", a, b) : I("providerSignIn", a, b, d)
        }

        function em(a, b, c, d) {
            var e = P(b);
            W(a, b.L(p(X(a).fetchSignInMethodsForEmail, X(a)), [c], function(f) {
                zi(rg(S(a)) == $f, T(a));
                b.m();
                Ol(a, e, f, c, void 0, d)
            }, function(a) {
                a = U(a);
                b.g(a)
            }))
        }

        function Ol(a, b, c, d, e, f, g) {
            c.length ||
                Ag(S(a)) ? !c.length && Ag(S(a)) ? I("sendEmailLinkForSignIn", a, b, d, function() {
                    I("signIn", a, b)
                }) : Ka(c, firebase.auth.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD) ? I("passwordSignIn", a, b, d, g) : 1 == c.length && c[0] === firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD ? I("sendEmailLinkForSignIn", a, b, d, function() {
                    I("signIn", a, b)
                }) : (c = Sd(c), Di(new xh(d), T(a)), I("federatedSignIn", a, b, d, c, f)) : I("passwordSignUp", a, b, d, e, void 0, g)
        }

        function fm(a, b, c, d, e, f) {
            var g = P(b);
            W(a, b.L(p(a.qb, a), [c, f], function() {
                b.m();
                I("emailLinkSignInSent", a, g, c, d, f)
            }, e))
        }

        function dm(a, b, c) {
            rg(S(a)) == $f ? Il(function() {
                Ii ? Jl(a, function() {
                    Ei(T(a));
                    Ni(function(d) {
                        G(pi, T(a));
                        Kl(a, d ? "empty" : "unavailable", function() {
                            I("signIn", a, b, c)
                        })
                    }, Ai(T(a)), gg(S(a)))
                }) : (Y(a), Ql(gm, b, !1, gg(S(a))))
            }, !1) : (Gl = !1, Jl(a, function() {
                Kl(a, "unavailable", function() {
                    I("signIn", a, b, c)
                })
            }))
        }

        function hm(a) {
            var b = Wf();
            a = ig(S(a));
            b = wc(b, a) || "";
            for (var c in dg)
                if (dg[c].toLowerCase() == b.toLowerCase()) return dg[c];
            return "callback"
        }

        function im(a) {
            var b = Wf();
            a = Cd(S(a).a,
                "queryParameterForSignInSuccessUrl");
            return (b = wc(b, a)) ? Mb(Ob(b)) : null
        }

        function jm() {
            return wc(Wf(), "oobCode")
        }

        function km() {
            var a = wc(Wf(), "continueUrl");
            return a ? function() {
                Sf(a)
            } : null
        }

        function lm(a, b) {
            var c = Vf(b);
            switch (hm(a)) {
                case "callback":
                    (b = im(a)) && yi(b, T(a));
                    a.cb() ? I("callback", a, c) : V(a, c);
                    break;
                case "resetPassword":
                    I("passwordReset", a, c, jm(), km());
                    break;
                case "recoverEmail":
                    I("emailChangeRevocation", a, c, jm());
                    break;
                case "verifyEmail":
                    I("emailVerification", a, c, jm(), km());
                    break;
                case "signIn":
                    I("emailLinkSignInCallback",
                        a, c, Wf());
                    mm();
                    break;
                case "select":
                    if ((b = im(a)) && yi(b, T(a)), Ii) {
                        V(a, c);
                        break
                    } else {
                        Il(function() {
                            Y(a);
                            Ql(gm, c, !0)
                        }, !0);
                        return
                    }
                default:
                    throw Error("Unhandled widget operation.");
            }(b = Eg(S(a))) && b()
        }

        function nm(a, b) {
            O.call(this, Vk, void 0, b, "anonymousUserMismatch");
            this.a = a
        }
        r(nm, O);
        nm.prototype.v = function() {
            var a = this;
            M(this, this.i(), function() {
                a.a()
            });
            this.i().focus();
            nm.o.v.call(this)
        };
        nm.prototype.l = function() {
            this.a = null;
            nm.o.l.call(this)
        };
        q(nm.prototype, {
            i: Q
        });
        H.anonymousUserMismatch = function(a, b) {
            var c =
                new nm(function() {
                    c.m();
                    V(a, b)
                });
            c.render(b);
            Z(a, c)
        };

        function om(a) {
            O.call(this, Ok, void 0, a, "callback")
        }
        r(om, O);
        om.prototype.L = function(a, b, c, d) {
            return a.apply(null, b).then(c, d)
        };

        function pm(a, b, c) {
            if (c.user) {
                var d = {
                        user: c.user,
                        credential: c.credential,
                        operationType: c.operationType,
                        additionalUserInfo: c.additionalUserInfo
                    },
                    e = Ci(T(a)),
                    f = e && e.g;
                if (f && !qm(c.user, f)) rm(a, b, d);
                else {
                    var g = e && e.a;
                    g ? W(a, c.user.linkAndRetrieveDataWithCredential(g).then(function(c) {
                        d = {
                            user: c.user,
                            credential: g,
                            operationType: c.operationType,
                            additionalUserInfo: c.additionalUserInfo
                        };
                        sm(a, b, d)
                    }, function(c) {
                        tm(a, b, c)
                    })) : sm(a, b, d)
                }
            } else c = P(b), b.m(), G(oi, T(a)), V(a, c)
        }

        function sm(a, b, c) {
            G(oi, T(a));
            Rl(a, b, c)
        }

        function tm(a, b, c) {
            var d = P(b);
            G(oi, T(a));
            c = U(c);
            b.m();
            V(a, d, void 0, c)
        }

        function um(a, b, c, d) {
            var e = P(b);
            W(a, X(a).fetchSignInMethodsForEmail(c).then(function(f) {
                b.m();
                f.length ? Ka(f, firebase.auth.EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD) ? I("passwordLinking", a, e, c) : 1 == f.length && f[0] === firebase.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD ?
                    I("emailLinkSignInLinking", a, e, c) : I("federatedLinking", a, e, c, Sd(f), d) : (G(oi, T(a)), I("passwordRecovery", a, e, c, !1, vd().toString()))
            }, function(c) {
                tm(a, b, c)
            }))
        }

        function rm(a, b, c) {
            var d = P(b);
            W(a, vm(a).then(function() {
                b.m();
                I("emailMismatch", a, d, c)
            }, function(a) {
                a.name && "cancel" == a.name || (a = U(a.code), b.g(a))
            }))
        }

        function qm(a, b) {
            if (b == a.email) return !0;
            if (a.providerData)
                for (var c = 0; c < a.providerData.length; c++)
                    if (b == a.providerData[c].email) return !0;
            return !1
        }
        H.callback = function(a, b, c) {
            var d = new om;
            d.render(b);
            Z(a, d);
            b = c || Yl(a);
            W(a, b.then(function(b) {
                pm(a, d, b)
            }, function(b) {
                if (b && ("auth/account-exists-with-different-credential" == b.code || "auth/email-already-in-use" == b.code) && b.email && b.credential) Di(yh(b), T(a)), um(a, d, b.email);
                else if (b && "auth/user-cancelled" == b.code) {
                    var c = Ci(T(a)),
                        e = U(b);
                    c && c.a ? um(a, d, c.g, e) : c ? em(a, d, c.g, e) : tm(a, d, b)
                } else b && "auth/credential-already-in-use" == b.code || (b && "auth/operation-not-supported-in-this-environment" == b.code && Nl(a) ? pm(a, d, {
                    user: null,
                    credential: null
                }) : tm(a, d, b))
            }))
        };

        function wm(a, b) {
            O.call(this, Uk, void 0, b, "differentDeviceError");
            this.a = a
        }
        r(wm, O);
        wm.prototype.v = function() {
            var a = this;
            M(this, this.i(), function() {
                a.a()
            });
            this.i().focus();
            wm.o.v.call(this)
        };
        wm.prototype.l = function() {
            this.a = null;
            wm.o.l.call(this)
        };
        q(wm.prototype, {
            i: Q
        });
        H.differentDeviceError = function(a, b) {
            var c = new wm(function() {
                c.m();
                V(a, b)
            });
            c.render(b);
            Z(a, c)
        };

        function xm(a, b, c, d) {
            O.call(this, cl, {
                email: a,
                S: !!c
            }, d, "emailChangeRevoke");
            this.i = b;
            this.a = c || null
        }
        r(xm, O);
        xm.prototype.v = function() {
            var a =
                this;
            M(this, K(this, "firebaseui-id-reset-password-link"), function() {
                a.i()
            });
            this.a && (this.A(this.a), this.s().focus());
            xm.o.v.call(this)
        };
        xm.prototype.l = function() {
            this.i = this.a = null;
            xm.o.l.call(this)
        };
        q(xm.prototype, {
            s: ll,
            C: Q,
            A: ml
        });

        function ym() {
            return K(this, "firebaseui-id-new-password")
        }

        function zm() {
            return K(this, "firebaseui-id-password-toggle")
        }

        function Am() {
            this.Ja = !this.Ja;
            var a = zm.call(this),
                b = ym.call(this);
            this.Ja ? (b.type = "text", ij(a, "firebaseui-input-toggle-off"), jj(a, "firebaseui-input-toggle-on")) :
                (b.type = "password", ij(a, "firebaseui-input-toggle-on"), jj(a, "firebaseui-input-toggle-off"));
            b.focus()
        }

        function Bm() {
            return K(this, "firebaseui-id-new-password-error")
        }

        function Cm() {
            this.Ja = !1;
            var a = ym.call(this);
            a.type = "password";
            var b = Bm.call(this);
            Xj(this, a, function() {
                ck(b) && (L(a, !0), bk(b))
            });
            var c = zm.call(this);
            ij(c, "firebaseui-input-toggle-on");
            jj(c, "firebaseui-input-toggle-off");
            Zj(this, a, function() {
                ij(c, "firebaseui-input-toggle-focus");
                jj(c, "firebaseui-input-toggle-blur")
            });
            ak(this, a, function() {
                ij(c,
                    "firebaseui-input-toggle-blur");
                jj(c, "firebaseui-input-toggle-focus")
            });
            M(this, c, p(Am, this))
        }

        function Dm() {
            var a = ym.call(this);
            var b = Bm.call(this);
            J(a) ? (L(a, !0), bk(b), b = !0) : (L(a, !1), N(b, x("Enter your password").toString()), b = !1);
            return b ? J(a) : null
        }

        function Em(a, b, c) {
            O.call(this, $k, {
                email: a
            }, c, "passwordReset");
            this.a = b
        }
        r(Em, O);
        Em.prototype.v = function() {
            this.I();
            this.C(this.a);
            Ik(this, this.i(), this.a);
            this.i().focus();
            Em.o.v.call(this)
        };
        Em.prototype.l = function() {
            this.a = null;
            Em.o.l.call(this)
        };
        q(Em.prototype, {
            i: ym,
            A: Bm,
            K: zm,
            I: Cm,
            s: Dm,
            P: ll,
            O: Q,
            C: ml
        });

        function Fm(a, b, c, d, e) {
            var f = c.s();
            f && W(a, c.L(p(X(a).confirmPasswordReset, X(a)), [d, f], function() {
                c.m();
                var d = new Cl(e);
                d.render(b);
                Z(a, d)
            }, function(d) {
                Gm(a, b, c, d)
            }))
        }

        function Gm(a, b, c, d) {
            "auth/weak-password" == (d && d.code) ? (a = U(d), L(c.i(), !1), N(c.A(), a), c.i().focus()) : (c && c.m(), c = new Dl, c.render(b), Z(a, c))
        }

        function Hm(a, b, c) {
            var d = new xm(c, function() {
                W(a, d.L(p(X(a).sendPasswordResetEmail, X(a)), [c], function() {
                    d.m();
                    d = new zl(c, void 0, C(S(a)), D(S(a)));
                    d.render(b);
                    Z(a, d)
                }, function() {
                    d.g(x("Unable to send password reset code to specified email").toString())
                }))
            });
            d.render(b);
            Z(a, d)
        }
        H.passwordReset = function(a, b, c, d) {
            W(a, X(a).verifyPasswordResetCode(c).then(function(e) {
                var f = new Em(e, function() {
                    Fm(a, b, f, c, d)
                });
                f.render(b);
                Z(a, f)
            }, function() {
                Gm(a, b)
            }))
        };
        H.emailChangeRevocation = function(a, b, c) {
            var d = null;
            W(a, X(a).checkActionCode(c).then(function(b) {
                d = b.data.email;
                return X(a).applyActionCode(c)
            }).then(function() {
                Hm(a, b, d)
            }, function() {
                var c = new El;
                c.render(b);
                Z(a,
                    c)
            }))
        };
        H.emailVerification = function(a, b, c, d) {
            W(a, X(a).applyActionCode(c).then(function() {
                var c = new Al(d);
                c.render(b);
                Z(a, c)
            }, function() {
                var c = new Bl;
                c.render(b);
                Z(a, c)
            }))
        };

        function Im(a, b) {
            try {
                var c = "number" == typeof a.selectionStart
            } catch (d) {
                c = !1
            }
            c ? (a.selectionStart = b, a.selectionEnd = b) : u && !zb("9") && ("textarea" == a.type && (b = a.value.substring(0, b).replace(/(\r\n|\r|\n)/g, "\n").length), a = a.createTextRange(), a.collapse(!0), a.move("character", b), a.select())
        }

        function Jm(a, b, c, d, e, f) {
            O.call(this, Tk, {
                    email: c
                },
                f, "emailLinkSignInConfirmation", {
                    H: d,
                    G: e
                });
            this.i = a;
            this.s = b
        }
        r(Jm, O);
        Jm.prototype.v = function() {
            this.C(this.i);
            this.I(this.i, this.s);
            this.a().focus();
            Im(this.a(), (this.a().value || "").length);
            Jm.o.v.call(this)
        };
        Jm.prototype.l = function() {
            this.s = this.i = null;
            Jm.o.l.call(this)
        };
        q(Jm.prototype, {
            a: tl,
            O: ul,
            C: vl,
            K: wl,
            A: xl,
            T: ll,
            P: Q,
            I: ml
        });
        H.emailLinkConfirmation = function(a, b, c, d, e, f) {
            var g = new Jm(function() {
                    var e = g.A();
                    e ? (g.m(), d(a, b, e, c)) : g.a().focus()
                }, function() {
                    g.m();
                    V(a, b, e || void 0)
                }, e || void 0, C(S(a)),
                D(S(a)));
            g.render(b);
            Z(a, g);
            f && g.g(f)
        };

        function Km(a, b, c, d, e) {
            O.call(this, Yk, {
                providerId: a
            }, e, "emailLinkSignInLinkingDifferentDevice", {
                H: c,
                G: d
            });
            this.a = b
        }
        r(Km, O);
        Km.prototype.v = function() {
            this.s(this.a);
            this.i().focus();
            Km.o.v.call(this)
        };
        Km.prototype.l = function() {
            this.a = null;
            Km.o.l.call(this)
        };
        q(Km.prototype, {
            i: ll,
            s: ml
        });
        H.emailLinkNewDeviceLinking = function(a, b, c, d) {
            var e = new Ig(c);
            c = e.a.a.get(E.PROVIDER_ID) || null;
            Mg(e, null);
            if (c) {
                var f = new Km(c, function() {
                    f.m();
                    d(a, b, e.toString())
                }, C(S(a)), D(S(a)));
                f.render(b);
                Z(a, f)
            } else V(a, b)
        };

        function Lm(a) {
            O.call(this, Pk, void 0, a, "blank")
        }
        r(Lm, O);

        function Mm(a, b, c, d, e) {
            var f = new Lm,
                g = new Ig(c),
                h = g.a.a.get(E.Ta) || "",
                n = g.a.a.get(E.Ka) || "",
                y = "1" === g.a.a.get(E.Ia),
                na = Lg(g),
                Ae = g.a.a.get(E.PROVIDER_ID) || null,
                ng = !vi(ti, T(a)),
                og = d || Fi(n, T(a)),
                xc = (d = Gi(n, T(a))) && d.a;
            Ae && xc && xc.providerId !== Ae && (xc = null);
            f.render(b);
            Z(a, f);
            W(a, f.L(function() {
                var b = B(null);
                b = na && ng || ng && y ? Xe(Error("anonymous-user-not-found")) : Nm(a, c).then(function(a) {
                    if (Ae && !xc) throw Error("pending-credential-not-found");
                    return a
                });
                var d = null;
                return b.then(function(b) {
                    d = b;
                    return e ? null : X(a).checkActionCode(h)
                }).then(function() {
                    return d
                })
            }, [], function(d) {
                og ? Om(a, f, og, c, xc, d) : y ? (f.m(), I("differentDeviceError", a, b)) : (f.m(), I("emailLinkConfirmation", a, b, c, Pm))
            }, function(d) {
                var e = void 0;
                if (!d || !d.name || "cancel" != d.name) switch (f.m(), d && d.message) {
                    case "anonymous-user-not-found":
                        I("differentDeviceError", a, b);
                        break;
                    case "anonymous-user-mismatch":
                        I("anonymousUserMismatch", a, b);
                        break;
                    case "pending-credential-not-found":
                        I("emailLinkNewDeviceLinking",
                            a, b, c, Qm);
                        break;
                    default:
                        d && (e = U(d)), V(a, b, void 0, e)
                }
            }))
        }

        function Pm(a, b, c, d) {
            Mm(a, b, d, c, !0)
        }

        function Qm(a, b, c) {
            Mm(a, b, c)
        }

        function Om(a, b, c, d, e, f) {
            var g = P(b);
            b.V("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", x("Signing in...").toString());
            var h = null;
            e = (f ? Rm(a, f, c, d, e) : Sm(a, c, d, e)).then(function(c) {
                G(ui, T(a));
                G(ti, T(a));
                b.h();
                b.V("firebaseui-icon-done", x("Signed in!").toString());
                h = setTimeout(function() {
                    b.h();
                    Rl(a, b, c, !0)
                }, 1E3);
                W(a, function() {
                    b &&
                        (b.h(), b.m());
                    clearTimeout(h)
                })
            }, function(e) {
                b.h();
                b.m();
                if (!e.name || "cancel" != e.name) {
                    var f = U(e);
                    "auth/email-already-in-use" == e.code || "auth/credential-already-in-use" == e.code ? (G(ui, T(a)), G(ti, T(a))) : "auth/invalid-email" == e.code ? (f = x("The email provided does not match the current sign-in session.").toString(), I("emailLinkConfirmation", a, g, d, Pm, null, f)) : V(a, g, c, f)
                }
            });
            W(a, e)
        }
        H.emailLinkSignInCallback = Mm;

        function Tm(a, b, c, d, e, f) {
            O.call(this, Xk, {
                email: a,
                providerId: b
            }, f, "emailLinkSignInLinking", {
                H: d,
                G: e
            });
            this.a = c
        }
        r(Tm, O);
        Tm.prototype.v = function() {
            this.s(this.a);
            this.i().focus();
            Tm.o.v.call(this)
        };
        Tm.prototype.l = function() {
            this.a = null;
            Tm.o.l.call(this)
        };
        q(Tm.prototype, {
            i: ll,
            s: ml
        });

        function Um(a, b, c, d) {
            var e = P(b);
            fm(a, b, c, function() {
                V(a, e, c)
            }, function(d) {
                if (!d.name || "cancel" != d.name) {
                    var f = U(d);
                    d && "auth/network-request-failed" == d.code ? b.g(f) : (b.m(), V(a, e, c, f))
                }
            }, d)
        }
        H.emailLinkSignInLinking = function(a, b, c) {
            var d = Ci(T(a));
            G(oi, T(a));
            if (d) {
                var e = new Tm(c, d.a.providerId, function() {
                        Um(a, e, c, d)
                    }, C(S(a)),
                    D(S(a)));
                e.render(b);
                Z(a, e)
            } else V(a, b)
        };

        function Vm(a, b, c, d, e, f) {
            O.call(this, Rk, {
                email: a
            }, f, "emailLinkSignInSent", {
                H: d,
                G: e
            });
            this.s = b;
            this.a = c
        }
        r(Vm, O);
        Vm.prototype.v = function() {
            var a = this;
            M(this, this.i(), function() {
                a.a()
            });
            M(this, K(this, "firebaseui-id-trouble-getting-email-link"), function() {
                a.s()
            });
            this.i().focus();
            Vm.o.v.call(this)
        };
        Vm.prototype.l = function() {
            this.a = this.s = null;
            Vm.o.l.call(this)
        };
        q(Vm.prototype, {
            i: Q
        });
        H.emailLinkSignInSent = function(a, b, c, d, e) {
            var f = new Vm(c, function() {
                f.m();
                I("emailNotReceived",
                    a, b, c, d, e)
            }, function() {
                f.m();
                d()
            }, C(S(a)), D(S(a)));
            f.render(b);
            Z(a, f)
        };

        function Wm(a, b, c, d, e, f, g) {
            O.call(this, hl, {
                Ob: a,
                zb: b
            }, g, "emailMismatch", {
                H: e,
                G: f
            });
            this.s = c;
            this.i = d
        }
        r(Wm, O);
        Wm.prototype.v = function() {
            this.C(this.s, this.i);
            this.A().focus();
            Wm.o.v.call(this)
        };
        Wm.prototype.l = function() {
            this.i = this.a = null;
            Wm.o.l.call(this)
        };
        q(Wm.prototype, {
            A: ll,
            I: Q,
            C: ml
        });
        H.emailMismatch = function(a, b, c) {
            var d = Ci(T(a));
            if (d) {
                var e = new Wm(c.user.email, d.g, function() {
                    var b = e;
                    G(oi, T(a));
                    Rl(a, b, c)
                }, function() {
                    var b =
                        c.credential.providerId,
                        g = P(e);
                    e.m();
                    d.a ? I("federatedLinking", a, g, d.g, b) : I("federatedSignIn", a, g, d.g, b)
                }, C(S(a)), D(S(a)));
                e.render(b);
                Z(a, e)
            } else V(a, b)
        };

        function Xm(a, b, c, d, e) {
            O.call(this, Sk, void 0, e, "emailNotReceived", {
                H: c,
                G: d
            });
            this.i = a;
            this.a = b
        }
        r(Xm, O);
        Xm.prototype.v = function() {
            var a = this;
            M(this, this.s(), function() {
                a.a()
            });
            M(this, this.wa(), function() {
                a.i()
            });
            this.s().focus();
            Xm.o.v.call(this)
        };
        Xm.prototype.wa = function() {
            return K(this, "firebaseui-id-resend-email-link")
        };
        Xm.prototype.l = function() {
            this.a =
                this.i = null;
            Xm.o.l.call(this)
        };
        q(Xm.prototype, {
            s: Q
        });
        H.emailNotReceived = function(a, b, c, d, e) {
            var f = new Xm(function() {
                fm(a, f, c, d, function(a) {
                    a = U(a);
                    f.g(a)
                }, e)
            }, function() {
                f.m();
                V(a, b, c)
            }, C(S(a)), D(S(a)));
            f.render(b);
            Z(a, f)
        };

        function Ym(a, b, c, d, e, f) {
            O.call(this, Zk, {
                email: a,
                providerId: b
            }, f, "federatedLinking", {
                H: d,
                G: e
            });
            this.a = c
        }
        r(Ym, O);
        Ym.prototype.v = function() {
            this.s(this.a);
            this.i().focus();
            Ym.o.v.call(this)
        };
        Ym.prototype.l = function() {
            this.a = null;
            Ym.o.l.call(this)
        };
        q(Ym.prototype, {
            i: ll,
            s: ml
        });
        H.federatedLinking =
            function(a, b, c, d, e) {
                var f = Ci(T(a));
                if (f && f.a) {
                    var g = new Ym(c, d, function() {
                        Xl(a, g, d, c)
                    }, C(S(a)), D(S(a)));
                    g.render(b);
                    Z(a, g);
                    e && g.g(e)
                } else V(a, b)
            };
        H.federatedSignIn = function(a, b, c, d, e) {
            var f = new Ym(c, d, function() {
                Xl(a, f, d, c)
            }, C(S(a)), D(S(a)));
            f.render(b);
            Z(a, f);
            e && f.g(e)
        };

        function Zm(a, b, c, d) {
            var e = b.A();
            e ? W(a, b.L(p(a.Eb, a), [c, e], function(c) {
                c = c.user.linkAndRetrieveDataWithCredential(d).then(function(c) {
                    return Rl(a, b, {
                        user: c.user,
                        credential: d,
                        operationType: c.operationType,
                        additionalUserInfo: c.additionalUserInfo
                    })
                });
                W(a, c);
                return c
            }, function(a) {
                if (!a.name || "cancel" != a.name) switch (a.code) {
                    case "auth/wrong-password":
                        L(b.i(), !1);
                        N(b.C(), U(a));
                        break;
                    case "auth/too-many-requests":
                        b.g(U(a));
                        break;
                    default:
                        re("signInWithEmailAndPassword: " + a.message, void 0), b.g(U(a))
                }
            })) : b.i().focus()
        }
        H.passwordLinking = function(a, b, c) {
            var d = Ci(T(a));
            G(oi, T(a));
            var e = d && d.a;
            if (e) {
                var f = new rl(c, function() {
                    Zm(a, f, c, e)
                }, function() {
                    f.m();
                    I("passwordRecovery", a, b, c)
                }, C(S(a)), D(S(a)));
                f.render(b);
                Z(a, f)
            } else V(a, b)
        };

        function $m(a, b, c, d, e,
            f) {
            O.call(this, Mk, {
                email: c,
                La: !!b
            }, f, "passwordRecovery", {
                H: d,
                G: e
            });
            this.a = a;
            this.s = b
        }
        r($m, O);
        $m.prototype.v = function() {
            this.I();
            this.K(this.a, this.s);
            J(this.i()) || this.i().focus();
            Ik(this, this.i(), this.a);
            $m.o.v.call(this)
        };
        $m.prototype.l = function() {
            this.s = this.a = null;
            $m.o.l.call(this)
        };
        q($m.prototype, {
            i: tl,
            C: ul,
            I: vl,
            O: wl,
            A: xl,
            T: ll,
            P: Q,
            K: ml
        });

        function an(a, b) {
            var c = b.A();
            if (c) {
                var d = P(b);
                W(a, b.L(p(X(a).sendPasswordResetEmail, X(a)), [c], function() {
                    b.m();
                    var e = new zl(c, function() {
                            e.m();
                            V(a, d)
                        }, C(S(a)),
                        D(S(a)));
                    e.render(d);
                    Z(a, e)
                }, function(a) {
                    L(b.i(), !1);
                    N(b.C(), U(a))
                }))
            } else b.i().focus()
        }
        H.passwordRecovery = function(a, b, c, d, e) {
            var f = new $m(function() {
                an(a, f)
            }, d ? void 0 : function() {
                f.m();
                V(a, b)
            }, c, C(S(a)), D(S(a)));
            f.render(b);
            Z(a, f);
            e && f.g(e)
        };
        H.passwordSignIn = function(a, b, c, d) {
            var e = new yl(function() {
                bm(a, e)
            }, function() {
                var c = e.O();
                e.m();
                I("passwordRecovery", a, b, c)
            }, c, C(S(a)), D(S(a)), d);
            e.render(b);
            Z(a, e)
        };

        function bn() {
            return K(this, "firebaseui-id-name")
        }

        function cn() {
            return K(this, "firebaseui-id-name-error")
        }

        function dn(a, b, c, d, e, f, g, h, n) {
            O.call(this, Lk, {
                email: d,
                Cb: a,
                name: e,
                La: !!c,
                fa: !!h
            }, n, "passwordSignUp", {
                H: f,
                G: g
            });
            this.a = b;
            this.I = c;
            this.C = a
        }
        r(dn, O);
        dn.prototype.v = function() {
            this.Z();
            this.C && this.Oa();
            this.qa();
            this.pa(this.a, this.I);
            this.C ? (Hk(this, this.i(), this.A()), Hk(this, this.A(), this.s())) : Hk(this, this.i(), this.s());
            this.a && Ik(this, this.s(), this.a);
            J(this.i()) ? this.C && !J(this.A()) ? this.A().focus() : this.s().focus() : this.i().focus();
            dn.o.v.call(this)
        };
        dn.prototype.l = function() {
            this.I = this.a = null;
            dn.o.l.call(this)
        };
        q(dn.prototype, {
            i: tl,
            T: ul,
            Z: vl,
            $a: wl,
            O: xl,
            A: bn,
            gc: cn,
            Oa: function() {
                var a = bn.call(this),
                    b = cn.call(this);
                Xj(this, a, function() {
                    ck(b) && (L(a, !0), bk(b))
                })
            },
            K: function() {
                var a = bn.call(this);
                var b = cn.call(this);
                var c = J(a);
                c = !/^[\s\xa0]*$/.test(null == c ? "" : String(c));
                L(a, c);
                c ? (bk(b), b = !0) : (N(b, x("Enter your account name").toString()), b = !1);
                return b ? Ta(J(a)) : null
            },
            s: ym,
            aa: Bm,
            ub: zm,
            qa: Cm,
            P: Dm,
            dc: ll,
            wb: Q,
            pa: ml
        });

        function en(a, b) {
            var c = zg(S(a)),
                d = b.O(),
                e = null;
            c && (e = b.K());
            var f = b.P();
            if (d) {
                if (c)
                    if (e) e =
                        Ua(e);
                    else {
                        b.A().focus();
                        return
                    } if (f) {
                    var g = firebase.auth.EmailAuthProvider.credential(d, f);
                    W(a, b.L(p(a.Fb, a), [d, f], function(d) {
                        var f = {
                            user: d.user,
                            credential: g,
                            operationType: d.operationType,
                            additionalUserInfo: d.additionalUserInfo
                        };
                        return c ? (d = d.user.updateProfile({
                            displayName: e
                        }).then(function() {
                            return Rl(a, b, f)
                        }), W(a, d), d) : Rl(a, b, f)
                    }, function(c) {
                        if (!c.name || "cancel" != c.name) {
                            var e = U(c);
                            switch (c.code) {
                                case "auth/email-already-in-use":
                                    return fn(a, b, d, c);
                                case "auth/too-many-requests":
                                    e = x("Too many account requests are coming from your IP address. Try again in a few minutes.").toString();
                                case "auth/operation-not-allowed":
                                case "auth/weak-password":
                                    L(b.s(), !1);
                                    N(b.aa(), e);
                                    break;
                                default:
                                    c = "setAccountInfo: " + Wh(c), re(c, void 0), b.g(e)
                            }
                        }
                    }))
                } else b.s().focus()
            } else b.i().focus()
        }

        function fn(a, b, c, d) {
            function e() {
                var a = U(d);
                L(b.i(), !1);
                N(b.T(), a);
                b.i().focus()
            }
            var f = X(a).fetchSignInMethodsForEmail(c).then(function(d) {
                d.length ? e() : (d = P(b), b.m(), I("passwordRecovery", a, d, c, !1, vd().toString()))
            }, function() {
                e()
            });
            W(a, f);
            return f
        }
        H.passwordSignUp = function(a, b, c, d, e, f) {
            function g() {
                h.m();
                V(a, b)
            }
            var h = new dn(zg(S(a)), function() {
                en(a, h)
            }, e ? void 0 : g, c, d, C(S(a)), D(S(a)), f);
            h.render(b);
            Z(a, h)
        };

        function gn() {
            return K(this, "firebaseui-id-phone-confirmation-code")
        }

        function hn() {
            return K(this, "firebaseui-id-phone-confirmation-code-error")
        }

        function jn() {
            return K(this, "firebaseui-id-resend-countdown")
        }

        function kn(a, b, c, d, e, f, g, h, n) {
            O.call(this, kl, {
                phoneNumber: e
            }, n, "phoneSignInFinish", {
                H: g,
                G: h
            });
            this.Oa = f;
            this.i = new vj(1E3);
            this.C = f;
            this.O = a;
            this.a = b;
            this.I = c;
            this.K = d
        }
        r(kn, O);
        kn.prototype.v = function() {
            var a =
                this;
            this.P(this.Oa);
            Ef(this.i, "tick", this.A, !1, this);
            this.i.start();
            M(this, K(this, "firebaseui-id-change-phone-number-link"), function() {
                a.O()
            });
            M(this, this.wa(), function() {
                a.K()
            });
            this.qa(this.a);
            this.aa(this.a, this.I);
            this.s().focus();
            kn.o.v.call(this)
        };
        kn.prototype.l = function() {
            this.K = this.I = this.a = this.O = null;
            wj(this.i);
            Mf(this.i, "tick", this.A);
            this.i = null;
            kn.o.l.call(this)
        };
        kn.prototype.A = function() {
            --this.C;
            0 < this.C ? this.P(this.C) : (wj(this.i), Mf(this.i, "tick", this.A), this.pa(), this.$a())
        };
        q(kn.prototype, {
            s: gn,
            Z: hn,
            qa: function(a) {
                var b = gn.call(this),
                    c = hn.call(this);
                Xj(this, b, function() {
                    ck(c) && (L(b, !0), bk(c))
                });
                a && Yj(this, b, function() {
                    a()
                })
            },
            T: function() {
                var a = Ta(J(gn.call(this)) || "");
                return /^\d{6}$/.test(a) ? a : null
            },
            mb: jn,
            P: function(a) {
                hc(jn.call(this), x("Resend code in " + ((9 < a ? "0:" : "0:0") + a)).toString())
            },
            pa: function() {
                var a = this.mb();
                bk(a)
            },
            wa: function() {
                return K(this, "firebaseui-id-resend-link")
            },
            $a: function() {
                N(this.wa())
            },
            wb: ll,
            ub: Q,
            aa: ml
        });

        function ln(a, b, c, d) {
            function e(a) {
                b.s().focus();
                L(b.s(),
                    !1);
                N(b.Z(), a)
            }
            var f = b.T();
            f ? (b.V("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", x("Verifying...").toString()), W(a, b.L(p(d.confirm, d), [f], function(c) {
                b.h();
                b.V("firebaseui-icon-done", x("Verified!").toString());
                var d = setTimeout(function() {
                    b.h();
                    b.m();
                    var d = {
                        user: mn(a).currentUser,
                        credential: null,
                        operationType: c.operationType,
                        additionalUserInfo: c.additionalUserInfo
                    };
                    Rl(a, b, d, !0)
                }, 1E3);
                W(a, function() {
                    b && b.h();
                    clearTimeout(d)
                })
            }, function(d) {
                if (d.name &&
                    "cancel" == d.name) b.h();
                else {
                    var f = U(d);
                    switch (d.code) {
                        case "auth/credential-already-in-use":
                            b.h();
                            break;
                        case "auth/code-expired":
                            d = P(b);
                            b.h();
                            b.m();
                            I("phoneSignInStart", a, d, c, f);
                            break;
                        case "auth/missing-verification-code":
                        case "auth/invalid-verification-code":
                            b.h();
                            e(f);
                            break;
                        default:
                            b.h(), b.g(f)
                    }
                }
            }))) : e(x("Wrong code. Try again.").toString())
        }
        H.phoneSignInFinish = function(a, b, c, d, e, f) {
            var g = new kn(function() {
                g.m();
                I("phoneSignInStart", a, b, c)
            }, function() {
                ln(a, g, c, e)
            }, function() {
                g.m();
                V(a, b)
            }, function() {
                g.m();
                I("phoneSignInStart", a, b, c)
            }, Rd(c), d, C(S(a)), D(S(a)));
            g.render(b);
            Z(a, g);
            f && g.g(f)
        };
        var nn = !u && !(t("Safari") && !(jb() || t("Coast") || t("Opera") || t("Edge") || t("Silk") || t("Android")));

        function on(a, b) {
            if (/-[a-z]/.test(b)) return null;
            if (nn && a.dataset) {
                if (!(!t("Android") || jb() || t("Firefox") || t("Opera") || t("Silk") || b in a.dataset)) return null;
                a = a.dataset[b];
                return void 0 === a ? null : a
            }
            return a.getAttribute("data-" + String(b).replace(/([A-Z])/g, "-$1").toLowerCase())
        }

        function pn(a, b, c) {
            a = Yc(rk, {
                items: a
            }, null, this.w);
            yk.call(this, a, !0, !0);
            c && (c = qn(a, c)) && (c.focus(), Pj(c, a));
            M(this, a, function(a) {
                if (a = (a = ic(a.target, "firebaseui-id-list-box-dialog-button")) && on(a, "listboxid")) zk(), b(a)
            })
        }

        function qn(a, b) {
            a = (a || document).getElementsByTagName("BUTTON");
            for (var c = 0; c < a.length; c++)
                if (on(a[c], "listboxid") === b) return a[c];
            return null
        }

        function rn() {
            return K(this, "firebaseui-id-phone-number")
        }

        function sn() {
            return K(this, "firebaseui-id-country-selector")
        }

        function tn() {
            return K(this, "firebaseui-id-phone-number-error")
        }

        function un(a,
            b) {
            var c = a.a,
                d = vn("1-US-0", c),
                e = null;
            b && vn(b, c) ? e = b : d ? e = "1-US-0" : e = 0 < c.length ? c[0].c : null;
            if (!e) throw Error("No available default country");
            wn.call(this, e, a)
        }

        function vn(a, b) {
            a = Jd(a);
            return !(!a || !Ka(b, a))
        }

        function xn(a) {
            return Ha(a, function(a) {
                return {
                    id: a.c,
                    Ea: "firebaseui-flag " + yn(a),
                    label: a.name + " " + ("\u200e+" + a.b)
                }
            })
        }

        function yn(a) {
            return "firebaseui-flag-" + a.f
        }

        function zn(a) {
            var b = this;
            pn.call(this, xn(a.a), function(c) {
                wn.call(b, c, a, !0);
                b.J().focus()
            }, this.ua)
        }

        function wn(a, b, c) {
            var d = Jd(a);
            d &&
                (c && (c = Ta(J(rn.call(this)) || ""), b = Id(b, c), b.length && b[0].b != d.b && (c = "+" + d.b + c.substr(b[0].b.length + 1), kj(rn.call(this), c))), b = Jd(this.ua), this.ua = a, a = K(this, "firebaseui-id-country-selector-flag"), b && jj(a, yn(b)), ij(a, yn(d)), hc(K(this, "firebaseui-id-country-selector-code"), "\u200e+" + d.b))
        }

        function An(a, b, c, d, e, f, g, h, n, y) {
            O.call(this, jl, {
                nb: b,
                ta: n || null,
                Na: !!c,
                fa: !!f
            }, y, "phoneSignInStart", {
                H: d,
                G: e
            });
            this.I = h || null;
            this.K = b;
            this.a = a;
            this.A = c || null;
            this.Z = g || null
        }
        r(An, O);
        An.prototype.v = function() {
            this.aa(this.Z,
                this.I);
            this.O(this.a, this.A || void 0);
            this.K || Hk(this, this.J(), this.i());
            Ik(this, this.i(), this.a);
            this.J().focus();
            Im(this.J(), (this.J().value || "").length);
            An.o.v.call(this)
        };
        An.prototype.l = function() {
            this.A = this.a = null;
            An.o.l.call(this)
        };
        q(An.prototype, {
            kb: Ak,
            J: rn,
            C: tn,
            aa: function(a, b, c) {
                var d = this,
                    e = rn.call(this),
                    f = sn.call(this),
                    g = tn.call(this),
                    h = a || Od,
                    n = h.a;
                if (0 == n.length) throw Error("No available countries provided.");
                un.call(d, h, b);
                M(this, f, function() {
                    zn.call(d, h)
                });
                Xj(this, e, function() {
                    ck(g) &&
                        (L(e, !0), bk(g));
                    var a = Ta(J(e) || ""),
                        b = Jd(this.ua),
                        c = Id(h, a);
                    a = vn("1-US-0", n);
                    c.length && c[0].b != b.b && (b = c[0], wn.call(d, "1" == b.b && a ? "1-US-0" : b.c, h))
                });
                c && Yj(this, e, function() {
                    c()
                })
            },
            P: function(a) {
                var b = Ta(J(rn.call(this)) || "");
                a = a || Od;
                var c = a.a,
                    d = Id(Od, b);
                if (d.length && !Ka(c, d[0])) throw kj(rn.call(this)), rn.call(this).focus(), N(tn.call(this), x("The country code provided is not supported.").toString()), Error("The country code provided is not supported.");
                c = Jd(this.ua);
                d.length && d[0].b != c.b && wn.call(this,
                    d[0].c, a);
                d.length && (b = b.substr(d[0].b.length + 1));
                return b ? new Pd(this.ua, b) : null
            },
            qa: sn,
            T: function() {
                return K(this, "firebaseui-recaptcha-container")
            },
            s: function() {
                return K(this, "firebaseui-id-recaptcha-error")
            },
            i: ll,
            pa: Q,
            O: ml
        });

        function Bn(a, b, c, d) {
            try {
                var e = b.P(Ri)
            } catch (f) {
                return
            }
            e ? Pi ? (b.V("mdl-spinner mdl-spinner--single-color mdl-js-spinner is-active firebaseui-progress-dialog-loading-icon", x("Verifying...").toString()), W(a, b.L(p(a.Jb, a), [Rd(e), c], function(c) {
                    var d = P(b);
                    b.V("firebaseui-icon-done",
                        x("Code sent!").toString());
                    var f = setTimeout(function() {
                        b.h();
                        b.m();
                        I("phoneSignInFinish", a, d, e, 15, c)
                    }, 1E3);
                    W(a, function() {
                        b && b.h();
                        clearTimeout(f)
                    })
                }, function(a) {
                    b.h();
                    if (!a.name || "cancel" != a.name) {
                        grecaptcha.reset(Si);
                        Pi = null;
                        var c = a && a.message || "";
                        if (a.code) switch (a.code) {
                            case "auth/too-many-requests":
                                c = x("This phone number has been used too many times").toString();
                                break;
                            case "auth/invalid-phone-number":
                            case "auth/missing-phone-number":
                                b.J().focus();
                                N(b.C(), td().toString());
                                return;
                            default:
                                c = U(a)
                        }
                        b.g(c)
                    }
                }))) :
                Qi ? N(b.s(), x("Solve the reCAPTCHA").toString()) : !Qi && d && b.i().click() : (b.J().focus(), N(b.C(), td().toString()))
        }
        H.phoneSignInStart = function(a, b, c, d) {
            var e = tg(S(a)) || {};
            Pi = null;
            Qi = !(e && "invisible" === e.size);
            var f = cm(a),
                g = xg(S(a)),
                h = f ? wg(S(a)) : null;
            g = c && c.a || g && g.c || null;
            c = c && c.ta || h;
            (h = yg(S(a))) && Nd(h);
            Ri = h ? new Hd(yg(S(a))) : Od;
            var n = new An(function(b) {
                Bn(a, n, y, !(!b || !b.keyCode))
            }, Qi, f ? null : function() {
                y.clear();
                n.m();
                V(a, b)
            }, C(S(a)), D(S(a)), f, Ri, g, c);
            n.render(b);
            Z(a, n);
            d && n.g(d);
            e.callback = function(b) {
                n.s() &&
                    bk(n.s());
                Pi = b;
                Qi || Bn(a, n, y)
            };
            e["expired-callback"] = function() {
                Pi = null
            };
            var y = new firebase.auth.RecaptchaVerifier(Qi ? n.T() : n.i(), e, mn(a).app);
            W(a, n.L(p(y.render, y), [], function(a) {
                Si = a
            }, function(c) {
                c.name && "cancel" == c.name || (c = U(c), n.m(), V(a, b, void 0, c))
            }))
        };

        function Cn(a, b, c, d, e) {
            O.call(this, il, {
                Bb: b
            }, e, "providerSignIn", {
                H: c,
                G: d
            });
            this.a = a
        }
        r(Cn, O);
        Cn.prototype.v = function() {
            this.i(this.a);
            Cn.o.v.call(this)
        };
        Cn.prototype.l = function() {
            this.a = null;
            Cn.o.l.call(this)
        };
        q(Cn.prototype, {
            i: function(a) {
                function b(b) {
                    a(b)
                }
                for (var c = this.j ? ac("firebaseui-id-idp-button", this.j || this.w.a) : [], d = 0; d < c.length; d++) {
                    var e = c[d],
                        f = on(e, "providerId");
                    M(this, e, wa(b, f))
                }
            }
        });
        H.providerSignIn = function(a, b, c) {
            var d = new Cn(function(c) {
                c == firebase.auth.EmailAuthProvider.PROVIDER_ID ? (d.m(), dm(a, b)) : c == firebase.auth.PhoneAuthProvider.PROVIDER_ID ? (d.m(), I("phoneSignInStart", a, b)) : "anonymous" == c ? $l(a, d) : Xl(a, d, c);
                Y(a);
                a.N.cancel()
            }, pg(S(a)), C(S(a)), D(S(a)));
            d.render(b);
            Z(a, d);
            c && d.g(c);
            Dn(a)
        };
        H.sendEmailLinkForSignIn = function(a, b, c, d) {
            var e =
                new om;
            e.render(b);
            Z(a, e);
            fm(a, e, c, d, function(d) {
                e.m();
                d = U(d);
                I("signIn", a, b, c, d)
            })
        };

        function En(a, b, c, d, e, f, g) {
            O.call(this, Jk, {
                email: c,
                Na: !!b,
                fa: !!f
            }, g, "signIn", {
                H: d,
                G: e
            });
            this.a = a;
            this.s = b
        }
        r(En, O);
        En.prototype.v = function() {
            this.C(this.a);
            this.I(this.a, this.s || void 0);
            this.i().focus();
            Im(this.i(), (this.i().value || "").length);
            En.o.v.call(this)
        };
        En.prototype.l = function() {
            this.s = this.a = null;
            En.o.l.call(this)
        };
        q(En.prototype, {
            i: tl,
            O: ul,
            C: vl,
            K: wl,
            A: xl,
            T: ll,
            P: Q,
            I: ml
        });
        H.signIn = function(a, b, c, d) {
            var e =
                Nl(a),
                f = e && rg(S(a)) != $f,
                g = new En(function() {
                    var b = g,
                        c = b.A() || "";
                    c && em(a, b, c)
                }, f ? null : function() {
                    g.m();
                    V(a, b, c)
                }, c, C(S(a)), D(S(a)), e);
            g.render(b);
            Z(a, g);
            d && g.g(d)
        };

        function Fn(a, b) {
            this.Y = !1;
            var c = Gn(b);
            if (Hn[c]) throw Error('An AuthUI instance already exists for the key "' + c + '"');
            Hn[c] = this;
            this.g = a;
            this.A = null;
            this.s = !1;
            In(this.g);
            this.u = firebase.initializeApp({
                apiKey: a.app.options.apiKey,
                authDomain: a.app.options.authDomain
            }, a.app.name + "-firebaseui-temp").auth();
            In(this.u);
            this.u.setPersistence &&
                this.u.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            this.ca = b;
            this.V = new Zf;
            this.a = this.J = this.i = this.D = null;
            this.j = [];
            this.X = !1;
            this.N = lh.Pa();
            this.h = this.B = null;
            this.$ = this.w = !1
        }

        function In(a) {
            a && a.INTERNAL && a.INTERNAL.logFramework && a.INTERNAL.logFramework("FirebaseUI-web")
        }
        var Hn = {};

        function Gn(a) {
            return a || "[DEFAULT]"
        }

        function Yl(a) {
            Y(a);
            a.i || (a.i = Jn(a, function(b) {
                return b && !Ci(T(a)) ? B(mn(a).getRedirectResult().then(function(a) {
                    return a
                }, function(b) {
                    if (b && "auth/email-already-in-use" ==
                        b.code && b.email && b.credential) throw b;
                    return Kn(a, b)
                })) : B(X(a).getRedirectResult().then(function(b) {
                    return jg(S(a)) && !b.user && a.h && !a.h.isAnonymous ? mn(a).getRedirectResult() : b
                }))
            }));
            return a.i
        }

        function Z(a, b) {
            Y(a);
            a.a = b
        }
        var Ln = null;

        function gm() {
            return Ln
        }

        function X(a) {
            Y(a);
            return a.u
        }

        function mn(a) {
            Y(a);
            return a.g
        }

        function T(a) {
            Y(a);
            return a.ca
        }
        k = Fn.prototype;
        k.cb = function() {
            Y(this);
            return "pending" === vi(pi, T(this)) || Mn(Wf())
        };

        function Mn(a) {
            a = new Ig(a);
            return "signIn" === (a.a.a.get(E.hb) || null) && !!a.a.a.get(E.Ta)
        }
        k.start = function(a, b) {
            Y(this);
            var c = this;
            "undefined" !== typeof this.g.languageCode && (this.A = this.g.languageCode);
            var d = "en".replace(/_/g, "-");
            this.g.languageCode = d;
            this.u.languageCode = d;
            this.s = !0;
            this.ab(b);
            var e = l.document;
            this.B ? this.B.then(function() {
                "complete" == e.readyState ? Nn(c, a) : Ff(window, "load", function() {
                    Nn(c, a)
                })
            }) : "complete" == e.readyState ? Nn(c, a) : Ff(window, "load", function() {
                Nn(c, a)
            })
        };

        function Nn(a, b) {
            var c = Vf(b);
            c.setAttribute("lang", "en".replace(/_/g, "-"));
            if (Ln) {
                var d = Ln;
                Y(d);
                Ci(T(d)) &&
                    we("UI Widget is already rendered on the page and is pending some user interaction. Only one widget instance can be rendered per page. The previous instance has been automatically reset.");
                Ln.reset()
            }
            Ln = a;
            a.J = c;
            On(a, c);
            ei(new fi) && ei(new gi) ? lm(a, b) : (b = Vf(b), c = new Fl(x("The browser you are using does not support Web Storage. Please try again in a different browser.").toString()), c.render(b), Z(a, c));
            G(pi, T(a))
        }

        function Jn(a, b) {
            if (a.w) return b(Pn(a));
            W(a, function() {
                a.w = !1
            });
            if (jg(S(a))) {
                var c = new A(function(c) {
                    W(a,
                        a.g.onAuthStateChanged(function(d) {
                            a.h = d;
                            a.w || (a.w = !0, c(b(Pn(a))))
                        }))
                });
                W(a, c);
                return c
            }
            a.w = !0;
            return b(null)
        }

        function Pn(a) {
            Y(a);
            return jg(S(a)) && a.h && a.h.isAnonymous ? a.h : null
        }

        function W(a, b) {
            Y(a);
            if (b) {
                a.j.push(b);
                var c = function() {
                    Oa(a.j, function(a) {
                        return a == b
                    })
                };
                "function" != typeof b && b.then(c, c)
            }
        }
        k.disableAutoSignIn = function() {
            Y(this);
            this.X = !0
        };

        function Qn(a) {
            Y(a);
            var b;
            (b = a.X) || (a = S(a), a = vg(a, firebase.auth.GoogleAuthProvider.PROVIDER_ID), b = !(!a || "select_account" !== a.prompt));
            return b
        }

        function Sl(a) {
            "undefined" !==
            typeof a.g.languageCode && a.s && (a.s = !1, a.g.languageCode = a.A)
        }
        k.reset = function() {
            Y(this);
            var a = this;
            this.J && this.J.removeAttribute("lang");
            this.D && Tg(this.D);
            Sl(this);
            mm();
            G(pi, T(this));
            Y(this);
            this.N.cancel();
            this.i = B({
                user: null,
                credential: null
            });
            Ln == this && (Ln = null);
            this.J = null;
            for (var b = 0; b < this.j.length; b++)
                if ("function" == typeof this.j[b]) this.j[b]();
                else this.j[b].cancel && this.j[b].cancel();
            this.j = [];
            G(oi, T(this));
            this.a && (this.a.m(), this.a = null);
            this.F = null;
            this.u && (this.B = vm(this).then(function() {
                a.B =
                    null
            }, function() {
                a.B = null
            }))
        };

        function On(a, b) {
            a.F = null;
            a.D = new Ug(b);
            a.D.register();
            Ef(a.D, "pageEnter", function(b) {
                b = b && b.pageId;
                if (a.F != b) {
                    var c = S(a);
                    (c = Fg(c).uiChanged || null) && c(a.F, b);
                    a.F = b
                }
            })
        }
        k.ab = function(a) {
            Y(this);
            var b = this.V,
                c;
            for (c in a) try {
                Bd(b.a, c, a[c])
            } catch (d) {
                re('Invalid config: "' + c + '"', void 0)
            }
            sb && Bd(b.a, "popupMode", !1);
            yg(b);
            !this.$ && Gg(S(this)) && (we("signInSuccess callback is deprecated. Please use signInSuccessWithAuthResult callback instead."), this.$ = !0)
        };

        function S(a) {
            Y(a);
            return a.V
        }
        k.Db = function() {
            Y(this);
            var a = S(this),
                b = Cd(a.a, "widgetUrl");
            var c = hg(a, b);
            S(this).a.get("popupMode") ? (a = (window.screen.availHeight - 600) / 2, b = (window.screen.availWidth - 500) / 2, c = c || "about:blank", a = {
                width: 500,
                height: 600,
                top: 0 < a ? a : 0,
                left: 0 < b ? b : 0,
                location: !0,
                resizable: !0,
                statusbar: !0,
                toolbar: !1
            }, a.target = a.target || c.target || "google_popup", a.width = a.width || 690, a.height = a.height || 500, (a = Rf(c, a)) && a.focus()) : Sf(c)
        };

        function Y(a) {
            if (a.Y) throw Error("AuthUI instance is deleted!");
        }
        k.pb = function() {
            var a =
                this;
            Y(this);
            return this.u.app.delete().then(function() {
                var b = Gn(T(a));
                delete Hn[b];
                a.reset();
                a.Y = !0
            })
        };

        function Dn(a) {
            Y(a);
            try {
                nh(a.N, qg(S(a)), Qn(a)).then(function(b) {
                    return a.a ? am(a, a.a, b) : !1
                })
            } catch (b) {}
        }
        k.qb = function(a, b) {
            Y(this);
            var c = this,
                d = Yf();
            if (!Ag(S(this))) throw Error("Email link sign-in should be enabled to trigger email sending.");
            var e = Cg(S(this)),
                f = new Ig(e.url);
            Jg(f, d);
            b && b.a && (Hi(d, b, T(this)), Mg(f, b.a.providerId));
            Kg(f, Bg(S(this)));
            return Jn(this, function(b) {
                b && ((b = b.uid) ? f.a.a.set(E.Ha,
                    b) : Sc(f.a.a, E.Ha));
                e.url = f.toString();
                return X(c).sendSignInLinkToEmail(a, e)
            }).then(function() {
                var b = T(c),
                    e = {};
                e.email = a;
                wi(ti, Th(d, JSON.stringify(e)), b)
            }, function(a) {
                G(ui, T(c));
                G(ti, T(c));
                throw a;
            })
        };

        function Nm(a, b) {
            var c = Lg(new Ig(b));
            if (!c) return B(null);
            b = new A(function(b, e) {
                var d = mn(a).onAuthStateChanged(function(a) {
                    d();
                    a && a.isAnonymous && a.uid === c ? b(a) : a && a.isAnonymous && a.uid !== c ? e(Error("anonymous-user-mismatch")) : e(Error("anonymous-user-not-found"))
                });
                W(a, d)
            });
            W(a, b);
            return b
        }

        function Rm(a,
            b, c, d, e) {
            Y(a);
            var f = e || null,
                g = firebase.auth.EmailAuthProvider.credentialWithLink(c, d);
            c = f ? X(a).signInWithEmailLink(c, d).then(function(a) {
                return a.user.linkAndRetrieveDataWithCredential(f)
            }).then(function() {
                return vm(a)
            }).then(function() {
                return Kn(a, {
                    code: "auth/email-already-in-use"
                }, f)
            }) : X(a).fetchSignInMethodsForEmail(c).then(function(c) {
                return c.length ? Kn(a, {
                    code: "auth/email-already-in-use"
                }, g) : b.linkAndRetrieveDataWithCredential(g)
            });
            W(a, c);
            return c
        }

        function Sm(a, b, c, d) {
            Y(a);
            var e = d || null,
                f;
            b =
                X(a).signInWithEmailLink(b, c).then(function(a) {
                    f = {
                        user: a.user,
                        credential: null,
                        operationType: a.operationType,
                        additionalUserInfo: a.additionalUserInfo
                    };
                    if (e) return a.user.linkAndRetrieveDataWithCredential(e).then(function(a) {
                        f = {
                            user: a.user,
                            credential: e,
                            operationType: f.operationType,
                            additionalUserInfo: a.additionalUserInfo
                        }
                    })
                }).then(function() {
                    vm(a)
                }).then(function() {
                    return mn(a).updateCurrentUser(f.user)
                }).then(function() {
                    f.user = mn(a).currentUser;
                    return f
                });
            W(a, b);
            return b
        }

        function mm() {
            var a = Wf();
            if (Mn(a)) {
                a =
                    new Ig(a);
                for (var b in E) E.hasOwnProperty(b) && Sc(a.a.a, E[b]);
                b = {
                    state: "signIn",
                    mode: "emailLink",
                    operation: "clear"
                };
                var c = l.document.title;
                l.history && l.history.replaceState && l.history.replaceState(b, c, a.toString())
            }
        }
        k.Ib = function(a, b) {
            Y(this);
            var c = this;
            return X(this).signInWithEmailAndPassword(a, b).then(function(d) {
                return Jn(c, function(e) {
                    return e ? vm(c).then(function() {
                        return Kn(c, {
                            code: "auth/email-already-in-use"
                        }, firebase.auth.EmailAuthProvider.credential(a, b))
                    }) : d
                })
            })
        };
        k.Fb = function(a, b) {
            Y(this);
            var c = this;
            return Jn(this, function(d) {
                if (d) {
                    var e = firebase.auth.EmailAuthProvider.credential(a, b);
                    return d.linkAndRetrieveDataWithCredential(e)
                }
                return X(c).createUserWithEmailAndPassword(a, b)
            })
        };
        k.Hb = function(a) {
            Y(this);
            var b = this;
            return Jn(this, function(c) {
                return c ? c.linkAndRetrieveDataWithCredential(a).then(function(a) {
                    return a
                }, function(c) {
                    if (c && "auth/email-already-in-use" == c.code && c.email && c.credential) throw c;
                    return Kn(b, c, a)
                }) : X(b).signInAndRetrieveDataWithCredential(a)
            })
        };

        function Zl(a, b) {
            Y(a);
            return Jn(a, function(c) {
                return c && !Ci(T(a)) ? c.linkWithPopup(b).then(function(a) {
                    return a
                }, function(b) {
                    if (b && "auth/email-already-in-use" == b.code && b.email && b.credential) throw b;
                    return Kn(a, b)
                }) : X(a).signInWithPopup(b)
            })
        }
        k.Kb = function(a) {
            Y(this);
            var b = this,
                c = this.i;
            this.i = null;
            return Jn(this, function(c) {
                return c && !Ci(T(b)) ? c.linkWithRedirect(a) : X(b).signInWithRedirect(a)
            }).then(function() {}, function(a) {
                b.i = c;
                throw a;
            })
        };
        k.Jb = function(a, b) {
            Y(this);
            var c = this;
            return Jn(this, function(d) {
                return d ? d.linkWithPhoneNumber(a,
                    b).then(function(a) {
                    return new ph(a, function(a) {
                        if ("auth/credential-already-in-use" == a.code) return Kn(c, a);
                        throw a;
                    })
                }) : mn(c).signInWithPhoneNumber(a, b).then(function(a) {
                    return new ph(a)
                })
            })
        };
        k.Gb = function() {
            Y(this);
            return mn(this).signInAnonymously()
        };

        function Ul(a, b) {
            Y(a);
            return Jn(a, function(c) {
                if (a.h && !a.h.isAnonymous && jg(S(a)) && !X(a).currentUser) return vm(a).then(function() {
                    "password" == b.credential.providerId && (b.credential = null);
                    return b
                });
                if (c) return vm(a).then(function() {
                    return c.linkAndRetrieveDataWithCredential(b.credential)
                }).then(function(a) {
                    b.user =
                        a.user;
                    b.credential = a.credential;
                    b.operationType = a.operationType;
                    b.additionalUserInfo = a.additionalUserInfo;
                    return b
                }, function(c) {
                    if (c && "auth/email-already-in-use" == c.code && c.email && c.credential) throw c;
                    return Kn(a, c, b.credential)
                });
                if (!b.user) throw Error('Internal error: An incompatible or outdated version of "firebase.js" may be used.');
                return vm(a).then(function() {
                    return mn(a).updateCurrentUser(b.user)
                }).then(function() {
                    b.user = mn(a).currentUser;
                    b.operationType = "signIn";
                    b.credential && b.credential.providerId &&
                        "password" == b.credential.providerId && (b.credential = null);
                    return b
                })
            })
        }
        k.Eb = function(a, b) {
            Y(this);
            return X(this).signInWithEmailAndPassword(a, b)
        };

        function vm(a) {
            Y(a);
            return X(a).signOut()
        }

        function Kn(a, b, c) {
            Y(a);
            if (b && b.code && ("auth/email-already-in-use" == b.code || "auth/credential-already-in-use" == b.code)) {
                var d = kg(S(a));
                return B().then(function() {
                    return d(new xd("anonymous-upgrade-merge-conflict", null, c || b.credential))
                }).then(function() {
                    a.a && (a.a.m(), a.a = null);
                    throw b;
                })
            }
            return Xe(b)
        }
        ya("firebaseui.auth.AuthUI",
            Fn);
        ya("firebaseui.auth.AuthUI.getInstance", function(a) {
            a = Gn(a);
            return Hn[a] ? Hn[a] : null
        });
        ya("firebaseui.auth.AuthUI.prototype.disableAutoSignIn", Fn.prototype.disableAutoSignIn);
        ya("firebaseui.auth.AuthUI.prototype.start", Fn.prototype.start);
        ya("firebaseui.auth.AuthUI.prototype.setConfig", Fn.prototype.ab);
        ya("firebaseui.auth.AuthUI.prototype.signIn", Fn.prototype.Db);
        ya("firebaseui.auth.AuthUI.prototype.reset", Fn.prototype.reset);
        ya("firebaseui.auth.AuthUI.prototype.delete", Fn.prototype.pb);
        ya("firebaseui.auth.AuthUI.prototype.isPendingRedirect",
            Fn.prototype.cb);
        ya("firebaseui.auth.AuthUIError", xd);
        ya("firebaseui.auth.AuthUIError.prototype.toJSON", xd.prototype.toJSON);
        ya("firebaseui.auth.CredentialHelper.ACCOUNT_CHOOSER_COM", $f);
        ya("firebaseui.auth.CredentialHelper.GOOGLE_YOLO", "googleyolo");
        ya("firebaseui.auth.CredentialHelper.NONE", "none");
        ya("firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID", "anonymous")
    })();
})();