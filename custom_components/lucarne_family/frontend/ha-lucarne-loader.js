//#region src/loader/boot.ts
var e = [
	"lucarne-today-card",
	"lucarne-calendar-card",
	"lucarne-chores-card"
], t = "https://github.com/Babel-Innovations/ha-lucarne/issues/101", n = [3e3, 1e4], r = 25;
function i(e, t = "./ha-lucarne.js") {
	let n = e.split("?")[1];
	return n ? `${t}?${n}` : t;
}
function a(e) {
	try {
		return e instanceof Error ? e.stack || `${e.name}: ${e.message}` : String(e);
	} catch {
		return "Lucarne bundle failed to load (the error could not be described)";
	}
}
function o(e, n, r) {
	let i = e.ownerDocument.createElement("div");
	i.setAttribute("style", "box-sizing:border-box;padding:16px;border-radius:12px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121);border:2px solid var(--error-color,#db4437);font-size:14px;line-height:1.4;");
	let a = e.ownerDocument.createElement("div");
	a.setAttribute("style", "font-weight:700;margin-bottom:8px;color:var(--error-color,#db4437)"), a.textContent = `Lucarne could not load (${n})`;
	let o = e.ownerDocument.createElement("pre");
	o.setAttribute("style", "margin:0 0 8px;white-space:pre-wrap;word-break:break-word;font-size:12px;max-height:220px;overflow:auto;"), o.textContent = r;
	let s = e.ownerDocument.createElement("div");
	s.setAttribute("style", "font-size:12px;opacity:0.8"), s.textContent = `Please report this text at ${t}`, i.appendChild(a), i.appendChild(o), i.appendChild(s), e.appendChild(i);
}
function s(t, n, r = e) {
	let i = [];
	for (let e of r) {
		if (n.get(e)) continue;
		let r = class extends HTMLElement {
			setConfig() {}
			getCardSize() {
				return 3;
			}
			connectedCallback() {
				this.shadowRoot || o(this.attachShadow({ mode: "open" }), e, t);
			}
		};
		try {
			n.define(e, r), i.push(e);
		} catch {}
	}
	return i;
}
function c(e, t, n) {
	if (n > r) return t;
	let i;
	try {
		i = e.querySelectorAll("*");
	} catch {
		return t;
	}
	for (let e of Array.from(i)) e.tagName.toLowerCase() === "hui-error-card" && t.push(e), e.shadowRoot && c(e.shadowRoot, t, n + 1);
	return t;
}
function l(e) {
	let t = e, n = t._config ?? t.config;
	return (n == null ? void 0 : n.error) ?? (n == null ? void 0 : n.message) ?? e.textContent ?? "";
}
function u(e) {
	return e.indexOf("Custom element") !== -1 && e.indexOf("exist") !== -1;
}
function d(t, n, r = e) {
	let i = 0;
	for (let e of c(t, [], 0)) {
		let t = l(e);
		u(t) && r.some((e) => t.includes(e) && n.get(e)) && (e.dispatchEvent(new CustomEvent("ll-rebuild", {
			bubbles: !0,
			composed: !0
		})), i += 1);
	}
	return i;
}
var f = "home-assistant", p = 50;
function m(e, t = {}) {
	let n = t.now ?? (() => Date.now()), r = t.timeoutMs ?? 2e4, i = t.pollMs ?? p;
	return new Promise((t) => {
		try {
			let a = e.customElements;
			if (a != null && a.get(f)) {
				t("already-swapped");
				return;
			}
			let o = n();
			e.setTimeout(() => t("timeout"), r);
			let s = () => {
				try {
					let c = e.customElements;
					if (c !== a || c != null && c.get(f)) {
						t(c === a ? "already-swapped" : "swapped");
						return;
					}
					if (n() - o >= r) {
						t("timeout");
						return;
					}
					e.setTimeout(s, i);
				} catch {
					t("error");
				}
			};
			e.setTimeout(s, i);
		} catch {
			t("error");
		}
	});
}
function h(t) {
	try {
		return e.filter((e) => t.customElements.get(e));
	} catch {
		return [];
	}
}
function g(e, t) {
	try {
		e.healed = (e.healed ?? 0) + d(t.document, t.customElements);
	} catch {}
	e.registered = h(t);
}
function _(e, t) {
	g(e, t);
	try {
		for (let r of n) t.setTimeout(() => g(e, t), r);
	} catch {}
}
async function v(e) {
	let { importBundle: t, win: n } = e, r = e.now ?? (() => Date.now()), i = {
		stage: "loading",
		startedAt: 0,
		marks: []
	};
	try {
		var o;
		i.startedAt = r();
		let e = n;
		i.marks = ((o = e.__lucarneBoot) == null ? void 0 : o.marks) ?? [], e.__lucarneBoot = i;
	} catch {}
	try {
		i.stage = "waiting-for-registry", i.registryWait = await m(n, { now: e.now });
	} catch {
		i.registryWait = "error";
	}
	try {
		i.registryWaitedMs = r() - i.startedAt;
	} catch {}
	try {
		i.stage = "importing", await t(), i.stage = "loaded";
	} catch (e) {
		i.stage = "failed", i.error = a(e);
		try {
			i.fallbacks = s(i.error, n.customElements);
		} catch {}
	}
	try {
		i.finishedAt = r();
	} catch {}
	return _(i, n), i;
}
//#endregion
//#region src/loader.ts
var y = i(import.meta.url);
// @vite-ignore: the specifier carries the ?v=<version>.<digest> cache-buster and
v({
	importBundle: () => import(
		/* @vite-ignore */
		y
),
	win: window
});
//#endregion
