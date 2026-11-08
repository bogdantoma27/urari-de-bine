# Contributing

Thanks for wanting to add to Urări de bine. Every entry needs a source.

Field names and values are in English; the content itself (the formulas, explanations, notes) stays in Romanian.

## Two ways to contribute

1. Without git: open an issue with the [new entry template](../../issues/new?template=new-entry.yml). I turn it into a file.
2. With a PR: add a new file, `data/entries/<id>.json`, and open a pull request.

## Rules

- One entry per file, and one entry (or a few related ones) per PR. Fixes to existing entries are welcome, also one per PR.
- A source is required. It can be written (a book, article or dictionary, with title, author, year, and page or link) or oral. For an oral one, set `"title": "auzit de la"` ("heard from") in the source. In `informant`, write who told you ("bunica" = grandma, "un vecin" = a neighbour) and where they're from (village, county, region). With no source, the entry gets `"attested": false` and `"verification": "unverified"`.
- Don't invent anything and don't "improve" it. In `original_text`, put exactly what the source says, or exactly what you heard. In `text`, put the same words in today's spelling. Regional forms stay regional.
- The level is labeled and nothing is censored: `clean` (no body parts, no F-verb, nothing sexual), `mild`, `vulgar`. Vulgar entries go in the repo too. Anyone who doesn't want them can ask for `level=clean` or `level=clean,mild`.
- Nothing that targets real people: no names, no nicknames of people who can be identified, no living politicians.
- Slurs against ethnic or other groups are accepted only if they're historically attested. Add context in `explanation` or `notes` and set `"sensitive": true`. They show up by default in `/v1/entries` and `/v1/random` (`sensitive=false` drops them), and the generator may take pieces from them. New, made-up insults against groups are not accepted.
- Always set `funny` to `false`. If the formula is funny, I set it to `true`.
- Write explanations and translations in your own words. Don't copy paragraphs from books or articles.

## File format

The schema is in [`schema/entry.schema.json`](schema/entry.schema.json). The easiest way is to copy a similar entry and edit it.

- `id` is the file name, without diacritics and with hyphens: `manca-te-ar-gherla`. If it's taken, add `-2`.
- For `verification`, use `transcribed` when you copied the formula from a source or heard it. I set `verified` once I find the formula in the source text.
- Pick `themes` and `regions` from the lists in the schema. Only set a region if it's attested. Otherwise leave `[]`.

Before opening a PR, run:

```bash
npm install
npm test
```

CI runs the same check on every PR.

## License

By contributing, you agree that your data is published under [CC BY-SA 4.0](data/LICENSE) and your code under [MIT](LICENSE).
