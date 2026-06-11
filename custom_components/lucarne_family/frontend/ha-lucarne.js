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
}) : a, n)), l = "ha-lucarne", u = "lucarne_error_", d = 6e4, f = null, p = !1, m = !1, h = /* @__PURE__ */ new Map(), g = null, _ = null;
function v(e, t) {
	e && (f = e), t && (p = !0);
}
function y(e) {
	if (e instanceof Error) {
		let t = (e.stack ?? "").split("\n")[1]?.trim() ?? "";
		return `${e.name}: ${e.message} @ ${t}`;
	}
	return String(e);
}
function ee(e, t) {
	return !!(t && t.includes(l) || e instanceof Error && (e.stack ?? "").includes(l));
}
function te(e) {
	return e instanceof Error ? (e.stack ?? `${e.name}: ${e.message}`).split("\n").slice(0, 6).join("\n") : String(e);
}
function ne(e) {
	let t = 5381;
	for (let n = 0; n < e.length; n++) t = (t << 5) + t + e.charCodeAt(n) | 0;
	return (t >>> 0).toString(36);
}
function b() {
	return typeof performance < "u" && typeof performance.now == "function" ? performance.now() : Date.now();
}
function x(e, t) {
	try {
		let n = y(e);
		if (console.error(`[lucarne] card error in ${t}:`, e), !p || !f) return;
		let r = b(), i = h.get(n);
		if (i !== void 0 && r - i < d) return;
		h.set(n, r), f.callService("persistent_notification", "create", {
			notification_id: u + ne(n),
			title: `Lucarne card error (${t})`,
			message: [
				"```",
				te(e),
				"```"
			].join("\n")
		}).catch(() => {});
	} catch {}
}
function S() {
	m || typeof window > "u" || typeof window.addEventListener != "function" || (m = !0, g = (e) => {
		ee(e.error, e.filename) && x(e.error ?? Error(e.message), "window.onerror");
	}, _ = (e) => {
		ee(e.reason) && x(e.reason, "unhandledrejection");
	}, window.addEventListener("error", g), window.addEventListener("unhandledrejection", _));
}
//#endregion
//#region node_modules/@lit/reactive-element/css-tag.js
var C = globalThis, w = C.ShadowRoot && (C.ShadyCSS === void 0 || C.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, T = Symbol(), E = /* @__PURE__ */ new WeakMap(), D = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== T) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (w && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = E.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && E.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, O = (e) => new D(typeof e == "string" ? e : e + "", void 0, T), k = (e, ...t) => new D(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, T), A = (e, t) => {
	if (w) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = C.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, j = w ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return O(t);
})(e) : e, { is: M, defineProperty: re, getOwnPropertyDescriptor: ie, getOwnPropertyNames: ae, getOwnPropertySymbols: oe, getPrototypeOf: se } = Object, ce = globalThis, le = ce.trustedTypes, ue = le ? le.emptyScript : "", de = ce.reactiveElementPolyfillSupport, fe = (e, t) => e, pe = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ue : null;
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
}, me = (e, t) => !M(e, t), he = {
	attribute: !0,
	type: String,
	converter: pe,
	reflect: !1,
	useDefault: !1,
	hasChanged: me
};
Symbol.metadata ??= Symbol("metadata"), ce.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var ge = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = he) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && re(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = ie(this.prototype, e) ?? {
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
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? he;
	}
	static _$Ei() {
		if (this.hasOwnProperty(fe("elementProperties"))) return;
		let e = se(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(fe("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(fe("properties"))) {
			let e = this.properties, t = [...ae(e), ...oe(e)];
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
			for (let e of n) t.unshift(j(e));
		} else e !== void 0 && t.push(j(e));
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
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return A(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? pe : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? pe : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? me)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
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
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
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
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
ge.elementStyles = [], ge.shadowRootOptions = { mode: "open" }, ge[fe("elementProperties")] = /* @__PURE__ */ new Map(), ge[fe("finalized")] = /* @__PURE__ */ new Map(), de?.({ ReactiveElement: ge }), (ce.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var _e = globalThis, ve = (e) => e, ye = _e.trustedTypes, be = ye ? ye.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, xe = "$lit$", Se = `lit$${Math.random().toFixed(9).slice(2)}$`, Ce = "?" + Se, we = `<${Ce}>`, Te = document, Ee = () => Te.createComment(""), De = (e) => e === null || typeof e != "object" && typeof e != "function", Oe = Array.isArray, ke = (e) => Oe(e) || typeof e?.[Symbol.iterator] == "function", Ae = "[ 	\n\f\r]", je = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Me = /-->/g, Ne = />/g, Pe = RegExp(`>|${Ae}(?:([^\\s"'>=/]+)(${Ae}*=${Ae}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Fe = /'/g, N = /"/g, Ie = /^(?:script|style|textarea|title)$/i, Le = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), P = Le(1), F = Le(2), I = Symbol.for("lit-noChange"), L = Symbol.for("lit-nothing"), Re = /* @__PURE__ */ new WeakMap(), ze = Te.createTreeWalker(Te, 129);
function R(e, t) {
	if (!Oe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return be === void 0 ? t : be.createHTML(t);
}
var z = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = je;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === je ? c[1] === "!--" ? o = Me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = Pe) : (Ie.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = Pe) : o = Ne : o === Pe ? c[0] === ">" ? (o = i ?? je, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? Pe : c[3] === "\"" ? N : Fe) : o === N || o === Fe ? o = Pe : o === Me || o === Ne ? o = je : (o = Pe, i = void 0);
		let d = o === Pe && e[t + 1].startsWith("/>") ? " " : "";
		a += o === je ? n + we : l >= 0 ? (r.push(s), n.slice(0, l) + xe + n.slice(l) + Se + d) : n + Se + (l === -2 ? t : d);
	}
	return [R(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Be = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = z(t, n);
		if (this.el = e.createElement(l, r), ze.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = ze.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(xe)) {
					let t = u[o++], n = i.getAttribute(e).split(Se), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? B : r[1] === "?" ? Ge : r[1] === "@" ? Ke : We
					}), i.removeAttribute(e);
				} else e.startsWith(Se) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Ie.test(i.tagName)) {
					let e = i.textContent.split(Se), t = e.length - 1;
					if (t > 0) {
						i.textContent = ye ? ye.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], Ee()), ze.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], Ee());
					}
				}
			} else if (i.nodeType === 8) if (i.data === Ce) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(Se, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += Se.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = Te.createElement("template");
		return n.innerHTML = e, n;
	}
};
function Ve(e, t, n = e, r) {
	if (t === I) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = De(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = Ve(e, i._$AS(e, t.values), i, r)), t;
}
var He = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? Te).importNode(t, !0);
		ze.currentNode = r;
		let i = ze.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ue(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new qe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = ze.nextNode(), a++);
		}
		return ze.currentNode = Te, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ue = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = L, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = Ve(this, e, t), De(e) ? e === L || e == null || e === "" ? (this._$AH !== L && this._$AR(), this._$AH = L) : e !== this._$AH && e !== I && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? ke(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== L && De(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Te.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Be.createElement(R(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new He(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Re.get(e.strings);
		return t === void 0 && Re.set(e.strings, t = new Be(e)), t;
	}
	k(t) {
		Oe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(Ee()), this.O(Ee()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ve(e).nextSibling;
			ve(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, We = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = L, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = L;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = Ve(this, e, t, 0), a = !De(e) || e !== this._$AH && e !== I, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = Ve(this, r[n + o], t, o), s === I && (s = this._$AH[o]), a ||= !De(s) || s !== this._$AH[o], s === L ? e = L : e !== L && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === L ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, B = class extends We {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === L ? void 0 : e;
	}
}, Ge = class extends We {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== L);
	}
}, Ke = class extends We {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = Ve(this, e, t, 0) ?? L) === I) return;
		let n = this._$AH, r = e === L && n !== L || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== L && (n === L || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, qe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		Ve(this, e);
	}
}, Je = _e.litHtmlPolyfillSupport;
Je?.(Be, Ue), (_e.litHtmlVersions ??= []).push("3.3.3");
var Ye = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Ue(t.insertBefore(Ee(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Xe = globalThis, V = class extends ge {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ye(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return I;
	}
};
V._$litElement$ = !0, V.finalized = !0, Xe.litElementHydrateSupport?.({ LitElement: V });
var Ze = Xe.litElementPolyfillSupport;
Ze?.({ LitElement: V }), (Xe.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var H = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, Qe = {
	attribute: !0,
	type: String,
	converter: pe,
	reflect: !1,
	hasChanged: me
}, U = (e = Qe, t, n) => {
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
	return (t, n) => typeof n == "object" ? U(e, t, n) : ((e, t, n) => {
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
var $e = (e, t, n) => (n.configurable = !0, n.enumerable = !0, Reflect.decorate && typeof t != "object" && Object.defineProperty(e, t, n), n);
//#endregion
//#region node_modules/@lit/reactive-element/decorators/query.js
function et(e, t) {
	return (n, r, i) => {
		let a = (t) => t.renderRoot?.querySelector(e) ?? null;
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
			return $e(n, r, { get() {
				let n = e.call(this);
				return n === void 0 && (n = a(this), (n !== null || this.hasUpdated) && t.call(this, n)), n;
			} });
		}
		return $e(n, r, { get() {
			return a(this);
		} });
	};
}
//#endregion
//#region src/shared/design-tokens.ts
var K = k`
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
`, tt = class e extends V {
	render() {
		let t = this;
		v(t.hass, t._config?.debug);
		try {
			return this.renderContent();
		} catch (t) {
			return x(t, this.tagName.toLowerCase()), e._errorFallback();
		}
	}
	static _errorFallback() {
		return P`
      <ha-card>
        <div style="padding:16px;color:var(--secondary-text-color);font-size:14px">
          This card hit an error and will recover on the next update.
        </div>
      </ha-card>
    `;
	}
};
//#endregion
//#region src/shared/ha-subscriptions.ts
function nt(e, t, n) {
	let r, i = !1;
	return e.connection.subscribeMessage((e) => {
		e.variables?.trigger?.to_state && n(e.variables.trigger.to_state);
	}, {
		type: "subscribe_trigger",
		trigger: {
			platform: "state",
			entity_id: t
		}
	}).then((e) => {
		i ? e() : r = e;
	}), () => {
		i = !0, r?.();
	};
}
function rt(e) {
	return typeof e == "string" ? e : e && typeof e == "object" ? e.dateTime ?? e.date ?? "" : "";
}
function it(e) {
	let t = {
		start: rt(e.start),
		end: rt(e.end),
		summary: e.summary ?? ""
	};
	return e.description && (t.description = e.description), e.location && (t.location = e.location), e.uid && (t.uid = e.uid), e.recurrence_id && (t.recurrence_id = e.recurrence_id), e.rrule && (t.rrule = e.rrule), t;
}
async function at(e, t, n, r) {
	let i = /* @__PURE__ */ new Set(), a = encodeURIComponent(n.toISOString()), o = encodeURIComponent(r.toISOString()), s = await Promise.all(t.map((t) => e.callApi("GET", `calendars/${encodeURIComponent(t)}?start=${a}&end=${o}`).then((e) => [t, e.map(it)]).catch((e) => (console.warn(`[lucarne] GET /api/calendars/${t} failed:`, e), i.add(t), [t, []]))));
	return {
		events: new Map(s),
		failed: i
	};
}
async function ot(e, t, n, r, i) {
	await e.connection.sendMessagePromise({
		type: "calendar/event/delete",
		entity_id: t,
		uid: n,
		recurrence_id: r,
		recurrence_range: i
	});
}
var st = 2;
function ct(e, t) {
	let n = e.states[t]?.attributes?.supported_features;
	return typeof n == "number" ? (n & st) !== 0 : !1;
}
function lt(e, t, n) {
	let r = async () => {
		try {
			n((await e.connection.sendMessagePromise({
				type: "call_service",
				domain: "todo",
				service: "get_items",
				service_data: {},
				target: { entity_id: t },
				return_response: !0
			}))?.response?.[t]?.items ?? []);
		} catch (e) {
			console.warn(`[lucarne] todo.get_items failed for ${t}:`, e), n([]);
		}
	};
	return r(), nt(e, t, () => r());
}
//#endregion
//#region src/shared/grid-preview-override.ts
function ut(e) {
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
function dt(e) {
	let t = e.parentElement;
	for (; t && !t.style.getPropertyValue("--column-size");) t = t.parentElement;
	return t?.parentElement ?? null;
}
function ft(e) {
	if (!ut(e)) return null;
	let t = dt(e);
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
var pt = {
	slug: "household",
	name: "Household",
	color: "var(--primary-color)",
	avatar: null,
	todo_entity_id: "todo.lucarne_household",
	streak_counter_id: ""
}, mt = 2e4, ht = [
	"lucarne_family_task_added",
	"lucarne_family_task_completed",
	"lucarne_family_task_deleted",
	"lucarne_family_task_metadata_updated",
	"lucarne_family_task_toggled",
	"lucarne_family_all_routines_done",
	"lucarne_family_member_updated",
	"lucarne_family_avatar_uploaded"
];
function gt(e, t, n) {
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
function _t(e, t) {
	let n = !1, r = [], i = /* @__PURE__ */ new Map(), a = [], o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), c = "", l = "", u = null, d = null, f = !1, p = null;
	function m() {
		if (n) return;
		let e = /* @__PURE__ */ new Map();
		for (let t of a) {
			let n = o.get(t.todo_entity_id) ?? [];
			e.set(t.slug, gt(n, t.slug, i));
		}
		let r = o.get("todo.lucarne_household") ?? [];
		e.set("household", gt(r, "household", i)), t({
			members: a,
			tasksByMember: e,
			streakByMember: new Map(s),
			taskMetadataByUid: new Map(i),
			resetTime: c,
			streakCheckTime: l,
			integrationError: p
		});
	}
	async function h() {
		if (!f) {
			f = !0;
			try {
				let t = await e.connection.sendMessagePromise({ type: "lucarne_family/get_family" });
				if (n) return;
				let u = /* @__PURE__ */ new Map();
				for (let e of t.task_metadata ?? []) {
					let t = [], n = e.rotation_owners;
					if (typeof n == "string" && n !== "") try {
						let e = JSON.parse(n);
						Array.isArray(e) && (t = e.map(String));
					} catch {}
					else Array.isArray(n) && (t = n.map(String));
					u.set(e.item_uid, {
						...e,
						rotation_owners: t
					});
				}
				i = u, c = t.reset_time ?? "", l = t.streak_check_time ?? "", a = (t.members ?? []).filter((e) => e.todo_entity_id ? !0 : (console.debug(`[lucarne] skipping member ${e.slug}: no todo_entity_id yet`), !1)), p = null, s = /* @__PURE__ */ new Map(), r.forEach((e) => e()), r.length = 0;
				for (let t of a) {
					let n = lt(e, t.todo_entity_id, (e) => {
						o.set(t.todo_entity_id, e), m();
					});
					if (r.push(n), t.streak_counter_id) {
						let n = e.states?.[t.streak_counter_id]?.state;
						if (n !== void 0) {
							let e = parseInt(n, 10);
							s.set(t.slug, isNaN(e) ? 0 : e);
						}
						let i = nt(e, t.streak_counter_id, (e) => {
							let n = parseInt(e.state, 10);
							s.set(t.slug, isNaN(n) ? 0 : n), m();
						});
						r.push(i);
					}
				}
				let d = lt(e, "todo.lucarne_household", (e) => {
					o.set("todo.lucarne_household", e), m();
				});
				r.push(d), m();
			} catch (e) {
				console.debug("[lucarne] get_family failed — integration may not be installed:", e), n || (p = e instanceof Error ? e : Error(String(e)), r.forEach((e) => e()), r.length = 0, a = [], i = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map(), o.clear(), c = "", l = "", m());
			} finally {
				f = !1;
			}
		}
	}
	function g() {
		u === null && (u = setTimeout(() => {
			u = null, h();
		}, 1e3));
	}
	function _() {
		d = setTimeout(() => {
			d = null, (typeof document < "u" && document.visibilityState === "hidden" ? Promise.resolve() : h()).finally(() => {
				n || _();
			});
		}, mt);
	}
	let v = () => {
		n || typeof document < "u" && document.visibilityState === "hidden" || h();
	};
	typeof document < "u" && document.addEventListener("visibilitychange", v), typeof window < "u" && window.addEventListener("pageshow", v);
	let y = [];
	for (let t of ht) e.connection.subscribeEvents(() => {
		g();
	}, t).then((e) => {
		n ? e() : y.push(e);
	}).catch((e) => {
		console.debug(`[lucarne] could not subscribe to ${t}:`, e);
	});
	return h(), _(), () => {
		n = !0, u !== null && clearTimeout(u), d !== null && clearTimeout(d), typeof document < "u" && document.removeEventListener("visibilitychange", v), typeof window < "u" && window.removeEventListener("pageshow", v), r.forEach((e) => e()), y.forEach((e) => e());
	};
}
//#endregion
//#region src/shared/strings.ts
var q = {
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
};
//#endregion
//#region \0@oxc-project+runtime@0.132.0/helpers/decorate.js
function J(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/components/agenda-strip.ts
function vt(e) {
	return e.length === 10 ? /* @__PURE__ */ new Date(e + "T00:00:00") : new Date(e);
}
function yt(e, t, n) {
	let r = new Date(t);
	r.setHours(0, 0, 0, 0);
	let i = new Date(r);
	return i.setDate(i.getDate() + n), e.filter((e) => vt(e.end) > r && vt(e.start) < i).sort((e, t) => vt(e.start).getTime() - vt(t.start).getTime());
}
function bt(e, t, n) {
	let r = e.getTime() - n.getTime();
	if (e <= n && n < t) return q.timePillNow;
	if (r > 0 && r < 3600 * 1e3) {
		let e = Math.round(r / 6e4);
		return q.timePillInMinutes(e);
	}
	if (r > 0 && r < 7200 * 1e3) {
		let e = Math.round(r / 36e5);
		return q.timePillInHours(e);
	}
	let i = e.toLocaleTimeString("en", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: !1
	});
	if (e.toDateString() === n.toDateString()) return i;
	let a = new Date(n);
	return a.setDate(n.getDate() + 1), e.toDateString() === a.toDateString() ? q.timePillTomorrow(i) : `${e.toLocaleDateString("en", { weekday: "short" })} ${i}`;
}
function xt(e) {
	return e.start.length === 10 && e.end.length === 10;
}
var St = class extends V {
	constructor(...e) {
		super(...e), this.events = [], this.calendarColors = /* @__PURE__ */ new Map(), this.windowDays = 1;
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	render() {
		let e = /* @__PURE__ */ new Date(), t = yt(this.events, e, this.windowDays);
		return t.length === 0 ? P`<div class="empty-state">${q.nothingOnCalendar}</div>` : P`
      ${t.map((t) => {
			let n = vt(t.start), r = vt(t.end), i = n <= e && e < r, a = !xt(t) && r <= e, o = xt(t) ? "all day" : bt(n, r, e), s = this._colorForEvent(t);
			return P`
          <div class="event-row ${a ? "past" : ""}">
            <div class="time-pill ${i ? "now" : ""}">
              ${i ? P`<span class="pulse-dot"></span>` : ""} ${o}
            </div>
            <div class="color-bar" style="background:${s}"></div>
            <div class="event-content">
              <div class="event-summary">${t.summary}</div>
              ${t.location ? P`<div class="event-secondary">${t.location}</div>` : ""}
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
};
J([W({ type: Array })], St.prototype, "events", void 0), J([W({ type: Object })], St.prototype, "calendarColors", void 0), J([W({ type: Number })], St.prototype, "windowDays", void 0), St = J([H("lucarne-agenda-strip")], St);
//#endregion
//#region src/shared/icons.ts
var Ct = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="4"/>
  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`, wt = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
</svg>`, Tt = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
  <line x1="8" y1="19" x2="8" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="19" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="19" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`, Et = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
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
</svg>`, Dt = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2v2M4.22 4.22l1.42 1.42M2 12h2M4.22 19.78l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="10" cy="10" r="3" fill="currentColor"/>
  <path d="M20 15h-1.26A6 6 0 1 0 8 20h12a4 4 0 0 0 0-8z" fill="currentColor" opacity="0.7"/>
</svg>`;
F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="7" r="4"/>
  <path d="M20 21a8 8 0 1 0-16 0"/>
</svg>`, F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"/>
</svg>`;
var Ot = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"/>
</svg>`, kt = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M3,12H7A5,5 0 0,1 12,7A5,5 0 0,1 17,12H21A1,1 0 0,1 22,13A1,1 0 0,1 21,14H3A1,1 0 0,1 2,13A1,1 0 0,1 3,12M15,12A3,3 0 0,0 12,9A3,3 0 0,0 9,12H15M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M12.71,16.3L15.82,19.41C16.21,19.8 16.21,20.43 15.82,20.82C15.43,21.21 14.8,21.21 14.41,20.82L12,18.41L9.59,20.82C9.2,21.21 8.57,21.21 8.18,20.82C7.79,20.43 7.79,19.8 8.18,19.41L11.29,16.3C11.5,16.1 11.74,16 12,16C12.26,16 12.5,16.1 12.71,16.3Z"/>
</svg>`, At = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"/>
</svg>`, jt = F`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z"/>
</svg>`, Mt = {
	sunny: Ct,
	"clear-night": Ct,
	cloudy: wt,
	fog: wt,
	hail: Tt,
	lightning: Tt,
	"lightning-rainy": Tt,
	partlycloudy: Dt,
	pouring: Tt,
	rainy: Tt,
	snowy: Et,
	"snowy-rainy": Et,
	windy: wt,
	"windy-variant": wt,
	exceptional: wt
};
function Nt(e) {
	return Mt[e] ?? Mt[e.toLowerCase()] ?? wt;
}
var Pt = {
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
function Ft(e) {
	return Pt[e.toLowerCase()] ?? "#8aa0b8";
}
//#endregion
//#region src/components/dressing-tip.ts
function It(e) {
	if (!e.length) return q.dressingTipDefault;
	let t = e[0];
	if (t.condition.toLowerCase().includes("snow")) return q.dressingTipBoots;
	let n = t.temperature, r;
	return r = n < 5 ? q.dressingTipHeavyCoat : n < 12 ? q.dressingTipCoatScarf : n < 18 ? q.dressingTipLightJacket : n < 24 ? q.dressingTipTShirt : q.dressingTipShorts, (t.precipitation_probability ?? 0) > 50 && (r += q.dressingTipUmbrella), r;
}
//#endregion
//#region src/components/weather-block.ts
var Lt = class extends V {
	constructor(...e) {
		super(...e), this.forecast = [];
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	render() {
		if (!this.weatherEntity) return P`<div class="empty-state">${q.addWeatherEntity}</div>`;
		let e = this.weatherEntity.attributes, t = e.temperature, n = e.temperature_unit ?? "°C", r = this.weatherEntity.state, i = this.forecast[0], a = this.forecast[1], o = It(this.forecast);
		return P`
      <div class="current">
        <span class="condition-icon" style="color: ${Ft(r)}">${Nt(r)}</span>
        <div class="temp-group">
          <div class="current-temp">${t === void 0 ? q.errorUnavailable : `${Math.round(t)}${n}`}</div>
          ${i ? P`<div class="high-low">
                ↑${Math.round(i.temperature)}${n}
                ${i.templow === void 0 ? "" : ` ↓${Math.round(i.templow)}${n}`}
              </div>` : ""}
        </div>
      </div>
      ${a ? P`
            <div class="tomorrow-row">
              <span class="tomorrow-icon" style="color: ${Ft(a.condition)}">${Nt(a.condition)}</span>
              <span>Tomorrow ↑${Math.round(a.temperature)}${n}${a.templow === void 0 ? "" : ` ↓${Math.round(a.templow)}${n}`}</span>
            </div>
          ` : ""}
      <div class="dressing-tip">
        <span class="dressing-label">Wear:</span>
        ${o}
      </div>
    `;
	}
};
J([W({ attribute: !1 })], Lt.prototype, "weatherEntity", void 0), J([W({ type: Array })], Lt.prototype, "forecast", void 0), Lt = J([H("lucarne-weather-block")], Lt);
//#endregion
//#region src/components/member-avatar.ts
var Rt = /^(?=.*[\p{Extended_Pictographic}\p{Regional_Indicator}])[\p{Extended_Pictographic}\p{Emoji_Component}\p{Emoji_Modifier}\p{Regional_Indicator}‍️]+$/u, zt = class extends V {
	constructor(...e) {
		super(...e), this.name = "", this.color = "#a8d8b9", this.avatar = null;
	}
	static {
		this.styles = k`
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
  `;
	}
	render() {
		let e = this.avatar;
		if (e && e.startsWith("/local/")) return P`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <img src="${e}" alt="${this.name}" />
        </div>
      `;
		if (e && Rt.test(e)) return P`
        <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
          <span class="emoji">${e}</span>
        </div>
      `;
		let t = this.name.trim().charAt(0) || "?";
		return P`
      <div class="avatar" style="background:${this.color}" aria-label="${this.name}'s avatar">
        <span class="initial">${t}</span>
      </div>
    `;
	}
};
J([W()], zt.prototype, "name", void 0), J([W()], zt.prototype, "color", void 0), J([W()], zt.prototype, "avatar", void 0), zt = J([H("lucarne-member-avatar")], zt);
//#endregion
//#region src/shared/rotation.ts
function Bt(e, t) {
	let n = /* @__PURE__ */ new Set(), r = [];
	for (let i of e) t.has(i) && !n.has(i) && (n.add(i), r.push(i));
	return r;
}
function Vt(e, t, n) {
	let r = Bt(e, n);
	return r.length === 0 ? null : r.includes(t) ? r[(r.indexOf(t) + 1) % r.length] : r[0];
}
//#endregion
//#region src/components/task-row.ts
var Ht = 500, Ut = class extends V {
	constructor(...e) {
		super(...e), this.memberColor = "#a8d8b9", this.compact = !1, this.members = [], this._pressTimer = null, this._longPressed = !1;
	}
	static {
		this.styles = k`
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
  `;
	}
	_onPointerDown(e) {
		this._longPressed = !1, this._pressTimer = setTimeout(() => {
			this._longPressed = !0, this.dispatchEvent(new CustomEvent("task-long-press", {
				detail: { task: this.task },
				bubbles: !0,
				composed: !0
			}));
		}, Ht), e.currentTarget.setPointerCapture(e.pointerId);
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
		if (!this.task) return P``;
		let e = this.task.status === "completed", t = this.task.metadata.icon, n = this.task.due, r = this.task.metadata.type === "rotating", i = null;
		if (r) {
			let e = this.task.metadata.rotation_owners ?? [], t = this.task.metadata.current_owner ?? "";
			if (e.length > 1) {
				let n = Vt(e, t, new Set(this.members.filter((e) => e.slug !== "household").map((e) => e.slug)));
				n && (i = this.members.find((e) => e.slug === n)?.name ?? n);
			}
		}
		return P`
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
        ${t ? P`<span class="icon">${t}</span>` : ""}
        <div class="middle">
          <span class="label ${e ? "done" : ""}">${this.task.summary}</span>
          ${i ? P`<span class="rotation-next">next: ${i}</span>` : ""}
        </div>
        ${r ? P`<span class="rotation-badge" aria-hidden="true">↻</span>` : ""}
        ${n ? P`<span class="due">${this._formatDue(n)}</span>` : ""}
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
};
J([W({ attribute: !1 })], Ut.prototype, "task", void 0), J([W()], Ut.prototype, "memberColor", void 0), J([W({
	type: Boolean,
	reflect: !0
})], Ut.prototype, "compact", void 0), J([W({ attribute: !1 })], Ut.prototype, "members", void 0), Ut = J([H("lucarne-task-row")], Ut);
//#endregion
//#region src/components/tasks-summary.ts
var Wt = "household";
function Gt(e) {
	return e.length === 10 ? /* @__PURE__ */ new Date(e + "T00:00:00") : new Date(e);
}
function Kt(e, t) {
	let n = new Date(t);
	n.setHours(0, 0, 0, 0);
	let r = new Date(n);
	r.setDate(r.getDate() + 1);
	let i = new Date(n);
	i.setDate(i.getDate() + 4);
	let a = (e) => {
		if (!e.due) return 3;
		let t = Gt(e.due);
		return t < n ? 0 : t < r ? 1 : t < i ? 2 : 4;
	};
	return [...e].sort((e, t) => {
		let n = a(e), r = a(t);
		if (n !== r) return n - r;
		if (n === 3) return e.summary.localeCompare(t.summary);
		let i = e.due ? Gt(e.due).getTime() : 0, o = t.due ? Gt(t.due).getTime() : 0;
		return i === o ? e.summary.localeCompare(t.summary) : i - o;
	});
}
function qt(e) {
	return {
		uid: e.uid,
		summary: e.summary,
		status: e.status,
		due: e.due ?? null,
		description: e.description ?? "",
		metadata: {
			item_uid: e.uid,
			member_slug: Wt,
			assignee_slug: "",
			type: "chore",
			recurrence: "",
			icon: "",
			source: "manual"
		}
	};
}
var Jt = class extends V {
	constructor(...e) {
		super(...e), this.items = [], this.integrationMode = !1, this.renderableTasks = [], this.members = [], this.limit = 5, this.refillOnComplete = !1, this._admitted = /* @__PURE__ */ new Set(), this._burned = /* @__PURE__ */ new Set(), this._windowKey = "";
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	_resolveVisible(e) {
		let t = /* @__PURE__ */ new Date(), n = Kt(e.filter((e) => e.status === "needs_action"), t), r = n.length;
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
		let e = this.integrationMode ? this.renderableTasks : this.items.map(qt), { visible: t, totalActive: n } = this._resolveVisible(e);
		return n === 0 ? P`
        <div class="empty-state">
          <span class="empty-icon">${Ot}</span>
          ${q.allDone}
        </div>
      ` : t.length === 0 ? P`
        <div class="empty-state">
          <span class="empty-icon">${Ot}</span>
          ${q.allDoneForNow}
        </div>
      ` : P`
      <div class="header">
        ${q.tasksTitle}
        <span class="count-badge">${n}</span>
      </div>
      <div class="task-list">${t.map((e) => this._renderTaskLine(e))}</div>
    `;
	}
	_renderTaskLine(e) {
		let t = this._ownerFor(e);
		return P`
      <div class="task-line">
        ${t ? this._renderOwnerAvatar(t) : ""}
        <lucarne-task-row
          compact
          .task=${e}
          .memberColor=${t?.color ?? "var(--primary-color)"}
        ></lucarne-task-row>
      </div>
    `;
	}
	_renderOwnerAvatar(e) {
		let t = e.avatar;
		if (t && t.startsWith("/local/")) return P`
        <div class="owner-avatar" style="background:${e.color}" title="${e.name}">
          <img src="${t}" alt="${e.name}" />
        </div>
      `;
		if (t && Rt.test(t)) return P`
        <div class="owner-avatar" style="background:${e.color}" title="${e.name}">
          <span>${t}</span>
        </div>
      `;
		let n = e.name.trim().charAt(0) || "?";
		return P`
      <div class="owner-avatar" style="background:${e.color}" title="${e.name}">
        <span class="initial">${n}</span>
      </div>
    `;
	}
	_ownerFor(e) {
		if (!this.integrationMode) return null;
		let t = e.metadata.member_slug;
		return !t || t === Wt ? null : this.members.find((e) => e.slug === t) ?? null;
	}
};
J([W({ type: Array })], Jt.prototype, "items", void 0), J([W({ type: String })], Jt.prototype, "todoEntityId", void 0), J([W({ type: Boolean })], Jt.prototype, "integrationMode", void 0), J([W({ attribute: !1 })], Jt.prototype, "renderableTasks", void 0), J([W({ attribute: !1 })], Jt.prototype, "members", void 0), J([W({ type: Number })], Jt.prototype, "limit", void 0), J([W({ type: Boolean })], Jt.prototype, "refillOnComplete", void 0), Jt = J([H("lucarne-tasks-summary")], Jt);
//#endregion
//#region src/components/presence-pills.ts
var Yt = class extends V {
	constructor(...e) {
		super(...e), this.entries = [];
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	render() {
		return P`
      ${this.entries.map((e) => P`
          <span class="pill ${e.isHome ? "home" : "away"}">
            <span class="dot"></span>
            ${e.name}
          </span>
        `)}
    `;
	}
};
J([W({ type: Array })], Yt.prototype, "entries", void 0), Yt = J([H("lucarne-presence-pills")], Yt);
//#endregion
//#region src/shared/recurrence.ts
var Xt = [
	"MO",
	"TU",
	"WE",
	"TH",
	"FR",
	"SA",
	"SU"
];
function Zt(e) {
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
		return t.every((e) => Xt.includes(e)) ? {
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
		return Xt.includes(r) ? {
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
function Qt(e) {
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
function $t(e) {
	let t = Zt(e);
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
		let e = en(t.dayOfMonth);
		return n === 1 ? `Monthly on the ${t.dayOfMonth}${e}` : `Every ${n} months on the ${t.dayOfMonth}${e}`;
	}
	if (t.mode === "monthly-nth") {
		let e = tn(t.nth), r = {
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
		], r = en(t.dayOfMonth);
		return n === 1 ? `Yearly on ${e[t.month]} ${t.dayOfMonth}${r}` : `Every ${n} years on ${e[t.month]} ${t.dayOfMonth}${r}`;
	}
	return "";
}
function en(e) {
	if (e >= 11 && e <= 13) return "th";
	switch (e % 10) {
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		default: return "th";
	}
}
function tn(e) {
	return e === -1 ? "last" : e === 1 ? "1st" : e === 2 ? "2nd" : e === 3 ? "3rd" : `${e}th`;
}
var nn = new Date(Date.UTC(1970, 0, 1));
function rn(e) {
	return Math.floor(Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()) / 864e5);
}
function an(e, t, n) {
	let r = e.getDate();
	if (e.getDay() !== n) return !1;
	if (t > 0) return Math.floor((r - 1) / 7) === t - 1;
	let i = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
	return Math.floor((i - r) / 7) === 0;
}
var on = {
	SU: 0,
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6
};
function sn(e, t = /* @__PURE__ */ new Date()) {
	if (e.mode === "none" || e.mode === "unknown") return !1;
	let n = "interval" in e && e.interval ? e.interval : 1, r = rn(t) - rn(nn);
	if (e.mode === "daily") return r % n === 0;
	if (e.mode === "weekly") {
		let i = t.getDay();
		return e.days.some((e) => on[e] === i) ? n === 1 ? !0 : Math.floor(r / 7) % n === 0 : !1;
	}
	if (e.mode === "monthly-date") return t.getDate() === e.dayOfMonth ? n === 1 ? !0 : ((t.getFullYear() - 1970) * 12 + t.getMonth()) % n === 0 : !1;
	if (e.mode === "monthly-nth") {
		let r = on[e.day];
		return an(t, e.nth, r) ? n === 1 ? !0 : ((t.getFullYear() - 1970) * 12 + t.getMonth()) % n === 0 : !1;
	}
	return e.mode === "yearly" ? t.getMonth() + 1 !== e.month || t.getDate() !== e.dayOfMonth ? !1 : n === 1 ? !0 : (t.getFullYear() - 1970) % n == 0 : !1;
}
//#endregion
//#region src/components/family-ready-pill.ts
var cn = class extends V {
	constructor(...e) {
		super(...e), this.members = [], this.tasksByMember = /* @__PURE__ */ new Map();
	}
	static {
		this.styles = [K, k`
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
    `];
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
			let i = (this.tasksByMember.get(r.slug) ?? []).filter((e) => e.metadata.type === "routine" && sn(Zt(e.metadata.recurrence), n));
			i.length !== 0 && (e++, i.every((e) => e.status === "completed") && t++);
		}
		return {
			readyCount: t,
			totalWithRoutines: e
		};
	}
	render() {
		let { readyCount: e, totalWithRoutines: t } = this._computeReadiness();
		if (t === 0) return P`
        <div class="pill none" @click=${this._handleClick}>
          <span class="icon">✓</span>
          ${q.noRoutinesToday}
        </div>
      `;
		let n = e === t;
		return P`
      <div class="pill ${n ? "all-done" : ""}" @click=${this._handleClick}>
        <span class="icon">${n ? "🎉" : "⏳"}</span>
        ${q.familyReady(e, t)}
      </div>
    `;
	}
};
J([W({ attribute: !1 })], cn.prototype, "members", void 0), J([W({ attribute: !1 })], cn.prototype, "tasksByMember", void 0), cn = J([H("lucarne-family-ready-pill")], cn);
//#endregion
//#region src/cards/lucarne-today-card.ts
var ln = [
	"calendar",
	"weather",
	"tasks"
];
function un(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e ?? []) ln.includes(r) && !t.has(r) && (t.add(r), n.push(r));
	for (let e of ln) t.has(e) || n.push(e);
	return n;
}
window.customCards = window.customCards || [], window.customCards.push({
	type: "lucarne-today-card",
	name: "Lucarne Today",
	description: "Family agenda + weather + tasks + presence",
	preview: !0
});
var dn = class extends tt {
	constructor(...e) {
		super(...e), this._calendarEvents = /* @__PURE__ */ new Map(), this._forecast = [], this._todoItems = [], this._familyState = null, this._fetchingForecast = !1, this._lastWeatherState = "";
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	setConfig(e) {
		if (!e.calendars || !Array.isArray(e.calendars) || e.calendars.length === 0) throw Error("lucarne-today-card: \"calendars\" must be a non-empty array");
		for (let t of e.calendars) if (!t.entity || !t.color) throw Error("lucarne-today-card: each calendar entry requires \"entity\" and \"color\"");
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
			title: q.today,
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
			this._previewOverrideRaf = void 0, this.isConnected && (this._previewOverride = ft(this));
		});
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._teardownSubscriptions(), this._previewOverrideRaf !== void 0 && (cancelAnimationFrame(this._previewOverrideRaf), this._previewOverrideRaf = void 0), this._previewOverride?.uninstall(), this._previewOverride = void 0;
	}
	_setupSubscriptions() {
		!this._config || !this.hass || (this._fetchCalendarEvents(), this._config.weather && this._fetchForecast(), this._calendarIntervalId = setInterval(() => {
			this._fetchCalendarEvents(), this._config?.weather && this._fetchForecast();
		}, 300 * 1e3), this._config.tasks && !this._config.household_tasks_from_integration && (this._todoUnsub = lt(this.hass, this._config.tasks, (e) => {
			this._todoItems = e;
		})), (this._config.household_tasks_from_integration || this._config.show_family_ready_pill || this._config.tasks) && (this._unsubFamily = _t(this.hass, (e) => {
			this._familyState = e;
		})));
	}
	_teardownSubscriptions() {
		clearInterval(this._calendarIntervalId), this._todoUnsub?.(), this._todoUnsub = void 0, this._unsubFamily?.(), this._unsubFamily = void 0, this._calendarIntervalId = void 0;
	}
	updated(e) {
		if (super.updated(e), !e.has("hass") || !this._config) return;
		if (!e.get("hass") && this.hass && !this._calendarIntervalId) {
			this._setupSubscriptions();
			return;
		}
		let t = this._config.weather;
		if (t) {
			let e = this.hass.states[t]?.state;
			e && e !== this._lastWeatherState && (this._lastWeatherState = e, this._fetchForecast());
		}
	}
	async _fetchCalendarEvents() {
		if (!this._config || !this.hass) return;
		let e = this._config.calendars.map((e) => e.entity), t = /* @__PURE__ */ new Date();
		t.setHours(0, 0, 0, 0);
		let n = new Date(Date.now() + 10080 * 60 * 1e3), { events: r } = await at(this.hass, e, t, n), i = /* @__PURE__ */ new Map();
		for (let [e, t] of r.entries()) i.set(e, t.map((t) => ({
			...t,
			uid: `${e}::${t.uid ?? t.summary}`
		})));
		this._calendarEvents = i;
	}
	async _fetchForecast() {
		if (!(this._fetchingForecast || !this._config?.weather || !this.hass)) {
			this._fetchingForecast = !0;
			try {
				let e = await this.hass.connection.sendMessagePromise({
					type: "call_service",
					domain: "weather",
					service: "get_forecasts",
					service_data: { type: "daily" },
					target: { entity_id: this._config.weather },
					return_response: !0
				});
				this._forecast = e?.response?.[this._config.weather]?.forecast ?? [];
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
		let e = /* @__PURE__ */ new Map();
		for (let t of this._config?.calendars ?? []) e.set(t.entity, t.color);
		return e;
	}
	get _householdTasks() {
		return this._familyState?.tasksByMember.get("household") ?? [];
	}
	get _familyMembers() {
		return this._familyState?.members ?? [];
	}
	get _familyTasksByMember() {
		return this._familyState?.tasksByMember ?? /* @__PURE__ */ new Map();
	}
	get _enrichedRawTasks() {
		if (!this._config?.tasks) return [];
		let e = this._familyState?.taskMetadataByUid ?? /* @__PURE__ */ new Map(), t = this._familyState?.members.find((e) => e.todo_entity_id === this._config.tasks)?.slug ?? "";
		return this._todoItems.map((n) => {
			let r = e.get(n.uid) ?? {
				item_uid: n.uid,
				member_slug: t,
				assignee_slug: "",
				type: "chore",
				recurrence: "",
				icon: "",
				source: "manual"
			};
			return {
				uid: n.uid,
				summary: n.summary,
				status: n.status,
				due: n.due ?? null,
				description: n.description ?? "",
				metadata: r
			};
		});
	}
	async _handleTaskToggle(e) {
		let { task: t } = e.detail;
		if (!this.hass) return;
		let n = t.status === "completed" ? "needs_action" : "completed", r = this._resolveTaskEntityId(t);
		r && await this.hass.callService("todo", "update_item", {
			item: t.uid,
			status: n
		}, { entity_id: r });
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
		if (this._config?.household_tasks_from_integration && this._familyState) {
			let t = e.metadata.member_slug;
			if (t === "household") return "todo.lucarne_household";
			let n = this._familyState.members.find((e) => e.slug === t);
			return n?.todo_entity_id ? n.todo_entity_id : void 0;
		}
		return this._config?.tasks;
	}
	_renderCalendarSection() {
		return P`
      <div class="section section-calendar" data-section="calendar">
        <lucarne-agenda-strip
          .events=${this._mergedEvents}
          .calendarColors=${this._calendarColorMap}
          .windowDays=${this._config?.agenda_show_tomorrow ? 2 : 1}
        ></lucarne-agenda-strip>
      </div>
    `;
	}
	_renderWeatherSection() {
		return P`
      <div class="section section-weather" data-section="weather">
        <lucarne-weather-block
          .weatherEntity=${this._config?.weather ? this.hass?.states[this._config.weather] : void 0}
          .forecast=${this._forecast}
        ></lucarne-weather-block>
      </div>
    `;
	}
	get _maxTasks() {
		let e = this._config?.max_tasks;
		return typeof e == "number" && Number.isFinite(e) ? Math.max(1, Math.floor(e)) : 5;
	}
	_renderTasksSection(e, t) {
		if (!e && !t) return "";
		let n = (t ? this._householdTasks : this._enrichedRawTasks).filter((e) => e.metadata.type !== "rotating"), r = t ? "todo.lucarne_household" : this._config?.tasks;
		return P`
      <div
        class="section section-tasks"
        data-section="tasks"
        @task-toggle=${this._handleTaskToggle}
        @task-long-press=${this._handleTaskLongPress}
      >
        <lucarne-tasks-summary
          .integrationMode=${!0}
          .renderableTasks=${n}
          .members=${this._familyMembers}
          .todoEntityId=${r}
          .limit=${this._maxTasks}
          .refillOnComplete=${this._config?.refill_tasks_on_complete ?? !1}
        ></lucarne-tasks-summary>
      </div>
    `;
	}
	renderContent() {
		if (!this._config) return P``;
		let e = (this._config.presence ?? []).map((e) => ({
			name: e.name,
			isHome: this.hass?.states[e.entity]?.state === "on"
		})), t = this._familyState !== null && this._familyState.integrationError === null, n = (this._config.show_family_ready_pill ?? !1) && t, r = (this._config.household_tasks_from_integration ?? !1) && t, i = !(this._config.household_tasks_from_integration ?? !1) && !!this._config.tasks, a = un(this._config.section_order);
		return P`
      <ha-card>
        <div class="card-header">
          <h2 class="card-title">${this._config.title ?? q.today}</h2>
          <div class="header-right">
            ${e.length > 0 ? P`<lucarne-presence-pills .entries=${e}></lucarne-presence-pills>` : ""}
            ${n ? P`<lucarne-family-ready-pill
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
};
J([W({ attribute: !1 })], dn.prototype, "hass", void 0), J([G()], dn.prototype, "_config", void 0), J([G()], dn.prototype, "_calendarEvents", void 0), J([G()], dn.prototype, "_forecast", void 0), J([G()], dn.prototype, "_todoItems", void 0), J([G()], dn.prototype, "_familyState", void 0), dn = J([H("lucarne-today-card")], dn);
//#endregion
//#region src/shared/editor-styles.ts
var fn = k`
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
`, pn = ["ha-entity-picker", "ha-textfield"], mn = 3e3, hn;
function gn(e) {
	return new Promise((t) => setTimeout(t, e));
}
async function _n() {
	let e = window.loadCardHelpers;
	if (e) try {
		let t = await e(), n = (await Promise.resolve(t.createCardElement({
			type: "entities",
			entities: []
		}))).constructor;
		typeof n?.getConfigElement == "function" && await Promise.resolve(n.getConfigElement());
	} catch (e) {
		console.warn("[lucarne] loadCardHelpers failed; falling back to whenDefined", e);
	}
	let t = Promise.all(pn.map((e) => customElements.whenDefined(e))).then(() => "ready"), n = gn(mn).then(() => "timeout");
	if (await Promise.race([t, n]) === "timeout" && !pn.every((e) => customElements.get(e))) throw Error("[lucarne] HA form elements did not register within timeout");
}
function vn() {
	return hn ||= _n().catch((e) => {
		throw hn = void 0, e;
	}), hn;
}
//#endregion
//#region node_modules/custom-card-helpers/dist/index.m.js
var yn;
(function(e) {
	e.language = "language", e.system = "system", e.comma_decimal = "comma_decimal", e.decimal_comma = "decimal_comma", e.space_comma = "space_comma", e.none = "none";
})(yn ||= {});
var bn;
(function(e) {
	e.language = "language", e.system = "system", e.am_pm = "12", e.twenty_four = "24";
})(bn ||= {});
var xn = (e, t, n, r) => {
	r ||= {}, n ??= {};
	let i = new Event(t, {
		bubbles: r.bubbles === void 0 ? !0 : r.bubbles,
		cancelable: !!r.cancelable,
		composed: r.composed === void 0 ? !0 : r.composed
	});
	return i.detail = n, e.dispatchEvent(i), i;
}, Sn = class extends V {
	constructor(...e) {
		super(...e), this.items = [], this.label = "Reorderable list", this._dragIndex = null, this._dragOverIndex = null;
	}
	static {
		this.styles = k`
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
  `;
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
		return P`
      <div class="reorder-list" role="list" aria-label=${this.label}>
        ${this.items.map((e, t) => P`
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
};
J([W({ attribute: !1 })], Sn.prototype, "items", void 0), J([W()], Sn.prototype, "label", void 0), J([G()], Sn.prototype, "_dragIndex", void 0), J([G()], Sn.prototype, "_dragOverIndex", void 0), Sn = J([H("lucarne-reorder-list")], Sn);
//#endregion
//#region src/editors/lucarne-today-card-editor.ts
var Cn = {
	calendar: "Calendar",
	weather: "Weather",
	tasks: "Tasks"
}, wn = k`
  .section-label-cell {
    font-size: var(--lucarne-fs-md);
    color: var(--lucarne-on-surface);
  }
`, Tn = class extends V {
	constructor(...e) {
		super(...e), this._haReady = !1;
	}
	static {
		this.styles = [
			K,
			fn,
			wn
		];
	}
	connectedCallback() {
		super.connectedCallback(), vn().catch((e) => console.warn("[lucarne] HA editor elements load failed; rendering anyway", e)).then(() => {
			this._haReady = !0;
		});
	}
	setConfig(e) {
		this._config = e;
	}
	_fire(e) {
		xn(this, "config-changed", { config: e });
	}
	_titleChanged(e) {
		let t = e.target;
		this._fire({
			...this._config,
			title: t.value || void 0
		});
	}
	_weatherChanged(e) {
		this._fire({
			...this._config,
			weather: e.detail?.value ?? void 0
		});
	}
	_tasksChanged(e) {
		this._fire({
			...this._config,
			tasks: e.detail?.value ?? void 0
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
		return !!this.hass?.states?.[pt.todo_entity_id];
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
		let n = [...this._config?.calendars ?? []];
		n[e] = {
			...n[e],
			entity: t.detail?.value ?? ""
		}, this._fire({
			...this._config,
			calendars: n
		});
	}
	_calColorChanged(e, t) {
		let n = [...this._config?.calendars ?? []];
		n[e] = {
			...n[e],
			color: t.target.value
		}, this._fire({
			...this._config,
			calendars: n
		});
	}
	_removeCalendar(e) {
		let t = [...this._config?.calendars ?? []];
		t.length <= 1 || (t.splice(e, 1), this._fire({
			...this._config,
			calendars: t
		}));
	}
	_addCalendar() {
		let e = Object.keys(this.hass?.states ?? {}).find((e) => e.startsWith("calendar.")) ?? "calendar.example", t = [...this._config?.calendars ?? [], {
			entity: e,
			color: "#a8d8b9"
		}];
		this._fire({
			...this._config,
			calendars: t
		});
	}
	_presenceEntityChanged(e, t) {
		let n = [...this._config?.presence ?? []];
		n[e] = {
			...n[e],
			entity: t.detail?.value ?? ""
		}, this._fire({
			...this._config,
			presence: n
		});
	}
	_presenceNameChanged(e, t) {
		let n = [...this._config?.presence ?? []];
		n[e] = {
			...n[e],
			name: t.target.value
		}, this._fire({
			...this._config,
			presence: n
		});
	}
	_removePresence(e) {
		let t = [...this._config?.presence ?? []];
		t.splice(e, 1), this._fire({
			...this._config,
			presence: t
		});
	}
	_addPresence() {
		let e = [...this._config?.presence ?? [], {
			entity: "",
			name: ""
		}];
		this._fire({
			...this._config,
			presence: e
		});
	}
	_commitSectionOrder(e) {
		this._fire({
			...this._config,
			section_order: e
		});
	}
	_renderSectionOrder() {
		let e = un(this._config?.section_order);
		return P`
      <div class="section-label">Section order</div>
      <lucarne-reorder-list
        label="Card sections (drag to reorder)"
        .items=${e.map((e) => ({
			key: e,
			label: Cn[e]
		}))}
        @reorder=${(e) => this._commitSectionOrder(e.detail.order)}
      >
        ${e.map((e) => P`<span slot=${e} class="section-label-cell">${Cn[e]}</span>`)}
      </lucarne-reorder-list>
    `;
	}
	render() {
		if (!this._config) return P``;
		if (!this._haReady) return P`<div class="loading">Loading editor…</div>`;
		let e = this._config.calendars ?? [], t = this._config.presence ?? [];
		return P`
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
        ${this._isIntegrationAvailable() ? "" : P`<small> — install Lucarne Family integration first</small>`}
      </label>
      <label class="field field-inline" style="${this._isIntegrationAvailable() ? "" : "opacity:0.5;pointer-events:none"}">
        <span class="field-label">Show family ready pill</span>
        <input
          type="checkbox"
          .checked=${this._config.show_family_ready_pill ?? !1}
          @change=${this._familyPillChanged}
          ?disabled=${!this._isIntegrationAvailable()}
        />
        ${this._isIntegrationAvailable() ? "" : P`<small> — install Lucarne Family integration first</small>`}
      </label>

      <div class="section-label">Calendars</div>
      ${e.map((e, t) => P`
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
      ${t.map((e, t) => P`
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
};
J([W({ attribute: !1 })], Tn.prototype, "hass", void 0), J([G()], Tn.prototype, "_config", void 0), J([G()], Tn.prototype, "_haReady", void 0), Tn = J([H("lucarne-today-card-editor")], Tn);
//#endregion
//#region src/shared/calendar-helpers.ts
function En(e, t) {
	let n = t?.states?.[e.entity]?.attributes?.friendly_name;
	return typeof n == "string" && n ? n : e.entity;
}
function Dn(e, t) {
	return e.map((e) => ({
		...e,
		label: En(e, t)
	}));
}
//#endregion
//#region src/shared/date-helpers.ts
function On(e, t) {
	let n = parseInt(e.split(":")[0], 10), r = parseInt(t.split(":")[0], 10), i = [];
	for (let e = n; e <= r; e++) i.push(e);
	return i;
}
function kn(e, t, n) {
	let [r, i] = t.split(":").map(Number), [a, o] = n.split(":").map(Number), s = new Date(e);
	s.setHours(r, i, 0, 0);
	let c = new Date(e);
	return c.setHours(a, o, 0, 0), {
		bandStartMs: s.getTime(),
		bandEndMs: c.getTime()
	};
}
function An(e, t, n, r) {
	let i = jn(e.start).getTime(), a = jn(e.end).getTime(), { bandStartMs: o, bandEndMs: s } = kn(t, n, r), c = Math.max(i, o), l = Math.min(a, s);
	return c >= l ? null : {
		start: new Date(c),
		end: new Date(l)
	};
}
function jn(e) {
	return e.length === 10 && !e.includes("T") ? /* @__PURE__ */ new Date(`${e}T00:00:00`) : new Date(e);
}
function Mn(e) {
	return new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1, 0, 0, 0, 0).getTime() - e.getTime();
}
function Nn(e) {
	let t = e.split(":");
	if (t.length !== 2) return null;
	let [n, r] = t.map(Number);
	return !Number.isFinite(n) || !Number.isFinite(r) || n < 0 || n > 23 || r < 0 || r > 59 ? null : n * 60 + r;
}
function Pn(e, t, n) {
	let r = (e) => Nn(e) ?? Infinity, i = e.getHours() * 60 + e.getMinutes();
	return i >= r(n) ? "night" : i >= r(t) ? "afternoon" : "morning";
}
function Fn(e, t) {
	let n = Infinity;
	for (let r of t) {
		let t = Nn(r);
		if (t === null) continue;
		let i = new Date(e.getFullYear(), e.getMonth(), e.getDate(), Math.floor(t / 60), t % 60, 0, 0);
		i.getTime() <= e.getTime() && i.setDate(i.getDate() + 1), n = Math.min(n, i.getTime() - e.getTime());
	}
	return n;
}
//#endregion
//#region src/shared/calendar-layout.ts
function In(e) {
	return e.start.length === 10 && !e.start.includes("T");
}
function Y(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Ln(e) {
	return e.uid ?? `${e.start}|${e.end}|${e.summary ?? ""}`;
}
function Rn(e) {
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
function zn(e, t) {
	let [n, r] = t.split(":").map(Number), i = new Date(e);
	return i.setHours(n, r, 0, 0), i.getTime();
}
function Bn(e, t, n, r) {
	let i = /* @__PURE__ */ new Map();
	for (let e of t) i.set(Y(e), {
		allDay: [],
		inBand: [],
		earlier: [],
		later: []
	});
	let a = t.length > 0 ? t[0] : null, o = t.length > 0 ? t[t.length - 1] : null;
	for (let s of e) {
		if (In(s)) {
			let e = /* @__PURE__ */ new Date(s.start + "T00:00:00"), n = /* @__PURE__ */ new Date(s.end + "T00:00:00"), r = a !== null && e < a, c = o ? new Date(o) : null;
			c && c.setDate(c.getDate() + 1);
			let l = c !== null && n > c;
			for (let c of t) {
				let t = Y(c), u = i.get(t);
				if (c >= e && c < n && (u.allDay.push(s), r || l)) {
					u.allDayClipped ||= /* @__PURE__ */ new Map();
					let e = a !== null && Y(c) === Y(a), t = o !== null && Y(c) === Y(o);
					u.allDayClipped.set(Ln(s), {
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
			let d = zn(a, n), f = zn(a, r);
			if (c.getTime() <= d) o.earlier.push(s);
			else if (e.getTime() >= f) o.later.push(s);
			else {
				let e = An(s, a, n, r);
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
		let o = zn(e, n), s = zn(e, r) - o, c = Rn(a.inBand.map((e) => {
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
function Vn(e, t) {
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
function Hn(e) {
	return `syn:${e.start}|${e.end}|${e.summary ?? ""}`;
}
function Un(e) {
	if (e !== void 0 && !(typeof e != "number" || !Number.isFinite(e))) return Math.max(0, Math.floor(e));
}
function Wn(e, t) {
	let n = new Date(e);
	return n.setDate(n.getDate() + t), n;
}
function Gn(e) {
	let t = new Date(e);
	return t.setHours(0, 0, 0, 0), t;
}
var Kn = class {
	constructor(e, t) {
		this._isConnected = !1, this._hasHass = !1, this._dayOffset = 0, this._fetchSeq = 0, this._cachedEvents = /* @__PURE__ */ new Map(), this._cachedDayKeys = /* @__PURE__ */ new Set(), this._host = e, this._opts = t, this._fetcher = t.fetcher ?? at, this._pollIntervalMs = t.pollIntervalMs ?? 5 * 6e4, this._tickIntervalMs = t.tickIntervalMs ?? 6e4, this._panBound = t.panBoundDays ?? 90, this._visibleCount = t.visibleCount, this._bufferDaysExplicit = Un(t.bufferDays);
		let n = (t.now ?? (() => /* @__PURE__ */ new Date()))();
		this._anchorToday = Gn(n), e.addController(this);
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
		let t = this._visibleCount;
		if (this._visibleCount = e, this._opts.onChange?.(), this._host.requestUpdate(), e !== t) {
			let [e, t] = this._computeRange();
			this._rangeIsCovered(e, t) || this._fetchRange(e, t);
		}
	}
	setBufferDays(e) {
		let t = Un(e);
		t !== this._bufferDaysExplicit && (this._bufferDaysExplicit = t, this._opts.onChange?.(), this._host.requestUpdate());
	}
	pan(e) {
		let t = -this._panBound, n = this._panBound - this._visibleCount, r = Math.max(t, Math.min(n, this._dayOffset + e));
		this._dayOffset = r, this._opts.onChange?.(), this._host.requestUpdate();
		let [i, a] = this._computeRange();
		this._rangeIsCovered(i, a) || this._fetchRange(i, a);
	}
	goToToday() {
		let e = this._dayOffset === 0;
		this._dayOffset = 0, e || this._opts.onChange?.(), this._host.requestUpdate();
		let [t, n] = this._computeRange();
		this._rangeIsCovered(t, n) || this._fetchRange(t, n);
	}
	tick() {
		let e = Gn((this._opts.now ?? (() => /* @__PURE__ */ new Date()))());
		e.getTime() !== this._anchorToday.getTime() && (this._anchorToday = e, this._dayOffset === 0 && (this._opts.onChange?.(), this._host.requestUpdate(), this._hass && this._fetchRange(...this._computeRange())));
	}
	async _poll() {
		this._hass && this._fetchRange(...this._computeRange());
	}
	get days() {
		return Array.from({ length: this._visibleCount }, (e, t) => {
			let n = Wn(this._anchorToday, this._dayOffset + t);
			return n.setHours(0, 0, 0, 0), n;
		});
	}
	get bufferDays() {
		return this._bufferDaysExplicit ?? this._visibleCount;
	}
	get renderDays() {
		let e = this.bufferDays, t = e * 2 + this._visibleCount;
		return Array.from({ length: t }, (t, n) => {
			let r = Wn(this._anchorToday, this._dayOffset - e + n);
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
		let e = this._visibleCount, t = Wn(this._anchorToday, this._dayOffset - e);
		t.setHours(0, 0, 0, 0);
		let n = Wn(this._anchorToday, this._dayOffset + 2 * e);
		return n.setHours(0, 0, 0, 0), [t, n];
	}
	_rangeIsCovered(e, t) {
		return !this._cacheStart || !this._cacheEnd ? !1 : e >= this._cacheStart && t <= this._cacheEnd;
	}
	_fetchRange(e, t) {
		if (!this._hass) return;
		let n = ++this._fetchSeq, r = this._opts.calendars.map((e) => e.entity);
		this._opts.onFetchStart?.({
			start: e,
			end: t
		}), this._fetcher(this._hass, r, e, t).then(({ events: r, failed: i }) => {
			if (n !== this._fetchSeq) return;
			let a = /* @__PURE__ */ new Map();
			for (let [e, t] of r.entries()) a.set(e, t.map((t) => {
				let n = t.uid && t.uid.length > 0 ? t.uid : Hn(t);
				return {
					...t,
					uid: `${e}::${n}`
				};
			}));
			this._cachedEvents = a, this._cachedDayKeys = /* @__PURE__ */ new Set();
			for (let n = new Date(e); n < t; n.setDate(n.getDate() + 1)) this._cachedDayKeys.add(Y(n));
			this._cacheStart = new Date(e), this._cacheEnd = new Date(t), this._opts.onFetchComplete?.(a, i);
		}).catch((e) => {
			console.warn("[lucarne] RollingWindowController fetch failed:", e);
		});
	}
};
//#endregion
//#region src/shared/calendar-scroll.ts
function qn(e) {
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
var Jn = class extends V {
	constructor(...e) {
		super(...e), this.calendars = [], this.visibleIds = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = [K, k`
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
    `];
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
		return P`
      ${this.calendars.map((e) => P`
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
};
J([W({ type: Array })], Jn.prototype, "calendars", void 0), J([W({ type: Object })], Jn.prototype, "visibleIds", void 0), Jn = J([H("lucarne-visibility-pills")], Jn);
//#endregion
//#region node_modules/lit-html/directive.js
var Yn = {
	ATTRIBUTE: 1,
	CHILD: 2,
	PROPERTY: 3,
	BOOLEAN_ATTRIBUTE: 4,
	EVENT: 5,
	ELEMENT: 6
}, Xn = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Zn = class {
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
}, Qn = "important", $n = " !important", er = Xn(class extends Zn {
	constructor(e) {
		if (super(e), e.type !== Yn.ATTRIBUTE || e.name !== "style" || e.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
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
				let t = typeof r == "string" && r.endsWith($n);
				e.includes("-") || t ? n.setProperty(e, t ? r.slice(0, -11) : r, t ? Qn : "") : n[e] = r;
			}
		}
		return I;
	}
});
//#endregion
//#region src/components/calendar-event-block.ts
function tr(e) {
	return e.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: !0
	});
}
var nr = class extends V {
	constructor(...e) {
		super(...e), this.color = "#a8d8b9", this.lane = 0, this.laneCount = 1, this.topPercent = 0, this.heightPercent = 10;
	}
	static {
		this.styles = [K, k`
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
    `];
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
		let e = new Date(this.event.start), t = new Date(this.event.end), n = `${tr(e)}–${tr(t)}`, r = this.event.pending ? "0.5" : "1";
		return P`
      <div @click=${this._handleClick} style="height:100%;width:100%;overflow:hidden;opacity:${r}">
        <div class="event-summary">${this.event.summary}</div>
        <div class="event-time">${n}</div>
      </div>
    `;
	}
};
J([W({ type: Object })], nr.prototype, "event", void 0), J([W({ type: String })], nr.prototype, "color", void 0), J([W({ type: Number })], nr.prototype, "lane", void 0), J([W({ type: Number })], nr.prototype, "laneCount", void 0), J([W({ type: Number })], nr.prototype, "topPercent", void 0), J([W({ type: Number })], nr.prototype, "heightPercent", void 0), nr = J([H("lucarne-calendar-event-block")], nr);
//#endregion
//#region src/components/out-of-band-stub.ts
var rr = class extends V {
	constructor(...e) {
		super(...e), this.events = [], this.label = "earlier", this.eventColors = /* @__PURE__ */ new Map(), this._open = !1;
	}
	static {
		this.styles = [K, k`
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
    `];
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
		if (this.events.length === 0) return P``;
		let e = this._chipEl, t = 0, n = 0;
		if (e) {
			let r = e.getBoundingClientRect();
			t = r.bottom + 4, n = r.left;
		}
		return P`
      <button class="stub-chip" @click=${this._openPopover}>
        +${this.events.length} ${this.label}
      </button>

      ${this._open ? P`
            <div class="backdrop" @click=${this._close}></div>
            <div class="mini-popover" style="top:${t}px;left:${n}px;">
              <div class="mini-title">${this.label}</div>
              ${this.events.map((e) => P`
                  <div class="mini-event" @click=${(t) => this._tapEvent(t, e)}>
                    <span class="mini-event-summary">${e.summary}</span>
                    <span class="mini-event-time">${this._formatTime(e.start)}</span>
                  </div>
                `)}
            </div>
          ` : ""}
    `;
	}
};
J([W({ type: Array })], rr.prototype, "events", void 0), J([W({ type: String })], rr.prototype, "label", void 0), J([W({ type: Object })], rr.prototype, "eventColors", void 0), J([G()], rr.prototype, "_open", void 0), rr = J([H("lucarne-out-of-band-stub")], rr);
//#endregion
//#region src/components/skeleton-day-column.ts
function ir(e) {
	return 20 + (e * 37 + 11) % 30;
}
function ar(e) {
	return 10 + (e * 53 + 7) % 60;
}
var or = class extends V {
	constructor(...e) {
		super(...e), this.bandStart = "07:00", this.bandEnd = "21:00", this.hourHeightPx = 60;
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	render() {
		let [e] = this.bandStart.split(":").map(Number), [t] = this.bandEnd.split(":").map(Number), n = Math.max(1, t - e) * this.hourHeightPx;
		return P`
      <div class="sk-host" style="height:${n}px">
        ${[0, 1].map((e) => P`
            <div
              class="fake-event"
              style="top: ${ar(e) / 100 * n}px; height: ${ir(e)}px;"
            >
              <div class="shimmer-sweep"></div>
            </div>
          `)}
      </div>
    `;
	}
};
J([W({ type: String })], or.prototype, "bandStart", void 0), J([W({ type: String })], or.prototype, "bandEnd", void 0), J([W({ type: Number })], or.prototype, "hourHeightPx", void 0), or = J([H("lucarne-skeleton-day-column")], or);
//#endregion
//#region src/components/calendar-grid.ts
function sr(e, t) {
	return e.getFullYear() === t.getFullYear() && e.getMonth() === t.getMonth() && e.getDate() === t.getDate();
}
var cr = class extends V {
	constructor(...e) {
		super(...e), this.layout = null, this.bandStart = "07:00", this.bandEnd = "21:00", this.calendars = [], this.hourHeightPx = 60, this.showCreateButton = !1, this.dayWidthPx = 0, this.bufferDays = 0, this.cachedDayKeys = /* @__PURE__ */ new Set();
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	get _colorMap() {
		let e = /* @__PURE__ */ new Map();
		for (let t of this.calendars) e.set(t.entity, t.color);
		return e;
	}
	_eventColor(e) {
		let t = this._colorMap;
		if (e.uid?.includes("::")) {
			let n = e.uid.split("::")[0];
			return t.get(n) ?? "#a8d8b9";
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
		if (!this.layout) return P``;
		let n = Y(e), r = this.layout.perDay.get(n);
		if (!r) return P``;
		let i = On(this.bandStart, this.bandEnd), a = (i.length - 1) * this.hourHeightPx, o = sr(e, t), [s] = this.bandStart.split(":").map(Number), [c] = this.bandEnd.split(":").map(Number), l = (c - s) * 36e5, u = null;
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
		return P`
      <div class="day-col-wrapper">
        ${r.earlier.length > 0 ? P`
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
          ${i.slice(0, -1).map((e, t) => P`
              <div
                class="hour-line"
                style="top: ${(t + 1) / (i.length - 1) * 100}%"
              ></div>
            `)}

          ${u === null ? "" : P`<div class="now-line" style="top:${u}%"></div>`}

          ${r.inBand.map((e) => {
			let t = 100 / e.laneCount, n = e.lane / e.laneCount * 100, r = this._eventColor(e.event);
			return P`
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

        ${r.later.length > 0 ? P`
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
		if (!this.layout) return P`<div>Loading…</div>`;
		let e = /* @__PURE__ */ new Date(), t = On(this.bandStart, this.bandEnd), n = (t.length - 1) * this.hourHeightPx, r = new Intl.DateTimeFormat("en-US", { weekday: "short" }), i = { "--lucarne-day-render-count": String(this.layout.days.length) };
		return this.dayWidthPx > 0 && (i["--lucarne-day-width-px"] = `${this.dayWidthPx}px`, i["--lucarne-day-baseline-px"] = `${-this.bufferDays * this.dayWidthPx}px`), P`
      <div class="grid-wrapper" style=${er(i)}>
        <!-- Time-column gutter cells (col 1): stay fixed during pan -->
        <div class="header-spacer" style="grid-row:1; grid-column:1"></div>
        <div class="allday-spacer" style="grid-row:2; grid-column:1">all-day</div>
        <div class="time-col" style="height:${n}px; grid-row:3; grid-column:1">
          ${t.map((e, n) => P`
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
          ${this.layout.days.map((t, n) => P`
              <div
                class="day-header ${sr(t, e) ? "today" : ""}"
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
			return P`
                <div class="allday-cell" style="grid-column: ${t + 1}">
                  ${r ? (i?.allDay ?? []).map((e) => {
				let t = i?.allDayClipped?.get(Ln(e));
				return P`
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
                            ${t?.left ? P`<span class="clip-chevron">‹</span>` : ""}${e.summary}${t?.right ? P`<span class="clip-chevron">›</span>` : ""}
                          </div>
                        `;
			}) : P`<div class="allday-skeleton"><div class="shimmer-sweep"></div></div>`}
                </div>
              `;
		})}
          </div>
        </div>

        <!-- Row 3: time-band columns track -->
        <div class="day-cols-track" style="grid-row:3">
          ${this.layout.days.map((t, n) => {
			let r = Y(t), i = this.cachedDayKeys.has(r);
			return P`
              <div style="grid-column:${n + 1}; position:relative; overflow:visible; display:flex; flex-direction:column;">
                ${i ? this._renderDayColumn(t, e) : P`<lucarne-skeleton-day-column
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
};
J([W({ type: Object })], cr.prototype, "layout", void 0), J([W({ type: String })], cr.prototype, "bandStart", void 0), J([W({ type: String })], cr.prototype, "bandEnd", void 0), J([W({ type: Array })], cr.prototype, "calendars", void 0), J([W({ type: Number })], cr.prototype, "hourHeightPx", void 0), J([W({ type: Boolean })], cr.prototype, "showCreateButton", void 0), J([W({ type: Number })], cr.prototype, "dayWidthPx", void 0), J([W({ type: Number })], cr.prototype, "bufferDays", void 0), J([W({ attribute: !1 })], cr.prototype, "cachedDayKeys", void 0), cr = J([H("lucarne-calendar-grid")], cr);
//#endregion
//#region src/shared/pan-math.ts
var lr = 500;
function ur(e, t, n) {
	return t <= 0 ? 0 : Math.abs(n) >= lr ? n > 0 ? Math.ceil(e / t) : Math.floor(e / t) : Math.round(e / t);
}
function dr(e, t) {
	if (Math.abs(e) <= t) return e;
	let n = Math.abs(e) - t;
	return Math.sign(e) * (t + n * .33);
}
//#endregion
//#region src/components/calendar-day-pan.ts
var fr = class extends V {
	constructor(...e) {
		super(...e), this.dayWidthPx = 0, this.bufferDays = 0, this.canPanBack = !0, this.canPanForward = !0, this._startX = 0, this._startY = 0, this._startTime = 0, this._isDragging = !1, this._cachedTargets = [];
	}
	static {
		this.styles = k`
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
  `;
	}
	get _panTargets() {
		let e = this._slot?.assignedElements()[0];
		return e ? Array.from(e.shadowRoot?.querySelectorAll(".day-cols-track") ?? []) : [];
	}
	_cachePanTargets() {
		this._cachedTargets = this._panTargets;
	}
	_applyRubberBand(e) {
		return e > 0 && !this.canPanBack || e < 0 && !this.canPanForward ? dr(e, 0) : e;
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
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
				let t = e.clientX - this._startX, n = performance.now() - this._startTime, r = n > 0 ? t / n * 1e3 : 0, i = ur(this._applyRubberBand(t), this.dayWidthPx, r);
				(i > 0 && !this.canPanBack || i < 0 && !this.canPanForward) && (i = 0), this._snapAndCommit(i);
			}
			this._pointerId = void 0, this._isDragging = !1, this._cachedTargets = [];
		}
	}
	render() {
		return P`
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
};
J([W({ type: Number })], fr.prototype, "dayWidthPx", void 0), J([W({ type: Number })], fr.prototype, "bufferDays", void 0), J([W({ type: Boolean })], fr.prototype, "canPanBack", void 0), J([W({ type: Boolean })], fr.prototype, "canPanForward", void 0), J([et("slot")], fr.prototype, "_slot", void 0), fr = J([H("lucarne-calendar-day-pan")], fr);
//#endregion
//#region src/components/calendar-event-popover.ts
function pr(e) {
	return new Date(e).toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: !0
	});
}
var mr = class extends V {
	constructor(...e) {
		super(...e), this.event = null, this.color = "#a8d8b9", this.calendarLabel = "", this.entityId = "", this._confirmingDelete = !1, this._deleting = !1, this._deleteError = "";
	}
	static {
		this.styles = [K, k`
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
    `];
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
		if (!this.event?.uid || !this.entityId) return;
		this._deleting = !0, this._deleteError = "";
		let e = this.event.uid.includes("::") ? this.event.uid.split("::").slice(1).join("::") : this.event.uid;
		try {
			await ot(this.hass, this.entityId, e);
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
		if (!this.event) return P``;
		let e = this.event, t = e.start.length === 10 && !e.start.includes("T") ? "All day" : `${pr(e.start)} – ${new Date(e.end).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: !0
		})}`, n = this._hasSyntheticUid(e.uid), r = !!this.entityId && !!e.uid && this.hass != null && ct(this.hass, this.entityId) && !this._isRecurring(e) && !n, i = this._confirmingDelete ? this._confirmDelete : this._startDelete, a = this._confirmingDelete ? "Confirm delete" : "Delete event";
		return P`
      <div class="backdrop" @click=${this._close}></div>
      <div class="popover" role="dialog" aria-modal="true">
        <div class="popover-header">
          <span class="color-dot" style="background:${this.color}"></span>
          <span class="event-title">${e.summary}</span>
          ${r ? P`
                <button
                  class="icon-btn ${this._confirmingDelete ? "armed" : ""}"
                  @click=${i}
                  ?disabled=${this._deleting}
                  aria-label=${a}
                  title=${a}
                >🗑️</button>
              ` : P`<span></span>`}
          <button class="icon-btn" @click=${this._close} aria-label="Close">✕</button>
        </div>

        ${this._confirmingDelete ? P`
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

        ${this.calendarLabel ? P`
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

        ${e.location ? P`
              <div class="detail-row">
                <em class="detail-icon">📍</em>
                <span class="detail-text">${e.location}</span>
              </div>
            ` : ""}

        ${e.description ? P`
              <div class="detail-row">
                <em class="detail-icon">📝</em>
                <span class="detail-text">${e.description}</span>
              </div>
            ` : ""}

        ${this._deleteError ? P`<div class="error-msg">${this._deleteError}</div>` : ""}
      </div>
    `;
	}
};
J([W({ attribute: !1 })], mr.prototype, "hass", void 0), J([W({ type: Object })], mr.prototype, "event", void 0), J([W({ type: String })], mr.prototype, "color", void 0), J([W({ type: String })], mr.prototype, "calendarLabel", void 0), J([W({ type: String })], mr.prototype, "entityId", void 0), J([G()], mr.prototype, "_confirmingDelete", void 0), J([G()], mr.prototype, "_deleting", void 0), J([G()], mr.prototype, "_deleteError", void 0), mr = J([H("lucarne-calendar-event-popover")], mr);
//#endregion
//#region src/components/create-event-popover.ts
function hr(e, t) {
	let n = -(/* @__PURE__ */ new Date(`${e}T${t}:00`)).getTimezoneOffset();
	return `${e}T${t}:00${n >= 0 ? "+" : "-"}${Math.floor(Math.abs(n) / 60).toString().padStart(2, "0")}:${(Math.abs(n) % 60).toString().padStart(2, "0")}`;
}
function gr(e) {
	return `${Math.floor(e).toString().padStart(2, "0")}:${e % 1 == .5 ? "30" : "00"}`;
}
function _r(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
var X = class extends V {
	constructor(...e) {
		super(...e), this.day = null, this.startHour = 9, this.calendars = [], this._title = "", this._calendarEntityId = "", this._date = "", this._startTime = "", this._endTime = "", this._allDay = !1, this._description = "", this._location = "", this._error = "", this._saving = !1;
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	updated(e) {
		super.updated(e), (e.has("day") || e.has("startHour")) && this._initDefaults();
	}
	_initDefaults() {
		let e = this.day ?? /* @__PURE__ */ new Date();
		this._date = _r(e), this._startTime = gr(Math.max(0, Math.min(23, this.startHour)));
		let t = Math.min(24, this.startHour + 1);
		this._endTime = gr(t < 24 ? t : 23.5), this._calendarEntityId = this.calendars[0]?.entity ?? "", this._title = "", this._allDay = !1, this._description = "", this._location = "", this._error = "", this._saving = !1;
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
			let i = _r(r);
			e.end_date = i, t = this._date, n = i;
		} else {
			let r = hr(this._date, this._startTime), i = hr(this._date, this._endTime);
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
		return this.calendars.length ? P`
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
            ${this.calendars.map((e) => P`<option value=${e.entity}>${e.label}</option>`)}
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

        ${this._allDay ? "" : P`
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

        ${this._error ? P`<div class="error-msg">${this._error}</div>` : ""}

        <div class="actions">
          <button class="btn btn-cancel" @click=${this._close}>Cancel</button>
          <button class="btn btn-create" ?disabled=${this._saving} @click=${this._create}>
            ${this._saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    ` : P``;
	}
};
J([W({ attribute: !1 })], X.prototype, "hass", void 0), J([W({ type: Object })], X.prototype, "day", void 0), J([W({ type: Number })], X.prototype, "startHour", void 0), J([W({ type: Array })], X.prototype, "calendars", void 0), J([G()], X.prototype, "_title", void 0), J([G()], X.prototype, "_calendarEntityId", void 0), J([G()], X.prototype, "_date", void 0), J([G()], X.prototype, "_startTime", void 0), J([G()], X.prototype, "_endTime", void 0), J([G()], X.prototype, "_allDay", void 0), J([G()], X.prototype, "_description", void 0), J([G()], X.prototype, "_location", void 0), J([G()], X.prototype, "_error", void 0), J([G()], X.prototype, "_saving", void 0), X = J([H("lucarne-create-event-popover")], X);
//#endregion
//#region src/cards/lucarne-calendar-card.ts
var vr = 6e4, yr = 4, br = 60;
window.customCards = window.customCards || [], window.customCards.push({
	type: "lucarne-calendar-card",
	name: "Lucarne Calendar",
	description: "Week view calendar with per-person color, visibility pills, and create-event flow",
	preview: !0
});
var Z = class extends tt {
	constructor(...e) {
		super(...e), this._layout = null, this._visibleIds = /* @__PURE__ */ new Set(), this._openEvent = null, this._openEventColor = "", this._openEventCalLabel = "", this._openEventEntityId = "", this._createDay = null, this._createStartHour = 9, this._creatableCalendars = [], this._dayWidthPx = 0, this._deletedUids = /* @__PURE__ */ new Set(), this._pendingEvents = [], this._lastVisibleCount = 3, this._didInitialScroll = !1, this._initialScrollScheduled = !1, this._initialScrollAttempts = 0, this._autoFollow = !0, this._lastAutoScrollTop = null;
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	setConfig(e) {
		if (!e.calendars || !Array.isArray(e.calendars) || e.calendars.length === 0) throw Error("lucarne-calendar-card: \"calendars\" must be a non-empty array");
		for (let t of e.calendars) if (!t.entity || !t.color) throw Error("lucarne-calendar-card: each calendar requires \"entity\" and \"color\"");
		let t = e;
		if (e.visible_hours) {
			let n = /^\d{1,2}:\d{2}$/;
			if (!n.test(e.visible_hours.start) || !n.test(e.visible_hours.end)) throw Error("lucarne-calendar-card: \"visible_hours\" start and end must be in HH:MM format");
			let r = parseInt(e.visible_hours.start.split(":")[0], 10), i = parseInt(e.visible_hours.end.split(":")[0], 10);
			if (r < 0 || i > 24 || r >= i) throw Error("lucarne-calendar-card: \"visible_hours\" must satisfy 0 <= start < end <= 24");
			t = {
				...e,
				visible_hours: {
					start: `${String(r).padStart(2, "0")}:00`,
					end: `${String(i).padStart(2, "0")}:00`
				}
			};
		}
		let n = this._config;
		if (this._config = t, this._visibleIds = new Set(e.calendars.map((e) => e.entity)), this.hass && this._updateCreatableCalendars(), this._rolling) this._rolling.updateCalendars(t.calendars), n?.render_buffer_days !== t.render_buffer_days && this._rolling.setBufferDays(t.render_buffer_days), (n?.min_days !== e.min_days || n?.max_days !== e.max_days || n?.min_col_width !== e.min_col_width || n?.max_col_width !== e.max_col_width) && this._onResize();
		else {
			let e = this._effectiveConfig();
			this._lastVisibleCount = e.minDays, this._rolling = new Kn(this, {
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
			this._previewOverrideRaf = void 0, this.isConnected && (this._previewOverride = ft(this));
		}), this._followTimer = setInterval(() => this._followNow(), vr);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._previewOverrideRaf !== void 0 && (cancelAnimationFrame(this._previewOverrideRaf), this._previewOverrideRaf = void 0), this._followTimer !== void 0 && (clearInterval(this._followTimer), this._followTimer = void 0), this._initialScrollRaf !== void 0 && (cancelAnimationFrame(this._initialScrollRaf), this._initialScrollRaf = void 0), this._didInitialScroll = !1, this._initialScrollScheduled = !1, this._initialScrollAttempts = 0, this._autoFollow = !0, this._lastAutoScrollTop = null, this._resizeObserver?.disconnect(), this._previewOverride?.uninstall(), this._previewOverride = void 0;
	}
	firstUpdated() {
		!this._resizeObserver && this._gridAreaEl && (this._resizeObserver = new ResizeObserver(() => this._onResize()), this._resizeObserver.observe(this._gridAreaEl), this._onResize());
	}
	updated(e) {
		super.updated(e), !this._didInitialScroll && !this._initialScrollScheduled && this._layout && this._dayWidthPx > 0 && (this._initialScrollScheduled = !0, this._scheduleInitialScroll()), !(!e.has("hass") || !this._config) && (this._rolling.setHass(this.hass), this._updateCreatableCalendars());
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
			++this._initialScrollAttempts < br ? this._scheduleInitialScroll() : this._initialScrollScheduled = !1;
		});
	}
	_performAutoScroll(e) {
		let t = this._gridAreaEl;
		if (!t || !this._config) return !1;
		let n = this.renderRoot.querySelector("lucarne-calendar-grid")?.shadowRoot?.querySelector(".time-col");
		if (!n) return !1;
		let r = t.getBoundingClientRect(), i = n.getBoundingClientRect();
		if (i.height <= 0) return !1;
		let [a] = (this._config.visible_hours?.start ?? "07:00").split(":").map(Number), [o] = (this._config.visible_hours?.end ?? "21:00").split(":").map(Number), s = o - a;
		if (s <= 0) return !1;
		let c = qn({
			now: /* @__PURE__ */ new Date(),
			bandStartH: a,
			bandEndH: o,
			timeGridTopPx: i.top - r.top + t.scrollTop,
			timeGridHeightPx: i.height,
			paddingPx: i.height / s,
			maxScrollTop: t.scrollHeight - t.clientHeight
		});
		return t.scrollTo({
			top: c,
			behavior: e
		}), this._lastAutoScrollTop = c, !0;
	}
	_followNow() {
		if (!this._autoFollow || !this._rolling?.isAtToday || typeof document < "u" && document.visibilityState === "hidden") return;
		let e = this._gridAreaEl;
		if (e) {
			if (this._lastAutoScrollTop !== null && Math.abs(e.scrollTop - this._lastAutoScrollTop) > yr) {
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
			this._resizeFrame = void 0;
			let { visibleCount: e, dayWidthPx: t } = Vn(this._gridAreaEl?.getBoundingClientRect().width ?? 0, this._effectiveConfig());
			e !== this._lastVisibleCount && (this._lastVisibleCount = e, this._rolling.setVisibleCount(e), this.style.setProperty("--lucarne-day-count", String(e))), this._dayWidthPx = t;
		}));
	}
	_recompute() {
		if (!this._config) return;
		let e = [];
		for (let [t, n] of this._rolling.cachedEvents.entries()) this._visibleIds.has(t) && e.push(...n);
		e.push(...this._pendingEvents.filter((e) => {
			let t = e.uid?.split("::")[0];
			return t ? this._visibleIds.has(t) : !0;
		}));
		let t = this._deletedUids.size > 0 ? e.filter((e) => !e.uid || !this._deletedUids.has(e.uid)) : e, n = this._config.visible_hours?.start ?? "07:00", r = this._config.visible_hours?.end ?? "21:00", i = this._rolling.renderDays;
		this._layout = Bn(t, i, n, r);
	}
	_supportsCreate(e) {
		let t = this.hass?.states[e]?.attributes?.supported_features;
		return t !== void 0 && (t & 1) != 0;
	}
	_updateCreatableCalendars() {
		if (!this._config || !this.hass) return;
		let e = this._config.calendars.filter((e) => this._supportsCreate(e.entity));
		e.length === this._creatableCalendars.length && e.every((e, t) => e.entity === this._creatableCalendars[t]?.entity) || (this._creatableCalendars = e);
	}
	_onVisibilityChange(e) {
		this._visibleIds = e.detail, this._recompute();
	}
	_onEventTap(e) {
		let { event: t, color: n } = e.detail;
		if (this._openEvent = t, this._openEventColor = n, t.uid?.includes("::")) {
			let e = t.uid.split("::")[0];
			this._openEventEntityId = e;
			let n = this._config?.calendars.find((t) => t.entity === e);
			this._openEventCalLabel = n ? En(n, this.hass) : "";
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
		if (!this._config) return P``;
		let e = this._config.visible_hours?.start ?? "07:00", t = this._config.visible_hours?.end ?? "21:00", n = Dn(this._config.calendars, this.hass), r = Dn(this._creatableCalendars, this.hass);
		return P`
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
            ${this._rolling.isAtToday ? "" : P`<button class="nav-btn" @click=${() => this._onTodayClick()} aria-label="Today">Today</button>`}
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
            .calendars=${n}
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
              .bandStart=${e}
              .bandEnd=${t}
              .calendars=${n}
              .dayWidthPx=${this._dayWidthPx}
              .bufferDays=${this._rolling.bufferDays}
              .cachedDayKeys=${new Set(this._rolling.cachedRange.map(Y))}
              .showCreateButton=${(this._config.show_create_button ?? !0) && this._creatableCalendars.length > 0}
            ></lucarne-calendar-grid>
          </lucarne-calendar-day-pan>
        </div>

        ${this._openEvent ? P`
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

        ${this._createDay === null ? "" : P`
              <lucarne-create-event-popover
                .hass=${this.hass}
                .day=${this._createDay}
                .startHour=${this._createStartHour}
                .calendars=${r}
                @popover-close=${this._closeCreatePopover}
                @lucarne-event-created=${this._onEventCreated}
              ></lucarne-create-event-popover>
            `}
      </ha-card>
    `;
	}
};
J([W({ attribute: !1 })], Z.prototype, "hass", void 0), J([et(".grid-area")], Z.prototype, "_gridAreaEl", void 0), J([G()], Z.prototype, "_config", void 0), J([G()], Z.prototype, "_layout", void 0), J([G()], Z.prototype, "_visibleIds", void 0), J([G()], Z.prototype, "_openEvent", void 0), J([G()], Z.prototype, "_openEventColor", void 0), J([G()], Z.prototype, "_openEventCalLabel", void 0), J([G()], Z.prototype, "_openEventEntityId", void 0), J([G()], Z.prototype, "_createDay", void 0), J([G()], Z.prototype, "_createStartHour", void 0), J([G()], Z.prototype, "_creatableCalendars", void 0), J([G()], Z.prototype, "_dayWidthPx", void 0), J([G()], Z.prototype, "_deletedUids", void 0), Z = J([H("lucarne-calendar-card")], Z);
//#endregion
//#region src/editors/lucarne-calendar-card-editor.ts
var xr = class extends V {
	constructor(...e) {
		super(...e), this._haReady = !1, this._invalid = {};
	}
	static {
		this.styles = [K, fn];
	}
	connectedCallback() {
		super.connectedCallback(), vn().catch((e) => console.warn("[lucarne] HA editor elements load failed; rendering anyway", e)).then(() => {
			this._haReady = !0;
		});
	}
	setConfig(e) {
		this._config = e;
	}
	_fire(e) {
		xn(this, "config-changed", { config: e });
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
		let n = [...this._config?.calendars ?? []];
		n[e] = {
			...n[e],
			entity: t.detail?.value ?? ""
		}, this._fire({
			...this._config,
			calendars: n
		});
	}
	_calColorChanged(e, t) {
		let n = [...this._config?.calendars ?? []];
		n[e] = {
			...n[e],
			color: t.target.value
		}, this._fire({
			...this._config,
			calendars: n
		});
	}
	_removeCalendar(e) {
		let t = [...this._config?.calendars ?? []];
		t.length <= 1 || (t.splice(e, 1), this._fire({
			...this._config,
			calendars: t
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
		let e = Object.keys(this.hass?.states ?? {}).find((e) => e.startsWith("calendar.")) ?? "calendar.example", t = [...this._config?.calendars ?? [], {
			entity: e,
			color: "#a8d8b9"
		}];
		this._fire({
			...this._config,
			calendars: t
		});
	}
	render() {
		if (!this._config) return P``;
		if (!this._haReady) return P`<div class="loading">Loading editor…</div>`;
		let e = this._config.calendars ?? [], t = this._config.visible_hours?.start ?? "07:00", n = this._config.visible_hours?.end ?? "21:00", r = this._config.show_create_button ?? !0, i = this._config.min_days, a = this._config.max_days, o = this._config.min_col_width, s = this._config.max_col_width;
		return P`
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
            .value=${t}
            @change=${this._bandStartChanged}
          />
        </label>
        <label class="field">
          <span class="field-label">Visible hours end (HH:MM)</span>
          <input
            class="text-input"
            type="text"
            .value=${n}
            @change=${this._bandEndChanged}
          />
        </label>
      </div>

      <label class="toggle-row">
        <span class="toggle-label">Show create-event button</span>
        <input
          type="checkbox"
          .checked=${r}
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
            .value=${i === void 0 ? "" : String(i)}
            placeholder="3"
            @change=${(e) => this._windowFieldChanged("min_days", e)}
          />
          ${this._invalid.days ? P`<div class="editor-error">Min days must be ≤ max days</div>` : ""}
        </label>
        <label class="field">
          <span class="field-label">Max days (1–14)</span>
          <input
            class="text-input"
            type="number"
            min="1"
            max="14"
            step="1"
            .value=${a === void 0 ? "" : String(a)}
            placeholder="7"
            @change=${(e) => this._windowFieldChanged("max_days", e)}
          />
          ${this._invalid.days ? P`<div class="editor-error">Max days must be ≥ min days</div>` : ""}
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
            .value=${o === void 0 ? "" : String(o)}
            placeholder="140"
            @change=${(e) => this._windowFieldChanged("min_col_width", e)}
          />
          ${this._invalid.cols ? P`<div class="editor-error">Min width must be ≤ max width</div>` : ""}
        </label>
        <label class="field">
          <span class="field-label">Max column width px (100–600)</span>
          <input
            class="text-input"
            type="number"
            min="100"
            max="600"
            step="10"
            .value=${s === void 0 ? "" : String(s)}
            placeholder="220"
            @change=${(e) => this._windowFieldChanged("max_col_width", e)}
          />
          ${this._invalid.cols ? P`<div class="editor-error">Max width must be ≥ min width</div>` : ""}
        </label>
      </div>

      <div class="section-label">Calendars</div>
      ${e.map((e, t) => P`
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
};
J([W({ attribute: !1 })], xr.prototype, "hass", void 0), J([G()], xr.prototype, "_config", void 0), J([G()], xr.prototype, "_haReady", void 0), J([G()], xr.prototype, "_invalid", void 0), xr = J([H("lucarne-calendar-card-editor")], xr);
//#endregion
//#region src/shared/types.ts
var Sr = [
	"anytime",
	"morning",
	"afternoon",
	"night"
];
function Cr(e) {
	return typeof e == "string" && Sr.includes(e) ? e : "anytime";
}
//#endregion
//#region src/components/streak-display.ts
var wr = class extends V {
	constructor(...e) {
		super(...e), this.streak = 0;
	}
	static {
		this.styles = k`
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
  `;
	}
	_milestoneClass(e) {
		return e >= 30 ? "milestone-5" : e >= 14 ? "milestone-4" : e >= 7 ? "milestone-3" : e >= 3 ? "milestone-2" : e >= 1 ? "milestone-1" : "";
	}
	render() {
		let e = isNaN(this.streak) ? 0 : this.streak, t = e > 0 ? "day streak" : "start a streak today";
		return P`
      <div class="streak-row">
        <span class="flame ${this._milestoneClass(e)}">🔥</span>
        <span class="count">${e}</span>
      </div>
      <div class="label">${t}</div>
    `;
	}
};
J([W({ type: Number })], wr.prototype, "streak", void 0), wr = J([H("lucarne-streak-display")], wr);
//#endregion
//#region src/components/celebration-overlay.ts
var Tr = class extends V {
	constructor(...e) {
		super(...e), this.kidSlug = "", this.active = !1, this._dots = [];
	}
	static {
		this.styles = k`
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
  `;
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
		return this.active ? P`
      ${this._dots.map((e) => P`
          <div
            class="dot"
            style="left:${e.left};background:${e.color};animation-delay:${e.delay};width:${e.size};height:${e.size}"
          ></div>
        `)}
    ` : P``;
	}
};
J([W({ attribute: "kid-slug" })], Tr.prototype, "kidSlug", void 0), J([W({ type: Boolean })], Tr.prototype, "active", void 0), Tr = J([H("lucarne-celebration-overlay")], Tr);
//#endregion
//#region src/components/member-column.ts
var Er = [
	"morning",
	"afternoon",
	"night",
	"anytime"
], Dr = {
	morning: "Morning",
	afternoon: "Afternoon",
	night: "Night",
	anytime: "Anytime"
}, Or = {
	morning: kt,
	afternoon: At,
	night: jt
};
function kr(e, t) {
	return e.due && t.due ? e.due.localeCompare(t.due) : e.due ? -1 : t.due ? 1 : e.summary.localeCompare(t.summary);
}
function Ar(e) {
	let t = e.filter((e) => e.metadata.type === "routine").sort((e, t) => e.summary.localeCompare(t.summary)), n = e.filter((e) => e.metadata.type !== "routine").sort(kr);
	return [...t, ...n];
}
function jr(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = Cr(n.metadata.time_of_day), r = t.get(e) ?? [];
		r.push(n), t.set(e, r);
	}
	let n = [];
	for (let e of Er) {
		let r = t.get(e);
		!r || r.length === 0 || n.push({
			bucket: e,
			tasks: Ar(r)
		});
	}
	return n;
}
var Mr = class extends V {
	constructor(...e) {
		super(...e), this.tasks = [], this.members = [], this.streak = 0, this.showRoutines = !0, this.showTasks = !0, this.showStreak = !0, this.hideName = !1, this.scrollToBucket = "", this._celebrating = !1, this._celebrationTimer = null, this._lastAllRoutinesDone = null, this._scrollRaf = null, this._pendingScrollBucket = !1;
	}
	static {
		this.styles = k`
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
  `;
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
		super.disconnectedCallback(), this._celebrationTimer && clearTimeout(this._celebrationTimer), this._scrollRaf !== null && (cancelAnimationFrame(this._scrollRaf), this._scrollRaf = null), this._listsResizeObs?.disconnect();
	}
	_onScrollBucketChanged() {
		if (!this.scrollToBucket) {
			this._pendingScrollBucket = !1, this._scrollRaf !== null && (cancelAnimationFrame(this._scrollRaf), this._scrollRaf = null), this._listsResizeObs?.disconnect();
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
		t && (e.scrollTop = t.offsetTop - e.offsetTop), e.clientHeight > 0 && (this._pendingScrollBucket = !1, this._listsResizeObs?.disconnect());
	}
	_observeListsResize() {
		if (typeof ResizeObserver > "u") return;
		let e = this.renderRoot?.querySelector(".lists");
		e && (this._listsResizeObs ||= new ResizeObserver(() => this._tryApplyScroll()), this._listsResizeObs.observe(e));
	}
	_sectionForBucket(e) {
		let t = Er.indexOf(this.scrollToBucket);
		if (t < 0) return null;
		for (let n of Er.slice(t)) {
			let t = e.querySelector(`.section[data-bucket="${n}"]`);
			if (t) return t;
		}
		return null;
	}
	render() {
		if (!this.member) return P``;
		let e = jr(this.tasks.filter((e) => e.metadata.type === "routine" ? this.showRoutines : e.metadata.type === "chore" || e.metadata.type === "rotating" ? this.showTasks : !1));
		return P`
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
          ${this.hideName ? "" : P`<div class="member-name">${this.member.name}</div>`}
        </div>

        <div class="lists">
          ${e.map(({ bucket: e, tasks: t }) => P`
            <div class="section" data-bucket=${e}>
              <div class="section-header">
                ${Or[e] ? P`<span class="section-icon">${Or[e]}</span>` : ""}
                ${Dr[e]}
              </div>
              ${t.map((e) => P`
                <lucarne-task-row
                  .task=${e}
                  .memberColor=${this.member.color}
                  .members=${this.members}
                ></lucarne-task-row>
              `)}
            </div>
          `)}
        </div>

        ${this.showStreak ? P`
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
};
J([W({ attribute: !1 })], Mr.prototype, "member", void 0), J([W({ attribute: !1 })], Mr.prototype, "tasks", void 0), J([W({ attribute: !1 })], Mr.prototype, "members", void 0), J([W({ type: Number })], Mr.prototype, "streak", void 0), J([W({
	type: Boolean,
	attribute: "show-routines"
})], Mr.prototype, "showRoutines", void 0), J([W({
	type: Boolean,
	attribute: "show-tasks"
})], Mr.prototype, "showTasks", void 0), J([W({
	type: Boolean,
	attribute: "show-streak"
})], Mr.prototype, "showStreak", void 0), J([W({
	type: Boolean,
	attribute: "hide-name"
})], Mr.prototype, "hideName", void 0), J([W({ attribute: "scroll-to-bucket" })], Mr.prototype, "scrollToBucket", void 0), J([G()], Mr.prototype, "_celebrating", void 0), Mr = J([H("lucarne-member-column")], Mr);
//#endregion
//#region src/shared/integration-services.ts
async function Nr(e, t) {
	let n = {
		member: t.member,
		summary: t.summary,
		type: t.type
	};
	return t.recurrence !== void 0 && (n.recurrence = t.recurrence), t.icon !== void 0 && (n.icon = t.icon), t.due !== void 0 && (n.due = t.due), t.source !== void 0 && (n.source = t.source), t.assignee !== void 0 && (n.assignee = t.assignee), t.time_of_day !== void 0 && (n.time_of_day = t.time_of_day), t.rotation_owners !== void 0 && (n.rotation_owners = t.rotation_owners), t.current_owner !== void 0 && (n.current_owner = t.current_owner), (await e.callService("lucarne_family", "add_task", n, void 0, !0, !0))?.response?.uid ?? null;
}
async function Pr(e, t, n) {
	let r = { uid: t };
	n.type !== void 0 && (r.type = n.type), n.recurrence !== void 0 && (r.recurrence = n.recurrence), n.icon !== void 0 && (r.icon = n.icon), n.assignee !== void 0 && (r.assignee = n.assignee), n.time_of_day !== void 0 && (r.time_of_day = n.time_of_day), n.rotation_owners !== void 0 && (r.rotation_owners = n.rotation_owners), n.current_owner !== void 0 && (r.current_owner = n.current_owner), await e.callService("lucarne_family", "update_task_metadata", r);
}
async function Fr(e, t) {
	await e.callService("lucarne_family", "delete_task", { uid: t });
}
async function Ir(e, t, n) {
	let r = await n.arrayBuffer(), i = new Uint8Array(r), a = "";
	for (let e of i) a += String.fromCharCode(e);
	let o = btoa(a);
	await e.callService("lucarne_family", "upload_avatar", {
		member: t,
		image_data: o,
		mime_type: n.type
	});
}
async function Lr(e, t, n) {
	await e.callService("lucarne_family", "set_member_avatar", {
		member: t,
		avatar: n
	});
}
//#endregion
//#region src/components/add-task-popover.ts
var Rr = [
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
], Q = class extends V {
	constructor(...e) {
		super(...e), this.members = [], this._selectedMemberSlug = "", this._summary = "", this._type = "chore", this._icon = "", this._recurrenceMode = "none", this._recurrenceDays = [], this._recurrenceInterval = 1, this._recurrenceMonthDay = 1, this._recurrenceNth = 1, this._recurrenceNthDay = "MO", this._recurrenceMonth = 1, this._due = "", this._timeOfDay = "anytime", this._error = "", this._saving = !1, this._alsoAddSlugs = /* @__PURE__ */ new Set(), this._rotatingOwners = [];
	}
	static {
		this.styles = [K, k`
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
    `];
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
		return this._recurrenceMode === "none" ? "" : this._recurrenceMode === "daily" ? Qt({
			mode: "daily",
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "weekly" ? this._recurrenceDays.length === 0 ? "" : Qt({
			mode: "weekly",
			days: this._recurrenceDays,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-date" ? Qt({
			mode: "monthly-date",
			dayOfMonth: this._recurrenceMonthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-nth" ? Qt({
			mode: "monthly-nth",
			nth: this._recurrenceNth,
			day: this._recurrenceNthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "yearly" ? Qt({
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
				let n = await Nr(this.hass, {
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
					let i = await Nr(this.hass, {
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
		let e = this._buildRRule(), t = e ? $t(e) : "One-off (no repeat)", n = {
			MO: "Mon",
			TU: "Tue",
			WE: "Wed",
			TH: "Thu",
			FR: "Fri",
			SA: "Sat",
			SU: "Sun"
		};
		return P`
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
            ${this.members.map((e) => P`<option value=${e.slug}>${e.name}</option>`)}
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
            ${Rr.map((e) => P`
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

        ${this._type === "routine" ? P`
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

          ${this._recurrenceMode === "none" ? "" : P`
                <div class="recurrence-extra">
                  ${this._recurrenceMode !== "monthly-nth" && this._recurrenceMode !== "yearly" ? P`
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

                  ${this._recurrenceMode === "weekly" ? P`
                        <div>
                          <label>Days</label>
                          <div class="days-row">
                            ${Xt.map((e) => P`
                              <button
                                class="day-btn ${this._recurrenceDays.includes(e) ? "selected" : ""}"
                                @click=${() => this._toggleDay(e)}
                              >${n[e]}</button>
                            `)}
                          </div>
                        </div>
                      ` : ""}

                  ${this._recurrenceMode === "monthly-date" ? P`
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

                  ${this._recurrenceMode === "monthly-nth" ? P`
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
                              ${Xt.map((e) => P`<option value=${e}>${n[e]}</option>`)}
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

                  ${this._recurrenceMode === "yearly" ? P`
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
			return e.length === 0 ? "" : P`
            <div class="field also-add-section">
              <label>Also add to:</label>
              <div class="also-add-list">
                ${e.map((e) => P`
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

        ${this._type === "rotating" ? P`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter((e) => e.slug !== "household").map((e) => {
			let t = this._rotatingOwners.includes(e.slug), n = this._rotatingOwners.indexOf(e.slug);
			return P`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${t}
                    @change=${() => this._toggleRotatingOwner(e.slug)}
                    aria-label="${e.name}"
                  />
                  ${t ? P`<span class="owner-order">${n + 1}.</span>` : P`<span class="owner-order"></span>`}
                  <span class="owner-name">${e.name}</span>
                  ${t ? P`
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
          ${this._rotatingOwners.length < 2 ? P`<div class="owners-hint">Select at least 2 owners to enable rotation</div>` : ""}
        </div>
        ` : ""}

        ${this._type === "chore" ? P`
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

        ${this._error ? P`<div class="error-msg">${this._error}</div>` : ""}

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
};
J([W({ attribute: !1 })], Q.prototype, "hass", void 0), J([W({ attribute: !1 })], Q.prototype, "member", void 0), J([W({ attribute: !1 })], Q.prototype, "members", void 0), J([G()], Q.prototype, "_selectedMemberSlug", void 0), J([G()], Q.prototype, "_summary", void 0), J([G()], Q.prototype, "_type", void 0), J([G()], Q.prototype, "_icon", void 0), J([G()], Q.prototype, "_recurrenceMode", void 0), J([G()], Q.prototype, "_recurrenceDays", void 0), J([G()], Q.prototype, "_recurrenceInterval", void 0), J([G()], Q.prototype, "_recurrenceMonthDay", void 0), J([G()], Q.prototype, "_recurrenceNth", void 0), J([G()], Q.prototype, "_recurrenceNthDay", void 0), J([G()], Q.prototype, "_recurrenceMonth", void 0), J([G()], Q.prototype, "_due", void 0), J([G()], Q.prototype, "_timeOfDay", void 0), J([G()], Q.prototype, "_error", void 0), J([G()], Q.prototype, "_saving", void 0), J([G()], Q.prototype, "_alsoAddSlugs", void 0), J([G()], Q.prototype, "_rotatingOwners", void 0), Q = J([H("lucarne-add-task-popover")], Q);
//#endregion
//#region src/components/edit-task-popover.ts
var $ = class extends V {
	constructor(...e) {
		super(...e), this.members = [], this._summary = "", this._type = "chore", this._icon = "", this._recurrenceMode = "none", this._recurrenceDays = [], this._recurrenceInterval = 1, this._recurrenceMonthDay = 1, this._recurrenceNth = 1, this._recurrenceNthDay = "MO", this._recurrenceMonth = 1, this._due = "", this._assignee = "", this._timeOfDay = "anytime", this._isCustomRecurrence = !1, this._rawRecurrence = "", this._error = "", this._saving = !1, this._confirmingDelete = !1, this._rotatingOwners = [], this._backdropPressActive = !1;
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	updated(e) {
		super.updated(e), e.has("task") && this.task && this._prefill();
	}
	_prefill() {
		let e = this.task;
		this._summary = e.summary, this._type = e.metadata.type, this._icon = e.metadata.icon, this._due = e.due ?? "", this._assignee = e.metadata.assignee_slug, this._timeOfDay = Cr(e.metadata.time_of_day), this._recurrenceDays = [], this._recurrenceInterval = 1, this._recurrenceMonthDay = 1, this._recurrenceNth = 1, this._recurrenceNthDay = "MO", this._recurrenceMonth = 1, this._rawRecurrence = "", this._isCustomRecurrence = !1, this._rotatingOwners = e.metadata.rotation_owners ? [...e.metadata.rotation_owners] : [];
		let t = Zt(e.metadata.recurrence);
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
		return this._isCustomRecurrence ? this._rawRecurrence : this._recurrenceMode === "none" ? "" : this._recurrenceMode === "daily" ? Qt({
			mode: "daily",
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "weekly" ? Qt({
			mode: "weekly",
			days: this._recurrenceDays,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-date" ? Qt({
			mode: "monthly-date",
			dayOfMonth: this._recurrenceMonthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "monthly-nth" ? Qt({
			mode: "monthly-nth",
			nth: this._recurrenceNth,
			day: this._recurrenceNthDay,
			...this._recurrenceInterval > 1 ? { interval: this._recurrenceInterval } : {}
		}) : this._recurrenceMode === "yearly" ? Qt({
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
				let e = this.task.metadata.member_slug === "household" ? "todo.lucarne_household" : this.members.find((e) => e.slug === this.task.metadata.member_slug)?.todo_entity_id ?? "", t = this._summary.trim() !== this.task.summary, n = !!this._due && this._due !== (this.task.due ?? ""), r = this._type === "rotating", i = this.task.metadata.rotation_owners ?? [], a = r && JSON.stringify(this._rotatingOwners) !== JSON.stringify(i), o = this._type !== this.task.metadata.type || this._icon !== this.task.metadata.icon || !r && this._buildRRule() !== this.task.metadata.recurrence || this._timeOfDay !== (this.task.metadata.time_of_day ?? "anytime") || this.task.metadata.member_slug === "household" && !r && this._assignee !== this.task.metadata.assignee_slug || a;
				if (t || n) {
					if (!e) throw Error("Could not resolve todo entity for this task");
					await this.hass.callService("todo", "update_item", {
						item: this.task.uid,
						rename: this._summary.trim(),
						...n ? { due_datetime: this._due } : {}
					}, { entity_id: e });
				}
				if (o) {
					let e = this.task.metadata.member_slug === "household", t = r && !!this.task.metadata.current_owner && !this._rotatingOwners.includes(this.task.metadata.current_owner);
					await Pr(this.hass, this.task.uid, {
						...this._type === this.task.metadata.type ? {} : { type: this._type },
						...this._icon === this.task.metadata.icon ? {} : { icon: this._icon },
						...!r && this._buildRRule() !== this.task.metadata.recurrence ? { recurrence: this._buildRRule() } : {},
						...this._timeOfDay === (this.task.metadata.time_of_day ?? "anytime") ? {} : { time_of_day: this._timeOfDay },
						...e && !r && this._assignee !== this.task.metadata.assignee_slug ? { assignee: this._assignee } : {},
						...a ? { rotation_owners: this._rotatingOwners } : {},
						...t ? { current_owner: this._rotatingOwners[0] } : {}
					});
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
				await Fr(this.hass, this.task.uid), this.dispatchEvent(new CustomEvent("task-deleted", {
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
		if (!this.task) return P``;
		let e = this.task.metadata.member_slug === "household", t = e ? "Household" : this.members.find((e) => e.slug === this.task.metadata.member_slug)?.name ?? this.task.metadata.member_slug, n = this._buildRRule(), r = this._isCustomRecurrence ? "Custom recurrence (not editable here)" : $t(n), i = {
			MO: "Mon",
			TU: "Tue",
			WE: "Wed",
			TH: "Thu",
			FR: "Fri",
			SA: "Sat",
			SU: "Sun"
		};
		return P`
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
          <div class="readonly-field" title="Member cannot be changed in v1">${t}</div>
          <div class="readonly-tooltip">Member cannot be changed here</div>
        </div>

        ${e && this._type !== "rotating" ? P`
              <div class="field">
                <label for="et-assignee">Assignee (optional)</label>
                <select
                  id="et-assignee"
                  .value=${this._assignee}
                  @change=${(e) => this._assignee = e.target.value}
                >
                  <option value="">— None —</option>
                  ${this.members.filter((e) => e.slug !== "household").map((e) => P`<option value=${e.slug}>${e.name}</option>`)}
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
            ${this.task?.metadata?.member_slug === "household" ? P`<button class="type-btn ${this._type === "rotating" ? "active" : ""}" @click=${() => this._type = "rotating"}>Rotating</button>` : ""}
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

        ${this._type === "rotating" ? P`
        <div class="field">
          <label>Owners (turn order)</label>
          <div class="owners-list">
            ${this.members.filter((e) => e.slug !== "household").map((e) => {
			let t = this._rotatingOwners.includes(e.slug), n = this._rotatingOwners.indexOf(e.slug);
			return P`
                <div class="owner-item">
                  <input
                    type="checkbox"
                    .checked=${t}
                    ?disabled=${this._rotatingOwners.length <= 1 && t}
                    @change=${() => this._toggleRotatingOwner(e.slug)}
                    aria-label="${e.name}"
                  />
                  ${t ? P`<span class="owner-order">${n + 1}.</span>` : P`<span class="owner-order"></span>`}
                  <span class="owner-name">${e.name}</span>
                  ${t ? P`
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
          ${this._rotatingOwners.length < 2 ? P`<div class="owners-hint">Select at least 2 owners — delete the task to remove all owners</div>` : ""}
        </div>
        ` : P`
        <div class="field">
          <label for="et-recurrence">Recurrence</label>
          ${this._isCustomRecurrence ? P`<div class="custom-recurrence-note">${r}</div>` : P`
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

                ${this._recurrenceMode === "none" ? "" : P`
                      <div class="recurrence-extra">
                        ${this._recurrenceMode !== "monthly-nth" && this._recurrenceMode !== "yearly" ? P`
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

                        ${this._recurrenceMode === "weekly" ? P`
                              <div>
                                <label>Days</label>
                                <div class="days-row">
                                  ${Xt.map((e) => P`
                                    <button
                                      class="day-btn ${this._recurrenceDays.includes(e) ? "selected" : ""}"
                                      @click=${() => this._toggleDay(e)}
                                    >${i[e]}</button>
                                  `)}
                                </div>
                              </div>
                            ` : ""}

                        ${this._recurrenceMode === "monthly-date" ? P`
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

                        ${this._recurrenceMode === "monthly-nth" ? P`
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
                                    ${Xt.map((e) => P`<option value=${e}>${i[e]}</option>`)}
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

                        ${this._recurrenceMode === "yearly" ? P`
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
                      <div class="recurrence-summary">${r}</div>
                    `}
              `}
        </div>
        `}

        ${this._type === "rotating" ? "" : P`
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

        ${this._error ? P`<div class="error-msg">${this._error}</div>` : ""}

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
          ${this._confirmingDelete ? P`
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
              ` : P`
                <button class="btn btn-delete" @click=${() => this._confirmingDelete = !0}>
                  Delete Task
                </button>
              `}
        </div>
      </div>
    `;
	}
};
J([W({ attribute: !1 })], $.prototype, "hass", void 0), J([W({ attribute: !1 })], $.prototype, "task", void 0), J([W({ attribute: !1 })], $.prototype, "members", void 0), J([G()], $.prototype, "_summary", void 0), J([G()], $.prototype, "_type", void 0), J([G()], $.prototype, "_icon", void 0), J([G()], $.prototype, "_recurrenceMode", void 0), J([G()], $.prototype, "_recurrenceDays", void 0), J([G()], $.prototype, "_recurrenceInterval", void 0), J([G()], $.prototype, "_recurrenceMonthDay", void 0), J([G()], $.prototype, "_recurrenceNth", void 0), J([G()], $.prototype, "_recurrenceNthDay", void 0), J([G()], $.prototype, "_recurrenceMonth", void 0), J([G()], $.prototype, "_due", void 0), J([G()], $.prototype, "_assignee", void 0), J([G()], $.prototype, "_timeOfDay", void 0), J([G()], $.prototype, "_isCustomRecurrence", void 0), J([G()], $.prototype, "_rawRecurrence", void 0), J([G()], $.prototype, "_error", void 0), J([G()], $.prototype, "_saving", void 0), J([G()], $.prototype, "_confirmingDelete", void 0), J([G()], $.prototype, "_rotatingOwners", void 0), $ = J([H("lucarne-edit-task-popover")], $);
var zr = 1e4;
window.customCards = window.customCards || [], window.customCards.push({
	type: "lucarne-chores-card",
	name: "Lucarne Chores",
	description: "Family chore grid with streaks and celebration",
	preview: !0
});
var Br = class extends tt {
	constructor(...e) {
		super(...e), this._familyState = null, this._addTaskMember = null, this._editTask = null, this._optimistic = /* @__PURE__ */ new Map(), this._optimisticAdds = /* @__PURE__ */ new Map(), this._deletedUids = /* @__PURE__ */ new Set(), this._addTimers = /* @__PURE__ */ new Map(), this._onFamilyState = (e) => {
			if (this._optimistic.size > 0 || this._optimisticAdds.size > 0 || this._deletedUids.size > 0) {
				let t = /* @__PURE__ */ new Set(), n = new Map(this._optimistic);
				for (let r of e.tasksByMember.values()) for (let e of r) t.add(e.uid), n.get(e.uid) === e.status && n.delete(e.uid);
				if (this._deletedUids.size > 0) {
					let e = /* @__PURE__ */ new Set();
					for (let n of this._deletedUids) t.has(n) && e.add(n);
					e.size !== this._deletedUids.size && (this._deletedUids = e);
				}
				if (this._optimistic.size > 0) {
					for (let e of n.keys()) t.has(e) || n.delete(e);
					this._optimistic = n;
				}
				if (this._optimisticAdds.size > 0) {
					let e = new Map(this._optimisticAdds), n = !1;
					for (let r of e.keys()) t.has(r) && (e.delete(r), this._clearAddTimeout(r), n = !0);
					n && (this._optimisticAdds = e);
				}
			}
			this._familyState = e;
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
			if (!t?.length) return;
			let n = new Map(this._optimisticAdds);
			for (let e of t) n.set(e.uid, e), this._scheduleAddCleanup(e.uid);
			this._optimisticAdds = n;
		};
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	setConfig(e) {
		if ("kids" in e) {
			this._config = e;
			return;
		}
		if (!Array.isArray(e.members)) throw Error("lucarne-chores-card: members must be an array");
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
		super.connectedCallback(), this.hass && !this._unsubFamily && (this._unsubFamily = _t(this.hass, this._onFamilyState)), this._scheduleMidnightRefresh(), this._scheduleScrollRefresh();
	}
	_scheduleMidnightRefresh() {
		this._midnightTimer && clearTimeout(this._midnightTimer), this._midnightTimer = setTimeout(() => {
			this._midnightTimer = void 0, this.requestUpdate(), this._scheduleMidnightRefresh();
		}, Mn(/* @__PURE__ */ new Date()));
	}
	_scheduleScrollRefresh() {
		if (this._scrollTimer && clearTimeout(this._scrollTimer), this._scrollTimer = void 0, !(this._config?.auto_scroll ?? !0)) return;
		let e = this._config?.afternoon_start ?? "12:00", t = this._config?.night_start ?? "19:00", n = Fn(/* @__PURE__ */ new Date(), [e, t]);
		Number.isFinite(n) && (this._scrollTimer = setTimeout(() => {
			this._scrollTimer = void 0, this.requestUpdate(), this._scheduleScrollRefresh();
		}, n));
	}
	updated(e) {
		super.updated(e), e.has("hass") && this.hass && !this._unsubFamily && (this._unsubFamily = _t(this.hass, this._onFamilyState));
	}
	_scheduleAddCleanup(e) {
		this._clearAddTimeout(e), this._addTimers.set(e, setTimeout(() => {
			if (this._addTimers.delete(e), this._optimisticAdds.has(e)) {
				let t = new Map(this._optimisticAdds);
				t.delete(e), this._optimisticAdds = t;
			}
		}, zr));
	}
	_clearAddTimeout(e) {
		let t = this._addTimers.get(e);
		t !== void 0 && (clearTimeout(t), this._addTimers.delete(e));
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unsubFamily?.(), this._unsubFamily = void 0, this._midnightTimer &&= (clearTimeout(this._midnightTimer), void 0), this._scrollTimer &&= (clearTimeout(this._scrollTimer), void 0);
		for (let e of this._addTimers.values()) clearTimeout(e);
		this._addTimers.clear();
	}
	_resolveMembers() {
		if (!this._config || !this._familyState) return [];
		let { members: e } = this._config, t = new Set(this._config.hidden_members ?? []), n = this._config.show_routines ?? !0, r = this._config.show_tasks ?? !0, i = /* @__PURE__ */ new Date(), a = new Date(i.getFullYear(), i.getMonth(), i.getDate(), 23, 59, 59, 999), o = (this._familyState.tasksByMember.get("household") ?? []).filter((e) => !this._deletedUids.has(e.uid)), s = (e) => {
			let t = this._optimistic.get(e.uid);
			return t && t !== e.status ? {
				...e,
				status: t
			} : e;
		}, c = (e) => e.metadata.type === "routine" ? n : e.metadata.type === "chore" && r ? e.due === null ? !0 : (e.due.includes("T") ? new Date(e.due) : /* @__PURE__ */ new Date(e.due + "T00:00:00")) <= a : !1, l = [...this._optimisticAdds.values()], u = new Set(o.map((e) => e.uid)), d = [];
		for (let n of e) {
			if (t.has(n)) continue;
			let e = n === "household" ? pt : this._familyState.members.find((e) => e.slug === n) ?? null;
			if (!e) continue;
			let i = (this._familyState.tasksByMember.get(n) ?? []).filter((e) => !this._deletedUids.has(e.uid)), a = new Set(i.map((e) => e.uid)), f = i.filter(c).map(s), p = l.filter((e) => e.metadata.member_slug === n && e.metadata.type !== "rotating" && !a.has(e.uid) && !this._deletedUids.has(e.uid) && c(e)), m;
			if (n === "household") m = [...f, ...p];
			else {
				let e = r ? o.filter((e) => e.metadata.type === "rotating" && e.metadata.current_owner === n).map(s) : [], t = r ? l.filter((e) => e.metadata.type === "rotating" && e.metadata.current_owner === n && !u.has(e.uid) && !this._deletedUids.has(e.uid)) : [];
				m = [
					...f,
					...e,
					...p,
					...t
				];
			}
			let h = this._familyState.streakByMember.get(n) ?? 0;
			d.push({
				member: e,
				tasks: m,
				streak: h
			});
		}
		return d;
	}
	async _handleTaskToggle(e) {
		let { task: t } = e.detail;
		if (!this.hass || !this._familyState) return;
		let n = t.status === "completed" ? "needs_action" : "completed", r = t.metadata.member_slug === "household" ? "todo.lucarne_household" : this._familyState.members.find((e) => e.slug === t.metadata.member_slug)?.todo_entity_id ?? "";
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
	_handleAddTask(e) {
		let { memberSlug: t } = e.detail;
		if (!this._familyState) return;
		let n = t === "household" ? pt : this._familyState.members.find((e) => e.slug === t) ?? null;
		n && (this._addTaskMember = n);
	}
	_handleLongPress(e) {
		let { task: t } = e.detail;
		this._editTask = t;
	}
	renderContent() {
		if (!this._config) return P``;
		if ("kids" in this._config) return P`
        <ha-card>
          <div class="error-block">
            <strong>Card upgraded</strong>
            This card was upgraded. Install the Lucarne Family integration and update your YAML.
          </div>
        </ha-card>
      `;
		let e = this._config.title ?? "Chores", t = this._config.show_routines ?? !0, n = this._config.show_tasks ?? !0, r = this._config.show_streak ?? !0, i = this._config.hide_names ?? !1, a = this._config.auto_scroll ?? !0 ? Pn(/* @__PURE__ */ new Date(), this._config.afternoon_start ?? "12:00", this._config.night_start ?? "19:00") : "";
		if (this._familyState === null) return P`<ha-card><div class="loading">Loading…</div></ha-card>`;
		if (this._familyState.integrationError !== null) return P`
        <ha-card>
          <div class="error-block">
            <strong>Lucarne Family integration not set up</strong>
            Install it in Settings → Devices &amp; Services.
          </div>
        </ha-card>
      `;
		let o = this._resolveMembers(), s = [...this._familyState.members, pt];
		return P`
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
          ${o.map(({ member: e, tasks: o, streak: c }) => P`
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

      ${this._addTaskMember === null ? "" : P`
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

      ${this._editTask === null ? "" : P`
            <lucarne-edit-task-popover
              .hass=${this.hass}
              .task=${this._editTask}
              .members=${s}
              @task-deleted=${this._handleTaskDeleted}
              @popover-close=${() => {
			this._editTask = null;
		}}
            ></lucarne-edit-task-popover>
          `}
    `;
	}
};
J([W({ attribute: !1 })], Br.prototype, "hass", void 0), J([G()], Br.prototype, "_config", void 0), J([G()], Br.prototype, "_familyState", void 0), J([G()], Br.prototype, "_addTaskMember", void 0), J([G()], Br.prototype, "_editTask", void 0), J([G()], Br.prototype, "_optimistic", void 0), J([G()], Br.prototype, "_optimisticAdds", void 0), J([G()], Br.prototype, "_deletedUids", void 0), Br = J([H("lucarne-chores-card")], Br);
//#endregion
//#region src/shared/cropper-styles.ts
var Vr = /* @__PURE__ */ c((/* @__PURE__ */ o(((e, t) => {
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
		var h = typeof window < "u" && window.document !== void 0, g = h ? window : {}, _ = h && g.document.documentElement ? "ontouchstart" in g.document.documentElement : !1, v = h ? "PointerEvent" in g : !1, y = "cropper", ee = "all", te = "crop", ne = "move", b = "zoom", x = "e", S = "w", C = "s", w = "n", T = "ne", E = "nw", D = "se", O = "sw", k = `${y}-crop`, A = `${y}-disabled`, j = `${y}-hidden`, M = `${y}-hide`, re = `${y}-invisible`, ie = `${y}-modal`, ae = `${y}-move`, oe = `${y}Action`, se = `${y}Preview`, ce = "crop", le = "move", ue = "none", de = "crop", fe = "cropend", pe = "cropmove", me = "cropstart", he = "dblclick", ge = _ ? "touchstart" : "mousedown", _e = _ ? "touchmove" : "mousemove", ve = _ ? "touchend touchcancel" : "mouseup", ye = v ? "pointerdown" : ge, be = v ? "pointermove" : _e, xe = v ? "pointerup pointercancel" : ve, Se = "ready", Ce = "resize", we = "wheel", Te = "zoom", Ee = "image/jpeg", De = /^e|w|s|n|se|sw|ne|nw|all|crop|move|zoom$/, Oe = /^data:/, ke = /^data:image\/jpeg;base64,/, Ae = /^img|canvas$/i, je = 200, Me = 100, Ne = {
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
		function P(e) {
			return i(e) === "object" && e !== null;
		}
		var F = Object.prototype.hasOwnProperty;
		function I(e) {
			if (!P(e)) return !1;
			try {
				var t = e.constructor, n = t.prototype;
				return t && n && F.call(n, "isPrototypeOf");
			} catch {
				return !1;
			}
		}
		function L(e) {
			return typeof e == "function";
		}
		var Re = Array.prototype.slice;
		function ze(e) {
			return Array.from ? Array.from(e) : Re.call(e);
		}
		function R(e, t) {
			return e && L(t) && (Array.isArray(e) || N(e.length) ? ze(e).forEach(function(n, r) {
				t.call(e, n, r, e);
			}) : P(e) && Object.keys(e).forEach(function(n) {
				t.call(e, e[n], n, e);
			})), e;
		}
		var z = Object.assign || function(e) {
			var t = [...arguments].slice(1);
			return P(e) && t.length > 0 && t.forEach(function(t) {
				P(t) && Object.keys(t).forEach(function(n) {
					e[n] = t[n];
				});
			}), e;
		}, Be = /\.\d*(?:0|9){12}\d*$/;
		function Ve(e) {
			var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1e11;
			return Be.test(e) ? Math.round(e * t) / t : e;
		}
		var He = /^width|height|left|top|marginLeft|marginTop$/;
		function Ue(e, t) {
			var n = e.style;
			R(t, function(e, t) {
				He.test(t) && N(e) && (e = `${e}px`), n[t] = e;
			});
		}
		function We(e, t) {
			return e.classList ? e.classList.contains(t) : e.className.indexOf(t) > -1;
		}
		function B(e, t) {
			if (t) {
				if (N(e.length)) {
					R(e, function(e) {
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
					R(e, function(e) {
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
					R(e, function(e) {
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
			return P(e[t]) ? e[t] : e.dataset ? e.dataset[t] : e.getAttribute(`data-${Je(t)}`);
		}
		function Xe(e, t, n) {
			P(n) ? e[t] = n : e.dataset ? e.dataset[t] = n : e.setAttribute(`data-${Je(t)}`, n);
		}
		function V(e, t) {
			if (P(e[t])) try {
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
		var Ze = /\s\s*/, H = function() {
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
		function Qe(e, t, n) {
			var r = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, i = n;
			t.trim().split(Ze).forEach(function(t) {
				if (!H) {
					var a = e.listeners;
					a && a[t] && a[t][n] && (i = a[t][n], delete a[t][n], Object.keys(a[t]).length === 0 && delete a[t], Object.keys(a).length === 0 && delete e.listeners);
				}
				e.removeEventListener(t, i, r);
			});
		}
		function U(e, t, n) {
			var r = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, i = n;
			t.trim().split(Ze).forEach(function(t) {
				if (r.once && !H) {
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
		function W(e, t, n) {
			var r;
			return L(Event) && L(CustomEvent) ? r = new CustomEvent(t, {
				detail: n,
				bubbles: !0,
				cancelable: !0
			}) : (r = document.createEvent("CustomEvent"), r.initCustomEvent(t, !0, !0, n)), e.dispatchEvent(r);
		}
		function G(e) {
			var t = e.getBoundingClientRect();
			return {
				left: t.left + (window.pageXOffset - document.documentElement.clientLeft),
				top: t.top + (window.pageYOffset - document.documentElement.clientTop)
			};
		}
		var $e = g.location, et = /^(\w+:)\/\/([^:/?#]*):?(\d*)/i;
		function K(e) {
			var t = e.match(et);
			return t !== null && (t[1] !== $e.protocol || t[2] !== $e.hostname || t[3] !== $e.port);
		}
		function tt(e) {
			var t = `timestamp=${(/* @__PURE__ */ new Date()).getTime()}`;
			return e + (e.indexOf("?") === -1 ? "?" : "&") + t;
		}
		function nt(e) {
			var t = e.rotate, n = e.scaleX, r = e.scaleY, i = e.translateX, a = e.translateY, o = [];
			N(i) && i !== 0 && o.push(`translateX(${i}px)`), N(a) && a !== 0 && o.push(`translateY(${a}px)`), N(t) && t !== 0 && o.push(`rotate(${t}deg)`), N(n) && n !== 1 && o.push(`scaleX(${n})`), N(r) && r !== 1 && o.push(`scaleY(${r})`);
			var s = o.length ? o.join(" ") : "none";
			return {
				WebkitTransform: s,
				msTransform: s,
				transform: s
			};
		}
		function rt(e) {
			var n = t({}, e), r = 0;
			return R(e, function(e, t) {
				delete n[t], R(n, function(t) {
					var n = Math.abs(e.startX - t.startX), i = Math.abs(e.startY - t.startY), a = Math.abs(e.endX - t.endX), o = Math.abs(e.endY - t.endY), s = Math.sqrt(n * n + i * i), c = (Math.sqrt(a * a + o * o) - s) / s;
					Math.abs(c) > Math.abs(r) && (r = c);
				});
			}), r;
		}
		function it(e, n) {
			var r = e.pageX, i = e.pageY, a = {
				endX: r,
				endY: i
			};
			return n ? a : t({
				startX: r,
				startY: i
			}, a);
		}
		function at(e) {
			var t = 0, n = 0, r = 0;
			return R(e, function(e) {
				var i = e.startX, a = e.startY;
				t += i, n += a, r += 1;
			}), t /= r, n /= r, {
				pageX: t,
				pageY: n
			};
		}
		function ot(e) {
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
		function st(e) {
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
		function ct(e, t, n, r) {
			var i = t.aspectRatio, a = t.naturalWidth, o = t.naturalHeight, s = t.rotate, c = s === void 0 ? 0 : s, u = t.scaleX, d = u === void 0 ? 1 : u, f = t.scaleY, p = f === void 0 ? 1 : f, m = n.aspectRatio, h = n.naturalWidth, g = n.naturalHeight, _ = r.fillColor, v = _ === void 0 ? "transparent" : _, y = r.imageSmoothingEnabled, ee = y === void 0 ? !0 : y, te = r.imageSmoothingQuality, ne = te === void 0 ? "low" : te, b = r.maxWidth, x = b === void 0 ? Infinity : b, S = r.maxHeight, C = S === void 0 ? Infinity : S, w = r.minWidth, T = w === void 0 ? 0 : w, E = r.minHeight, D = E === void 0 ? 0 : E, O = document.createElement("canvas"), k = O.getContext("2d"), A = ot({
				aspectRatio: m,
				width: x,
				height: C
			}), j = ot({
				aspectRatio: m,
				width: T,
				height: D
			}, "cover"), M = Math.min(A.width, Math.max(j.width, h)), re = Math.min(A.height, Math.max(j.height, g)), ie = ot({
				aspectRatio: i,
				width: x,
				height: C
			}), ae = ot({
				aspectRatio: i,
				width: T,
				height: D
			}, "cover"), oe = Math.min(ie.width, Math.max(ae.width, a)), se = Math.min(ie.height, Math.max(ae.height, o)), ce = [
				-oe / 2,
				-se / 2,
				oe,
				se
			];
			return O.width = Ve(M), O.height = Ve(re), k.fillStyle = v, k.fillRect(0, 0, M, re), k.save(), k.translate(M / 2, re / 2), k.rotate(c * Math.PI / 180), k.scale(d, p), k.imageSmoothingEnabled = ee, k.imageSmoothingQuality = ne, k.drawImage.apply(k, [e].concat(l(ce.map(function(e) {
				return Math.floor(Ve(e));
			})))), k.restore(), O;
		}
		var lt = String.fromCharCode;
		function ut(e, t, n) {
			var r = "";
			n += t;
			for (var i = t; i < n; i += 1) r += lt(e.getUint8(i));
			return r;
		}
		var dt = /^data:.*,/;
		function ft(e) {
			var t = e.replace(dt, ""), n = atob(t), r = new ArrayBuffer(n.length), i = new Uint8Array(r);
			return R(i, function(e, t) {
				i[t] = n.charCodeAt(t);
			}), r;
		}
		function pt(e, t) {
			for (var n = [], r = 8192, i = new Uint8Array(e); i.length > 0;) n.push(lt.apply(null, ze(i.subarray(0, r)))), i = i.subarray(r);
			return `data:${t};base64,${btoa(n.join(""))}`;
		}
		function mt(e) {
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
					if (ut(t, c, 4) === "Exif") {
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
		function ht(e) {
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
		var gt = {
			render: function() {
				this.initContainer(), this.initCanvas(), this.initCropBox(), this.renderCanvas(), this.cropped && this.renderCropBox();
			},
			initContainer: function() {
				var e = this.element, t = this.options, n = this.container, r = this.cropper, i = Number(t.minContainerWidth), a = Number(t.minContainerHeight);
				B(r, j), Ge(e, j);
				var o = {
					width: Math.max(n.offsetWidth, i >= 0 ? i : je),
					height: Math.max(n.offsetHeight, a >= 0 ? a : Me)
				};
				this.containerData = o, Ue(r, {
					width: o.width,
					height: o.height
				}), B(e, j), Ge(r, j);
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
				this.canvasData = l, this.limited = n === 1 || n === 2, this.limitCanvas(!0, !0), l.width = Math.min(Math.max(l.width, l.minWidth), l.maxWidth), l.height = Math.min(Math.max(l.height, l.minHeight), l.maxHeight), l.left = (e.width - l.width) / 2, l.top = (e.height - l.height) / 2, l.oldLeft = l.left, l.oldTop = l.top, this.initialCanvasData = z({}, l);
			},
			limitCanvas: function(e, t) {
				var n = this.options, r = this.containerData, i = this.canvasData, a = this.cropBoxData, o = n.viewMode, s = i.aspectRatio, c = this.cropped && a;
				if (e) {
					var l = Number(n.minCanvasWidth) || 0, u = Number(n.minCanvasHeight) || 0;
					o > 1 ? (l = Math.max(l, r.width), u = Math.max(u, r.height), o === 3 && (u * s > l ? l = u * s : u = l / s)) : o > 0 && (l ? l = Math.max(l, c ? a.width : 0) : u ? u = Math.max(u, c ? a.height : 0) : c && (l = a.width, u = a.height, u * s > l ? l = u * s : u = l / s));
					var d = ot({
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
					var i = st({
						width: r.naturalWidth * Math.abs(r.scaleX || 1),
						height: r.naturalHeight * Math.abs(r.scaleY || 1),
						degree: r.rotate || 0
					}), a = i.width, o = i.height, s = n.width * (a / n.naturalWidth), c = n.height * (o / n.naturalHeight);
					n.left -= (s - n.width) / 2, n.top -= (c - n.height) / 2, n.width = s, n.height = c, n.aspectRatio = a / o, n.naturalWidth = a, n.naturalHeight = o, this.limitCanvas(!0, !1);
				}
				(n.width > n.maxWidth || n.width < n.minWidth) && (n.left = n.oldLeft), (n.height > n.maxHeight || n.height < n.minHeight) && (n.top = n.oldTop), n.width = Math.min(Math.max(n.width, n.minWidth), n.maxWidth), n.height = Math.min(Math.max(n.height, n.minHeight), n.maxHeight), this.limitCanvas(!1, !0), n.left = Math.min(Math.max(n.left, n.minLeft), n.maxLeft), n.top = Math.min(Math.max(n.top, n.minTop), n.maxTop), n.oldLeft = n.left, n.oldTop = n.top, Ue(this.canvas, z({
					width: n.width,
					height: n.height
				}, nt({
					translateX: n.left,
					translateY: n.top
				}))), this.renderImage(e), this.cropped && this.limited && this.limitCropBox(!0, !0);
			},
			renderImage: function(e) {
				var t = this.canvasData, n = this.imageData, r = n.naturalWidth * (t.width / t.naturalWidth), i = n.naturalHeight * (t.height / t.naturalHeight);
				z(n, {
					width: r,
					height: i,
					left: (t.width - r) / 2,
					top: (t.height - i) / 2
				}), Ue(this.image, z({
					width: n.width,
					height: n.height
				}, nt(z({
					translateX: n.left,
					translateY: n.top
				}, n)))), e && this.output();
			},
			initCropBox: function() {
				var e = this.options, t = this.canvasData, n = e.aspectRatio || e.initialAspectRatio, r = Number(e.autoCropArea) || .8, i = {
					width: t.width,
					height: t.height
				};
				n && (t.height * n > t.width ? i.height = i.width / n : i.width = i.height * n), this.cropBoxData = i, this.limitCropBox(!0, !0), i.width = Math.min(Math.max(i.width, i.minWidth), i.maxWidth), i.height = Math.min(Math.max(i.height, i.minHeight), i.maxHeight), i.width = Math.max(i.minWidth, i.width * r), i.height = Math.max(i.minHeight, i.height * r), i.left = t.left + (t.width - i.width) / 2, i.top = t.top + (t.height - i.height) / 2, i.oldLeft = i.left, i.oldTop = i.top, this.initialCropBoxData = z({}, i);
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
				(n.width > n.maxWidth || n.width < n.minWidth) && (n.left = n.oldLeft), (n.height > n.maxHeight || n.height < n.minHeight) && (n.top = n.oldTop), n.width = Math.min(Math.max(n.width, n.minWidth), n.maxWidth), n.height = Math.min(Math.max(n.height, n.minHeight), n.maxHeight), this.limitCropBox(!1, !0), n.left = Math.min(Math.max(n.left, n.minLeft), n.maxLeft), n.top = Math.min(Math.max(n.top, n.minTop), n.maxTop), n.oldLeft = n.left, n.oldTop = n.top, e.movable && e.cropBoxMovable && Xe(this.face, oe, n.width >= t.width && n.height >= t.height ? ne : ee), Ue(this.cropBox, z({
					width: n.width,
					height: n.height
				}, nt({
					translateX: n.left,
					translateY: n.top
				}))), this.cropped && this.limited && this.limitCanvas(!0, !0), this.disabled || this.output();
			},
			output: function() {
				this.preview(), W(this.element, de, this.getData());
			}
		}, _t = {
			initPreview: function() {
				var e = this.element, t = this.crossOrigin, n = this.options.preview, r = t ? this.crossOriginUrl : this.url, i = e.alt || "The image to preview", a = document.createElement("img");
				if (t && (a.crossOrigin = t), a.src = r, a.alt = i, this.viewBox.appendChild(a), this.viewBoxImage = a, n) {
					var o = n;
					typeof n == "string" ? o = e.ownerDocument.querySelectorAll(n) : n.querySelector && (o = [n]), this.previews = o, R(o, function(e) {
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
				R(this.previews, function(e) {
					var t = Ye(e, se);
					Ue(e, {
						width: t.width,
						height: t.height
					}), e.innerHTML = t.html, V(e, se);
				});
			},
			preview: function() {
				var e = this.imageData, t = this.canvasData, n = this.cropBoxData, r = n.width, i = n.height, a = e.width, o = e.height, s = n.left - t.left - e.left, c = n.top - t.top - e.top;
				!this.cropped || this.disabled || (Ue(this.viewBoxImage, z({
					width: a,
					height: o
				}, nt(z({
					translateX: -s,
					translateY: -c
				}, e)))), R(this.previews, function(t) {
					var n = Ye(t, se), l = n.width, u = n.height, d = l, f = u, p = 1;
					r && (p = l / r, f = i * p), i && f > u && (p = u / i, d = r * p, f = u), Ue(t, {
						width: d,
						height: f
					}), Ue(t.getElementsByTagName("img")[0], z({
						width: a * p,
						height: o * p
					}, nt(z({
						translateX: -s * p,
						translateY: -c * p
					}, e))));
				}));
			}
		}, q = {
			bind: function() {
				var e = this.element, t = this.options, n = this.cropper;
				L(t.cropstart) && U(e, me, t.cropstart), L(t.cropmove) && U(e, pe, t.cropmove), L(t.cropend) && U(e, fe, t.cropend), L(t.crop) && U(e, de, t.crop), L(t.zoom) && U(e, Te, t.zoom), U(n, ye, this.onCropStart = this.cropStart.bind(this)), t.zoomable && t.zoomOnWheel && U(n, we, this.onWheel = this.wheel.bind(this), {
					passive: !1,
					capture: !0
				}), t.toggleDragModeOnDblclick && U(n, he, this.onDblclick = this.dblclick.bind(this)), U(e.ownerDocument, be, this.onCropMove = this.cropMove.bind(this)), U(e.ownerDocument, xe, this.onCropEnd = this.cropEnd.bind(this)), t.responsive && U(window, Ce, this.onResize = this.resize.bind(this));
			},
			unbind: function() {
				var e = this.element, t = this.options, n = this.cropper;
				L(t.cropstart) && Qe(e, me, t.cropstart), L(t.cropmove) && Qe(e, pe, t.cropmove), L(t.cropend) && Qe(e, fe, t.cropend), L(t.crop) && Qe(e, de, t.crop), L(t.zoom) && Qe(e, Te, t.zoom), Qe(n, ye, this.onCropStart), t.zoomable && t.zoomOnWheel && Qe(n, we, this.onWheel, {
					passive: !1,
					capture: !0
				}), t.toggleDragModeOnDblclick && Qe(n, he, this.onDblclick), Qe(e.ownerDocument, be, this.onCropMove), Qe(e.ownerDocument, xe, this.onCropEnd), t.responsive && Qe(window, Ce, this.onResize);
			}
		}, J = {
			resize: function() {
				if (!this.disabled) {
					var e = this.options, t = this.container, n = this.containerData, r = t.offsetWidth / n.width, i = t.offsetHeight / n.height, a = Math.abs(r - 1) > Math.abs(i - 1) ? r : i;
					if (a !== 1) {
						var o, s;
						e.restore && (o = this.getCanvasData(), s = this.getCropBoxData()), this.render(), e.restore && (this.setCanvasData(R(o, function(e, t) {
							o[t] = e * a;
						})), this.setCropBoxData(R(s, function(e, t) {
							s[t] = e * a;
						})));
					}
				}
			},
			dblclick: function() {
				this.disabled || this.options.dragMode === ue || this.setDragMode(We(this.dragBox, k) ? le : ce);
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
					e.changedTouches ? R(e.changedTouches, function(e) {
						i[e.identifier] = it(e);
					}) : i[e.pointerId || 0] = it(e), a = Object.keys(i).length > 1 && r.zoomable && r.zoomOnTouch ? b : Ye(e.target, oe), De.test(a) && W(this.element, me, {
						originalEvent: e,
						action: a
					}) !== !1 && (e.preventDefault(), this.action = a, this.cropping = !1, a === te && (this.cropping = !0, B(this.dragBox, ie)));
				}
			},
			cropMove: function(e) {
				var t = this.action;
				if (!(this.disabled || !t)) {
					var n = this.pointers;
					e.preventDefault(), W(this.element, pe, {
						originalEvent: e,
						action: t
					}) !== !1 && (e.changedTouches ? R(e.changedTouches, function(e) {
						z(n[e.identifier] || {}, it(e, !0));
					}) : z(n[e.pointerId || 0] || {}, it(e, !0)), this.change(e));
				}
			},
			cropEnd: function(e) {
				if (!this.disabled) {
					var t = this.action, n = this.pointers;
					e.changedTouches ? R(e.changedTouches, function(e) {
						delete n[e.identifier];
					}) : delete n[e.pointerId || 0], t && (e.preventDefault(), Object.keys(n).length || (this.action = ""), this.cropping && (this.cropping = !1, Ke(this.dragBox, ie, this.cropped && this.options.modal)), W(this.element, fe, {
						originalEvent: e,
						action: t
					}));
				}
			}
		}, vt = { change: function(e) {
			var t = this.options, n = this.canvasData, r = this.containerData, i = this.cropBoxData, a = this.pointers, o = this.action, s = t.aspectRatio, c = i.left, l = i.top, u = i.width, d = i.height, f = c + u, p = l + d, m = 0, h = 0, g = r.width, _ = r.height, v = !0, y;
			!s && e.shiftKey && (s = u && d ? u / d : 1), this.limited && (m = i.minLeft, h = i.minTop, g = m + Math.min(r.width, n.width, n.left + n.width), _ = h + Math.min(r.height, n.height, n.top + n.height));
			var k = a[Object.keys(a)[0]], A = {
				x: k.endX - k.startX,
				y: k.endY - k.startY
			}, M = function(e) {
				switch (e) {
					case x:
						f + A.x > g && (A.x = g - f);
						break;
					case S:
						c + A.x < m && (A.x = m - c);
						break;
					case w:
						l + A.y < h && (A.y = h - l);
						break;
					case C:
						p + A.y > _ && (A.y = _ - p);
						break;
				}
			};
			switch (o) {
				case ee:
					c += A.x, l += A.y;
					break;
				case x:
					if (A.x >= 0 && (f >= g || s && (l <= h || p >= _))) {
						v = !1;
						break;
					}
					M(x), u += A.x, u < 0 && (o = S, u = -u, c -= u), s && (d = u / s, l += (i.height - d) / 2);
					break;
				case w:
					if (A.y <= 0 && (l <= h || s && (c <= m || f >= g))) {
						v = !1;
						break;
					}
					M(w), d -= A.y, l += A.y, d < 0 && (o = C, d = -d, l -= d), s && (u = d * s, c += (i.width - u) / 2);
					break;
				case S:
					if (A.x <= 0 && (c <= m || s && (l <= h || p >= _))) {
						v = !1;
						break;
					}
					M(S), u -= A.x, c += A.x, u < 0 && (o = x, u = -u, c -= u), s && (d = u / s, l += (i.height - d) / 2);
					break;
				case C:
					if (A.y >= 0 && (p >= _ || s && (c <= m || f >= g))) {
						v = !1;
						break;
					}
					M(C), d += A.y, d < 0 && (o = w, d = -d, l -= d), s && (u = d * s, c += (i.width - u) / 2);
					break;
				case T:
					if (s) {
						if (A.y <= 0 && (l <= h || f >= g)) {
							v = !1;
							break;
						}
						M(w), d -= A.y, l += A.y, u = d * s;
					} else M(w), M(x), A.x >= 0 ? f < g ? u += A.x : A.y <= 0 && l <= h && (v = !1) : u += A.x, A.y <= 0 ? l > h && (d -= A.y, l += A.y) : (d -= A.y, l += A.y);
					u < 0 && d < 0 ? (o = O, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = E, u = -u, c -= u) : d < 0 && (o = D, d = -d, l -= d);
					break;
				case E:
					if (s) {
						if (A.y <= 0 && (l <= h || c <= m)) {
							v = !1;
							break;
						}
						M(w), d -= A.y, l += A.y, u = d * s, c += i.width - u;
					} else M(w), M(S), A.x <= 0 ? c > m ? (u -= A.x, c += A.x) : A.y <= 0 && l <= h && (v = !1) : (u -= A.x, c += A.x), A.y <= 0 ? l > h && (d -= A.y, l += A.y) : (d -= A.y, l += A.y);
					u < 0 && d < 0 ? (o = D, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = T, u = -u, c -= u) : d < 0 && (o = O, d = -d, l -= d);
					break;
				case O:
					if (s) {
						if (A.x <= 0 && (c <= m || p >= _)) {
							v = !1;
							break;
						}
						M(S), u -= A.x, c += A.x, d = u / s;
					} else M(C), M(S), A.x <= 0 ? c > m ? (u -= A.x, c += A.x) : A.y >= 0 && p >= _ && (v = !1) : (u -= A.x, c += A.x), A.y >= 0 ? p < _ && (d += A.y) : d += A.y;
					u < 0 && d < 0 ? (o = T, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = D, u = -u, c -= u) : d < 0 && (o = E, d = -d, l -= d);
					break;
				case D:
					if (s) {
						if (A.x >= 0 && (f >= g || p >= _)) {
							v = !1;
							break;
						}
						M(x), u += A.x, d = u / s;
					} else M(C), M(x), A.x >= 0 ? f < g ? u += A.x : A.y >= 0 && p >= _ && (v = !1) : u += A.x, A.y >= 0 ? p < _ && (d += A.y) : d += A.y;
					u < 0 && d < 0 ? (o = E, d = -d, u = -u, l -= d, c -= u) : u < 0 ? (o = O, u = -u, c -= u) : d < 0 && (o = T, d = -d, l -= d);
					break;
				case ne:
					this.move(A.x, A.y), v = !1;
					break;
				case b:
					this.zoom(rt(a), e), v = !1;
					break;
				case te:
					if (!A.x || !A.y) {
						v = !1;
						break;
					}
					y = G(this.cropper), c = k.startX - y.left, l = k.startY - y.top, u = i.minWidth, d = i.minHeight, A.x > 0 ? o = A.y > 0 ? D : T : A.x < 0 && (c -= u, o = A.y > 0 ? O : E), A.y < 0 && (l -= d), this.cropped || (Ge(this.cropBox, j), this.cropped = !0, this.limited && this.limitCropBox(!0, !0));
					break;
			}
			v && (i.width = u, i.height = d, i.left = c, i.top = l, this.action = o, this.renderCropBox()), R(a, function(e) {
				e.startX = e.endX, e.startY = e.endY;
			});
		} }, yt = {
			crop: function() {
				return this.ready && !this.cropped && !this.disabled && (this.cropped = !0, this.limitCropBox(!0, !0), this.options.modal && B(this.dragBox, ie), Ge(this.cropBox, j), this.setCropBoxData(this.initialCropBoxData)), this;
			},
			reset: function() {
				return this.ready && !this.disabled && (this.imageData = z({}, this.initialImageData), this.canvasData = z({}, this.initialCanvasData), this.cropBoxData = z({}, this.initialCropBoxData), this.renderCanvas(), this.cropped && this.renderCropBox()), this;
			},
			clear: function() {
				return this.cropped && !this.disabled && (z(this.cropBoxData, {
					left: 0,
					top: 0,
					width: 0,
					height: 0
				}), this.cropped = !1, this.renderCropBox(), this.limitCanvas(!0, !0), this.renderCanvas(), Ge(this.dragBox, ie), B(this.cropBox, j)), this;
			},
			replace: function(e) {
				var t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
				return !this.disabled && e && (this.isImg && (this.element.src = e), t ? (this.url = e, this.image.src = e, this.ready && (this.viewBoxImage.src = e, R(this.previews, function(t) {
					t.getElementsByTagName("img")[0].src = e;
				}))) : (this.isImg && (this.replaced = !0), this.options.data = null, this.uncreate(), this.load(e))), this;
			},
			enable: function() {
				return this.ready && this.disabled && (this.disabled = !1, Ge(this.cropper, A)), this;
			},
			disable: function() {
				return this.ready && !this.disabled && (this.disabled = !0, B(this.cropper, A)), this;
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
					if (W(this.element, Te, {
						ratio: e,
						oldRatio: a / s,
						originalEvent: n
					}) === !1) return this;
					if (n) {
						var d = this.pointers, f = G(this.cropper), p = d && Object.keys(d).length ? at(d) : {
							pageX: n.pageX,
							pageY: n.pageY
						};
						i.left -= (l - a) * ((p.pageX - f.left - i.left) / a), i.top -= (u - o) * ((p.pageY - f.top - i.top) / o);
					} else I(t) && N(t.x) && N(t.y) ? (i.left -= (l - a) * ((t.x - i.left) / a), i.top -= (u - o) * ((t.y - i.top) / o)) : (i.left -= (l - a) / 2, i.top -= (u - o) / 2);
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
					if (R(a, function(e, t) {
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
				if (this.ready && !this.disabled && I(e)) {
					var a = !1;
					t.rotatable && N(e.rotate) && e.rotate !== n.rotate && (n.rotate = e.rotate, a = !0), t.scalable && (N(e.scaleX) && e.scaleX !== n.scaleX && (n.scaleX = e.scaleX, a = !0), N(e.scaleY) && e.scaleY !== n.scaleY && (n.scaleY = e.scaleY, a = !0)), a && this.renderCanvas(!0, !0);
					var o = n.width / n.naturalWidth;
					N(e.x) && (i.left = e.x * o + r.left), N(e.y) && (i.top = e.y * o + r.top), N(e.width) && (i.width = e.width * o), N(e.height) && (i.height = e.height * o), this.setCropBoxData(i);
				}
				return this;
			},
			getContainerData: function() {
				return this.ready ? z({}, this.containerData) : {};
			},
			getImageData: function() {
				return this.sized ? z({}, this.imageData) : {};
			},
			getCanvasData: function() {
				var e = this.canvasData, t = {};
				return this.ready && R([
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
				return this.ready && !this.disabled && I(e) && (N(e.left) && (t.left = e.left), N(e.top) && (t.top = e.top), N(e.width) ? (t.width = e.width, t.height = e.width / n) : N(e.height) && (t.height = e.height, t.width = e.height * n), this.renderCanvas(!0)), this;
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
				return this.ready && this.cropped && !this.disabled && I(e) && (N(e.left) && (t.left = e.left), N(e.top) && (t.top = e.top), N(e.width) && e.width !== t.width && (r = !0, t.width = e.width), N(e.height) && e.height !== t.height && (i = !0, t.height = e.height), n && (r ? t.height = t.width / n : i && (t.width = t.height * n)), this.renderCropBox()), this;
			},
			getCroppedCanvas: function() {
				var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
				if (!this.ready || !window.HTMLCanvasElement) return null;
				var t = this.canvasData, n = ct(this.image, this.imageData, t, e);
				if (!this.cropped) return n;
				var r = this.getData(e.rounded), i = r.x, a = r.y, o = r.width, s = r.height, c = n.width / Math.floor(t.naturalWidth);
				c !== 1 && (i *= c, a *= c, o *= c, s *= c);
				var u = o / s, d = ot({
					aspectRatio: u,
					width: e.maxWidth || Infinity,
					height: e.maxHeight || Infinity
				}), f = ot({
					aspectRatio: u,
					width: e.minWidth || 0,
					height: e.minHeight || 0
				}, "cover"), p = ot({
					aspectRatio: u,
					width: e.width || (c === 1 ? o : n.width),
					height: e.height || (c === 1 ? s : n.height)
				}), m = p.width, h = p.height;
				m = Math.min(d.width, Math.max(f.width, m)), h = Math.min(d.height, Math.max(f.height, h));
				var g = document.createElement("canvas"), _ = g.getContext("2d");
				g.width = Ve(m), g.height = Ve(h), _.fillStyle = e.fillColor || "transparent", _.fillRect(0, 0, m, h);
				var v = e.imageSmoothingEnabled, y = v === void 0 ? !0 : v, ee = e.imageSmoothingQuality;
				_.imageSmoothingEnabled = y, ee && (_.imageSmoothingQuality = ee);
				var te = n.width, ne = n.height, b = i, x = a, S, C, w, T, E, D;
				b <= -o || b > te ? (b = 0, S = 0, w = 0, E = 0) : b <= 0 ? (w = -b, b = 0, S = Math.min(te, o + b), E = S) : b <= te && (w = 0, S = Math.min(o, te - b), E = S), S <= 0 || x <= -s || x > ne ? (x = 0, C = 0, T = 0, D = 0) : x <= 0 ? (T = -x, x = 0, C = Math.min(ne, s + x), D = C) : x <= ne && (T = 0, C = Math.min(s, ne - x), D = C);
				var O = [
					b,
					x,
					S,
					C
				];
				if (E > 0 && D > 0) {
					var k = m / o;
					O.push(w * k, T * k, E * k, D * k);
				}
				return _.drawImage.apply(_, [n].concat(l(O.map(function(e) {
					return Math.floor(Ve(e));
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
					e = i || a ? e : ue, t.dragMode = e, Xe(n, oe, e), Ke(n, k, i), Ke(n, ae, a), t.cropBoxMovable || (Xe(r, oe, e), Ke(r, k, i), Ke(r, ae, a));
				}
				return this;
			}
		}, bt = g.Cropper, xt = /* @__PURE__ */ function() {
			function e(t) {
				var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
				if (a(this, e), !t || !Ae.test(t.tagName)) throw Error("The first argument is required and must be an <img> or <canvas> element.");
				this.element = t, this.options = z({}, Ne, I(n) && n), this.cropped = !1, this.disabled = !1, this.pointers = {}, this.ready = !1, this.reloading = !1, this.replaced = !1, this.sized = !1, this.sizing = !1, this.init();
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
								ke.test(e) ? this.read(ft(e)) : this.clone();
								return;
							}
							var i = new XMLHttpRequest(), a = this.clone.bind(this);
							this.reloading = !0, this.xhr = i, i.onabort = a, i.onerror = a, i.ontimeout = a, i.onprogress = function() {
								i.getResponseHeader("content-type") !== Ee && i.abort();
							}, i.onload = function() {
								t.read(i.response);
							}, i.onloadend = function() {
								t.reloading = !1, t.xhr = null;
							}, r.checkCrossOrigin && K(e) && n.crossOrigin && (e = tt(e)), i.open("GET", e, !0), i.responseType = "arraybuffer", i.withCredentials = n.crossOrigin === "use-credentials", i.send();
						}
					}
				},
				{
					key: "read",
					value: function(e) {
						var t = this.options, n = this.imageData, r = mt(e), i = 0, a = 1, o = 1;
						if (r > 1) {
							this.url = pt(e, Ee);
							var s = ht(r);
							i = s.rotate, a = s.scaleX, o = s.scaleY;
						}
						t.rotatable && (n.rotate = i), t.scalable && (n.scaleX = a, n.scaleY = o), this.clone();
					}
				},
				{
					key: "clone",
					value: function() {
						var e = this.element, t = this.url, n = e.crossOrigin, r = t;
						this.options.checkCrossOrigin && K(t) && (n ||= "anonymous", r = tt(t)), this.crossOrigin = n, this.crossOriginUrl = r;
						var i = document.createElement("img");
						n && (i.crossOrigin = n), i.src = r || t, i.alt = e.alt || "The image to crop", this.image = i, i.onload = this.start.bind(this), i.onerror = this.stop.bind(this), B(i, M), e.parentNode.insertBefore(i, e.nextSibling);
					}
				},
				{
					key: "start",
					value: function() {
						var e = this, t = this.image;
						t.onload = null, t.onerror = null, this.sizing = !0;
						var n = g.navigator && /(?:iPad|iPhone|iPod).*?AppleWebKit/i.test(g.navigator.userAgent), r = function(t, n) {
							z(e.imageData, {
								naturalWidth: t,
								naturalHeight: n,
								aspectRatio: t / n
							}), e.initialImageData = z({}, e.imageData), e.sizing = !1, e.sized = !0, e.build();
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
							this.container = r, this.cropper = a, this.canvas = o, this.dragBox = s, this.cropBox = c, this.viewBox = a.querySelector(`.${y}-view-box`), this.face = l, o.appendChild(n), B(e, j), r.insertBefore(a, e.nextSibling), Ge(n, M), this.initPreview(), this.bind(), t.initialAspectRatio = Math.max(0, t.initialAspectRatio) || NaN, t.aspectRatio = Math.max(0, t.aspectRatio) || NaN, t.viewMode = Math.max(0, Math.min(3, Math.round(t.viewMode))) || 0, B(c, j), t.guides || B(c.getElementsByClassName(`${y}-dashed`), j), t.center || B(c.getElementsByClassName(`${y}-center`), j), t.background && B(a, `${y}-bg`), t.highlight || B(l, re), t.cropBoxMovable && (B(l, ae), Xe(l, oe, ee)), t.cropBoxResizable || (B(c.getElementsByClassName(`${y}-line`), j), B(c.getElementsByClassName(`${y}-point`), j)), this.render(), this.ready = !0, this.setDragMode(t.dragMode), t.autoCrop && this.crop(), this.setData(t.data), L(t.ready) && U(e, Se, t.ready, { once: !0 }), W(e, Se);
						}
					}
				},
				{
					key: "unbuild",
					value: function() {
						if (this.ready) {
							this.ready = !1, this.unbind(), this.resetPreview();
							var e = this.cropper.parentNode;
							e && e.removeChild(this.cropper), Ge(this.element, j);
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
					return window.Cropper = bt, e;
				}
			}, {
				key: "setDefaults",
				value: function(e) {
					z(Ne, I(e) && e);
				}
			}]);
		}();
		return z(xt.prototype, gt, _t, q, J, vt, yt), xt;
	}));
})))(), 1), Hr = "\n.cropper-container {\n  direction: ltr;\n  font-size: 0;\n  line-height: 0;\n  position: relative;\n  -ms-touch-action: none;\n      touch-action: none;\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n      -ms-user-select: none;\n          user-select: none;\n}\n.cropper-container img {\n  backface-visibility: hidden;\n  display: block;\n  height: 100%;\n  image-orientation: 0deg;\n  max-height: none !important;\n  max-width: none !important;\n  min-height: 0 !important;\n  min-width: 0 !important;\n  width: 100%;\n}\n.cropper-wrap-box,\n.cropper-canvas,\n.cropper-drag-box,\n.cropper-crop-box,\n.cropper-modal {\n  bottom: 0;\n  left: 0;\n  position: absolute;\n  right: 0;\n  top: 0;\n}\n.cropper-wrap-box,\n.cropper-canvas {\n  overflow: hidden;\n}\n.cropper-drag-box {\n  background-color: #fff;\n  opacity: 0;\n}\n.cropper-modal {\n  background-color: #000;\n  opacity: 0.5;\n}\n.cropper-view-box {\n  display: block;\n  height: 100%;\n  outline: 1px solid #39f;\n  outline-color: rgba(51, 153, 255, 0.75);\n  overflow: hidden;\n  width: 100%;\n}\n.cropper-dashed {\n  border: 0 dashed #eee;\n  display: block;\n  opacity: 0.5;\n  position: absolute;\n}\n.cropper-dashed.dashed-h {\n  border-bottom-width: 1px;\n  border-top-width: 1px;\n  height: calc(100% / 3);\n  left: 0;\n  top: calc(100% / 3);\n  width: 100%;\n}\n.cropper-dashed.dashed-v {\n  border-left-width: 1px;\n  border-right-width: 1px;\n  height: 100%;\n  left: calc(100% / 3);\n  top: 0;\n  width: calc(100% / 3);\n}\n.cropper-center {\n  display: block;\n  height: 0;\n  left: 50%;\n  opacity: 0.75;\n  position: absolute;\n  top: 50%;\n  width: 0;\n}\n.cropper-center::before,\n.cropper-center::after {\n  background-color: #eee;\n  content: ' ';\n  display: block;\n  position: absolute;\n}\n.cropper-center::before {\n  height: 1px;\n  left: -3px;\n  top: 0;\n  width: 7px;\n}\n.cropper-center::after {\n  height: 7px;\n  left: 0;\n  top: -3px;\n  width: 1px;\n}\n.cropper-face,\n.cropper-line,\n.cropper-point {\n  display: block;\n  height: 100%;\n  opacity: 0.1;\n  position: absolute;\n  width: 100%;\n}\n.cropper-face {\n  background-color: #fff;\n  left: 0;\n  top: 0;\n}\n.cropper-line {\n  background-color: #39f;\n}\n.cropper-line.line-e {\n  cursor: ew-resize;\n  right: -3px;\n  top: 0;\n  width: 5px;\n}\n.cropper-line.line-n {\n  cursor: ns-resize;\n  height: 5px;\n  left: 0;\n  top: -3px;\n}\n.cropper-line.line-w {\n  cursor: ew-resize;\n  left: -3px;\n  top: 0;\n  width: 5px;\n}\n.cropper-line.line-s {\n  bottom: -3px;\n  cursor: ns-resize;\n  height: 5px;\n  left: 0;\n}\n.cropper-point {\n  background-color: #39f;\n  height: 5px;\n  opacity: 0.75;\n  width: 5px;\n}\n.cropper-point.point-e {\n  cursor: ew-resize;\n  margin-top: -3px;\n  right: -3px;\n  top: 50%;\n}\n.cropper-point.point-n {\n  cursor: ns-resize;\n  left: 50%;\n  margin-left: -3px;\n  top: -3px;\n}\n.cropper-point.point-w {\n  cursor: ew-resize;\n  left: -3px;\n  margin-top: -3px;\n  top: 50%;\n}\n.cropper-point.point-s {\n  bottom: -3px;\n  cursor: s-resize;\n  left: 50%;\n  margin-left: -3px;\n}\n.cropper-point.point-ne {\n  cursor: nesw-resize;\n  right: -3px;\n  top: -3px;\n}\n.cropper-point.point-nw {\n  cursor: nwse-resize;\n  left: -3px;\n  top: -3px;\n}\n.cropper-point.point-sw {\n  bottom: -3px;\n  cursor: nesw-resize;\n  left: -3px;\n}\n.cropper-point.point-se {\n  bottom: -3px;\n  cursor: nwse-resize;\n  height: 20px;\n  opacity: 1;\n  right: -3px;\n  width: 20px;\n}\n@media (min-width: 768px) {\n  .cropper-point.point-se {\n    height: 15px;\n    width: 15px;\n  }\n}\n@media (min-width: 992px) {\n  .cropper-point.point-se {\n    height: 10px;\n    width: 10px;\n  }\n}\n@media (min-width: 1200px) {\n  .cropper-point.point-se {\n    height: 5px;\n    opacity: 0.75;\n    width: 5px;\n  }\n}\n.cropper-point.point-se::before {\n  background-color: #39f;\n  bottom: -50%;\n  content: ' ';\n  display: block;\n  height: 200%;\n  opacity: 0;\n  position: absolute;\n  right: -50%;\n  width: 200%;\n}\n.cropper-invisible {\n  opacity: 0;\n}\n.cropper-bg {\n  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA3NCSVQICAjb4U/gAAAABlBMVEXMzMz////TjRV2AAAACXBIWXMAAArrAAAK6wGCiw1aAAAAHHRFWHRTb2Z0d2FyZQBBZG9iZSBGaXJld29ya3MgQ1M26LyyjAAAABFJREFUCJlj+M/AgBVhF/0PAH6/D/HkDxOGAAAAAElFTkSuQmCC\");\n}\n.cropper-hide {\n  display: block;\n  height: 0;\n  position: absolute;\n  width: 0;\n}\n.cropper-hidden {\n  display: none !important;\n}\n.cropper-move {\n  cursor: move;\n}\n.cropper-crop {\n  cursor: crosshair;\n}\n.cropper-disabled .cropper-drag-box,\n.cropper-disabled .cropper-face,\n.cropper-disabled .cropper-line,\n.cropper-disabled .cropper-point {\n  cursor: not-allowed;\n}\n", Ur = 2 * 1024 * 1024, Wr = new Set([
	"image/png",
	"image/jpeg",
	"image/webp"
]), Gr = 512, Kr = /* @__PURE__ */ "👶.🧒.👧.🧑.👦.👩.👨.🧓.👴.👵.🐶.🐱.🐻.🐼.🐨.🦊.🦁.🐯.🐸.🦄.🌟.⭐.🌈.🌸.🌺.🌻.🍀.🎈.🎨.🎯.🏃.⚽.🎸.🎤.📚.🎮.🏆.❤️.💙.💚".split("."), qr = class extends V {
	constructor(...e) {
		super(...e), this._mode = "emoji", this._selectedEmoji = null, this._sourceUrl = null, this._error = null, this._submitting = !1, this._cropper = null;
	}
	static {
		this.styles = [
			K,
			O(Hr),
			k`
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
		];
	}
	_close() {
		this.dispatchEvent(new CustomEvent("close"));
	}
	_selectEmoji(e) {
		this._selectedEmoji = e, this._error = null;
	}
	_onFileChange(e) {
		let t = e.target, n = t.files?.[0];
		if (t.value = "", n) {
			if (!Wr.has(n.type)) {
				this._error = "Only PNG, JPEG, and WebP images are accepted.";
				return;
			}
			if (n.size > Ur) {
				this._error = "Image must be 2 MB or smaller.";
				return;
			}
			this._error = null, this._setSource(URL.createObjectURL(n));
		}
	}
	_setSource(e) {
		this._cropper &&= (this._cropper.destroy(), null), this._sourceUrl && URL.revokeObjectURL(this._sourceUrl), this._sourceUrl = e;
	}
	_onCropImageLoad() {
		let e = this._cropImage;
		e && (this._cropper && this._cropper.destroy(), this._cropper = new Vr.default(e, {
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
					await Lr(this.hass, this.memberSlug, this._selectedEmoji), this.dispatchEvent(new CustomEvent("avatar-changed", { detail: { avatar: this._selectedEmoji } })), this._close();
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
				await Ir(this.hass, this.memberSlug, e), this.dispatchEvent(new CustomEvent("avatar-changed")), this._close();
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
				width: Gr,
				height: Gr,
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
		return P`
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

          ${this._error ? P`<div class="error-msg">${this._error}</div>` : ""}

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
		return P`
      <div class="emoji-grid">
        ${Kr.map((e) => P`
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
		return this._sourceUrl ? P`
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
      ` : P`
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
		this.renderRoot.querySelector("#avatar-file-input")?.click();
	}
};
J([W({ attribute: !1 })], qr.prototype, "hass", void 0), J([W()], qr.prototype, "memberSlug", void 0), J([W()], qr.prototype, "memberName", void 0), J([G()], qr.prototype, "_mode", void 0), J([G()], qr.prototype, "_selectedEmoji", void 0), J([G()], qr.prototype, "_sourceUrl", void 0), J([G()], qr.prototype, "_error", void 0), J([G()], qr.prototype, "_submitting", void 0), J([et("#crop-image")], qr.prototype, "_cropImage", void 0), qr = J([H("lucarne-avatar-upload-modal")], qr);
//#endregion
//#region src/editors/lucarne-chores-card-editor.ts
var Jr = class extends V {
	constructor(...e) {
		super(...e), this._familyState = null, this._avatarModalMember = null;
	}
	static {
		this.styles = [K, k`
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
    `];
	}
	setConfig(e) {
		this._config = e;
	}
	connectedCallback() {
		super.connectedCallback(), this.hass && !this._unsubFamily && (this._unsubFamily = _t(this.hass, (e) => {
			this._familyState = e;
		}));
	}
	updated(e) {
		super.updated(e), e.has("hass") && this.hass && !this._unsubFamily && (this._unsubFamily = _t(this.hass, (e) => {
			this._familyState = e;
		}));
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unsubFamily?.(), this._unsubFamily = void 0;
	}
	_fire(e) {
		let t = { ...e };
		delete t.kids, Array.isArray(t.members) || (t.members = []), xn(this, "config-changed", { config: t });
	}
	_membersModel() {
		let e = [...this._familyState?.members ?? [], pt], t = new Map(e.map((e) => [e.slug, e])), n = this._config?.members ?? [], r = new Set(n), i = [...n.filter((e) => t.has(e)), ...e.filter((e) => !r.has(e.slug)).map((e) => e.slug)], a = new Set(this._config?.hidden_members ?? []), o = /* @__PURE__ */ new Set();
		for (let e of i) (a.has(e) || !r.has(e)) && o.add(e);
		return {
			ordered: i.map((e) => t.get(e)),
			hidden: o
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
		return P`
      <div class="member-content ${t ? "hidden-member" : ""}" slot=${e.slug} data-slug=${e.slug}>
        <div class="member-avatar">
          ${e.avatar && e.avatar.startsWith("/local/") ? P`<img src=${e.avatar} alt=${e.name} style="width:100%;height:100%;object-fit:cover;" />` : P`${e.avatar ?? e.name[0]}`}
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
        ${e.slug === "household" ? "" : P`<button
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
		if (!this._config) return P``;
		if (this._familyState !== null && this._familyState.integrationError !== null) return P`
        <div class="error-block">
          Install the Lucarne Family integration first.
          <a href="/config/integrations/dashboard#search=lucarne" target="_blank"
            >Open Integrations</a
          >
        </div>
      `;
		if (this._familyState === null) return P`<div class="loading">Loading members…</div>`;
		let { ordered: e, hidden: t } = this._membersModel(), n = e.map((e) => ({
			key: e.slug,
			label: e.name
		}));
		return P`
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

      ${this._avatarModalMember ? P`<lucarne-avatar-upload-modal
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
		].map(([e, t]) => P`
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
};
//#endregion
//#region src/index.ts
J([W({ attribute: !1 })], Jr.prototype, "hass", void 0), J([G()], Jr.prototype, "_config", void 0), J([G()], Jr.prototype, "_familyState", void 0), J([G()], Jr.prototype, "_avatarModalMember", void 0), Jr = J([H("lucarne-chores-card-editor")], Jr), S();
//#endregion
