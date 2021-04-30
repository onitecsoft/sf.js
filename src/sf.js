document.addEventListener("DOMContentLoaded", function () { sf.init(); });
var sf = {
	scope: this,
	settings: {
		css: {
			invalid: 'is-invalid',
			valid: 'is-valid'
		}
	},
	init: function (container) {
		var instances = [];
		sf.core.loop((container || document).querySelectorAll("[sf]"), function (e) {
			instances.push(sf.data.set(e.getAttribute('sf'), sf.scope, new sf.sf(e)));
		});
		sf.core.loop(instances, function (i) {
			if (i.preload) i.preload(i);
		});
	},
	sf: function (container) {
		var that = this;
		this.preload = null;
		this.model = null;
		this.container = container;
		this.load = function (model) {
			if (arguments.length > 0) that.model = model;
			that.binder.load(that.container, that.model);
		}
		this.validate = function (props) {
			var m = {};
			if (props) sf.core.loop([].concat(props), function (i) { sf.data.set(i, m, sf.data.get(i, that.model)); });
			that.binder.save(that.container, m);
			if (that.binder.validate(that.container, m)) return m;
		}
		this.save = function () {
			that.binder.save(that.container, that.model);
			return that.model;
		}
		this.listen = function (eg, type, handler) {
			var e = eg(that.container);
			e.addEventListener(type, function (ea) { handler({ event: ea, element: e, model: that.model, container: that.container }); });
		}
		this.binder = new sf.binder(this);
	},
	tpl: function (container) {
		var that = this;
		this.events = [];
		this.content = document.createDocumentFragment();
		this.container = document.createDocumentFragment();
		while (container.firstChild) that.container.appendChild(container.firstChild);
		this.load = function (container, model) {
			if (model) {
				var t = that.container.cloneNode(true);
				that.binder.load(t, model);
				sf.core.loop(that.events, function (ev) {
					var e = ev.eg(t);
					e.addEventListener(ev.type, function (ea) { ev.handler({ event: ea, element: e, model: model, container: container }); });
				});
				that.content.appendChild(t);
			}
		}
		this.render = function (container, model) {
			if (model) that.load(container, model);
			while (container.lastChild) container.removeChild(container.lastChild);
			container.appendChild(that.content);
		}
		this.listen = function (eg, type, handler) {
			that.events.push({ eg: eg, type: type, handler: handler });
		}
		this.binder = new sf.binder(this);
	},
	binder: function (owner) {
		var that = this;
		this.loads = [];
		this.saves = [];
		this.valids = [];
		this.bind = function (e, path) {
			if (e.attributes) {
				var attrs = Array.from(e.attributes);
				sf.core.loop(attrs, function (a) {
					if (sf.data.starts(a.name, 'sf-')) {
						var sfa = a.name.substr(3).split(/\-(.+)/);
						var act = sf.action[sfa[0]];
						if (act) {
							var eg = sf.data.getter(path);
							e.removeAttribute(a.name);
							var hi = act.init ? act.init(e, sfa[1], a.value, owner, eg) : null;
							if (act.preload) owner.preload = act.preload(a.value);
							if (act.load) that.loads.push({ eg: eg, hi: hi, act: act.load });
							if (act.save) that.saves.push({ eg: eg, hi: hi, act: act.save });
							if (act.validate) that.valids.push({ eg: eg, hi: hi, act: act.validate });
						}
					}
				});
			}
			sf.core.loop(e.children, function (ec, i) {
				if (!ec.hasAttribute('sf')) that.bind(ec, path + (path ? '.' : '') + 'children.' + i);
			});
		}
		this.load = function (container, model) {
			sf.core.loop(that.loads, function (h) { h.act.call(h.hi, h.eg(container), model); });
			sf.core.loop(that.valids, function (h) { h.act.call(h.hi, h.eg(container), model, true); });
		}
		this.save = function (container, model) {
			sf.core.loop(that.saves, function (h) { h.act.call(h.hi, h.eg(container), model); });
		}
		this.validate = function (container, model) {
			var valid = true;
			sf.core.loop(that.valids, function (h) { if (!h.act.call(h.hi, h.eg(container), model)) valid = false; });
			return valid;
		}
		this.bind(owner.container, '');
	},
	action: {
		load: {
			preload: function (v) {
				var m = v ? sf.data.get(v, sf.scope) : null;
				return typeof m === 'function' ? m : function (s) { s.load(m); };
			}
		},
		src: {
			init: function (e, a, v) { return { format: e.innerHTML, getter: sf.core.binder(v, 'load') }; },
			load: function (e, m) { sf.data.set('innerHTML', e, sf.to(this.format, this.getter.call(e, m))); }
		},
		set: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, a ? 'load' : null), prop: sf.core.dashToCc(a) }; },
			load: function (e, m) {
				if (this.prop) sf.data.set(this.prop, e, this.getter.call(e, m));
				else this.getter.call(e, m);
			}
		},
		get: {
			init: function (e, a, v) { return { setter: sf.core.binder(v, 'save'), prop: sf.core.dashToCc(a) }; },
			save: function (e, m) {
				if (this.prop) this.setter.call(e, m, sf.data.get(this.prop, e));
				else this.setter.call(e, m);
			}
		},
		bind: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, a ? 'load' : null), setter: sf.core.binder(v, 'save'), prop: sf.core.dashToCc(a) }; },
			load: function (e, m) { sf.action.set.load.call(this, e, m); },
			save: function (e, m) { sf.action.get.save.call(this, e, m); }
		},
		attr: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, 'load'), attr: a }; },
			load: function (e, m) { e.setAttribute(this.attr, this.getter.call(e, m)); }
		},
		visible: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, 'load') }; },
			load: function (e, m) { e.hidden = !this.getter.call(e, m); }
		},
		class: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, 'load'), c: a }; },
			load: function (e, m) { sf.core.toggleClass(e, this.c, this.getter.call(e, m)); }
		},
		html: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, 'load') }; },
			load: function (e, m) {
				sf.data.set('innerHTML', e, this.getter.call(e, m));
				sf.core.loop(e.getElementsByTagName('script'), function (s) {
					var ns = document.createElement("script");
					ns.text = s.innerHTML;
					sf.core.loop(s.attributes, function (a) { ns.setAttribute(a.name, a.value); });
					s.parentNode.replaceChild(ns, s);
				});
				sf.init(e);
			}
		},
		required: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, 'load'), c: a || sf.settings.css.invalid }; },
			validate: function (e, m, reset) {
				var has = reset || sf.core.hasValue(this.getter.call(e, m));
				sf.core.toggleClass(e, this.c, !has);
				return has;
			}
		},
		each: {
			init: function (e, a, v) { return { getter: sf.core.binder(v, 'load'), tpl: new sf.tpl(e) }; },
			load: function (e, m) { var t = this.tpl; sf.core.loop(this.getter.call(e, m), function (i) { t.load(e, i); }); t.render(e); }
		},
		tpl: {
			init: function (e, a, v) { return { tpl: new sf.tpl(e) }; },
			load: function (e, m) { this.tpl.render(e, m); },
			save: function (e, m) { this.tpl.binder.save(e, m); }
		},
		on: {
			init: function (e, a, v, o, eg) { o.listen(eg, a, sf.core.binder(v)); }
		},
		select: {
			init: function (e, a, v, o, eg) {
				var h = sf.core.binder(v);
				o.listen(eg, 'click', function (e) {
					sf.core.loop(e.container.children, function (c) { sf.core.toggleClass(c, 'selected', e.element == c); });
					h(e);
				});
			}
		},
		sort: {
			init: function (e, a, v, o, eg) {
				var s = { getter: sf.core.binder(v, 'load'), dir: a };
				o.listen(eg, 'click', function (e) {
					sf.data.sort(o.model, { dir: s.dir, method: s.getter });
					s.dir = s.dir == 'desc' ? 'asc' : 'desc';
					o.load();
				});
			}
		}
	},
	core: {
		loop: function (arr, func) {
			if (arr) for (var i = 0; i < arr.length; i++) func(arr[i], i);
		},
		hasValue: function (v) { return !(v === '' || v == null); },
		toggleClass: function (element, className, toggle) {
			if (arguments.length < 3) toggle = !element.classList.contains(className);
			if (toggle) element.classList.add(className);
			else element.classList.remove(className);
		},
		dashToCc: function (s) {
			return (s || '').replace(/-([^-])/g, function (o, m) { return m.toUpperCase(); });
		},
		binder: function (expr, type) {
			if (expr[0] == '=') return new Function("data", "value", (type == 'load' ? 'return ' : '') + expr.substr(1));
			expr = expr.split(':');
			var g = sf.data.getter(expr[0]);
			var fg = expr[1] ? sf.data.getter(expr[1]) : null;
			if (type == 'save') {
				if (!expr[0]) g = null;
				var f = fg ? fg(sf.scope) : null;
				if (f && g) return function (m, v) { g(m, f.call(this, v)); }
				return f || g || function () { };
			}
			else if (type == 'load') return fg ? function (m) { return fg(sf.scope).call(this, g(m)); } : g;
			else return fg ? function (m) { fg(sf.scope).call(this, g(m)); } : function (m) { var gg = g(sf.scope); if (gg != sf.scope) gg.call(this, m); };
		}
	},
	data: {
		getter: function (property) {
			if (!property) return function (o) { return o; };
			var a = property.toString().replace(/\\?\./g, function (t) { return t == '.' ? '\u000B' : '.'; }).split('\u000B');
			var f = null;
			sf.core.loop(a, function (p, i) { f = sf.data._g(p, f, i + 1 == a.length); });
			return f;
		},
		_g: function (p, f, last) {
			return function (o, v) {
				var r = f ? (arguments.length > 1 ? f(o, v) : f(o)) : o;
				if (arguments.length > 1) { if (last) r[p] = v === undefined ? null : v; else if (!r[p]) r[p] = {}; }
				return r && r[p];
			}
		},
		get: function (property, dataItem) {
			return this.getter(property)(dataItem);
		},
		set: function (property, dataItem, value) {
			return this.getter(property)(dataItem, value);
		},
		sort: function (data, options) {
			if (data && data.length > 0) {
				if (options == null || typeof options == 'string') {
					if (options == 'desc') data.sort(function (x, y) { return x < y; });
					else data.sort(function (x, y) { return x > y; });
				}
				else {
					var s = [].concat(options), f = undefined;
					for (var i = 0; i < s.length; i++) {
						var d = s[i].dir == 'desc' ? -1 : 1;
						if (!s[i].method) s[i].method = this.getter(s[i].field);
						f = this._sortf(s[i].method, d, f);
					}
					data.sort(f);
				}
			}
		},
		group: function (data, by, aggregates, callback) {
			if (data) {
				var afs = [], gd = [], m = {}, aa = [], f = '';
				if (aggregates) {
					var af = function (a, f, fg, fs) {
						var s = sf.data.getter(f);
						if (fs.indexOf(f) == -1) {
							var fn = a == 'avg' ? '_sum' : '_' + a;
							afs.push(function (i, d, g) { sf.data[fn](g[a], fg(d), s); });
							fs.push(f);
						}
					}
					for (var a in aggregates) {
						if (a == 'custom') afs = afs.concat(aggregates[a]);
						else if (['sum', 'avg', 'min', 'max'].indexOf(a) >= 0) {
							aa.push(a);
							var ap = [].concat(aggregates[a]), fs = [];
							for (var i = 0; i < ap.length; i++) {
								if (typeof ap[i] == 'string') af(a, ap[i], this.getter(ap[i]), fs);
								else for (var j in ap[i]) af(a, j, ap[i][j], fs);
							}
						}
					}
				}
				if (data.length > 0) {
					var gg = [].concat(by);
					var gf = function (d, v, g) {
						var n = v.length;
						v.push(gg[n] ? gg[n](d) : '');
						var k = JSON.stringify(v);
						if (!m[k]) {
							m[k] = new sf.data._group(n, d, aa);
							if (gg[n]) m[k].value = v[n];
							if (g) g.items.push(m[k]); else gd.push(m[k]);
						}
						m[k].last = d;
						m[k].count++;
						if (n == gg.length - 1) m[k].items.push(d);
						return m[k];
					}
					for (var i = 0; i < gg.length; i++) {
						if (gg && typeof gg[i] == 'string') gg[i] = this.getter(gg[i]);
						f += 'g=gf(d,v,g);';
						for (var j = 0; j < afs.length; j++) f += 'afs[' + j + '](i,d,g);';
					}
					if (callback) f += 'callback(i,d,g);';
					f = eval('(function(i,d){var v=[],g=null;' + f + '})');
					for (var i = 0, c = data.length; i < c; i++) f(i, data[i]);
					if (gd[0].avg) this.groups(gd, function (k, g) { for (var i in g.avg) g.avg[i] = g.avg[i] / (g.count || 1); });
				}
				else gd.push(new sf.data._group(0, null, aa));
				return gd;
			}
			return data;
		},
		groups: function (groups, callback) {
			if (groups && callback && groups[0] instanceof sf.data._group) {
				for (var i = 0; i < groups.length; i++) {
					callback(i, groups[i]);
					this.groups(groups[i].items, callback);
				}
			}
		},
		filter: function (data, filters, operator) {
			if (data && data.length > 0 && filters) {
				filters = [].concat(filters);
				if (filters.length > 0) {
					var d = [];
					var f = operator == 'or' ? function (o) {
						for (var j = 0; j < filters.length; j++) if (filters[j].call(o, o)) return true; return false;
					} : function (o) {
						for (var j = 0; j < filters.length; j++) if (!filters[j].call(o, o)) return false; return true;
					};
					for (var i = 0, c = data.length; i < c; i++) if (f(data[i])) d.push(data[i]);
					return d;
				}
			}
			return data;
		},
		sum: function (data, field) {
			return this._aggr(data, field, this._sum);
		},
		min: function (data, field) {
			return this._aggr(data, field, this._min);
		},
		max: function (data, field) {
			return this._aggr(data, field, this._max);
		},
		avg: function (data, field) {
			return data && data.length > 0 ? this.sum(data, field) / data.length : 0;
		},
		contains: function (str, substr, cs) {
			return this._ns(str, cs).indexOf(this._ns(substr, cs)) > -1;
		},
		starts: function (str, substr, cs) {
			return this._ns(str, cs).indexOf(this._ns(substr, cs)) == 0;
		},
		ends: function (str, substr, cs) {
			var s = this._ns(str, cs);
			var m = this._ns(substr, cs);
			return s.indexOf(m, s.length - m.length) > -1;
		},
		_sortf: function (m, d, f) {
			var sf = function (x, y) {
				var sx = m.call(x, x), sy = m.call(y, y);
				if (sy === undefined || sx > sy) return d;
				if (sx === undefined || sx < sy) return -d;
				return 0;
			}
			if (f) return function (x, y) { return f(x, y) || sf(x, y); }
			else return sf;
		},
		_group: function (i, d, a) {
			for (var k = 0; k < a.length; k++) this[a[k]] = {};
			this.items = [];
			this.level = i;
			this.count = 0;
			this.first = d;
			return this;
		},
		_aggr: function (d, f, a) {
			var m = { v: undefined };
			if (d && d.length > 0) {
				var g = f ? this.getter(f) : null;
				if (g) for (var i = 0, c = d.length; i < c; i++) a(m, g(d[i]), this.getter('v'));
				else for (var i = 0, c = d.length; i < c; i++) a(m, d[i], this.getter('v'));
			}
			return m.v;
		},
		_max: function (o, v, g) {
			var r = g(o);
			if (r === undefined || v > r) g(o, v);
		},
		_min: function (o, v, g) {
			var r = g(o);
			if (r === undefined || v < r) g(o, v);
		},
		_sum: function (o, v, g) {
			var r = g(o);
			if (r == null) g(o, v);
			else if (v) g(o, r + v);
		},
		_ns: function (str, cs) {
			var s = str != null ? str.toString() : '';
			return cs ? s : s.toLocaleLowerCase();
		}
	},
	to: function (format) {
		if (format) {
			var args = arguments;
			return format.replace(/\{(\d+):?([^\}]*)\}|^[^{}]+$/g, function (f, i, p) {
				var v = args[parseInt(i || 0) + 1];
				if (v == null) return '';
				if (i == null) p = f;
				if (p && v != '') {
					v = sf.parse(v);
					if (typeof v == 'number') return sf._to.nto(v, p);
					if (v.getMonth) return sf._to.dto(v, p);
				}
				return v;
			});
		}
		else return arguments[1] != null ? arguments[1] : '';
	},
	parse: function (value) {
		if (typeof value != 'string') return value;
		if (value == '') return null;
		if (value.indexOf('/Date(') == 0) {
			var v = new Date(parseInt(value.substr(6)));
			return new Date(v.getTime() + v.getTimezoneOffset() * 60000);
		}
		if ((m = value.match(/^\d{4}-\d{2}-\d{2}[T ]?(\d{2}:\d{2}:\d{2})?(\.\d+)?/)) != null) {
			var v = new Date(m[0] + "Z");
			return new Date(v.getTime() + v.getTimezoneOffset() * 60000);
		}
		if (sf._to.ntest(value)) {
			value = value.replace(new RegExp(sf.culture.number.group, 'g'), '');
			if (value.indexOf(sf.culture.number.decimal) > 0) {
				if (sf.culture.number.decimal != '.') value = value.replace(sf.culture.number.decimal, '.');
				return parseFloat(value);
			}
			else return parseInt(value);
		}
		throw 'sf.parse: unrecognized string: ' + value;
	},
	_to: {
		ntest: function (v) {
			return new RegExp('^-?[\\d\\' + sf.culture.number.group + ']+\\' + sf.culture.number.decimal + '?\\d*$', '').test(v);
		},
		nto: function (n, f) {
			f = sf.culture.number.patterns[f] || f;
			var parts = f.split('.');
			var decimals = 0;
			var showGroup = parts[0].indexOf(',') >= 0;
			var zeroPad = (parts[0].match(/0/g) || []).length;
			var negative = n < 0;

			if (parts.length == 2) {
				var curd = (n.toString().split('.')[1] || '').length;
				var mind = (parts[1].match(/0/g) || []).length;
				var maxd = (mind + (parts[1].match(/#/g) || []).length) || curd;
				decimals = curd <= mind ? mind : (curd <= maxd ? curd : maxd);
			}

			var value = Math.abs(n).toFixed(decimals).split('.');
			while (value[0].length < zeroPad) { value[0] = '0' + value[0]; }
			if (showGroup) value[0] = value[0].replace(/\B(?=(\d{3})+(?!\d))/g, sf.culture.number.group);
			return (negative ? '-' : '') + value.join(sf.culture.number.decimal);
		},
		dto: function (d, f) {
			var h = d.getHours();
			var ampm = sf.culture.date.ampm ? (h > 11 ? sf.culture.date.pm : sf.culture.date.am) : '';
			h = sf.culture.date.ampm ? (h > 12 ? h - 12 : (h == 0 ? 12 : h)) : h;
			f = sf.culture.date.patterns[f] || f;
			f = f.replace(/dd|d|MMMM|MMM|MM|M|yyyy|yy|hh|h|mm|m|ss|s|tt|t|aaa|aa|a/g, function (s) {
				if (s == 'dd') { var v = d.getDate(); return v < 10 ? '0' + v : v; }
				if (s == 'd') return d.getDate();
				if (s == 'MMMM') return sf.culture.date.MMMM[d.getMonth()];
				if (s == 'MMM') return sf.culture.date.MMM[d.getMonth()];
				if (s == 'MM') { var v = d.getMonth() + 1; return v < 10 ? '0' + v : v; }
				if (s == 'M') return d.getMonth() + 1;
				if (s == 'yyyy') return d.getFullYear();
				if (s == 'yy') return d.getFullYear().toString().substr(2, 2);
				if (s == 'hh') return h < 10 ? '0' + h : h;
				if (s == 'h') return h;
				if (s == 'mm') { var v = d.getMinutes(); return v < 10 ? '0' + v : v; }
				if (s == 'm') return d.getMinutes();
				if (s == 'ss') { var v = d.getSeconds(); return v < 10 ? '0' + v : v; }
				if (s == 's') return d.getSeconds();
				if (s == 'tt') return ampm;
				if (s == 't') return ampm.substr(0, 1);
				if (s == 'aaa') return sf.culture.date.aaa[d.getDay()];
				if (s == 'aa') return sf.culture.date.aa[d.getDay()];
				if (s == 'a') return sf.culture.date.a[d.getDay()];
			});
			return f;
		}
	}
}
