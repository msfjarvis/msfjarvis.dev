import type { CustomFieldControl, CustomFieldControlProps } from "@sveltia/cms";
import {
  applyPendingBook,
  consumePendingBook,
  getPendingBook,
  setPendingBook,
  updatePendingBook,
  removePendingBook,
} from "./open-library-book-pending";
import {
  lookupOpenLibraryBook,
  type OpenLibraryBook,
} from "../open-library-lookup";

export {
  applyPendingBook,
  consumePendingBook,
  getPendingBook,
  removePendingBook,
  setPendingBook,
  updatePendingBook,
};
export type { PendingBook } from "./open-library-book-pending";

type CmsElement = unknown;
type H = (
  type: string,
  props?: Record<string, unknown> | null,
  ...children: CmsElement[]
) => CmsElement;
type FieldState = {
  book?: OpenLibraryBook;
  error?: string;
  loading: boolean;
  pendingKey?: string;
  replace: boolean;
  url: string;
};
type FieldInstance = {
  props: CustomFieldControlProps;
  state: FieldState;
  setState: (state: Partial<FieldState>) => void;
  lookup: () => void;
  edit: <K extends keyof OpenLibraryBook>(
    key: K,
    value: OpenLibraryBook[K],
  ) => void;
  setReplace: (replace: boolean) => void;
};
type CreateClass = (spec: Record<string, unknown>) => CustomFieldControl;

export type CmsReactRuntime = { createClass: CreateClass; h: H };

/**
 * Creates a Sveltia class control with Sveltia's bundled React runtime.
 *
 * Sveltia renders custom controls with its own React instance. Importing React
 * from this site produces an invalid-hook-call error, so this must use the
 * compatibility globals Sveltia exposes (`createClass` and `h`).
 */
export function createOpenLibraryBookField({
  createClass,
  h,
}: CmsReactRuntime): CustomFieldControl {
  return createClass({
    getInitialState(this: FieldInstance): FieldState {
      return {
        loading: false,
        replace: false,
        url: "",
      };
    },

    componentWillUnmount(this: FieldInstance) {
      if (this.state.pendingKey) removePendingBook(this.state.pendingKey);
    },

    async lookup(this: FieldInstance) {
      this.setState({ error: undefined, loading: true });
      try {
        const book = await lookupOpenLibraryBook(this.state.url);
        this.setState({ book, pendingKey: book.bookTitle });
        setPendingBook(book.bookTitle, book, this.state.replace, {
          bookTitle: book.bookTitle,
        });
        this.props.onChange(book.bookTitle);
      } catch (reason) {
        this.setState({
          error: reason instanceof Error ? reason.message : "Lookup failed.",
        });
      } finally {
        this.setState({ loading: false });
      }
    },

    edit<K extends keyof OpenLibraryBook>(
      this: FieldInstance,
      key: K,
      value: OpenLibraryBook[K],
    ) {
      const current = this.state.book;
      if (!current) return;
      const book = { ...current, [key]: value } as OpenLibraryBook;
      updatePendingBook(current.bookTitle, book, { [key]: value });
      this.setState({ book, pendingKey: book.bookTitle });
      this.props.onChange(book.bookTitle);
    },

    setReplace(this: FieldInstance, replace: boolean) {
      const book = this.state.book;
      this.setState({ replace });
      if (!book) return;
      setPendingBook(
        book.bookTitle,
        book,
        replace,
        getPendingBook(book.bookTitle)?.overrides,
      );
      this.props.onChange(book.bookTitle);
    },

    render(this: FieldInstance) {
      const { book, error, loading, replace, url } = this.state;
      const lookupId = `${this.props.forID}-lookup`;
      return h(
        "div",
        { className: this.props.classNameWrapper },
        h("label", { htmlFor: lookupId }, "Open Library URL"),
        h(
          "div",
          { style: { display: "flex", gap: "0.35rem" } },
          h("input", {
            id: lookupId,
            value: url,
            placeholder: "https://openlibrary.org/works/OL...W",
            onChange: (event: Event) =>
              this.setState({
                url: (event.target as HTMLInputElement).value,
              }),
          }),
          h(
            "button",
            {
              type: "button",
              disabled: loading || !url.trim(),
              onClick: this.lookup,
            },
            loading ? "Looking up…" : "Lookup",
          ),
        ),
        error &&
          h(
            "div",
            { role: "alert" },
            error,
            " ",
            h(
              "button",
              { type: "button", disabled: loading, onClick: this.lookup },
              "Retry",
            ),
          ),
        book &&
          h(
            "div",
            {
              style: {
                display: "grid",
                gap: "0.25rem",
                marginTop: "0.5rem",
              },
            },
            editable(h, "Title", book.bookTitle, (value) =>
              this.edit("bookTitle", value),
            ),
            editable(h, "Authors", book.bookAuthors.join(", "), (value) =>
              this.edit(
                "bookAuthors",
                value
                  .split(",")
                  .map((author) => author.trim())
                  .filter(Boolean),
              ),
            ),
            editable(h, "Card link", book.bookWork, (value) =>
              this.edit("bookWork", value),
            ),
            editable(h, "Cover", book.bookCover, (value) =>
              this.edit("bookCover", value),
            ),
            editable(h, "Cover alt", book.bookCoverAlt, (value) =>
              this.edit("bookCoverAlt", value),
            ),
            editable(h, "Series", book.bookSeries, (value) =>
              this.edit("bookSeries", value),
            ),
            editable(h, "Series no.", book.bookSeriesNumber, (value) =>
              this.edit("bookSeriesNumber", value),
            ),
            editable(
              h,
              "Year",
              book.bookPublishedYear?.toString() ?? "",
              (value) =>
                this.edit(
                  "bookPublishedYear",
                  value ? Number(value) : undefined,
                ),
            ),
            h(
              "label",
              null,
              h("input", {
                type: "checkbox",
                checked: replace,
                onChange: (event: Event) =>
                  this.setReplace((event.target as HTMLInputElement).checked),
              }),
              " Replace existing metadata",
            ),
          ),
      );
    },
  });
}

function editable(
  h: H,
  label: string,
  value: string,
  onChange: (value: string) => void,
): CmsElement {
  return h(
    "label",
    {
      style: {
        alignItems: "center",
        display: "grid",
        gap: "0.35rem",
        gridTemplateColumns: "6rem 1fr",
      },
    },
    label,
    h("input", {
      value,
      onChange: (event: Event) =>
        onChange((event.target as HTMLInputElement).value),
    }),
  );
}
