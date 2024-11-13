export function createElement(tag: string, attributes = {}, textContent = '', onClick?: () => void): HTMLElement {
  const element = document.createElement(tag);
  Object.assign(element, attributes);
  if (textContent) element.textContent = textContent;
  if (onClick) element.addEventListener('click', onClick);
  return element;
}
