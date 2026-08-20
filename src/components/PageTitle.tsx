import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Keeps the browser tab — and the title a crawler reads after rendering — in
 * step with the route.
 *
 * A single-page app only ever ships one <title> in its HTML, so without this
 * every page of the app is "TripSplit" in the tab bar, in browser history, and
 * in a bookmark. Rendered pages also all report the same title to Google.
 */
const BASE = "TripSplit";
const TAGLINE = "Split Trip & Group Expenses with Friends";

/** First match wins, so exact paths are listed before their prefixes. */
const TITLES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/login\/?$/, "Log in"],
  [/^\/signup\/?$/, "Sign up"],
  [/^\/forgot-password\/?$/, "Reset password"],
  [/^\/dashboard\/?$/, "Dashboard"],
  [/^\/friends\/?$/, "Friends"],
  [/^\/friends\/details\//, "Friend"],
  [/^\/outings\/?$/, "Outings"],
  [/^\/outings\//, "Outing"],
  [/^\/settle\/?$/, "Settle up"],
  [/^\/reports\/?$/, "Reports"],
  [/^\/settings\/?$/, "Settings"],
];

export default function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = TITLES.find(([pattern]) => pattern.test(pathname));
    // The entry page keeps the full descriptive title — that is the one that
    // shows up as a search result. Inner pages get the short form.
    document.title = match ? `${match[1]} · ${BASE}` : `${BASE} — ${TAGLINE}`;
  }, [pathname]);

  return null;
}
