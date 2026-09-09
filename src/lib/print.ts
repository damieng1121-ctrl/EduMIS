/**
 * Printing from dark mode is risky: printers default to ignoring background
 * colors ("background graphics" off), but dark-mode text colors (e.g.
 * dark:text-white) still print — which can mean literally invisible
 * white-on-white text on paper. Rather than retrofit every `dark:` class in
 * the app with a `print:` override, this just switches to light mode for
 * the moment of printing and switches back once the print dialog closes.
 */
export function printPage() {
  const html = document.documentElement;
  const wasDark = html.classList.contains("dark");
  if (wasDark) {
    html.classList.remove("dark");
    const restore = () => {
      html.classList.add("dark");
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
  }
  window.print();
}
