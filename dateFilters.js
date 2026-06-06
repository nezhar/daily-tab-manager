(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.TabDateFilters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_DATE_FILTER = "months:3";
  const ALL_DATE_FILTER = "all";
  const MONTH_FILTERS = [
    { value: DEFAULT_DATE_FILTER, label: "Past 3 Months", months: 3 },
    { value: "months:6", label: "Past 6 Months", months: 6 },
    { value: "months:12", label: "Past 12 Months", months: 12 },
  ];

  function isValidDayKey(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;

    const [year, month, date] = day.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, date));

    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === date
    );
  }

  function toUtcDayKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getMonthCutoffDayKey(months, now) {
    const cutoff = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - months,
        now.getUTCDate()
      )
    );
    return toUtcDayKey(cutoff);
  }

  function getAvailableYears(tabsByDay) {
    const years = new Set();

    Object.keys(tabsByDay || {}).forEach((day) => {
      if (isValidDayKey(day)) {
        years.add(day.slice(0, 4));
      }
    });

    return Array.from(years).sort().reverse();
  }

  function filterDayKeysByDate(dayKeys, filterValue, now) {
    const validDayKeys = dayKeys.filter(isValidDayKey);

    if (filterValue === ALL_DATE_FILTER) {
      return validDayKeys;
    }

    if (filterValue && filterValue.startsWith("year:")) {
      const selectedYear = filterValue.slice("year:".length);
      return validDayKeys.filter((day) => day.startsWith(`${selectedYear}-`));
    }

    const monthFilter =
      MONTH_FILTERS.find((filter) => filter.value === filterValue) ||
      MONTH_FILTERS[0];
    const cutoffDay = getMonthCutoffDayKey(monthFilter.months, now);

    return validDayKeys.filter((day) => day >= cutoffDay);
  }

  function tabMatchesSearch(tab, normalizedQuery) {
    const title = String(tab.title || "").toLowerCase();
    const url = String(tab.url || "").toLowerCase();
    return title.includes(normalizedQuery) || url.includes(normalizedQuery);
  }

  function buildFilteredTabsByDay(tabsByDay, filterValue, searchQuery, now) {
    const sortedDays = Object.keys(tabsByDay || {}).sort().reverse();
    const filteredDays = filterDayKeysByDate(
      sortedDays,
      filterValue || DEFAULT_DATE_FILTER,
      now || new Date()
    );
    const normalizedQuery = String(searchQuery || "").trim().toLowerCase();
    const result = {};

    filteredDays.forEach((day) => {
      const tabs = Array.isArray(tabsByDay[day]) ? tabsByDay[day] : [];
      const filteredTabs = normalizedQuery
        ? tabs.filter((tab) => tabMatchesSearch(tab, normalizedQuery))
        : tabs;

      if (filteredTabs.length > 0) {
        result[day] = filteredTabs;
      }
    });

    return result;
  }

  function getDateFilterOptions(tabsByDay) {
    const yearOptions = getAvailableYears(tabsByDay).map((year) => ({
      value: `year:${year}`,
      label: year,
    }));

    return [
      ...MONTH_FILTERS.map(({ value, label }) => ({ value, label })),
      { value: ALL_DATE_FILTER, label: "All" },
      ...yearOptions,
    ];
  }

  return {
    DEFAULT_DATE_FILTER,
    ALL_DATE_FILTER,
    MONTH_FILTERS,
    getAvailableYears,
    filterDayKeysByDate,
    buildFilteredTabsByDay,
    getDateFilterOptions,
    isValidDayKey,
  };
});
