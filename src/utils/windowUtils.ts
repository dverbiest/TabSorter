import Sortable from 'sortablejs';
import nlp from 'compromise';
import { createElement } from './domUtils';
import { closeTab, mergeWindows } from './tabUtils';

export function updateWindowLists() {
  console.log('Updating lists');
  chrome.windows.getAll({ populate: true }, (windows) => {
    const container = document.getElementById('window-container');
    if (container) {
      container.innerHTML = '';
      const sortedWindows = sortWindowsByStoredOrder(windows);
      sortedWindows.forEach((window) => {
        if (!window.type || window.type !== 'popup') // Skip extension windows
          container.appendChild(createWindowDiv(window));
      });
      applyFilters();
      applySearchFilter();
      if (!(document.getElementById('search-input') as HTMLInputElement).value)
        applyCollapseState();
      initializeWindowSortable();
    }
  });
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
    createElement('button', { className: `fas fa-thumbtack ${tab.pinned ? 'pinned' : ''}` }, '', () => {
      if (tab.id !== undefined) chrome.tabs.update(tab.id, { pinned: !tab.pinned }, updateWindowLists);
    }),
    createElement('img', { src: tab.favIconUrl || 'icons/icon128.png' }),
    createElement('span', {}, tab.title || 'Untitled'),
    createElement('button', { className: 'fas fa-up-right-from-square' }, '',
      () => tab.id && chrome.windows.create({ tabId: tab.id },
        () => { if (tab.pinned) chrome.tabs.update(tab.id!, { pinned: true }) })),
    createElement('button', { className: 'fas fa-xmark' }, '',
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
  editIcon.classList.add('fas', 'fa-pencil', 'edit-icon');

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = getStoredWindowTitle(window.id!) || generateSmartTitle(window.tabs || []);
  titleInput.classList.add('editable-title-input');
  titleInput.setAttribute('readonly', 'true');
  titleInput.addEventListener('click', (e) => {
    if (!titleInput.hasAttribute('readonly'))
      e.stopPropagation();
  });
  function enableTitleEditing(e: Event) {
    e.stopPropagation();
    titleInput.removeAttribute('readonly');
    titleInput.style.cursor = 'text';
    titleInput.style.pointerEvents = 'auto';
    titleInput.select();
  }
  titleInput.addEventListener('focus', enableTitleEditing);
  editIcon.addEventListener('click', enableTitleEditing);

  titleInput.addEventListener('blur', () => {
    titleInput.setAttribute('readonly', 'true');
    titleInput.style.cursor = 'pointer';
    titleInput.style.pointerEvents = 'none';
    saveWindowTitle(window.id!, titleInput.value);
  });

  titleInput.addEventListener('input', () => {
    saveWindowTitle(window.id!, titleInput.value);
  });

  const arrowSpan = document.createElement('span');
  arrowSpan.classList.add('fas', 'fa-chevron-down', 'arrow');

  const mergeTarget = document.createElement('div');
  mergeTarget.classList.add('merge-target');
  mergeTarget.textContent = 'Merge';
  windowTitle.appendChild(mergeTarget);
  windowTitle.appendChild(titleInput);
  windowTitle.appendChild(editIcon);
  windowTitle.appendChild(arrowSpan);
  windowDiv.appendChild(windowTitle);

  const tabList = document.createElement('ul');
  tabList.classList.add('tab-list');
  windowDiv.appendChild(tabList);

  window.tabs?.forEach((tab) => {
    const listItem = createTabListItem(tab, window.id!);
    tabList.appendChild(listItem);
  });

  windowTitle.addEventListener('click', () => {
    tabList.classList.toggle('collapsed');
    windowTitle.classList.toggle('collapsed');
    saveCollapseState(window.id!, tabList.classList.contains('collapsed'));
  });

  new Sortable(tabList, {
    group: 'tabs',
    ghostClass: 'sortable-ghost',
    onEnd: (evt) => {
      const newIndex = evt.newIndex;
      const newWindowId = parseInt(((evt.to as HTMLElement).closest('.window') as HTMLElement)?.dataset.windowId || '', 10);
      const oldWindowId = parseInt(((evt.from as HTMLElement).closest('.window') as HTMLElement)?.dataset.windowId || '', 10);
      if (newIndex !== undefined && (evt.oldIndex !== newIndex || oldWindowId !== newWindowId)) {
        const movedItem = evt.item as HTMLElement;
        const tabId = parseInt(movedItem.dataset.tabId || '', 10);
        const isPinned = movedItem.querySelector('.fa-thumbtack')?.classList.contains('pinned');
        chrome.tabs.move(tabId, { windowId: newWindowId, index: newIndex }, () => {
          if (isPinned)
            chrome.tabs.update(tabId, { pinned: true }, () =>
              chrome.tabs.move(tabId, { index: newIndex! }));
          updateWindowLists();
        });
      }
    }
  });

  return windowDiv;
}

function saveWindowTitle(windowId: number, title: string) {
  const titles = JSON.parse(localStorage.getItem('windowTitles') || '{}');
  titles[windowId] = title;
  localStorage.setItem('windowTitles', JSON.stringify(titles));
}

function getStoredWindowTitle(windowId: number): string | null {
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

export function initializeLegendFilters() {
  document.querySelectorAll('.legend span').forEach(item => {
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
  document.querySelectorAll('.legend span').forEach(item => {
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

export function initializeSearchFilter() {
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
  document.querySelectorAll('.legend span').forEach(item => {
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
}

export function initializeCollapseExpandAll() {
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
}

function initializeWindowSortable() {
  const container = document.getElementById('window-container');
  if (container) {
    new Sortable(container, {
      group: 'windows',
      swapThreshold: 0.25,
      onStart: (evt) => {
        const headerElement = evt.item.firstChild as HTMLElement;
        const listElement = evt.item.lastChild as HTMLElement;
        const icons = document.querySelectorAll('.window-title .fas');
        const mergeTargets = document.querySelectorAll('.merge-target');
        const collapsed = headerElement.classList.contains('collapsed');

        headerElement.classList.add('collapsed');
        listElement.classList.add('collapsed');
        icons.forEach(icon => icon.classList.add('hide'));

        mergeTargets.forEach(target => {
          if (target.closest('.window') !== evt.item) {
            target.classList.add('show');
            new Sortable(target as HTMLElement, { group: 'windows' });
          }
        });

        evt.item.dataset.collapsed = String(collapsed);
      },
      onEnd: (evt) => {
        const fromElement = evt.item as HTMLElement;
        const toElement = evt.to as HTMLElement;

        if (toElement.classList.contains('merge-target')) {
          const fromWindowId = parseInt(fromElement.dataset.windowId || '', 10);
          const toWindowId = parseInt((toElement.closest('.window') as HTMLElement)?.dataset.windowId || '', 10);
          mergeWindows(fromWindowId, toWindowId);
        }

        if (evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          saveWindowOrder();
        }

        updateWindowLists();
      }
    });
  }
}

function saveWindowOrder() {
  const container = document.getElementById('window-container');
  if (container) {
    const windowOrder = Array.from(container.children).map(child => child.getAttribute('data-window-id'));
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
