// Patch trusted templates in place so live counters do not detach focused controls.
export function patchTemplate(container, html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  patchChildren(container, template.content);
}

export function syncChildren(container, nodes) {
  for (let index = 0; index < nodes.length; index++) {
    if (container.childNodes[index] !== nodes[index]) container.insertBefore(nodes[index], container.childNodes[index] || null);
  }
  while (container.childNodes.length > nodes.length) container.lastChild.remove();
}

function patchChildren(target, source) {
  const desired = [...source.childNodes];
  for (let index = 0; index < desired.length; index += 1) {
    const next = desired[index];
    const current = target.childNodes[index];
    if (!current) { target.append(next.cloneNode(true)); continue; }
    if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName) {
      current.replaceWith(next.cloneNode(true));
    } else if (current.nodeType === Node.TEXT_NODE) {
      if (current.textContent !== next.textContent) current.textContent = next.textContent;
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      for (const attr of [...current.attributes]) if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
      for (const attr of [...next.attributes]) if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
      patchChildren(current, next);
      if (current instanceof HTMLInputElement && current.type === "checkbox") current.checked = next.hasAttribute("checked");
      if (current instanceof HTMLInputElement && current.type !== "checkbox" && document.activeElement !== current) current.value = next.getAttribute("value") || "";
      if (current instanceof HTMLSelectElement && document.activeElement !== current) current.value = next.value;
    }
  }
  while (target.childNodes.length > desired.length) target.lastChild.remove();
}
