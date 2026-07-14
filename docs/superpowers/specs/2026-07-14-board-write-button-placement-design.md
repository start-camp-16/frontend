# Board Write Button Placement Design

## Goal

Move the desktop board's write action out of the page heading and into the board toolbar so the heading remains visually balanced and the search and create actions form one clear control group.

## Layout

- Remove the `글쓰기` link from `.section-head`.
- Place the link inside `.search-form`, immediately after the search button.
- On desktop, render the search input, search button, and write link in one row.
- On narrow screens, keep the input full width and place the two actions together below it.

## Behavior and accessibility

- Keep the destination `/posts/new` and client-side navigation behavior unchanged.
- Keep `글쓰기` as a labeled link styled as a button.
- Preserve visible keyboard focus and adequate touch target sizing.

## Verification

- Update the board layout unit test to assert that the write link is inside the search form and absent from the section heading.
- Run the full unit test suite and production build.
