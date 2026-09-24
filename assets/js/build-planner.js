(function (root) {
  "use strict";

  const ROUTE_NAMES = {
    reuse: "Reuse existing hardware",
    mini: "Compact mini PC",
    expandable: "Expandable used business PC"
  };

  function evaluatePlan(input) {
    const workloads = input && input.workloads ? input.workloads : {};
    const vm = input && input.vm;
    const storage = input && input.storage;
    const owned = input && input.owned;
    const priority = input && input.priority;
    const anyWorkload = Boolean(
      workloads.jellyfin || workloads.immich || workloads.homeAssistant ||
      workloads.minecraft || workloads.other || vm === "light" || vm === "heavy"
    );

    if (!anyWorkload || !["none", "light", "heavy"].includes(vm) ||
        !["light", "local", "uncertain"].includes(storage) ||
        !["suitable", "uncertain", "none"].includes(owned) ||
        !["quiet", "cost", "upgrade"].includes(priority)) {
      return { status: "needs_input", message: "Select a workload and answer the hardware questions to get a route." };
    }

    const transcoding = Boolean(workloads.jellyfin && input.jellyfinMode === "transcoding");
    const expansion = Boolean(input.internalExpansion || storage === "local");
    const heavy = vm === "heavy";
    const severalActive = [workloads.immich, workloads.minecraft, transcoding, vm === "light"].filter(Boolean).length >= 2;
    const moderate = vm === "light" || workloads.immich || workloads.minecraft || transcoding || severalActive;
    const route = owned === "suitable" ? "reuse" :
      heavy || expansion || priority === "upgrade" || priority === "cost" ? "expandable" : "mini";
    const alternative = route === "reuse" ? (heavy || expansion ? "expandable" : "mini") :
      route === "mini" ? "expandable" : owned === "uncertain" ? "reuse" : "mini";

    let why;
    if (route === "reuse") {
      why = "You say you already have a usable or upgradeable PC. Check its actual RAM, drive connections, and workload behavior before paying for a replacement.";
    } else if (heavy || expansion) {
      why = "Several or heavier VMs, local storage growth, or internal expansion make drive bays, RAM headroom, and upgrade options more useful than the smallest chassis.";
    } else if (priority === "upgrade") {
      why = "You prioritize future upgrades. A business PC is a more flexible starting shape, provided the exact model has the slots and bays you need.";
    } else if (priority === "cost") {
      why = "Compare used business PCs first for initial cost and expansion. Used listings vary, so compare the actual complete system price with a mini PC before buying.";
    } else {
      why = "Your selected workloads do not require several local drives or many full VMs, and compactness matters most. A mini PC is a reasonable starting shape.";
    }

    let mainConstraint;
    if (heavy) mainConstraint = "RAM capacity and simultaneous full-VM load; verify the exact VM allocations and host limit.";
    else if (expansion) mainConstraint = "Physical drive bays and connections for present and future storage.";
    else if (transcoding) mainConstraint = "Jellyfin transcoding support depends on the exact CPU/GPU, codec, and software configuration.";
    else if (storage === "uncertain") mainConstraint = "Storage need is still unknown; estimate your files and backup destination before choosing a chassis.";
    else if (moderate) mainConstraint = "Concurrent service peaks and available RAM headroom.";
    else mainConstraint = "Upgrade headroom and a backup destination, rather than raw CPU speed.";

    const ram = heavy ?
      "Plan around 32–64 GB as a starting range for several or heavier VMs. Add up your intended guest allocations and verify the exact machine’s supported capacity." :
      moderate ?
        "Use 16–32 GB as an initial planning range; favor 32 GB when these services or VMs run together. Verify the applications and guest allocations before buying." :
        "Use 16–32 GB as an initial planning range for light services. Start with what you own if it works; leave room to upgrade if you expect more VMs.";

    const storageGuidance = storage === "local" ?
      "Plan the actual local data capacity, drive count, connectors, and room to grow. Keep backups on a separate destination; extra bays are not a backup." :
      storage === "uncertain" ?
        "Estimate operating-system/app space and current data, then decide where media and backups will live. No drive size can be recommended from an unknown data requirement." :
        "An SSD can hold the host and apps; check its capacity against your actual data. Plan a separate backup destination even if files live elsewhere.";

    const upgrade = route === "mini" ?
      "Check the exact model’s RAM and SSD upgrade limits first. If you later need many local drives or add-in cards, move storage to a separate system or change chassis." :
      route === "reuse" ?
        "Try the existing PC, measure where it runs short, then upgrade RAM or storage only if its exact model supports it. Replace it if expansion is blocked." :
        "Choose the exact used model for RAM slots, drive bays, and PCIe space; add memory or storage as the measured workload grows.";

    const verify = [
      "Exact model: supported RAM, available slots, drive bays/connectors, NICs, power supply, condition, and seller configuration.",
      "Backup destination and whether the selected storage setup can hold current data plus growth."
    ];
    if (transcoding) verify.push("Jellyfin hardware transcoding for the exact CPU/GPU, codec, operating system, and passthrough path; this tool does not verify it.");
    if (owned !== "none") verify.push("The existing PC’s specifications and real behavior under your workloads; ownership alone does not establish suitability.");
    if (storage === "uncertain") verify.push("Actual data size and growth before purchasing drives or a chassis.");

    const otherRoutes = {
      reuse: owned === "none" ?
        "No suitable machine was identified to reuse." :
        "Your existing machine’s fit is uncertain; check its model, RAM, bays, and workload before treating reuse as sufficient.",
      mini: heavy || expansion ?
        "A compact mini PC may be short on full-VM headroom or internal expansion. Consider it only after verifying an exact model or moving storage elsewhere." :
        "A mini PC is possible, but it gives less physical expansion and may not be the lowest-priced complete system.",
      expandable: "An expandable business PC remains an option, but it uses more space and its noise, power use, condition, and total price vary by listing."
    };
    if (route === "reuse") otherRoutes.reuse = "This route comes first because you report hardware you can try before buying.";

    return {
      status: "ready", route, routeName: ROUTE_NAMES[route], alternative,
      alternativeName: ROUTE_NAMES[alternative], why, mainConstraint,
      ram, storageGuidance, upgrade, verify, otherRoutes,
      conflict: priority === "quiet" && (heavy || expansion),
      uncertain: storage === "uncertain" || owned === "uncertain"
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { evaluatePlan };
  if (!root || !root.document) return;

  function sendEvent(name, params) {
    try {
      if (root.localStorage.getItem("runahomelab_analytics_consent") !== "granted") return;
    } catch (_) { return; }
    try {
      if (typeof root.gtag === "function") root.gtag("event", name, params || {});
      if (root.posthog && typeof root.posthog.capture === "function") root.posthog.capture(name, params || {});
    } catch (_) {
      // Analytics must never stop the planner from working.
    }
  }

  function initialize(section) {
    const form = section.querySelector("[data-planner-form]");
    const result = section.querySelector("[data-planner-result]");
    const validation = section.querySelector("[data-planner-validation]");
    let started = false;
    let hasResult = false;
    let viewed = false;
    let currentRoute = "";

    function view() {
      if (viewed) return;
      viewed = true;
      sendEvent("build_planner_view");
    }
    if ("IntersectionObserver" in root) {
      const observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        view(); observer.disconnect();
      }, { threshold: 0.25 });
      observer.observe(section);
    } else view();

    form.addEventListener("change", function (event) {
      if (!started) { started = true; sendEvent("build_planner_start"); }
      if (hasResult) sendEvent("build_planner_assumption_edit", { field: event.target.name || "workload" });
      const jellyfin = form.querySelector('[name="jellyfin"]');
      form.querySelector("[data-jellyfin-mode]").hidden = !jellyfin.checked;
      if (hasResult) result.hidden = true;
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const get = function (name) { return form.elements.namedItem(name); };
      const plan = evaluatePlan({
        workloads: {
          jellyfin: get("jellyfin").checked,
          immich: get("immich").checked,
          homeAssistant: get("home_assistant").checked,
          minecraft: get("minecraft").checked,
          other: get("other_services").checked
        },
        jellyfinMode: form.querySelector('[name="jellyfin_mode"]:checked').value,
        vm: get("vm").value,
        storage: get("storage").value,
        internalExpansion: get("internal_expansion").checked,
        owned: get("owned").value,
        priority: get("priority").value
      });
      if (plan.status !== "ready") {
        validation.textContent = plan.message;
        validation.hidden = false;
        result.hidden = true;
        return;
      }
      validation.hidden = true;
      currentRoute = plan.route;
      const set = function (key, value) { result.querySelector('[data-output="' + key + '"]').textContent = value; };
      set("route", plan.routeName);
      set("alternative", plan.alternativeName);
      set("why", plan.why);
      set("constraint", plan.mainConstraint);
      set("ram", plan.ram);
      set("storage", plan.storageGuidance);
      set("upgrade", plan.upgrade);
      const caveat = result.querySelector("[data-planner-caveat]");
      caveat.hidden = !plan.conflict;
      caveat.textContent = plan.conflict ? "You asked for the smallest/quietest route, but the selected VM or storage expansion needs point toward a larger system. A mini PC is conditional on changing those needs or verifying a specific model." : "";
      const verifyList = result.querySelector("[data-output-list='verify']");
      verifyList.replaceChildren();
      plan.verify.forEach(function (item) { const li = root.document.createElement("li"); li.textContent = item; verifyList.append(li); });
      const otherList = result.querySelector("[data-output-list='others']");
      otherList.replaceChildren();
      Object.keys(ROUTE_NAMES).filter(function (key) { return key !== plan.route; }).forEach(function (key) {
        const li = root.document.createElement("li");
        li.textContent = ROUTE_NAMES[key] + ": " + plan.otherRoutes[key];
        otherList.append(li);
      });
      result.querySelectorAll("[data-route-links]").forEach(function (group) {
        group.hidden = group.dataset.routeLinks !== plan.route;
      });
      result.hidden = false;
      hasResult = true;
      result.focus({ preventScroll: true });
      result.scrollIntoView({ behavior: root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      sendEvent("build_planner_result", { route: plan.route, conflict: plan.conflict, uncertain: plan.uncertain });
    });

    section.addEventListener("click", function (event) {
      const link = event.target.closest("a[data-planner-link]");
      if (!link) return;
      sendEvent(link.dataset.plannerLink === "product" ? "build_planner_product_click" : "build_planner_guide_click", {
        route: currentRoute || "none", link_id: link.dataset.linkId || "unknown"
      });
    });
  }

  function initializeAll() { root.document.querySelectorAll("[data-build-planner]").forEach(initialize); }
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", initializeAll, { once: true });
  else initializeAll();
})(typeof window !== "undefined" ? window : null);
