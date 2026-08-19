//#region \0rolldown/runtime.js
var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, i = Object.getPrototypeOf, a = Object.prototype.hasOwnProperty, o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t), e = null), t.exports), s = (e, i, o, s) => {
	if (i && typeof i == "object" || typeof i == "function") for (var c = r(i), l = 0, u = c.length, d; l < u; l++) d = c[l], !a.call(e, d) && d !== o && t(e, d, {
		get: ((e) => i[e]).bind(null, d),
		enumerable: !(s = n(i, d)) || s.enumerable
	});
	return e;
}, c = (n, r, a) => (a = n == null ? {} : e(i(n)), s(r || !n || !n.__esModule ? t(a, "default", {
	value: n,
	enumerable: !0
}) : a, n)), l = "ha-lucarne", u = "lucarne_error_", d = 6e4, f = 5, p = 50, m = null, h = !1, g = !1, _ = /* @__PURE__ */ new Map(), v = [], y = null, ee = null;
function te(e, t) {
	e && (m = e), t && (h = !0), ne();
}
function ne() {
	if (!h || !m || v.length === 0) return;
	let e = v;
	v = [];
	for (let { error: t, context: n } of e) E(t, n);
}
function b(e) {
	if (e instanceof Error) {
		var t;
		let n = ((t = (e.stack ?? "").split("\n")[1]) == null ? void 0 : t.trim()) ?? "";
		return `${e.name}: ${e.message} @ ${n}`;
	}
	return String(e);
}
function x(e, t) {
	return !!(t && t.includes(l) || e instanceof Error && (e.stack ?? "").includes(l));
}
function S(e) {
	return e instanceof Error ? (e.stack ?? `${e.name}: ${e.message}`).split("\n").slice(0, 6).join("\n") : String(e);
}
function C(e) {
	let t = 5381;
	for (let n = 0; n < e.length; n++) t = (t << 5) + t + e.charCodeAt(n) | 0;
	return (t >>> 0).toString(36);
}
function w() {
	return typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now();
}
function T(e, t) {
	try {
		if (console.error(`[lucarne] card error in ${t}:`, e), !h || !m) {
			v.push({
				error: e,
				context: t
			}), v.length > f && v.shift();
			return;
		}
		E(e, t);
	} catch {}
}
function E(e, t) {
	try {
		if (!m) return;
		let n = b(e), r = w(), i = _.get(n);
		if (i !== void 0 && r - i < d || _.size >= p && (D(r), _.size >= p)) return;
		_.set(n, r), m.callService("persistent_notification", "create", {
			notification_id: u + C(n),
			title: `Lucarne card error (${t})`,
			message: [
				"```",
				S(e),
				"```"
			].join("\n")
		}).catch(() => {});
	} catch {}
}
function D(e) {
	for (let [t, n] of _) e - n >= d && _.delete(t);
}
function re() {
	g || typeof window > "u" || typeof window.addEventListener != "function" || (g = !0, y = (e) => {
		x(e.error, e.filename) && T(e.error ?? Error(e.message), "window.onerror");
	}, ee = (e) => {
		x(e.reason) && T(e.reason, "unhandledrejection");
	}, window.addEventListener("error", y), window.addEventListener("unhandledrejection", ee));
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var O = globalThis, k = O.ShadowRoot && (O.ShadyCSS === void 0 || O.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, A = Symbol(), j = /* @__PURE__ */ new WeakMap(), ie = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== A) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (k && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = j.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && j.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, ae = (e) => new ie(typeof e == "string" ? e : e + "", void 0, A), M = (e, ...t) => new ie(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, A), oe = (e, t) => {
	if (k) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = O.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, se = k ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return ae(t);
})(e) : e, ce, { is: le, defineProperty: ue, getOwnPropertyDescriptor: de, getOwnPropertyNames: fe, getOwnPropertySymbols: pe, getPrototypeOf: me } = Object, he = globalThis, ge = he.trustedTypes, _e = ge ? ge.emptyScript : "", ve = he.reactiveElementPolyfillSupport, ye = (e, t) => e, be = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? _e : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, xe = (e, t) => !le(e, t), Se = {
	attribute: !0,
	type: String,
	converter: be,
	reflect: !1,
	useDefault: !1,
	hasChanged: xe
};
(ce = Symbol).metadata ?? (ce.metadata = Symbol("metadata")), he.litPropertyMetadata ?? (he.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
var Ce = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ?? (this.l = [])).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = Se) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && ue(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = de(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r == null ? void 0 : r.call(this);
				i == null || i.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? Se;
	}
	static _$Ei() {
		if (this.hasOwnProperty(ye("elementProperties"))) return;
		let e = me(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(ye("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ye("properties"))) {
			let e = this.properties, t = [...fe(e), ...pe(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(Infinity).reverse());
			for (let e of n) t.unshift(se(e));
		} else e !== void 0 && t.push(se(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		var e;
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((e) => e(this));
	}
	addController(e) {
		var t;
		(this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
	}
	removeController(e) {
		var t;
		(t = this._$EO) == null || t.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return oe(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		var e;
		this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((e) => {
			var t;
			return (t = e.hostConnected) == null ? void 0 : t.call(e);
		});
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		var e;
		(e = this._$EO) == null || e.forEach((e) => {
			var t;
			return (t = e.hostDisconnected) == null ? void 0 : t.call(e);
		});
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			var i;
			let a = (((i = n.converter) == null ? void 0 : i.toAttribute) === void 0 ? be : n.converter).toAttribute(t, n.type);
			this._$Em = e, a == null ? this.removeAttribute(r) : this.setAttribute(r, a), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			var i, a;
			let e = n.getPropertyOptions(r), o = typeof e.converter == "function" ? { fromAttribute: e.converter } : ((i = e.converter) == null ? void 0 : i.fromAttribute) === void 0 ? be : e.converter;
			this._$Em = r;
			let s = o.fromAttribute(t, e.type);
			this[r] = s ?? ((a = this._$Ej) == null ? void 0 : a.get(r)) ?? s, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			var a;
			let o = this.constructor;
			if (!1 === r && (i = this[e]), n ?? (n = o.getPropertyOptions(e)), !((n.hasChanged ?? xe)(i, t) || n.useDefault && n.reflect && i === ((a = this._$Ej) == null ? void 0 : a.get(e)) && !this.hasAttribute(o._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			var n;
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), (n = this._$EO) == null || n.forEach((e) => {
				var t;
				return (t = e.hostUpdate) == null ? void 0 : t.call(e);
			}), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		var t;
		(t = this._$EO) == null || t.forEach((e) => {
			var t;
			return (t = e.hostUpdated) == null ? void 0 : t.call(e);
		}), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
Ce.elementStyles = [], Ce.shadowRootOptions = { mode: "open" }, Ce[ye("elementProperties")] = /* @__PURE__ */ new Map(), Ce[ye("finalized")] = /* @__PURE__ */ new Map(), ve == null || ve({ ReactiveElement: Ce }), (he.reactiveElementVersions ?? (he.reactiveElementVersions = [])).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var we = globalThis, Te = (e) => e, Ee = we.trustedTypes, De = Ee ? Ee.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Oe = "$lit$", ke = `lit$${Math.random().toFixed(9).slice(2)}$`, Ae = "?" + ke, je = `<${Ae}>`, Me = document, Ne = () => Me.createComment(""), Pe = (e) => e === null || typeof e != "object" && typeof e != "function", Fe = Array.isArray, N = (e) => Fe(e) || typeof (e == null ? void 0 : e[Symbol.iterator]) == "function", Ie = "[ 	\n\f\r]", Le = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Re = /-->/g, ze = />/g, P = RegExp(`>|${Ie}(?:([^\\s"'>=/]+)(${Ie}*=${Ie}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), F = /'/g, Be = /"/g, Ve = /^(?:script|style|textarea|title)$/i, I = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), L = I(1), He = I(2), R = Symbol.for("lit-noChange"), z = Symbol.for("lit-nothing"), Ue = /* @__PURE__ */ new WeakMap(), We = Me.createTreeWalker(Me, 129);
function B(e, t) {
	if (!Fe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return De === void 0 ? t : De.createHTML(t);
}
var Ge = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = Le;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === Le ? c[1] === "!--" ? o = Re : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = P) : (Ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = P) : o = ze : o === P ? c[0] === ">" ? (o = i ?? Le, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? P : c[3] === "\"" ? Be : F) : o === Be || o === F ? o = P : o === Re || o === ze ? o = Le : (o = P, i = void 0);
		let d = o === P && e[t + 1].startsWith("/>") ? " " : "";
		a += o === Le ? n + je : l >= 0 ? (r.push(s), n.slice(0, l) + Oe + n.slice(l) + ke + d) : n + ke + (l === -2 ? t : d);
	}
	return [B(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ke = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ge(t, n);
		if (this.el = e.createElement(l, r), We.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = We.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(Oe)) {
					let t = u[o++], n = i.getAttribute(e).split(ke), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ze : r[1] === "?" ? Qe : r[1] === "@" ? $e : Xe
					}), i.removeAttribute(e);
				} else e.startsWith(ke) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ve.test(i.tagName)) {
					let e = i.textContent.split(ke), t = e.length - 1;
					if (t > 0) {
						i.textContent = Ee ? Ee.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], Ne()), We.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], Ne());
					}
				}
			} else if (i.nodeType === 8) if (i.data === Ae) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(ke, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += ke.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = Me.createElement("template");
		return n.innerHTML = e, n;
	}
};
function qe(e, t, n = e, r) {
	var i, a;
	if (t === R) return t;
	let o = r === void 0 ? n._$Cl : (i = n._$Co) == null ? void 0 : i[r], s = Pe(t) ? void 0 : t._$litDirective$;
	return (o == null ? void 0 : o.constructor) !== s && (o == null || (a = o._$AO) == null || a.call(o, !1), s === void 0 ? o = void 0 : (o = new s(e), o._$AT(e, n, r)), r === void 0 ? n._$Cl = o : (n._$Co ?? (n._$Co = []))[r] = o), o !== void 0 && (t = qe(e, o._$AS(e, t.values), o, r)), t;
}
var Je = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = ((e == null ? void 0 : e.creationScope) ?? Me).importNode(t, !0);
		We.currentNode = r;
		let i = We.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ye(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new et(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== (s == null ? void 0 : s.index) && (i = We.nextNode(), a++);
		}
		return We.currentNode = Me, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ye = class e {
	get _$AU() {
		var e;
		return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = z, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = qe(this, e, t), Pe(e) ? e === z || e == null || e === "" ? (this._$AH !== z && this._$AR(), this._$AH = z) : e !== this._$AH && e !== R && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? N(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== z && Pe(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Me.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		var t;
		let { values: n, _$litType$: r } = e, i = typeof r == "number" ? this._$AC(e) : (r.el === void 0 && (r.el = Ke.createElement(B(r.h, r.h[0]), this.options)), r);
		if (((t = this._$AH) == null ? void 0 : t._$AD) === i) this._$AH.p(n);
		else {
			let e = new Je(i, this), t = e.u(this.options);
			e.p(n), this.T(t), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ue.get(e.strings);
		return t === void 0 && Ue.set(e.strings, t = new Ke(e)), t;
	}
	k(t) {
		Fe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(Ne()), this.O(Ne()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		var n;
		for ((n = this._$AP) == null || n.call(this, !1, !0, t); e !== this._$AB;) {
			let t = Te(e).nextSibling;
			Te(e).remove(), e = t;
		}
	}
	setConnected(e) {
		var t;
		this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
	}
}, Xe = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = z, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = z;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = qe(this, e, t, 0), a = !Pe(e) || e !== this._$AH && e !== R, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = qe(this, r[n + o], t, o), s === R && (s = this._$AH[o]), a || (a = !Pe(s) || s !== this._$AH[o]), s === z ? e = z : e !== z && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === z ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ze = class extends Xe {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === z ? void 0 : e;
	}
}, Qe = class extends Xe {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== z);
	}
}, $e = class extends Xe {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = qe(this, e, t, 0) ?? z) === R) return;
		let n = this._$AH, r = e === z && n !== z || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== z && (n === z || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		var t;
		typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, et = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		qe(this, e);
	}
}, V = we.litHtmlPolyfillSupport;
V == null || V(Ke, Ye), (we.litHtmlVersions ?? (we.litHtmlVersions = [])).push("3.3.3");
var tt = (e, t, n) => {
	let r = (n == null ? void 0 : n.renderBefore) ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = (n == null ? void 0 : n.renderBefore) ?? null;
		r._$litPart$ = i = new Ye(t.insertBefore(Ne(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, nt, rt = globalThis, H = class extends Ce {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		var e;
		let t = super.createRenderRoot();
		return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = tt(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		var e;
		super.connectedCallback(), (e = this._$Do) == null || e.setConnected(!0);
	}
	disconnectedCallback() {
		var e;
		super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(!1);
	}
	render() {
		return R;
	}
};
H._$litElement$ = !0, H.finalized = !0, (nt = rt.litElementHydrateSupport) == null || nt.call(rt, { LitElement: H });
var it = rt.litElementPolyfillSupport;
it == null || it({ LitElement: H }), (rt.litElementVersions ?? (rt.litElementVersions = [])).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var U = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, at = {
	attribute: !0,
	type: String,
	converter: be,
	reflect: !1,
	hasChanged: xe
}, ot = (e = at, t, n) => {
	let { kind: r, metadata: i } = n, a = globalThis.litPropertyMetadata.get(i);
	if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), r === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(n.name, e), r === "accessor") {
		let { name: r } = n;
		return {
			set(n) {
				let i = t.get.call(this);
				t.set.call(this, n), this.requestUpdate(r, i, e, !0, n);
			},
			init(t) {
				return t !== void 0 && this.C(r, void 0, e, t), t;
			}
		};
	}
	if (r === "setter") {
		let { name: r } = n;
		return function(n) {
			let i = this[r];
			t.call(this, n), this.requestUpdate(r, i, e, !0, n);
		};
	}
	throw Error("Unsupported decorator location: " + r);
};
function W(e) {
	return (t, n) => typeof n == "object" ? ot(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function G(e) {
	return W({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/base.js
var st = (e, t, n) => (n.configurable = !0, n.enumerable = !0, Reflect.decorate && typeof t != "object" && Object.defineProperty(e, t, n), n);
//#endregion
//#region node_modules/@lit/reactive-element/decorators/query.js
function ct(e, t) {
	return (n, r, i) => {
		let a = (t) => {
			var n;
			return ((n = t.renderRoot) == null ? void 0 : n.querySelector(e)) ?? null;
		};
		if (t) {
			let { get: e, set: t } = typeof r == "object" ? n : i ?? (() => {
				let e = Symbol();
				return {
					get() {
						return this[e];
					},
					set(t) {
						this[e] = t;
					}
				};
			})();
			return st(n, r, { get() {
				let n = e.call(this);
				return n === void 0 && (n = a(this), (n !== null || this.hasUpdated) && t.call(this, n)), n;
			} });
		}
		return st(n, r, { get() {
			return a(this);
		} });
	};
}
//#endregion
//#region src/shared/design-tokens.ts
var K = M`
  :host {
    --lucarne-spacing-xs: 4px;
    --lucarne-spacing-sm: 8px;
    --lucarne-spacing-md: 12px;
    --lucarne-spacing-lg: 16px;
    --lucarne-spacing-xl: 24px;
    --lucarne-spacing-xxl: 32px;

    --lucarne-radius-sm: 4px;
    --lucarne-radius-md: 8px;
    --lucarne-radius-lg: 16px;

    --lucarne-fs-sm: clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem);
    --lucarne-fs-md: clamp(0.875rem, 0.75vw + 0.6rem, 1rem);
    --lucarne-fs-lg: clamp(1rem, 1vw + 0.75rem, 1.25rem);
    --lucarne-fs-xl: clamp(1.25rem, 1.5vw + 0.875rem, 1.75rem);

    --lucarne-shadow-card: 0 1px 4px rgba(0, 0, 0, 0.08);

    --lucarne-color-family: #a8d8b9;
    --lucarne-color-anton: #a8c5e8;
    --lucarne-color-ingrid: #c8b4e0;
    --lucarne-color-holidays: #d4cfc4;
    --lucarne-color-birthdays: #f0dca0;
    --lucarne-color-les-lilas: #b8b4e8;

    --lucarne-success-bg: #e8f5e9;
    --lucarne-success-fg: #2e7d32;

    --lucarne-surface: var(--ha-card-background, var(--card-background-color, #fff));
    --lucarne-on-surface: var(--primary-text-color, #212121);
    --lucarne-on-surface-muted: var(--secondary-text-color, #727272);

    --lucarne-skeleton-base: rgba(0, 0, 0, 0.06);
    --lucarne-skeleton-highlight: rgba(0, 0, 0, 0.12);
    --lucarne-pan-easing: cubic-bezier(0.32, 0.72, 0, 1);
    --lucarne-pan-duration: 240ms;

    /* Shared OUTER height for the Today + Calendar cards so their ha-card boxes
       line up side by side regardless of differing header/chrome heights. Applied
       to each card's ha-card; the inner scroll region flexes to fill. The ~114px
       offset is the dashboard chrome above the card plus the gap below it. */
    --lucarne-card-fill-height: calc(100vh - 114px);
  }

  @supports (height: 100dvh) {
    :host {
      --lucarne-card-fill-height: calc(100dvh - 114px);
    }
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --lucarne-skeleton-base: rgba(255, 255, 255, 0.08);
      --lucarne-skeleton-highlight: rgba(255, 255, 255, 0.16);
    }
  }
`;
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/decorate.js
function q(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/shared/card-base.ts
var lt = class extends Error {
	constructor(e) {
		super(e), this.name = "LucarneConfigError";
	}
}, ut = class e extends H {
	setConfig(e) {
		te(void 0, e == null ? void 0 : e.debug), this._configFailure = void 0;
		try {
			this.applyConfig(e);
		} catch (e) {
			if (e instanceof lt) throw e;
			T(e, `${this.tagName.toLowerCase()}.setConfig`), this._configFailure = e instanceof Error ? e.message : String(e);
		}
	}
	render() {
		var t;
		let n = this;
		if (te(n.hass, (t = n._config) == null ? void 0 : t.debug), this._configFailure !== void 0) return e._notice(`This card could not read its configuration: ${this._configFailure}`);
		try {
			return this.renderContent();
		} catch (t) {
			return T(t, this.tagName.toLowerCase()), e._notice("This card hit an error and will recover on the next update.");
		}
	}
	static _notice(e) {
		return L`
      <ha-card>
        <div style="padding:16px;color:var(--secondary-text-color);font-size:14px">
          ${e}
        </div>
      </ha-card>
    `;
	}
};
q([G()], ut.prototype, "_configFailure", void 0);
//#endregion
//#region src/shared/ha-subscriptions.ts
function dt(e, t, n) {
	let r, i = !1;
	return e.connection.subscribeMessage((e) => {
		var t;
		!((t = e.variables) == null || (t = t.trigger) == null) && t.to_state && n(e.variables.trigger.to_state);
	}, {
		type: "subscribe_trigger",
		trigger: {
			platform: "state",
			entity_id: t
		}
	}).then((e) => {
		i ? e() : r = e;
	}), () => {
		i = !0, r == null || r();
	};
}
function ft(e) {
	return typeof e == "string" ? e : e && typeof e == "object" ? e.dateTime ?? e.date ?? "" : "";
}
function pt(e) {
	let t = {
		start: ft(e.start),
		end: ft(e.end),
		summary: e.summary ?? ""
	};
	return e.description && (t.description = e.description), e.location && (t.location = e.location), e.uid && (t.uid = e.uid), e.recurrence_id && (t.recurrence_id = e.recurrence_id), e.rrule && (t.rrule = e.rrule), t;
}
async function mt(e, t, n, r) {
	let i = /* @__PURE__ */ new Set(), a = encodeURIComponent(n.toISOString()), o = encodeURIComponent(r.toISOString()), s = await Promise.all(t.map((t) => e.callApi("GET", `calendars/${encodeURIComponent(t)}?start=${a}&end=${o}`).then((e) => [t, e.map(pt)]).catch((e) => (console.warn(`[lucarne] GET /api/calendars/${t} failed:`, e), i.add(t), [t, []]))));
	return {
		events: new Map(s),
		failed: i
	};
}
async function ht(e, t, n, r, i) {
	await e.connection.sendMessagePromise({
		type: "calendar/event/delete",
		entity_id: t,
		uid: n,
		recurrence_id: r,
		recurrence_range: i
	});
}
var gt = 2;
function _t(e, t) {
	var n;
	let r = (n = e.states[t]) == null || (n = n.attributes) == null ? void 0 : n.supported_features;
	return typeof r == "number" ? (r & gt) !== 0 : !1;
}
function vt(e, t, n) {
	let r = async () => {
		try {
			var r;
			let i = await e.connection.sendMessagePromise({
				type: "call_service",
				domain: "todo",
				service: "get_items",
				service_data: {},
				target: { entity_id: t },
				return_response: !0
			});
			n((i == null || (r = i.response) == null || (r = r[t]) == null ? void 0 : r.items) ?? []);
		} catch (e) {
			console.warn(`[lucarne] todo.get_items failed for ${t}:`, e), n([]);
		}
	};
	return r(), dt(e, t, () => r());
}
//#endregion
//#region src/shared/grid-preview-override.ts
function yt(e) {
	let t = e;
	for (; t;) {
		if (t instanceof Element) {
			let e = t.tagName.toLowerCase();
			if (e === "hui-dialog-edit-card" || e === "ha-dialog") return !0;
		}
		let e = t.parentNode;
		if (e) {
			t = e;
			continue;
		}
		let n = t.getRootNode();
		t = n instanceof ShadowRoot ? n.host : null;
	}
	return !1;
}
function bt(e) {
	let t = e.parentElement;
	for (; t && !t.style.getPropertyValue("--column-size");) t = t.parentElement;
	return (t == null ? void 0 : t.parentElement) ?? null;
}
function xt(e) {
	if (!yt(e)) return null;
	let t = bt(e);
	if (!t) return null;
	let n = t.style.getPropertyValue("--grid-column-count"), r = () => {
		t.style.getPropertyValue("--grid-column-count") !== "1" && t.style.setProperty("--grid-column-count", "1");
	};
	r();
	let i = new MutationObserver(r);
	return i.observe(t, {
		attributes: !0,
		attributeFilter: ["style"]
	}), { uninstall() {
		i.disconnect(), n ? t.style.setProperty("--grid-column-count", n) : t.style.removeProperty("--grid-column-count");
	} };
}
//#endregion
//#region src/shared/family-subscription.ts
var St = {
	slug: "household",
	name: "Household",
	color: "var(--primary-color)",
	avatar: null,
	todo_entity_id: "todo.lucarne_household",
	streak_counter_id: ""
}, Ct = 2e4, wt = 300 * 1e3;
function Tt(e, t, n) {
	return e.map((e) => {
		let r = n.get(e.uid) ?? {
			item_uid: e.uid,
			member_slug: t,
			assignee_slug: "",
			type: "chore",
			recurrence: "",
			icon: "",
			source: "manual",
			time_of_day: "anytime"
		};
		return {
			uid: e.uid,
			summary: e.summary,
			status: e.status,
			due: e.due ?? null,
			description: e.description ?? "",
			metadata: r
		};
	});
}
function Et(e, t) {
	let n = !1, r = [], i = /* @__PURE__ */ new Map(), a = [], o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = "", l = "", u = null, d = null, f = null, p = !1, m = null;
	function h() {
		if (n) return;
		let e = /* @__PURE__ */ new Map();
		for (let t of a) {
			let n = o.get(t.todo_entity_id) ?? [];
			e.set(t.slug, Tt(n, t.slug, i));
		}
		let r = o.get("todo.lucarne_household") ?? [];
		e.set("household", Tt(r, "household", i)), t({
			members: a,
			tasksByMember: e,
			streakByMember: new Map(s),
			taskMetadataByUid: new Map(i),
			resetTime: c,
			streakCheckTime: l,
			integrationError: m
		});
	}
	function g() {
		return f ? (p = !0, f) : (f = (async () => {
			try {
				do
					p = !1, await _();
				while (p && !n);
			} finally {
				f = null;
			}
		})(), f);
	}
	async function _() {
		try {
			let u = await e.connection.sendMessagePromise({ type: "lucarne_family/get_family" });
			if (n) return;
			let d = /* @__PURE__ */ new Map();
			for (let e of u.task_metadata ?? []) {
				let t = [], n = e.rotation_owners;
				if (typeof n == "string" && n !== "") try {
					let e = JSON.parse(n);
					Array.isArray(e) && (t = e.map(String));
				} catch {}
				else Array.isArray(n) && (t = n.map(String));
				d.set(e.item_uid, {
					...e,
					rotation_owners: t
				});
			}
			i = d, c = u.reset_time ?? "", l = u.streak_check_time ?? "", a = (u.members ?? []).filter((e) => e.todo_entity_id ? !0 : (console.debug(`[lucarne] skipping member ${e.slug}: no todo_entity_id yet`), !1)), m = null, s = /* @__PURE__ */ new Map(), r.forEach((e) => e()), r.length = 0;
			for (let n of a) {
				let i = vt(e, n.todo_entity_id, (e) => {
					o.set(n.todo_entity_id, e), h();
				});
				if (r.push(i), n.streak_counter_id) {
					var t;
					let i = (t = e.states) == null || (t = t[n.streak_counter_id]) == null ? void 0 : t.state;
					if (i !== void 0) {
						let e = parseInt(i, 10);
						s.set(n.slug, isNaN(e) ? 0 : e);
					}
					let a = dt(e, n.streak_counter_id, (e) => {
						let t = parseInt(e.state, 10);
						s.set(n.slug, isNaN(t) ? 0 : t), h();
					});
					r.push(a);
				}
			}
			let f = vt(e, "todo.lucarne_household", (e) => {
				o.set("todo.lucarne_household", e), h();
			});
			r.push(f), h();
		} catch (e) {
			console.debug("[lucarne] get_family failed — integration may not be installed:", e), n || (m = e instanceof Error ? e : Error(String(e)), r.forEach((e) => e()), r.length = 0, a = [], i = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), o.clear(), c = "", l = "", h());
		}
	}
	function v() {
		u === null && (u = setTimeout(() => {
			u = null, g();
		}, 1e3));
	}
	function y() {
		d = setTimeout(() => {
			d = null, (typeof document < "u" && document.visibilityState === "hidden" ? Promise.resolve() : g()).finally(() => {
				n || y();
			});
		}, m === null ? Ct : wt);
	}
	let ee = () => {
		n || typeof document < "u" && document.visibilityState === "hidden" || g();
	};
	typeof document < "u" && document.addEventListener("visibilitychange", ee), typeof window < "u" && window.addEventListener("pageshow", ee);
	let te = [];
	return e.connection.subscribeMessage(() => {
		v();
	}, { type: "lucarne_family/subscribe" }).then((e) => {
		n ? e() : te.push(e);
	}).catch((e) => {
		console.debug("[lucarne] could not subscribe to family updates:", e);
	}), g().finally(() => {
		n || y();
	}), () => {
		n = !0, u !== null && clearTimeout(u), d !== null && clearTimeout(d), typeof document < "u" && document.removeEventListener("visibilitychange", ee), typeof window < "u" && window.removeEventListener("pageshow", ee), r.forEach((e) => e()), te.forEach((e) => e());
	};
}
//#endregion
//#region src/shared/recurrence.ts
var Dt = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA",
	"SU"
];
function Ot(e) {
	if (!e || e.trim() === "") return { mode: "none" };
	let t = e.trim().split(";"), n = {};
	for (let r of t) {
		let t = r.indexOf("=");
		if (t === -1) return {
			mode: "unknown",
			raw: e
		};
		n[r.slice(0, t)] = r.slice(t + 1);
	}
	let r = n.FREQ, i;
	if (n.INTERVAL !== void 0) {
		if (!/^[1-9]\d*$/.test(n.INTERVAL)) return {
			mode: "unknown",
			raw: e
		};
		i = parseInt(n.INTERVAL, 10);
	}
	let a = n.BYDAY, o = n.BYMONTHDAY, s = n.BYMONTH;
	function c(...e) {
		let t = new Set(e);
		return Object.keys(n).every((e) => t.has(e));
	}
	if (r === "DAILY" && !a && !o && !s) return c("FREQ", "INTERVAL") ? {
		mode: "daily",
		...i ? { interval: i } : {}
	} : {
		mode: "unknown",
		raw: e
	};
	if (r === "WEEKLY" && a && !o && !s) {
		if (!c("FREQ", "BYDAY", "INTERVAL")) return {
			mode: "unknown",
			raw: e
		};
		let t = a.split(",");
		return t.every((e) => Dt.includes(e)) ? {
			mode: "weekly",
			days: t,
			...i ? { interval: i } : {}
		} : {
			mode: "unknown",
			raw: e
		};
	}
	if (r === "MONTHLY" && o && !a && !s) return !c("FREQ", "BYMONTHDAY", "INTERVAL") || !/^([1-9]|[12]\d|3[01])$/.test(o) ? {
		mode: "unknown",
		raw: e
	} : {
		mode: "monthly-date",
		dayOfMonth: parseInt(o, 10),
		...i ? { interval: i } : {}
	};
	if (r === "MONTHLY" && a && !o && !s) {
		if (!c("FREQ", "BYDAY", "INTERVAL")) return {
			mode: "unknown",
			raw: e
		};
		let t = a.match(/^([+-]?\d+)([A-Z]{2})$/);
		if (!t) return {
			mode: "unknown",
			raw: e
		};
		let n = parseInt(t[1], 10);
		if (![
			1,
			2,
			3,
			4,
			-1
		].includes(n)) return {
			mode: "unknown",
			raw: e
		};
		let r = t[2];
		return Dt.includes(r) ? {
			mode: "monthly-nth",
			nth: n,
			day: r,
			...i ? { interval: i } : {}
		} : {
			mode: "unknown",
			raw: e
		};
	}
	return r === "YEARLY" && s && o && !a ? !c("FREQ", "BYMONTH", "BYMONTHDAY", "INTERVAL") || !/^([1-9]|1[0-2])$/.test(s) || !/^([1-9]|[12]\d|3[01])$/.test(o) ? {
		mode: "unknown",
		raw: e
	} : {
		mode: "yearly",
		month: parseInt(s, 10),
		dayOfMonth: parseInt(o, 10),
		...i ? { interval: i } : {}
	} : {
		mode: "unknown",
		raw: e
	};
}
function kt(e) {
	if (e.mode === "none") return "";
	if (e.mode === "daily") {
		let t = "FREQ=DAILY";
		return e.interval && e.interval > 1 && (t += `;INTERVAL=${e.interval}`), t;
	}
	if (e.mode === "weekly") {
		let t = `FREQ=WEEKLY;BYDAY=${e.days.join(",")}`;
		return e.interval && e.interval > 1 && (t += `;INTERVAL=${e.interval}`), t;
	}
	if (e.mode === "monthly-date") {
		let t = `FREQ=MONTHLY;BYMONTHDAY=${e.dayOfMonth}`;
		return e.interval && e.interval > 1 && (t += `;INTERVAL=${e.interval}`), t;
	}
	if (e.mode === "monthly-nth") {
		let t = `FREQ=MONTHLY;BYDAY=${`${e.nth}`}${e.day}`;
		return e.interval && e.interval > 1 && (t += `;INTERVAL=${e.interval}`), t;
	}
	if (e.mode === "yearly") {
		let t = `FREQ=YEARLY;BYMONTH=${e.month};BYMONTHDAY=${e.dayOfMonth}`;
		return e.interval && e.interval > 1 && (t += `;INTERVAL=${e.interval}`), t;
	}
	return "";
}
function At(e) {
	let t = Ot(e);
	if (t.mode === "none") return "One-off (no repeat)";
	if (t.mode === "unknown") return "Custom recurrence (not editable here)";
	let n = "interval" in t && t.interval ? t.interval : 1;
	if (t.mode === "daily") return n === 1 ? "Daily" : `Every ${n} days`;
	if (t.mode === "weekly") {
		let e = {
			MO: "Mon",
			TU: "Tue",
			WE: "Wed",
			TH: "Thu",
			FR: "Fri",
			SA: "Sat",
			SU: "Sun"
		}, r = t.days.map((t) => e[t]).join(", ");
		return n === 1 ? `Weekly on ${r}` : `Every ${n} weeks on ${r}`;
	}
	if (t.mode === "monthly-date") {
		let e = jt(t.dayOfMonth);
		return n === 1 ? `Monthly on the ${t.dayOfMonth}${e}` : `Every ${n} months on the ${t.dayOfMonth}${e}`;
	}
	if (t.mode === "monthly-nth") {
		let e = Mt(t.nth), r = {
			MO: "Monday",
			TU: "Tuesday",
			WE: "Wednesday",
			TH: "Thursday",
			FR: "Friday",
			SA: "Saturday",
			SU: "Sunday"
		};
		return n === 1 ? `Monthly on the ${e} ${r[t.day]}` : `Every ${n} months on the ${e} ${r[t.day]}`;
	}
	if (t.mode === "yearly") {
		let e = [
			"",
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		], r = jt(t.dayOfMonth);
		return n === 1 ? `Yearly on ${e[t.month]} ${t.dayOfMonth}${r}` : `Every ${n} years on ${e[t.month]} ${t.dayOfMonth}${r}`;
	}
	return "";
}
function jt(e) {
	if (e >= 11 && e <= 13) return "th";
	switch (e % 10) {
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		default: return "th";
	}
}
function Mt(e) {
	return e === -1 ? "last" : e === 1 ? "1st" : e === 2 ? "2nd" : e === 3 ? "3rd" : `${e}th`;
}
var Nt = new Date(Date.UTC(1970, 0, 1));
function Pt(e) {
	return Math.floor(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()) / 864e5);
}
function Ft(e, t, n) {
	let r = e.getDate();
	if (e.getDay() !== n) return !1;
	if (t > 0) return Math.floor((r - 1) / 7) === t - 1;
	let i = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
	return Math.floor((i - r) / 7) === 0;
}
var It = {
	SU: 0,
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6
};
function Lt(e, t = /* @__PURE__ */ new Date()) {
	if (e.mode === "none" || e.mode === "unknown") return !1;
	let n = "interval" in e && e.interval ? e.interval : 1, r = Pt(t) - Pt(Nt);
	if (e.mode === "daily") return r % n === 0;
	if (e.mode === "weekly") {
		let i = t.getDay();
		return e.days.some((e) => It[e] === i) ? n === 1 ? !0 : Math.floor(r / 7) % n === 0 : !1;
	}
	if (e.mode === "monthly-date") return t.getDate() === e.dayOfMonth ? n === 1 ? !0 : ((t.getFullYear() - 1970) * 12 + t.getMonth()) % n === 0 : !1;
	if (e.mode === "monthly-nth") {
		let r = It[e.day];
		return Ft(t, e.nth, r) ? n === 1 ? !0 : ((t.getFullYear() - 1970) * 12 + t.getMonth()) % n === 0 : !1;
	}
	return e.mode === "yearly" ? t.getMonth() + 1 !== e.month || t.getDate() !== e.dayOfMonth ? !1 : n === 1 ? !0 : (t.getFullYear() - 1970) % n == 0 : !1;
}
//#endregion
//#region src/shared/strings.ts
var J = {
	today: "Today",
	nothingOnCalendar: "Nothing on the calendar today",
	allDone: "All done!",
	allDoneForNow: "All done for now!",
	addWeatherEntity: "Add a weather entity to show forecast",
	dressingTipHeavyCoat: "Heavy coat + hat",
	dressingTipCoatScarf: "Coat + scarf",
	dressingTipLightJacket: "Light jacket",
	dressingTipTShirt: "T-shirt",
	dressingTipShorts: "Shorts weather",
	dressingTipBoots: "Boots + heavy coat",
	dressingTipUmbrella: " + umbrella",
	dressingTipDefault: "Check the weather",
	tasksTitle: "Tasks",
	timePillNow: "now",
	timePillInMinutes: (e) => `in ${e}m`,
	timePillInHours: (e) => `in ${e}h`,
	timePillTomorrow: (e) => `tomorrow ${e}`,
	errorUnavailable: "—",
	noRoutinesToday: "no routines today",
	familyReady: (e, t) => `${e}/${t} ready`
}, Rt;
function zt(e) {
	return e.length === 10 ? /* @__PURE__ */ new Date(e + "T00:00:00") : new Date(e);
}
function Bt(e, t, n) {
	let r = new Date(t);
	r.setHours(0, 0, 0, 0);
	let i = new Date(r);
	return i.setDate(i.getDate() + n), e.filter((e) => zt(e.end) > r && zt(e.start) < i).sort((e, t) => zt(e.start).getTime() - zt(t.start).getTime());
}
function Vt(e, t, n) {
	let r = e.getTime() - n.getTime();
	if (e <= n && n < t) return J.timePillNow;
	if (r > 0 && r < 3600 * 1e3) {
		let e = Math.round(r / 6e4);
		return J.timePillInMinutes(e);
	}
	if (r > 0 && r < 7200 * 1e3) {
		let e = Math.round(r / 36e5);
		return J.timePillInHours(e);
	}
	let i = e.toLocaleTimeString("en", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: !1
	});
	if (e.toDateString() === n.toDateString()) return i;
	let a = new Date(n);
	return a.setDate(n.getDate() + 1), e.toDateString() === a.toDateString() ? J.timePillTomorrow(i) : `${e.toLocaleDateString("en", { weekday: "short" })} ${i}`;
}
function Ht(e) {
	return e.start.length === 10 && e.end.length === 10;
}
var Ut = (Rt = class extends H {
	constructor(...e) {
		super(...e), this.events = [], this.calendarColors = /* @__PURE__ */ new Map(), this.windowDays = 1;
	}
	render() {
		let e = /* @__PURE__ */ new Date(), t = Bt(this.events, e, this.windowDays);
		return t.length === 0 ? L`<div class="empty-state">${J.nothingOnCalendar}</div>` : L`
      ${t.map((t) => {
			let n = zt(t.start), r = zt(t.end), i = n <= e && e < r, a = !Ht(t) && r <= e, o = Ht(t) ? "all day" : Vt(n, r, e), s = this._colorForEvent(t);
			return L`
          <div class="event-row ${a ? "past" : ""}">
            <div class="time-pill ${i ? "now" : ""}">
              ${i ? L`<span class="pulse-dot"></span>` : ""} ${o}
            </div>
            <div class="color-bar" style="background:${s}"></div>
            <div class="event-content">
              <div class="event-summary">${t.summary}</div>
              ${t.location ? L`<div class="event-secondary">${t.location}</div>` : ""}
            </div>
          </div>
        `;
		})}
    `;
	}
	_colorForEvent(e) {
		if (e.uid) {
			let t = e.uid.split("::")[0], n = this.calendarColors.get(t);
			if (n) return n;
		}
		return "var(--lucarne-color-family)";
	}
}, Rt.styles = [K, M`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
        container-type: inline-size;
        /* A long today-list scrolls within the section instead of stretching
           the card. The host card can tune the cap via --lucarne-agenda-max-height. */
        max-height: var(--lucarne-agenda-max-height, 360px);
        overflow-y: auto;
      }
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--lucarne-spacing-xl) 0;
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-md);
        text-align: center;
      }
      .event-row {
        display: flex;
        align-items: flex-start;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-sm) 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
      .event-row:last-child {
        border-bottom: none;
      }
      /* Events that already ended earlier today stay listed but read as done. */
      .event-row.past {
        opacity: 0.45;
      }
      .event-row.past .event-summary {
        text-decoration: line-through;
      }
      .time-pill {
        flex-shrink: 0;
        min-width: 64px;
        padding: 3px 8px;
        border-radius: var(--lucarne-radius-md);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        text-align: center;
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .time-pill.now {
        background: rgba(76, 175, 80, 0.15);
        color: #2e7d32;
      }
      .pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #4caf50;
        animation: pulse 1.4s ease-in-out infinite;
        flex-shrink: 0;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.85); }
      }
      .color-bar {
        flex-shrink: 0;
        width: 4px;
        min-height: 36px;
        border-radius: var(--lucarne-radius-sm);
        align-self: stretch;
      }
      .event-content {
        flex: 1;
        min-width: 0;
      }
      .event-summary {
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        color: var(--lucarne-on-surface);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .event-secondary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @container (min-width: 600px) {
        :host {
          display: flex;
          flex-direction: column;
        }
      }
    `], Rt);
q([W({ type: Array })], Ut.prototype, "events", void 0), q([W({ type: Object })], Ut.prototype, "calendarColors", void 0), q([W({ type: Number })], Ut.prototype, "windowDays", void 0), Ut = q([U("lucarne-agenda-strip")], Ut);
//#endregion
//#region src/shared/icons.ts
var Wt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`, Gt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
</svg>`, Kt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
  <line x1="8" y1="19" x2="8" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="19" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="19" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`, qt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
  <line x1="8" y1="21" x2="8" y2="19"/>
  <line x1="8" y1="19" x2="10" y2="17"/>
  <line x1="8" y1="19" x2="6" y2="17"/>
  <line x1="16" y1="21" x2="16" y2="19"/>
  <line x1="16" y1="19" x2="18" y2="17"/>
  <line x1="16" y1="19" x2="14" y2="17"/>
  <line x1="12" y1="22" x2="12" y2="20"/>
  <line x1="12" y1="20" x2="14" y2="18"/>
  <line x1="12" y1="20" x2="10" y2="18"/>
</svg>`, Jt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2v2M4.22 4.22l1.42 1.42M2 12h2M4.22 19.78l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="10" cy="10" r="3" fill="currentColor"/>
  <path d="M20 15h-1.26A6 6 0 1 0 8 20h12a4 4 0 0 0 0-8z" fill="currentColor" opacity="0.7"/>
</svg>`;
He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="7" r="4"/>
  <path d="M20 21a8 8 0 1 0-16 0"/>
</svg>`, He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"/>
</svg>`;
var Yt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>`, Xt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3,12H7A5,5 0 0,1 12,7A5,5 0 0,1 17,12H21A1,1 0 0,1 22,13A1,1 0 0,1 21,14H3A1,1 0 0,1 2,13A1,1 0 0,1 3,12M15,12A3,3 0 0,0 12,9A3,3 0 0,0 9,12H15M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M12.71,16.3L15.82,19.41C16.21,19.8 16.21,20.43 15.82,20.82C15.43,21.21 14.8,21.21 14.41,20.82L12,18.41L9.59,20.82C9.2,21.21 8.57,21.21 8.18,20.82C7.79,20.43 7.79,19.8 8.18,19.41L11.29,16.3C11.5,16.1 11.74,16 12,16C12.26,16 12.5,16.1 12.71,16.3Z"/>
</svg>`, Zt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"/>
</svg>`, Qt = He`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z"/>
</svg>`, $t = {
	sunny: Wt,
	"clear-night": Wt,
	cloudy: Gt,
	fog: Gt,
	hail: Kt,
	lightning: Kt,
	"lightning-rainy": Kt,
	partlycloudy: Jt,
	pouring: Kt,
	rainy: Kt,
	snowy: qt,
	"snowy-rainy": qt,
	windy: Gt,
	"windy-variant": Gt,
	exceptional: Gt
};
function en(e) {
	return $t[e] ?? $t[e.toLowerCase()] ?? Gt;
}
var tn = {
	sunny: "#f4b740",
	"clear-night": "#7a86c8",
	cloudy: "#8aa0b8",
	partlycloudy: "#9bb3cf",
	rainy: "#5a8fc0",
	pouring: "#4a7aa8",
	snowy: "#a8c5e8",
	"snowy-rainy": "#86a8d0",
	fog: "#a8a8a8",
	hail: "#7ac0d8",
	lightning: "#c89c4a",
	"lightning-rainy": "#a08358",
	windy: "#7a8a95",
	"windy-variant": "#7a8a95",
	exceptional: "#c87060"
};
function nn(e) {
	return tn[e.toLowerCase()] ?? "#8aa0b8";
}
//#endregion
//#region src/components/dressing-tip.ts
function rn(e) {
	if (!e.length) return J.dressingTipDefault;
	let t = e[0];
	if (t.condition.toLowerCase().includes("snow")) return J.dressingTipBoots;
	let n = t.temperature, r;
	return r = n < 5 ? J.dressingTipHeavyCoat : n < 12 ? J.dressingTipCoatScarf : n < 18 ? J.dressingTipLightJacket : n < 24 ? J.dressingTipTShirt : J.dressingTipShorts, (t.precipitation_probability ?? 0) > 50 && (r += J.dressingTipUmbrella), r;
}
//#endregion
//#region src/components/weather-block.ts
var an, on = (an = class extends H {
	constructor(...e) {
		super(...e), this.forecast = [];
	}
	render() {
		if (!this.weatherEntity) return L`<div class="empty-state">${J.addWeatherEntity}</div>`;
		let e = this.weatherEntity.attributes, t = e.temperature, n = e.temperature_unit ?? "°C", r = this.weatherEntity.state, i = this.forecast[0], a = this.forecast[1], o = rn(this.forecast);
		return L`
      <div class="current">
        <span class="condition-icon" style="color: ${nn(r)}">${en(r)}</span>
        <div class="temp-group">
          <div class="current-temp">${t === void 0 ? J.errorUnavailable : `${Math.round(t)}${n}`}</div>
          ${i ? L`<div class="high-low">
                ↑${Math.round(i.temperature)}${n}
                ${i.templow === void 0 ? "" : ` ↓${Math.round(i.templow)}${n}`}
              </div>` : ""}
        </div>
      </div>
      ${a ? L`
            <div class="tomorrow-row">
              <span class="tomorrow-icon" style="color: ${nn(a.condition)}">${en(a.condition)}</span>
              <span>Tomorrow ↑${Math.round(a.temperature)}${n}${a.templow === void 0 ? "" : ` ↓${Math.round(a.templow)}${n}`}</span>
            </div>
          ` : ""}
      <div class="dressing-tip">
        <span class="dressing-label">Wear:</span>
        ${o}
      </div>
    `;
	}
}, an.styles = [K, M`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
      }
      .empty-state {
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        padding: var(--lucarne-spacing-lg) 0;
        text-align: center;
      }
      .current {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-md);
        margin-bottom: var(--lucarne-spacing-md);
      }
      .condition-icon {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
      }
      .temp-group {
        flex: 1;
      }
      .current-temp {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        line-height: 1;
      }
      .high-low {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
      }
      .tomorrow-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-bottom: var(--lucarne-spacing-md);
        padding-bottom: var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .tomorrow-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .dressing-tip {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-xs);
      }
      .dressing-label {
        font-weight: 600;
        font-style: normal;
        color: var(--lucarne-on-surface-muted);
      }
    `], an);
q([W({ attribute: !1 })], on.prototype, "weatherEntity", void 0), q([W({ type: Array })], on.prototype, "forecast", void 0), on = q([U("lucarne-weather-block")], on);
//#endregion
//#region src/components/member-avatar.ts
var sn, cn = /^(?=.*[\p{Extended_Pictographic}\p{Regional_Indicator}])[\p{Extended_Pictographic}\p{Emoji_Component}\p{Emoji_Modifier}\p{Regional_Indicator}‍️]+$/u, ln = (sn = class extends H {
	constructor(...e) {
		super(...e), this.name = "", this.color = "#a8d8b9", this.avatar = null;
	}
	render() {
		let e = this.avatar;
		if (e && e.startsWith("/local/")) return L`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <img src="${e}" alt="${this.name}" />
        </div>
      `;
		if (e && cn.test(e)) return L`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <span class="emoji">${e}</span>
        </div>
      `;
		let t = this.name.trim().charAt(0) || "?";
		return L`
      <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
        <span class="initial">${t}</span>
      </div>
    `;
	}
}, sn.styles = M`
    :host {
      display: block;
    }
    .avatar {
      width: clamp(48px, 6vw, 72px);
      height: clamp(48px, 6vw, 72px);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .initial {
      font-size: clamp(1.25rem, 2.5vw, 2rem);
      font-weight: 700;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1;
      text-transform: uppercase;
      font-family: var(--primary-font-family, sans-serif);
    }
    .emoji {
      font-size: clamp(1.5rem, 3vw, 2.25rem);
      line-height: 1;
    }
  `, sn);
q([W()], ln.prototype, "name", void 0), q([W()], ln.prototype, "color", void 0), q([W()], ln.prototype, "avatar", void 0), ln = q([U("lucarne-member-avatar")], ln);
//#endregion
//#region src/shared/rotation.ts
function un(e, t) {
	let n = /* @__PURE__ */ new Set(), r = [];
	for (let i of e) t.has(i) && !n.has(i) && (n.add(i), r.push(i));
	return r;
}
function dn(e, t, n) {
	let r = un(e, n);
	return r.length === 0 ? null : r.includes(t) ? r[(r.indexOf(t) + 1) % r.length] : r[0];
}
//#endregion
//#region src/components/task-row.ts
var fn, pn = 500, mn = (fn = class extends H {
	constructor(...e) {
		super(...e), this.memberColor = "#a8d8b9", this.compact = !1, this.members = [], this._pressTimer = null, this._longPressed = !1;
	}
	_onPointerDown(e) {
		this._longPressed = !1, this._pressTimer = setTimeout(() => {
			this._longPressed = !0, this.dispatchEvent(new CustomEvent("task-long-press", {
				detail: { task: this.task },
				bubbles: !0,
				composed: !0
			}));
		}, pn), e.currentTarget.setPointerCapture(e.pointerId);
	}
	_onPointerUp() {
		this._pressTimer !== null && (clearTimeout(this._pressTimer), this._pressTimer = null);
	}
	_onPointerCancel() {
		this._pressTimer !== null && (clearTimeout(this._pressTimer), this._pressTimer = null);
	}
	_onClick() {
		this._longPressed || this.dispatchEvent(new CustomEvent("task-toggle", {
			detail: { task: this.task },
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		if (!this.task) return L``;
		let e = this.task.status === "completed", t = this.task.metadata.icon, n = this.task.due, r = this.task.metadata.type === "rotating", i = null;
		if (r) {
			let e = this.task.metadata.rotation_owners ?? [], t = this.task.metadata.current_owner ?? "";
			if (e.length > 1) {
				let n = dn(e, t, new Set(this.members.filter((e) => e.slug !== "household").map((e) => e.slug)));
				if (n) {
					let e = this.members.find((e) => e.slug === n);
					i = (e == null ? void 0 : e.name) ?? n;
				}
			}
		}
		return L`
      <div
        class="row"
        style="--member-color:${this.memberColor}"
        role="checkbox"
        aria-checked=${e}
        tabindex="0"
        @click=${this._onClick}
        @keydown=${(e) => {
			(e.key === "Enter" || e.key === " ") && !e.repeat && (e.preventDefault(), this._onClick());
		}}
        @pointerdown=${this._onPointerDown}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerCancel}
      >
        <div class="check ${e ? "done" : ""}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="rgba(0,0,0,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        ${t ? L`<span class="icon">${t}</span>` : ""}
        <div class="middle">
          <span class="label ${e ? "done" : ""}">${this.task.summary}</span>
          ${i ? L`<span class="rotation-next">next: ${i}</span>` : ""}
        </div>
        ${r ? L`<span class="rotation-badge" aria-hidden="true">↻</span>` : ""}
        ${n ? L`<span class="due">${this._formatDue(n)}</span>` : ""}
      </div>
    `;
	}
	_formatDue(e) {
		if (e.includes("T")) {
			let t = new Date(e);
			return isNaN(t.getTime()) ? e : t.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			});
		}
		if (e.length === 10) {
			let t = /* @__PURE__ */ new Date(e + "T00:00:00");
			if (!isNaN(t.getTime())) return t.toLocaleDateString("en", {
				month: "short",
				day: "numeric"
			});
		}
		return e;
	}
}, fn.styles = M`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 4px;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.1s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    /* compact tightens visual spacing while preserving the 44px hit area —
       per a11y guidelines the interactive role="checkbox" must keep that
       minimum touch target. Density comes from the smaller circle + gap. */
    :host([compact]) .row {
      gap: 8px;
      padding: 4px 2px;
    }
    .row:hover,
    .row:active {
      background: rgba(0, 0, 0, 0.04);
    }
    .check {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
    }
    :host([compact]) .check {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }
    :host([compact]) .check svg {
      width: 12px;
      height: 12px;
    }
    .check.done {
      background: var(--member-color, #a8d8b9);
      border-color: var(--member-color, #a8d8b9);
    }
    .check svg {
      width: 14px;
      height: 14px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .check.done svg {
      opacity: 1;
    }
    .icon {
      font-size: 1.1rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .middle {
      flex: 1;
      min-width: 0;
    }
    .label {
      font-size: clamp(0.95rem, 1.2vw, 1.05rem);
      color: var(--primary-text-color, #212121);
      font-family: var(--primary-font-family, sans-serif);
      transition: text-decoration 0.15s, color 0.15s;
      /* Wrap long task text instead of overflowing the column. The label is an
         inline span, so overflow/text-overflow never clipped it — nowrap just
         pushed the column wide and forced a horizontal scrollbar (issue #69).
         overflow-wrap: anywhere breaks single overlong words too. */
      overflow-wrap: anywhere;
    }
    .label.done {
      text-decoration: line-through;
      color: var(--secondary-text-color, #727272);
      opacity: 0.6;
    }
    .due {
      font-size: 0.75rem;
      color: var(--secondary-text-color, #727272);
      flex-shrink: 0;
    }
    .rotation-badge {
      font-size: 0.9rem;
      opacity: 0.55;
      flex-shrink: 0;
    }
    .rotation-next {
      font-size: 0.7rem;
      color: var(--secondary-text-color, #727272);
      display: block;
    }
  `, fn);
q([W({ attribute: !1 })], mn.prototype, "task", void 0), q([W()], mn.prototype, "memberColor", void 0), q([W({
	type: Boolean,
	reflect: !0
})], mn.prototype, "compact", void 0), q([W({ attribute: !1 })], mn.prototype, "members", void 0), mn = q([U("lucarne-task-row")], mn);
//#endregion
//#region src/components/tasks-summary.ts
var hn, gn = "household";
function _n(e) {
	return e.length === 10 ? /* @__PURE__ */ new Date(e + "T00:00:00") : new Date(e);
}
function vn(e, t) {
	let n = new Date(t);
	n.setHours(0, 0, 0, 0);
	let r = new Date(n);
	r.setDate(r.getDate() + 1);
	let i = new Date(n);
	i.setDate(i.getDate() + 4);
	let a = (e) => {
		if (!e.due) return 3;
		let t = _n(e.due);
		return t < n ? 0 : t < r ? 1 : t < i ? 2 : 4;
	};
	return [...e].sort((e, t) => {
		let n = a(e), r = a(t);
		if (n !== r) return n - r;
		if (n === 3) return e.summary.localeCompare(t.summary);
		let i = e.due ? _n(e.due).getTime() : 0, o = t.due ? _n(t.due).getTime() : 0;
		return i === o ? e.summary.localeCompare(t.summary) : i - o;
	});
}
function yn(e) {
	return {
		uid: e.uid,
		summary: e.summary,
		status: e.status,
		due: e.due ?? null,
		description: e.description ?? "",
		metadata: {
			item_uid: e.uid,
			member_slug: gn,
			assignee_slug: "",
			type: "chore",
			recurrence: "",
			icon: "",
			source: "manual"
		}
	};
}
var bn = (hn = class extends H {
	constructor(...e) {
		super(...e), this.items = [], this.integrationMode = !1, this.renderableTasks = [], this.members = [], this.limit = 5, this.refillOnComplete = !1, this._admitted = /* @__PURE__ */ new Set(), this._burned = /* @__PURE__ */ new Set(), this._windowKey = "";
	}
	_resolveVisible(e) {
		let t = /* @__PURE__ */ new Date(), n = vn(e.filter((e) => e.status === "needs_action"), t), r = n.length;
		if (this.refillOnComplete) return this._admitted.clear(), this._burned.clear(), this._windowKey = "", {
			visible: n.slice(0, this.limit),
			totalActive: r
		};
		let i = `${this.todoEntityId ?? ""}#${this.limit}`;
		i !== this._windowKey && (this._windowKey = i, this._admitted = /* @__PURE__ */ new Set(), this._burned = /* @__PURE__ */ new Set());
		let a = new Set(n.map((e) => e.uid));
		for (let e of this._admitted) a.has(e) ? this._burned.delete(e) : this._burned.add(e);
		let o = Math.max(0, this.limit - this._burned.size) - n.filter((e) => this._admitted.has(e.uid)).length;
		for (let e of n) {
			if (o <= 0) break;
			this._admitted.has(e.uid) || (this._admitted.add(e.uid), o--);
		}
		return {
			visible: n.filter((e) => this._admitted.has(e.uid)),
			totalActive: r
		};
	}
	render() {
		let e = this.integrationMode ? this.renderableTasks : this.items.map(yn), { visible: t, totalActive: n } = this._resolveVisible(e);
		return n === 0 ? L`
        <div class="empty-state">
          <span class="empty-icon">${Yt}</span>
          ${J.allDone}
        </div>
      ` : t.length === 0 ? L`
        <div class="empty-state">
          <span class="empty-icon">${Yt}</span>
          ${J.allDoneForNow}
        </div>
      ` : L`
      <div class="header">
        ${J.tasksTitle}
        <span class="count-badge">${n}</span>
      </div>
      <div class="task-list">${t.map((e) => this._renderTaskLine(e))}</div>
    `;
	}
	_renderTaskLine(e) {
		let t = this._ownerFor(e);
		return L`
      <div class="task-line">
        ${t ? this._renderOwnerAvatar(t) : ""}
        <lucarne-task-row
          compact
          .task=${e}
          .memberColor=${(t == null ? void 0 : t.color) ?? "var(--primary-color)"}
        ></lucarne-task-row>
      </div>
    `;
	}
	_renderOwnerAvatar(e) {
		let t = e.avatar;
		if (t && t.startsWith("/local/")) return L`
        <div class="owner-avatar" style="background:${e.color}" title="${e.name}">
          <img src="${t}" alt="${e.name}" />
        </div>
      `;
		if (t && cn.test(t)) return L`
        <div class="owner-avatar" style="background:${e.color}" title="${e.name}">
          <span>${t}</span>
        </div>
      `;
		let n = e.name.trim().charAt(0) || "?";
		return L`
      <div class="owner-avatar" style="background:${e.color}" title="${e.name}">
        <span class="initial">${n}</span>
      </div>
    `;
	}
	_ownerFor(e) {
		if (!this.integrationMode) return null;
		let t = e.metadata.member_slug;
		return !t || t === gn ? null : this.members.find((e) => e.slug === t) ?? null;
	}
}, hn.styles = [K, M`
      :host {
        display: block;
        padding: var(--lucarne-spacing-md) var(--lucarne-spacing-lg);
      }
      .header {
        display: flex;
        align-items: baseline;
        gap: var(--lucarne-spacing-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .count-badge {
        background: var(--lucarne-color-ingrid);
        color: #5b3f7e;
        padding: 1px 7px;
        border-radius: var(--lucarne-radius-lg);
        font-size: 0.8em;
        font-weight: 700;
      }
      .task-list {
        display: flex;
        flex-direction: column;
        /* Only up to "limit" rows are rendered (backlog beyond it is
           intentionally not shown). This is a safety cap: if the host card sets
           --lucarne-tasks-max-height and those rendered rows exceed it, they
           scroll rather than overflow. Uncapped (none) by default. */
        max-height: var(--lucarne-tasks-max-height, none);
        overflow-y: auto;
      }
      .task-line {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .task-line + .task-line {
        border-top: 1px solid rgba(0, 0, 0, 0.05);
      }
      .task-line lucarne-task-row {
        flex: 1;
        min-width: 0;
      }
      .owner-avatar {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        font-size: 13px;
        line-height: 1;
        color: rgba(0, 0, 0, 0.75);
      }
      .owner-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .owner-avatar .initial {
        font-weight: 700;
        text-transform: uppercase;
        font-family: var(--primary-font-family, sans-serif);
        font-size: 11px;
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-lg) 0;
        color: #4caf50;
        font-size: var(--lucarne-fs-md);
      }
      .empty-icon {
        width: 28px;
        height: 28px;
        color: #4caf50;
      }
    `], hn);
q([W({ type: Array })], bn.prototype, "items", void 0), q([W({ type: String })], bn.prototype, "todoEntityId", void 0), q([W({ type: Boolean })], bn.prototype, "integrationMode", void 0), q([W({ attribute: !1 })], bn.prototype, "renderableTasks", void 0), q([W({ attribute: !1 })], bn.prototype, "members", void 0), q([W({ type: Number })], bn.prototype, "limit", void 0), q([W({ type: Boolean })], bn.prototype, "refillOnComplete", void 0), bn = q([U("lucarne-tasks-summary")], bn);
//#endregion
//#region src/components/presence-pills.ts
var xn, Sn = (xn = class extends H {
	constructor(...e) {
		super(...e), this.entries = [];
	}
	render() {
		return L`
      ${this.entries.map((e) => L`
          <span class="pill ${e.isHome ? "home" : "away"}">
            <span class="dot"></span>
            ${e.name}
          </span>
        `)}
    `;
	}
}, xn.styles = [K, M`
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-xs);
      }
      .pill {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px 3px 7px;
        border-radius: var(--lucarne-radius-lg);
        font-size: var(--lucarne-fs-sm);
        font-weight: 500;
        background: var(--lucarne-surface);
        border: 1.5px solid currentColor;
        transition: opacity 0.2s;
      }
      .pill.away {
        opacity: 0.45;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pill.home .dot {
        background: #4caf50;
      }
      .pill.away .dot {
        background: #9e9e9e;
      }
      .pill.home {
        color: #2e7d32;
        border-color: #a5d6a7;
      }
      .pill.away {
        color: var(--lucarne-on-surface-muted);
        border-color: #e0e0e0;
      }
    `], xn);
q([W({ type: Array })], Sn.prototype, "entries", void 0), Sn = q([U("lucarne-presence-pills")], Sn);
//#endregion
//#region src/components/family-ready-pill.ts
var Cn, wn = (Cn = class extends H {
	constructor(...e) {
		super(...e), this.members = [], this.tasksByMember = /* @__PURE__ */ new Map();
	}
	_handleClick() {
		this.dispatchEvent(new CustomEvent("family-ready-clicked", {
			bubbles: !0,
			composed: !0
		}));
	}
	_computeReadiness() {
		let e = 0, t = 0, n = /* @__PURE__ */ new Date();
		for (let r of this.members) {
			let i = (this.tasksByMember.get(r.slug) ?? []).filter((e) => e.metadata.type === "routine" && Lt(Ot(e.metadata.recurrence), n));
			i.length !== 0 && (e++, i.every((e) => e.status === "completed") && t++);
		}
		return {
			readyCount: t,
			totalWithRoutines: e
		};
	}
	render() {
		let { readyCount: e, totalWithRoutines: t } = this._computeReadiness();
		if (t === 0) return L`
        <div class="pill none" @click=${this._handleClick}>
          <span class="icon">✓</span>
          ${J.noRoutinesToday}
        </div>
      `;
		let n = e === t;
		return L`
      <div class="pill ${n ? "all-done" : ""}" @click=${this._handleClick}>
        <span class="icon">${n ? "🎉" : "⏳"}</span>
        ${J.familyReady(e, t)}
      </div>
    `;
	}
}, Cn.styles = [K, M`
      :host {
        display: inline-block;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: var(--lucarne-radius-lg);
        background: rgba(0, 0, 0, 0.07);
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }
      .pill:hover {
        background: rgba(0, 0, 0, 0.12);
      }
      .pill.all-done {
        background: var(--lucarne-success-bg);
        color: var(--lucarne-success-fg);
      }
      .pill.none {
        opacity: 0.5;
      }
      .icon {
        font-size: 1.1em;
      }
    `], Cn);
q([W({ attribute: !1 })], wn.prototype, "members", void 0), q([W({ attribute: !1 })], wn.prototype, "tasksByMember", void 0), wn = q([U("lucarne-family-ready-pill")], wn);
//#endregion
//#region src/cards/lucarne-today-card.ts
var Tn, En = [
	"calendar",
	"weather",
	"tasks"
];
function Dn(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e ?? []) En.includes(r) && !t.has(r) && (t.add(r), n.push(r));
	for (let e of En) t.has(e) || n.push(e);
	return n;
}
window.customCards = window.customCards || [], window.customCards.push({
	type: "lucarne-today-card",
	name: "Lucarne Today",
	description: "Family agenda + weather + tasks + presence",
	preview: !0
});
var On = (Tn = class extends ut {
	constructor(...e) {
		super(...e), this._calendarEvents = /* @__PURE__ */ new Map(), this._forecast = [], this._todoItems = [], this._familyState = null, this._optimistic = /* @__PURE__ */ new Map(), this._fetchingForecast = !1, this._lastWeatherState = "", this._applyOptimistic = (e) => {
			let t = this._optimistic.get(e.uid);
			return t && t !== e.status ? {
				...e,
				status: t
			} : e;
		};
	}
	applyConfig(e) {
		if (!e.calendars || !Array.isArray(e.calendars) || e.calendars.length === 0) throw new lt("lucarne-today-card: \"calendars\" must be a non-empty array");
		for (let t of e.calendars) if (!t || typeof t != "object" || !t.entity || !t.color) throw new lt("lucarne-today-card: each calendar entry requires \"entity\" and \"color\"");
		this._config = e, this.isConnected && (this._teardownSubscriptions(), this._setupSubscriptions());
	}
	static getConfigElement() {
		return document.createElement("lucarne-today-card-editor");
	}
	static getStubConfig(e) {
		let t = Object.keys(e.states).filter((e) => e.startsWith("calendar.")).slice(0, 3), n = [
			"#a8d8b9",
			"#a8c5e8",
			"#c8b4e0"
		], r = t.map((e, t) => ({
			entity: e,
			color: n[t] ?? "#a8d8b9"
		})), i = "weather.forecast_home" in e.states;
		return {
			type: "custom:lucarne-today-card",
			title: J.today,
			calendars: r.length ? r : [{
				entity: "calendar.example",
				color: "#a8d8b9"
			}],
			weather: i ? "weather.forecast_home" : void 0
		};
	}
	getCardSize() {
		return 4;
	}
	getGridOptions() {
		return {
			columns: 6,
			rows: "auto",
			min_columns: 3,
			max_columns: 6
		};
	}
	connectedCallback() {
		super.connectedCallback(), this._setupSubscriptions(), this._previewOverrideRaf = requestAnimationFrame(() => {
			this._previewOverrideRaf = void 0, this.isConnected && (this._previewOverride = xt(this));
		});
	}
	disconnectedCallback() {
		var e;
		super.disconnectedCallback(), this._teardownSubscriptions(), this._previewOverrideRaf !== void 0 && (cancelAnimationFrame(this._previewOverrideRaf), this._previewOverrideRaf = void 0), (e = this._previewOverride) == null || e.uninstall(), this._previewOverride = void 0;
	}
	_setupSubscriptions() {
		!this._config || !this.hass || (this._fetchCalendarEvents(), this._config.weather && this._fetchForecast(), this._calendarIntervalId = setInterval(() => {
			var e;
			this._fetchCalendarEvents(), (e = this._config) != null && e.weather && this._fetchForecast();
		}, 300 * 1e3), this._config.tasks && !this._config.household_tasks_from_integration && (this._todoUnsub = vt(this.hass, this._config.tasks, (e) => {
			this._todoItems = e, this._reconcileOptimistic();
		})), (this._config.household_tasks_from_integration || this._config.show_family_ready_pill || this._config.tasks) && (this._unsubFamily = Et(this.hass, (e) => {
			this._familyState = e, this._reconcileOptimistic();
		})));
	}
	_teardownSubscriptions() {
		var e, t;
		clearInterval(this._calendarIntervalId), (e = this._todoUnsub) == null || e.call(this), this._todoUnsub = void 0, (t = this._unsubFamily) == null || t.call(this), this._unsubFamily = void 0, this._calendarIntervalId = void 0;
	}
	updated(e) {
		if (super.updated(e), !e.has("hass") || !this._config) return;
		if (!e.get("hass") && this.hass && !this._calendarIntervalId) {
			this._setupSubscriptions();
			return;
		}
		let t = this._config.weather;
		if (t) {
			var n;
			let e = (n = this.hass.states[t]) == null ? void 0 : n.state;
			e && e !== this._lastWeatherState && (this._lastWeatherState = e, this._fetchForecast());
		}
	}
	async _fetchCalendarEvents() {
		if (!this._config || !this.hass) return;
		let e = this._config.calendars.map((e) => e.entity), t = /* @__PURE__ */ new Date();
		t.setHours(0, 0, 0, 0);
		let n = new Date(Date.now() + 10080 * 60 * 1e3), { events: r } = await mt(this.hass, e, t, n), i = /* @__PURE__ */ new Map();
		for (let [e, t] of r.entries()) i.set(e, t.map((t) => ({
			...t,
			uid: `${e}::${t.uid ?? t.summary}`
		})));
		this._calendarEvents = i;
	}
	async _fetchForecast() {
		var e;
		if (!(this._fetchingForecast || !((e = this._config) != null && e.weather) || !this.hass)) {
			this._fetchingForecast = !0;
			try {
				var t;
				let e = await this.hass.connection.sendMessagePromise({
					type: "call_service",
					domain: "weather",
					service: "get_forecasts",
					service_data: { type: "daily" },
					target: { entity_id: this._config.weather },
					return_response: !0
				});
				this._forecast = (e == null || (t = e.response) == null || (t = t[this._config.weather]) == null ? void 0 : t.forecast) ?? [];
			} catch (e) {
				console.warn(`[lucarne] weather.get_forecasts failed for ${this._config.weather}:`, e), this._forecast = [];
			} finally {
				this._fetchingForecast = !1;
			}
		}
	}
	get _mergedEvents() {
		let e = [];
		for (let t of this._calendarEvents.values()) e.push(...t);
		return e;
	}
	get _calendarColorMap() {
		var e;
		let t = /* @__PURE__ */ new Map();
		for (let n of ((e = this._config) == null ? void 0 : e.calendars) ?? []) t.set(n.entity, n.color);
		return t;
	}
	get _householdTasks() {
		var e;
		return ((e = this._familyState) == null ? void 0 : e.tasksByMember.get("household")) ?? [];
	}
	get _familyMembers() {
		var e;
		return ((e = this._familyState) == null ? void 0 : e.members) ?? [];
	}
	get _familyTasksByMember() {
		var e;
		return ((e = this._familyState) == null ? void 0 : e.tasksByMember) ?? /* @__PURE__ */ new Map();
	}
	get _enrichedRawTasks() {
		var e, t, n;
		if (!((e = this._config) != null && e.tasks)) return [];
		let r = ((t = this._familyState) == null ? void 0 : t.taskMetadataByUid) ?? /* @__PURE__ */ new Map(), i = ((n = this._familyState) == null || (n = n.members.find((e) => e.todo_entity_id === this._config.tasks)) == null ? void 0 : n.slug) ?? "";
		return this._todoItems.map((e) => {
			let t = r.get(e.uid) ?? {
				item_uid: e.uid,
				member_slug: i,
				assignee_slug: "",
				type: "chore",
				recurrence: "",
				icon: "",
				source: "manual"
			};
			return {
				uid: e.uid,
				summary: e.summary,
				status: e.status,
				due: e.due ?? null,
				description: e.description ?? "",
				metadata: t
			};
		});
	}
	async _handleTaskToggle(e) {
		let { task: t } = e.detail;
		if (!this.hass) return;
		let n = t.status === "completed" ? "needs_action" : "completed", r = this._resolveTaskEntityId(t);
		if (r) {
			this._optimistic = new Map(this._optimistic).set(t.uid, n);
			try {
				await this.hass.callService("todo", "update_item", {
					item: t.uid,
					status: n
				}, { entity_id: r });
			} catch (e) {
				let n = new Map(this._optimistic);
				throw n.delete(t.uid), this._optimistic = n, e;
			}
		}
	}
	_reconcileOptimistic() {
		if (this._optimistic.size === 0) return;
		let e = /* @__PURE__ */ new Map();
		for (let t of this._todoItems) e.set(t.uid, t.status);
		if (this._familyState) for (let t of this._familyState.tasksByMember.values()) for (let n of t) e.set(n.uid, n.status);
		let t = !1, n = new Map(this._optimistic);
		for (let [r, i] of n) {
			let a = e.get(r);
			(a === void 0 || a === i) && (n.delete(r), t = !0);
		}
		t && (this._optimistic = n);
	}
	_handleTaskLongPress(e) {
		let { task: t } = e.detail, n = this._resolveTaskEntityId(t);
		n && this.dispatchEvent(new CustomEvent("hass-more-info", {
			detail: { entityId: n },
			bubbles: !0,
			composed: !0
		}));
	}
	_resolveTaskEntityId(e) {
		var t, n;
		if ((t = this._config) != null && t.household_tasks_from_integration && this._familyState) {
			let t = e.metadata.member_slug;
			if (t === "household") return "todo.lucarne_household";
			let n = this._familyState.members.find((e) => e.slug === t);
			return n != null && n.todo_entity_id ? n.todo_entity_id : void 0;
		}
		return (n = this._config) == null ? void 0 : n.tasks;
	}
	_renderCalendarSection() {
		var e;
		return L`
      <div class="section section-calendar" data-section="calendar">
        <lucarne-agenda-strip
          .events=${this._mergedEvents}
          .calendarColors=${this._calendarColorMap}
          .windowDays=${(e = this._config) != null && e.agenda_show_tomorrow ? 2 : 1}
        ></lucarne-agenda-strip>
      </div>
    `;
	}
	_renderWeatherSection() {
		var e, t;
		return L`
      <div class="section section-weather" data-section="weather">
        <lucarne-weather-block
          .weatherEntity=${(e = this._config) != null && e.weather ? (t = this.hass) == null ? void 0 : t.states[this._config.weather] : void 0}
          .forecast=${this._forecast}
        ></lucarne-weather-block>
      </div>
    `;
	}
	get _maxTasks() {
		var e;
		let t = (e = this._config) == null ? void 0 : e.max_tasks;
		return typeof t == "number" && Number.isFinite(t) ? Math.max(1, Math.floor(t)) : 5;
	}
	_renderTasksSection(e, t) {
		var n, r;
		if (!e && !t) return "";
		let i = /* @__PURE__ */ new Date(), a = (t ? this._householdTasks : this._enrichedRawTasks).filter((e) => {
			if (e.metadata.type === "rotating") return !1;
			if (e.metadata.type === "routine") {
				let t = Ot(e.metadata.recurrence);
				return t.mode === "none" || t.mode === "unknown" ? !0 : Lt(t, i);
			}
			return !0;
		}).map(this._applyOptimistic), o = t ? "todo.lucarne_household" : (n = this._config) == null ? void 0 : n.tasks;
		return L`
      <div
        class="section section-tasks"
        data-section="tasks"
        @task-toggle=${this._handleTaskToggle}
        @task-long-press=${this._handleTaskLongPress}
      >
        <lucarne-tasks-summary
          .integrationMode=${!0}
          .renderableTasks=${a}
          .members=${this._familyMembers}
          .todoEntityId=${o}
          .limit=${this._maxTasks}
          .refillOnComplete=${((r = this._config) == null ? void 0 : r.refill_tasks_on_complete) ?? !1}
        ></lucarne-tasks-summary>
      </div>
    `;
	}
	renderContent() {
		if (!this._config) return L``;
		let e = (this._config.presence ?? []).map((e) => {
			var t;
			return {
				name: e.name,
				isHome: ((t = this.hass) == null || (t = t.states[e.entity]) == null ? void 0 : t.state) === "on"
			};
		}), t = this._familyState !== null && this._familyState.integrationError === null, n = (this._config.show_family_ready_pill ?? !1) && t, r = (this._config.household_tasks_from_integration ?? !1) && t, i = !(this._config.household_tasks_from_integration ?? !1) && !!this._config.tasks, a = Dn(this._config.section_order);
		return L`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title ?? J.today}</h2>
          <div class="header-right">
            ${e.length > 0 ? L`<lucarne-presence-pills .entries=${e}></lucarne-presence-pills>` : ""}
            ${n ? L`<lucarne-family-ready-pill
                  .members=${this._familyMembers}
                  .tasksByMember=${this._familyTasksByMember}
                ></lucarne-family-ready-pill>` : ""}
          </div>
        </div>
        <div class="card-body">
          ${a.map((e) => {
			switch (e) {
				case "calendar": return this._renderCalendarSection();
				case "weather": return this._renderWeatherSection();
				case "tasks": return this._renderTasksSection(i, r);
			}
		})}
        </div>
      </ha-card>
    `;
	}
}, Tn.styles = [K, M`
      :host {
        display: block;
        width: 100%;
        font-family: var(--primary-font-family, sans-serif);
        container-type: inline-size;
      }
      ha-card {
        width: 100%;
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        /* Fixed outer height shared with the Calendar card; the body flexes to
           fill the remainder below the header. */
        height: var(--lucarne-card-fill-height);
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .card-body {
        display: flex;
        flex-direction: column;
        /* Fill the space below the header; section-tasks absorbs the slack when
           content is short, and the body scrolls if it would overflow the fixed
           card height instead of being clipped. */
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }
      .section + .section {
        border-top: 1px solid rgba(0, 0, 0, 0.07);
      }
      /* Tasks absorb any vertical slack so the card fills to the shared height
         with the list at the bottom rather than a blank gap. */
      .section-tasks {
        flex: 1 1 auto;
        min-height: 0;
      }
    `], Tn);
q([W({ attribute: !1 })], On.prototype, "hass", void 0), q([G()], On.prototype, "_config", void 0), q([G()], On.prototype, "_calendarEvents", void 0), q([G()], On.prototype, "_forecast", void 0), q([G()], On.prototype, "_todoItems", void 0), q([G()], On.prototype, "_familyState", void 0), q([G()], On.prototype, "_optimistic", void 0), On = q([U("lucarne-today-card")], On);
//#endregion
//#region src/shared/editor-styles.ts
var kn = M`
  :host {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-md);
    padding: var(--lucarne-spacing-lg);
    box-sizing: border-box;
    width: 100%;
  }
  .section-label {
    font-size: var(--lucarne-fs-sm);
    font-weight: 600;
    color: var(--lucarne-on-surface-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: var(--lucarne-spacing-md) 0 var(--lucarne-spacing-xs);
  }
  .section-label:first-of-type {
    margin-top: 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-xs);
  }
  .field-inline {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--lucarne-spacing-md);
  }
  .field-inline .field-label {
    flex: 1;
  }
  .field-inline input[type='checkbox'] {
    flex-shrink: 0;
    margin: 0;
  }
  /* Custom checkbox: the native control follows the OS color-scheme and renders
     as a black box on a light HA theme when the OS is dark. Render it ourselves
     from theme tokens so it matches the card surface + accent. (Same treatment
     the chores editor applies to its own checkboxes.) */
  input[type='checkbox'] {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    margin: 0;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
    border: 2px solid var(--lucarne-on-surface-muted, #727272);
    border-radius: 4px;
    background: var(--lucarne-surface, var(--ha-card-background, #fff));
  }
  input[type='checkbox']:checked {
    background: var(--primary-color, #03a9f4);
    border-color: var(--primary-color, #03a9f4);
  }
  input[type='checkbox']:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  input[type='checkbox']:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  .field-label {
    font-size: var(--lucarne-fs-sm);
    color: var(--lucarne-on-surface-muted);
  }
  .row {
    display: flex;
    gap: var(--lucarne-spacing-sm);
    align-items: flex-start;
  }
  .row > * {
    flex: 1;
  }
  .text-input,
  .select-input {
    font: inherit;
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
    border-radius: var(--lucarne-radius-sm);
    padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
    width: 100%;
    box-sizing: border-box;
  }
  .text-input:focus,
  .select-input:focus {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: -1px;
  }
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--lucarne-spacing-md);
    padding: var(--lucarne-spacing-xs) 0;
  }
  .toggle-label {
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
  }
  .cal-row,
  .presence-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--lucarne-spacing-sm);
    align-items: center;
    padding: var(--lucarne-spacing-sm) 0;
    border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
  }
  .presence-row {
    grid-template-columns: 1fr auto;
  }
  .row-stack {
    display: flex;
    flex-direction: column;
    gap: var(--lucarne-spacing-xs);
    min-width: 0;
  }
  .cal-row ha-entity-picker,
  .presence-row ha-entity-picker,
  .row ha-entity-picker,
  .row-stack ha-entity-picker {
    width: 100%;
    min-width: 0;
  }
  .cal-color {
    width: 24px;
    height: 24px;
    border-radius: var(--lucarne-radius-sm);
    border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    appearance: none;
    -webkit-appearance: none;
  }
  .cal-color::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  .cal-color::-webkit-color-swatch {
    border: none;
    border-radius: var(--lucarne-radius-sm);
  }
  button.remove {
    background: none;
    border: none;
    color: var(--error-color, #f44336);
    cursor: pointer;
    font-size: 1.1em;
    padding: 4px 8px;
    border-radius: var(--lucarne-radius-sm);
  }
  .editor-error {
    color: var(--error-color, #f44336);
    font-size: var(--lucarne-fs-sm);
    margin-top: var(--lucarne-spacing-xs);
  }
  button.add {
    background: none;
    border: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.2));
    border-radius: var(--lucarne-radius-md);
    padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
    cursor: pointer;
    color: var(--lucarne-on-surface-muted);
    font-size: var(--lucarne-fs-sm);
    width: 100%;
    text-align: center;
    margin-top: var(--lucarne-spacing-xs);
  }
  button.add:hover {
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  }
  .loading {
    color: var(--lucarne-on-surface-muted);
    font-size: var(--lucarne-fs-sm);
    text-align: center;
    padding: var(--lucarne-spacing-lg);
  }
`, An = ["ha-entity-picker", "ha-textfield"], jn = 3e3, Mn;
function Nn(e) {
	return new Promise((t) => setTimeout(t, e));
}
async function Pn() {
	let e = window.loadCardHelpers;
	if (e) try {
		let t = await e(), n = (await Promise.resolve(t.createCardElement({
			type: "entities",
			entities: []
		}))).constructor;
		typeof (n == null ? void 0 : n.getConfigElement) == "function" && await Promise.resolve(n.getConfigElement());
	} catch (e) {
		console.warn("[lucarne] loadCardHelpers failed; falling back to whenDefined", e);
	}
	let t = Promise.all(An.map((e) => customElements.whenDefined(e))).then(() => "ready"), n = Nn(jn).then(() => "timeout");
	if (await Promise.race([t, n]) === "timeout" && !An.every((e) => customElements.get(e))) throw Error("[lucarne] HA form elements did not register within timeout");
}
function Fn() {
	return Mn || (Mn = Pn().catch((e) => {
		throw Mn = void 0, e;
	})), Mn;
}
//#endregion
//#region node_modules/custom-card-helpers/dist/index.m.js
var In;
(function(e) {
	e.language = "language", e.system = "system", e.comma_decimal = "comma_decimal", e.decimal_comma = "decimal_comma", e.space_comma = "space_comma", e.none = "none";
})(In || (In = {}));
var Ln;
(function(e) {
	e.language = "language", e.system = "system", e.am_pm = "12", e.twenty_four = "24";
})(Ln || (Ln = {}));
var Rn = (e, t, n, r) => {
	r = r || {}, n = n ?? {};
	let i = new Event(t, {
		bubbles: r.bubbles === void 0 ? !0 : r.bubbles,
		cancelable: !!r.cancelable,
		composed: r.composed === void 0 ? !0 : r.composed
	});
	return i.detail = n, e.dispatchEvent(i), i;
}, zn, Bn = (zn = class extends H {
	constructor(...e) {
		super(...e), this.items = [], this.label = "Reorderable list", this._dragIndex = null, this._dragOverIndex = null;
	}
	_emitReorder(e, t) {
		let n = this.items.length;
		if (e === t || e < 0 || t < 0 || e >= n || t >= n) return;
		let r = this.items.map((e) => e.key), [i] = r.splice(e, 1);
		r.splice(t, 0, i), this.dispatchEvent(new CustomEvent("reorder", {
			detail: {
				from: e,
				to: t,
				order: r
			},
			bubbles: !0,
			composed: !0
		}));
	}
	_onDragStart(e, t) {
		this._dragIndex = e, t.dataTransfer && (t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("text/plain", String(e)));
	}
	_onDragOver(e, t) {
		this._dragIndex === null || this._dragIndex === e || (t.preventDefault(), t.dataTransfer && (t.dataTransfer.dropEffect = "move"), this._dragOverIndex !== e && (this._dragOverIndex = e));
	}
	_onDrop(e, t) {
		t.preventDefault();
		let n = this._dragIndex;
		this._dragIndex = null, this._dragOverIndex = null, n !== null && this._emitReorder(n, e);
	}
	_onDragEnd() {
		this._dragIndex = null, this._dragOverIndex = null;
	}
	render() {
		return L`
      <div class="reorder-list" role="list" aria-label=${this.label}>
        ${this.items.map((e, t) => L`
          <div
            class="reorder-row ${this._dragIndex === t ? "dragging" : ""} ${this._dragOverIndex === t ? "drag-over" : ""}"
            role="listitem"
            data-key=${e.key}
            draggable="true"
            @dragstart=${(e) => this._onDragStart(t, e)}
            @dragover=${(e) => this._onDragOver(t, e)}
            @drop=${(e) => this._onDrop(t, e)}
            @dragend=${this._onDragEnd}
          >
            <span class="grab-handle" aria-hidden="true" title="Drag to reorder">≡</span>
            <div class="reorder-content"><slot name=${e.key}></slot></div>
            <button
              class="move-btn move-up-btn"
              type="button"
              aria-label="Move ${e.label ?? "item"} up"
              ?disabled=${t === 0}
              @click=${() => this._emitReorder(t, t - 1)}
            >↑</button>
            <button
              class="move-btn move-down-btn"
              type="button"
              aria-label="Move ${e.label ?? "item"} down"
              ?disabled=${t === this.items.length - 1}
              @click=${() => this._emitReorder(t, t + 1)}
            >↓</button>
          </div>
        `)}
      </div>
    `;
	}
}, zn.styles = M`
    .reorder-list {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: var(--lucarne-radius-md, 12px);
      overflow: hidden;
    }
    .reorder-row {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: var(--lucarne-spacing-sm, 8px);
      padding: var(--lucarne-spacing-sm, 8px) var(--lucarne-spacing-md, 12px);
      background: var(--ha-card-background, var(--card-background-color, #fff));
    }
    .reorder-row + .reorder-row {
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
    }
    .reorder-row.dragging {
      opacity: 0.5;
    }
    .reorder-row.drag-over {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .grab-handle {
      cursor: grab;
      color: var(--lucarne-on-surface-muted, #727272);
      font-size: 1.2em;
      line-height: 1;
      user-select: none;
      padding: 0 var(--lucarne-spacing-xs, 4px);
    }
    .grab-handle:active {
      cursor: grabbing;
    }
    .reorder-content {
      min-width: 0;
    }
    .move-btn {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.15));
      border-radius: var(--lucarne-radius-sm, 8px);
      padding: 2px 8px;
      font-size: 0.9em;
      color: var(--lucarne-on-surface-muted, #727272);
      cursor: pointer;
      min-width: 28px;
    }
    .move-btn:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .move-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  `, zn);
q([W({ attribute: !1 })], Bn.prototype, "items", void 0), q([W()], Bn.prototype, "label", void 0), q([G()], Bn.prototype, "_dragIndex", void 0), q([G()], Bn.prototype, "_dragOverIndex", void 0), Bn = q([U("lucarne-reorder-list")], Bn);
//#endregion
//#region src/editors/lucarne-today-card-editor.ts
var Vn, Hn = {
	calendar: "Calendar",
	weather: "Weather",
	tasks: "Tasks"
}, Un = M`
  .section-label-cell {
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
  }
`, Wn = (Vn = class extends H {
	constructor(...e) {
		super(...e), this._haReady = !1;
	}
	connectedCallback() {
		super.connectedCallback(), Fn().catch((e) => console.warn("[lucarne] HA editor elements load failed; rendering anyway", e)).then(() => {
			this._haReady = !0;
		});
	}
	setConfig(e) {
		this._config = e;
	}
	_fire(e) {
		Rn(this, "config-changed", { config: e });
	}
	_titleChanged(e) {
		let t = e.target;
		this._fire({
			...this._config,
			title: t.value || void 0
		});
	}
	_weatherChanged(e) {
		var t;
		this._fire({
			...this._config,
			weather: ((t = e.detail) == null ? void 0 : t.value) ?? void 0
		});
	}
	_tasksChanged(e) {
		var t;
		this._fire({
			...this._config,
			tasks: ((t = e.detail) == null ? void 0 : t.value) ?? void 0
		});
	}
	_integrationTasksChanged(e) {
		let t = e.target.checked;
		this._fire({
			...this._config,
			household_tasks_from_integration: t || void 0
		});
	}
	_familyPillChanged(e) {
		let t = e.target.checked;
		this._fire({
			...this._config,
			show_family_ready_pill: t || void 0
		});
	}
	_isIntegrationAvailable() {
		var e;
		return !!(!((e = this.hass) == null || (e = e.states) == null) && e[St.todo_entity_id]);
	}
	_agendaShowTomorrowChanged(e) {
		let t = e.target.checked;
		this._fire({
			...this._config,
			agenda_show_tomorrow: t || void 0
		});
	}
	_maxTasksChanged(e) {
		let t = e.target, n = parseInt(t.value, 10);
		this._fire({
			...this._config,
			max_tasks: isNaN(n) ? void 0 : Math.max(1, n)
		});
	}
	_refillTasksChanged(e) {
		let t = e.target.checked;
		this._fire({
			...this._config,
			refill_tasks_on_complete: t || void 0
		});
	}
	_calEntityChanged(e, t) {
		var n, r;
		let i = [...((n = this._config) == null ? void 0 : n.calendars) ?? []];
		i[e] = {
			...i[e],
			entity: ((r = t.detail) == null ? void 0 : r.value) ?? ""
		}, this._fire({
			...this._config,
			calendars: i
		});
	}
	_calColorChanged(e, t) {
		var n;
		let r = [...((n = this._config) == null ? void 0 : n.calendars) ?? []];
		r[e] = {
			...r[e],
			color: t.target.value
		}, this._fire({
			...this._config,
			calendars: r
		});
	}
	_removeCalendar(e) {
		var t;
		let n = [...((t = this._config) == null ? void 0 : t.calendars) ?? []];
		n.length <= 1 || (n.splice(e, 1), this._fire({
			...this._config,
			calendars: n
		}));
	}
	_addCalendar() {
		var e, t;
		let n = Object.keys(((e = this.hass) == null ? void 0 : e.states) ?? {}).find((e) => e.startsWith("calendar.")) ?? "calendar.example", r = [...((t = this._config) == null ? void 0 : t.calendars) ?? [], {
			entity: n,
			color: "#a8d8b9"
		}];
		this._fire({
			...this._config,
			calendars: r
		});
	}
	_presenceEntityChanged(e, t) {
		var n, r;
		let i = [...((n = this._config) == null ? void 0 : n.presence) ?? []];
		i[e] = {
			...i[e],
			entity: ((r = t.detail) == null ? void 0 : r.value) ?? ""
		}, this._fire({
			...this._config,
			presence: i
		});
	}
	_presenceNameChanged(e, t) {
		var n;
		let r = [...((n = this._config) == null ? void 0 : n.presence) ?? []];
		r[e] = {
			...r[e],
			name: t.target.value
		}, this._fire({
			...this._config,
			presence: r
		});
	}
	_removePresence(e) {
		var t;
		let n = [...((t = this._config) == null ? void 0 : t.presence) ?? []];
		n.splice(e, 1), this._fire({
			...this._config,
			presence: n
		});
	}
	_addPresence() {
		var e;
		let t = [...((e = this._config) == null ? void 0 : e.presence) ?? [], {
			entity: "",
			name: ""
		}];
		this._fire({
			...this._config,
			presence: t
		});
	}
	_commitSectionOrder(e) {
		this._fire({
			...this._config,
			section_order: e
		});
	}
	_renderSectionOrder() {
		var e;
		let t = Dn((e = this._config) == null ? void 0 : e.section_order);
		return L`
      <div class="section-label">Section order</div>
      <lucarne-reorder-list
        label="Card sections (drag to reorder)"
        .items=${t.map((e) => ({
			key: e,
			label: Hn[e]
		}))}
        @reorder=${(e) => this._commitSectionOrder(e.detail.order)}
      >
        ${t.map((e) => L`<span slot=${e} class="section-label-cell">${Hn[e]}</span>`)}
      </lucarne-reorder-list>
    `;
	}
	render() {
		if (!this._config) return L``;
		if (!this._haReady) return L`<div class="loading">Loading editor…</div>`;
		let e = this._config.calendars ?? [], t = this._config.presence ?? [];
		return L`
      <label class="field">
        <span class="field-label">Card title</span>
        <input
          class="text-input"
          type="text"
          .value=${this._config.title ?? ""}
          @change=${this._titleChanged}
        />
      </label>
      <label class="field field-inline">
        <span class="field-label">Also show tomorrow in agenda</span>
        <input
          type="checkbox"
          .checked=${this._config.agenda_show_tomorrow ?? !1}
          @change=${this._agendaShowTomorrowChanged}
        />
      </label>

      ${this._renderSectionOrder()}

      <ha-entity-picker
        label="Weather entity"
        .hass=${this.hass}
        .value=${this._config.weather ?? ""}
        .includeDomains=${["weather"]}
        allow-custom-entity
        @value-changed=${this._weatherChanged}
      ></ha-entity-picker>

      <ha-entity-picker
        label="Todo entity"
        .hass=${this.hass}
        .value=${this._config.tasks ?? ""}
        .includeDomains=${["todo"]}
        allow-custom-entity
        @value-changed=${this._tasksChanged}
      ></ha-entity-picker>

      <label class="field">
        <span class="field-label">Max tasks to show</span>
        <input
          class="text-input"
          type="number"
          min="1"
          .value=${String(this._config.max_tasks ?? 5)}
          @change=${this._maxTasksChanged}
        />
      </label>
      <label class="field field-inline">
        <span class="field-label">Show a new task when one is completed</span>
        <input
          type="checkbox"
          .checked=${this._config.refill_tasks_on_complete ?? !1}
          @change=${this._refillTasksChanged}
        />
      </label>

      <div class="section-label">Lucarne Family integration</div>
      <label class="field field-inline" style="${this._isIntegrationAvailable() ? "" : "opacity:0.5;pointer-events:none"}">
        <span class="field-label">Household tasks from integration</span>
        <input
          type="checkbox"
          .checked=${this._config.household_tasks_from_integration ?? !1}
          @change=${this._integrationTasksChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable() ? "" : L`<small> — install Lucarne Family integration first</small>`}
      </label>
      <label class="field field-inline" style="${this._isIntegrationAvailable() ? "" : "opacity:0.5;pointer-events:none"}">
        <span class="field-label">Show family ready pill</span>
        <input
          type="checkbox"
          .checked=${this._config.show_family_ready_pill ?? !1}
          @change=${this._familyPillChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable() ? "" : L`<small> — install Lucarne Family integration first</small>`}
      </label>

      <div class="section-label">Calendars</div>
      ${e.map((e, t) => L`
          <div class="cal-row">
            <ha-entity-picker
              label="Calendar entity"
              .hass=${this.hass}
              .value=${e.entity}
              .includeDomains=${["calendar"]}
              allow-custom-entity
              @value-changed=${(e) => this._calEntityChanged(t, e)}
            ></ha-entity-picker>
            <input
              type="color"
              class="cal-color"
              .value=${e.color}
              @input=${(e) => this._calColorChanged(t, e)}
              title="Calendar color"
            />
            <button type="button" class="remove" @click=${() => this._removeCalendar(t)} title="Remove">✕</button>
          </div>
        `)}
      <button type="button" class="add" @click=${this._addCalendar}>+ Add calendar</button>

      <div class="section-label">Presence</div>
      ${t.map((e, t) => L`
          <div class="presence-row">
            <div class="row-stack">
              <ha-entity-picker
                label="Entity"
                .hass=${this.hass}
                .value=${e.entity}
                .includeDomains=${["input_boolean"]}
                allow-custom-entity
                @value-changed=${(e) => this._presenceEntityChanged(t, e)}
              ></ha-entity-picker>
              <input
                class="text-input"
                type="text"
                placeholder="Display name"
                .value=${e.name}
                @change=${(e) => this._presenceNameChanged(t, e)}
              />
            </div>
            <button type="button" class="remove" @click=${() => this._removePresence(t)} title="Remove">✕</button>
          </div>
        `)}
      <button type="button" class="add" @click=${this._addPresence}>+ Add person</button>
    `;
	}
}, Vn.styles = [
	K,
	kn,
	Un
], Vn);
q([W({ attribute: !1 })], Wn.prototype, "hass", void 0), q([G()], Wn.prototype, "_config", void 0), q([G()], Wn.prototype, "_haReady", void 0), Wn = q([U("lucarne-today-card-editor")], Wn);
//#endregion
//#region src/shared/calendar-helpers.ts
function Gn(e, t) {
	var n;
	let r = t == null || (n = t.states) == null || (n = n[e.entity]) == null || (n = n.attributes) == null ? void 0 : n.friendly_name;
	return typeof r == "string" && r ? r : e.entity;
}
function Kn(e, t) {
	return e.map((e) => ({
		...e,
		label: Gn(e, t)
	}));
}
//#endregion
//#region src/shared/date-helpers.ts
function qn(e, t) {
	let n = parseInt(e.split(":")[0], 10), r = parseInt(t.split(":")[0], 10), i = [];
	for (let e = n; e <= r; e++) i.push(e);
	return i;
}
function Jn(e, t, n) {
	let [r, i] = t.split(":").map(Number), [a, o] = n.split(":").map(Number), s = new Date(e);
	s.setHours(r, i, 0, 0);
	let c = new Date(e);
	return c.setHours(a, o, 0, 0), {
		bandStartMs: s.getTime(),
		bandEndMs: c.getTime()
	};
}
function Yn(e, t, n, r) {
	let i = Xn(e.start).getTime(), a = Xn(e.end).getTime(), { bandStartMs: o, bandEndMs: s } = Jn(t, n, r), c = Math.max(i, o), l = Math.min(a, s);
	return c >= l ? null : {
		start: new Date(c),
		end: new Date(l)
	};
}
function Xn(e) {
	return e.length === 10 && !e.includes("T") ? /* @__PURE__ */ new Date(`${e}T00:00:00`) : new Date(e);
}
function Zn(e) {
	return new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1, 0, 0, 0, 0).getTime() - e.getTime();
}
function Qn(e) {
	let t = e.split(":");
	if (t.length !== 2) return null;
	let [n, r] = t.map(Number);
	return !Number.isFinite(n) || !Number.isFinite(r) || n < 0 || n > 23 || r < 0 || r > 59 ? null : n * 60 + r;
}
function $n(e, t, n) {
	let r = (e) => Qn(e) ?? Infinity, i = e.getHours() * 60 + e.getMinutes();
	return i >= r(n) ? "night" : i >= r(t) ? "afternoon" : "morning";
}
function er(e, t) {
	let n = Infinity;
	for (let r of t) {
		let t = Qn(r);
		if (t === null) continue;
		let i = new Date(e.getFullYear(), e.getMonth(), e.getDate(), Math.floor(t / 60), t % 60, 0, 0);
		i.getTime() <= e.getTime() && i.setDate(i.getDate() + 1), n = Math.min(n, i.getTime() - e.getTime());
	}
	return n;
}
//#endregion
//#region src/shared/calendar-layout.ts
function tr(e) {
	return e.start.length === 10 && !e.start.includes("T");
}
function Y(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function nr(e) {
	return e.uid ?? `${e.start}|${e.end}|${e.summary ?? ""}`;
}
function rr(e) {
	if (e.length === 0) return [];
	let t = e.map((e, t) => ({
		...e,
		_idx: t
	}));
	t.sort((e, t) => e.start.getTime() - t.start.getTime());
	let n = [], r = Array(e.length);
	for (let e of t) {
		let t = e.start.getTime(), i = n.findIndex((e) => e <= t);
		i === -1 ? (i = n.length, n.push(e.end.getTime())) : n[i] = e.end.getTime(), r[e._idx] = i;
	}
	let i = Array(e.length), a = [], o = 0, s = t[0].end.getTime();
	i[t[0]._idx] = 0, a.push(r[t[0]._idx]);
	for (let e = 1; e < t.length; e++) {
		let n = t[e];
		n.start.getTime() >= s ? (o++, a.push(0), s = n.end.getTime()) : s = Math.max(s, n.end.getTime()), i[n._idx] = o, a[o] = Math.max(a[o], r[n._idx]);
	}
	return r.map((e, t) => ({
		lane: e,
		laneCount: a[i[t]] + 1
	}));
}
function ir(e, t) {
	let [n, r] = t.split(":").map(Number), i = new Date(e);
	return i.setHours(n, r, 0, 0), i.getTime();
}
function ar(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	for (let e of t) i.set(Y(e), {
		allDay: [],
		inBand: [],
		earlier: [],
		later: []
	});
	let a = t.length > 0 ? t[0] : null, o = t.length > 0 ? t[t.length - 1] : null;
	for (let s of e) {
		if (tr(s)) {
			let e = /* @__PURE__ */ new Date(s.start + "T00:00:00"), n = /* @__PURE__ */ new Date(s.end + "T00:00:00"), r = a !== null && e < a, c = o ? new Date(o) : null;
			c && c.setDate(c.getDate() + 1);
			let l = c !== null && n > c;
			for (let c of t) {
				let t = Y(c), u = i.get(t);
				if (c >= e && c < n && (u.allDay.push(s), r || l)) {
					u.allDayClipped || (u.allDayClipped = /* @__PURE__ */ new Map());
					let e = a !== null && Y(c) === Y(a), t = o !== null && Y(c) === Y(o);
					u.allDayClipped.set(nr(s), {
						left: r && e,
						right: l && t
					});
				}
			}
			continue;
		}
		let e = new Date(s.start), c = new Date(s.end);
		for (let a of t) {
			let t = Y(a), o = i.get(t), l = new Date(a);
			l.setHours(0, 0, 0, 0);
			let u = new Date(a);
			if (u.setHours(23, 59, 59, 999), c <= l || e > u) continue;
			let d = ir(a, n), f = ir(a, r);
			if (c.getTime() <= d) o.earlier.push(s);
			else if (e.getTime() >= f) o.later.push(s);
			else {
				let e = Yn(s, a, n, r);
				if (e) {
					let t = f - d, n = (e.start.getTime() - d) / t * 100, r = (e.end.getTime() - e.start.getTime()) / t * 100;
					o.inBand.push({
						event: s,
						lane: 0,
						laneCount: 1,
						topPercent: Math.max(0, Math.min(100, n)),
						heightPercent: Math.max(0, Math.min(100 - n, r))
					});
				}
			}
		}
	}
	for (let e of t) {
		let t = Y(e), a = i.get(t);
		if (a.inBand.length === 0) continue;
		let o = ir(e, n), s = ir(e, r) - o, c = rr(a.inBand.map((e) => {
			let t = o + e.topPercent / 100 * s, n = t + e.heightPercent / 100 * s;
			return {
				event: e.event,
				start: new Date(t),
				end: new Date(n),
				lane: 0
			};
		}));
		a.inBand = a.inBand.map((e, t) => ({
			...e,
			lane: c[t].lane,
			laneCount: c[t].laneCount
		}));
	}
	return {
		days: t,
		perDay: i
	};
}
//#endregion
//#region src/shared/visible-window.ts
function or(e, t) {
	let n = Math.min(t.minColWidth, t.maxColWidth), r = Math.max(t.minColWidth, t.maxColWidth), i = Math.min(t.minDays, t.maxDays), a = Math.max(t.minDays, t.maxDays), o = Math.max(0, e - t.timeColWidth);
	if (o <= 0) return {
		visibleCount: i,
		dayWidthPx: n
	};
	let s = Math.floor(o / n), c = Math.ceil(o / r), l = Math.min(a, Math.max(i, c, Math.min(s, a)));
	return {
		visibleCount: l,
		dayWidthPx: o / l
	};
}
//#endregion
//#region src/shared/rolling-window.ts
function sr(e) {
	return `syn:${e.start}|${e.end}|${e.summary ?? ""}`;
}
function cr(e) {
	if (e !== void 0 && !(typeof e != "number" || !Number.isFinite(e))) return Math.max(0, Math.floor(e));
}
function lr(e, t) {
	let n = new Date(e);
	return n.setDate(n.getDate() + t), n;
}
function ur(e) {
	let t = new Date(e);
	return t.setHours(0, 0, 0, 0), t;
}
var dr = class {
	constructor(e, t) {
		this._isConnected = !1, this._hasHass = !1, this._dayOffset = 0, this._fetchSeq = 0, this._cachedEvents = /* @__PURE__ */ new Map(), this._cachedDayKeys = /* @__PURE__ */ new Set(), this._host = e, this._opts = t, this._fetcher = t.fetcher ?? mt, this._pollIntervalMs = t.pollIntervalMs ?? 5 * 6e4, this._tickIntervalMs = t.tickIntervalMs ?? 6e4, this._panBound = t.panBoundDays ?? 90, this._visibleCount = t.visibleCount, this._bufferDaysExplicit = cr(t.bufferDays);
		let n = (t.now ?? (() => /* @__PURE__ */ new Date()))();
		this._anchorToday = ur(n), e.addController(this);
	}
	hostConnected() {
		this._isConnected = !0, this._tickIntervalMs > 0 && (this._tickTimer = setInterval(() => this.tick(), this._tickIntervalMs)), this._pollIntervalMs > 0 && (this._pollTimer = setInterval(() => this._poll(), this._pollIntervalMs)), this._hass && this._fetchRange(...this._computeRange());
	}
	hostDisconnected() {
		this._isConnected = !1, clearInterval(this._tickTimer), clearInterval(this._pollTimer), this._tickTimer = void 0, this._pollTimer = void 0;
	}
	setHass(e) {
		let t = !this._hasHass;
		this._hass = e, this._hasHass = !0, t && this._isConnected && this._fetchRange(...this._computeRange());
	}
	updateCalendars(e) {
		let t = new Set(this._opts.calendars.map((e) => e.entity)), n = new Set(e.map((e) => e.entity)), r = t.size !== n.size || [...n].some((e) => !t.has(e));
		this._opts.calendars = e, r && this._hass && this._fetchRange(...this._computeRange());
	}
	setVisibleCount(e) {
		var t, n;
		let r = this._visibleCount;
		if (this._visibleCount = e, (t = (n = this._opts).onChange) == null || t.call(n), this._host.requestUpdate(), e !== r) {
			let [e, t] = this._computeRange();
			this._rangeIsCovered(e, t) || this._fetchRange(e, t);
		}
	}
	setBufferDays(e) {
		var t, n;
		let r = cr(e);
		r !== this._bufferDaysExplicit && (this._bufferDaysExplicit = r, (t = (n = this._opts).onChange) == null || t.call(n), this._host.requestUpdate());
	}
	pan(e) {
		var t, n;
		let r = -this._panBound, i = this._panBound - this._visibleCount, a = Math.max(r, Math.min(i, this._dayOffset + e));
		this._dayOffset = a, (t = (n = this._opts).onChange) == null || t.call(n), this._host.requestUpdate();
		let [o, s] = this._computeRange();
		this._rangeIsCovered(o, s) || this._fetchRange(o, s);
	}
	goToToday() {
		let e = this._dayOffset === 0;
		if (this._dayOffset = 0, !e) {
			var t, n;
			(t = (n = this._opts).onChange) == null || t.call(n);
		}
		this._host.requestUpdate();
		let [r, i] = this._computeRange();
		this._rangeIsCovered(r, i) || this._fetchRange(r, i);
	}
	tick() {
		let e = ur((this._opts.now ?? (() => /* @__PURE__ */ new Date()))());
		if (e.getTime() !== this._anchorToday.getTime() && (this._anchorToday = e, this._dayOffset === 0)) {
			var t, n;
			(t = (n = this._opts).onChange) == null || t.call(n), this._host.requestUpdate(), this._hass && this._fetchRange(...this._computeRange());
		}
	}
	async _poll() {
		this._hass && this._fetchRange(...this._computeRange());
	}
	get days() {
		return Array.from({ length: this._visibleCount }, (e, t) => {
			let n = lr(this._anchorToday, this._dayOffset + t);
			return n.setHours(0, 0, 0, 0), n;
		});
	}
	get bufferDays() {
		return this._bufferDaysExplicit ?? this._visibleCount;
	}
	get renderDays() {
		let e = this.bufferDays, t = e * 2 + this._visibleCount;
		return Array.from({ length: t }, (t, n) => {
			let r = lr(this._anchorToday, this._dayOffset - e + n);
			return r.setHours(0, 0, 0, 0), r;
		});
	}
	get dayOffset() {
		return this._dayOffset;
	}
	get isAtToday() {
		return this._dayOffset === 0;
	}
	get canPanBack() {
		return this._dayOffset > -this._panBound;
	}
	get canPanForward() {
		return this._dayOffset + this._visibleCount < this._panBound;
	}
	get cachedEvents() {
		return this._cachedEvents;
	}
	get cachedRange() {
		if (!this._cacheStart || !this._cacheEnd) return [];
		let e = [], t = new Date(this._cacheStart);
		for (; t < this._cacheEnd;) e.push(new Date(t)), t.setDate(t.getDate() + 1);
		return e;
	}
	isDayCached(e) {
		return this._cachedDayKeys.has(Y(e));
	}
	_computeRange() {
		let e = this._visibleCount, t = lr(this._anchorToday, this._dayOffset - e);
		t.setHours(0, 0, 0, 0);
		let n = lr(this._anchorToday, this._dayOffset + 2 * e);
		return n.setHours(0, 0, 0, 0), [t, n];
	}
	_rangeIsCovered(e, t) {
		return !this._cacheStart || !this._cacheEnd ? !1 : e >= this._cacheStart && t <= this._cacheEnd;
	}
	_fetchRange(e, t) {
		var n, r;
		if (!this._hass) return;
		let i = ++this._fetchSeq, a = this._opts.calendars.map((e) => e.entity);
		(n = (r = this._opts).onFetchStart) == null || n.call(r, {
			start: e,
			end: t
		}), this._fetcher(this._hass, a, e, t).then(({ events: n, failed: r }) => {
			var a, o;
			if (i !== this._fetchSeq) return;
			let s = /* @__PURE__ */ new Map();
			for (let [e, t] of n.entries()) s.set(e, t.map((t) => {
				let n = t.uid && t.uid.length > 0 ? t.uid : sr(t);
				return {
					...t,
					uid: `${e}::${n}`
				};
			}));
			this._cachedEvents = s, this._cachedDayKeys = /* @__PURE__ */ new Set();
			for (let n = new Date(e); n < t; n.setDate(n.getDate() + 1)) this._cachedDayKeys.add(Y(n));
			this._cacheStart = new Date(e), this._cacheEnd = new Date(t), (a = (o = this._opts).onFetchComplete) == null || a.call(o, s, r);
		}).catch((e) => {
			console.warn("[lucarne] RollingWindowController fetch failed:", e);
		});
	}
};
//#endregion
//#region src/shared/calendar-scroll.ts
function fr(e) {
	let { now: t, bandStartH: n, bandEndH: r, timeGridTopPx: i, timeGridHeightPx: a, paddingPx: o, maxScrollTop: s } = e, c = r - n;
	if (c <= 0) return 0;
	let l = t.getHours() + t.getMinutes() / 60 + t.getSeconds() / 3600;
	if (l <= n) return 0;
	if (l >= r) return Math.max(0, s);
	let u = i + (l - n) / c * a - o;
	return Math.max(0, Math.min(s, u));
}
//#endregion
//#region src/components/visibility-pills.ts
var pr, mr = (pr = class extends H {
	constructor(...e) {
		super(...e), this.calendars = [], this.visibleIds = /* @__PURE__ */ new Set();
	}
	_toggle(e) {
		let t = new Set(this.visibleIds);
		t.has(e) ? t.delete(e) : t.add(e), this.dispatchEvent(new CustomEvent("visibility-change", {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		return L`
      ${this.calendars.map((e) => L`
          <button
            class="pill ${this.visibleIds.has(e.entity) ? "visible" : "hidden"}"
            style="background: ${this.visibleIds.has(e.entity) ? e.color + "33" : "transparent"}"
            @click=${() => this._toggle(e.entity)}
            aria-pressed=${this.visibleIds.has(e.entity)}
            aria-label="${e.label}"
          >
            <span class="dot" style="background: ${e.color}"></span>
            <span class="label">${e.label}</span>
          </button>
        `)}
    `;
	}
}, pr.styles = [K, M`
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-xs);
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-xl);
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 12px;
        font-size: var(--lucarne-fs-sm);
        cursor: pointer;
        user-select: none;
        transition: opacity 0.15s, background 0.15s;
        border: 1.5px solid transparent;
        min-height: 44px;
        box-sizing: border-box;
        touch-action: manipulation;
      }
      .pill.visible {
        opacity: 1;
        border-color: transparent;
      }
      .pill.hidden {
        opacity: 0.45;
        text-decoration: line-through;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .label {
        white-space: nowrap;
        font-weight: 500;
        color: var(--lucarne-on-surface);
      }
    `], pr);
q([W({ type: Array })], mr.prototype, "calendars", void 0), q([W({ type: Object })], mr.prototype, "visibleIds", void 0), mr = q([U("lucarne-visibility-pills")], mr);
//#endregion
//#region node_modules/lit-html/directive.js
var hr = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, gr = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), _r = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, vr = "important", yr = " !important", br = gr(class extends _r {
	constructor(e) {
		var t;
		if (super(e), e.type !== hr.ATTRIBUTE || e.name !== "style" || ((t = e.strings) == null ? void 0 : t.length) > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
	}
	render(e) {
		return Object.keys(e).reduce((t, n) => {
			let r = e[n];
			return r == null ? t : t + `${n = n.includes("-") ? n : n.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${r};`;
		}, "");
	}
	update(e, [t]) {
		let { style: n } = e.element;
		if (this.ft === void 0) return this.ft = new Set(Object.keys(t)), this.render(t);
		for (let e of this.ft) t[e] ?? (this.ft.delete(e), e.includes("-") ? n.removeProperty(e) : n[e] = null);
		for (let e in t) {
			let r = t[e];
			if (r != null) {
				this.ft.add(e);
				let t = typeof r == "string" && r.endsWith(yr);
				e.includes("-") || t ? n.setProperty(e, t ? r.slice(0, -11) : r, t ? vr : "") : n[e] = r;
			}
		}
		return R;
	}
}), xr;
function Sr(e) {
	return e.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: !0
	});
}
var Cr = (xr = class extends H {
	constructor(...e) {
		super(...e), this.color = "#a8d8b9", this.lane = 0, this.laneCount = 1, this.topPercent = 0, this.heightPercent = 10;
	}
	_handleClick(e) {
		e.stopPropagation(), this.dispatchEvent(new CustomEvent("lucarne-event-tap", {
			detail: {
				event: this.event,
				color: this.color
			},
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = new Date(this.event.start), t = new Date(this.event.end), n = `${Sr(e)}–${Sr(t)}`, r = this.event.pending ? "0.5" : "1";
		return L`
      <div @click=${this._handleClick} style="height:100%;width:100%;overflow:hidden;opacity:${r}">
        <div class="event-summary">${this.event.summary}</div>
        <div class="event-time">${n}</div>
      </div>
    `;
	}
}, xr.styles = [K, M`
      :host {
        /* Position/size is controlled by inline style from the parent day column.
         * display:block so the host fills its inline-style-determined box. */
        display: block;
        overflow: hidden;
        cursor: pointer;
        border-radius: var(--lucarne-radius-sm);
        border-left: 3px solid transparent;
        transition: filter 0.1s;
        box-sizing: border-box;
        padding: 2px 4px;
      }
      :host(:hover) {
        filter: brightness(0.92);
        z-index: 10;
      }
      .event-summary {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: rgba(0, 0, 0, 0.8);
        line-height: 1.2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal;
        word-break: break-word;
      }
      .event-time {
        font-size: 0.7rem;
        color: rgba(0, 0, 0, 0.55);
        line-height: 1.1;
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `], xr);
q([W({ type: Object })], Cr.prototype, "event", void 0), q([W({ type: String })], Cr.prototype, "color", void 0), q([W({ type: Number })], Cr.prototype, "lane", void 0), q([W({ type: Number })], Cr.prototype, "laneCount", void 0), q([W({ type: Number })], Cr.prototype, "topPercent", void 0), q([W({ type: Number })], Cr.prototype, "heightPercent", void 0), Cr = q([U("lucarne-calendar-event-block")], Cr);
//#endregion
//#region src/components/out-of-band-stub.ts
var wr, Tr = (wr = class extends H {
	constructor(...e) {
		super(...e), this.events = [], this.label = "earlier", this.eventColors = /* @__PURE__ */ new Map(), this._open = !1;
	}
	_formatTime(e) {
		return new Date(e).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: !0
		});
	}
	_openPopover(e) {
		e.stopPropagation(), this._chipEl = e.currentTarget, this._open = !0;
	}
	_close() {
		this._open = !1;
	}
	_tapEvent(e, t) {
		e.stopPropagation(), this._close(), this.dispatchEvent(new CustomEvent("lucarne-event-tap", {
			detail: {
				event: t,
				color: this.eventColors.get(t.uid ?? "") ?? "#a8d8b9"
			},
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		if (this.events.length === 0) return L``;
		let e = this._chipEl, t = 0, n = 0;
		if (e) {
			let r = e.getBoundingClientRect();
			t = r.bottom + 4, n = r.left;
		}
		return L`
      <button class="stub-chip" @click=${this._openPopover}>
        +${this.events.length} ${this.label}
      </button>

      ${this._open ? L`
            <div class="backdrop" @click=${this._close}></div>
            <div class="mini-popover" style="top:${t}px;left:${n}px;">
              <div class="mini-title">${this.label}</div>
              ${this.events.map((e) => L`
                  <div class="mini-event" @click=${(t) => this._tapEvent(t, e)}>
                    <span class="mini-event-summary">${e.summary}</span>
                    <span class="mini-event-time">${this._formatTime(e.start)}</span>
                  </div>
                `)}
            </div>
          ` : ""}
    `;
	}
}, wr.styles = [K, M`
      :host {
        display: block;
      }
      .stub-chip {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 8px;
        cursor: pointer;
        background: rgba(0, 0, 0, 0.07);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        box-sizing: border-box;
        border: none;
        width: 100%;
        justify-content: center;
      }
      .stub-chip:hover {
        background: rgba(0, 0, 0, 0.12);
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
      }
      .mini-popover {
        position: fixed;
        z-index: 101;
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-md);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
        padding: var(--lucarne-spacing-md);
        min-width: 220px;
        max-width: 320px;
        max-height: 60vh;
        overflow-y: auto;
      }
      .mini-title {
        font-size: var(--lucarne-fs-sm);
        font-weight: 700;
        color: var(--lucarne-on-surface-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--lucarne-spacing-sm);
      }
      .mini-event {
        display: flex;
        flex-direction: column;
        padding: var(--lucarne-spacing-sm) 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        cursor: pointer;
        min-height: 44px;
        justify-content: center;
      }
      .mini-event:last-child {
        border-bottom: none;
      }
      .mini-event:hover {
        background: rgba(0, 0, 0, 0.04);
        border-radius: var(--lucarne-radius-sm);
      }
      .mini-event-summary {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface);
      }
      .mini-event-time {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
      }
    `], wr);
q([W({ type: Array })], Tr.prototype, "events", void 0), q([W({ type: String })], Tr.prototype, "label", void 0), q([W({ type: Object })], Tr.prototype, "eventColors", void 0), q([G()], Tr.prototype, "_open", void 0), Tr = q([U("lucarne-out-of-band-stub")], Tr);
//#endregion
//#region src/components/skeleton-day-column.ts
var Er;
function Dr(e) {
	return 20 + (e * 37 + 11) % 30;
}
function Or(e) {
	return 10 + (e * 53 + 7) % 60;
}
var kr = (Er = class extends H {
	constructor(...e) {
		super(...e), this.bandStart = "07:00", this.bandEnd = "21:00", this.hourHeightPx = 60;
	}
	render() {
		let [e] = this.bandStart.split(":").map(Number), [t] = this.bandEnd.split(":").map(Number), n = Math.max(1, t - e) * this.hourHeightPx;
		return L`
      <div class="sk-host" style="height:${n}px">
        ${[0, 1].map((e) => L`
            <div
              class="fake-event"
              style="top: ${Or(e) / 100 * n}px; height: ${Dr(e)}px;"
            >
              <div class="shimmer-sweep"></div>
            </div>
          `)}
      </div>
    `;
	}
}, Er.styles = [K, M`
      :host {
        display: block;
        width: 100%;
      }
      /*
       * Wrapper with an explicit pixel height derived from bandStart/bandEnd
       * and hourHeightPx. Avoids height:100% on :host because the parent
       * wrapper in calendar-grid is a flex column with no fixed height — on
       * the initial render (cachedDayKeys empty, no real day-col anywhere to
       * establish a row height), 100% of nothing collapsed the skeleton to
       * 0px and the shimmer was invisible.
       */
      .sk-host {
        position: relative;
        width: 100%;
        overflow: hidden;
      }
      .fake-event {
        position: absolute;
        left: 6px;
        right: 6px;
        border-radius: 3px;
        background: var(--lucarne-skeleton-base);
        overflow: hidden;
      }
      .shimmer-sweep {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--lucarne-skeleton-highlight) 50%,
          transparent 100%
        );
        animation: shimmer-sweep 3s ease-in-out infinite;
      }
      @keyframes shimmer-sweep {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .shimmer-sweep {
          display: none;
        }
        .fake-event {
          background: var(--lucarne-skeleton-base);
        }
      }
    `], Er);
q([W({ type: String })], kr.prototype, "bandStart", void 0), q([W({ type: String })], kr.prototype, "bandEnd", void 0), q([W({ type: Number })], kr.prototype, "hourHeightPx", void 0), kr = q([U("lucarne-skeleton-day-column")], kr);
//#endregion
//#region src/components/calendar-grid.ts
var Ar;
function jr(e, t) {
	return e.getFullYear() === t.getFullYear() && e.getMonth() === t.getMonth() && e.getDate() === t.getDate();
}
var Mr = (Ar = class extends H {
	constructor(...e) {
		super(...e), this.layout = null, this.bandStart = "07:00", this.bandEnd = "21:00", this.calendars = [], this.hourHeightPx = 60, this.showCreateButton = !1, this.dayWidthPx = 0, this.bufferDays = 0, this.cachedDayKeys = /* @__PURE__ */ new Set();
	}
	get _colorMap() {
		let e = /* @__PURE__ */ new Map();
		for (let t of this.calendars) e.set(t.entity, t.color);
		return e;
	}
	_eventColor(e) {
		var t;
		let n = this._colorMap;
		if ((t = e.uid) != null && t.includes("::")) {
			let t = e.uid.split("::")[0];
			return n.get(t) ?? "#a8d8b9";
		}
		return "#a8d8b9";
	}
	_onBandClick(e, t) {
		if (!this.showCreateButton) return;
		let n = e.currentTarget.getBoundingClientRect(), [r] = this.bandStart.split(":").map(Number), [i] = this.bandEnd.split(":").map(Number), a = i - r, o = r + Math.max(0, Math.min(1, (e.clientY - n.top) / n.height)) * a, s = Math.min(i - 1, Math.round(o * 2) / 2);
		this.dispatchEvent(new CustomEvent("lucarne-create-event-tap", {
			detail: {
				day: t,
				startHour: s
			},
			bubbles: !0,
			composed: !0
		}));
	}
	_buildEventColorMap(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e) t.set(n.uid ?? "", this._eventColor(n));
		return t;
	}
	_renderDayColumn(e, t) {
		if (!this.layout) return L``;
		let n = Y(e), r = this.layout.perDay.get(n);
		if (!r) return L``;
		let i = qn(this.bandStart, this.bandEnd), a = (i.length - 1) * this.hourHeightPx, o = jr(e, t), [s] = this.bandStart.split(":").map(Number), [c] = this.bandEnd.split(":").map(Number), l = (c - s) * 36e5, u = null;
		if (o) {
			let n = new Date(e);
			n.setHours(s, 0, 0, 0);
			let r = new Date(e);
			r.setHours(c, 0, 0, 0), t >= n && t <= r && (u = (t.getTime() - n.getTime()) / l * 100);
		}
		let d = this._buildEventColorMap([
			...r.inBand.map((e) => e.event),
			...r.earlier,
			...r.later
		]);
		return L`
      <div class="day-col-wrapper">
        ${r.earlier.length > 0 ? L`
              <div class="stub-area-top">
                <lucarne-out-of-band-stub
                  .events=${r.earlier}
                  label="earlier"
                  .eventColors=${d}
                ></lucarne-out-of-band-stub>
              </div>
            ` : ""}

        <div
          class="day-col"
          style="height:${a}px${this.showCreateButton ? "; cursor: crosshair" : ""}"
          @click=${(t) => this._onBandClick(t, e)}
        >
          ${i.slice(0, -1).map((e, t) => L`
              <div
                class="hour-line"
                style="top: ${(t + 1) / (i.length - 1) * 100}%"
              ></div>
            `)}

          ${u === null ? "" : L`<div class="now-line" style="top:${u}%"></div>`}

          ${r.inBand.map((e) => {
			let t = 100 / e.laneCount, n = e.lane / e.laneCount * 100, r = this._eventColor(e.event);
			return L`
              <lucarne-calendar-event-block
                style="
                  position: absolute;
                  top: ${e.topPercent}%;
                  left: calc(${n}% + 1px);
                  width: calc(${t}% - 2px);
                  height: ${e.heightPercent}%;
                  z-index: ${e.lane + 1};
                  background: ${r}cc;
                  border-left-color: ${r};
                "
                .event=${e.event}
                .color=${r}
                .lane=${e.lane}
                .laneCount=${e.laneCount}
                .topPercent=${e.topPercent}
                .heightPercent=${e.heightPercent}
              ></lucarne-calendar-event-block>
            `;
		})}
        </div>

        ${r.later.length > 0 ? L`
              <div class="stub-area-bottom">
                <lucarne-out-of-band-stub
                  .events=${r.later}
                  label="tonight"
                  .eventColors=${d}
                ></lucarne-out-of-band-stub>
              </div>
            ` : ""}
      </div>
    `;
	}
	render() {
		if (!this.layout) return L`<div>Loading…</div>`;
		let e = /* @__PURE__ */ new Date(), t = qn(this.bandStart, this.bandEnd), n = (t.length - 1) * this.hourHeightPx, r = new Intl.DateTimeFormat("en-US", { weekday: "short" }), i = { "--lucarne-day-render-count": String(this.layout.days.length) };
		return this.dayWidthPx > 0 && (i["--lucarne-day-width-px"] = `${this.dayWidthPx}px`, i["--lucarne-day-baseline-px"] = `${-this.bufferDays * this.dayWidthPx}px`), L`
      <div class="grid-wrapper" style=${br(i)}>
        <!-- Time-column gutter cells (col 1): stay fixed during pan -->
        <div class="header-spacer" style="grid-row:1; grid-column:1"></div>
        <div class="allday-spacer" style="grid-row:2; grid-column:1">all-day</div>
        <div class="time-col" style="height:${n}px; grid-row:3; grid-column:1">
          ${t.map((e, n) => L`
              <div
                class="hour-label"
                style="top: ${n / (t.length - 1) * 100}%"
              >
                ${e === 0 || e === 24 ? "12 AM" : e < 12 ? `${e} AM` : e === 12 ? "12 PM" : `${e - 12} PM`}
              </div>
            `)}
        </div>

        <!-- Row 1: day header track -->
        <div class="day-cols-track" style="grid-row:1">
          ${this.layout.days.map((t, n) => L`
              <div
                class="day-header ${jr(t, e) ? "today" : ""}"
                style="grid-column: ${n + 1}"
              >
                <div class="day-pill">
                  <span class="day-weekday">${r.format(t)}</span>
                  <span class="day-num">${t.getDate()}</span>
                </div>
              </div>
            `)}
        </div>

        <!-- Row 2: all-day event track (wrapped in .day-cols-clip — see CSS) -->
        <div class="day-cols-clip" style="grid-row:2">
          <div class="day-cols-track">
            ${this.layout.days.map((e, t) => {
			let n = Y(e), r = this.cachedDayKeys.has(n), i = this.layout.perDay.get(n);
			return L`
                <div class="allday-cell" style="grid-column: ${t + 1}">
                  ${r ? ((i == null ? void 0 : i.allDay) ?? []).map((e) => {
				var t;
				let n = i == null || (t = i.allDayClipped) == null ? void 0 : t.get(nr(e));
				return L`
                          <div
                            class="allday-event"
                            style="background: ${this._eventColor(e)}cc"
                            @click=${(t) => {
					t.stopPropagation(), this.dispatchEvent(new CustomEvent("lucarne-event-tap", {
						detail: {
							event: e,
							color: this._eventColor(e)
						},
						bubbles: !0,
						composed: !0
					}));
				}}
                          >
                            ${n != null && n.left ? L`<span class="clip-chevron">‹</span>` : ""}${e.summary}${n != null && n.right ? L`<span class="clip-chevron">›</span>` : ""}
                          </div>
                        `;
			}) : L`<div class="allday-skeleton"><div class="shimmer-sweep"></div></div>`}
                </div>
              `;
		})}
          </div>
        </div>

        <!-- Row 3: time-band columns track -->
        <div class="day-cols-track" style="grid-row:3">
          ${this.layout.days.map((t, n) => {
			let r = Y(t), i = this.cachedDayKeys.has(r);
			return L`
              <div style="grid-column:${n + 1}; position:relative; overflow:visible; display:flex; flex-direction:column;">
                ${i ? this._renderDayColumn(t, e) : L`<lucarne-skeleton-day-column
                      .bandStart=${this.bandStart}
                      .bandEnd=${this.bandEnd}
                      .hourHeightPx=${this.hourHeightPx}
                    ></lucarne-skeleton-day-column>`}
              </div>
            `;
		})}
        </div>
      </div>
    `;
	}
}, Ar.styles = [K, M`
      :host {
        display: block;
        position: relative;
      }
      .grid-wrapper {
        display: grid;
        /* minmax(0, 1fr) prevents the .day-cols-track (which is wider than 1fr
           when render buffer columns are present) from expanding the column. */
        grid-template-columns: 40px minmax(0, 1fr);
        grid-template-rows: auto auto 1fr;
      }
      /*
       * Wraps ONLY the row-2 all-day .day-cols-track in a column-2-scoped
       * overflow:hidden box (issue #3). On iPad Safari the sticky gutter
       * spacer wasn't reliably stacking above the all-day track's
       * transform-induced stacking context, so all-day events bled across the
       * hour column during pan. Clipping at the column boundary fixes it
       * unconditionally and browser-agnostic.
       *
       * Why row 2 only:
       *  - Row 1 (.day-header) uses position: sticky; top: 0 — an
       *    overflow:hidden ancestor becomes its scrollport and breaks sticky.
       *  - Row 3 contains <lucarne-out-of-band-stub> whose backdrop/popover are
       *    position: fixed. Because .day-cols-track has a transform, it is the
       *    containing block for those fixed children; clipping it would also
       *    clip the stub's full-viewport overlay.
       *  - Row 3's regular events already don't bleed past the gutter (the
       *    .time-col sticky spacer plus the .day-col isolation: isolate keep
       *    them stacked correctly).
       */
      .day-cols-clip {
        grid-column: 2;
        overflow: hidden;
        min-width: 0;
      }
      /*
       * Three .day-cols-track elements — one per outer grid row — so that each
       * outer auto-row is sized by its day-column content (headers, allday cells,
       * time-band cols). All three receive the same translateX during pan.
       * Using a single spanning element would decouple the inner sub-grid row
       * sizing from the outer grid rows and cause the time-column gutter labels
       * to misalign with the day content (no CSS subgrid on Safari < 16).
       *
       * Track is rendered at fixed px widths (--lucarne-day-render-count columns
       * × --lucarne-day-width-px each) so visible columns keep their target width
       * even with buffer days added on either side. The baseline transform shifts
       * the track left by bufferDays * dayWidthPx so visible day 0 lands at the
       * container's left edge. The pan handler overrides transform via inline
       * style during gestures; on snap completion it clears the inline style so
       * this CSS baseline reapplies (the new days then occupy the same screen
       * position as the OLD days at the snap target — visually invisible swap).
       *
       * Rows 1 and 3 place the track directly into grid-column 2; row 2 wraps
       * the track in a .day-cols-clip first (see the .day-cols-clip rule above
       * for why row 2 needs the wrapper and rows 1 and 3 don't).
       */
      .day-cols-track {
        grid-column: 2;
        display: grid;
        grid-template-columns: repeat(var(--lucarne-day-render-count, 7), var(--lucarne-day-width-px, 140px));
        width: calc(var(--lucarne-day-render-count, 7) * var(--lucarne-day-width-px, 140px));
        transform: translateX(var(--lucarne-day-baseline-px, 0px));
        will-change: transform;
      }
      /*
       * Reset grid-column on the inner track when it's inside a clip wrapper —
       * the wrapper already owns grid-column 2; the track is now a normal block
       * child of the wrapper, not a grid item.
       */
      .day-cols-clip > .day-cols-track {
        grid-column: auto;
      }
      /* Header row: day names */
      .header-spacer {
        grid-column: 1;
        grid-row: 1;
        position: sticky;
        top: 0;
        left: 0;
        z-index: 4;
        background: var(--lucarne-surface);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        border-right: 1px solid rgba(0, 0, 0, 0.07);
      }
      .day-header {
        text-align: center;
        padding: var(--lucarne-spacing-xs) 2px;
        font-size: var(--lucarne-fs-sm);
        font-weight: 700;
        color: var(--lucarne-on-surface-muted);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        user-select: none;
        position: sticky;
        top: 0;
        z-index: 3;
        background: var(--lucarne-surface);
        /* Container query target: lets the @container rule below hide the
           weekday when the column itself becomes too narrow. inline-size
           queries the header's inline width, which equals --lucarne-day-width-px. */
        container-type: inline-size;
      }
      .day-header .day-pill {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        line-height: 1.1;
        max-width: 100%;
      }
      .day-header .day-weekday {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
      }
      .day-header .day-num {
        font-size: var(--lucarne-fs-md);
        font-weight: 700;
      }
      .day-header.today .day-pill {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      /* Narrow column: drop the weekday name so the day number still fits
         comfortably inside the pill. 70px ≈ enough for "30" with padding;
         below that "Sun 30" wraps or overflows. */
      @container (max-width: 70px) {
        .day-header .day-weekday {
          display: none;
        }
      }
      /* All-day row */
      .allday-spacer {
        grid-column: 1;
        grid-row: 2;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        font-size: 0.65rem;
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
        min-height: 24px;
        position: sticky;
        left: 0;
        z-index: 2;
        background: var(--lucarne-surface);
      }
      .allday-cell {
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        padding: 2px 1px;
        min-height: 24px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .allday-skeleton {
        height: 18px;
        border-radius: 3px;
        margin: 2px 4px;
        background: var(--lucarne-skeleton-base);
        position: relative;
        overflow: hidden;
        flex-shrink: 0;
      }
      .shimmer-sweep {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          var(--lucarne-skeleton-highlight) 50%,
          transparent 100%
        );
        animation: allday-shimmer 3s ease-in-out infinite;
      }
      @keyframes allday-shimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .shimmer-sweep {
          display: none;
        }
      }
      .allday-event {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 3px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: rgba(0, 0, 0, 0.8);
      }
      .clip-chevron {
        font-style: normal;
        margin: 0 1px;
        opacity: 0.7;
      }
      /* Time grid */
      .time-col {
        grid-column: 1;
        grid-row: 3;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        position: sticky;
        left: 0;
        z-index: 2;
        background: var(--lucarne-surface);
      }
      .hour-label {
        position: absolute;
        right: 6px;
        font-size: 0.68rem;
        color: var(--lucarne-on-surface-muted);
        transform: translateY(-50%);
        white-space: nowrap;
        user-select: none;
      }
      .day-col {
        position: relative;
        isolation: isolate;
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        overflow: visible;
        touch-action: manipulation;
      }
      .hour-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(0, 0, 0, 0.06);
        pointer-events: none;
      }
      .now-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: #e53935;
        z-index: 5;
        pointer-events: none;
      }
      .now-line::before {
        content: '';
        position: absolute;
        left: -4px;
        top: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #e53935;
      }
      .day-col-wrapper {
        display: flex;
        flex-direction: column;
      }
      .stub-area-top {
        padding: 2px 2px 0;
        flex-shrink: 0;
      }
      .stub-area-bottom {
        padding: 0 2px 2px;
        flex-shrink: 0;
      }
    `], Ar);
q([W({ type: Object })], Mr.prototype, "layout", void 0), q([W({ type: String })], Mr.prototype, "bandStart", void 0), q([W({ type: String })], Mr.prototype, "bandEnd", void 0), q([W({ type: Array })], Mr.prototype, "calendars", void 0), q([W({ type: Number })], Mr.prototype, "hourHeightPx", void 0), q([W({ type: Boolean })], Mr.prototype, "showCreateButton", void 0), q([W({ type: Number })], Mr.prototype, "dayWidthPx", void 0), q([W({ type: Number })], Mr.prototype, "bufferDays", void 0), q([W({ attribute: !1 })], Mr.prototype, "cachedDayKeys", void 0), Mr = q([U("lucarne-calendar-grid")], Mr);
//#endregion
//#region src/shared/pan-math.ts
var Nr = 500;
function Pr(e, t, n) {
	return t <= 0 ? 0 : Math.abs(n) >= Nr ? n > 0 ? Math.ceil(e / t) : Math.floor(e / t) : Math.round(e / t);
}
function Fr(e, t) {
	if (Math.abs(e) <= t) return e;
	let n = Math.abs(e) - t;
	return Math.sign(e) * (t + n * .33);
}
//#endregion
//#region src/components/calendar-day-pan.ts
var Ir, Lr = (Ir = class extends H {
	constructor(...e) {
		super(...e), this.dayWidthPx = 0, this.bufferDays = 0, this.canPanBack = !0, this.canPanForward = !0, this._startX = 0, this._startY = 0, this._startTime = 0, this._isDragging = !1, this._cachedTargets = [];
	}
	get _panTargets() {
		var e, t;
		let n = (e = this._slot) == null ? void 0 : e.assignedElements()[0];
		return n ? Array.from(((t = n.shadowRoot) == null ? void 0 : t.querySelectorAll(".day-cols-track")) ?? []) : [];
	}
	_cachePanTargets() {
		this._cachedTargets = this._panTargets;
	}
	_applyRubberBand(e) {
		return e > 0 && !this.canPanBack || e < 0 && !this.canPanForward ? Fr(e, 0) : e;
	}
	_baselinePx() {
		return -this.bufferDays * this.dayWidthPx;
	}
	_setTranslate(e) {
		let t = this._baselinePx() + e;
		for (let e of this._cachedTargets) e.style.transition = "", e.style.transform = `translateX(${t}px)`;
	}
	_clearInlineTransform() {
		for (let e of this._panTargets) e.style.transition = "", e.style.transform = "";
	}
	_cancelPendingSnap() {
		this._pendingTransitionEnd && this._pendingSnapTarget && this._pendingSnapTarget.removeEventListener("transitionend", this._pendingTransitionEnd), this._pendingTransitionEnd = void 0, this._pendingSnapTarget = void 0, this._pendingClearRaf !== void 0 && (cancelAnimationFrame(this._pendingClearRaf), this._pendingClearRaf = void 0);
	}
	_scheduleClearInline() {
		this._pendingClearRaf !== void 0 && cancelAnimationFrame(this._pendingClearRaf), this._pendingClearRaf = requestAnimationFrame(() => {
			this._pendingClearRaf = void 0, this._clearInlineTransform();
		});
	}
	_snapAndCommit(e) {
		let t = this._cachedTargets;
		if (t.length === 0) {
			e !== 0 && (this._dispatchPanSnap(e), this._scheduleClearInline());
			return;
		}
		this._cancelPendingSnap();
		let n = this._baselinePx();
		if (typeof window.matchMedia == "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			for (let e of t) e.style.transition = "", e.style.transform = `translateX(${n}px)`;
			e !== 0 && this._dispatchPanSnap(e), this._scheduleClearInline();
			return;
		}
		let r = `transform ${getComputedStyle(this).getPropertyValue("--lucarne-pan-duration").trim() || "240ms"} ${getComputedStyle(this).getPropertyValue("--lucarne-pan-easing").trim() || "cubic-bezier(0.32, 0.72, 0, 1)"}`, i = n + e * this.dayWidthPx;
		for (let e of t) e.style.transition = r, e.style.transform = `translateX(${i}px)`;
		let a = (n) => {
			let r = n;
			r.target === t[0] && (r.propertyName && r.propertyName !== "transform" || (this._pendingTransitionEnd = void 0, t[0].removeEventListener("transitionend", a), e !== 0 && this._dispatchPanSnap(e), this._scheduleClearInline()));
		};
		this._pendingSnapTarget = t[0], this._pendingTransitionEnd = a, t[0].addEventListener("transitionend", a);
	}
	_dispatchPanSnap(e) {
		this.dispatchEvent(new CustomEvent("pan-snap", {
			detail: { deltaDays: e },
			bubbles: !0,
			composed: !0
		}));
	}
	_onPointerDown(e) {
		e.pointerType === "mouse" && e.button !== 0 || this._pointerId === void 0 && (this._cancelPendingSnap(), this._pointerId = e.pointerId, this._startX = e.clientX, this._startY = e.clientY, this._startTime = performance.now(), this._isDragging = !1, this._cachePanTargets());
	}
	_onPointerMove(e) {
		if (e.pointerId !== this._pointerId) return;
		let t = e.clientX - this._startX, n = e.clientY - this._startY;
		if (!this._isDragging) {
			if (Math.abs(t) < 10 && Math.abs(n) < 10) return;
			if (Math.abs(n) > Math.abs(t)) {
				try {
					e.currentTarget.releasePointerCapture(e.pointerId);
				} catch {}
				this._pointerId = void 0;
				return;
			}
			this._isDragging = !0;
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
		let r = this._applyRubberBand(t);
		this._setTranslate(r);
	}
	_onPointerUp(e) {
		if (e.pointerId === this._pointerId) {
			try {
				e.currentTarget.releasePointerCapture(e.pointerId);
			} catch {}
			if (this._isDragging) {
				let t = e.clientX - this._startX, n = performance.now() - this._startTime, r = n > 0 ? t / n * 1e3 : 0, i = Pr(this._applyRubberBand(t), this.dayWidthPx, r);
				(i > 0 && !this.canPanBack || i < 0 && !this.canPanForward) && (i = 0), this._snapAndCommit(i);
			}
			this._pointerId = void 0, this._isDragging = !1, this._cachedTargets = [];
		}
	}
	render() {
		return L`
      <div
        class="pan-wrapper"
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
        @pointercancel=${this._onPointerUp}
      >
        <slot></slot>
      </div>
    `;
	}
}, Ir.styles = M`
    :host {
      display: block;
      overflow: hidden;
      position: relative;
    }
    .pan-wrapper {
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      position: relative;
    }
    ::slotted(*) {
      display: block;
    }
  `, Ir);
q([W({ type: Number })], Lr.prototype, "dayWidthPx", void 0), q([W({ type: Number })], Lr.prototype, "bufferDays", void 0), q([W({ type: Boolean })], Lr.prototype, "canPanBack", void 0), q([W({ type: Boolean })], Lr.prototype, "canPanForward", void 0), q([ct("slot")], Lr.prototype, "_slot", void 0), Lr = q([U("lucarne-calendar-day-pan")], Lr);
//#endregion
//#region src/components/calendar-event-popover.ts
var Rr;
function zr(e) {
	return new Date(e).toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: !0
	});
}
var Br = (Rr = class extends H {
	constructor(...e) {
		super(...e), this.event = null, this.color = "#a8d8b9", this.calendarLabel = "", this.entityId = "", this._confirmingDelete = !1, this._deleting = !1, this._deleteError = "";
	}
	_close() {
		this.dispatchEvent(new CustomEvent("popover-close", {
			bubbles: !0,
			composed: !0
		}));
	}
	_isRecurring(e) {
		return !!e.rrule || !!e.recurrence_id;
	}
	_hasSyntheticUid(e) {
		if (!e) return !0;
		let t = e.includes("::") ? e.split("::").slice(1).join("::") : e;
		return t.startsWith("syn:") || t.startsWith("pending:") || t.length === 0;
	}
	_startDelete() {
		this._confirmingDelete = !0, this._deleteError = "";
	}
	_cancelDelete() {
		this._confirmingDelete = !1;
	}
	async _confirmDelete() {
		var e;
		if (!((e = this.event) != null && e.uid) || !this.entityId) return;
		this._deleting = !0, this._deleteError = "";
		let t = this.event.uid.includes("::") ? this.event.uid.split("::").slice(1).join("::") : this.event.uid;
		try {
			await ht(this.hass, this.entityId, t);
		} catch (e) {
			this._deleteError = e instanceof Error ? e.message : "Failed to delete event", this._deleting = !1, this._confirmingDelete = !1;
			return;
		}
		this.dispatchEvent(new CustomEvent("lucarne-event-deleted", {
			detail: {
				entityId: this.entityId,
				uid: this.event.uid
			},
			bubbles: !0,
			composed: !0
		})), this._deleting = !1, this._confirmingDelete = !1;
	}
	render() {
		if (!this.event) return L``;
		let e = this.event, t = e.start.length === 10 && !e.start.includes("T") ? "All day" : `${zr(e.start)} – ${new Date(e.end).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: !0
		})}`, n = this._hasSyntheticUid(e.uid), r = !!this.entityId && !!e.uid && this.hass != null && _t(this.hass, this.entityId) && !this._isRecurring(e) && !n, i = this._confirmingDelete ? this._confirmDelete : this._startDelete, a = this._confirmingDelete ? "Confirm delete" : "Delete event";
		return L`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true">
        <div class="popover-header">
          <span class="color-dot" style="background:${this.color}"></span>
          <span class="event-title">${e.summary}</span>
          ${r ? L`
                <button
                  class="icon-btn ${this._confirmingDelete ? "armed" : ""}"
                  @click=${i}
                  ?disabled=${this._deleting}
                  aria-label=${a}
                  title=${a}
                >🗑️</button>
              ` : L`<span></span>`}
          <button class="icon-btn" @click=${this._close} aria-label="Close">✕</button>
        </div>

        ${this._confirmingDelete ? L`
              <div class="confirm-pill" role="alert">
                <span>Tap 🗑️ again to delete this event.</span>
                <button
                  class="cancel-link"
                  @click=${this._cancelDelete}
                  ?disabled=${this._deleting}
                >Cancel</button>
              </div>
            ` : ""}

        <div class="detail-row">
          <em class="detail-icon">⏰</em>
          <span class="detail-text">${t}</span>
        </div>

        ${this.calendarLabel ? L`
              <div class="detail-row">
                <em class="detail-icon">📅</em>
                <span class="calendar-label detail-text">
                  <span
                    style="width:10px;height:10px;border-radius:50%;background:${this.color};display:inline-block;flex-shrink:0"
                  ></span>
                  ${this.calendarLabel}
                </span>
              </div>
            ` : ""}

        ${e.location ? L`
              <div class="detail-row">
                <em class="detail-icon">📍</em>
                <span class="detail-text">${e.location}</span>
              </div>
            ` : ""}

        ${e.description ? L`
              <div class="detail-row">
                <em class="detail-icon">📝</em>
                <span class="detail-text">${e.description}</span>
              </div>
            ` : ""}

        ${this._deleteError ? L`<div class="error-msg">${this._deleteError}</div>` : ""}
      </div>
    `;
	}
}, Rr.styles = [K, M`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 280px;
        max-width: min(480px, 90vw);
        z-index: 1;
      }
      .popover-header {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        column-gap: var(--lucarne-spacing-md);
        align-items: center;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .color-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .event-title {
        font-size: var(--lucarne-fs-xl);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        line-height: 1.25;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.5rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
        line-height: 1;
      }
      .icon-btn:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      .icon-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .icon-btn.armed {
        background: rgba(198, 40, 40, 0.12);
      }
      .confirm-pill {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--lucarne-spacing-sm);
        background: rgba(198, 40, 40, 0.08);
        color: #b71c1c;
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 12px;
        font-size: var(--lucarne-fs-md);
        font-weight: 600;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .confirm-pill .cancel-link {
        background: none;
        border: none;
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        cursor: pointer;
        text-decoration: underline;
        padding: 4px 6px;
        margin-left: auto;
        min-height: 32px;
      }
      .confirm-pill .cancel-link:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .detail-row {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        align-items: center;
        margin-bottom: var(--lucarne-spacing-sm);
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface-muted);
        line-height: 1.4;
      }
      .detail-icon {
        flex-shrink: 0;
        font-style: normal;
        width: 22px;
        text-align: center;
        font-size: 1.1em;
      }
      .detail-text {
        color: var(--lucarne-on-surface);
      }
      .calendar-label {
        font-size: var(--lucarne-fs-md);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .error-msg {
        color: #b71c1c;
        font-size: var(--lucarne-fs-md);
        margin-top: var(--lucarne-spacing-sm);
      }
    `], Rr);
q([W({ attribute: !1 })], Br.prototype, "hass", void 0), q([W({ type: Object })], Br.prototype, "event", void 0), q([W({ type: String })], Br.prototype, "color", void 0), q([W({ type: String })], Br.prototype, "calendarLabel", void 0), q([W({ type: String })], Br.prototype, "entityId", void 0), q([G()], Br.prototype, "_confirmingDelete", void 0), q([G()], Br.prototype, "_deleting", void 0), q([G()], Br.prototype, "_deleteError", void 0), Br = q([U("lucarne-calendar-event-popover")], Br);
//#endregion
//#region src/components/create-event-popover.ts
var Vr;
function Hr(e, t) {
	let n = -(/* @__PURE__ */ new Date(`${e}T${t}:00`)).getTimezoneOffset();
	return `${e}T${t}:00${n >= 0 ? "+" : "-"}${Math.floor(Math.abs(n) / 60).toString().padStart(2, "0")}:${(Math.abs(n) % 60).toString().padStart(2, "0")}`;
}
function Ur(e) {
	return `${Math.floor(e).toString().padStart(2, "0")}:${e % 1 == .5 ? "30" : "00"}`;
}
function Wr(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
var X = (Vr = class extends H {
	constructor(...e) {
		super(...e), this.day = null, this.startHour = 9, this.calendars = [], this._title = "", this._calendarEntityId = "", this._date = "", this._startTime = "", this._endTime = "", this._allDay = !1, this._description = "", this._location = "", this._error = "", this._saving = !1;
	}
	updated(e) {
		super.updated(e), (e.has("day") || e.has("startHour")) && this._initDefaults();
	}
	_initDefaults() {
		var e;
		let t = this.day ?? /* @__PURE__ */ new Date();
		this._date = Wr(t), this._startTime = Ur(Math.max(0, Math.min(23, this.startHour)));
		let n = Math.min(24, this.startHour + 1);
		this._endTime = Ur(n < 24 ? n : 23.5), this._calendarEntityId = ((e = this.calendars[0]) == null ? void 0 : e.entity) ?? "", this._title = "", this._allDay = !1, this._description = "", this._location = "", this._error = "", this._saving = !1;
	}
	_close() {
		this.dispatchEvent(new CustomEvent("popover-close", {
			bubbles: !0,
			composed: !0
		}));
	}
	async _create() {
		if (this._saving) return;
		if (!this._title.trim()) {
			this._error = "Title is required";
			return;
		}
		if (!this._allDay && this._startTime >= this._endTime) {
			this._error = "End time must be after start time";
			return;
		}
		this._saving = !0, this._error = "";
		let e = { summary: this._title.trim() };
		this._description.trim() && (e.description = this._description.trim()), this._location.trim() && (e.location = this._location.trim());
		let t, n;
		if (this._allDay) {
			e.start_date = this._date;
			let r = /* @__PURE__ */ new Date(`${this._date}T00:00:00`);
			r.setDate(r.getDate() + 1);
			let i = Wr(r);
			e.end_date = i, t = this._date, n = i;
		} else {
			let r = Hr(this._date, this._startTime), i = Hr(this._date, this._endTime);
			e.start_date_time = r, e.end_date_time = i, t = r, n = i;
		}
		try {
			await this.hass.callService("calendar", "create_event", e, { entity_id: this._calendarEntityId });
		} catch (e) {
			this._error = e instanceof Error ? e.message : "Failed to create event", this._saving = !1;
			return;
		}
		this.dispatchEvent(new CustomEvent("lucarne-event-created", {
			detail: {
				entityId: this._calendarEntityId,
				event: {
					summary: this._title.trim(),
					start: t,
					end: n,
					description: this._description.trim() || void 0,
					location: this._location.trim() || void 0,
					uid: `${this._calendarEntityId}::pending:${t}|${n}|${this._title.trim()}`,
					pending: !0
				}
			},
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		return this.calendars.length ? L`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Create event">
        <div class="popover-header">
          <h2 class="popover-title">New Event</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label for="ce-title">Title *</label>
          <input
            id="ce-title"
            type="text"
            placeholder="Event title"
            .value=${this._title}
            @input=${(e) => this._title = e.target.value}
            @keydown=${(e) => e.key === "Enter" && this._create()}
          />
        </div>

        <div class="field">
          <label for="ce-calendar">Calendar</label>
          <select
            id="ce-calendar"
            .value=${this._calendarEntityId}
            @change=${(e) => this._calendarEntityId = e.target.value}
          >
            ${this.calendars.map((e) => L`<option value=${e.entity}>${e.label}</option>`)}
          </select>
        </div>

        <div class="field">
          <label for="ce-date">Date</label>
          <input
            id="ce-date"
            type="date"
            .value=${this._date}
            @change=${(e) => this._date = e.target.value}
          />
        </div>

        <div class="allday-row">
          <input
            id="ce-allday"
            type="checkbox"
            .checked=${this._allDay}
            @change=${(e) => this._allDay = e.target.checked}
          />
          <label for="ce-allday" style="margin:0; font-weight:400; color:var(--lucarne-on-surface)">All day</label>
        </div>

        ${this._allDay ? "" : L`
              <div class="time-row">
                <div class="field">
                  <label for="ce-start">Start</label>
                  <input
                    id="ce-start"
                    type="time"
                    .value=${this._startTime}
                    @change=${(e) => this._startTime = e.target.value}
                  />
                </div>
                <div class="field">
                  <label for="ce-end">End</label>
                  <input
                    id="ce-end"
                    type="time"
                    .value=${this._endTime}
                    @change=${(e) => this._endTime = e.target.value}
                  />
                </div>
              </div>
            `}

        <div class="field">
          <label for="ce-location">Location</label>
          <input
            id="ce-location"
            type="text"
            placeholder="Optional"
            .value=${this._location}
            @input=${(e) => this._location = e.target.value}
          />
        </div>

        <div class="field">
          <label for="ce-description">Description</label>
          <textarea
            id="ce-description"
            placeholder="Optional"
            .value=${this._description}
            @input=${(e) => this._description = e.target.value}
          ></textarea>
        </div>

        ${this._error ? L`<div class="error-msg">${this._error}</div>` : ""}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button class="btn btn-create" ?disabled=${this._saving} @click=${this._create}>
            ${this._saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    ` : L``;
	}
}, Vr.styles = [K, M`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .close-btn:hover {
        background: rgba(0, 0, 0, 0.06);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='date'],
      input[type='time'],
      select,
      textarea {
        appearance: none;
        -webkit-appearance: none;
        text-align: left;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input[type='date']::-webkit-date-and-time-value,
      input[type='time']::-webkit-date-and-time-value {
        text-align: left;
      }
      input[type='date']::-webkit-calendar-picker-indicator,
      input[type='time']::-webkit-calendar-picker-indicator {
        opacity: 0.6;
      }
      input:focus,
      select:focus,
      textarea:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      textarea {
        min-height: 64px;
        resize: vertical;
      }
      .time-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--lucarne-spacing-sm);
      }
      .allday-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        margin-bottom: var(--lucarne-spacing-md);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
      }
      .allday-row input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .allday-row input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .allday-row input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-create {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-create:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `], Vr);
q([W({ attribute: !1 })], X.prototype, "hass", void 0), q([W({ type: Object })], X.prototype, "day", void 0), q([W({ type: Number })], X.prototype, "startHour", void 0), q([W({ type: Array })], X.prototype, "calendars", void 0), q([G()], X.prototype, "_title", void 0), q([G()], X.prototype, "_calendarEntityId", void 0), q([G()], X.prototype, "_date", void 0), q([G()], X.prototype, "_startTime", void 0), q([G()], X.prototype, "_endTime", void 0), q([G()], X.prototype, "_allDay", void 0), q([G()], X.prototype, "_description", void 0), q([G()], X.prototype, "_location", void 0), q([G()], X.prototype, "_error", void 0), q([G()], X.prototype, "_saving", void 0), X = q([U("lucarne-create-event-popover")], X);
//#endregion
//#region src/cards/lucarne-calendar-card.ts
var Gr, Kr = 6e4, qr = 4, Jr = 60;
window.customCards = window.customCards || [], window.customCards.push({
	type: "lucarne-calendar-card",
	name: "Lucarne Calendar",
	description: "Week view calendar with per-person color, visibility pills, and create-event flow",
	preview: !0
});
var Z = (Gr = class extends ut {
	constructor(...e) {
		super(...e), this._layout = null, this._visibleIds = /* @__PURE__ */ new Set(), this._openEvent = null, this._openEventColor = "", this._openEventCalLabel = "", this._openEventEntityId = "", this._createDay = null, this._createStartHour = 9, this._creatableCalendars = [], this._dayWidthPx = 0, this._deletedUids = /* @__PURE__ */ new Set(), this._pendingEvents = [], this._lastVisibleCount = 3, this._didInitialScroll = !1, this._initialScrollScheduled = !1, this._initialScrollAttempts = 0, this._autoFollow = !0, this._lastAutoScrollTop = null;
	}
	applyConfig(e) {
		if (!e.calendars || !Array.isArray(e.calendars) || e.calendars.length === 0) throw new lt("lucarne-calendar-card: \"calendars\" must be a non-empty array");
		for (let t of e.calendars) if (!t || typeof t != "object" || !t.entity || !t.color) throw new lt("lucarne-calendar-card: each calendar requires \"entity\" and \"color\"");
		let t = e;
		if (e.visible_hours) {
			let n = /^\d{1,2}:\d{2}$/;
			if (!n.test(e.visible_hours.start) || !n.test(e.visible_hours.end)) throw new lt("lucarne-calendar-card: \"visible_hours\" start and end must be in HH:MM format");
			let r = parseInt(e.visible_hours.start.split(":")[0], 10), i = parseInt(e.visible_hours.end.split(":")[0], 10);
			if (r < 0 || i > 24 || r >= i) throw new lt("lucarne-calendar-card: \"visible_hours\" must satisfy 0 <= start < end <= 24");
			t = {
				...e,
				visible_hours: {
					start: `${String(r).padStart(2, "0")}:00`,
					end: `${String(i).padStart(2, "0")}:00`
				}
			};
		}
		let n = this._config;
		if (this._config = t, this._visibleIds = new Set(e.calendars.map((e) => e.entity)), this.hass && this._updateCreatableCalendars(), this._rolling) this._rolling.updateCalendars(t.calendars), (n == null ? void 0 : n.render_buffer_days) !== t.render_buffer_days && this._rolling.setBufferDays(t.render_buffer_days), ((n == null ? void 0 : n.min_days) !== e.min_days || (n == null ? void 0 : n.max_days) !== e.max_days || (n == null ? void 0 : n.min_col_width) !== e.min_col_width || (n == null ? void 0 : n.max_col_width) !== e.max_col_width) && this._onResize();
		else {
			let e = this._effectiveConfig();
			this._lastVisibleCount = e.minDays, this._rolling = new dr(this, {
				calendars: t.calendars,
				visibleCount: e.minDays,
				bufferDays: t.render_buffer_days,
				onFetchComplete: (e, t) => this._onFetchComplete(e, t),
				onChange: () => this._recompute()
			});
		}
	}
	static getStubConfig(e) {
		let t = Object.keys(e.states).filter((e) => e.startsWith("calendar.")).slice(0, 3), n = [
			"#a8d8b9",
			"#a8c5e8",
			"#c8b4e0"
		], r = t.map((e, t) => ({
			entity: e,
			color: n[t] ?? "#a8d8b9"
		}));
		return {
			type: "custom:lucarne-calendar-card",
			title: "Calendar",
			calendars: r.length ? r : [{
				entity: "calendar.example",
				color: "#a8d8b9"
			}],
			visible_hours: {
				start: "07:00",
				end: "21:00"
			},
			show_create_button: !0,
			min_days: 3,
			max_days: 7,
			min_col_width: 140,
			max_col_width: 220
		};
	}
	getCardSize() {
		return 6;
	}
	getGridOptions() {
		return {
			columns: 9,
			rows: "auto",
			min_columns: 6,
			max_columns: 12
		};
	}
	static getConfigElement() {
		return document.createElement("lucarne-calendar-card-editor");
	}
	connectedCallback() {
		super.connectedCallback(), this._previewOverrideRaf = requestAnimationFrame(() => {
			this._previewOverrideRaf = void 0, this.isConnected && (this._previewOverride = xt(this));
		}), this._followTimer = setInterval(() => this._followNow(), Kr), this._ensureGridMeasured();
	}
	disconnectedCallback() {
		var e;
		super.disconnectedCallback(), this._previewOverrideRaf !== void 0 && (cancelAnimationFrame(this._previewOverrideRaf), this._previewOverrideRaf = void 0), this._followTimer !== void 0 && (clearInterval(this._followTimer), this._followTimer = void 0), this._resetInitialScroll(), this._autoFollow = !0, this._lastAutoScrollTop = null, this._teardownGridObserver(), (e = this._previewOverride) == null || e.uninstall(), this._previewOverride = void 0;
	}
	firstUpdated() {
		this._ensureGridMeasured();
	}
	_ensureGridMeasured() {
		let e = this._gridAreaEl;
		if (!e) {
			this._observedGridEl !== void 0 && (this._teardownGridObserver(), this._resetInitialScroll());
			return;
		}
		if (e === this._observedGridEl) return;
		let t = this._observedGridEl !== void 0;
		this._teardownGridObserver(), this._observedGridEl = e, typeof ResizeObserver < "u" && (this._resizeObserver = new ResizeObserver(() => this._onResize()), this._resizeObserver.observe(e)), t && this._resetInitialScroll(), this._onResize();
	}
	_teardownGridObserver() {
		var e;
		(e = this._resizeObserver) == null || e.disconnect(), this._resizeObserver = void 0, this._observedGridEl = void 0;
	}
	_resetInitialScroll() {
		this._initialScrollRaf !== void 0 && (cancelAnimationFrame(this._initialScrollRaf), this._initialScrollRaf = void 0), this._didInitialScroll = !1, this._initialScrollScheduled = !1, this._initialScrollAttempts = 0;
	}
	updated(e) {
		super.updated(e), this._ensureGridMeasured(), !this._didInitialScroll && !this._initialScrollScheduled && this._layout && this._dayWidthPx > 0 && (this._initialScrollScheduled = !0, this._scheduleInitialScroll()), !(!e.has("hass") || !this._config) && (this._rolling.setHass(this.hass), this._updateCreatableCalendars());
	}
	_scheduleInitialScroll() {
		this._initialScrollRaf = requestAnimationFrame(() => {
			if (this._initialScrollRaf = void 0, !this.isConnected || this._didInitialScroll) {
				this._initialScrollScheduled = !1;
				return;
			}
			if (this._performAutoScroll("auto")) {
				this._didInitialScroll = !0, this._initialScrollScheduled = !1;
				return;
			}
			++this._initialScrollAttempts < Jr ? this._scheduleInitialScroll() : this._initialScrollScheduled = !1;
		});
	}
	_performAutoScroll(e) {
		var t, n, r;
		let i = this._gridAreaEl;
		if (!i || !this._config) return !1;
		let a = this.renderRoot.querySelector("lucarne-calendar-grid"), o = a == null || (t = a.shadowRoot) == null ? void 0 : t.querySelector(".time-col");
		if (!o) return !1;
		let s = i.getBoundingClientRect(), c = o.getBoundingClientRect();
		if (c.height <= 0) return !1;
		let [l] = (((n = this._config.visible_hours) == null ? void 0 : n.start) ?? "07:00").split(":").map(Number), [u] = (((r = this._config.visible_hours) == null ? void 0 : r.end) ?? "21:00").split(":").map(Number), d = u - l;
		if (d <= 0) return !1;
		let f = fr({
			now: /* @__PURE__ */ new Date(),
			bandStartH: l,
			bandEndH: u,
			timeGridTopPx: c.top - s.top + i.scrollTop,
			timeGridHeightPx: c.height,
			paddingPx: c.height / d,
			maxScrollTop: i.scrollHeight - i.clientHeight
		});
		return i.scrollTo({
			top: f,
			behavior: e
		}), this._lastAutoScrollTop = f, !0;
	}
	_followNow() {
		var e;
		if (!this._autoFollow || !((e = this._rolling) != null && e.isAtToday) || typeof document < "u" && document.visibilityState === "hidden") return;
		let t = this._gridAreaEl;
		if (t) {
			if (this._lastAutoScrollTop !== null && Math.abs(t.scrollTop - this._lastAutoScrollTop) > qr) {
				this._autoFollow = !1;
				return;
			}
			this._performAutoScroll("smooth");
		}
	}
	_onTodayClick() {
		this._rolling.goToToday(), this._autoFollow = !0, this.updateComplete.then(() => requestAnimationFrame(() => this._performAutoScroll("smooth")));
	}
	_effectiveConfig() {
		let e = this._config;
		return {
			minDays: e.min_days && e.min_days > 0 ? e.min_days : 3,
			maxDays: e.max_days && e.max_days > 0 ? e.max_days : 7,
			minColWidth: e.min_col_width && e.min_col_width > 0 ? e.min_col_width : 140,
			maxColWidth: e.max_col_width && e.max_col_width > 0 ? e.max_col_width : 220,
			timeColWidth: 40
		};
	}
	_onResize() {
		this._resizeFrame === void 0 && (this._resizeFrame = requestAnimationFrame(() => {
			var e;
			this._resizeFrame = void 0;
			let { visibleCount: t, dayWidthPx: n } = or(((e = this._gridAreaEl) == null ? void 0 : e.getBoundingClientRect().width) ?? 0, this._effectiveConfig());
			t !== this._lastVisibleCount && (this._lastVisibleCount = t, this._rolling.setVisibleCount(t), this.style.setProperty("--lucarne-day-count", String(t))), this._dayWidthPx = n;
		}));
	}
	_recompute() {
		var e, t;
		if (!this._config) return;
		let n = [];
		for (let [e, t] of this._rolling.cachedEvents.entries()) this._visibleIds.has(e) && n.push(...t);
		n.push(...this._pendingEvents.filter((e) => {
			var t;
			let n = (t = e.uid) == null ? void 0 : t.split("::")[0];
			return n ? this._visibleIds.has(n) : !0;
		}));
		let r = this._deletedUids.size > 0 ? n.filter((e) => !e.uid || !this._deletedUids.has(e.uid)) : n, i = ((e = this._config.visible_hours) == null ? void 0 : e.start) ?? "07:00", a = ((t = this._config.visible_hours) == null ? void 0 : t.end) ?? "21:00", o = this._rolling.renderDays;
		this._layout = ar(r, o, i, a);
	}
	_supportsCreate(e) {
		var t;
		let n = (t = this.hass) == null || (t = t.states[e]) == null || (t = t.attributes) == null ? void 0 : t.supported_features;
		return n !== void 0 && (n & 1) != 0;
	}
	_updateCreatableCalendars() {
		if (!this._config || !this.hass) return;
		let e = this._config.calendars.filter((e) => this._supportsCreate(e.entity));
		e.length === this._creatableCalendars.length && e.every((e, t) => {
			var n;
			return e.entity === ((n = this._creatableCalendars[t]) == null ? void 0 : n.entity);
		}) || (this._creatableCalendars = e);
	}
	_onVisibilityChange(e) {
		this._visibleIds = e.detail, this._recompute();
	}
	_onEventTap(e) {
		var t;
		let { event: n, color: r } = e.detail;
		if (this._openEvent = n, this._openEventColor = r, (t = n.uid) != null && t.includes("::")) {
			var i;
			let e = n.uid.split("::")[0];
			this._openEventEntityId = e;
			let t = (i = this._config) == null ? void 0 : i.calendars.find((t) => t.entity === e);
			this._openEventCalLabel = t ? Gn(t, this.hass) : "";
		} else this._openEventEntityId = "", this._openEventCalLabel = "";
	}
	_onEventDeleted(e) {
		this._deletedUids = new Set([...this._deletedUids, e.detail.uid]), this._openEvent = null, this._openEventEntityId = "", this._recompute();
	}
	_onFetchComplete(e, t) {
		if (this._pendingEvents = [], this._deletedUids.size > 0) {
			let n = /* @__PURE__ */ new Set();
			for (let t of e.values()) for (let e of t) e.uid && n.add(e.uid);
			let r = /* @__PURE__ */ new Set();
			for (let e of this._deletedUids) {
				let i = e.includes("::") ? e.split("::")[0] : "";
				(t.has(i) || n.has(e)) && r.add(e);
			}
			this._deletedUids = r;
		}
		this._recompute();
	}
	_closePopover() {
		this._openEvent = null;
	}
	_onCreateEventTap(e) {
		let { day: t, startHour: n } = e.detail;
		this._createDay = t, this._createStartHour = n;
	}
	_closeCreatePopover() {
		this._createDay = null;
	}
	_onEventCreated(e) {
		let { event: t } = e.detail;
		this._pendingEvents = [...this._pendingEvents, t], this._recompute(), this._closeCreatePopover();
	}
	_rangeLabel() {
		let e = this._rolling.days;
		if (e.length === 0) return "";
		let t = e[0], n = e[e.length - 1], r = (e, t) => e.toLocaleDateString("en-US", t), i = t.getMonth() === n.getMonth() && t.getFullYear() === n.getFullYear(), a = t.getFullYear() === n.getFullYear();
		return i ? `${r(t, {
			month: "short",
			day: "numeric"
		})} – ${r(n, { day: "numeric" })}` : a ? `${r(t, {
			month: "short",
			day: "numeric"
		})} – ${r(n, {
			month: "short",
			day: "numeric"
		})}` : `${r(t, {
			month: "short",
			day: "numeric",
			year: "numeric"
		})} – ${r(n, {
			month: "short",
			day: "numeric",
			year: "numeric"
		})}`;
	}
	renderContent() {
		var e, t;
		if (!this._config) return L``;
		let n = ((e = this._config.visible_hours) == null ? void 0 : e.start) ?? "07:00", r = ((t = this._config.visible_hours) == null ? void 0 : t.end) ?? "21:00", i = Kn(this._config.calendars, this.hass), a = Kn(this._creatableCalendars, this.hass);
		return L`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title ?? "Calendar"}</h2>
          <div class="week-nav">
            <button
              class="nav-btn"
              @click=${() => this._rolling.pan(-this._lastVisibleCount)}
              ?disabled=${!this._rolling.canPanBack}
              aria-label="Previous ${this._lastVisibleCount} days"
            >←</button>
            ${this._rolling.isAtToday ? "" : L`<button class="nav-btn" @click=${() => this._onTodayClick()} aria-label="Today">Today</button>`}
            <span class="week-label">${this._rangeLabel()}</span>
            <button
              class="nav-btn"
              @click=${() => this._rolling.pan(+this._lastVisibleCount)}
              ?disabled=${!this._rolling.canPanForward}
              aria-label="Next ${this._lastVisibleCount} days"
            >→</button>
          </div>
        </div>

        <div class="pills-row">
          <lucarne-visibility-pills
            .calendars=${i}
            .visibleIds=${this._visibleIds}
            @visibility-change=${this._onVisibilityChange}
          ></lucarne-visibility-pills>
        </div>

        <div
          class="grid-area"
          @lucarne-event-tap=${this._onEventTap}
          @lucarne-create-event-tap=${this._onCreateEventTap}
        >
          <lucarne-calendar-day-pan
            .dayWidthPx=${this._dayWidthPx}
            .bufferDays=${this._rolling.bufferDays}
            .canPanBack=${this._rolling.canPanBack}
            .canPanForward=${this._rolling.canPanForward}
            @pan-snap=${(e) => this._rolling.pan(-e.detail.deltaDays)}
          >
            <lucarne-calendar-grid
              .layout=${this._layout}
              .bandStart=${n}
              .bandEnd=${r}
              .calendars=${i}
              .dayWidthPx=${this._dayWidthPx}
              .bufferDays=${this._rolling.bufferDays}
              .cachedDayKeys=${new Set(this._rolling.cachedRange.map(Y))}
              .showCreateButton=${(this._config.show_create_button ?? !0) && this._creatableCalendars.length > 0}
            ></lucarne-calendar-grid>
          </lucarne-calendar-day-pan>
        </div>

        ${this._openEvent ? L`
              <lucarne-calendar-event-popover
                .event=${this._openEvent}
                .color=${this._openEventColor}
                .calendarLabel=${this._openEventCalLabel}
                .hass=${this.hass}
                .entityId=${this._openEventEntityId}
                @popover-close=${this._closePopover}
                @lucarne-event-deleted=${this._onEventDeleted}
              ></lucarne-calendar-event-popover>
            ` : ""}

        ${this._createDay === null ? "" : L`
              <lucarne-create-event-popover
                .hass=${this.hass}
                .day=${this._createDay}
                .startHour=${this._createStartHour}
                .calendars=${a}
                @popover-close=${this._closeCreatePopover}
                @lucarne-event-created=${this._onEventCreated}
              ></lucarne-create-event-popover>
            `}
      </ha-card>
    `;
	}
}, Gr.styles = [K, M`
      :host {
        display: block;
        font-family: var(--primary-font-family, sans-serif);
      }
      ha-card {
        padding: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        /* Fixed outer height shared with the Today card; the grid-area flexes to
           fill the remainder and scrolls internally (not a min-height — that lets
           the tall time-grid push the card open instead of capping it). */
        height: var(--lucarne-card-fill-height);
      }
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-xs);
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .week-nav {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-xs);
      }
      .nav-btn {
        background: none;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: var(--lucarne-radius-sm);
        padding: 4px 10px;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      .nav-btn:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.04);
      }
      .nav-btn:disabled {
        opacity: 0.3;
        cursor: default;
      }
      .week-label {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-width: 80px;
        text-align: center;
      }
      .pills-row {
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
      .grid-area {
        overflow: auto;
        /* Fill the space below the header + pills; ha-card sets the card height. */
        flex: 1 1 auto;
        min-height: 0;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
    `], Gr);
q([W({ attribute: !1 })], Z.prototype, "hass", void 0), q([ct(".grid-area")], Z.prototype, "_gridAreaEl", void 0), q([G()], Z.prototype, "_config", void 0), q([G()], Z.prototype, "_layout", void 0), q([G()], Z.prototype, "_visibleIds", void 0), q([G()], Z.prototype, "_openEvent", void 0), q([G()], Z.prototype, "_openEventColor", void 0), q([G()], Z.prototype, "_openEventCalLabel", void 0), q([G()], Z.prototype, "_openEventEntityId", void 0), q([G()], Z.prototype, "_createDay", void 0), q([G()], Z.prototype, "_createStartHour", void 0), q([G()], Z.prototype, "_creatableCalendars", void 0), q([G()], Z.prototype, "_dayWidthPx", void 0), q([G()], Z.prototype, "_deletedUids", void 0), Z = q([U("lucarne-calendar-card")], Z);
//#endregion
//#region src/editors/lucarne-calendar-card-editor.ts
var Yr, Xr = (Yr = class extends H {
	constructor(...e) {
		super(...e), this._haReady = !1, this._invalid = {};
	}
	connectedCallback() {
		super.connectedCallback(), Fn().catch((e) => console.warn("[lucarne] HA editor elements load failed; rendering anyway", e)).then(() => {
			this._haReady = !0;
		});
	}
	setConfig(e) {
		this._config = e;
	}
	_fire(e) {
		Rn(this, "config-changed", { config: e });
	}
	_titleChanged(e) {
		let t = e.target;
		this._fire({
			...this._config,
			title: t.value || void 0
		});
	}
	_bandStartChanged(e) {
		let t = e.target;
		this._fire({
			...this._config,
			visible_hours: {
				...this._config.visible_hours ?? {
					start: "07:00",
					end: "21:00"
				},
				start: t.value
			}
		});
	}
	_bandEndChanged(e) {
		let t = e.target;
		this._fire({
			...this._config,
			visible_hours: {
				...this._config.visible_hours ?? {
					start: "07:00",
					end: "21:00"
				},
				end: t.value
			}
		});
	}
	_showCreateChanged(e) {
		let t = e.target.checked;
		this._fire({
			...this._config,
			show_create_button: t
		});
	}
	_calEntityChanged(e, t) {
		var n, r;
		let i = [...((n = this._config) == null ? void 0 : n.calendars) ?? []];
		i[e] = {
			...i[e],
			entity: ((r = t.detail) == null ? void 0 : r.value) ?? ""
		}, this._fire({
			...this._config,
			calendars: i
		});
	}
	_calColorChanged(e, t) {
		var n;
		let r = [...((n = this._config) == null ? void 0 : n.calendars) ?? []];
		r[e] = {
			...r[e],
			color: t.target.value
		}, this._fire({
			...this._config,
			calendars: r
		});
	}
	_removeCalendar(e) {
		var t;
		let n = [...((t = this._config) == null ? void 0 : t.calendars) ?? []];
		n.length <= 1 || (n.splice(e, 1), this._fire({
			...this._config,
			calendars: n
		}));
	}
	_windowFieldChanged(e, t) {
		let n = t.target, r = n.value === "" ? void 0 : n.valueAsNumber, i = r !== void 0 && Number.isFinite(r) ? r : void 0, a = {
			...this._config,
			[e]: i
		}, o = a.min_days ?? 3, s = a.max_days ?? 7, c = a.min_col_width ?? 140, l = a.max_col_width ?? 220;
		this._invalid = {
			days: o > s,
			cols: c > l
		}, this._fire(a);
	}
	_addCalendar() {
		var e, t;
		let n = Object.keys(((e = this.hass) == null ? void 0 : e.states) ?? {}).find((e) => e.startsWith("calendar.")) ?? "calendar.example", r = [...((t = this._config) == null ? void 0 : t.calendars) ?? [], {
			entity: n,
			color: "#a8d8b9"
		}];
		this._fire({
			...this._config,
			calendars: r
		});
	}
	render() {
		var e, t;
		if (!this._config) return L``;
		if (!this._haReady) return L`<div class="loading">Loading editor…</div>`;
		let n = this._config.calendars ?? [], r = ((e = this._config.visible_hours) == null ? void 0 : e.start) ?? "07:00", i = ((t = this._config.visible_hours) == null ? void 0 : t.end) ?? "21:00", a = this._config.show_create_button ?? !0, o = this._config.min_days, s = this._config.max_days, c = this._config.min_col_width, l = this._config.max_col_width;
		return L`
      <label class="field">
        <span class="field-label">Card title</span>
        <input
          class="text-input"
          type="text"
          .value=${this._config.title ?? ""}
          @change=${this._titleChanged}
        />
      </label>

      <div class="row">
        <label class="field">
          <span class="field-label">Visible hours start (HH:MM)</span>
          <input
            class="text-input"
            type="text"
            .value=${r}
            @change=${this._bandStartChanged}
          />
        </label>
        <label class="field">
          <span class="field-label">Visible hours end (HH:MM)</span>
          <input
            class="text-input"
            type="text"
            .value=${i}
            @change=${this._bandEndChanged}
          />
        </label>
      </div>

      <label class="toggle-row">
        <span class="toggle-label">Show create-event button</span>
        <input
          type="checkbox"
          .checked=${a}
          @change=${this._showCreateChanged}
        />
      </label>

      <div class="section-label">Visible day window</div>
      <div class="row">
        <label class="field">
          <span class="field-label">Min days (1–14)</span>
          <input
            class="text-input"
            type="number"
            min="1"
            max="14"
            step="1"
            .value=${o === void 0 ? "" : String(o)}
            placeholder="3"
            @change=${(e) => this._windowFieldChanged("min_days", e)}
          />
          ${this._invalid.days ? L`<div class="editor-error">Min days must be ≤ max days</div>` : ""}
        </label>
        <label class="field">
          <span class="field-label">Max days (1–14)</span>
          <input
            class="text-input"
            type="number"
            min="1"
            max="14"
            step="1"
            .value=${s === void 0 ? "" : String(s)}
            placeholder="7"
            @change=${(e) => this._windowFieldChanged("max_days", e)}
          />
          ${this._invalid.days ? L`<div class="editor-error">Max days must be ≥ min days</div>` : ""}
        </label>
      </div>
      <div class="row">
        <label class="field">
          <span class="field-label">Min column width px (60–400)</span>
          <input
            class="text-input"
            type="number"
            min="60"
            max="400"
            step="10"
            .value=${c === void 0 ? "" : String(c)}
            placeholder="140"
            @change=${(e) => this._windowFieldChanged("min_col_width", e)}
          />
          ${this._invalid.cols ? L`<div class="editor-error">Min width must be ≤ max width</div>` : ""}
        </label>
        <label class="field">
          <span class="field-label">Max column width px (100–600)</span>
          <input
            class="text-input"
            type="number"
            min="100"
            max="600"
            step="10"
            .value=${l === void 0 ? "" : String(l)}
            placeholder="220"
            @change=${(e) => this._windowFieldChanged("max_col_width", e)}
          />
          ${this._invalid.cols ? L`<div class="editor-error">Max width must be ≥ min width</div>` : ""}
        </label>
      </div>

      <div class="section-label">Calendars</div>
      ${n.map((e, t) => L`
          <div class="cal-row">
            <ha-entity-picker
              label="Calendar entity"
              .hass=${this.hass}
              .value=${e.entity}
              .includeDomains=${["calendar"]}
              allow-custom-entity
              @value-changed=${(e) => this._calEntityChanged(t, e)}
            ></ha-entity-picker>
            <input
              type="color"
              class="cal-color"
              .value=${e.color}
              @input=${(e) => this._calColorChanged(t, e)}
              title="Calendar color"
            />
            <button type="button" class="remove" @click=${() => this._removeCalendar(t)} title="Remove">✕</button>
          </div>
        `)}
      <button type="button" class="add" @click=${this._addCalendar}>+ Add calendar</button>
    `;
	}
}, Yr.styles = [K, kn], Yr);
q([W({ attribute: !1 })], Xr.prototype, "hass", void 0), q([G()], Xr.prototype, "_config", void 0), q([G()], Xr.prototype, "_haReady", void 0), q([G()], Xr.prototype, "_invalid", void 0), Xr = q([U("lucarne-calendar-card-editor")], Xr);
//#endregion
//#region src/shared/types.ts
var Zr = [
	"anytime",
	"morning",
	"afternoon",
	"night"
];
function Qr(e) {
	return typeof e == "string" && Zr.includes(e) ? e : "anytime";
}
//#endregion
//#region src/components/streak-display.ts
var $r, ei = ($r = class extends H {
	constructor(...e) {
		super(...e), this.streak = 0;
	}
	_milestoneClass(e) {
		return e >= 30 ? "milestone-5" : e >= 14 ? "milestone-4" : e >= 7 ? "milestone-3" : e >= 3 ? "milestone-2" : e >= 1 ? "milestone-1" : "";
	}
	render() {
		let e = isNaN(this.streak) ? 0 : this.streak, t = e > 0 ? "day streak" : "start a streak today";
		return L`
      <div class="streak-row">
        <span class="flame ${this._milestoneClass(e)}">🔥</span>
        <span class="count">${e}</span>
      </div>
      <div class="label">${t}</div>
    `;
	}
}, $r.styles = M`
    :host {
      display: block;
      text-align: center;
      padding: 8px 4px;
      font-family: var(--primary-font-family, sans-serif);
    }
    .streak-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .flame {
      font-size: clamp(1.1rem, 1.8vw, 1.5rem);
      line-height: 1;
      transition: font-size 0.2s;
    }
    .flame.milestone-1 { font-size: clamp(1.2rem, 2vw, 1.6rem); }
    .flame.milestone-2 { font-size: clamp(1.3rem, 2.2vw, 1.75rem); }
    .flame.milestone-3 { font-size: clamp(1.4rem, 2.4vw, 1.9rem); }
    .flame.milestone-4 { font-size: clamp(1.5rem, 2.6vw, 2rem); }
    .flame.milestone-5 { font-size: clamp(1.6rem, 2.8vw, 2.2rem); }
    .count {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      color: var(--primary-text-color, #212121);
    }
    .label {
      font-size: clamp(0.7rem, 0.9vw, 0.8rem);
      color: var(--secondary-text-color, #727272);
      margin-top: 2px;
    }
  `, $r);
q([W({ type: Number })], ei.prototype, "streak", void 0), ei = q([U("lucarne-streak-display")], ei);
//#endregion
//#region src/components/celebration-overlay.ts
var ti, ni = (ti = class extends H {
	constructor(...e) {
		super(...e), this.kidSlug = "", this.active = !1, this._dots = [];
	}
	connectedCallback() {
		super.connectedCallback(), this._generateDots();
	}
	_generateDots() {
		let e = [
			"#f5c89c",
			"#b8e0d2",
			"#f0b8c8",
			"#a8d8b9",
			"#c8b4e0",
			"#f0dca0"
		];
		this._dots = Array.from({ length: 18 }, (t, n) => ({
			left: `${n / 17 * 90 + 5}%`,
			color: e[n % e.length],
			delay: `${(n * .08).toFixed(2)}s`,
			size: `${8 + Math.round(Math.random() * 6)}px`
		}));
	}
	render() {
		return this.active ? L`
      ${this._dots.map((e) => L`
          <div
            class="dot"
            style="left:${e.left};background:${e.color};animation-delay:${e.delay};width:${e.size};height:${e.size}"
          ></div>
        `)}
    ` : L``;
	}
}, ti.styles = M`
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      border-radius: inherit;
    }
    .dot {
      position: absolute;
      bottom: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: float-up 2s ease-out forwards;
    }
    @keyframes float-up {
      0%   { transform: translateY(0) scale(1);   opacity: 0.9; }
      60%  { opacity: 0.7; }
      100% { transform: translateY(-110%) scale(0.6); opacity: 0; }
    }
  `, ti);
q([W({ attribute: "kid-slug" })], ni.prototype, "kidSlug", void 0), q([W({ type: Boolean })], ni.prototype, "active", void 0), ni = q([U("lucarne-celebration-overlay")], ni);
//#endregion
//#region src/components/member-column.ts
var ri, ii = [
	"morning",
	"afternoon",
	"night",
	"anytime"
], ai = {
	morning: "Morning",
	afternoon: "Afternoon",
	night: "Night",
	anytime: "Anytime"
}, oi = {
	morning: Xt,
	afternoon: Zt,
	night: Qt
};
function si(e, t) {
	return e.due && t.due ? e.due.localeCompare(t.due) : e.due ? -1 : t.due ? 1 : e.summary.localeCompare(t.summary);
}
function ci(e) {
	let t = e.filter((e) => e.metadata.type === "routine").sort((e, t) => e.summary.localeCompare(t.summary)), n = e.filter((e) => e.metadata.type !== "routine").sort(si);
	return [...t, ...n];
}
function li(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = Qr(n.metadata.time_of_day), r = t.get(e) ?? [];
		r.push(n), t.set(e, r);
	}
	let n = [];
	for (let e of ii) {
		let r = t.get(e);
		!r || r.length === 0 || n.push({
			bucket: e,
			tasks: ci(r)
		});
	}
	return n;
}
var ui = (ri = class extends H {
	constructor(...e) {
		super(...e), this.tasks = [], this.members = [], this.streak = 0, this.showRoutines = !0, this.showTasks = !0, this.showStreak = !0, this.hideName = !1, this.scrollToBucket = "", this._celebrating = !1, this._celebrationTimer = null, this._lastAllRoutinesDone = null, this._scrollRaf = null, this._pendingScrollBucket = !1;
	}
	updated(e) {
		if (super.updated(e), e.has("scrollToBucket") && this._onScrollBucketChanged(), !e.has("tasks")) return;
		let t = this.tasks.filter((e) => e.metadata.type === "routine");
		if (t.length === 0) return;
		let n = t.every((e) => e.status === "completed");
		if (this._lastAllRoutinesDone === null) {
			this._lastAllRoutinesDone = n;
			return;
		}
		!this._lastAllRoutinesDone && n && this._triggerCelebration(), this._lastAllRoutinesDone = n;
	}
	_triggerCelebration() {
		this._celebrating = !0, this._celebrationTimer && clearTimeout(this._celebrationTimer), this._celebrationTimer = setTimeout(() => {
			this._celebrating = !1, this._celebrationTimer = null, this.requestUpdate();
		}, 2200), this.requestUpdate();
	}
	disconnectedCallback() {
		var e;
		super.disconnectedCallback(), this._celebrationTimer && clearTimeout(this._celebrationTimer), this._scrollRaf !== null && (cancelAnimationFrame(this._scrollRaf), this._scrollRaf = null), (e = this._listsResizeObs) == null || e.disconnect();
	}
	_onScrollBucketChanged() {
		if (!this.scrollToBucket) {
			var e;
			this._pendingScrollBucket = !1, this._scrollRaf !== null && (cancelAnimationFrame(this._scrollRaf), this._scrollRaf = null), (e = this._listsResizeObs) == null || e.disconnect();
			return;
		}
		this._pendingScrollBucket = !0, this._scrollRaf !== null && cancelAnimationFrame(this._scrollRaf), this._scrollRaf = requestAnimationFrame(() => {
			this._scrollRaf = null, this._tryApplyScroll();
		}), this._observeListsResize();
	}
	_tryApplyScroll() {
		if (!this._pendingScrollBucket || !this.scrollToBucket) return;
		let e = this.renderRoot.querySelector(".lists");
		if (!e) return;
		let t = this._sectionForBucket(e);
		if (t && (e.scrollTop = t.offsetTop - e.offsetTop), e.clientHeight > 0) {
			var n;
			this._pendingScrollBucket = !1, (n = this._listsResizeObs) == null || n.disconnect();
		}
	}
	_observeListsResize() {
		var e;
		if (typeof ResizeObserver > "u") return;
		let t = (e = this.renderRoot) == null ? void 0 : e.querySelector(".lists");
		t && (this._listsResizeObs || (this._listsResizeObs = new ResizeObserver(() => this._tryApplyScroll())), this._listsResizeObs.observe(t));
	}
	_sectionForBucket(e) {
		let t = ii.indexOf(this.scrollToBucket);
		if (t < 0) return null;
		for (let n of ii.slice(t)) {
			let t = e.querySelector(`.section[data-bucket="${n}"]`);
			if (t) return t;
		}
		return null;
	}
	render() {
		if (!this.member) return L``;
		let e = li(this.tasks.filter((e) => e.metadata.type === "routine" ? this.showRoutines : e.metadata.type === "chore" || e.metadata.type === "rotating" ? this.showTasks : !1));
		return L`
      <div class="column" style="--member-color:${this.member.color}">
        <lucarne-celebration-overlay
          kid-slug=${this.member.slug}
          ?active=${this._celebrating}
        ></lucarne-celebration-overlay>

        <button
          class="add-task-btn"
          @click=${this._onAddTask}
          aria-label="Add task for ${this.member.name}"
        ><span aria-hidden="true">+</span></button>

        <div class="header">
          <lucarne-member-avatar
            name=${this.member.name}
            color=${this.member.color}
            .avatar=${this.member.avatar}
          ></lucarne-member-avatar>
          ${this.hideName ? "" : L`<div class="member-name">${this.member.name}</div>`}
        </div>

        <div class="lists">
          ${e.map(({ bucket: e, tasks: t }) => L`
            <div class="section" data-bucket=${e}>
              <div class="section-header">
                ${oi[e] ? L`<span class="section-icon">${oi[e]}</span>` : ""}
                ${ai[e]}
              </div>
              ${t.map((e) => L`
                <lucarne-task-row
                  .task=${e}
                  .memberColor=${this.member.color}
                  .members=${this.members}
                ></lucarne-task-row>
              `)}
            </div>
          `)}
        </div>

        ${this.showStreak ? L`
              <div class="streak-area">
                <lucarne-streak-display .streak=${this.streak}></lucarne-streak-display>
              </div>
            ` : ""}
      </div>
    `;
	}
	_onAddTask() {
		this.dispatchEvent(new CustomEvent("add-task-clicked", {
			detail: { memberSlug: this.member.slug },
			bubbles: !0,
			composed: !0
		}));
	}
}, ri.styles = M`
    :host {
      display: block;
      position: relative;
      height: 100%;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 12px;
      position: relative;
      height: 100%;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      margin-bottom: 8px;
      flex: 0 0 auto;
    }
    .member-name {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 700;
      color: var(--primary-text-color, #212121);
      font-family: var(--primary-font-family, sans-serif);
      text-align: center;
    }
    .add-task-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px dashed rgba(0, 0, 0, 0.25);
      border-radius: 50%;
      font-size: 1.35rem;
      line-height: 1;
      color: var(--secondary-text-color, #727272);
      cursor: pointer;
    }
    .add-task-btn:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    /* Scrollable list region: flex:1 pushes the streak to the bottom of every
       column (so streaks align across equal-height columns), and the cap makes
       an overlong list scroll internally instead of stretching the card. */
    .lists {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      max-height: var(--lucarne-chores-list-max-height, 420px);
    }
    .section {
      display: flex;
      flex-direction: column;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--secondary-text-color, #727272);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 4px 2px;
    }
    .section-icon {
      display: inline-flex;
      flex-shrink: 0;
    }
    .section-icon svg {
      width: 14px;
      height: 14px;
    }
    .streak-area {
      padding-top: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.07);
      margin-top: 8px;
      flex: 0 0 auto;
    }
  `, ri);
q([W({ attribute: !1 })], ui.prototype, "member", void 0), q([W({ attribute: !1 })], ui.prototype, "tasks", void 0), q([W({ attribute: !1 })], ui.prototype, "members", void 0), q([W({ type: Number })], ui.prototype, "streak", void 0), q([W({
	type: Boolean,
	attribute: "show-routines"
})], ui.prototype, "showRoutines", void 0), q([W({
	type: Boolean,
	attribute: "show-tasks"
})], ui.prototype, "showTasks", void 0), q([W({
	type: Boolean,
	attribute: "show-streak"
})], ui.prototype, "showStreak", void 0), q([W({
	type: Boolean,
	attribute: "hide-name"
})], ui.prototype, "hideName", void 0), q([W({ attribute: "scroll-to-bucket" })], ui.prototype, "scrollToBucket", void 0), q([G()], ui.prototype, "_celebrating", void 0), ui = q([U("lucarne-member-column")], ui);
//#endregion
//#region src/shared/integration-services.ts
async function di(e, t) {
	var n;
	let r = {
		member: t.member,
		summary: t.summary,
		type: t.type
	};
	t.recurrence !== void 0 && (r.recurrence = t.recurrence), t.icon !== void 0 && (r.icon = t.icon), t.due !== void 0 && (r.due = t.due), t.source !== void 0 && (r.source = t.source), t.assignee !== void 0 && (r.assignee = t.assignee), t.time_of_day !== void 0 && (r.time_of_day = t.time_of_day), t.rotation_owners !== void 0 && (r.rotation_owners = t.rotation_owners), t.current_owner !== void 0 && (r.current_owner = t.current_owner);
	let i = await e.callService("lucarne_family", "add_task", r, void 0, !0, !0);
	return (i == null || (n = i.response) == null ? void 0 : n.uid) ?? null;
}
async function fi(e, t, n) {
	let r = { uid: t };
	n.type !== void 0 && (r.type = n.type), n.recurrence !== void 0 && (r.recurrence = n.recurrence), n.icon !== void 0 && (r.icon = n.icon), n.assignee !== void 0 && (r.assignee = n.assignee), n.time_of_day !== void 0 && (r.time_of_day = n.time_of_day), n.rotation_owners !== void 0 && (r.rotation_owners = n.rotation_owners), n.current_owner !== void 0 && (r.current_owner = n.current_owner), await e.callService("lucarne_family", "update_task_metadata", r);
}
async function pi(e, t) {
	await e.callService("lucarne_family", "delete_task", { uid: t });
}
async function mi(e, t, n) {
	let r = await n.arrayBuffer(), i = new Uint8Array(r), a = "";
	for (let e of i) a += String.fromCharCode(e);
	let o = btoa(a);
	await e.callService("lucarne_family", "upload_avatar", {
		member: t,
		image_data: o,
		mime_type: n.type
	});
}
async function hi(e, t, n) {
	await e.callService("lucarne_family", "set_member_avatar", {
		member: t,
		avatar: n
	});
}
//#endregion
//#region src/components/add-task-popover.ts
var gi, _i = [
	"🪥",
	"🛏️",
	"🎒",
	"💗",
	"📵",
	"🧸",
	"👕",
	"🧹",
	"🧺",
	"🍽️",
	"🐕",
	"🌱"
], Q = (gi = class extends H {
	constructor(...e) {
		super(...e), this.members = [], this._selectedMemberSlug = "", this._summary = "", this._type = "chore", this._icon = "", this._recurrenceMode = "none", this._recurrenceDays = [], this._recurrenceInterval = 1, this._recurrenceMonthDay = 1, this._recurrenceNth = 1, this._recurrenceNthDay = "MO", this._recurrenceMonth = 1, this._due = "", this._timeOfDay = "anytime", this._error = "", this._saving = !1, this._alsoAddSlugs = /* @__PURE__ */ new Set(), this._rotatingOwners = [];
	}
	updated(e) {
		super.updated(e), e.has("member") && this.member && (this._selectedMemberSlug = this.member.slug);
	}
	_close() {
		this.dispatchEvent(new CustomEvent("popover-close", {
			bubbles: !0,
			composed: !0
		}));
	}
	_buildRRule() {
		return this._recurrenceMode === "none" ? "" : this._recurrenceMode === "daily" ? kt({
			mode: "daily",
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "weekly" ? this._recurrenceDays.length === 0 ? "" : kt({
			mode: "weekly",
			days: this._recurrenceDays,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-date" ? kt({
			mode: "monthly-date",
			dayOfMonth: this._recurrenceMonthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-nth" ? kt({
			mode: "monthly-nth",
			nth: this._recurrenceNth,
			day: this._recurrenceNthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "yearly" ? kt({
			mode: "yearly",
			month: this._recurrenceMonth,
			dayOfMonth: this._recurrenceMonthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : "";
	}
	async _submit() {
		if (this._saving) return;
		if (!this._summary.trim()) {
			this._error = "Summary is required";
			return;
		}
		if (this._summary.trim().length > 200) {
			this._error = "Summary must be 200 characters or less";
			return;
		}
		if (this._type === "routine" && this._recurrenceMode === "weekly" && this._recurrenceDays.length === 0) {
			this._error = "Select at least one day for weekly recurrence";
			return;
		}
		if (this._type === "rotating" && this._rotatingOwners.length < 2) {
			this._error = "Select at least 2 owners for a rotating task";
			return;
		}
		this._saving = !0, this._error = "";
		let e = this._summary.trim(), t = [];
		try {
			if (this._type === "rotating") {
				let n = await di(this.hass, {
					member: "household",
					summary: e,
					type: "rotating",
					...this._icon ? { icon: this._icon } : {},
					time_of_day: this._timeOfDay,
					source: "manual",
					rotation_owners: this._rotatingOwners
				});
				n && t.push(this._provisionalTask(n, "household", e, null, {
					rotation_owners: this._rotatingOwners,
					current_owner: this._rotatingOwners[0]
				}));
			} else {
				let n = this._type === "routine" ? this._buildRRule() : "", r = this._type === "chore" ? this._due : "", i = this._type === "routine" ? [this._selectedMemberSlug, ...Array.from(this._alsoAddSlugs).filter((e) => e !== this._selectedMemberSlug)] : [this._selectedMemberSlug];
				for (let a of i) {
					let i = await di(this.hass, {
						member: a,
						summary: e,
						type: this._type,
						...n ? { recurrence: n } : {},
						...this._icon ? { icon: this._icon } : {},
						...r ? { due: r } : {},
						time_of_day: this._timeOfDay,
						source: "manual"
					});
					i && t.push(this._provisionalTask(i, a, e, r || null, { recurrence: n }));
				}
			}
			t.length > 0 && this.dispatchEvent(new CustomEvent("task-added", {
				detail: { tasks: t },
				bubbles: !0,
				composed: !0
			})), this._close();
		} catch (e) {
			this._error = e instanceof Error ? e.message : "Failed to add task", this._saving = !1;
		}
	}
	_provisionalTask(e, t, n, r, i = {}) {
		return {
			uid: e,
			summary: n,
			status: "needs_action",
			due: r,
			description: "",
			metadata: {
				item_uid: e,
				member_slug: t,
				assignee_slug: "",
				type: this._type,
				recurrence: i.recurrence ?? "",
				icon: this._icon,
				source: "manual",
				time_of_day: this._timeOfDay,
				...i.rotation_owners === void 0 ? {} : { rotation_owners: i.rotation_owners },
				...i.current_owner === void 0 ? {} : { current_owner: i.current_owner }
			}
		};
	}
	_toggleAlsoAdd(e) {
		let t = new Set(this._alsoAddSlugs);
		t.has(e) ? t.delete(e) : t.add(e), this._alsoAddSlugs = t;
	}
	_toggleRotatingOwner(e) {
		this._rotatingOwners.includes(e) ? this._rotatingOwners = this._rotatingOwners.filter((t) => t !== e) : this._rotatingOwners = [...this._rotatingOwners, e];
	}
	_moveOwner(e, t) {
		let n = this._rotatingOwners.indexOf(e);
		if (n < 0) return;
		let r = [...this._rotatingOwners], i = t === "up" ? n - 1 : n + 1;
		i < 0 || i >= r.length || ([r[n], r[i]] = [r[i], r[n]], this._rotatingOwners = r);
	}
	_toggleDay(e) {
		this._recurrenceDays.includes(e) ? this._recurrenceDays = this._recurrenceDays.filter((t) => t !== e) : this._recurrenceDays = [...this._recurrenceDays, e];
	}
	render() {
		let e = this._buildRRule(), t = e ? At(e) : "One-off (no repeat)", n = {
			MO: "Mon",
			TU: "Tue",
			WE: "Wed",
			TH: "Thu",
			FR: "Fri",
			SA: "Sat",
			SU: "Sun"
		};
		return L`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Add task">
        <div class="popover-header">
          <h2 class="popover-title">Add Task</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label for="at-member">Member</label>
          <select
            id="at-member"
            .value=${this._selectedMemberSlug}
            @change=${(e) => this._selectedMemberSlug = e.target.value}
          >
            ${this.members.map((e) => L`<option value=${e.slug}>${e.name}</option>`)}
          </select>
        </div>

        <div class="field">
          <label for="at-summary">Summary *</label>
          <input
            id="at-summary"
            type="text"
            placeholder="Task name"
            maxlength="200"
            .value=${this._summary}
            @input=${(e) => this._summary = e.target.value}
            @keydown=${(e) => e.key === "Enter" && this._submit()}
          />
        </div>

        <div class="field">
          <label for="at-type">Type</label>
          <select
            id="at-type"
            .value=${this._type}
            @change=${(e) => {
			let t = e.target.value;
			this._type = t, t !== "routine" && (this._alsoAddSlugs = /* @__PURE__ */ new Set()), t !== "rotating" && (this._rotatingOwners = []);
		}}
          >
            <option value="routine">Routine</option>
            <option value="chore">Chore</option>
            <option value="rotating">Rotating</option>
          </select>
        </div>

        <div class="field">
          <label for="at-time-of-day">Time of day</label>
          <select
            id="at-time-of-day"
            .value=${this._timeOfDay}
            @change=${(e) => this._timeOfDay = e.target.value}
          >
            <option value="anytime">Anytime</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div class="field">
          <label>Icon</label>
          <div class="emoji-picker">
            ${_i.map((e) => L`
              <button
                class="emoji-btn ${this._icon === e ? "selected" : ""}"
                @click=${() => this._icon = this._icon === e ? "" : e}
                title="${e}"
              >${e}</button>
            `)}
          </div>
          <input
            type="text"
            placeholder="Custom emoji"
            maxlength="8"
            .value=${this._icon}
            @input=${(e) => this._icon = e.target.value}
            style="margin-top:4px"
          />
        </div>

        ${this._type === "routine" ? L`
        <div class="field">
          <label for="at-recurrence">Recurrence</label>
          <select
            id="at-recurrence"
            .value=${this._recurrenceMode}
            @change=${(e) => this._recurrenceMode = e.target.value}
          >
            <option value="none">None (one-off)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly-date">Monthly by date</option>
            <option value="monthly-nth">Monthly by Nth weekday</option>
            <option value="yearly">Yearly</option>
          </select>

          ${this._recurrenceMode === "none" ? "" : L`
                <div class="recurrence-extra">
                  ${this._recurrenceMode !== "monthly-nth" && this._recurrenceMode !== "yearly" ? L`
                        <div>
                          <label>Interval</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            .value=${String(this._recurrenceInterval)}
                            @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceInterval = isNaN(t) || t < 1 ? 1 : t;
		}}
                          />
                        </div>
                      ` : ""}

                  ${this._recurrenceMode === "weekly" ? L`
                        <div>
                          <label>Days</label>
                          <div class="days-row">
                            ${Dt.map((e) => L`
                              <button
                                class="day-btn ${this._recurrenceDays.includes(e) ? "selected" : ""}"
                                @click=${() => this._toggleDay(e)}
                              >${n[e]}</button>
                            `)}
                          </div>
                        </div>
                      ` : ""}

                  ${this._recurrenceMode === "monthly-date" ? L`
                        <div>
                          <label for="at-monthday">Day of month</label>
                          <input
                            id="at-monthday"
                            type="number"
                            min="1"
                            max="31"
                            .value=${String(this._recurrenceMonthDay)}
                            @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceMonthDay = isNaN(t) || t < 1 ? 1 : Math.min(t, 31);
		}}
                          />
                        </div>
                      ` : ""}

                  ${this._recurrenceMode === "monthly-nth" ? L`
                        <div style="display:flex;gap:8px">
                          <div style="flex:1">
                            <label for="at-nth">Nth</label>
                            <select
                              id="at-nth"
                              .value=${String(this._recurrenceNth)}
                              @change=${(e) => this._recurrenceNth = parseInt(e.target.value, 10)}
                            >
                              <option value="1">1st</option>
                              <option value="2">2nd</option>
                              <option value="3">3rd</option>
                              <option value="4">4th</option>
                              <option value="-1">Last</option>
                            </select>
                          </div>
                          <div style="flex:1">
                            <label for="at-nthday">Day</label>
                            <select
                              id="at-nthday"
                              .value=${this._recurrenceNthDay}
                              @change=${(e) => this._recurrenceNthDay = e.target.value}
                            >
                              ${Dt.map((e) => L`<option value=${e}>${n[e]}</option>`)}
                            </select>
                          </div>
                          <div style="flex:1">
                            <label for="at-nth-interval">Every N months</label>
                            <input
                              id="at-nth-interval"
                              type="number"
                              min="1"
                              max="99"
                              .value=${String(this._recurrenceInterval)}
                              @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceInterval = isNaN(t) || t < 1 ? 1 : t;
		}}
                            />
                          </div>
                        </div>
                      ` : ""}

                  ${this._recurrenceMode === "yearly" ? L`
                        <div style="display:flex;gap:8px">
                          <div style="flex:1">
                            <label for="at-year-month">Month</label>
                            <input
                              id="at-year-month"
                              type="number"
                              min="1"
                              max="12"
                              .value=${String(this._recurrenceMonth)}
                              @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceMonth = isNaN(t) || t < 1 ? 1 : Math.min(t, 12);
		}}
                            />
                          </div>
                          <div style="flex:1">
                            <label for="at-year-day">Day</label>
                            <input
                              id="at-year-day"
                              type="number"
                              min="1"
                              max="31"
                              .value=${String(this._recurrenceMonthDay)}
                              @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceMonthDay = isNaN(t) || t < 1 ? 1 : Math.min(t, 31);
		}}
                            />
                          </div>
                          <div style="flex:1">
                            <label for="at-year-interval">Every N years</label>
                            <input
                              id="at-year-interval"
                              type="number"
                              min="1"
                              max="99"
                              .value=${String(this._recurrenceInterval)}
                              @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceInterval = isNaN(t) || t < 1 ? 1 : t;
		}}
                            />
                          </div>
                        </div>
                      ` : ""}
                </div>
                <div class="recurrence-summary">${t}</div>
              `}
        </div>

        ${(() => {
			let e = this.members.filter((e) => e.slug !== this._selectedMemberSlug && e.slug !== "household");
			return e.length === 0 ? "" : L`
            <div class="field also-add-section">
              <label>Also add to:</label>
              <div class="also-add-list">
                ${e.map((e) => L`
                  <label class="also-add-item">
                    <input
                      type="checkbox"
                      .checked=${this._alsoAddSlugs.has(e.slug)}
                      @change=${() => this._toggleAlsoAdd(e.slug)}
                    />
                    ${e.name}
                  </label>
                `)}
              </div>
            </div>
          `;
		})()}
        ` : ""}

        ${this._type === "rotating" ? L`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter((e) => e.slug !== "household").map((e) => {
			let t = this._rotatingOwners.includes(e.slug), n = this._rotatingOwners.indexOf(e.slug);
			return L`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${t}
                    @change=${() => this._toggleRotatingOwner(e.slug)}
                    aria-label="${e.name}"
                  />
                  ${t ? L`<span class="owner-order">${n + 1}.</span>` : L`<span class="owner-order"></span>`}
                  <span class="owner-name">${e.name}</span>
                  ${t ? L`
                    <div class="reorder-btns">
                      <button
                        class="reorder-btn"
                        ?disabled=${n === 0}
                        @click=${() => this._moveOwner(e.slug, "up")}
                        aria-label="Move ${e.name} earlier"
                      >▲</button>
                      <button
                        class="reorder-btn"
                        ?disabled=${n === this._rotatingOwners.length - 1}
                        @click=${() => this._moveOwner(e.slug, "down")}
                        aria-label="Move ${e.name} later"
                      >▼</button>
                    </div>
                  ` : ""}
                </div>
              `;
		})}
          </div>
          ${this._rotatingOwners.length < 2 ? L`<div class="owners-hint">Select at least 2 owners to enable rotation</div>` : ""}
        </div>
        ` : ""}

        ${this._type === "chore" ? L`
              <div class="field">
                <label for="at-due">Due (optional)</label>
                <input
                  id="at-due"
                  type="datetime-local"
                  .value=${this._due}
                  @change=${(e) => this._due = e.target.value}
                />
              </div>
            ` : ""}

        ${this._error ? L`<div class="error-msg">${this._error}</div>` : ""}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button
            class="btn btn-submit"
            ?disabled=${this._saving || this._type === "rotating" && this._rotatingOwners.length < 2}
            @click=${this._submit}
          >
            ${this._saving ? "Adding…" : "Add Task"}
          </button>
        </div>
      </div>
    `;
	}
}, gi.styles = [K, M`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='date'],
      input[type='datetime-local'],
      select,
      input[type='number'] {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input:focus, select:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      .emoji-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .emoji-btn {
        font-size: 1.25rem;
        padding: 4px;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: pointer;
        background: none;
        min-width: 36px;
        min-height: 36px;
      }
      .emoji-btn.selected {
        border-color: var(--primary-color, #03a9f4);
        background: rgba(3, 169, 244, 0.1);
      }
      .recurrence-summary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
        font-style: italic;
      }
      .recurrence-extra {
        margin-top: var(--lucarne-spacing-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .days-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .day-btn {
        padding: 4px 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        cursor: pointer;
        background: none;
        font-size: 0.75rem;
        min-height: 32px;
      }
      .day-btn.selected {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-submit {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .also-add-section {
        margin-top: var(--lucarne-spacing-sm);
      }
      .also-add-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
      }
      .also-add-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        cursor: pointer;
        min-height: 32px;
      }
      .also-add-item input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .also-add-item input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .also-add-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owners-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .owner-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .owner-item:last-child {
        border-bottom: none;
      }
      .owner-item input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .owner-item input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .owner-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owner-order {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        min-width: 16px;
        text-align: right;
        flex-shrink: 0;
      }
      .owner-name {
        flex: 1;
      }
      .reorder-btns {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
      }
      .reorder-btn {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 1px 5px;
        min-height: 18px;
        line-height: 1;
        color: var(--lucarne-on-surface-muted);
      }
      .reorder-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .owners-hint {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        margin-top: 4px;
      }
    `], gi);
q([W({ attribute: !1 })], Q.prototype, "hass", void 0), q([W({ attribute: !1 })], Q.prototype, "member", void 0), q([W({ attribute: !1 })], Q.prototype, "members", void 0), q([G()], Q.prototype, "_selectedMemberSlug", void 0), q([G()], Q.prototype, "_summary", void 0), q([G()], Q.prototype, "_type", void 0), q([G()], Q.prototype, "_icon", void 0), q([G()], Q.prototype, "_recurrenceMode", void 0), q([G()], Q.prototype, "_recurrenceDays", void 0), q([G()], Q.prototype, "_recurrenceInterval", void 0), q([G()], Q.prototype, "_recurrenceMonthDay", void 0), q([G()], Q.prototype, "_recurrenceNth", void 0), q([G()], Q.prototype, "_recurrenceNthDay", void 0), q([G()], Q.prototype, "_recurrenceMonth", void 0), q([G()], Q.prototype, "_due", void 0), q([G()], Q.prototype, "_timeOfDay", void 0), q([G()], Q.prototype, "_error", void 0), q([G()], Q.prototype, "_saving", void 0), q([G()], Q.prototype, "_alsoAddSlugs", void 0), q([G()], Q.prototype, "_rotatingOwners", void 0), Q = q([U("lucarne-add-task-popover")], Q);
//#endregion
//#region src/components/edit-task-popover.ts
var vi, $ = (vi = class extends H {
	constructor(...e) {
		super(...e), this.members = [], this._summary = "", this._type = "chore", this._icon = "", this._recurrenceMode = "none", this._recurrenceDays = [], this._recurrenceInterval = 1, this._recurrenceMonthDay = 1, this._recurrenceNth = 1, this._recurrenceNthDay = "MO", this._recurrenceMonth = 1, this._due = "", this._assignee = "", this._timeOfDay = "anytime", this._isCustomRecurrence = !1, this._rawRecurrence = "", this._error = "", this._saving = !1, this._confirmingDelete = !1, this._rotatingOwners = [], this._backdropPressActive = !1;
	}
	updated(e) {
		super.updated(e), e.has("task") && this.task && this._prefill();
	}
	_prefill() {
		let e = this.task;
		this._summary = e.summary, this._type = e.metadata.type, this._icon = e.metadata.icon, this._due = e.due ?? "", this._assignee = e.metadata.assignee_slug, this._timeOfDay = Qr(e.metadata.time_of_day), this._recurrenceDays = [], this._recurrenceInterval = 1, this._recurrenceMonthDay = 1, this._recurrenceNth = 1, this._recurrenceNthDay = "MO", this._recurrenceMonth = 1, this._rawRecurrence = "", this._isCustomRecurrence = !1, this._rotatingOwners = e.metadata.rotation_owners ? [...e.metadata.rotation_owners] : [];
		let t = Ot(e.metadata.recurrence);
		t.mode === "unknown" ? (this._isCustomRecurrence = !0, this._rawRecurrence = t.raw, this._recurrenceMode = "unknown") : (this._isCustomRecurrence = !1, this._recurrenceMode = t.mode, t.mode === "daily" ? this._recurrenceInterval = t.interval ?? 1 : t.mode === "weekly" ? (this._recurrenceDays = [...t.days], this._recurrenceInterval = t.interval ?? 1) : t.mode === "monthly-date" ? (this._recurrenceMonthDay = t.dayOfMonth, this._recurrenceInterval = t.interval ?? 1) : t.mode === "monthly-nth" ? (this._recurrenceNth = t.nth, this._recurrenceNthDay = t.day, this._recurrenceInterval = t.interval ?? 1) : t.mode === "yearly" && (this._recurrenceMonth = t.month, this._recurrenceMonthDay = t.dayOfMonth, this._recurrenceInterval = t.interval ?? 1));
	}
	_onBackdropPointerDown(e) {
		this._backdropPressActive = e.isPrimary && e.button === 0, this._backdropPressActive && e.currentTarget.setPointerCapture(e.pointerId);
	}
	_onBackdropPointerUp() {
		this._backdropPressActive && (this._backdropPressActive = !1, this._close());
	}
	_onBackdropPointerCancel() {
		this._backdropPressActive = !1;
	}
	_close() {
		this.dispatchEvent(new CustomEvent("popover-close", {
			bubbles: !0,
			composed: !0
		}));
	}
	_buildRRule() {
		return this._isCustomRecurrence ? this._rawRecurrence : this._recurrenceMode === "none" ? "" : this._recurrenceMode === "daily" ? kt({
			mode: "daily",
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "weekly" ? kt({
			mode: "weekly",
			days: this._recurrenceDays,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-date" ? kt({
			mode: "monthly-date",
			dayOfMonth: this._recurrenceMonthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-nth" ? kt({
			mode: "monthly-nth",
			nth: this._recurrenceNth,
			day: this._recurrenceNthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "yearly" ? kt({
			mode: "yearly",
			month: this._recurrenceMonth,
			dayOfMonth: this._recurrenceMonthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : "";
	}
	async _save() {
		if (!this._saving) {
			if (!this._summary.trim()) {
				this._error = "Summary is required";
				return;
			}
			if (this._summary.trim().length > 200) {
				this._error = "Summary must be 200 characters or less";
				return;
			}
			if (this._recurrenceMode === "weekly" && !this._isCustomRecurrence && this._recurrenceDays.length === 0) {
				this._error = "Select at least one day for weekly recurrence";
				return;
			}
			if (!this._due && this.task.due) {
				this._error = "Due date cannot be cleared here — delete and recreate the task to remove it";
				return;
			}
			if (this._type === "rotating" && this._rotatingOwners.length < 2) {
				this._error = "Select at least 2 owners for a rotating task";
				return;
			}
			this._saving = !0, this._error = "";
			try {
				var e;
				let t = this.task.metadata.member_slug === "household" ? "todo.lucarne_household" : ((e = this.members.find((e) => e.slug === this.task.metadata.member_slug)) == null ? void 0 : e.todo_entity_id) ?? "", n = this._summary.trim() !== this.task.summary, r = !!this._due && this._due !== (this.task.due ?? ""), i = this._type === "rotating", a = this.task.metadata.rotation_owners ?? [], o = i && JSON.stringify(this._rotatingOwners) !== JSON.stringify(a), s = this.task.metadata.member_slug === "household", c = this._type !== this.task.metadata.type || this._icon !== this.task.metadata.icon || !i && this._buildRRule() !== this.task.metadata.recurrence || this._timeOfDay !== (this.task.metadata.time_of_day ?? "anytime") || s && !i && this._assignee !== this.task.metadata.assignee_slug || o, l = i && !!this.task.metadata.current_owner && !this._rotatingOwners.includes(this.task.metadata.current_owner);
				if (n || r) {
					if (!t) throw Error("Could not resolve todo entity for this task");
					await this.hass.callService("todo", "update_item", {
						item: this.task.uid,
						rename: this._summary.trim(),
						...r ? { due_datetime: this._due } : {}
					}, { entity_id: t });
				}
				if (c && await fi(this.hass, this.task.uid, {
					...this._type === this.task.metadata.type ? {} : { type: this._type },
					...this._icon === this.task.metadata.icon ? {} : { icon: this._icon },
					...!i && this._buildRRule() !== this.task.metadata.recurrence ? { recurrence: this._buildRRule() } : {},
					...this._timeOfDay === (this.task.metadata.time_of_day ?? "anytime") ? {} : { time_of_day: this._timeOfDay },
					...s && !i && this._assignee !== this.task.metadata.assignee_slug ? { assignee: this._assignee } : {},
					...o ? { rotation_owners: this._rotatingOwners } : {},
					...l ? { current_owner: this._rotatingOwners[0] } : {}
				}), n || r || c) {
					let e = {
						...this.task,
						summary: this._summary.trim(),
						due: this._due || this.task.due,
						metadata: {
							...this.task.metadata,
							type: this._type,
							icon: this._icon,
							recurrence: i ? this.task.metadata.recurrence : this._buildRRule(),
							time_of_day: this._timeOfDay,
							...s && !i ? { assignee_slug: this._assignee } : {},
							...i ? {
								rotation_owners: this._rotatingOwners,
								current_owner: l ? this._rotatingOwners[0] : this.task.metadata.current_owner
							} : {}
						}
					};
					this.dispatchEvent(new CustomEvent("task-updated", {
						detail: { task: e },
						bubbles: !0,
						composed: !0
					}));
				}
				this._close();
			} catch (e) {
				this._error = e instanceof Error ? e.message : "Failed to save", this._saving = !1;
			}
		}
	}
	async _delete() {
		if (!this._saving) {
			this._saving = !0, this._error = "";
			try {
				await pi(this.hass, this.task.uid), this.dispatchEvent(new CustomEvent("task-deleted", {
					detail: { uid: this.task.uid },
					bubbles: !0,
					composed: !0
				})), this._close();
			} catch (e) {
				this._error = e instanceof Error ? e.message : "Failed to delete", this._saving = !1, this._confirmingDelete = !1;
			}
		}
	}
	_toggleRotatingOwner(e) {
		if (this._rotatingOwners.includes(e)) {
			if (this._rotatingOwners.length <= 1) return;
			this._rotatingOwners = this._rotatingOwners.filter((t) => t !== e);
		} else this._rotatingOwners = [...this._rotatingOwners, e];
	}
	_moveOwner(e, t) {
		let n = this._rotatingOwners.indexOf(e);
		if (n < 0) return;
		let r = [...this._rotatingOwners], i = t === "up" ? n - 1 : n + 1;
		i < 0 || i >= r.length || ([r[n], r[i]] = [r[i], r[n]], this._rotatingOwners = r);
	}
	_toggleDay(e) {
		this._recurrenceDays.includes(e) ? this._recurrenceDays = this._recurrenceDays.filter((t) => t !== e) : this._recurrenceDays = [...this._recurrenceDays, e];
	}
	render() {
		var e, t;
		if (!this.task) return L``;
		let n = this.task.metadata.member_slug === "household", r = n ? "Household" : ((e = this.members.find((e) => e.slug === this.task.metadata.member_slug)) == null ? void 0 : e.name) ?? this.task.metadata.member_slug, i = this._buildRRule(), a = this._isCustomRecurrence ? "Custom recurrence (not editable here)" : At(i), o = {
			MO: "Mon",
			TU: "Tue",
			WE: "Wed",
			TH: "Thu",
			FR: "Fri",
			SA: "Sat",
			SU: "Sun"
		};
		return L`
      <div
        class="backdrop"
        @pointerdown=${this._onBackdropPointerDown}
        @pointerup=${this._onBackdropPointerUp}
        @pointercancel=${this._onBackdropPointerCancel}
      ></div>
      <div class="popover" role="dialog" aria-modal="true" aria-label="Edit task">
        <div class="popover-header">
          <h2 class="popover-title">Edit Task</h2>
          <button class="close-btn" @click=${this._close} aria-label="Cancel">✕</button>
        </div>

        <div class="field">
          <label>Member</label>
          <div class="readonly-field" title="Member cannot be changed in v1">${r}</div>
          <div class="readonly-tooltip">Member cannot be changed here</div>
        </div>

        ${n && this._type !== "rotating" ? L`
              <div class="field">
                <label for="et-assignee">Assignee (optional)</label>
                <select
                  id="et-assignee"
                  .value=${this._assignee}
                  @change=${(e) => this._assignee = e.target.value}
                >
                  <option value="">— None —</option>
                  ${this.members.filter((e) => e.slug !== "household").map((e) => L`<option value=${e.slug}>${e.name}</option>`)}
                </select>
              </div>
            ` : ""}

        <div class="field">
          <label for="et-summary">Summary *</label>
          <input
            id="et-summary"
            type="text"
            maxlength="200"
            .value=${this._summary}
            @input=${(e) => this._summary = e.target.value}
          />
        </div>

        <div class="field">
          <label>Type</label>
          <div class="type-row">
            <button class="type-btn ${this._type === "routine" ? "active" : ""}" @click=${() => this._type = "routine"}>Routine</button>
            <button class="type-btn ${this._type === "chore" ? "active" : ""}" @click=${() => this._type = "chore"}>Chore</button>
            ${((t = this.task) == null || (t = t.metadata) == null ? void 0 : t.member_slug) === "household" ? L`<button class="type-btn ${this._type === "rotating" ? "active" : ""}" @click=${() => this._type = "rotating"}>Rotating</button>` : ""}
          </div>
        </div>

        <div class="field">
          <label for="et-time-of-day">Time of day</label>
          <select
            id="et-time-of-day"
            .value=${this._timeOfDay}
            @change=${(e) => this._timeOfDay = e.target.value}
          >
            <option value="anytime">Anytime</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div class="field">
          <label for="et-icon">Icon</label>
          <input
            id="et-icon"
            type="text"
            placeholder="Emoji or empty"
            maxlength="8"
            .value=${this._icon}
            @input=${(e) => this._icon = e.target.value}
          />
        </div>

        ${this._type === "rotating" ? L`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter((e) => e.slug !== "household").map((e) => {
			let t = this._rotatingOwners.includes(e.slug), n = this._rotatingOwners.indexOf(e.slug);
			return L`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${t}
                    ?disabled=${this._rotatingOwners.length <= 1 && t}
                    @change=${() => this._toggleRotatingOwner(e.slug)}
                    aria-label="${e.name}"
                  />
                  ${t ? L`<span class="owner-order">${n + 1}.</span>` : L`<span class="owner-order"></span>`}
                  <span class="owner-name">${e.name}</span>
                  ${t ? L`
                    <div class="reorder-btns">
                      <button
                        class="reorder-btn"
                        ?disabled=${n === 0}
                        @click=${() => this._moveOwner(e.slug, "up")}
                        aria-label="Move ${e.name} earlier"
                      >▲</button>
                      <button
                        class="reorder-btn"
                        ?disabled=${n === this._rotatingOwners.length - 1}
                        @click=${() => this._moveOwner(e.slug, "down")}
                        aria-label="Move ${e.name} later"
                      >▼</button>
                    </div>
                  ` : ""}
                </div>
              `;
		})}
          </div>
          ${this._rotatingOwners.length < 2 ? L`<div class="owners-hint">Select at least 2 owners — delete the task to remove all owners</div>` : ""}
        </div>
        ` : L`
        <div class="field">
          <label for="et-recurrence">Recurrence</label>
          ${this._isCustomRecurrence ? L`<div class="custom-recurrence-note">${a}</div>` : L`
                <select
                  id="et-recurrence"
                  .value=${this._recurrenceMode}
                  @change=${(e) => this._recurrenceMode = e.target.value}
                >
                  <option value="none">None (one-off)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly-date">Monthly by date</option>
                  <option value="monthly-nth">Monthly by Nth weekday</option>
                  <option value="yearly">Yearly</option>
                </select>

                ${this._recurrenceMode === "none" ? "" : L`
                      <div class="recurrence-extra">
                        ${this._recurrenceMode !== "monthly-nth" && this._recurrenceMode !== "yearly" ? L`
                              <div>
                                <label>Interval</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="99"
                                  .value=${String(this._recurrenceInterval)}
                                  @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceInterval = isNaN(t) || t < 1 ? 1 : t;
		}}
                                />
                              </div>
                            ` : ""}

                        ${this._recurrenceMode === "weekly" ? L`
                              <div>
                                <label>Days</label>
                                <div class="days-row">
                                  ${Dt.map((e) => L`
                                    <button
                                      class="day-btn ${this._recurrenceDays.includes(e) ? "selected" : ""}"
                                      @click=${() => this._toggleDay(e)}
                                    >${o[e]}</button>
                                  `)}
                                </div>
                              </div>
                            ` : ""}

                        ${this._recurrenceMode === "monthly-date" ? L`
                              <div>
                                <label>Day of month</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  .value=${String(this._recurrenceMonthDay)}
                                  @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceMonthDay = isNaN(t) || t < 1 ? 1 : Math.min(t, 31);
		}}
                                />
                              </div>
                            ` : ""}

                        ${this._recurrenceMode === "monthly-nth" ? L`
                              <div style="display:flex;gap:8px">
                                <div style="flex:1">
                                  <label>Nth</label>
                                  <select
                                    .value=${String(this._recurrenceNth)}
                                    @change=${(e) => this._recurrenceNth = parseInt(e.target.value, 10)}
                                  >
                                    <option value="1">1st</option>
                                    <option value="2">2nd</option>
                                    <option value="3">3rd</option>
                                    <option value="4">4th</option>
                                    <option value="-1">Last</option>
                                  </select>
                                </div>
                                <div style="flex:1">
                                  <label>Day</label>
                                  <select
                                    .value=${this._recurrenceNthDay}
                                    @change=${(e) => this._recurrenceNthDay = e.target.value}
                                  >
                                    ${Dt.map((e) => L`<option value=${e}>${o[e]}</option>`)}
                                  </select>
                                </div>
                                <div style="flex:1">
                                  <label>Every N months</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    .value=${String(this._recurrenceInterval)}
                                    @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceInterval = isNaN(t) || t < 1 ? 1 : t;
		}}
                                  />
                                </div>
                              </div>
                            ` : ""}

                        ${this._recurrenceMode === "yearly" ? L`
                              <div style="display:flex;gap:8px">
                                <div style="flex:1">
                                  <label>Month</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    .value=${String(this._recurrenceMonth)}
                                    @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceMonth = isNaN(t) || t < 1 ? 1 : Math.min(t, 12);
		}}
                                  />
                                </div>
                                <div style="flex:1">
                                  <label>Day</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    .value=${String(this._recurrenceMonthDay)}
                                    @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceMonthDay = isNaN(t) || t < 1 ? 1 : Math.min(t, 31);
		}}
                                  />
                                </div>
                                <div style="flex:1">
                                  <label>Every N years</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    .value=${String(this._recurrenceInterval)}
                                    @change=${(e) => {
			let t = parseInt(e.target.value, 10);
			this._recurrenceInterval = isNaN(t) || t < 1 ? 1 : t;
		}}
                                  />
                                </div>
                              </div>
                            ` : ""}
                      </div>
                      <div class="recurrence-summary">${a}</div>
                    `}
              `}
        </div>
        `}

        ${this._type === "rotating" ? "" : L`
        <div class="field">
          <label for="et-due">Due (optional)</label>
          <input
            id="et-due"
            type="datetime-local"
            .value=${this._due}
            @change=${(e) => this._due = e.target.value}
          />
        </div>
        `}

        ${this._error ? L`<div class="error-msg">${this._error}</div>` : ""}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button
            class="btn btn-save"
            ?disabled=${this._saving || this._type === "rotating" && this._rotatingOwners.length < 2}
            @click=${this._save}
          >
            ${this._saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div class="delete-zone">
          ${this._confirmingDelete ? L`
                <div class="confirm-delete">
                  <span>Delete this task?</span>
                  <button
                    style="background:#f44336;color:#fff"
                    ?disabled=${this._saving}
                    @click=${this._delete}
                  >Yes, delete</button>
                  <button
                    style="background:rgba(0,0,0,0.06)"
                    @click=${() => this._confirmingDelete = !1}
                  >Cancel</button>
                </div>
              ` : L`
                <button class="btn btn-delete" @click=${() => this._confirmingDelete = !0}>
                  Delete Task
                </button>
              `}
        </div>
      </div>
    `;
	}
}, vi.styles = [K, M`
      :host {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 200;
      }
      .backdrop {
        position: absolute;
        inset: 0;
      }
      .popover {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--lucarne-surface);
        border-radius: var(--lucarne-radius-lg);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
        padding: var(--lucarne-spacing-xl);
        min-width: 300px;
        max-width: min(480px, 92vw);
        max-height: 85vh;
        overflow-y: auto;
        z-index: 1;
      }
      .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lucarne-spacing-md);
      }
      .popover-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.25rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
      }
      .field {
        margin-bottom: var(--lucarne-spacing-md);
      }
      label {
        display: block;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        margin-bottom: 4px;
      }
      input[type='text'],
      input[type='datetime-local'],
      input[type='number'],
      select {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        padding: 8px 10px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        background: var(--lucarne-surface);
        min-height: 44px;
        font-family: inherit;
      }
      input:focus, select:focus {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      .readonly-field {
        padding: 8px 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: var(--lucarne-radius-sm);
        background: rgba(0, 0, 0, 0.03);
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        min-height: 44px;
        display: flex;
        align-items: center;
        position: relative;
      }
      .readonly-tooltip {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        margin-top: 2px;
        font-style: italic;
      }
      .type-row {
        display: flex;
        gap: var(--lucarne-spacing-sm);
      }
      .type-btn {
        flex: 1;
        padding: 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: var(--lucarne-radius-sm);
        background: var(--lucarne-surface);
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        min-height: 44px;
      }
      .type-btn.active {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .recurrence-summary {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        margin-top: 4px;
        font-style: italic;
      }
      .custom-recurrence-note {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        padding: 6px 0;
      }
      .recurrence-extra {
        margin-top: var(--lucarne-spacing-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .days-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .day-btn {
        padding: 4px 8px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        cursor: pointer;
        background: none;
        font-size: 0.75rem;
        min-height: 32px;
      }
      .day-btn.selected {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }
      .delete-zone {
        margin-top: var(--lucarne-spacing-md);
        padding-top: var(--lucarne-spacing-md);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
      .error-msg {
        color: #c62828;
        font-size: var(--lucarne-fs-sm);
        margin-bottom: var(--lucarne-spacing-sm);
        padding: 6px 10px;
        background: #ffebee;
        border-radius: var(--lucarne-radius-sm);
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-md);
      }
      .btn {
        padding: 8px 20px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        min-height: 44px;
        min-width: 80px;
      }
      .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--lucarne-on-surface-muted);
      }
      .btn-save {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
      .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-delete {
        background: none;
        border: 1px solid #f44336;
        color: #f44336;
        width: 100%;
      }
      .confirm-delete {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        align-items: center;
        font-size: var(--lucarne-fs-sm);
        color: #c62828;
      }
      .confirm-delete button {
        padding: 4px 12px;
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        min-height: 36px;
      }
      .owners-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }
      .owner-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface);
        min-height: 44px;
        padding: 4px 0;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .owner-item:last-child {
        border-bottom: none;
      }
      .owner-item input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        min-height: unset;
        margin: 0;
        cursor: pointer;
        border: 2px solid var(--primary-color, #03a9f4);
        border-radius: 3px;
        background: transparent;
        position: relative;
        flex-shrink: 0;
      }
      .owner-item input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0;
        width: 4px;
        height: 9px;
        border: solid var(--primary-color, #03a9f4);
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      .owner-item input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .owner-order {
        font-size: 0.7rem;
        color: var(--lucarne-on-surface-muted);
        min-width: 16px;
        text-align: right;
        flex-shrink: 0;
      }
      .owner-name {
        flex: 1;
      }
      .reorder-btns {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
      }
      .reorder-btn {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.65rem;
        padding: 1px 5px;
        min-height: 18px;
        line-height: 1;
        color: var(--lucarne-on-surface-muted);
      }
      .reorder-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      .owners-hint {
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        font-style: italic;
        margin-top: 4px;
      }
    `], vi);
q([W({ attribute: !1 })], $.prototype, "hass", void 0), q([W({ attribute: !1 })], $.prototype, "task", void 0), q([W({ attribute: !1 })], $.prototype, "members", void 0), q([G()], $.prototype, "_summary", void 0), q([G()], $.prototype, "_type", void 0), q([G()], $.prototype, "_icon", void 0), q([G()], $.prototype, "_recurrenceMode", void 0), q([G()], $.prototype, "_recurrenceDays", void 0), q([G()], $.prototype, "_recurrenceInterval", void 0), q([G()], $.prototype, "_recurrenceMonthDay", void 0), q([G()], $.prototype, "_recurrenceNth", void 0), q([G()], $.prototype, "_recurrenceNthDay", void 0), q([G()], $.prototype, "_recurrenceMonth", void 0), q([G()], $.prototype, "_due", void 0), q([G()], $.prototype, "_assignee", void 0), q([G()], $.prototype, "_timeOfDay", void 0), q([G()], $.prototype, "_isCustomRecurrence", void 0), q([G()], $.prototype, "_rawRecurrence", void 0), q([G()], $.prototype, "_error", void 0), q([G()], $.prototype, "_saving", void 0), q([G()], $.prototype, "_confirmingDelete", void 0), q([G()], $.prototype, "_rotatingOwners", void 0), $ = q([U("lucarne-edit-task-popover")], $);
//#endregion
//#region src/cards/lucarne-chores-card.ts
var yi, bi = 1e4, xi = 3e4;
function Si(e, t) {
	if (e.summary !== t.summary || (e.due ?? "") !== (t.due ?? "")) return !1;
	let n = e.metadata, r = t.metadata;
	return n.type === r.type && n.icon === r.icon && n.recurrence === r.recurrence && (n.time_of_day ?? "anytime") === (r.time_of_day ?? "anytime") && (n.assignee_slug ?? "") === (r.assignee_slug ?? "") && (n.current_owner ?? "") === (r.current_owner ?? "") && JSON.stringify(n.rotation_owners ?? []) === JSON.stringify(r.rotation_owners ?? []);
}
window.customCards = window.customCards || [], window.customCards.push({
	type: "lucarne-chores-card",
	name: "Lucarne Chores",
	description: "Family chore grid with streaks and celebration",
	preview: !0
});
var Ci = (yi = class extends ut {
	constructor(...e) {
		super(...e), this._familyState = null, this._addTaskMember = null, this._editTask = null, this._optimistic = /* @__PURE__ */ new Map(), this._optimisticAdds = /* @__PURE__ */ new Map(), this._deletedUids = /* @__PURE__ */ new Set(), this._optimisticEdits = /* @__PURE__ */ new Map(), this._addTimers = /* @__PURE__ */ new Map(), this._editTimers = /* @__PURE__ */ new Map(), this._onFamilyState = (e) => {
			if (this._optimistic.size > 0 || this._optimisticAdds.size > 0 || this._deletedUids.size > 0 || this._optimisticEdits.size > 0) {
				let t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Map(), r = new Map(this._optimistic);
				for (let i of e.tasksByMember.values()) for (let e of i) t.add(e.uid), n.set(e.uid, e), r.get(e.uid) === e.status && r.delete(e.uid);
				if (this._deletedUids.size > 0) {
					let e = /* @__PURE__ */ new Set();
					for (let n of this._deletedUids) t.has(n) && e.add(n);
					e.size !== this._deletedUids.size && (this._deletedUids = e);
				}
				if (this._optimistic.size > 0) {
					for (let e of r.keys()) t.has(e) || r.delete(e);
					this._optimistic = r;
				}
				if (this._optimisticAdds.size > 0) {
					let e = new Map(this._optimisticAdds), n = !1;
					for (let r of e.keys()) t.has(r) && (e.delete(r), this._clearAddTimeout(r), n = !0);
					n && (this._optimisticAdds = e);
				}
				if (this._optimisticEdits.size > 0) {
					let e = new Map(this._optimisticEdits), t = !1;
					for (let [r, i] of e) {
						let a = n.get(r);
						(!a || Si(a, i)) && (e.delete(r), this._clearEditTimeout(r), t = !0);
					}
					t && (this._optimisticEdits = e);
				}
			}
			this._familyState = e;
		}, this._handleTaskUpdated = (e) => {
			let { task: t } = e.detail;
			t != null && t.uid && (this._optimisticEdits = new Map(this._optimisticEdits).set(t.uid, t), this._scheduleEditCleanup(t.uid));
		}, this._handleTaskDeleted = (e) => {
			let { uid: t } = e.detail;
			if (t) {
				if (this._optimisticAdds.has(t)) {
					let e = new Map(this._optimisticAdds);
					e.delete(t), this._clearAddTimeout(t), this._optimisticAdds = e;
				}
				this._deletedUids = new Set(this._deletedUids).add(t);
			}
		}, this._handleTaskAdded = (e) => {
			let { tasks: t } = e.detail;
			if (!(t != null && t.length)) return;
			let n = new Map(this._optimisticAdds);
			for (let e of t) n.set(e.uid, e), this._scheduleAddCleanup(e.uid);
			this._optimisticAdds = n;
		};
	}
	applyConfig(e) {
		if ("kids" in e) {
			this._config = e;
			return;
		}
		if (!Array.isArray(e.members)) throw new lt("lucarne-chores-card: members must be an array");
		this._config = e, this.isConnected && this._scheduleScrollRefresh();
	}
	static getConfigElement() {
		return document.createElement("lucarne-chores-card-editor");
	}
	getCardSize() {
		return 5;
	}
	getGridOptions() {
		return {
			columns: 12,
			rows: "auto",
			min_columns: 6,
			max_columns: 12
		};
	}
	static getStubConfig() {
		return {
			type: "custom:lucarne-chores-card",
			title: "Chores",
			members: []
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.hass && !this._unsubFamily && (this._unsubFamily = Et(this.hass, this._onFamilyState)), this._scheduleMidnightRefresh(), this._scheduleScrollRefresh();
	}
	_scheduleMidnightRefresh() {
		this._midnightTimer && clearTimeout(this._midnightTimer), this._midnightTimer = setTimeout(() => {
			this._midnightTimer = void 0, this.requestUpdate(), this._scheduleMidnightRefresh();
		}, Zn(/* @__PURE__ */ new Date()));
	}
	_scheduleScrollRefresh() {
		var e, t, n;
		if (this._scrollTimer && clearTimeout(this._scrollTimer), this._scrollTimer = void 0, !(((e = this._config) == null ? void 0 : e.auto_scroll) ?? !0)) return;
		let r = ((t = this._config) == null ? void 0 : t.afternoon_start) ?? "12:00", i = ((n = this._config) == null ? void 0 : n.night_start) ?? "19:00", a = er(/* @__PURE__ */ new Date(), [r, i]);
		Number.isFinite(a) && (this._scrollTimer = setTimeout(() => {
			this._scrollTimer = void 0, this.requestUpdate(), this._scheduleScrollRefresh();
		}, a));
	}
	updated(e) {
		super.updated(e), e.has("hass") && this.hass && !this._unsubFamily && (this._unsubFamily = Et(this.hass, this._onFamilyState));
	}
	_scheduleEditCleanup(e) {
		this._clearEditTimeout(e), this._editTimers.set(e, setTimeout(() => {
			if (this._editTimers.delete(e), this._optimisticEdits.has(e)) {
				let t = new Map(this._optimisticEdits);
				t.delete(e), this._optimisticEdits = t;
			}
		}, xi));
	}
	_clearEditTimeout(e) {
		let t = this._editTimers.get(e);
		t !== void 0 && (clearTimeout(t), this._editTimers.delete(e));
	}
	_scheduleAddCleanup(e) {
		this._clearAddTimeout(e), this._addTimers.set(e, setTimeout(() => {
			if (this._addTimers.delete(e), this._optimisticAdds.has(e)) {
				let t = new Map(this._optimisticAdds);
				t.delete(e), this._optimisticAdds = t;
			}
		}, bi));
	}
	_clearAddTimeout(e) {
		let t = this._addTimers.get(e);
		t !== void 0 && (clearTimeout(t), this._addTimers.delete(e));
	}
	disconnectedCallback() {
		var e;
		super.disconnectedCallback(), (e = this._unsubFamily) == null || e.call(this), this._unsubFamily = void 0, this._midnightTimer && (clearTimeout(this._midnightTimer), this._midnightTimer = void 0), this._scrollTimer && (clearTimeout(this._scrollTimer), this._scrollTimer = void 0);
		for (let e of this._addTimers.values()) clearTimeout(e);
		this._addTimers.clear();
		for (let e of this._editTimers.values()) clearTimeout(e);
		this._editTimers.clear();
	}
	_resolveMembers() {
		if (!this._config || !this._familyState) return [];
		let { members: e } = this._config, t = new Set(this._config.hidden_members ?? []), n = this._config.show_routines ?? !0, r = this._config.show_tasks ?? !0, i = /* @__PURE__ */ new Date(), a = new Date(i.getFullYear(), i.getMonth(), i.getDate(), 23, 59, 59, 999), o = (e) => this._optimisticEdits.get(e.uid) ?? e, s = (this._familyState.tasksByMember.get("household") ?? []).filter((e) => !this._deletedUids.has(e.uid)).map(o), c = (e) => {
			let t = this._optimistic.get(e.uid);
			return t && t !== e.status ? {
				...e,
				status: t
			} : e;
		}, l = (e) => {
			if (e.metadata.type === "routine") {
				if (!n) return !1;
				let t = Ot(e.metadata.recurrence);
				return t.mode === "none" || t.mode === "unknown" ? !0 : Lt(t, i);
			}
			return e.metadata.type === "chore" && r ? e.due === null ? !0 : (e.due.includes("T") ? new Date(e.due) : /* @__PURE__ */ new Date(e.due + "T00:00:00")) <= a : !1;
		}, u = [...this._optimisticAdds.values()], d = new Set(s.map((e) => e.uid)), f = [];
		for (let n of e) {
			if (t.has(n)) continue;
			let e = n === "household" ? St : this._familyState.members.find((e) => e.slug === n) ?? null;
			if (!e) continue;
			let i = (this._familyState.tasksByMember.get(n) ?? []).filter((e) => !this._deletedUids.has(e.uid)).map(o), a = new Set(i.map((e) => e.uid)), p = i.filter(l).map(c), m = u.filter((e) => e.metadata.member_slug === n && e.metadata.type !== "rotating" && !a.has(e.uid) && !this._deletedUids.has(e.uid) && l(e)), h;
			if (n === "household") h = [...p, ...m];
			else {
				let e = r ? s.filter((e) => e.metadata.type === "rotating" && e.metadata.current_owner === n).map(c) : [], t = r ? u.filter((e) => e.metadata.type === "rotating" && e.metadata.current_owner === n && !d.has(e.uid) && !this._deletedUids.has(e.uid)) : [];
				h = [
					...p,
					...e,
					...m,
					...t
				];
			}
			let g = this._familyState.streakByMember.get(n) ?? 0;
			f.push({
				member: e,
				tasks: h,
				streak: g
			});
		}
		return f;
	}
	async _handleTaskToggle(e) {
		var t;
		let { task: n } = e.detail;
		if (!this.hass || !this._familyState) return;
		let r = n.status === "completed" ? "needs_action" : "completed", i = n.metadata.member_slug === "household" ? "todo.lucarne_household" : ((t = this._familyState.members.find((e) => e.slug === n.metadata.member_slug)) == null ? void 0 : t.todo_entity_id) ?? "";
		if (i) {
			this._optimistic = new Map(this._optimistic).set(n.uid, r);
			try {
				await this.hass.callService("todo", "update_item", {
					item: n.uid,
					status: r
				}, { entity_id: i });
			} catch (e) {
				let t = new Map(this._optimistic);
				throw t.delete(n.uid), this._optimistic = t, e;
			}
		}
	}
	_handleAddTask(e) {
		let { memberSlug: t } = e.detail;
		if (!this._familyState) return;
		let n = t === "household" ? St : this._familyState.members.find((e) => e.slug === t) ?? null;
		n && (this._addTaskMember = n);
	}
	_handleLongPress(e) {
		let { task: t } = e.detail;
		this._editTask = t;
	}
	renderContent() {
		if (!this._config) return L``;
		if ("kids" in this._config) return L`
        <ha-card>
          <div class="error-block">
            <strong>Card upgraded</strong>
            This card was upgraded. Install the Lucarne Family integration and update your YAML.
          </div>
        </ha-card>
      `;
		let e = this._config.title ?? "Chores", t = this._config.show_routines ?? !0, n = this._config.show_tasks ?? !0, r = this._config.show_streak ?? !0, i = this._config.hide_names ?? !1, a = this._config.auto_scroll ?? !0 ? $n(/* @__PURE__ */ new Date(), this._config.afternoon_start ?? "12:00", this._config.night_start ?? "19:00") : "";
		if (this._familyState === null) return L`<ha-card><div class="loading">Loading…</div></ha-card>`;
		if (this._familyState.integrationError !== null) return L`
        <ha-card>
          <div class="error-block">
            <strong>Lucarne Family integration not set up</strong>
            Install it in Settings → Devices &amp; Services.
          </div>
        </ha-card>
      `;
		let o = this._resolveMembers(), s = [...this._familyState.members, St];
		return L`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${e}</h2>
        </div>
        <div
          class="members-grid"
          @add-task-clicked=${this._handleAddTask}
          @task-toggle=${this._handleTaskToggle}
          @task-long-press=${this._handleLongPress}
        >
          ${o.map(({ member: e, tasks: o, streak: c }) => L`
            <div class="member-cell">
              <lucarne-member-column
                .member=${e}
                .tasks=${o}
                .streak=${c}
                .members=${s}
                ?show-routines=${t}
                ?show-tasks=${n}
                ?show-streak=${r}
                ?hide-name=${i}
                scroll-to-bucket=${a}
              ></lucarne-member-column>
            </div>
          `)}
        </div>
      </ha-card>

      ${this._addTaskMember === null ? "" : L`
            <lucarne-add-task-popover
              .hass=${this.hass}
              .member=${this._addTaskMember}
              .members=${s}
              @task-added=${this._handleTaskAdded}
              @popover-close=${() => {
			this._addTaskMember = null;
		}}
            ></lucarne-add-task-popover>
          `}

      ${this._editTask === null ? "" : L`
            <lucarne-edit-task-popover
              .hass=${this.hass}
              .task=${this._editTask}
              .members=${s}
              @task-updated=${this._handleTaskUpdated}
              @task-deleted=${this._handleTaskDeleted}
              @popover-close=${() => {
			this._editTask = null;
		}}
            ></lucarne-edit-task-popover>
          `}
    `;
	}
}, yi.styles = [K, M`
      :host {
        display: block;
        font-family: var(--primary-font-family, sans-serif);
      }
      ha-card {
        padding: 0;
        overflow: hidden;
      }
      .card-header {
        display: flex;
        align-items: center;
        padding: var(--lucarne-spacing-lg) var(--lucarne-spacing-xl) var(--lucarne-spacing-md);
        border-bottom: 1px solid rgba(0, 0, 0, 0.07);
      }
      .card-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 700;
        color: var(--lucarne-on-surface);
        margin: 0;
      }
      .members-grid {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x proximity;
      }
      .member-cell {
        display: flex;
        flex: 1 0 220px;
        min-width: 220px;
        border-right: 1px solid rgba(0, 0, 0, 0.07);
        position: relative;
        scroll-snap-align: start;
      }
      .member-cell:last-child {
        border-right: none;
      }
      /* Stretch the column to the cell so equal-height columns pin their
         streaks to the same baseline (see member-column .lists/.streak-area). */
      .member-cell lucarne-member-column {
        flex: 1 1 auto;
        min-width: 0;
      }
      @media (max-width: 600px) {
        .members-grid {
          flex-direction: column;
          overflow-x: visible;
          overflow-y: visible;
          scroll-snap-type: none;
        }
        .member-cell {
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
          border-right: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.07);
        }
        .member-cell:last-child {
          border-bottom: none;
        }
      }
      .error-block {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .error-block strong {
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-md);
      }
      .loading {
        padding: var(--lucarne-spacing-xl);
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
      }
    `], yi);
q([W({ attribute: !1 })], Ci.prototype, "hass", void 0), q([G()], Ci.prototype, "_config", void 0), q([G()], Ci.prototype, "_familyState", void 0), q([G()], Ci.prototype, "_addTaskMember", void 0), q([G()], Ci.prototype, "_editTask", void 0), q([G()], Ci.prototype, "_optimistic", void 0), q([G()], Ci.prototype, "_optimisticAdds", void 0), q([G()], Ci.prototype, "_deletedUids", void 0), q([G()], Ci.prototype, "_optimisticEdits", void 0), Ci = q([U("lucarne-chores-card")], Ci);
//#endregion
//#region src/shared/cropper-styles.ts
var wi = /* @__PURE__ */ c((/* @__PURE__ */ o(((e, t) => {
	(function(n, r) {
		typeof e == "object" && t !== void 0 ? t.exports = r() : typeof define == "function" && define.amd ? define(r) : (n = typeof globalThis < "u" ? globalThis : n || self, n.Cropper = r());
	})(e, (function() {
		function e(e, t) {
			var n = Object.keys(e);
			if (Object.getOwnPropertySymbols) {
				var r = Object.getOwnPropertySymbols(e);
				t && (r = r.filter(function(t) {
					return Object.getOwnPropertyDescriptor(e, t).enumerable;
				})), n.push.apply(n, r);
			}
			return n;
		}
		function t(t) {
			for (var n = 1; n < arguments.length; n++) {
				var r = arguments[n] == null ? {} : arguments[n];
				n % 2 ? e(Object(r), !0).forEach(function(e) {
					c(t, e, r[e]);
				}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : e(Object(r)).forEach(function(e) {
					Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(r, e));
				});
			}
			return t;
		}
		function n(e, t) {
			if (typeof e != "object" || !e) return e;
			var n = e[Symbol.toPrimitive];
			if (n !== void 0) {
				var r = n.call(e, t || "default");
				if (typeof r != "object") return r;
				throw TypeError("@@toPrimitive must return a primitive value.");
			}
			return (t === "string" ? String : Number)(e);
		}
		function r(e) {
			var t = n(e, "string");
			return typeof t == "symbol" ? t : t + "";
		}
		function i(e) {
			"@babel/helpers - typeof";
			return i = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
				return typeof e;
			} : function(e) {
				return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
			}, i(e);
		}
		function a(e, t) {
			if (!(e instanceof t)) throw TypeError("Cannot call a class as a function");
		}
		function o(e, t) {
			for (var n = 0; n < t.length; n++) {
				var i = t[n];
				i.enumerable = i.enumerable || !1, i.configurable = !0, "value" in i && (i.writable = !0), Object.defineProperty(e, r(i.key), i);
			}
		}
		function s(e, t, n) {
			return t && o(e.prototype, t), n && o(e, n), Object.defineProperty(e, "prototype", { writable: !1 }), e;
		}
		function c(e, t, n) {
			return t = r(t), t in e ? Object.defineProperty(e, t, {
				value: n,
				enumerable: !0,
				configurable: !0,
				writable: !0
			}) : e[t] = n, e;
		}
		function l(e) {
			return u(e) || d(e) || f(e) || m();
		}
		function u(e) {
			if (Array.isArray(e)) return p(e);
		}
		function d(e) {
			if (typeof Symbol < "u" && e[Symbol.iterator] != null || e["@@iterator"] != null) return Array.from(e);
		}
		function f(e, t) {
			if (e) {
				if (typeof e == "string") return p(e, t);
				var n = Object.prototype.toString.call(e).slice(8, -1);
				if (n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set") return Array.from(e);
				if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return p(e, t);
			}
		}
		function p(e, t) {
			(t == null || t > e.length) && (t = e.length);
			for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
			return r;
		}
		function m() {
			throw TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
		}
		var h = typeof window < "u" && window.document !== void 0, g = h ? window : {}, _ = h && g.document.documentElement ? "ontouchstart" in g.document.documentElement : !1, v = h ? "PointerEvent" in g : !1, y = "cropper", ee = "all", te = "crop", ne = "move", b = "zoom", x = "e", S = "w", C = "s", w = "n", T = "ne", E = "nw", D = "se", re = "sw", O = `${y}-crop`, k = `${y}-disabled`, A = `${y}-hidden`, j = `${y}-hide`, ie = `${y}-invisible`, ae = `${y}-modal`, M = `${y}-move`, oe = `${y}Action`, se = `${y}Preview`, ce = "crop", le = "move", ue = "none", de = "crop", fe = "cropend", pe = "cropmove", me = "cropstart", he = "dblclick", ge = _ ? "touchstart" : "mousedown", _e = _ ? "touchmove" : "mousemove", ve = _ ? "touchend touchcancel" : "mouseup", ye = v ? "pointerdown" : ge, be = v ? "pointermove" : _e, xe = v ? "pointerup pointercancel" : ve, Se = "ready", Ce = "resize", we = "wheel", Te = "zoom", Ee = "image/jpeg", De = /^e|w|s|n|se|sw|ne|nw|all|crop|move|zoom$/, Oe = /^data:/, ke = /^data:image\/jpeg;base64,/, Ae = /^img|canvas$/i, je = 200, Me = 100, Ne = {
			viewMode: 0,
			dragMode: ce,
			initialAspectRatio: NaN,
			aspectRatio: NaN,
			data: null,
			preview: "",
			responsive: !0,
			restore: !0,
			checkCrossOrigin: !0,
			checkOrientation: !0,
			modal: !0,
			guides: !0,
			center: !0,
			highlight: !0,
			background: !0,
			autoCrop: !0,
			autoCropArea: .8,
			movable: !0,
			rotatable: !0,
			scalable: !0,
			zoomable: !0,
			zoomOnTouch: !0,
			zoomOnWheel: !0,
			wheelZoomRatio: .1,
			cropBoxMovable: !0,
			cropBoxResizable: !0,
			toggleDragModeOnDblclick: !0,
			minCanvasWidth: 0,
			minCanvasHeight: 0,
			minCropBoxWidth: 0,
			minCropBoxHeight: 0,
			minContainerWidth: je,
			minContainerHeight: Me,
			ready: null,
			cropstart: null,
			cropmove: null,
			cropend: null,
			crop: null,
			zoom: null
		}, Pe = "<div class=\"cropper-container\" touch-action=\"none\"><div class=\"cropper-wrap-box\"><div class=\"cropper-canvas\"></div></div><div class=\"cropper-drag-box\"></div><div class=\"cropper-crop-box\"><span class=\"cropper-view-box\"></span><span class=\"cropper-dashed dashed-h\"></span><span class=\"cropper-dashed dashed-v\"></span><span class=\"cropper-center\"></span><span class=\"cropper-face\"></span><span class=\"cropper-line line-e\" data-cropper-action=\"e\"></span><span class=\"cropper-line line-n\" data-cropper-action=\"n\"></span><span class=\"cropper-line line-w\" data-cropper-action=\"w\"></span><span class=\"cropper-line line-s\" data-cropper-action=\"s\"></span><span class=\"cropper-point point-e\" data-cropper-action=\"e\"></span><span class=\"cropper-point point-n\" data-cropper-action=\"n\"></span><span class=\"cropper-point point-w\" data-cropper-action=\"w\"></span><span class=\"cropper-point point-s\" data-cropper-action=\"s\"></span><span class=\"cropper-point point-ne\" data-cropper-action=\"ne\"></span><span class=\"cropper-point point-nw\" data-cropper-action=\"nw\"></span><span class=\"cropper-point point-sw\" data-cropper-action=\"sw\"></span><span class=\"cropper-point point-se\" data-cropper-action=\"se\"></span></div></div>", Fe = Number.isNaN || g.isNaN;
		function N(e) {
			return typeof e == "number" && !Fe(e);
		}
		var Ie = function(e) {
			return e > 0 && e < Infinity;
		};
		function Le(e) {
			return e === void 0;
		}
		function Re(e) {
			return i(e) === "object" && e !== null;
		}
		var ze = Object.prototype.hasOwnProperty;
		function P(e) {
			if (!Re(e)) return !1;
			try {
				var t = e.constructor, n = t.prototype;
				return t && n && ze.call(n, "isPrototypeOf");
			} catch {
				return !1;
			}
		}
		function F(e) {
			return typeof e == "function";
		}
		var Be = Array.prototype.slice;
		function Ve(e) {
			return Array.from ? Array.from(e) : Be.call(e);
		}
		function I(e, t) {
			return e && F(t) && (Array.isArray(e) || N(e.length) ? Ve(e).forEach(function(n, r) {
				t.call(e, n, r, e);
			}) : Re(e) && Object.keys(e).forEach(function(n) {
				t.call(e, e[n], n, e);
			})), e;
		}
		var L = Object.assign || function(e) {
			var t = [...arguments].slice(1);
			return Re(e) && t.length > 0 && t.forEach(function(t) {
				Re(t) && Object.keys(t).forEach(function(n) {
					e[n] = t[n];
				});
			}), e;
		}, He = /\.\d*(?:0|9){12}\d*$/;
		function R(e) {
			var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1e11;
			return He.test(e) ? Math.round(e * t) / t : e;
		}
		var z = /^width|height|left|top|marginLeft|marginTop$/;
		function Ue(e, t) {
			var n = e.style;
			I(t, function(e, t) {
				z.test(t) && N(e) && (e = `${e}px`), n[t] = e;
			});
		}
		function We(e, t) {
			return e.classList ? e.classList.contains(t) : e.className.indexOf(t) > -1;
		}
		function B(e, t) {
			if (t) {
				if (N(e.length)) {
					I(e, function(e) {
						B(e, t);
					});
					return;
				}
				if (e.classList) {
					e.classList.add(t);
					return;
				}
				var n = e.className.trim();
				n ? n.indexOf(t) < 0 && (e.className = `${n} ${t}`) : e.className = t;
			}
		}
		function Ge(e, t) {
			if (t) {
				if (N(e.length)) {
					I(e, function(e) {
						Ge(e, t);
					});
					return;
				}
				if (e.classList) {
					e.classList.remove(t);
					return;
				}
				e.className.indexOf(t) >= 0 && (e.className = e.className.replace(t, ""));
			}
		}
		function Ke(e, t, n) {
			if (t) {
				if (N(e.length)) {
					I(e, function(e) {
						Ke(e, t, n);
					});
					return;
				}
				n ? B(e, t) : Ge(e, t);
			}
		}
		var qe = /([a-z\d])([A-Z])/g;
		function Je(e) {
			return e.replace(qe, "$1-$2").toLowerCase();
		}
		function Ye(e, t) {
			return Re(e[t]) ? e[t] : e.dataset ? e.dataset[t] : e.getAttribute(`data-${Je(t)}`);
		}
		function Xe(e, t, n) {
			Re(n) ? e[t] = n : e.dataset ? e.dataset[t] = n : e.setAttribute(`data-${Je(t)}`, n);
		}
		function Ze(e, t) {
			if (Re(e[t])) try {
				delete e[t];
			} catch {
				e[t] = void 0;
			}
			else if (e.dataset) try {
				delete e.dataset[t];
			} catch {
				e.dataset[t] = void 0;
			}
			else e.removeAttribute(`data-${Je(t)}`);
		}
		var Qe = /\s\s*/, $e = function() {
			var e = !1;
			if (h) {
				var t = !1, n = function() {}, r = Object.defineProperty({}, "once", {
					get: function() {
						return e = !0, t;
					},
					set: function(e) {
						t = e;
					}
				});
				g.addEventListener("test", n, r), g.removeEventListener("test", n, r);
			}
			return e;
		}();
		function et(e, t, n) {
			var r = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, i = n;
			t.trim().split(Qe).forEach(function(t) {
				if (!$e) {
					var a = e.listeners;
					a && a[t] && a[t][n] && (i = a[t][n], delete a[t][n], Object.keys(a[t]).length === 0 && delete a[t], Object.keys(a).length === 0 && delete e.listeners);
				}
				e.removeEventListener(t, i, r);
			});
		}
		function V(e, t, n) {
			var r = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, i = n;
			t.trim().split(Qe).forEach(function(t) {
				if (r.once && !$e) {
					var a = e.listeners, o = a === void 0 ? {} : a;
					i = function() {
						delete o[t][n], e.removeEventListener(t, i, r);
						var a = [...arguments];
						n.apply(e, a);
					}, o[t] || (o[t] = {}), o[t][n] && e.removeEventListener(t, o[t][n], r), o[t][n] = i, e.listeners = o;
				}
				e.addEventListener(t, i, r);
			});
		}
		function tt(e, t, n) {
			var r;
			return F(Event) && F(CustomEvent) ? r = new CustomEvent(t, {
				detail: n,
				bubbles: !0,
				cancelable: !0
			}) : (r = document.createEvent("CustomEvent"), r.initCustomEvent(t, !0, !0, n)), e.dispatchEvent(r);
		}
		function nt(e) {
			var t = e.getBoundingClientRect();
			return {
				left: t.left + (window.pageXOffset - document.documentElement.clientLeft),
				top: t.top + (window.pageYOffset - document.documentElement.clientTop)
			};
		}
		var rt = g.location, H = /^(\w+:)\/\/([^:/?#]*):?(\d*)/i;
		function it(e) {
			var t = e.match(H);
			return t !== null && (t[1] !== rt.protocol || t[2] !== rt.hostname || t[3] !== rt.port);
		}
		function U(e) {
			var t = `timestamp=${(/* @__PURE__ */ new Date()).getTime()}`;
			return e + (e.indexOf("?") === -1 ? "?" : "&") + t;
		}
		function at(e) {
			var t = e.rotate, n = e.scaleX, r = e.scaleY, i = e.translateX, a = e.translateY, o = [];
			N(i) && i !== 0 && o.push(`translateX(${i}px)`), N(a) && a !== 0 && o.push(`translateY(${a}px)`), N(t) && t !== 0 && o.push(`rotate(${t}deg)`), N(n) && n !== 1 && o.push(`scaleX(${n})`), N(r) && r !== 1 && o.push(`scaleY(${r})`);
			var s = o.length ? o.join(" ") : "none";
			return {
				WebkitTransform: s,
				msTransform: s,
				transform: s
			};
		}
		function ot(e) {
			var n = t({}, e), r = 0;
			return I(e, function(e, t) {
				delete n[t], I(n, function(t) {
					var n = Math.abs(e.startX - t.startX), i = Math.abs(e.startY - t.startY), a = Math.abs(e.endX - t.endX), o = Math.abs(e.endY - t.endY), s = Math.sqrt(n * n + i * i), c = (Math.sqrt(a * a + o * o) - s) / s;
					Math.abs(c) > Math.abs(r) && (r = c);
				});
			}), r;
		}
		function W(e, n) {
			var r = e.pageX, i = e.pageY, a = {
				endX: r,
				endY: i
			};
			return n ? a : t({
				startX: r,
				startY: i
			}, a);
		}
		function G(e) {
			var t = 0, n = 0, r = 0;
			return I(e, function(e) {
				var i = e.startX, a = e.startY;
				t += i, n += a, r += 1;
			}), t /= r, n /= r, {
				pageX: t,
				pageY: n
			};
		}
		function st(e) {
			var t = e.aspectRatio, n = e.height, r = e.width, i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "contain", a = Ie(r), o = Ie(n);
			if (a && o) {
				var s = n * t;
				i === "contain" && s > r || i === "cover" && s < r ? n = r / t : r = n * t;
			} else a ? n = r / t : o && (r = n * t);
			return {
				width: r,
				height: n
			};
		}
		function ct(e) {
			var t = e.width, n = e.height, r = e.degree;
			if (r = Math.abs(r) % 180, r === 90) return {
				width: n,
				height: t
			};
			var i = r % 90 * Math.PI / 180, a = Math.sin(i), o = Math.cos(i), s = t * o + n * a, c = t * a + n * o;
			return r > 90 ? {
				width: c,
				height: s
			} : {
				width: s,
				height: c
			};
		}
		function K(e, t, n, r) {
			var i = t.aspectRatio, a = t.naturalWidth, o = t.naturalHeight, s = t.rotate, c = s === void 0 ? 0 : s, u = t.scaleX, d = u === void 0 ? 1 : u, f = t.scaleY, p = f === void 0 ? 1 : f, m = n.aspectRatio, h = n.naturalWidth, g = n.naturalHeight, _ = r.fillColor, v = _ === void 0 ? "transparent" : _, y = r.imageSmoothingEnabled, ee = y === void 0 ? !0 : y, te = r.imageSmoothingQuality, ne = te === void 0 ? "low" : te, b = r.maxWidth, x = b === void 0 ? Infinity : b, S = r.maxHeight, C = S === void 0 ? Infinity : S, w = r.minWidth, T = w === void 0 ? 0 : w, E = r.minHeight, D = E === void 0 ? 0 : E, re = document.createElement("canvas"), O = re.getContext("2d"), k = st({
				aspectRatio: m,
				width: x,
				height: C
			}), A = st({
				aspectRatio: m,
				width: T,
				height: D
			}, "cover"), j = Math.min(k.width, Math.max(A.width, h)), ie = Math.min(k.height, Math.max(A.height, g)), ae = st({
				aspectRatio: i,
				width: x,
				height: C
			}), M = st({
				aspectRatio: i,
				width: T,
				height: D
			}, "cover"), oe = Math.min(ae.width, Math.max(M.width, a)), se = Math.min(ae.height, Math.max(M.height, o)), ce = [
				-oe / 2,
				-se / 2,
				oe,
				se
			];
			return re.width = R(j), re.height = R(ie), O.fillStyle = v, O.fillRect(0, 0, j, ie), O.save(), O.translate(j / 2, ie / 2), O.rotate(c * Math.PI / 180), O.scale(d, p), O.imageSmoothingEnabled = ee, O.imageSmoothingQuality = ne, O.drawImage.apply(O, [e].concat(l(ce.map(function(e) {
				return Math.floor(R(e));
			})))), O.restore(), re;
		}
		var q = String.fromCharCode;
		function lt(e, t, n) {
			var r = "";
			n += t;
			for (var i = t; i < n; i += 1) r += q(e.getUint8(i));
			return r;
		}
		var ut = /^data:.*,/;
		function dt(e) {
			var t = e.replace(ut, ""), n = atob(t), r = new ArrayBuffer(n.length), i = new Uint8Array(r);
			return I(i, function(e, t) {
				i[t] = n.charCodeAt(t);
			}), r;
		}
		function ft(e, t) {
			for (var n = [], r = 8192, i = new Uint8Array(e); i.length > 0;) n.push(q.apply(null, Ve(i.subarray(0, r)))), i = i.subarray(r);
			return `data:${t};base64,${btoa(n.join(""))}`;
		}
		function pt(e) {
			var t = new DataView(e), n;
			try {
				var r, i, a;
				if (t.getUint8(0) === 255 && t.getUint8(1) === 216) for (var o = t.byteLength, s = 2; s + 1 < o;) {
					if (t.getUint8(s) === 255 && t.getUint8(s + 1) === 225) {
						i = s;
						break;
					}
					s += 1;
				}
				if (i) {
					var c = i + 4, l = i + 10;
					if (lt(t, c, 4) === "Exif") {
						var u = t.getUint16(l);
						if (r = u === 18761, (r || u === 19789) && t.getUint16(l + 2, r) === 42) {
							var d = t.getUint32(l + 4, r);
							d >= 8 && (a = l + d);
						}
					}
				}
				if (a) {
					var f = t.getUint16(a, r), p, m;
					for (m = 0; m < f; m += 1) if (p = a + m * 12 + 2, t.getUint16(p, r) === 274) {
						p += 8, n = t.getUint16(p, r), t.setUint16(p, 1, r);
						break;
					}
				}
			} catch {
				n = 1;
			}
			return n;
		}
		function mt(e) {
			var t = 0, n = 1, r = 1;
			switch (e) {
				case 2:
					n = -1;
					break;
				case 3:
					t = -180;
					break;
				case 4:
					r = -1;
					break;
				case 5:
					t = 90, r = -1;
					break;
				case 6:
					t = 90;
					break;
				case 7:
					t = 90, n = -1;
					break;
				case 8:
					t = -90;
					break;
			}
			return {
				rotate: t,
				scaleX: n,
				scaleY: r
			};
		}
		var ht = {
			render: function() {
				this.initContainer(), this.initCanvas(), this.initCropBox(), this.renderCanvas(), this.cropped && this.renderCropBox();
			},
			initContainer: function() {
				var e = this.element, t = this.options, n = this.container, r = this.cropper, i = Number(t.minContainerWidth), a = Number(t.minContainerHeight);
				B(r, A), Ge(e, A);
				var o = {
					width: Math.max(n.offsetWidth, i >= 0 ? i : je),
					height: Math.max(n.offsetHeight, a >= 0 ? a : Me)
				};
				this.containerData = o, Ue(r, {
					width: o.width,
					height: o.height
				}), B(e, A), Ge(r, A);
			},
			initCanvas: function() {
				var e = this.containerData, t = this.imageData, n = this.options.viewMode, r = Math.abs(t.rotate) % 180 == 90, i = r ? t.naturalHeight : t.naturalWidth, a = r ? t.naturalWidth : t.naturalHeight, o = i / a, s = e.width, c = e.height;
				e.height * o > e.width ? n === 3 ? s = e.height * o : c = e.width / o : n === 3 ? c = e.width / o : s = e.height * o;
				var l = {
					aspectRatio: o,
					naturalWidth: i,
					naturalHeight: a,
					width: s,
					height: c
				};
				this.canvasData = l, this.limited = n === 1 || n === 2, this.limitCanvas(!0, !0), l.width = Math.min(Math.max(l.width, l.minWidth), l.maxWidth), l.height = Math.min(Math.max(l.height, l.minHeight), l.maxHeight), l.left = (e.width - l.width) / 2, l.top = (e.height - l.height) / 2, l.oldLeft = l.left, l.oldTop = l.top, this.initialCanvasData = L({}, l);
			},
			limitCanvas: function(e, t) {
				var n = this.options, r = this.containerData, i = this.canvasData, a = this.cropBoxData, o = n.viewMode, s = i.aspectRatio, c = this.cropped && a;
				if (e) {
					var l = Number(n.minCanvasWidth) || 0, u = Number(n.minCanvasHeight) || 0;
					o > 1 ? (l = Math.max(l, r.width), u = Math.max(u, r.height), o === 3 && (u * s > l ? l = u * s : u = l / s)) : o > 0 && (l ? l = Math.max(l, c ? a.width : 0) : u ? u = Math.max(u, c ? a.height : 0) : c && (l = a.width, u = a.height, u * s > l ? l = u * s : u = l / s));
					var d = st({
						aspectRatio: s,
						width: l,
						height: u
					});
					l = d.width, u = d.height, i.minWidth = l, i.minHeight = u, i.maxWidth = Infinity, i.maxHeight = Infinity;
				}
				if (t) if (o > +!c) {
					var f = r.width - i.width, p = r.height - i.height;
					i.minLeft = Math.min(0, f), i.minTop = Math.min(0, p), i.maxLeft = Math.max(0, f), i.maxTop = Math.max(0, p), c && this.limited && (i.minLeft = Math.min(a.left, a.left + (a.width - i.width)), i.minTop = Math.min(a.top, a.top + (a.height - i.height)), i.maxLeft = a.left, i.maxTop = a.top, o === 2 && (i.width >= r.width && (i.minLeft = Math.min(0, f), i.maxLeft = Math.max(0, f)), i.height >= r.height && (i.minTop = Math.min(0, p), i.maxTop = Math.max(0, p))));
				} else i.minLeft = -i.width, i.minTop = -i.height, i.maxLeft = r.width, i.maxTop = r.height;
			},
			renderCanvas: function(e, t) {
				var n = this.canvasData, r = this.imageData;
				if (t) {
					var i = ct({
						width: r.naturalWidth * Math.abs(r.scaleX || 1),
						height: r.naturalHeight * Math.abs(r.scaleY || 1),
						degree: r.rotate || 0
					}), a = i.width, o = i.height, s = n.width * (a / n.naturalWidth), c = n.height * (o / n.naturalHeight);
					n.left -= (s - n.width) / 2, n.top -= (c - n.height) / 2, n.width = s, n.height = c, n.aspectRatio = a / o, n.naturalWidth = a, n.naturalHeight = o, this.limitCanvas(!0, !1);
				}
				(n.width > n.maxWidth || n.width < n.minWidth) && (n.left = n.oldLeft), (n.height > n.maxHeight || n.height < n.minHeight) && (n.top = n.oldTop), n.width = Math.min(Math.max(n.width, n.minWidth), n.maxWidth), n.height = Math.min(Math.max(n.height, n.minHeight), n.maxHeight), this.limitCanvas(!1, !0), n.left = Math.min(Math.max(n.left, n.minLeft), n.maxLeft), n.top = Math.min(Math.max(n.top, n.minTop), n.maxTop), n.oldLeft = n.left, n.oldTop = n.top, Ue(this.canvas, L({
					width: n.width,
					height: n.height
				}, at({
					translateX: n.left,
					translateY: n.top
				}))), this.renderImage(e), this.cropped && this.limited && this.limitCropBox(!0, !0);
			},
			renderImage: function(e) {
				var t = this.canvasData, n = this.imageData, r = n.naturalWidth * (t.width / t.naturalWidth), i = n.naturalHeight * (t.height / t.naturalHeight);
				L(n, {
					width: r,
					height: i,
					left: (t.width - r) / 2,
					top: (t.height - i) / 2
				}), Ue(this.image, L({
					width: n.width,
					height: n.height
				}, at(L({
					translateX: n.left,
					translateY: n.top
				}, n)))), e && this.output();
			},
			initCropBox: function() {
				var e = this.options, t = this.canvasData, n = e.aspectRatio || e.initialAspectRatio, r = Number(e.autoCropArea) || .8, i = {
					width: t.width,
					height: t.height
				};
				n && (t.height * n > t.width ? i.height = i.width / n : i.width = i.height * n), this.cropBoxData = i, this.limitCropBox(!0, !0), i.width = Math.min(Math.max(i.width, i.minWidth), i.maxWidth), i.height = Math.min(Math.max(i.height, i.minHeight), i.maxHeight), i.width = Math.max(i.minWidth, i.width * r), i.height = Math.max(i.minHeight, i.height * r), i.left = t.left + (t.width - i.width) / 2, i.top = t.top + (t.height - i.height) / 2, i.oldLeft = i.left, i.oldTop = i.top, this.initialCropBoxData = L({}, i);
			},
			limitCropBox: function(e, t) {
				var n = this.options, r = this.containerData, i = this.canvasData, a = this.cropBoxData, o = this.limited, s = n.aspectRatio;
				if (e) {
					var c = Number(n.minCropBoxWidth) || 0, l = Number(n.minCropBoxHeight) || 0, u = o ? Math.min(r.width, i.width, i.width + i.left, r.width - i.left) : r.width, d = o ? Math.min(r.height, i.height, i.height + i.top, r.height - i.top) : r.height;
					c = Math.min(c, r.width), l = Math.min(l, r.height), s && (c && l ? l * s > c ? l = c / s : c = l * s : c ? l = c / s : l && (c = l * s), d * s > u ? d = u / s : u = d * s), a.minWidth = Math.min(c, u), a.minHeight = Math.min(l, d), a.maxWidth = u, a.maxHeight = d;
				}
				t && (o ? (a.minLeft = Math.max(0, i.left), a.minTop = Math.max(0, i.top), a.maxLeft = Math.min(r.width, i.left + i.width) - a.width, a.maxTop = Math.min(r.height, i.top + i.height) - a.height) : (a.minLeft = 0, a.minTop = 0, a.maxLeft = r.width - a.width, a.maxTop = r.height - a.height));
			},
			renderCropBox: function() {
				var e = this.options, t = this.containerData, n = this.cropBoxData;
				(n.width > n.maxWidth || n.width < n.minWidth) && (n.left = n.oldLeft), (n.height > n.maxHeight || n.height < n.minHeight) && (n.top = n.oldTop), n.width = Math.min(Math.max(n.width, n.minWidth), n.maxWidth), n.height = Math.min(Math.max(n.height, n.minHeight), n.maxHeight), this.limitCropBox(!1, !0), n.left = Math.min(Math.max(n.left, n.minLeft), n.maxLeft), n.top = Math.min(Math.max(n.top, n.minTop), n.maxTop), n.oldLeft = n.left, n.oldTop = n.top, e.movable && e.cropBoxMovable && Xe(this.face, oe, n.width >= t.width && n.height >= t.height ? ne : ee), Ue(this.cropBox, L({
					width: n.width,
					height: n.height
				}, at({
					translateX: n.left,
					translateY: n.top
				}))), this.cropped && this.limited && this.limitCanvas(!0, !0), this.disabled || this.output();
			},
			output: function() {
				this.preview(), tt(this.element, de, this.getData());
			}
		}, gt = {
			initPreview: function() {
				var e = this.element, t = this.crossOrigin, n = this.options.preview, r = t ? this.crossOriginUrl : this.url, i = e.alt || "The image to preview", a = document.createElement("img");
				if (t && (a.crossOrigin = t), a.src = r, a.alt = i, this.viewBox.appendChild(a), this.viewBoxImage = a, n) {
					var o = n;
					typeof n == "string" ? o = e.ownerDocument.querySelectorAll(n) : n.querySelector && (o = [n]), this.previews = o, I(o, function(e) {
						var n = document.createElement("img");
						Xe(e, se, {
							width: e.offsetWidth,
							height: e.offsetHeight,
							html: e.innerHTML
						}), t && (n.crossOrigin = t), n.src = r, n.alt = i, n.style.cssText = "display:block;width:100%;height:auto;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;image-orientation:0deg!important;\"", e.innerHTML = "", e.appendChild(n);
					});
				}
			},
			resetPreview: function() {
				I(this.previews, function(e) {
					var t = Ye(e, se);
					Ue(e, {
						width: t.width,
						height: t.height
					}), e.innerHTML = t.html, Ze(e, se);
				});
			},
			preview: function() {
				var e = this.imageData, t = this.canvasData, n = this.cropBoxData, r = n.width, i = n.height, a = e.width, o = e.height, s = n.left - t.left - e.left, c = n.top - t.top - e.top;
				!this.cropped || this.disabled || (Ue(this.viewBoxImage, L({
					width: a,
					height: o
				}, at(L({
					translateX: -s,
					translateY: -c
				}, e)))), I(this.previews, function(t) {
					var n = Ye(t, se), l = n.width, u = n.height, d = l, f = u, p = 1;
					r && (p = l / r, f = i * p), i && f > u && (p = u / i, d = r * p, f = u), Ue(t, {
						width: d,
						height: f
					}), Ue(t.getElementsByTagName("img")[0], L({
						width: a * p,
						height: o * p
					}, at(L({
						translateX: -s * p,
						translateY: -c * p
					}, e))));
				}));
			}
		}, _t = {
			bind: function() {
				var e = this.element, t = this.options, n = this.cropper;
				F(t.cropstart) && V(e, me, t.cropstart), F(t.cropmove) && V(e, pe, t.cropmove), F(t.cropend) && V(e, fe, t.cropend), F(t.crop) && V(e, de, t.crop), F(t.zoom) && V(e, Te, t.zoom), V(n, ye, this.onCropStart = this.cropStart.bind(this)), t.zoomable && t.zoomOnWheel && V(n, we, this.onWheel = this.wheel.bind(this), {
					passive: !1,
					capture: !0
				}), t.toggleDragModeOnDblclick && V(n, he, this.onDblclick = this.dblclick.bind(this)), V(e.ownerDocument, be, this.onCropMove = this.cropMove.bind(this)), V(e.ownerDocument, xe, this.onCropEnd = this.cropEnd.bind(this)), t.responsive && V(window, Ce, this.onResize = this.resize.bind(this));
			},
			unbind: function() {
				var e = this.element, t = this.options, n = this.cropper;
				F(t.cropstart) && et(e, me, t.cropstart), F(t.cropmove) && et(e, pe, t.cropmove), F(t.cropend) && et(e, fe, t.cropend), F(t.crop) && et(e, de, t.crop), F(t.zoom) && et(e, Te, t.zoom), et(n, ye, this.onCropStart), t.zoomable && t.zoomOnWheel && et(n, we, this.onWheel, {
					passive: !1,
					capture: !0
				}), t.toggleDragModeOnDblclick && et(n, he, this.onDblclick), et(e.ownerDocument, be, this.onCropMove), et(e.ownerDocument, xe, this.onCropEnd), t.responsive && et(window, Ce, this.onResize);
			}
		}, vt = {
			resize: function() {
				if (!this.disabled) {
					var e = this.options, t = this.container, n = this.containerData, r = t.offsetWidth / n.width, i = t.offsetHeight / n.height, a = Math.abs(r - 1) > Math.abs(i - 1) ? r : i;
					if (a !== 1) {
						var o, s;
						e.restore && (o = this.getCanvasData(), s = this.getCropBoxData()), this.render(), e.restore && (this.setCanvasData(I(o, function(e, t) {
							o[t] = e * a;
						})), this.setCropBoxData(I(s, function(e, t) {
							s[t] = e * a;
						})));
					}
				}
			},
			dblclick: function() {
				this.disabled || this.options.dragMode === ue || this.setDragMode(We(this.dragBox, O) ? le : ce);
			},
			wheel: function(e) {
				var t = this, n = Number(this.options.wheelZoomRatio) || .1, r = 1;
				this.disabled || (e.preventDefault(), !this.wheeling && (this.wheeling = !0, setTimeout(function() {
					t.wheeling = !1;
				}, 50), e.deltaY ? r = e.deltaY > 0 ? 1 : -1 : e.wheelDelta ? r = -e.wheelDelta / 120 : e.detail && (r = e.detail > 0 ? 1 : -1), this.zoom(-r * n, e)));
			},
			cropStart: function(e) {
				var t = e.buttons, n = e.button;
				if (!(this.disabled || (e.type === "mousedown" || e.type === "pointerdown" && e.pointerType === "mouse") && (N(t) && t !== 1 || N(n) && n !== 0 || e.ctrlKey))) {
					var r = this.options, i = this.pointers, a;
					e.changedTouches ? I(e.changedTouches, function(e) {
						i[e.identifier] = W(e);
					}) : i[e.pointerId || 0] = W(e), a = Object.keys(i).length > 1 && r.zoomable && r.zoomOnTouch ? b : Ye(e.target, oe), De.test(a) && tt(this.element, me, {
						originalEvent: e,
						action: a
					}) !== !1 && (e.preventDefault(), this.action = a, this.cropping = !1, a === te && (this.cropping = !0, B(this.dragBox, ae)));
				}
			},
			cropMove: function(e) {
				var t = this.action;
				if (!(this.disabled || !t)) {
					var n = this.pointers;
					e.preventDefault(), tt(this.element, pe, {
						originalEvent: e,
						action: t
					}) !== !1 && (e.changedTouches ? I(e.changedTouches, function(e) {
						L(n[e.identifier] || {}, W(e, !0));
					}) : L(n[e.pointerId || 0] || {}, W(e, !0)), this.change(e));
				}
			},
			cropEnd: function(e) {
				if (!this.disabled) {
					var t = this.action, n = this.pointers;
					e.changedTouches ? I(e.changedTouches, function(e) {
						delete n[e.identifier];
					}) : delete n[e.pointerId || 0], t && (e.preventDefault(), Object.keys(n).length || (this.action = ""), this.cropping && (this.cropping = !1, Ke(this.dragBox, ae, this.cropped && this.options.modal)), tt(this.element, fe, {
						originalEvent: e,
						action: t
					}));
				}
			}
		}, yt = { change: function(e) {
			var t = this.options, n = this.canvasData, r = this.containerData, i = this.cropBoxData, a = this.pointers, o = this.action, s = t.aspectRatio, c = i.left, l = i.top, u = i.width, d = i.height, f = c + u, p = l + d, m = 0, h = 0, g = r.width, _ = r.height, v = !0, y;
			!s && e.shiftKey && (s = u && d ? u / d : 1), this.limited && (m = i.minLeft, h = i.minTop, g = m + Math.min(r.width, n.width, n.left + n.width), _ = h + Math.min(r.height, n.height, n.top + n.height));
			var O = a[Object.keys(a)[0]], k = {
				x: O.endX - O.startX,
				y: O.endY - O.startY
			}, j = function(e) {
				switch (e) {
					case x:
						f + k.x > g && (k.x = g - f);
						break;
					case S:
						c + k.x < m && (k.x = m - c);
						break;
					case w:
						l + k.y < h && (k.y = h - l);
						break;
					case C:
						p + k.y > _ && (k.y = _ - p);
						break;
				}
			};
			switch (o) {
				case ee:
					c += k.x, l += k.y;
					break;
				case x:
					if (k.x >= 0 && (f >= g || s && (l <= h || p >= _))) {
						v = !1;
						break;
					}
					j(x), u += k.x, u < 0 && (o = S, u = -u, c -= u), s && (d = u / s, l += (i.height - d) / 2);
					break;
				case w:
					if (k.y <= 0 && (l <= h || s && (c <= m || f >= g))) {
						v = !1;
						break;
					}
					j(w), d -= k.y, l += k.y, d < 0 && (o = C, d = -d, l -= d), s && (u = d * s, c += (i.width - u) / 2);
					break;
				case S:
					if (k.x <= 0 && (c <= m || s && (l <= h || p >= _))) {
						v = !1;
						break;
					}
					j(S), u -= k.x, c += k.x, u < 0 && (o = x, u = -u, c -= u), s && (d = u / s, l += (i.height - d) / 2);
					break;
				case C:
					if (k.y >= 0 && (p >= _ || s && (c <= m || f >= g))) {
						v = !1;
						break;
					}
					j(C), d += k.y, d < 0 && (o = w, d = -d, l -= d), s && (u = d * s, c += (i.width - u) / 2);
					break;
				case T:
					if (s) {
						if (k.y <= 0 && (l <= h || f >= g)) {
							v = !1;
							break;
						}
						j(w), d -= k.y, l += k.y, u = d * s;
					} else j(w), j(x), k.x >= 0 ? f < g ? u += k.x : k.y <= 0 && l <= h && (v = !1) : u += k.x, k.y <= 0 ? l > h && (d -= k.y, l += k.y) : (d -= k.y, l += k.y);
					u < 0 && d < 0 ? (o = re, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = E, u = -u, c -= u) : d < 0 && (o = D, d = -d, l -= d);
					break;
				case E:
					if (s) {
						if (k.y <= 0 && (l <= h || c <= m)) {
							v = !1;
							break;
						}
						j(w), d -= k.y, l += k.y, u = d * s, c += i.width - u;
					} else j(w), j(S), k.x <= 0 ? c > m ? (u -= k.x, c += k.x) : k.y <= 0 && l <= h && (v = !1) : (u -= k.x, c += k.x), k.y <= 0 ? l > h && (d -= k.y, l += k.y) : (d -= k.y, l += k.y);
					u < 0 && d < 0 ? (o = D, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = T, u = -u, c -= u) : d < 0 && (o = re, d = -d, l -= d);
					break;
				case re:
					if (s) {
						if (k.x <= 0 && (c <= m || p >= _)) {
							v = !1;
							break;
						}
						j(S), u -= k.x, c += k.x, d = u / s;
					} else j(C), j(S), k.x <= 0 ? c > m ? (u -= k.x, c += k.x) : k.y >= 0 && p >= _ && (v = !1) : (u -= k.x, c += k.x), k.y >= 0 ? p < _ && (d += k.y) : d += k.y;
					u < 0 && d < 0 ? (o = T, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = D, u = -u, c -= u) : d < 0 && (o = E, d = -d, l -= d);
					break;
				case D:
					if (s) {
						if (k.x >= 0 && (f >= g || p >= _)) {
							v = !1;
							break;
						}
						j(x), u += k.x, d = u / s;
					} else j(C), j(x), k.x >= 0 ? f < g ? u += k.x : k.y >= 0 && p >= _ && (v = !1) : u += k.x, k.y >= 0 ? p < _ && (d += k.y) : d += k.y;
					u < 0 && d < 0 ? (o = E, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = re, u = -u, c -= u) : d < 0 && (o = T, d = -d, l -= d);
					break;
				case ne:
					this.move(k.x, k.y), v = !1;
					break;
				case b:
					this.zoom(ot(a), e), v = !1;
					break;
				case te:
					if (!k.x || !k.y) {
						v = !1;
						break;
					}
					y = nt(this.cropper), c = O.startX - y.left, l = O.startY - y.top, u = i.minWidth, d = i.minHeight, k.x > 0 ? o = k.y > 0 ? D : T : k.x < 0 && (c -= u, o = k.y > 0 ? re : E), k.y < 0 && (l -= d), this.cropped || (Ge(this.cropBox, A), this.cropped = !0, this.limited && this.limitCropBox(!0, !0));
					break;
			}
			v && (i.width = u, i.height = d, i.left = c, i.top = l, this.action = o, this.renderCropBox()), I(a, function(e) {
				e.startX = e.endX, e.startY = e.endY;
			});
		} }, bt = {
			crop: function() {
				return this.ready && !this.cropped && !this.disabled && (this.cropped = !0, this.limitCropBox(!0, !0), this.options.modal && B(this.dragBox, ae), Ge(this.cropBox, A), this.setCropBoxData(this.initialCropBoxData)), this;
			},
			reset: function() {
				return this.ready && !this.disabled && (this.imageData = L({}, this.initialImageData), this.canvasData = L({}, this.initialCanvasData), this.cropBoxData = L({}, this.initialCropBoxData), this.renderCanvas(), this.cropped && this.renderCropBox()), this;
			},
			clear: function() {
				return this.cropped && !this.disabled && (L(this.cropBoxData, {
					left: 0,
					top: 0,
					width: 0,
					height: 0
				}), this.cropped = !1, this.renderCropBox(), this.limitCanvas(!0, !0), this.renderCanvas(), Ge(this.dragBox, ae), B(this.cropBox, A)), this;
			},
			replace: function(e) {
				var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
				return !this.disabled && e && (this.isImg && (this.element.src = e), t ? (this.url = e, this.image.src = e, this.ready && (this.viewBoxImage.src = e, I(this.previews, function(t) {
					t.getElementsByTagName("img")[0].src = e;
				}))) : (this.isImg && (this.replaced = !0), this.options.data = null, this.uncreate(), this.load(e))), this;
			},
			enable: function() {
				return this.ready && this.disabled && (this.disabled = !1, Ge(this.cropper, k)), this;
			},
			disable: function() {
				return this.ready && !this.disabled && (this.disabled = !0, B(this.cropper, k)), this;
			},
			destroy: function() {
				var e = this.element;
				return e[y] ? (e[y] = void 0, this.isImg && this.replaced && (e.src = this.originalUrl), this.uncreate(), this) : this;
			},
			move: function(e) {
				var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e, n = this.canvasData, r = n.left, i = n.top;
				return this.moveTo(Le(e) ? e : r + Number(e), Le(t) ? t : i + Number(t));
			},
			moveTo: function(e) {
				var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e, n = this.canvasData, r = !1;
				return e = Number(e), t = Number(t), this.ready && !this.disabled && this.options.movable && (N(e) && (n.left = e, r = !0), N(t) && (n.top = t, r = !0), r && this.renderCanvas(!0)), this;
			},
			zoom: function(e, t) {
				var n = this.canvasData;
				return e = Number(e), e = e < 0 ? 1 / (1 - e) : 1 + e, this.zoomTo(n.width * e / n.naturalWidth, null, t);
			},
			zoomTo: function(e, t, n) {
				var r = this.options, i = this.canvasData, a = i.width, o = i.height, s = i.naturalWidth, c = i.naturalHeight;
				if (e = Number(e), e >= 0 && this.ready && !this.disabled && r.zoomable) {
					var l = s * e, u = c * e;
					if (tt(this.element, Te, {
						ratio: e,
						oldRatio: a / s,
						originalEvent: n
					}) === !1) return this;
					if (n) {
						var d = this.pointers, f = nt(this.cropper), p = d && Object.keys(d).length ? G(d) : {
							pageX: n.pageX,
							pageY: n.pageY
						};
						i.left -= (l - a) * ((p.pageX - f.left - i.left) / a), i.top -= (u - o) * ((p.pageY - f.top - i.top) / o);
					} else P(t) && N(t.x) && N(t.y) ? (i.left -= (l - a) * ((t.x - i.left) / a), i.top -= (u - o) * ((t.y - i.top) / o)) : (i.left -= (l - a) / 2, i.top -= (u - o) / 2);
					i.width = l, i.height = u, this.renderCanvas(!0);
				}
				return this;
			},
			rotate: function(e) {
				return this.rotateTo((this.imageData.rotate || 0) + Number(e));
			},
			rotateTo: function(e) {
				return e = Number(e), N(e) && this.ready && !this.disabled && this.options.rotatable && (this.imageData.rotate = e % 360, this.renderCanvas(!0, !0)), this;
			},
			scaleX: function(e) {
				var t = this.imageData.scaleY;
				return this.scale(e, N(t) ? t : 1);
			},
			scaleY: function(e) {
				var t = this.imageData.scaleX;
				return this.scale(N(t) ? t : 1, e);
			},
			scale: function(e) {
				var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e, n = this.imageData, r = !1;
				return e = Number(e), t = Number(t), this.ready && !this.disabled && this.options.scalable && (N(e) && (n.scaleX = e, r = !0), N(t) && (n.scaleY = t, r = !0), r && this.renderCanvas(!0, !0)), this;
			},
			getData: function() {
				var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1, t = this.options, n = this.imageData, r = this.canvasData, i = this.cropBoxData, a;
				if (this.ready && this.cropped) {
					a = {
						x: i.left - r.left,
						y: i.top - r.top,
						width: i.width,
						height: i.height
					};
					var o = n.width / n.naturalWidth;
					if (I(a, function(e, t) {
						a[t] = e / o;
					}), e) {
						var s = Math.round(a.y + a.height), c = Math.round(a.x + a.width);
						a.x = Math.round(a.x), a.y = Math.round(a.y), a.width = c - a.x, a.height = s - a.y;
					}
				} else a = {
					x: 0,
					y: 0,
					width: 0,
					height: 0
				};
				return t.rotatable && (a.rotate = n.rotate || 0), t.scalable && (a.scaleX = n.scaleX || 1, a.scaleY = n.scaleY || 1), a;
			},
			setData: function(e) {
				var t = this.options, n = this.imageData, r = this.canvasData, i = {};
				if (this.ready && !this.disabled && P(e)) {
					var a = !1;
					t.rotatable && N(e.rotate) && e.rotate !== n.rotate && (n.rotate = e.rotate, a = !0), t.scalable && (N(e.scaleX) && e.scaleX !== n.scaleX && (n.scaleX = e.scaleX, a = !0), N(e.scaleY) && e.scaleY !== n.scaleY && (n.scaleY = e.scaleY, a = !0)), a && this.renderCanvas(!0, !0);
					var o = n.width / n.naturalWidth;
					N(e.x) && (i.left = e.x * o + r.left), N(e.y) && (i.top = e.y * o + r.top), N(e.width) && (i.width = e.width * o), N(e.height) && (i.height = e.height * o), this.setCropBoxData(i);
				}
				return this;
			},
			getContainerData: function() {
				return this.ready ? L({}, this.containerData) : {};
			},
			getImageData: function() {
				return this.sized ? L({}, this.imageData) : {};
			},
			getCanvasData: function() {
				var e = this.canvasData, t = {};
				return this.ready && I([
					"left",
					"top",
					"width",
					"height",
					"naturalWidth",
					"naturalHeight"
				], function(n) {
					t[n] = e[n];
				}), t;
			},
			setCanvasData: function(e) {
				var t = this.canvasData, n = t.aspectRatio;
				return this.ready && !this.disabled && P(e) && (N(e.left) && (t.left = e.left), N(e.top) && (t.top = e.top), N(e.width) ? (t.width = e.width, t.height = e.width / n) : N(e.height) && (t.height = e.height, t.width = e.height * n), this.renderCanvas(!0)), this;
			},
			getCropBoxData: function() {
				var e = this.cropBoxData, t;
				return this.ready && this.cropped && (t = {
					left: e.left,
					top: e.top,
					width: e.width,
					height: e.height
				}), t || {};
			},
			setCropBoxData: function(e) {
				var t = this.cropBoxData, n = this.options.aspectRatio, r, i;
				return this.ready && this.cropped && !this.disabled && P(e) && (N(e.left) && (t.left = e.left), N(e.top) && (t.top = e.top), N(e.width) && e.width !== t.width && (r = !0, t.width = e.width), N(e.height) && e.height !== t.height && (i = !0, t.height = e.height), n && (r ? t.height = t.width / n : i && (t.width = t.height * n)), this.renderCropBox()), this;
			},
			getCroppedCanvas: function() {
				var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
				if (!this.ready || !window.HTMLCanvasElement) return null;
				var t = this.canvasData, n = K(this.image, this.imageData, t, e);
				if (!this.cropped) return n;
				var r = this.getData(e.rounded), i = r.x, a = r.y, o = r.width, s = r.height, c = n.width / Math.floor(t.naturalWidth);
				c !== 1 && (i *= c, a *= c, o *= c, s *= c);
				var u = o / s, d = st({
					aspectRatio: u,
					width: e.maxWidth || Infinity,
					height: e.maxHeight || Infinity
				}), f = st({
					aspectRatio: u,
					width: e.minWidth || 0,
					height: e.minHeight || 0
				}, "cover"), p = st({
					aspectRatio: u,
					width: e.width || (c === 1 ? o : n.width),
					height: e.height || (c === 1 ? s : n.height)
				}), m = p.width, h = p.height;
				m = Math.min(d.width, Math.max(f.width, m)), h = Math.min(d.height, Math.max(f.height, h));
				var g = document.createElement("canvas"), _ = g.getContext("2d");
				g.width = R(m), g.height = R(h), _.fillStyle = e.fillColor || "transparent", _.fillRect(0, 0, m, h);
				var v = e.imageSmoothingEnabled, y = v === void 0 ? !0 : v, ee = e.imageSmoothingQuality;
				_.imageSmoothingEnabled = y, ee && (_.imageSmoothingQuality = ee);
				var te = n.width, ne = n.height, b = i, x = a, S, C, w, T, E, D;
				b <= -o || b > te ? (b = 0, S = 0, w = 0, E = 0) : b <= 0 ? (w = -b, b = 0, S = Math.min(te, o + b), E = S) : b <= te && (w = 0, S = Math.min(o, te - b), E = S), S <= 0 || x <= -s || x > ne ? (x = 0, C = 0, T = 0, D = 0) : x <= 0 ? (T = -x, x = 0, C = Math.min(ne, s + x), D = C) : x <= ne && (T = 0, C = Math.min(s, ne - x), D = C);
				var re = [
					b,
					x,
					S,
					C
				];
				if (E > 0 && D > 0) {
					var O = m / o;
					re.push(w * O, T * O, E * O, D * O);
				}
				return _.drawImage.apply(_, [n].concat(l(re.map(function(e) {
					return Math.floor(R(e));
				})))), g;
			},
			setAspectRatio: function(e) {
				var t = this.options;
				return !this.disabled && !Le(e) && (t.aspectRatio = Math.max(0, e) || NaN, this.ready && (this.initCropBox(), this.cropped && this.renderCropBox())), this;
			},
			setDragMode: function(e) {
				var t = this.options, n = this.dragBox, r = this.face;
				if (this.ready && !this.disabled) {
					var i = e === ce, a = t.movable && e === le;
					e = i || a ? e : ue, t.dragMode = e, Xe(n, oe, e), Ke(n, O, i), Ke(n, M, a), t.cropBoxMovable || (Xe(r, oe, e), Ke(r, O, i), Ke(r, M, a));
				}
				return this;
			}
		}, xt = g.Cropper, St = /*#__PURE__*/ function() {
			function e(t) {
				var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
				if (a(this, e), !t || !Ae.test(t.tagName)) throw Error("The first argument is required and must be an <img> or <canvas> element.");
				this.element = t, this.options = L({}, Ne, P(n) && n), this.cropped = !1, this.disabled = !1, this.pointers = {}, this.ready = !1, this.reloading = !1, this.replaced = !1, this.sized = !1, this.sizing = !1, this.init();
			}
			return s(e, [
				{
					key: "init",
					value: function() {
						var e = this.element, t = e.tagName.toLowerCase(), n;
						if (!e[y]) {
							if (e[y] = this, t === "img") {
								if (this.isImg = !0, n = e.getAttribute("src") || "", this.originalUrl = n, !n) return;
								n = e.src;
							} else t === "canvas" && window.HTMLCanvasElement && (n = e.toDataURL());
							this.load(n);
						}
					}
				},
				{
					key: "load",
					value: function(e) {
						var t = this;
						if (e) {
							this.url = e, this.imageData = {};
							var n = this.element, r = this.options;
							if (!r.rotatable && !r.scalable && (r.checkOrientation = !1), !r.checkOrientation || !window.ArrayBuffer) {
								this.clone();
								return;
							}
							if (Oe.test(e)) {
								ke.test(e) ? this.read(dt(e)) : this.clone();
								return;
							}
							var i = new XMLHttpRequest(), a = this.clone.bind(this);
							this.reloading = !0, this.xhr = i, i.onabort = a, i.onerror = a, i.ontimeout = a, i.onprogress = function() {
								i.getResponseHeader("content-type") !== Ee && i.abort();
							}, i.onload = function() {
								t.read(i.response);
							}, i.onloadend = function() {
								t.reloading = !1, t.xhr = null;
							}, r.checkCrossOrigin && it(e) && n.crossOrigin && (e = U(e)), i.open("GET", e, !0), i.responseType = "arraybuffer", i.withCredentials = n.crossOrigin === "use-credentials", i.send();
						}
					}
				},
				{
					key: "read",
					value: function(e) {
						var t = this.options, n = this.imageData, r = pt(e), i = 0, a = 1, o = 1;
						if (r > 1) {
							this.url = ft(e, Ee);
							var s = mt(r);
							i = s.rotate, a = s.scaleX, o = s.scaleY;
						}
						t.rotatable && (n.rotate = i), t.scalable && (n.scaleX = a, n.scaleY = o), this.clone();
					}
				},
				{
					key: "clone",
					value: function() {
						var e = this.element, t = this.url, n = e.crossOrigin, r = t;
						this.options.checkCrossOrigin && it(t) && (n || (n = "anonymous"), r = U(t)), this.crossOrigin = n, this.crossOriginUrl = r;
						var i = document.createElement("img");
						n && (i.crossOrigin = n), i.src = r || t, i.alt = e.alt || "The image to crop", this.image = i, i.onload = this.start.bind(this), i.onerror = this.stop.bind(this), B(i, j), e.parentNode.insertBefore(i, e.nextSibling);
					}
				},
				{
					key: "start",
					value: function() {
						var e = this, t = this.image;
						t.onload = null, t.onerror = null, this.sizing = !0;
						var n = g.navigator && /(?:iPad|iPhone|iPod).*?AppleWebKit/i.test(g.navigator.userAgent), r = function(t, n) {
							L(e.imageData, {
								naturalWidth: t,
								naturalHeight: n,
								aspectRatio: t / n
							}), e.initialImageData = L({}, e.imageData), e.sizing = !1, e.sized = !0, e.build();
						};
						if (t.naturalWidth && !n) {
							r(t.naturalWidth, t.naturalHeight);
							return;
						}
						var i = document.createElement("img"), a = document.body || document.documentElement;
						this.sizingImage = i, i.onload = function() {
							r(i.width, i.height), n || a.removeChild(i);
						}, i.src = t.src, n || (i.style.cssText = "left:0;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;opacity:0;position:absolute;top:0;z-index:-1;", a.appendChild(i));
					}
				},
				{
					key: "stop",
					value: function() {
						var e = this.image;
						e.onload = null, e.onerror = null, e.parentNode.removeChild(e), this.image = null;
					}
				},
				{
					key: "build",
					value: function() {
						if (!(!this.sized || this.ready)) {
							var e = this.element, t = this.options, n = this.image, r = e.parentNode, i = document.createElement("div");
							i.innerHTML = Pe;
							var a = i.querySelector(`.${y}-container`), o = a.querySelector(`.${y}-canvas`), s = a.querySelector(`.${y}-drag-box`), c = a.querySelector(`.${y}-crop-box`), l = c.querySelector(`.${y}-face`);
							this.container = r, this.cropper = a, this.canvas = o, this.dragBox = s, this.cropBox = c, this.viewBox = a.querySelector(`.${y}-view-box`), this.face = l, o.appendChild(n), B(e, A), r.insertBefore(a, e.nextSibling), Ge(n, j), this.initPreview(), this.bind(), t.initialAspectRatio = Math.max(0, t.initialAspectRatio) || NaN, t.aspectRatio = Math.max(0, t.aspectRatio) || NaN, t.viewMode = Math.max(0, Math.min(3, Math.round(t.viewMode))) || 0, B(c, A), t.guides || B(c.getElementsByClassName(`${y}-dashed`), A), t.center || B(c.getElementsByClassName(`${y}-center`), A), t.background && B(a, `${y}-bg`), t.highlight || B(l, ie), t.cropBoxMovable && (B(l, M), Xe(l, oe, ee)), t.cropBoxResizable || (B(c.getElementsByClassName(`${y}-line`), A), B(c.getElementsByClassName(`${y}-point`), A)), this.render(), this.ready = !0, this.setDragMode(t.dragMode), t.autoCrop && this.crop(), this.setData(t.data), F(t.ready) && V(e, Se, t.ready, { once: !0 }), tt(e, Se);
						}
					}
				},
				{
					key: "unbuild",
					value: function() {
						if (this.ready) {
							this.ready = !1, this.unbind(), this.resetPreview();
							var e = this.cropper.parentNode;
							e && e.removeChild(this.cropper), Ge(this.element, A);
						}
					}
				},
				{
					key: "uncreate",
					value: function() {
						this.ready ? (this.unbuild(), this.ready = !1, this.cropped = !1) : this.sizing ? (this.sizingImage.onload = null, this.sizing = !1, this.sized = !1) : this.reloading ? (this.xhr.onabort = null, this.xhr.abort()) : this.image && this.stop();
					}
				}
			], [{
				key: "noConflict",
				value: function() {
					return window.Cropper = xt, e;
				}
			}, {
				key: "setDefaults",
				value: function(e) {
					L(Ne, P(e) && e);
				}
			}]);
		}();
		return L(St.prototype, ht, gt, _t, vt, yt, bt), St;
	}));
})))(), 1), Ti = "\n.cropper-container {\n  direction: ltr;\n  font-size: 0;\n  line-height: 0;\n  position: relative;\n  -ms-touch-action: none;\n      touch-action: none;\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n      -ms-user-select: none;\n          user-select: none;\n}\n.cropper-container img {\n  backface-visibility: hidden;\n  display: block;\n  height: 100%;\n  image-orientation: 0deg;\n  max-height: none !important;\n  max-width: none !important;\n  min-height: 0 !important;\n  min-width: 0 !important;\n  width: 100%;\n}\n.cropper-wrap-box,\n.cropper-canvas,\n.cropper-drag-box,\n.cropper-crop-box,\n.cropper-modal {\n  bottom: 0;\n  left: 0;\n  position: absolute;\n  right: 0;\n  top: 0;\n}\n.cropper-wrap-box,\n.cropper-canvas {\n  overflow: hidden;\n}\n.cropper-drag-box {\n  background-color: #fff;\n  opacity: 0;\n}\n.cropper-modal {\n  background-color: #000;\n  opacity: 0.5;\n}\n.cropper-view-box {\n  display: block;\n  height: 100%;\n  outline: 1px solid #39f;\n  outline-color: rgba(51, 153, 255, 0.75);\n  overflow: hidden;\n  width: 100%;\n}\n.cropper-dashed {\n  border: 0 dashed #eee;\n  display: block;\n  opacity: 0.5;\n  position: absolute;\n}\n.cropper-dashed.dashed-h {\n  border-bottom-width: 1px;\n  border-top-width: 1px;\n  height: calc(100% / 3);\n  left: 0;\n  top: calc(100% / 3);\n  width: 100%;\n}\n.cropper-dashed.dashed-v {\n  border-left-width: 1px;\n  border-right-width: 1px;\n  height: 100%;\n  left: calc(100% / 3);\n  top: 0;\n  width: calc(100% / 3);\n}\n.cropper-center {\n  display: block;\n  height: 0;\n  left: 50%;\n  opacity: 0.75;\n  position: absolute;\n  top: 50%;\n  width: 0;\n}\n.cropper-center::before,\n.cropper-center::after {\n  background-color: #eee;\n  content: ' ';\n  display: block;\n  position: absolute;\n}\n.cropper-center::before {\n  height: 1px;\n  left: -3px;\n  top: 0;\n  width: 7px;\n}\n.cropper-center::after {\n  height: 7px;\n  left: 0;\n  top: -3px;\n  width: 1px;\n}\n.cropper-face,\n.cropper-line,\n.cropper-point {\n  display: block;\n  height: 100%;\n  opacity: 0.1;\n  position: absolute;\n  width: 100%;\n}\n.cropper-face {\n  background-color: #fff;\n  left: 0;\n  top: 0;\n}\n.cropper-line {\n  background-color: #39f;\n}\n.cropper-line.line-e {\n  cursor: ew-resize;\n  right: -3px;\n  top: 0;\n  width: 5px;\n}\n.cropper-line.line-n {\n  cursor: ns-resize;\n  height: 5px;\n  left: 0;\n  top: -3px;\n}\n.cropper-line.line-w {\n  cursor: ew-resize;\n  left: -3px;\n  top: 0;\n  width: 5px;\n}\n.cropper-line.line-s {\n  bottom: -3px;\n  cursor: ns-resize;\n  height: 5px;\n  left: 0;\n}\n.cropper-point {\n  background-color: #39f;\n  height: 5px;\n  opacity: 0.75;\n  width: 5px;\n}\n.cropper-point.point-e {\n  cursor: ew-resize;\n  margin-top: -3px;\n  right: -3px;\n  top: 50%;\n}\n.cropper-point.point-n {\n  cursor: ns-resize;\n  left: 50%;\n  margin-left: -3px;\n  top: -3px;\n}\n.cropper-point.point-w {\n  cursor: ew-resize;\n  left: -3px;\n  margin-top: -3px;\n  top: 50%;\n}\n.cropper-point.point-s {\n  bottom: -3px;\n  cursor: s-resize;\n  left: 50%;\n  margin-left: -3px;\n}\n.cropper-point.point-ne {\n  cursor: nesw-resize;\n  right: -3px;\n  top: -3px;\n}\n.cropper-point.point-nw {\n  cursor: nwse-resize;\n  left: -3px;\n  top: -3px;\n}\n.cropper-point.point-sw {\n  bottom: -3px;\n  cursor: nesw-resize;\n  left: -3px;\n}\n.cropper-point.point-se {\n  bottom: -3px;\n  cursor: nwse-resize;\n  height: 20px;\n  opacity: 1;\n  right: -3px;\n  width: 20px;\n}\n@media (min-width: 768px) {\n  .cropper-point.point-se {\n    height: 15px;\n    width: 15px;\n  }\n}\n@media (min-width: 992px) {\n  .cropper-point.point-se {\n    height: 10px;\n    width: 10px;\n  }\n}\n@media (min-width: 1200px) {\n  .cropper-point.point-se {\n    height: 5px;\n    opacity: 0.75;\n    width: 5px;\n  }\n}\n.cropper-point.point-se::before {\n  background-color: #39f;\n  bottom: -50%;\n  content: ' ';\n  display: block;\n  height: 200%;\n  opacity: 0;\n  position: absolute;\n  right: -50%;\n  width: 200%;\n}\n.cropper-invisible {\n  opacity: 0;\n}\n.cropper-bg {\n  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC\");\n}\n.cropper-hide {\n  display: block;\n  height: 0;\n  position: absolute;\n  width: 0;\n}\n.cropper-hidden {\n  display: none !important;\n}\n.cropper-move {\n  cursor: move;\n}\n.cropper-crop {\n  cursor: crosshair;\n}\n.cropper-disabled .cropper-drag-box,\n.cropper-disabled .cropper-face,\n.cropper-disabled .cropper-line,\n.cropper-disabled .cropper-point {\n  cursor: not-allowed;\n}\n", Ei, Di = 2 * 1024 * 1024, Oi = new Set([
	"image/png",
	"image/jpeg",
	"image/webp"
]), ki = 512, Ai = /* @__PURE__ */ "👶.🧒.👧.🧑.👦.👩.👨.🧓.👴.👵.🐶.🐱.🐻.🐼.🐨.🦊.🦁.🐯.🐸.🦄.🌟.⭐.🌈.🌸.🌺.🌻.🍀.🎈.🎨.🎯.🏃.⚽.🎸.🎤.📚.🎮.🏆.❤️.💙.💚".split("."), ji = (Ei = class extends H {
	constructor(...e) {
		super(...e), this._mode = "emoji", this._selectedEmoji = null, this._sourceUrl = null, this._error = null, this._submitting = !1, this._cropper = null;
	}
	_close() {
		this.dispatchEvent(new CustomEvent("close"));
	}
	_selectEmoji(e) {
		this._selectedEmoji = e, this._error = null;
	}
	_onFileChange(e) {
		var t;
		let n = e.target, r = (t = n.files) == null ? void 0 : t[0];
		if (n.value = "", r) {
			if (!Oi.has(r.type)) {
				this._error = "Only PNG, JPEG, and WebP images are accepted.";
				return;
			}
			if (r.size > Di) {
				this._error = "Image must be 2 MB or smaller.";
				return;
			}
			this._error = null, this._setSource(URL.createObjectURL(r));
		}
	}
	_setSource(e) {
		this._cropper && (this._cropper.destroy(), this._cropper = null), this._sourceUrl && URL.revokeObjectURL(this._sourceUrl), this._sourceUrl = e;
	}
	_onCropImageLoad() {
		let e = this._cropImage;
		e && (this._cropper && this._cropper.destroy(), this._cropper = new wi.default(e, {
			aspectRatio: 1,
			viewMode: 1,
			dragMode: "move",
			autoCropArea: .9,
			background: !1,
			cropBoxResizable: !0,
			cropBoxMovable: !0,
			toggleDragModeOnDblclick: !1,
			guides: !1,
			center: !1
		}));
	}
	_clearPickedImage() {
		this._setSource(null), this._error = null;
	}
	async _submit() {
		if (!this._submitting) {
			if (this._error = null, this._mode === "emoji") {
				if (!this._selectedEmoji) {
					this._error = "Pick an emoji first.";
					return;
				}
				this._submitting = !0;
				try {
					await hi(this.hass, this.memberSlug, this._selectedEmoji), this.dispatchEvent(new CustomEvent("avatar-changed", { detail: { avatar: this._selectedEmoji } })), this._close();
				} catch (e) {
					this._error = e instanceof Error ? e.message : String(e);
				} finally {
					this._submitting = !1;
				}
				return;
			}
			if (!this._sourceUrl || !this._cropper) {
				this._error = "Pick an image first.";
				return;
			}
			this._submitting = !0;
			try {
				let e = await this._getCroppedFile();
				await mi(this.hass, this.memberSlug, e), this.dispatchEvent(new CustomEvent("avatar-changed")), this._close();
			} catch (e) {
				this._error = e instanceof Error ? e.message : String(e);
			} finally {
				this._submitting = !1;
			}
		}
	}
	_getCroppedFile() {
		return new Promise((e, t) => {
			if (!this._cropper) {
				t(/* @__PURE__ */ Error("Cropper not initialized"));
				return;
			}
			let n = this._cropper.getCroppedCanvas({
				width: ki,
				height: ki,
				imageSmoothingQuality: "high"
			});
			if (!n) {
				t(/* @__PURE__ */ Error("Failed to crop image"));
				return;
			}
			n.toBlob((n) => {
				if (!n) {
					t(/* @__PURE__ */ Error("Failed to encode cropped image"));
					return;
				}
				e(new File([n], "avatar.jpg", { type: "image/jpeg" }));
			}, "image/jpeg", .9);
		});
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._setSource(null);
	}
	render() {
		return L`
      <div class="backdrop" @click=${(e) => {
			e.target === e.currentTarget && this._close();
		}}>
        <div class="modal" @click=${(e) => e.stopPropagation()}>
          <div class="modal-header">
            <span class="modal-title">Change avatar — ${this.memberName}</span>
            <button class="close-btn" @click=${this._close}>✕</button>
          </div>

          <div class="mode-tabs">
            <button
              class="mode-tab ${this._mode === "emoji" ? "active" : ""}"
              @click=${() => {
			this._mode = "emoji", this._error = null;
		}}
            >Emoji</button>
            <button
              class="mode-tab ${this._mode === "upload" ? "active" : ""}"
              @click=${() => {
			this._mode = "upload", this._error = null;
		}}
            >Upload photo</button>
          </div>

          ${this._mode === "emoji" ? this._renderEmojiMode() : this._renderUploadMode()}

          ${this._error ? L`<div class="error-msg">${this._error}</div>` : ""}

          <div class="actions">
            <button class="btn btn-secondary" @click=${this._close}>Cancel</button>
            <button
              class="btn btn-primary"
              ?disabled=${this._submitting}
              @click=${this._submit}
            >${this._submitting ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    `;
	}
	_renderEmojiMode() {
		return L`
      <div class="emoji-grid">
        ${Ai.map((e) => L`
            <button
              class="emoji-btn ${this._selectedEmoji === e ? "selected" : ""}"
              @click=${() => this._selectEmoji(e)}
              title=${e}
            >${e}</button>
          `)}
      </div>
    `;
	}
	_renderUploadMode() {
		return this._sourceUrl ? L`
        <div class="upload-area">
          <div class="crop-stage">
            <img
              id="crop-image"
              src=${this._sourceUrl}
              alt="Crop preview"
              @load=${this._onCropImageLoad}
            />
          </div>
          <div class="crop-actions">
            <button class="link-btn" @click=${this._clearPickedImage}>Choose different image</button>
            <span class="crop-hint">Drag to position · drag corners to resize</span>
          </div>
        </div>
      ` : L`
      <div class="upload-area">
        <div class="picker">
          <button type="button" class="picker-button" @click=${this._openFilePicker}>Add picture</button>
          <span>Click the button above to choose an image.</span>
          <span>Supports PNG, JPEG, or WebP (max 2 MB).</span>
        </div>
        <input
          type="file"
          id="avatar-file-input"
          accept="image/png,image/jpeg,image/webp"
          @change=${this._onFileChange}
        />
      </div>
    `;
	}
	_openFilePicker() {
		let e = this.renderRoot.querySelector("#avatar-file-input");
		e == null || e.click();
	}
}, Ei.styles = [
	K,
	ae(Ti),
	M`
      :host {
        display: block;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .modal {
        background: var(--card-background-color, #fff);
        border-radius: var(--lucarne-radius-lg);
        padding: var(--lucarne-spacing-lg);
        width: min(420px, 92vw);
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-md);
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .modal-title {
        font-size: var(--lucarne-fs-lg);
        font-weight: 600;
        color: var(--lucarne-on-surface);
      }
      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        color: var(--lucarne-on-surface-muted);
        padding: 4px;
      }
      .mode-tabs {
        display: flex;
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }
      .mode-tab {
        flex: 1;
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        color: var(--lucarne-on-surface-muted);
        transition: all 0.15s;
      }
      .mode-tab.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 600;
      }
      .emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 4px;
      }
      .emoji-btn {
        background: none;
        border: 1px solid transparent;
        border-radius: var(--lucarne-radius-sm);
        font-size: 1.4rem;
        cursor: pointer;
        padding: 4px;
        text-align: center;
        transition: background 0.1s;
      }
      .emoji-btn:hover {
        background: rgba(0,0,0,0.05);
      }
      .emoji-btn.selected {
        border-color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
      }
      .upload-area {
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-sm);
      }
      .picker {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-lg);
        border: 2px dashed rgba(0,0,0,0.18);
        border-radius: var(--lucarne-radius-md);
        text-align: center;
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
      }
      .picker-button {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
        border-radius: 999px;
        border: 1px solid var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.08);
        color: var(--primary-color);
        font-weight: 600;
        cursor: pointer;
      }
      input[type='file'] {
        display: none;
      }
      .crop-stage {
        position: relative;
        width: 100%;
        /* cropperjs needs a fixed-size container so it can compute layout. */
        height: 320px;
        background: #000;
        border-radius: var(--lucarne-radius-md);
        overflow: hidden;
      }
      .crop-stage img {
        display: block;
        max-width: 100%;
      }
      /* Round preview overlay so the user sees how the avatar will look. */
      .crop-stage .cropper-view-box,
      .crop-stage .cropper-face {
        border-radius: 50%;
      }
      .crop-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
      }
      .crop-hint {
        font-size: var(--lucarne-fs-xs);
        color: var(--lucarne-on-surface-muted);
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        padding: 0;
      }
      .error-msg {
        color: var(--error-color, #b00020);
        font-size: var(--lucarne-fs-sm);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .actions {
        display: flex;
        gap: var(--lucarne-spacing-sm);
        justify-content: flex-end;
        margin-top: var(--lucarne-spacing-xs);
      }
      .btn {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-lg);
        border-radius: var(--lucarne-radius-sm);
        border: none;
        cursor: pointer;
        font-size: var(--lucarne-fs-sm);
        font-weight: 500;
        transition: opacity 0.15s;
      }
      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-primary {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .btn-secondary {
        background: transparent;
        border: 1px solid rgba(0,0,0,0.2);
        color: var(--lucarne-on-surface);
      }
    `
], Ei);
q([W({ attribute: !1 })], ji.prototype, "hass", void 0), q([W()], ji.prototype, "memberSlug", void 0), q([W()], ji.prototype, "memberName", void 0), q([G()], ji.prototype, "_mode", void 0), q([G()], ji.prototype, "_selectedEmoji", void 0), q([G()], ji.prototype, "_sourceUrl", void 0), q([G()], ji.prototype, "_error", void 0), q([G()], ji.prototype, "_submitting", void 0), q([ct("#crop-image")], ji.prototype, "_cropImage", void 0), ji = q([U("lucarne-avatar-upload-modal")], ji);
//#endregion
//#region src/editors/lucarne-chores-card-editor.ts
var Mi, Ni = (Mi = class extends H {
	constructor(...e) {
		super(...e), this._familyState = null, this._avatarModalMember = null;
	}
	setConfig(e) {
		this._config = e;
	}
	connectedCallback() {
		super.connectedCallback(), this.hass && !this._unsubFamily && (this._unsubFamily = Et(this.hass, (e) => {
			this._familyState = e;
		}));
	}
	updated(e) {
		super.updated(e), e.has("hass") && this.hass && !this._unsubFamily && (this._unsubFamily = Et(this.hass, (e) => {
			this._familyState = e;
		}));
	}
	disconnectedCallback() {
		var e;
		super.disconnectedCallback(), (e = this._unsubFamily) == null || e.call(this), this._unsubFamily = void 0;
	}
	_fire(e) {
		let t = { ...e };
		delete t.kids, Array.isArray(t.members) || (t.members = []), Rn(this, "config-changed", { config: t });
	}
	_membersModel() {
		var e, t, n;
		let r = [...((e = this._familyState) == null ? void 0 : e.members) ?? [], St], i = new Map(r.map((e) => [e.slug, e])), a = ((t = this._config) == null ? void 0 : t.members) ?? [], o = new Set(a), s = [...a.filter((e) => i.has(e)), ...r.filter((e) => !o.has(e.slug)).map((e) => e.slug)], c = new Set(((n = this._config) == null ? void 0 : n.hidden_members) ?? []), l = /* @__PURE__ */ new Set();
		for (let e of s) (c.has(e) || !o.has(e)) && l.add(e);
		return {
			ordered: s.map((e) => i.get(e)),
			hidden: l
		};
	}
	_commitMembers(e, t) {
		let n = { ...this._config };
		n.members = e, t.size ? n.hidden_members = [...t] : delete n.hidden_members, this._fire(n);
	}
	_titleChanged(e) {
		let t = e.target.value;
		this._fire({
			...this._config,
			title: t || void 0
		});
	}
	_toggleVisibility(e) {
		let { ordered: t, hidden: n } = this._membersModel(), r = new Set(n);
		r.has(e) ? r.delete(e) : r.add(e), this._commitMembers(t.map((e) => e.slug), r);
	}
	_onMembersReorder(e) {
		let { hidden: t } = this._membersModel();
		this._commitMembers(e, t);
	}
	_toggleChanged(e, t) {
		let n = t.target.checked;
		this._fire({
			...this._config,
			[e]: n
		});
	}
	_autoScrollChanged(e) {
		let t = e.target.checked;
		this._fire({
			...this._config,
			auto_scroll: t
		});
	}
	_scrollTimeChanged(e, t) {
		let n = t.target.value;
		this._fire({
			...this._config,
			[e]: n || void 0
		});
	}
	_renderMemberContent(e, t) {
		return L`
      <div class="member-content ${t ? "hidden-member" : ""}" slot=${e.slug} data-slug=${e.slug}>
        <div class="member-avatar">
          ${e.avatar && e.avatar.startsWith("/local/") ? L`<img src=${e.avatar} alt=${e.name} style="width:100%;height:100%;object-fit:cover;" />` : L`${e.avatar ?? e.name[0]}`}
        </div>
        <span class="member-name">${e.name}</span>
        <button
          class="icon-btn visibility-btn"
          type="button"
          aria-label="${t ? "Show" : "Hide"} ${e.name} on the card"
          title="${t ? "Show on card" : "Hide from card"}"
          @click=${() => this._toggleVisibility(e.slug)}
        >
          <ha-icon icon=${t ? "mdi:eye-off-outline" : "mdi:eye-outline"}></ha-icon>
        </button>
        ${e.slug === "household" ? "" : L`<button
              class="icon-btn change-avatar-btn"
              type="button"
              title="Edit avatar"
              aria-label="Edit avatar for ${e.name}"
              @click=${() => {
			this._avatarModalMember = e;
		}}
            >
              <ha-icon icon="mdi:pencil-outline"></ha-icon>
            </button>`}
      </div>
    `;
	}
	render() {
		if (!this._config) return L``;
		if (this._familyState !== null && this._familyState.integrationError !== null) return L`
        <div class="error-block">
          Install the Lucarne Family integration first.
          <a href="/config/integrations/dashboard#search=lucarne" target="_blank"
            >Open Integrations</a
          >
        </div>
      `;
		if (this._familyState === null) return L`<div class="loading">Loading members…</div>`;
		let { ordered: e, hidden: t } = this._membersModel(), n = e.map((e) => ({
			key: e.slug,
			label: e.name
		}));
		return L`
      <div class="section-label">General</div>
      <input
        id="ed-title"
        type="text"
        placeholder="Card title (default: Chores)"
        .value=${this._config.title ?? ""}
        @change=${this._titleChanged}
      />

      <div class="section-label">Members</div>
      <lucarne-reorder-list
        label="Members (drag to reorder, eye to show or hide)"
        .items=${n}
        @reorder=${(e) => this._onMembersReorder(e.detail.order)}
      >
        ${e.map((e) => this._renderMemberContent(e, t.has(e.slug)))}
      </lucarne-reorder-list>

      ${this._avatarModalMember ? L`<lucarne-avatar-upload-modal
            .hass=${this.hass}
            .memberSlug=${this._avatarModalMember.slug}
            .memberName=${this._avatarModalMember.name}
            @close=${() => {
			this._avatarModalMember = null;
		}}
            @avatar-changed=${() => {
			this._avatarModalMember = null;
		}}
          ></lucarne-avatar-upload-modal>` : ""}

      <div class="section-label">Display</div>
      ${[
			["show_routines", "Show routines"],
			["show_tasks", "Show tasks"],
			["show_streak", "Show streak"],
			["hide_names", "Hide names"]
		].map(([e, t]) => L`
          <div class="toggle-row">
            <input
              type="checkbox"
              id="ed-${e}"
              .checked=${this._config[e] ?? e !== "hide_names"}
              @change=${(t) => this._toggleChanged(e, t)}
            />
            <label for="ed-${e}">${t}</label>
          </div>
        `)}

      <div class="section-label">Auto-scroll</div>
      <div class="toggle-row">
        <input
          type="checkbox"
          id="ed-auto_scroll"
          .checked=${this._config.auto_scroll ?? !0}
          @change=${this._autoScrollChanged}
        />
        <label for="ed-auto_scroll">Scroll columns to the current time of day</label>
      </div>
      <div class="time-row">
        <label for="ed-afternoon_start">Afternoon starts at</label>
        <input
          type="time"
          id="ed-afternoon_start"
          ?disabled=${!(this._config.auto_scroll ?? !0)}
          .value=${this._config.afternoon_start ?? "12:00"}
          @change=${(e) => this._scrollTimeChanged("afternoon_start", e)}
        />
      </div>
      <div class="time-row">
        <label for="ed-night_start">Night starts at</label>
        <input
          type="time"
          id="ed-night_start"
          ?disabled=${!(this._config.auto_scroll ?? !0)}
          .value=${this._config.night_start ?? "19:00"}
          @change=${(e) => this._scrollTimeChanged("night_start", e)}
        />
      </div>
    `;
	}
}, Mi.styles = [K, M`
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-lg);
        box-sizing: border-box;
        width: 100%;
      }
      .section-label {
        font-size: var(--lucarne-fs-sm);
        font-weight: 600;
        color: var(--lucarne-on-surface-muted);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin: var(--lucarne-spacing-md) 0 var(--lucarne-spacing-xs);
      }
      .section-label:first-of-type {
        margin-top: 0;
      }
      /* Row content rendered inside the shared <lucarne-reorder-list>. */
      .member-content {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        min-width: 0;
      }
      .member-content.hidden-member .member-avatar,
      .member-content.hidden-member .member-name {
        opacity: 0.45;
      }
      .member-name {
        flex: 1;
        min-width: 0;
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .member-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(0, 0, 0, 0.1);
        flex-shrink: 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }
      .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: var(--lucarne-on-surface-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--lucarne-radius-sm);
        flex-shrink: 0;
      }
      .icon-btn:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--lucarne-on-surface);
      }
      .icon-btn ha-icon {
        --mdc-icon-size: 20px;
        width: 20px;
        height: 20px;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: var(--lucarne-spacing-sm);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .toggle-row label {
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        cursor: pointer;
        flex: 1;
      }
      /* Custom checkbox: the native control follows the OS color-scheme and
         renders as a black box on a light HA theme when the OS is dark. Render
         it ourselves from theme tokens so it matches the card surface + accent. */
      input[type='checkbox'] {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        margin: 0;
        flex-shrink: 0;
        position: relative;
        cursor: pointer;
        border: 2px solid var(--lucarne-on-surface-muted, #727272);
        border-radius: 4px;
        background: var(--lucarne-surface, var(--ha-card-background, #fff));
      }
      input[type='checkbox']:checked {
        background: var(--primary-color, #03a9f4);
        border-color: var(--primary-color, #03a9f4);
      }
      input[type='checkbox']:checked::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
      input[type='checkbox']:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 1px;
      }
      input[type='text'] {
        width: 100%;
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: var(--lucarne-radius-sm);
        font-size: var(--lucarne-fs-md);
        box-sizing: border-box;
      }
      .time-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--lucarne-spacing-md);
        padding: var(--lucarne-spacing-xs) 0;
      }
      .time-row label {
        font-size: var(--lucarne-fs-md);
        color: var(--lucarne-on-surface);
        flex: 1;
      }
      /* Without an explicit color-scheme the native time control paints itself in
         the OS scheme — a dark box on the (light) lucarne theme. Pin it to the
         theme surface + tokens so the field, its digits, and the clock glyph match
         the rest of the editor instead of following the OS. */
      input[type='time'] {
        padding: var(--lucarne-spacing-sm) var(--lucarne-spacing-md);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: var(--lucarne-radius-sm);
        font-size: var(--lucarne-fs-md);
        box-sizing: border-box;
        color-scheme: light;
        background: var(--lucarne-surface, var(--ha-card-background, #fff));
        color: var(--lucarne-on-surface, #212121);
      }
      input[type='time']:disabled {
        opacity: 0.5;
      }
      .loading {
        color: var(--lucarne-on-surface-muted);
        font-size: var(--lucarne-fs-sm);
        text-align: center;
        padding: var(--lucarne-spacing-lg);
      }
      .error-block {
        padding: var(--lucarne-spacing-md);
        color: var(--lucarne-on-surface);
        font-size: var(--lucarne-fs-sm);
        display: flex;
        flex-direction: column;
        gap: var(--lucarne-spacing-xs);
      }
      .error-block a {
        color: var(--primary-color);
      }
    `], Mi);
//#endregion
//#region src/index.ts
q([W({ attribute: !1 })], Ni.prototype, "hass", void 0), q([G()], Ni.prototype, "_config", void 0), q([G()], Ni.prototype, "_familyState", void 0), q([G()], Ni.prototype, "_avatarModalMember", void 0), Ni = q([U("lucarne-chores-card-editor")], Ni), re();
//#endregion
