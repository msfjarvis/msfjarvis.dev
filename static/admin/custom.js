(function () {
  var SUPPORTED_ATTRIBUTES = ["src", "alt", "title"];
  var ATTRIBUTE_PATTERN = /(\w+)="((?:\\.|[^"\\])*)"/g;
  var FIGURE_PATTERN = /{{<\s*figure\s+([^>]+)\s*>}}/;

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  function unescapeAttribute(value) {
    return String(value ?? "")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseFigureAttributes(block) {
    var shortcodeMatch = block.match(FIGURE_PATTERN);

    if (!shortcodeMatch) {
      return null;
    }

    var attributes = {};
    var match;

    ATTRIBUTE_PATTERN.lastIndex = 0;
    while ((match = ATTRIBUTE_PATTERN.exec(shortcodeMatch[1])) !== null) {
      attributes[match[1]] = unescapeAttribute(match[2]);
    }

    return attributes;
  }

  function isSupportedFigure(block) {
    var attributes = parseFigureAttributes(block);

    if (!attributes || !attributes.src || !attributes.alt) {
      return false;
    }

    return Object.keys(attributes).every(function (attribute) {
      return SUPPORTED_ATTRIBUTES.includes(attribute);
    });
  }

  function buildShortcode(data) {
    var parts = [
      'src="' + escapeAttribute(data.src) + '"',
      'alt="' + escapeAttribute(data.alt) + '"',
    ];
    var title = String(data.title ?? "").trim();

    if (title.length > 0) {
      parts.push('title="' + escapeAttribute(title) + '"');
    }

    return "{{<figure " + parts.join(" ") + ">}}";
  }

  function buildPreview(data) {
    var image =
      '<img src="' + escapeHtml(data.src) + '" alt="' + escapeHtml(data.alt) + '">';
    var title = String(data.title ?? "").trim();

    if (!title) {
      return "<figure>" + image + "</figure>";
    }

    return "<figure>" + image + "<figcaption>" + escapeHtml(title) + "</figcaption></figure>";
  }

  function registerFigureComponent() {
    if (!window.CMS || window.__msfjarvisFigureRegistered) {
      return;
    }

    window.CMS.registerEditorComponent({
      id: "figure",
      label: "Figure",
      fields: [
        { name: "src", label: "Image", widget: "image" },
        { name: "alt", label: "Alt text", widget: "text", required: false },
        { name: "title", label: "Title", widget: "string", required: false },
      ],
      pattern: FIGURE_PATTERN,
      fromBlock: function (match) {
        var block = match[0];

        if (!isSupportedFigure(block)) {
          return false;
        }

        var attributes = parseFigureAttributes(block);

        return {
          src: attributes.src,
          alt: attributes.alt,
          title: attributes.title || "",
        };
      },
      toBlock: buildShortcode,
      toPreview: buildPreview,
    });

    window.__msfjarvisFigureRegistered = true;
  }

  registerFigureComponent();
  document.addEventListener("DOMContentLoaded", registerFigureComponent, { once: true });
})();
