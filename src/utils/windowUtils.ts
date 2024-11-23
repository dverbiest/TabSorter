// @ts-expect-error - Ignore missing types from html5sortable
import sortable from 'html5sortable/dist/html5sortable.es.js';
import nlp from 'compromise';
import { createElement } from './domUtils';
import { closeTab, mergeWindows } from './tabUtils';
import { initializeThemeToggle } from './themeUtils';

export function updateWindowLists() {
  console.log('Updating lists');
  chrome.windows.getAll({ populate: true }, (windows) => {
    const main = document.getElementById('main');
    // Remove all event listeners and reinitialize the main container
    const container = main!.cloneNode(true) as HTMLElement;
    main!.replaceWith(container);
    initializeThemeToggle();
    initializeLegendFilters();
    initializeSearchFilter();
    initializeCollapseExpandAll();
    container.querySelectorAll('.window').forEach(window => window.remove());
    container.querySelector('footer')?.remove();
    const sortedWindows = sortWindowsByStoredOrder(windows);
    sortedWindows.forEach((window) => {
      if (!window.type || window.type !== 'popup') // Skip extension windows
        container.appendChild(createWindowDiv(window));
    });
    const footer = createElement('footer');
    footer.appendChild(createElement('a',{ className: 'fa-solid fa-comment-dots', title: 'Feedback', href: 'https://github.com/dverbiest/TabSorter/issues', target: '_blank' }));
    footer.appendChild(createElement('a',{ className: 'fa-solid fa-heart', title: 'Love it!', href: 'https://buymeacoffee.com/verbiest', target: '_blank' }));
    container.appendChild(footer);
    applyFilters();
    applySearchFilter();
    if (!(document.getElementById('search-input') as HTMLInputElement).value)
      applyCollapseState();
    initializeWindowSortable();
    updateMainContainerHeight(container);
  });
}

function updateMainContainerHeight(container: HTMLElement) {
  const bodyHeight = document.body.clientHeight;
  let height = bodyHeight / 2;
  document.querySelectorAll('.window').forEach(windowDiv =>
    height += windowDiv.clientHeight + 8);
  container.style.minHeight = Math.max(height, bodyHeight) + 'px';
}

function generateSmartTitle(tabs: chrome.tabs.Tab[]): string {
  const activeTab = tabs.find(tab => tab.active && tab.title && tab.title.trim() !== '');
  const defaultTitle = activeTab?.title || 'Untitled';
  const titles = tabs.map(tab => tab.title?.trim()).filter(title => title);
  titles.push(defaultTitle);
  const keywords = nlp(titles.join(' ')).topics().out('array');
  return keywords.length ? keywords[0] + '?' : defaultTitle;
}

function createTabListItem(tab: chrome.tabs.Tab, windowId: number): HTMLLIElement {
  const lastViewedInDays = tab.lastAccessed ? Math.floor((Date.now() - tab.lastAccessed) / (1000 * 60 * 60 * 24)) : 0;
  const lastViewedClass = lastViewedInDays <= 3 ? 'recent' : lastViewedInDays <= 7 ? 'stale' : 'old';

  const listItem = document.createElement('li');
  listItem.dataset.tabId = tab.id?.toString() || '';
  if (lastViewedClass) listItem.classList.add(lastViewedClass);

  const div = document.createElement('div');
  const elements = [
    createElement('button', { className: `fas fa-thumbtack ${tab.pinned ? 'pinned' : ''}`, title: 'Pin tab' }, '', () => {
      if (tab.id !== undefined) chrome.tabs.update(tab.id, { pinned: !tab.pinned }, updateWindowLists);
    }),
    createElement('img', { src: tab.favIconUrl || 'icons/icon128.png' }),
    createElement('span', {}, tab.title || 'Untitled'),
    createElement('button', { className: 'fas fa-up-right-from-square', title: 'Pop out' }, '',
      () => tab.id && chrome.windows.create({ tabId: tab.id },
        () => { if (tab.pinned) chrome.tabs.update(tab.id!, { pinned: true }) })),
    createElement('button', { className: 'fas fa-xmark', title: 'Close tab' }, '',
      () => tab.id && closeTab(tab.id))
  ];

  elements.forEach(element => div.appendChild(element));
  listItem.appendChild(div);
  listItem.appendChild(document.createElement('ul'));

  listItem.addEventListener('click', (event) => {
    if (tab.id && windowId && (event.target as HTMLElement).localName !== 'button') {
      chrome.tabs.update(tab.id, { active: true });
      chrome.windows.update(windowId, { focused: true });
    }
  });

  return listItem;
}

function createWindowDiv(window: chrome.windows.Window): HTMLDivElement {
  const windowDiv = document.createElement('div');
  windowDiv.classList.add('window');
  windowDiv.dataset.windowId = window.id?.toString() || '';

  const windowTitle = document.createElement('h3');
  windowTitle.classList.add('window-title');

  const editIcon = document.createElement('i');
  editIcon.classList.add('fas', 'fa-pen-to-square', 'edit-icon');
  editIcon.title = 'Edit window';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = getStoredWindowTitle(window.id!) || generateSmartTitle(window.tabs || []);
  titleInput.classList.add('editable-title-input');
  titleInput.setAttribute('readonly', 'true');
  titleInput.addEventListener('click', (event) => {
    if (!titleInput.hasAttribute('readonly'))
      event.stopPropagation();
  });
  function enableTitleEditing() {
    titleInput.removeAttribute('readonly');
    titleInput.style.cursor = 'text';
    titleInput.style.pointerEvents = 'auto';
    titleInput.select();
    document.querySelectorAll('.window').forEach(div => {
      div.classList.remove('options'); // Close other option-bars
    });
    windowDiv.classList.add('options');
  }
  function saveAndCloseTitleEdit() {
    titleInput.setAttribute('readonly', 'true');
    titleInput.style.cursor = 'pointer';
    titleInput.style.pointerEvents = 'none';
    if (titleInput.value.trim() === '')
      titleInput.value = generateSmartTitle(window.tabs || []);
    saveWindowTitle(window.id!, titleInput.value);
  }
  titleInput.addEventListener('focus', enableTitleEditing);
  titleInput.addEventListener('blur', saveAndCloseTitleEdit);
  editIcon.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!windowDiv.classList.contains('options')) {
      enableTitleEditing();
      windowDiv.classList.add('options');
    }
    else {
      saveAndCloseTitleEdit();
      windowDiv.classList.remove('options');
    }
  });

  titleInput.addEventListener('input', () => {
    saveWindowTitle(window.id!, titleInput.value);
  });

  const arrowSpan = document.createElement('span');
  arrowSpan.classList.add('fas', 'fa-chevron-down', 'arrow');
  arrowSpan.title = 'Collapse/Expand';

  // const mergeTarget = document.createElement('div');
  // mergeTarget.classList.add('merge-target');
  // mergeTarget.textContent = 'Merge';

  const minimizeWindow = document.createElement('button');
  minimizeWindow.classList.add('fa-solid', 'fa-window-minimize', 'minimize');
  minimizeWindow.title = 'Minimize window';
  minimizeWindow.addEventListener('click', () => {
    // Minimize twice to ensure fullscreen windows are minimized as well
    chrome.windows.update(window.id!, { state: 'minimized' }, () => 
      chrome.windows.update(window.id!, { state: 'minimized' }));
  });
  const focusWindow = document.createElement('button');
  focusWindow.classList.add('fa-solid', 'fa-bullseye', 'focus');
  focusWindow.title = 'Focus window';
  focusWindow.addEventListener('click', () => chrome.windows.update(window.id!, { focused: true }));
  const closeWindow = document.createElement('button');
  closeWindow.classList.add('fa-regular', 'fa-rectangle-xmark', 'close');
  closeWindow.title = 'Close window';
  closeWindow.addEventListener('click', () => chrome.windows.remove(window.id!));
  const windowOptions = document.createElement('div');
  windowOptions.classList.add('window-options');
  windowOptions.appendChild(minimizeWindow);
  windowOptions.appendChild(focusWindow);
  windowOptions.appendChild(closeWindow);

  // windowTitle.appendChild(mergeTarget);
  windowTitle.appendChild(titleInput);
  windowTitle.appendChild(editIcon);
  windowTitle.appendChild(arrowSpan);
  windowDiv.appendChild(windowOptions);
  windowDiv.appendChild(windowTitle);

  const tabList = document.createElement('ul');
  tabList.classList.add('tab-list');
  windowDiv.appendChild(tabList);

  window.tabs?.forEach((tab) => {
    const listItem = createTabListItem(tab, window.id!);
    tabList.appendChild(listItem);
  });

  windowTitle.addEventListener('click', () => {
    windowTitle.classList.toggle('collapsed');
    tabList.classList.toggle('collapsed');
    const main = document.getElementById('main') as HTMLElement;
    updateMainContainerHeight(main);
    saveCollapseState(window.id!, tabList.classList.contains('collapsed'));
  });

  sortable(tabList, {
    items: 'li',
    acceptFrom: '.tab-list',
    orientation: 'vertical',
    forcePlaceholderSize: true
  });
  // tabList.addEventListener('sortstart', (e: Event) => {
  //   const evt = (e as CustomEvent).detail;
  //   console.log('Tab sorting started:', evt);
  // }, { once: true });
  tabList.addEventListener('sortstop', (e: Event) => {
    const evt = (e as CustomEvent).detail;

    const newIndex = Array.from(evt.item.parentNode.children).indexOf(evt.item);
    const oldWindowId = parseInt(((evt.origin.container as HTMLElement).closest('.window') as HTMLElement)?.dataset.windowId || '', 10);
    const newWindowId = parseInt(((evt.item as HTMLElement).closest('.window') as HTMLElement)?.dataset.windowId || '', 10);
    if (evt.origin.index !== newIndex || oldWindowId !== newWindowId) {
      const movedItem = evt.item as HTMLElement;
      const tabId = parseInt(movedItem.dataset.tabId || '', 10);
      const isPinned = movedItem.querySelector('.fa-thumbtack')?.classList.contains('pinned');
      chrome.tabs.move(tabId, { windowId: newWindowId, index: newIndex }, () => {
        if (isPinned)
          chrome.tabs.update(tabId, { pinned: true }, () =>
            chrome.tabs.move(tabId, { index: newIndex! }));
      });
      updateWindowLists();
    }
  }, { once: true });

  return windowDiv;
}

export function saveWindowTitle(windowId: number, title: string) {
  const titles = JSON.parse(localStorage.getItem('windowTitles') || '{}');
  titles[windowId] = title;
  localStorage.setItem('windowTitles', JSON.stringify(titles));
}

export function getStoredWindowTitle(windowId: number): string | null {
  const titles = JSON.parse(localStorage.getItem('windowTitles') || '{}');
  return titles[windowId] || null;
}

function saveCollapseState(windowId: number, isCollapsed: boolean) {
  const collapseState = JSON.parse(localStorage.getItem('collapseState') || '{}');
  collapseState[windowId] = isCollapsed;
  localStorage.setItem('collapseState', JSON.stringify(collapseState));
}

function applyCollapseState() {
  const collapseState = JSON.parse(localStorage.getItem('collapseState') || '{}');
  Object.keys(collapseState).forEach(windowId => {
    const windowDiv = document.querySelector(`.window[data-window-id="${windowId}"]`);
    const tabList = windowDiv?.querySelector('.tab-list');
    const windowTitle = windowDiv?.querySelector('.window-title');
    if (collapseState[windowId]) {
      tabList?.classList.add('collapsed');
      windowTitle?.classList.add('collapsed');
    }
  });
}

function initializeLegendFilters() {
  document.querySelectorAll('.legend button').forEach(item => {
    item.addEventListener('click', () => {
      const className = item.querySelector('.color-box')?.classList[1].split('-')[1];
      document.querySelectorAll(`.tab-list li.${className}`).forEach(tab => tab.classList.toggle('filter-hidden'));
      item.classList.toggle('hidden');
      applySearchFilter();
      updateWindowVisibility();
      saveFilterState();
      updateResetFiltersVisibility();
    });
  });

  document.getElementById('reset-filters')?.addEventListener('click', resetFilters);
}

function updateWindowVisibility() {
  document.querySelectorAll('.window').forEach(windowDiv => {
    const visibleItems = Array.from(windowDiv.querySelectorAll('.tab-list li')).filter(item => !item.classList.contains('hidden'));
    windowDiv.classList.toggle('hidden', visibleItems.length === 0);
  });
}

function saveFilterState() {
  const filterState: { [key: string]: boolean } = {};
  document.querySelectorAll('.legend button').forEach(item => {
    const className = item.querySelector('.color-box')?.classList[1].split('-')[1] || '';
    filterState[className] = item.classList.contains('hidden');
  });
  localStorage.setItem('filterState', JSON.stringify(filterState));
}

function applyFilters() {
  const filterState = JSON.parse(localStorage.getItem('filterState') || '{}');
  Object.keys(filterState).forEach(className => {
    if (filterState[className]) {
      document.querySelectorAll(`.tab-list li.${className}`).forEach(tab => tab.classList.add('filter-hidden'));
      document.querySelector(`.legend .color-box.color-${className}`)?.parentElement?.classList.add('hidden');
    }
  });
  applySearchFilter();
  updateWindowVisibility();
  updateResetFiltersVisibility();
}

function initializeSearchFilter() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearIcon = document.getElementById('clear-search') as HTMLElement;

  searchInput.addEventListener('input', () => {
    applySearchFilter();
    updateResetFiltersVisibility();
    clearIcon.style.display = searchInput.value ? 'block' : 'none';
    if (searchInput.value) {
      toggleCollapseExpandAll(false, true);
    } else {
      applyCollapseState();
    }
  });

  clearIcon.addEventListener('click', () => {
    searchInput.value = '';
    applyCollapseState();
    applySearchFilter();
    updateResetFiltersVisibility();
    clearIcon.style.display = 'none';
  });
}

function applySearchFilter() {
  const searchTerm = (document.getElementById('search-input') as HTMLInputElement).value.toLowerCase();
  document.querySelectorAll('.tab-list li').forEach(item => {
    const title = item.querySelector('span')?.textContent?.toLowerCase() || '';
    const matchesSearch = title.includes(searchTerm);
    const isFiltered = item.classList.contains('filter-hidden');
    item.classList.toggle('hidden', !matchesSearch || isFiltered);
  });
  updateWindowVisibility();
}

function resetFilters() {
  applyCollapseState();
  document.querySelectorAll('.legend button').forEach(item => {
    const className = item.querySelector('.color-box')?.classList[1].split('-')[1];
    document.querySelectorAll(`.tab-list li.${className}`).forEach(tab => tab.classList.remove('filter-hidden'));
    item.classList.remove('hidden');
  });
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const clearIcon = document.getElementById('clear-search') as HTMLElement;
  searchInput.value = '';
  applySearchFilter();
  updateWindowVisibility();
  localStorage.removeItem('filterState');
  updateResetFiltersVisibility();
  clearIcon.style.display = 'none';
}

function updateResetFiltersVisibility() {
  const searchTerm = (document.getElementById('search-input') as HTMLInputElement).value.toLowerCase();
  const filterState = JSON.parse(localStorage.getItem('filterState') || '{}');
  const isFiltering = searchTerm.length > 0 || Object.values(filterState).some(isHidden => isHidden);
  document.getElementById('reset-filters')?.classList.toggle('active', isFiltering);
  document.querySelectorAll('.window').forEach(windowDiv => windowDiv.classList.toggle('filter', isFiltering))
}

function initializeCollapseExpandAll() {
  const collapseAllBtn = document.getElementById('collapse') as HTMLElement;
  const expandAllBtn = document.getElementById('expand') as HTMLElement;

  collapseAllBtn.addEventListener('click', () => toggleCollapseExpandAll(true));
  expandAllBtn.addEventListener('click', () => toggleCollapseExpandAll(false));
}

function toggleCollapseExpandAll(collapse: boolean, searching = false) {
  document.querySelectorAll('.window').forEach(windowDiv => {
    const tabList = windowDiv.querySelector('.tab-list');
    const windowTitle = windowDiv.querySelector('.window-title');
    tabList?.classList.toggle('collapsed', collapse);
    windowTitle?.classList.toggle('collapsed', collapse);
    if (!searching)
      saveCollapseState(parseInt((windowDiv as HTMLElement).dataset.windowId || '', 10), collapse);
  });
  const main = document.getElementById('main') as HTMLElement;
  updateMainContainerHeight(main);
}

function initializeWindowSortable() {
  const container = document.getElementById('main');
  if (container) {
    sortable(container, {
      items: '.window',
      handle: 'h3',
      acceptFrom: '#main',
      orientation: 'vertical',
      placeholderClass: 'sortable-ghost'
    });

    container.addEventListener('sortstart', (e: Event) => {
      const item = (e as CustomEvent).detail.item;
      const headerElement = item.querySelector('h3') as HTMLElement;
      const listElement = item.querySelector('.tab-list') as HTMLElement;
      const windowTitles = document.querySelectorAll('.window-title');
      const icons = document.querySelectorAll('.window-title .fas');

      item.classList.remove('options');
      headerElement.classList.add('collapsed');
      listElement.classList.add('collapsed');
      icons.forEach(icon => icon.classList.add('hide'));

      windowTitles.forEach(title => {
        if (title.closest('.window') !== item) { // Don't allow self-merging
          const mergeTarget = document.createElement('div');
          mergeTarget.classList.add('merge-target');
          mergeTarget.textContent = 'Merge';
          title.insertBefore(mergeTarget, title.firstChild);
          sortable(mergeTarget, {
            acceptFrom: '#main',
            orientation: 'vertical',
            placeholderClass: 'sortable-ghost'
          });
          mergeTarget.addEventListener('sortstop', (e: Event) => {
            const evt = (e as CustomEvent).detail;
            const fromElement = evt.item as HTMLElement;
            const currentTarget = (evt.item as HTMLElement).closest('.merge-target') as HTMLElement;
            const toElement = currentTarget.closest('.window') as HTMLElement;
            const oldTitle = (fromElement.querySelector('.editable-title-input') as HTMLInputElement).value;
            const fromWindowId = parseInt(fromElement.dataset.windowId || '', 10);
            const toWindowId = parseInt(toElement.dataset.windowId || '', 10);
            mergeWindows(oldTitle, fromWindowId, toWindowId);
            saveWindowOrder();
            updateWindowLists();
          }, { once: true });
        }
      });
    }, { once: true });
    container.addEventListener('sortstop', () => {
      saveWindowOrder();
      updateWindowLists();
    }, { once: true });
  }
}

function saveWindowOrder() {
  const container = document.getElementById('main');
  if (container) {
    const filteredWindows = Array.from(container.children).filter(child => child.getAttribute('data-window-id'));
    const windowOrder = Array.from(filteredWindows).map(child => child.getAttribute('data-window-id'));
    localStorage.setItem('windowOrder', JSON.stringify(windowOrder));
  }
}

function sortWindowsByStoredOrder(windows: chrome.windows.Window[]): chrome.windows.Window[] {
  const windowOrder = JSON.parse(localStorage.getItem('windowOrder') || '[]').map(Number);
  const windowMap = new Map(windows.map(window => [window.id, window]));
  const sortedWindows = windowOrder
    .filter((id: number) => windowMap.has(id))
    .map((id: number) => windowMap.get(id)) as chrome.windows.Window[];
  const remainingWindows = windows.filter(window => !windowOrder.includes(window.id!));
  return [...sortedWindows, ...remainingWindows];
}

// function getTabGroups(windowId: number): chrome.tabGroups.TabGroup[] {
//   return chrome.tabGroups.query({ windowId });
// }
