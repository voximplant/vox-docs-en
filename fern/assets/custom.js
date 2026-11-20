(function () {
  function setAccordionState(shouldOpen) {
    var root = document.getElementById("capabilities-accordion-root");
    if (!root) return;

    var details = root.querySelectorAll("details");
    details.forEach(function (item) {
      item.open = shouldOpen;
    });
  }

  function findAccordionForTarget(target) {
    if (!target) return null;

    var tag = (target.tagName || "").toLowerCase();
    if (tag === "details") return target;

    if (typeof target.closest === "function") {
      var parentDetails = target.closest("details");
      if (parentDetails) return parentDetails;
    }

    var sibling = target.nextElementSibling;
    while (sibling) {
      if ((sibling.tagName || "").toLowerCase() === "details") {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  function isFernAccordionTrigger(button) {
    if (!button || typeof button.click !== "function") return false;
    if (button.closest && button.closest(".fern-code-block")) return false;
    if (button.getAttribute("aria-haspopup")) return false;

    var label = (button.getAttribute("aria-label") || button.textContent || "").trim();
    if (/report incorrect code/i.test(label)) return false;

    return true;
  }

  function clickFernAccordionForTarget(target) {
    if (!target) return false;

    var sibling = target.nextElementSibling;
    while (sibling) {
      var buttons =
        sibling.querySelectorAll &&
        sibling.querySelectorAll(
          'button[aria-expanded="false"], [role="button"][aria-expanded="false"]'
        );
      if (buttons && buttons.length) {
        for (var i = 0; i < buttons.length; i += 1) {
          if (isFernAccordionTrigger(buttons[i])) {
            buttons[i].click();
            return true;
          }
        }
      }
      sibling = sibling.nextElementSibling;
    }

    return false;
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function getHashId() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return "";

    return decodeURIComponent(hash.slice(1));
  }

  function findVoxEngineTabMarker(id, target) {
    if (target) {
      if (target.matches && target.matches("[data-voxengine-tab]")) return target;
      var inline = target.querySelector && target.querySelector("[data-voxengine-tab]");
      if (inline) return inline;
    }

    return document.querySelector('[data-voxengine-tab-anchor="' + cssEscape(id) + '"]');
  }

  function findTabButtonById(tabId) {
    var escaped = cssEscape(tabId);
    var selectors = [
      '[role="tab"][id="' + escaped + '"]',
      '[role="tab"][data-value="' + escaped + '"]',
      '[role="tab"][aria-controls="' + escaped + '"]',
      'button[id="' + escaped + '"]',
      'button[data-value="' + escaped + '"]',
      'button[value="' + escaped + '"]',
    ];

    for (var i = 0; i < selectors.length; i += 1) {
      var hit = document.querySelector(selectors[i]);
      if (hit) return hit;
    }

    return null;
  }

  function findTabButtonNearMarker(marker, label) {
    var map = marker && marker.closest && marker.closest("[data-voxengine-tab-map]");
    var root = map && map.nextElementSibling;
    var buttons = root
      ? root.querySelectorAll('[role="tab"], button')
      : document.querySelectorAll('[role="tab"], button');
    var wanted = String(label || "").trim().toLowerCase();
    if (!wanted) return null;

    for (var i = 0; i < buttons.length; i += 1) {
      if (String(buttons[i].textContent || "").trim().toLowerCase() === wanted) {
        return buttons[i];
      }
    }

    return null;
  }

  function activateVoxEngineTab(marker) {
    if (!marker) return false;

    var tabId = marker.getAttribute("data-voxengine-tab");
    var label = marker.getAttribute("data-voxengine-tab-label");
    var button = (tabId && findTabButtonById(tabId)) || findTabButtonNearMarker(marker, label);

    if (!button || button.getAttribute("aria-selected") === "true") {
      return false;
    }

    button.click();
    return true;
  }

  function openAccordionForTarget(target) {
    if (!target) return false;

    var accordion = findAccordionForTarget(target);
    if (accordion) {
      accordion.open = true;
      return true;
    }

    return clickFernAccordionForTarget(target);
  }

  function openAccordionForHash() {
    var id = getHashId();
    if (!id) return;

    var target = document.getElementById(id);
    var marker = findVoxEngineTabMarker(id, target);
    var activatedTab = activateVoxEngineTab(marker);

    window.setTimeout(function () {
      var nextTarget = document.getElementById(id) || target;
      if (!nextTarget) return;

      openAccordionForTarget(nextTarget);
      if (activatedTab && typeof nextTarget.scrollIntoView === "function") {
        nextTarget.scrollIntoView({ block: "start" });
      }
    }, activatedTab ? 100 : 0);
  }

  function scheduleOpenAccordionForHash() {
    [0, 100, 300, 700, 1500, 2500].forEach(function (delay) {
      setTimeout(openAccordionForHash, delay);
    });
  }

  function installVoxEngineTocHandler() {
    document.addEventListener("click", function (event) {
      var anchor = event.target.closest("a[href*='#']");
      if (anchor) {
        scheduleOpenAccordionForHash();
      }
    });
  }

  function initHashHandlers() {
    window.addEventListener("hashchange", scheduleOpenAccordionForHash);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scheduleOpenAccordionForHash);
    } else {
      scheduleOpenAccordionForHash();
    }
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-capabilities-accordion-action]");
    if (button) {
      var action = button.getAttribute("data-capabilities-accordion-action");
      if (action === "expand") {
        setAccordionState(true);
      }
      if (action === "collapse") {
        setAccordionState(false);
      }
      return;
    }

  });

  installVoxEngineTocHandler();
  initHashHandlers();
})();
