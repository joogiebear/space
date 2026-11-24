let el: HTMLInputElement | null = null;

/** The search box registers its input so the "/" shortcut can focus it. */
export const registerSearchInput = (input: HTMLInputElement | null) => { el = input; };
export const focusSearch = () => el?.focus();
