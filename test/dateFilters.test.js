const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_DATE_FILTER,
  ALL_DATE_FILTER,
  getAvailableYears,
  filterDayKeysByDate,
  buildFilteredTabsByDay,
  getDateFilterOptions,
} = require("../dateFilters.js");

const NOW = new Date(Date.UTC(2026, 5, 6));

test("derives available years from valid day keys in descending order", () => {
  const tabsByDay = {
    "2024-12-31": [],
    "2026-01-01": [],
    invalid: [],
    "2025-13-01": [],
    "2025-02-03": [],
    "2026-06-06": [],
  };

  assert.deepEqual(getAvailableYears(tabsByDay), ["2026", "2025", "2024"]);
});

test("filters valid day keys for month ranges using inclusive cutoffs", () => {
  const sortedDays = [
    "2026-06-06",
    "2026-03-06",
    "2026-03-05",
    "2025-12-06",
    "2025-12-05",
    "2025-06-06",
    "2025-06-05",
    "not-a-date",
  ];

  assert.deepEqual(filterDayKeysByDate(sortedDays, DEFAULT_DATE_FILTER, NOW), [
    "2026-06-06",
    "2026-03-06",
  ]);
  assert.deepEqual(filterDayKeysByDate(sortedDays, "months:6", NOW), [
    "2026-06-06",
    "2026-03-06",
    "2026-03-05",
    "2025-12-06",
  ]);
  assert.deepEqual(filterDayKeysByDate(sortedDays, "months:12", NOW), [
    "2026-06-06",
    "2026-03-06",
    "2026-03-05",
    "2025-12-06",
    "2025-12-05",
    "2025-06-06",
  ]);
});

test("all includes all valid day keys", () => {
  const sortedDays = ["2026-01-01", "bad-key", "2024-12-31"];

  assert.deepEqual(filterDayKeysByDate(sortedDays, ALL_DATE_FILTER, NOW), [
    "2026-01-01",
    "2024-12-31",
  ]);
});

test("year filter includes only days from the selected year", () => {
  const sortedDays = ["2026-01-01", "2025-12-31", "2025-01-01", "2024-12-31"];

  assert.deepEqual(filterDayKeysByDate(sortedDays, "year:2025", NOW), [
    "2025-12-31",
    "2025-01-01",
  ]);
});

test("search is scoped to the selected date range", () => {
  const tabsByDay = {
    "2026-05-01": [{ title: "Recent Alpha", url: "https://recent.example" }],
    "2025-05-01": [{ title: "Old Needle", url: "https://old.example" }],
  };

  assert.deepEqual(
    buildFilteredTabsByDay(tabsByDay, DEFAULT_DATE_FILTER, "needle", NOW),
    {}
  );
  assert.deepEqual(
    buildFilteredTabsByDay(tabsByDay, ALL_DATE_FILTER, "needle", NOW),
    {
      "2025-05-01": [{ title: "Old Needle", url: "https://old.example" }],
    }
  );
});

test("builds month, all, and year options in render order", () => {
  const tabsByDay = {
    "2024-12-31": [],
    "2026-01-01": [],
    "2025-02-03": [],
  };

  assert.deepEqual(getDateFilterOptions(tabsByDay), [
    { value: "months:3", label: "Past 3 Months" },
    { value: "months:6", label: "Past 6 Months" },
    { value: "months:12", label: "Past 12 Months" },
    { value: "all", label: "All" },
    { value: "year:2026", label: "2026" },
    { value: "year:2025", label: "2025" },
    { value: "year:2024", label: "2024" },
  ]);
});
