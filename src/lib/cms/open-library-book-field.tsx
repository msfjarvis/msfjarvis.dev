import { type OpenLibraryBook, lookupOpenLibraryBook } from "../open-library-lookup";
import { isImportedBook } from "./open-library-book-import";
import type { ReactNode } from "react";
import type { CustomFieldControl, CustomFieldControlProps } from "@sveltia/cms";

type CmsProps = {
  alt?: string;
  className?: string;
  disabled?: boolean;
  forID?: string;
  gap?: string;
  htmlFor?: string;
  id?: string;
  margin?: string;
  marginTop?: string;
  maxWidth?: string;
  onChange?: (event: { currentTarget: HTMLInputElement }) => void;
  onClick?: () => void;
  role?: string;
  src?: string;
  style?: {
    display?: string;
    fontWeight?: string;
    gap?: string;
    gridTemplateColumns?: string;
    margin?: string;
    marginTop?: string;
    maxWidth?: string;
  };
  type?: string;
  value?: string;
  placeholder?: string;
};

type H = (type: string, props?: CmsProps | null, ...children: ReactNode[]) => ReactNode;

type FieldState = {
  book?: OpenLibraryBook;
  error?: string;
  loading: boolean;
  url: string;
};

type FieldInstance = {
  props: CustomFieldControlProps;
  state: FieldState;
  setState: (state: Partial<FieldState>) => void;
  lookup: () => void;
};

type CmsClassSpec = {
  getInitialState(this: FieldInstance): FieldState;
  lookup(this: FieldInstance): Promise<void>;
  render(this: FieldInstance): ReactNode;
};

type CreateClass = (spec: CmsClassSpec) => CustomFieldControl;

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
        book: isImportedBook(this.props.value) ? this.props.value : undefined,
        loading: false,
        url: "",
      };
    },

    async lookup(this: FieldInstance) {
      this.setState({ error: undefined, loading: true });

      try {
        const book = await lookupOpenLibraryBook(this.state.url);
        this.setState({ book });
        this.props.onChange(book);
      } catch (reason) {
        this.setState({
          error: reason instanceof Error ? reason.message : "Lookup failed.",
        });
      } finally {
        this.setState({ loading: false });
      }
    },

    render(this: FieldInstance) {
      const { book, error, loading, url } = this.state;
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
            onChange: (event: { currentTarget: HTMLInputElement }) =>
              this.setState({ url: event.currentTarget.value }),
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
            h("button", { type: "button", disabled: loading, onClick: this.lookup }, "Retry"),
          ),
        book && bookPreview(h, book),
      );
    },
  });
}

function bookPreview(h: H, book: OpenLibraryBook): ReactNode {
  const detail = (label: string, value: ReactNode[]): ReactNode[] => [
    h("dt", { style: { fontWeight: "bold" } }, label),
    h("dd", { style: { margin: "0" } }, ...value),
  ];

  return h(
    "section",
    {
      style: {
        display: "grid",
        gap: "0.5rem",
        marginTop: "0.75rem",
      },
    },
    h("strong", null, "Imported book metadata"),
    book.bookCover &&
      h("img", {
        src: book.bookCover,
        alt: book.bookCoverAlt,
        style: { maxWidth: "12rem" },
      }),
    h(
      "dl",
      {
        style: {
          display: "grid",
          gap: "0.25rem 0.5rem",
          gridTemplateColumns: "max-content 1fr",
          margin: "0",
        },
      },
      ...detail("Title", [book.bookTitle]),
      ...detail("Authors", [book.bookAuthors.join(", ")]),
      ...(book.bookSeries ? detail("Series", [book.bookSeries]) : []),
      ...(book.bookSeriesNumber ? detail("Series number", [book.bookSeriesNumber]) : []),
      ...(book.bookPublishedYear ? detail("Published", [String(book.bookPublishedYear)]) : []),
    ),
  );
}
