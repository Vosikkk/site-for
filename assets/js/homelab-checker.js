(function () {
  "use strict";

  const RESULT_CONTENT = {
    light: {
      heading: "N150 + 16GB looks reasonable",
      copy: "This is a relatively light workload for this class of system. Actual resource use still depends on how each service is configured and what runs at the same time."
    },
    medium: {
      heading: "N150 can work, but watch the limits",
      copy: "CPU peaks from transcoding, photo processing, or game-server activity and 16GB of shared memory are the likely bottlenecks. Memory headroom, upgradeability, and simultaneous workload peaks matter."
    },
    heavy: {
      heading: "Consider more than an N150",
      copy: "Several demanding workloads or full VMs can put sustained pressure on both the CPU and 16GB of memory. More CPU performance, greater RAM capacity, and better expansion options become important."
    }
  };

  function sendEvent(name, parameters) {
    let consent = null;
    try {
      consent = localStorage.getItem("runahomelab_analytics_consent");
    } catch (_) {
      return;
    }
    if (consent !== "granted") return;
    if (typeof window.gtag !== "function") return;

    try {
      window.gtag("event", name, parameters || {});
    } catch (_) {
      // Analytics must never prevent the checker from working.
    }
  }

  function classifyWorkload(selection) {
    const selectedCount = selection.workloads.length;
    const hasOtherWorkload = selectedCount > 1;
    const demandingCount = [
      selection.immich,
      selection.minecraft,
      selection.windowsVm,
      selection.jellyfin4k,
      selection.otherVms3Plus
    ].filter(Boolean).length;

    const heavyVmCombination = selection.otherVms3Plus && demandingCount >= 2;
    const windowsImmichMedia = selection.windowsVm && selection.immich && selection.jellyfin;

    if (heavyVmCombination || windowsImmichMedia || demandingCount >= 3) {
      return "heavy";
    }

    const combinedImmich = selection.immich && hasOtherWorkload;
    const combinedMinecraft = selection.minecraft && hasOtherWorkload;

    if (
      selection.jellyfin4k ||
      selection.windowsVm ||
      selection.otherVms3Plus ||
      combinedImmich ||
      combinedMinecraft ||
      demandingCount >= 2
    ) {
      return "medium";
    }

    return "light";
  }

  function initializeChecker(checker) {
    const form = checker.querySelector(".homelab-checker__form");
    const workloadInputs = Array.from(checker.querySelectorAll("[data-workload]"));
    const button = checker.querySelector("[data-check-workload]");
    const validation = checker.querySelector("[data-checker-validation]");
    const resultPanel = checker.querySelector("[data-checker-result]");
    const resultHeading = checker.querySelector("[data-result-heading]");
    const resultCopy = checker.querySelector("[data-result-copy]");
    let startSent = false;
    let viewSent = false;

    function sendView() {
      if (viewSent) return;
      viewSent = true;
      sendEvent("hardware_checker_view");
    }

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        sendView();
        observer.disconnect();
      }, { threshold: 0.25 });
      observer.observe(checker);
    } else {
      sendView();
    }

    form.addEventListener("change", function (event) {
      if (!startSent && event.target.matches("input")) {
        startSent = true;
        sendEvent("hardware_checker_start");
      }

      if (!event.target.matches("[data-workload]")) return;

      const suboptions = checker.querySelector('[data-suboptions="' + event.target.value + '"]');
      if (suboptions) suboptions.hidden = !event.target.checked;
    });

    button.addEventListener("click", function () {
      const selectedWorkloads = workloadInputs
        .filter(function (input) { return input.checked; })
        .map(function (input) { return input.value; });

      if (!selectedWorkloads.length) {
        validation.hidden = false;
        resultPanel.hidden = true;
        workloadInputs[0].focus();
        return;
      }

      validation.hidden = true;

      const jellyfinMode = checker.querySelector('input[name$="-jellyfin-mode"]:checked').value;
      const otherVmsMode = checker.querySelector('input[name$="-other-vms-mode"]:checked').value;
      const selection = {
        workloads: selectedWorkloads,
        jellyfin: selectedWorkloads.includes("jellyfin"),
        jellyfin4k: selectedWorkloads.includes("jellyfin") && jellyfinMode === "4k",
        immich: selectedWorkloads.includes("immich"),
        minecraft: selectedWorkloads.includes("minecraft"),
        windowsVm: selectedWorkloads.includes("windows_vm"),
        otherVms3Plus: selectedWorkloads.includes("other_vms") && otherVmsMode === "3_plus"
      };
      const result = classifyWorkload(selection);
      const analyticsWorkloads = selectedWorkloads.map(function (workload) {
        if (workload === "jellyfin") return jellyfinMode === "4k" ? "jellyfin_4k_transcoding" : "jellyfin_direct_play";
        if (workload === "other_vms") return otherVmsMode === "3_plus" ? "other_vms_3_plus" : "other_vms_1_2";
        return workload;
      });

      resultPanel.dataset.result = result;
      resultHeading.textContent = RESULT_CONTENT[result].heading;
      resultCopy.textContent = RESULT_CONTENT[result].copy;
      resultPanel.hidden = false;
      resultPanel.focus({ preventScroll: true });
      const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultPanel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });

      sendEvent("hardware_checker_result", {
        workloads: analyticsWorkloads.join(","),
        result: result
      });
    });
  }

  function initializeAllCheckers() {
    document.querySelectorAll("[data-homelab-checker]").forEach(initializeChecker);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAllCheckers, { once: true });
  } else {
    initializeAllCheckers();
  }
})();
