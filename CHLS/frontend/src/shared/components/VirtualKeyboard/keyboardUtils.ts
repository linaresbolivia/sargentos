/**
 * Utility functions for Virtual Keyboard React input integration
 */

export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch both 'input' and 'change' events so React state, Formik, React Hook Form, etc. update immediately
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

export function insertTextAtCursor(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string
) {
  const isNumberType = element.type === 'number';
  
  if (isNumberType) {
    // Number inputs in some browsers do not allow selectionStart
    const currentVal = element.value || '';
    // If inserting a number or decimal point
    if (text === '.' && currentVal.includes('.')) return;
    const nextVal = currentVal + text;
    setNativeValue(element, nextVal);
    return;
  }

  const start = element.selectionStart !== null ? element.selectionStart : element.value.length;
  const end = element.selectionEnd !== null ? element.selectionEnd : element.value.length;
  const currentVal = element.value || '';

  const nextVal = currentVal.substring(0, start) + text + currentVal.substring(end);
  const newPos = start + text.length;

  setNativeValue(element, nextVal);

  try {
    element.focus();
    element.setSelectionRange(newPos, newPos);
  } catch (e) {
    // Ignore if not supported for input type
  }
}

export function backspaceAtCursor(element: HTMLInputElement | HTMLTextAreaElement) {
  const isNumberType = element.type === 'number';

  if (isNumberType) {
    const currentVal = element.value || '';
    if (currentVal.length > 0) {
      setNativeValue(element, currentVal.slice(0, -1));
    }
    return;
  }

  const start = element.selectionStart !== null ? element.selectionStart : element.value.length;
  const end = element.selectionEnd !== null ? element.selectionEnd : element.value.length;
  const currentVal = element.value || '';

  if (start !== end) {
    // Delete selection
    const nextVal = currentVal.substring(0, start) + currentVal.substring(end);
    setNativeValue(element, nextVal);
    try {
      element.focus();
      element.setSelectionRange(start, start);
    } catch (e) {}
  } else if (start > 0) {
    // Delete one char before cursor
    const nextVal = currentVal.substring(0, start - 1) + currentVal.substring(start);
    const newPos = start - 1;
    setNativeValue(element, nextVal);
    try {
      element.focus();
      element.setSelectionRange(newPos, newPos);
    } catch (e) {}
  }
}

export function clearInputValue(element: HTMLInputElement | HTMLTextAreaElement) {
  setNativeValue(element, '');
  try {
    element.focus();
  } catch (e) {}
}

export function isNumericInput(element: HTMLInputElement | HTMLTextAreaElement | null): boolean {
  if (!element) return false;
  if (element.type === 'number' || element.type === 'tel') return true;
  if (element.inputMode === 'numeric' || element.inputMode === 'decimal' || element.inputMode === 'tel') return true;
  
  const nameOrPlaceholder = `${element.name} ${element.placeholder} ${element.id} ${element.className}`.toLowerCase();
  if (
    nameOrPlaceholder.includes('monto') ||
    nameOrPlaceholder.includes('precio') ||
    nameOrPlaceholder.includes('tarifa') ||
    nameOrPlaceholder.includes('telefono') ||
    nameOrPlaceholder.includes('phone') ||
    nameOrPlaceholder.includes('celular') ||
    nameOrPlaceholder.includes('ci') ||
    nameOrPlaceholder.includes('documento') ||
    nameOrPlaceholder.includes('locker') ||
    nameOrPlaceholder.includes('casillero') ||
    nameOrPlaceholder.includes('cantidad')
  ) {
    return true;
  }

  return false;
}
