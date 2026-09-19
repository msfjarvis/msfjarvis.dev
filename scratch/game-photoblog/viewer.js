/* Shared prototype photo viewer. Classic script, no imports, no dependencies,
   safe to run from file://. Concepts keep their own inline scripts. */
(function () {
  "use strict";

  var CONCEPTS = [
    { id: "1", file: "01-cinema.html", label: "1 \u00b7 Cinema scroll" },
    { id: "2", file: "02-margins.html", label: "2 \u00b7 Margin notes" },
    { id: "3", file: "03-diptychs.html", label: "3 \u00b7 Pairs" },
    { id: "4", file: "04-reel.html", label: "4 \u00b7 Reel" },
    { id: "5", file: "05-light-table.html", label: "5 \u00b7 Light table" },
  ];

  var dialog = null;
  var imgEl = null;
  var titleEl = null;
  var textEl = null;
  var countEl = null;
  var prevBtn = null;
  var nextBtn = null;
  var closeBtn = null;

  var items = [];
  var index = -1;
  var lastFocus = null;
  var savedOverflow = "";

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function all(selector) {
    return toArray(document.querySelectorAll(selector));
  }

  /* Read the link fresh at click time: the light table rewrites href and the
     data-* attributes on its single plate, so nothing may be cached up front. */
  function readItem(link) {
    var img = link.querySelector("img");
    var title = link.getAttribute("data-title") || "";
    return {
      src: link.getAttribute("href") || link.getAttribute("data-photo") || "",
      title: title,
      caption: link.getAttribute("data-caption") || "",
      alt: (img && img.getAttribute("alt")) || title,
    };
  }

  function buildDialog() {
    if (dialog) return;

    dialog = document.createElement("dialog");
    dialog.className = "photo-viewer-dialog";
    dialog.setAttribute("aria-label", "Photo viewer");

    var figure = document.createElement("figure");
    figure.className = "photo-viewer-figure";
    imgEl = document.createElement("img");
    imgEl.className = "photo-viewer-img";
    imgEl.alt = "";
    figure.appendChild(imgEl);

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "photo-viewer-close";
    closeBtn.setAttribute("aria-label", "Close viewer");
    closeBtn.textContent = "\u00d7";

    var caption = document.createElement("div");
    caption.className = "photo-viewer-caption";
    titleEl = document.createElement("p");
    titleEl.className = "photo-viewer-title";
    textEl = document.createElement("p");
    textEl.className = "photo-viewer-text";
    caption.appendChild(titleEl);
    caption.appendChild(textEl);

    var controls = document.createElement("div");
    controls.className = "photo-viewer-controls";
    prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "photo-viewer-prev";
    prevBtn.textContent = "Previous";
    countEl = document.createElement("span");
    countEl.className = "photo-viewer-count";
    nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "photo-viewer-next";
    nextBtn.textContent = "Next";
    controls.appendChild(prevBtn);
    controls.appendChild(countEl);
    controls.appendChild(nextBtn);

    dialog.appendChild(closeBtn);
    dialog.appendChild(figure);
    dialog.appendChild(caption);
    dialog.appendChild(controls);
    document.body.appendChild(dialog);

    closeBtn.addEventListener("click", function () {
      close();
    });
    prevBtn.addEventListener("click", function () {
      step(-1);
    });
    nextBtn.addEventListener("click", function () {
      step(1);
    });

    /* Click on the dialog's own padding (the backdrop area inside the modal)
       closes it; clicks on the image or text do not. */
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog || event.target === figure) close();
    });

    /* Arrow keys only while the dialog owns focus; Escape is native. */
    dialog.addEventListener("keydown", function (event) {
      if (items.length < 2) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    });

    dialog.addEventListener("close", function () {
      document.body.style.overflow = savedOverflow;
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
    });
  }

  function render() {
    var link = items[index];
    if (!link) return;
    var item = readItem(link);
    imgEl.src = item.src;
    imgEl.alt = item.alt;

    titleEl.textContent = item.title;
    titleEl.hidden = !item.title;
    textEl.textContent = item.caption;
    textEl.hidden = !item.caption;

    var multiple = items.length > 1;
    prevBtn.hidden = !multiple;
    nextBtn.hidden = !multiple;
    countEl.hidden = !multiple;
    if (multiple) countEl.textContent = index + 1 + " / " + items.length;
  }

  function step(delta) {
    if (items.length < 2) return;
    index = (index + delta + items.length) % items.length;
    render();
  }

  function open(link) {
    buildDialog();

    /* Snapshot the currently relevant links, in document order. */
    items = all("[data-photo]");
    index = items.indexOf(link);
    if (index < 0) index = 0;

    lastFocus = link;
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    render();

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    closeBtn.focus();
  }

  function close() {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
      return;
    }
    dialog.removeAttribute("open");
    document.body.style.overflow = savedOverflow;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function buildPicker() {
    var current = document.body.getAttribute("data-concept");

    var details = document.createElement("details");
    details.className = "prototype-picker";

    var summary = document.createElement("summary");
    summary.textContent = "Concept";
    details.appendChild(summary);

    var nav = document.createElement("nav");
    nav.className = "prototype-picker-nav";
    nav.setAttribute("aria-label", "Prototype concepts");

    var entries = [{ file: "index.html", label: "Overview", id: null }].concat(
      CONCEPTS,
    );
    entries.forEach(function (entry) {
      var link = document.createElement("a");
      link.href = entry.file;
      link.textContent = entry.label;
      var isCurrent = entry.id === null ? !current : entry.id === current;
      if (isCurrent) link.setAttribute("aria-current", "page");
      nav.appendChild(link);
    });

    details.appendChild(nav);
    document.body.appendChild(details);
  }

  function init() {
    buildPicker();

    /* Delegated so links replaced or rewritten later are still picked up. */
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;

      var target = event.target;
      var link =
        target && target.closest ? target.closest("[data-photo]") : null;
      if (!link || !document.documentElement.contains(link)) return;

      event.preventDefault();
      open(link);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
