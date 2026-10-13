// Recent journeys, kept in this browser only (like the "favourites" on TMB and Tokyo Metro's apps).
const KEY = 'metro_recent_journeys';
const MAX = 5;

export const loadRecent = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((j) => j && j.from && j.to).slice(0, MAX) : [];
  } catch {
    return [];
  }
};

export const saveRecent = (from, to) => {
  const list = [{ from, to }, ...loadRecent().filter((j) => !(j.from === from && j.to === to))].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: the list just won't persist */
  }
  return list;
};

export const clearRecent = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  return [];
};
