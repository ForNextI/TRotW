# Read Publisher

The protected web Publisher at `/read/publisher` is the normal TROTW release path.

Each release-unit ODT must begin with three non-empty paragraphs:

1. release identifier in `book.unit` form, such as `1.1` or `1.10`;
2. canonical release title;
3. in-world date, which is not used as the website publication date.

The source filename must begin with the same book and unit. A leading zero is optional for units 0 through 9, so `1.1` and `1.01` are treated as the same release. Public labels always use the shorter form.

A PNG bonus image is optional. Its filename may use either equivalent form and must include its title after the number. For example, a `1.1.odt` release may be paired with `1.01 Bonus Image.png`. Spaces, underscores, and hyphens are accepted. A newly published image becomes the Current Bonus Image; the previous image is archived automatically on the gallery page for its own book.

The catalog automatically supplies the accordion Table of Contents with each release number and extracted title. The web flow validates, previews, and requires explicit approval before it creates an atomic GitHub commit. Vercel deployment follows the repository push. The combined ODT and optional PNG must remain under 4 MB in the web flow.

## Public contents and gallery

The Read page builds its Table of Contents directly from `catalog.json`. Only books with published releases appear, and each book can be collapsed independently. The newest published book opens by default.

The public Gallery button opens `/read/pix/book-1`. Gallery navigation never exposes planned books. A new book button appears only after that book has at least one published release. Archived bonus images remain grouped by the book number in their release identifier and link back to the matching release.
