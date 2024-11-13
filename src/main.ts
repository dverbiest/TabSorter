import { initializeEventListeners } from './utils/eventListeners';
import { initializeLegendFilters, initializeSearchFilter, initializeCollapseExpandAll } from './utils/windowUtils';
import { initializeThemeToggle } from './utils/themeUtils';
import './utils/toastUtils';

document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  initializeThemeToggle();
  initializeLegendFilters();
  initializeSearchFilter();
  initializeCollapseExpandAll();
});
