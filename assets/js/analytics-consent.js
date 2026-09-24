(() => {
  const storageKey = "runahomelab_analytics_consent";
  const notice = document.querySelector("[data-analytics-consent]");

  const getChoice = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch (_) {
      return null;
    }
  };

  const setChoice = (choice) => {
    try {
      localStorage.setItem(storageKey, choice);
    } catch (_) {
      // The choice still applies to this page even if it cannot be persisted.
    }
  };

  const clearChoice = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {
      // Reloading still restores the default state when storage is unavailable.
    }
  };

  const showNoticeIfNeeded = () => {
    if (!notice) return;
    notice.hidden = getChoice() !== null;
  };

  document.querySelectorAll("[data-analytics-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.dataset.analyticsChoice;
      setChoice(choice);
      if (notice) notice.hidden = true;
      if (choice === "granted" && typeof window.runahomelabLoadAnalytics === "function") {
        window.runahomelabLoadAnalytics();
      }
      if (choice === "granted" && typeof window.runahomelabLoadPostHog === "function") {
        window.runahomelabLoadPostHog();
      }
    });
  });

  document.querySelectorAll("[data-analytics-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      clearChoice();
      window.location.reload();
    });
  });

  showNoticeIfNeeded();
})();
