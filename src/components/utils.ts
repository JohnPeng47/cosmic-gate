export function insertElement<T extends HTMLElement>(html: string): T {
  const template = document.createElement('template');
  template.innerHTML = html.trim();  // trim() removes any whitespace from the template literal
  return template.content.firstElementChild as T;
}